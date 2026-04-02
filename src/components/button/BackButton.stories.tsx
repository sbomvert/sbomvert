import React from 'react';
import BackButton from './BackButton';

export default {
  title: 'Button/BackButton',
  component: BackButton,
};

export const Default = () => <BackButton onClick={() => alert('Back clicked')}>Back</BackButton>;
