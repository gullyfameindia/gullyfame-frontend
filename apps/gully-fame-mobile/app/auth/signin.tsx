import { useState, useEffect } from "react";
import KeyboardAvoidingScreen from "@/components/KeyboardAvoidingScreen";
import { StyleSheet, Text, TouchableOpacity, View, Image, ScrollView, Dimensions, Platform, TextInput } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SOCIAL_LOGIN_ENABLED } from "@/config/features";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppleIcon, EyeIcon, EyeOffIcon } from "@/icons";
import { Ionicons } from "@expo/vector-icons";
import OutlinedField, { DARK_FIELD_COLORS, darkFieldInputStyle } from "@/components/ui/OutlinedField";
import { authService, AUTH_RULES } from "@api/services/authService";
import { getErrorMessage } from "@api/client";
import { registerPushTokenWithBackend } from "@utils/pushToken";
import { ActivityIndicator } from "react-native";
import { saveUserSession } from "@utils/userSession";
import { useUserRole } from "@/contexts/UserRoleContext";

const { width, height } = Dimensions.get("window");

export default function SignIn() {
  const params = useLocalSearchParams();
  const [emailOrMobile, setEmailOrMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
  const { setRole } = useUserRole();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isSocialLoading = false;

  useEffect(() => {
    if (params.email) {
      setEmailOrMobile(params.email as string);
    }
    if (params.passwordUpdated === "true") {
      setSuccessMessage("Password updated successfully!");
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    }
  }, [params.email, params.passwordUpdated]);

  const handleSignIn = async () => {
    if (isLoading) return;
    setErrorMessage("");
    setSuccessMessage("");
    const identifier = emailOrMobile.trim().toLowerCase();
    if (!identifier || !password) {
      setErrorMessage("Please fill all fields");
      return;
    }
    const isEmail = identifier.includes("@");
    if (isEmail ? !AUTH_RULES.email.test(identifier) : !AUTH_RULES.mobile.test(identifier)) {
      setErrorMessage("Enter a valid email or 10-digit mobile number.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await authService.login({ userId: identifier, viaPassword: true, password });
      if (!result.success || !result.data?.token) {
        setErrorMessage(result.message);
        return;
      }
      const profile = await saveUserSession(result.data.token, result.data.user, result.data.refreshToken);
      await AsyncStorage.setItem("accountCreatedVia", "normal");
      setRole(profile.role);
      registerPushTokenWithBackend();
      setSuccessMessage("Login successful!");
      // TEMP: location permission step disabled; restore the next line to ask for location again.
      // router.replace("/auth/location");
      router.replace("/(main)/home" as any);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleLogin = () => {
    // POST /auth/login/social accepts an appleId, but the app has no Apple
    // Sign-In module installed yet, so there is no appleId to send.
    setErrorMessage("Sign in with Apple is not available yet. Please use email or OTP.");
  };

  return (
    <KeyboardAvoidingScreen style={styles.container} statusBarColor="#3C2610">
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Image source={require("../../assets/images/logo.webp")} style={styles.logo} resizeMode="contain" />
          <Text style={styles.tagline}>Show your talent. Find your fame.</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>Welcome back!</Text>
          <Text style={styles.subtitle}>Sign in to continue your journey</Text>

          <OutlinedField dark label="Email / Mobile" required icon="person-outline" focused={focus === "id"}>
            <TextInput
              style={darkFieldInputStyle}
              placeholder="you@example.com or 98765 43210"
              testID="signin-identifier"
              placeholderTextColor={DARK_FIELD_COLORS.placeholder}
              value={emailOrMobile}
              onChangeText={setEmailOrMobile}
              onFocus={() => setFocus("id")}
              onBlur={() => setFocus(null)}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
            />
          </OutlinedField>

          <OutlinedField dark label="Password" required icon="lock-closed-outline" focused={focus === "pw"}>
            <TextInput
              style={darkFieldInputStyle}
              placeholder="Your password"
              testID="signin-password"
              placeholderTextColor={DARK_FIELD_COLORS.placeholder}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocus("pw")}
              onBlur={() => setFocus(null)}
              secureTextEntry={!showPassword}
              returnKeyType="go"
              onSubmitEditing={handleSignIn}
            />
            {password.length > 0 && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                style={styles.eyeIcon}
                hitSlop={10}
                onPress={() => setShowPassword(!showPassword)}
                testID="signin-toggle-password"
              >
                {showPassword ? <EyeOffIcon size={20} color={C.icon} /> : <EyeIcon size={20} color={C.icon} />}
              </TouchableOpacity>
            )}
          </OutlinedField>

          <TouchableOpacity
            style={styles.forgotContainer}
            onPress={() => router.push("/auth/forgotpassword")}
            testID="signin-forgot-password"
            activeOpacity={0.7}
            hitSlop={8}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color="#F87171" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={18} color="#34D399" />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.signInButton, isLoading && styles.signInButtonDisabled]}
            onPress={handleSignIn}
            testID="signin-submit"
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.signInText}>Sign In</Text>}
          </TouchableOpacity>

          <View style={styles.continueWithContainer}>
            <View style={styles.separatorLine} />
            <Text style={styles.continueWithText}>or</Text>
            <View style={styles.separatorLine} />
          </View>

          <TouchableOpacity
            style={styles.otpLoginButton}
            onPress={() => router.push("/auth/login-via-otp")}
            testID="signin-otp-login"
            activeOpacity={0.8}
          >
            <Ionicons name="phone-portrait-outline" size={20} color={C.orange} />
            <Text style={styles.otpLoginText}>Login with OTP</Text>
          </TouchableOpacity>

          {SOCIAL_LOGIN_ENABLED && Platform.OS === "ios" && (
            <View style={styles.socialIconsContainer}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Continue with Apple"
                style={[styles.socialIconButton, isSocialLoading && styles.socialIconButtonDisabled]}
                activeOpacity={0.7}
                onPress={handleAppleLogin}
                disabled={isSocialLoading}
              >
                {isSocialLoading ? <ActivityIndicator color="#666" size="small" /> : <AppleIcon size={40} />}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.createAccountContainer}>
            <Text style={styles.createAccountText}>Don&apos;t have an account? </Text>
            <TouchableOpacity
              onPress={() => router.push("/auth/createaccount")}
              testID="signin-create-account"
              activeOpacity={0.7}
              hitSlop={8}
            >
              <Text style={styles.createAccountLink}>Create One</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingScreen>
  );
}

const C = {
  brown: "#3C2610",
  orange: "#EC9A15",
  card: "#1A1A1A",
  box: "#252525",
  line: "#3A3A3A",
  text: "#FFFFFF",
  body: "#CAD7D8",
  muted: "#8A8F90",
  icon: "#EC9A15",
};

// Same dark card look as Create Account (app/auth/createaccount.tsx).
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.brown },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 16, paddingTop: height * 0.025, paddingBottom: 12 },
  logoContainer: { alignItems: "center", marginBottom: 16 },
  logo: { width: width * 0.33, height: height * 0.065 },
  tagline: { marginTop: 8, color: "#F3D9B1", fontSize: 13, fontFamily: "Inter_500Medium", letterSpacing: 0.3 },
  formContainer: {
    width: "100%",
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.35)",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
  },
  title: { fontSize: 24, color: C.text, fontFamily: "PlayfairDisplay_800ExtraBold", textAlign: "center" },
  subtitle: { fontSize: 13, color: C.body, fontFamily: "Inter_400Regular", marginTop: 4, marginBottom: 14, textAlign: "center" },
  eyeIcon: { paddingLeft: 10, paddingVertical: 4 },
  forgotContainer: { alignSelf: "flex-end", marginTop: 0, marginBottom: 14 },
  forgotText: { fontSize: 13, color: C.orange, fontFamily: "Inter_600SemiBold" },
  signInButton: {
    backgroundColor: C.orange,
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  signInText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  signInButtonDisabled: { opacity: 0.6 },
  continueWithContainer: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
  separatorLine: { flex: 1, height: 1, backgroundColor: C.line },
  continueWithText: { marginHorizontal: 12, fontSize: 13, color: C.muted, fontFamily: "Inter_500Medium" },
  otpLoginButton: {
    flexDirection: "row",
    gap: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.box,
    justifyContent: "center",
    alignItems: "center",
  },
  otpLoginText: { color: C.text, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  createAccountContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: 14 },
  createAccountText: { fontSize: 13, color: C.body, fontFamily: "Inter_400Regular" },
  createAccountLink: { color: C.orange, fontSize: 13, fontFamily: "Inter_700Bold" },
  skipContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingTop: 4, paddingBottom: 12 },
  skipText: { fontSize: 13, color: C.muted, fontFamily: "Inter_400Regular" },
  skipLink: { color: C.orange, fontSize: 13, fontFamily: "Inter_700Bold" },
  socialIconsContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 20, marginTop: 16 },
  socialIconButton: { justifyContent: "center", alignItems: "center" },
  socialIconButtonDisabled: { opacity: 0.6 },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(248, 113, 113, 0.12)",
    borderColor: "rgba(248, 113, 113, 0.45)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { flex: 1, color: "#F87171", fontSize: 13, fontFamily: "Inter_500Medium" },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(52, 211, 153, 0.12)",
    borderColor: "rgba(52, 211, 153, 0.45)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  successText: { flex: 1, color: "#34D399", fontSize: 13, fontFamily: "Inter_500Medium" },
});
