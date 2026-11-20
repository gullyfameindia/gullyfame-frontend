'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Loader2, User, MessageSquare, MessagesSquare } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import Pagination from '@/components/Pagination';
import { notify, confirmDialog } from '@/components/Feedback';
import { formatDate } from '@/lib/utils';
import {
  listUserReports,
  reviewUserReport,
  type UserReport,
  type UserReportAction,
  type UserReportStatus,
  type UserReportType,
} from '@/lib/userReportsApi';

const TYPE_LABEL: Record<UserReportType, string> = { user: 'Account', comment: 'Comment', chat: 'Chat' };
const TYPE_ICON = { user: User, comment: MessageSquare, chat: MessagesSquare };
const STATUS_STYLE: Record<UserReportStatus, string> = {
  open: 'bg-yellow-100 text-yellow-800',
  dismissed: 'bg-gray-100 text-gray-700',
  actioned: 'bg-green-100 text-green-800',
};
const REASON_LABEL: Record<string, string> = {
  spam: 'Spam',
  nudity: 'Nudity',
  violence: 'Violence',
  hate: 'Hate',
  harassment: 'Harassment',
  self_harm: 'Self-harm',
  copyright: 'Copyright',
  misinformation: 'False info',
  other: 'Other',
};

/** Reports about accounts, comments and chats (reel reports are on the Reports page). */
export default function UserReportsPage() {
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<UserReportStatus | 'all'>('open');
  const [type, setType] = useState<UserReportType | 'all'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const latest = useRef(0);

  const load = useCallback(async () => {
    const id = ++latest.current;
    setLoading(true);
    setError(null);
    const res = await listUserReports({ status, type, page, limit: 20 });
    if (id !== latest.current) return;
    if (res.success && res.data) {
      setReports(res.data.reports || []);
      setTotalPages(Math.max(1, res.data.totalPages || 1));
      setTotal(res.data.total || 0);
    } else {
      setError(res.message || 'Could not load reports');
      setReports([]);
    }
    setLoading(false);
  }, [status, type, page]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (report: UserReport, action: UserReportAction) => {
    const who = report.reportedUser?.username ? `@${report.reportedUser.username}` : 'this account';
    const question =
      action === 'dismiss'
        ? 'Dismiss this report? No action will be taken.'
        : action === 'remove_comment'
          ? 'Remove this comment from the app?'
          : `Deactivate ${who}? They will be signed out and cannot sign in again.`;
    if (!(await confirmDialog(question, { confirmLabel: action === 'dismiss' ? 'Dismiss' : 'Confirm' }))) return;
    setBusyId(report.id);
    const res = await reviewUserReport(report.id, action);
    setBusyId(null);
    if (res.success) {
      const extra = res.data?.alsoClosed ? ` (${res.data.alsoClosed} other report(s) on it closed too)` : '';
      notify.success(`Report updated${extra}`);
      load();
    } else {
      notify.error(res.message || 'Could not update the report');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Reports</h1>
            <p className="text-sm text-gray-600">Accounts, comments and chats reported from the app.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as UserReportStatus | 'all');
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              aria-label="Status"
            >
              <option value="open">Open</option>
              <option value="actioned">Actioned</option>
              <option value="dismissed">Dismissed</option>
              <option value="all">All</option>
            </select>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as UserReportType | 'all');
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              aria-label="Type"
            >
              <option value="all">All types</option>
              <option value="user">Accounts</option>
              <option value="comment">Comments</option>
              <option value="chat">Chats</option>
            </select>
            <button
              onClick={load}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">No reports here.</div>
        ) : (
          <div className="space-y-4">
            {reports.map((r) => {
              const Icon = TYPE_ICON[r.targetType] || User;
              return (
                <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Icon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-900">{TYPE_LABEL[r.targetType]}</span>
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                      {REASON_LABEL[r.reason] || r.reason}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.reviewStatus]}`}>
                      {r.reviewStatus}
                    </span>
                    <span className="ml-auto text-xs text-gray-500">{formatDate(r.createdAt)}</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                    <p>
                      <span className="text-gray-500">Reported: </span>
                      {r.reportedUser ? `${r.reportedUser.name} (@${r.reportedUser.username})` : 'Deleted account'}
                    </p>
                    <p>
                      <span className="text-gray-500">By: </span>
                      {r.reportedBy ? `${r.reportedBy.name} (@${r.reportedBy.username})` : 'Deleted account'}
                    </p>
                  </div>
                  {r.details && <p className="mt-2 text-sm text-gray-700">“{r.details}”</p>}
                  {r.snapshot && (
                    <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs text-gray-800">
                      {r.snapshot}
                    </pre>
                  )}
                  {r.reviewStatus === 'open' && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        disabled={busyId === r.id}
                        onClick={() => act(r, 'dismiss')}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Dismiss
                      </button>
                      {r.targetType === 'comment' && (
                        <button
                          disabled={busyId === r.id}
                          onClick={() => act(r, 'remove_comment')}
                          className="rounded-lg bg-orange-600 px-3 py-2 text-sm text-white hover:bg-orange-700 disabled:opacity-50"
                        >
                          Remove comment
                        </button>
                      )}
                      <button
                        disabled={busyId === r.id}
                        onClick={() => act(r, 'deactivate_user')}
                        className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Deactivate account
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && <Pagination page={page} totalPages={totalPages} total={total} pageSize={20} onPageChange={setPage} disabled={loading} />}
      </div>
    </DashboardLayout>
  );
}
