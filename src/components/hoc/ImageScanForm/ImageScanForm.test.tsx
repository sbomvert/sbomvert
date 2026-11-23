import { render, screen, fireEvent } from '@testing-library/react';
import { ImageScanForm } from './ImageScanForm';

// Mock Button component used inside ImageScanForm
jest.mock('@/components/button/Button', () => {
  return { Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ) };
});

// Mock SupportedTools to a simple list for test stability: trivy writes both formats, amazon CycloneDX only
jest.mock('@sbomvert/scan/tools', () => {
  const mockTool = { name: 'trivy', description: '', supports_spdx: true, supports_cyclonedx: true };
  const cdxOnly = { name: 'amazon', description: '', supports_spdx: false, supports_cyclonedx: true };
  return {
    ...jest.requireActual('@sbomvert/scan/tools'),
    SBOM_FORMATS: ['spdx', 'cdx'],
    SupportedTools: { producers: [mockTool, cdxOnly], consumers: [mockTool] },
  };
});

describe('ImageScanForm component', () => {
  const onSubmit = jest.fn(() => Promise.resolve());
  const onCancel = jest.fn();

  test('says what is missing next to the button, without submitting', () => {
    render(<ImageScanForm onSubmit={onSubmit} />);
    onSubmit.mockClear();
    fireEvent.click(screen.getByText('Start scan'));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter an image name');
    expect(onSubmit).not.toHaveBeenCalled();
    // there is nothing to cancel without a handler
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });

  test('shows why the scan could not start', async () => {
    const failing = jest.fn(() => Promise.reject(new Error('Redis is down')));
    render(<ImageScanForm onSubmit={failing} />);
    fireEvent.change(screen.getByPlaceholderText('repo/app:tag'), { target: { value: 'alpine' } });
    fireEvent.click(screen.getByText('Start scan'));
    expect(await screen.findByRole('alert')).toHaveTextContent('The scan could not start: Redis is down');
  });

  test('renders input and toggles tool selection', () => {
    render(
      <ImageScanForm onSubmit={onSubmit} onCancel={onCancel} />
    );
    const input = screen.getByPlaceholderText('repo/app:tag');
    fireEvent.change(input, { target: { value: 'myimage:latest' } });
    expect((input as HTMLInputElement).value).toBe('myimage:latest');

  });

  test('submits the chosen formats (both by default)', async () => {
    render(<ImageScanForm onSubmit={onSubmit} onCancel={onCancel} />);
    fireEvent.change(screen.getByPlaceholderText('repo/app:tag'), { target: { value: 'alpine' } });
    fireEvent.click(screen.getByText('SPDX'));
    fireEvent.click(screen.getByText('Start scan'));
    expect(onSubmit).toHaveBeenCalledWith(
      'alpine',
      { producers: ['trivy', 'amazon'], consumers: ['trivy'] },
      ['cdx']
    );
  });

  test('warns when a selected generator cannot write a selected format, until either is deselected', () => {
    const warning = 'Amazon Inspector cannot write SPDX, so that SBOM is skipped';
    render(<ImageScanForm onSubmit={onSubmit} onCancel={onCancel} />);
    expect(screen.getByRole('status')).toHaveTextContent(warning);
    fireEvent.click(screen.getByText('SPDX'));
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(screen.getByText('SPDX'));
    fireEvent.click(screen.getByText('Amazon Inspector'));
    expect(screen.queryByRole('status')).toBeNull();
  });

  test('calls onCancel when cancel button clicked', () => {
    render(
      <ImageScanForm onSubmit={onSubmit} onCancel={onCancel} />
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});
