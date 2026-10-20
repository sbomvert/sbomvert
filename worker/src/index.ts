import { Worker } from 'bullmq';
import { redisConnection, SCAN_QUEUE, ScanQueueData } from '@sbomvert/core/queue';
import { defaultDeps, processScan, runCommand } from './processScan';

// Scans never download or update a database: they use the copies the worker fetches here, at
// startup and then every DB_REFRESH_HOURS, kept between restarts in the tool cache volume.
process.env.GRYPE_DB_AUTO_UPDATE = 'false'; // inherited by every grype run

async function updateDatabases() {
  const updates: [string, string[]][] = [
    ['grype', ['db', 'update']],
    ['trivy', ['image', '--download-db-only']],
    ['trivy', ['image', '--download-java-db-only']],
  ];
  for (const [cmd, args] of updates) {
    console.log(`${cmd} ${args.join(' ')}…`);
    await runCommand(cmd, args, 60 * 60 * 1000).catch(err =>
      console.error(
        `${cmd} database update failed; using the cached copy if there is one:`,
        err.message
      )
    );
  }
}

async function main() {
  // SBOM jobs start right away; CVE jobs and trivy wait for the databases (databasesReady)
  const deps = { ...defaultDeps(), databasesReady: updateDatabases() };
  const worker = new Worker<ScanQueueData>(SCAN_QUEUE, job => processScan(job, deps), {
    connection: redisConnection(),
    // 1 by default: concurrent trivy (or grype) runs fight over the lock on their shared cache
    concurrency: Number(process.env.SCAN_CONCURRENCY ?? 1),
  });
  worker.on('failed', (job, err) => console.error(`scan job ${job?.id} failed:`, err.message));
  worker.on('error', err => console.error('worker error:', err.message));
  console.log(`scan worker listening on queue "${SCAN_QUEUE}"`);

  // Refresh between jobs: pause() waits for the running job, so no scan reads a database
  // while it is being replaced.
  const refreshHours = Number(process.env.DB_REFRESH_HOURS ?? 24);
  setInterval(
    async () => {
      await deps.databasesReady;
      await worker.pause();
      try {
        await updateDatabases();
      } finally {
        worker.resume();
      }
    },
    refreshHours * 60 * 60 * 1000
  );

  // Finish the jobs in hand before exiting; BullMQ requeues anything left as stalled.
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => void worker.close().then(() => process.exit(0)));
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
