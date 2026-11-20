"use client";

import { notify } from '@/components/Feedback';
import { useState, useEffect } from "react";
import { Layout, Upload, Save } from "lucide-react";
import { uploadSplash, getSplash } from "@/lib/brandingApi";

export default function SplashScreen() {
  const [splashImages, setSplashImages] = useState<
    Array<{ id: number; url: string | null; file: File | null }>
  >([
    { id: 1, url: null, file: null },
    { id: 2, url: null, file: null },
    { id: 3, url: null, file: null },
    { id: 4, url: null, file: null },
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSplash = async () => {
      setIsLoading(true);
      try {
        const result = await getSplash();


        if (result.success && result.data) {
          const images = (result.data as any).splashScreens || (result.data as any).images || [];


          
          const baseImages: Array<{ id: number; url: string | null; file: File | null }> = [
            { id: 1, url: null, file: null },
            { id: 2, url: null, file: null },
            { id: 3, url: null, file: null },
            { id: 4, url: null, file: null },
          ];

          if (Array.isArray(images) && images.length > 0) {
            images.forEach(
              (
                img:
                  | string
                  | {
                      id?: number;
                      imageUrl?: string;
                      url?: string;
                      image?: string;
                    },
                index: number
              ) => {
                if (index < baseImages.length) {
                  const imageUrl =
                    typeof img === "string" ? img : img.imageUrl || img.url || img.image || null;


                  if (imageUrl) {
                    baseImages[index] = {
                      ...baseImages[index],
                      url: imageUrl,
                      file: null,
                    };
                  }
                }
              }
            );
          }

          setSplashImages(baseImages);
        }
      } catch (error) {
        console.error("Error fetching splash images:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSplash();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Layout className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Splash Screen</h2>
        </div>
        <button
          onClick={async () => {
            setIsLoading(true);
            try {
              const result = await getSplash();
              if (result.success && result.data) {
                const images = (result.data as any).splashScreens || (result.data as any).images || [];
                
                
                const baseImages: Array<{ id: number; url: string | null; file: File | null }> = [
                  { id: 1, url: null, file: null },
                  { id: 2, url: null, file: null },
                  { id: 3, url: null, file: null },
                  { id: 4, url: null, file: null },
                ];
                images.forEach((img: any, index: number) => {
                  if (index < baseImages.length) {
                    const imageUrl =
                      typeof img === "string" ? img : img.imageUrl || img.url || img.image || null;
                    if (imageUrl) {
                      baseImages[index] = { ...baseImages[index], url: imageUrl, file: null };
                    }
                  }
                });
                setSplashImages(baseImages);
              }
            } catch (error) {
              console.error("Error refreshing splash images:", error);
            } finally {
              setIsLoading(false);
            }
          }}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {splashImages.map((image, index) => (
          <div key={image.id} className="space-y-4">
            <h3 className="text-base font-semibold text-gray-700">Splash Image {index + 1}</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center bg-gray-50">
              <div className="h-64 w-full rounded-lg border border-gray-300 flex items-center justify-center bg-white mb-4 overflow-hidden">
                {isLoading ? (
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
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 hover:border-primary-400 hover:bg-primary-50/50 transition-all cursor-pointer">
                  <Upload className="h-6 w-6 mx-auto text-gray-400 mb-2" />
                  <p className="text-xs font-medium text-gray-700 mb-1">Upload Image</p>
                  <p className="text-[10px] text-gray-500">1080x1920px, PNG/JPG</p>
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

      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          className={`flex items-center justify-center space-x-2 rounded-lg px-6 py-3 transition-colors font-medium ${
            splashImages.some((img) => img.file !== null) && !isUploading
              ? "bg-primary-600 text-white hover:bg-primary-700"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
          disabled={!splashImages.some((img) => img.file !== null) || isUploading}
          onClick={async () => {
            const filesToUpload = splashImages
              .filter((img) => img.file !== null)
              .map((img) => img.file as File);

            if (filesToUpload.length > 0) {
              setIsUploading(true);
              const result = await uploadSplash(filesToUpload);
              setIsUploading(false);

              if (result.success) {
                notify.success("Splash screen images updated successfully!");

                await new Promise((resolve) => setTimeout(resolve, 1500));

                const refreshResult = await getSplash();
                if (refreshResult.success && refreshResult.data) {
                  const images = (refreshResult.data as any).images || [];
                  
                  
                  const baseImages: Array<{ id: number; url: string | null; file: File | null }> = [
                    { id: 1, url: null, file: null },
                    { id: 2, url: null, file: null },
                    { id: 3, url: null, file: null },
                    { id: 4, url: null, file: null },
                  ];

                  images.forEach((img: any, index: number) => {
                    if (index < baseImages.length) {
                      const imageUrl =
                        typeof img === "string"
                          ? img
                          : img.imageUrl || img.url || img.image || null;

                      if (imageUrl) {
                        baseImages[index] = {
                          ...baseImages[index],
                          url: imageUrl,
                          file: null,
                        };
                      }
                    }
                  });

                  setSplashImages(baseImages);
                }
              } else {
                notify.error(
                  `Failed to update splash screen: ${
                    result.message || result.error || "Unknown error"
                  }`
                );
              }
            }
          }}
        >
          <Save className="h-4 w-4" />
          <span>{isUploading ? "Uploading..." : "Update Splash Screen"}</span>
        </button>
      </div>
    </div>
  );
}