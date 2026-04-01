import { ScanSPDXwithTool } from './scanner';

describe('scanner.ScanSPDXwithTool', () => {
  test('returns correct command for trivy', () => {
    expect(ScanSPDXwithTool('trivy', 'image.sbom')).toBe('trivy sbom image.sbom --format json');
  });

  test('returns correct command for syft', () => {
    expect(ScanSPDXwithTool('syft', 'path.sbom')).toBe('grype sbom:path.sbom -o=json');
  });

  test('returns correct command for scout', () => {
    expect(ScanSPDXwithTool('scout', 'sbom.json')).toBe('docker scout cves sbom://sbom.json --format=sarif');
  });

  test('returns null for unknown tool', () => {
    expect(ScanSPDXwithTool('unknown', 'file')).toBeNull();
  });
});
