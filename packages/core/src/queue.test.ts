/**
 * @jest-environment node
 *
 * Node, not jsdom: bullmq's msgpackr dependency resolves to its ES-module build under jsdom's
 * "browser" export condition, which Jest cannot parse.
 */
import {
  buildScanFlow,
  getRecentScans,
  getScanStatus,
  logStep,
  redisConnection,
  sbomProducerFor,
} from './queue';

test('redisConnection reads REDIS_HOST/REDIS_PORT and lets BullMQ wait out restarts', () => {
  expect(redisConnection({ REDIS_HOST: 'redis', REDIS_PORT: '6380' })).toEqual({
    host: 'redis',
    port: 6380,
    maxRetriesPerRequest: null,
  });
});

test('logStep writes one JSON entry to the job log', async () => {
  const log = jest.fn();
  await logStep({ log } as never, 'warning', 'trivy failed');
  expect(JSON.parse(log.mock.calls[0][0])).toEqual({ level: 'warning', message: 'trivy failed' });
});

describe('buildScanFlow', () => {
  const shape = (job: any): unknown => [
    `${job.name}${job.data.tool ? ' ' + job.data.tool : ''}`,
    ...(job.children ?? []).map(shape),
  ];

  test('each scanner waits for the SBOM it reads; unread SBOMs hang off the scan', () => {
    const flow = buildScanFlow({
      image: 'alpine',
      tools: { producers: ['trivy', 'syft', 'scout'], consumers: ['trivy', 'grype'] },
    });
    expect(shape(flow)).toEqual([
      'scan',
      ['cve trivy', ['sbom trivy']],
      ['cve grype', ['sbom syft']],
      ['sbom scout'],
    ]);
    expect(flow.children![1].data).toEqual({ image: 'alpine', tool: 'grype', producer: 'syft' });
  });

  test('children never block their parent, and finished jobs are not kept forever', () => {
    const flow = buildScanFlow({
      image: 'alpine',
      tools: { producers: ['syft'], consumers: ['grype'] },
    });
    const cve = flow.children![0];
    expect(cve.opts).toMatchObject({
      ignoreDependencyOnFailure: true,
      removeOnComplete: { count: 500 },
    });
    expect(cve.children![0].opts).toMatchObject({ ignoreDependencyOnFailure: true });
    expect(flow.opts).toMatchObject({ removeOnComplete: { count: 500 } });
  });

  test('a scanner whose SBOM was not requested gets no job; duplicates are dropped', () => {
    const flow = buildScanFlow({
      image: 'alpine',
      tools: { producers: ['trivy', 'trivy'], consumers: ['grype', 'trivy', 'trivy'] },
    });
    expect(shape(flow)).toEqual(['scan', ['cve trivy', ['sbom trivy']]]);
  });

  test('grype reads syft SBOMs, the others their own', () => {
    expect(sbomProducerFor('grype')).toBe('syft');
    expect(sbomProducerFor('trivy')).toBe('trivy');
  });
});

describe('scan status over the whole flow', () => {
  const job = (id: string, over: Record<string, unknown> = {}) => ({
    id,
    data: { image: 'alpine', tools: { producers: [], consumers: [] } },
    timestamp: Number(id),
    getState: jest.fn().mockResolvedValue('completed'),
    ...over,
  });
  const queue = (jobs: ReturnType<typeof job>[], logs: Record<string, string[]> = {}) =>
    ({
      getJobs: jest.fn(async () => jobs),
      getJobLogs: jest.fn(async (id: string) => ({ logs: logs[id] ?? [], count: 0 })),
    }) as never;
  const flows = (tree: Record<string, unknown>) =>
    ({ getFlow: jest.fn(async ({ id }: { id: string }) => tree[id]) }) as never;

  test("one status per scan: the parent's state and every job's log, in run order", async () => {
    const root = job('1', { getState: jest.fn().mockResolvedValue('waiting-children') });
    const cve = job('2', { parentKey: 'bull:scan:1', processedOn: 30 });
    const sbom = job('3', { parentKey: 'bull:scan:2', processedOn: 20, finishedOn: 25 });
    const tree = { '1': { job: root, children: [{ job: cve, children: [{ job: sbom }] }] } };
    const q = queue([], {
      '3': [JSON.stringify({ level: 'info', message: 'syft SPDX SBOM generated' })],
      '2': ['plain text'],
    });
    expect(await getScanStatus(flows(tree), q, '1')).toEqual({
      jobId: '1',
      image: 'alpine',
      status: 'running',
      updatedAt: new Date(30).toISOString(),
      history: [
        { level: 'info', message: 'syft SPDX SBOM generated' },
        { level: 'info', message: 'plain text' },
      ],
    });
  });

  test('a failed job adds its failure reason to the history', async () => {
    const root = job('1', { getState: jest.fn().mockResolvedValue('completed') });
    const sbom = job('2', { parentKey: 'bull:scan:1', failedReason: 'Invalid image reference: x' });
    const status = await getScanStatus(
      flows({ '1': { job: root, children: [{ job: sbom }] } }),
      queue([]),
      '1'
    );
    expect(status!.history).toContainEqual({
      level: 'error',
      message: 'Invalid image reference: x',
    });
  });

  test('unknown ids and ids of child jobs are not scans', async () => {
    const child = job('2', { parentKey: 'bull:scan:1' });
    const f = flows({ '2': { job: child } });
    expect(await getScanStatus(f, queue([]), '2')).toBeUndefined();
    expect(await getScanStatus(f, queue([]), 'nope')).toBeUndefined();
  });

  test('getRecentScans lists parent jobs only, newest first', async () => {
    const jobs = [job('1'), job('2', { parentKey: 'bull:scan:1' }), job('3'), job('4')];
    const tree = Object.fromEntries(jobs.map(j => [j.id, { job: j }]));
    const scans = await getRecentScans(flows(tree), queue(jobs), 2);
    expect(scans.map(s => s.jobId)).toEqual(['4', '3']);
  });
});

describe('onScanCompleted', () => {
  const listeners: Record<string, (...a: unknown[]) => void> = {};
  beforeAll(() => {
    jest.resetModules();
    jest.doMock('bullmq', () => ({
      QueueEvents: jest.fn(() => ({
        on: (ev: string, fn: (...a: unknown[]) => void) => (listeners[ev] = fn),
      })),
    }));
  });
  afterAll(() => jest.dontMock('bullmq'));

  test('hands each completed job id to the handler, once per process', () => {
    delete (globalThis as { __sbomvertScanEvents?: unknown }).__sbomvertScanEvents;
    const { onScanCompleted } = jest.requireActual<typeof import('./queue')>('./queue');
    const handler = jest.fn().mockResolvedValue(undefined);
    const first = onScanCompleted(handler);
    expect(onScanCompleted(handler)).toBe(first);
    listeners.completed({ jobId: '7', returnvalue: '{}' });
    expect(handler).toHaveBeenCalledWith('7');
  });
});
