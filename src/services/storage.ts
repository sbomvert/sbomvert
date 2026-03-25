import { promises as fs } from 'fs';
import { join } from 'path';

// Base directory for persisted artifacts – ignored via .gitignore (ensure it exists at runtime)
const STORAGE_ROOT = join(process.cwd(), 'storage');

/** Ensure a directory exists (recursive) */
async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

/** Save raw SBOM JSON for a given job and tool */
export async function saveRawSbom(jobId: string, tool: string, data: unknown) {
  const dir = join(STORAGE_ROOT, 'sboms', jobId);
  await ensureDir(dir);
  const path = join(dir, `${tool}.json`);
  await fs.writeFile(path, JSON.stringify(data, null, 2));
  return path;
}

/** Save combined SBOM (merged) */
export async function saveCombinedSbom(jobId: string, data: unknown) {
  const dir = join(STORAGE_ROOT, 'sboms', jobId);
  await ensureDir(dir);
  const path = join(dir, 'combined.json');
  await fs.writeFile(path, JSON.stringify(data, null, 2));
  return path;
}

/** Save CVE report for a tool */
export async function saveToolCveReport(jobId: string, tool: string, report: unknown) {
  const dir = join(STORAGE_ROOT, 'cves', jobId);
  await ensureDir(dir);
  const path = join(dir, `${tool}.json`);
  await fs.writeFile(path, JSON.stringify(report, null, 2));
  return path;
}

/** Save merged CVE report */
export async function saveMergedCveReport(jobId: string, report: unknown) {
  const dir = join(STORAGE_ROOT, 'cves', jobId);
  await ensureDir(dir);
  const path = join(dir, 'merged.json');
  await fs.writeFile(path, JSON.stringify(report, null, 2));
  return path;
}

export interface JobLogEntry {
  level: string;
  message: string;
}


/** Retrieve a JSON file (raw) */
export async function saveJobStatus(
  jobId: string,
  status: string,
  entry?: JobLogEntry
) {
  const dir = join(STORAGE_ROOT, 'jobs');
  await ensureDir(dir);
  const path = join(dir, `${jobId}.json`);

  let previousHistory: unknown[] = [];

  try {
    const existing = await fs.readFile(path, 'utf8');
    const parsed = JSON.parse(existing);
    previousHistory = Array.isArray(parsed?.history)
      ? parsed.history
      : [];
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      console.error('Failed reading previous job file:', err);
    }
  }

  const updatedHistory = entry
    ? [...previousHistory, entry]
    : previousHistory;

  const payload = {
    status,
    updatedAt: new Date().toISOString(),
    history: updatedHistory,
  };

  await fs.writeFile(path, JSON.stringify(payload, null, 2));

  return path;
}


export async function getJobStatus(jobId: string) {
  const path = join(STORAGE_ROOT, 'jobs', `${jobId}.json`);
  const content = await fs.readFile(path, 'utf-8');
  return JSON.parse(content);
}


