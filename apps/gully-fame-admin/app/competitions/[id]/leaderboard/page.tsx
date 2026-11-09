'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowLeft, Trophy, RefreshCw } from 'lucide-react';
import { usePagedItems } from '@/lib/hooks';
import Pagination from '@/components/Pagination';
import { getCompetitionById, getCompetitionLeaderboard, type Competition, type CompetitionLeaderboard } from '@/lib/competitionApi';

export default function CompetitionLeaderboardPage() {
  const params = useParams();
  const router = useRouter();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [leaderboard, setLeaderboard] = useState<CompetitionLeaderboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const competitionId = params.id as string | undefined;
  const { page, setPage, totalPages, total, pageSize, pageItems } = usePagedItems(leaderboard, 25);
  // Only the newest request may update state (navigating between competitions can overlap).
  const latestRequest = useRef(0);

  const fetchData = useCallback(async () => {
    if (!competitionId) return;
    const requestId = ++latestRequest.current;
    try {
      setLoading(true);
      setError(null);
      
      const [compResult, leaderboardResult] = await Promise.all([
        getCompetitionById(competitionId),
        getCompetitionLeaderboard(competitionId),
      ]);
      if (requestId !== latestRequest.current) return;
      
      if (compResult.success && compResult.data) {
        setCompetition(compResult.data);
      }
      
      if (leaderboardResult.success && leaderboardResult.data) {
        setLeaderboard(leaderboardResult.data);
      } else {
        setError(leaderboardResult.message || 'Failed to fetch leaderboard');
      }
    } catch (err: any) {
      if (requestId !== latestRequest.current) return;
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [competitionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">Loading leaderboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !competition) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => router.push('/competitions')}
            className="mt-4 text-primary-600 hover:text-primary-700"
          >
            Back to Competitions
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </button>
          <button
            onClick={fetchData}
            className="flex items-center space-x-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {competition?.title || 'Competition'} - Leaderboard
          </h1>
          <p className="mt-2 text-gray-600">
            {leaderboard.length} entr{leaderboard.length !== 1 ? 'ies' : 'y'} on the leaderboard
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {leaderboard.length === 0 ? (
          <div className="rounded-lg bg-white shadow-sm border border-gray-200 p-12 text-center">
            <Trophy className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No leaderboard data yet</p>
            <p className="text-sm text-gray-500 mt-2">Leaderboard will appear here once participants start receiving votes.</p>
          </div>
        ) : (
          <div className="rounded-lg bg-white shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entries</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Votes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pageItems.map((entry, localIndex) => (
                  <tr key={entry.id || entry._id || localIndex} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg font-bold text-gray-900">
                          {getRankIcon(entry.rank || (page - 1) * pageSize + localIndex + 1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {entry.userImage || entry.profileImage ? (
                          <img
                            className="h-10 w-10 rounded-full"
                            src={entry.userImage || entry.profileImage}
                            alt={entry.userName || 'Participant'}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <Trophy className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {entry.userName || entry.firstName && entry.lastName
                              ? `${entry.firstName} ${entry.lastName}`
                              : 'Unknown User'}
                          </div>
                          {entry.userId && (
                            <div className="text-sm text-gray-500">ID: {entry.userId}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.entryCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {entry.totalVotes || 0}
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

