import type { ApiResponse } from './apiTypes';
import { apiRequest } from './http';

/**
 * Categories (admin). All requests go through lib/http.ts (base URL, admin token, timeout, JSON
 * guard, normalized errors). Paths and fields as in the API collection:
 *   POST   admin/categories        multipart: name, icon (file)
 *   GET    admin/categories        ?page&limit
 *   DELETE admin/categories/:id
 */

export interface Category {
  id: string;
  name: string;
  [key: string]: any;
}

const toCategory = (raw: any): Category => ({
  id: raw?.id?.toString?.() || raw?._id?.toString?.() || raw?.categoryId?.toString?.() || '',
  name: raw?.name || raw?.title || '',
  ...(raw && typeof raw === 'object' ? raw : {}),
});

export async function createCategory(name: string, iconFile?: File | null): Promise<ApiResponse<Category>> {
  const formData = new FormData();
  formData.append('name', name);
  if (iconFile) formData.append('icon', iconFile);

  const result = await apiRequest<any>('POST', 'admin/categories', { formData });
  if (!result.success) {
    return { success: false, message: result.message || 'Failed to create category', error: result.error, data: result.data };
  }
  const payload = result.data ?? {};
  return {
    success: true,
    message: result.message || 'Category created successfully',
    data: toCategory(payload.category || payload),
  };
}

export async function getCategories(
  page: number = 1,
  limit: number = 50
): Promise<ApiResponse<{ items: Category[]; total?: number; page?: number; limit?: number }>> {
  const result = await apiRequest<any>('GET', 'admin/categories', { query: { page, limit } });
  if (!result.success) {
    return { success: false, message: result.message || 'Failed to fetch categories', error: result.error, data: result.data };
  }

  const payload = result.data ?? {};
  const rawItems: any[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload.categories)
        ? payload.categories
        : Array.isArray(payload.data)
          ? payload.data
          : [];

  return {
    success: true,
    message: result.message || 'Categories fetched successfully',
    data: { items: rawItems.map(toCategory), total: payload.total, page: payload.page, limit: payload.limit },
  };
}

export async function deleteCategory(id: string): Promise<ApiResponse<null>> {
  if (!id) {
    return { success: false, message: 'Category ID is required to delete a category.', error: 'MISSING_ID', data: null };
  }
  const result = await apiRequest('DELETE', `admin/categories/${encodeURIComponent(id.toString())}`);
  return result.success
    ? { success: true, message: result.message || 'Category deleted successfully', data: null }
    : { success: false, message: result.message || 'Failed to delete category', error: result.error, data: null };
}
