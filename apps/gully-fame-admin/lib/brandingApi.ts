import type { ApiResponse } from "./apiTypes";
import { apiRequest } from "./http";

/**
 * App branding (logo + splash screens). Requests go through lib/http.ts.
 *
 * Contract (API collection): logo and splash images are both uploaded with POST public/logo
 * (multipart field `logo` or `splash`); GET public/logo and GET public/splash read them.
 * Reads are public (no token). POST public/logo changes the app for everyone, so the backend
 * requires the admin token on it. There is no POST public/splash, so splash uploads use public/logo.
 */

export interface LogoResponse {
  logoUrl: string;
}

export interface SplashResponse {
  images: string[];
}

export async function uploadLogo(file: File): Promise<ApiResponse<LogoResponse>> {
  const formData = new FormData();
  formData.append("logo", file);

  const result = await apiRequest<any>("POST", "public/logo", { formData, auth: "admin" });
  return result.success
    ? { success: true, message: result.message || "Logo uploaded successfully", data: { logoUrl: result.data?.logoUrl || "" } }
    : { success: false, message: result.message || "Upload failed", error: result.error };
}

export async function uploadSplash(files: File[]): Promise<ApiResponse<SplashResponse>> {
  const formData = new FormData();
  files.forEach((file) => formData.append("splash", file));

  const result = await apiRequest<any>("POST", "public/logo", { formData, auth: "admin" });
  const images = Array.isArray(result.data?.images) ? result.data.images : Array.isArray(result.data) ? result.data : [];
  return result.success
    ? { success: true, message: result.message || "Splash images uploaded successfully", data: { images } }
    : { success: false, message: result.message || "Upload failed", error: result.error };
}

export async function getLogo(): Promise<ApiResponse<LogoResponse>> {
  const result = await apiRequest<any>("GET", "public/logo", { auth: "none" });
  if (!result.success) return { success: false, message: result.message || "Failed to fetch logo", error: result.error };
  // The backend stores the logo as an array of URLs (one upload can hold several); show the first.
  const raw = result.data;
  const logoUrl = typeof raw === "string" ? raw : Array.isArray(raw) ? String(raw[0] || "") : raw?.logoUrl || "";
  return { success: true, message: result.message || "Logo fetched successfully", data: { logoUrl } };
}

export async function getSplash(): Promise<ApiResponse<SplashResponse>> {
  const result = await apiRequest<any>("GET", "public/splash", { auth: "none" });
  if (!result.success) return { success: false, message: result.message || "Failed to fetch splash images", error: result.error };
  return {
    success: true,
    message: result.message || "Splash images fetched successfully",
    data: { images: Array.isArray(result.data) ? result.data : [] },
  };
}
