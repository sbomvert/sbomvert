import React, { useState } from 'react';
import ViewSwitch from './ViewSwitch';

export default {
  title: 'HOC/ViewSwitch',
  component: ViewSwitch,
};

export const Default = () => {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  return (
    <ViewSwitch currentView={view} onChange={setView} />
  );
};
