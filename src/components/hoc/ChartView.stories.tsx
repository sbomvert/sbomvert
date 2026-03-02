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

export const Default: Story = {
  args: { comparison: {} as any },
};
