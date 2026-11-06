// The SBOM and vulnerability tools SBOMVert can run: what the scan form offers, and which SBOM each
// scanner reads. The commands themselves are in sbom/generator.ts and vuln/scanner.ts, the report
// parsers in vuln/vulnutils.ts (VULN_EXTRACTORS); tools.test.ts checks they all agree with this list.

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

export type SupportedToolsType = {
  producers: Array<ToolConfig>;
  consumers: Array<ToolConfig>;
};

export const SupportedTools: SupportedToolsType = {
  producers: [TrivyConfig, SyftConfig, DockerScoutConfig],
  // not scout: its reports have no parser yet (vuln/vulnutils.ts VULN_EXTRACTORS)
  consumers: [TrivyConfig, GrypeConfig],
};

// The scanner reads the SBOM of this producer (grype reads syft's).
export const sbomProducerFor = (consumer: string) =>
  SupportedTools.consumers.find(t => t.name === consumer)?.sbom_from ?? consumer;
