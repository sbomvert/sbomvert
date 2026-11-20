import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ViewSwitch } from '@/components/viewSwitch/ViewSwitch';

const meta: Meta<typeof ViewSwitch> = {
  title: 'UI/ViewSwitch',
  component: ViewSwitch,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ViewSwitch>;

export const Default: Story = {
  args: { modes: ['summary', 'table', 'chart'] },
  render: function Render(args) {
    const [selected, setSelected] = useState('summary');
    return <ViewSwitch {...args} selected={selected} onChange={setSelected} />;
  },
};
