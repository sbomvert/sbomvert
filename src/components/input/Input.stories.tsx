import type { Meta, StoryObj } from '@storybook/react';
import { Input } from '@/components/input/Input';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['default', 'error'] },
    placeholder: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = { args: { placeholder: 'Enter text', variant: 'default' } };
export const Error: Story = { args: { placeholder: 'Error input', variant: 'error' } };
