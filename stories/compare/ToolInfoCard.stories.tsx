import { ToolInfoCard } from '@/app/compare/components/ToolInfoCard';
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta<typeof ToolInfoCard> = {
  title: 'Compare/ToolInfoCard',
  component: ToolInfoCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type ToolInfoCardStory = StoryObj<typeof ToolInfoCard>;

export const ToolInfoCardStory: ToolInfoCardStory = {
  args: {
    color: '#4f46e5',
    toolInfo: {
      name: 'Trivy',
      vendor: 'Aquasecurity',
      version: '1.0.0',
      format: 'SPDX',
    },
  },
};
