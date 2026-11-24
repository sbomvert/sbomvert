import { CycloneDxBom } from '../cyclonedx/types';
import { parsePackageUrl } from '../purl/packageUrl';
import { SpdxDocument } from '../spdx/types';
import { anchoreCycloneDxProvider, anchoreSpdxProvider } from './anchore';
import { isOsType, OS_RELEASE_IDS, splitEpoch } from './common';
import { dockerCycloneDxProvider, dockerSpdxProvider } from './docker';
import { cycloneDxAdapter } from './formats/cyclonedx';
import { spdxAdapter } from './formats/spdx';
import { trivyCycloneDxProvider, trivyProvider } from './trivy';
import { CanonicalPackage, FormatAdapter, Provider } from './types';
import { detectTool } from './detectTool';

// The key the compare view matches packages on across tools: type, namespace, name and version, as the tool's
// translator reads them, so the same whichever tool wrote them. In lower case (Trivy and Scout lowercase Go
// paths), without the epoch, and without the `v` some tools write before a language package's version. Not the
// architecture, distro or source package, on which tools differ for the same package.
// - An OS package's distro by its os-release id (`amzn`, not `amazon`), for the tools without a translator (cdxgen).
// - Maven without its group: tools disagree on it for the same jar (Trivy `org.ow2.asm`, Syft and Scout guess
//   `org.objectweb.asm` from its Java packages).
// - None for the image itself (`oci`): Trivy gives it no purl, so its name and version match it.
export const comparisonKey = ({ type, namespace, name, version }: Pick<CanonicalPackage, 'type' | 'namespace' | 'name' | 'version'>): string | undefined => {
  if (type === 'oci') return undefined;
  const os = isOsType(type);
  const bare = os ? version : version.replace(/^v(?=\d)/, '');
  const ns = type === 'maven' ? '' : os ? OS_RELEASE_IDS[namespace.toLowerCase()] ?? namespace : namespace;
  return `${type}/${ns}/${name}@${bare}`.toLowerCase();
};

// a purl's key, for a package no translator reads (a tool without one, a nested CycloneDX component)
const purlKey = (purl: string): string | undefined => {
  const p = parsePackageUrl(purl);
  if (!p) return undefined;
  const [version, epoch] = splitEpoch(p.version);
  return comparisonKey({ ...p, version: isOsType(p.type) && epoch ? version : p.version });
};

// The tools whose translators the compare view matches packages with
const SPDX = { anchore: anchoreSpdxProvider, trivy: trivyProvider, docker: dockerSpdxProvider };
const CYCLONEDX = { anchore: anchoreCycloneDxProvider, trivy: trivyCycloneDxProvider, docker: dockerCycloneDxProvider };
type Tool = keyof typeof SPDX;
const toolOf = (doc: SpdxDocument | CycloneDxBom): Tool | undefined => {
  const tool = detectTool(doc);
  return tool && tool in SPDX ? (tool as Tool) : undefined;
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
