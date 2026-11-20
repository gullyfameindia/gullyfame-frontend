/**
 * Tips and referrals: the requests the app sends and how wallet history rows are shown.
 * The API client is mocked, so no network is used.
 */
jest.mock("expo/virtual/env", () => ({ env: process.env }));
jest.mock("react-native-razorpay", () => ({ __esModule: true, default: { open: jest.fn() } }));
jest.mock("expo-file-system/legacy", () => ({ FileSystemUploadType: { MULTIPART: 1 }, uploadAsync: jest.fn() }));

const mockApiGet = jest.fn();
const mockApiPost = jest.fn();
jest.mock("../../api/client", () => ({
  apiGet: (...args: unknown[]) => mockApiGet(...args),
  apiPost: (...args: unknown[]) => mockApiPost(...args),
  apiPut: jest.fn(),
  apiDelete: jest.fn(),
  apiPatch: jest.fn(),
  ApiError: class ApiError extends Error {},
  toResult: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const wallet = require("../../api/services/walletService") as typeof import("../../api/services/walletService");

beforeEach(() => {
  mockApiGet.mockReset();
  mockApiPost.mockReset();
});

describe("tipReel", () => {
  it("posts the amount to the reel's tip endpoint", async () => {
    mockApiPost.mockResolvedValue({ tipped: 25, remainingBalance: 75 });
    await expect(wallet.tipReel("reel123", 25)).resolves.toEqual({ tipped: 25, remainingBalance: 75 });
    expect(mockApiPost).toHaveBeenCalledWith("reels/reel123/tip", { amount: 25 });
  });

  it("passes server errors (e.g. not enough coins) to the caller", async () => {
    mockApiPost.mockRejectedValue(new Error("Insufficient balance"));
    await expect(wallet.tipReel("reel123", 500)).rejects.toThrow("Insufficient balance");
  });
});

describe("toDisplayTransaction", () => {
  const base = { _id: "t1", amount: 10, balanceAfter: 110, note: "", createdAt: "2026-11-19T10:00:00.000Z" };

  it("shows a referral reward as earned income", () => {
    const row = wallet.toDisplayTransaction({ ...base, type: "REFERRAL_REWARD" } as any);
    expect(row).toMatchObject({ title: "Referral reward", type: "credit", kind: "earned", amount: 10 });
  });

  it("shows a sent tip as spending, with a positive amount", () => {
    const row = wallet.toDisplayTransaction({ ...base, type: "TIP_SENT", amount: -25, balanceAfter: 85 } as any);
    expect(row).toMatchObject({ title: "Tip sent", type: "debit", kind: "spent", amount: 25 });
  });

  it("keeps recharges apart from earned coins", () => {
    const row = wallet.toDisplayTransaction({ ...base, type: "RECHARGE" } as any);
    expect(row).toMatchObject({ type: "credit", kind: "recharge" });
  });

  it("falls back to the balance when there is no note", () => {
    const row = wallet.toDisplayTransaction({ ...base, type: "TIP_RECEIVED" } as any);
    expect(row.description).toBe("Balance after: 110 coins");
  });
});

describe("referrals", () => {
  it("reads the user's referral summary and applies a friend's code", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const user = require("../../api/services/userService") as typeof import("../../api/services/userService");
    mockApiGet.mockResolvedValue({ referralCode: "GF123" });
    mockApiPost.mockResolvedValue({ referralCode: "GF123" });
    await user.getReferral();
    expect(mockApiGet).toHaveBeenCalledWith("user/referral");
    await user.applyReferralCode("FRIEND1");
    expect(mockApiPost).toHaveBeenCalledWith("user/referral/apply", { code: "FRIEND1" });
  });
});
