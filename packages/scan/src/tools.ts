// The SBOM and vulnerability tools SBOMVert can run: what the scan form offers, and which SBOM each
// scanner reads. The commands themselves are in sbom/generator.ts and vuln/scanner.ts, the report
// parsers in vuln/vulnutils.ts (VULN_EXTRACTORS); tools.test.ts checks they all agree with this list.

// The SBOM formats a scan can produce (and scan for CVEs): the file extension is `<tool>.<format>.json`.
export const SBOM_FORMATS = ['spdx', 'cdx'] as const;
export type SbomFormat = (typeof SBOM_FORMATS)[number];

export type ToolConfig = {
  name: string;
  produce_sbom: boolean;
  supports_spdx: boolean;
  supports_cyclonedx: boolean;
  scan_sbom: boolean;
  find_cves: boolean;
  // the producer whose SBOM this scanner reads, when not its own
  sbom_from?: string;
};

export const TrivyConfig: ToolConfig = {
  name: 'trivy',
  produce_sbom: true,
  supports_spdx: true,
  supports_cyclonedx: true,
  scan_sbom: true,
  find_cves: true,
};

export const DockerScoutConfig: ToolConfig = {
  name: 'scout',
  produce_sbom: true,
  supports_spdx: true,
  supports_cyclonedx: true,
  scan_sbom: true,
  find_cves: true,
};

export const SyftConfig: ToolConfig = {
  name: 'syft',
  produce_sbom: true,
  supports_spdx: true,
  supports_cyclonedx: true,
  scan_sbom: false,
  find_cves: false,
};

export const GrypeConfig: ToolConfig = {
  name: 'grype',
  produce_sbom: false,
  supports_spdx: true,
  supports_cyclonedx: true,
  scan_sbom: true,
  find_cves: true,
  sbom_from: 'syft',
};

// Amazon Inspector's SBOM generator: CycloneDX only, no AWS account needed to generate.
export const AmazonConfig: ToolConfig = {
  name: 'amazon',
  produce_sbom: true,
  supports_spdx: false,
  supports_cyclonedx: true,
  scan_sbom: false,
  find_cves: false,
};

// OSV-Scanner and cdxgen read the image from a file skopeo downloads (they need a Docker daemon otherwise).
// osv-scanner's CycloneDX has no OS packages (it cannot make their purls): SPDX only
export const OsvConfig: ToolConfig = {
  name: 'osv',
  produce_sbom: true,
  supports_spdx: true,
  supports_cyclonedx: false,
  scan_sbom: false,
  find_cves: false,
};

// cdxgen's SPDX is 3.0, which SBOMVert cannot read: CycloneDX only
export const CdxgenConfig: ToolConfig = {
  name: 'cdxgen',
  produce_sbom: true,
  supports_spdx: false,
  supports_cyclonedx: true,
  scan_sbom: false,
  find_cves: false,
};

export type SupportedToolsType = {
  producers: Array<ToolConfig>;
  consumers: Array<ToolConfig>;
};

export const SupportedTools: SupportedToolsType = {
  // not Microsoft's sbom-tool (needs a Docker daemon) nor Google Artifact Analysis (needs GCP)
  producers: [TrivyConfig, SyftConfig, DockerScoutConfig, AmazonConfig, OsvConfig, CdxgenConfig],
  consumers: [TrivyConfig, GrypeConfig, DockerScoutConfig],
};

// The scanner reads the SBOM of this producer (grype reads syft's).
export const sbomProducerFor = (consumer: string) =>
  SupportedTools.consumers.find(t => t.name === consumer)?.sbom_from ?? consumer;

// Whether a producer can write SBOMs in a given format
export const producesFormat = (tool: ToolConfig, format: SbomFormat) => (format === 'spdx' ? tool.supports_spdx : tool.supports_cyclonedx);
