import axios, {
  AxiosAdapter,
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
  getAdapter,
} from "axios";
import * as SecureStore from "expo-secure-store";
import NetInfo from "@react-native-community/netinfo";
import { API_BASE_URL, SOCKET_URL as CONFIG_SOCKET_URL } from "@/config/env";
import {
  MAX_GET_RETRIES,
  RETRYABLE_STATUS,
  backoffDelayMs,
  parseRetryAfterMs,
} from "./retryPolicy";


/**
 * The single HTTP client for the app. Every backend call goes through here.
 *
 * Backend contract: every response is `{ code, message, data }`.
 *   code 1 -> success (HTTP 200)
 *   code 0 -> validation / business error (HTTP 400)
 *   code 3 -> invalid token (HTTP 401)
 *   code 4 -> forbidden (HTTP 403)
 *   code 5 -> not found (HTTP 404)
 * Tokens are long-lived JWTs with no expiry and no refresh endpoint, so a 401
 * always means "log in again".
 */

// Both come from src/config/env.ts (validated, HTTPS only). BASE_URL ends with exactly one "/",
// and request paths are written without a leading slash, exactly as in the API collection.
export const BASE_URL = API_BASE_URL;
export const SOCKET_URL = CONFIG_SOCKET_URL;

const TOKEN_STORAGE_KEY = "authToken";
const REQUEST_TIMEOUT_MS = 30000;

export interface ApiEnvelope<T = any> {
  code: number;
  message: string;
  data: T;
}

export class ApiError extends Error {
  status: number | null;
  code: number | null;
  /** Raw backend message / error key, e.g. "insufficient_balance". */
  key: string;
  data: any;
  isNetworkError: boolean;
  isCancelled: boolean;
  isOffline: boolean;
  /** Set on HTTP 429: how long the server asked the client to wait. */
  retryAfterMs: number | null;

  constructor(
    message: string,
    opts: Partial<Omit<ApiError, "message" | "name" | "stack">> = {}
  ) {
    super(message);
    this.name = "ApiError";
    this.status = opts.status ?? null;
    this.code = opts.code ?? null;
    this.key = opts.key ?? "";
    this.data = opts.data ?? null;
    this.isNetworkError = !!opts.isNetworkError;
    this.isCancelled = !!opts.isCancelled;
    this.isOffline = !!opts.isOffline;
    this.retryAfterMs = opts.retryAfterMs ?? null;
  }
}

/**
 * Backend error keys -> what the user should read. Services throw some keys
 * raw (HTTP 400 with message "insufficient_balance"), and validators/messages.js
 * already return readable text for others; both end up here.
 */
// The backend sends the sentence from its message table in `message`, not the key.
// These entries map each sentence back to its key so callers can branch on keys.
const BACKEND_KEY_BY_TEXT: Record<string, string> = {
  "User already found with given username, Try again after new username!": "user_already_found",
  "success": "success",
  "logout successfully": "logout",
  "invalid token": "invalid_token",
  "users list": "users_list",
  "user detail not found with given id": "user_not_found",
  "forbidden": "forbidden",
  "otp send to your register mobile number": "otp_sent",
  "login successfully": "otp_verified",
  "incorrect otp, try again!": "incorrect_otp",
  "status changed successfully": "status_changed",
  "you have added this interest before": "interest_exists",
  "social Provider id is missing!": "social_id_missing",
  "Password updated successfully. Please login with new password!": "password_changed",
  "Entered password is incorrect!": "incorrect_password",
  "invalid credentials!": "invalid_credentials",
  "Category created successfully": "category_created",
  "Category deleted successfully": "category_deleted",
  "Chatter user ID is required": "chatter_id_required",
  "Competition ID is required": "competition_id_required",
  "Competition not found": "competition_not_found",
  "Reel ID is required": "reel_id_required",
  "Reel not found": "reel_not_found",
  "Receiver ID and message are required": "receiver_and_message_required",
  "Message ID and emoji are required": "message_id_and_emoji_required",
  "Message not found": "message_not_found",
  "Message IDs array is required": "message_ids_required",
  "Sender ID is required": "sender_id_required",
  "fileName and fileType are required": "file_name_and_type_required",
  "Reel published successfully": "reel_published",
  "video_url is required": "video_url_required",
  "Draft reel not found": "reel_draft_not_found",
  "Draft saved successfully": "draft_saved",
  "Competition joined successfully": "competition_joined",
  "This competition is not open for joining": "competition_not_joinable",
  "You have already joined this competition": "already_joined",
  "docType and frontImage are required": "kyc_fields_required",
  "KYC submitted successfully": "kyc_submitted",
  "KYC record not found": "kyc_not_found",
  "status must be either APPROVED or REJECTED": "invalid_kyc_status",
  "KYC status updated successfully": "kyc_updated",
  "Audio not found": "audio_not_found",
  "audio file is required": "audio_file_required",
  "Audio added successfully": "audio_created",
  "Audio deleted successfully": "audio_deleted",
  "asset file is required": "filter_asset_required",
  "Filter added successfully": "filter_created",
  "Filter deleted successfully": "filter_deleted",
  "image file is required": "sticker_image_required",
  "Sticker added successfully": "sticker_created",
  "Sticker deleted successfully": "sticker_deleted",
  "Provide either a media file or a videoUrl": "media_required",
  "Could not fetch the provided videoUrl": "video_fetch_failed",
  "text is required": "comment_text_required",
  "Comment added successfully": "comment_added",
  "Comment not found": "comment_not_found",
  "Comment deleted successfully": "comment_deleted",
  "You cannot follow yourself": "cannot_follow_self",
  "Follow status updated": "follow_toggled",
  "Wallet recharged successfully": "wallet_recharged",
  "Your account has been deactivated, please contact support": "ac_deactivated",
  "otp resent to your registered mobile number": "otp_resent",
  "Password reset code sent to your email": "reset_otp_sent",
  "Code verified, you can now set a new password": "reset_otp_verified",
  "No email is linked to this account, so the reset code can't be sent": "no_email_on_account",
  "Could not send the reset email, please try again": "reset_email_failed",
  "Email service is not available right now": "mail_not_configured",
  "Password must be at least 6 characters": "password_too_short",
  "Reset link has expired, please request a new code": "reset_token_invalid",
  "OTP has expired, please request a new one": "otp_expired",
  "Too many incorrect attempts, please request a new OTP": "otp_too_many_attempts",
  "Please wait a few seconds before requesting another OTP": "otp_resend_too_soon",
  "Could not send OTP, please check the number and try again": "otp_send_failed",
  "OTP service is not available right now": "otp_service_unavailable",
  "OTP login is only available with a mobile number": "otp_email_not_supported",
  "Payment order created": "payment_order_created",
  "Payments are not configured on this server": "razorpay_not_configured",
  "amount must be a whole number within the allowed recharge range": "invalid_recharge_amount",
  "Payment order not found": "payment_order_not_found",
  "Payment verification failed": "invalid_payment_signature",
  "Payment does not belong to this order": "payment_order_mismatch",
  "Payment amount does not match the order": "payment_amount_mismatch",
  "Payment has not been completed yet": "payment_not_captured",
  "Tip sent successfully": "tip_sent",
  "Insufficient wallet balance": "insufficient_balance",
  "amount must be a positive number": "invalid_amount",
  "You cannot tip yourself": "cannot_tip_self",
  "Notification not found": "notification_not_found",
  "Sound FX added successfully": "soundfx_created",
  "Sound FX deleted successfully": "soundfx_deleted",
  "chatterId is required": "chatter_id_required_for_archive",
  "Export started": "reel_export_queued",
  "Reel must have a video before it can be exported": "reel_not_exportable",
  "toUserId is required": "to_user_id_required",
  "You cannot invite yourself": "cannot_invite_self",
};

/** Key for a backend message: the sentence is mapped back to its key; anything else is returned as-is. */
export const backendKeyFor = (raw: string): string => {
  const trimmed = String(raw ?? "").trim();
  return BACKEND_KEY_BY_TEXT[trimmed] ?? trimmed;
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_token: "Your session has ended. Please log in again.",
  ac_deactivated: "Your account has been deactivated. Please contact support.",
  user_not_found: "No account found with these details.",
  user_already_found: "An account with this email already exists.",
  incorrect_password: "The password you entered is incorrect.",
  invalid_credentials: "Invalid credentials.",
  invalid_user_id: "Enter a valid mobile number or email.",
  incorrect_otp: "Incorrect OTP. Please try again.",
  otp_expired: "This OTP has expired. Please request a new one.",
  otp_too_many_attempts: "Too many incorrect attempts. Please request a new OTP.",
  otp_resend_too_soon: "Please wait a few seconds before requesting another OTP.",
  otp_send_failed: "Could not send the OTP. Please check the number and try again.",
  otp_service_unavailable: "OTP service is unavailable right now.",
  otp_email_not_supported: "OTP login is only available with a mobile number.",
  no_email_on_account: "No email is linked to this account, so the reset code can't be sent.",
  reset_email_failed: "Could not send the reset email. Please try again.",
  mail_not_configured: "Email service is not available right now.",
  password_too_short: "Password must be at least 6 characters.",
  reset_token_invalid: "This reset session has expired. Please request a new code.",
  social_id_missing: "Social sign-in failed. Please try again.",
  forbidden: "You are not allowed to do this.",
  competition_not_found: "Competition not found.",
  competition_not_joinable: "This competition is not open for joining.",
  already_joined: "You have already joined this competition.",
  cannot_invite_self: "You cannot invite yourself.",
  to_user_id_required: "Choose someone to invite.",
  reel_not_found: "This reel is no longer available.",
  reel_draft_not_found: "Draft not found.",
  video_url_required: "Please add a video before publishing.",
  file_name_and_type_required: "Could not prepare the upload.",
  reel_not_exportable: "This reel needs a video before it can be exported.",
  ffmpeg_not_installed: "Server-side export is unavailable right now.",
  invalid_action_type: "Unsupported action.",
  comment_text_required: "Write something before posting.",
  comment_not_found: "Comment not found.",
  cannot_follow_self: "You cannot follow yourself.",
  insufficient_balance: "Insufficient wallet balance. Please add money first.",
  invalid_amount: "Enter a valid amount.",
  invalid_recharge_amount: "Enter a whole amount within the allowed recharge range.",
  cannot_tip_self: "You cannot tip your own reel.",
  razorpay_not_configured: "Payments are not available right now.",
  payment_details_required: "Payment details are missing.",
  payment_order_not_found: "Payment order not found.",
  invalid_payment_signature: "Payment verification failed.",
  payment_order_mismatch: "Payment does not belong to this order.",
  payment_amount_mismatch: "Payment amount does not match the order.",
  payment_not_captured: "Payment has not been completed yet.",
  kyc_fields_required: "Choose a document type and add the front image.",
  kyc_not_found: "No KYC submission found.",
  notification_not_found: "Notification not found.",
  chatter_id_required: "Conversation not found.",
  chatter_id_required_for_archive: "Conversation not found.",
  receiver_and_message_required: "Type a message first.",
  message_id_and_emoji_required: "Choose a reaction.",
  message_not_found: "Message not found.",
  message_ids_required: "Select messages to delete.",
  invalid_delete_type: "Unsupported delete option.",
  sender_id_required: "Conversation not found.",
  invalid_search_type: "Unsupported search type.",
  media_required: "Provide a video to caption.",
  video_fetch_failed: "Could not read the video for captions.",
  Settings_not_found: "This page is not available yet.",
};

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

/** Turn a raw backend message (key or sentence) into user-facing text. */
export function friendlyMessage(raw?: string | null): string {
  if (!raw) return GENERIC_MESSAGE;
  const trimmed = String(raw).trim();
  if (ERROR_MESSAGES[trimmed]) return ERROR_MESSAGES[trimmed];
  if (/^Voting is only allowed/i.test(trimmed)) {
    return "Voting is only open for entries in live competitions.";
  }
  if (/^You can only delete your own messages/i.test(trimmed)) {
    return "You can only delete your own messages for everyone.";
  }
  if (/^Read messages cannot be deleted/i.test(trimmed)) {
    return "Messages that were already read can't be deleted for everyone.";
  }
  // Mongoose cast errors and other internals are not meant for users.
  if (/Cast to ObjectId failed|BSON|E11000|ECONN|Cannot read prop/i.test(trimmed)) {
    return GENERIC_MESSAGE;
  }
  // Remaining snake_case keys we don't know about.
  if (/^[a-z]+(_[a-z]+)+$/.test(trimmed)) return GENERIC_MESSAGE;
  return trimmed;
}

/** Message to show for any thrown value (ApiError or otherwise). */
export function getErrorMessage(error: unknown, fallback = GENERIC_MESSAGE): string {
  if (error instanceof ApiError) return error.message || fallback;
  if (error && typeof error === "object" && "message" in error) {
    return friendlyMessage(String((error as any).message)) || fallback;
  }
  return fallback;
}

// ==================== TOKEN STORAGE (SecureStore only) ====================

let cachedToken: string | null | undefined;

const isUsableToken = (token: string | null | undefined): token is string => {
  const normalized = token?.trim();
  return !!normalized && !["none", "null", "undefined"].includes(normalized.toLowerCase());
};

export const getAuthToken = async (): Promise<string | null> => {
  if (cachedToken !== undefined) return cachedToken;
  try {
    const token = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
    cachedToken = isUsableToken(token) ? token.trim() : null;
  } catch {
    cachedToken = null;
  }
  return cachedToken;
};

export const setAuthToken = async (token: string): Promise<void> => {
  if (isUsableToken(token)) {
    cachedToken = token.trim();
    await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, cachedToken);
  } else {
    await removeAuthToken();
  }
};

export const removeAuthToken = async (): Promise<void> => {
  cachedToken = null;
  try {
    await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
  } catch {
    // Nothing stored.
  }
};

// ==================== SESSION-ENDED HANDLER ====================

type UnauthorizedHandler = (reason: "invalid_token" | "ac_deactivated") => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;
let unauthorizedFired = false;

/** Registered once at the app root; runs global logout + redirect. */
export const setUnauthorizedHandler = (handler: UnauthorizedHandler | null) => {
  unauthorizedHandler = handler;
};

const fireUnauthorized = async (reason: "invalid_token" | "ac_deactivated") => {
  if (unauthorizedFired) return;
  unauthorizedFired = true;
  await removeAuthToken();
  try {
    unauthorizedHandler?.(reason);
  } finally {
    // Allow the next session to be ended again later.
    setTimeout(() => {
      unauthorizedFired = false;
    }, 2000);
  }
};

// ==================== CONNECTIVITY ====================

let isOnline = true;
NetInfo.addEventListener((state) => {
  isOnline = state.isConnected !== false && state.isInternetReachable !== false;
});

export const isDeviceOnline = () => isOnline;

// ==================== CLIENT ====================

declare module "axios" {
  export interface AxiosRequestConfig {
    /** Do not attach the bearer token (login, register, public pages). */
    skipAuth?: boolean;
  }
}

type RetryableConfig = InternalAxiosRequestConfig & { _retryCount?: number };

/**
 * Auth rule from the API collection: public/* and auth/* endpoints are called WITHOUT a token
 * (login, OTP, CMS pages, media libraries), except auth/reset-password, which acts on the signed-in
 * user. Everything else carries the user token. Enforced here so a service cannot get it wrong.
 */
export function requiresUserToken(url: string | undefined): boolean {
  const path = String(url ?? "").replace(/^https?:\/\/[^/]+/i, "").replace(/^\/+(v1\/api\/)?/, "").replace(/^\/+/, "");
  if (path.startsWith("auth/reset-password")) return true;
  return !(path.startsWith("public/") || path.startsWith("auth/"));
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Double-submit protection: identical write requests that are still in flight
// share one network call instead of creating duplicates (double-tap on "Post",
// "Pay", "Send" and so on).
const defaultAdapter = getAdapter(axios.defaults.adapter);
const inflightWrites = new Map<string, Promise<AxiosResponse>>();

const inflightReads = new Map<string, Promise<AxiosResponse>>();

const dedupeAdapter: AxiosAdapter = (config) => {
  const method = (config.method || "get").toLowerCase();
  if (method === "get") {
    // Identical concurrent reads (two components asking for the same data) share one network call.
    // A request with its own abort signal is never shared: cancelling it must not cancel the other caller.
    if (config.signal || config.cancelToken) return defaultAdapter(config);
    let params = "";
    try {
      params = config.params ? JSON.stringify(config.params) : "";
    } catch {
      return defaultAdapter(config);
    }
    const auth = String((config.headers as any)?.Authorization ?? "");
    const readKey = `${config.baseURL || ""}${config.url} ${params} ${auth}`;
    const existingRead = inflightReads.get(readKey);
    if (existingRead) return existingRead;
    const pendingRead = defaultAdapter(config).finally(() => inflightReads.delete(readKey));
    inflightReads.set(readKey, pendingRead);
    return pendingRead;
  }
  if (method === "head" || method === "options") {
    return defaultAdapter(config);
  }
  const body = typeof config.data === "string" ? config.data : "";
  // Multipart bodies can't be compared cheaply; they are guarded at the screen level.
  if (!body && config.data) return defaultAdapter(config);
  const key = `${method} ${config.baseURL || ""}${config.url} ${body}`;
  const existing = inflightWrites.get(key);
  if (existing) return existing;
  const pending = defaultAdapter(config).finally(() => inflightWrites.delete(key));
  inflightWrites.set(key, pending);
  return pending;
};

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  adapter: dedupeAdapter,
  headers: {
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use(async (config) => {
  if (!isOnline) {
    throw new ApiError("You're offline. Check your internet connection and try again.", {
      isNetworkError: true,
      isOffline: true,
    });
  }
  // Paths are relative to BASE_URL (which ends with "/"): drop any leading slash so
  // "user/profile" and "/user/profile" both resolve to BASE_URL + "user/profile".
  if (config.url && !/^https?:/i.test(config.url)) {
    config.url = config.url.replace(/^\/+/, "");
  }
  if (!config.skipAuth && requiresUserToken(config.url)) {
    const token = await getAuthToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const body = response.data as ApiEnvelope | undefined;
    // Every API route answers with the envelope; code !== 1 is an error even on HTTP 200.
    if (body && typeof body === "object" && "code" in body && body.code !== 1) {
      const key = backendKeyFor(body.message);
      throw new ApiError(friendlyMessage(key), {
        status: response.status,
        code: body.code,
        key,
        data: body.data,
      });
    }
    return response;
  },
  async (error: AxiosError | ApiError) => {
    if (error instanceof ApiError) throw error;

    if (axios.isCancel(error) || error.code === "ERR_CANCELED") {
      throw new ApiError("Request cancelled", { isCancelled: true });
    }

    const config = error.config as RetryableConfig | undefined;

    const method = (config?.method || "get").toLowerCase();
    const attempt = config?._retryCount ?? 0;
    const canRetry =
      !!config && method === "get" && attempt < MAX_GET_RETRIES && !config.signal?.aborted && isDeviceOnline();

    if (!error.response) {
      // Network blip or timeout: retry GETs with exponential backoff and jitter. Never replay writes.
      if (canRetry) {
        config!._retryCount = attempt + 1;
        await sleep(backoffDelayMs(attempt));
        return apiClient(config!);
      }
      const timedOut = error.code === "ECONNABORTED" || error.code === "ETIMEDOUT";
      throw new ApiError(
        timedOut
          ? "The server is taking too long to respond. Please try again."
          : "Can't reach the server. Check your internet connection and try again.",
        { isNetworkError: true }
      );
    }

    const status = error.response.status;
    const retryAfterMs =
      status === 429 ? parseRetryAfterMs((error.response.headers as any)?.["retry-after"]) : null;

    // Rate limited / temporarily unavailable: GETs wait (honouring Retry-After for 429) and try again.
    if (canRetry && RETRYABLE_STATUS.has(status)) {
      config!._retryCount = attempt + 1;
      await sleep(retryAfterMs ?? backoffDelayMs(attempt));
      return apiClient(config!);
    }
    const body = error.response.data as Partial<ApiEnvelope> | string | undefined;
    const rawMessage = typeof body === "object" && body ? String(body.message ?? "") : "";
    const key = backendKeyFor(rawMessage);
    const backendCode = typeof body === "object" && body && typeof body.code === "number" ? body.code : null;

    const isSessionError =
      !config?.skipAuth &&
      requiresUserToken(config?.url) &&
      (status === 401 || key === "invalid_token" || key === "ac_deactivated");
    if (isSessionError) {
      const deactivated = key === "ac_deactivated";
      await fireUnauthorized(deactivated ? "ac_deactivated" : "invalid_token");
      throw new ApiError(friendlyMessage(deactivated ? "ac_deactivated" : "invalid_token"), {
        status,
        code: backendCode,
        key: deactivated ? "ac_deactivated" : "invalid_token",
      });
    }

    let message: string;
    if (typeof body === "string" || !rawMessage) {
      if (status >= 500) message = "The server ran into a problem. Please try again shortly.";
      else if (status === 404) message = "This item could not be found.";
      else if (status === 403) message = friendlyMessage("forbidden");
      else if (status === 429) message = "You're doing that too often. Please wait a moment and try again.";
      else message = GENERIC_MESSAGE;
    } else {
      message = friendlyMessage(key);
    }

    throw new ApiError(message, {
      status,
      code: backendCode,
      key,
      data: typeof body === "object" ? body?.data ?? null : null,
      retryAfterMs,
    });
  }
);

// ==================== TYPED HELPERS ====================

/** Calls the API and returns the envelope's `data` (throws ApiError on failure). */
export async function apiGet<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.get<ApiEnvelope<T>>(url, config);
  return res.data.data;
}

export async function apiPost<T = any>(url: string, body?: any, config?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.post<ApiEnvelope<T>>(url, body, config);
  return res.data.data;
}

export async function apiPut<T = any>(url: string, body?: any, config?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.put<ApiEnvelope<T>>(url, body, config);
  return res.data.data;
}

export async function apiDelete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await apiClient.delete<ApiEnvelope<T>>(url, config);
  return res.data.data;
}

/** Same as the helpers above but also returns the backend's success message. */
export async function apiRequest<T = any>(
  config: AxiosRequestConfig
): Promise<{ data: T; message: string }> {
  const res = await apiClient.request<ApiEnvelope<T>>(config);
  return { data: res.data.data, message: res.data.message };
}

export interface ApiResult<T = any> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
  status?: number | null;
  isNetworkError?: boolean;
}

/**
 * Runs a call and converts it to the `{ success, data, message }` shape the
 * screens consume, so screens never need try/catch around a service.
 */
export async function toResult<T>(fn: () => Promise<T>, successMessage = "success"): Promise<ApiResult<T>> {
  try {
    const data = await fn();
    return { success: true, data, message: successMessage };
  } catch (error) {
    const message = getErrorMessage(error);
    return {
      success: false,
      message,
      error: message,
      status: error instanceof ApiError ? error.status : null,
      isNetworkError: error instanceof ApiError ? error.isNetworkError : false,
    };
  }
}

export { apiClient };
export default apiClient;
