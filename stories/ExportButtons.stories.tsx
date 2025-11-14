import type { Meta, StoryObj } from '@storybook/react';
import { ExportButtons } from '@/app/compare/components/ExportButtons';

const meta: Meta<typeof ExportButtons> = {
  title: 'Compare/ExportButtons',
  component: ExportButtons,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ExportButtons>;

const mockComparison = {
  imageId: 'nginx:1.21',
  tools: [
    { name: 'Syft', version: '0.100.0', vendor: 'Anchore', format: 'SPDX' as const },
    { name: 'Trivy', version: '0.48.0', vendor: 'Aqua Security', format: 'CycloneDX' as const },
  ],
  allPackages: new Map(),
  statistics: {
    toolCounts: { Syft: 5, Trivy: 5 },
    commonToAll: 3,
    uniquePerTool: { Syft: 1, Trivy: 1 },
    packagesWithConflicts: 0,
  },
};

export const Default: Story = {
  args: {
    comparison: mockComparison,
  },
};
