import { extractAnchoreVulnerabilities, extractTrivyVulnerabilities } from "./vulnutils";

describe('vulnutils extraction functions', () => {
  test('extractTrivyVulnerabilities parses trivy output', () => {
    const sample = {
      Results: [
        {
          Vulnerabilities: [
            {
              VulnerabilityID: 'CVE-1234',
              PkgIdentifier: { PURL: 'pkg:npm/lodash@4.17.21' },
            },
            {
              VulnerabilityID: 'CVE-5678',
              PkgIdentifier: { PURL: 'pkg:deb/debian/openssl@1.0' }, // Debian, should be skipped
            },
          ],
        },
      ],
    } as any;
    const report = extractTrivyVulnerabilities(sample, null);
    expect(report.cves).toContain('CVE-1234');
    expect(report.cves).not.toContain('CVE-5678');
    expect(report.totalCVEs).toBe(1);
    expect(report.purl_mapping['pkg:npm/lodash']).toBe('pkg:npm/lodash@4.17.21');
  });

  test('extractAnchoreVulnerabilities parses anchore output', () => {
    const sample = {
      matches: [
        {
          vulnerability: { id: 'CVE-1111', namespace: 'distro:debian' },
          artifact: { purl: 'pkg:deb/debian/openssl@1.0' },
        },
        {
          vulnerability: { id: 'CVE-2222', namespace: 'language:python' },
          artifact: { purl: 'pkg:pypi/django@3.2' },
        },
        {
          vulnerability: { id: 'CVE-1111', namespace: 'distro:debian' }, // duplicate
          artifact: { purl: 'pkg:deb/debian/openssl@1.0' },
        },
      ],
    } as any;
    const report = extractAnchoreVulnerabilities(sample, null);
    expect(report.cves).toEqual(['CVE-1111', 'CVE-2222']);
    expect(report.totalCVEs).toBe(2);
    // library count should be 1 (distro), language count 1
    expect(report.library).toBe(1);
    expect(report.language).toBe(1);
    // mapping
   // expect(report.purl_mapping['pkg:deb/debian/openssl']).toBe('pkg:deb/debian/openssl@1.0');
    expect(report.purl_mapping['pkg:pypi/django']).toBe('pkg:pypi/django@3.2');
  });
});
