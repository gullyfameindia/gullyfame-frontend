import type { ApiResponse } from './apiTypes';
import { apiRequest, type HttpResult } from './http';

/**
 * CMS pages. Reads and writes go through lib/http.ts (base URL, admin token, timeout, JSON guard).
 * Paths and body field names are exactly as in the API collection, including its spellings
 * (termAndCondition / termsAndConditions).
 */

function toResponse(result: HttpResult<any>, fallbackMessage: string): ApiResponse<any> {
  return result.success
    ? { success: true, message: result.message || fallbackMessage, data: result.data }
    : { success: false, message: result.message, error: result.error, data: result.data };
}

export async function getTermsAndConditions(): Promise<ApiResponse<any>> {
  return toResponse(await apiRequest('GET', 'admin/termAndCondition'), 'Terms and Conditions fetched successfully');
}

export async function updateTermsAndConditions(termsAndConditions: string): Promise<ApiResponse<any>> {
  return toResponse(
    await apiRequest('POST', 'admin/termAndCondition', { body: { termsAndConditions } }),
    'Terms and Conditions updated successfully'
  );
}

export async function getAboutUs(): Promise<ApiResponse<any>> {
  return toResponse(await apiRequest('GET', 'admin/aboutUs'), 'About Us fetched successfully');
}

export async function updateAboutUs(aboutUs: string): Promise<ApiResponse<any>> {
  return toResponse(await apiRequest('POST', 'admin/aboutUs', { body: { aboutUs } }), 'About Us updated successfully');
}

export async function getPrivacyPolicy(): Promise<ApiResponse<any>> {
  return toResponse(await apiRequest('GET', 'admin/privacyPolicy'), 'Privacy Policy fetched successfully');
}

export async function updatePrivacyPolicy(privacyPolicy: string): Promise<ApiResponse<any>> {
  return toResponse(
    await apiRequest('POST', 'admin/privacyPolicy', { body: { privacyPolicy } }),
    'Privacy Policy updated successfully'
  );
}

export async function getCompetitionRules(): Promise<ApiResponse<any>> {
  return toResponse(await apiRequest('GET', 'admin/competitionRules'), 'Competition Rules fetched successfully');
}

export async function updateCompetitionRules(competitionRules: string): Promise<ApiResponse<any>> {
  return toResponse(
    await apiRequest('POST', 'admin/competitionRules', { body: { competitionRules } }),
    'Competition Rules updated successfully'
  );
}
