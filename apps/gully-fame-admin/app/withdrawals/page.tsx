'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Banknote, Copy, Loader2, RefreshCw } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import Pagination from '@/components/Pagination';
import { notify, confirmDialog } from '@/components/Feedback';
import { formatDate } from '@/lib/utils';
import { listWithdrawals, reviewWithdrawal, type WithdrawalRow, type WithdrawalStatus } from '@/lib/financeApi';

const PAGE_SIZE = 20;
const STATUS_STYLE: Record<WithdrawalStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-700',
};
const FLAG_LABEL: Record<string, string> = {
  NAME_MISMATCH: 'Name does not match profile',
  NO_PROFILE_NAME: 'No profile name',
  FEW_TIPPERS: 'Tips from very few accounts',
  SHARED_DEVICE: 'Same phone as tippers/referrals',
};

function copy(text: string) {
  navigator.clipboard?.writeText(text).then(
    () => notify.success('Copied'),
    () => notify.error('Could not copy')
  );
}

/**
 * Withdrawals (B18). Pay outside the app (bank transfer / UPI) within 24-48 hours, then mark the
 * request Paid with the UTR / UPI reference. Rejecting returns the coins to the user's wallet.
 */
export default function WithdrawalsPage() {
  const [rows, setRows] = useState<WithdrawalRow[]>([]);
  const [summary, setSummary] = useState({ pending: 0, approved: 0, toPay: '₹0', paidTotal: '₹0' });
  const [status, setStatus] = useState('open');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const latest = useRef(0);

  const load = useCallback(async () => {
    const id = ++latest.current;
    setLoading(true);
    setError(null);
    const res = await listWithdrawals({ page, limit: PAGE_SIZE, status });
    if (id !== latest.current) return;
    if (res.success && res.data) {
      setRows(res.data.items || []);
      setSummary(res.data.summary || { pending: 0, approved: 0, toPay: '₹0', paidTotal: '₹0' });
      setTotalPages(Math.max(1, res.data.pagination?.totalPages || 1));
      setTotal(res.data.pagination?.total || 0);
    } else {
      setRows([]);
      setError(res.message || 'Could not load withdrawals');
    }
    setLoading(false);
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (w: WithdrawalRow, action: 'approve' | 'mark_paid' | 'reject') => {
    const who = w.user?.username ? `@${w.user.username}` : w.accountHolderName;
    let body: Parameters<typeof reviewWithdrawal>[1];
    if (action === 'approve') {
      if (!(await confirmDialog(`Approve ${w.amount} for ${who}? Check the KYC document name matches "${w.accountHolderName}".`, { confirmLabel: 'Approve' }))) return;
      body = { action };
    } else if (action === 'mark_paid') {
      const paymentRef = (refs[w.id] || '').trim();
      if (paymentRef.length < 3) return notify.error('Enter the UTR / UPI reference first');
      if (!(await confirmDialog(`Mark ${w.amount} to ${who} as paid with reference ${paymentRef}? The user is notified.`, { confirmLabel: 'Mark paid' }))) return;
      body = { action, paymentRef };
    } else {
      const reason = (reasons[w.id] || '').trim();
      if (reason.length < 3) return notify.error('Enter a reason first (the user sees it)');
      if (!(await confirmDialog(`Reject ${w.amount} for ${who}? ${w.coins} coins go back to their wallet.`, { confirmLabel: 'Reject', danger: true }))) return;
      body = { action, reason };
    }
    setBusyId(w.id);
    const res = await reviewWithdrawal(w.id, body);
    setBusyId(null);
    if (res.success) {
      notify.success(action === 'approve' ? 'Approved' : action === 'mark_paid' ? 'Marked as paid' : 'Rejected, coins returned');
      load();
    } else {
      notify.error(res.message || 'Could not update the withdrawal');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Withdrawals</h1>
            <p className="text-sm text-gray-600">
              Pay by bank transfer or UPI within 24-48 hours, then mark as paid with the reference. 1 coin = ₹0.10.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              aria-label="Status"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="open">To do (requested + approved)</option>
              <option value="PENDING">Requested</option>
              <option value="APPROVED">Approved</option>
              <option value="PAID">Paid</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="">All</option>
            </select>
            <button
              onClick={load}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          {[
            ['Requested', String(summary.pending)],
            ['Approved', String(summary.approved)],
            ['To pay', summary.toPay],
            ['Paid so far', summary.paidTotal],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-sm text-gray-500">{label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">
            <Banknote className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            Nothing here.
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((w) => {
              const open = w.status === 'PENDING' || w.status === 'APPROVED';
              const payTo = w.method === 'UPI' ? w.upiId : `${w.accountNumber} · ${w.ifsc}`;
              return (
                <div key={w.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">{w.amount}</span>
                    <span className="text-sm text-gray-500">{w.coins.toLocaleString('en-IN')} coins</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[w.status]}`}>{w.status.toLowerCase()}</span>
                    <span className="ml-auto text-xs text-gray-500">Requested {formatDate(w.createdAt)}</span>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                    <p>
                      <span className="text-gray-500">User: </span>
                      {w.userId ? (
                        <Link href={`/users/${w.userId}`} className="text-primary-700 hover:underline">
                          {`${w.user?.firstName || ''} ${w.user?.lastName || ''}`.trim() || 'User'}
                          {w.user?.username && ` (@${w.user.username})`}
                        </Link>
                      ) : (
                        'Deleted account'
                      )}
                      {w.userId && (
                        <Link href={`/users/${w.userId}/kyc`} className="ml-2 text-xs text-primary-700 hover:underline">
                          View KYC
                        </Link>
                      )}
                    </p>
                    <p>
                      <span className="text-gray-500">Name on account: </span>
                      <strong>{w.accountHolderName}</strong>
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="text-gray-500">{w.method === 'UPI' ? 'UPI ID:' : 'Bank:'}</span>
                      <span className="font-mono">{payTo}</span>
                      <button onClick={() => copy(w.method === 'UPI' ? w.upiId : w.accountNumber)} aria-label="Copy payout details" className="text-gray-400 hover:text-gray-700">
                        <Copy className="h-4 w-4" />
                      </button>
                    </p>
                    {w.status === 'PAID' && (
                      <p>
                        <span className="text-gray-500">Paid: </span>
                        {w.paidAt ? formatDate(w.paidAt) : ''} · ref <span className="font-mono">{w.paymentRef}</span>
                      </p>
                    )}
                    {w.status === 'REJECTED' && (
                      <p>
                        <span className="text-gray-500">Reason: </span>
                        {w.rejectReason}
                      </p>
                    )}
                  </div>

                  {w.flags.length > 0 && (
                    <div className="mt-3 space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      {w.flags.map((f) => (
                        <p key={f.code} className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                          <span>
                            <strong>{FLAG_LABEL[f.code] || f.code}:</strong> {f.detail}
                          </span>
                        </p>
                      ))}
                    </div>
                  )}

                  {open && (
                    <div className="mt-4 grid gap-3 lg:grid-cols-3">
                      <div className="flex items-end">
                        {w.status === 'PENDING' && (
                          <button
                            disabled={busyId === w.id}
                            onClick={() => act(w, 'approve')}
                            className="w-full rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                          >
                            Approve
                          </button>
                        )}
                      </div>
                      <div>
                        <label htmlFor={`ref-${w.id}`} className="mb-1 block text-xs text-gray-500">
                          UTR / UPI reference
                        </label>
                        <div className="flex gap-2">
                          <input
                            id={`ref-${w.id}`}
                            value={refs[w.id] || ''}
                            onChange={(e) => setRefs({ ...refs, [w.id]: e.target.value })}
                            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            placeholder="e.g. 432112345678"
                          />
                          <button
                            disabled={busyId === w.id}
                            onClick={() => act(w, 'mark_paid')}
                            className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            Mark paid
                          </button>
                        </div>
                      </div>
                      <div>
                        <label htmlFor={`reason-${w.id}`} className="mb-1 block text-xs text-gray-500">
                          Reject reason (user sees it)
                        </label>
                        <div className="flex gap-2">
                          <input
                            id={`reason-${w.id}`}
                            value={reasons[w.id] || ''}
                            onChange={(e) => setReasons({ ...reasons, [w.id]: e.target.value })}
                            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            placeholder="e.g. Name does not match KYC"
                          />
                          <button
                            disabled={busyId === w.id}
                            onClick={() => act(w, 'reject')}
                            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} disabled={loading} />
      </div>
    </DashboardLayout>
  );
}
