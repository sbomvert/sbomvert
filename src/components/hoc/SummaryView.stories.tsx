import type { Meta, StoryObj } from '@storybook/react';
import { SummaryView } from '@/components/hoc/SummaryView';

const meta: Meta<typeof SummaryView> = {
  title: 'UI/SummaryView',
  component: SummaryView,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SummaryView>;

export const Default: Story = { args: { comparison: {} as any } };
