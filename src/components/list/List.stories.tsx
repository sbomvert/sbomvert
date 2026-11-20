import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { List } from '@/components/list/List';

type File = { name: string };

const meta: Meta<typeof List<File>> = {
  title: 'UI/List',
  component: List,
  tags: ['autodocs'],
  args: {
    getId: (file: File) => file.name,
    getLabel: (file: File) => file.name.split('.')[0],
    onSelect: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof List<File>>;

export const Default: Story = {
  args: { items: [{ name: 'syft.spdx.json' }, { name: 'trivy.cdx.json' }, { name: 'scout.spdx.json' }] },
};

export const Empty: Story = {
  args: { items: [] },
};
