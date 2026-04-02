import React from 'react';
import List from './List';

export default {
  title: 'Misc/List',
  component: List,
};

export const Default = () => (
  <List items={['Item 1', 'Item 2', 'Item 3']} />
);
