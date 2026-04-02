import React from 'react';
import ImageScanForm from './ImageScanForm';

export default {
  title: 'HOC/ImageScanForm',
  component: ImageScanForm,
};

export const Default = () => (
  <ImageScanForm onSubmit={(data) => console.log('Submitted', data)} />
);
