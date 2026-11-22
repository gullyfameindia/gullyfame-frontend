import { useState, useEffect } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import OutlinedField, { FIELD_COLORS, fieldInputStyle } from "@/components/ui/OutlinedField";
import { safeBack } from "@/utils/safeBack";
import { SOCIAL_LOGIN_ENABLED } from "@/config/features";
import { showGuestModeUnavailable } from "@utils/guestMode";
import { GoogleIcon, InstagramIcon, AppleIcon } from "@/icons";
import { authService, AUTH_RULES } from "@api/services/authService";

const { width, height } = Dimensions.get("window");

export default function LoginViaOTP() {
  const [focus, setFocus] = useState<string | null>(null);
  const params = useLocalSearchParams();
  const [emailOrMobile, setEmailOrMobile] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (params.email) {
      setEmailOrMobile(params.email as string);
    }
  }, [params.email]);

  const handleSendOTP = async () => {
    if (isLoading) return;
    setErrorMessage("");
    const mobile = emailOrMobile.trim();
    // The backend only delivers OTPs by SMS, so OTP login needs a mobile number.
    if (!AUTH_RULES.mobile.test(mobile)) {
      setErrorMessage("Enter your 10-digit mobile number.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await authService.login({ userId: mobile, viaPassword: false });
      if (!result.success || !result.data?.txnId) {
        setErrorMessage(result.message);
        return;
      }
      // resendIn < full window when the server reused a code sent moments ago.
      const query = `txnId=${encodeURIComponent(result.data.txnId)}&mobile=${encodeURIComponent(mobile)}&resendIn=${result.data.resendIn ?? ""}`;
      router.replace(`/auth/verify-otp?${query}` as any);
    } finally {
      setIsLoading(false);
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
            Login via OTP
          </Text>

          {}
          <OutlinedField label="Mobile Number" required icon="call-outline" focused={focus === "m"}>
            <TextInput
              style={fieldInputStyle}
              placeholder="98765 43210"
              placeholderTextColor={FIELD_COLORS.placeholder}
              value={emailOrMobile}
              onChangeText={setEmailOrMobile}
              onFocus={() => setFocus("m")}
              onBlur={() => setFocus(null)}
              testID="otp-login-mobile"
              keyboardType="phone-pad"
              maxLength={10}
            />
          </OutlinedField>

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
            testID="otp-login-send"
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.sendOtpText}>Send OTP</Text>
            )}
          </TouchableOpacity>

          <View style={styles.continueWithContainer}>
            <View style={styles.separatorLine} />
            <Text style={styles.continueWithText}>or</Text>
            <View style={styles.separatorLine} />
          </View>

          <TouchableOpacity
            style={styles.passwordLoginButton}
            onPress={() => safeBack()}
            testID="otp-login-back"
            activeOpacity={0.8}
          >
            <Ionicons name="lock-closed-outline" size={20} color="#3C2610" />
            <Text style={styles.passwordLoginText}>Login with Password</Text>
          </TouchableOpacity>

          {SOCIAL_LOGIN_ENABLED && (
            <>
              <View style={styles.continueWithContainer}>
                <View style={styles.separatorLine} />
                <Text style={styles.continueWithText}>or continue with</Text>
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
    marginBottom: 6,
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
  sendOtpButton: {
    paddingVertical: 18,
    marginBottom: 20,
    marginTop: 10,
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
  passwordLoginButton: {
    paddingVertical: 12,
    flexDirection: "row",
    gap: 8,
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#3C2610",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 0,
    marginBottom: 0,
  },
  passwordLoginText: {
    color: "#3C2610",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  passwordUnderlinedText: {
    color: "#EC9A15",
    textDecorationLine: "underline",
    fontFamily: "Inter_400Regular",
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
  createAccountContainer: {
    alignItems: "center",
    marginTop: 22,
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
