import { CycloneDxBom } from '../cyclonedx/types';
import { SpdxDocument } from '../spdx/types';
import { SbomFormat, ToolId } from './detectTool';
import { CYCLONEDX_PROVIDERS, cycloneDxToSpdx, PROVIDERS, spdxToCycloneDx } from './index';

// An SBOM as one tool writes it, in one format
export type SbomKind = { tool: ToolId; format: SbomFormat };

const FORMATS: SbomFormat[] = ['spdx', 'cdx'];
const providersOf = (format: SbomFormat) => (format === 'spdx' ? PROVIDERS : CYCLONEDX_PROVIDERS);
const has = ({ tool, format }: SbomKind) => Object.hasOwn(providersOf(format), tool);

// The tools whose SBOMs in this format can be read
export const sourceTools = (format: SbomFormat): ToolId[] => Object.keys(providersOf(format)) as ToolId[];

// What an SBOM can be translated into: every tool and format with a translator, SPDX first, but itself
export const translateTargets = (from: SbomKind): SbomKind[] =>
  FORMATS.flatMap(format => sourceTools(format).map(tool => ({ tool, format })))
    .filter(to => to.tool !== from.tool || to.format !== from.format);

// The SBOM rewritten as `to`'s tool writes it, in `to`'s format: read as `from`'s tool wrote it, converted between
// SPDX and CycloneDX when the formats differ
export function translateSbom(doc: SpdxDocument | CycloneDxBom, from: SbomKind, to: SbomKind): SpdxDocument | CycloneDxBom {
  for (const kind of [from, to]) if (!has(kind)) throw new Error(`No translator for ${kind.tool} ${kind.format}`);
  if (from.format === 'spdx') {
    const canonical = PROVIDERS[from.tool].toCanonical(doc as SpdxDocument);
    return to.format === 'spdx' ? PROVIDERS[to.tool].fromCanonical(canonical) : CYCLONEDX_PROVIDERS[to.tool].fromCanonical(spdxToCycloneDx(canonical));
  }
  const canonical = CYCLONEDX_PROVIDERS[from.tool].toCanonical(doc as CycloneDxBom);
  return to.format === 'cdx' ? CYCLONEDX_PROVIDERS[to.tool].fromCanonical(canonical) : PROVIDERS[to.tool].fromCanonical(cycloneDxToSpdx(canonical));
}
