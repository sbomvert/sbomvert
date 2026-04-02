jest.mock('@/services/sbomStorageService/sbomStorageService', () => ({
  __esModule: true,
  default: {
    listSboms: jest.fn(),
  },
}));

import { GET } from './route';
import SBOMService from '@/services/sbomStorageService/sbomStorageService';

describe('GET /api/sbom', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls service with default params when none provided', async () => {
    (SBOMService.listSboms as jest.Mock).mockResolvedValue({ data: [] });

    const request = new Request('http://localhost/api/sbom');

    const response = await GET(request as any);

    expect(SBOMService.listSboms).toHaveBeenCalledWith(1, '');

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body).toEqual({ data: [] });
  });

  it('passes parsed query params to service', async () => {
    (SBOMService.listSboms as jest.Mock).mockResolvedValue({ items: [] });

    const request = new Request(
      'http://localhost/api/sbom?page=2&search=nginx'
    );

    await GET(request as any);

    expect(SBOMService.listSboms).toHaveBeenCalledWith(2, 'nginx');
  });

  it('returns 500 when service throws', async () => {
    (SBOMService.listSboms as jest.Mock).mockRejectedValue(
      new Error('Service failure')
    );

    const request = new Request('http://localhost/api/sbom');

    const response = await GET(request as any);

    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body).toEqual({
      error: 'Failed to read SBOM directory',
    });
  });
});
