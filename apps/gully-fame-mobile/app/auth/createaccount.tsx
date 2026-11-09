import { useState, useEffect, useCallback } from "react";
import KeyboardAvoidingScreen from "@/components/KeyboardAvoidingScreen";
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { showGuestModeUnavailable } from "@utils/guestMode";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  GoogleIcon,
  InstagramIcon,
  AppleIcon,
  EyeIcon,
  EyeOffIcon,
} from "@/icons";
import { authService, AUTH_RULES } from "@api/services/authService";
import { getErrorMessage } from "@api/client";
import { getNativePushToken, getDeviceType, registerPushTokenWithBackend } from "@utils/pushToken";
import { saveUserSession } from "@utils/userSession";

let GoogleSignin: any = null;
try {
  const googleSignIn = require("@react-native-google-signin/google-signin");
  GoogleSignin = googleSignIn.GoogleSignin;
} catch { /* intentionally ignored */
}

const { width, height } = Dimensions.get("window");

export default function CreateAccount() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"participant" | "fan" | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  
  

  
  
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined;

  useEffect(() => {
    GoogleSignin?.configure({ webClientId });
  }, [webClientId]);
  
  

  
  // The terms screen is a separate route that writes "termsAccepted" and returns here, so
  // re-reading on focus is enough (no polling).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      AsyncStorage.getItem("termsAccepted")
        .then((accepted) => {
          if (active) setTermsAccepted(accepted === "true");
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }, [])
  );

  // Mirrors the backend: any password of 6+ characters is accepted.
  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < AUTH_RULES.passwordMinLength) {
      errors.push(`Minimum ${AUTH_RULES.passwordMinLength} characters`);
    }
    if (pwd.length > AUTH_RULES.stringMaxLength) {
      errors.push(`Maximum ${AUTH_RULES.stringMaxLength} characters`);
    }
    return errors;
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (text.length > 0) {
      const errors = validatePassword(text);
      setPasswordErrors(errors);
    } else {
      setPasswordErrors([]);
    }

    if (confirmPassword && text !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
    } else {
      setConfirmPasswordError("");
    }
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (text.length > 0 && text !== password) {
      setConfirmPasswordError("Passwords do not match");
    } else {
      setConfirmPasswordError("");
    }
  };

  const handleCreateAccount = async () => {
    if (isLoading) return;
    setErrorMessage("");
    setPasswordErrors([]);
    setConfirmPasswordError("");
    const first = firstName.trim();
    const last = lastName.trim();
    const mobile = mobileNo.trim();
    const mail = email.trim().toLowerCase();
    if (!first || !last || !mobile || !mail || !password || !confirmPassword) {
      setErrorMessage("Please fill all required fields.");
      return;
    }
    if (first.length > AUTH_RULES.stringMaxLength || last.length > AUTH_RULES.stringMaxLength) {
      setErrorMessage("Names must be 255 characters or fewer.");
      return;
    }
    if (!AUTH_RULES.mobile.test(mobile)) {
      setErrorMessage("Enter a valid 10-digit mobile number.");
      return;
    }
    if (!AUTH_RULES.email.test(mail) || mail.length > AUTH_RULES.emailMaxLength) {
      setErrorMessage("Enter a valid email address (max 50 characters).");
      return;
    }
    const passwordValidationErrors = validatePassword(password);
    if (passwordValidationErrors.length > 0) {
      setPasswordErrors(passwordValidationErrors);
      setErrorMessage("Password does not meet requirements.");
      return;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      setErrorMessage("Password and Confirm Password do not match.");
      return;
    }
    if (!role) {
      setErrorMessage("Please select your role (Participant or Fan)");
      return;
    }
    if (!termsAccepted) {
      setErrorMessage("Please accept the Terms & Conditions to continue.");
      return;
    }

    setIsLoading(true);
    try {
      const backendRole = role === "participant" ? "participants" : "fan";
      const result = await authService.registerUser({
        firstName: first,
        lastName: last,
        mobile,
        email: mail,
        password,
        role: backendRole,
      });
      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }
      // Register returns no token, so sign in with the new credentials.
      const login = await authService.login({ userId: mail, password, viaPassword: true });
      if (!login.success || !login.data?.token) {
        setSuccessMessage("Account created! Please sign in.");
        router.replace(`/auth/signin?email=${encodeURIComponent(mail)}` as any);
        return;
      }
      await saveUserSession(login.data.token, login.data.user);
      await AsyncStorage.setItem("accountCreatedVia", "normal");
      registerPushTokenWithBackend();
      setSuccessMessage("Account created successfully!");
      const query = [
        `role=${encodeURIComponent(role)}`,
        `firstName=${encodeURIComponent(first)}`,
        `lastName=${encodeURIComponent(last)}`,
        `email=${encodeURIComponent(mail)}`,
      ].join("&");
      router.replace(`/onboarding/verify-id?${query}` as any);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async (iconType: "google" | "instagram" = "google") => {
    if (iconType !== "google") {
      setErrorMessage("Instagram sign-in is not available yet.");
      return;
    }
    if (isSocialLoading) return;
    if (!GoogleSignin) {
      setErrorMessage("Google sign-in is not available on this build.");
      return;
    }
    setErrorMessage("");
    setSuccessMessage("");
    setIsGoogleLoading(true);
    setIsSocialLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (response.type !== "success") {
        setErrorMessage(response.type === "cancelled" ? "Sign-in was cancelled" : "Sign-in was not successful");
        return;
      }
      const googleUser = response.data.user;
      const result = await authService.socialLogin({
        googleId: googleUser.id,
        email: googleUser.email,
        firstName: googleUser.givenName || "",
        lastName: googleUser.familyName || "",
        device_token: await getNativePushToken(),
        device_type: getDeviceType(),
      });
      if (!result.success || !result.data?.token) {
        setErrorMessage(result.message);
        return;
      }
      await saveUserSession(result.data.token, result.data.user);
      await AsyncStorage.setItem("accountCreatedVia", "google");
      setSuccessMessage("Google authentication successful!");
      router.replace("/auth/location");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Google sign-in failed. Please try again."));
    } finally {
      setIsGoogleLoading(false);
      setIsSocialLoading(false);
    }
  };

  const handleAppleLogin = () => {
    // POST /auth/login/social accepts an appleId, but no Apple Sign-In module
    // is installed, so there is no real appleId to send.
    setErrorMessage("Sign in with Apple is not available yet. Please use email or Google.");
  };

  return (
    <KeyboardAvoidingScreen style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Image source={require("@assets/images/gfi.png")} style={styles.logo} />

        <View style={styles.card}>
          <Text
            style={[
              styles.title,
              { fontFamily: "PlayfairDisplay_800ExtraBold" },
            ]}
          >
            Sign up and find your gully fame!
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              First Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your First Name"
              placeholderTextColor="#B7B7B7"
              value={firstName}
              onChangeText={setFirstName}
              testID="signup-first-name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Last Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your Last Name"
              placeholderTextColor="#B7B7B7"
              value={lastName}
              onChangeText={setLastName}
              testID="signup-last-name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Mobile No. <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your Mobile No."
              placeholderTextColor="#B7B7B7"
              keyboardType="phone-pad"
              value={mobileNo}
              onChangeText={setMobileNo}
              testID="signup-mobile"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              E-mail ID <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your E-mail ID"
              placeholderTextColor="#B7B7B7"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              testID="signup-email"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Password <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Enter your Password"
                placeholderTextColor="#B7B7B7"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={handlePasswordChange}
                testID="signup-password"
              />
              {password.length > 0 && (
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  testID="signup-toggle-password"
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeOffIcon color="#666" size={20} />
                  ) : (
                    <EyeIcon color="#666" size={20} />
                  )}
                </TouchableOpacity>
              )}
            </View>

            {password.length > 0 && (
              <View style={styles.passwordRequirementsContainer}>
                <Text style={styles.passwordRequirementsTitle}>
                  Password Requirements:
                </Text>
                <View style={styles.requirementsList}>
                  <View style={styles.requirementItem}>
                    <Text
                      style={[
                        styles.requirementText,
                        password.length >= AUTH_RULES.passwordMinLength && styles.requirementMet,
                      ]}
                    >
                      {password.length >= AUTH_RULES.passwordMinLength ? "✓" : "○"} Minimum{" "}
                      {AUTH_RULES.passwordMinLength} characters
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {passwordErrors.length > 0 && password.length > 0 && (
              <View style={styles.passwordErrorContainer}>
                {passwordErrors.map((error, index) => (
                  <Text key={index} style={styles.passwordErrorText}>
                    • {error}
                  </Text>
                ))}
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Confirm Password <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  confirmPasswordError && styles.inputError,
                ]}
                placeholder="Confirm your Password"
                placeholderTextColor="#B7B7B7"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={handleConfirmPasswordChange}
                testID="signup-confirm-password"
              />
              {confirmPassword.length > 0 && (
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  testID="signup-toggle-confirm-password"
                  activeOpacity={0.7}
                >
                  {showConfirmPassword ? (
                    <EyeOffIcon color="#666" size={20} />
                  ) : (
                    <EyeIcon color="#666" size={20} />
                  )}
                </TouchableOpacity>
              )}
            </View>
            {confirmPasswordError ? (
              <Text style={styles.confirmPasswordErrorText}>
                {confirmPasswordError}
              </Text>
            ) : null}
          </View>

          <Text style={styles.roleTitle}>Choose your role</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[
                styles.roleButton,
                role === "participant" && styles.roleButtonActive,
              ]}
              onPress={() => setRole("participant")}
              testID="signup-role-participant"
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.roleButtonText,
                  role === "participant" && styles.roleButtonTextActive,
                ]}
              >
                Participant
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.roleButton,
                role === "fan" && styles.roleButtonActive,
              ]}
              onPress={() => setRole("fan")}
              testID="signup-role-fan"
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.roleButtonText,
                  role === "fan" && styles.roleButtonTextActive,
                ]}
              >
                Fan
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.termsRow}>
            <TouchableOpacity
              style={styles.termsLinkContainer}
              activeOpacity={0.8}
              onPress={() => router.push("./termsandconditions")}
              testID="signup-terms-link"
            >
              <Text style={styles.termsLink}>
                {termsAccepted
                  ? "✓ Terms & Conditions*"
                  : "Terms & Conditions*"}
              </Text>
            </TouchableOpacity>
          </View>

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
            style={[
              styles.primaryButton,
              isLoading && styles.primaryButtonDisabled,
            ]}
            onPress={handleCreateAccount}
            testID="signup-submit"
            activeOpacity={0.85}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Create an account</Text>
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
            <TouchableOpacity
              style={styles.socialIconButton}
              activeOpacity={0.7}
              onPress={() => handleGoogleLogin("google")}
              testID="signup-google"
              disabled={isSocialLoading}
            >
              {isGoogleLoading ? (
                <ActivityIndicator size="small" color="#EC9A15" />
              ) : (
                <GoogleIcon size={40} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialIconButton}
              activeOpacity={0.7}
              onPress={() => handleGoogleLogin("instagram")}
              disabled={isSocialLoading}
            >
              <InstagramIcon size={40} />
            </TouchableOpacity>
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

          <TouchableOpacity
            onPress={() => router.push("./signin")}
            testID="signup-sign-in-link"
            activeOpacity={0.7}
          >
            <Text style={styles.footerText}>
              Already have account? <Text style={styles.footerLink}>Login</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={showGuestModeUnavailable}
            testID="signup-skip"
            activeOpacity={0.7}
            style={styles.skipButton}
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
  content: {
    paddingHorizontal: width * 0.01,
    paddingTop: height * 0.08,
    paddingBottom: 0,
    alignItems: "center",
  },
  logo: {
    width: width * 0.33,
    height: height * 0.08,
    resizeMode: "contain",
    marginBottom: 24,
  },
  card: {
    width: "100%",
    backgroundColor: "#F6F9FD",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingBottom: 0,
    paddingTop: 20,
    paddingHorizontal: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
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
    marginBottom: 10,
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
  input: {
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#D4DAE9",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontSize: 15,
    color: "#111827",
    fontFamily: "Inter_400Regular",
  },
  inputError: {
    borderColor: "#DC2626",
  },
  passwordInputContainer: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    paddingRight: 40,
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
    padding: 4,
  },
  passwordRequirementsContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  passwordRequirementsTitle: {
    fontSize: 13,
    color: "#374151",
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
  },
  requirementsList: {
    gap: 6,
  },
  requirementItem: {
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "Inter_400Regular",
  },
  requirementMet: {
    color: "#10B981",
    fontFamily: "Inter_600SemiBold",
  },
  passwordErrorContainer: {
    marginTop: 8,
    padding: 10,
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DC2626",
  },
  passwordErrorText: {
    fontSize: 12,
    color: "#DC2626",
    fontFamily: "Inter_500Medium",
    marginBottom: 4,
  },
  confirmPasswordErrorText: {
    fontSize: 12,
    color: "#DC2626",
    fontFamily: "Inter_500Medium",
    marginTop: 6,
  },
  roleTitle: {
    fontSize: 15,
    color: "#111827",
    marginBottom: 10,
    fontFamily: "Inter_700Bold",
  },
  roleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  roleButton: {
    flex: 1,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#D4DAE9",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    alignItems: "center",
  },
  roleButtonActive: {
    backgroundColor: "#3C2610",
    borderColor: "#3C2610",
  },
  roleButtonText: {
    fontSize: 15,
    color: "#1F2937",
    fontFamily: "Inter_600SemiBold",
  },
  roleButtonTextActive: {
    color: "#FFFFFF",
  },
  termsRow: {
    marginBottom: 15,
    marginTop: 3,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  termsLinkContainer: {
    alignItems: "center",
  },
  termsLink: {
    color: "#3C2610",
    textDecorationLine: "underline",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  primaryButton: {
    backgroundColor: "#3C2610",
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
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
  footerText: {
    textAlign: "center",
    marginTop: 10,
    fontSize: 14,
    color: "#000",
    fontFamily: "Inter_400Regular",
  },
  footerLink: {
    color: "#EC9A15",
    fontWeight: 900,
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
  socialIconButtonDisabled: {
    opacity: 0.6,
  },
  skipButton: {
    marginTop: 15,
    marginHorizontal: -30,
    backgroundColor: "#FFFFFF",
    paddingVertical: 20,
  },
  skipText: {
    fontSize: 15,
    color: "#000",
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
  skipLink: {
    color: "#EC9A15",
  },
});
