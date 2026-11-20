'use client';

import { confirmDialog } from '@/components/Feedback';
import { useEffect, useState } from 'react';
import { Image as ImageIcon, Plus, X, Edit2, Trash2, Loader2 } from 'lucide-react';
import type { Banner } from '@/lib/bannerApi';
import {
  createBanner,
  getBanners,
  updateBanner,
  deleteBanner,
} from '@/lib/bannerApi';

export default function HomeBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);

  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerFile, setNewBannerFile] = useState<File | null>(null);
  const [newBannerPreview, setNewBannerPreview] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBannerFile, setEditBannerFile] = useState<File | null>(null);
  const [editBannerPreview, setEditBannerPreview] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadBanners = async () => {
    setIsLoadingList(true);
    setError(null);

    const result = await getBanners(1, 100);

    if (!result.success || !result.data) {
      setError(result.message || result.error || 'Failed to load banners.');
      setBanners([]);
      setIsLoadingList(false);
      return;
    }

    const items = result.data.items || [];
    setBanners(items);
    setIsLoadingList(false);
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const handleFileSelect = (
    file: File | null,
    setFile: (f: File | null) => void,
    setPreview: (url: string | null) => void
  ) => {
    if (file) {
      setFile(file);
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
    } else {
      setFile(null);
      setPreview(null);
    }
  };

  const handleAddBanner = async () => {
    const trimmed = newBannerTitle.trim();
    if (!trimmed) {
      setError('Please enter a banner title.');
      return;
    }

    if (!newBannerFile) {
      setError('Please select a banner image.');
      return;
    }

    setIsAdding(true);
    setError(null);

    const result = await createBanner(trimmed, newBannerFile);

    if (!result.success) {
      setError(result.message || result.error || 'Failed to create banner.');
      setIsAdding(false);
      return;
    }

    if (newBannerPreview) {
      URL.revokeObjectURL(newBannerPreview);
    }

    setNewBannerTitle('');
    setNewBannerFile(null);
    setNewBannerPreview(null);
    setShowAddModal(false);
    setIsAdding(false);

    loadBanners();
  };

  const handleEditBanner = (banner: Banner) => {
    setEditingId(banner.id);
    setEditTitle(banner.title);
    setEditBannerFile(null);
    setEditBannerPreview(banner.banner);
  };

  const handleUpdateBanner = async () => {
    if (!editingId) return;

    const trimmed = editTitle.trim();
    if (!trimmed) {
      setError('Please enter a banner title.');
      return;
    }

    setIsUpdating(true);
    setError(null);

    const result = await updateBanner(editingId, trimmed, editBannerFile || undefined);

    if (!result.success) {
      setError(result.message || result.error || 'Failed to update banner.');
      setIsUpdating(false);
      return;
    }

    if (editBannerFile && editBannerPreview && editBannerPreview.startsWith('blob:')) {
      URL.revokeObjectURL(editBannerPreview);
    }

    setEditingId(null);
    setEditTitle('');
    setEditBannerFile(null);
    setEditBannerPreview(null);
    setIsUpdating(false);

    loadBanners();
  };

  const handleDeleteBanner = async (id: string) => {
    if (!(await confirmDialog('Are you sure you want to delete this banner?'))) {
      return;
    }

    setDeletingId(id);
    setError(null);

    const result = await deleteBanner(id);

    if (!result.success) {
      setError(result.message || result.error || 'Failed to delete banner.');
      setDeletingId(null);
      return;
    }

    setDeletingId(null);
    loadBanners();
  };

  const cancelEdit = () => {
    if (editBannerFile && editBannerPreview && editBannerPreview.startsWith('blob:')) {
      URL.revokeObjectURL(editBannerPreview);
    }
    setEditingId(null);
    setEditTitle('');
    setEditBannerFile(null);
    setEditBannerPreview(null);
  };

  const cancelAdd = () => {
    if (newBannerPreview) {
      URL.revokeObjectURL(newBannerPreview);
    }
    setShowAddModal(false);
    setNewBannerTitle('');
    setNewBannerFile(null);
    setNewBannerPreview(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ImageIcon className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Home Banners</h2>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 rounded-lg bg-primary-600 px-4 py-2.5 text-white hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          <span>Add Banner</span>
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoadingList ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          <span className="ml-3 text-sm text-gray-600">Loading banners...</span>
        </div>
      ) : banners.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-6 py-12 text-center">
          <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <p className="text-sm text-gray-600">No banners found.</p>
          <p className="text-xs text-gray-500 mt-1">Click "Add Banner" to create your first banner.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="relative rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-all"
            >
              <div className="relative h-48 bg-gray-100 overflow-hidden">
                {editingId === banner.id && editBannerPreview ? (
                  <img
                    src={editBannerPreview}
                    alt={editTitle || 'Banner preview'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={banner.banner}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                {editingId !== banner.id && (
                  <button
                    onClick={() => handleDeleteBanner(banner.id)}
                    disabled={deletingId === banner.id}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                    title="Delete banner"
                  >
                    {deletingId === banner.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>

              <div className="p-4">
                {editingId === banner.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      placeholder="Banner title"
                    />
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Change Image (Optional)
                      </label>
                      <div className="flex items-center space-x-2">
                        <label className="flex-1 cursor-pointer">
                          <div className="rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 text-center transition-colors">
                            Choose File
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              handleFileSelect(
                                e.target.files?.[0] || null,
                                setEditBannerFile,
                                setEditBannerPreview
                              )
                            }
                          />
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 pt-2">
                      <button
                        onClick={handleUpdateBanner}
                        disabled={isUpdating}
                        className="flex-1 flex items-center justify-center space-x-1 rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                      >
                        {isUpdating ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <span>Save Changes</span>
                        )}
                      </button>
                      <button
                        onClick={cancelEdit}
                        disabled={isUpdating}
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 truncate">
                      {banner.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {banner.isActive ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">
                            Inactive
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => handleEditBanner(banner)}
                        className="flex items-center space-x-1 text-primary-600 hover:text-primary-700 font-medium transition-colors"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add New Banner</h3>
              <button
                aria-label="Cancel adding banner"
                onClick={cancelAdd}
                disabled={isAdding}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-60"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Banner Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newBannerTitle}
                  onChange={(e) => setNewBannerTitle(e.target.value)}
                  placeholder="Enter banner title"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  disabled={isAdding}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Banner Image <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  {newBannerPreview ? (
                    <div className="relative rounded-lg border border-gray-300 overflow-hidden">
                      <img
                        src={newBannerPreview}
                        alt="Banner preview"
                        className="w-full h-40 object-cover"
                      />
                      <button
                        aria-label="Remove selected image"
                        onClick={() =>
                          handleFileSelect(null, setNewBannerFile, setNewBannerPreview)
                        }
                        disabled={isAdding}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="block cursor-pointer">
                      <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center hover:border-primary-400 hover:bg-primary-50/50 transition-all">
                        <ImageIcon className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Click to upload banner image
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleFileSelect(
                            e.target.files?.[0] || null,
                            setNewBannerFile,
                            setNewBannerPreview
                          )
                        }
                        disabled={isAdding}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={cancelAdd}
                  disabled={isAdding}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddBanner}
                  disabled={isAdding || !newBannerTitle.trim() || !newBannerFile}
                  className="flex-1 flex items-center justify-center space-x-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>Add Banner</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
