import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Job } from 'bullmq';
import { isValidImageRef } from '@sbomvert/core/image';
import {
  CveJobData,
  logStep,
  SbomJobData,
  sbomProducerFor,
  ScanJobData,
  ScanQueueData,
  ScanResult,
} from '@sbomvert/core/queue';
import { GenerateSBOMsWithTool } from '@sbomvert/core/sbom/generator';
import { SBOM_FORMATS, SbomFormat } from '@sbomvert/core/tools';
import { ScanSbomWithTool } from '@sbomvert/core/vuln/scanner';
import { VULN_EXTRACTORS } from '@sbomvert/core/vuln/vulnutils';

export type RunCommand = (cmd: string, args: string[], timeoutMs: number) => Promise<string>;

export type ScanDeps = {
  runCommand: RunCommand;
  timeoutMs: number;
  // resolves once the vulnerability databases are downloaded; CVE scans wait for it
  databasesReady?: Promise<unknown>;
};

const execFileAsync = promisify(execFile);

// No shell: arguments go to the tool as-is.
export const runCommand: RunCommand = async (cmd, args, timeout) => {
  try {
    const { stdout } = await execFileAsync(cmd, args, { timeout, maxBuffer: 50 * 1024 * 1024 });
    return stdout;
  } catch (err) {
    const e = err as { killed?: boolean; signal?: string; stderr?: string };
    if (e.killed && e.signal === 'SIGTERM') {
      const stderr = (e.stderr ?? '').trim().slice(-500);
      throw new Error(`${cmd} timed out after ${timeout / 1000}s${stderr ? `: ${stderr}` : ''}`);
    }
    throw err;
  }
};

export const defaultDeps = (env: Record<string, string | undefined> = process.env): ScanDeps => ({
  runCommand,
  timeoutMs: Number(env.RUN_EXPERIMENT_TIMEOUT) || 3 * 60 * 1000,
});

const parseJson = (text: string, what: string) => {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${what}: tool output is not JSON`);
  }
};

const isStringList = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every(t => typeof t === 'string');

// Job data comes over Redis: check what ends up as tool arguments.
function checkImage(image: unknown): string {
  if (typeof image !== 'string' || !isValidImageRef(image)) {
    throw new Error(`Invalid image reference: ${String(image)}`);
  }
  return image;
}

// Job data comes over Redis: only known formats; jobs queued before formats existed get all of them.
function checkFormats(formats: unknown): SbomFormat[] {
  if (formats === undefined) return [...SBOM_FORMATS];
  if (!Array.isArray(formats) || !formats.every((f): f is SbomFormat => SBOM_FORMATS.includes(f))) {
    throw new Error(`Invalid formats: ${JSON.stringify(formats)}`);
  }
  return formats;
}

// One job of a scan flow (see packages/core/src/queue.ts). Tool failures are logged as warnings
// and the job still completes with what did work; nothing is stored here: the returned
// artifacts are stored by the web app.
export async function processScan(
  job: Job<ScanQueueData>,
  deps: ScanDeps
): Promise<ScanResult | undefined> {
  switch (job.name) {
    case 'sbom':
      return generateSboms(job as Job<SbomJobData>, deps);
    case 'cve':
      return scanForCves(job as Job<CveJobData>, deps);
    case 'scan':
      return finishScan(job as Job<ScanJobData>);
    default:
      throw new Error(`Unknown scan job: ${job.name}`);
  }
}

// The requested formats (SPDX, CycloneDX), each written to a file by the tool (syft writes both in one run).
async function generateSboms(job: Job<SbomJobData>, deps: ScanDeps): Promise<ScanResult> {
  const image = checkImage(job.data.image);
  const { tool } = job.data;
  const formats = checkFormats(job.data.formats);
  const result: ScanResult = { image, sboms: [], cves: [] };
  if (!GenerateSBOMsWithTool(tool, image, '', formats)) {
    await logStep(job, 'warning', `${tool} cannot produce SBOMs`);
    return result;
  }
  // trivy needs its Java DB to identify JAR files, even for SBOMs
  if (tool === 'trivy' && deps.databasesReady) {
    await logStep(job, 'info', 'trivy is waiting for its databases');
    await deps.databasesReady;
  }
  const workDir = await mkdtemp(join(tmpdir(), 'sbom-'));
  try {
    const plan = GenerateSBOMsWithTool(tool, image, workDir, formats)!;
    await logStep(job, 'info', `${tool} is generating SBOMs`);
    for (const run of plan.runs) {
      try {
        await deps.runCommand(run.cmd, run.args, deps.timeoutMs);
      } catch (err) {
        await logStep(job, 'warning', `${tool} failed: ${err}`);
      }
    }
    for (const format of formats) {
      const label = `${tool} ${format.toUpperCase()} SBOM`;
      try {
        const content = await readFile(plan.outputs[format], 'utf8');
        parseJson(content, label);
        result.sboms.push({ tool, format, content });
        await logStep(job, 'info', `${label} generated`);
      } catch (err) {
        const missing = (err as NodeJS.ErrnoException).code === 'ENOENT';
        await logStep(job, 'warning', missing ? `no ${label}` : `${label} failed: ${err}`);
      }
    }
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
  return result;
}

// Scans the SBOMs its child sbom job produced, one CVE report per format.
async function scanForCves(job: Job<CveJobData>, deps: ScanDeps): Promise<ScanResult> {
  const image = checkImage(job.data.image);
  const { tool, producer } = job.data;
  const formats = checkFormats(job.data.formats);
  const result: ScanResult = { image, sboms: [], cves: [] };
  const extract = Object.hasOwn(VULN_EXTRACTORS, tool) ? VULN_EXTRACTORS[tool] : undefined;
  if (!ScanSbomWithTool(tool, '') || !extract) {
    await logStep(job, 'warning', `${tool} cannot scan for CVEs`);
    return result;
  }
  const children = Object.values(await job.getChildrenValues<ScanResult | undefined>());
  const sboms = children.flatMap(c => c?.sboms ?? []).filter(a => a.tool === producer);
  let waited = false;
  for (const format of formats) {
    const label = `${tool} ${format.toUpperCase()}`;
    const sbom = sboms.find(a => a.format === format);
    if (!sbom) {
      await logStep(job, 'warning', `${label}: no ${producer} ${format.toUpperCase()} SBOM to scan`);
      continue;
    }
    const workDir = await mkdtemp(join(tmpdir(), 'scan-'));
    try {
      // the scanners read the SBOM from a file
      const sbomPath = join(workDir, `${producer}.${format}.json`);
      const cmd = ScanSbomWithTool(tool, sbomPath)!;
      if (deps.databasesReady && !waited) {
        await logStep(job, 'info', `${tool} is waiting for the vulnerability databases`);
        await deps.databasesReady;
        waited = true;
      }
      await writeFile(sbomPath, sbom.content, 'utf8');
      await logStep(job, 'info', `${label} is scanning the ${producer} SBOM`);
      const out = await deps.runCommand(cmd.cmd, cmd.args, deps.timeoutMs);
      const report = extract(parseJson(out, `${label} CVE report`), {});
      result.cves.push({ tool, format, content: JSON.stringify(report) });
      await logStep(job, 'info', `${label} CVE report generated`);
    } catch (err) {
      await logStep(job, 'warning', `${label} CVE scan failed: ${err}`);
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }
  return result;
}

// Runs after all its children: logs the scanners that had no SBOM to read, so no job was made.
async function finishScan(job: Job<ScanJobData>): Promise<undefined> {
  const { tools } = job.data;
  if (!isStringList(tools?.producers) || !isStringList(tools?.consumers)) {
    throw new Error(`Invalid scan: ${JSON.stringify(job.data)}`);
  }
  for (const consumer of new Set(tools.consumers)) {
    const producer = sbomProducerFor(consumer);
    if (!tools.producers.includes(producer)) {
      await logStep(
        job,
        'warning',
        `${consumer} needs a ${producer} SBOM, which was not requested`
      );
    }
  }
  return undefined;
}
