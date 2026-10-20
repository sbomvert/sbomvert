import { POST } from './route';
import { buildScanFlow, getScanFlows } from '@sbomvert/core/queue';
import { authorizeScanRequest } from '@/lib/auth/scan-auth';

jest.mock('@sbomvert/core/queue', () => ({
  getScanFlows: jest.fn(),
  buildScanFlow: jest.fn(data => ({ name: 'scan', data })),
}));
jest.mock('@/lib/auth/scan-auth', () => ({ authorizeScanRequest: jest.fn() }));

const mockedAuthorize = authorizeScanRequest as jest.MockedFunction<typeof authorizeScanRequest>;

const add = jest.fn();
const post = async (body: unknown, headers?: Record<string, string>) => {
  const res = await POST(
    new Request('http://localhost/api/scan', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })
  );
  return { status: res.status, body: await res.json() };
};
const valid = { image: 'alpine:3.20', tools: { producers: ['syft'], consumers: ['grype'] } };

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_ENABLE_SCAN_API = 'true';
  delete process.env.NEXT_PUBLIC_ENABLE_AUTH;
  add.mockReset().mockResolvedValue({ job: { id: '42' } });
  (getScanFlows as jest.Mock).mockReturnValue({ add });
});

test('403 when the scan feature is off', async () => {
  process.env.NEXT_PUBLIC_ENABLE_SCAN_API = 'false';
  expect((await post(valid)).status).toBe(403);
  expect(add).not.toHaveBeenCalled();
  expect(mockedAuthorize).not.toHaveBeenCalled();
});

test('queues the scan as a flow and returns the scan job id (no worker runs in the web app)', async () => {
  expect(await post(valid)).toEqual({ status: 202, body: { jobId: '42' } });
  expect(buildScanFlow).toHaveBeenCalledWith(valid);
  expect(add).toHaveBeenCalledWith({ name: 'scan', data: valid });
  // auth is off: no login needed
  expect(mockedAuthorize).not.toHaveBeenCalled();
});

test.each([
  ['an image that looks like a flag', { ...valid, image: '--output=/etc/passwd' }],
  ['a source scheme instead of an image', { ...valid, image: 'dir:/root' }],
  ['no producers', { ...valid, tools: { producers: [], consumers: ['grype'] } }],
  ['a body that is not JSON', null],
])('400 and nothing queued for %s', async (_, body) => {
  expect((await post(body)).status).toBe(400);
  expect(add).not.toHaveBeenCalled();
});

test('503 when the queue is unreachable', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  add.mockRejectedValue(new Error('ECONNREFUSED'));
  expect((await post(valid)).status).toBe(503);
});

describe('with auth enabled', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_AUTH = 'true';
  });

  test('rejects an unauthorized request before queuing', async () => {
    mockedAuthorize.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' });
    expect(await post(valid)).toEqual({ status: 401, body: { error: 'Unauthorized' } });
    expect(add).not.toHaveBeenCalled();
  });

  test('queues the scan for an authorized request', async () => {
    mockedAuthorize.mockResolvedValue({ ok: true });
    expect(await post(valid, { 'x-api-key': 'good' })).toEqual({
      status: 202,
      body: { jobId: '42' },
    });
  });
});
