import { detectSbomFormatDetailed, SbomFormat } from "./parser";

describe('detectSbomFormatDetailed', () => {
  describe('CycloneDX detection', () => {
    it('should detect CycloneDX format', () => {
      const input = JSON.stringify({
        bomFormat: 'CycloneDX',
        specVersion: '1.5',
      });

      const result = detectSbomFormatDetailed(input);

      expect(result).toBe<SbomFormat>('cyclonedx');
    });

    it('should prioritize CycloneDX over SPDX if both fields exist', () => {
      const input = JSON.stringify({
        bomFormat: 'CycloneDX',
        spdxVersion: 'SPDX-2.3',
      });

      const result = detectSbomFormatDetailed(input);

      expect(result).toBe('cyclonedx');
    });
  });

  describe('SPDX detection', () => {
    it('should detect SPDX format with valid version', () => {
      const input = JSON.stringify({
        spdxVersion: 'SPDX-2.3',
      });

      const result = detectSbomFormatDetailed(input);

      expect(result).toBe<SbomFormat>('spdx');
    });

    it('should detect SPDX with different valid versions', () => {
      const versions = ['SPDX-2.2', 'SPDX-2.1', 'SPDX-3.0'];

      for (const version of versions) {
        const input = JSON.stringify({ spdxVersion: version });
        expect(detectSbomFormatDetailed(input)).toBe('spdx');
      }
    });

    it('should NOT detect SPDX if prefix is incorrect', () => {
      const input = JSON.stringify({
        spdxVersion: '2.3', // missing SPDX- prefix
      });

      const result = detectSbomFormatDetailed(input);

      expect(result).toBe('unknown');
    });
  });

  describe('Unknown format', () => {
    it('should return unknown for valid JSON with no SBOM markers', () => {
      const input = JSON.stringify({
        foo: 'bar',
      });

      const result = detectSbomFormatDetailed(input);

      expect(result).toBe('unknown');
    });

    it('should return unknown for empty object', () => {
      const result = detectSbomFormatDetailed('{}');
      expect(result).toBe('unknown');
    });

    it('should return unknown for null JSON', () => {
      const result = detectSbomFormatDetailed('null');
      expect(result).toBe('unknown');
    });
  });

  describe('Invalid JSON handling', () => {
    it('should return unknown for malformed JSON', () => {
      const input = '{ invalid json';

      const result = detectSbomFormatDetailed(input);

      expect(result).toBe('unknown');
    });

    it('should return unknown for empty string', () => {
      const result = detectSbomFormatDetailed('');

      expect(result).toBe('unknown');
    });

    it('should return unknown for non-JSON string', () => {
      const result = detectSbomFormatDetailed('just some text');

      expect(result).toBe('unknown');
    });
  });

  describe('Edge cases', () => {
    it('should handle bomFormat with wrong casing', () => {
      const input = JSON.stringify({
        bomFormat: 'cyclonedx', // wrong case
      });

      const result = detectSbomFormatDetailed(input);

      expect(result).toBe('unknown');
    });

    it('should handle spdxVersion as non-string', () => {
      const input = JSON.stringify({
        spdxVersion: 2.3,
      });

      const result = detectSbomFormatDetailed(input);

      expect(result).toBe('unknown');
    });

    it('should ignore nested fields', () => {
      const input = JSON.stringify({
        metadata: {
          bomFormat: 'CycloneDX',
        },
      });

      const result = detectSbomFormatDetailed(input);

      expect(result).toBe('unknown');
    });

    it('should handle additional unrelated fields safely', () => {
      const input = JSON.stringify({
        bomFormat: 'CycloneDX',
        extra: { nested: true },
        array: [1, 2, 3],
      });

      const result = detectSbomFormatDetailed(input);

      expect(result).toBe('cyclonedx');
    });
  });
});