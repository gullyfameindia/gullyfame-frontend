import { apiGet, apiPost } from "../client";

/**
 * Withdrawals (backend B18): earned coins to UPI or a bank account, paid by Gully Fame within
 * 24-48 hours. Coins leave the wallet when the request is made and come back if it is
 * rejected or cancelled.
 *   GET  user/withdrawals/summary     -> limits, what can be withdrawn now, open request
 *   GET  user/withdrawals             -> history
 *   POST user/withdrawals             -> new request
 *   POST user/withdrawals/:id/cancel  -> cancel while pending
 */

export type WithdrawalStatus = "PENDING" | "APPROVED" | "PAID" | "REJECTED" | "CANCELLED";
export type WithdrawalMethod = "UPI" | "BANK";
export type WithdrawalBlocker = "KYC_REQUIRED" | "ACCOUNT_TOO_NEW" | "REQUEST_OPEN" | "NOT_ENOUGH_COINS" | "MONTHLY_LIMIT";

export interface Withdrawal {
  id: string;
  coins: number;
  amountPaise: number;
  /** Formatted, e.g. "₹200". */
  amount: string;
  method: WithdrawalMethod;
  /** UPI ID, or a masked account number with the IFSC. */
  payTo: string;
  accountHolderName: string;
  status: WithdrawalStatus;
  rejectReason: string;
  paymentRef: string;
  createdAt: string;
  paidAt: string | null;
}

export interface WithdrawalSummary {
  balance: number;
  withdrawableCoins: number;
  maxCoinsNow: number;
  minCoins: number;
  monthlyMaxCoins: number;
  usedThisMonthCoins: number;
  coinValuePaise: number;
  payoutTime: string;
  minAccountDays: number;
  kycStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  openRequest: Withdrawal | null;
  canWithdraw: boolean;
  blockers: WithdrawalBlocker[];
}

export interface WithdrawalRequest {
  coins: number;
  method: WithdrawalMethod;
  accountHolderName: string;
  upiId?: string;
  accountNumber?: string;
  ifsc?: string;
}

export const getWithdrawalSummary = () => apiGet<WithdrawalSummary>("user/withdrawals/summary");

export const listWithdrawals = (page = 1, limit = 20) =>
  apiGet<{ page: number; hasMore: boolean; total: number; withdrawals: Withdrawal[] }>("user/withdrawals", {
    params: { page, limit },
  });

export const requestWithdrawal = (body: WithdrawalRequest) =>
  apiPost<{ withdrawal: Withdrawal }>("user/withdrawals", body);

export const cancelWithdrawal = (id: string) =>
  apiPost<{ withdrawal: Withdrawal }>(`user/withdrawals/${encodeURIComponent(id)}/cancel`, {});

/** Coins -> "₹1,234.50" using the server's coin value. */
export const coinsToRupees = (coins: number, coinValuePaise: number) =>
  `₹${((coins * coinValuePaise) / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const STATUS_LABEL: Record<WithdrawalStatus, string> = {
  PENDING: "Requested",
  APPROVED: "Approved, payment on the way",
  PAID: "Paid",
  REJECTED: "Not approved, coins returned",
  CANCELLED: "Cancelled, coins returned",
};

/** Client-side checks that mirror the server, so most mistakes show before sending. */
export function validateWithdrawal(r: WithdrawalRequest, s: Pick<WithdrawalSummary, "minCoins" | "maxCoinsNow">): string | null {
  if (!Number.isInteger(r.coins) || r.coins <= 0) return "Enter a whole number of coins.";
  if (r.coins < s.minCoins) return `The minimum withdrawal is ${s.minCoins.toLocaleString("en-IN")} coins.`;
  if (r.coins > s.maxCoinsNow) return `You can withdraw up to ${s.maxCoinsNow.toLocaleString("en-IN")} coins right now.`;
  if (!/^[A-Za-z][A-Za-z .']{1,99}$/.test(r.accountHolderName.trim())) return "Enter the account holder's name as on the account.";
  if (r.method === "UPI") {
    if (!/^[a-z0-9._-]{2,256}@[a-z][a-z0-9]{1,63}$/.test((r.upiId || "").trim().toLowerCase())) return "Enter a valid UPI ID, e.g. name@okbank.";
  } else {
    if (!/^\d{9,18}$/.test((r.accountNumber || "").replace(/\s/g, ""))) return "Enter a valid bank account number (9 to 18 digits).";
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test((r.ifsc || "").trim().toUpperCase())) return "Enter a valid IFSC code, e.g. SBIN0001234.";
  }
  return null;
}
