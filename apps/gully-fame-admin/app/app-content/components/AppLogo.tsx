'use client';

import { notify } from '@/components/Feedback';
import { useState, useEffect } from 'react';
import { ImageIcon, Upload, Save } from 'lucide-react';
import { uploadLogo, getLogo } from '@/lib/brandingApi';

export default function AppLogo() {
  const [logo, setLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogo = async () => {
      setIsLoading(true);
      try {
        const result = await getLogo();
        
        if (result.success && result.data) {
          const logoUrl = result.data.logoUrl || '';
          if (logoUrl) {
            setLogo(logoUrl);
          } else {
            setLogo(null);
          }
        }
      } catch (error) {
        console.error('Error fetching logo:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogo();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-2 mb-4">
        <ImageIcon className="h-5 w-5 text-primary-600" />
        <h2 className="text-lg font-semibold text-gray-900">App Logo</h2>
      </div>
      <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
        <div className="flex-shrink-0">
          <div className="h-40 w-40 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden">
            {isLoading ? (
              <div className="text-center p-4">
                <div className="animate-pulse text-xs text-gray-400">Loading...</div>
              </div>
            ) : logo ? (
              <img src={logo} alt="Logo" className="h-full w-full object-contain rounded-lg" />
            ) : (
              <div className="text-center p-4">
                <ImageIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-xs text-gray-500">No logo uploaded</p>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Upload New Logo
            </label>
            <label className="block">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 hover:bg-primary-50/50 transition-all cursor-pointer">
                <Upload className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-700 mb-1">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-500">Recommended: 512x512px, PNG format with transparent background</p>
              </div>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setLogoFile(file);
                    setLogo(URL.createObjectURL(file));
                  }
                }}
              />
            </label>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              className={`flex items-center space-x-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                logo && !isUploading
                  ? 'bg-primary-600 text-white hover:bg-primary-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              disabled={!logo || isUploading}
              onClick={async () => {
                if (logoFile) {
                  setIsUploading(true);
                  const result = await uploadLogo(logoFile);
                  setIsUploading(false);
                  
                  if (result.success) {
                    notify.success('Logo updated successfully!');
                    
                    if (logoFile && logo) {
                      setLogoFile(null);
                    }

                    for (let attempt = 0; attempt < 5; attempt++) {
                      await new Promise(resolve => setTimeout(resolve, 1000 + attempt * 500));
                      const refreshResult = await getLogo();
                      
                      if (refreshResult.success && refreshResult.data) {
                        const logoUrl = refreshResult.data.logoUrl || '';
                        if (logoUrl && logoUrl !== logo) {
                          setLogo(logoUrl);
                          break;
                        } else if (logoUrl) {
                          break;
                        }
                      }
                    }
                  } else {
                    notify.error(`Failed to update logo: ${result.message || result.error || 'Unknown error'}`);
                  }
                }
              }}
            >
              <Save className="h-4 w-4" />
              <span>{isUploading ? 'Uploading...' : 'Update Logo'}</span>
            </button>
            {logo && (
              <button 
                className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                onClick={() => {
                  setLogo(null);
                  setLogoFile(null);
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

