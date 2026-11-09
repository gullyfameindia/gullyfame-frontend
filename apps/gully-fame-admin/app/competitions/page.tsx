'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Plus, Edit, Eye, Trash2, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getUserRole } from '@/lib/auth';
import { getCompetitions, deleteCompetition, type Competition } from '@/lib/competitionApi';
import { getStoredAdmin } from '@/lib/authApi';
import { useBusyActions, usePagedItems } from '@/lib/hooks';
import Pagination from '@/components/Pagination';

export default function CompetitionsPage() {
  const userRole = getUserRole();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { run, isBusy } = useBusyActions();
  const { page, setPage, totalPages, total, pageSize, pageItems } = usePagedItems(competitions, 20);
  // Only the newest request may update state (filter changes can overlap).
  const latestRequest = useRef(0);

  const fetchCompetitions = useCallback(async () => {
    const requestId = ++latestRequest.current;
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {};
      if (statusFilter) {
        params.status = statusFilter;
      }
      
      
      if (userRole === 'sponsor') {
        const adminData = getStoredAdmin();
        
        const sponsorId = adminData?._id || adminData?.id || adminData?.sponsorCode;

        if (sponsorId) {
          params.sponsorId = sponsorId;
        } else {
          console.warn('[Competitions] No sponsor ID found, cannot filter competitions');
        }
      }
      
      const result = await getCompetitions(params);
      if (requestId !== latestRequest.current) return;
      
      if (result.success && result.data) {
        let allCompetitions = result.data.items || [];
        
        
        allCompetitions.sort((a: Competition, b: Competition) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        
        
        const displayedCompetitions = userRole === 'sponsor' 
          ? allCompetitions.filter((c: Competition) => {
              const adminData = getStoredAdmin();
              const sponsorId = adminData?._id || adminData?.id || adminData?.sponsorCode;
              if (!sponsorId) {
                if (process.env.NODE_ENV === 'development') {
                  console.warn('[Competitions] No sponsor ID for filtering, hiding competition:', c.id);
                }
                return false;
              }
              
              
              const compSponsorId = typeof c.sponsorId === 'object' && c.sponsorId?._id 
                ? c.sponsorId._id 
                : (c.sponsorId || '');
              
              return compSponsorId === sponsorId || compSponsorId === adminData?.sponsorCode;
            })
          : allCompetitions;
        
        setCompetitions(displayedCompetitions);
      } else {
        setError(result.message || 'Failed to fetch competitions');
      }
    } catch (err: any) {
      if (requestId !== latestRequest.current) return;
      console.error('Error fetching competitions:', err);
      setError(err.message || 'Failed to load competitions');
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [statusFilter, userRole]);

  useEffect(() => {
    fetchCompetitions();
  }, [fetchCompetitions]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this competition?')) return;
    await run(`delete:${id}`, async () => {
      try {
        const result = await deleteCompetition(id);
        if (result.success) {
          alert('Competition deleted successfully!');
          fetchCompetitions();
        } else {
          alert(result.message || 'Failed to delete competition');
        }
      } catch (err: any) {
        alert('Error deleting competition: ' + err.message);
      }
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Manage Competitions</h1>
            <p className="mt-1 text-sm text-gray-500">
              {userRole === 'sponsor' ? 'Manage your competitions' : 'Manage all competitions and contests'}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All Status</option>
              <option value="CREATED">Created</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="LIVE">Live</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <button
              onClick={fetchCompetitions}
              className="flex items-center space-x-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            <a
              href="/competitions/create"
              className="flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              <Plus className="h-5 w-5" />
              <span>Create New Competition</span>
            </a>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading competitions...</p>
          </div>
        ) : competitions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No competitions found</p>
          </div>
        ) : (

        <div className="rounded-lg bg-white shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Title</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Prize</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Participants</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Dates</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pageItems.map((comp) => (
                <tr key={comp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-xs font-medium text-gray-900">{comp.title}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{comp.description}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-1.5 py-0.5 inline-flex text-[10px] leading-4 font-semibold rounded-full ${
                      comp.status === 'LIVE' ? 'bg-green-100 text-green-800' :
                      comp.status === 'UPCOMING' ? 'bg-blue-100 text-blue-800' :
                      comp.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                      comp.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                      comp.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      comp.status === 'CANCELLED' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {comp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                    {formatCurrency(comp.prizeAmount || comp.prizePool || 0)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                    {(Array.isArray(comp.participants) ? comp.participants.length : comp.participants) || comp.registered || 0}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-[10px] text-gray-500">
                    {formatDate(comp.startDate)} - {formatDate(comp.endDate)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs font-medium space-x-1.5">
                    <a
                      href={`/competitions/${comp.id}`}
                      className="text-blue-600 hover:text-blue-900"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4 inline" />
                    </a>
                    <a
                      href={`/competitions/${comp.id}/edit`}
                      className="text-primary-600 hover:text-primary-900"
                      title="Edit Competition"
                    >
                      <Edit className="h-4 w-4 inline" />
                    </a>
                    {userRole === 'admin' && (
                      <button
                        onClick={() => handleDelete(comp.id)}
                        disabled={isBusy(`delete:${comp.id}`)}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete Competition"
                      >
                        <Trash2 className="h-4 w-4 inline" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
        </div>
        )}
      </div>
    </DashboardLayout>
  );
}
