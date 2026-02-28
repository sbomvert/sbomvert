import type { Meta, StoryObj } from '@storybook/react';
import { ComparisonViewSelector } from '@/components/hoc/ComparisonViewSelector';

const meta: Meta<typeof ComparisonViewSelector> = {
  title: 'Compare/ComparisonViewSelector',
  component: ComparisonViewSelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ComparisonViewSelector>;

export const SummaryView: Story = {
  args: {
    viewMode: 'summary',
    onViewModeChange: mode => console.log('View mode:', mode),
  },
};

export const TableView: Story = {
  args: {
    viewMode: 'table',
    onViewModeChange: mode => console.log('View mode:', mode),
  },
};

export const ChartView: Story = {
  args: {
    viewMode: 'chart',
    onViewModeChange: mode => console.log('View mode:', mode),
  },
};
