import React from 'react';
import AppLayout from './AppLayout';

export default {
  title: 'Layout/AppLayout',
  component: AppLayout,
};

const Template = (args) => <AppLayout {...args}>Content goes here</AppLayout>;

export const Default = Template.bind({});
Default.args = {};
