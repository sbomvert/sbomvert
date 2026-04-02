
jest.mock('@/services/cveStorageService/cveStorageService', () => ({
  __esModule: true,
  default: {
    getFileContent: jest.fn(),
  },
}));

import { GET } from './route';
import CVEService from '@/services/cveStorageService/cveStorageService';

describe('GET /api/cve/[image]/[file]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns parsed JSON from CVEService', async () => {
    const mockData = { cve: 'data' };

    (CVEService.getFileContent as jest.Mock).mockResolvedValue(
      JSON.stringify(mockData)
    );

    const req = {} as any;

    const context = {
      params: Promise.resolve({
        image: 'nginx:latest',
        file: 'cve.json',
      }),
    };

    const response = await GET(req, context);

    expect(CVEService.getFileContent).toHaveBeenCalledWith(
      'nginx:latest',
      'cve.json'
    );

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual(mockData);
  });

  it('throws if service returns invalid JSON', async () => {
    (CVEService.getFileContent as jest.Mock).mockResolvedValue(
      'invalid-json'
    );

    const context = {
      params: Promise.resolve({
        image: 'nginx:latest',
        file: 'cve.json',
      }),
    };

    const req = {} as any;

    await expect(GET(req, context)).rejects.toThrow();
  });
});