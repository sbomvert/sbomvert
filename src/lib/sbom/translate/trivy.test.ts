/** @jest-environment node */
import { formatPackageUrl, parsePackageUrl } from '../purl/packageUrl';
import { CycloneDxBom } from '../cyclonedx/types';
import { SpdxDocument, SpdxPackage } from '../spdx/types';
import { CanonicalDocument, CanonicalPackage } from './types';
import { anchoreCycloneDxProvider, anchoreSpdxProvider } from './anchore';
import { dockerSpdxProvider } from './docker';
import { CLASSES } from './equivalenceClasses';
import { CYCLONEDX_PROVIDERS } from './index';
import { trivyCycloneDxProvider, trivyProvider } from './trivy';

const docOf = (...packages: SpdxPackage[]): SpdxDocument => ({
  spdxVersion: 'SPDX-2.3',
  name: 'x',
  creationInfo: { creators: ['Tool: trivy-0.76.0'], created: '2026-01-01T00:00:00Z' },
  packages,
});

const pkgFromPurl = (purl: string, extra: Partial<SpdxPackage> = {}): SpdxPackage => ({
  name: parsePackageUrl(purl)!.name,
  SPDXID: 'SPDXRef-Package-1',
  externalRefs: [{ referenceCategory: 'PACKAGE-MANAGER', referenceType: 'purl', referenceLocator: purl }],
  ...extra,
});

const purlOf = (pkg: SpdxPackage) => pkg.externalRefs!.find(r => r.referenceType === 'purl')!.referenceLocator;
const canonicalOf = (purl: string, extra?: Partial<SpdxPackage>): CanonicalPackage | undefined =>
  trivyProvider.toCanonical(docOf(pkgFromPurl(purl, extra))).packages[0].canonical;

describe('Trivy -> canonical -> Trivy', () => {
  test.each([
    'pkg:pypi/flask@2.3.2',
    'pkg:deb/debian/adduser@3.134?arch=all&distro=debian-12.9',
    'pkg:deb/debian/apt@2.6.1?arch=amd64&distro=debian-12.9',
    'pkg:deb/debian/automake@1.16.5-1.3?arch=all&distro=debian-12.9&epoch=1',
    'pkg:deb/debian/base-files@12.4%2Bdeb12u9?arch=amd64&distro=debian-12.9',
    'pkg:apk/alpine/.memcached-rundeps@20241209.203301?arch=noarch&distro=3.21.0',
    'pkg:apk/alpine/alpine-baselayout@3.6.8-r0?arch=x86_64&distro=3.21.0',
    'pkg:apk/alpine/musl@1.2.5-r8?arch=x86_64&distro=3.21.0',
  ])('keeps the purl of %s', purl => {
    const canonical = trivyProvider.toCanonical(docOf(pkgFromPurl(purl, { sourceInfo: 'built package from: x 1' })));
    expect(purlOf(trivyProvider.fromCanonical(canonical).packages[0])).toBe(purl);
  });
});

describe('to the canonical form', () => {
  test('a Debian purl names the distro and its release, and keeps the epoch apart', () => {
    expect(canonicalOf('pkg:deb/debian/automake@1.16.5-1.3?arch=all&distro=debian-12.9&epoch=1')).toEqual({
      type: 'deb',
      namespace: 'debian',
      name: 'automake',
      version: '1.16.5-1.3',
      epoch: '1',
      architecture: 'all',
      distro: { name: 'debian', version: '12', fullVersion: '12.9', codename: 'bookworm' },
    });
  });

  test('an Alpine purl keeps the release as the distro version', () => {
    expect(canonicalOf('pkg:apk/alpine/musl@1.2.5-r8?arch=x86_64&distro=3.21.0')).toEqual({
      type: 'apk',
      namespace: 'alpine',
      name: 'musl',
      version: '1.2.5-r8',
      architecture: 'x86_64',
      distro: { name: 'alpine', version: '3.21.0' },
    });
  });

  test('a package built from another source names it as the upstream', () => {
    const c = canonicalOf('pkg:deb/debian/util-linux-extra@2.38.1-5%2Bdeb12u1?arch=amd64&distro=debian-12.6', {
      sourceInfo: 'built package from: util-linux 2.38.1-5+deb12u1',
    });
    expect(c!.upstream).toEqual({ name: 'util-linux' });
  });

  test('a different upstream version is kept too', () => {
    const c = canonicalOf('pkg:deb/debian/bzr@2.7.0?arch=all&distro=debian-12.9', {
      sourceInfo: 'built package from: bzr-src 2.7.0-1',
    });
    expect(c!.upstream).toEqual({ name: 'bzr-src', version: '2.7.0-1' });
  });

  test('packages that are not from an OS are made canonical by their purl and come back untouched', () => {
    const python = pkgFromPurl('pkg:pypi/flask@2.3.2?file_path=app/x', { versionInfo: '2.3.2' });
    const [entry] = trivyProvider.toCanonical(docOf(python)).packages;
    expect(entry.canonical).toEqual({
      type: 'pypi', namespace: '', name: 'flask', version: '2.3.2', subpath: undefined, qualifiers: { file_path: 'app/x' },
    });
    expect(trivyProvider.fromCanonical({ doc: docOf(), packages: [entry] }).packages).toEqual([python]);
  });

  test('a Debian package without a distro is canonical without one', () => {
    const [entry] = trivyProvider.toCanonical(docOf(pkgFromPurl('pkg:deb/debian/odd@1'))).packages;
    expect(entry.canonical).toMatchObject({ type: 'deb', name: 'odd', version: '1' });
    expect(entry.canonical!.distro).toBeUndefined();
  });
});

describe('from the canonical form', () => {
  const doc = (canonical: CanonicalPackage, pkg: SpdxPackage = pkgFromPurl('pkg:deb/debian/x@1')): CanonicalDocument => ({
    doc: docOf(),
    packages: [{ pkg, canonical }],
  });
  const debian = (extra: Partial<CanonicalPackage> = {}): CanonicalPackage => ({
    type: 'deb', namespace: 'debian', name: 'adduser', version: '3.134', architecture: 'all',
    distro: { name: 'debian', version: '12', fullVersion: '12.9', codename: 'bookworm' }, ...extra,
  });

  test('writes a package of another tool the way Trivy does, and adds the OS package Trivy lists', () => {
    const { packages } = trivyProvider.fromCanonical(doc(debian()));
    expect(packages).toHaveLength(2);
    expect(purlOf(packages[0])).toBe('pkg:deb/debian/adduser@3.134?arch=all&distro=debian-12.9');
    expect(packages[0].sourceInfo).toBe('built package from: adduser 3.134');
    expect(packages[0].attributionTexts).toContain('PkgType: debian');
    expect(packages[1]).toMatchObject({
      name: 'debian',
      versionInfo: '12.9',
      primaryPackagePurpose: 'OPERATING-SYSTEM',
    });
  });

  test('puts the epoch and upstream back into the source info', () => {
    const { packages } = trivyProvider.fromCanonical(
      doc(debian({ name: 'login', version: '4.13+b1', architecture: 'i386', epoch: '1', upstream: { name: 'shadow' }, distro: { name: 'debian', version: '12' } }))
    );
    expect(purlOf(packages[0])).toBe('pkg:deb/debian/login@4.13%2Bb1?arch=i386&distro=debian-12&epoch=1');
    expect(packages[0].sourceInfo).toBe('built package from: shadow 1:4.13+b1');
  });

  test('does not add a second OS package when the SBOM already has one', () => {
    const alpine = docOf(
      pkgFromPurl('pkg:apk/alpine/musl@1.2.6-r3?arch=x86_64&distro=3.24.4', { versionInfo: '1.2.6-r3', sourceInfo: 'built package from: musl 1.2.6-r3' }),
      { name: 'alpine', SPDXID: 'SPDXRef-OperatingSystem', versionInfo: '3.24.4', primaryPackagePurpose: 'OPERATING-SYSTEM' } as SpdxPackage
    );
    const os = (d: SpdxDocument) => d.packages.filter(p => p.primaryPackagePurpose === 'OPERATING-SYSTEM');
    expect(os(trivyProvider.fromCanonical(trivyProvider.toCanonical(alpine)))).toHaveLength(1);
  });

  test('an Alpine package gets the bare release as its distro', () => {
    const { packages } = trivyProvider.fromCanonical(
      doc({ type: 'apk', namespace: 'alpine', name: 'musl', version: '1.2.5-r8', architecture: 'x86_64', distro: { name: 'alpine', version: '3.21.0' } })
    );
    expect(purlOf(packages[0])).toBe('pkg:apk/alpine/musl@1.2.5-r8?arch=x86_64&distro=3.21.0');
  });
});

// (not the image's own purl, never rewritten: Trivy leaves the ':' of its digest unescaped)
test('every purl Trivy wrote in the equivalence classes survives parsing and formatting', () => {
  const purls = CLASSES.flatMap(c => (c.trivy ? [c.trivy.spdx.purl, c.trivy.cdx.purl] : []));
  expect(purls.length).toBeGreaterThan(0);
  for (const purl of purls) expect(formatPackageUrl(parsePackageUrl(purl)!)).toBe(purl);
});

// Found on the Trivy, Syft and Scout SBOMs of public/sbom
describe('Trivy and the other tools: what each one writes', () => {
  const syftDoc = (purl: string, versionInfo?: string): SpdxDocument => ({
    ...docOf(pkgFromPurl(purl, { versionInfo })),
    creationInfo: { creators: ['Tool: syft-1.12.2'], created: '' },
  });
  const toTrivy = (purl: string, versionInfo?: string) =>
    trivyProvider.fromCanonical(anchoreSpdxProvider.toCanonical(syftDoc(purl, versionInfo))).packages[0];

  test.each([
    // Syft's purl and version, Trivy's
    ['pkg:golang/github.com/GehirnInc/crypt@v0.0.1', 'v0.0.1', 'pkg:golang/github.com/gehirninc/crypt@v0.0.1', 'v0.0.1'],
    ['pkg:golang/stdlib@1.26.10', 'go1.26.10', 'pkg:golang/stdlib@v1.26.10', 'v1.26.10'],
    ['pkg:golang/github.com/mongodb/mongo-tools', 'UNKNOWN', 'pkg:golang/github.com/mongodb/mongo-tools', undefined],
  ])('Syft %s -> Trivy %s', (syft, syftVersion, trivy, trivyVersion) => {
    const out = toTrivy(syft, syftVersion);
    expect(purlOf(out)).toBe(trivy);
    expect(out.versionInfo).toBe(trivyVersion);
    expect('versionInfo' in out).toBe(trivyVersion !== undefined);
  });

  test.each([
    ['pkg:golang/stdlib@v1.26.10', 'pkg:golang/stdlib@1.26.10', 'go1.26.10'],
    ['pkg:golang/github.com/mongodb/mongo-tools', 'pkg:golang/github.com/mongodb/mongo-tools', 'UNKNOWN'],
    ['pkg:deb/debian/apt@3.0.4?arch=amd64&distro=debian-13.7', 'pkg:deb/debian/apt@3.0.4?arch=amd64&distro=debian-13.7', '3.0.4'],
  ])('Trivy %s -> Syft %s', (trivy, syft, version) => {
    const out = anchoreSpdxProvider.fromCanonical(trivyProvider.toCanonical(docOf(pkgFromPurl(trivy)))).packages[0];
    expect(purlOf(out)).toBe(syft);
    expect(out.versionInfo).toBe(version);
  });

  test('Trivy -> Scout keeps Ubuntu’s whole release and finds its codename', () => {
    const out = dockerSpdxProvider.fromCanonical(trivyProvider.toCanonical(docOf(pkgFromPurl('pkg:deb/ubuntu/adduser@3.153ubuntu1?arch=all&distro=ubuntu-26.04'))));
    expect(purlOf(out.packages[0])).toBe('pkg:deb/ubuntu/adduser@3.153ubuntu1?arch=all&os_distro=resolute&os_name=ubuntu&os_version=26.04');
  });

  test('Trivy -> Trivy keeps a Go stdlib, a package without version and an image without versionInfo', () => {
    const doc = docOf(
      pkgFromPurl('pkg:golang/stdlib@v1.27.3', { versionInfo: 'v1.27.3' }),
      pkgFromPurl('pkg:golang/github.com/mongodb/mongo-tools'),
      pkgFromPurl('pkg:oci/alpine@sha256:294b?arch=amd64')
    );
    expect(trivyProvider.fromCanonical(trivyProvider.toCanonical(doc))).toEqual(doc);
  });
});

// Written as Trivy's pkg/purl does: the OS family as namespace and distro, the epoch as a qualifier, the source rpm in
// `sourceInfo`. No Trivy SBOM of an rpm image is in public/sbom: these are not checked against a real one.
describe('rpm (Oracle Linux): Trivy <-> Syft and Scout', () => {
  const TRIVY = 'pkg:rpm/oracle/findutils@4.8.0-7.el9?arch=aarch64&distro=oracle-9.8&epoch=1';
  const SYFT = 'pkg:rpm/ol/findutils@4.8.0-7.el9?arch=aarch64&distro=ol-9.8&epoch=1&upstream=findutils-4.8.0-7.el9.src.rpm';
  const trivyPkg = (purl: string, source?: string) =>
    pkgFromPurl(purl, { versionInfo: '1:4.8.0-7.el9', ...(source && { sourceInfo: `built package from: ${source}` }) });
  const syftDoc = (...packages: SpdxPackage[]): SpdxDocument => ({ ...docOf(...packages), creationInfo: { creators: ['Tool: syft-1.12.2'], created: '' } });

  test('Trivy -> canonical: the os-release id, the epoch, the source rpm as Syft names it', () => {
    expect(canonicalOf(TRIVY, { sourceInfo: 'built package from: findutils 1:4.8.0-7.el9' })).toEqual({
      type: 'rpm', namespace: 'ol', name: 'findutils', version: '4.8.0-7.el9', epoch: '1', architecture: 'aarch64',
      distro: { name: 'ol', version: '9', fullVersion: '9.8' }, upstream: { name: 'findutils-4.8.0-7.el9.src.rpm' },
    });
  });

  test('Trivy -> Syft and Scout', () => {
    const doc = docOf(trivyPkg(TRIVY, 'findutils 1:4.8.0-7.el9'));
    expect(purlOf(anchoreSpdxProvider.fromCanonical(trivyProvider.toCanonical(doc)).packages[0])).toBe(SYFT);
    expect(purlOf(dockerSpdxProvider.fromCanonical(trivyProvider.toCanonical(doc)).packages[0])).toBe(
      'pkg:rpm/oraclelinux/findutils@1%3A4.8.0-7.el9?arch=aarch64&os_name=oraclelinux&os_version=9&upstream=findutils-4.8.0-7.el9.src.rpm'
    );
  });

  test('Syft -> Trivy: purl, source and OS package', () => {
    const out = trivyProvider.fromCanonical(anchoreSpdxProvider.toCanonical(syftDoc(pkgFromPurl(SYFT, { versionInfo: '1:4.8.0-7.el9' }))));
    expect(purlOf(out.packages[0])).toBe(TRIVY);
    expect(out.packages[0].sourceInfo).toBe('built package from: findutils 1:4.8.0-7.el9');
    expect(out.packages[1]).toMatchObject({ name: 'oracle', versionInfo: '9.8', primaryPackagePurpose: 'OPERATING-SYSTEM' });
  });

  test('Syft -> Trivy -> Syft: an rpm without a source rpm does not get one', () => {
    const syft = syftDoc(pkgFromPurl('pkg:rpm/ol/gpg-pubkey@8b4efbe6-61e77439?distro=ol-9.8', { versionInfo: '8b4efbe6-61e77439' }));
    const back = anchoreSpdxProvider.fromCanonical(trivyProvider.toCanonical(trivyProvider.fromCanonical(anchoreSpdxProvider.toCanonical(syft))));
    expect(purlOf(back.packages[0])).toBe('pkg:rpm/ol/gpg-pubkey@8b4efbe6-61e77439?distro=ol-9.8');
  });

  test('Trivy -> Trivy keeps the package', () => {
    const doc = docOf(trivyPkg(TRIVY, 'findutils 1:4.8.0-7.el9'));
    // the OS package Trivy lists is added, this document having none
    expect(trivyProvider.fromCanonical(trivyProvider.toCanonical(doc)).packages[0]).toEqual(doc.packages[0]);
  });
});

// Components as Trivy wrote them in public/sbom/debiantwodots13.7/trivy.cdx.json and alpinetwodots3.24.4 (layers,
// hashes and licenses left out)
describe('Trivy CycloneDX', () => {
  const P = 'aquasecurity:trivy:';
  const props = (o: Record<string, string>) => Object.entries(o).map(([name, value]) => ({ name: P + name, value }));
  const LOGIN_DEFS = {
    'bom-ref': 'pkg:deb/debian/login.defs@4.17.4-2?arch=all&distro=debian-13.7&epoch=1',
    type: 'library', name: 'login.defs', version: '1:4.17.4-2',
    purl: 'pkg:deb/debian/login.defs@4.17.4-2?arch=all&distro=debian-13.7&epoch=1',
    properties: props({ PkgID: 'login.defs@1:4.17.4-2', PkgType: 'debian', SrcEpoch: '1', SrcName: 'shadow', SrcRelease: '2', SrcVersion: '4.17.4' }),
  };
  const MUSL_UTILS = {
    'bom-ref': 'pkg:apk/alpine/musl-utils@1.2.6-r3?arch=x86_64&distro=3.24.4',
    type: 'library', name: 'musl-utils', version: '1.2.6-r3',
    purl: 'pkg:apk/alpine/musl-utils@1.2.6-r3?arch=x86_64&distro=3.24.4',
    properties: props({ PkgID: 'musl-utils@1.2.6-r3', PkgType: 'alpine', SrcName: 'musl', SrcVersion: '1.2.6-r3' }),
  };
  const STDLIB = { 'bom-ref': 'x', type: 'library', name: 'stdlib', version: 'v1.27.3', purl: 'pkg:golang/stdlib@v1.27.3', properties: props({ PkgID: 'stdlib@v1.27.3', PkgType: 'gobinary' }) };
  const OS = { 'bom-ref': 'os', type: 'operating-system', name: 'debian', version: '13.7', properties: props({ Class: 'os-pkgs', Type: 'debian' }) };
  const bom = (...components: unknown[]) => ({ bomFormat: 'CycloneDX', specVersion: '1.6', version: 1, components }) as unknown as CycloneDxBom;
  const syftBom = (...components: unknown[]) => ({ ...bom(...components), metadata: { tools: { components: [{ name: 'syft' }] } } }) as CycloneDxBom;

  test('is listed with the CycloneDX providers', () => {
    expect(CYCLONEDX_PROVIDERS.trivy).toBe(trivyCycloneDxProvider);
  });

  test('Trivy -> Trivy is the identity', () => {
    const doc = bom(OS, LOGIN_DEFS, MUSL_UTILS, STDLIB);
    expect(trivyCycloneDxProvider.fromCanonical(trivyCycloneDxProvider.toCanonical(doc))).toEqual(doc);
  });

  test('the source comes from the Src properties', () => {
    const [deb, apk] = trivyCycloneDxProvider.toCanonical(bom(LOGIN_DEFS, MUSL_UTILS)).packages.map(p => p.canonical);
    expect(deb).toMatchObject({ name: 'login.defs', version: '4.17.4-2', epoch: '1', upstream: { name: 'shadow' } });
    expect(apk).toMatchObject({ name: 'musl-utils', upstream: { name: 'musl' } });
  });

  test('Syft -> Trivy: Trivy properties for the source (an Alpine one without release), and the OS', () => {
    const syft = syftBom(
      { 'bom-ref': 'a', type: 'library', name: 'login.defs', version: '1:4.17.4-2', purl: 'pkg:deb/debian/login.defs@1%3A4.17.4-2?arch=all&distro=debian-13.7&upstream=shadow' },
      { 'bom-ref': 'b', type: 'library', name: 'musl-utils', version: '1.2.6-r3', purl: 'pkg:apk/alpine/musl-utils@1.2.6-r3?arch=x86_64&distro=alpine-3.24.4&upstream=musl' }
    );
    const out = trivyCycloneDxProvider.fromCanonical(anchoreCycloneDxProvider.toCanonical(syft));
    const [os, deb, apk] = out.components!;
    expect(os).toMatchObject({ type: 'operating-system', name: 'debian', version: '13.7' });
    expect(deb.purl).toBe(LOGIN_DEFS.purl);
    expect(deb.properties).toEqual(LOGIN_DEFS.properties);
    expect(apk.purl).toBe(MUSL_UTILS.purl);
    expect(apk.properties).toEqual(MUSL_UTILS.properties);
  });

  test('Trivy -> Syft: the source as `upstream`', () => {
    const out = anchoreCycloneDxProvider.fromCanonical(trivyCycloneDxProvider.toCanonical(bom(LOGIN_DEFS, MUSL_UTILS)));
    // Syft's OS component (no purl) comes after them
    expect(out.components!.filter(c => c.purl).map(c => c.purl)).toEqual([
      'pkg:deb/debian/login.defs@1%3A4.17.4-2?arch=all&distro=debian-13.7&upstream=shadow',
      'pkg:apk/alpine/musl-utils@1.2.6-r3?arch=x86_64&distro=alpine-3.24.4&upstream=musl',
    ]);
  });
});
