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
    expect(res?.toolInfo.vendor).toBe('Anchore');
  });

  it('handles missing tool name in creators', () => {
    const bad = { ...sample, creationInfo: { creators: ['Organization: Anchore'], created: 'x' } };
    const res = parseSpdxSbom(bad as any, 'id', 'Unknown');
    expect(res?.toolInfo.name).toBe('Unknown');
    expect(res?.toolInfo.version).toBe('unknown');
    expect(res?.toolInfo.vendor).toBe('Anchore');
  });

  it('handles missing organization in creators', () => {
    const bad = { ...sample, creationInfo: { creators: ['Tool: syft-1.2.3'], created: 'x' } };
    const res = parseSpdxSbom(bad as any, 'id', 'Unknown');
    expect(res?.toolInfo.name).toBe('Syft');
    expect(res?.toolInfo.version).toBe('1.2.3');
    expect(res?.toolInfo.vendor).toBe('Anchore');
  });

  it('handles tool name without version', () => {
    const bad = { ...sample, creationInfo: { creators: ['Tool: syft', 'Organization: Anchore'], created: 'x' } };
    const res = parseSpdxSbom(bad as any, 'id', 'Unknown');
    expect(res?.toolInfo.name).toBe('Syft');
    expect(res?.toolInfo.version).toBe('unknown');
    expect(res?.toolInfo.vendor).toBe('Anchore');
  });

  it('handles package with no version info but APPLICATION purpose', () => {
    const testSample = {
      ...sample,
      packages: [
        {
          name: 'app-package',
          SPDXID: 'SPDXRef-1',
          primaryPackagePurpose: 'APPLICATION',
        }
      ]
    };
    const res = parseSpdxSbom(testSample as any, 'test-image', 'Syft');
    expect(res?.packages).toHaveLength(1);
    expect(res?.packages[0].name).toBe('app-package');
    expect(res?.packages[0].version).toBe('unknown');
  });

  it('handles package with no version info and no APPLICATION purpose', () => {
    const testSample = {
      ...sample,
      packages: [
        {
          name: 'no-version-package',
          SPDXID: 'SPDXRef-1',
          primaryPackagePurpose: 'LIBRARY',
        }
      ]
    };
    const res = parseSpdxSbom(testSample as any, 'test-image', 'Syft');
    expect(res?.packages).toHaveLength(0); // Should be filtered out
  });

  it('handles package with license NONE', () => {
    const testSample = {
      ...sample,
      packages: [
        {
          name: 'license-none',
          SPDXID: 'SPDXRef-1',
          versionInfo: '1.0.0',
          licenseConcluded: 'NONE',
          externalRefs: [
            {
              referenceCategory: 'PACKAGE-MANAGER',
              referenceType: 'purl',
              referenceLocator: 'pkg:npm/license-none@1.0.0',
            }
          ],
          checksums: [{ algorithm: 'SHA256', checksumValue: 'def' }],
          primaryPackagePurpose: 'LIBRARY',
        }
      ]
    };
    const res = parseSpdxSbom(testSample as any, 'test-image', 'Syft');
    expect(res?.packages).toHaveLength(1);
    expect(res?.packages[0].license).toBeUndefined();
  });

  it('handles package with license NOASSERTION', () => {
    const testSample = {
      ...sample,
      packages: [
        {
          name: 'license-noassertion',
          SPDXID: 'SPDXRef-1',
          versionInfo: '1.0.0',
          licenseConcluded: 'NOASSERTION',
          externalRefs: [
            {
              referenceCategory: 'PACKAGE-MANAGER',
              referenceType: 'purl',
              referenceLocator: 'pkg:npm/license-noassertion@1.0.0',
            }
          ],
          checksums: [{ algorithm: 'SHA256', checksumValue: 'def' }],
          primaryPackagePurpose: 'LIBRARY',
        }
      ]
    };
    const res = parseSpdxSbom(testSample as any, 'test-image', 'Syft');
    expect(res?.packages).toHaveLength(1);
    expect(res?.packages[0].license).toBeUndefined();
  });

  it('handles package with supplier NOASSERTION', () => {
    const testSample = {
      ...sample,
      packages: [
        {
          name: 'supplier-noassertion',
          SPDXID: 'SPDXRef-1',
          versionInfo: '1.0.0',
          supplier: 'NOASSERTION',
          externalRefs: [
            {
              referenceCategory: 'PACKAGE-MANAGER',
              referenceType: 'purl',
              referenceLocator: 'pkg:npm/supplier-noassertion@1.0.0',
            }
          ],
          checksums: [{ algorithm: 'SHA256', checksumValue: 'def' }],
          primaryPackagePurpose: 'LIBRARY',
        }
      ]
    };
    const res = parseSpdxSbom(testSample as any, 'test-image', 'Syft');
    expect(res?.packages).toHaveLength(1);
    expect(res?.packages[0].supplier).toBeUndefined();
  });

  it('handles package with no externalRefs', () => {
    const testSample = {
      ...sample,
      packages: [
        {
          name: 'no-external-refs',
          SPDXID: 'SPDXRef-1',
          versionInfo: '1.0.0',
          externalRefs: undefined,
          checksums: [{ algorithm: 'SHA256', checksumValue: 'def' }],
          primaryPackagePurpose: 'LIBRARY',
        }
      ]
    };
    const res = parseSpdxSbom(testSample as any, 'test-image', 'Syft');
    expect(res?.packages).toHaveLength(1);
    expect(res?.packages[0].purl).toBeUndefined();
    expect(res?.packages[0].cpe).toBeUndefined();
  });

  it('handles package with empty externalRefs array', () => {
    const testSample = {
      ...sample,
      packages: [
        {
          name: 'empty-external-refs',
          SPDXID: 'SPDXRef-1',
          versionInfo: '1.0.0',
          externalRefs: [],
          checksums: [{ algorithm: 'SHA256', checksumValue: 'def' }],
          primaryPackagePurpose: 'LIBRARY',
        }
      ]
    };
    const res = parseSpdxSbom(testSample as any, 'test-image', 'Syft');
    expect(res?.packages).toHaveLength(1);
    expect(res?.packages[0].purl).toBeUndefined();
    expect(res?.packages[0].cpe).toBeUndefined();
  });

  it('handles package with no checksums', () => {
    const testSample = {
      ...sample,
      packages: [
        {
          name: 'no-checksums',
          SPDXID: 'SPDXRef-1',
          versionInfo: '1.0.0',
          externalRefs: [
            {
              referenceCategory: 'PACKAGE-MANAGER',
              referenceType: 'purl',
              referenceLocator: 'pkg:npm/no-checksums@1.0.0',
            }
          ],
          checksums: undefined,
          primaryPackagePurpose: 'LIBRARY',
        }
      ]
    };
    const res = parseSpdxSbom(testSample as any, 'test-image', 'Syft');
    expect(res?.packages).toHaveLength(1);
    expect(res?.packages[0].hash).toBeUndefined();
  });

  it('handles package with empty checksums array', () => {
    const testSample = {
      ...sample,
      packages: [
        {
          name: 'empty-checksums',
          SPDXID: 'SPDXRef-1',
          versionInfo: '1.0.0',
          externalRefs: [
            {
              referenceCategory: 'PACKAGE-MANAGER',
              referenceType: 'purl',
              referenceLocator: 'pkg:npm/empty-checksums@1.0.0',
            }
          ],
          checksums: [],
          primaryPackagePurpose: 'LIBRARY',
        }
      ]
    };
    const res = parseSpdxSbom(testSample as any, 'test-image', 'Syft');
    expect(res?.packages).toHaveLength(1);
    expect(res?.packages[0].hash).toBeUndefined();
  });

  it('handles CONTAINER package purpose', () => {
    const testSample = {
      ...sample,
      packages: [
        {
          name: 'container-package',
          SPDXID: 'SPDXRef-1',
          primaryPackagePurpose: 'CONTAINER',
        }
      ]
    };
    const res = parseSpdxSbom(testSample as any, 'test-image', 'Syft');
    expect(res?.packages).toHaveLength(0); // Should be filtered out
  });

  it('handles OPERATING-SYSTEM package purpose', () => {
    const testSample = {
      ...sample,
      packages: [
        {
          name: 'os-package',
          SPDXID: 'SPDXRef-1',
          primaryPackagePurpose: 'OPERATING-SYSTEM',
        }
      ]
    };
    const res = parseSpdxSbom(testSample as any, 'test-image', 'Syft');
    expect(res?.packages).toHaveLength(0); // Should be filtered out
  });

});
