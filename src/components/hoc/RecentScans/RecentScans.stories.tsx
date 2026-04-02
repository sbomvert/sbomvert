import React from 'react';
import RecentScans from './RecentScans';

export default {
  title: 'HOC/RecentScans',
  component: RecentScans,
};

export const Default = () => (
  <RecentScans scans={[]} onSelect={(id) => console.log('Select', id)} />
);
