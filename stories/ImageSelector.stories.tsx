import type { Meta, StoryObj } from '@storybook/react';
import { ImageSelector } from '@/app/compare/components/ImageSelector';

const meta: Meta<typeof ImageSelector> = {
  title: 'Compare/ImageSelector',
  component: ImageSelector,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ImageSelector>;

const mockImages = [
  { id: 'nginx:1.21', name: 'nginx:1.21', description: 'Popular web server', toolCount: 3 },
  { id: 'node:18-alpine', name: 'node:18-alpine', description: 'Node.js runtime', toolCount: 3 },
  { id: 'postgres:14', name: 'postgres:14', description: 'PostgreSQL database', toolCount: 2 },
  { id: 'redis:7-alpine', name: 'redis:7-alpine', description: 'Redis cache', toolCount: 2 },
];

export const WithImages: Story = {
  args: {
    images: mockImages,
    onImageSelect: (id) => console.log('Selected:', id),
  },
};

export const Empty: Story = {
  args: {
    images: [],
    onImageSelect: (id) => console.log('Selected:', id),
  },
};

export const SingleImage: Story = {
  args: {
    images: [mockImages[0]],
    onImageSelect: (id) => console.log('Selected:', id),
  },
};