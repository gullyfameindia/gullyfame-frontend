/**
 * API integration contract tests (no network): config validation, URL joining, auth-header rules,
 * 401 and 429 handling of the real axios client. SecureStore and NetInfo are mocked, and a stub
 * adapter stands in for the network, so the client's own interceptors are what is tested.
 */
import axios, { type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";

// babel-preset-expo turns `process.env.EXPO_PUBLIC_*` into a read from this module; in tests it is process.env.
jest.mock("expo/virtual/env", () => ({ env: process.env }));
jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => void store.set(k, v)),
    deleteItemAsync: jest.fn(async (k: string) => void store.delete(k)),
  };
});
jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: { addEventListener: jest.fn() },
}));

type Reply = { status: number; data?: unknown; headers?: Record<string, string> };
const calls: InternalAxiosRequestConfig[] = [];
let replies: Reply[] = [];

// Installed before the client module loads, so the client's adapter wraps this stub.
const stubAdapter: AxiosAdapter = async (config) => {
  calls.push(config);
  const reply = replies.shift() ?? { status: 200, data: { code: 1, message: "success", data: {} } };
  const response: AxiosResponse = {
    data: reply.data,
    status: reply.status,
    statusText: String(reply.status),
    headers: reply.headers ?? {},
    config,
  };
  if (reply.status >= 400) {
    throw new axios.AxiosError(`HTTP ${reply.status}`, "ERR_BAD_RESPONSE", config, null, response);
  }
  return response;
};
axios.defaults.adapter = stubAdapter;

process.env.EXPO_PUBLIC_API_BASE_URL = "https://api.gullyfame.com/v1/api";
process.env.EXPO_PUBLIC_SOCKET_URL = "https://api.gullyfame.com/";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const env = require("../../config/env") as typeof import("../../config/env");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const client = require("../../api/client") as typeof import("../../api/client");

// Fake timers for the whole file: the client's retry backoff and its 401 "reset" timer must not keep
// the test process alive.
beforeAll(() => {
  jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate"] });
});
afterAll(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

beforeEach(() => {
  calls.length = 0;
  replies = [];
});

describe("config validator", () => {
  it("accepts the production URLs and normalizes slashes", () => {
    const c = env.resolveConfig(
      { apiBaseUrl: "https://api.gullyfame.com/v1/api", socketUrl: "https://api.gullyfame.com/" },
      true
    );
    expect(c.API_BASE_URL).toBe("https://api.gullyfame.com/v1/api/");
    expect(c.SOCKET_URL).toBe("https://api.gullyfame.com");
    expect(c.API_ORIGIN).toBe("https://api.gullyfame.com");
    expect(c.problems).toEqual([]);
  });

  it("collapses several trailing slashes to exactly one", () => {
    expect(env.withSingleTrailingSlash("https://api.gullyfame.com/v1/api///")).toBe("https://api.gullyfame.com/v1/api/");
  });

  it("rejects http://, localhost, LAN IPs and tunnels", () => {
    expect(env.urlProblem("http://api.gullyfame.com/v1/api/", "X")).toMatch(/https/);
    expect(env.urlProblem("https://localhost:3000/v1/api/", "X")).toMatch(/local/);
    expect(env.urlProblem("https://127.0.0.1/v1/api/", "X")).toMatch(/local/);
    expect(env.urlProblem("https://192.168.1.20/v1/api/", "X")).toMatch(/local/);
    expect(env.urlProblem("https://10.0.0.5/v1/api/", "X")).toMatch(/local/);
    expect(env.urlProblem("https://abc.ngrok-free.app/v1/api/", "X")).toMatch(/tunnel/);
    expect(env.urlProblem("", "X")).toMatch(/not set/);
    expect(env.urlProblem("https://api.gullyfame.com/v1/api/", "X")).toBeNull();
  });

  it("throws in development when a URL is invalid", () => {
    expect(() => env.resolveConfig({ apiBaseUrl: "http://192.168.1.2:4000/v1/api/", socketUrl: "https://api.gullyfame.com" }, true)).toThrow(
      /Invalid API configuration/
    );
  });

  it("falls back to production in a production build instead of crashing", () => {
    const c = env.resolveConfig({ apiBaseUrl: "http://old.example.com/v1/api", socketUrl: undefined }, false);
    expect(c.API_BASE_URL).toBe(env.PRODUCTION_API_BASE_URL);
    expect(c.SOCKET_URL).toBe(env.PRODUCTION_SOCKET_URL);
    expect(c.problems.length).toBe(2);
  });
});

describe("URL building", () => {
  it("joins the base URL and a path without double slashes", () => {
    expect(client.apiClient.getUri({ url: "user/profile" })).toBe("https://api.gullyfame.com/v1/api/user/profile");
    expect(client.BASE_URL.endsWith("/v1/api/")).toBe(true);
  });

  it("sends exactly BASE_URL + path, even if a caller adds a leading slash", async () => {
    await client.apiGet("/user/profile");
    expect(calls[0].url).toBe("user/profile");
    expect(client.apiClient.getUri(calls[0])).toBe("https://api.gullyfame.com/v1/api/user/profile");
  });
});

describe("auth header rules", () => {
  beforeEach(async () => {
    await client.setAuthToken("test-user-token");
  });

  it("classifies paths like the collection: public/* and auth/* are tokenless, except auth/reset-password", () => {
    expect(client.requiresUserToken("public/logo")).toBe(false);
    expect(client.requiresUserToken("auth/login")).toBe(false);
    expect(client.requiresUserToken("/auth/verifyOtp")).toBe(false);
    expect(client.requiresUserToken("auth/reset-password")).toBe(true);
    expect(client.requiresUserToken("user/profile")).toBe(true);
    expect(client.requiresUserToken("reels/abc/comments")).toBe(true);
  });

  it("attaches the user token to user endpoints", async () => {
    await client.apiGet("user/wallet");
    expect(calls[0].headers.Authorization).toBe("Bearer test-user-token");
  });

  it("never sends a token to public/* or auth/* endpoints", async () => {
    await client.apiGet("public/splash");
    await client.apiPost("auth/login", { userId: "9999999999", viaPassword: false });
    expect(calls[0].headers.Authorization).toBeUndefined();
    expect(calls[1].headers.Authorization).toBeUndefined();
  });
});

describe("401 handling", () => {
  it("ends the session once on a 401 from a user endpoint", async () => {
    await client.setAuthToken("expired-token");
    const handler = jest.fn();
    client.setUnauthorizedHandler(handler);
    replies = [{ status: 401, data: { code: 3, message: "invalid token", data: null } }];
    await expect(client.apiGet("user/profile")).rejects.toMatchObject({ key: "invalid_token", status: 401 });
    expect(handler).toHaveBeenCalledWith("invalid_token");
    expect(await client.getAuthToken()).toBeNull();
    client.setUnauthorizedHandler(null);
  });

  it("does NOT log out on a 401 from a login call (wrong password/OTP)", async () => {
    await client.setAuthToken("still-valid-token");
    const handler = jest.fn();
    client.setUnauthorizedHandler(handler);
    replies = [{ status: 401, data: { code: 0, message: "invalid credentials!", data: null } }];
    await expect(client.apiPost("auth/login", { userId: "x", viaPassword: true, password: "y" })).rejects.toBeTruthy();
    expect(handler).not.toHaveBeenCalled();
    expect(await client.getAuthToken()).toBe("still-valid-token");
    client.setUnauthorizedHandler(null);
  });
});

describe("429 handling", () => {
  it("retries a GET after the Retry-After delay and succeeds", async () => {
    replies = [
      { status: 429, data: { code: 0, message: "Too many requests" }, headers: { "retry-after": "2" } },
      { status: 200, data: { code: 1, message: "success", data: { balance: 5 } } },
    ];
    const pending = client.apiGet<{ balance: number }>("user/wallet");
    await jest.advanceTimersByTimeAsync(1999);
    expect(calls.length).toBe(1);
    await jest.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toEqual({ balance: 5 });
    expect(calls.length).toBe(2);
  });

  it("never retries a write and reports the wait time", async () => {
    replies = [{ status: 429, data: { code: 0, message: "" }, headers: { "retry-after": "3" } }];
    await expect(client.apiPost("reels/abc/tip", { amount: 10 })).rejects.toMatchObject({
      status: 429,
      retryAfterMs: 3000,
    });
    expect(calls.length).toBe(1);
  });
});
