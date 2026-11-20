import { apiPost, apiPut, setAuthToken, toResult } from "../client";
import { getProfile, updateProfile, BackendUser, ProfileUpdate } from "./userService";

/**
 * Auth endpoints (all under /auth, no token needed unless noted).
 * The backend issues a JWT with no expiry and has no refresh/logout endpoints.
 */

export type BackendRole = "participants" | "fan";

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  /** 10 digits, unique. */
  mobile: string;
  /** Unique, max 50 chars. */
  email: string;
  password: string;
  role: BackendRole;
}

export interface LoginRequest {
  /** Email or mobile number. */
  userId: string;
  viaPassword: boolean;
  password?: string;
  countryCode?: string;
}

export interface PasswordLoginData {
  user: BackendUser;
  token: string;
  /** Rotating refresh token (POST auth/refresh); missing from older servers. */
  refreshToken?: string;
}

export interface OtpRequestData {
  userRegister?: boolean;
  txnId: string;
  smsSent: boolean;
  expiresIn: number;
}

export interface VerifyOtpRequest {
  txnId: string;
  otp: number | string;
}

export interface VerifyOtpData {
  token: string;
  /** Rotating refresh token (POST auth/refresh); missing from older servers. */
  refreshToken?: string;
  userId: string;
  isNewUser: boolean;
  /** Filled in by the client from GET /user/profile right after verification. */
  user?: BackendUser;
}

export interface SocialLoginRequest {
  /** Google ID token, for the server to verify (backend B1). */
  idToken?: string;
  googleId?: string;
  appleId?: string;
  facebookId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  device_token?: string;
  device_type?: "android" | "ios" | "web" | "";
}

export interface ForgotPasswordData {
  txnId: string;
  /** Masked, e.g. "ab***@gmail.com". */
  email: string;
  emailSent: boolean;
  expiresIn: number;
}

export interface ResetOtpData {
  resetToken: string;
  expiresIn: number;
}

/** Field rules mirrored from the backend validators. */
export const AUTH_RULES = {
  mobile: /^\d{10}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  emailMaxLength: 50,
  passwordMinLength: 6,
  stringMaxLength: 255,
  otpLength: 6,
  resendCooldownSeconds: 30,
};

export const authService = {
  /** POST /auth/register. Returns no token, so callers log in afterwards. */
  registerUser: (data: RegisterRequest) =>
    toResult(async () => {
      await apiPost(
        "auth/register",
        {
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          mobile: data.mobile.trim(),
          email: data.email.trim().toLowerCase(),
          password: data.password,
          role: data.role,
        },
        { skipAuth: true }
      );
      return {};
    }, "Account created"),

  /**
   * POST /auth/login.
   * viaPassword=true  -> { user, token } (token is stored).
   * viaPassword=false -> { userRegister, txnId, smsSent, expiresIn } (OTP sent).
   */
  login: (data: LoginRequest) =>
    toResult(async () => {
      const body: Record<string, any> = { userId: data.userId.trim(), viaPassword: data.viaPassword };
      if (data.viaPassword) body.password = data.password ?? "";
      if (data.countryCode) body.countryCode = data.countryCode;
      const result = await apiPost<PasswordLoginData & OtpRequestData>("auth/login", body, { skipAuth: true });
      if (data.viaPassword && result?.token) await setAuthToken(result.token);
      return result;
    }, data.viaPassword ? "Login successful" : "OTP sent"),

  /** POST /auth/verifyOtp, then GET /user/profile with the new token. */
  verifyOtp: (data: VerifyOtpRequest) =>
    toResult(async () => {
      const otp = typeof data.otp === "string" ? parseInt(data.otp, 10) : data.otp;
      const result = await apiPost<VerifyOtpData>("auth/verifyOtp", { txnId: data.txnId, otp }, { skipAuth: true });
      await setAuthToken(result.token);
      const user = await getProfile();
      return { ...result, user };
    }, "Login successful"),

  /** POST /auth/resendOtp. The backend enforces a 30s cooldown per number. */
  resendOtp: (userId: string, countryCode?: string) =>
    toResult(
      () =>
        apiPost<OtpRequestData>(
          "auth/resendOtp",
          { userId: userId.trim(), ...(countryCode ? { countryCode } : {}) },
          { skipAuth: true }
        ),
      "OTP resent"
    ),

  /** POST /auth/login/social -> { user, token } (token is stored). */
  socialLogin: (data: SocialLoginRequest) =>
    toResult(async () => {
      const result = await apiPost<PasswordLoginData>("auth/login/social", data, { skipAuth: true });
      if (result?.token) await setAuthToken(result.token);
      return result;
    }, "Login successful"),

  /** Forgot password, step 1: emails a 6-digit code to the account's email. */
  forgotPassword: (userId: string) =>
    toResult(
      () => apiPost<ForgotPasswordData>("auth/forgot-password", { userId: userId.trim() }, { skipAuth: true }),
      "Reset code sent to your email"
    ),

  /** Step 2: check the code -> one-time resetToken (valid 10 minutes). */
  verifyResetOtp: (txnId: string, otp: string | number) =>
    toResult(
      () =>
        apiPost<ResetOtpData>(
          "auth/forgot-password/verify-otp",
          { txnId, otp: typeof otp === "string" ? parseInt(otp, 10) : otp },
          { skipAuth: true }
        ),
      "Code verified"
    ),

  /** Step 3: set the new password with the resetToken. */
  resetPasswordWithToken: (resetToken: string, password: string) =>
    toResult(async () => {
      await apiPost("auth/forgot-password/reset", { resetToken, password }, { skipAuth: true });
      return {};
    }, "Password updated. Please log in with your new password."),

  /**
   * PUT /auth/reset-password (logged in). An account that already has a password
   * must send it as `currentPassword`; accounts created with OTP or Google sign-in
   * can set their first password without one.
   */
  resetPassword: (password: string, currentPassword?: string) =>
    toResult(async () => {
      await apiPut("auth/reset-password", { password, ...(currentPassword ? { currentPassword } : {}) });
      return {};
    }, "Password updated successfully"),

  /** Change password while logged in; the server checks the current password. */
  changePassword: (data: { identifier?: string; currentPassword: string; newPassword: string }) =>
    toResult(async () => {
      await apiPut("auth/reset-password", { password: data.newPassword, currentPassword: data.currentPassword });
      return {};
    }, "Password changed successfully"),

  getUserProfile: () => toResult(() => getProfile()),

  updateProfile: (data: ProfileUpdate) => toResult(() => updateProfile(data), "Profile updated"),
};

export default authService;
