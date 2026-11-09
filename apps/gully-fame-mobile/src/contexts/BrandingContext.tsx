import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { Image } from "react-native";
import { appBrandingService } from "../api/services/appBrandingService";

interface BrandingContextType {
  logoUrl: string | null;
  splashImages: string[];
  isLoading: boolean;
  imagesPreloaded: boolean;
}

const BrandingContext = createContext<BrandingContextType>({
  logoUrl: null,
  splashImages: [],
  isLoading: true,
  imagesPreloaded: false,
});

export const useBranding = () => useContext(BrandingContext);

interface BrandingProviderProps {
  children: ReactNode;
}

export const BrandingProvider: React.FC<BrandingProviderProps> = ({ children }) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [splashImages, setSplashImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [imagesPreloaded, setImagesPreloaded] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) {
      return;
    }

    const initFetch = async () => {
      try {
        // Logo and splash are public endpoints, so no login is needed.
        hasFetched.current = true;

        const fetchBrandingAssets = async () => {
          try {

            const [logoResult, splashResult] = await Promise.all([
              appBrandingService.getLogo(),
              appBrandingService.getSplash(),
            ]);

            if (logoResult.success && logoResult.data?.logoUrl) {
              const logo = logoResult.data.logoUrl;
              if (logo.toLowerCase().endsWith(".svg")) {
                setLogoUrl(null);
              } else {
                setLogoUrl(logo);
              }
            }

            if (splashResult.success && splashResult.data) {
              const splashData = splashResult.data;
              let images: string[] = [];

              images = splashData.images;

              if (images.length > 0) {
                setSplashImages(images);

                const preloadPromises = images.map((imageUrl, index) =>
                  Image.prefetch(imageUrl)
                    .then(() => {
                      return true;
                    })
                    .catch((error) => {
                      return false;
                    })
                );

                await Promise.all(preloadPromises);
                setImagesPreloaded(true);
              }
            }
          } catch { /* intentionally ignored */
          } finally {
            setIsLoading(false);
          }
        };

        await fetchBrandingAssets();
      } catch {
        setIsLoading(false);
      }
    };

    initFetch();
  }, []);

  return (
    <BrandingContext.Provider value={{ logoUrl, splashImages, isLoading, imagesPreloaded }}>
      {children}
    </BrandingContext.Provider>
  );
};
