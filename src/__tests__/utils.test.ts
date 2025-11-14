import { getPackageTypeColor } from '@/lib/utils';

describe('getPackageTypeColor', () => {
  it('returns specific classes per type', () => {
    expect(getPackageTypeColor('os')).toMatch('purple');
    expect(getPackageTypeColor('npm')).toMatch('red');
    expect(getPackageTypeColor('python')).toMatch('blue');
    expect(getPackageTypeColor('maven')).toMatch('orange');
    expect(getPackageTypeColor('binary')).toMatch('gray');
    expect(getPackageTypeColor('library')).toMatch('green');
  });

  it('falls back on unknown', () => {
    expect(getPackageTypeColor('unknown-type' as any)).toMatch('gray');
    expect(getPackageTypeColor(undefined)).toMatch('gray');
  });
});
