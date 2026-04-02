import React from 'react';
import CVEToolSelector from './CVEToolSelector';

export default {
  title: 'HOC/CVEToolSelector',
  component: CVEToolSelector,
};

export const Default = () => (
  <CVEToolSelector
    selectedTool='trivy'
    onSelect={(tool) => console.log('Selected', tool)}
  />
);
