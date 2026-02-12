
import { detectSbomFormatDetailed, SbomFormat } from '@/lib/sbom/parser';

describe('detectSbomFormatDetailed', () => {
  it('should return "cyclonedx" for CycloneDX SBOM', () => {
    const cyclonedxSbom = JSON.stringify({
      bomFormat: 'CycloneDX',
      version: '1.4',
      components: []
    });

    const result: SbomFormat = detectSbomFormatDetailed(cyclonedxSbom);
    expect(result).toBe('cyclonedx');
  });

  it('should return "spdx" for SPDX SBOM', () => {
    const spdxSbom = JSON.stringify({
      spdxVersion: 'SPDX-2.2',
      dataLicense: 'CC0-1.0'
    });

    const result: SbomFormat = detectSbomFormatDetailed(spdxSbom);
    expect(result).toBe('spdx');
  });

  it('should return "unknown" for valid JSON that is not SPDX or CycloneDX', () => {
    const unknownSbom = JSON.stringify({
      randomField: 'value',
      anotherField: 123
    });

    const result: SbomFormat = detectSbomFormatDetailed(unknownSbom);
    expect(result).toBe('unknown');
  });

  it('should return "unknown" for invalid JSON', () => {
    const invalidJson = '{ this is not: "json" }';

    const result: SbomFormat = detectSbomFormatDetailed(invalidJson);
    expect(result).toBe('unknown');
  });

  it('should return "unknown" for empty string', () => {
    const empty = '';

    const result: SbomFormat = detectSbomFormatDetailed(empty);
    expect(result).toBe('unknown');
  });

  it('should return "spdx" even if spdxVersion has extra text after SPDX-', () => {
    const spdxSbom = JSON.stringify({
      spdxVersion: 'SPDX-2.3-extra',
      dataLicense: 'CC0-1.0'
    });

    const result: SbomFormat = detectSbomFormatDetailed(spdxSbom);
    expect(result).toBe('spdx');
  });
});
