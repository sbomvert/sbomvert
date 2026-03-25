import { getPerToolCounts, getUniqueCveIds, getVulnerablePackageCount } from '@/lib/vuln/cveSummary';
import { CVEReport } from '@/lib/vuln/vulnLoader';
import { VulnReport } from '@/lib/vuln/vulnutils';

describe('cveSummary utilities', () => {
  const mockReport: VulnReport = {
    totalCVEs: 0,
    cves: ['CVE-1', 'CVE-2'],
    library: 0,
    language: 0,
    packagelist: [],
    vulns_by_package: {
      'pkg1': ['CVE-1'],
      'pkg2': ['CVE-2'],
      'pkg3': []
    },
    vulnpackagelist: {},
    purl_mapping: {}
  };

  const cves: CVEReport = {
    toolA: mockReport,
    toolB: {
      ...mockReport,
      cves: ['CVE-2', 'CVE-3'],
      vulns_by_package: {
        'pkg2': ['CVE-2'],
        'pkg4': ['CVE-3']
      }
    }
  };

  test('getPerToolCounts returns correct counts', () => {
    const counts = getPerToolCounts(cves);
    expect(counts).toEqual({ toolA: 2, toolB: 2 });
  });

  test('getUniqueCveIds returns correct set size', () => {
    const ids = getUniqueCveIds(cves);
    expect(ids.size).toBe(3); // CVE-1, CVE-2, CVE-3
    expect(Array.from(ids)).toEqual(expect.arrayContaining(['CVE-1', 'CVE-2', 'CVE-3']));
  });

  test('getVulnerablePackageCount counts distinct packages with vulns', () => {
    const count = getVulnerablePackageCount(cves);
    // pkg1, pkg2, pkg4 are vulnerable (pkg3 has empty list)
    expect(count).toBe(3);
  });
});
