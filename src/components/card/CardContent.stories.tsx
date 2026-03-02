import type { Meta, StoryObj } from '@storybook/react';
import { CardContent } from '@/components/card/CardContent';

const meta: Meta<typeof CardContent> = {
  title: 'UI/CardContent',
  component: CardContent,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: { children: { control: 'text' } },
};

export default meta;
type Story = StoryObj<typeof CardContent>;

export const Default: Story = { args: { children: 'Content' } };
