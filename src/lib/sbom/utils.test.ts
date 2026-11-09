import { ISbom } from '@/models/ISbom';
import { capitalizeToolName, withFormatInName } from './utils';

describe('capitalizeToolName', () => {
  it('capitalizes the first letter only', () => {
    expect(capitalizeToolName('trivy')).toBe('Trivy');
    expect(capitalizeToolName('docker-scout')).toBe('Docker-scout');
  });

  it('keeps an already capitalized name and an empty string', () => {
    expect(capitalizeToolName('Syft')).toBe('Syft');
    expect(capitalizeToolName('')).toBe('');
  });
});

describe('withFormatInName', () => {
  const sbom = (format: 'SPDX' | 'CycloneDX') =>
    ({ tool: 'Trivy', format, toolInfo: { name: 'Trivy', format }, packages: [] }) as unknown as ISbom;

  it('gives one tool in two formats two distinct names', () => {
    const [a, b] = [sbom('SPDX'), sbom('CycloneDX')].map(withFormatInName);
    expect(a.tool).toBe('Trivy (SPDX)');
    expect(a.toolInfo.name).toBe('Trivy (SPDX)');
    expect(b.tool).toBe('Trivy (CDX)');
  });
});
