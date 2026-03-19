import { exec } from 'child_process';
import { promisify } from 'util';
import SBOMService from '@/services/sbomStorageService/sbomStorageService';
const execAsync = promisify(exec);

import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

import {
  saveRawSbom,
  saveCombinedSbom,
  saveToolCveReport,
  saveMergedCveReport,
  saveJobStatus,
} from './storage';
import { GenerateSPDXSBOMwithTool } from '@/lib/sbom/generator';
import { SanitizeContainerImage } from '@/lib/utils';
import { ScanSPDXwithTool } from '@/lib/vuln/scanner';
import CVEService from './cveStorageService/cveStorageService';
import { VULN_EXTRACTORS } from '@/lib/vuln/vulnutils';

const connection = new Redis({
  host: process.env.REDIS_HOST ?? '127.0.0.1',
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null,
});

export const scanQueue = new Queue('scan', { connection });

/**
 * Safely execute shell commands
 */
async function runCommand(cmd: string, timeout = 60000) {
  const { stdout, stderr } = await execAsync(cmd, {
    timeout,
    maxBuffer: 50 * 1024 * 1024, // 50MB output safety
  });

  if (stderr) {
    console.warn('stderr:', stderr);
  }

  return stdout;
}

/**
 * Parse JSON safely
 */
function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error('Invalid JSON output from tool');
  }
}

/**
 * Normalize CVEs across tools
 */
function extractVulnerabilities(tool: string, report: any) {
  const vulns: any[] = [];

  switch (tool) {
    // TRIVY
    case 'trivy':
      if (Array.isArray(report.Results)) {
        for (const res of report.Results) {
          for (const v of res.Vulnerabilities ?? []) {
            vulns.push({
              id: v.VulnerabilityID,
              severity: v.Severity,
              package: v.PkgName,
              version: v.InstalledVersion,
              tool,
            });
          }
        }
      }
      break;

    // GRYPE
    case 'grype':
      if (Array.isArray(report.matches)) {
        for (const m of report.matches) {
          const v = m.vulnerability;
          vulns.push({
            id: v?.id,
            severity: v?.severity,
            package: m.artifact?.name,
            version: m.artifact?.version,
            tool,
          });
        }
      }
      break;

    // DOCKER SCOUT
    case 'scout':
      if (Array.isArray(report.vulnerabilities)) {
        for (const v of report.vulnerabilities) {
          vulns.push({
            id: v.id,
            severity: v.severity,
            package: v.package,
            version: v.version,
            tool,
          });
        }
      }
      break;

    // fallback generic
    default:
      if (Array.isArray(report.vulnerabilities)) {
        vulns.push(...report.vulnerabilities);
      }
  }

  return vulns.filter(v => v.id);
}



export const scanWorker = new Worker(
  'scan',
  async (job: Job) => {

    if (!job.id) {
      console.error('Job id undefined', job);
      return;
    }

    const { image, tools } = job.data as {
      image: string;
      tools: { producers: string[], consumers: string[] };
    };

    if (!image || !tools || !tools.producers || !tools.consumers) {
      await saveJobStatus(job.id, 'failed', {
        level: 'error',
        message: 'Invalid job payload' + JSON.stringify(job.data),
      });
      return;
    }

    // Sbom service should tell me if sbom exists already for that image SBOMService

    await saveJobStatus(job.id, 'running');

    const results: Record<string, any> = {};
    const mergedCveMap = new Map<string, any>();

    //
    // Pull image
    //
    try {
      await job.updateProgress(5);

      await runCommand(
        `docker pull ${image}`,
        3 * 60 * 1000
      );

    } catch (err) {

      await saveJobStatus(job.id, 'failed', {
        level: 'error',
        message: 'Image pull failed' + String(err),
      });

      return {
        status: 'failed',
        step: 'pull',
      };
    }

    //
    // Run tools
    //
    let processed = 0;

    for (const tool of tools.producers) {

      const spdxcmd = GenerateSPDXSBOMwithTool(tool, image);

      if (!spdxcmd) continue;

      try {

        await job.updateProgress(
          10 + Math.floor((processed / tools.producers.length) * 70)
        );

        const stdout = await runCommand(spdxcmd);
        await saveJobStatus(job.id, 'partial', {
          level: "info",
          message: `Tool ${tool} is computing sbom`,
        });
        let parsed
        try {
          parsed = safeJsonParse(stdout);

          // TODO: check that output is correct
          await SBOMService.saveSBOM(SanitizeContainerImage(image), 'spdx', tool, stdout);

          await saveJobStatus(job.id, 'partial', {
            level: "info",
            message: `${tool} SBOM has been saved`,
          });
        } catch (error) {
          console.error('Error processing SBOM:', error);
          await saveJobStatus(job.id, 'failed', {
            level: "error",
            message: `Failed to process SBOM: ${error}`,
          });
          throw error
        }


        results[tool] = parsed;
        // FIXME: should be deleted
        const sbomPath = await saveRawSbom(job.id, tool, parsed);

        //
        // CVE Extraction
        //
        const cvecmd = ScanSPDXwithTool(tool, sbomPath)
        if (cvecmd === null) {
          await saveJobStatus(job.id, 'failed', {
            level: "error",
            message: `${tool} has no capabiilties to find CVEs`,
          });
          continue
        }


        try {
          const data = await runCommand(cvecmd)
          const vulns = safeJsonParse(data)
          await saveJobStatus(job.id, 'partial', {
            level: "info",
            message: `${tool} CVEs have been computed`,
          });
          // TODO: unify format
          const formatter = VULN_EXTRACTORS[tool]
          const formattedCVEs = formatter(vulns,{})
          await saveJobStatus(job.id, 'partial', {
            level: "info",
            message: `${tool} CVEs have been formatted to a common standard`,
          }); 
          await CVEService.saveCVEFile(SanitizeContainerImage(image), 'spdx', tool, JSON.stringify(formattedCVEs))
          //await saveToolCveReport(job.id, tool, vulns);
            await saveJobStatus(job.id, 'partial', {
            level: "info",
            message: `${tool} CVEs have been saved`,
          }); 
        } catch (error) {
          await saveJobStatus(job.id, 'failed', {
            level: "error",
            message: `${tool} failed to get CVEs from SBOM: ${error}`,
          });
          throw error
        }




      } catch (err) {

        console.warn(`Tool failed ${tool}`, err);

        await saveJobStatus(job.id, 'partial', {
          level: 'warning',
          message: `Tool ${tool} failed: ${String(err)}`
        });
      }

      processed++;
    }

    //
    // Combined SBOM
    //
    await saveCombinedSbom(
      job.id,
      Object.values(results)
    );

    //
    // Merged CVEs
    //
    await saveMergedCveReport(
      job.id,
      Array.from(mergedCveMap.values())
    );

    //
    // Cleanup image (important!)
    //
    try {
      await runCommand(
        `docker image rm ${image}`
      );
    } catch {
      // ignore cleanup failure
    }

    await job.updateProgress(100);

    await saveJobStatus(job.id, 'completed', {
      level: 'info',
      message: JSON.stringify({
        resultsCount: Object.keys(results).length,
        vulnerabilities: mergedCveMap.size
      }),
    });

    return {
      status: 'completed',
      jobId: job.id,
      processedTools: Object.keys(results),
    };
  },
  {
    connection,
    concurrency: Number(process.env.SCAN_CONCURRENCY ?? 2),
  }
);

export default scanQueue;