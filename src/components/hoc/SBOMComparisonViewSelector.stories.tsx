import type { Meta, StoryObj } from '@storybook/react';
import { SBOMComparisonViewSelector } from '@/components/hoc/SBOMComparisonViewSelector';

const meta: Meta<typeof SBOMComparisonViewSelector> = {
  title: 'Compare/SBOMComparisonViewSelector',
  component: SBOMComparisonViewSelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SBOMComparisonViewSelector>;

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
