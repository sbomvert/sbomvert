import type { Meta, StoryObj } from '@storybook/react';
import { PackageMetadataDetails } from '@/components/hoc/PackageMetadataDetails';

const meta: Meta<typeof PackageMetadataDetails> = {
  title: 'UI/PackageMetadataDetails',
  component: PackageMetadataDetails,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PackageMetadataDetails>;

export const Default: Story = {
  args: {
    packageData: {} as any,
    tools: [] as any[],
    toolColors: [],
  },
};
