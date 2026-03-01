import type { Meta, StoryObj } from '@storybook/react';
import { TableView } from '@/components/hoc/TableView';

const meta: Meta<typeof TableView> = {
  title: 'UI/TableView',
  component: TableView,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TableView>;

export const Default: Story = { args: { comparison: {} as any } };
