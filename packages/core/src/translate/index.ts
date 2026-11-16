import { SpdxDocument } from '../spdx/types';
import { amazonCycloneDxProvider, amazonProvider } from './amazon';
import { CycloneDxBom, CycloneDxComponent } from '../cyclonedx/types';
import { anchoreCycloneDxProvider, anchoreSpdxProvider } from './anchore';
import { dockerCycloneDxProvider, dockerSpdxProvider } from './docker';
import { googleProvider } from './google';
import { microsoftProvider } from './microsoft';
import { trivyCycloneDxProvider, trivyProvider } from './trivy';
import { Provider } from './types';
import { detectTool } from './detectTool';

export type { CanonicalDocument, CanonicalEntry, CanonicalPackage, Provider } from './types';
// From one format to the other: an SBOM read in SPDX written by a tool in CycloneDX, and the other way
export { cycloneDxToSpdx, spdxToCycloneDx } from './formats/convert';

// Translating SPDX SBOMs between the tools that make them (ported from github.com/sbomvert/sbom-translation).
export const PROVIDERS: Record<string, Provider> = {
  anchore: anchoreSpdxProvider,
  trivy: trivyProvider,
  docker: dockerSpdxProvider,
  google: googleProvider,
  amazon: amazonProvider,
  microsoft: microsoftProvider,
};

// The tools whose CycloneDX SBOMs can be translated (so far).
export const CYCLONEDX_PROVIDERS: Record<string, Provider<CycloneDxBom, CycloneDxComponent>> = {
  anchore: anchoreCycloneDxProvider,
  docker: dockerCycloneDxProvider,
  trivy: trivyCycloneDxProvider,
  amazon: amazonCycloneDxProvider,
};

const ALIASES: Record<string, string> = { gcp: 'google', aws: 'amazon', azure: 'microsoft', syft: 'anchore' };

export const providerFromName = (name: string): Provider => {
  const key = name.trim().toLowerCase();
  const provider = PROVIDERS[ALIASES[key] ?? key];
  if (!provider) throw new Error(`Unsupported provider: ${name}`);
  return provider;
};

// The tool that made an SPDX document, from its creators ("Tool: syft-1.12.2").
export const detectProvider = (doc: SpdxDocument): Provider => {
  if (!doc.creationInfo?.creators?.length) throw new Error('SPDX document missing creation info');
  const tool = detectTool(doc);
  if (!tool) throw new Error('Unable to detect provider from creators');
  return PROVIDERS[tool];
};

// Translates an SPDX document into the form another tool writes. `from` defaults to the tool that made it.
export const convertSbom = (doc: SpdxDocument, to: Provider | string, from: Provider = detectProvider(doc)): SpdxDocument =>
  (typeof to === 'string' ? providerFromName(to) : to).fromCanonical(from.toCanonical(doc));
