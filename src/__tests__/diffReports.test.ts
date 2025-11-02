import { compareMultipleTools } from '@/lib/diffReports';
import { ISbom } from '@/models/ISbom';

describe('compareMultipleTools', () => {
  const mockSbom1: ISbom = {
    format: 'SPDX',
    tool: 'Tool1',
    toolInfo: { name: 'Tool1', version: '1.0.0', vendor: 'Vendor1', format: 'SPDX' },
    imageId: 'test:1.0',
    timestamp: '2024-01-01T00:00:00Z',
    packages: [
      { name: 'pkg1', version: '1.0.0', packageType: 'library' },
      { name: 'pkg2', version: '2.0.0', packageType: 'binary' },
    ],
  };

  const mockSbom2: ISbom = {
    format: 'CycloneDX',
    tool: 'Tool2',
    toolInfo: { name: 'Tool2', version: '2.0.0', vendor: 'Vendor2', format: 'CycloneDX' },
    imageId: 'test:1.0',
    timestamp: '2024-01-01T00:00:00Z',
    packages: [
      { name: 'pkg1', version: '1.0.0', packageType: 'library' },
      { name: 'pkg3', version: '3.0.0', packageType: 'npm' },
    ],
  };

  it('should compare two SBOMs correctly', () => {
    const result = compareMultipleTools([mockSbom1, mockSbom2]);

    expect(result.allPackages.size).toBe(3);
    expect(result.statistics.commonToAll).toBe(1);
    expect(result.statistics.uniquePerTool['Tool1']).toBe(1);
    expect(result.statistics.uniquePerTool['Tool2']).toBe(1);
  });

  it('should track which tools found each package', () => {
    const result = compareMultipleTools([mockSbom1, mockSbom2]);

    const pkg1 = result.allPackages.get('pkg1@1.0.0');
    expect(pkg1?.foundInTools).toEqual(['Tool1', 'Tool2']);

    const pkg2 = result.allPackages.get('pkg2@2.0.0');
    expect(pkg2?.foundInTools).toEqual(['Tool1']);
  });

  it('should calculate tool counts correctly', () => {
    const result = compareMultipleTools([mockSbom1, mockSbom2]);

    expect(result.statistics.toolCounts['Tool1']).toBe(2);
    expect(result.statistics.toolCounts['Tool2']).toBe(2);
  });
});
