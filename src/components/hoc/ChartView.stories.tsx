import type { Meta, StoryObj } from '@storybook/react';
import { ChartView } from '@/components/hoc/ChartView';

const meta: Meta<typeof ChartView> = {
  title: 'UI/ChartView',
  component: ChartView,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof ChartView>;

const mockComparison = {
  tools: [
    { name: 'syft' },
    { name: 'trivy' },
  ],
  allPackages: new Map([
    ['pkg-a', { foundInTools: ['syft', 'trivy'], name: 'pkg-a', version: '1.0.0' }],
    ['pkg-b', { foundInTools: ['syft'],           name: 'pkg-b', version: '2.3.1' }],
  ]),
  statistics: {
    commonToAll:    1,
    toolCounts:     { syft: 2, trivy: 1 },
    uniquePerTool:  { syft: 1, trivy: 0 },
  },
};

export const Default: Story = {
  args: {
    comparison: mockComparison as any,
  },
};