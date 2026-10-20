import { NextResponse } from 'next/server';
import { POST } from './route';
import { createScanQueue, createScanWorker } from '@/services/scanQueue';
import { authorizeScanRequest } from '@/lib/auth/scan-auth';

jest.mock('@/services/scanQueue', () => ({
  createScanQueue: jest.fn(),
  createScanWorker: jest.fn(),
}));
jest.mock('@/lib/auth/scan-auth', () => ({ authorizeScanRequest: jest.fn() }));

const mockedCreateScanQueue = createScanQueue as jest.MockedFunction<typeof createScanQueue>;
const mockedCreateScanWorker = createScanWorker as jest.MockedFunction<typeof createScanWorker>;
const mockedAuthorize = authorizeScanRequest as jest.MockedFunction<typeof authorizeScanRequest>;

const validBody = {
  image: 'alpine:latest',
  tools: { producers: ['syft'], consumers: ['grype'] },
};

const makeRequest = (body: unknown, headers?: Record<string, string>) =>
  new Request('http://localhost/api/scan', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

describe('POST /api/scan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXT_PUBLIC_ENABLE_SCAN_API;
    delete process.env.NEXT_PUBLIC_ENABLE_AUTH;
    mockedCreateScanQueue.mockReturnValue({
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    } as unknown as ReturnType<typeof createScanQueue>);
    mockedCreateScanWorker.mockReturnValue(
      undefined as unknown as ReturnType<typeof createScanWorker>,
    );
  });

  it('returns 403 when the scan feature is disabled', async () => {
    const res = (await POST(makeRequest(validBody))) as NextResponse;
    expect(res.status).toBe(403);
    expect(mockedAuthorize).not.toHaveBeenCalled();
  });

  it('enqueues a job when auth is disabled', async () => {
    process.env.NEXT_PUBLIC_ENABLE_SCAN_API = 'true';
    const res = (await POST(makeRequest(validBody))) as NextResponse;
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ jobId: 'job-1' });
    expect(mockedAuthorize).not.toHaveBeenCalled();
  });

  describe('with auth enabled', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_ENABLE_SCAN_API = 'true';
      process.env.NEXT_PUBLIC_ENABLE_AUTH = 'true';
    });

    it('rejects an unauthorized request before enqueuing', async () => {
      mockedAuthorize.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' });
      const res = (await POST(makeRequest(validBody))) as NextResponse;
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'Unauthorized' });
      expect(mockedCreateScanQueue).not.toHaveBeenCalled();
    });

    it('enqueues a job for an authorized request', async () => {
      mockedAuthorize.mockResolvedValue({ ok: true });
      const res = (await POST(makeRequest(validBody, { 'x-api-key': 'good' }))) as NextResponse;
      expect(res.status).toBe(202);
      expect(await res.json()).toEqual({ jobId: 'job-1' });
    });
  });
});
