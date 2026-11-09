'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useState, useEffect, useCallback, useRef } from 'react';
import { DollarSign, CheckCircle, XCircle, Eye, Trophy, User, Mail, Phone, RefreshCw, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getUserRole } from '@/lib/auth';
import { getEarnings, getWinners, getTopEarners, type Earnings, type Winner } from '@/lib/earningsApi';
import { usePagedItems } from '@/lib/hooks';
import Pagination from '@/components/Pagination';

export default function TipsPage() {
  const userRole = getUserRole();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [earnings, setEarnings] = useState<Earnings[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [topEarners, setTopEarners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalTips: 0,
    totalCoinsDistributed: 0,
    totalWinners: 0,
  });

  // Only the newest request may update state (rapid refresh clicks can overlap).
  const latestRequest = useRef(0);

  const fetchData = useCallback(async () => {
    const requestId = ++latestRequest.current;
    try {
      setLoading(true);
      setError(null);

      const [earningsResult, winnersResult, topEarnersResult] = await Promise.all([
        getEarnings({ page: 1, limit: 100 }),
        getWinners(),
        getTopEarners(),
      ]);
      if (requestId !== latestRequest.current) return;

      // Compute stats from the freshly fetched data. Reading the `earnings` / `winners`
      // state here would use the values from before this request (empty on first load).
      const fetchedEarnings: Earnings[] =
        earningsResult.success && earningsResult.data ? earningsResult.data.items || [] : [];
      const fetchedWinners: Winner[] =
        winnersResult.success && winnersResult.data ? winnersResult.data || [] : [];

      if (earningsResult.success && earningsResult.data) {
        setEarnings(fetchedEarnings);
      }

      if (winnersResult.success && winnersResult.data) {
        setWinners(fetchedWinners);
      }

      if (topEarnersResult.success && topEarnersResult.data) {
        setTopEarners(topEarnersResult.data || []);
      }

      const tipsData = fetchedEarnings.filter(e => e.category === 'TIP' || e.type === 'CREDIT');
      const totalTips = tipsData.reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalCoins = fetchedEarnings
        .filter(e => e.category === 'COMPETITION_WIN' || e.category === 'WINNER')
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      setStats({
        totalTips,
        totalCoinsDistributed: totalCoins,
        totalWinners: fetchedWinners.length,
      });
    } catch (err: any) {
      if (requestId !== latestRequest.current) return;
      console.error('Error fetching tips and earnings data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userRole === 'admin') {
      fetchData();
    }
  }, [userRole, fetchData]);

  
  const allData = [
    ...earnings.map((earning) => ({
      id: earning.id || earning._id || '',
      type: 'tip' as const,
      userName: earning.userId || 'Unknown User',
      amount: earning.amount || 0,
      status: earning.status?.toLowerCase() || 'pending',
      date: earning.createdAt ? new Date(earning.createdAt).toISOString().split('T')[0] : '',
      competitionId: typeof earning.competitionId === 'object' 
        ? earning.competitionId?._id || '' 
        : (earning.competitionId || ''),
      competitionName: typeof earning.competitionId === 'object' 
        ? earning.competitionId?.title || '' 
        : '',
      userId: earning.userId || '',
      description: earning.description,
    })),
    ...winners.map((winner, index) => ({
      id: winner.id || winner._id || `winner-${index}`,
      type: 'winner' as const,
      userName: winner.userName || winner.firstName || 'Unknown',
      userId: winner.userId || '',
      competitionId: '',
      competitionName: '',
      competitionDate: '',
      position: winner.rank || index + 1,
      totalTips: 0,
      coinsEarned: winner.totalEarnings || winner.totalWinnings || 0,
      date: '',
      userEmail: '',
      userMobile: '',
      participations: 0,
      totalWins: winner.competitionsWon || 0,
    })),
  ].sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });

  const { page, setPage, totalPages, total, pageSize, pageItems } = usePagedItems(allData, 20);

  if (userRole !== 'admin') {
    return <div>Access Denied</div>;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchData}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tips & Earnings</h1>
            <p className="mt-2 text-sm text-gray-500">Track tips, competition winners, and coins earned in competitions</p>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="flex space-x-2 border-b">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'all'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Transactions
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'stats'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Statistics
          </button>
        </div>

        {activeTab === 'all' && (
          <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Type</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">User</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Competition</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Competition Date</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Amount</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Position</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Total Coins Won</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allData.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-3 py-8 text-center text-sm text-gray-500">
                        No data available
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3 whitespace-nowrap">
                        {item.type === 'tip' ? (
                          <span className="px-1.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-blue-100 text-blue-800">
                            Tip
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Winner
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs font-medium text-gray-900">{item.userName}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-600 max-w-[120px] truncate">{item.competitionName || '-'}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                        {item.type === 'winner' && 'competitionDate' in item && item.competitionDate ? (
                          item.competitionDate
                        ) : item.type === 'tip' && 'date' in item ? (
                          item.date
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {item.type === 'tip' && 'amount' in item && item.amount ? (
                          <span className="text-xs font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {item.type === 'winner' && 'position' in item && item.position ? (
                          <span className="px-1.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            #{item.position}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {item.type === 'winner' && 'coinsEarned' in item && item.coinsEarned ? (
                          <span className="text-xs font-bold text-primary-600">{item.coinsEarned.toLocaleString()} coins</span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {'status' in item && item.status ? (
                          <span className={`px-1.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full ${
                            item.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {item.status}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-green-100 text-green-800">
                            Done
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">{item.date}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs font-medium">
                        <button 
                          onClick={() => {
                            setSelectedUser(item);
                            setShowUserDetailsModal(true);
                          }}
                          className="text-primary-600 hover:text-primary-900 flex items-center space-x-1 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
              <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tips</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(stats.totalTips)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Coins Distributed</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{stats.totalCoinsDistributed.toLocaleString()} coins</p>
                </div>
                <Trophy className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Competition Winners</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{stats.totalWinners}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>
        )}

        {}
        {showUserDetailsModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
                <h2 className="text-xl font-bold text-gray-900">User Details</h2>
                <button
                  aria-label="Close user details"
                  onClick={() => {
                    setShowUserDetailsModal(false);
                    setSelectedUser(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {}
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>User Information</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Username</p>
                      <p className="text-sm font-medium text-gray-900">{selectedUser.userName}</p>
                    </div>
                    {selectedUser.userEmail && (
                      <div>
                        <p className="text-xs text-gray-500 flex items-center space-x-1">
                          <Mail className="h-3 w-3" />
                          <span>Email</span>
                        </p>
                        <p className="text-sm font-medium text-gray-900">{selectedUser.userEmail}</p>
                      </div>
                    )}
                    {selectedUser.userMobile && (
                      <div>
                        <p className="text-xs text-gray-500 flex items-center space-x-1">
                          <Phone className="h-3 w-3" />
                          <span>Mobile</span>
                        </p>
                        <p className="text-sm font-medium text-gray-900">{selectedUser.userMobile}</p>
                      </div>
                    )}
                    {selectedUser.participations && (
                      <div>
                        <p className="text-xs text-gray-500">Total Participations</p>
                        <p className="text-sm font-medium text-gray-900">{selectedUser.participations}</p>
                      </div>
                    )}
                    {selectedUser.totalWins && (
                      <div>
                        <p className="text-xs text-gray-500">Total Wins</p>
                        <p className="text-sm font-medium text-gray-900">{selectedUser.totalWins}</p>
                      </div>
                    )}
                  </div>
                </div>

                {}
                {selectedUser.competitionName && (
                  <div className="border-b pb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <Trophy className="h-5 w-5" />
                      <span>Competition Details</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Competition Name</p>
                        <p className="text-sm font-medium text-gray-900">{selectedUser.competitionName}</p>
                      </div>
                      {selectedUser.position && (
                        <div>
                          <p className="text-xs text-gray-500">Position</p>
                          <p className="text-sm font-medium text-gray-900">#{selectedUser.position}</p>
                        </div>
                      )}
                      {selectedUser.date && (
                        <div>
                          <p className="text-xs text-gray-500">Date</p>
                          <p className="text-sm font-medium text-gray-900">{selectedUser.date}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <DollarSign className="h-5 w-5" />
                    <span>Tips & Earnings</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {'amount' in selectedUser && selectedUser.amount && (
                      <div className="rounded-lg bg-gray-50 p-4">
                        <p className="text-xs text-gray-500">Tip Amount</p>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedUser.amount)}</p>
                      </div>
                    )}
                    {'totalTips' in selectedUser && selectedUser.totalTips && (
                      <div className="rounded-lg bg-gray-50 p-4">
                        <p className="text-xs text-gray-500">Total Tips Received</p>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedUser.totalTips)}</p>
                      </div>
                    )}
                    {'coinsEarned' in selectedUser && selectedUser.coinsEarned && (
                      <div className="rounded-lg bg-primary-50 p-4 col-span-2">
                        <p className="text-xs text-gray-500">Coins Earned</p>
                        <p className="text-2xl font-bold text-primary-600">{selectedUser.coinsEarned.toLocaleString()} coins</p>
                      </div>
                    )}
                    {'status' in selectedUser && selectedUser.status && (
                      <div>
                        <p className="text-xs text-gray-500">Status</p>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          selectedUser.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedUser.status}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
