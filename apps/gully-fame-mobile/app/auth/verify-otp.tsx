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
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { safeBack } from "@/utils/safeBack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Path } from "react-native-svg";
import PhoneMessageIcon from "@components/ui/PhoneMessageIcon";
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {}
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => safeBack()} style={styles.backButton}>
          <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <Path
              d="M16 7H3.83L9.42 1.41L8 0L0 8L8 16L9.41 14.59L3.83 9H16V7Z"
              fill="#263238"
            />
          </Svg>
        </TouchableOpacity>

        {}
        <Text style={[styles.title, { fontFamily: "PlayfairDisplay_600SemiBold" }]}>
          {mode === "reset" ? "Verify Your Email" : "Verify Mobile Number"}
        </Text>
        <Text style={styles.subtitle}>
          {mode === "reset"
            ? "We have sent a password reset code to your email"
            : "We have sent verification code to your mobile number"}
        </Text>

        {}
        <View style={styles.iconContainer}>
          <PhoneMessageIcon width={80} height={73} />
        </View>

        {}
        <Text style={styles.instructionTitle}>Enter a verification code</Text>
        <Text style={styles.instructionSubtitle}>
          A verification code was sent to {getMaskedEmailOrMobile()}
        </Text>

        {}
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
            testID="verify-otp-input"
          />
        </View>
        {}
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

        {}
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
      </ScrollView>
    </KeyboardAvoidingScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF9F1",
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: height * 0.06,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    color: "#000000",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    color: "rgba(0, 0, 0, 0.6)",
    lineHeight: 20,
    marginBottom: 40,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  instructionTitle: {
    fontSize: 22,
    fontWeight: "400",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 8,
  },
  instructionSubtitle: {
    fontSize: 10,
    color: "rgba(0, 0, 0, 0.6)",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 32,
    fontFamily: "Inter_400Regular",
  },
  otpContainer: {
    position: "relative",
    marginBottom: 32,
  },
  resendButton: {
    alignItems: "center",
    marginBottom: 220,
    paddingVertical: 8,
  },
  resendButtonDisabled: {
    opacity: 0.6,
  },
  resendText: {
    color: "#EC9A15",
    fontWeight: "600",
    fontSize: 15,
  },
  validateButton: {
    paddingVertical: 16,
    marginBottom: 12,
    backgroundColor: "#EC9A15",
    borderRadius: 14,
    minHeight: 56,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#EC9A15",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  validateButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  validateButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  errorContainer: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 15,
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
    borderRadius: 12,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  successContainer: {
    backgroundColor: "#D1FAE5",
    borderColor: "#10B981",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  successText: {
    color: "#10B981",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
});