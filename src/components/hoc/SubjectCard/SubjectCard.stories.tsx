import React from 'react';
import SubjectCard from './SubjectCard';

export default {
  title: 'HOC/SubjectCard',
  component: SubjectCard,
};

export const Default = () => (
  <SubjectCard
    title='Sample Subject'
    description='Description here'
    onClick={() => alert('Clicked')}
  />
);
