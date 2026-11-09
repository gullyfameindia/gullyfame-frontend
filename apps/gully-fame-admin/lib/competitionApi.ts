import { apiRequest } from './http';
import type { ApiResponse } from './apiTypes';




export interface Competition {
  id: string;
  _id?: string;
  title: string;
  description: string;
  rules?: string;
  status: 'CREATED' | 'APPROVED' | 'REJECTED' | 'LIVE' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED' | string;
  startDate: string;
  endDate: string;
  prizeAmount: number;
  prizePool?: number;
  entryFee?: number;
  category?: string;
  categoryId?: string;
  winnerSlots?: number;
  bannerImage?: string;
  sponsorId?: string | { _id?: string; [key: string]: any };
  sponsorName?: string;
  sponsorLogo?: string;
  participants?: number;
  entries?: number;
  registered?: number;
  viewers?: number;
  isActive?: boolean;
  isDeleted?: boolean;
  winners?: Array<{
    userId: string;
    rank: number;
    prize: number;
    _id?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface CompetitionParticipant {
  id: string;
  _id?: string;
  userId: string;
  userName?: string;
  userImage?: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  entryCount?: number;
  totalVotes?: number;
  rank?: number;
  joinedAt?: string;
  [key: string]: any;
}

export interface CompetitionLeaderboard {
  id: string;
  _id?: string;
  userId: string;
  userName?: string;
  userImage?: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  totalVotes: number;
  entryCount?: number;
  rank: number;
  [key: string]: any;
}

export interface CompetitionWinner {
  id: string;
  _id?: string;
  userId: string;
  userName?: string;
  userImage?: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  rank: number;
  prizeAmount?: number;
  prize?: number;
  coinsAwarded?: number;
  [key: string]: any;
}

export interface CreateCompetitionRequest {
  title: string;
  description: string;
  rules?: string;
  startDate: string;
  endDate: string;
  prizePool: number;
  entryFee?: number;
  category?: string;
  categoryId?: string;
  winnerSlots?: number;
  bannerImage?: string;
  sponsorId?: string;
}

export interface UpdateCompetitionRequest extends Partial<CreateCompetitionRequest> {
  status?: string;
}

export interface DeclareWinnersRequest {
  winners: Array<{
    userId: string;
    rank: number;
    prize: number;
  }>;
}

export interface CompetitionListParams {
  status?: string;
  sponsorId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CompetitionListResponse {
  items: Competition[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}








/**
 * Every request goes through lib/http.ts: base URL from lib/config.ts, admin token, timeout,
 * JSON guard and normalized errors. A success with no `data` (e.g. a DELETE) is still a success.
 */
async function makeRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  body?: any
): Promise<ApiResponse<T>> {
  const result = await apiRequest<T>(method, endpoint, { body });
  return result.success
    ? { success: true, data: result.data as T, message: result.message }
    : { success: false, message: result.message, error: result.error };
}

export async function getCompetitions(
  params?: CompetitionListParams
): Promise<ApiResponse<CompetitionListResponse>> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.sponsorId) queryParams.append('sponsorId', params.sponsorId);
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const endpoint = `admin/competitions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await makeRequest<any>('GET', endpoint);

  if (response.success && response.data) {
    const items = (Array.isArray(response.data) ? response.data : response.data.data || response.data.items || []).map((comp: any) => {
      
      const prizeAmount = comp.prizePool || comp.prizeAmount || 0;
      
      const sponsorId = typeof comp.sponsorId === 'object' && comp.sponsorId?._id 
        ? comp.sponsorId._id 
        : (comp.sponsorId || '');
      
      
      let normalizedStatus = comp.status || 'CREATED';
      if (sponsorId && normalizedStatus === 'APPROVED') {
        normalizedStatus = 'LIVE';
      }
      
      return {
        ...comp,
        id: comp.id || comp._id || '',
        status: normalizedStatus,
        prizeAmount, 
        prizePool: prizeAmount, 
        sponsorId, 
      };
    });

    return {
      success: true,
      data: {
        items,
        total: response.data.total || items.length,
        page: params?.page || 1,
        limit: params?.limit || 10,
        totalPages: response.data.totalPages || Math.ceil((response.data.total || items.length) / (params?.limit || 10)),
      },
      message: response.message || 'Competitions fetched successfully',
    };
  }

  return {
    success: false,
    message: response.message || 'Failed to fetch competitions',
    error: response.error || 'API returned unsuccessful response',
  };
}





export async function getCompetitionById(competitionId: string): Promise<ApiResponse<Competition>> {
  const endpoint = `admin/competitions/${competitionId}`;
  const response = await makeRequest<Competition>('GET', endpoint);

  if (response.success && response.data) {
    const comp = response.data;
    
    const prizeAmount = comp.prizePool || comp.prizeAmount || 0;
    
    const sponsorId = typeof comp.sponsorId === 'object' && comp.sponsorId?._id 
      ? comp.sponsorId._id 
      : (comp.sponsorId || '');
    
    
    let normalizedStatus = comp.status || 'CREATED';
    if (sponsorId && normalizedStatus === 'APPROVED') {
      normalizedStatus = 'LIVE';
    }
    
    return {
      success: true,
      data: {
        ...comp,
        id: comp.id || comp._id || competitionId,
        status: normalizedStatus,
        prizeAmount, 
        prizePool: prizeAmount, 
        sponsorId, 
      },
      message: response.message || 'Competition fetched successfully',
    };
  }

  return {
    success: false,
    message: response.message || 'Failed to fetch competition',
    error: response.error || 'API returned unsuccessful response',
  };
}





export async function createCompetition(
  data: CreateCompetitionRequest
): Promise<ApiResponse<Competition>> {
  const endpoint = 'admin/competitions';
  const response = await makeRequest<Competition>('POST', endpoint, data);

  if (response.success && response.data) {
    const comp = response.data;
    const prizeAmount = comp.prizePool || comp.prizeAmount || 0;
    const sponsorId = typeof comp.sponsorId === 'object' && comp.sponsorId?._id 
      ? comp.sponsorId._id 
      : (comp.sponsorId || '');
    
    return {
      success: true,
      data: {
        ...comp,
        id: comp.id || comp._id || '',
        status: comp.status || 'CREATED',
        prizeAmount,
        prizePool: prizeAmount,
        sponsorId,
      },
      message: response.message || 'Competition created successfully',
    };
  }

  return {
    success: false,
    message: response.message || 'Failed to create competition',
    error: response.error || 'API returned unsuccessful response',
  };
}





export async function updateCompetition(
  competitionId: string,
  data: UpdateCompetitionRequest
): Promise<ApiResponse<Competition>> {
  const endpoint = `admin/competitions/${competitionId}`;
  
  
  const updateData: any = { ...data };
  if (updateData.prizeAmount !== undefined) {
    updateData.prizePool = updateData.prizeAmount;
    delete updateData.prizeAmount;
  }
  
  const response = await makeRequest<Competition>('PUT', endpoint, updateData);

  if (response.success) {
    const comp = (response.data ?? {}) as Competition;
    const prizeAmount = comp.prizePool || comp.prizeAmount || 0;
    const sponsorId = typeof comp.sponsorId === 'object' && comp.sponsorId?._id 
      ? comp.sponsorId._id 
      : (comp.sponsorId || '');
    
    return {
      success: true,
      data: {
        ...comp,
        id: comp.id || comp._id || competitionId,
        prizeAmount,
        prizePool: prizeAmount,
        sponsorId,
      },
      message: response.message || 'Competition updated successfully',
    };
  }

  return {
    success: false,
    message: response.message || 'Failed to update competition',
    error: response.error || 'API returned unsuccessful response',
  };
}






export async function approveCompetition(competitionId: string): Promise<ApiResponse<Competition>> {
  // Collection: POST admin/competitions/:id/active activates (approves) a competition.
  const endpoint = `admin/competitions/${competitionId}/active`;
  const response = await makeRequest<Competition>('POST', endpoint);

  if (response.success) {
    const comp = (response.data ?? {}) as Competition;
    const prizeAmount = comp.prizePool || comp.prizeAmount || 0;
    const sponsorId = typeof comp.sponsorId === 'object' && comp.sponsorId?._id 
      ? comp.sponsorId._id 
      : (comp.sponsorId || '');
    
    
    
    const isSponsorCreated = !!sponsorId;
    const newStatus = isSponsorCreated ? 'LIVE' : (comp.status || 'APPROVED');
    
    return {
      success: true,
      data: {
        ...comp,
        id: comp.id || comp._id || competitionId,
        status: newStatus,
        prizeAmount,
        prizePool: prizeAmount,
        sponsorId,
      },
      message: response.message || 'Competition approved successfully',
    };
  }

  return {
    success: false,
    message: response.message || 'Failed to approve competition',
    error: response.error || 'API returned unsuccessful response',
  };
}





export async function rejectCompetition(
  competitionId: string,
  rejectionReason?: string
): Promise<ApiResponse<Competition>> {
  const endpoint = `admin/competitions/${competitionId}/reject`;
  const response = await makeRequest<Competition>('POST', endpoint, { rejectionReason });

  if (response.success) {
    const comp = (response.data ?? {}) as Competition;
    const prizeAmount = comp.prizePool || comp.prizeAmount || 0;
    const sponsorId = typeof comp.sponsorId === 'object' && comp.sponsorId?._id 
      ? comp.sponsorId._id 
      : (comp.sponsorId || '');
    
    return {
      success: true,
      data: {
        ...comp,
        id: comp.id || comp._id || competitionId,
        status: 'REJECTED',
        prizeAmount,
        prizePool: prizeAmount,
        sponsorId,
      },
      message: response.message || 'Competition rejected successfully',
    };
  }

  return {
    success: false,
    message: response.message || 'Failed to reject competition',
    error: response.error || 'API returned unsuccessful response',
  };
}





export async function deleteCompetition(competitionId: string): Promise<ApiResponse<void>> {
  const endpoint = `admin/competitions/${competitionId}`;
  const response = await makeRequest<void>('DELETE', endpoint);

  if (response.success) {
    return {
      success: true,
      message: response.message || 'Competition deleted successfully',
    };
  }

  return {
    success: false,
    message: response.message || 'Failed to delete competition',
    error: response.error || 'API returned unsuccessful response',
  };
}





export async function getCompetitionParticipants(
  competitionId: string
): Promise<ApiResponse<CompetitionParticipant[]>> {
  const endpoint = `admin/competitions/${competitionId}/participants`;
  const response = await makeRequest<CompetitionParticipant[]>('GET', endpoint);

  if (response.success && response.data) {
    const participants = (Array.isArray(response.data) ? response.data : []).map((p: any) => ({
      ...p,
      id: p.id || p._id || '',
      userId: p.userId || p.user?._id || p.user?.id || '',
      userName: p.userName || (p.user?.firstName && p.user?.lastName 
        ? `${p.user.firstName} ${p.user.lastName}` 
        : p.user?.email || ''),
      userImage: p.userImage || p.user?.profileImage || p.profileImage,
    }));

    return {
      success: true,
      data: participants,
      message: response.message || 'Participants fetched successfully',
    };
  }

  return {
    success: false,
    message: response.message || 'Failed to fetch participants',
    error: response.error || 'API returned unsuccessful response',
  };
}





export async function getCompetitionLeaderboard(
  competitionId: string
): Promise<ApiResponse<CompetitionLeaderboard[]>> {
  const endpoint = `admin/competitions/${competitionId}/leaderboard`;
  const response = await makeRequest<CompetitionLeaderboard[]>('GET', endpoint);

  if (response.success && response.data) {
    const leaderboard = (Array.isArray(response.data) ? response.data : []).map((entry: any, index: number) => ({
      ...entry,
      id: entry.id || entry._id || '',
      userId: entry.userId || entry.user?._id || entry.user?.id || '',
      userName: entry.userName || (entry.user?.firstName && entry.user?.lastName 
        ? `${entry.user.firstName} ${entry.user.lastName}` 
        : entry.user?.email || ''),
      userImage: entry.userImage || entry.user?.profileImage || entry.profileImage,
      rank: entry.rank || index + 1,
      totalVotes: entry.totalVotes || entry.votes || 0,
    }));

    return {
      success: true,
      data: leaderboard,
      message: response.message || 'Leaderboard fetched successfully',
    };
  }

  return {
    success: false,
    message: response.message || 'Failed to fetch leaderboard',
    error: response.error || 'API returned unsuccessful response',
  };
}





export async function declareWinners(
  competitionId: string,
  data: DeclareWinnersRequest
): Promise<ApiResponse<CompetitionWinner[]>> {
  const endpoint = `admin/competitions/${competitionId}/declare-winners`;
  const response = await makeRequest<CompetitionWinner[]>('POST', endpoint, data);

  if (response.success) {
    const winners = (Array.isArray(response.data) ? response.data : []).map((w: any) => ({
      ...w,
      id: w.id || w._id || '',
      userId: w.userId || w.user?._id || w.user?.id || '',
      userName: w.userName || (w.user?.firstName && w.user?.lastName 
        ? `${w.user.firstName} ${w.user.lastName}` 
        : w.user?.email || ''),
      userImage: w.userImage || w.user?.profileImage || w.profileImage,
      prizeAmount: w.prize || w.prizeAmount,
    }));

    return {
      success: true,
      data: winners,
      message: response.message || 'Winners declared successfully',
    };
  }

  return {
    success: false,
    message: response.message || 'Failed to declare winners',
    error: response.error || 'API returned unsuccessful response',
  };
}

