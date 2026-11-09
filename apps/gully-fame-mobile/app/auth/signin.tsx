import { useState, useEffect } from "react";
import KeyboardAvoidingScreen from "@/components/KeyboardAvoidingScreen";
import { StyleSheet, Text, TouchableOpacity, View, Image, ScrollView, Dimensions, Platform, TextInput } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { showGuestModeUnavailable } from "@utils/guestMode";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppleIcon, EyeIcon, EyeOffIcon } from "@/icons";
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
      const profile = await saveUserSession(result.data.token, result.data.user);
      await AsyncStorage.setItem("accountCreatedVia", "normal");
      setRole(profile.role);
      registerPushTokenWithBackend();
      setSuccessMessage("Login successful!");
      router.replace("/auth/location");
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
    <KeyboardAvoidingScreen style={styles.container}>
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
            Welcome back!{"\n"}Sign in to continue
          </Text>

          {}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Email/Mobile <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email or mobile number"
              testID="signin-identifier"
              placeholderTextColor="#B0B0B0"
              value={emailOrMobile}
              onChangeText={setEmailOrMobile}
              autoCapitalize="none"
            />
          </View>

          {}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Password <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                testID="signin-password"
                placeholderTextColor="#B0B0B0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              {password.length > 0 && (
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  testID="signin-toggle-password"
                >
                  {showPassword ? (
                    <EyeOffIcon size={20} color="#9CA3AF" />
                  ) : (
                    <EyeIcon size={20} color="#9CA3AF" />
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.forgotContainer}>
            <TouchableOpacity
              onPress={() => router.push("/auth/forgotpassword")}
              testID="signin-forgot-password"
              activeOpacity={0.7}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {}
          <View style={styles.orContainer}>
            <Text style={styles.orText}>Or</Text>
          </View>

          {}
          <TouchableOpacity
            style={styles.otpLoginButton}
            onPress={() => router.push("/auth/login-via-otp")}
            testID="signin-otp-login"
            activeOpacity={0.7}
          >
            <Text style={styles.otpLoginText}>
              Login via <Text style={styles.otpUnderlinedText}>OTP</Text>
            </Text>
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
            style={[
              styles.signInButton,
              isLoading && styles.signInButtonDisabled,
            ]}
            onPress={handleSignIn}
            testID="signin-submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.signInText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {}
          <View style={styles.continueWithContainer}>
            <View style={styles.separatorLine} />
            <Text style={styles.continueWithText}>OR Continue With</Text>
            <View style={styles.separatorLine} />
          </View>

          {}
          <View style={styles.socialIconsContainer}>
            {

}
            {Platform.OS === "ios" && (
              <TouchableOpacity
                style={[
                  styles.socialIconButton,
                  isSocialLoading && styles.socialIconButtonDisabled,
                ]}
                activeOpacity={0.7}
                onPress={handleAppleLogin}
                disabled={isSocialLoading}
              >
                {isSocialLoading ? (
                  <ActivityIndicator color="#666" size="small" />
                ) : (
                  <AppleIcon size={40} />
                )}
              </TouchableOpacity>
            )}
          </View>

          {}
          <View style={styles.createAccountContainer}>
            <Text style={styles.createAccountText}>
              Don&apos;t have an account?{" "}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/auth/createaccount")}
              testID="signin-create-account"
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
            testID="signin-skip"
          >
            <Text style={styles.skipText}>
              Let me have a look!{" "}
              <Text style={styles.skipLink}>SKIP{">>"}</Text>
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
    paddingTop: 40,
    paddingBottom: 30,
    backgroundColor: "#3C2610",
    top: 40,
  },
  logo: {
    width: width * 0.3,
    height: height * 0.075,
  },
  formContainer: {
    backgroundColor: "#F6F9FD",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: height * 0.12,
    top: height * 0.05,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 6,
  },
  title: {
    fontSize: 25,
    color: "#1F2937",
    marginBottom: 25,
    fontFamily: "PlayfairDisplay_800ExtraBold",
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    color: "#111827",
    marginBottom: 6,
    fontFamily: "Inter_600SemiBold",
  },
  required: {
    color: "#DC2626",
  },
  passwordContainer: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#D4DAE9",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
    paddingRight: 45,
    fontSize: 14,
    color: "#111827",
    fontFamily: "Inter_400Regular",
    height: 50,
    flex: 1,
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
    padding: 4,
  },
  forgotContainer: {
    alignItems: "flex-end",
    marginBottom: 4,
  },
  forgotText: {
    fontSize: 13,
    color: "#EC9A15",
    fontFamily: "Inter_600SemiBold",
    textDecorationLine: "underline",
  },
  signInButton: {
    backgroundColor: "#3C2610",
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 4,
  },
  signInText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  createAccountContainer: {
    alignItems: "center",
    marginBottom: -14,
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
    backgroundColor: "#FFFFFF", 
    alignItems: "center",
    paddingVertical: 15,
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
  orContainer: {
    alignItems: "center",
    marginBottom: 0,
  },
  orText: {
    fontSize: 14,
    color: "#000",
    fontFamily: "Inter_400Regular",
  },
  otpLoginButton: {
    borderWidth: 0,
    borderRadius: 30,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 6,
    backgroundColor: "transparent",
  },
  otpLoginText: {
    color: "#000",
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  otpUnderlinedText: {
    color: "#EC9A15",
    textDecorationLine: "underline",
    fontFamily: "Inter_400Regular",
  },
  continueWithContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 15,
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
  socialIconButtonDisabled: {
    opacity: 0.6,
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
