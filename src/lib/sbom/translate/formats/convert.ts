import { CycloneDxBom, CycloneDxComponent } from '../../cyclonedx/types';
import { SpdxChecksum, SpdxDocument, SpdxExternalRef, SpdxFile, SpdxPackage, SpdxRelationship } from '../../spdx/types';
import { isPurlRef } from '../common';
import { CanonicalDocument, CanonicalEntry } from '../types';

// An SBOM read in one format (its canonical form) made into the other, for a tool to write it. 

const OS = 'OPERATING-SYSTEM';
const CONTAINER = 'CONTAINER';
const NOASSERTION = 'NOASSERTION';

// SPDX's SHA256 is CycloneDX's SHA-256; MD5, SHA3-256, BLAKE2b-256, ... are written the same
const cdxAlg = (a: string) => a.replace(/^SHA(1|224|256|384|512)$/, 'SHA-$1');
const spdxAlg = (a: string) => a.replace(/^SHA-(1|224|256|384|512)$/, 'SHA$1');

// "Tool: syft-1.54.1" <-> { name: "syft", version: "1.54.1" }
const toolOf = (creator: string) => {
  const [, name, version] = creator.replace(/^Tool:\s*/, '').match(/^(.*?)(?:-(\d[^-]*))?$/)!;
  return { type: 'application', name, ...(version && { version }) };
};

// "Organization: Debian" or "Person: A (a@b)" <-> { name: ... }
const supplierName = (supplier?: string) =>
  supplier && supplier !== NOASSERTION ? supplier.replace(/^(Organization|Person):\s*/, '') : undefined;

const declared = (p: SpdxPackage) => [p.licenseDeclared, p.licenseConcluded].find(l => l && l !== NOASSERTION && l !== 'NONE');

// a CycloneDX license list as an SPDX expression: one expression, or the ids (a name as a LicenseRef) joined by AND
const expressionOf = (licenses: any[] = []): string | undefined => {
  const expression = licenses.find(l => l.expression)?.expression;
  if (expression) return expression;
  const ids = licenses.map(l => l.license?.id ?? (l.license?.name && `LicenseRef-${l.license.name.replace(/[^A-Za-z0-9.-]/g, '-')}`)).filter(Boolean);
  return ids.length ? [...new Set(ids)].join(' AND ') : undefined;
};

const spdxPackageToComponent = (p: SpdxPackage): CycloneDxComponent => {
  const refs = p.externalRefs ?? [];
  const purl = refs.findLast(isPurlRef)?.referenceLocator;
  const cpe = refs.find(r => r.referenceType === 'cpe23Type')?.referenceLocator;
  const supplier = supplierName(p.supplier);
  const license = declared(p);
  return {
    'bom-ref': p.SPDXID,
    type: p.primaryPackagePurpose === OS ? 'operating-system' : p.primaryPackagePurpose === CONTAINER ? 'container' : 'library',
    ...(supplier && { supplier: { name: supplier } }),
    name: p.name,
    ...(p.versionInfo !== undefined && { version: p.versionInfo }),
    ...(p.checksums?.length && { hashes: p.checksums.map(c => ({ alg: cdxAlg(c.algorithm), content: c.checksumValue })) }),
    ...(license && { licenses: [{ expression: license }] }),
    ...(cpe && { cpe }),
    ...(purl && { purl }),
  } as CycloneDxComponent;
};

const spdxFileToComponent = (f: SpdxFile): CycloneDxComponent =>
  ({
    'bom-ref': f.SPDXID,
    type: 'file',
    name: f.fileName,
    ...(f.checksums?.length && { hashes: f.checksums.map(c => ({ alg: cdxAlg(c.algorithm), content: c.checksumValue })) }),
  }) as CycloneDxComponent;

export function spdxToCycloneDx({ doc, packages }: CanonicalDocument<SpdxDocument, SpdxPackage>): CanonicalDocument<CycloneDxBom, CycloneDxComponent> {
  // the image is the metadata's component, as Syft and Trivy write it
  const image = packages.find(e => e.pkg.primaryPackagePurpose === CONTAINER);
  const entries: CanonicalEntry<CycloneDxComponent>[] = [
    ...packages.filter(e => e !== image).map(e => ({ pkg: spdxPackageToComponent(e.pkg), canonical: e.canonical })),
    ...(doc.files ?? []).map(f => ({ pkg: spdxFileToComponent(f), canonical: undefined })),
  ];
  const ids = new Set([...entries.map(e => e.pkg['bom-ref']), ...(image ? [image.pkg.SPDXID] : [])]);
  const dependsOn = new Map<string, string[]>();
  for (const r of doc.relationships ?? []) {
    if (r.relationshipType !== 'DEPENDS_ON' || !ids.has(r.spdxElementId) || !ids.has(r.relatedSpdxElement)) continue;
    dependsOn.set(r.spdxElementId, [...(dependsOn.get(r.spdxElementId) ?? []), r.relatedSpdxElement]);
  }
  const bom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    version: 1,
    metadata: {
      ...(doc.creationInfo?.created && { timestamp: doc.creationInfo.created }),
      tools: { components: (doc.creationInfo?.creators ?? []).filter(c => c.startsWith('Tool:')).map(toolOf) },
      ...(image && { component: spdxPackageToComponent(image.pkg) }),
    },
    components: [],
    ...(dependsOn.size && { dependencies: [...dependsOn].map(([ref, refs]) => ({ ref, dependsOn: refs })) }),
  } as unknown as CycloneDxBom;
  return { doc: bom, packages: entries };
}

const SPDX_ID = /^SPDXRef-[A-Za-z0-9.-]+$/;

export function cycloneDxToSpdx({ doc: bom, packages }: CanonicalDocument<CycloneDxBom, CycloneDxComponent>): CanonicalDocument<SpdxDocument, SpdxPackage> {
  const image = bom.metadata?.component as CycloneDxComponent | undefined;
  const all = [...(image ? [{ pkg: image, canonical: undefined }] : []), ...packages];
  // a bom-ref an SPDX id can hold is kept (an SBOM made from SPDX gets its ids back)
  const ids = new Map<string, string>();
  all.forEach(({ pkg }, i) => {
    const ref = pkg['bom-ref'];
    const id = ref && SPDX_ID.test(ref) ? ref : `SPDXRef-${pkg.type === 'file' ? 'File' : 'Package'}-${i}`;
    if (ref) ids.set(ref, id);
  });
  const idOf = (c: CycloneDxComponent, i: number) => (c['bom-ref'] && ids.get(c['bom-ref'])) || `SPDXRef-Package-${i}`;
  const checksums = (c: CycloneDxComponent): SpdxChecksum[] => ((c.hashes ?? []) as any[]).map(h => ({ algorithm: spdxAlg(h.alg), checksumValue: h.content }));

  const toPackage = (c: CycloneDxComponent, i: number): SpdxPackage => {
    const refs: SpdxExternalRef[] = [
      ...(c.cpe ? [{ referenceCategory: 'SECURITY', referenceType: 'cpe23Type', referenceLocator: c.cpe }] : []),
      ...(c.purl ? [{ referenceCategory: 'PACKAGE-MANAGER', referenceType: 'purl', referenceLocator: c.purl }] : []),
    ];
    const supplier = (c.supplier as { name?: string } | undefined)?.name ?? (c as { publisher?: string }).publisher;
    const license = expressionOf(c.licenses as any[]);
    return {
      name: c.name,
      SPDXID: idOf(c, i),
      ...(c.version !== undefined && { versionInfo: c.version }),
      supplier: supplier ? `Organization: ${supplier}` : NOASSERTION,
      downloadLocation: NOASSERTION,
      filesAnalyzed: false,
      ...(checksums(c).length && { checksums: checksums(c) }),
      licenseConcluded: NOASSERTION,
      licenseDeclared: license ?? NOASSERTION,
      copyrightText: NOASSERTION,
      ...(refs.length && { externalRefs: refs }),
      ...(c.type === 'operating-system' && { primaryPackagePurpose: OS }),
      ...(c === image && { primaryPackagePurpose: CONTAINER }),
    };
  };

  const entries = all.flatMap((e, i) => (e.pkg.type === 'file' ? [] : [{ pkg: toPackage(e.pkg, i), canonical: e.canonical }]));
  const files: SpdxFile[] = all.flatMap(({ pkg }, i) =>
    pkg.type === 'file' ? [{ fileName: pkg.name, SPDXID: idOf(pkg, i), ...(checksums(pkg).length && { checksums: checksums(pkg) }) }] : []
  );
  const relationships: SpdxRelationship[] = [
    ...(image ? [{ spdxElementId: 'SPDXRef-DOCUMENT', relationshipType: 'DESCRIBES', relatedSpdxElement: idOf(image, 0) }] : []),
    ...((bom.dependencies ?? []) as { ref: string; dependsOn?: string[] }[]).flatMap(d =>
      (d.dependsOn ?? [])
        .filter(t => ids.has(d.ref) && ids.has(t))
        .map(t => ({ spdxElementId: ids.get(d.ref)!, relationshipType: 'DEPENDS_ON', relatedSpdxElement: ids.get(t)! }))
    ),
  ];
  const tools = (bom.metadata?.tools ?? []) as any;
  const name = image?.name ?? 'sbom';
  const doc = {
    spdxVersion: 'SPDX-2.3',
    dataLicense: 'CC0-1.0',
    SPDXID: 'SPDXRef-DOCUMENT',
    name,
    documentNamespace: bom.serialNumber ?? `https://spdx.org/spdxdocs/${encodeURIComponent(name)}`,
    creationInfo: {
      created: bom.metadata?.timestamp ?? '',
      creators: (Array.isArray(tools) ? tools : (tools.components ?? [])).map((t: any) => `Tool: ${t.name}${t.version ? `-${t.version}` : ''}`),
    },
    packages: [],
    ...(files.length && { files }),
    ...(relationships.length && { relationships }),
  } as SpdxDocument;
  return { doc, packages: entries };
}
