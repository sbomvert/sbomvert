import { render, fireEvent, screen } from '@testing-library/react';
import { useSession } from '@better-auth-ui/react';
import UploadPage from './page';

jest.mock('@better-auth-ui/react', () => ({ useSession: jest.fn() }), { virtual: true });
jest.mock('@/components/auth/auth', () => ({ Auth: () => 'SIGN-IN FORM' }));
jest.mock('@/lib/auth-client', () => ({ authClient: {} }));

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
              onUpload('test-container', new File(['data'], 'file.txt'), { format: 'cdx', tool: 'Docker Scout' }).then(
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

describe('UploadPage when sign-in is configured and the user is signed out', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_AUTH = 'true';
    (useSession as jest.Mock).mockReturnValue({ data: null, isPending: false });
  });
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_ENABLE_AUTH;
  });

  test('keeps the title and puts the sign-in form in place of the upload form', () => {
    render(<UploadPage />);
    expect(screen.getByRole('heading', { name: 'Upload SBOM' })).toBeInTheDocument();
    expect(screen.getByText('This feature requires authentication. Sign in to continue.')).toBeInTheDocument();
    expect(screen.getByText('SIGN-IN FORM')).toBeInTheDocument();
    expect(screen.queryByText('Upload')).toBeNull();
  });
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
    // stored as <tool>.<format>.json, whatever the file is called
    expect(init.body.get('tool')).toBe('docker-scout');
    expect(init.body.get('format')).toBe('cdx');
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
