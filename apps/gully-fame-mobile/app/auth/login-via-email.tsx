import { useState } from "react";
import KeyboardAvoidingScreen from "@/components/KeyboardAvoidingScreen";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ScrollView,
  Dimensions,
  Platform,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import OutlinedField, { DARK_FIELD_COLORS, darkFieldInputStyle } from "@/components/ui/OutlinedField";
import { SOCIAL_LOGIN_ENABLED } from "@/config/features";
import { GoogleIcon, InstagramIcon, AppleIcon } from "@/icons";
import { AUTH_RULES } from "@api/services/authService";

const { width, height } = Dimensions.get("window");

export default function LoginViaEmail() {
  const [focus, setFocus] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const isLoading = false;

  // The backend delivers OTPs by SMS only (email OTP returns
  // "otp_email_not_supported"), so email users continue with their password.
  const handleSendOTP = () => {
    setErrorMessage("");
    const value = email.trim().toLowerCase();
    if (!AUTH_RULES.email.test(value)) {
      setErrorMessage("Please enter a valid email address");
      return;
    }
    setErrorMessage("OTP login works with a mobile number. Continue with your password instead.");
    router.push(`/auth/signin?email=${encodeURIComponent(value)}` as any);
  };

  const handlePasswordLogin = () => {
    
    if (email) {
      router.push(
        `/auth/signin?email=${encodeURIComponent(email.trim().toLowerCase())}` as any,
      );
    } else {
      router.push("/auth/signin" as any);
    }
  };

  const handleOTPLogin = () => {
    
    if (email) {
      router.push(
        `/auth/login-via-otp?email=${encodeURIComponent(email.trim().toLowerCase())}` as any,
      );
    } else {
      router.push("/auth/login-via-otp" as any);
    }
  };

  return (
    <KeyboardAvoidingScreen style={styles.container} statusBarColor="#3C2610">
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {}
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/logo.webp")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {}
        <View style={styles.formContainer}>
          <Text
            style={[
              styles.title,
              { fontFamily: "PlayfairDisplay_800ExtraBold" },
            ]}
          >
            Login via Email
          </Text>

          {}
          <OutlinedField dark label="Email" required icon="mail-outline" focused={focus === "e"}>
            <TextInput
              style={darkFieldInputStyle}
              placeholder="you@example.com"
              placeholderTextColor={DARK_FIELD_COLORS.placeholder}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocus("e")}
              onBlur={() => setFocus(null)}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </OutlinedField>

          {}
          <View style={styles.orContainer}>
            <Text style={styles.orText}>Or</Text>
          </View>

          {}
          <View style={styles.loginViaContainer}>
            <View style={styles.loginViaRow}>
              <Text style={styles.loginViaText}>Sign in via </Text>
              <TouchableOpacity
                onPress={handlePasswordLogin}
                activeOpacity={0.7}
              >
                <Text style={styles.passwordLinkText}>Password</Text>
              </TouchableOpacity>
              <Text style={styles.loginViaText}> or </Text>
              <TouchableOpacity onPress={handleOTPLogin} activeOpacity={0.7}>
                <Text style={styles.otpLinkText}>OTP</Text>
              </TouchableOpacity>
            </View>
          </View>

          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              styles.sendOtpButton,
              isLoading && styles.disabled,
            ]}
            onPress={handleSendOTP}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryText}>Send OTP</Text>
            )}
          </TouchableOpacity>

          {SOCIAL_LOGIN_ENABLED && (
            <>
              <View style={styles.continueWithContainer}>
                <View style={styles.separatorLine} />
                <Text style={styles.continueWithText}>OR Continue With</Text>
                <View style={styles.separatorLine} />
              </View>

              <View style={styles.socialIconsContainer}>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Continue with Google"
                  style={styles.socialIconButton}
                  activeOpacity={0.7}
                >
                  <GoogleIcon size={40} />
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Continue with Instagram"
                  style={styles.socialIconButton}
                  activeOpacity={0.7}
                >
                  <InstagramIcon size={40} />
                </TouchableOpacity>
                {Platform.OS === "ios" && (
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel="Continue with Apple"
                    style={styles.socialIconButton}
                    activeOpacity={0.7}
                  >
                    <AppleIcon size={40} />
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {}
          <View style={styles.createAccountContainer}>
            <Text style={styles.createAccountText}>
              Don&apos;t have an account?{" "}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/auth/createaccount")}
              activeOpacity={0.7}
            >
              <Text style={styles.createAccountLink}>Create One</Text>
            </TouchableOpacity>
          </View>        </View>
      </ScrollView>
    </KeyboardAvoidingScreen>
  );
}

// Same dark card look as Create Account (app/auth/createaccount.tsx).
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#3C2610" },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 16, paddingTop: height * 0.025, paddingBottom: 12 },
  logoContainer: { alignItems: "center", marginBottom: 16 },
  logo: { width: width * 0.33, height: height * 0.065 },
  formContainer: {
    width: "100%",
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.35)",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
  },
  title: { fontSize: 24, color: "#FFFFFF", marginBottom: 14, textAlign: "center", fontFamily: "PlayfairDisplay_800ExtraBold" },
  primaryButton: {
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
  primaryText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  disabled: { opacity: 0.6 },
  continueWithContainer: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
  separatorLine: { flex: 1, height: 1, backgroundColor: "#3A3A3A" },
  continueWithText: { marginHorizontal: 12, fontSize: 13, color: "#8A8F90", fontFamily: "Inter_500Medium" },
  socialIconsContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 20, marginBottom: 16 },
  socialIconButton: { justifyContent: "center", alignItems: "center" },
  createAccountContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 14 },
  createAccountText: { fontSize: 13, color: "#CAD7D8", fontFamily: "Inter_400Regular" },
  createAccountLink: { color: "#EC9A15", fontSize: 13, fontFamily: "Inter_700Bold" },
  skipContainer: { alignItems: "center", paddingTop: 4, paddingBottom: 12 },
  skipText: { fontSize: 13, color: "#8A8F90", fontFamily: "Inter_400Regular" },
  skipLink: { color: "#EC9A15", fontFamily: "Inter_700Bold" },
  sendOtpButton: { marginBottom: 4 },
  sendOtpText: {},
  sendOtpButtonDisabled: {},
  orContainer: { alignItems: "center", marginTop: 6, marginBottom: 6 },
  orText: { fontSize: 13, color: "#8A8F90", fontFamily: "Inter_400Regular" },
  loginViaContainer: { alignItems: "center", marginBottom: 16 },
  loginViaRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap" },
  loginViaText: { fontSize: 14, color: "#CAD7D8", fontFamily: "Inter_400Regular" },
  passwordLinkText: { fontSize: 14, color: "#EC9A15", fontFamily: "Inter_700Bold" },
  otpLinkText: { fontSize: 14, color: "#EC9A15", fontFamily: "Inter_700Bold" },

  errorContainer: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
    backgroundColor: "rgba(248, 113, 113, 0.12)",
    borderColor: "rgba(248, 113, 113, 0.45)",
    borderRadius: 12,
  },
  errorText: {
    color: "#F87171",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
});
