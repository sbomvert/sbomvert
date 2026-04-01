import {
  toComparableDebianPurl,
  toComparableApk,
  isDebian,
  isOspkg,
  isOspkgApk,
  getPurlType,
  getUpstreamFromPurl,
  purl2Upstream,
  toComparablePurl,
} from './vulnutils';

describe('vulnutils helper functions', () => {
  test('toComparableDebianPurl transforms debian purl', () => {
    const purl = 'pkg:dpkg/openssl@1.1.1?arch=amd64';
    const result = toComparableDebianPurl(purl);
    expect(result).toBe('pkg:deb/debian/openssl@1.1.1');
  });

  test('toComparableApk normalizes apk purl', () => {
    const purl = 'pkg:apk/alpine/curl@7.79.0?arch=x86_64';
    const result = toComparableApk(purl);
    expect(result).toBe('pkg:apk/alpine/curl@7.79.0');
  });

  test('toComparablePurl dispatches correctly', () => {
    expect(toComparablePurl('pkg:dpkg/openssl@1.0')).toBe('pkg:deb/debian/openssl@1.0');
    expect(toComparablePurl('pkg:apk/alpine/curl@7.0')).toBe('pkg:apk/alpine/curl@7.0');
    expect(toComparablePurl('pkg:npm/lodash@4.17.21')).toBe('pkg:npm/lodash');
  });

  test('isDebian identifies debian packages', () => {
    expect(isDebian('pkg:dpkg/openssl@1.0')).toBe(true);
    expect(isDebian('pkg:npm/lodash@4.17')).toBe(false);
  });

  test('isOspkg and isOspkgApk detect OS packages', () => {
    expect(isOspkg('pkg:deb/debian/openssl@1.0')).toBe(true);
    expect(isOspkgApk('pkg:apk/alpine/curl@7.0')).toBe(true);
    expect(isOspkg('pkg:npm/lodash@4.17')).toBe(false);
  });

  test('getPurlType returns correct type codes', () => {
    expect(getPurlType('pkg:deb/debian/openssl@1.0')).toBe(0);
    expect(getPurlType('pkg:pypi/django@3.2')).toBe(1);
  });

  test('getUpstreamFromPurl extracts upstream and version', () => {
    const [upstream, version] = getUpstreamFromPurl('pkg:deb/debian/openssl@1.0?upstream=libssl&arch=amd64');
    expect(upstream).toBe('pkg:deb/debian/libssl');
    expect(version).toBe(null);
  });

  test('purl2Upstream returns upstream portion', () => {
    expect(purl2Upstream('pkg:deb/debian/openssl@1.0?upstream=libssl')).toBe('libssl');
    expect(purl2Upstream('pkg:npm/lodash@4.17.21')).toBe('lodash');
  });
});
