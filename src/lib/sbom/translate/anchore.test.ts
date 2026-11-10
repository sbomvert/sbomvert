/** @jest-environment node */
import { CycloneDxBom } from '../cyclonedx/types';
import { SpdxDocument, SpdxPackage } from '../spdx/types';
import { anchoreCycloneDxProvider, anchoreSpdxProvider } from './anchore';
import { Provider } from './types';

// Anchore (Syft) -> canonical -> Anchore must give back the same SBOM, in SPDX and in CycloneDX.
// Checked on every Syft SBOM of the dataset (SPDX: 1,509 packages in 12 SBOMs; CycloneDX: 1,344
// components with a purl in 11 SBOMs; all identical). What is kept here is one small package of each
// class those fall into, written as Syft writes them (CPEs apart from the purl, the epoch inside the
// version, `+`, `@` and `:` escaped in the purl).

type Spec = { label: string; name: string; version: string; purl?: string; cpes?: string[]; spdxOnly?: boolean };

const CLASSES: Spec[] = [
  // OS packages (deb, apk): rewritten from the canonical form
  { label: 'deb: arch and distro only', name: 'apt', version: '3.0.4', purl: 'pkg:deb/debian/apt@3.0.4?arch=arm64&distro=debian-13.7', cpes: ['cpe:2.3:a:apt:apt:3.0.4:*:*:*:*:*:*:*'] },
  { label: 'deb: upstream, name only', name: 'gcc-14-base', version: '14.2.0-19', purl: 'pkg:deb/debian/gcc-14-base@14.2.0-19?arch=arm64&distro=debian-13.7&upstream=gcc-14' },
  { label: 'deb: escaped + in the version, upstream with a version (@)', name: 'bash', version: '5.2.37-2+b10', purl: 'pkg:deb/debian/bash@5.2.37-2%2Bb10?arch=arm64&distro=debian-13.7&upstream=bash%405.2.37-2', cpes: ['cpe:2.3:a:bash:bash:5.2.37-2\\+b10:*:*:*:*:*:*:*'] },
  { label: 'deb: epoch in the version (:), upstream with a version', name: 'bsdutils', version: '1:2.41.5-0+deb13u1', purl: 'pkg:deb/debian/bsdutils@1%3A2.41.5-0%2Bdeb13u1?arch=arm64&distro=debian-13.7&upstream=util-linux%402.41.5-0%2Bdeb13u1' },
  { label: 'deb: epoch, no upstream', name: 'diffutils', version: '1:3.10-4', purl: 'pkg:deb/debian/diffutils@1%3A3.10-4?arch=arm64&distro=debian-13.7' },
  { label: 'apk: arch and distro only', name: 'alpine-baselayout', version: '3.7.2-r1', purl: 'pkg:apk/alpine/alpine-baselayout@3.7.2-r1?arch=x86_64&distro=alpine-3.24.2' },
  { label: 'apk: upstream', name: 'alpine-baselayout-data', version: '3.7.2-r1', purl: 'pkg:apk/alpine/alpine-baselayout-data@3.7.2-r1?arch=x86_64&distro=alpine-3.24.2&upstream=alpine-baselayout' },

  // everything else: the purl is kept as it is
  { label: 'npm', name: 'heatwave-chat', version: '1.0.1', purl: 'pkg:npm/heatwave-chat@1.0.1' },
  { label: 'npm: scoped (%40)', name: '@gar/promise-retry', version: '1.0.3', purl: 'pkg:npm/%40gar/promise-retry@1.0.3', cpes: ['cpe:2.3:a:\\@gar\\/promise-retry:\\@gar\\/promise-retry:1.0.3:*:*:*:*:*:*:*'] },
  { label: 'pypi', name: 'antlr4-python3-runtime', version: '4.13.2', purl: 'pkg:pypi/antlr4-python3-runtime@4.13.2' },
  { label: 'maven: namespace', name: 'libintl', version: '0.23.1', purl: 'pkg:maven/libintl/libintl@0.23.1' },
  { label: 'generic', name: 'busybox', version: '1.38.0', purl: 'pkg:generic/busybox@1.38.0' },
  { label: 'golang: module path, v-prefixed version', name: 'github.com/moby/sys/user', version: 'v0.1.0', purl: 'pkg:golang/github.com/moby/sys/user@v0.1.0' },
  { label: 'golang: upper case in the module path', name: 'github.com/GehirnInc/crypt', version: 'v0.0.0-20230320061759-8cc1b52080c5', purl: 'pkg:golang/github.com/GehirnInc/crypt@v0.0.0-20230320061759-8cc1b52080c5' },
  { label: "golang: stdlib, version differs from the purl's", name: 'stdlib', version: 'go1.24.6', purl: 'pkg:golang/stdlib@1.24.6', cpes: ['cpe:2.3:a:golang:go:1.24.6:-:*:*:*:*:*:*'] },
  { label: 'rpm: epoch as a qualifier, source rpm upstream', name: 'findutils', version: '1:4.8.0-7.el9', purl: 'pkg:rpm/ol/findutils@4.8.0-7.el9?arch=aarch64&distro=ol-9.8&epoch=1&upstream=findutils-4.8.0-7.el9.src.rpm' },
  { label: 'rpm: escaped ++ in the name', name: 'libstdc++', version: '11.5.0-14.0.1.el9', purl: 'pkg:rpm/ol/libstdc%2B%2B@11.5.0-14.0.1.el9?arch=aarch64&distro=ol-9.8&upstream=gcc-11.5.0-14.0.1.el9.src.rpm' },
  { label: 'rpm: distro only (no arch, no upstream)', name: 'gpg-pubkey', version: '8b4efbe6-61e77439', purl: 'pkg:rpm/ol/gpg-pubkey@8b4efbe6-61e77439?distro=ol-9.8' },
  // the container: a package of SPDX, the `metadata.component` of CycloneDX
  { label: 'oci: digest (:) with arch and tag, no CPE', name: 'alpine', version: '3.24.4', purl: 'pkg:oci/alpine@sha256%3A1829893486be257df5049ab3b7fc95afbd0fc09d89803cbc580bda1ba5386b29?arch=arm64&tag=3.24.4', spdxOnly: true },

  // without a purl
  { label: 'no purl: CPE only', name: 'odd', version: '1.0', cpes: ['cpe:2.3:a:odd:odd:1.0:*:*:*:*:*:*:*'] },
  { label: 'no purl: no references at all', name: 'bare', version: '1.0' },
];

// One format: how Syft writes a package in it, and the SBOM around the packages.
type Format<Doc = any, Pkg = any> = {
  name: string;
  provider: Provider<Doc, Pkg>;
  pkg: (s: Spec) => Pkg;
  doc: (...pkgs: Pkg[]) => Doc;
  purlOf: (pkg: Pkg) => string | undefined;
  packagesOf: (doc: Doc) => Pkg[];
  untouchedByPurl: (pkg: Pkg) => boolean; // a package the translation has nothing to do with
};

const spdxRef = (type: string, category: string, locator: string) => ({ referenceCategory: category, referenceType: type, referenceLocator: locator });

const SPDX: Format<SpdxDocument, SpdxPackage> = {
  name: 'SPDX',
  provider: anchoreSpdxProvider,
  pkg: ({ name, version, purl, cpes = [] }) => ({
    name,
    SPDXID: `SPDXRef-Package-${name.replace(/\W/g, '-')}-0123456789abcdef`,
    versionInfo: version,
    downloadLocation: 'NOASSERTION',
    filesAnalyzed: false,
    licenseConcluded: 'NOASSERTION',
    externalRefs: [
      ...cpes.map(c => spdxRef('cpe23Type', 'SECURITY', c)),
      ...(purl ? [spdxRef('purl', 'PACKAGE-MANAGER', purl)] : []),
    ],
  }),
  doc: (...packages) =>
    ({
      spdxVersion: 'SPDX-2.3',
      name: 'alpine',
      creationInfo: { creators: ['Organization: Anchore, Inc', 'Tool: syft-1.12.2'], created: '2026-11-10T10:00:00Z' },
      relationships: [{ spdxElementId: 'SPDXRef-DOCUMENT', relatedSpdxElement: 'SPDXRef-Package-x', relationshipType: 'DESCRIBES' }],
      packages,
    }) as unknown as SpdxDocument,
  purlOf: p => p.externalRefs?.find(r => r.referenceType === 'purl')?.referenceLocator,
  packagesOf: d => d.packages,
  untouchedByPurl: p => !p.externalRefs?.some(r => r.referenceType === 'purl'),
};

const CYCLONEDX: Format<CycloneDxBom, any> = {
  name: 'CycloneDX',
  provider: anchoreCycloneDxProvider,
  // a component with no purl is a file, as in Syft's SBOMs
  pkg: ({ name, version, purl, cpes = [] }) =>
    purl
      ? {
          'bom-ref': `${purl}&package-id=0123456789abcdef`,
          type: 'library',
          name,
          version,
          ...(cpes[0] ? { cpe: cpes[0] } : {}),
          purl,
          properties: [
            { name: 'syft:package:foundBy', value: 'cataloger' },
            ...cpes.slice(1).map(c => ({ name: 'syft:cpe23', value: c })),
          ],
        }
      : { 'bom-ref': `File-${name}`, type: 'file', name, version },
  doc: (...components) =>
    ({
      bomFormat: 'CycloneDX',
      specVersion: '1.7',
      serialNumber: 'urn:uuid:7d0dd4d4-4d4a-4a5e-9d2a-2f4d7f9f1c11',
      version: 1,
      metadata: {
        tools: { components: [{ type: 'application', author: 'anchore', name: 'syft', version: '1.12.2' }] },
        component: { 'bom-ref': 'image', type: 'container', name: 'alpine', purl: 'pkg:oci/alpine@sha256%3A1829893486be257df5049ab3b7fc95afbd0fc09d89803cbc580bda1ba5386b29?arch=arm64&tag=3.24.4' },
      },
      components,
      dependencies: [{ ref: 'image', dependsOn: components.map((c: any) => c['bom-ref']) }],
    }) as unknown as CycloneDxBom,
  purlOf: c => c.purl,
  packagesOf: d => d.components ?? [],
  untouchedByPurl: c => !c.purl,
};

const FORMATS: Format[] = [SPDX, CYCLONEDX];

describe.each(FORMATS)('Anchore $name round trip', format => {
  const specs = CLASSES.filter(s => !(s.spdxOnly && format !== SPDX));
  const roundTrip = (doc: any) => format.provider.fromCanonical(format.provider.toCanonical(doc));

  test.each(specs.map(s => [s.label, s] as const))('%s comes back unchanged', (_, spec) => {
    const doc = format.doc(format.pkg(spec));
    expect(roundTrip(doc)).toEqual(doc);
  });

  test('a document with a package of every class comes back unchanged, in the same order', () => {
    const doc = format.doc(...specs.map(s => format.pkg(s)));
    expect(roundTrip(doc)).toEqual(doc);
  });

  test('the input is not modified', () => {
    const doc = format.doc(...specs.map(s => format.pkg(s)));
    const untouched = structuredClone(doc);
    roundTrip(doc);
    expect(doc).toEqual(untouched);
  });

  test('every package keeps its purl through the round trip', () => {
    for (const spec of specs) {
      const pkg = format.pkg(spec);
      expect(format.purlOf(format.packagesOf(roundTrip(format.doc(pkg)))[0])).toBe(format.purlOf(pkg));
    }
  });

  // a round trip changes nothing, so this is what shows the canonical form is what gets written
  test('a changed canonical form is written to the purl and the version', () => {
    const provider = format.provider;
    const canonical = provider.toCanonical(format.doc(format.pkg(CLASSES.find(s => s.label.startsWith('deb: epoch in the version'))!)));
    const c = canonical.packages[0].canonical!;
    c.epoch = '2';
    c.version = '2.42-1';
    c.distro = { name: 'debian', version: '12' };
    c.upstream = undefined;
    const [written] = format.packagesOf(provider.fromCanonical(canonical));
    expect(format.purlOf(written)).toBe('pkg:deb/debian/bsdutils@2%3A2.42-1?arch=arm64&distro=debian-12');
    expect(written.version ?? written.versionInfo).toBe('2:2.42-1');
    expect(written.name).toBe('bsdutils'); // what the canonical form does not cover is kept
  });

  test('a package without a purl has no canonical form', () => {
    const [entry] = format.provider.toCanonical(format.doc(format.pkg(CLASSES.find(s => s.label === 'no purl: CPE only')!))).packages;
    expect(entry.canonical).toBeUndefined();
    expect(format.untouchedByPurl(entry.pkg)).toBe(true);
  });
});

describe('Anchore canonical form', () => {
  const canonicalOf = (format: Format, label: string) =>
    format.provider.toCanonical(format.doc(format.pkg(CLASSES.find(s => s.label.startsWith(label))!))).packages[0].canonical;

  // the same package gives the same canonical form, whichever format Syft wrote it in
  test.each(CLASSES.filter(s => s.purl && !s.spdxOnly).map(s => [s.label, s] as const))(
    '%s: SPDX and CycloneDX agree',
    (_, spec) => {
      expect(canonicalOf(CYCLONEDX, spec.label)).toEqual(canonicalOf(SPDX, spec.label));
      expect(canonicalOf(SPDX, spec.label)).toBeDefined();
    }
  );

  describe.each(FORMATS)('$name', format => {
    test('a deb: the epoch leaves the version, the upstream is split into name and version', () => {
      expect(canonicalOf(format, 'deb: epoch in the version')).toMatchObject({
        type: 'deb',
        namespace: 'debian',
        name: 'bsdutils',
        version: '2.41.5-0+deb13u1',
        epoch: '1',
        architecture: 'arm64',
        distro: { name: 'debian', version: '13.7' },
        upstream: { name: 'util-linux', version: '2.41.5-0+deb13u1' },
      });
    });

    test('a deb upstream without a version has only a name', () => {
      expect(canonicalOf(format, 'deb: upstream, name only')!.upstream).toEqual({ name: 'gcc-14', version: undefined });
    });

    test('an apk', () => {
      const c = canonicalOf(format, 'apk: upstream');
      expect(c).toMatchObject({ type: 'apk', namespace: 'alpine', version: '3.7.2-r1', distro: { name: 'alpine', version: '3.24.2' } });
      expect(c!.upstream).toEqual({ name: 'alpine-baselayout', version: undefined });
    });

    test('a package that is not from the OS keeps its purl (case, namespace) as its canonical form', () => {
      expect(canonicalOf(format, 'golang: upper')).toMatchObject({
        type: 'golang',
        namespace: 'github.com/GehirnInc',
        name: 'crypt',
        version: 'v0.0.0-20230320061759-8cc1b52080c5',
      });
    });
  });

  test('the qualifiers of a package that is not from the OS are kept (SPDX: the container)', () => {
    const oci = canonicalOf(SPDX, 'oci');
    expect(oci!.qualifiers).toEqual({ arch: 'arm64', tag: '3.24.4' });
    expect(oci!.distro).toBeUndefined();
  });
});

describe('Anchore CycloneDX', () => {
  const doc = CYCLONEDX.doc(CYCLONEDX.pkg(CLASSES[3]), CYCLONEDX.pkg(CLASSES.find(s => s.label === 'no purl: no references at all')!));

  test('the container of the metadata, the dependency graph and the bom-refs are left as they are', () => {
    const back = roundTrip(doc);
    expect(back.metadata).toEqual(doc.metadata);
    expect(back.dependencies).toEqual(doc.dependencies);
    expect(back.components!.map(c => c['bom-ref'])).toEqual(doc.components!.map(c => c['bom-ref']));
  });

  test('the properties and the CPE of a component are kept', () => {
    const [c] = roundTrip(CYCLONEDX.doc(CYCLONEDX.pkg(CLASSES[0]))).components!;
    expect(c.cpe).toBe('cpe:2.3:a:apt:apt:3.0.4:*:*:*:*:*:*:*');
    expect(c.properties).toEqual([{ name: 'syft:package:foundBy', value: 'cataloger' }]);
  });

  test('an SBOM without components stays without them', () => {
    const bom = { bomFormat: 'CycloneDX', specVersion: '1.7', version: 1 } as unknown as CycloneDxBom;
    expect(anchoreCycloneDxProvider.fromCanonical(anchoreCycloneDxProvider.toCanonical(bom))).toEqual(bom);
  });

  function roundTrip(d: CycloneDxBom) {
    return anchoreCycloneDxProvider.fromCanonical(anchoreCycloneDxProvider.toCanonical(d));
  }
});

describe('Anchore SPDX', () => {
  test('CPEs and the other references around the purl are kept, in order', () => {
    const p = SPDX.pkg({ label: '', name: 'bash', version: '5.2.37-2+b10', purl: 'pkg:deb/debian/bash@5.2.37-2%2Bb10?arch=arm64&distro=debian-13.7', cpes: ['cpe:a', 'cpe:b'] });
    const back = anchoreSpdxProvider.fromCanonical(anchoreSpdxProvider.toCanonical(SPDX.doc(p)));
    expect(back.packages[0].externalRefs!.map(r => r.referenceLocator)).toEqual(['cpe:a', 'cpe:b', p.externalRefs![2].referenceLocator]);
  });
});
