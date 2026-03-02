
export function GenerateSPDXSBOMwithTool(tool: string, image: string) {
  switch (tool) {
    case 'trivy':
      return `trivy image --format spdx-json ${image}`;

    case 'syft':
      return `syft ${image} -o=spdx-json`;

    case 'scout':
      return `docker scout sbom ${image} --format=spdx`;

    default:
      return null;
  }
}


function GenerateCycloneDXSBOMwithTool(tool: string, image: string) {
  switch (tool) {
    case 'trivy':
      return `trivy image --format cyclonedx --output sbom.cdx.json ${image}`;

    case 'syft':
      return `syft ${image} -o cyclonedx-json`;

    case 'scout':
      return `docker scout sbom ${image} --format cyclonedx`;

    default:
      return null;
  }
}