import React from 'react';
import { render, screen } from '@/test-utils';
import { SbomUploadForm } from '@/components/hoc/SbomUploadForm';

// Mock the FEATURE_FLAGS to control behavior
jest.mock('@/lib/featureFlags', () => ({
  FEATURE_FLAGS: {
    ENABLE_SBOM_UPLOAD: true, // Default to enabled for this test
  },
}));

describe('SbomUploadForm', () => {
  const mockOnUpload = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    mockOnUpload.mockClear();
    mockOnCancel.mockClear();
  });

  it('renders the upload form with all required fields when feature flag is enabled', () => {
    // Mock that feature flag is enabled
    (require('@/lib/featureFlags').FEATURE_FLAGS as any).ENABLE_SBOM_UPLOAD = true;

    render(<SbomUploadForm onUpload={mockOnUpload} onCancel={mockOnCancel} />);

    expect(screen.getByText('Upload SBOM File')).toBeInTheDocument();
    expect(screen.getByLabelText('SBOM Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Container Name')).toBeInTheDocument();
    expect(screen.getByLabelText('SBOM File (JSON)')).toBeInTheDocument();
    expect(screen.getByText('Upload SBOM')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('shows validation error when fields are empty when feature flag is enabled', async () => {
    // Mock that feature flag is enabled
    (require('@/lib/featureFlags').FEATURE_FLAGS as any).ENABLE_SBOM_UPLOAD = true;

    const { user } = render(<SbomUploadForm onUpload={mockOnUpload} onCancel={mockOnCancel} />);

    // Try to submit without filling fields
    await user.click(screen.getByText('Upload SBOM'));

    // Should show validation error (alert is triggered)
    expect(mockOnUpload).not.toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is clicked when feature flag is enabled', async () => {
    // Mock that feature flag is enabled
    (require('@/lib/featureFlags').FEATURE_FLAGS as any).ENABLE_SBOM_UPLOAD = true;

    const { user } = render(<SbomUploadForm onUpload={mockOnUpload} onCancel={mockOnCancel} />);

    await user.click(screen.getByText('Cancel'));

    expect(mockOnCancel).toHaveBeenCalled();
  });
});
