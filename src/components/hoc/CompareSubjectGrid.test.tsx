import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompareSubjectGrid } from '@/components/hoc/CompareSubjectGrid';

// Mock framer-motion to avoid animation warnings in test environment
jest.mock('framer-motion', () => ({
  motion: {
    div: (props: any) => <div {...props} />,
  },
}));

const mockSubjects = [
  {
    id: 'subj1',
    name: 'container/app',
    type: 'Container', // will be cast to SubjectType enum at runtime
    sboms: 3,
    cves: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: 'First subject',
  },
  {
    id: 'subj2',
    name: 'repo/lib',
    type: 'Repository',
    sboms: 1,
    cves: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: 'Second subject',
  },
];

describe('CompareSubjectGrid component', () => {
  const onSelect = jest.fn();
  const onPageChange = jest.fn();

  beforeEach(() => {
    onSelect.mockReset();
    onPageChange.mockReset();
  });

  it('shows empty state when no subjects', () => {
    render(
      <CompareSubjectGrid
        subjects={[]}
        mode="SBOM"
        onSelect={onSelect}
        currentPage={1}
        totalPages={1}
        onPageChange={onPageChange}
      />
    );
    expect(screen.getByText('No subjects found')).toBeInTheDocument();
    expect(screen.getByText(/Upload an SBOM or CVE report/)).toBeInTheDocument();
  });

  it('renders selectable and non-selectable cards for SBOM mode', () => {
    render(
      <CompareSubjectGrid
        subjects={mockSubjects as any}
        mode="SBOM"
        onSelect={onSelect}
        currentPage={1}
        totalPages={1}
        onPageChange={onPageChange}
      />
    );

    // First subject has >=2 SBOMs → button should be enabled
    const buttons = screen.getAllByRole('button');
    const firstButton = buttons[0];
    expect(firstButton).toBeEnabled();
    fireEvent.click(firstButton);
    expect(onSelect).toHaveBeenCalledWith(mockSubjects[0]);

    // Second subject has only 1 SBOM → button disabled and tooltip contains reason
    const secondButton = buttons[1];
    expect(secondButton).toBeDisabled();
    expect(secondButton).toHaveAttribute('title', expect.stringContaining('Need at least 2 SBOMs'));

  });

  it('shows pagination controls when multiple pages', () => {
    render(
      <CompareSubjectGrid
        subjects={mockSubjects as any}
        mode="SBOM"
        onSelect={onSelect}
        currentPage={2}
        totalPages={3}
        onPageChange={onPageChange}
      />
    );
    const prevBtn = screen.getByRole('button', { name: /← Prev/ });
    const nextBtn = screen.getByRole('button', { name: /Next →/ });
    expect(prevBtn).toBeEnabled();
    expect(nextBtn).toBeEnabled();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    fireEvent.click(prevBtn);
    expect(onPageChange).toHaveBeenCalledWith(1);
    fireEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
