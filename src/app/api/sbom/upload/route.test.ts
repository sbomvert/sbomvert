import { POST } from '@/app/api/sbom/upload/route';
import SBOMService from '@sbomvert/storage/sbom/sbomStorageService';
import { parseSpdxSbom, parseCycloneDxSbom } from '@/lib/parseSbom';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { authorizeScanRequest } from '@/lib/auth/scan-auth';
import { MAX_SBOM_BYTES } from '@/lib/sbom/uploadLimits';

// The route's allowance for the form fields on top of the file (a private constant there)
const FORM_OVERHEAD_BYTES = 64 * 1024;

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
    ENABLE_AUTH: false,
  },
}));

// Mock services
jest.mock('@sbomvert/storage/sbom/sbomStorageService', () => ({
  __esModule: true,
  default: {
    saveSBOM: jest.fn(),
    listFiles: jest.fn(),
  },
}));

jest.mock('@/lib/parseSbom', () => ({
  parseSpdxSbom: jest.fn(),
  parseCycloneDxSbom: jest.fn(),
}));

// Factory mock: keeps better-auth (ESM) out of the test run
jest.mock('@/lib/auth/scan-auth', () => ({
  authorizeScanRequest: jest.fn(),
}));

describe('POST /api/sbom/upload', () => {
  const mockFormData = {
    get: jest.fn(),
  };

  const mockRequest = {
    formData: jest.fn(),
    headers: new Headers(),
  } as unknown as Request;

  // Sends one file to the route; `fields` are the other form values.
  const send = (content: string, fileName: string, fields: Record<string, unknown> = {}) => {
    const file = new File([content], fileName, { type: 'application/json' });
    mockRequest.formData = jest.fn().mockResolvedValue(mockFormData);
    mockFormData.get.mockImplementation((key: string) => {
      if (key === 'file') return file;
      if (key === 'containerName') return 'containerName' in fields ? fields.containerName : 'test-container';
      return fields[key] ?? null;
    });
    return POST(mockRequest);
  };

  const spdx = JSON.stringify({ spdxVersion: 'SPDX-2.3', creationInfo: { created: '2023-01-01T00:00:00Z' } });

  beforeEach(() => {
    jest.clearAllMocks();
    (FEATURE_FLAGS as any).ENABLE_SBOM_UPLOAD = true;
    (FEATURE_FLAGS as any).ENABLE_AUTH = false;
    (authorizeScanRequest as jest.Mock).mockResolvedValue({ ok: true });
    (parseSpdxSbom as jest.Mock).mockReturnValue({ name: 'test' });
    (parseCycloneDxSbom as jest.Mock).mockReturnValue({ name: 'test' });
    (SBOMService.saveSBOM as jest.Mock).mockResolvedValue(undefined);
    (SBOMService.listFiles as jest.Mock).mockResolvedValue([]);
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

    (SBOMService.saveSBOM as jest.Mock).mockResolvedValue(undefined);

    const response = await POST(mockRequest);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.message).toBe('SBOM file uploaded successfully');
    expect(data.format).toBe('SPDX');

    expect(parseSpdxSbom).toHaveBeenCalled();
    expect(SBOMService.saveSBOM).toHaveBeenCalled();
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

    (SBOMService.saveSBOM as jest.Mock).mockResolvedValue(undefined);

    const response = await POST(mockRequest);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.message).toBe('SBOM file uploaded successfully');
    expect(data.format).toBe('CycloneDX');

    expect(parseCycloneDxSbom).toHaveBeenCalled();
    expect(SBOMService.saveSBOM).toHaveBeenCalled();
  });

  it.each([
    ['stores the SBOM under the tool and format the form sent', 'docker-scout', 'cdx', 200],
    ['refuses a tool that is not a plain name', '../etc', 'cdx', 400],
  ])('%s', async (_, tool, format, status) => {
    const mockFile = new File([JSON.stringify({ bomFormat: 'CycloneDX' })], 'pasted.json', { type: 'application/json' });
    mockRequest.formData = jest.fn().mockResolvedValue(mockFormData);
    mockFormData.get.mockImplementation((key: string) =>
      ({ file: mockFile, containerName: 'alpine:3.24', tool, format } as Record<string, unknown>)[key] ?? null
    );
    (parseCycloneDxSbom as jest.Mock).mockReturnValue({});
    (SBOMService.saveSBOM as jest.Mock).mockClear().mockResolvedValue(undefined);

    const response = await POST(mockRequest);

    expect(response.status).toBe(status);
    if (status === 200) expect(SBOMService.saveSBOM).toHaveBeenCalledWith('alpinetwodots3.24', 'cdx', 'docker-scout', expect.any(String));
    else expect(SBOMService.saveSBOM).not.toHaveBeenCalled();
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

    (SBOMService.saveSBOM as jest.Mock).mockRejectedValue(
      new Error('Save failed')
    );

    const response = await POST(mockRequest);

    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe('Failed to upload SBOM file');
  });

  describe('names that would leave the SBOM directory', () => {
    const upload = (containerName: string, fileName: string) => {
      const file = new File([JSON.stringify({ spdxVersion: 'SPDX-2.3' })], fileName, { type: 'application/json' });
      mockRequest.formData = jest.fn().mockResolvedValue(mockFormData);
      mockFormData.get.mockImplementation((key: string) => (key === 'file' ? file : key === 'containerName' ? containerName : null));
      (parseSpdxSbom as jest.Mock).mockReturnValue({ name: 'test' });
      (SBOMService.saveSBOM as jest.Mock).mockResolvedValue(undefined);
      return POST(mockRequest);
    };

    it('rejects a container name or file name that is not a plain name', async () => {
      for (const [containerName, fileName] of [['..', 'syft.spdx.json'], ['.', 'syft.spdx.json'], ['app', '../../x.spdx.json'], ['app', 'a\\b.spdx.json']]) {
        const response = await upload(containerName, fileName);
        expect(response.status).toBe(400);
      }
      expect(SBOMService.saveSBOM).not.toHaveBeenCalled();
    });

    it('stores an image name the way the other SBOMs are stored', async () => {
      const response = await upload('library/nginx:1.2', 'syft.spdx.json');
      expect(response.status).toBe(200);
      expect(SBOMService.saveSBOM).toHaveBeenCalledWith('libraryslashnginxtwodots1.2', 'spdx', 'syft', expect.any(String));
    });
  });

  describe('sign-in (auth on)', () => {
    beforeEach(() => {
      (FEATURE_FLAGS as any).ENABLE_AUTH = true;
    });

    it('returns 401 and reads nothing when there is no session or key', async () => {
      (authorizeScanRequest as jest.Mock).mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' });
      const anonymous = { formData: jest.fn(), headers: new Headers() } as unknown as Request;

      const response = await POST(anonymous);

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
      expect(anonymous.formData).not.toHaveBeenCalled();
      expect(SBOMService.saveSBOM).not.toHaveBeenCalled();
    });

    it('stores the SBOM when the caller is signed in', async () => {
      const response = await send(spdx, 'syft.spdx.json');
      expect(response.status).toBe(200);
      expect(authorizeScanRequest).toHaveBeenCalled();
    });
  });

  describe('size', () => {
    it('returns 413 from the declared Content-Length, before reading the body', async () => {
      const declared = { formData: jest.fn(), headers: new Headers({ 'content-length': String(MAX_SBOM_BYTES + FORM_OVERHEAD_BYTES + 1) }) } as unknown as Request;

      const response = await POST(declared);

      expect(response.status).toBe(413);
      expect(declared.formData).not.toHaveBeenCalled();
    });

    it('returns 413 for a file over 10 MB and stores nothing', async () => {
      const response = await send('x'.repeat(MAX_SBOM_BYTES + 1), 'big.spdx.json');

      expect(response.status).toBe(413);
      expect(SBOMService.saveSBOM).not.toHaveBeenCalled();
    });
  });

  it('trims the container name before storing it', async () => {
    const response = await send(spdx, 'syft.spdx.json', { containerName: '  alpine:3.24 ' });

    expect(response.status).toBe(200);
    expect(SBOMService.saveSBOM).toHaveBeenCalledWith('alpinetwodots3.24', 'spdx', 'syft', expect.any(String));
  });

  it('refuses a container name that is only spaces', async () => {
    const response = await send(spdx, 'syft.spdx.json', { containerName: '   ' });

    expect(response.status).toBe(400);
    expect(SBOMService.saveSBOM).not.toHaveBeenCalled();
  });

  it('refuses a CycloneDX file that does not parse, instead of storing it', async () => {
    (parseCycloneDxSbom as jest.Mock).mockReturnValue(null);

    const response = await send(JSON.stringify({ bomFormat: 'CycloneDX' }), 'x.cdx.json');

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('Failed to parse CycloneDX SBOM');
    expect(SBOMService.saveSBOM).not.toHaveBeenCalled();
  });

  it.each([
    ['names the other format', 'cdx', spdx],
    ['names a format that is neither', 'json', spdx],
  ])('refuses a form that %s than the file', async (_, format, content) => {
    const response = await send(content, 'syft.spdx.json', { format });

    expect(response.status).toBe(400);
    expect(SBOMService.saveSBOM).not.toHaveBeenCalled();
  });

  it('refuses a tool sent as a file instead of a name', async () => {
    const tool = new File(['x'], 'tool.bin', { type: 'application/octet-stream' });

    const response = await send(spdx, 'syft.spdx.json', { tool });

    expect(response.status).toBe(400);
    expect(SBOMService.saveSBOM).not.toHaveBeenCalled();
  });

  it('returns 409 and keeps the stored file when an SBOM with that name exists', async () => {
    (SBOMService.listFiles as jest.Mock).mockResolvedValue([{ name: 'syft.spdx.json', path: '', }]);

    const response = await send(spdx, 'syft.spdx.json');

    expect(response.status).toBe(409);
    expect(SBOMService.listFiles).toHaveBeenCalledWith('test-container');
    expect(SBOMService.saveSBOM).not.toHaveBeenCalled();
  });
});
