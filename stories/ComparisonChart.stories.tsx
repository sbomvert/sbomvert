import type { Meta, StoryObj } from '@storybook/react';
import { MultiToolSummary } from '@/app/compare/components/ComparisonSummary';
import { IMultiToolComparison } from '@/models/IComparisonResult';

const mockComparison: IMultiToolComparison = {
  imageId: 'nginx:1.21',
  tools: [
    { name: 'Syft', version: '0.100.0', vendor: 'Anchore', format: 'SPDX' },
    { name: 'Trivy', version: '0.48.0', vendor: 'Aqua Security', format: 'CycloneDX' },
    { name: 'Docker Scout', version: '1.2.0', vendor: 'Docker Inc.', format: 'SPDX' },
  ],
  allPackages: new Map([
    [
      'readline@8.2-1.3',
      {
        name: 'readline',
        version: '8.2-1.3',
        packageType: 'os',
        foundInTools: ['Amazon', 'Docker'],
        metadataByTool: new Map([
          [
            'Amazon',
            {
              purl: 'pkg:dpkg/readline@8.2-1.3?arch=AMD64&epoch=0&upstream=readline-8.2-1.3.src.dpkg',
            },
          ],
          [
            'Docker',
            {
              purl: 'pkg:dpkg/readline@8.2-1.3?arch=AMD64&epoch=0&upstream=readline-8.2-1.3.src.dpkg',
            },
          ],
        ]),
        hasMetadataConflicts: false,
        uniqueSuppliers: [],
        uniqueLicenses: [],
        uniquePurls: [
          'pkg:dpkg/readline@8.2-1.3?arch=AMD64&epoch=0&upstream=readline-8.2-1.3.src.dpkg',
        ],
        uniqueCpes: [],
        uniqueHashes: [],
      },
    ],
  ]),
  statistics: {
    toolCounts: {
      Syft: 5,
      Trivy: 5,
      'Docker Scout': 4,
    },
    commonToAll: 3,
    uniquePerTool: {
      Syft: 1,
      Trivy: 1,
      'Docker Scout': 0,
    },
    packagesWithConflicts: 0,
  },
};

const meta: Meta<typeof MultiToolSummary> = {
  title: 'Comparison/MultiToolSummary',
  component: MultiToolSummary,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof MultiToolSummary>;

export const Default: Story = {
  args: {
    comparison: mockComparison,
  },
};
