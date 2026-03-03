export function ScanSPDXwithTool(tool: string, sbompath: string) {
  switch (tool) {
    case 'trivy':
      return `trivy sbom ${sbompath} --format json`;

    case 'syft': // FIXME: should be grype
      return `grype sbom:${sbompath} -o=json`;

    case 'scout':
      return `docker scout cves sbom://${sbompath} --format=sarif`;

    default:
      return null;
  }
}