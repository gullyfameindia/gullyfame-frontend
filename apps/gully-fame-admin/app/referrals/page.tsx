'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2, RefreshCw, Search, Gift } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import Pagination from '@/components/Pagination';
import { formatDate, formatNumber } from '@/lib/utils';
import { listReferrals, type ReferralRow } from '@/lib/financeApi';

const PAGE_SIZE = 20;
const STATUS_STYLE = { PENDING: 'bg-yellow-100 text-yellow-800', REWARDED: 'bg-green-100 text-green-800' };

function PersonLink({ id, name, username }: { id?: string; name: string; username?: string }) {
  if (!id) return <span className="text-gray-500">Deleted account</span>;
  return (
    <Link href={`/users/${id}`} className="text-primary-700 hover:underline">
      {name || 'User'}
      {username && <span className="ml-1 text-gray-500">@{username}</span>}
    </Link>
  );
}

/** Who invited whom, and which referrals have paid out (A5). */
export default function ReferralsPage() {
  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [summary, setSummary] = useState({ pending: 0, rewarded: 0, coinsPaid: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'' | 'PENDING' | 'REWARDED'>('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const latest = useRef(0);

  const load = useCallback(async () => {
    const id = ++latest.current;
    setLoading(true);
    setError(null);
    const res = await listReferrals({ page, limit: PAGE_SIZE, status, q: search });
    if (id !== latest.current) return;
    if (res.success && res.data) {
      setRows(res.data.items || []);
      setSummary(res.data.summary || { pending: 0, rewarded: 0, coinsPaid: 0 });
      setTotalPages(Math.max(1, res.data.pagination?.totalPages || 1));
      setTotal(res.data.pagination?.total || 0);
    } else {
      setRows([]);
      setError(res.message || 'Could not load referrals');
    }
    setLoading(false);
  }, [page, status, search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Referrals</h1>
            <p className="text-sm text-gray-600">Sign-ups with a friend&apos;s code. Coins are paid when the new user qualifies.</p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 self-start rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ['Pending', summary.pending],
            ['Rewarded', summary.rewarded],
            ['Coins paid', summary.coinsPaid],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-sm text-gray-500">{label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{formatNumber(Number(value))}</p>
            </div>
          ))}
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
              placeholder="Search either user"
              aria-label="Search referrals"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as '' | 'PENDING' | 'REWARDED');
              setPage(1);
            }}
            aria-label="Status"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="REWARDED">Rewarded</option>
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
            <Gift className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            No referrals found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Invited by</th>
                  <th className="px-4 py-3">New user</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Coins (inviter / new user)</th>
                  <th className="px-4 py-3">Signed up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      <PersonLink id={r.referrer?._id} name={r.referrerName} username={r.referrer?.username} />
                    </td>
                    <td className="px-4 py-3">
                      <PersonLink id={r.referee?._id} name={r.refereeName} username={r.referee?.username} />
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-700">{r.code}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}>{r.status.toLowerCase()}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {r.status === 'REWARDED' ? `${formatNumber(r.referrerCoins)} / ${formatNumber(r.refereeCoins)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(r.createdAt)}</td>
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
