import { render, fireEvent, waitFor } from '@testing-library/react';
import UploadPage from './page';

// Mock SbomUploadForm to directly trigger onUpload
jest.mock('@/components/hoc/SbomUploadForm', () => ({
  SbomUploadForm: ({ onUpload }: any) => {
    return (
      <button
        onClick={() =>
          onUpload('test-name', 'test-container', new File(['data'], 'file.txt'))
        }
      >
        Upload
      </button>
    );
  },
}));

describe('UploadPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    global.alert = jest.fn();
  });

  test('successfully uploads SBOM and shows success alert', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
    });

    const { getByText } = render(<UploadPage />);

    fireEvent.click(getByText('Upload'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];

    expect(fetchCall[0]).toBe('/api/sbom/upload');
    expect(fetchCall[1].method).toBe('POST');
    expect(fetchCall[1].body).toBeInstanceOf(FormData);

    expect(global.alert).toHaveBeenCalledWith(
      'SBOM "test-name" uploaded successfully'
    );
  });

  test('handles non-ok response with error message', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Invalid SBOM' }),
    });

    const { getByText } = render(<UploadPage />);

    fireEvent.click(getByText('Upload'));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        'Failed to upload SBOM: Invalid SBOM'
      );
    });
  });

  test('handles non-ok response without error field', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    const { getByText } = render(<UploadPage />);

    fireEvent.click(getByText('Upload'));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        'Failed to upload SBOM: Upload failed'
      );
    });
  });

  test('handles fetch throwing an exception', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(
      new Error('Network failure')
    );

    const { getByText } = render(<UploadPage />);

    fireEvent.click(getByText('Upload'));

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        'Failed to upload SBOM: Network failure'
      );
    });
  });
});