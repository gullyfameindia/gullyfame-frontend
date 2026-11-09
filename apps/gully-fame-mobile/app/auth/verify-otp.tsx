import { useState, useEffect } from "react";
import { safeDecode } from "@/utils/routeParams";
import KeyboardAvoidingScreen from "@/components/KeyboardAvoidingScreen";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Path } from "react-native-svg";
import PhoneMessageIcon from "@components/ui/PhoneMessageIcon";
import { authService, AUTH_RULES } from "@api/services/authService";
import { getErrorMessage } from "@api/client";
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
  const [cooldown, setCooldown] = useState(AUTH_RULES.resendCooldownSeconds);

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
        mode === "reset" ? await authService.forgotPassword(resetUserId) : await authService.resendOtp(mobile);
      if (!result.success || !result.data?.txnId) {
        setErrorMessage(result.message);
        return;
      }
      setCurrentTxnId(result.data.txnId);
      setOtp("");
      setCooldown(AUTH_RULES.resendCooldownSeconds);
      setSuccessMessage("A new verification code has been sent.");
    } finally {
      setIsResending(false);
    }
  };

  const handleValidate = async () => {
    if (isLoading) return;
    setErrorMessage("");
    setSuccessMessage("");
    if (!/^\d{6}$/.test(otp)) {
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
      const profile = await saveUserSession(result.data.token, result.data.user);
      await AsyncStorage.setItem("accountCreatedVia", "normal");
      setRole(profile.role);
      registerPushTokenWithBackend();
      setSuccessMessage("OTP verified successfully!");
      // First OTP login creates a bare account (mobile only), so collect the profile.
      if (result.data.isNewUser || !profile.firstName) {
        router.replace("/onboarding/personal-details" as any);
      } else {
        router.replace("/auth/location");
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingScreen style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {}
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
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
        <View style={styles.otpRow}>
          {Array.from({ length: 6 }).map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.otpBox,
                otp[index] && styles.otpBoxFilled
              ]}
            >
              <Text style={styles.otpBoxText}>{otp[index] || ""}</Text>
            </View>
          ))}
        </View>

          {}
        <TextInput
          value={otp}
          onChangeText={(value) => setOtp(value.replace(/[^0-9]/g, "").slice(0, 6))}
          keyboardType="number-pad"
          style={styles.hiddenInput}
          maxLength={6}
            autoFocus={true}
            editable={true}
            caretHidden={true}
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
            <ActivityIndicator color="#F59E0B" />
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
          style={[styles.validateButton, isLoading && styles.validateButtonDisabled]} 
          activeOpacity={0.85} 
          onPress={handleValidate}
          disabled={isLoading}
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
    backgroundColor: "#FFFFFF",
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
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  otpBox: {
    width: width * 0.12,
    height: width * 0.14,
    borderWidth: 1,
    borderColor: "#999999",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  otpBoxFilled: {
    borderColor: "#999999",
  },
  otpBoxText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  hiddenInput: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    fontSize: 1,
    color: "transparent",
    zIndex: 10,
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
    color: "#F59E0B",
    fontWeight: "600",
    fontSize: 15,
  },
  validateButton: {
    backgroundColor: "#3C2610",
    borderRadius: 32,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 12,
  },
  validateButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  validateButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: "Inter_500Medium",
  },
  errorContainer: {
    backgroundColor: "#FEE2E2",
    borderColor: "#DC2626",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
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