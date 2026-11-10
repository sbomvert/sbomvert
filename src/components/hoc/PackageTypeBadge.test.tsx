import { render, screen } from '@testing-library/react';
import { getPackageTypeColor, PackageTypeBadge } from './PackageTypeBadge';

describe('getPackageTypeColor function', () => {
  it('should return correct color for os type', () => {
    const result = getPackageTypeColor('os');
    expect(result).toContain('bg-purple-100');
    expect(result).toContain('text-purple-800');
  });

  it('should return correct color for npm type', () => {
    const result = getPackageTypeColor('npm');
    expect(result).toContain('bg-red-100');
    expect(result).toContain('text-red-800');
  });

  it('should return correct color for python type', () => {
    const result = getPackageTypeColor('python');
    expect(result).toContain('bg-blue-100');
    expect(result).toContain('text-blue-800');
  });

  it('should return correct color for maven type', () => {
    const result = getPackageTypeColor('maven');
    expect(result).toContain('bg-orange-100');
    expect(result).toContain('text-orange-800');
  });

  it('should return correct color for binary type', () => {
    const result = getPackageTypeColor('binary');
    expect(result).toContain('bg-gray-100');
    expect(result).toContain('text-gray-800');
  });

  it('should return their own colors for rust and .net types', () => {
    expect(getPackageTypeColor('rust')).toContain('bg-amber-100');
    expect(getPackageTypeColor('.net')).toContain('bg-indigo-100');
  });

  it('should return correct color for library type', () => {
    const result = getPackageTypeColor('library');
    expect(result).toContain('bg-green-100');
    expect(result).toContain('text-green-800');
  });

  it('should return default color for unknown type', () => {
    const result = getPackageTypeColor('unknown');
    expect(result).toContain('bg-gray-100');
    expect(result).toContain('text-gray-800');
  });

  it('should return default color for undefined type', () => {
    const result = getPackageTypeColor(undefined);
    expect(result).toContain('bg-gray-100');
    expect(result).toContain('text-gray-800');
  });
});

describe('PackageTypeBadge', () => {
  it('shows the type, or "unknown" without one', () => {
    const { rerender } = render(<PackageTypeBadge type="npm" />);
    expect(screen.getByText('npm')).toHaveClass('bg-red-100');
    rerender(<PackageTypeBadge />);
    expect(screen.getByText('unknown')).toBeInTheDocument();
  });
});
