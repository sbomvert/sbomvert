import React from 'react';
import CopyButton from './CopyButton';

export default {
  title: 'Button/CopyButton',
  component: CopyButton,
};

export const Default = () => <CopyButton text='Copy me' onCopy={() => alert('Copied')}>Copy</CopyButton>;
