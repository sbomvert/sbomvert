import React from 'react';
import { render, screen, fireEvent } from '@/test-utils';
import { PackageDetailsTable } from '@/app/compare/components/PackageDetailsTable';
import { IMultiToolComparison } from '@/models/IComparisonResult';

const makeComparison = (): IMultiToolComparison => {
  const tools = [
    { name: 'Syft', version: '1', vendor: 'A', format: 'SPDX' },
    { name: 'Trivy', version: '1', vendor: 'B', format: 'SPDX' },
  ];
  const map = new Map<string, any>();
  map.set('a@1.0.0', {
    name: 'a',
    version: '1.0.0',
    packageType: 'library',
    foundInTools: ['Syft', 'Trivy'],
    uniqueSuppliers: ['Supplier A'],
    uniqueLicenses: ['MIT'],
    uniqueHashes: ['hash123'],
    uniquePurls: ['pkg:generic/a@1.0.0'],
    uniqueCpes: ['cpe:/a:a:a:1.0.0'],
    hasMetadataConflicts: false,
    metadataByTool: new Map([
      ['Syft', { 
        supplier: 'Supplier A', 
        license: 'MIT', 
        hash: 'hash123', 
        purl: 'pkg:generic/a@1.0.0',
        cpe: 'cpe:/a:a:a:1.0.0'
      }],
      ['Trivy', { 
        supplier: 'Supplier A', 
        license: 'MIT', 
        hash: 'hash123', 
        purl: 'pkg:generic/a@1.0.0',
        cpe: 'cpe:/a:a:a:1.0.0'
      }]
    ])
  });
  map.set('b@1.0.0', {
    name: 'b',
    version: '1.0.0',
    packageType: 'npm',
    license: 'MIT',
    foundInTools: ['Syft'],
    uniqueSuppliers: ['Supplier B'],
    uniqueLicenses: ['MIT'],
    uniqueHashes: ['hash456'],
    uniquePurls: ['pkg:npm/b@1.0.0'],
    uniqueCpes: ['cpe:/a:b:b:1.0.0'],
    hasMetadataConflicts: false,
    metadataByTool: new Map([
      ['Syft', { 
        supplier: 'Supplier B', 
        license: 'MIT', 
        hash: 'hash456', 
        purl: 'pkg:npm/b@1.0.0',
        cpe: 'cpe:/a:b:b:1.0.0'
      }]
    ])
  });
  return {
    imageId: 'img',
    tools,
    allPackages: map,
    statistics: { toolCounts: { Syft: 2, Trivy: 1 }, commonToAll: 1, uniquePerTool: { Syft: 1, Trivy: 0 } },
  } as any;
};

jest.mock('framer-motion', () => ({
  motion: { div: (p: any) => <div {...p} /> },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

test('filters and expands details', () => {
  const comparison = makeComparison();
  const { rerender } = render(<PackageDetailsTable comparison={comparison} filter="all" />);
  expect(screen.getByText('a')).toBeInTheDocument();
  expect(screen.getByText('b')).toBeInTheDocument();

  rerender(<PackageDetailsTable comparison={comparison} filter="unique" />);
  expect(screen.queryByText('a')).not.toBeInTheDocument();
  expect(screen.getByText('b')).toBeInTheDocument();

  rerender(<PackageDetailsTable comparison={comparison} filter="all" />);
  fireEvent.click(screen.getAllByText('Details')[0]);
  expect(screen.getByText(/Tool Detection/)).toBeInTheDocument();
});

test('shows empty state when no items for filter', () => {
  const tools = [
    { name: 'Syft', version: '1', vendor: 'A', format: 'SPDX' },
    { name: 'Trivy', version: '1', vendor: 'B', format: 'SPDX' },
  ];
  const map = new Map<string, any>();
  map.set('a@1.0.0', { package: { name: 'a', version: '1.0.0', packageType: 'library' }, foundInTools: ['Syft', 'Trivy'] });
  const comparison = {
    imageId: 'img',
    tools,
    allPackages: map,
    statistics: { toolCounts: { Syft: 1, Trivy: 1 }, commonToAll: 1, uniquePerTool: { Syft: 0, Trivy: 0 } },
  } as any;
  render(<PackageDetailsTable comparison={comparison} filter="unique" />);
  expect(screen.getByText(/No packages found matching/)).toBeInTheDocument();
});


