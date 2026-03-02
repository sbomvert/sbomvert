export type ToolConfig = {
    name: string;
    produce_sbom: boolean;
    supports_spdx: boolean;
    supports_cyclonedx: boolean;
    scan_sbom: boolean;
    find_cves: boolean;
};

export const TrivyConfig: ToolConfig = {
    name: "trivy",
    produce_sbom: true,
    supports_spdx: true,
    supports_cyclonedx: true,
    scan_sbom: true,
    find_cves: true,
};


export const DockerScoutConfig: ToolConfig = {
    name: "scout",
    produce_sbom: true,
    supports_spdx: true,
    supports_cyclonedx: true,
    scan_sbom: true,
    find_cves: true,
};

export const SyftConfig: ToolConfig = {
    name: "syft",
    produce_sbom: true,
    supports_spdx: true,
    supports_cyclonedx: true,
    scan_sbom: false,
    find_cves: false,
};


export const GrypeConfig: ToolConfig = {
    name: "grype",
    produce_sbom: false,
    supports_spdx: false,
    supports_cyclonedx: true,
    scan_sbom: true,
    find_cves: true,
};

export type SupportedToolsType = {
producers: Array<ToolConfig>;
consumers: Array<ToolConfig>;
};

export const SupportedTools:SupportedToolsType = {
"producers": [TrivyConfig,SyftConfig,DockerScoutConfig],
"consumers": [TrivyConfig,GrypeConfig,DockerScoutConfig]
}