/**
 * Login: what the app sends to /auth and which tokens it stores.
 * The API client is mocked, so no network is used.
 */
jest.mock("expo/virtual/env", () => ({ env: process.env }));

const mockApiPost = jest.fn();
const mockSetAuthToken = jest.fn();
const mockGetProfile = jest.fn();
jest.mock("../../api/client", () => ({
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  apiPut: jest.fn(),
  setAuthToken: (...args: unknown[]) => mockSetAuthToken(...args),
  // Same contract as the real toResult: never throws, wraps errors.
  toResult: async (fn: () => Promise<unknown>, message = "success") => {
    try {
      return { success: true, data: await fn(), message };
    } catch (e: any) {
      return { success: false, data: null, message: e?.message || "error" };
    }
  },
}));
jest.mock("../../api/services/userService", () => ({
  getProfile: (...args: unknown[]) => mockGetProfile(...args),
  updateProfile: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { authService, AUTH_RULES } = require("../../api/services/authService") as typeof import("../../api/services/authService");

beforeEach(() => {
  mockApiPost.mockReset();
  mockSetAuthToken.mockReset();
  mockGetProfile.mockReset();
});

describe("password login", () => {
  it("trims the user id, sends the password and stores the token", async () => {
    mockApiPost.mockResolvedValue({ token: "jwt-1", refreshToken: "rt-1", user: { _id: "u1" } });
    const res = await authService.login({ userId: "  9876543210 ", password: "secret1", viaPassword: true });
    expect(mockApiPost).toHaveBeenCalledWith(
      "auth/login",
      { userId: "9876543210", viaPassword: true, password: "secret1" },
      { skipAuth: true }
    );
    expect(mockSetAuthToken).toHaveBeenCalledWith("jwt-1");
    expect(res.success).toBe(true);
    // The screen passes the refresh token on to saveUserSession.
    expect(res.data?.refreshToken).toBe("rt-1");
  });

  it("returns a failed result (no token stored) on a wrong password", async () => {
    mockApiPost.mockRejectedValue(new Error("invalid_credentials"));
    const res = await authService.login({ userId: "a@b.com", password: "nope", viaPassword: true });
    expect(res.success).toBe(false);
    expect(mockSetAuthToken).not.toHaveBeenCalled();
  });
});

describe("OTP login", () => {
  it("asks for an OTP without sending a password or storing a token", async () => {
    mockApiPost.mockResolvedValue({ txnId: "tx1", smsSent: true, expiresIn: 300, userRegister: true });
    const res = await authService.login({ userId: "9876543210", viaPassword: false, countryCode: "+91" });
    expect(mockApiPost.mock.calls[0][1]).toEqual({ userId: "9876543210", viaPassword: false, countryCode: "+91" });
    expect(mockSetAuthToken).not.toHaveBeenCalled();
    expect(res.data?.txnId).toBe("tx1");
  });

  it("sends the code as a number, stores the token and loads the profile", async () => {
    mockApiPost.mockResolvedValue({ token: "jwt-2", userId: "u2" });
    mockGetProfile.mockResolvedValue({ _id: "u2", firstName: "Asha" });
    const res = await authService.verifyOtp({ txnId: "tx1", otp: "012345" });
    expect(mockApiPost).toHaveBeenCalledWith("auth/verifyOtp", { txnId: "tx1", otp: 12345 }, { skipAuth: true });
    expect(mockSetAuthToken).toHaveBeenCalledWith("jwt-2");
    expect(res.data?.user).toEqual({ _id: "u2", firstName: "Asha" });
  });
});

describe("AUTH_RULES", () => {
  it("accepts 10-digit mobiles and normal emails only", () => {
    expect(AUTH_RULES.mobile.test("9876543210")).toBe(true);
    expect(AUTH_RULES.mobile.test("98765")).toBe(false);
    expect(AUTH_RULES.email.test("asha@example.in")).toBe(true);
    expect(AUTH_RULES.email.test("asha@example")).toBe(false);
  });
});
