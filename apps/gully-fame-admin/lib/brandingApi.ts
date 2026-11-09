import type { ApiResponse } from "./apiTypes";
import { apiRequest } from "./http";

/**
 * App branding (logo + splash screens). Requests go through lib/http.ts.
 *
 * Contract (API collection): logo and splash images are both uploaded with POST public/logo
 * (multipart field `logo` or `splash`); GET public/logo and GET public/splash read them.
 * All public/* endpoints are called WITHOUT a token, exactly as in the collection.
 * There is no POST public/splash in the collection, so splash uploads use public/logo.
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

  const result = await apiRequest<any>("POST", "public/logo", { formData, auth: "none" });
  return result.success
    ? { success: true, message: result.message || "Logo uploaded successfully", data: { logoUrl: result.data?.logoUrl || "" } }
    : { success: false, message: result.message || "Upload failed", error: result.error };
}

export async function uploadSplash(files: File[]): Promise<ApiResponse<SplashResponse>> {
  const formData = new FormData();
  files.forEach((file) => formData.append("splash", file));

  const result = await apiRequest<any>("POST", "public/logo", { formData, auth: "none" });
  const images = Array.isArray(result.data?.images) ? result.data.images : Array.isArray(result.data) ? result.data : [];
  return result.success
    ? { success: true, message: result.message || "Splash images uploaded successfully", data: { images } }
    : { success: false, message: result.message || "Upload failed", error: result.error };
}

export async function getLogo(): Promise<ApiResponse<LogoResponse>> {
  const result = await apiRequest<any>("GET", "public/logo", { auth: "none" });
  if (!result.success) return { success: false, message: result.message || "Failed to fetch logo", error: result.error };
  const logoUrl = typeof result.data === "string" ? result.data : result.data?.logoUrl || "";
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
