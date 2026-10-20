import { GET } from './route';
import { getScanStatus } from '@sbomvert/core/queue';

jest.mock('@sbomvert/core/queue', () => ({
  getScanFlows: jest.fn(),
  getScanQueue: jest.fn(),
  getScanStatus: jest.fn(),
}));

const get = async (jobId: string) => {
  const res = (await GET(undefined as never, {
    params: Promise.resolve({ jobId }),
  })) as unknown as {
    status: number;
    json: () => Promise<unknown>;
  };
  return { status: res.status, body: await res.json() };
};

describe('GET /api/scan/status/:jobId', () => {
  beforeEach(() => (getScanStatus as jest.Mock).mockReset());

  it('returns the job status from the queue', async () => {
    const status = { jobId: '7', status: 'running', updatedAt: 't', history: [] };
    (getScanStatus as jest.Mock).mockResolvedValue(status);
    expect(await get('7')).toEqual({ status: 200, body: status });
  });

  it('returns 404 for an unknown job', async () => {
    (getScanStatus as jest.Mock).mockResolvedValue(undefined);
    expect(await get('missing')).toEqual({ status: 404, body: { error: 'Job not found' } });
  });

  it('returns 503 when the queue is unreachable', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    (getScanStatus as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));
    expect((await get('7')).status).toBe(503);
  });
});
