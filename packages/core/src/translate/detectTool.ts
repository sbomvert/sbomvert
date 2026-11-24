import { CycloneDxBom } from '../cyclonedx/types';
import { SpdxDocument } from '../spdx/types';

// The tools SBOMVert can translate, by the name of their provider (translate/index.ts PROVIDERS)
export type ToolId = 'anchore' | 'trivy' | 'docker' | 'google' | 'amazon' | 'microsoft';
export type SbomFormat = 'spdx' | 'cdx';

export const formatOf = (doc: unknown): SbomFormat | undefined => {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return undefined;
  if (typeof (doc as { spdxVersion?: unknown }).spdxVersion === 'string') return 'spdx';
  if ((doc as { bomFormat?: unknown }).bomFormat === 'CycloneDX') return 'cdx';
  return undefined;
};

// How each tool names itself: in SPDX creators (`Tool: syft-1.54.1`), in CycloneDX `metadata.tools`; first match wins
const NAMES: [string, ToolId][] = [
  ['syft', 'anchore'],
  ['trivy', 'trivy'],
  ['docker-scout', 'docker'],
  ['google', 'google'],
  ['amazon inspector', 'amazon'],
  ['inspector-sbomgen', 'amazon'],
  ['microsoft.sbomtool', 'microsoft'],
];

// The tool that made an SBOM, when it says so
export const detectTool = (doc: SpdxDocument | CycloneDxBom): ToolId | undefined => {
  const names = 'spdxVersion' in doc ? doc.creationInfo?.creators ?? [] : cycloneDxTools(doc);
  const all = names.join(' ').toLowerCase();
  // cdxgen also lists the plugins it ran as tools, among them its own build of Trivy named `trivy`: without this,
  // its SBOMs would be taken for Trivy's. It has no translator.
  if (all.includes('cdxgen')) return undefined;
  return NAMES.find(([name]) => all.includes(name))?.[1];
};

// CycloneDX 1.4 lists its tools; 1.5 and later give them as components
const cycloneDxTools = (bom: CycloneDxBom): string[] => {
  const tools = bom.metadata?.tools;
  const list = Array.isArray(tools) ? tools : tools?.components ?? [];
  return list.map(t => t.name ?? '');
};
