'use client';

import { confirmDialog } from '@/components/Feedback';
import { useEffect, useState } from 'react';
import {
  createLibraryItem,
  deleteLibraryItem,
  listLibrary,
  updateLibraryItem,
  type LibraryItem,
  type LibraryKind,
} from '@/lib/contentLibraryApi';

interface KindConfig {
  title: string;
  description: string;
  nameLabel: string;
  /** form field name that carries the main file */
  fileField: string;
  fileLabel: string;
  fileAccept: string;
  /** optional second upload (cover / thumbnail) */
  imageField?: string;
  imageLabel?: string;
  hasArtist?: boolean;
  hasCategory?: boolean;
  hasDuration?: boolean;
  /** body key the backend uses for the display name on update */
  nameKey: 'title' | 'name';
  previewIsImage: boolean;
}

const CONFIG: Record<LibraryKind, KindConfig> = {
  audio: {
    title: 'Music Library',
    description: 'Tracks users can pick as background music when posting a reel.',
    nameLabel: 'Track title',
    fileField: 'audio',
    fileLabel: 'Audio file (mp3 / m4a)',
    fileAccept: 'audio/*',
    imageField: 'coverImage',
    imageLabel: 'Cover image (optional)',
    hasArtist: true,
    hasDuration: true,
    nameKey: 'title',
    previewIsImage: false,
  },
  soundfx: {
    title: 'Sound Effects',
    description: 'Short effects users can add on top of a video in the editor.',
    nameLabel: 'Effect name',
    fileField: 'audio',
    fileLabel: 'Audio file',
    fileAccept: 'audio/*',
    hasCategory: true,
    hasDuration: true,
    nameKey: 'name',
    previewIsImage: false,
  },
  stickers: {
    title: 'Stickers',
    description: 'Stickers and reaction images shown in the video editor.',
    nameLabel: 'Sticker name',
    fileField: 'image',
    fileLabel: 'Sticker image (PNG with transparency works best)',
    fileAccept: 'image/*',
    hasCategory: true,
    nameKey: 'name',
    previewIsImage: true,
  },
  filters: {
    title: 'Filters',
    description: 'Filters / lenses available in the camera and editor.',
    nameLabel: 'Filter name',
    fileField: 'asset',
    fileLabel: 'Filter asset',
    fileAccept: 'image/*,video/*,.json,.zip',
    imageField: 'thumbnail',
    imageLabel: 'Thumbnail (optional)',
    nameKey: 'name',
    previewIsImage: false,
  },
};

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500';

export default function MediaLibrary({ kind }: { kind: LibraryKind }) {
  const cfg = CONFIG[kind];
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [artist, setArtist] = useState('');
  const [category, setCategory] = useState('');
  const [duration, setDuration] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    const r = await listLibrary(kind);
    if (!r.success) {
      setError(r.message || `Failed to load ${cfg.title.toLowerCase()}.`);
      setItems([]);
    } else {
      setItems(r.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const handleAdd = async () => {
    if (!name.trim()) return setError(`Please enter a ${cfg.nameLabel.toLowerCase()}.`);
    if (!file) return setError(`Please choose a file: ${cfg.fileLabel}.`);

    const form = new FormData();
    form.append(cfg.nameKey, name.trim());
    if (cfg.hasArtist && artist.trim()) form.append('artist', artist.trim());
    if (cfg.hasCategory && category.trim()) form.append('category', category.trim());
    if (cfg.hasDuration && duration.trim()) form.append('duration', duration.trim());
    form.append(cfg.fileField, file);
    if (cfg.imageField && image) form.append(cfg.imageField, image);

    setSaving(true);
    setError(null);
    const r = await createLibraryItem(kind, form);
    setSaving(false);
    if (!r.success) return setError(r.message || 'Upload failed.');

    setName('');
    setArtist('');
    setCategory('');
    setDuration('');
    setFile(null);
    setImage(null);
    setFormKey((k) => k + 1);
    load();
  };

  const handleRename = async (item: LibraryItem) => {
    if (!editName.trim()) return;
    setBusyId(item.id);
    const r = await updateLibraryItem(kind, item.id, { [cfg.nameKey]: editName.trim() });
    setBusyId(null);
    if (!r.success) return setError(r.message || 'Update failed.');
    setEditingId(null);
    load();
  };

  const handleDelete = async (item: LibraryItem) => {
    if (!(await confirmDialog(`Delete "${item.name}"? It will disappear from the app.`))) return;
    setBusyId(item.id);
    setError(null);
    const r = await deleteLibraryItem(kind, item.id);
    setBusyId(null);
    if (!r.success) return setError(r.message || 'Delete failed.');
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{cfg.title}</h2>
        <p className="text-xs text-gray-500 mt-1">{cfg.description}</p>
      </div>

      <div key={formKey} className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-lg border border-gray-200 p-4">
        <input className={inputCls} placeholder={cfg.nameLabel} value={name} onChange={(e) => setName(e.target.value)} />
        {cfg.hasArtist && (
          <input className={inputCls} placeholder="Artist" value={artist} onChange={(e) => setArtist(e.target.value)} />
        )}
        {cfg.hasCategory && (
          <input className={inputCls} placeholder="Category (e.g. reactions)" value={category} onChange={(e) => setCategory(e.target.value)} />
        )}
        {cfg.hasDuration && (
          <input className={inputCls} type="number" min={0} placeholder="Duration in seconds" value={duration} onChange={(e) => setDuration(e.target.value)} />
        )}
        <label className="block text-xs text-gray-600">
          {cfg.fileLabel}
          <input type="file" accept={cfg.fileAccept} className="mt-1 block w-full text-xs" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
        {cfg.imageField && (
          <label className="block text-xs text-gray-600">
            {cfg.imageLabel}
            <input type="file" accept="image/*" className="mt-1 block w-full text-xs" onChange={(e) => setImage(e.target.files?.[0] || null)} />
          </label>
        )}
        <div className="md:col-span-2 flex justify-end">
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving}
            className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-70"
          >
            {saving ? 'Uploading...' : 'Add'}
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      <div className="rounded-lg border border-gray-200 bg-white">
        {loading ? (
          <div className="px-4 py-6 text-sm text-gray-500 text-center">Loading...</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-500 text-center">Nothing here yet. Users see an empty list in the app until you add items.</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {items.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100 flex items-center justify-center">
                    {item.imageUrl || (cfg.previewIsImage && item.fileUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl || item.fileUrl} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-gray-500">{kind === 'filters' ? 'FX' : '♪'}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    {editingId === item.id ? (
                      <input className={inputCls} value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                    ) : (
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    )}
                    <p className="text-xs text-gray-500 truncate">
                      {[item.subtitle, item.category, item.duration ? `${item.duration}s` : '', item.usageCount ? `${item.usageCount} uses` : '']
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {(kind === 'audio' || kind === 'soundfx') && item.fileUrl && (
                      <audio controls preload="none" src={item.fileUrl} className="mt-1 h-8 w-64 max-w-full" />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs font-medium">
                  {editingId === item.id ? (
                    <>
                      <button type="button" disabled={busyId === item.id} onClick={() => handleRename(item)} className="text-primary-600 hover:text-primary-700">Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700">Cancel</button>
                    </>
                  ) : (
                    <button type="button" onClick={() => { setEditingId(item.id); setEditName(item.name); }} className="text-primary-600 hover:text-primary-700">Rename</button>
                  )}
                  <button type="button" disabled={busyId === item.id} onClick={() => handleDelete(item)} className="text-red-600 hover:text-red-700 disabled:opacity-60">
                    {busyId === item.id ? '...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
