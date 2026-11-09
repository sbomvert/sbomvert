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

  test('loads CVE reports and keys them by tool and format', async () => {
    const fileList = {
      files: [{ name: 'trivy.spdx.json' }, { name: 'trivy.cdx.json' }, { name: 'grype.spdx.json' }],
    };
    // First call for file list
    // @ts-ignore
    fetch.mockResolvedValueOnce({ ok: true, json: async () => fileList });
    // Subsequent calls for each file
    const report = (cve: string) => ({ cves: [cve], vulns_by_package: {} });
    // @ts-ignore
    fetch.mockResolvedValueOnce({ ok: true, json: async () => report('CVE-1') });
    // @ts-ignore
    fetch.mockResolvedValueOnce({ ok: true, json: async () => report('CVE-2') });
    // @ts-ignore
    fetch.mockResolvedValueOnce({ ok: true, json: async () => report('CVE-3') });

    const result = await loadCVEsForImage('myimage');
    expect(Object.keys(result.cves)).toEqual(['trivy (SPDX)', 'trivy (CDX)', 'grype (SPDX)']);
    expect(result.cves['trivy (SPDX)'].cves).toContain('CVE-1');
    expect(result.cves['trivy (CDX)'].cves).toContain('CVE-2');
    expect(result.cves['grype (SPDX)'].cves).toContain('CVE-3');
  });
});
