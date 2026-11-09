'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import { Image, FileText, Shield, Info, Palette, ImageIcon, HelpCircle, Mail, Music, Volume2, Smile, Sparkles } from 'lucide-react';
import { getUserRole } from '@/lib/auth';
import Branding from './components/Branding';
import HomeBanners from './components/HomeBanners';
import Categories from './components/Categories';
import CompetitionRules from './components/CompetitionRules';
import TermsConditions from './components/TermsConditions';
import PrivacyPolicy from './components/PrivacyPolicy';
import AboutUs from './components/AboutUs';
import Faqs from './components/Faqs';
import ContactUs from './components/ContactUs';
import MediaLibrary from './components/MediaLibrary';

const VALID_TABS = new Set([
  'branding', 'banners', 'categories', 'rules', 'terms', 'privacy', 'about',
  'faqs', 'contact', 'music', 'soundfx', 'stickers', 'filters',
]);

export default function AppContentPage() {
  const userRole = getUserRole();
  const [activeTab, setActiveTab] = useState('branding');

  // Deep links from the dashboard, e.g. /app-content?tab=faqs
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    // Only accept known tab ids; ignore anything else in the query string.
    if (tab && VALID_TABS.has(tab)) setActiveTab(tab);
  }, []);

  if (userRole !== 'admin') {
    return <div>Access Denied</div>;
  }

  const tabs = [
    { id: 'branding', name: 'Branding', icon: ImageIcon },
    { id: 'banners', name: 'Home Banners', icon: Image },
    { id: 'categories', name: 'Categories', icon: Palette },
    { id: 'rules', name: 'Competition Rules', icon: FileText },
    { id: 'terms', name: 'Terms & Conditions', icon: Shield },
    { id: 'privacy', name: 'Privacy Policy', icon: Shield },
    { id: 'about', name: 'About Us', icon: Info },
    { id: 'faqs', name: 'FAQs', icon: HelpCircle },
    { id: 'contact', name: 'Contact Us', icon: Mail },
    { id: 'music', name: 'Music', icon: Music },
    { id: 'soundfx', name: 'Sound Effects', icon: Volume2 },
    { id: 'stickers', name: 'Stickers', icon: Smile },
    { id: 'filters', name: 'Filters', icon: Sparkles },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'branding':
        return <Branding />;
      case 'banners':
        return <HomeBanners />;
      case 'categories':
        return <Categories />;
      case 'rules':
        return <CompetitionRules />;
      case 'terms':
        return <TermsConditions />;
      case 'privacy':
        return <PrivacyPolicy />;
      case 'about':
        return <AboutUs />;
      case 'faqs':
        return <Faqs />;
      case 'contact':
        return <ContactUs />;
      case 'music':
        return <MediaLibrary kind="audio" />;
      case 'soundfx':
        return <MediaLibrary kind="soundfx" />;
      case 'stickers':
        return <MediaLibrary kind="stickers" />;
      case 'filters':
        return <MediaLibrary kind="filters" />;
      default:
        return <Branding />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6">
        {}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Manage App Content</h1>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-500">Update app branding, content, and legal information</p>
        </div>

        {}
        <div className="flex space-x-1 border-b border-gray-200 bg-white rounded-t-lg overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                title={tab.name}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 md:px-4 py-2 sm:py-3 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-b-2 border-primary-600 text-primary-600 bg-primary-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{tab.name}</span>
              </button>
            );
          })}
        </div>

        {}
        <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </DashboardLayout>
  );
}
