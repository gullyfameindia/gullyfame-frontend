'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Building2, Eye, Edit, Trash2, Plus, Mail, Lock, X, Save, CheckCircle, Copy, Check, RefreshCw, Loader2 } from 'lucide-react';
import { getUserRole } from '@/lib/auth';
import { getSponsors, createSponsor, updateSponsor, deleteSponsor, getSponsorById, type Sponsor } from '@/lib/sponsorApi';
import { getCompetitions } from '@/lib/competitionApi';
import { usePagedItems } from '@/lib/hooks';
import Pagination from '@/components/Pagination';

export default function SponsorsPage() {
  const userRole = getUserRole();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState({ sponsorId: '', email: '', password: '' });
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [editFormData, setEditFormData] = useState({
    email: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [competitionsCount, setCompetitionsCount] = useState<{ [sponsorId: string]: number }>({});

  // Synchronous lock for create/update/deactivate (state alone can't stop a same-tick double click).
  const submitLock = useRef(false);
  // Sponsors whose competition count has already been requested (avoids repeat calls).
  const requestedCounts = useRef<Set<string>>(new Set());
  const latestRequest = useRef(0);

  const { page, setPage, totalPages, total, pageSize, pageItems } = usePagedItems(sponsors, 20);

  const fetchSponsors = useCallback(async () => {
    const requestId = ++latestRequest.current;
    try {
      setLoading(true);
      setError(null);
      const result = await getSponsors();
      if (requestId !== latestRequest.current) return;
      if (result.success && result.data) {
        requestedCounts.current.clear();
        setCompetitionsCount({});
        setSponsors(result.data);
      } else {
        setError(result.message || 'Failed to fetch sponsors');
      }
    } catch (err: any) {
      if (requestId !== latestRequest.current) return;
      console.error('Error fetching sponsors:', err);
      setError(err.message || 'Failed to load sponsors');
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userRole === 'admin') {
      fetchSponsors();
    }
  }, [userRole, fetchSponsors]);

  // Load competition counts only for the sponsors on the visible page (one request per
  // visible row instead of one per sponsor in the whole list).
  useEffect(() => {
    const requested = requestedCounts.current;
    const missing = pageItems
      .map((sponsor) => sponsor.id || sponsor._id || '')
      .filter((id) => id && !requested.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => requested.add(id));

    let cancelled = false;
    (async () => {
      const counts: { [sponsorId: string]: number } = {};
      await Promise.all(
        missing.map(async (sponsorId) => {
          try {
            const compResult = await getCompetitions({ sponsorId });
            if (compResult.success && compResult.data) {
              counts[sponsorId] = compResult.data.items?.length || 0;
            }
          } catch (err) {
            console.error(`Error fetching competitions for sponsor ${sponsorId}:`, err);
            counts[sponsorId] = 0;
          }
        })
      );
      if (!cancelled) setCompetitionsCount((prev) => ({ ...prev, ...counts }));
    })();
    return () => {
      cancelled = true;
      // If this run was cancelled before it finished, let the next run request them again.
      missing.forEach((id) => requested.delete(id));
    };
  }, [pageItems]);

  if (userRole === 'sponsor') {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Competitions</h1>
            <p className="mt-2 text-sm text-gray-500">View and manage your competitions</p>
          </div>
          <div className="rounded-lg bg-white shadow-sm border border-gray-200 p-6">
            <p className="text-gray-600">Your competitions will appear here. You can view your competitions and host new ones through the admin panel.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (userRole !== 'admin') {
    return <div>Access Denied</div>;
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateEditForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!editFormData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editFormData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateSponsor = async () => {
    if (submitLock.current || !validateForm()) return;
    submitLock.current = true;
    
    try {
      setSubmitting(true);
      const result = await createSponsor({
        email: formData.email,
        password: formData.password,
      });
      
      if (result.success && result.data) {
        const sponsorId = result.data.sponsorCode || result.data.id || result.data._id || '';
        setCreatedCredentials({
          sponsorId,
          email: formData.email,
          password: formData.password,
        });
        setShowCreateModal(false);
        setShowSuccessModal(true);
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
        });
        setErrors({});
        
        await fetchSponsors();
      } else {
        alert(result.message || 'Failed to create sponsor');
      }
    } catch (err: any) {
      alert('Error creating sponsor: ' + err.message);
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  const handleEditSponsor = async (sponsor: Sponsor) => {
    setEditingSponsor(sponsor);
    setEditFormData({
      email: sponsor.email || '',
    });
    setErrors({});
    setShowEditModal(true);
  };

  const handleUpdateSponsor = async () => {
    if (submitLock.current || !editingSponsor || !validateEditForm()) return;
    submitLock.current = true;
    
    try {
      setSubmitting(true);
      const sponsorId = editingSponsor.id || editingSponsor._id || '';
      const result = await updateSponsor(sponsorId, {
        email: editFormData.email,
      });
      
      if (result.success) {
        alert('Sponsor updated successfully!');
        setShowEditModal(false);
        setEditingSponsor(null);
        await fetchSponsors();
      } else {
        alert(result.message || 'Failed to update sponsor');
      }
    } catch (err: any) {
      alert('Error updating sponsor: ' + err.message);
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  const handleDeleteSponsor = async (sponsor: Sponsor) => {
    if (submitLock.current) return;
    if (!confirm(`Are you sure you want to deactivate ${sponsor.email}?`)) return;
    submitLock.current = true;
    
    try {
      setSubmitting(true);
      const sponsorId = sponsor.id || sponsor._id || '';
      const result = await deleteSponsor(sponsorId, sponsor.email);
      
      if (result.success) {
        alert('Sponsor deactivated successfully!');
        await fetchSponsors();
      } else {
        alert(result.message || 'Failed to deactivate sponsor');
      }
    } catch (err: any) {
      alert('Error deactivating sponsor: ' + err.message);
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sponsors</h1>
            <p className="mt-2 text-sm text-gray-500">Manage sponsor accounts and partnerships</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchSponsors}
              className="flex items-center space-x-2 rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              <RefreshCw className="h-5 w-5" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => {
                setShowCreateModal(true);
                setFormData({ name: '', email: '', password: '', confirmPassword: '' });
                setErrors({});
              }}
              className="flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2.5 text-white hover:bg-primary-700 transition-colors font-medium shadow-sm"
            >
              <Plus className="h-5 w-5" />
              <span>Create Sponsor</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sponsors</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {loading ? '...' : sponsors.length}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary-600" />
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Sponsors</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {loading ? '...' : sponsors.filter(s => s.isActive !== false).length}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Competitions</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {loading ? '...' : Object.values(competitionsCount).reduce((sum, count) => sum + count, 0)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary-600" />
            <p className="mt-4 text-gray-600">Loading sponsors...</p>
          </div>
        ) : sponsors.length === 0 ? (
          <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No sponsors found</p>
            <p className="text-sm text-gray-500 mt-2">Create your first sponsor to get started.</p>
          </div>
        ) : (
          <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Sponsor Code</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Competitions</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Created</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pageItems.map((sponsor) => {
                    const sponsorId = sponsor.id || sponsor._id || '';
                    const competitions = competitionsCount[sponsorId] || 0;
                    return (
                      <tr key={sponsorId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
                              <Building2 className="h-5 w-5 text-primary-600" />
                            </div>
                            <span className="text-xs font-mono font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                              {sponsor.sponsorCode || sponsorId}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{sponsor.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">{competitions}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            sponsor.isActive !== false 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {sponsor.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sponsor.createdAt 
                            ? new Date(sponsor.createdAt).toLocaleDateString()
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button 
                            onClick={() => handleEditSponsor(sponsor)}
                            className="text-primary-600 hover:text-primary-900 p-1.5 rounded hover:bg-primary-50 transition-colors" 
                            title="Edit"
                            disabled={submitting}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteSponsor(sponsor)}
                            className="text-red-600 hover:text-red-900 p-1.5 rounded hover:bg-red-50 transition-colors" 
                            title="Deactivate"
                            disabled={submitting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
            </div>
          </div>
        )}

        {}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
            <div className="w-full max-w-md rounded-xl bg-white shadow-2xl my-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Create New Sponsor</h2>
                <button
                  aria-label="Close create sponsor dialog"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ name: '', email: '', password: '', confirmPassword: '' });
                    setErrors({});
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full rounded-lg border pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all ${
                        errors.email
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20'
                      }`}
                      placeholder="sponsor@example.com"
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                  <p className="mt-1 text-xs text-gray-500">This email will be used as the sponsor's login ID. Sponsor ID will be auto-generated by admin.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`w-full rounded-lg border pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all ${
                        errors.password
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20'
                      }`}
                      placeholder="Enter password (min 6 characters)"
                    />
                  </div>
                  {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className={`w-full rounded-lg border pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all ${
                        errors.confirmPassword
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20'
                      }`}
                      placeholder="Confirm password"
                    />
                  </div>
                  {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>}
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-800">
                    <strong>Note:</strong> After creating the sponsor account, share the email and password credentials with the sponsor. 
                    They can use these to login to the dashboard.
                  </p>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormData({ name: '', email: '', password: '', confirmPassword: '' });
                      setErrors({});
                    }}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateSponsor}
                    className="flex-1 flex items-center justify-center space-x-2 rounded-lg bg-primary-600 px-4 py-3 font-semibold text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        <span>Create Sponsor</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal with Credentials */}
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-green-50">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <h2 className="text-xl font-bold text-gray-900">Sponsor Created Successfully!</h2>
                </div>
                <button
                  aria-label="Close success dialog"
                  onClick={() => {
                    setShowSuccessModal(false);
                    setCreatedCredentials({ sponsorId: '', email: '', password: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm font-semibold text-yellow-800 mb-1">⚠️ Important</p>
                  <p className="text-xs text-yellow-700">
                    Please save these credentials and share them with the sponsor. They will need these to login to the dashboard.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Sponsor Code (Auto-generated)
                    </label>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 flex items-center space-x-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-mono font-semibold text-gray-900 flex-1">{createdCredentials.sponsorId || 'N/A'}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(createdCredentials.sponsorId, 'sponsorId')}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                        title="Copy Sponsor ID"
                      >
                        {copiedField === 'sponsorId' ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Email Address
                    </label>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 flex items-center space-x-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-mono text-gray-900 flex-1">{createdCredentials.email}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(createdCredentials.email, 'email')}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                        title="Copy email"
                      >
                        {copiedField === 'email' ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Password
                    </label>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 flex items-center space-x-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5">
                        <Lock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-mono text-gray-900 flex-1">{createdCredentials.password}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(createdCredentials.password, 'password')}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                        title="Copy password"
                      >
                        {copiedField === 'password' ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowSuccessModal(false);
                      setCreatedCredentials({ sponsorId: '', email: '', password: '' });
                    }}
                    className="w-full rounded-lg bg-primary-600 px-4 py-3 font-semibold text-white hover:bg-primary-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Sponsor Modal */}
        {showEditModal && editingSponsor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
            <div className="w-full max-w-md rounded-xl bg-white shadow-2xl my-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Edit Sponsor</h2>
                <button
                  aria-label="Close edit sponsor dialog"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingSponsor(null);
                    setEditFormData({ email: '' });
                    setErrors({});
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Sponsor Code
                  </label>
                  <div className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm">
                    <span className="text-gray-700 font-mono">
                      {editingSponsor.sponsorCode || editingSponsor.id || editingSponsor._id || 'N/A'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className={`w-full rounded-lg border pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all ${
                        errors.email
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20'
                      }`}
                      placeholder="sponsor@example.com"
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingSponsor(null);
                      setEditFormData({ email: '' });
                      setErrors({});
                    }}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateSponsor}
                    className="flex-1 flex items-center justify-center space-x-2 rounded-lg bg-primary-600 px-4 py-3 font-semibold text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        <span>Update Sponsor</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
