import { FlowJob, FlowProducer, Job, JobNode, Queue, QueueEvents } from 'bullmq';
import { sbomProducerFor } from './tools';

// The scan queue shared by the web app (adds scans, reads status) and the scan worker (runs them).
export const SCAN_QUEUE = 'scan';

// A scan is a BullMQ flow of jobs on this queue, all named by what they do:
//
//   scan             parent: completes once all its children have; returns nothing
//   ├─ cve trivy     scans the SBOM of its child job
//   │  └─ sbom trivy
//   ├─ cve grype     (grype reads syft's SBOM)
//   │  └─ sbom syft
//   └─ sbom scout    producers that no requested scanner reads hang off the parent
//
// Each sbom/cve job returns its artifacts (ScanResult) as soon as it completes, and the web app
// stores them then, so one slow or failing tool doesn't hold back the others' results.
export type ScanJobData = {
  image: string;
  tools: { producers: string[]; consumers: string[] };
};
export type SbomJobData = { image: string; tool: string };
export type CveJobData = { image: string; tool: string; producer: string };
// storedAt: set by the web app once it has stored the job's results
export type ScanQueueData = (ScanJobData | SbomJobData | CveJobData) & { storedAt?: string };

// What an sbom or cve job returns. The worker stores nothing; the web app stores these.
export type ScanArtifact = { tool: string; format: 'spdx' | 'cdx'; content: string };
export type ScanResult = { image: string; sboms: ScanArtifact[]; cves: ScanArtifact[] };

export type ScanLogEntry = { level: 'info' | 'warning' | 'error'; message: string };

// What the scan status routes return (the shape RecentScans reads).
export type ScanStatus = {
  jobId: string;
  image?: string;
  status: string;
  updatedAt: string;
  history: ScanLogEntry[];
};

// A plain options object: BullMQ opens its own connections (a blocking worker needs a dedicated one).
export const redisConnection = (env: Record<string, string | undefined> = process.env) => ({
  host: env.REDIS_HOST ?? '127.0.0.1',
  port: Number(env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null,
});

// Finished jobs are kept for the status pages, but not forever.
const KEEP = { count: 500 };

// re-exported: the worker and tests import it from the queue
export { sbomProducerFor };

export function buildScanFlow(scan: ScanJobData): FlowJob {
  const opts = { removeOnComplete: KEEP, removeOnFail: KEEP };
  // a failed child must not leave its parent waiting forever
  const childOpts = { ...opts, ignoreDependencyOnFailure: true };
  const sbomJob = (tool: string): FlowJob => ({
    name: 'sbom',
    queueName: SCAN_QUEUE,
    data: { image: scan.image, tool } satisfies SbomJobData,
    opts: childOpts,
  });
  const read = new Set<string>();
  const children: FlowJob[] = [];
  for (const consumer of new Set(scan.tools.consumers)) {
    const producer = sbomProducerFor(consumer);
    // a scanner without its SBOM gets no job; the scan job logs that
    if (!scan.tools.producers.includes(producer) || read.has(producer)) continue;
    read.add(producer);
    children.push({
      name: 'cve',
      queueName: SCAN_QUEUE,
      data: { image: scan.image, tool: consumer, producer } satisfies CveJobData,
      opts: childOpts,
      children: [sbomJob(producer)],
    });
  }
  for (const producer of new Set(scan.tools.producers)) {
    if (!read.has(producer)) children.push(sbomJob(producer));
  }
  return { name: 'scan', queueName: SCAN_QUEUE, data: scan, opts, children };
}

// Cached on globalThis, not in this module: `next dev` re-evaluates modules on every recompile,
// and a module-level cache would open (and leak) a new Redis connection each time.
const cache = globalThis as typeof globalThis & {
  __sbomvertScanQueue?: Queue<ScanQueueData>;
  __sbomvertScanFlows?: FlowProducer;
  __sbomvertScanEvents?: QueueEvents;
};

export function getScanQueue(): Queue<ScanQueueData> {
  return (cache.__sbomvertScanQueue ??= new Queue<ScanQueueData>(SCAN_QUEUE, {
    connection: redisConnection(),
  }));
}

export function getScanFlows(): FlowProducer {
  return (cache.__sbomvertScanFlows ??= new FlowProducer({ connection: redisConnection() }));
}

// Progress messages live in the job's BullMQ log, one JSON entry per line.
export const logStep = (job: Job, level: ScanLogEntry['level'], message: string) =>
  job.log(JSON.stringify({ level, message }));

const parseLogLine = (line: string): ScanLogEntry => {
  try {
    const e = JSON.parse(line);
    if (e && typeof e.message === 'string') return { level: e.level ?? 'info', message: e.message };
  } catch {
    /* plain text line */
  }
  return { level: 'info', message: line };
};

const STATUS: Record<string, string> = {
  completed: 'completed',
  failed: 'failed',
  active: 'running',
  'waiting-children': 'running',
};

const flatten = (node: JobNode): Job[] => [node.job, ...(node.children ?? []).flatMap(flatten)];

// One status for the whole scan: the parent's state, and every job's log in the order they ran.
export async function toScanStatus(
  queue: Queue<ScanQueueData>,
  flow: JobNode
): Promise<ScanStatus> {
  const root = flow.job;
  const jobs = flatten(flow).sort(
    (a, b) => (a.processedOn ?? a.timestamp) - (b.processedOn ?? b.timestamp)
  );
  const [state, logs] = await Promise.all([
    root.getState(),
    Promise.all(jobs.map(j => queue.getJobLogs(j.id!))),
  ]);
  const history = jobs.flatMap((job, i) => {
    const entries = logs[i].logs.map(parseLogLine);
    if (job.failedReason) entries.push({ level: 'error', message: job.failedReason });
    return entries;
  });
  const updated = Math.max(...jobs.map(j => j.finishedOn ?? j.processedOn ?? j.timestamp));
  return {
    jobId: root.id!,
    image: (root.data as ScanJobData | undefined)?.image,
    status: STATUS[state] ?? 'pending',
    updatedAt: new Date(updated).toISOString(),
    history,
  };
}

export async function getScanStatus(
  flows: FlowProducer,
  queue: Queue<ScanQueueData>,
  jobId: string
): Promise<ScanStatus | undefined> {
  const flow = await flows.getFlow({ id: jobId, queueName: SCAN_QUEUE });
  // the id of an sbom/cve job is not a scan
  if (!flow?.job || flow.job.parentKey) return undefined;
  return toScanStatus(queue, flow);
}

// Newest scans first (parent jobs only), across waiting, running and finished ones.
export async function getRecentScans(
  flows: FlowProducer,
  queue: Queue<ScanQueueData>,
  limit = 10
): Promise<ScanStatus[]> {
  // children are listed too, so look further back than `limit`
  const jobs = await queue.getJobs(
    ['active', 'waiting', 'waiting-children', 'delayed', 'completed', 'failed'],
    0,
    limit * 20
  );
  const scans = jobs
    .filter(j => j.id && !j.parentKey)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
  const statuses = await Promise.all(scans.map(j => getScanStatus(flows, queue, j.id!)));
  return statuses.filter((s): s is ScanStatus => !!s);
}

// Calls handler with the id of each job that completes. One listener per process, so a module
// reload in `next dev` doesn't handle every job twice. Jobs that complete while nobody listens
// are not reported here: catch up on those with queue.getJobs(['completed']).
export function onScanCompleted(handler: (jobId: string) => Promise<void>) {
  if (cache.__sbomvertScanEvents) return cache.__sbomvertScanEvents;
  const events = new QueueEvents(SCAN_QUEUE, { connection: redisConnection() });
  events.on('completed', ({ jobId }) => {
    handler(jobId).catch(err => console.error(`Handling completed scan job ${jobId} failed`, err));
  });
  events.on('error', err => console.error('scan queue events:', err.message));
  return (cache.__sbomvertScanEvents = events);
}
