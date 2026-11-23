import { useState, useEffect, useCallback, useRef } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import CountryCodePicker from "@/components/CountryCodePicker";
import OutlinedField, { DARK_FIELD_COLORS, darkFieldInputStyle } from "@/components/ui/OutlinedField";
import { DEFAULT_COUNTRY_ISO, findCountry, isValidNationalNumber, type Country } from "@/constants/countries";
import { router, useFocusEffect } from "expo-router";
import { SOCIAL_LOGIN_ENABLED } from "@/config/features";
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
import { cleanUsername, usernameRuleProblem, useUsernameCheck, USERNAME_MAX } from "@/hooks/useUsernameCheck";

let GoogleSignin: any = null;
try {
  const googleSignIn = require("@react-native-google-signin/google-signin");
  GoogleSignin = googleSignIn.GoogleSignin;
} catch { /* intentionally ignored */
}

const { width, height } = Dimensions.get("window");

export default function CreateAccount() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const usernameCheck = useUsernameCheck(username);
  const [focus, setFocus] = useState<string | null>(null);
  const [country, setCountry] = useState<Country>(findCountry(DEFAULT_COUNTRY_ISO));
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
  // Values the server already told us are registered, so a field stays red (and is
  // reported together with the other one) even when the server names only one per reply.
  const takenEmails = useRef(new Set<string>());
  const takenMobiles = useRef(new Set<string>());
  const [emailTaken, setEmailTaken] = useState(false);
  const [mobileTaken, setMobileTaken] = useState(false);
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
    // One "Full Name" field: the first word is the first name, the rest is the last name.
    const name = fullName.trim().replace(/\s+/g, " ");
    const [first = "", ...restOfName] = name.split(" ");
    const last = restOfName.join(" ");
    const mobile = mobileNo.replace(/\D/g, "");
    const mobileKey = `${country.dial}${mobile}`;
    const mail = email.trim().toLowerCase();
    if (!name || !mobile || !mail || !password || !confirmPassword) {
      setErrorMessage("Please fill all required fields.");
      return;
    }
    if (name.length < 2 || !/[a-zA-Z\u0900-\u097F]/.test(name)) {
      setErrorMessage("Enter your full name.");
      return;
    }
    if (name.length > AUTH_RULES.stringMaxLength) {
      setErrorMessage("Name must be 255 characters or fewer.");
      return;
    }
    const handle = cleanUsername(username);
    const handleProblem = usernameRuleProblem(handle);
    if (handleProblem) {
      setErrorMessage(handleProblem === "Choose a username" ? "Choose a username." : `Username: ${handleProblem.toLowerCase()}.`);
      return;
    }
    if (usernameCheck.status === "taken" || usernameCheck.status === "invalid") {
      setErrorMessage(usernameCheck.message);
      return;
    }
    if (!isValidNationalNumber(country, mobile)) {
      setErrorMessage(
        country.minDigits === country.maxDigits
          ? `Enter a valid ${country.minDigits}-digit mobile number for ${country.name}.`
          : `Enter a valid mobile number for ${country.name}.`
      );
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
        countryCode: country.dial,
        mobile,
        email: mail,
        password,
        role: backendRole,
        username: handle,
      });
      if (!result.success) {
        const msg = result.message || "";
        const isDuplicate = /already|taken|exist|registered|in use|used/i.test(msg);
        if (isDuplicate && /e-?mail/i.test(msg)) takenEmails.current.add(mail);
        if (isDuplicate && /mobile|phone|number/i.test(msg)) takenMobiles.current.add(mobileKey);
        const eTaken = takenEmails.current.has(mail);
        const mTaken = takenMobiles.current.has(mobileKey);
        setEmailTaken(eTaken);
        setMobileTaken(mTaken);
        setErrorMessage(
          eTaken && mTaken
            ? "This email and mobile number are already registered. Try signing in."
            : eTaken
              ? "This email is already registered. Try signing in."
              : mTaken
                ? "This mobile number is already registered. Try signing in."
                : msg
        );
        return;
      }
      // The account is only created after the mobile and email codes are verified.
      const pending = result.data;
      if (!pending?.signupId) {
        setErrorMessage("Could not start verification. Please try again.");
        return;
      }
      const query = [
        `signupId=${encodeURIComponent(pending.signupId)}`,
        `maskedMobile=${encodeURIComponent(pending.mobile)}`,
        `maskedEmail=${encodeURIComponent(pending.email)}`,
        `mobileResendIn=${pending.mobileResendIn ?? ""}`,
        `emailResendIn=${pending.emailResendIn ?? ""}`,
        `role=${encodeURIComponent(role)}`,
        `firstName=${encodeURIComponent(first)}`,
        `lastName=${encodeURIComponent(last)}`,
        `email=${encodeURIComponent(mail)}`,
      ].join("&");
      router.push(`/auth/verify-signup?${query}` as any);
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
      const idToken: string | null = response.data.idToken ?? null;
      if (!idToken) {
        setErrorMessage("Google sign-in did not return an ID token. Please use email sign-up.");
        return;
      }
      const result = await authService.socialLogin({
        idToken,
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
      await saveUserSession(result.data.token, result.data.user, result.data.refreshToken);
      await AsyncStorage.setItem("accountCreatedVia", "google");
      setSuccessMessage("Google authentication successful!");
      // TEMP: location permission step disabled; restore the next line to ask for location again.
      // router.replace("/auth/location");
      router.replace("/(main)/home" as any);
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
    <KeyboardAvoidingScreen style={styles.container} statusBarColor="#3C2610">
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Image source={require("../../assets/images/logo.webp")} style={styles.logo} />

        <View style={styles.card}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}
            style={[
              styles.title,
              { fontFamily: "PlayfairDisplay_800ExtraBold" },
            ]}
          >
            Sign up and find your gully fame!
          </Text>

          <OutlinedField dark label="Full Name" required icon="person-outline" focused={focus === "name"}>
            <TextInput
              style={darkFieldInputStyle}
              placeholder="e.g. John Smith"
              placeholderTextColor={DARK_FIELD_COLORS.placeholder}
              value={fullName}
              onChangeText={setFullName}
              onFocus={() => setFocus("name")}
              onBlur={() => setFocus(null)}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              testID="signup-full-name"
            />
          </OutlinedField>

          <OutlinedField
            dark
            label="Username"
            required
            icon="at-outline"
            focused={focus === "username"}
            error={usernameCheck.status === "taken" || usernameCheck.status === "invalid" ? usernameCheck.message : false}
            helper={
              usernameCheck.status === "available"
                ? `✓ ${usernameCheck.message}`
                : usernameCheck.status === "checking"
                  ? "Checking…"
                  : focus === "username" && !username
                    ? "3–20 characters: a–z, 0–9, . and _"
                    : undefined
            }
          >
            <TextInput
              style={darkFieldInputStyle}
              placeholder="e.g. john.dances"
              placeholderTextColor={DARK_FIELD_COLORS.placeholder}
              value={username}
              onChangeText={(t) => setUsername(cleanUsername(t))}
              onFocus={() => setFocus("username")}
              onBlur={() => setFocus(null)}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username-new"
              textContentType="username"
              maxLength={USERNAME_MAX}
              returnKeyType="next"
              testID="signup-username"
            />
          </OutlinedField>

          <OutlinedField
            dark
            label="Mobile Number"
            required
            focused={focus === "mobile"}
            error={mobileTaken ? "This mobile number is already registered." : false}
          >
            <CountryCodePicker
              bare
              dark
              value={country}
              onChange={(c) => {
                setCountry(c);
                setMobileTaken(takenMobiles.current.has(`${c.dial}${mobileNo.replace(/\D/g, "")}`));
              }}
            />
            <View style={styles.fieldDivider} />
            <TextInput
              style={darkFieldInputStyle}
              placeholder={country.iso === "IN" ? "98765 43210" : "Mobile number"}
              placeholderTextColor={DARK_FIELD_COLORS.placeholder}
              keyboardType="phone-pad"
              maxLength={country.maxDigits + 2}
              value={mobileNo}
              onChangeText={(text) => {
                setMobileNo(text);
                setMobileTaken(takenMobiles.current.has(`${country.dial}${text.replace(/\D/g, "")}`));
              }}
              onFocus={() => setFocus("mobile")}
              onBlur={() => setFocus(null)}
              autoComplete="tel"
              textContentType="telephoneNumber"
              testID="signup-mobile"
            />
          </OutlinedField>

          <OutlinedField
            dark
            label="Email Address"
            required
            icon="mail-outline"
            focused={focus === "email"}
            error={emailTaken ? "This email is already registered." : false}
          >
            <TextInput
              style={darkFieldInputStyle}
              placeholder="you@example.com"
              placeholderTextColor={DARK_FIELD_COLORS.placeholder}
              autoComplete="email"
              textContentType="emailAddress"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setEmailTaken(takenEmails.current.has(text.trim().toLowerCase()));
              }}
              onFocus={() => setFocus("email")}
              onBlur={() => setFocus(null)}
              testID="signup-email"
            />
          </OutlinedField>

          <OutlinedField
            dark
            label="Password"
            required
            icon="lock-closed-outline"
            focused={focus === "password"}
            error={passwordErrors.length > 0 && password.length > 0 ? passwordErrors[0] : false}
            helper={
              password.length > 0
                ? password.length >= AUTH_RULES.passwordMinLength
                  ? `✓ At least ${AUTH_RULES.passwordMinLength} characters`
                  : `${password.length}/${AUTH_RULES.passwordMinLength} characters`
                : undefined
            }
          >
            <TextInput
              style={darkFieldInputStyle}
              placeholder={`At least ${AUTH_RULES.passwordMinLength} characters`}
              placeholderTextColor={DARK_FIELD_COLORS.placeholder}
              autoComplete="new-password"
              textContentType="newPassword"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={handlePasswordChange}
              onFocus={() => setFocus("password")}
              onBlur={() => setFocus(null)}
              testID="signup-password"
            />
            {password.length > 0 && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                style={styles.eyeIcon}
                hitSlop={10}
                onPress={() => setShowPassword(!showPassword)}
                testID="signup-toggle-password"
                activeOpacity={0.7}
              >
                {showPassword ? <EyeOffIcon color={DARK_FIELD_COLORS.icon} size={20} /> : <EyeIcon color={DARK_FIELD_COLORS.icon} size={20} />}
              </TouchableOpacity>
            )}
          </OutlinedField>

          <OutlinedField
            dark
            label="Confirm Password"
            required
            icon="shield-checkmark-outline"
            focused={focus === "confirm"}
            error={confirmPasswordError || false}
          >
            <TextInput
              style={darkFieldInputStyle}
              placeholder="Re-enter your password"
              placeholderTextColor={DARK_FIELD_COLORS.placeholder}
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={handleConfirmPasswordChange}
              onFocus={() => setFocus("confirm")}
              onBlur={() => setFocus(null)}
              testID="signup-confirm-password"
            />
            {confirmPassword.length > 0 && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={showConfirmPassword ? "Hide password" : "Show password"}
                style={styles.eyeIcon}
                hitSlop={10}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                testID="signup-toggle-confirm-password"
                activeOpacity={0.7}
              >
                {showConfirmPassword ? <EyeOffIcon color={DARK_FIELD_COLORS.icon} size={20} /> : <EyeIcon color={DARK_FIELD_COLORS.icon} size={20} />}
              </TouchableOpacity>
            )}
          </OutlinedField>

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

          <TouchableOpacity
            style={styles.termsRow}
            activeOpacity={0.8}
            onPress={() => router.push("./termsandconditions")}
            testID="signup-terms-link"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: termsAccepted }}
          >
            <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
              {termsAccepted ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
            </View>
            <Text style={styles.termsText}>
              I agree to the <Text style={styles.termsLink}>Terms & Conditions</Text>
              <Text style={styles.required}> *</Text>
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
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Continue with Instagram"
                  style={styles.socialIconButton}
                  activeOpacity={0.7}
                  onPress={() => handleGoogleLogin("instagram")}
                  disabled={isSocialLoading}
                >
                  <InstagramIcon size={40} />
                </TouchableOpacity>
                {Platform.OS === "ios" && (
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel="Continue with Apple"
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
            </>
          )}

          <TouchableOpacity
            onPress={() => router.push("./signin")}
            testID="signup-sign-in-link"
            activeOpacity={0.7}
            style={{ paddingVertical: 14 }}
          >
            <Text style={styles.footerText}>
              Already have an account? <Text style={styles.footerLink}>Login</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={showGuestModeUnavailable}
            testID="signup-skip"
            activeOpacity={0.7}
            style={styles.skipButton}
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
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingTop: height * 0.025,
    paddingBottom: 12,
    alignItems: "center",
  },
  logo: {
    width: width * 0.33,
    height: height * 0.065,
    resizeMode: "contain",
    marginBottom: 16,
  },
  // Same dark card as the in-app (hamburger menu) pages.
  card: {
    width: "100%",
    paddingTop: 20,
    paddingBottom: 6,
    paddingHorizontal: 16,
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.35)",
  },
  title: {
    fontSize: 21,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 10,
    fontFamily: "PlayfairDisplay_800ExtraBold",
  },
  inputGroup: {
    marginBottom: 10,
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
    paddingVertical: 9,
    color: "#111827",
    fontFamily: "Inter_400Regular",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E7D9C4",
    backgroundColor: "#FFFFFF",
    minHeight: 54,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  phoneRow: {
    flexDirection: "row",
    gap: 8,
  },
  phoneInput: {
    flex: 1,
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
    paddingLeft: 10,
    paddingVertical: 4,
  },
  fieldDivider: {
    width: 1,
    height: 22,
    backgroundColor: "#3A3A3A",
    marginHorizontal: 10,
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
    fontSize: 13,
    color: "#CAD7D8",
    marginTop: 4,
    marginBottom: 8,
    fontFamily: "Inter_700Bold",
  },
  roleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 6,
  },
  roleButton: {
    flex: 1,
    backgroundColor: "#252525",
    paddingVertical: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3A3A3A",
    height: 42,
  },
  roleButtonActive: {
    backgroundColor: "rgba(236, 154, 21, 0.15)",
    borderColor: "#EC9A15",
  },
  roleButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },
  roleButtonTextActive: {
    color: "#EC9A15",
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 2,
    marginBottom: 12,
    paddingVertical: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#7C8283",
    backgroundColor: "#252525",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#EC9A15",
    borderColor: "#EC9A15",
  },
  termsText: {
    flexShrink: 1,
    textAlign: "center",
    color: "#CAD7D8",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  termsLink: {
    color: "#EC9A15",
    fontFamily: "Inter_600SemiBold",
  },
  primaryButton: {
    paddingVertical: 0,
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
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
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
  footerText: {
    textAlign: "center",
    marginTop: 0,
    fontSize: 13,
    color: "#CAD7D8",
    fontFamily: "Inter_400Regular",
  },
  footerLink: {
    color: "#EC9A15",
    fontFamily: "Inter_700Bold",
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
    marginTop: 0,
    marginHorizontal: -22,
    paddingTop: 4,
    paddingBottom: 12,
    backgroundColor: "transparent",
  },
  skipText: {
    fontSize: 13,
    color: "#8A8F90",
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
  skipLink: {
    color: "#EC9A15",
    fontFamily: "Inter_700Bold",
  },
});
