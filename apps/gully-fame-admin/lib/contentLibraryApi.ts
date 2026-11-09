import type { ApiResponse } from './apiTypes';
import { apiRequest, type HttpMethod } from './http';

/** Every request goes through lib/http.ts (base URL, admin token, timeout, JSON guard). */
async function call<T = any>(
  method: HttpMethod,
  path: string,
  body?: FormData | Record<string, unknown>
): Promise<ApiResponse<T>> {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const r = await apiRequest<T>(method, path, isForm ? { formData: body as FormData } : { body });
  return r.success
    ? { success: true, message: r.message, data: r.data }
    : { success: false, message: r.message, error: r.error, data: r.data };
}

const id = (x: any): string => x?._id?.toString?.() || x?.id?.toString?.() || '';

/* ---------------------------------- FAQs ---------------------------------- */

export interface Faq {
  id: string;
  question: string;
  answer: string;
  isActive: boolean;
}

const toFaq = (f: any): Faq => ({
  id: id(f),
  question: f.question || '',
  answer: f.answer || '',
  isActive: f.isActive !== false && f.isActive !== 0,
});

export async function getFaqs(page = 1, limit = 100): Promise<ApiResponse<{ items: Faq[]; total: number }>> {
  const r = await call('GET', `admin/faqs?page=${page}&limit=${limit}`);
  if (!r.success) return r;
  const list: any[] = r.data?.faqs || [];
  return { success: true, data: { items: list.map(toFaq), total: r.data?.total ?? list.length } };
}

/** Creates a FAQ, or updates it when `faqId` is passed. */
export async function saveFaq(input: { question: string; answer: string; faqId?: string }): Promise<ApiResponse<Faq>> {
  const r = await call('POST', 'admin/faqs', { ...input });
  return r.success ? { ...r, data: toFaq(r.data) } : r;
}

export function toggleFaq(faqId: string) {
  return call('PATCH', `admin/faqs/${faqId}`, { faqId });
}

export function deleteFaq(faqId: string) {
  return call('DELETE', `admin/faqs/${faqId}`, { faqId });
}

/* -------------------------------- Contact Us ------------------------------- */

export interface ContactDetails {
  email: string;
  whatsapp: string;
}

/** The app reads `{ email, whatsapp }` from admin/contactUs for its Help & Support screen. */
export async function getContactUs(): Promise<ApiResponse<ContactDetails>> {
  const r = await call('GET', 'admin/contactUs');
  if (!r.success) return r;
  const d = r.data && typeof r.data === 'object' ? r.data : {};
  return { success: true, data: { email: d.email || '', whatsapp: d.whatsapp || '' } };
}

export function updateContactUs(details: ContactDetails) {
  return call('POST', 'admin/contactUs', { contactUs: details });
}

/* ------------------- Media libraries (music, sfx, stickers, filters) ------------------- */

export interface LibraryItem {
  id: string;
  /** title for music, name for the others */
  name: string;
  subtitle: string;
  category: string;
  /** audio / sticker / filter asset */
  fileUrl: string;
  /** cover / thumbnail image, when the type has one */
  imageUrl: string;
  duration: number;
  usageCount?: number;
}

export type LibraryKind = 'audio' | 'soundfx' | 'stickers' | 'filters';

const listPath: Record<LibraryKind, string> = {
  audio: 'public/audio',
  soundfx: 'public/soundfx',
  stickers: 'public/stickers',
  filters: 'public/filters',
};

const adminPath: Record<LibraryKind, string> = {
  audio: 'admin/audio',
  soundfx: 'admin/soundfx',
  stickers: 'admin/stickers',
  filters: 'admin/filters',
};

const toItem = (kind: LibraryKind, x: any): LibraryItem => ({
  id: id(x),
  name: (kind === 'audio' ? x.title : x.name) || '',
  subtitle: kind === 'audio' ? x.artist || '' : '',
  category: x.category || '',
  fileUrl: x.url || x.imageUrl || x.assetUrl || '',
  imageUrl: kind === 'audio' ? x.coverImage || '' : kind === 'filters' ? x.thumbnail || '' : x.imageUrl || '',
  duration: x.duration || 0,
  usageCount: x.usageCount,
});

export async function listLibrary(kind: LibraryKind): Promise<ApiResponse<LibraryItem[]>> {
  const r = await call('GET', kind === 'audio' ? `${listPath[kind]}?limit=100` : listPath[kind]);
  if (!r.success) return r;
  const raw: any[] = Array.isArray(r.data) ? r.data : r.data?.audios || r.data?.items || [];
  return { success: true, data: raw.map((x) => toItem(kind, x)) };
}

export function createLibraryItem(kind: LibraryKind, form: FormData) {
  return call('POST', adminPath[kind], form);
}

export function updateLibraryItem(kind: LibraryKind, itemId: string, fields: Record<string, unknown>) {
  return call('PUT', `${adminPath[kind]}/${itemId}`, fields);
}

export function deleteLibraryItem(kind: LibraryKind, itemId: string) {
  return call('DELETE', `${adminPath[kind]}/${itemId}`);
}
