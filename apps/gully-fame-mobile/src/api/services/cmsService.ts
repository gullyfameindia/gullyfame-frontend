import { apiGet, toResult, ApiResult } from "../client";

/**
 * Content pages (public). Each returns the page text as `data` (a string);
 * the backend answers 400 "Settings_not_found" when admin hasn't set it up.
 */

export interface CMSContentResponse {
  content: string;
}

const fetchPage = (path: string) =>
  toResult(async () => {
    const data = await apiGet<string | Record<string, unknown>>(path, { skipAuth: true });
    return { content: typeof data === "string" ? data : "" };
  });

export const getTermsAndConditions = (): Promise<ApiResult<CMSContentResponse>> => fetchPage("public/termAndCondition");
export const getAboutUs = (): Promise<ApiResult<CMSContentResponse>> => fetchPage("public/aboutUs");
export const getPrivacyPolicy = (): Promise<ApiResult<CMSContentResponse>> => fetchPage("public/privacyPolicy");
export const getCompetitionRules = (): Promise<ApiResult<CMSContentResponse>> => fetchPage("public/competitionRules");

export const cmsService = { getTermsAndConditions, getAboutUs, getPrivacyPolicy, getCompetitionRules };

export default cmsService;

/**
 * FAQs and support contact, both managed in the admin panel (App Content).
 * GET /admin/faqs and GET /admin/contactUs are public reads on the backend.
 */

export interface RemoteFaq {
  question: string;
  answer: string;
}

export interface SupportContact {
  email?: string;
  whatsapp?: string;
}

export const getFaqs = (): Promise<ApiResult<RemoteFaq[]>> =>
  toResult(async () => {
    const data = await apiGet<{ faqs?: { question?: string; answer?: string; isActive?: boolean }[] }>(
      // Collection: GET admin/faqs ?page&limit&search (public read). Inactive FAQs are filtered below.
      "admin/faqs",
      { skipAuth: true, params: { page: 1, limit: 100 } }
    );
    return (data?.faqs ?? [])
      .filter((f) => f.isActive !== false && f.question && f.answer)
      .map((f) => ({ question: String(f.question), answer: String(f.answer) }));
  });

export const getSupportContact = (): Promise<ApiResult<SupportContact>> =>
  toResult(async () => {
    const data = await apiGet<SupportContact | string>("admin/contactUs", { skipAuth: true });
    return data && typeof data === "object" ? data : {};
  });
