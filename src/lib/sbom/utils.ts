import { ISbom } from '@/models/ISbom';

// Shared helpers for the SBOM parsers.

export const abbreviateFormat = (format: ISbom["format"]): string =>
  format.replace("CycloneDX","CDX")

export const capitalizeToolName = (name: string): string =>
  name.charAt(0).toUpperCase() + name.slice(1);

export const withFormatInName = (sbom: ISbom): ISbom => {
  const name = `${sbom.toolInfo.name} (${abbreviateFormat(sbom.format)})`;
  return { ...sbom, tool: name, toolInfo: { ...sbom.toolInfo, name } };
};
