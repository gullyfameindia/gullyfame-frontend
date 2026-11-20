import { apiGet, apiClient, ApiEnvelope, toResult } from "../client";
import type { AxiosProgressEvent } from "axios";
import { guessMimeType, fileNameFromUri } from "./uploadService";

/**
 * KYC: POST /user/kyc (multipart) with docType + frontImage (+ optional backImage).
 * GET /user/kyc returns the record, or {} when nothing was submitted yet.
 * Each submission resets the status to PENDING until an admin reviews it.
 */

export type KycDocType = "aadhaar" | "pan" | "passport" | "driving_license" | "other";
export type KycStatusValue = "PENDING" | "APPROVED" | "REJECTED";

export interface KycRecord {
  _id: string;
  user: string;
  docType: KycDocType;
  frontImage: string;
  backImage: string;
  selfieImage?: string;
  status: KycStatusValue;
  reason: string;
  submittedAt: string;
  reviewedAt: string | null;
}

export const KYC_DOC_TYPES: { value: KycDocType; label: string }[] = [
  { value: "aadhaar", label: "Aadhaar Card" },
  { value: "pan", label: "PAN Card" },
  { value: "passport", label: "Passport" },
  { value: "driving_license", label: "Driving License" },
  { value: "other", label: "Other Government ID" },
];

/** Returns the KYC record, or null when the user hasn't submitted one. */
export async function getMyKyc(): Promise<KycRecord | null> {
  const data = await apiGet<KycRecord | Record<string, never>>("user/kyc");
  return data && "_id" in data ? (data as KycRecord) : null;
}

export async function submitKyc(input: {
  docType: KycDocType;
  frontImageUri: string;
  backImageUri?: string | null;
  selfieImageUri?: string | null;
  onProgress?: (percentage: number) => void;
}): Promise<KycRecord> {
  const form = new FormData();
  form.append("docType", input.docType);
  form.append("frontImage", {
    uri: input.frontImageUri,
    name: fileNameFromUri(input.frontImageUri, "jpg"),
    type: guessMimeType(input.frontImageUri, "image/jpeg"),
  } as any);
  if (input.backImageUri) {
    form.append("backImage", {
      uri: input.backImageUri,
      name: fileNameFromUri(input.backImageUri, "jpg"),
      type: guessMimeType(input.backImageUri, "image/jpeg"),
    } as any);
  }

  if (input.selfieImageUri) {
    form.append("selfieImage", {
      uri: input.selfieImageUri,
      name: fileNameFromUri(input.selfieImageUri, "jpg"),
      type: guessMimeType(input.selfieImageUri, "image/jpeg"),
    } as any);
  }

  const res = await apiClient.post<ApiEnvelope<KycRecord>>("user/kyc", form, {
    headers: { "Content-Type": "multipart/form-data" },
    // Image uploads can be slow on mobile networks.
    timeout: 120000,
    onUploadProgress: (event: AxiosProgressEvent) => {
      if (input.onProgress && event.total) input.onProgress(Math.round((event.loaded / event.total) * 100));
    },
  });
  return res.data.data;
}

export const kycStatusLabel = (kyc: KycRecord | null): string => {
  if (!kyc) return "Not submitted";
  if (kyc.status === "APPROVED") return "Verified";
  if (kyc.status === "REJECTED") return "Rejected";
  return "Under review";
};

export const kycService = {
  getMyKyc,
  submitKyc,
  getKycStatus: () => toResult(getMyKyc),
};

export default kycService;
