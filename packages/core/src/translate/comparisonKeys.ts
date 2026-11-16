import { CycloneDxBom } from '../cyclonedx/types';
import { parsePackageUrl } from '../purl/packageUrl';
import { SpdxDocument } from '../spdx/types';
import { anchoreCycloneDxProvider, anchoreSpdxProvider } from './anchore';
import { isOsType, splitEpoch } from './common';
import { dockerCycloneDxProvider, dockerSpdxProvider } from './docker';
import { cycloneDxAdapter } from './formats/cyclonedx';
import { spdxAdapter } from './formats/spdx';
import { trivyCycloneDxProvider, trivyProvider } from './trivy';
import { CanonicalPackage, FormatAdapter, Provider } from './types';

// The key the compare view matches packages on across tools: type, namespace, name and version, as the tool's
// translator reads them, so the same whichever tool wrote them. In lower case (Trivy and Scout lowercase Go
// paths), without the epoch, and without the `v` some tools write before a language package's version. Not the
// architecture, distro or source package, on which tools differ for the same package.
// - Maven without its group: tools disagree on it for the same jar (Trivy `org.ow2.asm`, Syft and Scout guess
//   `org.objectweb.asm` from its Java packages).
// - None for the image itself (`oci`): Trivy gives it no purl, so its name and version match it.
export const comparisonKey = ({ type, namespace, name, version }: Pick<CanonicalPackage, 'type' | 'namespace' | 'name' | 'version'>): string | undefined => {
  if (type === 'oci') return undefined;
  const bare = isOsType(type) ? version : version.replace(/^v(?=\d)/, '');
  return `${type}/${type === 'maven' ? '' : namespace}/${name}@${bare}`.toLowerCase();
};

// a purl's key, for a package no translator reads (a tool without one, a nested CycloneDX component)
const purlKey = (purl: string): string | undefined => {
  const p = parsePackageUrl(purl);
  if (!p) return undefined;
  const [version, epoch] = splitEpoch(p.version);
  return comparisonKey({ ...p, version: isOsType(p.type) && epoch ? version : p.version });
};

const SPDX = { syft: anchoreSpdxProvider, trivy: trivyProvider, scout: dockerSpdxProvider };
const CYCLONEDX = { syft: anchoreCycloneDxProvider, trivy: trivyCycloneDxProvider, scout: dockerCycloneDxProvider };
type Tool = keyof typeof SPDX;

// The tool that made the SBOM, among those with a translator: SPDX `Tool: syft-1.54.1`, CycloneDX `metadata.tools`
// (a list in CycloneDX 1.4, `tools.components` after)
const toolOf = (doc: SpdxDocument | CycloneDxBom): Tool | undefined => {
  const tools = 'spdxVersion' in doc ? doc.creationInfo?.creators ?? [] : cycloneDxTools(doc);
  const names = tools.join(' ').toLowerCase();
  if (names.includes('syft')) return 'syft';
  if (names.includes('trivy')) return 'trivy';
  if (names.includes('docker-scout')) return 'scout';
  return undefined;
};

const cycloneDxTools = (bom: CycloneDxBom): string[] => {
  const tools = bom.metadata?.tools as unknown;
  const list = Array.isArray(tools) ? tools : ((tools as { components?: unknown[] } | undefined)?.components ?? []);
  return list.map(t => String((t as { name?: string }).name ?? ''));
};

// each purl of an SBOM the translator reads, with its key
const keysOf = <Doc, Pkg>(provider: Provider<Doc, Pkg>, adapter: FormatAdapter<Doc, Pkg>, doc: Doc): [string, string][] =>
  provider.toCanonical(doc).packages.flatMap(({ pkg, canonical }) => {
    const purl = adapter.view(pkg).purls[0];
    const key = canonical && comparisonKey(canonical);
    return purl && key ? [[purl, key] as [string, string]] : [];
  });

// The comparison key of each purl of an SBOM: read by the tool's translator when SBOMVert has one (Syft, Trivy,
// Docker Scout), from the purl alone otherwise or when the translator can't read the SBOM.
export function comparisonKeys(doc: SpdxDocument | CycloneDxBom): (purl: string | undefined) => string | undefined {
  const tool = toolOf(doc);
  let read: [string, string][] = [];
  try {
    if (tool) read = 'spdxVersion' in doc ? keysOf(SPDX[tool], spdxAdapter, doc) : keysOf(CYCLONEDX[tool], cycloneDxAdapter, doc);
  } catch (error) {
    console.warn(`Comparing ${tool} packages by their purls only:`, error);
  }
  // the first package with a purl gives its key, as the parsers keep the first one
  const keys = new Map(read.reverse());
  return purl => (purl ? keys.get(purl) ?? purlKey(purl) : undefined);
}
