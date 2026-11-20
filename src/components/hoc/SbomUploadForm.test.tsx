import { render, screen } from '@/test-utils';
import { SbomUploadForm } from '@/components/hoc/SbomUploadForm';

const fill = async (user: ReturnType<typeof render>['user']) => {
  await user.type(screen.getByLabelText('SBOM Name'), 'mine');
  await user.type(screen.getByLabelText('Container Name'), 'alpine:3.24');
  await user.upload(screen.getByLabelText('SBOM File (JSON)'), new File(['{}'], 'sbom.json', { type: 'application/json' }));
};

describe('SbomUploadForm', () => {
  it('renders the fields, and a title and Cancel only when given', () => {
    const { rerender } = render(<SbomUploadForm onUpload={jest.fn()} />);
    expect(screen.getByLabelText('SBOM Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Container Name')).toBeInTheDocument();
    expect(screen.getByLabelText('SBOM File (JSON)')).toBeInTheDocument();
    expect(screen.getByText('No file chosen')).toBeInTheDocument();
    expect(screen.queryByText('Cancel')).toBeNull();
    rerender(<SbomUploadForm title="Load SBOM" onUpload={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByText('Load SBOM')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('asks for every field before uploading', async () => {
    const onUpload = jest.fn();
    const { user } = render(<SbomUploadForm onUpload={onUpload} />);
    await user.click(screen.getByText('Upload SBOM'));
    expect(onUpload).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Fill in every field');
  });

  it('uploads and says so', async () => {
    const onUpload = jest.fn(async () => {});
    const { user } = render(<SbomUploadForm onUpload={onUpload} />);
    await fill(user);
    expect(screen.getByText('sbom.json')).toBeInTheDocument();
    await user.click(screen.getByText('Upload SBOM'));
    expect(onUpload).toHaveBeenCalledWith('mine', 'alpine:3.24', expect.any(File));
    expect(await screen.findByRole('status')).toHaveTextContent('SBOM "mine" uploaded');
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
});
