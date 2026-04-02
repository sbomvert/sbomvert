import { cn, getPackageTypeColor, computeJaccard } from '@/lib/utils';

describe('Utils functions', () => {
  describe('cn function', () => {
    it('should merge class names correctly', () => {
      const result = cn('class1', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle empty inputs', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle null and undefined inputs', () => {
      const result = cn('class1', null, 'class2', undefined);
      expect(result).toBe('class1 class2');
    });

    it('should handle multiple spaces and empty strings', () => {
      const result = cn('class1', '', 'class2', '   ');
      expect(result).toBe('class1 class2');
    });
  });

  describe('getPackageTypeColor function', () => {
    it('should return correct color for os type', () => {
      const result = getPackageTypeColor('os');
      expect(result).toContain('bg-purple-100');
      expect(result).toContain('text-purple-800');
    });

    it('should return correct color for npm type', () => {
      const result = getPackageTypeColor('npm');
      expect(result).toContain('bg-red-100');
      expect(result).toContain('text-red-800');
    });

    it('should return correct color for python type', () => {
      const result = getPackageTypeColor('python');
      expect(result).toContain('bg-blue-100');
      expect(result).toContain('text-blue-800');
    });

    it('should return correct color for maven type', () => {
      const result = getPackageTypeColor('maven');
      expect(result).toContain('bg-orange-100');
      expect(result).toContain('text-orange-800');
    });

    it('should return correct color for binary type', () => {
      const result = getPackageTypeColor('binary');
      expect(result).toContain('bg-gray-100');
      expect(result).toContain('text-gray-800');
    });

    it('should return correct color for library type', () => {
      const result = getPackageTypeColor('library');
      expect(result).toContain('bg-green-100');
      expect(result).toContain('text-green-800');
    });

    it('should return default color for unknown type', () => {
      const result = getPackageTypeColor('unknown');
      expect(result).toContain('bg-gray-100');
      expect(result).toContain('text-gray-800');
    });

    it('should return default color for undefined type', () => {
      const result = getPackageTypeColor(undefined);
      expect(result).toContain('bg-gray-100');
      expect(result).toContain('text-gray-800');
    });
  });

  describe('computeJaccard function', () => {
    it('should handle empty input correctly', () => {
      const result = computeJaccard({}, 'packages');
      expect(result).toHaveLength(0);
    });

    it('should compute jaccard index for single tool', () => {
      const input = {
        tool1: { packages: ['pkg1', 'pkg2'], purls: ['purl1', 'purl2'] }
      };
      const result = computeJaccard(input, 'packages');
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(1);
      expect(result[0].x).toBe('tool1');
      expect(result[0].y).toBe('tool1');
    });

    it('should compute jaccard index for multiple tools with no overlap', () => {
      const input = {
        tool1: { packages: ['pkg1', 'pkg2'], purls: ['purl1', 'purl2'] },
        tool2: { packages: ['pkg3', 'pkg4'], purls: ['purl3', 'purl4'] }
      };
      const result = computeJaccard(input, 'packages');
      expect(result).toHaveLength(4); // 2 diagonal + 2 off-diagonal
      // The diagonal should be 1 (self-comparison)
      expect(result[0].value).toBe(1);
      // The off-diagonal should be 0 (no overlap)
      expect(result[1].value).toBe(0);
      expect(result[2].value).toBe(0);
      expect(result[3].value).toBe(1);
    });

    it('should compute jaccard index for multiple tools with partial overlap', () => {
      const input = {
        tool1: { packages: ['pkg1', 'pkg2'], purls: ['purl1', 'purl2'] },
        tool2: { packages: ['pkg2', 'pkg3'], purls: ['purl2', 'purl3'] }
      };
      const result = computeJaccard(input, 'packages');
      expect(result).toHaveLength(4);
      // The diagonal should be 1 (self-comparison)
      expect(result[0].value).toBe(1);
      // The off-diagonal should be 1/3 (1 common element out of 3 total)
      expect(result[1].value).toBeCloseTo(0.333, 3);
      expect(result[2].value).toBeCloseTo(0.333, 3);
      expect(result[3].value).toBe(1);
    });

    it('should handle empty sets correctly', () => {
      const input = {
        tool1: { packages: [], purls: [] },
        tool2: { packages: [], purls: [] }
      };
      const result = computeJaccard(input, 'packages');
      expect(result).toHaveLength(4);
      expect(result[0].value).toBe(1); // Self comparison
      expect(result[1].value).toBe(0); // Empty sets comparison
      expect(result[2].value).toBe(0); // Empty sets comparison (reverse)
      expect(result[3].value).toBe(1); // Self comparison (reverse)
    });

    it('should handle mixed empty and non-empty sets', () => {
      const input = {
        tool1: { packages: ['pkg1'], purls: ['purl1'] },
        tool2: { packages: [], purls: [] }
      };
      const result = computeJaccard(input, 'packages');
      expect(result).toHaveLength(4);
      expect(result[0].value).toBe(1); // Self comparison
      expect(result[1].value).toBe(0); // One empty set comparison
      expect(result[2].value).toBe(0); // One empty set comparison (reverse)
      expect(result[3].value).toBe(1); // Self comparison (reverse)
    });
  });
});