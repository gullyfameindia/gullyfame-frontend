'use client';

import { notify } from '@/components/Feedback';
import { useState, useEffect } from 'react';
import { ImageIcon, Layout, Upload, Save } from 'lucide-react';
import { uploadLogo, uploadSplash, getLogo, getSplash } from '@/lib/brandingApi';

export default function Branding() {
  const [logo, setLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [isLogoLoading, setIsLogoLoading] = useState(true);
  
  const [splashImages, setSplashImages] = useState<
    Array<{ id: number; url: string | null; file: File | null }>
  >([
    { id: 1, url: null, file: null },
    { id: 2, url: null, file: null },
    { id: 3, url: null, file: null },
    { id: 4, url: null, file: null },
  ]);
  const [isSplashUploading, setIsSplashUploading] = useState(false);
  const [isSplashLoading, setIsSplashLoading] = useState(true);

  useEffect(() => {
    const fetchBranding = async () => {
      setIsLogoLoading(true);
      setIsSplashLoading(true);

      try {
        const [logoResult, splashResult] = await Promise.all([
          getLogo(),
          getSplash(),
        ]);

        if (logoResult.success && logoResult.data?.logoUrl) {
          setLogo(logoResult.data.logoUrl);
        }

        if (splashResult.success && splashResult.data?.images) {
          const images = splashResult.data.images;
          setSplashImages((prev) =>
            prev.map((img, index) => ({
              ...img,
              url: images[index] || null,
              file: null,
            }))
          );
        }
      } catch (error) {
        console.error('Error fetching branding:', error);
      } finally {
        setIsLogoLoading(false);
        setIsSplashLoading(false);
      }
    };

    fetchBranding();
  }, []);

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    
    setIsLogoUploading(true);
    
    try {
      const result = await uploadLogo(logoFile);
      
      if (result.success) {
        notify.success('Logo updated successfully!');
        
        const previewUrl = URL.createObjectURL(logoFile);
        setLogo(previewUrl);
        setLogoFile(null);
        
        for (let attempt = 0; attempt < 5; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 1000 + attempt * 500));
          const refreshResult = await getLogo();
          
          if (refreshResult.success && refreshResult.data?.logoUrl) {
            setLogo(refreshResult.data.logoUrl);
            break;
          }
        }
      } else {
        notify.error(`Failed to update logo: ${result.message || result.error || 'Unknown error'}`);
        setLogoFile(null);
        const refreshResult = await getLogo();
        if (refreshResult.success && refreshResult.data?.logoUrl) {
          setLogo(refreshResult.data.logoUrl);
        }
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      notify.error('Failed to update logo. Please try again.');
    } finally {
      setIsLogoUploading(false);
    }
  };

  const handleSplashUpload = async () => {
    const filesToUpload = splashImages
      .filter((img) => img.file !== null)
      .map((img) => img.file as File);

    if (filesToUpload.length === 0) return;

    setIsSplashUploading(true);
    
    try {
      const result = await uploadSplash(filesToUpload);
      
      if (result.success) {
        notify.success('Splash screen images updated successfully!');
        
        setSplashImages((prev) =>
          prev.map((img) => {
            if (img.file) {
              return {
                ...img,
                url: URL.createObjectURL(img.file),
                file: null,
              };
            }
            return img;
          })
        );
        
        for (let attempt = 0; attempt < 5; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 1000 + attempt * 500));
          const refreshResult = await getSplash();
          
          if (refreshResult.success && refreshResult.data?.images) {
            const images = refreshResult.data.images;
            setSplashImages((prev) =>
              prev.map((img, index) => ({
                ...img,
                url: images[index] || prev[index].url || null,
                file: null,
              }))
            );
            break;
          }
        }
      } else {
        notify.error(`Failed to update splash images: ${result.message || result.error || 'Unknown error'}`);
        const refreshResult = await getSplash();
        if (refreshResult.success && refreshResult.data?.images) {
          const images = refreshResult.data.images;
          setSplashImages((prev) =>
            prev.map((img, index) => ({
              ...img,
              url: images[index] || prev[index].url || null,
              file: null,
            }))
          );
        }
      }
    } catch (error) {
      console.error('Error uploading splash images:', error);
      notify.error('Failed to update splash images. Please try again.');
    } finally {
      setIsSplashUploading(false);
    }
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center space-x-2 mb-6">
        <ImageIcon className="h-5 w-5 text-primary-600" />
        <h2 className="text-lg font-semibold text-gray-900">Branding</h2>
      </div>

      <div className="space-y-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <ImageIcon className="h-5 w-5 text-primary-600" />
            <h3 className="text-base font-semibold text-gray-900">App Logo</h3>
          </div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
            <div className="flex-shrink-0">
              <div className="h-40 w-40 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden">
                {isLogoLoading ? (
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
                    logo && !isLogoUploading
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  disabled={!logo || isLogoUploading}
                  onClick={handleLogoUpload}
                >
                  <Save className="h-4 w-4" />
                  <span>{isLogoUploading ? 'Uploading...' : 'Update Logo'}</span>
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

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Layout className="h-5 w-5 text-primary-600" />
              <h3 className="text-base font-semibold text-gray-900">Splash Screen</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {splashImages.map((image, index) => (
              <div key={image.id} className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-700">
                  Splash Image {index + 1}
                </h4>
                
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center bg-gray-50">
                  <div className="h-64 w-full rounded-lg border border-gray-300 flex items-center justify-center bg-white mb-4 overflow-hidden">
                    {isSplashLoading ? (
                      <div className="text-center p-4">
                        <div className="animate-pulse text-xs text-gray-400">Loading...</div>
                      </div>
                    ) : image.url ? (
                      <img
                        src={image.url}
                        alt={`Splash Screen ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Layout className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                        <p className="text-xs text-gray-500">No image uploaded</p>
                      </div>
                    )}
                  </div>

                  <label className="block">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-primary-400 hover:bg-primary-50/50 transition-all cursor-pointer">
                      <Upload className="h-6 w-6 mx-auto text-gray-400 mb-1" />
                      <p className="text-xs font-medium text-gray-700">Upload</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const newImages = [...splashImages];
                          newImages[index] = {
                            ...newImages[index],
                            file: file,
                            url: URL.createObjectURL(file),
                          };
                          setSplashImages(newImages);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200 mt-6">
            <button
              className={`flex items-center justify-center space-x-2 rounded-lg px-6 py-3 transition-colors font-medium ${
                splashImages.some((img) => img.file !== null) && !isSplashUploading
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              disabled={!splashImages.some((img) => img.file !== null) || isSplashUploading}
              onClick={handleSplashUpload}
            >
              <Save className="h-4 w-4" />
              <span>{isSplashUploading ? 'Uploading...' : 'Update Splash Screen'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

