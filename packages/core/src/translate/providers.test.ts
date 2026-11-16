/** @jest-environment node */
import { formatPackageUrl, parsePackageUrl } from '../purl/packageUrl';
import { CycloneDxBom } from '../cyclonedx/types';
import { SpdxDocument, SpdxPackage } from '../spdx/types';
import { amazonProvider } from './amazon';
import { anchoreSpdxPackage, anchoreSpdxProvider } from './anchore';
import { dockerSpdxPackage, dockerSpdxProvider } from './docker';
import { googlePackage } from './google';
import { convertSbom, CYCLONEDX_PROVIDERS, cycloneDxToSpdx, detectProvider, PROVIDERS, providerFromName } from './index';
import { microsoftProvider } from './microsoft';
import { trivyCycloneDxProvider, trivyPackage, trivyProvider } from './trivy';
import { PackageConverter } from './types';

// Ported from the package tests of github.com/sbomvert/sbom-translation (pkg/packages/*_test.go,
// pkg/provider/*_test.go, internal/app/app_test.go).

const norm = (purl: string) => formatPackageUrl(parsePackageUrl(purl)!);
const pkgOf = (purl: string, extra: Partial<SpdxPackage> = {}): SpdxPackage => ({
  name: parsePackageUrl(purl)?.name ?? 'x',
  SPDXID: 'SPDXRef-Package-1',
  externalRefs: [{ referenceCategory: 'PACKAGE-MANAGER', referenceType: 'purl', referenceLocator: norm(purl) }],
  ...extra,
});
const purlOf = (pkg: SpdxPackage, i = 0) => pkg.externalRefs![i].referenceLocator;
const translate = (from: PackageConverter, to: PackageConverter, pkg: SpdxPackage) => to.fromCanonical!(from.toCanonical(pkg), pkg);
const docOf = (creator: string, ...packages: SpdxPackage[]): SpdxDocument => ({
  spdxVersion: 'SPDX-2.3',
  name: 'x',
  creationInfo: { creators: [creator], created: '2026-01-01T00:00:00Z' },
  packages,
});

const ANCHORE_ALPINE = [
  'pkg:apk/alpine/.memcached-rundeps@20241209.203301?arch=noarch&distro=alpine-3.21.0',
  'pkg:apk/alpine/alpine-baselayout@3.6.8-r0?arch=x86_64&distro=alpine-3.21.0',
  'pkg:apk/alpine/alpine-baselayout-data@3.6.8-r0?arch=x86_64&upstream=alpine-baselayout&distro=alpine-3.21.0',
  'pkg:apk/alpine/alpine-keys@2.5-r0?arch=x86_64&distro=alpine-3.21.0',
  'pkg:apk/alpine/alpine-release@3.21.0-r0?arch=x86_64&upstream=alpine-base&distro=alpine-3.21.0',
  'pkg:apk/alpine/apk-tools@2.14.6-r2?arch=x86_64&distro=alpine-3.21.0',
  'pkg:apk/alpine/busybox@1.37.0-r8?arch=x86_64&distro=alpine-3.21.0',
  'pkg:apk/alpine/busybox-binsh@1.37.0-r8?arch=x86_64&upstream=busybox&distro=alpine-3.21.0',
  'pkg:apk/alpine/ca-certificates-bundle@20241010-r0?arch=x86_64&upstream=ca-certificates&distro=alpine-3.21.0',
  'pkg:apk/alpine/gdbm@1.24-r0?arch=x86_64&distro=alpine-3.21.0',
  'pkg:apk/alpine/libcrypto3@3.3.2-r4?arch=x86_64&upstream=openssl&distro=alpine-3.21.0',
  'pkg:apk/alpine/libevent@2.1.12-r7?arch=x86_64&distro=alpine-3.21.0',
  'pkg:apk/alpine/libsasl@2.1.28-r8?arch=x86_64&upstream=cyrus-sasl&distro=alpine-3.21.0',
  'pkg:apk/alpine/libssl3@3.3.2-r4?arch=x86_64&upstream=openssl&distro=alpine-3.21.0',
  'pkg:apk/alpine/musl@1.2.5-r8?arch=x86_64&distro=alpine-3.21.0',
  'pkg:apk/alpine/musl-utils@1.2.5-r8?arch=x86_64&upstream=musl&distro=alpine-3.21.0',
  'pkg:apk/alpine/scanelf@1.3.8-r1?arch=x86_64&upstream=pax-utils&distro=alpine-3.21.0',
  'pkg:apk/alpine/ssl_client@1.37.0-r8?arch=x86_64&upstream=busybox&distro=alpine-3.21.0',
  'pkg:apk/alpine/zlib@1.3.1-r2?arch=x86_64&distro=alpine-3.21.0',
];

describe('Anchore', () => {
  test('other external references around the purl (CPEs) are kept, the purl is rewritten', () => {
    const purl = 'pkg:deb/debian/usr-is-merged@37~deb12u1?arch=all&upstream=usrmerge&distro=debian-12';
    const cpe = { referenceCategory: 'PACKAGE-MANAGER', referenceType: 'cpe', referenceLocator: 'notpurl' };
    const pkg = pkgOf(purl);
    pkg.externalRefs = [cpe, ...pkg.externalRefs!, cpe];
    const [out] = translate(anchoreSpdxPackage, anchoreSpdxPackage, pkg);
    expect(out.externalRefs).toEqual([cpe, pkg.externalRefs![1], cpe]);
    expect(out.externalRefs![1].referenceLocator).toBe(norm(purl));
  });

  test('the version info carries the epoch of the purl', () => {
    const purl = 'pkg:deb/debian/openssh-client@1%3A9.2p1-2%2Bdeb12u5?arch=i386&distro=debian-12&upstream=openssh';
    const [out] = translate(anchoreSpdxPackage, anchoreSpdxPackage, pkgOf(purl, { versionInfo: '9.2p1-2+deb12u5' }));
    expect(purlOf(out)).toBe(norm(purl));
    expect(out.versionInfo).toBe('1:9.2p1-2+deb12u5');
  });

  test.each(ANCHORE_ALPINE)('keeps the purl of the Alpine package %s', purl => {
    expect(purlOf(translate(anchoreSpdxPackage, anchoreSpdxPackage, pkgOf(purl))[0])).toBe(norm(purl));
  });

  test.each([
    ['with an epoch', 'pkg:deb/debian/bsdutils@1:2.38.1-5%2Bdeb12u1?arch=amd64&upstream=util-linux%402.38.1-5%2Bdeb12u1&distro=debian-12',
      'pkg:deb/debian/bsdutils@2.38.1-5%2Bdeb12u1?arch=amd64&distro=debian-12&epoch=1', 'built package from: util-linux 2.38.1-5+deb12u1'],
    ['standard Debian', 'pkg:deb/debian/dirmngr@2.2.40-1.1?arch=amd64&upstream=gnupg2&distro=debian-12',
      'pkg:deb/debian/dirmngr@2.2.40-1.1?arch=amd64&distro=debian-12', 'built package from: gnupg2 2.2.40-1.1'],
    ['standard Alpine', 'pkg:apk/alpine/alpine-release@3.21.0-r0?arch=x86_64&upstream=alpine-base&distro=alpine-3.21.0',
      'pkg:apk/alpine/alpine-release@3.21.0-r0?arch=x86_64&distro=3.21.0', 'built package from: alpine-base 3.21.0-r0'],
    ['Alpine without upstream', 'pkg:apk/alpine/alpine-baselayout@3.6.8-r0?arch=x86_64&distro=alpine-3.21.0',
      'pkg:apk/alpine/alpine-baselayout@3.6.8-r0?arch=x86_64&distro=3.21.0', 'built package from: alpine-baselayout 3.6.8-r0'],
  ])('to Trivy: %s', (_, input, purl, info) => {
    const [out] = translate(anchoreSpdxPackage, trivyPackage, pkgOf(input));
    expect(purlOf(out)).toBe(norm(purl));
    expect(out.sourceInfo).toBe(info);
  });

  test('from Google', () => {
    const purl = 'pkg:deb/debian/libaudit1@1%3A3.0.9-1?arch=i386&distro=debian-12&upstream=auditt';
    expect(purlOf(translate(googlePackage, anchoreSpdxPackage, pkgOf(purl))[0])).toBe(norm(purl));
  });
});

describe('Docker', () => {
  const scout = 'pkg:deb/debian/dirmngr@2.2.40-1.1?os_distro=bookworm&os_name=debian&os_version=12';

  test('Docker to Docker', () => {
    expect(purlOf(translate(dockerSpdxPackage, dockerSpdxPackage, pkgOf(scout))[0])).toBe(norm(scout));
  });

  test('Docker to Docker with an epoch', () => {
    const purl = 'pkg:deb/debian/libnss3@2:3.87.1-1%2Bdeb12u1?os_distro=bookworm&os_name=debian&os_version=12';
    expect(purlOf(translate(dockerSpdxPackage, dockerSpdxPackage, pkgOf(purl))[0])).toBe(norm(purl));
  });

  test('the generic details of a Docker package', () => {
    expect(dockerSpdxPackage.toCanonical(pkgOf(scout))).toEqual({
      type: 'deb', name: 'dirmngr', version: '2.2.40-1.1', namespace: 'debian', distro: { name: 'debian', version: '12', codename: 'bookworm' },
    });
  });

  test('Docker to Trivy: no arch, the release without a minor, the epoch as a qualifier', () => {
    const [out] = translate(dockerSpdxPackage, trivyPackage, pkgOf('pkg:deb/debian/automake@1:1.16.5-1.3?os_distro=bookworm&os_name=debian&os_version=12'));
    expect(purlOf(out)).toBe(norm('pkg:deb/debian/automake@1.16.5-1.3?distro=debian-12&epoch=1'));
  });

  test('Docker to Anchore: no arch, no upstream', () => {
    const pkg = pkgOf(scout);
    const canonical = dockerSpdxPackage.toCanonical(pkg);
    expect(canonical).toBeDefined();
    expect(purlOf(anchoreSpdxPackage.fromCanonical!(canonical, pkg)[0])).toBe(norm('pkg:deb/debian/dirmngr@2.2.40-1.1?distro=debian-12'));
  });

  test('Anchore to Docker: one package, the arch is kept', () => {
    const out = translate(anchoreSpdxPackage, dockerSpdxPackage, pkgOf('pkg:deb/debian/binutils-common@2.40-2?arch=i386&distro=debian-12'));
    expect(out).toHaveLength(1);
    expect(purlOf(out[0])).toBe(norm('pkg:deb/debian/binutils-common@2.40-2?arch=i386&os_distro=bookworm&os_name=debian&os_version=12'));
  });

  test('Anchore to Docker: an upstream with the package\'s own name is no second package', () => {
    const out = translate(anchoreSpdxPackage, dockerSpdxPackage, pkgOf('pkg:deb/debian/binutils-common@2.40-2?arch=i386&distro=debian-12&upstream=binutils-common'));
    expect(out).toHaveLength(1);
  });

  test('Anchore to Docker: the source package is listed as a package of its own', () => {
    const out = translate(anchoreSpdxPackage, dockerSpdxPackage, pkgOf('pkg:deb/debian/binutils-common@2.40-2?arch=i386&distro=debian-12&upstream=binutils'));
    expect(out.map(p => purlOf(p))).toEqual([
      norm('pkg:deb/debian/binutils-common@2.40-2?arch=i386&os_distro=bookworm&os_name=debian&os_version=12&upstream=binutils'),
      norm('pkg:deb/debian/binutils@2.40-2?os_distro=bookworm&os_name=debian&os_version=12'),
    ]);
  });

  test.each([
    ['Anchore', anchoreSpdxPackage, '1%3A4.13%2Bdfsg1-1', 'shadow%401%3A4.13%2Bdfsg1-1'],
    ['Google', googlePackage, '1%3A4.13%2Bdfsg1-1', 'shadow%401%3A4.13%2Bdfsg1-1'], // Google's upstream has its version, as Syft's
  ])('%s to Docker: an upstream with a version and an epoch', (_, from, sourceVersion, upstream) => {
    const purl = 'pkg:deb/debian/passwd@1%3A4.13%2Bdfsg1-1%2Bb1?arch=amd64&distro=debian-12&upstream=shadow%401%3A4.13%2Bdfsg1-1';
    const out = translate(from, dockerSpdxPackage, pkgOf(purl));
    expect(out.map(p => purlOf(p))).toEqual([
      norm(`pkg:deb/debian/passwd@1%3A4.13%2Bdfsg1-1%2Bb1?arch=amd64&os_distro=bookworm&os_name=debian&os_version=12&upstream=${upstream}`),
      // with an upstream version the source has it, not the binNMU one of the binary (as in Scout's own SBOMs)
      norm(`pkg:deb/debian/shadow@${sourceVersion}?os_distro=bookworm&os_name=debian&os_version=12`),
    ]);
  });

  test('Trivy to Docker', () => {
    const [out] = translate(trivyPackage, dockerSpdxPackage, pkgOf('pkg:deb/debian/automake@1.16.5-1.3?arch=all&distro=debian-12.9&epoch=1'));
    expect(purlOf(out)).toBe(norm('pkg:deb/debian/automake@1:1.16.5-1.3?arch=all&os_distro=bookworm&os_name=debian&os_version=12'));
  });

  test("a Trivy package's attribution texts and purpose are not Docker's: its id is made distinct", () => {
    const pkg = pkgOf('pkg:deb/debian/automake@1.16.5-1.3?arch=all&distro=debian-12.9', {
      attributionTexts: ['PkgType: debian'], primaryPackagePurpose: 'LIBRARY',
    });
    const [out] = translate(trivyPackage, dockerSpdxPackage, pkg);
    expect(out.attributionTexts).toBeUndefined();
    expect(out.primaryPackagePurpose).toBeUndefined();
    expect(out.SPDXID).toBe('SPDXRef-Package-11234567780123456');
  });
});

describe('Google (from)', () => {
  test('a Debian purl is made canonical: distro, release, epoch, upstream', () => {
    expect(googlePackage.toCanonical(pkgOf('pkg:deb/debian/login@1%3A4.13%2Bb1?arch=I386&distro=debian-12&upstream=shadow%401%3A4.13'))).toEqual({
      type: 'deb', namespace: 'debian', name: 'login', version: '4.13+b1', epoch: '1', architecture: 'i386',
      distro: { name: 'debian', version: '12', codename: 'bookworm' }, upstream: { name: 'shadow', version: '1:4.13' },
    });
  });

  // Google's Alpine upstream is `<origin>@<the package's own version>`, also when the origin is the package
  test.each([
    ['pkg:apk/alpine/libcrypto3@3.5.1-r0?arch=x86_64&distro=alpine-3.22&upstream=openssl%403.5.1-r0', { name: 'openssl' }],
    ['pkg:apk/alpine/musl@1.2.5-r10?arch=x86_64&distro=alpine-3.22&upstream=musl%401.2.5-r10', undefined],
  ])('an Alpine package: its distro, its origin when another package (%s)', (purl, upstream) => {
    const c = googlePackage.toCanonical(pkgOf(purl))!;
    expect(c).toMatchObject({ type: 'apk', distro: { name: 'alpine', version: '3.22' } });
    expect(c.upstream).toEqual(upstream);
  });

  test.each([
    ['pkg:golang/github.com%2Fagext%2Flevenshtein@1.2.3', { namespace: 'github.com/agext', name: 'levenshtein', version: 'v1.2.3' }],
    ['pkg:npm/%40isaacs%2Fcliui@8.0.2', { namespace: '@isaacs', name: 'cliui', version: '8.0.2' }],
    ['pkg:maven/aopalliance%3Aaopalliance@1.0', { namespace: 'aopalliance', name: 'aopalliance', version: '1.0' }],
    ['pkg:composer/asm89%2Fstack-cors@2.2.0', { namespace: 'asm89', name: 'stack-cors', version: '2.2.0' }],
  ])('a namespace folded into the name is split out (%s)', (purl, expected) => {
    expect(googlePackage.toCanonical(pkgOf(purl))).toMatchObject(expected);
  });

  test('Google to Trivy', () => {
    const [out] = translate(googlePackage, trivyPackage, pkgOf('pkg:deb/debian/libaom3@3.6.0-1%2Bdeb12u1?arch=i386&distro=debian-12&upstream=aom'));
    expect(purlOf(out)).toBe(norm('pkg:deb/debian/libaom3@3.6.0-1%2Bdeb12u1?arch=i386&distro=debian-12'));
    expect(out.sourceInfo).toBe('built package from: aom 3.6.0-1+deb12u1');
  });

  test('Google to Trivy with an epoch', () => {
    const [out] = translate(googlePackage, trivyPackage, pkgOf('pkg:deb/debian/login@1%3A4.13%2Bdfsg1-1%2Bb1?arch=i386&distro=debian-12&upstream=shadow%401%3A4.13%2Bdfsg1-1'));
    expect(purlOf(out)).toBe(norm('pkg:deb/debian/login@4.13%2Bdfsg1-1%2Bb1?arch=i386&distro=debian-12&epoch=1'));
    expect(out.sourceInfo).toBe('built package from: shadow 1:4.13+dfsg1-1'); // the source's version, not the binary's
  });
});

describe('Amazon (from)', () => {
  const withOs = (...packages: SpdxPackage[]) =>
    amazonProvider.toCanonical(docOf('Tool: Amazon Inspector', ...packages)).packages;

  test('a dpkg purl is a Debian package of the distro the versions name', () => {
    const [e] = withOs(pkgOf('pkg:dpkg/findutils@4.9.0-4?arch=AMD64&epoch=0&upstream=findutils-4.9.0-4.src.dpkg', { versionInfo: '4.9.0-4+deb12u1' }));
    expect(e.canonical).toEqual({
      type: 'deb', namespace: 'debian', name: 'findutils', version: '4.9.0-4', epoch: '0', architecture: 'amd64',
      distro: { name: 'debian', version: '12' },
    });
  });

  test('without a distro in the versions: Debian, no release', () => {
    const [e] = withOs(pkgOf('pkg:dpkg/findutils@4.9.0-4?arch=AMD64'));
    expect(e.canonical!.distro).toEqual({ name: 'debian', version: undefined });
  });

  test('an apk purl is an Alpine package', () => {
    const [e] = withOs(pkgOf('pkg:apk/musl@1.2.5-r8?arch=X86_64&epoch=0'));
    expect(e.canonical).toMatchObject({ type: 'apk', namespace: 'alpine', architecture: 'x86_64' });
    expect(e.canonical!.epoch).toBeUndefined();
  });

  test('an invalid purl is an error', () => {
    const invalid: SpdxPackage = { name: 'x', SPDXID: 'SPDXRef-x', externalRefs: [{ referenceCategory: 'PACKAGE-MANAGER', referenceType: 'purl', referenceLocator: 'invalid-purl' }] };
    expect(() => withOs(invalid)).toThrow('Invalid package URL');
  });

  test('other packages are canonical by their purl; packages without references have no canonical form', () => {
    const npm = pkgOf('pkg:npm/example@1.0.0?a=b');
    const bare: SpdxPackage = { name: 'b', SPDXID: 'SPDXRef-b', externalRefs: [] };
    const [n, b] = withOs(npm, bare);
    expect(n.canonical).toEqual({ type: 'npm', namespace: '', name: 'example', version: '1.0.0', subpath: undefined, qualifiers: { a: 'b' } });
    expect(b).toEqual({ pkg: bare, canonical: undefined });
  });

  test.each([
    ['to Anchore', 'pkg:dpkg/libncurses5-dev@6.4-4?arch=I386&epoch=0&upstream=libncurses5-dev-6.4-4.src.dpkg', 'pkg:deb/debian/libncurses5-dev@6.4-4?arch=i386&distro=debian-12'],
    ['to Anchore with an epoch', 'pkg:dpkg/file@5.44-3?arch=I386&epoch=1&upstream=file-5.44-3.src.dpkg', 'pkg:deb/debian/file@1:5.44-3?arch=i386&distro=debian-12'],
  ])('%s', (_, input, expected) => {
    const [e] = withOs(pkgOf(input, { versionInfo: '1.0+deb12u1' }));
    expect(purlOf(anchoreSpdxPackage.fromCanonical!(e.canonical, e.pkg)[0])).toBe(norm(expected));
  });

  test('a package that is not from the OS comes out unchanged in every tool', () => {
    const [e] = withOs(pkgOf('pkg:pypi/requests@2.32.3'));
    for (const to of [anchoreSpdxPackage, dockerSpdxPackage, trivyPackage]) {
      expect(purlOf(to.fromCanonical!(e.canonical, e.pkg)[0])).toBe(norm('pkg:pypi/requests@2.32.3'));
    }
  });
});

describe('Microsoft (from)', () => {
  const sbom = 'pkg:deb/debian/bsdutils@1:2.38.1-5%2Bdeb12u';
  const entry = () => microsoftProvider.toCanonical(docOf('Tool: Microsoft.SBOMTool-2.0', pkgOf(sbom))).packages[0];

  test('splits the epoch off the version', () => {
    expect(entry().canonical).toMatchObject({ name: 'bsdutils', namespace: 'debian', version: '2.38.1-5+deb12u', epoch: '1' });
  });

  // each tool writes the epoch its own way: in the version (Syft, Docker), as a qualifier (Trivy)
  test.each([
    ['Anchore', anchoreSpdxPackage, sbom],
    ['Trivy', trivyPackage, 'pkg:deb/debian/bsdutils@2.38.1-5%2Bdeb12u?epoch=1'],
    ['Docker', dockerSpdxPackage, sbom],
  ])('to %s', (_, to, expected) => {
    const e = entry();
    expect(purlOf(to.fromCanonical!(e.canonical, e.pkg)[0])).toBe(norm(expected));
  });

  // Microsoft gives an Alpine package no purl, whoever its supplier is
  test('a package without a purl is an Alpine package, and is written without one', () => {
    const pkg: SpdxPackage = { name: 'readline', SPDXID: 'SPDXRef-readline', versionInfo: '8.2.13-r1', supplier: 'Organization: Celeste <cielesti@protonmail.com>' };
    const canonical = microsoftProvider.toCanonical(docOf('Tool: Microsoft.SBOMTool-2.2.9', pkg));
    expect(canonical.packages[0].canonical).toEqual({ type: 'apk', namespace: 'alpine', name: 'readline', version: '8.2.13-r1' });
    expect(microsoftProvider.fromCanonical(canonical).packages).toEqual([pkg]);
  });

  // sbom-tool 4.1.5 on mysql:26.10.0: an rpm has no purl either, its epoch in its version
  test('a package without a purl and without an Alpine version is an rpm, written back unchanged', () => {
    const pkg: SpdxPackage = { name: 'shadow-utils', SPDXID: 'SPDXRef-shadow', versionInfo: '2:4.9-16.el9', supplier: 'NOASSERTION' };
    const canonical = microsoftProvider.toCanonical(docOf('Tool: Microsoft.SBOMTool-4.1.5', pkg));
    expect(canonical.packages[0].canonical).toEqual({ type: 'rpm', namespace: '', name: 'shadow-utils', version: '4.9-16.el9', epoch: '2' });
    expect(microsoftProvider.fromCanonical(canonical).packages).toEqual([pkg]);
  });

  test('an rpm of another tool is written without a purl', () => {
    const syft = anchoreSpdxProvider.toCanonical(docOf('Tool: syft', pkgOf('pkg:rpm/ol/shadow-utils@4.9-16.el9?arch=x86_64&distro=ol-9.8&epoch=2')));
    const [written] = microsoftProvider.fromCanonical(syft).packages;
    expect(written.externalRefs ?? []).toEqual([]);
    expect(written.versionInfo).toBe('2:4.9-16.el9');
  });
});

describe('providers', () => {
  test('the OS package Trivy lists', () => {
    const canonical = {
      doc: docOf('Tool: x'),
      packages: [{ pkg: pkgOf('pkg:deb/debian/a@1'), canonical: { type: 'deb', namespace: 'debian', name: 'a', version: '1', distro: { name: 'debian', version: '11' } } }],
    };
    const os = trivyProvider.fromCanonical(canonical).packages.find(p => p.primaryPackagePurpose === 'OPERATING-SYSTEM')!;
    expect(os).toMatchObject({ name: 'debian', versionInfo: '11', SPDXID: 'SPDXRef-OperatingSystem', downloadLocation: 'NONE', filesAnalyzed: false });
    expect(os.attributionTexts).toEqual(expect.arrayContaining(['Class: os-pkgs', 'Type: debian']));
  });

  test('an empty document stays empty', () => {
    const doc = docOf('Tool: trivy-0.1');
    expect(trivyProvider.toCanonical(doc).packages).toEqual([]);
    expect(trivyProvider.fromCanonical(trivyProvider.toCanonical(doc)).packages).toEqual([]);
  });

  test.each([
    ['Tool: syft-1.12.2', anchoreSpdxProvider],
    ['Tool: trivy-0.76.0', trivyProvider],
    ['Tool: docker-scout-1.0', dockerSpdxProvider],
    ['Organization: Google LLC', PROVIDERS.google],
    ['Tool: Amazon Inspector', amazonProvider],
    ['Tool: Microsoft.SBOMTool-2.2.3', microsoftProvider],
  ])('%s is detected', (creator, provider) => {
    expect(detectProvider(docOf(creator))).toBe(provider);
  });

  test('providers are found by name, case and alias', () => {
    expect(providerFromName(' Trivy ')).toBe(trivyProvider);
    expect(providerFromName('GCP')).toBe(PROVIDERS.google);
    expect(providerFromName('syft')).toBe(anchoreSpdxProvider);
    expect(() => providerFromName('nope')).toThrow('Unsupported provider: nope');
  });

  test('Trivy CycloneDX is listed with the CycloneDX providers', () => {
    expect(CYCLONEDX_PROVIDERS.trivy).toBe(trivyCycloneDxProvider);
  });

  test('a document without a known creator, or without creators, is not detected', () => {
    expect(() => detectProvider(docOf('Tool: unknown-1'))).toThrow('Unable to detect provider');
    expect(() => detectProvider({ ...docOf('x'), creationInfo: { creators: [], created: '' } })).toThrow('missing creation info');
  });

  // Purls of the Google, Inspector and Microsoft SBOMs of the SBOMVert dataset (box.roc.cnam.fr), and the same bsdutils
  // (1:2.38.1-5+deb12u3, built from util-linux 2.38.1-5+deb12u3) as each writes it
  describe.each([
    ['google', 'Organization: Google LLC', [
      'pkg:deb/debian/login@1%3A4.13%2Bdfsg1-1%2Bdeb12u1?arch=amd64&distro=debian-12&upstream=shadow',
      'pkg:deb/debian/bsdutils@1%3A2.38.1-5%2Bdeb12u3?arch=amd64&distro=debian-12&upstream=util-linux%402.38.1-5%2Bdeb12u3',
      'pkg:apk/alpine/libcrypto3@3.5.1-r0?arch=x86_64&distro=alpine-3.22&upstream=openssl%403.5.1-r0',
      'pkg:golang/github.com%2Fagext%2Flevenshtein@1.2.3',
    ], 'pkg:deb/debian/bsdutils@1%3A2.38.1-5%2Bdeb12u3?arch=amd64&distro=debian-12&upstream=util-linux%402.38.1-5%2Bdeb12u3'],
    ['amazon', 'Tool: Amazon Inspector', [
      'pkg:dpkg/login@4.13+dfsg1-1+deb12u1?arch=AMD64&epoch=1&upstream=login-4.13+dfsg1-1+deb12u1.src.dpkg',
      'pkg:dpkg/adduser@3.134-null?arch=ALL&epoch=0&upstream=adduser-3.134-null.src.dpkg',
      'pkg:apk/libcrypto3@3.5.1-r0?arch=X86_64&epoch=0&upstream=libcrypto3-3.5.1-r0.src.apk',
    ], 'pkg:dpkg/bsdutils@2.38.1-5+deb12u3?arch=AMD64&epoch=0&upstream=bsdutils-2.38.1-5+deb12u3.src.dpkg'],
    ['microsoft', 'Tool: Microsoft.SBOMTool-2.2.9', ['pkg:deb/debian/login@1:4.13+dfsg1-1+deb12u1'], 'pkg:deb/debian/bsdutils@1:2.38.1-5+deb12u3'],
  ] as const)('%s, written', (name, creator, own, fromSyft) => {
    const provider = PROVIDERS[name];

    test.each([...own, 'pkg:pypi/requests@2.32.3'])('%s comes back unchanged', purl => {
      expect(purlOf(provider.fromCanonical(provider.toCanonical(docOf(creator, pkgOf(purl)))).packages[0])).toBe(norm(purl));
    });

    test('a Syft deb is written the tool\'s way', () => {
      const syft = docOf('Tool: syft-1.12.2', pkgOf('pkg:deb/debian/bsdutils@1:2.38.1-5%2Bdeb12u3?arch=amd64&upstream=util-linux%402.38.1-5%2Bdeb12u3&distro=debian-12'));
      expect(purlOf(provider.fromCanonical(anchoreSpdxProvider.toCanonical(syft)).packages[0])).toBe(norm(fromSyft));
    });

    // Microsoft's is known (no purl: below)
    (name === 'microsoft' ? test.skip : test)('an rpm, whose form for the tool is not known, is left as the other tool wrote it', () => {
      const rpm = 'pkg:rpm/ol/findutils@4.8.0-7.el9?arch=aarch64&distro=ol-9.8&epoch=1&upstream=findutils-4.8.0-7.el9.src.rpm';
      expect(purlOf(provider.fromCanonical(anchoreSpdxProvider.toCanonical(docOf('Tool: syft', pkgOf(rpm)))).packages[0])).toBe(norm(rpm));
    });
  });

  // as Inspector SBOM Generator 1.17.7 wrote them for debian:13.7 and alpine:3.24.4 (2026-11-15)
  const deb = (name: string, version: string, q = '') => `pkg:deb/debian/${name}@${encodeURIComponent(version)}?arch=amd64&distro=trixie&epoch=${q}`;
  const sbomgen = (os: object, components: object[]) =>
    ({ bomFormat: 'CycloneDX', specVersion: '1.5', version: 1, components: [{ 'bom-ref': 'comp-2', type: 'operating-system', ...os }, ...components] }) as unknown as CycloneDxBom;
  const comp = (ref: string, name: string, version: string, purl: string, components?: object[]) =>
    ({ 'bom-ref': ref, type: 'application', name, version, purl, ...(components && { components }) });
  const DEBIAN = sbomgen({ name: 'Debian GNU/Linux', version: '13' }, [
    comp('comp-3', 'apt', '3.0.4', deb('apt', '3.0.4', '0'), [comp('comp-4', 'libapt-pkg7.0', '3.0.4', deb('libapt-pkg7.0', '3.0.4', '0&source=apt'))]),
    comp('comp-33', 'acl', '2.3.2-2', deb('acl', '2.3.2-2', '0'), [comp('comp-34', 'libacl1', '2.3.2-2+b1', deb('libacl1', '2.3.2-2+b1', '0&source=acl'))]),
    comp('comp-35', 'attr', '2.5.2-3', deb('attr', '2.5.2-3', '1'), [comp('comp-36', 'libattr1', '2.5.2-3', deb('libattr1', '2.5.2-3', '1&source=attr'))]),
    { 'bom-ref': 'comp-38', type: 'library', name: 'pip', version: '26.2.2', purl: 'pkg:pypi/pip@26.2.2' },
  ]);
  const ALPINE = sbomgen({ name: 'Alpine Linux', version: '3.24.4' }, [
    comp('comp-3', 'openssl', '3.5.9-r0', 'pkg:apk/alpine/openssl@3.5.9-r0?arch=x86_64&distro=3.24.4', [
      comp('comp-4', 'libssl3', '3.5.9-r0', 'pkg:apk/alpine/libssl3@3.5.9-r0?arch=x86_64&distro=3.24.4&source=openssl'),
    ]),
  ]);
  const amazonCdx = CYCLONEDX_PROVIDERS.amazon;
  // mysql:26.10.0 (Oracle Linux 9.8): flat, the source rpm's file name as `source`
  const ORACLE = sbomgen({ name: 'Oracle Linux Server', version: '9.8' }, [
    comp('comp-3', 'shadow-utils', '4.9-16.el9', 'pkg:rpm/oracle/shadow-utils@4.9-16.el9?arch=x86_64&distro=9.8&epoch=2&source=shadow-utils-4.9-16.el9.src.rpm'),
    comp('comp-4', 'tzdata', '2026e-1.el9_8', 'pkg:rpm/oracle/tzdata@2026e-1.el9_8?arch=noarch&distro=9.8&epoch=0&source=tzdata-2026e-1.el9_8.src.rpm'),
  ]);

  test('Amazon CycloneDX rpm: read as Syft has it, written back unchanged', () => {
    expect(amazonCdx.fromCanonical(amazonCdx.toCanonical(ORACLE))).toEqual(ORACLE);
    expect(amazonCdx.toCanonical(ORACLE).packages[1].canonical).toEqual({
      type: 'rpm', namespace: 'ol', name: 'shadow-utils', version: '4.9-16.el9', epoch: '2', architecture: 'x86_64',
      distro: { name: 'ol', version: '9', fullVersion: '9.8' }, upstream: { name: 'shadow-utils-4.9-16.el9.src.rpm' },
    });
    const syft = anchoreSpdxProvider.fromCanonical(cycloneDxToSpdx(amazonCdx.toCanonical(ORACLE)));
    expect(purlOf(syft.packages.find(p => p.name === 'shadow-utils')!)).toBe(norm('pkg:rpm/ol/shadow-utils@4.9-16.el9?arch=x86_64&distro=ol-9.8&epoch=2&upstream=shadow-utils-4.9-16.el9.src.rpm'));
  });

  test('Amazon CycloneDX: the binaries nested under their source are read, and written back unchanged', () => {
    for (const bom of [DEBIAN, ALPINE]) expect(amazonCdx.fromCanonical(amazonCdx.toCanonical(bom))).toEqual(bom);
    const read = amazonCdx.toCanonical(DEBIAN).packages.map(p => p.canonical).filter(Boolean);
    const byName = Object.fromEntries(read.map(c => [c!.name, c!]));
    expect(Object.keys(byName)).toEqual(['apt', 'libapt-pkg7.0', 'acl', 'libacl1', 'attr', 'libattr1', 'pip']);
    expect(byName.libacl1).toMatchObject({ version: '2.3.2-2+b1', architecture: 'amd64', upstream: { name: 'acl', version: '2.3.2-2' }, distro: { name: 'debian', version: '13', codename: 'trixie' } });
    // the source's version only when it is not the package's
    expect(byName.libattr1).toMatchObject({ epoch: '1', upstream: { name: 'attr' } });
    expect(byName.libattr1.upstream!.version).toBeUndefined();
    expect(amazonCdx.toCanonical(ALPINE).packages[2].canonical).toMatchObject({ type: 'apk', name: 'libssl3', distro: { name: 'alpine', version: '3.24.4' }, upstream: { name: 'openssl' } });
  });

  test.each([['trivy'], ['anchore']] as const)('Amazon CycloneDX through %s CycloneDX and back: the same SBOM, nesting included', tool => {
    for (const bom of [DEBIAN, ALPINE, ORACLE]) {
      const there = CYCLONEDX_PROVIDERS[tool].fromCanonical(amazonCdx.toCanonical(bom));
      const back = amazonCdx.fromCanonical(CYCLONEDX_PROVIDERS[tool].toCanonical(there));
      const tree = (b: CycloneDxBom) => (b.components ?? []).filter(c => c.purl).map(c => [c.purl, c.version, (c.components ?? []).map(k => [k.purl, k.version])]);
      expect(tree(back)).toEqual(tree(bom));
    }
  });

  test('Amazon CycloneDX from Trivy: a binary nested under its source, which is added', () => {
    const trivy = CYCLONEDX_PROVIDERS.trivy.fromCanonical(amazonCdx.toCanonical(DEBIAN));
    trivy.components = trivy.components!.filter(c => c.name === 'libacl1');
    const written = amazonCdx.fromCanonical(CYCLONEDX_PROVIDERS.trivy.toCanonical(trivy));
    const acl = written.components!.find(c => c.name === 'acl')!;
    expect(acl.purl).toBe('pkg:deb/debian/acl@2.3.2-2?arch=amd64&distro=trixie&epoch=0');
    expect(acl.components!.map(c => c.purl)).toEqual(['pkg:deb/debian/libacl1@2.3.2-2%2Bb1?arch=amd64&distro=trixie&epoch=0&source=acl']);
  });
});

describe('whole SBOMs', () => {
  test('a Syft SBOM of nginx, translated to Trivy: the OS package is added, the source info set', () => {
    const syft = docOf('Tool: syft-1.12.2', pkgOf('pkg:deb/debian/adduser@3.134?arch=all&distro=debian-12', { versionInfo: '3.134' }));
    const out = convertSbom(syft, 'trivy');
    expect(out.packages).toHaveLength(syft.packages.length + 1);
    expect(out.packages[0].sourceInfo).toContain('built package from');
  });
});

// A package read from any tool comes out in every tool that can be written, in that tool's own form:
// the gap the canonical form closes (a tool whose purl lacks the distro used to be copied unchanged).
describe('every tool to every tool', () => {
  const doc = (creator: string, purl: string, extra: Partial<SpdxPackage> = {}) => docOf(creator, pkgOf(purl, extra));
  const sources: [string, SpdxDocument][] = [
    ['Trivy', doc('Tool: trivy-0.76.0', 'pkg:deb/debian/automake@1.16.5-1.3?arch=all&distro=debian-12.9&epoch=1', { sourceInfo: 'built package from: automake-defaults 1:1.16.5-1.3' })],
    ['Anchore', doc('Tool: syft-1.12.2', 'pkg:deb/debian/automake@1:1.16.5-1.3?arch=all&distro=debian-12&upstream=automake-defaults')],
    ['Docker', doc('Tool: docker-scout', 'pkg:deb/debian/automake@1:1.16.5-1.3?os_distro=bookworm&os_name=debian&os_version=12')],
    ['Google', doc('Organization: Google LLC', 'pkg:deb/debian/automake@1:1.16.5-1.3?arch=all&distro=debian-12&upstream=automake-defaults')],
    ['Amazon', doc('Tool: Amazon Inspector', 'pkg:dpkg/automake@1.16.5-1.3?arch=ALL&epoch=1', { versionInfo: '1.16.5-1.3+deb12u1' })],
  ];

  test.each(sources.flatMap(([from, d]) => ['trivy', 'anchore', 'docker'].map(to => [from, to, d] as const)))(
    '%s to %s names the package, the distro and the epoch the way the tool writes them',
    (_, to, d) => {
      const out = convertSbom(d, to).packages.find(p => p.name === 'automake')!;
      const purl = parsePackageUrl(purlOf(out))!;
      expect(purl.type).toBe('deb'); // not Amazon's dpkg
      expect(purl.namespace).toBe('debian');
      const q = purl.qualifiers;
      if (to === 'trivy') {
        expect(q.epoch).toBe('1');
        expect(purl.version).toBe('1.16.5-1.3');
        expect(q.distro).toMatch(/^debian-12/);
      } else {
        expect(purl.version).toBe('1:1.16.5-1.3');
        if (to === 'docker') expect(q).toMatchObject({ os_name: 'debian', os_version: '12', os_distro: 'bookworm' });
        else expect(q.distro).toBe(_ === 'Trivy' ? 'debian-12.9' : 'debian-12'); // the release as the tool read it
      }
    }
  );
});

// Packages that are not from the OS are made canonical too: whichever tool they are read from and
// written to, type, namespace, name, version and qualifiers (and the scoped name of an npm package)
// are the same.
describe('non-OS packages, every tool to every tool', () => {
  const purls = [
    'pkg:npm/lodash@4.17.21',
    'pkg:npm/%40babel/core@7.24.0',
    'pkg:pypi/requests@2.32.3',
    'pkg:maven/org.apache.logging.log4j/log4j-core@2.17.1?type=jar',
    'pkg:golang/github.com/spf13/cobra@v1.8.0',
    'pkg:cargo/serde@1.0.200',
    'pkg:gem/rails@7.1.0',
    'pkg:nuget/Newtonsoft.Json@13.0.3',
  ];
  const sources: [string, string][] = [
    ['Trivy', 'Tool: trivy-0.76.0'],
    ['Anchore', 'Tool: syft-1.12.2'],
    ['Docker', 'Tool: docker-scout'],
    ['Google', 'Organization: Google LLC'],
    ['Amazon', 'Tool: Amazon Inspector'],
    ['Microsoft', 'Tool: Microsoft.SBOMTool'],
  ];

  test.each(sources.flatMap(([from, creator]) => ['trivy', 'anchore', 'docker'].map(to => [from, creator, to] as const)))(
    '%s to %s keeps the package',
    (_, creator, to) => {
      for (const purl of purls) {
        const out = convertSbom(docOf(creator, pkgOf(purl)), to, providerFromName(_));
        expect(out.packages).toHaveLength(1);
        expect(purlOf(out.packages[0])).toBe(norm(purl));
      }
    }
  );

  test('a non-OS package of a Trivy SBOM does not pick up the OS package', () => {
    const doc = docOf('Tool: trivy-0.76.0', pkgOf('pkg:npm/lodash@4.17.21'));
    expect(convertSbom(doc, 'trivy').packages.map(p => p.primaryPackagePurpose)).toEqual([undefined]);
  });
});
