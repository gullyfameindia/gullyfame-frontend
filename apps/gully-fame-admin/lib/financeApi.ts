import { apiRequest } from './http';

/** Wallets, referrals and broadcast notifications (backend A5). Platform admins only. */

export interface Person {
  _id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  mobile?: string;
  isActive?: boolean;
}

export interface Paged<T, S = undefined> {
  items: T[];
  summary: S;
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export interface WalletRow {
  id: string;
  userId: string | null;
  user: Person | null;
  userName: string;
  balance: number;
  updatedAt: string;
}

export interface ReferralRow {
  id: string;
  code: string;
  status: 'PENDING' | 'REWARDED';
  referrer: Person | null;
  referrerName: string;
  referee: Person | null;
  refereeName: string;
  referrerCoins: number;
  refereeCoins: number;
  createdAt: string;
  rewardedAt: string | null;
}

export type BroadcastAudience = 'all' | 'participants' | 'fans';

export interface BroadcastRow {
  id: string;
  title: string;
  description: string;
  audience: BroadcastAudience;
  status: 'SENDING' | 'SENT' | 'FAILED';
  recipients: number;
  pushesSent: number;
  createdAt: string;
  finishedAt: string | null;
  error: string;
}

export const listWallets = (query: { page?: number; limit?: number; q?: string; sort?: 'balance' | 'recent' }) =>
  apiRequest<Paged<WalletRow, { totalCoins: number; wallets: number }>>('GET', 'admin/wallets', { query });

export const listReferrals = (query: { page?: number; limit?: number; q?: string; status?: 'PENDING' | 'REWARDED' | '' }) =>
  apiRequest<Paged<ReferralRow, { pending: number; rewarded: number; coinsPaid: number }>>('GET', 'admin/referrals', { query });

export const listBroadcasts = (query: { page?: number; limit?: number }) =>
  apiRequest<Paged<BroadcastRow>>('GET', 'admin/broadcasts', { query });

export const countAudience = (audience: BroadcastAudience) =>
  apiRequest<{ audience: string; recipients: number }>('GET', 'admin/broadcasts/audience', { query: { audience } });

export const sendBroadcast = (body: { title: string; description: string; audience: BroadcastAudience }) =>
  apiRequest<{ broadcast: BroadcastRow }>('POST', 'admin/broadcasts', { body: { ...body, confirm: true } });

/* ---------------- Withdrawals (backend B18) ---------------- */

export type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' | 'CANCELLED';

export interface WithdrawalRow {
  id: string;
  coins: number;
  amountPaise: number;
  amount: string;
  method: 'UPI' | 'BANK';
  upiId: string;
  accountNumber: string;
  ifsc: string;
  accountHolderName: string;
  status: WithdrawalStatus;
  flags: { code: string; detail: string }[];
  rejectReason: string;
  paymentRef: string;
  user: Person | null;
  userId: string | null;
  createdAt: string;
  approvedAt: string | null;
  paidAt: string | null;
}

export const listWithdrawals = (query: { page?: number; limit?: number; status?: string }) =>
  apiRequest<Paged<WithdrawalRow, { pending: number; approved: number; toPay: string; paidTotal: string }>>(
    'GET',
    'admin/withdrawals',
    { query }
  );

export const reviewWithdrawal = (
  id: string,
  body: { action: 'approve' } | { action: 'mark_paid'; paymentRef: string } | { action: 'reject'; reason: string }
) => apiRequest<{ withdrawal: WithdrawalRow }>('PATCH', `admin/withdrawals/${encodeURIComponent(id)}`, { body });
