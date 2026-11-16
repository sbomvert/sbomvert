/** @jest-environment node */
import { CycloneDxBom } from '../cyclonedx/types';
import { SpdxDocument } from '../spdx/types';
import { anchoreCycloneDxProvider, anchoreSpdxProvider } from './anchore';
import { dockerCycloneDxProvider, dockerSpdxProvider } from './docker';

const SCOUT_DEB = 'pkg:deb/debian/login.defs@1%3A4.17.4-2?os_distro=trixie&os_name=debian&os_version=13';
// the same, as Scout writes it when it keeps the architecture and the source of a Syft package
const SCOUT_KEPT = `${SCOUT_DEB}`.replace('?', '?arch=amd64&').replace('&os_version=13', '&os_version=13&upstream=shadow%401%3A4.17.4-2');
const SYFT_DEB = 'pkg:deb/debian/shadow@1:4.17.4-2?arch=amd64&distro=debian-13&upstream=shadow';
const SYFT_SRC = 'pkg:deb/debian/login.defs@1:4.17.4-2?arch=amd64&distro=debian-13&upstream=shadow%401:4.17.4-2';

const spdx = (...purls: string[]): SpdxDocument =>
  ({
    spdxVersion: 'SPDX-2.3',
    name: 'x',
    creationInfo: { creators: [], created: '' },
    packages: purls.map((purl, i) => ({
      name: `p${i}`,
      SPDXID: `SPDXRef-${i}`,
      versionInfo: 'old',
      externalRefs: [
        { referenceCategory: 'SECURITY', referenceType: 'cpe23Type', referenceLocator: 'cpe:2.3:a:x' },
        { referenceCategory: 'PACKAGE-MANAGER', referenceType: 'purl', referenceLocator: purl },
      ],
    })),
  }) as unknown as SpdxDocument;

const cdx = (...purls: string[]): CycloneDxBom =>
  ({
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    version: 1,
    components: purls.map((purl, i) => ({
      type: 'application',
      name: `p${i}`,
      version: 'old',
      'bom-ref': `ref${i}`,
      cpe: 'cpe:2.3:a:x',
      purl,
      components: [{ type: 'file', name: '/f', 'bom-ref': `f${i}` }],
    })),
  }) as unknown as CycloneDxBom;

const purls = {
  spdx: (d: SpdxDocument) => d.packages.map(p => p.externalRefs?.find(r => r.referenceType === 'purl')?.referenceLocator),
  // not the OS component Syft lists
  cdx: (b: CycloneDxBom) => (b.components ?? []).filter(c => c.purl).map(c => c.purl),
};

describe('Docker Scout from Syft: a deb with a source package of another name', () => {
  const one = 'pkg:deb/debian/login.defs@1:4.17.4-2?arch=amd64&distro=debian-13&upstream=shadow%401:4.17.4-2';

  test('SPDX: epoch in version and purl, source listed as a package of its own', () => {
    const out = dockerSpdxProvider.fromCanonical(anchoreSpdxProvider.toCanonical(spdx(one)));
    expect(purls.spdx(out)).toEqual([SCOUT_KEPT, SCOUT_DEB.replace('login.defs', 'shadow')]);
    expect(out.packages.map(p => p.versionInfo)).toEqual(['1:4.17.4-2', '1:4.17.4-2']);
    expect(new Set(out.packages.map(p => p.SPDXID)).size).toBe(2);
    expect(out.packages[1].externalRefs).toHaveLength(1); // not the CPE of the binary package
  });

  test('CycloneDX: same, without nested files or CPE on the source, with its own bom-ref', () => {
    const out = dockerCycloneDxProvider.fromCanonical(anchoreCycloneDxProvider.toCanonical(cdx(one)));
    expect(purls.cdx(out)).toEqual([SCOUT_KEPT, SCOUT_DEB.replace('login.defs', 'shadow')]);
    expect(out.components?.map(c => c.version)).toEqual(['1:4.17.4-2', '1:4.17.4-2']);
    const [main, source] = out.components!;
    expect(main.components).toHaveLength(1);
    expect(source.components).toBeUndefined();
    expect(source.cpe).toBeUndefined();
    expect(new Set(out.components?.map(c => c['bom-ref'])).size).toBe(2);
  });

  test('no source package when it has the package name', () => {
    const same = SYFT_DEB;
    expect(dockerSpdxProvider.fromCanonical(anchoreSpdxProvider.toCanonical(spdx(same))).packages).toHaveLength(1);
    expect(dockerCycloneDxProvider.fromCanonical(anchoreCycloneDxProvider.toCanonical(cdx(same))).components).toHaveLength(1);
  });
});

describe('Docker Scout classes, in both formats', () => {
  const cases: [string, string, string][] = [
    ['deb, epoch', SCOUT_DEB, SCOUT_DEB],
    ['apk, no os_distro', 'pkg:apk/alpine/musl@1.2.5-r1?os_name=alpine&os_version=3.24', 'pkg:apk/alpine/musl@1.2.5-r1?os_name=alpine&os_version=3.24'],
    ['npm', 'pkg:npm/%40scope/pkg@1.0.0', 'pkg:npm/%40scope/pkg@1.0.0'],
    ['deb, build stage', `${SCOUT_DEB}&stage=build-base`, `${SCOUT_DEB}&stage=build-base`],
    ['maven, no version', 'pkg:maven/a/b@UNKNOWN', 'pkg:maven/a/b@UNKNOWN'],
  ];

  test.each(cases)('%s: Scout -> Scout is the identity', (_n, purl, expected) => {
    expect(purls.spdx(dockerSpdxProvider.fromCanonical(dockerSpdxProvider.toCanonical(spdx(purl))))).toEqual([expected]);
    expect(purls.cdx(dockerCycloneDxProvider.fromCanonical(dockerCycloneDxProvider.toCanonical(cdx(purl))))).toEqual([expected]);
  });

  test.each(cases)('%s: same canonical form in both formats', (_n, purl) => {
    const a = dockerSpdxProvider.toCanonical(spdx(purl)).packages[0].canonical;
    const b = dockerCycloneDxProvider.toCanonical(cdx(purl)).packages[0].canonical;
    expect(a).toEqual(b);
  });

  test('Syft -> Scout -> Syft keeps the architecture and the source (deb with source)', () => {
    const syft = SYFT_SRC;
    const scout = dockerCycloneDxProvider.fromCanonical(anchoreCycloneDxProvider.toCanonical(cdx(syft)));
    const back = anchoreCycloneDxProvider.fromCanonical(dockerCycloneDxProvider.toCanonical(scout));
    expect(purls.cdx(back)[0]).toBe('pkg:deb/debian/login.defs@1%3A4.17.4-2?arch=amd64&distro=debian-13&upstream=shadow%401%3A4.17.4-2');
  });

  test('components without a purl are left alone', () => {
    const bom = cdx(SCOUT_DEB);
    bom.components!.push({ type: 'file', name: '/etc/x' } as never);
    const out = dockerCycloneDxProvider.fromCanonical(dockerCycloneDxProvider.toCanonical(bom));
    expect(out.components?.at(-1)).toEqual({ type: 'file', name: '/etc/x' });
  });

  test('input is not mutated', () => {
    const bom = cdx(SYFT_SRC);
    const before = JSON.stringify(bom);
    dockerCycloneDxProvider.fromCanonical(anchoreCycloneDxProvider.toCanonical(bom));
    expect(JSON.stringify(bom)).toBe(before);
  });
});

describe('Docker Scout from Syft: os_version and os_distro as Scout writes them', () => {
  const scoutOf = (purl: string) => purls.cdx(dockerCycloneDxProvider.fromCanonical(anchoreCycloneDxProvider.toCanonical(cdx(purl))))[0];

  test.each([
    ['pkg:deb/debian/a@1?arch=amd64&distro=debian-13.7', 'pkg:deb/debian/a@1?arch=amd64&os_distro=trixie&os_name=debian&os_version=13'],
    ['pkg:deb/ubuntu/a@1?arch=amd64&distro=ubuntu-26.04', 'pkg:deb/ubuntu/a@1?arch=amd64&os_distro=resolute&os_name=ubuntu&os_version=26.04'],
    ['pkg:apk/alpine/a@1?arch=x86_64&distro=alpine-3.24.4', 'pkg:apk/alpine/a@1?arch=x86_64&os_name=alpine&os_version=3.24'],
  ])('%s', (syft, scout) => expect(scoutOf(syft)).toBe(scout));

  test('the source package has the upstream version, without a binNMU suffix', () => {
    const out = dockerCycloneDxProvider.fromCanonical(
      anchoreCycloneDxProvider.toCanonical(cdx('pkg:deb/debian/acl@2.3.2-2+b1?arch=arm64&distro=debian-13.7&upstream=acl-src%402.3.2-2'))
    );
    expect(out.components?.map(c => c.version)).toEqual(['2.3.2-2+b1', '2.3.2-2']);
  });
});

describe('Docker Scout: packages not from the OS, as Scout writes them', () => {
  const spdxOf = (purl: string) => dockerSpdxProvider.fromCanonical(anchoreSpdxProvider.toCanonical(spdx(purl))).packages[0];
  const cdxOf = (purl: string) => dockerCycloneDxProvider.fromCanonical(anchoreCycloneDxProvider.toCanonical(cdx(purl))).components![0];

  test.each([
    // Syft, Scout's SPDX purl, Scout's CycloneDX purl, Scout's version
    ['pkg:golang/github.com/DefangLabs/secret-detector@v0.0.1', 'pkg:golang/github.com/defanglabs/secret-detector@v0.0.1', 'pkg:golang/github.com/defanglabs/secret-detector@0.0.1', '0.0.1'],
    ['pkg:golang/stdlib@1.26.10', 'pkg:golang/stdlib@v1.26.10', 'pkg:golang/stdlib@1.26.10', '1.26.10'],
    ['pkg:golang/cmd/asm', 'pkg:golang/cmd/asm@vUNKNOWN', 'pkg:golang/cmd/asm@UNKNOWN', 'UNKNOWN'],
    ['pkg:composer/amphp/amp@v2.6.5', 'pkg:composer/amphp/amp@2.6.5', 'pkg:composer/amphp/amp@2.6.5', '2.6.5'],
    ['pkg:maven/a/b', 'pkg:maven/a/b@UNKNOWN', 'pkg:maven/a/b@UNKNOWN', 'UNKNOWN'],
  ])('%s', (syft, scoutSpdx, scoutCdx, version) => {
    expect(purls.spdx({ packages: [spdxOf(syft)] } as SpdxDocument)).toEqual([scoutSpdx]);
    expect(spdxOf(syft).versionInfo).toBe(version);
    expect(cdxOf(syft).purl).toBe(scoutCdx);
    expect(cdxOf(syft).version).toBe(version);
  });

  test.each([
    ['pkg:golang/stdlib@v1.26.10', 'pkg:golang/stdlib@1.26.10', 'go1.26.10'],
    ['pkg:golang/golang.org/x/term@v0.1.0', 'pkg:golang/golang.org/x/term@v0.1.0', 'v0.1.0'],
    ['pkg:golang/cmd/asm@vUNKNOWN', 'pkg:golang/cmd/asm', 'UNKNOWN'],
  ])('Scout SPDX %s to Syft %s', (scout, syft, version) => {
    const out = anchoreSpdxProvider.fromCanonical(dockerSpdxProvider.toCanonical(spdx(scout)));
    expect(purls.spdx(out)).toEqual([syft]);
    expect(out.packages[0].versionInfo).toBe(version);
  });

  test('a Go module: Scout -> Scout is the identity, with and without its `v`', () => {
    expect(purls.spdx(dockerSpdxProvider.fromCanonical(dockerSpdxProvider.toCanonical(spdx('pkg:golang/golang.org/x/term@v0.1.0'))))).toEqual(['pkg:golang/golang.org/x/term@v0.1.0']);
    expect(purls.cdx(dockerCycloneDxProvider.fromCanonical(dockerCycloneDxProvider.toCanonical(cdx('pkg:golang/golang.org/x/term@0.1.0'))))).toEqual(['pkg:golang/golang.org/x/term@0.1.0']);
  });
});

describe('rpm (Oracle Linux): Syft <-> Scout', () => {
  const SYFT = 'pkg:rpm/ol/findutils@4.8.0-7.el9?arch=aarch64&distro=ol-9.8&epoch=1&upstream=findutils-4.8.0-7.el9.src.rpm';
  const SCOUT = 'pkg:rpm/oraclelinux/findutils@1%3A4.8.0-7.el9?arch=aarch64&os_name=oraclelinux&os_version=9&upstream=findutils-4.8.0-7.el9.src.rpm';

  test('Syft to Scout: oraclelinux, the major version, the epoch in the version, arch and source kept', () => {
    const out = dockerCycloneDxProvider.fromCanonical(anchoreCycloneDxProvider.toCanonical(cdx(SYFT)));
    expect(purls.cdx(out)).toEqual([SCOUT]);
    expect(out.components).toHaveLength(1); // no source package entry for an rpm
    expect(out.components?.[0].version).toBe('1:4.8.0-7.el9');
  });

  test('Scout to Syft: `ol`, the epoch as a qualifier, not in the purl version, but in the version', () => {
    const out = anchoreCycloneDxProvider.fromCanonical(dockerCycloneDxProvider.toCanonical(cdx(SCOUT)));
    expect(purls.cdx(out)).toEqual(['pkg:rpm/ol/findutils@4.8.0-7.el9?arch=aarch64&distro=ol-9&epoch=1&upstream=findutils-4.8.0-7.el9.src.rpm']);
    expect(out.components?.[0].version).toBe('1:4.8.0-7.el9');
  });

  test('Syft to Syft is the identity, in both formats', () => {
    expect(purls.cdx(anchoreCycloneDxProvider.fromCanonical(anchoreCycloneDxProvider.toCanonical(cdx(SYFT))))).toEqual([SYFT]);
    const s = anchoreSpdxProvider.fromCanonical(anchoreSpdxProvider.toCanonical(spdx(SYFT)));
    expect(purls.spdx(s)).toEqual([SYFT]);
    expect(s.packages[0].versionInfo).toBe('1:4.8.0-7.el9');
  });

  test('an rpm without epoch: no qualifier, no prefix', () => {
    const syft = 'pkg:rpm/ol/glibc@2.34-275.0.1.el9_8?arch=aarch64&distro=ol-9.8';
    const out = anchoreCycloneDxProvider.fromCanonical(anchoreCycloneDxProvider.toCanonical(cdx(syft)));
    expect(purls.cdx(out)).toEqual([syft]);
    expect(out.components?.[0].version).toBe('2.34-275.0.1.el9_8');
  });
});

describe('Docker Scout: a source package is listed once', () => {
  const bin = (name: string) => `pkg:deb/debian/${name}@1.0-1?arch=amd64&distro=debian-13&upstream=src`;
  const SRC = 'pkg:deb/debian/src@1.0-1?os_distro=trixie&os_name=debian&os_version=13';

  test('two binaries of one source', () => {
    const out = dockerCycloneDxProvider.fromCanonical(anchoreCycloneDxProvider.toCanonical(cdx(bin('a'), bin('b'))));
    expect(purls.cdx(out).filter(p => p === SRC)).toHaveLength(1);
    expect(out.components).toHaveLength(3);
  });

  test('a source the SBOM already lists, whatever the qualifiers and the encoding', () => {
    const listed = 'pkg:deb/debian/src@1.0-1?arch=amd64&os_distro=trixie&os_name=debian&os_version=13';
    const out = dockerCycloneDxProvider.fromCanonical(dockerCycloneDxProvider.toCanonical(cdx(listed, bin('a').replace('arch=amd64&distro=debian-13', 'os_distro=trixie&os_name=debian&os_version=13'))));
    expect(out.components).toHaveLength(2);
  });

  test('SPDX too', () => {
    const out = dockerSpdxProvider.fromCanonical(anchoreSpdxProvider.toCanonical(spdx(bin('a'), bin('b'))));
    expect(out.packages).toHaveLength(3);
  });
});
