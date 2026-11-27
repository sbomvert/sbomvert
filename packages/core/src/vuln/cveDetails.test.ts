import {
  extractAnchoreVulnerabilities,
  extractScoutVulnerabilities,
  extractTrivyVulnerabilities,
} from './vulnutils';

const trivyVuln = (over: Record<string, unknown> = {}) => ({
  VulnerabilityID: 'CVE-2025-1',
  PkgIdentifier: { PURL: 'pkg:deb/debian/apache2@2.4' },
  Severity: 'HIGH',
  Status: 'fixed',
  FixedVersion: '2.5',
  DataSource: { ID: 'debian', URL: 'https://security-tracker.debian.org' },
  CVSS: { nvd: { V3Score: 7.5, V3Vector: 'CVSS:3.1/AV:N' }, redhat: { V3Score: 6.1 } },
  PrimaryURL: 'https://avd.example/cve-2025-1',
  References: ['https://nvd.example/cve-2025-1', 'https://avd.example/cve-2025-1'],
  Description: 'A flaw in apache2.',
  VendorIDs: ['DSA-5000-1'],
  ...over,
});
const trivyReport = (vulns: unknown[]) => ({ Results: [{ Target: 'image', Vulnerabilities: vulns }] });

describe('trivy: what each vulnerability carries', () => {
  test('records the id, aliases, severity, score, status, fix, source, CVSS, primary URL and description', () => {
    const report = extractTrivyVulnerabilities(trivyReport([trivyVuln()]), {});

    expect(report.totalCVEs).toBe(1);
    expect(report.cveDetails!['CVE-2025-1']).toEqual({
      id: 'CVE-2025-1',
      aliases: ['DSA-5000-1'],
      severity: 'high',
      score: 7.5,
      status: 'fixed',
      fixedVersion: '2.5',
      source: 'debian',
      cvss: [
        { source: 'nvd', version: '3', score: 7.5, vector: 'CVSS:3.1/AV:N' },
        { source: 'redhat', version: '3', score: 6.1, vector: undefined },
      ],
      url: 'https://avd.example/cve-2025-1',
      description: 'A flaw in apache2.',
    });
  });

  test('keeps every package entry, but describes a vulnerability once', () => {
    const report = extractTrivyVulnerabilities(
      trivyReport([
        trivyVuln(),
        trivyVuln({ PkgIdentifier: { PURL: 'pkg:deb/debian/libssl3@3.0' } }),
      ]),
      {}
    );

    expect(report.totalCVEs).toBe(2);
    expect(Object.keys(report.cveDetails!)).toEqual(['CVE-2025-1']);
  });

  test('takes the first V3 score across sources, and a V2 score when no source has a V3 one', () => {
    const v2Only = extractTrivyVulnerabilities(
      trivyReport([trivyVuln({ CVSS: { redhat: { V2Score: 5, V2Vector: 'AV:N/AC:L' } } })]),
      {}
    );
    expect(v2Only.cveDetails!['CVE-2025-1'].score).toBe(5);
    expect(v2Only.cveDetails!['CVE-2025-1'].cvss).toEqual([{ source: 'redhat', version: '2', score: 5, vector: 'AV:N/AC:L' }]);
  });

  test('says unknown for a severity or status it does not know, and leaves out what trivy does not give', () => {
    const report = extractTrivyVulnerabilities(
      trivyReport([
        trivyVuln({
          Severity: 'UNKNOWN',
          Status: 'end_of_life',
          CVSS: undefined,
          FixedVersion: '',
          PrimaryURL: '',
          References: undefined,
          DataSource: { ID: 'debian' },
          Description: undefined,
          VendorIDs: undefined,
        }),
      ]),
      {}
    );

    expect(report.cveDetails!['CVE-2025-1']).toEqual({
      id: 'CVE-2025-1',
      aliases: [],
      severity: 'unknown',
      status: 'unknown',
      source: 'debian',
      cvss: [],
    });
  });

  test('keeps the vendor ids that are not the primary one, without repeats', () => {
    const report = extractTrivyVulnerabilities(
      trivyReport([trivyVuln({ VendorIDs: ['DSA-5000-1', 'GHSA-aaaa-bbbb-cccc', 'GHSA-aaaa-bbbb-cccc'] })]),
      {}
    );

    expect(report.cveDetails!['CVE-2025-1'].aliases).toEqual(['DSA-5000-1', 'GHSA-aaaa-bbbb-cccc']);
  });
});

describe('grype: what each vulnerability carries', () => {
  const grypeMatch = (id: string, over: Record<string, unknown> = {}, related: { id: string }[] = []) => ({
    vulnerability: {
      id,
      severity: 'High',
      namespace: 'alpine:distro:alpine:3.22',
      cvss: [
        { source: 'nvd@nist.gov', version: '3.1', vector: 'CVSS:3.1/AV:N', metrics: {} },
        { source: 'cve@mitre.org', version: '3.1', vector: 'CVSS:3.1/AV:L', metrics: { baseScore: 7.5 } },
      ],
      fix: { state: 'fixed', versions: ['1.3.2-r0'] },
      dataSource: 'https://nvd.nist.gov/vuln/detail/CVE-2025-2',
      urls: ['https://example.org/advisory', 'https://example.org/second'],
      description: 'A flaw in zlib.',
      ...over,
    },
    relatedVulnerabilities: related,
    artifact: { purl: 'pkg:apk/alpine/zlib@1.3?arch=x86_64' },
  });

  test('records the id, severity, score, namespace, fix, CVSS list, primary URL and description', () => {
    const report = extractAnchoreVulnerabilities({ matches: [grypeMatch('CVE-2025-2')] }, {});

    expect(report.cveDetails!['CVE-2025-2']).toEqual({
      id: 'CVE-2025-2',
      aliases: [],
      severity: 'high',
      score: 7.5,
      source: 'alpine:distro:alpine:3.22',
      status: 'fixed',
      fixedVersion: '1.3.2-r0',
      cvss: [
        { source: 'nvd@nist.gov', version: '3.1', score: undefined, vector: 'CVSS:3.1/AV:N' },
        { source: 'cve@mitre.org', version: '3.1', score: 7.5, vector: 'CVSS:3.1/AV:L' },
      ],
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2025-2',
      description: 'A flaw in zlib.',
    });
  });

  test('keeps the CVE behind a GO or GHSA id as an alias, so the id is not lost', () => {
    const report = extractAnchoreVulnerabilities(
      { matches: [grypeMatch('GO-2023-1571', {}, [{ id: 'CVE-2022-41723' }, { id: 'GHSA-vvpx-j8f3-3w6h' }])] },
      {}
    );

    expect(report.cves).toEqual(['GO-2023-1571']);
    expect(report.cveDetails!['GO-2023-1571'].id).toBe('GO-2023-1571');
    expect(report.cveDetails!['GO-2023-1571'].aliases).toEqual(['CVE-2022-41723', 'GHSA-vvpx-j8f3-3w6h']);
  });

  test.each([
    ['fixed', 'fixed'],
    ['not-fixed', 'not_fixed'],
    ['wont-fix', 'wont_fix'],
    ['unknown', 'unknown'],
    ['', 'unknown'],
  ])('maps grype fix state %j to status %j', (state, status) => {
    const report = extractAnchoreVulnerabilities(
      { matches: [grypeMatch('CVE-2025-3', { fix: { state, versions: state === 'fixed' ? ['2.0'] : [] } })] },
      {}
    );

    expect(report.cveDetails!['CVE-2025-3'].status).toBe(status);
    expect(report.cveDetails!['CVE-2025-3'].fixedVersion).toBe(state === 'fixed' ? '2.0' : undefined);
  });

  test('says unknown for a severity it does not know, and leaves out a description it does not have', () => {
    const report = extractAnchoreVulnerabilities(
      { matches: [grypeMatch('CVE-2025-5', { severity: 'Pending', description: '', urls: [], dataSource: '' })] },
      {}
    );

    expect(report.cveDetails!['CVE-2025-5'].severity).toBe('unknown');
    expect(report.cveDetails!['CVE-2025-5'].url).toBeUndefined();
    expect(report.cveDetails!['CVE-2025-5'].description).toBeUndefined();
  });

  test('describes a vulnerability once, from its first match', () => {
    const report = extractAnchoreVulnerabilities(
      { matches: [grypeMatch('CVE-2025-2'), grypeMatch('CVE-2025-2', { severity: 'Low' })] },
      {}
    );

    expect(report.cveDetails!['CVE-2025-2'].severity).toBe('high');
  });
});

describe('docker scout: what each vulnerability carries', () => {
  const scoutRule = (id: string, properties: Record<string, unknown> = {}) => ({
    id,
    helpUri: `https://scout.docker.com/v/${id}`,
    help: { text: `Description of ${id}.\n` },
    properties: {
      purls: ['pkg:maven/ch.qos.logback/logback-core@1.3.15'],
      cvssV3_severity: 'HIGH',
      'security-severity': '7.5',
      cvssV3: 7.5,
      cvssV3_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
      fixed_version: '1.5.33',
      affected_version: '<=1.5.32',
      tags: ['HIGH'],
      ...properties,
    },
  });
  const scoutReport = (rules: { id: string }[]) => ({
    runs: [{ tool: { driver: { rules } }, results: rules.map(rule => ({ ruleId: rule.id })) }],
  });

  test('records the id, severity, score, fix, CVSS, rule link and description', () => {
    const report = extractScoutVulnerabilities(scoutReport([scoutRule('CVE-2026-1')]), {});

    expect(report.totalCVEs).toBe(1);
    expect(report.cveDetails!['CVE-2026-1']).toEqual({
      id: 'CVE-2026-1',
      aliases: [],
      severity: 'high',
      score: 7.5,
      status: 'fixed',
      fixedVersion: '1.5.33',
      cvss: [{ version: '3.1', score: 7.5, vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H' }],
      url: 'https://scout.docker.com/v/CVE-2026-1',
      description: 'Description of CVE-2026-1.',
    });
  });

  test('says not fixed for "not fixed", and leaves out the vector when Scout gives none', () => {
    const report = extractScoutVulnerabilities(
      scoutReport([
        scoutRule('CVE-2026-2', {
          cvssV3_severity: undefined,
          cvssV3: undefined,
          cvssV3_vector: undefined,
          fixed_version: 'not fixed',
          'security-severity': '3.1',
        }),
      ]),
      {}
    );

    expect(report.cveDetails!['CVE-2026-2']).toMatchObject({ severity: 'unknown', score: 3.1, status: 'not_fixed', cvss: [] });
    expect(report.cveDetails!['CVE-2026-2'].fixedVersion).toBeUndefined();
  });

  test('says unknown for a fix text it does not know', () => {
    const report = extractScoutVulnerabilities(scoutReport([scoutRule('CVE-2026-4', { fixed_version: '' })]), {});

    expect(report.cveDetails!['CVE-2026-4'].status).toBe('unknown');
  });

  test('counts a CVE once for each package it affects, and describes it once', () => {
    const report = extractScoutVulnerabilities(
      scoutReport([
        scoutRule('CVE-2026-3', {
          purls: ['pkg:deb/ubuntu/passwd@1.0?arch=amd64', 'pkg:deb/ubuntu/login@2.0?arch=amd64'],
        }),
      ]),
      {}
    );

    expect(report.totalCVEs).toBe(2);
    expect(Object.keys(report.cveDetails!)).toEqual(['CVE-2026-3']);
  });

  test('counts a rule once when Scout repeats its result for each location', () => {
    const rule = scoutRule('CVE-2026-5', {
      purls: ['pkg:apk/alpine/sqlite-libs@3.53.4-r0?upstream=sqlite', 'pkg:apk/alpine/sqlite@3.53.4-r0'],
    });
    const report = extractScoutVulnerabilities(
      {
        runs: [
          {
            tool: { driver: { rules: [rule] } },
            results: [{ ruleId: 'CVE-2026-5' }, { ruleId: 'CVE-2026-5' }],
          },
        ],
      },
      {}
    );

    expect(report.totalCVEs).toBe(2);
    expect(report.vulns_by_package['pkg:apk/alpine/sqlite-libs@3.53.4-r0']).toEqual(['CVE-2026-5']);
    expect(report.vulns_by_package['pkg:apk/alpine/sqlite@3.53.4-r0']).toEqual(['CVE-2026-5']);
  });
});

describe('grype: the fields of its full model', () => {
  test('keeps the risk score, EPSS, CWEs, and the CVSS type and sub-scores', () => {
    const report = extractAnchoreVulnerabilities(
      {
        matches: [
          {
            vulnerability: {
              id: 'CVE-2026-7',
              severity: 'High',
              namespace: 'nvd:cpe',
              risk: 42.5,
              cvss: [
                {
                  source: 'nvd@nist.gov',
                  type: 'Primary',
                  version: '3.1',
                  vector: 'CVSS:3.1/AV:N',
                  metrics: { baseScore: 7.5, exploitabilityScore: 3.9, impactScore: 3.6 },
                },
              ],
              epss: [{ cve: 'CVE-2026-7', epss: 0.0123, percentile: 0.8, date: '2026-11-25' }],
              cwes: [
                { cve: 'CVE-2026-7', cwe: 'CWE-79', source: 'nvd@nist.gov', type: 'Primary' },
                { cve: 'CVE-2026-7', cwe: 'CWE-79', source: 'cve@mitre.org', type: 'Secondary' },
              ],
              fix: { state: 'unknown', versions: [] },
            },
            artifact: { purl: 'pkg:apk/alpine/zlib@1.3?arch=x86_64' },
          },
        ],
      },
      {}
    );

    expect(report.cveDetails!['CVE-2026-7']).toMatchObject({
      risk: 42.5,
      epss: { score: 0.0123, percentile: 0.8 },
      cwes: ['CWE-79'],
      cvss: [{ type: 'Primary', version: '3.1', score: 7.5, exploitabilityScore: 3.9, impactScore: 3.6 }],
    });
  });

  test('leaves out what grype does not give: no EPSS and no CWEs', () => {
    const report = extractAnchoreVulnerabilities(
      {
        matches: [
          {
            vulnerability: { id: 'CVE-2026-8', namespace: 'nvd:cpe', cvss: [], fix: { state: 'unknown', versions: [] } },
            artifact: { purl: 'pkg:apk/alpine/zlib@1.3' },
          },
        ],
      },
      {}
    );

    expect(report.cveDetails!['CVE-2026-8'].epss).toBeUndefined();
    expect(report.cveDetails!['CVE-2026-8'].cwes).toBeUndefined();
  });
});

describe('trivy: the fields of its full model', () => {
  test('keeps the title, CWEs, dates, per-source severities, CVSS v4 and the source name', () => {
    const report = extractTrivyVulnerabilities(
      trivyReport([
        trivyVuln({
          Title: 'Heap overflow in libfoo',
          CweIDs: ['CWE-787', 'CWE-787', 'CWE-122'],
          VendorSeverity: { nvd: 3, redhat: 4, debian: 0 },
          SeveritySource: 'redhat',
          PublishedDate: '2024-01-02T03:04:05Z',
          LastModifiedDate: '2024-02-03T04:05:06Z',
          CVSS: { nvd: { V40Score: 8.7, V40Vector: 'CVSS:4.0/AV:N/AC:L' } },
          DataSource: { ID: 'debian', Name: 'Debian Security Tracker', URL: 'https://security-tracker.debian.org' },
        }),
      ]),
      {}
    );

    expect(report.cveDetails!['CVE-2025-1']).toMatchObject({
      title: 'Heap overflow in libfoo',
      cwes: ['CWE-787', 'CWE-122'],
      publishedDate: '2024-01-02T03:04:05Z',
      lastModifiedDate: '2024-02-03T04:05:06Z',
      vendorSeverity: { nvd: 'high', redhat: 'critical', debian: 'unknown' },
      severitySource: 'redhat',
      sourceName: 'Debian Security Tracker',
      cvss: [{ source: 'nvd', version: '4.0', score: 8.7, vector: 'CVSS:4.0/AV:N/AC:L' }],
    });
  });
});

describe('per-package fixes', () => {
  const grypeMatch = (purl: string, state: string, versions: string[], id = 'GO-2026-5026') => ({
    vulnerability: { id, severity: 'High', namespace: 'github:language:go', cvss: [], fix: { state, versions } },
    artifact: { purl },
  });

  test('keeps each package its own fix, with every fixed version grype lists for it', () => {
    const report = extractAnchoreVulnerabilities(
      {
        matches: [
          grypeMatch('pkg:golang/golang.org/x/net@v0.22.0', 'fixed', ['0.57.0']),
          grypeMatch('pkg:golang/stdlib@1.26.3', 'fixed', ['1.25.13', '1.26.6', '1.27.0-rc.3']),
        ],
      },
      {}
    );

    expect(report.packageFixes!['pkg:golang/golang.org/x/net']['GO-2026-5026']).toEqual({
      status: 'fixed',
      fixedVersions: ['0.57.0'],
    });
    expect(report.packageFixes!['pkg:golang/stdlib']['GO-2026-5026']).toEqual({
      status: 'fixed',
      fixedVersions: ['1.25.13', '1.26.6', '1.27.0-rc.3'],
    });
  });

  test('shows the CVE as unknown when its packages disagree on the status, and keeps each package status', () => {
    const report = extractAnchoreVulnerabilities(
      {
        matches: [
          grypeMatch('pkg:pypi/pillow@10.2.0', 'fixed', ['10.3.0'], 'CVE-2026-112902'),
          grypeMatch('pkg:deb/ubuntu/python3-pil@10.2.0-1ubuntu1.5?arch=amd64', 'not-fixed', [], 'CVE-2026-112902'),
        ],
      },
      {}
    );

    expect(report.cveDetails!['CVE-2026-112902'].status).toBe('unknown');
    expect(report.cveDetails!['CVE-2026-112902'].fixedVersion).toBeUndefined();
    const statuses = Object.values(report.packageFixes!).map(byCve => byCve['CVE-2026-112902'].status);
    expect(statuses.sort()).toEqual(['fixed', 'not_fixed']);
  });

  test('leaves the CVE without a version when its packages fix it in different versions', () => {
    const report = extractAnchoreVulnerabilities(
      {
        matches: [
          grypeMatch('pkg:golang/golang.org/x/net@v0.22.0', 'fixed', ['0.57.0']),
          grypeMatch('pkg:golang/stdlib@1.26.3', 'fixed', ['1.26.6']),
        ],
      },
      {}
    );

    expect(report.cveDetails!['GO-2026-5026'].status).toBe('fixed');
    expect(report.cveDetails!['GO-2026-5026'].fixedVersion).toBeUndefined();
  });

  test('keeps the CVE version when every package names the same single version', () => {
    const report = extractAnchoreVulnerabilities(
      {
        matches: [
          grypeMatch('pkg:golang/golang.org/x/net@v0.22.0', 'fixed', ['0.57.0']),
          grypeMatch('pkg:golang/stdlib@1.26.3', 'fixed', ['0.57.0']),
        ],
      },
      {}
    );

    expect(report.cveDetails!['GO-2026-5026'].fixedVersion).toBe('0.57.0');
  });

  test('records a Scout fix for every package of its rule', () => {
    const report = extractScoutVulnerabilities(
      {
        runs: [
          {
            tool: {
              driver: {
                rules: [
                  {
                    id: 'CVE-2026-6',
                    properties: {
                      purls: ['pkg:maven/ch.qos.logback/logback-core@1.3.15', 'pkg:maven/ch.qos.logback/logback-classic@1.3.15'],
                      fixed_version: '1.5.33',
                      'security-severity': '7.5',
                    },
                  },
                ],
              },
            },
            results: [{ ruleId: 'CVE-2026-6' }],
          },
        ],
      },
      {}
    );

    expect(report.packageFixes!['pkg:maven/ch.qos.logback/logback-core']['CVE-2026-6']).toEqual({
      status: 'fixed',
      fixedVersions: ['1.5.33'],
    });
    expect(report.packageFixes!['pkg:maven/ch.qos.logback/logback-classic']['CVE-2026-6'].fixedVersions).toEqual(['1.5.33']);
  });
});
