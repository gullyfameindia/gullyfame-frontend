import { apiGet, toResult, ApiResult } from "../client";

/**
 * Public branding.
 * GET /public/logo   -> data: logo URLs (string[]); {} or "" when none was uploaded
 * GET /public/splash -> data: splash image URLs (string[]); [] when none
 * Older backends sent the logo as a single string, so both shapes are accepted.
 */

/** Keeps only non-empty strings: the backend may send {}, "", a string or an array. */
const toUrls = (value: unknown): string[] => {
  const list = Array.isArray(value) ? value : [value];
  return list.filter((v): v is string => typeof v === "string" && v.trim() !== "");
};

export interface LogoResponse {
  logoUrl: string;
}

export interface SplashResponse {
  images: string[];
}

export const getLogo = (): Promise<ApiResult<LogoResponse>> =>
  toResult(async () => ({ logoUrl: toUrls(await apiGet<unknown>("public/logo", { skipAuth: true }))[0] || "" }));

export const getSplash = (): Promise<ApiResult<SplashResponse>> =>
  toResult(async () => {
    const data = await apiGet<unknown>("public/splash", { skipAuth: true });
    return { images: toUrls(data) };
  });

export const appBrandingService = { getLogo, getSplash };

export default appBrandingService;
