import { GenerateSPDXSBOMwithTool } from './generator';

describe('GenerateSPDXSBOMwithTool', () => {
  test('returns correct command for trivy', () => {
    expect(GenerateSPDXSBOMwithTool('trivy', 'myimage')).toBe('trivy image --format spdx-json myimage');
  });

  test('returns correct command for syft', () => {
    expect(GenerateSPDXSBOMwithTool('syft', 'myimage')).toBe('syft myimage -o=spdx-json');
  });

  test('returns correct command for scout', () => {
    expect(GenerateSPDXSBOMwithTool('scout', 'myimage')).toBe('docker scout sbom myimage --format=spdx');
  });

  test('returns null for unknown tool', () => {
    expect(GenerateSPDXSBOMwithTool('unknown', 'myimage')).toBeNull();
  });
});
