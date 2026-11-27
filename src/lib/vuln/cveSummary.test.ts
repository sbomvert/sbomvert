import {
  buildPackageRows,
  countPackageCvePairs,
  packageFixText,
  getPerToolCounts,
  getUniqueCveIds,
  getVulnerablePackageCount,
  getUniqueCVEs,
  getVulnerablePackages,
} from './cveSummary';
import { CVEReport } from '@/lib/vuln/vulnLoader';

describe('cveSummary utilities', () => {
  const mockCveReport: CVEReport = {
    trivy: {
      cves: ['CVE-1', 'CVE-2'],
      vulns_by_package: { pkgA: ['CVE-1'], pkgB: [] },
    } as any,
    syft: {
      cves: ['CVE-2', 'CVE-3'],
      vulns_by_package: { pkgA: ['CVE-2'], pkgC: ['CVE-3'] },
    } as any,
  };

  test.skip('buildPackageRows aggregates correctly', () => {
    const rows = buildPackageRows(mockCveReport, ['trivy', 'syft']);
    const pkgA = rows.find(r => r.pkg === 'pkgA');
    expect(pkgA?.detectedBy.size).toBe(2);
    const pkgB = rows.find(r => r.pkg === 'pkgB');
    expect(pkgB?.detectedBy.has('trivy')).toBe(true);
    const pkgC = rows.find(r => r.pkg === 'pkgC');
    expect(pkgC?.detectedBy.has('syft')).toBe(true);
  });

  test('getPerToolCounts returns counts', () => {
    const counts = getPerToolCounts(mockCveReport);
    expect(counts).toEqual({ trivy: 2, syft: 2 });
  });

  test('getUniqueCveIds aggregates unique IDs', () => {
    const ids = getUniqueCveIds(mockCveReport);
    expect(ids).toEqual(new Set(['CVE-1', 'CVE-2', 'CVE-3']));
  });

  test('getVulnerablePackageCount counts packages with CVEs', () => {
    const count = getVulnerablePackageCount(mockCveReport);
    expect(count).toBe(2); // pkgA and pkgC have CVEs
  });

  test('getUniqueCVEs respects tool list', () => {
    const ids = getUniqueCVEs(mockCveReport, ['trivy']);
    expect(ids).toEqual(new Set(['CVE-1', 'CVE-2']));
  });

  test('getVulnerablePackages returns set of vulnerable packages', () => {
    const pkgs = getVulnerablePackages(mockCveReport, ['trivy', 'syft']);
    expect(pkgs).toEqual(new Set(['pkgA', 'pkgC']));
  });

  test('buildPackageRows lists a CVE once per package, even when the report repeats it', () => {
    const repeated: CVEReport = {
      trivy: { cves: ['CVE-1', 'CVE-1'], vulns_by_package: { pkgA: ['CVE-1', 'CVE-1'] } } as any,
    };
    const [row] = buildPackageRows(repeated, ['trivy']);
    expect(row.byCve.trivy).toEqual(['CVE-1']);
  });

  test('countPackageCvePairs counts a CVE repeated under one package once', () => {
    const report = { cves: [], vulns_by_package: { pkgA: ['CVE-1', 'CVE-1'], pkgB: ['CVE-1'] } } as any;
    expect(countPackageCvePairs(report)).toBe(2);
  });

  test('packageFixText names the version only when the package lists exactly one', () => {
    expect(packageFixText({ status: 'fixed', fixedVersions: ['2.5'] })).toBe('fixed in 2.5');
    expect(packageFixText({ status: 'fixed', fixedVersions: ['1.25.13', '1.26.6'] })).toBe('fixed');
    expect(packageFixText({ status: 'not_fixed', fixedVersions: [] })).toBe('no fix');
    expect(packageFixText(undefined)).toBeUndefined();
  });
});
