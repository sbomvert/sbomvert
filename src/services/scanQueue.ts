import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
import { Queue, Worker, QueueScheduler, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { saveRawSbom, saveCombinedSbom, saveToolCveReport, saveMergedCveReport, saveJobStatus } from './storage';

// Simple Redis connection – uses default localhost:6379. Adjust via env if needed.
const connection = new Redis({
  host: process.env.REDIS_HOST ?? '127.0.0.1',
  port: Number(process.env.REDIS_PORT ?? 6379),
});

// Queue for scan jobs
export const scanQueue = new Queue('scan', { connection });
export const scanScheduler = new QueueScheduler('scan', { connection });

// Worker to process jobs – placeholder implementation; real logic will be added later.
export const scanWorker = new Worker(
  'scan',
  async (job: Job) => {
    // Update job status to running
    await saveJobStatus(job.id, 'running');

    const { image, tools } = job.data as { image: string; tools: string[] };
    const results: Record<string, any> = {};
    const cveReports: Record<string, any> = {};

    // Pull Docker image (timeout 3 minutes)
    try {
      await execAsync(`docker pull ${image}`, { timeout: 3 * 60 * 1000 });
    } catch (err) {
      await saveJobStatus(job.id, 'failed', { error: 'Image pull failed', details: err });
      return { status: 'failed', step: 'pull', error: err };
    }

    // Process each selected tool
    for (const tool of tools) {
      try {
        // Simple command mapping – adjust as needed for each tool
        let cmd = '';
        switch (tool) {
          case 'trivy':
            cmd = `trivy image --quiet --format json ${image}`;
            break;
          case 'syft':
            cmd = `syft ${image} -o json`;
            break;
          case 'grype':
            cmd = `grype ${image} -o json`;
            break;
          case 'scout':
            cmd = `docker scout quickview ${image} --format json`;
            break;
          default:
            continue; // skip unknown tool
        }
        const { stdout } = await execAsync(cmd, { timeout: 60 * 1000 });
        const parsed = JSON.parse(stdout);
        results[tool] = parsed;
        // Save raw SBOM / report
        await saveRawSbom(job.id, tool, parsed);
        // If tool provides CVE data, also store as CVE report (simplified assumption)
        await saveToolCveReport(job.id, tool, parsed);
        cveReports[tool] = parsed;
      } catch (e) {
        // Log but continue with other tools
        await saveJobStatus(job.id, 'partial', { warning: `Tool ${tool} failed`, error: e });
        console.warn('Tool execution error', tool, e);
      }
    }

    // Save combined SBOM (simple array of all raw SBOMs)
    await saveCombinedSbom(job.id, Object.values(results));

    // Merge CVE reports – union of IDs (very naive implementation)
    const mergedCves: any[] = [];
    const seen = new Set();
    for (const rep of Object.values(cveReports)) {
      if (Array.isArray(rep.vulnerabilities)) {
        for (const vuln of rep.vulnerabilities) {
          if (!seen.has(vuln.id)) {
            seen.add(vuln.id);
            mergedCves.push(vuln);
          }
        }
      }
    }
    await saveMergedCveReport(job.id, mergedCves);

    // Final status
    await saveJobStatus(job.id, 'completed', { resultsCount: Object.keys(results).length });
    return { status: 'completed', jobId: job.id, processedTools: Object.keys(results) };

  },
  { connection }
);

export default scanQueue;
