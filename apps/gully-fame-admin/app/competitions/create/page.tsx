'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Upload, Image as ImageIcon, Calendar, DollarSign, Trophy, Tag, FileText, Building2, X } from 'lucide-react';
import { getUserRole } from '@/lib/auth';
import { getStoredAdmin } from '@/lib/authApi';
import { createCompetition } from '@/lib/competitionApi';

export default function CreateCompetitionPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    rules: '',
    startDate: '',
    endDate: '',
    prizeAmount: '0',
    entryFee: '0',
    category: '',
    winnerSlots: 3,
    bannerImage: null as File | null,
    bannerPreview: '',
    hasSponsor: false,
    sponsorId: '',
  });
  const [sponsors, setSponsors] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [loadingSponsors, setLoadingSponsors] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const role = getUserRole();
    setUserRole(role);
    
    
    if (role === 'sponsor') {
      const adminData = getStoredAdmin();
      const sponsorId = adminData?._id || adminData?.id || adminData?.sponsorCode;
      if (sponsorId) {
        setFormData(prev => ({
          ...prev,
          hasSponsor: true,
          sponsorId: sponsorId,
        }));
      }
    }
  }, []);

  useEffect(() => {
    
    const fetchSponsors = async () => {
      setLoadingSponsors(true);
      try {
        const { getSponsors } = await import('@/lib/sponsorApi');
        const result = await getSponsors();
        if (result.success && result.data) {
          setSponsors(result.data.map((sponsor: any) => ({
            id: sponsor.id || sponsor._id || '',
            name: sponsor.email || 'Unknown',
            email: sponsor.email || ''
          })));
        } else {
          console.error('Failed to fetch sponsors:', result.message);
          setSponsors([]);
        }
      } catch (error) {
        console.error('Error fetching sponsors:', error);
        
      } finally {
        setLoadingSponsors(false);
      }
    };

    fetchSponsors();
  }, []);

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({
        ...formData,
        bannerImage: file,
        bannerPreview: URL.createObjectURL(file),
      });
    }
  };


  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      
      const competitionData: any = {
        title: formData.title,
        description: formData.description,
        rules: formData.rules,
        startDate: formData.startDate,
        endDate: formData.endDate,
        prizePool: Number(formData.prizeAmount),
        entryFee: Number(formData.entryFee),
        category: formData.category,
        winnerSlots: formData.winnerSlots,
      };

      
      if (userRole === 'sponsor') {
        const adminData = getStoredAdmin();
        const sponsorId = adminData?._id || adminData?.id || adminData?.sponsorCode;
        if (sponsorId) {
          competitionData.sponsorId = sponsorId;
        }
      } else if (formData.hasSponsor && formData.sponsorId) {
        
        competitionData.sponsorId = formData.sponsorId;
      }

      // The banner file goes up with the form (multipart); the backend stores it on S3.
      const result = await createCompetition(competitionData, formData.bannerImage);

      if (result.success) {
        router.push('/competitions');
      } else {
        setSubmitError(result.message || 'Failed to create competition');
      }
    } catch (error: any) {
      console.error('Error creating competition:', error);
      setSubmitError(error.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
          <div className="h-96 bg-gray-100 rounded"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 p-4 md:p-6 max-w-5xl mx-auto">
        {}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
        <button
          aria-label="Go back"
          onClick={() => router.back()}
              className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
              <ArrowLeft className="h-4 w-4 text-gray-600" />
        </button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Create New Competition</h1>
              <p className="mt-0.5 text-xs md:text-sm text-gray-500">Fill in all the details to create a new competition</p>
            </div>
          </div>
            </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {}
          <div className="rounded-lg bg-white shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-primary-50 to-primary-100 px-4 py-3 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900 flex items-center space-x-2">
                <FileText className="h-4 w-4 text-primary-600" />
                <span>Basic Information</span>
              </h2>
            </div>
            <div className="p-4 md:p-5 space-y-4">
              <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5">
                  Competition Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                  placeholder="e.g., Delhi Dance-Off 2024"
                  required
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all resize-none"
                  placeholder="Describe the competition, its purpose, and what participants can expect..."
                  required
                />
                <p className="mt-1.5 text-xs text-gray-500">Provide a clear and engaging description for participants</p>
            </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Tag className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-9 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all appearance-none bg-white"
                  required
                >
                  <option value="">Select category...</option>
                  <option value="Dance">Dance</option>
                  <option value="Music">Music</option>
                  <option value="Comedy">Comedy</option>
                  <option value="Cooking">Cooking</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Sports">Sports</option>
                      <option value="Art">Art</option>
                      <option value="Photography">Photography</option>
                </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5">
                    Winner Slots
                  </label>
                  <div className="relative">
                    <Trophy className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      value={formData.winnerSlots}
                      onChange={(e) => setFormData({ ...formData, winnerSlots: Number(e.target.value) })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-9 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                      placeholder="3"
                      min="1"
                      max="10"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {}
          <div className="rounded-lg bg-white shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900 flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span>Schedule & Prize</span>
              </h2>
            </div>
            <div className="p-4 md:p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-9 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-9 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                      required
                    />
                  </div>
              </div>
            </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5">
                    Prize Money (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      value={formData.prizeAmount}
                      onChange={(e) => setFormData({ ...formData, prizeAmount: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-9 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                      placeholder="100000"
                      min="0"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5">
                    Entry Fee (₹) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      value={formData.entryFee}
                      onChange={(e) => setFormData({ ...formData, entryFee: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-9 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                      placeholder="100"
                      min="0"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {}
          <div className="rounded-lg bg-white shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-4 py-3 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900 flex items-center space-x-2">
                <FileText className="h-4 w-4 text-purple-600" />
                <span>Competition Rules</span>
              </h2>
            </div>
            <div className="p-4 md:p-5">
              <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5">
                  Rules & Guidelines <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={6}
                  value={formData.rules}
                  onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all resize-none font-mono"
                  placeholder="1. All participants must be 18 years or older&#10;2. Content must be original and not violate any copyright&#10;3. Participants must follow community guidelines&#10;4. Submissions must be made before the deadline&#10;5. Judges' decisions are final..."
                  required
                />
                <p className="mt-1.5 text-xs text-gray-500">Enter each rule on a new line. Use numbers (1., 2., etc.) for formatting.</p>
              </div>
              </div>
            </div>

          {}
          <div className="rounded-lg bg-white shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-green-100 px-4 py-3 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900 flex items-center space-x-2">
                <ImageIcon className="h-4 w-4 text-green-600" />
                <span>Media & Assets</span>
              </h2>
            </div>
            <div className="p-4 md:p-5 space-y-4">
            <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5">
                  Banner Image
                </label>
                {formData.bannerPreview ? (
                  <div className="relative">
                    <img
                      src={formData.bannerPreview}
                      alt="Banner preview"
                      className="w-full h-40 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      aria-label="Remove banner image"
                      type="button"
                      onClick={() => setFormData({ ...formData, bannerImage: null, bannerPreview: '' })}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="block">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 hover:bg-primary-50/50 transition-all cursor-pointer">
                      <Upload className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm font-medium text-gray-700 mb-1">Click to upload or drag and drop</p>
                      <p className="text-xs text-gray-500">PNG, JPG up to 10MB • Recommended: 1200x400px</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              </div>
            </div>

          {}
          {userRole === 'admin' && isMounted && (
            <div className="rounded-lg bg-white shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-4 py-3 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-900 flex items-center space-x-2">
                  <Building2 className="h-4 w-4 text-orange-600" />
                  <span>Sponsor Information</span>
                </h2>
              </div>
              <div className="p-4 md:p-5 space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    id="hasSponsor"
                    checked={formData.hasSponsor}
                    onChange={(e) => setFormData({ ...formData, hasSponsor: e.target.checked, sponsorId: '' })}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="hasSponsor" className="text-xs md:text-sm font-semibold text-gray-700 cursor-pointer">
                    This competition has a sponsor
                  </label>
                </div>

                {formData.hasSponsor && (
                  <div className="space-y-4 pl-3 border-l-4 border-primary-200 bg-primary-50/30 p-4 rounded-r-lg">
                    <div>
                      <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5">
                        Select Sponsor <span className="text-red-500">*</span>
                      </label>
                      {loadingSponsors ? (
                        <div className="flex items-center space-x-2 text-xs md:text-sm text-gray-500">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"></div>
                          <span>Loading sponsors...</span>
                        </div>
                      ) : (
                        <div className="relative">
                          <Building2 className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <select
                            value={formData.sponsorId}
                            onChange={(e) => setFormData({ ...formData, sponsorId: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-9 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all appearance-none bg-white"
                            required
                          >
                            <option value="">Select a sponsor...</option>
                            {sponsors.map((sponsor) => (
                              <option key={sponsor.id} value={sponsor.id}>
                                {sponsor.name} ({sponsor.email}) - ID: {sponsor.id}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {sponsors.length === 0 && !loadingSponsors && (
                        <p className="mt-1.5 text-xs text-gray-500">No sponsors available. Please create sponsors first. Sponsor ID will be generated automatically.</p>
                      )}
                      {formData.sponsorId && (
                        <p className="mt-1.5 text-xs text-gray-500">Sponsor ID: <span className="font-mono font-semibold">{formData.sponsorId}</span> (Auto-generated by admin)</p>
                      )}
                    </div>
                  </div>
                )}
                </div>
              </div>
            )}

          {}
          {submitError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-800">{submitError}</p>
            </div>
          )}

          {}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-lg bg-primary-600 font-semibold text-sm text-white hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Create Competition</span>
                  </>
                )}
              </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
