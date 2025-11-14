import { parseSpdxSbom } from '../lib/parseSbom';
import { describe, expect, it } from '@jest/globals';

describe('parseSpdxSbom branch coverage', () => {
  it('normalizes license/supplier and maps APPLICATION to binary', () => {
    const doc: any = {
      spdxVersion: 'SPDX-2.3',
      name: 'doc',
      creationInfo: { creators: ['Tool: trivy-0.49.1'], created: 't' },
      packages: [
        {
          name: 'app-bin',
          SPDXID: 'id1',
          primaryPackagePurpose: 'APPLICATION',
          supplier: 'NOASSERTION',
          licenseDeclared: 'NONE',
        },
      ],
    };
    const res = parseSpdxSbom(doc, 'img', 'Trivy');
    expect(res?.toolInfo.name).toBe('Trivy');
    expect(res?.toolInfo.version).toBe('0.49.1');
    expect(res?.packages[0].supplier).toBeUndefined();
    expect(res?.packages[0].license).toBeUndefined();
    expect(res?.packages[0].packageType).toBe('binary');
  });
});
