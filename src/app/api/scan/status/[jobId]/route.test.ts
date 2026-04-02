import { GET } from './route';
import { getJobStatus } from '@/services/storage';
import { NextResponse } from 'next/server';

jest.mock('@/services/storage');

const mockedGetJobStatus = getJobStatus as jest.MockedFunction<typeof getJobStatus>;

describe('GET /api/scan/status/:jobId', () => {
  beforeEach(() => {
    mockedGetJobStatus.mockReset();
  });

  it('returns job status when found', async () => {
    const status = { progress: 50, state: 'running' };
    mockedGetJobStatus.mockResolvedValue(status);
    const context = { params: Promise.resolve({ jobId: 'abc123' }) } as any;
    const response = (await GET(undefined as any, context)) as NextResponse;
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(status);
  });

  it('returns 404 when job not found', async () => {
    mockedGetJobStatus.mockRejectedValue(new Error('not found'));
    const context = { params: Promise.resolve({ jobId: 'missing' }) } as any;
    const response = (await GET(undefined as any, context)) as NextResponse;
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: 'Job not found' });
  });
});
