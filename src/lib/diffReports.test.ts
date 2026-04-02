import { compareMultipleTools } from './diffReports';
import { ISbom } from '@/models/ISbom';

// Helper to create minimal SBOM objects
const createSbom = (tool: string, packages: ISbom['packages']): ISbom => ({
  format: 'SPDX',
  tool,
  toolInfo: { name: tool },
  imageId: 'image-123',
  packages,
  timestamp: new Date().toISOString(),
});

describe('diffReports.compareMultipleTools', () => {
  test('produces correct comparisons and statistics', () => {
    const sbom1 = createSbom('trivy', [
      {
        name: 'pkgA',
        version: '1.0.0',
        supplier: 'SupplierA',
        license: 'MIT',
        packageType: 'npm',
        purl: 'pkg:npm/pkgA@1.0.0',
      },
      {
        name: 'pkgB',
        version: '2.0.0',
        packageType: 'npm',
        purl: 'pkg:npm/pkgB@2.0.0',
      },
    ]);

    const sbom2 = createSbom('syft', [
      {
        name: 'pkgA',
        version: '1.0.0',
        supplier: 'SupplierA',
        license: 'Apache-2.0', // different license -> conflict
        packageType: 'npm',
        purl: 'pkg:npm/pkgA@1.0.0',
      },
      {
        name: 'pkgC',
        version: '3.0.0',
        packageType: 'npm',
        purl: 'pkg:npm/pkgC@3.0.0',
      },
    ]);

    const result = compareMultipleTools([sbom1, sbom2]);

    // Verify package map size (A, B, C)
    expect(result.allPackages.size).toBe(3);

    // Packages with metadata conflicts (pkgA license differs)
    expect(result.statistics.packagesWithConflicts).toBe(1);

    // Common to both tools (pkgA)
    expect(result.statistics.commonToAll).toBe(1);

    // Unique per tool counts
    expect(result.statistics.uniquePerTool).toEqual({ trivy: 1, syft: 1 });

    // Tool package counts
    expect(result.statistics.toolCounts).toEqual({ trivy: 2, syft: 2 });

    // Verify that pkgA has metadata conflict flag set
    const pkgAComp = result.allPackages.get('pkgA@1.0.0');
    expect(pkgAComp?.hasMetadataConflicts).toBe(true);
    // Verify unique license list includes both licenses
    expect(pkgAComp?.uniqueLicenses.sort()).toEqual(['Apache-2.0', 'MIT'].sort());
  });
});
