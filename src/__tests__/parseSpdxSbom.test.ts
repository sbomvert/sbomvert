import { parseSpdxSbom } from '@/lib/parseSbom';
import { describe, expect, it } from '@jest/globals';
const sample = {
  spdxVersion: 'SPDX-2.3',
  name: 'doc',
  creationInfo: {
    creators: ['Tool: syft-1.2.3', 'Organization: Anchore'],
    created: '2024-09-01T00:00:00Z',
  },
  packages: [
    {
      name: 'leftpad',
      SPDXID: 'SPDXRef-1',
      versionInfo: '1.0.0',
      licenseConcluded: 'MIT',
      externalRefs: [
        {
          referenceCategory: 'PACKAGE-MANAGER',
          referenceType: 'purl',
          referenceLocator: 'pkg:npm/leftpad@1.0.0',
        },
        {
          referenceCategory: 'OTHER',
          referenceType: 'cpe23Type',
          referenceLocator: 'cpe:/a:vendor:leftpad:1.0.0',
        },
      ],
      checksums: [{ algorithm: 'SHA256', checksumValue: 'abc' }],
      primaryPackagePurpose: 'LIBRARY',
    },
    {
      name: 'os-base',
      SPDXID: 'SPDXRef-2',
      primaryPackagePurpose: 'OPERATING-SYSTEM',
    },
  ],
};

describe('parseSpdxSbom', () => {
  it('parses tool info and packages', () => {
    const res = parseSpdxSbom(sample as any, 'nginx:latest', 'Syft');
    expect(res).not.toBeNull();
    expect(res?.toolInfo.name).toBe('Syft');
    expect(res?.toolInfo.version).toBe('1.2.3');
    expect(res?.toolInfo.vendor).toBe('Anchore');
    expect(res?.imageId).toBe('nginx:latest');
    expect(res?.packages).toHaveLength(1);
    const pkg = res!.packages[0];
    expect(pkg.name).toBe('leftpad');
    expect(pkg.version).toBe('1.0.0');
    expect(pkg.license).toBe('MIT');
    expect(pkg.purl).toBe('pkg:npm/leftpad@1.0.0');
    expect(pkg.cpe).toMatch('cpe:');
    expect(pkg.hash).toMatch('sha256:');
  });

  it('handles missing creators gracefully', () => {
    const bad = { ...sample, creationInfo: { creators: [], created: 'x' } };
    const res = parseSpdxSbom(bad as any, 'id', 'Unknown');
    expect(res?.toolInfo.name).toBe('Unknown');
    expect(res?.toolInfo.version).toBe('unknown');
    expect(res?.toolInfo.vendor).toBe('Unknown');
  });
});
