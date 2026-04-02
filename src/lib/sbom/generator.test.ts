import { GenerateSPDXSBOMwithTool } from './generator';

describe('GenerateSPDXSBOMwithTool', () => {
  test('returns correct command for trivy', () => {
    expect(GenerateSPDXSBOMwithTool('trivy', 'myimage')).toStrictEqual({"args": ["image", "--format spdx-json", "myimage"], "cmd": "trivy"});
  });

  test('returns correct command for syft', () => {
    expect(GenerateSPDXSBOMwithTool('syft', 'myimage')).toStrictEqual({"args": ["myimage", "-o=spdx-json"], "cmd": "syft"});
  });

  test('returns correct command for scout', () => {
    expect(GenerateSPDXSBOMwithTool('scout', 'myimage')).toStrictEqual({"args": ["scout", "sbom", "myimage", "--format=spdx"], "cmd": "docker"});
  });

  test('returns null for unknown tool', () => {
    expect(GenerateSPDXSBOMwithTool('unknown', 'myimage')).toBeNull();
  });
});
