import { ScanSPDXwithTool } from './scanner';

describe('scanner.ScanSPDXwithTool', () => {
  test('returns correct command for trivy', () => {
    expect(ScanSPDXwithTool('trivy', 'image.sbom')).toStrictEqual({"args": ["sbom", "image.sbom", "--format", "json"], "cmd": "trivy"});
  });

  test('returns correct command for syft', () => {
    expect(ScanSPDXwithTool('syft', 'path.sbom')).toStrictEqual({args:['sbom:path.sbom', '-o=json'],cmd: 'grype'});
  });

  test('returns correct command for scout', () => {
    expect(ScanSPDXwithTool('scout', 'sbom.json')).toStrictEqual({"args": ["scout", "cves", "sbom://sbom.json", "--format=sarif"], "cmd": "docker"});
  });

  test('returns null for unknown tool', () => {
    expect(ScanSPDXwithTool('unknown', 'file')).toBeNull();
  });
});
