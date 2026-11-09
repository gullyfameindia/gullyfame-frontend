'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, FileText, Loader2, Shield, ShieldCheck, AlertTriangle, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { getUserRole } from '@/lib/auth';
import { getUserById, getUserKyc, updateUserKyc } from '@/lib/userApi';
import type { KycStatus } from '@/lib/userApi';

export default function UserKycPage() {
  const params = useParams();
  const router = useRouter();
  const userRole = getUserRole();
  const userId = params.id as string;
  
  const [user, setUser] = useState<any>(null);
  const [kyc, setKyc] = useState<KycStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Synchronous lock for approve/reject (state alone can't stop a same-tick double click).
  const actionLock = useRef(false);
  // Only the newest request may update state.
  const latestRequest = useRef(0);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    const requestId = ++latestRequest.current;
    try {
      setLoading(true);
      setError(null);
      
      const [userResult, kycResult] = await Promise.all([
        getUserById(userId),
        getUserKyc(userId),
      ]);
      if (requestId !== latestRequest.current) return;
      
      if (userResult.success && userResult.data) {
        setUser(userResult.data);
      } else {
        setError(userResult.message || 'Failed to fetch user');
      }
      
      if (kycResult.success && kycResult.data) {
        setKyc(kycResult.data);
      } else {
        
        setKyc(null);
      }
    } catch (err: any) {
      if (requestId !== latestRequest.current) return;
      console.error('Error fetching KYC data:', err);
      setError(err.message || 'Failed to load KYC data');
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async () => {
    if (!confirm('Approve this KYC submission?')) return;
    
    if (actionLock.current) return;
    actionLock.current = true;
    try {
      setIsUpdating(true);
      const result = await updateUserKyc(userId, 'approved');
      
      if (result.success && result.data) {
        setKyc(result.data);
        alert('KYC approved successfully!');
        fetchData(); 
      } else {
        alert(result.message || 'Failed to approve KYC');
      }
    } catch (err: any) {
      console.error('Error approving KYC:', err);
      alert('Failed to approve KYC');
    } finally {
      actionLock.current = false;
      setIsUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    
    if (actionLock.current) return;
    actionLock.current = true;
    try {
      setIsUpdating(true);
      const result = await updateUserKyc(userId, 'rejected', rejectionReason);
      
      if (result.success && result.data) {
        setKyc(result.data);
        alert('KYC rejected successfully!');
        setShowRejectModal(false);
        setRejectionReason('');
        fetchData(); 
      } else {
        alert(result.message || 'Failed to reject KYC');
      }
    } catch (err: any) {
      console.error('Error rejecting KYC:', err);
      alert('Failed to reject KYC');
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
          <span className="ml-2 text-gray-600">Loading KYC data...</span>
        </div>
      </DashboardLayout>
    );
  }

  const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown' : 'Unknown';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <button
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to User Details</span>
        </button>

        <div className="rounded-lg bg-white shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Shield className="h-6 w-6 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">KYC Verification</h1>
                <p className="text-gray-600 mt-1">User: {userName}</p>
              </div>
            </div>
            {kyc && (
              <div className="flex items-center space-x-2">
                {kyc.status === 'approved' && <ShieldCheck className="h-5 w-5 text-green-600" />}
                {kyc.status === 'rejected' && <AlertCircle className="h-5 w-5 text-red-600" />}
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  kyc.status === 'approved' ? 'bg-green-100 text-green-800' :
                  kyc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {kyc.status?.toUpperCase() || 'PENDING'}
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-6">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {!kyc ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No KYC submission found for this user</p>
            </div>
          ) : (
            <>
              {}
              <div className="mb-6 space-y-4">
                {kyc.submittedAt && (
                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="text-sm text-gray-600">Submitted: {formatDate(kyc.submittedAt)}</p>
                  </div>
                )}
                
                {kyc.status === 'rejected' && kyc.rejectionReason && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                    <div className="flex items-center space-x-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <p className="text-sm font-semibold text-red-800">Rejection Reason:</p>
                    </div>
                    <p className="text-sm text-red-700">{kyc.rejectionReason}</p>
                  </div>
                )}
                
                {kyc.reviewedAt && (
                  <div className="rounded-lg border border-gray-200 p-4">
                    <p className="text-sm text-gray-600">Reviewed: {formatDate(kyc.reviewedAt)}</p>
                  </div>
                )}
              </div>

              {}
              {kyc.documents && kyc.documents.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Documents</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {kyc.documents.map((doc: any, index: number) => (
                      <div key={index} className="rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {doc.documentType || 'Document'} {doc.documentNumber ? `- ${doc.documentNumber}` : ''}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {doc.frontImage && (
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Front:</p>
                              <img
                                src={doc.frontImage}
                                alt="Document Front"
                                className="w-full h-32 object-contain border border-gray-200 rounded"
                              />
                            </div>
                          )}
                          {doc.backImage && (
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Back:</p>
                              <img
                                src={doc.backImage}
                                alt="Document Back"
                                className="w-full h-32 object-contain border border-gray-200 rounded"
                              />
                            </div>
                          )}
                          {doc.selfieImage && (
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Selfie:</p>
                              <img
                                src={doc.selfieImage}
                                alt="Selfie"
                                className="w-full h-32 object-contain border border-gray-200 rounded"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {}
              {kyc.status !== 'approved' && (
                <div className="flex space-x-4">
                  <button
                    onClick={handleApprove}
                    disabled={isUpdating}
                    className="flex items-center space-x-2 rounded-lg bg-green-600 px-6 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span>Approve KYC</span>
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={isUpdating}
                    className="flex items-center space-x-2 rounded-lg bg-red-600 px-6 py-2 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    <XCircle className="h-5 w-5" />
                    <span>Reject KYC</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Reject KYC</h2>
            <p className="text-sm text-gray-600 mb-4">Please provide a reason for rejection:</p>
            <textarea
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 mb-4 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <div className="flex space-x-2">
              <button
                onClick={handleReject}
                disabled={isUpdating || !rejectionReason.trim()}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isUpdating ? 'Rejecting...' : 'Reject KYC'}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
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

