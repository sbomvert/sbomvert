import { parseSpdxSbom } from '@/lib/parseSbom';
import { expect, test } from '@jest/globals';

test('extractPackageType via attributionTexts PkgType:maven', () => {
  const doc: any = {
    spdxVersion: 'SPDX-2.3',
    name: 'doc',
    creationInfo: { creators: ['Tool: syft-1.0.0'], created: 't' },
    packages: [
      {
        name: 'lib',
        SPDXID: 'id',
        versionInfo: '1',
        attributionTexts: ['PkgType:maven'],
        primaryPackagePurpose: 'LIBRARY',
      },
    ],
  };
  const res = parseSpdxSbom(doc, 'img', 'SomeToolName');
  expect(res?.packages[0].packageType).toBe('maven');
});
