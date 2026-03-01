import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SbomUploadForm } from '@/components/hoc/SbomUploadForm';

const meta: Meta<typeof SbomUploadForm> = {
  title: 'Components/SbomUploadForm',
  component: SbomUploadForm,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    onUpload: { action: 'upload' },
    onCancel: { action: 'cancel' },
  },
};

export default meta;
type Story = StoryObj<typeof SbomUploadForm>;

export const Default: Story = {
  args: {
    onUpload: (name, containerName, file) => console.log('Upload:', { name, containerName, file }),
    onCancel: () => console.log('Cancel'),
  },
};

export const WithError: Story = {
  args: {
    onUpload: (name, containerName, file) => {
      console.log('Upload:', { name, containerName, file });
      throw new Error('Upload failed');
    },
    onCancel: () => console.log('Cancel'),
  },
};
