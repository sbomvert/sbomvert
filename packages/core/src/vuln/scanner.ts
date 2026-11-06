export function ScanSPDXwithTool(
  tool: string,
  sbompath: string
): { cmd: string; args: string[] } | null {
  switch (tool) {
    case 'trivy':
      return {
        cmd: 'trivy',
        // the worker keeps the vulnerability DB cached and refreshes it between jobs
        args: ['sbom', sbompath, '--skip-db-update', '--format', 'json'],
      };

    case 'grype':
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
