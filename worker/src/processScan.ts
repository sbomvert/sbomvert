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
import { ScanSPDXwithTool } from '@sbomvert/core/vuln/scanner';
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

// SPDX and CycloneDX, each written to a file by the tool (syft writes both in one run).
async function generateSboms(job: Job<SbomJobData>, deps: ScanDeps): Promise<ScanResult> {
  const image = checkImage(job.data.image);
  const { tool } = job.data;
  const result: ScanResult = { image, sboms: [], cves: [] };
  if (!GenerateSBOMsWithTool(tool, image, '')) {
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
    const plan = GenerateSBOMsWithTool(tool, image, workDir)!;
    await logStep(job, 'info', `${tool} is generating SBOMs`);
    for (const run of plan.runs) {
      try {
        await deps.runCommand(run.cmd, run.args, deps.timeoutMs);
      } catch (err) {
        await logStep(job, 'warning', `${tool} failed: ${err}`);
      }
    }
    for (const format of ['cdx', 'spdx'] as const) {
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

// Scans the SPDX SBOM its child sbom job produced.
async function scanForCves(job: Job<CveJobData>, deps: ScanDeps): Promise<ScanResult> {
  const image = checkImage(job.data.image);
  const { tool, producer } = job.data;
  const result: ScanResult = { image, sboms: [], cves: [] };
  const children = Object.values(await job.getChildrenValues<ScanResult | undefined>());
  const sbom = children
    .flatMap(c => c?.sboms ?? [])
    .find(a => a.tool === producer && a.format === 'spdx');
  if (!sbom) {
    await logStep(job, 'warning', `${tool} has no ${producer} SBOM to scan`);
    return result;
  }
  const extract = Object.hasOwn(VULN_EXTRACTORS, tool) ? VULN_EXTRACTORS[tool] : undefined;
  const workDir = await mkdtemp(join(tmpdir(), 'scan-'));
  try {
    // the scanners read the SBOM from a file
    const sbomPath = join(workDir, `${producer}.spdx.json`);
    const cmd = ScanSPDXwithTool(tool, sbomPath);
    if (!cmd || !extract) {
      await logStep(job, 'warning', `${tool} cannot scan for CVEs`);
      return result;
    }
    if (deps.databasesReady) {
      await logStep(job, 'info', `${tool} is waiting for the vulnerability databases`);
      await deps.databasesReady;
    }
    await writeFile(sbomPath, sbom.content, 'utf8');
    await logStep(job, 'info', `${tool} is scanning the ${producer} SBOM`);
    const out = await deps.runCommand(cmd.cmd, cmd.args, deps.timeoutMs);
    const report = extract(parseJson(out, `${tool} CVE report`), {});
    result.cves.push({ tool, format: 'spdx', content: JSON.stringify(report) });
    await logStep(job, 'info', `${tool} CVE report generated`);
  } catch (err) {
    await logStep(job, 'warning', `${tool} CVE scan failed: ${err}`);
  } finally {
    await rm(workDir, { recursive: true, force: true });
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
