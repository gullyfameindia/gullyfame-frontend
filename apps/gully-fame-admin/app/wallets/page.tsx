'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2, RefreshCw, Search, Wallet } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import Pagination from '@/components/Pagination';
import { formatDate, formatNumber } from '@/lib/utils';
import { listWallets, type WalletRow } from '@/lib/financeApi';

const PAGE_SIZE = 20;

/** Coin balances of every user (A5). Per-user history: Users → user → Earnings, or Tips & Earnings. */
export default function WalletsPage() {
  const [rows, setRows] = useState<WalletRow[]>([]);
  const [summary, setSummary] = useState({ totalCoins: 0, wallets: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'balance' | 'recent'>('balance');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const latest = useRef(0);

  const load = useCallback(async () => {
    const id = ++latest.current;
    setLoading(true);
    setError(null);
    const res = await listWallets({ page, limit: PAGE_SIZE, q: search, sort });
    if (id !== latest.current) return;
    if (res.success && res.data) {
      setRows(res.data.items || []);
      setSummary(res.data.summary || { totalCoins: 0, wallets: 0 });
      setTotalPages(Math.max(1, res.data.pagination?.totalPages || 1));
      setTotal(res.data.pagination?.total || 0);
    } else {
      setRows([]);
      setError(res.message || 'Could not load wallets');
    }
    setLoading(false);
  }, [page, search, sort]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Wallets</h1>
            <p className="text-sm text-gray-600">Coin balances of all users.</p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 self-start rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Coins held by users</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatNumber(summary.totalCoins)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Wallets</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatNumber(summary.wallets)}</p>
          </div>
        </div>

        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(q.trim());
          }}
        >
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, username, email or mobile"
              aria-label="Search wallets"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as 'balance' | 'recent');
              setPage(1);
            }}
            aria-label="Sort"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="balance">Highest balance</option>
            <option value="recent">Recently changed</option>
          </select>
          <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
            Search
          </button>
        </form>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">
            <Wallet className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            No wallets found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3 text-right">Balance (coins)</th>
                  <th className="px-4 py-3">Last change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((w) => (
                  <tr key={w.id}>
                    <td className="px-4 py-3">
                      {w.userId ? (
                        <Link href={`/users/${w.userId}`} className="font-medium text-primary-700 hover:underline">
                          {w.userName || 'User'}
                        </Link>
                      ) : (
                        <span className="text-gray-500">Deleted account</span>
                      )}
                      {w.user?.username && <span className="ml-1 text-gray-500">@{w.user.username}</span>}
                      {w.user?.isActive === false && (
                        <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{w.user?.email || w.user?.mobile || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatNumber(w.balance)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(w.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} disabled={loading} />
      </div>
    </DashboardLayout>
  );
}
