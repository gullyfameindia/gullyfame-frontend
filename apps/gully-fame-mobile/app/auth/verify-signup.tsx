import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import KeyboardAvoidingScreen from "@/components/KeyboardAvoidingScreen";
import { safeBack } from "@/utils/safeBack";
import { safeDecode } from "@/utils/routeParams";
import { authService, AUTH_RULES } from "@api/services/authService";
import { getErrorMessage } from "@api/client";
import OtpCodeInput, { OTP_LENGTH } from "@/components/ui/OtpCodeInput";
import { saveUserSession } from "@utils/userSession";
import { registerPushTokenWithBackend } from "@utils/pushToken";
import { useUserRole } from "@/contexts/UserRoleContext";

const C = {
  brown: "#3C2610",
  orange: "#EC9A15",
  card: "#FFF9F1",
  text: "#1F2937",
  muted: "#6B7280",
  border: "#E7D9C4",
  green: "#059669",
};

type Channel = "mobile" | "email";

export default function VerifySignup() {
  const params = useLocalSearchParams();
  const signupId = params.signupId ? String(params.signupId) : "";
  const maskedMobile = params.maskedMobile ? safeDecode(String(params.maskedMobile)) : "your mobile";
  const maskedEmail = params.maskedEmail ? safeDecode(String(params.maskedEmail)) : "your email";
  const role = params.role ? String(params.role) : "";
  const firstName = params.firstName ? safeDecode(String(params.firstName)) : "";
  const lastName = params.lastName ? safeDecode(String(params.lastName)) : "";
  const email = params.email ? safeDecode(String(params.email)) : "";
  // How long until each code may be re-sent, as reported by the server (a code still valid from
  // an earlier submit is reused, so this can be less than the full window).
  const initialWait = (raw: unknown) => {
    const n = raw === undefined || raw === "" ? NaN : Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.ceil(n) : AUTH_RULES.resendCooldownSeconds;
  };
  const { setRole } = useUserRole();

  const [mobileCode, setMobileCode] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [verified, setVerified] = useState<Record<Channel, boolean>>({ mobile: false, email: false });
  const [fieldError, setFieldError] = useState<Record<Channel, boolean>>({ mobile: false, email: false });
  const [cooldown, setCooldown] = useState<Record<Channel, number>>({
    mobile: initialWait(params.mobileResendIn),
    email: initialWait(params.emailResendIn),
  });
  const [resending, setResending] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  useEffect(() => {
    if (cooldown.mobile <= 0 && cooldown.email <= 0) return;
    const t = setTimeout(
      () => setCooldown((c) => ({ mobile: Math.max(c.mobile - 1, 0), email: Math.max(c.email - 1, 0) })),
      1000
    );
    return () => clearTimeout(t);
  }, [cooldown]);

  const finish = async (data: { token?: string; user?: any; refreshToken?: string }) => {
    if (!data.token) {
      router.replace(`/auth/signin?email=${encodeURIComponent(email)}` as any);
      return;
    }
    const profile = await saveUserSession(data.token, data.user, data.refreshToken);
    await AsyncStorage.setItem("accountCreatedVia", "normal");
    if (profile?.role) setRole(profile.role);
    registerPushTokenWithBackend();
    const query = [
      `role=${encodeURIComponent(role)}`,
      `firstName=${encodeURIComponent(firstName)}`,
      `lastName=${encodeURIComponent(lastName)}`,
      `email=${encodeURIComponent(email)}`,
    ].join("&");
    router.replace(`/onboarding/verify-id?${query}` as any);
  };

  const handleVerify = async () => {
    if (isLoading) return;
    setErrorMessage("");
    setInfoMessage("");
    const needMobile = !verified.mobile;
    const needEmail = !verified.email;
    const mobileReady = mobileCode.length === OTP_LENGTH;
    const emailReady = emailCode.length === OTP_LENGTH;
    setFieldError({ mobile: needMobile && !mobileReady, email: needEmail && !emailReady });
    if ((needMobile && !mobileReady) || (needEmail && !emailReady)) {
      setErrorMessage(
        needMobile && !mobileReady && needEmail && !emailReady
          ? "Enter both 6-digit codes."
          : needMobile && !mobileReady
            ? "Enter the 6-digit code sent to your mobile."
            : "Enter the 6-digit code sent to your email."
      );
      return;
    }
    if (!signupId) {
      setErrorMessage("This sign-up has expired. Please go back and submit the form again.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.verifySignup(signupId, {
        mobileOtp: needMobile ? mobileCode : undefined,
        emailOtp: needEmail ? emailCode : undefined,
      });
      if (!result.success || !result.data) {
        const msg = result.message || "";
        // Keep whichever code was accepted; only the wrong one needs re-entering.
        const emailWrong = /email/i.test(msg);
        const mobileWrong = /mobile/i.test(msg) || (!emailWrong && /code|otp/i.test(msg));
        setFieldError({ mobile: needMobile && mobileWrong, email: needEmail && emailWrong });
        setErrorMessage(msg);
        return;
      }
      const data = result.data;
      setVerified({ mobile: data.mobileVerified, email: data.emailVerified });
      setFieldError({ mobile: false, email: false });
      if (data.created) {
        setInfoMessage("Your account is verified!");
        await finish(data);
        return;
      }
      setInfoMessage(result.message || "Verified. Enter the other code to finish.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async (channel: Channel) => {
    if (resending || cooldown[channel] > 0 || verified[channel]) return;
    setErrorMessage("");
    setInfoMessage("");
    setResending(channel);
    try {
      const result = await authService.resendSignupCode(signupId, channel);
      if (!result.success) {
        setErrorMessage(result.message);
        // "Please wait N seconds": show the real remaining time on the button.
        if (result.retryAfterSeconds) {
          setCooldown((c) => ({ ...c, [channel]: result.retryAfterSeconds! }));
        }
        return;
      }
      if (channel === "mobile") setMobileCode("");
      else setEmailCode("");
      setFieldError((f) => ({ ...f, [channel]: false }));
      setCooldown((c) => ({ ...c, [channel]: result.data?.resendIn ?? AUTH_RULES.resendCooldownSeconds }));
      setInfoMessage(channel === "mobile" ? "A new code was sent to your mobile." : "A new code was sent to your email.");
    } finally {
      setResending(null);
    }
  };

  const renderSection = (channel: Channel) => {
    const isMobile = channel === "mobile";
    const done = verified[channel];
    return (
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <View style={[styles.sectionIcon, done && styles.sectionIconDone]}>
            <Ionicons
              name={done ? "checkmark" : isMobile ? "phone-portrait-outline" : "mail-outline"}
              size={20}
              color={done ? "#FFFFFF" : C.orange}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>{isMobile ? "Mobile number" : "Email address"}</Text>
            <Text style={styles.sectionSub} numberOfLines={1}>
              {done ? "Verified" : `Code sent to ${isMobile ? maskedMobile : maskedEmail}`}
            </Text>
          </View>
        </View>

        <OtpCodeInput
          value={isMobile ? mobileCode : emailCode}
          onChangeText={(v) => {
            (isMobile ? setMobileCode : setEmailCode)(v);
            if (fieldError[channel]) setFieldError((f) => ({ ...f, [channel]: false }));
          }}
          done={done}
          hasError={fieldError[channel]}
          autoFocus={isMobile}
          source={isMobile ? "sms" : "email"}
          testID={`signup-${channel}-otp`}
        />

        {!done ? (
          <TouchableOpacity
            onPress={() => handleResend(channel)}
            disabled={cooldown[channel] > 0 || resending !== null}
            style={styles.resend}
            hitSlop={8}
          >
            {resending === channel ? (
              <ActivityIndicator size="small" color={C.orange} />
            ) : (
              <Text style={[styles.resendText, cooldown[channel] > 0 && styles.resendTextDisabled]}>
                {cooldown[channel] > 0 ? `Resend code in ${cooldown[channel]}s` : "Resend code"}
              </Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <KeyboardAvoidingScreen style={styles.container} statusBarColor={C.brown}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={10}
          onPress={() => safeBack("/auth/createaccount")}
          style={styles.headerSide}
        >
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify your account</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        style={styles.card}
        contentContainerStyle={styles.cardContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Almost there!</Text>
        <Text style={styles.subtitle}>
          Enter the codes we sent to your mobile and email. Your account is created once both are verified.
        </Text>

        {renderSection("mobile")}
        {renderSection("email")}

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}
        {infoMessage ? (
          <View style={styles.infoBox}>
            <Ionicons name="checkmark-circle" size={18} color={C.green} />
            <Text style={styles.infoText}>{infoMessage}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
          onPress={handleVerify}
          disabled={isLoading}
          activeOpacity={0.85}
          testID="signup-verify"
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Verify & Create Account</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footnote}>Didn&apos;t get the email? Check your spam folder.</Text>
      </ScrollView>
    </KeyboardAvoidingScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.brown },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerSide: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  headerTitle: { color: "#FFFFFF", fontSize: 20, fontFamily: "PlayfairDisplay_700Bold" },
  card: { flex: 1, backgroundColor: C.card, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  cardContent: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40 },
  title: { fontSize: 28, color: C.text, fontFamily: "PlayfairDisplay_800ExtraBold" },
  subtitle: { fontSize: 15, lineHeight: 22, color: C.muted, fontFamily: "Inter_400Regular", marginTop: 6, marginBottom: 22 },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 14,
  },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(236, 154, 21, 0.14)",
    justifyContent: "center",
    alignItems: "center",
  },
  sectionIconDone: { backgroundColor: C.green },
  sectionTitle: { fontSize: 16, color: C.text, fontFamily: "Inter_600SemiBold" },
  sectionSub: { fontSize: 13, color: C.muted, fontFamily: "Inter_400Regular", marginTop: 2 },
  resend: { alignSelf: "flex-end", marginTop: 12, minHeight: 20, justifyContent: "center" },
  resendText: { fontSize: 14, color: C.orange, fontFamily: "Inter_600SemiBold" },
  resendTextDisabled: { color: "#B8A992" },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { flex: 1, color: "#B91C1C", fontSize: 14, fontFamily: "Inter_500Medium" },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ECFDF5",
    borderColor: "#6EE7B7",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  infoText: { flex: 1, color: "#047857", fontSize: 14, fontFamily: "Inter_500Medium" },
  primaryButton: {
    backgroundColor: C.orange,
    borderRadius: 14,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 17, fontFamily: "Inter_700Bold" },
  footnote: { textAlign: "center", color: C.muted, fontSize: 13, marginTop: 16, fontFamily: "Inter_400Regular" },
});
