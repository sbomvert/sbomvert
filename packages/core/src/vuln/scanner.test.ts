import { ScanSbomWithTool } from './scanner';

describe('scanner.ScanSbomWithTool', () => {
  test('returns correct command for trivy', () => {
    expect(ScanSbomWithTool('trivy', 'image.sbom')).toStrictEqual({
      args: ['sbom', 'image.sbom', '--skip-db-update', '--format', 'json'],
      cmd: 'trivy',
    });
  });

  test('returns correct command for grype', () => {
    expect(ScanSbomWithTool('grype', 'path.sbom')).toStrictEqual({
      args: ['sbom:path.sbom', '-o=json'],
      cmd: 'grype',
    });
  });

  test('returns correct command for scout', () => {
    expect(ScanSbomWithTool('scout', 'sbom.json')).toStrictEqual({
      args: ['scout', 'cves', 'sbom://sbom.json', '--format=sarif'],
      cmd: 'docker',
    });
  });

  test('returns null for unknown tool', () => {
    expect(ScanSbomWithTool('unknown', 'file')).toBeNull();
  });
});
