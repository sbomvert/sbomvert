import type { Meta, StoryObj } from '@storybook/react';
import { Selector } from '@/components/select/Selector';

const meta: Meta<typeof Selector> = {
  title: 'UI/Selector',
  component: Selector,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Selector>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    children: (
      <>
        <option value="a">Option A</option>
        <option value="b">Option B</option>
      </>
    ),
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    size: 'md',
    children: (
      <>
        <option value="x">X</option>
        <option value="y">Y</option>
      </>
    ),
  },
};
