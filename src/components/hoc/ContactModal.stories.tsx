import type { Meta, StoryObj } from '@storybook/react';
import { ContactModal } from '@/components/hoc/ContactModal';

const meta: Meta<typeof ContactModal> = {
  title: 'UI/ContactModal',
  component: ContactModal,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ContactModal>;

export const Open: Story = { args: { open: true, onClose: () => {} } };
export const Closed: Story = { args: { open: false, onClose: () => {} } };
