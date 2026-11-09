/**
 * Admin API layer tests (no network): config validation, URL joining, auth-header rules,
 * envelope parsing, 401 and 429 handling. `fetch` is replaced by a stub.
 * Run: node --test --import ./scripts/api-contract/ts-resolve.mjs apps/gully-fame-admin/lib/__tests__/*.test.mts
 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Minimal browser globals used by lib/session.ts.
const storage = new Map<string, string>();
const fakeWindow = {
  location: { pathname: '/users', href: '' },
  localStorage: {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => void storage.set(k, String(v)),
    removeItem: (k: string) => void storage.delete(k),
  },
  dispatchEvent: () => true,
};
(globalThis as any).window = fakeWindow;
process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.gullyfame.com/v1/api';

const config = await import('../config.ts');
const http = await import('../http.ts');

type Reply = { status: number; body?: unknown; headers?: Record<string, string> };
let replies: Reply[] = [];
const requests: { url: string; init: RequestInit }[] = [];
(globalThis as any).fetch = async (url: string, init: RequestInit) => {
  requests.push({ url, init });
  const reply = replies.shift() ?? { status: 200, body: { code: 1, message: 'success', data: {} } };
  return new Response(reply.body === undefined ? '' : JSON.stringify(reply.body), {
    status: reply.status,
    headers: reply.headers,
  });
};

beforeEach(() => {
  replies = [];
  requests.length = 0;
  storage.clear();
  fakeWindow.location.pathname = '/users';
  fakeWindow.location.href = '';
});

describe('config validator', () => {
  test('accepts the production URL and adds exactly one trailing slash', () => {
    const c = config.resolveConfig('https://api.gullyfame.com/v1/api//', true);
    assert.equal(c.API_BASE_URL, 'https://api.gullyfame.com/v1/api/');
    assert.equal(c.API_ORIGIN, 'https://api.gullyfame.com');
    assert.deepEqual(c.problems, []);
  });

  test('rejects http://, localhost, LAN IPs and tunnels', () => {
    assert.match(String(config.urlProblem('http://api.gullyfame.com/v1/api/', 'X')), /https/);
    assert.match(String(config.urlProblem('https://localhost:5000/', 'X')), /local/);
    assert.match(String(config.urlProblem('https://192.168.0.10/v1/api/', 'X')), /local/);
    assert.match(String(config.urlProblem('https://x.ngrok.io/', 'X')), /tunnel/);
    assert.equal(config.urlProblem('https://api.gullyfame.com/v1/api/', 'X'), null);
  });

  test('throws in development, falls back to production in a production build', () => {
    assert.throws(() => config.resolveConfig('http://127.0.0.1:4000/v1/api/', true), /Invalid API configuration/);
    const c = config.resolveConfig(undefined, false);
    assert.equal(c.API_BASE_URL, config.PRODUCTION_API_BASE_URL);
  });
});

describe('URL building', () => {
  test('joins base URL and path without double slashes', () => {
    assert.equal(http.buildUrl('admin/users'), 'https://api.gullyfame.com/v1/api/admin/users');
    assert.equal(http.buildUrl('/admin/users'), 'https://api.gullyfame.com/v1/api/admin/users');
    assert.equal(http.buildUrl('admin/users', undefined, 'https://api.gullyfame.com/v1/api///'), 'https://api.gullyfame.com/v1/api/admin/users');
  });

  test('encodes query params and drops empty ones', () => {
    assert.equal(
      http.buildUrl('admin/users', { page: 2, limit: 10, search: 'a b&c', status: '', role: undefined }),
      'https://api.gullyfame.com/v1/api/admin/users?page=2&limit=10&search=a+b%26c'
    );
  });
});

describe('auth header rules', () => {
  test('admin requests carry the admin token, public ones carry none', () => {
    assert.equal(http.buildHeaders('admin', false, 'admin-token').Authorization, 'Bearer admin-token');
    assert.equal(http.buildHeaders('none', false, 'admin-token').Authorization, undefined);
    assert.equal(http.buildHeaders('admin', true, 'x')['Content-Type'], 'application/json');
    assert.equal(http.buildHeaders('admin', false, 'x')['Content-Type'], undefined);
  });

  test('public/* and login calls send no token even when signed in', async () => {
    storage.set('gf_admin_token', 'admin-token');
    await http.apiRequest('GET', 'public/splash', { auth: 'none' });
    await http.apiRequest('POST', 'admin/login', { auth: 'none', body: { email: 'a@b.c', password: 'p', role: 'ADMIN' } });
    await http.apiRequest('GET', 'admin/users');
    const auth = requests.map((r) => (r.init.headers as Record<string, string>).Authorization);
    assert.deepEqual(auth, [undefined, undefined, 'Bearer admin-token']);
  });
});

describe('envelope parsing', () => {
  test('code 1 is a success even without data (e.g. DELETE)', () => {
    const r = http.interpretResponse(200, true, { code: 1, message: 'Category deleted successfully' });
    assert.equal(r.success, true);
    assert.equal(r.data, undefined);
  });

  test('code 0 on HTTP 200 is a failure with the server message', () => {
    const r = http.interpretResponse(200, true, { code: 0, message: 'Competition not found', data: null });
    assert.equal(r.success, false);
    assert.equal(r.message, 'Competition not found');
  });

  test('a non-JSON body becomes a clean error, not a throw', async () => {
    (globalThis as any).fetch = async () => new Response('<html>502 Bad Gateway</html>', { status: 502 });
    const r = await http.apiRequest('POST', 'admin/banners', { body: {} });
    assert.equal(r.success, false);
    assert.equal(r.error, 'SERVER_ERROR');
    (globalThis as any).fetch = async (url: string, init: RequestInit) => {
      requests.push({ url, init });
      const reply = replies.shift() ?? { status: 200, body: { code: 1, message: 'success', data: {} } };
      return new Response(reply.body === undefined ? '' : JSON.stringify(reply.body), { status: reply.status, headers: reply.headers });
    };
  });
});

describe('401 handling', () => {
  test('a 401 on an admin request clears the session and returns to /login', async () => {
    storage.set('gf_admin_token', 'expired');
    replies = [{ status: 401, body: { code: 3, message: 'invalid token', data: null } }];
    const r = await http.apiRequest('GET', 'admin/getDetails');
    assert.equal(r.success, false);
    assert.equal(r.error, 'UNAUTHORIZED');
    assert.equal(storage.get('gf_admin_token'), undefined);
    assert.equal(fakeWindow.location.href, '/login');
  });

  test('a 401 from the login call itself does not trigger a logout redirect', async () => {
    replies = [{ status: 401, body: { code: 0, message: 'invalid credentials!' } }];
    const r = await http.apiRequest('POST', 'admin/login', { auth: 'none', body: {} });
    assert.equal(r.success, false);
    assert.equal(fakeWindow.location.href, '');
  });
});

describe('429 handling', () => {
  test('parses Retry-After seconds and dates', () => {
    assert.equal(http.parseRetryAfterMs('2'), 2000);
    assert.equal(http.parseRetryAfterMs('99'), 10000);
    assert.equal(http.parseRetryAfterMs('Thu, 01 Jan 2026 00:00:03 GMT', Date.parse('2026-01-01T00:00:00Z')), 3000);
    assert.equal(http.parseRetryAfterMs(null), null);
  });

  test('a GET is retried after Retry-After and then succeeds', async () => {
    replies = [
      { status: 429, body: { code: 0, message: 'slow down' }, headers: { 'retry-after': '0' } },
      { status: 200, body: { code: 1, message: 'ok', data: { users: [] } } },
    ];
    const r = await http.apiRequest('GET', 'admin/users');
    assert.equal(r.success, true);
    assert.equal(requests.length, 2);
  });

  test('a write is never retried and reports Retry-After', async () => {
    replies = [{ status: 429, body: { code: 0, message: '' }, headers: { 'retry-after': '4' } }];
    const r = await http.apiRequest('POST', 'admin/competitions/abc/active');
    assert.equal(r.success, false);
    assert.equal(r.error, 'RATE_LIMITED');
    assert.equal(r.retryAfterMs, 4000);
    assert.equal(requests.length, 1);
  });

  test('backoff stays within its jitter bounds', () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const ceiling = Math.min(8000, 500 * 2 ** attempt);
      for (let i = 0; i < 25; i++) {
        const d = http.backoffDelayMs(attempt);
        assert.ok(d >= ceiling / 2 && d <= ceiling);
      }
    }
  });
});
