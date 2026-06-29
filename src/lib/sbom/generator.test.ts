import { GenerateCycloneDXSBOMwithTool, GenerateSPDXSBOMwithTool } from './generator';

describe('GenerateSPDXSBOMwithTool', () => {
  test('returns correct command for trivy', () => {
    expect(GenerateSPDXSBOMwithTool('trivy', 'myimage')).toStrictEqual({"args": ["image", "--format", "spdx-json", "myimage"], "cmd": "trivy"});
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

describe('GenerateCycloneDXSBOMwithTool', () => {
  test('returns correct command for trivy', () => {
    expect(GenerateCycloneDXSBOMwithTool('trivy', 'myimage')).toStrictEqual({"args": ["image", "--format", "cyclonedx", "myimage"], "cmd": "trivy"});
  });

  test('returns correct command for syft', () => {
    expect(GenerateCycloneDXSBOMwithTool('syft', 'myimage')).toStrictEqual({"args": ["myimage", "-o=cyclonedx-json"], "cmd": "syft"});
  });

  test('returns correct command for scout', () => {
    expect(GenerateCycloneDXSBOMwithTool('scout', 'myimage')).toStrictEqual({"args": ["scout", "sbom", "myimage", "--format=cyclonedx"], "cmd": "docker"});
  });

  test('returns null for unknown tool', () => {
    expect(GenerateCycloneDXSBOMwithTool('unknown', 'myimage')).toBeNull();
  });
});
