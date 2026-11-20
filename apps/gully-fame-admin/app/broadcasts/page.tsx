'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Megaphone, RefreshCw, Send } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import Pagination from '@/components/Pagination';
import { notify, confirmDialog } from '@/components/Feedback';
import { formatDate, formatNumber } from '@/lib/utils';
import { countAudience, listBroadcasts, sendBroadcast, type BroadcastAudience, type BroadcastRow } from '@/lib/financeApi';

const PAGE_SIZE = 20;
const TITLE_MAX = 80;
const BODY_MAX = 300;
const AUDIENCE_LABEL: Record<BroadcastAudience, string> = { all: 'Everyone', participants: 'Participants', fans: 'Fans' };
const STATUS_STYLE = { SENDING: 'bg-blue-100 text-blue-800', SENT: 'bg-green-100 text-green-800', FAILED: 'bg-red-100 text-red-800' };

/** Send one notification to many users at once (A5). Each user gets it in-app, and as a push if enabled. */
export default function BroadcastsPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [audience, setAudience] = useState<BroadcastAudience>('all');
  const [sending, setSending] = useState(false);
  const [rows, setRows] = useState<BroadcastRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const latest = useRef(0);

  const load = useCallback(async () => {
    const id = ++latest.current;
    setLoading(true);
    setError(null);
    const res = await listBroadcasts({ page, limit: PAGE_SIZE });
    if (id !== latest.current) return;
    if (res.success && res.data) {
      setRows(res.data.items || []);
      setTotalPages(Math.max(1, res.data.pagination?.totalPages || 1));
      setTotal(res.data.pagination?.total || 0);
    } else {
      setRows([]);
      setError(res.message || 'Could not load broadcasts');
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  // While one is sending, refresh the list every few seconds.
  const anySending = rows.some((r) => r.status === 'SENDING');
  useEffect(() => {
    if (!anySending) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [anySending, load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    const d = description.trim();
    if (!t) return notify.error('Add a title');
    const count = await countAudience(audience);
    if (!count.success) return notify.error(count.message || 'Could not count the audience');
    const n = count.data?.recipients ?? 0;
    const ok = await confirmDialog(
      `Send "${t}" to ${formatNumber(n)} ${AUDIENCE_LABEL[audience].toLowerCase()}? This cannot be undone.`,
      { confirmLabel: 'Send now', danger: true }
    );
    if (!ok) return;
    setSending(true);
    const res = await sendBroadcast({ title: t, description: d, audience });
    setSending(false);
    if (res.success) {
      notify.success('Broadcast is being sent');
      setTitle('');
      setDescription('');
      setPage(1);
      load();
    } else {
      notify.error(res.message || 'Could not send the broadcast');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Broadcasts</h1>
          <p className="text-sm text-gray-600">
            One notification to many users. It appears in their in-app notifications, and as a push for users who allow pushes
            (push needs Firebase to be set up on the server).
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <div>
            <label htmlFor="bc-title" className="mb-1 block text-sm font-medium text-gray-700">
              Title <span className="text-gray-400">({title.length}/{TITLE_MAX})</span>
            </label>
            <input
              id="bc-title"
              value={title}
              maxLength={TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="New competition is live!"
            />
          </div>
          <div>
            <label htmlFor="bc-body" className="mb-1 block text-sm font-medium text-gray-700">
              Message <span className="text-gray-400">({description.length}/{BODY_MAX})</span>
            </label>
            <textarea
              id="bc-body"
              value={description}
              maxLength={BODY_MAX}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Enter before Sunday to win ₹10,000."
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as BroadcastAudience)}
              aria-label="Audience"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="all">Everyone</option>
              <option value="participants">Participants only</option>
              <option value="fans">Fans only</option>
            </select>
            <button
              type="submit"
              disabled={sending || !title.trim()}
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </button>
          </div>
        </form>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Sent</h2>
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

        {loading && rows.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">
            <Megaphone className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            Nothing sent yet.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((b) => (
              <div key={b.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-900">{b.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[b.status]}`}>{b.status.toLowerCase()}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{AUDIENCE_LABEL[b.audience]}</span>
                  <span className="ml-auto text-xs text-gray-500">{formatDate(b.createdAt)}</span>
                </div>
                {b.description && <p className="mt-2 text-sm text-gray-700">{b.description}</p>}
                <p className="mt-2 text-xs text-gray-500">
                  {formatNumber(b.recipients)} in-app · {formatNumber(b.pushesSent)} pushes
                  {b.error && <span className="ml-2 text-red-600">Error: {b.error}</span>}
                </p>
              </div>
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} disabled={loading} />
      </div>
    </DashboardLayout>
  );
}
