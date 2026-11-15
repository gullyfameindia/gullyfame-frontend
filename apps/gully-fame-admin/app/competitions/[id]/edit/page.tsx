'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import { getUserRole } from '@/lib/auth';
import { getCompetitionById, updateCompetition, type Competition } from '@/lib/competitionApi';

export default function EditCompetitionPage() {
  const params = useParams();
  const router = useRouter();
  const userRole = getUserRole();
  const competitionId = String(params.id);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // A newly picked banner; sent with the save. formData.bannerImage keeps the current URL.
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    rules: '',
    startDate: '',
    endDate: '',
    prizeAmount: 0,
    category: '',
    status: 'draft',
    winnerSlots: 3,
    bannerImage: '',
    sponsorLogo: '',
  });

  useEffect(() => {
    let cancelled = false;
    getCompetitionById(competitionId).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        const c = res.data;
        setLoadError(null);
        setCompetition(c);
        setFormData({
          title: c.title || '',
          description: c.description || '',
          rules: c.rules || '',
          startDate: c.startDate ? c.startDate.slice(0, 10) : '',
          endDate: c.endDate ? c.endDate.slice(0, 10) : '',
          prizeAmount: c.prizeAmount || 0,
          category: c.category || '',
          status: c.status || 'draft',
          winnerSlots: c.winnerSlots || 3,
          bannerImage: c.bannerImage || '',
          sponsorLogo: c.sponsorLogo || '',
        });
      }
      if (!res.success) setLoadError(res.message || res.error || 'Failed to load competition');
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [competitionId]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!competition) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">{loadError || 'Competition not found'}</p>
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await updateCompetition(competitionId, {
      title: formData.title,
      description: formData.description,
      rules: formData.rules,
      startDate: formData.startDate,
      endDate: formData.endDate,
      prizeAmount: formData.prizeAmount,
      winnerSlots: formData.winnerSlots,
    } as any, bannerFile);
    setSaving(false);
    if (res.success) {
      router.push(`/competitions/${competitionId}`);
    } else {
      alert(res.message || 'Failed to update competition');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <button
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </button>

        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Competition</h1>
          <p className="mt-2 text-gray-600">Update competition details</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg bg-white shadow-sm border border-gray-200 p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Competition title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Competition description"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Competition Rules *</label>
              <textarea
                rows={8}
                value={formData.rules}
                onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Enter competition rules (one per line)..."
                required
              />
              <p className="mt-1 text-xs text-gray-500">Enter each rule on a new line. Use numbers (1., 2., etc.) for formatting.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prize Money (₹) *</label>
                <input
                  type="number"
                  value={formData.prizeAmount}
                  onChange={(e) => setFormData({ ...formData, prizeAmount: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="100000"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                >
                  <option value="">Select category...</option>
                  <option value="Dance">Dance</option>
                  <option value="Music">Music</option>
                  <option value="Comedy">Comedy</option>
                  <option value="Cooking">Cooking</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Sports">Sports</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="live">Live</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Winner Slots</label>
                <input
                  type="number"
                  value={formData.winnerSlots}
                  onChange={(e) => setFormData({ ...formData, winnerSlots: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="3"
                  min="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Banner Image</label>
              {(bannerPreview || formData.bannerImage) && (
                <div className="mb-3">
                  <img src={bannerPreview || formData.bannerImage} alt="Banner" className="h-32 w-full object-cover rounded-lg" />
                  {bannerFile && <p className="text-xs text-gray-500 mt-1">New image, saved when you click Save: {bannerFile.name}</p>}
                </div>
              )}
              <label className="block cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500">
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">{formData.bannerImage || bannerFile ? 'Click to replace the banner' : 'Click to upload a banner'}</p>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 10 * 1024 * 1024) {
                      alert('Please choose an image under 10MB.');
                      return;
                    }
                    setBannerFile(file);
                    setBannerPreview(URL.createObjectURL(file));
                  }}
                />
              </label>
            </div>

            {userRole === 'admin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sponsor Logo (Optional)</label>
                {formData.sponsorLogo && (
                  <div className="mb-3">
                    <img src={formData.sponsorLogo} alt="Sponsor Logo" className="h-20 object-contain" />
                  </div>
                )}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Upload sponsor logo</p>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center space-x-2 rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700"
              >
                <Save className="h-5 w-5" />
                <span>{saving ? 'Saving...' : 'Update Competition'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

