import type { ApiResponse } from './apiTypes';
import { apiRequest } from './http';

/**
 * Home banners (admin). All requests go through lib/http.ts (base URL, admin token, timeout,
 * JSON guard, normalized errors). Paths and fields as in the API collection:
 *   POST   admin/banners        multipart: banner (file), title
 *   GET    admin/banners        ?page&limit
 *   GET    admin/banners/:id
 *   PUT    admin/banners/:id    multipart: title, banner (file)
 *   DELETE admin/banners/:id
 */

export interface Banner {
  id: string;
  title: string;
  banner: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

const toBanner = (payload: any, fallback: { id?: string; title?: string } = {}): Banner => {
  const p = payload && typeof payload === 'object' ? payload : {};
  return {
    id: p._id?.toString() || p.id?.toString() || fallback.id || '',
    title: p.title || fallback.title || '',
    banner: p.banner || p.imageUrl || '',
    isActive: p.isActive,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    ...p,
  };
};

export async function createBanner(title: string, bannerFile: File): Promise<ApiResponse<Banner>> {
  if (!title?.trim()) return { success: false, message: 'Banner title is required', error: 'MISSING_TITLE' };
  if (!bannerFile) return { success: false, message: 'Banner image file is required', error: 'MISSING_FILE' };

  const formData = new FormData();
  formData.append('title', title.trim());
  formData.append('banner', bannerFile);

  const result = await apiRequest<any>('POST', 'admin/banners', { formData });
  return result.success
    ? { success: true, message: result.message || 'Banner created successfully', data: toBanner(result.data) }
    : { success: false, message: result.message || 'Failed to create banner', error: result.error };
}

export async function getBanners(
  page: number = 1,
  limit: number = 10
): Promise<ApiResponse<{ items: Banner[]; total?: number; page?: number; limit?: number }>> {
  const result = await apiRequest<any>('GET', 'admin/banners', { query: { page, limit } });
  if (!result.success) {
    return { success: false, message: result.message || 'Failed to fetch banners', error: result.error };
  }
  const payload = result.data ?? {};
  const rawItems: any[] = Array.isArray(payload.Banners)
    ? payload.Banners
    : Array.isArray(payload.banners)
      ? payload.banners
      : Array.isArray(payload)
        ? payload
        : Array.isArray(payload.data)
          ? payload.data
          : [];
  return {
    success: true,
    message: result.message || 'Banners fetched successfully',
    data: {
      items: rawItems.map((b) => toBanner(b)),
      total: payload.total,
      page: payload.page || page,
      limit: payload.limit || limit,
    },
  };
}

export async function getBanner(id: string): Promise<ApiResponse<Banner>> {
  if (!id) return { success: false, message: 'Banner ID is required', error: 'MISSING_ID' };
  const result = await apiRequest<any>('GET', `admin/banners/${encodeURIComponent(id.toString())}`);
  return result.success
    ? { success: true, message: result.message || 'Banner fetched successfully', data: toBanner(result.data, { id }) }
    : { success: false, message: result.message || 'Failed to fetch banner', error: result.error };
}

export async function updateBanner(id: string, title?: string, bannerFile?: File | null): Promise<ApiResponse<Banner>> {
  if (!id) return { success: false, message: 'Banner ID is required', error: 'MISSING_ID' };

  const formData = new FormData();
  if (title?.trim()) formData.append('title', title.trim());
  if (bannerFile) formData.append('banner', bannerFile);

  const result = await apiRequest<any>('PUT', `admin/banners/${encodeURIComponent(id.toString())}`, { formData });
  return result.success
    ? {
        success: true,
        message: result.message || 'Banner updated successfully',
        data: toBanner(result.data, { id, title: title || '' }),
      }
    : { success: false, message: result.message || 'Failed to update banner', error: result.error };
}

export async function deleteBanner(id: string): Promise<ApiResponse<null>> {
  if (!id) return { success: false, message: 'Banner ID is required to delete a banner.', error: 'MISSING_ID', data: null };
  const result = await apiRequest('DELETE', `admin/banners/${encodeURIComponent(id.toString())}`);
  return result.success
    ? { success: true, message: result.message || 'Banner deleted successfully', data: null }
    : { success: false, message: result.message || 'Failed to delete banner', error: result.error, data: null };
}
