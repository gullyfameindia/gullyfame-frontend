/** Withdrawals (B18): requests the app sends and the checks it runs before sending. */
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
  ApiError: class ApiError extends Error {},
  toResult: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const w = require("../../api/services/withdrawalService") as typeof import("../../api/services/withdrawalService");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const wallet = require("../../api/services/walletService") as typeof import("../../api/services/walletService");

beforeEach(() => {
  mockApiGet.mockReset();
  mockApiPost.mockReset();
});

const limits = { minCoins: 1000, maxCoinsNow: 5000 };
const upi = { coins: 2000, method: "UPI" as const, accountHolderName: "Asha Verma", upiId: "asha@okaxis" };

describe("validateWithdrawal", () => {
  it("accepts a valid UPI and bank request", () => {
    expect(w.validateWithdrawal(upi, limits)).toBeNull();
    expect(
      w.validateWithdrawal(
        { coins: 1000, method: "BANK", accountHolderName: "Asha Verma", accountNumber: "123456789012", ifsc: "SBIN0001234" },
        limits
      )
    ).toBeNull();
  });

  it("enforces the minimum, the maximum and the details", () => {
    expect(w.validateWithdrawal({ ...upi, coins: 999 }, limits)).toMatch(/minimum/);
    expect(w.validateWithdrawal({ ...upi, coins: 5001 }, limits)).toMatch(/up to 5,000/);
    expect(w.validateWithdrawal({ ...upi, upiId: "asha" }, limits)).toMatch(/UPI/);
    expect(w.validateWithdrawal({ ...upi, accountHolderName: "1" }, limits)).toMatch(/holder/);
    expect(
      w.validateWithdrawal({ coins: 1000, method: "BANK", accountHolderName: "Asha", accountNumber: "1234", ifsc: "SBIN0001234" }, limits)
    ).toMatch(/account number/);
    expect(
      w.validateWithdrawal({ coins: 1000, method: "BANK", accountHolderName: "Asha", accountNumber: "123456789", ifsc: "SBIN123" }, limits)
    ).toMatch(/IFSC/);
  });
});

describe("requests", () => {
  it("posts the request and the cancel to the right endpoints", async () => {
    mockApiPost.mockResolvedValue({ withdrawal: { id: "w1" } });
    await w.requestWithdrawal(upi);
    expect(mockApiPost).toHaveBeenCalledWith("user/withdrawals", upi);
    await w.cancelWithdrawal("w1");
    expect(mockApiPost).toHaveBeenLastCalledWith("user/withdrawals/w1/cancel", {});
  });

  it("converts coins to rupees at the server's rate", () => {
    expect(w.coinsToRupees(1000, 10)).toBe("₹100");
    expect(w.coinsToRupees(100000, 10)).toBe("₹10,000");
    expect(w.coinsToRupees(1005, 10)).toBe("₹100.5");
  });
});

describe("wallet history rows", () => {
  const base = { _id: "t1", amount: 2000, balanceAfter: 3000, note: "", createdAt: "2026-11-20T10:00:00.000Z" };
  it("shows withdrawals as a debit and returns as a credit", () => {
    expect(wallet.toDisplayTransaction({ ...base, type: "WITHDRAWAL" } as any)).toMatchObject({
      title: "Withdrawal",
      type: "debit",
      kind: "withdrawal",
    });
    expect(wallet.toDisplayTransaction({ ...base, type: "WITHDRAWAL_REFUND" } as any)).toMatchObject({
      title: "Withdrawal returned",
      type: "credit",
      kind: "withdrawal",
    });
  });
});
