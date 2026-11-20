import type { Meta, StoryObj } from '@storybook/react';
import { mockComparison } from '@/components/hoc/storyFixtures';
import { TOOL_COLORS } from '@/lib/utils';
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
    packageData: mockComparison.allPackages.get(Array.from(mockComparison.allPackages.keys()).find(k => k.includes('openssl'))!)!,
    tools: mockComparison.tools,
    toolColors: TOOL_COLORS,
  },
};
