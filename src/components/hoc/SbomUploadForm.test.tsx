import { render, screen } from '@/test-utils';
import { SbomUploadForm } from '@/components/hoc/SbomUploadForm';

// an SPDX SBOM that names its tool and vendor, as Syft writes them
const SYFT_SPDX = JSON.stringify({
  spdxVersion: 'SPDX-2.3',
  creationInfo: { creators: ['Organization: Anchore, Inc', 'Tool: syft-1.54.1'] },
  packages: [],
});

const fill = async (user: ReturnType<typeof render>['user']) => {
  await user.type(screen.getByLabelText('Container name'), 'alpine:3.24');
  await user.upload(screen.getByLabelText('SBOM file'), new File([SYFT_SPDX], 'sbom.json', { type: 'application/json' }));
};

describe('SbomUploadForm', () => {
  beforeEach(() => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ containers: [], pagination: { totalPages: 1 } }) })) as unknown as typeof fetch;
  });

  it('renders the fields, and a title and Cancel only when given', () => {
    const { rerender } = render(<SbomUploadForm onUpload={jest.fn()} />);
    expect(screen.getByLabelText('Container name')).toBeInTheDocument();
    expect(screen.getByLabelText('SBOM file')).toBeInTheDocument();
    expect(screen.getByText('No file chosen')).toBeInTheDocument();
    expect(screen.queryByText('Cancel')).toBeNull();
    rerender(<SbomUploadForm title="Load SBOM" onUpload={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByText('Load SBOM')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('asks for the container name and a file before uploading', async () => {
    const onUpload = jest.fn();
    const { user } = render(<SbomUploadForm onUpload={onUpload} />);
    await user.click(screen.getByText('Upload SBOM'));
    expect(onUpload).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter the container name');
  });

  it('uploads and says so', async () => {
    const onUpload = jest.fn(async () => {});
    const { user } = render(<SbomUploadForm onUpload={onUpload} />);
    await fill(user);
    expect(screen.getByText('sbom.json')).toBeInTheDocument();
    await user.click(screen.getByText('Upload SBOM'));
    expect(onUpload).toHaveBeenCalledWith('alpine:3.24', expect.any(File), { format: 'spdx', tool: 'Syft', vendor: 'Anchore, Inc' });
    expect(await screen.findByRole('status')).toHaveTextContent('SBOM uploaded');
  });

  it('shows why an upload failed', async () => {
    const { user } = render(<SbomUploadForm onUpload={async () => { throw new Error('Invalid SBOM'); }} />);
    await fill(user);
    await user.click(screen.getByText('Upload SBOM'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid SBOM');
  });

  it('calls onCancel', async () => {
    const onCancel = jest.fn();
    const { user } = render(<SbomUploadForm onUpload={jest.fn()} onCancel={onCancel} />);
    await user.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows the format, tool and vendor the SBOM states', async () => {
    const { user } = render(<SbomUploadForm onUpload={jest.fn()} />);
    await fill(user);
    expect(await screen.findByText('SPDX 2.3')).toBeInTheDocument();
    expect(screen.getByLabelText('Tool')).toHaveValue('Syft');
    expect(screen.getByText('Detected')).toBeInTheDocument();
    expect(screen.getByText('Anchore, Inc')).toBeInTheDocument();
  });

  it('uploads with the tool as the user corrected it', async () => {
    const onUpload = jest.fn(async () => {});
    const { user } = render(<SbomUploadForm onUpload={onUpload} />);
    await fill(user);
    await user.clear(await screen.findByLabelText('Tool'));
    await user.type(screen.getByLabelText('Tool'), 'grype');
    expect(screen.getByText('Detected: Syft')).toBeInTheDocument();
    await user.click(screen.getByText('Upload SBOM'));
    expect(onUpload).toHaveBeenCalledWith('alpine:3.24', expect.any(File), expect.objectContaining({ tool: 'grype' }));
  });

  it('refuses JSON that is not an SBOM', async () => {
    const onUpload = jest.fn();
    const { user } = render(<SbomUploadForm allowPaste onUpload={onUpload} />);
    await user.type(screen.getByLabelText('Container name'), 'alpine:3.24');
    await user.click(screen.getByLabelText('SBOM (JSON)'));
    await user.paste('{"hello":"world"}');
    expect(screen.getByText('Not an SPDX or CycloneDX SBOM')).toBeInTheDocument();
    await user.click(screen.getByText('Upload SBOM'));
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('uploads pasted JSON as a file, pasting first when offered', async () => {
    const onUpload = jest.fn();
    const { user } = render(<SbomUploadForm allowPaste onUpload={onUpload} />);
    expect(screen.queryByLabelText('SBOM file')).toBeNull();
    await user.type(screen.getByLabelText('Container name'), 'alpine:3.24');
    await user.click(screen.getByText('Upload SBOM'));
    expect(screen.getByRole('alert')).toHaveTextContent('Paste the SBOM');
    // a brace starts a userEvent descriptor: paste the JSON instead of typing it; this SBOM names no tool
    await user.click(screen.getByLabelText('SBOM (JSON)'));
    await user.paste('{"spdxVersion":"SPDX-2.3"}');
    expect(screen.getByText('Not detected: enter it')).toBeInTheDocument();
    await user.click(screen.getByText('Upload SBOM'));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter the tool');
    await user.type(screen.getByLabelText('Tool'), 'syft');
    await user.click(screen.getByText('Upload SBOM'));
    const file: File = onUpload.mock.calls[0][1];
    expect(await file.text()).toBe('{"spdxVersion":"SPDX-2.3"}');
    expect(onUpload.mock.calls[0][2]).toEqual({ format: 'spdx', tool: 'syft', vendor: undefined });
  });

  it('can leave out the container name', async () => {
    const onUpload = jest.fn(async () => {});
    const { user } = render(<SbomUploadForm askContainer={false} onUpload={onUpload} />);
    expect(screen.queryByLabelText('Container name')).toBeNull();
    await user.click(screen.getByText('Upload SBOM'));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a file');
    await user.upload(screen.getByLabelText('SBOM file'), new File([SYFT_SPDX], 'sbom.json', { type: 'application/json' }));
    await screen.findByLabelText('Tool');
    await user.click(screen.getByText('Upload SBOM'));
    expect(onUpload).toHaveBeenCalledWith('', expect.any(File), expect.objectContaining({ tool: 'Syft' }));
  });

  it('suggests the stored containers that match, and fills in the one picked', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ containers: [{ name: 'alpinetwodots3.22' }], pagination: { totalPages: 1 } }) })) as unknown as typeof fetch;
    const { user } = render(<SbomUploadForm onUpload={jest.fn()} />);
    await user.type(screen.getByLabelText('Container name'), 'alpine:3');
    // the search is sent as stored: the colon is written as "twodots"
    expect(await screen.findByRole('button', { name: 'alpine:3.22' })).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith('/api/sbom-files?page=1&search=alpinetwodots3');
    await user.click(screen.getByRole('button', { name: 'alpine:3.22' }));
    expect(screen.getByLabelText('Container name')).toHaveValue('alpine:3.22');
  });

  it('suggests matches from every page, not only the first', async () => {
    global.fetch = jest.fn(async (url: string) => ({
      ok: true,
      json: async () => (url.includes('page=2')
        ? { containers: [{ name: 'alpinetwodots3.21' }], pagination: { totalPages: 2 } }
        : { containers: [{ name: 'alpinetwodots3.22' }], pagination: { totalPages: 2 } }),
    })) as unknown as typeof fetch;
    const { user } = render(<SbomUploadForm onUpload={jest.fn()} />);
    await user.type(screen.getByLabelText('Container name'), 'alpine:3');
    expect(await screen.findByRole('button', { name: 'alpine:3.21' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'alpine:3.22' })).toBeInTheDocument();
  });

  it('keeps the focus in the container field when the suggestions arrive', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ containers: [{ name: 'alpinetwodots3.22' }], pagination: { totalPages: 1 } }) })) as unknown as typeof fetch;
    const { user } = render(<SbomUploadForm onUpload={jest.fn()} />);
    const field = screen.getByLabelText('Container name');
    await user.type(field, 'alpine:3');
    await screen.findByRole('button', { name: 'alpine:3.22' });
    expect(field).toHaveFocus();
  });

  it('trims the container name before it is uploaded', async () => {
    const onUpload = jest.fn(async () => {});
    const { user } = render(<SbomUploadForm onUpload={onUpload} />);
    await user.type(screen.getByLabelText('Container name'), '  alpine:3.24 ');
    await user.upload(screen.getByLabelText('SBOM file'), new File([SYFT_SPDX], 'sbom.json', { type: 'application/json' }));
    await user.click(screen.getByText('Upload SBOM'));
    expect(onUpload).toHaveBeenCalledWith('alpine:3.24', expect.any(File), expect.anything());
  });

  it('refuses a container name that is only spaces', async () => {
    const onUpload = jest.fn();
    const { user } = render(<SbomUploadForm onUpload={onUpload} />);
    await user.type(screen.getByLabelText('Container name'), '   ');
    await user.upload(screen.getByLabelText('SBOM file'), new File([SYFT_SPDX], 'sbom.json', { type: 'application/json' }));
    await user.click(screen.getByText('Upload SBOM'));
    expect(onUpload).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter the container name');
  });

  it('can switch from pasting to choosing a file', async () => {
    const { user } = render(<SbomUploadForm allowPaste onUpload={jest.fn()} />);
    await user.click(screen.getByLabelText('File from my computer'));
    expect(screen.getByLabelText('SBOM file')).toBeInTheDocument();
    expect(screen.queryByLabelText('SBOM (JSON)')).toBeNull();
  });
});
