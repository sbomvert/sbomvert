import type { Meta, StoryObj } from '@storybook/react';
import { CardHeader } from '@/components/card/CardHeader';

const meta: Meta<typeof CardHeader> = {
  title: 'UI/CardHeader',
  component: CardHeader,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: { children: { control: 'text' } },
};

export default meta;
type Story = StoryObj<typeof CardHeader>;

export const Default: Story = { args: { children: 'Header' } };
