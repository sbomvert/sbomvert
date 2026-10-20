/**
 * @jest-environment node
 *
 * Node, not jsdom: bullmq's msgpackr dependency resolves to its ES-module build under jsdom's
 * "browser" export condition, which Jest cannot parse.
 */
import { writeFile } from 'fs/promises';
import { processScan, runCommand, ScanDeps } from './processScan';

const fakeJob = (name: string, data: unknown, childrenValues: Record<string, unknown> = {}) => ({
  name,
  data,
  log: jest.fn().mockResolvedValue(1),
  getChildrenValues: jest.fn().mockResolvedValue(childrenValues),
});
const logged = (job: ReturnType<typeof fakeJob>) =>
  job.log.mock.calls.map(c => JSON.parse(c[0]) as { level: string; message: string });

type FakeDeps = { runCommand: jest.Mock; timeoutMs: number };
const deps = (runCommand: ScanDeps['runCommand']): FakeDeps => ({
  runCommand: jest.fn(runCommand),
  timeoutMs: 1000,
});
const run = (job: ReturnType<typeof fakeJob>, d: FakeDeps) =>
  processScan(job as never, d as ScanDeps);

// A fake SBOM tool: writes `content(file)` to every output file named in its arguments
// (syft `-o <format>=<file>`, trivy/scout `--output <file>`), like the real tools do.
const writesOutputs =
  (content: (file: string) => string | undefined) => async (_cmd: string, args: string[]) => {
    const files = [
      ...args.filter(a => /^[a-z-]+=\//.test(a)).map(a => a.split('=')[1]),
      ...args.flatMap((a, i) => (a === '--output' ? [args[i + 1]] : [])),
    ];
    for (const file of files) {
      const c = content(file);
      if (c !== undefined) await writeFile(file, c);
    }
    return '';
  };

describe('sbom job', () => {
  test('syft pulls once and writes both formats; both are returned, nothing stored', async () => {
    const d = deps(writesOutputs(f => JSON.stringify({ file: f.split('/').pop() })));
    const result = await run(fakeJob('sbom', { image: 'alpine:3.20', tool: 'syft' }), d);
    expect(d.runCommand).toHaveBeenCalledTimes(1);
    expect(d.runCommand.mock.calls[0][1][0]).toBe('registry:alpine:3.20');
    expect(result).toEqual({
      image: 'alpine:3.20',
      sboms: [
        { tool: 'syft', format: 'cdx', content: '{"file":"syft.cdx.json"}' },
        { tool: 'syft', format: 'spdx', content: '{"file":"syft.spdx.json"}' },
      ],
      cves: [],
    });
  });

  test('a format whose run fails is logged and the other format is still returned', async () => {
    const d = deps(async (cmd, args) => {
      if (args.includes('spdx-json')) throw new Error('exit 1');
      return writesOutputs(() => '{"bomFormat":"CycloneDX"}')(cmd, args);
    });
    const job = fakeJob('sbom', { image: 'alpine', tool: 'trivy' });
    const result = await run(job, d);
    expect(result!.sboms.map(a => a.format)).toEqual(['cdx']);
    expect(logged(job)).toEqual(
      expect.arrayContaining([
        { level: 'warning', message: expect.stringContaining('trivy failed: Error: exit 1') },
        { level: 'warning', message: 'no trivy SPDX SBOM' },
      ])
    );
  });

  test('output that is not JSON is a warning', async () => {
    const d = deps(writesOutputs(f => (f.endsWith('.spdx.json') ? 'panic' : '{}')));
    const job = fakeJob('sbom', { image: 'alpine', tool: 'syft' });
    expect((await run(job, d))!.sboms.map(a => a.format)).toEqual(['cdx']);
    expect(logged(job)).toContainEqual({
      level: 'warning',
      message: expect.stringContaining('syft SPDX SBOM failed'),
    });
  });

  test('a tool that cannot produce SBOMs is a warning, not a failure', async () => {
    const d = deps(async () => '');
    const job = fakeJob('sbom', { image: 'alpine', tool: 'grype' });
    expect(await run(job, d)).toEqual({ image: 'alpine', sboms: [], cves: [] });
    expect(logged(job)).toContainEqual({ level: 'warning', message: 'grype cannot produce SBOMs' });
    expect(d.runCommand).not.toHaveBeenCalled();
  });
});

describe('cve job', () => {
  const syftSbom = {
    'bull:scan:3': {
      image: 'alpine',
      sboms: [
        { tool: 'syft', format: 'cdx', content: '{"cdx":1}' },
        { tool: 'syft', format: 'spdx', content: '{"spdx":1}' },
      ],
      cves: [],
    },
  };

  test("scans its child's SPDX SBOM from a temp file and returns the report", async () => {
    const d = deps(async () => JSON.stringify({ matches: [] }));
    const job = fakeJob('cve', { image: 'alpine', tool: 'grype', producer: 'syft' }, syftSbom);
    const result = await run(job, d);
    expect(d.runCommand).toHaveBeenCalledWith(
      'grype',
      [expect.stringMatching(/^sbom:.*syft\.spdx\.json$/), '-o=json'],
      1000
    );
    expect(result!.cves.map(a => [a.tool, a.format])).toEqual([['grype', 'spdx']]);
    expect(JSON.parse(result!.cves[0].content)).toHaveProperty('vulns_by_package');
  });

  test('no SBOM from the child (its tool failed) is a warning, and nothing runs', async () => {
    const d = deps(async () => '{}');
    const job = fakeJob('cve', { image: 'alpine', tool: 'trivy', producer: 'trivy' }, {});
    expect((await run(job, d))!.cves).toEqual([]);
    expect(logged(job)).toContainEqual({
      level: 'warning',
      message: 'trivy has no trivy SBOM to scan',
    });
    expect(d.runCommand).not.toHaveBeenCalled();
  });

  test('a scanner without a report parser is skipped with a warning', async () => {
    const d = deps(async () => '{}');
    const job = fakeJob(
      'cve',
      { image: 'alpine', tool: 'scout', producer: 'scout' },
      {
        k: { image: 'alpine', sboms: [{ tool: 'scout', format: 'spdx', content: '{}' }], cves: [] },
      }
    );
    await run(job, d);
    expect(logged(job)).toContainEqual({ level: 'warning', message: 'scout cannot scan for CVEs' });
    expect(d.runCommand).not.toHaveBeenCalled();
  });

  test('a scanner that fails is logged and the job completes with no report', async () => {
    const d = deps(async () => {
      throw new Error('timeout');
    });
    const job = fakeJob('cve', { image: 'alpine', tool: 'grype', producer: 'syft' }, syftSbom);
    expect((await run(job, d))!.cves).toEqual([]);
    expect(logged(job)).toContainEqual({
      level: 'warning',
      message: expect.stringContaining('grype CVE scan failed'),
    });
  });
});

describe('scan job', () => {
  test('logs scanners whose SBOM was not requested, and returns nothing to store', async () => {
    const job = fakeJob('scan', {
      image: 'alpine',
      tools: { producers: ['trivy'], consumers: ['trivy', 'grype'] },
    });
    expect(
      await run(
        job,
        deps(async () => '{}')
      )
    ).toBeUndefined();
    expect(logged(job)).toEqual([
      { level: 'warning', message: 'grype needs a syft SBOM, which was not requested' },
    ]);
  });
});

test.each([
  ['an image that looks like a flag', 'sbom', { image: '--output=/etc/passwd', tool: 'syft' }],
  [
    'a source scheme instead of an image',
    'cve',
    { image: 'dir:/root', tool: 'grype', producer: 'syft' },
  ],
  ['a malformed scan', 'scan', { image: 'alpine' }],
  ['an unknown job', 'other', { image: 'alpine' }],
])('%s fails the job without running any tool', async (_, name, data) => {
  const d = deps(async () => '{}');
  await expect(run(fakeJob(name, data), d)).rejects.toThrow(/Invalid|Unknown/);
  expect(d.runCommand).not.toHaveBeenCalled();
});

test('a cve job waits for the vulnerability databases before scanning', async () => {
  let ready!: () => void;
  const databasesReady = new Promise<void>(r => (ready = r));
  const d = { ...deps(async () => JSON.stringify({ matches: [] })), databasesReady };
  const job = fakeJob(
    'cve',
    { image: 'alpine', tool: 'grype', producer: 'syft' },
    {
      k: { image: 'alpine', sboms: [{ tool: 'syft', format: 'spdx', content: '{}' }], cves: [] },
    }
  );
  const scanning = run(job, d);
  await new Promise(r => setTimeout(r, 10));
  expect(d.runCommand).not.toHaveBeenCalled();
  ready();
  expect((await scanning)!.cves).toHaveLength(1);
});

test('a trivy sbom job waits for the databases (Java DB) before running; syft does not', async () => {
  let ready!: () => void;
  const databasesReady = new Promise<void>(r => (ready = r));
  const d = { ...deps(writesOutputs(() => '{}')), databasesReady };
  const trivy = run(fakeJob('sbom', { image: 'alpine', tool: 'trivy' }), d);
  await run(fakeJob('sbom', { image: 'alpine', tool: 'syft' }), d);
  expect(d.runCommand.mock.calls.map(c => c[0])).toEqual(['syft']);
  ready();
  await trivy;
  expect(d.runCommand.mock.calls.map(c => c[0])).toEqual(['syft', 'trivy', 'trivy']);
});

describe('runCommand', () => {
  test('returns stdout', async () => {
    expect(await runCommand(process.execPath, ['-e', 'process.stdout.write("ok")'], 5000)).toBe(
      'ok'
    );
  });

  test('a tool killed at the timeout says so, instead of a bare "Command failed"', async () => {
    const hang = ['-e', 'process.stderr.write("downloading db"); setTimeout(() => {}, 10000)'];
    await expect(runCommand(process.execPath, hang, 3000)).rejects.toThrow(
      /timed out after 3s: downloading db/
    );
  });
});
