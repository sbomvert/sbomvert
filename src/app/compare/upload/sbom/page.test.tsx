import { render, fireEvent, screen } from '@testing-library/react';
import UploadPage from './page';

// The form is tested on its own: here it uploads and shows what the page's onUpload resolved or threw
jest.mock('@/components/hoc/SbomUploadForm', () => {
  const { useState } = jest.requireActual('react');
  return {
    SbomUploadForm: ({ onUpload }: any) => {
      const [outcome, setOutcome] = useState('');
      return (
        <>
          <button
            onClick={() =>
              onUpload('test-name', 'test-container', new File(['data'], 'file.txt')).then(
                () => setOutcome('ok'),
                (err: Error) => setOutcome(err.message)
              )
            }
          >
            Upload
          </button>
          <p>{outcome}</p>
        </>
      );
    },
  };
});

describe('UploadPage', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test('has the page title', () => {
    render(<UploadPage />);
    expect(screen.getByRole('heading', { name: 'Upload SBOM' })).toBeInTheDocument();
  });

  test('posts the SBOM', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
    render(<UploadPage />);
    fireEvent.click(screen.getByText('Upload'));
    expect(await screen.findByText('ok')).toBeInTheDocument();
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('/api/sbom/upload');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.body.get('containerName')).toBe('test-container');
  });

  test.each([
    ['the error the server returns', { ok: false, json: async () => ({ error: 'Invalid SBOM' }) }, 'Invalid SBOM'],
    ['a generic error when the server gives none', { ok: false, json: async () => ({}) }, 'Upload failed'],
  ])('fails with %s', async (_, response, message) => {
    (global.fetch as jest.Mock).mockResolvedValue(response);
    render(<UploadPage />);
    fireEvent.click(screen.getByText('Upload'));
    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  test('fails when the request does', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network failure'));
    render(<UploadPage />);
    fireEvent.click(screen.getByText('Upload'));
    expect(await screen.findByText('Network failure')).toBeInTheDocument();
  });
});
