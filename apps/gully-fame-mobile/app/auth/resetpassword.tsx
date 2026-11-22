import { useState } from "react";
import KeyboardAvoidingScreen from "@/components/KeyboardAvoidingScreen";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import OutlinedField, { DARK_FIELD_COLORS, darkFieldInputStyle } from "@/components/ui/OutlinedField";
import { safeBack } from "@/utils/safeBack";
import Svg, { Path } from "react-native-svg";
import { authService, AUTH_RULES } from "@api/services/authService";
import { EyeIcon, EyeOffIcon } from "@/icons";

const { width, height } = Dimensions.get("window");

export default function ResetPassword() {
  const [focus, setFocus] = useState<string | null>(null);
  const params = useLocalSearchParams();
  const resetToken = params.resetToken ? String(params.resetToken) : "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  // Mirrors the backend rule (forgot-password/reset rejects < 6 characters).
  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < AUTH_RULES.passwordMinLength) {
      errors.push(`At least ${AUTH_RULES.passwordMinLength} characters`);
    }
    if (pwd.length > AUTH_RULES.stringMaxLength) {
      errors.push(`At most ${AUTH_RULES.stringMaxLength} characters`);
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
    if (password && text !== password) {
      setConfirmPasswordError("Passwords do not match");
    } else {
      setConfirmPasswordError("");
    }
  };

  const handleReset = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    setPasswordErrors([]);
    setConfirmPasswordError("");

    if (!password || !confirmPassword) {
      setErrorMessage("Please enter and confirm your new password.");
      return;
    }

    const passwordValidationErrors = validatePassword(password);
    if (passwordValidationErrors.length > 0) {
      setPasswordErrors(passwordValidationErrors);
      setErrorMessage(
        "Password does not meet requirements. Please check the requirements below.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      setErrorMessage("Password and Confirm Password do not match.");
      return;
    }

    if (!resetToken) {
      setErrorMessage("This reset session has expired. Please request a new code.");
      return;
    }
    if (isLoading) return;
    setIsLoading(true);
    try {
      // Step 3: set the new password with the one-time resetToken.
      const result = await authService.resetPasswordWithToken(resetToken, password);
      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }
      setSuccessMessage(result.message);
      router.replace("/auth/signin?passwordUpdated=true" as any);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingScreen style={styles.container} statusBarColor="#3C2610">
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Back Arrow and Logo */}
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10}
            onPress={() => safeBack()}
            style={styles.headerSide}
          >
            <Svg width={20} height={20} viewBox="0 0 16 16" fill="none">
              <Path
                d="M16 7H3.83L9.42 1.41L8 0L0 8L8 16L9.41 14.59L3.83 9H16V7Z"
                fill="#EC9A15"
              />
            </Svg>
          </TouchableOpacity>
          <Image
            source={require("@assets/images/gfi.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.headerSide} />
        </View>

        <View style={styles.card}>
        <Text style={styles.title}>
          Reset Password
        </Text>

        <OutlinedField dark label="New Password" required icon="lock-closed-outline" focused={focus === "pw"}>
          <TextInput
            style={darkFieldInputStyle}
            placeholder="At least 6 characters"
            placeholderTextColor={DARK_FIELD_COLORS.placeholder}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={handlePasswordChange}
            onFocus={() => setFocus("pw")}
            onBlur={() => setFocus(null)}
          />
            {password.length > 0 && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                style={{ paddingLeft: 10, paddingVertical: 4 }}
                hitSlop={10}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOffIcon size={20} color={DARK_FIELD_COLORS.icon} /> : <EyeIcon size={20} color={DARK_FIELD_COLORS.icon} />}
              </TouchableOpacity>
            )}
        </OutlinedField>

        <OutlinedField dark label="Confirm Password" required icon="shield-checkmark-outline" focused={focus === "cpw"}>
          <TextInput
            style={darkFieldInputStyle}
            placeholder="Re-enter your new password"
            placeholderTextColor={DARK_FIELD_COLORS.placeholder}
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={handleConfirmPasswordChange}
            onFocus={() => setFocus("cpw")}
            onBlur={() => setFocus(null)}
          />
            {confirmPassword.length > 0 && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={showConfirmPassword ? "Hide password" : "Show password"}
                style={{ paddingLeft: 10, paddingVertical: 4 }}
                hitSlop={10}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOffIcon size={20} color={DARK_FIELD_COLORS.icon} /> : <EyeIcon size={20} color={DARK_FIELD_COLORS.icon} />}
              </TouchableOpacity>
            )}
        </OutlinedField>

        {/* Password Requirements */}
        {password.length > 0 && passwordErrors.length > 0 && (
          <View style={styles.requirementsContainer}>
            <Text style={styles.requirementsTitle}>Password Requirements:</Text>
            {passwordErrors.map((error, index) => (
              <Text key={index} style={styles.requirementError}>
                • {error}
              </Text>
            ))}
          </View>
        )}

        {/* Confirm Password Error */}
        {confirmPasswordError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{confirmPasswordError}</Text>
          </View>
        ) : null}

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

        {/* Update Password Button */}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            isLoading && styles.primaryButtonDisabled,
          ]}
          activeOpacity={0.85}
          onPress={handleReset}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Update Password</Text>
          )}
        </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingScreen>
  );
}

// Same dark card look as Create Account (app/auth/createaccount.tsx).
const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.35)",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerSide: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  logo: {
    width: width * 0.33,
    height: height * 0.065,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontFamily: "PlayfairDisplay_800ExtraBold",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    color: "#CAD7D8",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 14,
    fontFamily: "Inter_400Regular",
  },
  primaryButton: {
    marginTop: 10,
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
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  errorContainer: {
    borderWidth: 1,
    padding: 12,
    marginTop: 6,
    marginBottom: 6,
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
  successContainer: {
    backgroundColor: "rgba(52, 211, 153, 0.12)",
    borderColor: "rgba(52, 211, 153, 0.45)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    marginBottom: 6,
  },
  successText: {
    color: "#34D399",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  requirementsContainer: {
    backgroundColor: "rgba(236, 154, 21, 0.10)",
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.45)",
  },
  requirementsTitle: {
    color: "#EC9A15",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
  },
  requirementError: {
    color: "#F87171",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
});
