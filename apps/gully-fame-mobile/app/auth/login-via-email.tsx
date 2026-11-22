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
import OutlinedField, { FIELD_COLORS, fieldInputStyle } from "@/components/ui/OutlinedField";
import { SOCIAL_LOGIN_ENABLED } from "@/config/features";
import { showGuestModeUnavailable } from "@utils/guestMode";
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
            source={require("@assets/images/gfi.png")}
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
          <OutlinedField label="Email" required icon="mail-outline" focused={focus === "e"}>
            <TextInput
              style={fieldInputStyle}
              placeholder="you@example.com"
              placeholderTextColor={FIELD_COLORS.placeholder}
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
              styles.sendOtpButton,
              isLoading && styles.sendOtpButtonDisabled,
            ]}
            onPress={handleSendOTP}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.sendOtpText}>Send OTP</Text>
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
          </View>
        </View>

        {}
        <View style={styles.skipContainer}>
          <TouchableOpacity
            onPress={showGuestModeUnavailable}
          >
            <Text style={styles.skipText}>
              Just browsing? <Text style={styles.skipLink}>Skip →</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3C2610",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  logoContainer: {
    alignItems: "center",
    paddingBottom: 30,
    backgroundColor: "#3C2610",
    paddingTop: 30,
  },
  logo: {
    width: width * 0.3,
    height: height * 0.075,
  },
  formContainer: {
    paddingHorizontal: 30,
    paddingTop: 20,
    backgroundColor: "#FFF9F1",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    flex: 1,
    paddingBottom: 24,
  },
  title: {
    fontSize: 25,
    color: "#1F2937",
    marginBottom: 25,
    fontFamily: "PlayfairDisplay_800ExtraBold",
  },
  inputGroup: {
    marginBottom: 8,
  },
  label: {
    color: "#111827",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    marginBottom: 8,
  },
  required: {
    color: "#DC2626",
  },
  input: {
    paddingVertical: 8,
    color: "#111827",
    fontFamily: "Inter_400Regular",
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E7D9C4",
    backgroundColor: "#FFFFFF",
    minHeight: 54,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  orContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  orText: {
    fontSize: 14,
    color: "#000",
    fontFamily: "Inter_400Regular",
  },
  loginViaContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  loginViaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  loginViaText: {
    fontSize: 16,
    color: "#000",
    fontFamily: "Inter_400Regular",
  },
  passwordLinkText: {
    color: "#EC9A15",
    textDecorationLine: "underline",
    fontFamily: "Inter_400Regular",
  },
  otpLinkText: {
    color: "#EC9A15",
    textDecorationLine: "underline",
    fontFamily: "Inter_400Regular",
  },
  sendOtpButton: {
    paddingVertical: 18,
    marginBottom: 20,
    marginTop: 0,
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
  sendOtpText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  sendOtpButtonDisabled: {
    opacity: 0.6,
  },
  continueWithContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#D1D5DB",
  },
  continueWithText: {
    marginHorizontal: 12,
    fontSize: 14,
    color: "#000",
    fontFamily: "Inter_400Regular",
  },
  socialIconsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    marginBottom: 20,
  },
  socialIconButton: {
    justifyContent: "center",
    alignItems: "center",
  },
  createAccountContainer: {
    alignItems: "center",
    marginBottom: -10,
    flexDirection: "row",
    justifyContent: "center",
  },
  createAccountText: {
    fontSize: 14,
    color: "#000",
    fontFamily: "Inter_400Regular",
  },
  createAccountLink: {
    color: "#EC9A15",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    textDecorationLine: "underline",
  },
  skipContainer: {
    alignItems: "center",
    backgroundColor: "#FFF9F1",
    paddingVertical: 14,
  },
  skipText: {
    fontSize: width * 0.038,
    color: "#666",
    fontFamily: "Inter_400Regular",
  },
  skipLink: {
    color: "#EC9A15",
    fontFamily: "Inter_600SemiBold",
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
});
