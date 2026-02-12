import { POST } from '@/app/api/sbom/upload/route';
import SBOMService from '@/services/sbomStorageService/sbomStorageService';
import { parseSpdxSbom, parseCycloneDxSbom } from '@/lib/parseSbom';
import { FEATURE_FLAGS } from '@/lib/featureFlags';

// Polyfill for Node environment
class TestFile {
  name: string;
  type: string;
  _content: string;

  constructor(content: string[], name: string, options: { type: string }) {
    this._content = content.join('');
    this.name = name;
    this.type = options.type;
  }

  async text() {
    return this._content;
  }

  async arrayBuffer() {
    const encoder = new TextEncoder();
    return encoder.encode(this._content).buffer;
  }
}

// @ts-ignore
global.File = TestFile;

 
// Mock feature flags
jest.mock('@/lib/featureFlags', () => ({
  FEATURE_FLAGS: {
    ENABLE_SBOM_UPLOAD: true,
  },
}));

// Mock services
jest.mock('@/services/sbomStorageService/sbomStorageService', () => ({
  __esModule: true,
  default: {
    saveFile: jest.fn(),
  },
}));

jest.mock('@/lib/parseSbom', () => ({
  parseSpdxSbom: jest.fn(),
  parseCycloneDxSbom: jest.fn(),
}));

describe('POST /api/sbom/upload', () => {
  const mockFormData = {
    get: jest.fn(),
  };

  const mockRequest = {
    formData: jest.fn(),
  } as unknown as Request;

  beforeEach(() => {
    jest.clearAllMocks();
    (FEATURE_FLAGS as any).ENABLE_SBOM_UPLOAD = true;
  });

  it('should return 403 when SBOM upload is disabled', async () => {
    (FEATURE_FLAGS as any).ENABLE_SBOM_UPLOAD = false;

    const response = await POST(mockRequest);
    expect(response.status).toBe(403);

    const data = await response.json();
    expect(data.error).toBe('SBOM upload is not enabled');
  });

  it('should return 400 when no file is provided', async () => {
    mockRequest.formData = jest.fn().mockResolvedValue(mockFormData);
    mockFormData.get.mockReturnValue(null);

    const response = await POST(mockRequest);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('No file provided');
  });

  it('should return 400 when container name is missing', async () => {
    const mockFile = new File(['{}'], 'test.json', { type: 'application/json' });

    mockRequest.formData = jest.fn().mockResolvedValue(mockFormData);
    mockFormData.get.mockImplementation((key: string) => {
      if (key === 'file') return mockFile;
      if (key === 'containerName') return null;
      return null;
    });

    const response = await POST(mockRequest);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Container name is required');
  });

  it('should return 400 when file is invalid JSON', async () => {
    const mockFile = new File(['invalid json'], 'test.json', { type: 'application/json' });

    mockRequest.formData = jest.fn().mockResolvedValue(mockFormData);
    mockFormData.get.mockImplementation((key: string) => {
      if (key === 'file') return mockFile;
      if (key === 'containerName') return 'test-container';
      return null;
    });

    const response = await POST(mockRequest);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe(
      'Invalid JSON format. Please provide a valid SBOM file'
    );
  });

  it('should return 400 when SBOM format is unknown', async () => {
    const mockFile = new File(
      [JSON.stringify({ invalid: 'format' })],
      'test.json',
      { type: 'application/json' }
    );

    mockRequest.formData = jest.fn().mockResolvedValue(mockFormData);
    mockFormData.get.mockImplementation((key: string) => {
      if (key === 'file') return mockFile;
      if (key === 'containerName') return 'test-container';
      return null;
    });

    const response = await POST(mockRequest);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe(
      'Unknown SBOM format. Expected SPDX or CycloneDX format'
    );
  });

  it('should parse and save SPDX SBOM file correctly', async () => {
    const mockSpdxData = {
      spdxVersion: 'SPDX-2.2',
      creationInfo: { created: '2023-01-01T00:00:00Z' },
      name: 'Test SBOM',
    };

    const mockFile = new File(
      [JSON.stringify(mockSpdxData)],
      'test.spdx.json',
      { type: 'application/json' }
    );

    mockRequest.formData = jest.fn().mockResolvedValue(mockFormData);
    mockFormData.get.mockImplementation((key: string) => {
      if (key === 'file') return mockFile;
      if (key === 'containerName') return 'test-container';
      return null;
    });

    (parseSpdxSbom as jest.Mock).mockReturnValue({
      name: 'test',
      containerName: 'test-container',
    });

    (SBOMService.saveFile as jest.Mock).mockResolvedValue(undefined);

    const response = await POST(mockRequest);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.message).toBe('SBOM file uploaded successfully');
    expect(data.format).toBe('SPDX');

    expect(parseSpdxSbom).toHaveBeenCalled();
    expect(SBOMService.saveFile).toHaveBeenCalled();
  });

  it('should parse and save CycloneDX SBOM file correctly', async () => {
    const mockCycloneDxData = {
      bomFormat: 'CycloneDX',
      version: '1.4',
      metadata: { timestamp: '2023-01-01T00:00:00Z' },
    };

    const mockFile = new File(
      [JSON.stringify(mockCycloneDxData)],
      'test.cyclonedx.json',
      { type: 'application/json' }
    );

    mockRequest.formData = jest.fn().mockResolvedValue(mockFormData);
    mockFormData.get.mockImplementation((key: string) => {
      if (key === 'file') return mockFile;
      if (key === 'containerName') return 'test-container';
      return null;
    });

    (parseCycloneDxSbom as jest.Mock).mockReturnValue({
      name: 'test',
      containerName: 'test-container',
    });

    (SBOMService.saveFile as jest.Mock).mockResolvedValue(undefined);

    const response = await POST(mockRequest);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.message).toBe('SBOM file uploaded successfully');
    expect(data.format).toBe('CycloneDX');

    expect(parseCycloneDxSbom).toHaveBeenCalled();
    expect(SBOMService.saveFile).toHaveBeenCalled();
  });

  it('should return 500 when saving file fails', async () => {
    const mockSpdxData = {
      spdxVersion: 'SPDX-2.2',
      creationInfo: { created: '2023-01-01T00:00:00Z' },
      name: 'Test SBOM',
    };

    const mockFile = new File(
      [JSON.stringify(mockSpdxData)],
      'test.spdx.json',
      { type: 'application/json' }
    );

    mockRequest.formData = jest.fn().mockResolvedValue(mockFormData);
    mockFormData.get.mockImplementation((key: string) => {
      if (key === 'file') return mockFile;
      if (key === 'containerName') return 'test-container';
      return null;
    });

    (parseSpdxSbom as jest.Mock).mockReturnValue({
      name: 'test',
      containerName: 'test-container',
    });

    (SBOMService.saveFile as jest.Mock).mockRejectedValue(
      new Error('Save failed')
    );

    const response = await POST(mockRequest);

    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe('Failed to upload SBOM file');
  });
});
