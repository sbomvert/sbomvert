export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { FEATURE_FLAGS } = await import('./lib/featureFlags');
  if (!FEATURE_FLAGS.ENABLE_SCAN_API) return;
  const { getScanQueue, onScanCompleted } = await import('@sbomvert/core/queue');
  const { storeCompletedScan, storeMissedScans } = await import('./services/scanResults');
  const queue = getScanQueue();
  onScanCompleted(jobId => storeCompletedScan(queue, jobId));
  // then catch up on scans that finished while the app was down
  storeMissedScans(queue).catch(err => console.error('Storing missed scan results failed', err));
  console.log('scan results: storing completed scans');
}
