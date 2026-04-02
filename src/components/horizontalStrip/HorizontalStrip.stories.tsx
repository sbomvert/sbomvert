import React from 'react';
import HorizontalStrip from './HorizontalStrip';

export default {
  title: 'Layout/HorizontalStrip',
  component: HorizontalStrip,
};

export const Default = () => (
  <HorizontalStrip items={['One', 'Two', 'Three']} />
);
