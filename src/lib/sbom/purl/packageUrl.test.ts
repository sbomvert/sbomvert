import { formatPackageUrl, parsePackageUrl } from './packageUrl';

describe('packageUrl', () => {
  test.each([
    'pkg:deb/debian/apt@2.6.1?arch=amd64&distro=debian-12.9',
    'pkg:deb/debian/automake@1.16.5-1.3?arch=all&distro=debian-12.9&epoch=1',
    'pkg:deb/debian/base-files@12.4%2Bdeb12u9?arch=amd64&distro=debian-12.9',
    'pkg:deb/debian/libstdc%2B%2B6@12.2.0-14?arch=amd64&distro=debian-12.9',
    'pkg:apk/alpine/.memcached-rundeps@20241209.203301?arch=noarch&distro=3.21.0',
    'pkg:pypi/flask@2.3.2',
    'pkg:oci/alpine@sha256%3Ad9e8?arch=amd64&repository_url=index.docker.io%2Flibrary%2Falpine',
    'pkg:golang/github.com/foo/bar@v1.0.0#sub/path',
    'pkg:deb/debian/login@1%3A4.13%2Bdfsg1-1?arch=i386&distro=debian-12&upstream=shadow%401%3A4.13%2Bdfsg1-1',
  ])('formats what it parses, byte for byte: %s', purl => {
    expect(formatPackageUrl(parsePackageUrl(purl)!)).toBe(purl);
  });

  test('splits a purl into its parts and decodes them', () => {
    expect(
      parsePackageUrl('pkg:deb/debian/login@1%3A4.13%2Bb1?distro=debian-12&arch=i386#a/b')
    ).toEqual({
      type: 'deb',
      namespace: 'debian',
      name: 'login',
      version: '1:4.13+b1',
      qualifiers: { arch: 'i386', distro: 'debian-12' },
      subpath: 'a/b',
    });
  });

  test('sorts qualifiers by key and drops empty ones', () => {
    expect(
      formatPackageUrl({ type: 'deb', namespace: 'debian', name: 'a', version: '1', qualifiers: { z: '1', arch: 'x', e: '' }, subpath: '' })
    ).toBe('pkg:deb/debian/a@1?arch=x&z=1');
  });

  test('a scope written with a raw @ is not the start of the version', () => {
    expect(parsePackageUrl('pkg:npm/@scope/name')).toMatchObject({ namespace: '@scope', name: 'name', version: '' });
    expect(parsePackageUrl('pkg:npm/@scope/name@1.0.0')).toMatchObject({ namespace: '@scope', name: 'name', version: '1.0.0' });
  });

  test('a purl without a namespace, with several qualifiers, or with a subpath', () => {
    expect(parsePackageUrl('pkg:npm/express@4.18.2')).toMatchObject({ type: 'npm', namespace: '', name: 'express', version: '4.18.2' });
    expect(parsePackageUrl('pkg:maven/org.springframework/spring-core@5.3.0?type=jar&classifier=sources')!.qualifiers).toEqual({
      type: 'jar',
      classifier: 'sources',
    });
    expect(parsePackageUrl('pkg:npm/@scope/name@1.0.0?env=prod#/dist')).toMatchObject({ subpath: '/dist', qualifiers: { env: 'prod' } });
  });

  test('is null for text that is not a purl', () => {
    expect(parsePackageUrl('not-a-purl')).toBeNull();
    expect(parsePackageUrl('pkg:deb')).toBeNull();
    expect(parsePackageUrl('')).toBeNull();
  });
});
