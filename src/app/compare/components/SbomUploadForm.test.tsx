import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SbomUploadForm } from './SbomUploadForm';

// Mock the feature flag to enable the form
jest.mock('@/lib/featureFlags', () => ({
  FEATURE_FLAGS: { ENABLE_SBOM_UPLOAD: true },
}));

describe('SbomUploadForm', () => {
  const originalAlert = window.alert;
  beforeAll(() => {
    // Mock alert to avoid actual dialogs
    window.alert = jest.fn();
  });
  afterAll(() => {
    window.alert = originalAlert;
  });

  test('calls onUpload with correct arguments on submit', async () => {
    const mockOnUpload = jest.fn();
    const mockOnCancel = jest.fn();

    render(<SbomUploadForm onUpload={mockOnUpload} onCancel={mockOnCancel} />);

    const nameInput = screen.getByLabelText(/SBOM Name/i) as HTMLInputElement;
    const containerInput = screen.getByLabelText(/Container Name/i) as HTMLInputElement;
    const file = new File(['{ "test": true }'], 'test-sbom.json', { type: 'application/json' });

    // Fill inputs
    fireEvent.change(nameInput, { target: { value: 'My SBOM' } });
    fireEvent.change(containerInput, { target: { value: 'my-container' } });

    // Simulate file selection
    const fileInput = screen.getByLabelText(/SBOM File/i) as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Upload SBOM/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith('My SBOM', 'my-container', expect.any(File));
    });
  });

  test('shows alert when required fields are missing', async () => {
    const mockOnUpload = jest.fn();
    const mockOnCancel = jest.fn();

    render(<SbomUploadForm onUpload={mockOnUpload} onCancel={mockOnCancel} />);

    // Submit without filling fields
    const submitButton = screen.getByRole('button', { name: /Upload SBOM/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Please fill all fields and select a file');
    });
    expect(mockOnUpload).not.toHaveBeenCalled();
  });
});
