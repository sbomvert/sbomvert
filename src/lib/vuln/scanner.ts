export function ScanSPDXwithTool(
  tool: string,
  sbompath: string
): { cmd: string; args: string[] } | null {
  switch (tool) {
    case 'trivy':
      return {
        cmd: 'trivy',
        args: ['sbom', sbompath, '--format', 'json'],
      };

    case 'syft': // FIXME: should be grype
      return {
        cmd: 'grype',
        args: [`sbom:${sbompath}`, '-o=json'],
      };

    case 'scout':
      return {
        cmd: 'docker',
        args: ['scout', 'cves', `sbom://${sbompath}`, '--format=sarif'],
      };

    default:
      return null;
  }
}