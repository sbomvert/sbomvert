import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Home } from '@/app/compare/page';

const meta: Meta<typeof Home> = {
  title: 'Pages/ComparePage',
  component: Home,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    // Add any arg types if needed for props
  },
};

export default meta;
type Story = StoryObj<typeof Home>;

export const Default: Story = {
  args: {},
};

export const WithUploadForm: Story = {
  args: {},
  render: args => {
    // This story would need to be mocked to show the form
    // For now, just showing the base page
    return <Home {...args} />;
  },
};
