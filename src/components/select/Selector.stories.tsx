import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Selector } from '@/components/select/Selector';

const meta: Meta<typeof Selector> = {
  title: 'UI/Selector',
  component: Selector,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: {
    size: 'md',
    placeholder: 'Choose a tool',
    options: [
      { value: 'syft', label: 'Syft' },
      { value: 'trivy', label: 'Trivy' },
      { value: 'scout', label: 'Docker Scout' },
    ],
    onValueChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Selector>;

export const Default: Story = { args: { variant: 'primary' } };

export const Outline: Story = { args: { variant: 'outline-solid' } };

export const Secondary: Story = { args: { variant: 'secondary', defaultValue: 'trivy' } };

export const Disabled: Story = { args: { variant: 'disabled' } };
