'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Phone, Calendar, Wallet, Gift, Users, UserPlus, Ban, Key, Shield, Tag, Power, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getUserRole } from '@/lib/auth';
import { getUserById, updateUserStatus, resetUserPassword, getUserEarnings, type UserDetail } from '@/lib/userApi';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userRole = getUserRole();
  const userId = params.id as string;
  
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Synchronous lock for status/password actions (state alone can't stop a same-tick double click).
  const actionLock = useRef(false);
  // Only the newest request may update state.
  const latestRequest = useRef(0);

  const fetchUserData = useCallback(async () => {
    if (!userId) return;
    const requestId = ++latestRequest.current;
    try {
      setLoading(true);
      setError(null);
      
      const [userResult, earningsResult] = await Promise.all([
        getUserById(userId),
        getUserEarnings(userId),
      ]);
      if (requestId !== latestRequest.current) return;
      
      if (userResult.success && userResult.data) {
        setUser(userResult.data);
      } else {
        setError(userResult.message || 'Failed to fetch user details');
      }
      
      if (earningsResult.success && earningsResult.data) {
        setEarnings(earningsResult.data.items || []);
      }
    } catch (err: any) {
      if (requestId !== latestRequest.current) return;
      console.error('Error fetching user data:', err);
      setError(err.message || 'Failed to load user data');
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleStatusUpdate = async () => {
    if (!user) return;
    const newStatus = user.status === 'active' ? 'banned' : 'active';
    
    if (!confirm(`Change status to ${newStatus}?`)) return;
    
    if (actionLock.current) return;
    actionLock.current = true;
    try {
      setIsUpdating(true);
      const result = await updateUserStatus(userId, newStatus);
      
      if (result.success && result.data) {
        setUser({ ...user, status: result.data.status });
        alert(`User status updated to ${newStatus}`);
      } else {
        alert(result.message || 'Failed to update status');
      }
    } catch (err: any) {
      console.error('Error updating status:', err);
      alert('Failed to update user status');
    } finally {
      actionLock.current = false;
      setIsUpdating(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    
    if (actionLock.current) return;
    actionLock.current = true;
    try {
      setIsUpdating(true);
      const result = await resetUserPassword(userId, newPassword);
      
      if (result.success) {
        alert('Password reset successfully!');
        setShowPasswordModal(false);
        setNewPassword('');
      } else {
        alert(result.message || 'Failed to reset password');
      }
    } catch (err: any) {
      console.error('Error resetting password:', err);
      alert('Failed to reset password');
    } finally {
      actionLock.current = false;
      setIsUpdating(false);
    }
  };

  if (userRole !== 'admin') {
    return <div>Access Denied</div>;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <span className="ml-2 text-gray-600">Loading user details...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !user) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Users</span>
          </button>
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">{error || 'User not found'}</p>
            <button
              onClick={fetchUserData}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown';
  const initials = userName.substring(0, 2).toUpperCase();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <button
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Users</span>
        </button>

        <div className="rounded-lg bg-white shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={userName}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary-600">{initials}</span>
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{userName}</h1>
                <p className="text-gray-600">{user.email}</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => router.push(`/users/${userId}/kyc`)}
                className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                <Shield className="h-5 w-5" />
                <span>View KYC</span>
              </button>
              <button
                onClick={() => setShowPasswordModal(true)}
                disabled={isUpdating}
                className="flex items-center space-x-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
              >
                <Key className="h-5 w-5" />
                <span>Reset Password</span>
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={isUpdating}
                className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-white disabled:opacity-50 ${
                  user.status === 'active' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                <Power className="h-5 w-5" />
                <span>{user.status === 'active' ? 'Ban User' : 'Activate User'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center space-x-2 text-gray-600 mb-2">
                <Mail className="h-5 w-5" />
                <span className="text-sm font-medium">Email</span>
              </div>
              <p className="text-gray-900">{user.email}</p>
            </div>
            {user.mobile && (
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center space-x-2 text-gray-600 mb-2">
                  <Phone className="h-5 w-5" />
                  <span className="text-sm font-medium">Mobile</span>
                </div>
                <p className="text-gray-900">{user.mobile}</p>
              </div>
            )}
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center space-x-2 text-gray-600 mb-2">
                <Tag className="h-5 w-5" />
                <span className="text-sm font-medium">Role</span>
              </div>
              <p className="text-gray-900">{user.role || 'N/A'}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center space-x-2 text-gray-600 mb-2">
                <Power className="h-5 w-5" />
                <span className="text-sm font-medium">Account Status</span>
              </div>
              <p className="text-gray-900 capitalize">{user.status || 'N/A'}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center space-x-2 text-gray-600 mb-2">
                <Calendar className="h-5 w-5" />
                <span className="text-sm font-medium">Join Date</span>
              </div>
              <p className="text-gray-900">{user.createdAt ? formatDate(user.createdAt) : 'N/A'}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-4">
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center space-x-2 text-gray-600 mb-2">
                <Wallet className="h-5 w-5" />
                <span className="text-sm font-medium">Total Earnings</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(user.totalEarnings || 0)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center space-x-2 text-gray-600 mb-2">
                <Gift className="h-5 w-5" />
                <span className="text-sm font-medium">Total Tips</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(user.totalTips || 0)}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center space-x-2 text-gray-600 mb-2">
                <Users className="h-5 w-5" />
                <span className="text-sm font-medium">Followers</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{user.followers || 0}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center space-x-2 text-gray-600 mb-2">
                <UserPlus className="h-5 w-5" />
                <span className="text-sm font-medium">Following</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{user.following || 0}</p>
            </div>
          </div>

          {earnings.length > 0 && (
            <div className="mt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Earnings History</h2>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {earnings.map((earning) => (
                      <tr key={earning.id || earning._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{earning.type || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{earning.description || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(earning.amount || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {earning.createdAt ? formatDate(earning.createdAt) : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Reset Password</h2>
            <input
              type="password"
              placeholder="Enter new password (min 6 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 mb-4 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <div className="flex space-x-2">
              <button
                onClick={handlePasswordReset}
                disabled={isUpdating || !newPassword}
                className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {isUpdating ? 'Resetting...' : 'Reset Password'}
              </button>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setNewPassword('');
                }}
                disabled={isUpdating}
                className="flex-1 rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
