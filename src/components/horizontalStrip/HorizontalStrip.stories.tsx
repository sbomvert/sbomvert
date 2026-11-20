import type { Meta, StoryObj } from '@storybook/react';
import { HorizontalStrip } from '@/components/horizontalStrip/HorizontalStrip';

const meta: Meta<typeof HorizontalStrip> = {
  title: 'UI/HorizontalStrip',
  component: HorizontalStrip,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof HorizontalStrip>;

export const Default: Story = {
  args: { entries: { Tools: '4', 'Total packages': '1,284', 'Common to all': '612', 'Unique': '97' } },
};

export const Single: Story = {
  args: { entries: { 'Total CVEs': '42' } },
};
