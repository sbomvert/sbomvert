import type { Meta, StoryObj } from '@storybook/react';
import { PackageDetailsTable } from '@/components/hoc/PackageDetailsTable';

const meta: Meta<typeof PackageDetailsTable> = {
  title: 'UI/PackageDetailsTable',
  component: PackageDetailsTable,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PackageDetailsTable>;

export const Default: Story = { args: { comparison: {} as any, filter: '' } };
