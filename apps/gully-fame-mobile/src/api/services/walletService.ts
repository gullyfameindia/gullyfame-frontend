import RazorpayCheckout from "react-native-razorpay";
import { apiGet, apiPost, ApiError, toResult } from "../client";

/**
 * Wallet (1 coin = 1 rupee).
 *
 * Recharge flow:
 *  1. POST /user/wallet/recharge { amount }            -> Razorpay order
 *  2. Razorpay Checkout with keyId/orderId/amountPaise from step 1
 *  3. POST /user/wallet/recharge/verify { razorpay_* } -> wallet credited
 *  If the app loses the checkout result, GET /user/wallet/recharge/:orderId
 *  reports the order status (the backend webhook also credits PAID orders).
 */

export type TransactionType = "RECHARGE" | "TIP_SENT" | "TIP_RECEIVED" | "MISSION_REWARD" | "COMPETITION_WIN";

export interface WalletTransaction {
  _id: string;
  user: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  relatedReel: string | null;
  relatedUser: string | null;
  /** Set on COMPETITION_WIN: the competition the prize came from. */
  relatedCompetition?: string | null;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletData {
  balance: number;
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  transactions: WalletTransaction[];
}

export interface RechargeOrder {
  keyId: string;
  orderId: string;
  amount: number;
  amountPaise: number;
  currency: string;
  receipt: string;
}

export interface RechargeVerification {
  orderId: string;
  paymentId: string;
  status: "PAID";
  credited: number;
  alreadyProcessed: boolean;
  balance: number;
}

export interface RechargeStatus {
  orderId: string;
  paymentId: string | null;
  amount: number;
  currency: string;
  status: "CREATED" | "PAID" | "FAILED" | string;
  failureReason: string;
  paidAt: string | null;
  createdAt: string;
}

export interface TipResult {
  tipped: number;
  remainingBalance: number;
}

/** Backend defaults (WALLET_MIN_RECHARGE / WALLET_MAX_RECHARGE). */
export const RECHARGE_LIMITS = { min: 1, max: 100000 };

export const TRANSACTION_LABELS: Record<TransactionType, string> = {
  RECHARGE: "Wallet recharge",
  TIP_SENT: "Tip sent",
  TIP_RECEIVED: "Tip received",
  MISSION_REWARD: "Daily mission reward",
  COMPETITION_WIN: "Competition prize",
};

/** Credits add to the balance, debits subtract. */
export const isCredit = (type: TransactionType) => type !== "TIP_SENT";

export interface DisplayTransaction {
  /** earned = tips received / mission rewards / competition prizes, recharge = coins bought, spent = tips sent. */
  kind: "earned" | "recharge" | "spent";
  id: string;
  title: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  date: string;
  time: string;
  icon: string;
}

const TRANSACTION_ICONS: Record<TransactionType, string> = {
  RECHARGE: "add-circle-outline",
  TIP_SENT: "heart-outline",
  TIP_RECEIVED: "gift-outline",
  MISSION_REWARD: "trophy-outline",
  COMPETITION_WIN: "medal-outline",
};

/** Maps a backend transaction to what the wallet screens render. */
export function toDisplayTransaction(tx: WalletTransaction): DisplayTransaction {
  const when = new Date(tx.createdAt);
  return {
    id: tx._id,
    title: TRANSACTION_LABELS[tx.type] || "Transaction",
    description: tx.note || `Balance after: ${tx.balanceAfter.toLocaleString()} coins`,
    amount: Math.abs(tx.amount),
    type: isCredit(tx.type) ? "credit" : "debit",
    kind: tx.type === "RECHARGE" ? "recharge" : tx.type === "TIP_SENT" ? "spent" : "earned",
    date: when.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    time: when.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    icon: TRANSACTION_ICONS[tx.type] || "swap-horizontal-outline",
  };
}

/** GET /user/wallet?page&limit -> balance plus a page of transactions. */
export const getWallet = (page = 1, limit = 20) => apiGet<WalletData>("user/wallet", { params: { page, limit } });

/**
 * The one source of truth for coins: the balance plus EVERY transaction (all pages).
 * Coins screen, Wallet history and the profile menu all read from this, so they agree.
 *  - earned: tips received + daily mission rewards (coins earned by activity)
 *  - recharged: coins bought with a wallet recharge (not earned)
 *  - spent: tips sent
 */
export interface WalletSummary {
  balance: number;
  earned: number;
  recharged: number;
  spent: number;
  transactions: WalletTransaction[];
}

export async function getWalletSummary(pageSize = 100): Promise<WalletSummary> {
  const first = await getWallet(1, pageSize);
  const transactions = [...first.transactions];
  let page = 1;
  let hasMore = first.hasMore;
  while (hasMore) {
    page += 1;
    const next = await getWallet(page, pageSize);
    transactions.push(...next.transactions);
    hasMore = next.hasMore && next.transactions.length > 0;
  }
  const sum = (types: TransactionType[]) =>
    transactions.filter((tx) => types.includes(tx.type)).reduce((total, tx) => total + Math.abs(tx.amount), 0);
  return {
    balance: first.balance,
    earned: sum(["TIP_RECEIVED", "MISSION_REWARD", "COMPETITION_WIN"]),
    recharged: sum(["RECHARGE"]),
    spent: sum(["TIP_SENT"]),
    transactions,
  };
}

export const getWalletBalance = () => toResult(async () => ({ balance: (await getWallet(1, 1)).balance }));

export const createRechargeOrder = (amount: number) =>
  apiPost<RechargeOrder>("user/wallet/recharge", { amount });

export const verifyRecharge = (payment: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) => apiPost<RechargeVerification>("user/wallet/recharge/verify", payment);

export const getRechargeStatus = (orderId: string) =>
  apiGet<RechargeStatus>(`user/wallet/recharge/${encodeURIComponent(orderId)}`);

/** Polls the order a few times after an interrupted checkout. */
export async function pollRechargeStatus(orderId: string, attempts = 5, intervalMs = 3000): Promise<RechargeStatus> {
  let last = await getRechargeStatus(orderId);
  for (let i = 1; i < attempts && last.status !== "PAID" && last.status !== "FAILED"; i++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    last = await getRechargeStatus(orderId);
  }
  return last;
}

export interface RechargeOutcome {
  status: "paid" | "cancelled" | "failed" | "pending";
  message: string;
  balance?: number;
  orderId?: string;
}

/**
 * Runs the whole recharge: order -> Razorpay Checkout -> verify.
 * Never throws; the outcome says what happened.
 */
export async function rechargeWallet(
  amount: number,
  prefill: { name?: string; email?: string; contact?: string } = {}
): Promise<RechargeOutcome> {
  if (!Number.isInteger(amount) || amount < RECHARGE_LIMITS.min || amount > RECHARGE_LIMITS.max) {
    return {
      status: "failed",
      message: `Enter a whole amount between ₹${RECHARGE_LIMITS.min} and ₹${RECHARGE_LIMITS.max.toLocaleString("en-IN")}.`,
    };
  }

  let order: RechargeOrder;
  try {
    order = await createRechargeOrder(amount);
  } catch (error) {
    return { status: "failed", message: error instanceof ApiError ? error.message : "Could not start the payment." };
  }

  let checkout: { razorpay_payment_id: string; razorpay_order_id?: string; razorpay_signature: string };
  try {
    checkout = (await RazorpayCheckout.open({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amountPaise,
      currency: order.currency,
      name: "Gully Fame",
      description: `Wallet recharge ₹${order.amount}`,
      prefill,
      theme: { color: "#EC9A15" },
    })) as unknown as typeof checkout;
  } catch (error: any) {
    // Razorpay rejects with code 0 / 2 when the user closes the sheet.
    const cancelled = error?.code === 0 || error?.code === 2 || /cancel/i.test(error?.description || "");
    if (cancelled) return { status: "cancelled", message: "Payment cancelled.", orderId: order.orderId };
    // The sheet can fail after the payment went through; check the order before reporting failure.
    try {
      const status = await pollRechargeStatus(order.orderId, 2, 2000);
      if (status.status === "PAID") {
        const wallet = await getWallet(1, 1);
        return { status: "paid", message: "Wallet recharged successfully", balance: wallet.balance, orderId: order.orderId };
      }
    } catch {
      // Fall through to the failure message.
    }
    return {
      status: "failed",
      message: error?.description || "Payment failed. Please try again.",
      orderId: order.orderId,
    };
  }

  try {
    const verified = await verifyRecharge({
      razorpay_order_id: checkout.razorpay_order_id || order.orderId,
      razorpay_payment_id: checkout.razorpay_payment_id,
      razorpay_signature: checkout.razorpay_signature,
    });
    return { status: "paid", message: "Wallet recharged successfully", balance: verified.balance, orderId: order.orderId };
  } catch {
    // Verification can fail on a network drop; the webhook may still credit the order.
    try {
      const status = await pollRechargeStatus(order.orderId);
      if (status.status === "PAID") {
        const wallet = await getWallet(1, 1);
        return { status: "paid", message: "Wallet recharged successfully", balance: wallet.balance, orderId: order.orderId };
      }
    } catch {
      // Keep the pending outcome below.
    }
    return {
      status: "pending",
      message: "We received your payment but couldn't confirm it yet. Your balance will update shortly.",
      orderId: order.orderId,
    };
  }
}

/** POST /reels/:reelId/tip { amount } - moves coins to the reel's author. */
export const tipReel = (reelId: string, amount: number) => apiPost<TipResult>(`reels/${reelId}/tip`, { amount });

export const walletService = {
  getWallet,
  getWalletBalance,
  createRechargeOrder,
  verifyRecharge,
  getRechargeStatus,
  pollRechargeStatus,
  rechargeWallet,
  tipReel,
};

export default walletService;
