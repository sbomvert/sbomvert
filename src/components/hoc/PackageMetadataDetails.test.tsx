import { render, screen } from '@/test-utils';
import { PackageMetadataDetails } from '@/components/hoc/PackageMetadataDetails';
import { IPackageComparison } from '@/models/IComparisonResult';
import { IToolInfo } from '@/models/ISbom';

test('shows conflict when only one tool reports a CPE', () => {
  const tools: IToolInfo[] = [
    { name: 'toolA' } as any,
    { name: 'toolB' } as any,
  ];

  const packageData: IPackageComparison = {
    name: 'testpkg',
    version: '1.0.0',
    packageType: '' as any,
    foundInTools: ['toolA'],
    metadataByTool: new Map([
      ['toolA', { cpe: 'cpe:/a:vendor:product:1.0' } as any],
      ['toolB', {} as any],
    ]),
    hasMetadataConflicts: false,
    uniqueSuppliers: [],
    uniqueLicenses: [],
    uniquePurls: [],
    uniqueCpes: ['cpe:/a:vendor:product:1.0'],
    uniqueHashes: [],
  };

  const toolColors = ['#ff0000', '#00ff00'];

  render(
    <PackageMetadataDetails
      packageData={packageData}
      tools={tools}
      toolColors={toolColors}
    />
  );

  expect(screen.getByText(/Conflict detected \(single CPE\)/i)).toBeInTheDocument();
});
