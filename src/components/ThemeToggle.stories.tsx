import type { Meta, StoryObj } from '@storybook/react';
import { ThemeToggle } from '@/components/ThemeToggle';

const meta: Meta<typeof ThemeToggle> = {
  title: 'UI/ThemeToggle',
  component: ThemeToggle,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    isDark: { control: 'boolean' },
    toggle: { action: 'toggled' },
  },
};

export default meta;
type Story = StoryObj<typeof ThemeToggle>;

export const Light: Story = {
  args: { isDark: false, toggle: () => {} },
};

export const Dark: Story = {
  args: { isDark: true, toggle: () => {} },
};
