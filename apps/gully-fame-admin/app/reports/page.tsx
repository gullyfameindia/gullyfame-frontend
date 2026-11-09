'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { AlertCircle, CheckCircle, XCircle, Eye, RefreshCw, Loader2, Filter, Search, FileText, User, MessageSquare } from 'lucide-react';
import { getUserRole } from '@/lib/auth';
import { getReports, updateReportStatus, type Report, type ReportsListParams } from '@/lib/reportsApi';
import { formatDate } from '@/lib/utils';

export default function ReportsPage() {
  const [userRole, setUserRole] = useState<'admin' | 'sponsor'>('admin');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(20);
  
  
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'RESOLVED' | 'REJECTED'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'USER' | 'CONTENT' | 'COMPETITION'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<'RESOLVED' | 'REJECTED'>('RESOLVED');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Only the newest request may update state (filter/page changes can overlap).
  const latestRequest = useRef(0);
  // Synchronous lock for the resolve/reject submit (state alone can't stop a same-tick double click).
  const submittingRef = useRef(false);

  useEffect(() => {
    const role = getUserRole();
    if (role) setUserRole(role);
  }, []);

  const fetchReports = useCallback(async () => {
    const requestId = ++latestRequest.current;
    try {
      setLoading(true);
      setError(null);

      const params: ReportsListParams = {
        page,
        limit,
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }

      const result = await getReports(params);
      if (requestId !== latestRequest.current) return;

      if (result.success && result.data) {
        setReports(result.data.reports || []);
        setTotal(result.data.pagination?.total || 0);
        setTotalPages(result.data.pagination?.totalPages || 1);
      } else {
        setError(result.message || 'Failed to fetch reports');
        setReports([]);
      }
    } catch (err: any) {
      if (requestId !== latestRequest.current) return;
      console.error('Error fetching reports:', err);
      setError(err.message || 'Failed to load reports');
      setReports([]);
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [page, limit, statusFilter, typeFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleUpdateStatus = async () => {
    if (!selectedReport || submittingRef.current) return;
    submittingRef.current = true;

    try {
      setUpdatingStatus(true);
      const result = await updateReportStatus(selectedReport.id || selectedReport._id || '', {
        status: newStatus,
        resolutionNotes: resolutionNotes.trim() || undefined,
      });

      if (result.success) {
        setShowStatusModal(false);
        setSelectedReport(null);
        setResolutionNotes('');
        fetchReports(); 
      } else {
        alert(result.message || 'Failed to update report status');
      }
    } catch (err: any) {
      console.error('Error updating report status:', err);
      alert('Error updating report status: ' + err.message);
    } finally {
      submittingRef.current = false;
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'resolved') {
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Resolved</span>;
    } else if (statusLower === 'rejected') {
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Rejected</span>;
    } else {
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">Pending</span>;
    }
  };

  const getTypeBadge = (type: string) => {
    if (type === 'USER') {
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 flex items-center space-x-1"><User className="h-3 w-3" /><span>User</span></span>;
    } else if (type === 'CONTENT') {
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 flex items-center space-x-1"><FileText className="h-3 w-3" /><span>Content</span></span>;
    } else if (type === 'COMPETITION') {
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 flex items-center space-x-1"><MessageSquare className="h-3 w-3" /><span>Competition</span></span>;
    }
    return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">{type}</span>;
  };

  const filteredReports = reports.filter(report => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      report.reason?.toLowerCase().includes(searchLower) ||
      report.description?.toLowerCase().includes(searchLower) ||
      report.reportedBy?.name?.toLowerCase().includes(searchLower) ||
      report.reportedBy?.email?.toLowerCase().includes(searchLower)
    );
  });

  if (userRole !== 'admin') {
    return (
      <DashboardLayout>
        <div className="p-6">
          <p className="text-gray-600">Access Denied. Reports management is only available for admins.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports Management</h1>
            <p className="mt-2 text-sm text-gray-500">Manage user reports, content reports, and competition reports</p>
          </div>
          <button
            onClick={fetchReports}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {}
        <div className="rounded-lg bg-white shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search reports..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-9 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="all">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="RESOLVED">Resolved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as any);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="all">All Types</option>
                <option value="USER">User</option>
                <option value="CONTENT">Content</option>
                <option value="COMPETITION">Competition</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setSearchTerm('');
                  setPage(1);
                }}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {}
        <div className="rounded-lg bg-white shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-2">{error}</p>
              <button
                onClick={fetchReports}
                className="text-sm text-primary-600 hover:text-primary-800 underline"
              >
                Retry
              </button>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No reports found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Reason</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Reported By</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredReports.map((report) => (
                      <tr key={report.id || report._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getTypeBadge(report.type)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                          {report.reason || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-md truncate">
                          {report.description || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getStatusBadge(report.status)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {report.reportedBy?.name || report.reportedBy?.email || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {report.createdAt ? formatDate(report.createdAt) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {report.status === 'PENDING' && (
                            <button
                              onClick={() => {
                                setSelectedReport(report);
                                setNewStatus('RESOLVED');
                                setResolutionNotes('');
                                setShowStatusModal(true);
                              }}
                              className="text-primary-600 hover:text-primary-900 text-sm font-medium flex items-center space-x-1 transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                              <span>Update</span>
                            </button>
                          )}
                          {report.status !== 'PENDING' && report.resolutionNotes && (
                            <button
                              onClick={() => {
                                setSelectedReport(report);
                                setShowStatusModal(true);
                              }}
                              className="text-gray-600 hover:text-gray-900 text-sm font-medium flex items-center space-x-1 transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                              <span>View</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} reports
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {}
        {showStatusModal && selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedReport.status === 'PENDING' ? 'Update Report Status' : 'Report Details'}
                </h2>
                <button
                  aria-label="Close status dialog"
                  onClick={() => {
                    setShowStatusModal(false);
                    setSelectedReport(null);
                    setResolutionNotes('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {}
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500">Type</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{getTypeBadge(selectedReport.type)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Reason</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{selectedReport.reason || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Description</p>
                    <p className="text-sm text-gray-900 mt-1">{selectedReport.description || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Current Status</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{getStatusBadge(selectedReport.status)}</p>
                  </div>
                  {selectedReport.resolutionNotes && (
                    <div>
                      <p className="text-xs text-gray-500">Resolution Notes</p>
                      <p className="text-sm text-gray-900 mt-1">{selectedReport.resolutionNotes}</p>
                    </div>
                  )}
                </div>

                {}
                {selectedReport.status === 'PENDING' && (
                  <div className="space-y-4 border-t pt-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">New Status</label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value as 'RESOLVED' | 'REJECTED')}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      >
                        <option value="RESOLVED">Resolved</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Resolution Notes</label>
                      <textarea
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        rows={4}
                        placeholder="Add notes about how this report was resolved..."
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none"
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleUpdateStatus}
                        disabled={updatingStatus}
                        className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {updatingStatus ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Updating...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            <span>Update Status</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowStatusModal(false);
                          setSelectedReport(null);
                          setResolutionNotes('');
                        }}
                        className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
