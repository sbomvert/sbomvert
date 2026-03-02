import type { Meta, StoryObj } from '@storybook/react';
import Heatmap, { HeatmapDatum } from '@/components/heatmap/HeatMap';

const meta: Meta<typeof Heatmap> = {
  title: 'UI/Heatmap',
  component: Heatmap,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Heatmap>;

const sampleData: HeatmapDatum[] = [
  { x: 'A', y: '1', value: 0.1 },
  { x: 'A', y: '2', value: 0.5 },
  { x: 'B', y: '1', value: 0.7 },
  { x: 'B', y: '2', value: 0.2 },
];

export const Default: Story = { args: { data: sampleData } };
