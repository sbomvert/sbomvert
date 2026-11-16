/** @jest-environment node */
import { CycloneDxBom } from '../../cyclonedx/types';
import { SpdxDocument } from '../../spdx/types';
import { CanonicalDocument } from '../types';
import { cycloneDxToSpdx, spdxToCycloneDx } from './convert';

// What the formats share comes back after SPDX -> CycloneDX -> SPDX and CycloneDX -> SPDX -> CycloneDX: the
// document's tools and time, the image, the OS, packages (ids, names, versions, purl, a CPE, supplier, hashes,
// license), files and DEPENDS_ON. The canonical forms are carried along unchanged.

const canonical = { type: 'deb', namespace: 'debian', name: 'libc6', version: '2.41-12' };

const SPDX = {
  spdxVersion: 'SPDX-2.3',
  dataLicense: 'CC0-1.0',
  SPDXID: 'SPDXRef-DOCUMENT',
  name: 'debian:13.7',
  documentNamespace: 'urn:uuid:7d0dd4d4-4d4a-4a5e-9d2a-2f4d7f9f1c11',
  creationInfo: { created: '2026-11-10T16:38:31Z', creators: ['Tool: trivy-0.76.0'] },
  packages: [
    { name: 'debian:13.7', SPDXID: 'SPDXRef-Image', supplier: 'NOASSERTION', downloadLocation: 'NOASSERTION', filesAnalyzed: false, licenseConcluded: 'NOASSERTION', licenseDeclared: 'NOASSERTION', copyrightText: 'NOASSERTION', externalRefs: [{ referenceCategory: 'PACKAGE-MANAGER', referenceType: 'purl', referenceLocator: 'pkg:oci/debian@sha256%3Aab?arch=amd64' }], primaryPackagePurpose: 'CONTAINER' },
    {
      name: 'libc6', SPDXID: 'SPDXRef-libc6', versionInfo: '2.41-12', supplier: 'Organization: GNU Libc Maintainers', downloadLocation: 'NOASSERTION', filesAnalyzed: false,
      checksums: [{ algorithm: 'SHA256', checksumValue: '967a' }], licenseConcluded: 'NOASSERTION', licenseDeclared: 'LGPL-2.1-or-later AND MIT', copyrightText: 'NOASSERTION',
      externalRefs: [
        { referenceCategory: 'SECURITY', referenceType: 'cpe23Type', referenceLocator: 'cpe:2.3:a:libc6:libc6:2.41-12:*:*:*:*:*:*:*' },
        { referenceCategory: 'PACKAGE-MANAGER', referenceType: 'purl', referenceLocator: 'pkg:deb/debian/libc6@2.41-12?arch=amd64&distro=debian-13.7' },
      ],
    },
    { name: 'debian', SPDXID: 'SPDXRef-OS', versionInfo: '13.7', supplier: 'NOASSERTION', downloadLocation: 'NOASSERTION', filesAnalyzed: false, licenseConcluded: 'NOASSERTION', licenseDeclared: 'NOASSERTION', copyrightText: 'NOASSERTION', primaryPackagePurpose: 'OPERATING-SYSTEM' },
  ],
  files: [{ fileName: '/usr/lib/libc.so.6', SPDXID: 'SPDXRef-File-libc', checksums: [{ algorithm: 'SHA1', checksumValue: 'c6f9' }] }],
  relationships: [
    { spdxElementId: 'SPDXRef-DOCUMENT', relationshipType: 'DESCRIBES', relatedSpdxElement: 'SPDXRef-Image' },
    { spdxElementId: 'SPDXRef-Image', relationshipType: 'DEPENDS_ON', relatedSpdxElement: 'SPDXRef-libc6' },
  ],
} as unknown as SpdxDocument;

const read = (doc: SpdxDocument): CanonicalDocument<SpdxDocument, any> => ({
  doc: { ...doc, packages: [] },
  packages: doc.packages.map(pkg => ({ pkg, canonical: pkg.name === 'libc6' ? canonical : undefined })),
});
// the SPDX document a canonical form stands for
const written = ({ doc, packages }: CanonicalDocument<SpdxDocument, any>) => ({ ...doc, packages: packages.map(p => p.pkg) });

describe('SPDX -> CycloneDX -> SPDX', () => {
  const there = spdxToCycloneDx(read(SPDX));
  const back = cycloneDxToSpdx(there);

  test('CycloneDX: the image is the metadata component, the OS and the files components, DEPENDS_ON the dependencies', () => {
    expect(there.doc.metadata).toMatchObject({
      timestamp: '2026-11-10T16:38:31Z',
      tools: { components: [{ type: 'application', name: 'trivy', version: '0.76.0' }] },
      component: { 'bom-ref': 'SPDXRef-Image', type: 'container', name: 'debian:13.7' },
    });
    expect(there.packages.map(p => [p.pkg.type, p.pkg.name])).toEqual([['library', 'libc6'], ['operating-system', 'debian'], ['file', '/usr/lib/libc.so.6']]);
    expect(there.packages[0].pkg).toMatchObject({
      'bom-ref': 'SPDXRef-libc6', supplier: { name: 'GNU Libc Maintainers' }, version: '2.41-12',
      hashes: [{ alg: 'SHA-256', content: '967a' }], licenses: [{ expression: 'LGPL-2.1-or-later AND MIT' }],
      cpe: 'cpe:2.3:a:libc6:libc6:2.41-12:*:*:*:*:*:*:*', purl: 'pkg:deb/debian/libc6@2.41-12?arch=amd64&distro=debian-13.7',
    });
    expect(there.doc.dependencies).toEqual([{ ref: 'SPDXRef-Image', dependsOn: ['SPDXRef-libc6'] }]);
  });

  test('the canonical forms are carried along', () => {
    expect(there.packages[0].canonical).toBe(canonical);
    expect(back.packages.find(p => p.pkg.name === 'libc6')!.canonical).toBe(canonical);
  });

  test('back in SPDX: the same document, but the namespace (a CycloneDX serial number has none)', () => {
    const { documentNamespace: _, ...rest } = SPDX as any;
    const { documentNamespace: __, ...again } = written(back) as any;
    expect(again).toEqual(rest);
  });
});

describe('CycloneDX -> SPDX -> CycloneDX', () => {
  const BOM = {
    bomFormat: 'CycloneDX', specVersion: '1.6', serialNumber: 'urn:uuid:7d0dd4d4-4d4a-4a5e-9d2a-2f4d7f9f1c11', version: 1,
    metadata: {
      timestamp: '2026-11-10T16:38:31Z',
      tools: { components: [{ type: 'application', name: 'syft', version: '1.54.1' }] },
      component: { 'bom-ref': 'image-ref', type: 'container', name: 'debian:13.7', purl: 'pkg:oci/debian@sha256%3Aab' },
    },
    components: [
      { 'bom-ref': 'pkg:deb/debian/libc6@2.41-12?package-id=37', type: 'library', supplier: { name: 'GNU Libc Maintainers' }, name: 'libc6', version: '2.41-12', hashes: [{ alg: 'SHA-256', content: '967a' }], licenses: [{ license: { id: 'MIT' } }, { license: { name: 'public-domain' } }], cpe: 'cpe:2.3:a:libc6:libc6:2.41-12:*:*:*:*:*:*:*', purl: 'pkg:deb/debian/libc6@2.41-12?arch=arm64&distro=debian-13.7' },
      { 'bom-ref': 'os:debian@13.7', type: 'operating-system', name: 'debian', version: '13.7' },
      { 'bom-ref': 'file-1', type: 'file', name: '/usr/lib/libc.so.6', hashes: [{ alg: 'SHA-1', content: 'c6f9' }] },
    ],
    dependencies: [{ ref: 'image-ref', dependsOn: ['pkg:deb/debian/libc6@2.41-12?package-id=37'] }],
  } as unknown as CycloneDxBom;
  const readCdx = { doc: { ...BOM, components: [] }, packages: (BOM.components ?? []).map((pkg, i) => ({ pkg, canonical: i === 0 ? canonical : undefined })) } as CanonicalDocument<CycloneDxBom, any>;
  const there = cycloneDxToSpdx(readCdx);
  const back = spdxToCycloneDx(there);

  test('SPDX: ids an SPDX id cannot hold are made, the image is described, DEPENDS_ON kept, the license an expression', () => {
    const doc = written(there);
    expect(doc.packages.map(p => [p.SPDXID, p.name, p.primaryPackagePurpose])).toEqual([
      ['SPDXRef-Package-0', 'debian:13.7', 'CONTAINER'], ['SPDXRef-Package-1', 'libc6', undefined], ['SPDXRef-Package-2', 'debian', 'OPERATING-SYSTEM'],
    ]);
    expect(doc.packages[1]).toMatchObject({ supplier: 'Organization: GNU Libc Maintainers', checksums: [{ algorithm: 'SHA256', checksumValue: '967a' }], licenseDeclared: 'MIT AND LicenseRef-public-domain' });
    expect(doc.files).toEqual([{ fileName: '/usr/lib/libc.so.6', SPDXID: 'SPDXRef-File-3', checksums: [{ algorithm: 'SHA1', checksumValue: 'c6f9' }] }]);
    expect(doc.relationships).toEqual([
      { spdxElementId: 'SPDXRef-DOCUMENT', relationshipType: 'DESCRIBES', relatedSpdxElement: 'SPDXRef-Package-0' },
      { spdxElementId: 'SPDXRef-Package-0', relationshipType: 'DEPENDS_ON', relatedSpdxElement: 'SPDXRef-Package-1' },
    ]);
    expect(doc.creationInfo).toEqual({ created: '2026-11-10T16:38:31Z', creators: ['Tool: syft-1.54.1'] });
    expect(doc.documentNamespace).toBe('urn:uuid:7d0dd4d4-4d4a-4a5e-9d2a-2f4d7f9f1c11');
  });

  test('back in CycloneDX: the same components and dependencies, with SPDX ids as bom-refs; the licenses one expression', () => {
    const ref = (i: number) => `SPDXRef-Package-${i}`;
    expect(back.doc.metadata!.component).toMatchObject({ 'bom-ref': ref(0), type: 'container', name: 'debian:13.7', purl: 'pkg:oci/debian@sha256%3Aab' });
    expect(back.packages.map(p => p.pkg)).toEqual([
      { ...BOM.components![0], 'bom-ref': ref(1), licenses: [{ expression: 'MIT AND LicenseRef-public-domain' }] },
      { ...BOM.components![1], 'bom-ref': ref(2) },
      { ...BOM.components![2], 'bom-ref': 'SPDXRef-File-3' },
    ]);
    expect(back.doc.dependencies).toEqual([{ ref: ref(0), dependsOn: [ref(1)] }]);
    expect(back.packages[0].canonical).toBe(canonical);
  });
});
