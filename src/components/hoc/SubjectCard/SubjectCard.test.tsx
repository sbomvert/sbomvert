import { render, screen, fireEvent } from '@testing-library/react';
import { SubjectCard } from './SubjectCard';
import { SubjectType } from '@/services/artifactStorageService/artifactStorageService.types';

// Mock motion component to simple div
jest.mock('framer-motion', () => ({
  motion: { article: (props: any) => <div {...props} /> },
}));

// Mock cn utility to identity function
jest.mock('@/lib/utils', () => ({ cn: (...args: any[]) => args.filter(Boolean).join(' ') }));

const mockSubject = {
  id: 'subj1',
  name: 'repo/image',
  type: SubjectType.Container,
  sboms: 3,
  cves: 1,
  updatedAt: new Date().toISOString(),
  tags: ['tag1'],
  description: 'desc',
  owner: 'owner1',
};

describe('SubjectCard component', () => {
  const onSelect = jest.fn();

  test('renders subject information and active stat pills', () => {
    render(
      <SubjectCard subject={mockSubject as any} index={0} onSelect={onSelect} />
    );
    // Verify name label
    expect(screen.getByText('image')).toBeInTheDocument();
    // Prefix should be displayed
    expect(screen.getByText('repo')).toBeInTheDocument();
    // Tags
    expect(screen.getByText('tag1')).toBeInTheDocument();
    // Stat pills active state
    const sbomBtn = screen.getByRole('button', { name: /SBOMs/i });
    const cveBtn = screen.getByRole('button', { name: /CVE reports/i });
    expect(sbomBtn).not.toBeDisabled();
    expect(cveBtn).not.toBeDisabled();
    // Click SBOM pill
    fireEvent.click(sbomBtn);
    expect(onSelect).toHaveBeenCalledWith(mockSubject, 'sbom');
  });

  test('disables CVE pill when insufficient cves', () => {
    const subjectNoCve = { ...mockSubject, cves: 0 } as any;
    render(<SubjectCard subject={subjectNoCve} index={0} onSelect={onSelect} />);
    const cveBtn = screen.getByRole('button', { name: /CVE reports/i });
    expect(cveBtn).toBeDisabled();
  });
});
