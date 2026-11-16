/** @jest-environment node */
import { CycloneDxBom, CycloneDxComponent } from '../cyclonedx/types';
import { formatPackageUrl, parsePackageUrl } from '../purl/packageUrl';
import { SpdxDocument, SpdxPackage } from '../spdx/types';
import { amazonProvider } from './amazon';
import { anchoreCycloneDxProvider, anchoreSpdxProvider } from './anchore';
import { dockerCycloneDxProvider, dockerSpdxProvider } from './docker';
import { CLASSES, CLOUD_CLASSES, CloudClass, CloudRepresentation, CloudTool, EquivalenceClass, OPERATING_SYSTEMS, Representation, Tool } from './equivalenceClasses';
import { googleProvider } from './google';
import { microsoftProvider } from './microsoft';
import { cycloneDxToSpdx, spdxToCycloneDx } from './formats/convert';
import { trivyCycloneDxProvider, trivyProvider } from './trivy';
import { Provider } from './types';

// Each equivalence class of equivalenceClasses.ts translated from every tool to itself and to every other tool, from
// SPDX or CycloneDX to SPDX or CycloneDX, compared with how the target tool wrote the same package; and there and back.

type Format = 'spdx' | 'cdx';
const FORMATS: Format[] = ['spdx', 'cdx'];
const PROVIDERS: Record<Tool, Record<Format, Provider<any, any>>> = {
  syft: { spdx: anchoreSpdxProvider, cdx: anchoreCycloneDxProvider },
  trivy: { spdx: trivyProvider, cdx: trivyCycloneDxProvider },
  scout: { spdx: dockerSpdxProvider, cdx: dockerCycloneDxProvider },
};
const TOOLS = Object.keys(PROVIDERS) as Tool[];
const toolsOf = (c: EquivalenceClass) => TOOLS.filter(t => c[t]);

// An SBOM of the package as the tool wrote it (and of the source package Docker Scout lists apart)
const docOf = (format: Format, rep: Representation) => {
  const reps = rep.source ? [rep, rep.source] : [rep];
  if (format === 'spdx') {
    return {
      spdxVersion: 'SPDX-2.3', name: 'x', creationInfo: { creators: [], created: '' },
      packages: reps.map((r, i) => ({
        name: `p${i}`, SPDXID: `SPDXRef-${i}`,
        ...(r.version !== undefined && { versionInfo: r.version }),
        ...(r.sourceInfo && { sourceInfo: r.sourceInfo }),
        externalRefs: [{ referenceCategory: 'PACKAGE-MANAGER', referenceType: 'purl', referenceLocator: r.purl }],
      })),
    } as unknown as SpdxDocument;
  }
  return {
    bomFormat: 'CycloneDX', specVersion: '1.6', version: 1,
    components: reps.map((r, i) => ({
      'bom-ref': `c${i}`, type: 'library', name: `p${i}`,
      ...(r.version !== undefined && { version: r.version }),
      purl: r.purl,
      ...(r.properties && { properties: Object.entries(r.properties).map(([name, value]) => ({ name, value })) }),
    })),
  } as unknown as CycloneDxBom;
};

// The packages of an SBOM with a purl, as representations (the purl in one spelling)
const KEPT = /^(syft:package:|syft:metadata:|aquasecurity:trivy:(PkgID|PkgType|Src))/;
const spelled = (purl: string) => formatPackageUrl(parsePackageUrl(purl)!);
const repsOf = (format: Format, doc: any): Representation[] =>
  format === 'spdx'
    ? (doc as SpdxDocument).packages.filter(p => p.externalRefs?.some(r => r.referenceType === 'purl')).map((p: SpdxPackage) => ({
        purl: spelled(p.externalRefs!.find(r => r.referenceType === 'purl')!.referenceLocator!),
        ...(p.versionInfo !== undefined && { version: p.versionInfo }),
        ...(p.sourceInfo?.startsWith('built package from') && { sourceInfo: p.sourceInfo }),
      }))
    : ((doc as CycloneDxBom).components ?? []).filter(c => c.purl).map((c: CycloneDxComponent) => {
        const properties = Object.fromEntries((c.properties ?? []).filter(p => KEPT.test(p.name ?? '')).map(p => [p.name, p.value!]));
        return {
          purl: spelled(c.purl!),
          ...(c.version !== undefined && { version: c.version }),
          ...(Object.keys(properties).length && { properties }),
        };
      });
// the package alone (Scout's source package is a package of its own), its purl in one spelling
const respelled = ({ source: _, ...rep }: Representation): Representation => ({ ...rep, purl: spelled(rep.purl) });

const translate = (format: Format, from: Tool, to: Tool, doc: any) => PROVIDERS[to][format].fromCanonical(PROVIDERS[from][format].toCanonical(doc));
// from a tool in a format to a tool in a format
const across = (from: Tool, fromFormat: Format, to: Tool, toFormat: Format, doc: any) => {
  const canonical = PROVIDERS[from][fromFormat].toCanonical(doc);
  const converted = fromFormat === toFormat ? canonical : fromFormat === 'spdx' ? spdxToCycloneDx(canonical) : cycloneDxToSpdx(canonical);
  return PROVIDERS[to][toFormat].fromCanonical(converted);
};
const FORMAT_PAIRS = FORMATS.flatMap(a => FORMATS.map(b => [a, b] as const));

const IDENTITY = CLASSES.flatMap(c => toolsOf(c).flatMap(tool => FORMATS.map(format => [c.label, tool, format, c] as const)));

describe.each(IDENTITY)('%s: %s -> %s, %s', (_label, tool, format, c) => {
  test('comes back unchanged', () => {
    const rep = c[tool]![format];
    const back = repsOf(format, translate(format, tool, tool, docOf(format, rep)));
    expect(back).toEqual([rep, ...(rep.source ? [rep.source] : [])].map(respelled));
  });
});

// What a translation cannot give, left out of the comparison:
// - `arch`: the tools did not analyze the same platform;
// - from Scout: no source (`upstream`, Trivy's `sourceInfo` and `Src*`, Syft's source properties) and no minor
//   release (`distro`); Go module paths in lower case, Composer versions without their `v`;
// - from Trivy: Go module paths in lower case;
// - to Scout: Scout writes no `upstream`, the translation keeps it (so that Syft -> Scout -> Syft loses nothing).
function comparable(from: Tool, to: Tool, { purl, version }: Representation): string {
  const p = parsePackageUrl(purl)!;
  const q = { ...p.qualifiers };
  delete q.arch;
  if (from === 'scout' || to === 'scout') delete q.upstream;
  if (from === 'scout') delete q.distro;
  const lower = p.type === 'golang' && from !== 'syft' ? (s: string) => s.toLowerCase() : (s: string) => s;
  const vless = p.type === 'composer' && from === 'scout' ? (v = '') => v.replace(/^v(?=\d)/, '') : (v = '') => v;
  return `${formatPackageUrl({ ...p, namespace: lower(p.namespace), name: lower(p.name), version: vless(p.version), qualifiers: q })} ${vless(version)}`;
}

const sourceOf = (to: Tool, rep: Representation) => ({
  sourceInfo: to === 'trivy' ? rep.sourceInfo : undefined,
  properties: Object.fromEntries(
    Object.entries(rep.properties ?? {}).filter(([k]) => (to === 'trivy' ? /trivy:(PkgID|PkgType|Src)/ : /^syft:/).test(k))
  ),
});

const isOs = (c: EquivalenceClass) => /^(deb|apk|rpm),/.test(c.label);

const CROSS = CLASSES.flatMap(c =>
  toolsOf(c).flatMap(from =>
    toolsOf(c)
      .filter(to => to !== from)
      .flatMap(to => FORMAT_PAIRS.map(([fromFormat, toFormat]) => [c.label, from, fromFormat, to, toFormat, c] as const))
  )
);

describe.each(CROSS)('%s: %s %s -> %s %s', (_label, from, fromFormat, to, toFormat, c) => {
  const target = c[to]![toFormat];
  const written = repsOf(toFormat, across(from, fromFormat, to, toFormat, docOf(fromFormat, c[from]![fromFormat])));

  test('purl and version as the target tool writes them', () => {
    expect(comparable(from, to, written[0])).toBe(comparable(from, to, target));
  });

  // the source and properties of an OS package: those of a package not from the OS (Trivy's PkgType `gobinary` or
  // `gomod`, Syft's cataloger) depend on how the tool found it, and are not written
  if (from !== 'scout' && isOs(c) && (to === 'trivy' || (to === 'syft' && toFormat === 'cdx'))) {
    test("the source as the target tool gives it (Trivy's sourceInfo and Src properties, Syft's CycloneDX ones)", () => {
      expect(sourceOf(to, written[0])).toEqual(sourceOf(to, target));
    });
  }

  if (to === 'scout' && from !== 'scout') {
    test('the source package Scout lists apart, when it has another name', () => {
      expect(written.slice(1).map(r => comparable(from, to, r))).toEqual(target.source ? [comparable(from, to, target.source)] : []);
    });
  }
});

// There and back: from a tool in a format through a tool in the other format, back to the first. What the tool in
// the middle cannot hold is lost:
// - Scout: the architecture, the source, the minor release; it lists a source package apart, which comes back as a
//   package of its own; Composer versions lose their `v`;
// - Trivy and Scout: the case of Go module paths;
// - the properties of a package not from the OS (Syft's, Trivy's), which no writer gives again.
function lostThrough(through: Tool, tool: Tool, { purl, version }: Representation): string {
  const p = parsePackageUrl(purl)!;
  const q = { ...p.qualifiers };
  const viaScout = through === 'scout' && tool !== 'scout';
  if (viaScout) for (const k of ['arch', 'upstream', 'distro']) delete q[k];
  const lower = p.type === 'golang' && tool === 'syft' && through !== 'syft' ? (s: string) => s.toLowerCase() : (s: string) => s;
  const vless = p.type === 'composer' && viaScout ? (v = '') => v.replace(/^v(?=\d)/, '') : (v = '') => v;
  return `${formatPackageUrl({ ...p, namespace: lower(p.namespace), name: lower(p.name), version: vless(p.version), qualifiers: q })} ${vless(version)}`;
}

const ROUND = CLASSES.flatMap(c =>
  toolsOf(c).flatMap(tool =>
    TOOLS.flatMap(through => FORMATS.map(format => [c.label, tool, format, through, format === 'spdx' ? 'cdx' : 'spdx', c] as const))
  )
);

describe.each(ROUND)('%s: %s %s -> %s %s -> back', (_label, tool, format, through, other, c) => {
  const original = c[tool]![format];
  const reps = [original, ...(original.source ? [original.source] : [])];
  const back = repsOf(format, across(through, other, tool, format, across(tool, format, through, other, docOf(format, original))));

  test('the same packages come back, but what the tool in the middle cannot hold', () => {
    expect(back.slice(0, reps.length).map(r => lostThrough(through, tool, r))).toEqual(reps.map(r => lostThrough(through, tool, r)));
    // only Scout adds packages: the source packages it lists apart
    if (through !== 'scout' || tool === 'scout') expect(back).toHaveLength(reps.length);
  });

  if (isOs(c) && (through !== 'scout' || tool === 'scout')) {
    test("the source as the tool gives it (Trivy's sourceInfo and Src properties, Syft's CycloneDX ones)", () => {
      expect(back[0].sourceInfo).toBe(original.sourceInfo);
      expect(back[0].properties).toEqual(original.properties);
    });
  }
});

// JSON with its keys in order, at every level
const stable = (v: unknown): string =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? `{${Object.keys(v).sort().filter(k => (v as any)[k] !== undefined).map(k => `${JSON.stringify(k)}:${stable((v as any)[k])}`).join(',')}}`
    : JSON.stringify(v);
const canonicalsOf = (format: Format, tool: Tool, doc: any) => PROVIDERS[tool][format].toCanonical(doc).packages.map(p => stable(p.canonical));

describe('across formats', () => {
  test.each(CLASSES.flatMap(c => toolsOf(c).map(tool => [c.label, tool, c] as const)))(
    '%s: %s reads the same package from SPDX and CycloneDX',
    (_label, tool, c) => {
      expect(canonicalsOf('cdx', tool, docOf('cdx', c[tool]!.cdx))).toEqual(canonicalsOf('spdx', tool, docOf('spdx', c[tool]!.spdx)));
    }
  );

  // compared once canonical: a tool's purls can differ between its formats (Scout's Go versions: `v` in SPDX only)
  test.each(CLASSES.flatMap(c => toolsOf(c).flatMap(from => toolsOf(c).filter(to => to !== from).map(to => [c.label, from, to, c] as const))))(
    '%s: %s -> %s writes the same packages in SPDX and CycloneDX',
    (_label, from, to, c) => {
      const spdx = translate('spdx', from, to, docOf('spdx', c[from]!.spdx));
      const cdx = translate('cdx', from, to, docOf('cdx', c[from]!.cdx));
      expect(canonicalsOf('cdx', to, cdx).filter(s => s !== undefined)).toEqual(canonicalsOf('spdx', to, spdx).filter(s => s !== undefined));
    }
  );
});

// The OS Trivy (SPDX, CycloneDX) and Syft (CycloneDX) list, made from an OS package of the other one. Not from Scout:
// its release has no minor version.
const OS_CASES = CLASSES.filter(c => /^(deb|apk|rpm),/.test(c.label)).flatMap(c =>
  ([['syft', 'trivy', 'spdx'], ['syft', 'trivy', 'cdx'], ['trivy', 'syft', 'cdx']] as const)
    .filter(([from, to, format]) => c[from] && OPERATING_SYSTEMS[c.image]?.[to]?.[format])
    .map(([from, to, format]) => [c.label, from, to, format, c] as const)
);

test.each(OS_CASES)('%s: %s -> %s, %s lists the OS as the target tool does', (_label, from, to, format, c) => {
  const doc = translate(format, from, to, docOf(format, c[from]![format])) as any;
  const os =
    format === 'spdx'
      ? (doc as SpdxDocument).packages.find(p => p.primaryPackagePurpose === 'OPERATING-SYSTEM')
      : (doc as CycloneDxBom).components!.find(p => p.type === 'operating-system');
  const expected = OPERATING_SYSTEMS[c.image][to]![format]!;
  expect({ name: os?.name, version: format === 'spdx' ? (os as SpdxPackage).versionInfo : (os as CycloneDxComponent).version }).toEqual({
    name: expected.name,
    version: expected.version,
  });
  if (expected.properties) {
    const properties = Object.fromEntries(((os as CycloneDxComponent).properties ?? []).map(p => [p.name, p.value]));
    expect(properties).toEqual(expected.properties);
  }
});

// The cloud tools, from the SBOMVert dataset: SPDX only, and a Trivy older than the one above
describe('Google, Amazon Inspector, Microsoft and Trivy (SBOMVert dataset)', () => {
  // Each class of CLOUD_CLASSES (Google, Inspector, Microsoft and Trivy on the SBOMVert dataset): each tool to itself,
  // Trivy to each tool and back, and each tool through Syft, Trivy and Scout in CycloneDX and back to SPDX.

  const SPDX: Record<CloudTool, Provider> = { trivy: trivyProvider, google: googleProvider, amazon: amazonProvider, microsoft: microsoftProvider };
  const CDX = { syft: anchoreCycloneDxProvider, trivy: trivyCycloneDxProvider, scout: dockerCycloneDxProvider } as const;
  type Through = keyof typeof CDX;
  const CLOUD_TOOLS = ['google', 'amazon', 'microsoft'] as const;

  // an SBOM of the package (and of the source package Inspector lists apart); Trivy's packages have the purpose Trivy
  // gives them all
  const docOf = (rep: CloudRepresentation, tool?: CloudTool): SpdxDocument => ({
    spdxVersion: 'SPDX-2.3', name: 'x', creationInfo: { creators: [], created: '' },
    packages: [rep, ...(rep.source ? [rep.source] : [])].map(
      (r, i): SpdxPackage => ({
        name: r.name ?? parsePackageUrl(r.purl!)!.name, SPDXID: `SPDXRef-${i}`,
        ...(tool === 'trivy' && { primaryPackagePurpose: 'LIBRARY' }),
        ...(r.version !== undefined && { versionInfo: r.version }),
        ...(r.sourceInfo && { sourceInfo: r.sourceInfo }),
        ...(r.purl && { externalRefs: [{ referenceCategory: 'PACKAGE-MANAGER', referenceType: 'purl', referenceLocator: r.purl }] }),
      })
    ),
  });

  // the packages of an SBOM, but the OS Trivy lists
  const repsOf = (doc: SpdxDocument): CloudRepresentation[] =>
    doc.packages.filter(p => p.primaryPackagePurpose !== 'OPERATING-SYSTEM').map(p => {
      const purl = p.externalRefs?.find(r => r.referenceType === 'purl')?.referenceLocator;
      return {
        ...(purl ? { purl } : { name: p.name }),
        ...(p.versionInfo !== undefined && { versionInfo: p.versionInfo }),
        ...(p.sourceInfo?.startsWith('built package from') && { sourceInfo: p.sourceInfo }),
      } as CloudRepresentation;
    });
  const asReps = (rep: CloudRepresentation) =>
    [rep, ...(rep.source ? [rep.source] : [])].map(({ source: _, version, ...r }) => ({ ...r, ...(version !== undefined && { versionInfo: version }) }));

  // A package compared without what a tool cannot give: these qualifiers, its version or its source
  type Loss = { qualifiers?: string[]; version?: boolean; source?: boolean; lowerGo?: boolean; composerV?: boolean };
  const comparable = (rep: CloudRepresentation & { versionInfo?: string }, loss: Loss) => {
    if (!rep.purl) return `${rep.name} ${loss.version ? '' : rep.versionInfo ?? rep.version}`;
    const p = parsePackageUrl(rep.purl)!;
    const q = { ...p.qualifiers };
    for (const k of loss.qualifiers ?? []) delete q[k];
    const lower = (s: string) => (loss.lowerGo && p.type === 'golang' ? s.toLowerCase() : s);
    const v = (s = '') => (loss.version ? '' : loss.composerV && p.type === 'composer' ? s.replace(/^v(?=\d)/, '') : s);
    const purl = formatPackageUrl({ ...p, namespace: lower(p.namespace), name: lower(p.name), version: v(p.version), qualifiers: q });
    return `${purl} ${v(rep.versionInfo ?? rep.version)} ${loss.source ? '' : rep.sourceInfo ?? ''}`;
  };

  const isOs = (c: CloudClass) => /^(deb|apk),/.test(c.label);
  const trivyArchAll = (c: CloudClass) => /[?&]arch=(all|noarch)(&|$)/.test(c.trivy?.purl ?? '');
  // Inspector's version and epoch are the source's: they differ from the package's when the source has a version
  const sourceVersionDiffers = (c: CloudClass) => /other version|and version|binNMU/.test(c.label);

  describe.each(CLOUD_CLASSES.flatMap(c => (Object.keys(SPDX) as CloudTool[]).filter(t => c[t]).map(t => [c.label, t, c] as const)))(
    '%s: %s -> %s',
    (_label, tool, c) => {
      test('comes back unchanged, its purl as the tool spells it', () => {
        expect(repsOf(SPDX[tool].fromCanonical(SPDX[tool].toCanonical(docOf(c[tool]!, tool))))).toEqual(asReps(c[tool]!));
      });
    }
  );

  const pairs = CLOUD_CLASSES.flatMap(c => CLOUD_TOOLS.filter(t => c[t] && c.trivy).map(t => [c.label, t, c] as const));

  describe.each(pairs)('%s: trivy -> %s', (_label, tool, c) => {
    // Google and Inspector give an `all` package the image's architecture; Inspector keeps a Go module's case,
    // which Trivy loses
    const loss: Loss = { qualifiers: trivyArchAll(c) && tool !== 'microsoft' ? ['arch'] : [], lowerGo: tool === 'amazon', source: true };
    const written = repsOf(SPDX[tool].fromCanonical(trivyProvider.toCanonical(docOf(c.trivy!, 'trivy'))));

    test('written as the tool writes it, with the source package Inspector lists apart', () => {
      expect(written.map(r => comparable(r, loss))).toEqual(asReps(c[tool]!).map(r => comparable(r, loss)));
    });
  });

  describe.each(pairs)('%s: %s -> trivy', (_label, tool, c) => {
    // what the tool does not give: Google the minor release (and an `all` package's architecture), a Composer
    // version's `v`; Inspector the distro and the source (its version and epoch are the source's), a Composer `v`;
    // Microsoft the architecture, distro and source. And none tells a package without a source (Alpine's virtual
    // packages, Trivy writes them no `sourceInfo`) from one built from itself.
    const loss: Loss = {
      google: { qualifiers: ['distro', ...(trivyArchAll(c) ? ['arch'] : [])], composerV: true, source: !c.trivy!.sourceInfo },
      amazon: { qualifiers: ['distro', ...(sourceVersionDiffers(c) ? ['epoch'] : [])], source: true, version: sourceVersionDiffers(c), lowerGo: true, composerV: true },
      microsoft: { qualifiers: ['arch', 'distro'], source: true },
    }[tool];
    const written = repsOf(trivyProvider.fromCanonical(SPDX[tool].toCanonical(docOf(c[tool]!))));

    test('written as Trivy writes it', () => {
      // Microsoft's Alpine package is compared by name and version
      const main = written[0];
      const target = c.trivy!;
      const asNamed = !c[tool]!.purl;
      if (asNamed) expect(parsePackageUrl(main.purl!)).toMatchObject({ type: 'apk', name: c[tool]!.name, version: target.version });
      else expect(comparable(main, loss)).toBe(comparable({ ...target, versionInfo: target.version }, loss));
    });
  });

  // There and back: from the tool's SPDX through Syft, Trivy or Scout in CycloneDX. What the tool in the middle cannot
  // hold is lost: Scout the architecture and the source (and it lists a source package apart, which comes back as a
  // package of its own); Trivy and Scout the case of a Go module.
  const across = (from: Provider<any, any>, fromSpdx: boolean, to: Provider<any, any>, doc: any) => {
    const c = from.toCanonical(doc);
    return to.fromCanonical(fromSpdx ? spdxToCycloneDx(c) : cycloneDxToSpdx(c));
  };
  const ROUND = CLOUD_CLASSES.flatMap(c =>
    CLOUD_TOOLS.filter(t => c[t]).flatMap(t => (Object.keys(CDX) as Through[]).map(through => [c.label, t, through, c] as const))
  );

  describe.each(ROUND)('%s: %s spdx -> %s cdx -> back', (_label, tool, through, c) => {
    const loss: Loss = {
      qualifiers: through === 'scout' ? ['arch', 'upstream'] : [],
      lowerGo: through !== 'syft',
    };
    const reps = asReps(c[tool]!);
    const back = repsOf(across(CDX[through], false, SPDX[tool], across(SPDX[tool], true, CDX[through], docOf(c[tool]!, tool))));

    test('the same packages come back, but what the tool in the middle cannot hold', () => {
      expect(back.slice(0, reps.length).map(r => comparable(r, loss))).toEqual(reps.map(r => comparable(r, loss)));
      if (through !== 'scout') expect(back).toHaveLength(reps.length);
    });
  });

  test('every class has Trivy and at least one of the other tools, OS classes all three when Microsoft lists them', () => {
    for (const c of CLOUD_CLASSES) {
      expect(c.trivy).toBeDefined();
      expect(CLOUD_TOOLS.some(t => c[t])).toBe(true);
      if (isOs(c)) expect(c.google && c.amazon).toBeTruthy();
    }
  });
});
