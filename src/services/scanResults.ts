import { SanitizeContainerImage } from '@sbomvert/core/image';
import type { Job, Queue } from 'bullmq';
import type { ScanQueueData, ScanResult } from '@sbomvert/core/queue';
import SBOMService from '@sbomvert/core/storage/sbom/sbomStorageService';
import CVEService from '@sbomvert/core/storage/cve/cveStorageService';

type Storage = {
  saveSbom: (image: string, format: string, tool: string, content: string) => Promise<void>;
  saveCves: (image: string, format: string, tool: string, content: string) => Promise<void>;
};

const defaultStorage: Storage = {
  saveSbom: (image, format, tool, content) => SBOMService.saveSBOM(image, format, tool, content),
  saveCves: (image, format, tool, content) => CVEService.saveCVEFile(image, format, tool, content),
};

// Stores what a scan job returned, where /compare reads it: <SBOM_DIR|CVE_DIR>/<image>/<tool>.<format>.json
export async function storeScanResults(result: ScanResult, storage: Storage = defaultStorage) {
  const image = SanitizeContainerImage(result.image);
  for (const { tool, format, content } of result.sboms)
    await storage.saveSbom(image, format, tool, content);
  for (const { tool, format, content } of result.cves)
    await storage.saveCves(image, format, tool, content);
}

const isScanResult = (v: unknown): v is ScanResult => {
  const r = v as ScanResult;
  return !!r && typeof r.image === 'string' && Array.isArray(r.sboms) && Array.isArray(r.cves);
};

// Stores a completed job's results once, then marks the job so a later pass skips it.
export async function storeCompletedScan(
  queue: Queue<ScanQueueData>,
  jobId: string,
  storage: Storage = defaultStorage
): Promise<void> {
  const job = await queue.getJob(jobId);
  if (!job || job.data.storedAt || !isScanResult(job.returnvalue)) return;
  await storeScanResults(job.returnvalue, storage);
  // as Job: BullMQ types updateData's argument as the intersection of the queue's data union
  await (job as Job).updateData({ ...job.data, storedAt: new Date().toISOString() });
}

// Results of jobs that completed while no app was listening (e.g. the app was restarting).
export async function storeMissedScans(
  queue: Queue<ScanQueueData>,
  storage: Storage = defaultStorage
) {
  for (const job of await queue.getJobs(['completed'])) {
    if (job.id && !job.data.storedAt) await storeCompletedScan(queue, job.id, storage);
  }
}
