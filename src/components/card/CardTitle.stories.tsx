import type { Meta, StoryObj } from '@storybook/react';
import { CardTitle } from '@/components/card/CardTitle';

const meta: Meta<typeof CardTitle> = {
  title: 'UI/CardTitle',
  component: CardTitle,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: { children: { control: 'text' } },
};

export default meta;
type Story = StoryObj<typeof CardTitle>;

export const Default: Story = { args: { children: 'Title' } };
