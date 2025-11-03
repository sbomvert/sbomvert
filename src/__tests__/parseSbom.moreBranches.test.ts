import { parsePurl, parseSpdxSbom } from '@/lib/parseSbom';

test('parsePurl supports subpath with #', () => {
  const res = parsePurl('pkg:npm/@scope/name@1.0.0?env=prod#/dist');
  expect(res?.subpath).toBe('/dist');
  expect(res?.qualifiers?.env).toBe('prod');
});

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
  const res = parseSpdxSbom(doc, 'img');
  expect(res?.packages[0].packageType).toBe('maven');
});


