import {
  toComparableDebianPurl,
  toComparableApk,
  toComparablePurl,
  isDebian,
  isOspkg,
  isOspkgApk,
  isKernelPackage,
  isKernelPackageApk,
  getPurlType,
  getUpstreamFromPurl,
  purl2Upstream,
  extractAnchoreVulnerabilities,
  emptyReport,
} from './vulnutils';

// ---------------------------------------------------------------------------
// toComparableDebianPurl
// ---------------------------------------------------------------------------

describe('toComparableDebianPurl', () => {
  test('removes query params and normalizes', () => {
    const purl = 'pkg:dpkg/openssl@1.1.1?arch=amd64';
    expect(toComparableDebianPurl(purl)).toBe('pkg:deb/debian/openssl@1.1.1');
  });

  test('handles version with colon', () => {
    const purl = 'pkg:dpkg/openssl@1:1.1.1';
    expect(toComparableDebianPurl(purl)).toBe('pkg:deb/debian/openssl@1.1.1');
  });

  test.skip('handles golang special case', () => {
    const purl = 'pkg:golang/debian/openssl@1.1.1';
    const result = toComparableDebianPurl(purl);
    expect(result).toContain('pkg:deb/debian');
  });
});

// ---------------------------------------------------------------------------
// toComparableApk
// ---------------------------------------------------------------------------

describe('toComparableApk', () => {
  test('normalizes alpine path', () => {
    const purl = 'pkg:apk/curl@7.79.0';
    expect(toComparableApk(purl)).toBe('pkg:apk/alpine/curl@7.79.0');
  });

  test('strips query parameters', () => {
    const purl = 'pkg:apk/alpine/curl@7.79.0?arch=x86_64';
    expect(toComparableApk(purl)).toBe('pkg:apk/alpine/curl@7.79.0');
  });

  test('fixes missing alpine namespace', () => {
    const purl = 'pkg:apk/curl@7.79.0';
    expect(toComparableApk(purl)).toBe('pkg:apk/alpine/curl@7.79.0');
  });
});

// ---------------------------------------------------------------------------
// toComparablePurl
// ---------------------------------------------------------------------------

describe('toComparablePurl', () => {
  test('handles debian', () => {
    expect(toComparablePurl('pkg:dpkg/openssl@1.0')).toBe(
      'pkg:deb/debian/openssl@1.0'
    );
  });

  test('handles apk', () => {
    expect(toComparablePurl('pkg:apk/alpine/curl@7.0')).toBe(
      'pkg:apk/alpine/curl@7.0'
    );
  });

  test('strips version for language packages', () => {
    expect(toComparablePurl('pkg:npm/lodash@4.17.21')).toBe(
      'pkg:npm/lodash'
    );
  });

  test('decodes URI encoding and lowercases', () => {
    const encoded = encodeURIComponent('pkg:NPM/Lodash@4.17.21');
    expect(toComparablePurl(encoded)).toBe('pkg:npm/lodash');
  });
});

// ---------------------------------------------------------------------------
// Classification helpers
// ---------------------------------------------------------------------------

describe('package classification', () => {
  test('isDebian', () => {
    expect(isDebian('pkg:dpkg/test')).toBe(true);
    expect(isDebian('pkg:npm/test')).toBe(false);
  });

  test('isOspkg', () => {
    expect(isOspkg('pkg:deb/debian/test')).toBe(true);
    expect(isOspkg('pkg:npm/test')).toBe(false);
  });

  test('isOspkgApk', () => {
    expect(isOspkgApk('pkg:apk/alpine/test')).toBe(true);
    expect(isOspkgApk('pkg:npm/test')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Kernel detection
// ---------------------------------------------------------------------------

describe('kernel detection', () => {
  test('detects debian kernel', () => {
    expect(isKernelPackage('pkg:deb/debian/linux@5.10')).toBe(true);
  });

  test.skip('detects apk kernel', () => {
    expect(isKernelPackageApk('pkg:apk/alpine/linux@5.10')).toBe(true);
  });

  test('detects firmware', () => {
    expect(isKernelPackageApk('pkg:apk/alpine/linux-firmware@1.0')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PURL type
// ---------------------------------------------------------------------------

describe('getPurlType', () => {
  test('returns OS (0)', () => {
    expect(getPurlType('pkg:deb/debian/test')).toBe(0);
  });

  test('returns language (1)', () => {
    expect(getPurlType('pkg:npm/test')).toBe(1);
  });

  test('throws on unknown', () => {
    expect(() => getPurlType('pkg:unknown/test')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Upstream parsing
// ---------------------------------------------------------------------------

describe('upstream helpers', () => {
  test('getUpstreamFromPurl basic', () => {
    const [up, ver] = getUpstreamFromPurl(
      'pkg:deb/debian/openssl@1.1?upstream=libssl'
    );
    expect(up).toBe('pkg:deb/debian/libssl');
    expect(ver).toBeNull();
  });

  test('getUpstreamFromPurl with version', () => {
    const [up, ver] = getUpstreamFromPurl(
      'pkg:deb/debian/openssl@1.1?upstream=libssl@2.0'
    );
    expect(up).toBe('pkg:deb/debian/libssl');
    expect(ver).toBe('2.0');
  });

  test('getUpstreamFromPurl none', () => {
    const [up, ver] = getUpstreamFromPurl('pkg:npm/lib@1');
    expect(up).toBeNull();
    expect(ver).toBeNull();
  });

  test('purl2Upstream basic', () => {
    expect(purl2Upstream('pkg:npm/lodash@1.0')).toBe('lodash');
  });

  test('purl2Upstream with upstream', () => {
    expect(
      purl2Upstream('pkg:deb/debian/test@1?upstream=libssl')
    ).toBe('libssl');
  });
});

// ---------------------------------------------------------------------------
// Anchore extractor (critical coverage)
// ---------------------------------------------------------------------------

describe('extractAnchoreVulnerabilities', () => {
  test('handles empty input', () => {
    expect(extractAnchoreVulnerabilities({}, {})).toEqual(emptyReport());
  });

  test('aggregates CVEs and deduplicates globally', () => {
    const input = {
      matches: [
        {
          vulnerability: { id: 'CVE-1', namespace: 'distro' },
          artifact: { purl: 'pkg:apk/alpine/test@1' },
        },
        {
          vulnerability: { id: 'CVE-1', namespace: 'distro' },
          artifact: { purl: 'pkg:apk/alpine/test@1' },
        },
      ],
    };

    const report = extractAnchoreVulnerabilities(input, {});

    expect(report.totalCVEs).toBe(1);
    expect(report.cves).toEqual(['CVE-1']);
  });

  test('tracks language vs library correctly', () => {
    const input = {
      matches: [
        {
          vulnerability: { id: 'CVE-2', namespace: 'language' },
          artifact: { purl: 'pkg:npm/test@1' },
        },
        {
          vulnerability: { id: 'CVE-3', namespace: 'distro' },
          artifact: { purl: 'pkg:apk/alpine/test@1' },
        },
      ],
    };

    const report = extractAnchoreVulnerabilities(input, {});

    expect(report.language).toBe(1);
    expect(report.library).toBe(1);
  });

  test.skip('deduplicates per package', () => {
    const input = {
      matches: [
        {
          vulnerability: { id: 'CVE-1', namespace: 'distro' },
          artifact: { purl: 'pkg:apk/alpine/test@1' },
        },
        {
          vulnerability: { id: 'CVE-2', namespace: 'distro' },
          artifact: { purl: 'pkg:apk/alpine/test@1' },
        },
      ],
    };

    const report = extractAnchoreVulnerabilities(input, {});

    expect(Object.keys(report.vulns_by_package).length).toBe(1);
    //expect(report.vulns_by_package['pkg:apk/alpine/test']).toContain(
    //  'CVE-1'
    //);
    expect(report.vulns_by_package['pkg:apk/alpine/test']).toContain(
      'CVE-2'
    );
  });
});