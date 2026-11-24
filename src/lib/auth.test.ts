/**
 * @jest-environment node
 */
import { apiKey } from '@better-auth/api-key';
import { betterAuth } from 'better-auth';
import { getAuth } from './auth';

// better-auth is not loaded under Jest: only the options passed to it are checked.
jest.mock('better-auth', () => ({ betterAuth: jest.fn(() => ({})) }));
jest.mock('better-auth/api', () => ({
  createAuthMiddleware: (fn: unknown) => fn,
  APIError: class extends Error {},
}));
jest.mock('better-auth/adapters/drizzle', () => ({ drizzleAdapter: jest.fn() }));
jest.mock('better-auth/plugins', () => ({ magicLink: jest.fn() }));
jest.mock('@better-auth/api-key', () => ({ apiKey: jest.fn() }));
jest.mock('@/db', () => ({ createDb: jest.fn() }));
jest.mock('@/db/schema', () => ({}));

const env = { ...process.env };
beforeAll(() => {
  process.env.DATABASE_URL = 'postgres://x';
  process.env.BETTER_AUTH_SECRET = 'x';
  getAuth();
});
afterAll(() => {
  process.env = env;
});

test('API keys always expire and never act as a session', () => {
  const options = (apiKey as jest.Mock).mock.calls[0][0];
  const defaultDays = options.keyExpiration.defaultExpiresIn / 86400;
  expect(options.enableSessionForAPIKeys).toBe(false);
  expect(defaultDays).toBeGreaterThanOrEqual(options.keyExpiration.minExpiresIn);
  expect(defaultDays).toBeLessThanOrEqual(options.keyExpiration.maxExpiresIn);
});

test('a key cannot be updated to never expire', async () => {
  const before = (betterAuth as jest.Mock).mock.calls[0][0].hooks.before;
  await expect(
    before({ path: '/api-key/update', body: { keyId: 'k', expiresIn: null } })
  ).rejects.toThrow('BAD_REQUEST');
  await expect(
    before({ path: '/api-key/update', body: { keyId: 'k', expiresIn: 30 * 86400 } })
  ).resolves.toBeUndefined();
  await expect(
    before({ path: '/api-key/update', body: { keyId: 'k', name: 'ci' } })
  ).resolves.toBeUndefined();
});
