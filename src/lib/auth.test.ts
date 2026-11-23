/**
 * @jest-environment node
 */
import { apiKey } from '@better-auth/api-key';
import { getAuth } from './auth';

// better-auth is not loaded under Jest: only the options passed to the API key plugin are checked.
jest.mock('better-auth', () => ({ betterAuth: jest.fn(() => ({})) }));
jest.mock('better-auth/adapters/drizzle', () => ({ drizzleAdapter: jest.fn() }));
jest.mock('better-auth/plugins', () => ({ magicLink: jest.fn() }));
jest.mock('@better-auth/api-key', () => ({ apiKey: jest.fn() }));
jest.mock('@/db', () => ({ createDb: jest.fn() }));
jest.mock('@/db/schema', () => ({}));

test('API keys always expire and never act as a session', () => {
  process.env.DATABASE_URL = 'postgres://x';
  process.env.BETTER_AUTH_SECRET = 'x';
  getAuth();
  const options = (apiKey as jest.Mock).mock.calls[0][0];
  expect(options.enableSessionForAPIKeys).toBe(false);
  expect(options.keyExpiration.defaultExpiresIn).toBeGreaterThan(0);
  expect(options.keyExpiration.defaultExpiresIn / 86400).toBeLessThanOrEqual(
    options.keyExpiration.maxExpiresIn
  );
});
