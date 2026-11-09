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
import Svg, { Path } from "react-native-svg";
import { authService, AUTH_RULES } from "@api/services/authService";
import { EyeIcon, EyeOffIcon } from "@/icons";

const { width, height } = Dimensions.get("window");

export default function ResetPassword() {
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
    <KeyboardAvoidingScreen style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Back Arrow and Logo */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Svg width={20} height={20} viewBox="0 0 16 16" fill="none">
              <Path
                d="M16 7H3.83L9.42 1.41L8 0L0 8L8 16L9.41 14.59L3.83 9H16V7Z"
                fill="#EC9A15"
              />
            </Svg>
          </TouchableOpacity>
        </View>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require("@assets/images/gfi.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <Text style={[styles.title, { fontFamily: "PlayfairDisplay_700Bold" }]}>
          Reset Password
        </Text>

        {/* New Password Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>New Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter New Password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={handlePasswordChange}
            />
            {password.length > 0 && (
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
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

        {/* Confirm Password Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.input}
              placeholder="Re-enter New Password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={handleConfirmPasswordChange}
            />
            {confirmPassword.length > 0 && (
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOffIcon size={20} color="#9CA3AF" />
                ) : (
                  <EyeIcon size={20} color="#9CA3AF" />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

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
    paddingHorizontal: 30,
    paddingTop: height * 0.06,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
  },
  backButton: {
    padding: 8,
    marginTop: 10,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: -50,
    marginBottom: 60,
  },
  logo: {
    width: width * 0.35,
    height: height * 0.08,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 25,
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 15,
    marginBottom: 8,
    fontFamily: "Inter",
  },
  passwordContainer: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    backgroundColor: "#55402d",
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 14,
    paddingRight: 45,
    color: "#c8c8c8",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    borderWidth: 0,
    borderColor: "rgba(255,255,255,0.2)",
    flex: 1,
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
    padding: 4,
  },
  primaryButton: {
    backgroundColor: "#EC9A15",
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  primaryButtonDisabled: {
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
  requirementsContainer: {
    backgroundColor: "#2A1F0F",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#EC9A15",
  },
  requirementsTitle: {
    color: "#EC9A15",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
  },
  requirementError: {
    color: "#DC2626",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
});
