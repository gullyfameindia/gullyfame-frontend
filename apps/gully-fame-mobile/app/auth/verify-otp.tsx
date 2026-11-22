import { useState, useEffect } from "react";
import { safeDecode } from "@/utils/routeParams";
import KeyboardAvoidingScreen from "@/components/KeyboardAvoidingScreen";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { safeBack } from "@/utils/safeBack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { authService, AUTH_RULES } from "@api/services/authService";
import { getErrorMessage } from "@api/client";
import OtpCodeInput, { OTP_LENGTH } from "@/components/ui/OtpCodeInput";
import { registerPushTokenWithBackend } from "@utils/pushToken";
import { useUserRole } from "@/contexts/UserRoleContext";
import { saveUserSession } from "@utils/userSession";

const { width, height } = Dimensions.get("window");

export default function VerifyOtp() {
  const params = useLocalSearchParams();
  const txnId = params.txnId ? String(params.txnId) : "";
  // "login" (default): OTP sign-in. "reset": step 2 of forgot password.
  const mode = params.mode === "reset" ? "reset" : "login";
  const mobile = params.mobile ? safeDecode(String(params.mobile)) : "";
  // For reset mode the backend returns an already-masked email.
  const maskedTarget = params.target ? safeDecode(String(params.target)) : "";
  const resetUserId = params.userId ? safeDecode(String(params.userId)) : "";
  const { setRole } = useUserRole();

  const [otp, setOtp] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [currentTxnId, setCurrentTxnId] = useState(txnId);
  // Server-reported wait (less than the full window when a code sent moments ago was reused).
  const [cooldown, setCooldown] = useState(() => {
    const n = params.resendIn === undefined || params.resendIn === "" ? NaN : Number(params.resendIn);
    return Number.isFinite(n) && n >= 0 ? Math.ceil(n) : AUTH_RULES.resendCooldownSeconds;
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const getMaskedEmailOrMobile = () => {
    if (mode === "reset") return maskedTarget || "your email";
    if (mobile.length < 4) return "your mobile number";
    return `${"*".repeat(mobile.length - 4)}${mobile.slice(-4)}`;
  };

  const handleResendOtp = async () => {
    if (isResending || cooldown > 0) return;
    setErrorMessage("");
    setSuccessMessage("");
    setIsResending(true);
    try {
      const result =
        mode === "reset"
          ? await authService.forgotPassword(resetUserId, { resend: true })
          : await authService.resendOtp(mobile);
      if (!result.success || !result.data?.txnId) {
        setErrorMessage(result.message);
        if (result.retryAfterSeconds) setCooldown(result.retryAfterSeconds);
        return;
      }
      setCurrentTxnId(result.data.txnId);
      // The old code is replaced; clear what was typed for it.
      setOtp("");
      setCooldown(result.data.resendIn ?? AUTH_RULES.resendCooldownSeconds);
      setSuccessMessage("A new verification code has been sent.");
    } finally {
      setIsResending(false);
    }
  };

  const handleValidate = async () => {
    if (isLoading) return;
    setErrorMessage("");
    setSuccessMessage("");
    if (otp.length !== OTP_LENGTH) {
      setErrorMessage("Please enter the 6-digit code.");
      return;
    }
    if (!currentTxnId) {
      setErrorMessage("This code request has expired. Please go back and request a new one.");
      return;
    }
    setIsLoading(true);
    try {
      if (mode === "reset") {
        const result = await authService.verifyResetOtp(currentTxnId, otp);
        if (!result.success || !result.data?.resetToken) {
          setErrorMessage(result.message);
          return;
        }
        router.replace(`/auth/resetpassword?resetToken=${encodeURIComponent(result.data.resetToken)}` as any);
        return;
      }

      const result = await authService.verifyOtp({ txnId: currentTxnId, otp });
      if (!result.success || !result.data?.token) {
        setErrorMessage(result.message);
        return;
      }
      const profile = await saveUserSession(result.data.token, result.data.user, result.data.refreshToken);
      await AsyncStorage.setItem("accountCreatedVia", "normal");
      setRole(profile.role);
      registerPushTokenWithBackend();
      setSuccessMessage("OTP verified successfully!");
      // First OTP login creates a bare account (mobile only), so collect the profile.
      if (result.data.isNewUser || !profile.firstName) {
        router.replace("/onboarding/personal-details" as any);
      } else {
        // TEMP: location permission step disabled; restore the next line to ask for location again.
        // router.replace("/auth/location");
        router.replace("/(main)/home" as any);
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingScreen style={styles.container} statusBarColor="#3C2610">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => safeBack()} style={styles.headerSide}>
            <Svg width={20} height={20} viewBox="0 0 16 16" fill="none">
              <Path
                d="M16 7H3.83L9.42 1.41L8 0L0 8L8 16L9.41 14.59L3.83 9H16V7Z"
                fill="#EC9A15"
              />
            </Svg>
          </TouchableOpacity>
          <Image source={require("@assets/images/gfi.png")} style={styles.logo} resizeMode="contain" />
          <View style={styles.headerSide} />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>
            {mode === "reset" ? "Verify Your Email" : "Verify Mobile Number"}
          </Text>

          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name={mode === "reset" ? "mail-outline" : "chatbubble-ellipses-outline"} size={26} color="#EC9A15" />
            </View>
          </View>

          <Text style={styles.subtitle}>
            {mode === "reset" ? "We sent a password reset code to" : "We sent a verification code to"}{" "}
            <Text style={styles.subtitleStrong}>{getMaskedEmailOrMobile()}</Text>
          </Text>

          <View style={styles.otpContainer}>
            <OtpCodeInput
              value={otp}
              onChangeText={(value) => {
                setOtp(value);
                if (errorMessage) setErrorMessage("");
              }}
              autoFocus
              hasError={Boolean(errorMessage)}
              source={mode === "reset" ? "email" : "sms"}
              theme="dark"
              testID="verify-otp-input"
            />
          </View>

          <TouchableOpacity
            style={[styles.resendButton, (isResending || cooldown > 0) && styles.resendButtonDisabled]}
            activeOpacity={0.7}
            onPress={handleResendOtp}
            disabled={isResending || cooldown > 0}
          >
            {isResending ? (
              <ActivityIndicator color="#EC9A15" />
            ) : (
              <Text style={styles.resendText}>{cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}</Text>
            )}
          </TouchableOpacity>

          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.validateButton, (isLoading || otp.length !== OTP_LENGTH) && styles.validateButtonDisabled]}
            activeOpacity={0.85}
            onPress={handleValidate}
            disabled={isLoading || otp.length !== OTP_LENGTH}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.validateButtonText}>Validate OTP</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingScreen>
  );
}

// Same dark card look as Create Account (app/auth/createaccount.tsx).
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#3C2610" },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 16, paddingTop: height * 0.025, paddingBottom: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerSide: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  logo: { width: width * 0.33, height: height * 0.065 },
  card: {
    width: "100%",
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.35)",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  title: { fontSize: 24, color: "#FFFFFF", textAlign: "center", fontFamily: "PlayfairDisplay_800ExtraBold", marginBottom: 16 },
  iconContainer: { alignItems: "center", marginBottom: 14 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(236, 154, 21, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  subtitle: { fontSize: 13, color: "#CAD7D8", lineHeight: 20, textAlign: "center", marginBottom: 18, fontFamily: "Inter_400Regular" },
  subtitleStrong: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold" },
  otpContainer: { position: "relative", marginBottom: 8 },
  resendButton: { alignSelf: "flex-end", marginBottom: 14, paddingVertical: 8 },
  resendButtonDisabled: { opacity: 0.6 },
  resendText: { color: "#EC9A15", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  validateButton: {
    backgroundColor: "#EC9A15",
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#EC9A15",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  validateButtonDisabled: { opacity: 0.5 },
  validateButtonText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  errorContainer: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
    backgroundColor: "rgba(248, 113, 113, 0.12)",
    borderColor: "rgba(248, 113, 113, 0.45)",
    borderRadius: 12,
  },
  errorText: { color: "#F87171", fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },
  successContainer: {
    backgroundColor: "rgba(52, 211, 153, 0.12)",
    borderColor: "rgba(52, 211, 153, 0.45)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  successText: { color: "#34D399", fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },
});
