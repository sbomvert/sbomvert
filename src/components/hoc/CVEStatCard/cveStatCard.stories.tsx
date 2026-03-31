import React from 'react';
import CveStatCard from './cveStatCard';

export default {
  title: 'HOC/CVEStatCard',
  component: CveStatCard,
};

export const Default = () => (
  <CveStatCard
    title='Critical CVEs'
    count={5}
    description='Number of critical CVEs detected'
  />
);
