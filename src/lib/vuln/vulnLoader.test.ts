import { loadCVEsForImage } from './vulnLoader';

// Mock fetch globally
global.fetch = jest.fn();

describe('vulnLoader.loadCVEsForImage', () => {
  beforeEach(() => {
    // @ts-ignore
    fetch.mockReset();
  });

  test('handles empty file list gracefully', async () => {
    // First fetch returns file list
    // @ts-ignore
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ files: [] }) });
    const result = await loadCVEsForImage('myimage');
    expect(result.cves).toEqual({});
  });

  test('loads CVE reports and maps by tool', async () => {
    const fileList = { files: [{ name: 'trivy.json' }, { name: 'syft.json' }] };
    // First call for file list
    // @ts-ignore
    fetch.mockResolvedValueOnce({ ok: true, json: async () => fileList });
    // Subsequent calls for each file
    const trivyReport = { cves: ['CVE-1234'], vulns_by_package: {} };
    const syftReport = { cves: ['CVE-5678'], vulns_by_package: {} };
    // @ts-ignore
    fetch.mockResolvedValueOnce({ ok: true, json: async () => trivyReport });
    // @ts-ignore
    fetch.mockResolvedValueOnce({ ok: true, json: async () => syftReport });

    const result = await loadCVEsForImage('myimage');
    expect(result.cves).toHaveProperty('trivy');
    expect(result.cves).toHaveProperty('syft');
    expect(result.cves.trivy.cves).toContain('CVE-1234');
    expect(result.cves.syft.cves).toContain('CVE-5678');
  });
});
