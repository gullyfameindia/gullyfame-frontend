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

            // Logo and splash are handled independently so a bad logo value never drops the splash images.
            const logo = logoResult.success ? logoResult.data?.logoUrl : undefined;
            if (typeof logo === "string" && logo) {
              if (logo.toLowerCase().endsWith(".svg")) {
                setLogoUrl(null);
              } else {
                setLogoUrl(logo);
              }
            }

            if (splashResult.success && splashResult.data) {
              const splashData = splashResult.data;
              let images: string[] = [];

              images = Array.isArray(splashData.images) ? splashData.images : [];

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
