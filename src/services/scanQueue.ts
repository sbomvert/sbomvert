import { execFile } from 'child_process';
import { promisify } from 'util';
import SBOMService from '@/services/sbomStorageService/sbomStorageService';

import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

import {
  saveRawSbom,
  saveCombinedSbom,
  saveMergedCveReport,
  saveJobStatus,
} from './storage';
import {
  GenerateCycloneDXSBOMwithTool,
  GenerateSPDXSBOMwithTool,
} from '@/lib/sbom/generator';
import { SanitizeContainerImage } from '@/lib/utils';
import { ScanSPDXwithTool } from '@/lib/vuln/scanner';
import CVEService from './cveStorageService/cveStorageService';
import { VULN_EXTRACTORS } from '@/lib/vuln/vulnutils';

const execFileAsync = promisify(execFile);
const RUN_EXPERIMENT_TIMEOUT = Number(process.env.RUN_EXPERIMENT_TIMEOUT) || 3 * 60 * 1000;
/**
 * Lazy Redis connection (prevents build-time connection attempts)
 */
let connection: Redis | null = null;

function getRedisConnection(): Redis {
  if (!connection) {
    connection = new Redis({
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
      maxRetriesPerRequest: null,
    });
  }
  return connection;
}

/**
 * Queue factory (no side effects on import)
 */
export function createScanQueue() {
  return new Queue('scan', {
    connection: getRedisConnection(),
  });
}

/**
 * Safely execute external commands without invoking a shell
 */
async function runCommand(cmd: string, args: string[], timeout = 60000) {
  const { stdout, stderr } = await execFileAsync(cmd, args, {
    timeout,
    maxBuffer: 50 * 1024 * 1024,
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
  } catch {
    throw new Error('Invalid JSON output from tool');
  }
}

/**
 * Worker factory (prevents execution during build)
 */
export function createScanWorker() {
  return new Worker(
    'scan',
    async (job: Job) => {
      if (!job.id) {
        console.error('Job id undefined', job);
        return;
      }

      const { image, tools } = job.data as {
        image: string;
        tools: { producers: string[]; consumers: string[] };
      };

      if (!image || !tools || !tools.producers || !tools.consumers) {
        await saveJobStatus(job.id, 'failed', {
          level: 'error',
          message: 'Invalid job payload' + JSON.stringify(job.data),
        });
        return;
      }

      await saveJobStatus(job.id, 'running', undefined, { image });

      const results: Record<string, any> = {};
      const mergedCveMap = new Map<string, any>();

      // Pull image
      try {
        await job.updateProgress(5);

        await runCommand(`docker`,[ 'pull', image], 3 * 60 * 1000);
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

      let processed = 0;

      const sbomPaths: Record<string, string> = {};

      for (const tool of tools.producers) {
        const spdxcmd = GenerateSPDXSBOMwithTool(tool, image);
        const cyclonedxcmd = GenerateCycloneDXSBOMwithTool(tool, image);

        if (!spdxcmd) continue;

        try {
          await job.updateProgress(
            10 + Math.floor((processed / tools.producers.length) * 70)
          );

          if (cyclonedxcmd) {
            try {
              const cyclonedxStdout = await runCommand(
                cyclonedxcmd.cmd,
                cyclonedxcmd.args,
                RUN_EXPERIMENT_TIMEOUT
              );
              safeJsonParse(cyclonedxStdout);

              await SBOMService.saveSBOM(
                SanitizeContainerImage(image),
                'cdx',
                tool,
                cyclonedxStdout
              );

              await saveJobStatus(job.id, 'partial', {
                level: 'info',
                message: `${tool} CycloneDX SBOM has been saved`,
              });
            } catch (error) {
              await saveJobStatus(job.id, 'partial', {
                level: 'warning',
                message: `${tool} CycloneDX SBOM failed: ${error}`,
              });
            }
          }

          await saveJobStatus(job.id, 'partial', {
            level: 'info',
            message: `Tool ${tool} is computing sbom`,
          });

          const stdout = await runCommand(
            spdxcmd.cmd,
            spdxcmd.args,
            RUN_EXPERIMENT_TIMEOUT
          );

          let parsed;

          try {
            parsed = safeJsonParse(stdout);

            await SBOMService.saveSBOM(
              SanitizeContainerImage(image),
              'spdx',
              tool,
              stdout
            );

            await saveJobStatus(job.id, 'partial', {
              level: 'info',
              message: `${tool} SBOM has been saved`,
            });
          } catch (error) {
            await saveJobStatus(job.id, 'failed', {
              level: 'error',
              message: `Failed to process SBOM: ${error}`,
            });
            throw error;
          }

          results[tool] = parsed;

          const sbomPath = await saveRawSbom(job.id, tool, parsed);

          sbomPaths[tool] = sbomPath;

        } catch (err) {
          console.warn(`Tool failed ${tool}`, err);

          await saveJobStatus(job.id, 'partial', {
            level: 'warning',
            message: `Tool ${tool} failed: ${String(err)}`,
          });
        }

        processed++;
      }

      // CVE extraction
      for (const consumer of tools.consumers) {
        const sbomProducer = consumer === 'grype' ? 'syft' : consumer;
        const sbomPath = sbomPaths[sbomProducer];

        if (!sbomPath) {
          await saveJobStatus(job.id, 'partial', {
            level: 'warning',
            message: `${consumer} has no ${sbomProducer} SBOM to scan`,
          });
          continue;
        }

        const cvecmd = ScanSPDXwithTool(consumer, sbomPath);

        if (cvecmd === null) {
          await saveJobStatus(job.id, 'failed', {
            level: 'error',
            message: `${consumer} has no capabilities to find CVEs`,
          });
          continue;
        }

        try {
          const data = await runCommand(cvecmd.cmd, cvecmd.args, RUN_EXPERIMENT_TIMEOUT);

          const vulns = safeJsonParse(data);

          await saveJobStatus(job.id, 'partial', {
            level: 'info',
            message: `${consumer} CVEs have been computed`,
          });

          const formatter = VULN_EXTRACTORS[consumer];
          const formattedCVEs = formatter(vulns, {});

          await saveJobStatus(job.id, 'partial', {
            level: 'info',
            message: `${consumer} CVEs formatted`,
          });

          await CVEService.saveCVEFile(
            SanitizeContainerImage(image),
            'spdx',
            consumer,
            JSON.stringify(formattedCVEs)
          );

          await saveJobStatus(job.id, 'partial', {
            level: 'info',
            message: `${consumer} CVEs saved`,
          });
        } catch (error) {
          await saveJobStatus(job.id, 'failed', {
            level: 'error',
            message: `${consumer} failed CVE extraction: ${error}`,
          });
        }
      }

      await saveCombinedSbom(job.id, Object.values(results));

      await saveMergedCveReport(
        job.id,
        Array.from(mergedCveMap.values())
      );

      try {
        await runCommand('docker', ['image','rm',image]);
      } catch {
        // ignore
      }

      await job.updateProgress(100);

      await saveJobStatus(job.id, 'completed', {
        level: 'info',
        message: JSON.stringify({
          resultsCount: Object.keys(results).length,
          vulnerabilities: mergedCveMap.size,
        }),
      });

      return {
        status: 'completed',
        jobId: job.id,
        processedTools: Object.keys(results),
      };
    },
    {
      connection: getRedisConnection(),
      concurrency: Number(process.env.SCAN_CONCURRENCY ?? 2),
    }
  );
}
