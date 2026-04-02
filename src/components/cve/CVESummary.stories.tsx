import React from 'react';
import { CVESummary } from './CVESummary';

const mockCves = {
  tool1: {
    totalCVEs: 2,
    cves: ['CVE-2021-1234', 'CVE-2022-5678'],
    library: 1,
    language: 1,
    packagelist: [],
    vulns_by_package: {
      pkg1: ['CVE-2021-1234'],
      pkg2: ['CVE-2022-5678'],
    },
    vulnpackagelist: {
      pkg1: ['CVE-2021-1234'],
      pkg2: ['CVE-2022-5678'],
    },
    purl_mapping: {
      pkg1: 'pkg:deb/debian/pkg1@1.0',
      pkg2: 'pkg:deb/debian/pkg2@2.0',
    },
  },
} as const;

export default {
  title: 'CVE/CVESummary',
  component: CVESummary,
};

const Template = (args) => <CVESummary {...args} />;

export const Default = Template.bind({});
Default.args = { cves: mockCves };
