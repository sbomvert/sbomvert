import { NextResponse } from 'next/server';
import { GET } from './route';
import SBOMService from '@/services/sbomStorageService/sbomStorageService';
import { SbomFile } from '@/services/sbomStorageService/sbomService.types';

jest.mock('@/services/sbomStorageService/sbomStorageService');

const mockedListFiles = SBOMService.listFiles as jest.MockedFunction<typeof SBOMService.listFiles>;

describe('GET /api/sbom/image', () => {
  beforeEach(() => {
    mockedListFiles.mockReset();
  });

  it('returns 400 when container name is missing', async () => {
    const request = new Request('http://localhost/api/sbom/image');
    const response = (await GET(request)) as NextResponse;
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: 'Container name is required' });
  });

  it('returns empty list when no files are found', async () => {
    mockedListFiles.mockResolvedValue([]);
    const request = new Request('http://localhost/api/sbom/image?name=my-container');
    const response = (await GET(request)) as NextResponse;
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ files: [] });
  });

  it('returns list of files for a container', async () => {
    const files:SbomFile[] = [{name: 'file1.json',path:''}, {name: 'file2.json',path:''}];
    mockedListFiles.mockResolvedValue(files);
    const request = new Request('http://localhost/api/sbom/image?name=my-container');
    const response = (await GET(request)) as NextResponse;
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ files });
  });
});
