import { storeCompletedScan, storeMissedScans, storeScanResults } from './scanResults';

// the default storage services touch the filesystem when imported
jest.mock('@sbomvert/storage/sbom/sbomStorageService', () => ({ default: {} }));
jest.mock('@sbomvert/storage/cve/cveStorageService', () => ({ default: {} }));

test('stores every SBOM and CVE report of a scan under the sanitized image name', async () => {
  const storage = {
    saveSbom: jest.fn().mockResolvedValue(undefined),
    saveCves: jest.fn().mockResolvedValue(undefined),
    saveRawCves: jest.fn().mockResolvedValue(undefined),
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
  // no raw output in this report, so none is stored
  expect(storage.saveRawCves).not.toHaveBeenCalled();
});

test('keeps the scanner output of each CVE report next to the report', async () => {
  const storage = {
    saveSbom: jest.fn().mockResolvedValue(undefined),
    saveCves: jest.fn().mockResolvedValue(undefined),
    saveRawCves: jest.fn().mockResolvedValue(undefined),
  };
  await storeScanResults(
    {
      image: 'alpine:3.22',
      sboms: [],
      cves: [{ tool: 'grype', format: 'spdx', content: 'translated', raw: 'scanner output' }],
    },
    storage
  );
  expect(storage.saveCves).toHaveBeenCalledWith('alpinetwodots3.22', 'spdx', 'grype', 'translated');
  expect(storage.saveRawCves).toHaveBeenCalledWith('alpinetwodots3.22', 'spdx', 'grype', 'scanner output');
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
    saveRawCves: jest.fn().mockResolvedValue(undefined),
  });
  const job = (id: string, over: Record<string, unknown> = {}) => ({
    id,
    data: { image: 'alpine', tools: { producers: ['syft'], consumers: [] } },
    returnvalue: result as unknown,
    updateData: jest.fn().mockResolvedValue(undefined),
    getDependencies: jest.fn(async () => ({ processed: {} as Record<string, unknown> })),
    ...over,
  });
  const hset = jest.fn().mockResolvedValue(1);
  const queue = (jobs: ReturnType<typeof job>[]) =>
    ({
      getJob: jest.fn(async (id: string) => jobs.find(j => j.id === id)),
      getJobs: jest.fn(async () => jobs),
      client: Promise.resolve({ hset }),
      toKey: (id: string) => `bull:scan:${id}`,
    }) as never;
  beforeEach(() => hset.mockClear());

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

  // a scan (root) whose cve job read the SBOM of its sbom job
  const scan = () => {
    const sbom = job('sbom', { parentKey: 'bull:scan:cve' });
    const cve = job('cve', {
      parentKey: 'bull:scan:root',
      returnvalue: { image: 'alpine', sboms: [], cves: [{ tool: 'grype', format: 'spdx', content: 'v' }] },
      getDependencies: jest.fn(async () => ({ processed: { 'bull:scan:sbom': result } })),
    });
    const root = job('root', {
      returnvalue: undefined,
      getDependencies: jest.fn(async () => ({ processed: { 'bull:scan:cve': cve.returnvalue } })),
    });
    return { sbom, cve, root };
  };

  test('once a scan is done, its jobs are stored and their contents dropped from Redis', async () => {
    const { sbom, cve, root } = scan();
    const s = storage();
    await storeCompletedScan(queue([sbom, cve, root]), 'root', s);
    expect(s.saveSbom).toHaveBeenCalledWith('alpine', 'spdx', 'syft', 's');
    expect(s.saveCves).toHaveBeenCalledWith('alpine', 'spdx', 'grype', 'v');
    const sbomLeft = JSON.stringify({ image: 'alpine', sboms: [{ tool: 'syft', format: 'spdx' }], cves: [] });
    const cveLeft = JSON.stringify({ image: 'alpine', sboms: [], cves: [{ tool: 'grype', format: 'spdx' }] });
    expect(hset.mock.calls).toEqual([
      ['bull:scan:sbom', { returnvalue: sbomLeft }],
      ['bull:scan:cve:processed', { 'bull:scan:sbom': sbomLeft }],
      ['bull:scan:cve', { returnvalue: cveLeft }],
      ['bull:scan:root:processed', { 'bull:scan:cve': cveLeft }],
    ]);
  });

  test('a job of a scan that is not done keeps its contents', async () => {
    const { sbom, cve, root } = scan();
    await storeCompletedScan(queue([sbom, cve, root]), 'cve', storage());
    expect(hset).not.toHaveBeenCalled();
  });

  test('nothing is dropped when storing fails', async () => {
    const { sbom, cve, root } = scan();
    const s = { ...storage(), saveSbom: jest.fn().mockRejectedValue(new Error('disk full')) };
    await expect(storeCompletedScan(queue([sbom, cve, root]), 'root', s)).rejects.toThrow('disk full');
    expect(hset).not.toHaveBeenCalled();
  });
});

test('storeMissedScans reads the completed jobs a page at a time', async () => {
  const jobs = Array.from({ length: 25 }, (_, i) => ({
    id: `${i}`,
    parentKey: 'bull:scan:p',
    data: { storedAt: 't' },
  }));
  const getJobs = jest.fn(async (_: string[], start: number, end: number) => jobs.slice(start, end + 1));
  await storeMissedScans({ getJobs } as never, { saveSbom: jest.fn(), saveCves: jest.fn(), saveRawCves: jest.fn() });
  expect(getJobs.mock.calls.map(([, start, end]) => [start, end])).toEqual([[0, 9], [10, 19], [20, 29]]);
});
