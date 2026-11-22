import { apiPost, apiPut, setAuthToken, toResult } from "../client";
import { getProfile, updateProfile, BackendUser, ProfileUpdate } from "./userService";

/**
 * Auth endpoints (all under /auth, no token needed unless noted).
 * The backend issues a JWT with no expiry and has no refresh/logout endpoints.
 */

export type BackendRole = "participants" | "fan";

export interface SignupStartData {
  signupId: string;
  /** Masked, e.g. "+91 ******3210". */
  mobile: string;
  /** Masked, e.g. "jo****@gmail.com". */
  email: string;
  smsSent: boolean;
  emailSent: boolean;
  /** Seconds until each code may be re-sent (a code still valid from an earlier submit is reused). */
  mobileResendIn?: number;
  emailResendIn?: number;
  expiresIn: number;
}

export interface SignupVerifyData {
  emailVerified: boolean;
  mobileVerified: boolean;
  created: boolean;
  user?: any;
  token?: string;
  refreshToken?: string;
}

export interface RegisterRequest {
  firstName: string;
  /** Empty when the full name is a single word. */
  lastName: string;
  /** Dialling code, e.g. "+91". */
  countryCode: string;
  /** National number, digits only (10 for India), unique. */
  mobile: string;
  /** Unique, max 50 chars. */
  email: string;
  password: string;
  role: BackendRole;
  /** 3-20 chars: lowercase letters, numbers, "." and "_". The server checks it is free. */
  username: string;
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
  /** Seconds until another code may be requested. */
  resendIn?: number;
  /** True when the server returned the code it had already sent (inside the resend window). */
  reused?: boolean;
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
  resendIn?: number;
  reused?: boolean;
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
  /**
   * POST /auth/register: sign-up step 1. Nothing is created yet; the server texts a code to the
   * mobile and emails another one. Finish with verifySignup.
   */
  registerUser: (data: RegisterRequest) =>
    toResult(
      () =>
        apiPost<SignupStartData>(
          "auth/register",
          {
            firstName: data.firstName.trim(),
            lastName: data.lastName.trim(),
            countryCode: data.countryCode,
            mobile: data.mobile.trim(),
            email: data.email.trim().toLowerCase(),
            password: data.password,
            role: data.role,
            username: data.username,
          },
          { skipAuth: true }
        ),
      "Verification codes sent"
    ),

  /**
   * POST /auth/register/verify: send one or both codes. When both are verified the account is
   * created and the response carries { user, token, refreshToken }.
   */
  verifySignup: (signupId: string, codes: { mobileOtp?: string; emailOtp?: string }) =>
    toResult(
      () =>
        apiPost<SignupVerifyData>(
          "auth/register/verify",
          {
            signupId,
            ...(codes.mobileOtp ? { mobileOtp: codes.mobileOtp } : {}),
            ...(codes.emailOtp ? { emailOtp: codes.emailOtp } : {}),
          },
          { skipAuth: true }
        ),
      "Verified"
    ),

  /** POST /auth/register/resend: a new code on one channel (30s cooldown on the server). */
  resendSignupCode: (signupId: string, channel: "mobile" | "email") =>
    toResult(
      () => apiPost<{ channel: string; resendIn?: number }>("auth/register/resend", { signupId, channel }, { skipAuth: true }),
      "Code sent"
    ),

  /** Change email, step 1: code to the new address. `resend` asks for a fresh code. */
  sendEmailChangeCode: (email: string, opts: { resend?: boolean } = {}) =>
    toResult(
      () =>
        apiPost<{ txnId: string; email: string; expiresIn: number; resendIn?: number; reused?: boolean }>(
          "user/email/send-otp",
          { email: email.trim().toLowerCase(), ...(opts.resend ? { resend: true } : {}) }
        ),
      "Code sent"
    ),

  /** Change email, step 2: the code proves the address; the server saves it. */
  verifyEmailChange: (txnId: string, otp: string) =>
    toResult(() => apiPost<{ email: string }>("user/email/verify", { txnId, otp }), "Email updated"),

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

  /**
   * Forgot password, step 1: emails a 6-digit code to the account's email. A first request inside
   * the resend window gets the code already sent; `resend: true` asks for a new one (and gets the
   * remaining wait when it is too soon).
   */
  forgotPassword: (userId: string, opts: { resend?: boolean } = {}) =>
    toResult(
      () =>
        apiPost<ForgotPasswordData>(
          "auth/forgot-password",
          { userId: userId.trim(), ...(opts.resend ? { resend: true } : {}) },
          { skipAuth: true }
        ),
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
