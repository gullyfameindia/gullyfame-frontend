'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowLeft, Edit, Calendar, Trophy, Users, DollarSign, FileText, RefreshCw, Check, X, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getUserRole } from '@/lib/auth';
import { getCompetitionById, approveCompetition, rejectCompetition, declareWinners, type Competition } from '@/lib/competitionApi';

export default function CompetitionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userRole = getUserRole();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  const competitionId = params.id as string | undefined;
  // Synchronous lock for approve/reject (state alone can't stop a same-tick double click).
  const actionLock = useRef(false);
  // Only the newest request may update state.
  const latestRequest = useRef(0);

  const fetchCompetition = useCallback(async () => {
    if (!competitionId) return;
    const requestId = ++latestRequest.current;
    try {
      setLoading(true);
      setError(null);
      const result = await getCompetitionById(competitionId);
      if (requestId !== latestRequest.current) return;
      if (result.success && result.data) {
        setCompetition(result.data);
      } else {
        setError(result.message || 'Failed to fetch competition');
      }
    } catch (err: any) {
      if (requestId !== latestRequest.current) return;
      console.error('Error fetching competition:', err);
      setError(err.message || 'Failed to load competition');
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [competitionId]);

  useEffect(() => {
    fetchCompetition();
  }, [fetchCompetition]);

  const handleApprove = async (id: string) => {
    if (!confirm('Are you sure you want to approve this competition?')) return;
    
    if (actionLock.current) return;
    actionLock.current = true;
    try {
      setLoadingAction(true);
      const result = await approveCompetition(id);
      if (result.success) {
        alert('Competition approved successfully!');
        fetchCompetition(); 
      } else {
        alert(result.message || 'Failed to approve competition');
      }
    } catch (err: any) {
      alert('Error approving competition: ' + err.message);
    } finally {
      actionLock.current = false;
      setLoadingAction(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Are you sure you want to reject this competition?')) return;
    
    if (actionLock.current) return;
    actionLock.current = true;
    try {
      setLoadingAction(true);
      const result = await rejectCompetition(id);
      if (result.success) {
        alert('Competition rejected successfully!');
        fetchCompetition(); 
      } else {
        alert(result.message || 'Failed to reject competition');
      }
    } catch (err: any) {
      alert('Error rejecting competition: ' + err.message);
    } finally {
      actionLock.current = false;
      setLoadingAction(false);
    }
  };

  const handleDeclareWinners = async () => {
    if (!competition) return;
    
    
    if (confirm('Declare winners and distribute coins? This action cannot be undone.')) {
      // Irreversible coin distribution: block a second click before React re-renders.
      if (actionLock.current) return;
      actionLock.current = true;
      try {
        setLoadingAction(true);
        
        const winnersData = {
          winners: competition.winners?.map(w => ({
            userId: w.userId,
            rank: w.rank,
            prize: w.prize || 0,
          })) || []
        };
        
        const result = await declareWinners(competition.id, winnersData);
        if (result.success) {
          alert('Winners declared successfully! Coins will be distributed automatically.');
          fetchCompetition(); 
        } else {
          alert(result.message || 'Failed to declare winners');
        }
      } catch (err: any) {
        alert('Error declaring winners: ' + err.message);
      } finally {
        actionLock.current = false;
        setLoadingAction(false);
      }
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">Loading competition...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !competition) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">{error || 'Competition not found'}</p>
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
            onClick={() => router.push(`/competitions/${competition.id}/edit`)}
            className="flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
          >
            <Edit className="h-5 w-5" />
            <span>Edit Competition</span>
          </button>
        </div>

        {competition.bannerImage && (
          <div className="rounded-lg overflow-hidden">
            <img 
              src={competition.bannerImage} 
              alt={competition.title}
              className="w-full h-64 object-cover"
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-lg bg-white shadow-sm border border-gray-200 p-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{competition.title}</h1>
              <div className="flex items-center space-x-4 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  competition.status === 'LIVE' ? 'bg-green-100 text-green-800' :
                  competition.status === 'UPCOMING' ? 'bg-blue-100 text-blue-800' :
                  competition.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                  competition.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                  competition.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                  competition.status === 'CANCELLED' ? 'bg-gray-100 text-gray-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {competition.status}
                </span>
                {competition.category && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                    {competition.category}
                  </span>
                )}
              </div>
              <p className="text-gray-700 text-lg leading-relaxed">{competition.description}</p>
            </div>

            {competition.rules && (
              <div className="rounded-lg bg-white shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Competition Rules
                </h2>
                <div className="whitespace-pre-line text-gray-700 leading-relaxed">
                  {competition.rules}
                </div>
              </div>
            )}

            {competition.sponsorName && (
              <div className="rounded-lg bg-white shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Sponsor</h2>
                <div className="flex items-center space-x-4">
                  {competition.sponsorLogo && (
                    <img 
                      src={competition.sponsorLogo} 
                      alt={competition.sponsorName}
                      className="h-16 object-contain"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{competition.sponsorName}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-lg bg-white shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Competition Details</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Prize Amount</p>
                    <p className="font-bold text-gray-900">{formatCurrency(competition.prizeAmount || competition.prizePool || 0)}</p>
                  </div>
                </div>
                {competition.entryFee && (
                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Entry Fee</p>
                      <p className="font-medium text-gray-900">{formatCurrency(competition.entryFee)}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Start Date</p>
                    <p className="font-medium text-gray-900">{formatDate(competition.startDate)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm text-gray-600">End Date</p>
                    <p className="font-medium text-gray-900">{formatDate(competition.endDate)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Participants</p>
                    <p className="font-medium text-gray-900">
                      {Array.isArray(competition.participants) 
                        ? competition.participants.length 
                        : (competition.participants || competition.registered || 0)}
                    </p>
                  </div>
                </div>
                {competition.entries !== undefined && (
                  <div className="flex items-center space-x-3">
                    <Trophy className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="text-sm text-gray-600">Total Entries</p>
                      <p className="font-medium text-gray-900">{competition.entries}</p>
                    </div>
                  </div>
                )}
                {competition.winnerSlots && (
                  <div className="flex items-center space-x-3">
                    <Trophy className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="text-sm text-gray-600">Winner Slots</p>
                      <p className="font-medium text-gray-900">{competition.winnerSlots}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {userRole === 'admin' && competition.status === 'CREATED' && competition.sponsorId && (
              <div className="rounded-lg bg-white shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Review Competition</h2>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleApprove(competition.id)}
                    className="flex items-center justify-center space-x-2 flex-1 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 font-medium disabled:opacity-50"
                    disabled={loadingAction}
                  >
                    {loadingAction ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-5 w-5" />
                        <span>Approve</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleReject(competition.id)}
                    className="flex items-center justify-center space-x-2 flex-1 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 font-medium disabled:opacity-50"
                    disabled={loadingAction}
                  >
                    {loadingAction ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <X className="h-5 w-5" />
                        <span>Reject</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {competition.status === 'COMPLETED' && userRole === 'admin' && (
              <div className="rounded-lg bg-white shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Declare Winners</h2>
                <p className="text-sm text-gray-600 mb-4">Select winners and distribute coins automatically</p>
                <button
                  onClick={handleDeclareWinners}
                  className="w-full rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 font-medium disabled:opacity-50"
                  disabled={loadingAction}
                >
                  {loadingAction ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    'Declare Winners & Distribute Coins'
                  )}
                </button>
              </div>
            )}

            {competition.winners && competition.winners.length > 0 && (
              <div className="rounded-lg bg-white shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <Trophy className="h-5 w-5 mr-2 text-yellow-600" />
                  Winners
                </h2>
                <div className="space-y-3">
                  {competition.winners.map((winner, index) => (
                    <div key={winner._id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg font-bold text-gray-900">
                          {winner.rank === 1 ? '🥇' : winner.rank === 2 ? '🥈' : winner.rank === 3 ? '🥉' : `#${winner.rank}`}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            User ID: {winner.userId}
                          </p>
                          {winner.prize && (
                            <p className="text-xs text-gray-500">
                              Prize: {formatCurrency(winner.prize)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {userRole === 'admin' && (
              <div className="rounded-lg bg-white shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Actions</h2>
                <div className="space-y-2">
                  <a
                    href={`/competitions/${competition.id}/participants`}
                    className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    View Participants
                  </a>
                  <a
                    href={`/competitions/${competition.id}/leaderboard`}
                    className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    View Leaderboard
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

