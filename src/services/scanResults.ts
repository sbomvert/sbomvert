import { SanitizeContainerImage } from '@sbomvert/scan/image';
import type { Job, Queue } from 'bullmq';
import type { ScanQueueData, ScanResult } from '@sbomvert/scan/queue';
import SBOMService from '@sbomvert/storage/sbom/sbomStorageService';
import CVEService from '@sbomvert/storage/cve/cveStorageService';

type Storage = {
  saveSbom: (image: string, format: string, tool: string, content: string) => Promise<void>;
  saveCves: (image: string, format: string, tool: string, content: string) => Promise<void>;
  // the scanner's own CVE output, kept for review
  saveRawCves: (image: string, format: string, tool: string, content: string) => Promise<void>;
};

const defaultStorage: Storage = {
  saveSbom: (image, format, tool, content) => SBOMService.saveSBOM(image, format, tool, content),
  saveCves: (image, format, tool, content) => CVEService.saveCVEFile(image, format, tool, content),
  saveRawCves: (image, format, tool, content) => CVEService.saveRawCVEFile(image, format, tool, content),
};

// Stores what a scan job returned, where /compare reads it: <SBOM_DIR|CVE_DIR>/<image>/<tool>.<format>.json,
// and each CVE report's raw scanner output under <CVE_RAW_DIR>/<image>/<tool>.<format>.json
export async function storeScanResults(result: ScanResult, storage: Storage = defaultStorage) {
  const image = SanitizeContainerImage(result.image);
  for (const { tool, format, content } of result.sboms)
    await storage.saveSbom(image, format, tool, content);
  for (const { tool, format, content, raw } of result.cves) {
    await storage.saveCves(image, format, tool, content);
    if (raw !== undefined) await storage.saveRawCves(image, format, tool, raw);
  }
}

const isScanResult = (v: unknown): v is ScanResult => {
  const r = v as ScanResult;
  return !!r && typeof r.image === 'string' && Array.isArray(r.sboms) && Array.isArray(r.cves);
};

// Stores a completed job's results once, then marks the job so a later pass skips it. When the job is a
// whole scan (its root, done after all its jobs), its jobs' contents are then dropped from Redis.
export async function storeCompletedScan(
  queue: Queue<ScanQueueData>,
  jobId: string,
  storage: Storage = defaultStorage
): Promise<void> {
  const job = await queue.getJob(jobId);
  if (!job) return;
  if (!job.data.storedAt && isScanResult(job.returnvalue)) {
    await storeScanResults(job.returnvalue, storage);
    // as Job: BullMQ types updateData's argument as the intersection of the queue's data union
    await (job as Job).updateData({ ...job.data, storedAt: new Date().toISOString() });
  }
  if (!job.parentKey) await dropStoredContents(queue, job as Job, storage);
}

const withoutContents = (r: ScanResult) => ({
  ...r,
  sboms: r.sboms.map(({ content: _, ...a }) => a),
  cves: r.cves.map(({ content: __, raw: ___, ...a }) => a),
});

// Once a scan is done its SBOMs and CVE reports are in storage, and nothing reads them from Redis again (a cve
// job reads its sbom job's before it ends). Each job's return value, and the copy its parent keeps (which the
// status pages walk), are rewritten without them: they held each SBOM twice for the last 500 jobs (GBs).
async function dropStoredContents(queue: Queue<ScanQueueData>, job: Job, storage: Storage) {
  const { processed = {} } = await job.getDependencies();
  const client = await queue.client;
  for (const [childKey, value] of Object.entries(processed)) {
    const childId = childKey.slice(childKey.lastIndexOf(':') + 1);
    const child = await queue.getJob(childId);
    if (!child) continue;
    // its own `completed` event may not be handled yet: stored first (throws, so nothing is dropped, if it fails)
    await storeCompletedScan(queue, childId, storage);
    await dropStoredContents(queue, child as Job, storage);
    if (!isScanResult(value)) continue;
    const stripped = JSON.stringify(withoutContents(value));
    await client.hset(childKey, { returnvalue: stripped });
    await client.hset(`${queue.toKey(job.id!)}:processed`, { [childKey]: stripped });
  }
}

// Results of jobs that completed while no app was listening (e.g. the app was restarting), and the contents
// of every finished scan dropped from Redis (again: a no-op once done).
export async function storeMissedScans(
  queue: Queue<ScanQueueData>,
  storage: Storage = defaultStorage
) {
  // a page at a time: a job holds its SBOMs until its scan is done (tens of MB each)
  const PAGE = 10;
  for (let start = 0; ; start += PAGE) {
    const jobs = await queue.getJobs(['completed'], start, start + PAGE - 1);
    for (const job of jobs) {
      if (job.id && (!job.data.storedAt || !job.parentKey)) await storeCompletedScan(queue, job.id, storage);
    }
    if (jobs.length < PAGE) return;
  }
}
