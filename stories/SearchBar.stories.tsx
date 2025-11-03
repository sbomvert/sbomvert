import type { Meta, StoryObj } from '@storybook/react';
import { SearchBar } from '@/app/compare/components/SearchBar';

const meta: Meta<typeof SearchBar> = {
  title: 'Compare/SearchBar',
  component: SearchBar,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SearchBar>;

export const Default: Story = {
  args: {
    value: '',
    onChange: (value) => console.log('Search:', value),
  },
};

export const WithValue: Story = {
  args: {
    value: 'nginx',
    onChange: (value) => console.log('Search:', value),
  },
};

export const CustomPlaceholder: Story = {
  args: {
    value: '',
    placeholder: 'Search for images...',
    onChange: (value) => console.log('Search:', value),
  },
};