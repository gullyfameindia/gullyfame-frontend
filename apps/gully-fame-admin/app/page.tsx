'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Image, Palette, HelpCircle, Music, Volume2, Smile, Sparkles, ChevronRight, Users, Trophy, Film, Coins, Building2, Radio } from 'lucide-react';
import { getQuickStats, type QuickStatsResponse } from '@/lib/dashboardApi';
import { getUserRole } from '@/lib/auth';
import DashboardLayout from '@/components/DashboardLayout';
import StatCard from '@/components/StatCard';
import { getBanners } from '@/lib/bannerApi';
import { getCategories } from '@/lib/categoryApi';
import { getFaqs, listLibrary, type LibraryKind } from '@/lib/contentLibraryApi';
import { getStoredAdmin } from '@/lib/authApi';

interface Tile {
  key: string;
  title: string;
  tab: string;
  icon: typeof Image;
  color: string;
  hint: string;
  load: () => Promise<{ success: boolean; count: number }>;
}

const library = (kind: LibraryKind) => async () => {
  const r = await listLibrary(kind);
  return { success: r.success, count: r.data?.length ?? 0 };
};

const tiles: Tile[] = [
  {
    key: 'banners',
    title: 'Home Banners',
    tab: 'banners',
    icon: Image,
    color: 'primary',
    hint: 'Carousel on the app home screen',
    load: async () => {
      const r = await getBanners(1, 100);
      return { success: r.success, count: r.data?.total ?? r.data?.items.length ?? 0 };
    },
  },
  {
    key: 'categories',
    title: 'Categories',
    tab: 'categories',
    icon: Palette,
    color: 'purple',
    hint: 'Talent categories users pick',
    load: async () => {
      const r = await getCategories(1, 100);
      return { success: r.success, count: r.data?.total ?? r.data?.items.length ?? 0 };
    },
  },
  {
    key: 'faqs',
    title: 'FAQs',
    tab: 'faqs',
    icon: HelpCircle,
    color: 'blue',
    hint: 'Help & FAQ screen',
    load: async () => {
      const r = await getFaqs(1, 100);
      return { success: r.success, count: r.data?.total ?? 0 };
    },
  },
  { key: 'music', title: 'Music Tracks', tab: 'music', icon: Music, color: 'green', hint: 'Reel background music', load: library('audio') },
  { key: 'soundfx', title: 'Sound Effects', tab: 'soundfx', icon: Volume2, color: 'yellow', hint: 'Editor sound effects', load: library('soundfx') },
  { key: 'stickers', title: 'Stickers', tab: 'stickers', icon: Smile, color: 'red', hint: 'Editor stickers', load: library('stickers') },
  { key: 'filters', title: 'Filters', tab: 'filters', icon: Sparkles, color: 'primary', hint: 'Camera filters & lenses', load: library('filters') },
];

export default function Dashboard() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [name, setName] = useState('');
  const [stats, setStats] = useState<QuickStatsResponse | null>(null);

  useEffect(() => {
    const admin = getStoredAdmin();
    setName(admin?.name || admin?.email || '');
    // Platform numbers (GET admin/dashboard/quick-stats) are for platform admins only.
    if (getUserRole() === 'admin') {
      getQuickStats().then((r) => {
        if (r.success && r.data) setStats(r.data);
      });
    }
    tiles.forEach(async (t) => {
      const r = await t.load();
      setCounts((c) => ({ ...c, [t.key]: r.success ? r.count : -1 }));
    });
  }, []);

  const display = (key: string) => {
    const v = counts[key];
    if (v === undefined) return '…';
    return v < 0 ? '—' : v;
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">Gully Fame Admin</h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            {name ? `Welcome back, ${name}. ` : ''}Everything below is live content that the app reads from the backend.
          </p>
        </div>

        {stats && (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Platform</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
              <StatCard title="Users" value={stats.totalUsers.toLocaleString()} icon={Users} color="blue" />
              <StatCard title="Live competitions" value={stats.activeCompetitions} icon={Radio} color="red" />
              <StatCard title="All competitions" value={stats.totalCompetitions} icon={Trophy} color="primary" />
              <StatCard title="Reels" value={stats.totalReels.toLocaleString()} icon={Film} color="purple" />
              <StatCard title="Coins tipped" value={stats.tipsGiven.toLocaleString()} icon={Coins} color="yellow" />
              <StatCard title="Active sponsors" value={stats.activeSponsors} icon={Building2} color="green" />
            </div>
          </div>
        )}

        <h2 className="text-sm font-semibold text-gray-900">App content</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((t) => (
            <Link key={t.key} href={`/app-content?tab=${t.tab}`} className="group block">
              <StatCard title={t.title} value={display(t.key)} icon={t.icon} color={t.color} />
              <p className="mt-1 flex items-center px-1 text-[11px] text-gray-500 group-hover:text-primary-500">
                {t.hint}
                <ChevronRight className="ml-auto h-3 w-3" />
              </p>
            </Link>
          ))}
        </div>

        <div className="rounded-lg border border-app-border bg-white p-4">
          <h2 className="mb-1 text-sm font-semibold text-gray-900">More app content</h2>
          <p className="mb-3 text-xs text-gray-500">Logo, splash screen, competition rules, terms, privacy policy, about and contact details.</p>
          <div className="flex flex-wrap gap-2">
            {[
              ['branding', 'Branding'],
              ['rules', 'Competition Rules'],
              ['terms', 'Terms & Conditions'],
              ['privacy', 'Privacy Policy'],
              ['about', 'About Us'],
              ['contact', 'Contact Us'],
            ].map(([tab, label]) => (
              <Link
                key={tab}
                href={`/app-content?tab=${tab}`}
                className="rounded-full border border-app-border bg-app-raised px-3 py-1 text-xs text-gray-700 hover:border-primary-500 hover:text-primary-500"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
