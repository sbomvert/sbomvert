import { GET } from './route';
import { getRecentScans } from '@sbomvert/core/queue';

jest.mock('@sbomvert/core/queue', () => ({
  getScanFlows: jest.fn(),
  getScanQueue: jest.fn(),
  getRecentScans: jest.fn(),
}));

const get = async () => {
  const res = (await GET()) as unknown as { status: number; json: () => Promise<unknown> };
  return { status: res.status, body: await res.json() };
};

test('returns an empty list before any scan has run', async () => {
  (getRecentScans as jest.Mock).mockResolvedValue([]);
  expect(await get()).toEqual({ status: 200, body: [] });
});

test('returns the recent scans from the queue', async () => {
  const scans = [{ jobId: '2', status: 'completed', updatedAt: 't', history: [] }];
  (getRecentScans as jest.Mock).mockResolvedValue(scans);
  expect(await get()).toEqual({ status: 200, body: scans });
});

test('returns 503 when the queue is unreachable', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  (getRecentScans as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));
  expect((await get()).status).toBe(503);
});
