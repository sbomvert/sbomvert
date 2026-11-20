import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Dialog } from '@/components/dialog/Dialog';
import { Button } from '@/components/button/Button';

const meta: Meta<typeof Dialog> = {
  title: 'UI/Dialog',
  component: Dialog,
  tags: ['autodocs'],
  args: {
    title: 'Load SBOM',
    description: 'Open an SPDX SBOM from your computer to analyze it.',
    children: <p className="text-body-sm text-foreground-muted">The dialog content goes here.</p>,
  },
};

export default meta;
type Story = StoryObj<typeof Dialog>;

export const Default: Story = {
  render: function Render(args) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button size="sm" onClick={() => setOpen(true)}>Open dialog</Button>
        <Dialog {...args} open={open} onOpenChange={setOpen} />
      </>
    );
  },
};
