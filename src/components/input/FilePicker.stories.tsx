import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { FilePicker } from '@/components/input/FilePicker';

const meta: Meta<typeof FilePicker> = {
  title: 'UI/FilePicker',
  component: FilePicker,
  tags: ['autodocs'],
  args: { id: 'file', onFile: fn() },
};

export default meta;
type Story = StoryObj<typeof FilePicker>;

export const Empty: Story = {};

export const Chosen: Story = { args: { fileName: 'syft.spdx.json' } };
