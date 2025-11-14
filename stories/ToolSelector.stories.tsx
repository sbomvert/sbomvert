import type { Meta, StoryObj } from '@storybook/react';
import { ToolSelector } from '@/app/compare/components/ToolSelector';
import { TOOL_COLORS } from '@/lib/utils';

const meta: Meta<typeof ToolSelector> = {
  title: 'Compare/ToolSelector',
  component: ToolSelector,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ToolSelector>;

const mockTools = [
  { name: 'Syft', version: '0.100.0', vendor: 'Anchore', format: 'SPDX' as const },
  { name: 'Trivy', version: '0.48.0', vendor: 'Aqua Security', format: 'CycloneDX' as const },
  { name: 'Docker Scout', version: '1.2.0', vendor: 'Docker Inc.', format: 'SPDX' as const },
];

export const AllSelected: Story = {
  args: {
    tools: mockTools,
    selectedTools: new Set(['Syft', 'Trivy', 'Docker Scout']),
    onToolToggle: name => console.log('Toggled:', name),
    colors: TOOL_COLORS,
  },
};

export const TwoSelected: Story = {
  args: {
    tools: mockTools,
    selectedTools: new Set(['Syft', 'Trivy']),
    onToolToggle: name => console.log('Toggled:', name),
    colors: TOOL_COLORS,
  },
};

export const OneSelected: Story = {
  args: {
    tools: mockTools,
    selectedTools: new Set(['Syft']),
    onToolToggle: name => console.log('Toggled:', name),
    colors: TOOL_COLORS,
  },
};
