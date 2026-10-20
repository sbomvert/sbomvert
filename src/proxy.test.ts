import type { NextRequest } from 'next/server';
import { proxy } from './proxy';
import { getAuth } from './lib/auth';

const verifyApiKey = jest.fn();
const getSession = jest.fn();

// Factory mock: avoids loading the real module, which pulls in better-auth (ESM).
jest.mock('./lib/auth', () => ({ getAuth: jest.fn() }));

// NextResponse.next/redirect aren't available under jest's next/server shim, so
// stub them to return identifiable sentinels we can assert on.
jest.mock('next/server', () => ({
  NextResponse: {
    next: jest.fn(() => ({ kind: 'next' })),
    redirect: jest.fn((url: URL) => ({ kind: 'redirect', url: url.toString() })),
    json: jest.fn((body: unknown, init?: { status?: number }) => ({
      kind: 'json',
      body,
      status: init?.status,
    })),
  },
}));

const mockedGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;

const makeRequest = (
  url: string,
  init?: { method?: string; headers?: Record<string, string> },
) =>
  ({
    url,
    nextUrl: new URL(url),
    method: init?.method ?? 'GET',
    headers: new Headers(init?.headers),
  }) as unknown as NextRequest;

describe('proxy (scan auth gate)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuth.mockReturnValue({
      api: { verifyApiKey, getSession },
    } as unknown as ReturnType<typeof getAuth>);
    delete process.env.NEXT_PUBLIC_ENABLE_SCAN_API;
    delete process.env.NEXT_PUBLIC_ENABLE_AUTH;
  });

  it('redirects to / when the scan feature is disabled', async () => {
    const res = await proxy(makeRequest('http://localhost/api/scan', { method: 'POST' }));
    expect(res).toEqual({ kind: 'redirect', url: 'http://localhost/' });
  });

  it('passes POST /api/scan through untouched when auth is disabled', async () => {
    process.env.NEXT_PUBLIC_ENABLE_SCAN_API = 'true';
    const res = await proxy(makeRequest('http://localhost/api/scan', { method: 'POST' }));
    expect(res).toEqual({ kind: 'next' });
    expect(verifyApiKey).not.toHaveBeenCalled();
    expect(getSession).not.toHaveBeenCalled();
  });

  describe('with auth enabled', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_ENABLE_SCAN_API = 'true';
      process.env.NEXT_PUBLIC_ENABLE_AUTH = 'true';
    });

    it('returns 401 when no credentials are provided', async () => {
      getSession.mockResolvedValue(null);
      const res = await proxy(makeRequest('http://localhost/api/scan', { method: 'POST' }));
      expect(res).toEqual({ kind: 'json', body: { error: 'Unauthorized' }, status: 401 });
    });

    it('passes through a valid x-api-key', async () => {
      verifyApiKey.mockResolvedValue({ valid: true });
      const res = await proxy(
        makeRequest('http://localhost/api/scan', {
          method: 'POST',
          headers: { 'x-api-key': 'good-key' },
        }),
      );
      expect(res).toEqual({ kind: 'next' });
      expect(getSession).not.toHaveBeenCalled();
    });

    it('returns 401 for an invalid x-api-key', async () => {
      verifyApiKey.mockResolvedValue({ valid: false });
      const res = await proxy(
        makeRequest('http://localhost/api/scan', {
          method: 'POST',
          headers: { 'x-api-key': 'bad-key' },
        }),
      );
      expect(res).toEqual({
        kind: 'json',
        body: { error: 'Unauthorized: Invalid or expired API key.' },
        status: 401,
      });
    });

    it('passes through a valid session cookie', async () => {
      getSession.mockResolvedValue({ session: { id: 's1' } });
      const res = await proxy(makeRequest('http://localhost/api/scan', { method: 'POST' }));
      expect(res).toEqual({ kind: 'next' });
    });

    it('gates the status subtree too (unauthenticated GET → 401)', async () => {
      getSession.mockResolvedValue(null);
      const res = await proxy(
        makeRequest('http://localhost/api/scan/status/recent', { method: 'GET' }),
      );
      expect(res).toEqual({ kind: 'json', body: { error: 'Unauthorized' }, status: 401 });
    });

    it('allows an authenticated GET on the status subtree', async () => {
      getSession.mockResolvedValue({ session: { id: 's1' } });
      const res = await proxy(
        makeRequest('http://localhost/api/scan/status/recent', { method: 'GET' }),
      );
      expect(res).toEqual({ kind: 'next' });
    });
  });
});
