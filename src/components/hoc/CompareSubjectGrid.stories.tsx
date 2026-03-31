import React from 'react';
import CompareSubjectGrid from './CompareSubjectGrid';

export default {
  title: 'HOC/CompareSubjectGrid',
  component: CompareSubjectGrid,
};

export const Default = () => (
  <CompareSubjectGrid
    subjects={['Subject A', 'Subject B']}
    onSelect={(s) => console.log('Selected', s)}
  />
);
