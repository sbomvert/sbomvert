import { parsePurl } from '@/lib/parseSbom';

describe('parsePurl', () => {
  it('should parse a simple pURL', () => {
    const result = parsePurl('pkg:npm/express@4.18.2');
    expect(result).toEqual({
      scheme: 'pkg',
      type: 'npm',
      name: 'express',
      version: '4.18.2',
    });
  });

  it('should parse a pURL with namespace', () => {
    const result = parsePurl('pkg:deb/debian/openssl@1.1.1?arch=amd64');
    expect(result).toEqual({
      scheme: 'pkg',
      type: 'deb',
      namespace: 'debian',
      name: 'openssl',
      version: '1.1.1',
      qualifiers: { arch: 'amd64' },
    });
  });

  it('should return null for invalid pURL', () => {
    const result = parsePurl('invalid-purl');
    expect(result).toBeNull();
  });

  it('should return null for undefined', () => {
    const result = parsePurl(undefined);
    expect(result).toBeNull();
  });

  it('should parse pURL with multiple qualifiers', () => {
    const result = parsePurl('pkg:maven/org.springframework/spring-core@5.3.0?type=jar&classifier=sources');
    expect(result?.qualifiers).toEqual({
      type: 'jar',
      classifier: 'sources',
    });
  });
});
