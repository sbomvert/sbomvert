import { storeCompletedScan, storeMissedScans, storeScanResults } from './scanResults';

// the default storage services touch the filesystem when imported
jest.mock('@sbomvert/core/storage/sbom/sbomStorageService', () => ({ default: {} }));
jest.mock('@sbomvert/core/storage/cve/cveStorageService', () => ({ default: {} }));

test('stores every SBOM and CVE report of a scan under the sanitized image name', async () => {
  const storage = {
    saveSbom: jest.fn().mockResolvedValue(undefined),
    saveCves: jest.fn().mockResolvedValue(undefined),
  };
  await storeScanResults(
    {
      image: 'library/alpine:3.20',
      sboms: [
        { tool: 'syft', format: 'cdx', content: 'c' },
        { tool: 'syft', format: 'spdx', content: 's' },
      ],
      cves: [{ tool: 'grype', format: 'spdx', content: 'v' }],
    },
    storage
  );
  expect(storage.saveSbom.mock.calls).toEqual([
    ['libraryslashalpinetwodots3.20', 'cdx', 'syft', 'c'],
    ['libraryslashalpinetwodots3.20', 'spdx', 'syft', 's'],
  ]);
  expect(storage.saveCves).toHaveBeenCalledWith(
    'libraryslashalpinetwodots3.20',
    'spdx',
    'grype',
    'v'
  );
});

describe('storing completed scan jobs', () => {
  const result = {
    image: 'alpine',
    sboms: [{ tool: 'syft', format: 'spdx' as const, content: 's' }],
    cves: [],
  };
  const storage = () => ({
    saveSbom: jest.fn().mockResolvedValue(undefined),
    saveCves: jest.fn().mockResolvedValue(undefined),
  });
  const job = (id: string, over: Record<string, unknown> = {}) => ({
    id,
    data: { image: 'alpine', tools: { producers: ['syft'], consumers: [] } },
    returnvalue: result,
    updateData: jest.fn().mockResolvedValue(undefined),
    ...over,
  });
  const queue = (jobs: ReturnType<typeof job>[]) =>
    ({
      getJob: jest.fn(async (id: string) => jobs.find(j => j.id === id)),
      getJobs: jest.fn(async () => jobs),
    }) as never;

  test('stores a completed job once and marks it stored', async () => {
    const j = job('3');
    const s = storage();
    await storeCompletedScan(queue([j]), '3', s);
    expect(s.saveSbom).toHaveBeenCalledWith('alpine', 'spdx', 'syft', 's');
    expect(j.updateData).toHaveBeenCalledWith(
      expect.objectContaining({ storedAt: expect.any(String) })
    );
  });

  test('skips jobs already stored, unknown, or without a scan result (older jobs)', async () => {
    const s = storage();
    const q = queue([
      job('1', { returnvalue: { sboms: ['trivy', 'syft'] } }),
      job('2', {
        data: { image: 'alpine', tools: { producers: [], consumers: [] }, storedAt: 't' },
      }),
    ]);
    await storeCompletedScan(q, '1', s);
    await storeCompletedScan(q, '2', s);
    await storeCompletedScan(q, 'nope', s);
    expect(s.saveSbom).not.toHaveBeenCalled();
  });

  test('storeMissedScans stores every completed job not yet stored', async () => {
    const s = storage();
    const stored = job('2', {
      data: { image: 'alpine', tools: { producers: [], consumers: [] }, storedAt: 't' },
    });
    await storeMissedScans(queue([job('3'), stored, job('5')]), s);
    expect(s.saveSbom).toHaveBeenCalledTimes(2);
    expect(stored.updateData).not.toHaveBeenCalled();
  });
});
