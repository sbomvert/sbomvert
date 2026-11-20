import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { FilterPill } from '@/components/pill/FilterPill';
import { TOOL_COLORS } from '@/lib/utils';

const meta: Meta<typeof FilterPill> = {
  title: 'UI/FilterPill',
  component: FilterPill,
  tags: ['autodocs'],
  args: { onClick: fn(), children: 'All' },
};

export default meta;
type Story = StoryObj<typeof FilterPill>;

export const Active: Story = { args: { active: true } };

export const Inactive: Story = { args: { active: false } };

export const ToolColor: Story = { args: { active: false, color: TOOL_COLORS[1], children: 'only trivy' } };

export const ToolColorActive: Story = { args: { active: true, color: TOOL_COLORS[1], children: 'only trivy' } };
