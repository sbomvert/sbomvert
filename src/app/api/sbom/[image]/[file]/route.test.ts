import { GET } from './route';
import SBOMService from '@/services/sbomStorageService/sbomStorageService';
import { NextResponse } from 'next/server';

jest.mock('@/services/sbomStorageService/sbomStorageService');

const mockedGetFileContent = SBOMService.getFileContent as jest.MockedFunction<typeof SBOMService.getFileContent>;

describe('GET /api/sbom/:image/:file', () => {
  beforeEach(() => {
    mockedGetFileContent.mockReset();
  });

  it('returns parsed JSON when content is valid', async () => {
    const json = { name: 'test', version: '1.0.0' };
    mockedGetFileContent.mockResolvedValue(JSON.stringify(json));
    const context = { params: Promise.resolve({ image: 'img', file: 'file.json' }) } as any;
    const response = (await GET(undefined as any, context)) as NextResponse;
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(json);
  });

  it('returns 400 when content is not valid JSON', async () => {
    mockedGetFileContent.mockResolvedValue('not a json');
    const context = { params: Promise.resolve({ image: 'img', file: 'file.txt' }) } as any;
    const response = (await GET(undefined as any, context)) as NextResponse;
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: 'Invalid JSON payload' });
  });
});
