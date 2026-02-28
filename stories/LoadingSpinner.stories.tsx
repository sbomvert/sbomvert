import type { Meta, StoryObj } from '@storybook/react';
import { LoadingSpinner } from '@/components/hoc/LoadingSpinner';

const meta: Meta<typeof LoadingSpinner> = {
  title: 'Components/LoadingSpinner',
  component: LoadingSpinner,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof LoadingSpinner>;

export const Default: Story = {
  args: {},
};

export const CustomMessage: Story = {
  args: {
    message: 'Loading SBOM files...',
  },
};
