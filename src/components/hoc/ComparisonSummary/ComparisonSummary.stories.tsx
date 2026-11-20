import type { Meta, StoryObj } from '@storybook/react';
import { mockComparison } from '@/components/hoc/storyFixtures';
import { MultiToolSummary } from './ComparisonSummary';

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
