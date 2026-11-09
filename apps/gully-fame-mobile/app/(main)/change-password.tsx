import { useState, useEffect } from "react";
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
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { EyeIcon, EyeOffIcon } from "@/icons";
import { authService, AUTH_RULES } from "@api/services/authService";
import { toastSuccess } from "@/components/ui/Toast";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [retypePassword, setRetypePassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showRetypePassword, setShowRetypePassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userMobile, setUserMobile] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  useEffect(() => {
    loadUserIdentifier();
  }, []);

  const loadUserIdentifier = async () => {
    try {
      const email = await AsyncStorage.getItem("userEmail");
      const mobile = await AsyncStorage.getItem("userMobile");
      setUserEmail(email || "");
      setUserMobile(mobile || "");
    } catch { /* intentionally ignored */
    }
  };

  // Mirrors the backend rule: at least 6 characters.
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

  const handleNewPasswordChange = (text: string) => {
    setNewPassword(text);
    if (text.length > 0) {
      const errors = validatePassword(text);
      setPasswordErrors(errors);
    } else {
      setPasswordErrors([]);
    }
    if (retypePassword && text !== retypePassword) {
      setConfirmPasswordError("Passwords do not match");
    } else {
      setConfirmPasswordError("");
    }
  };

  const handleRetypePasswordChange = (text: string) => {
    setRetypePassword(text);
    if (newPassword && text !== newPassword) {
      setConfirmPasswordError("Passwords do not match");
    } else {
      setConfirmPasswordError("");
    }
  };

  const handleChangePassword = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    setPasswordErrors([]);
    setConfirmPasswordError("");

    if (!currentPassword || !newPassword || !retypePassword) {
      setErrorMessage("Please fill in all fields.");
      return;
    }

    const passwordValidationErrors = validatePassword(newPassword);
    if (passwordValidationErrors.length > 0) {
      setPasswordErrors(passwordValidationErrors);
      setErrorMessage(
        "Password does not meet requirements. Please check the requirements below.",
      );
      return;
    }

    if (newPassword !== retypePassword) {
      setConfirmPasswordError("Passwords do not match");
      setErrorMessage("New password and retype password do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setErrorMessage("New password must be different from current password.");
      return;
    }

    const identifier = userEmail || userMobile;
    if (!identifier) {
      setErrorMessage("Unable to identify your account. Please sign in again.");
      return;
    }
    if (isLoading) return;
    setIsLoading(true);
    try {
      // Verifies the current password via login, then PUT /auth/reset-password.
      const result = await authService.changePassword({ identifier, currentPassword, newPassword });
      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }
      toastSuccess(result.message);
      setCurrentPassword("");
      setNewPassword("");
      setRetypePassword("");
      router.back();
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
        {/* Header with Back Arrow */}
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
          Change Password
        </Text>

        {/* Current Password Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Current Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter Current Password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showCurrentPassword}
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowCurrentPassword(!showCurrentPassword)}
            >
              {showCurrentPassword ? (
                <EyeOffIcon size={20} color="#9CA3AF" />
              ) : (
                <EyeIcon size={20} color="#9CA3AF" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* New Password Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>New Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter New Password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showNewPassword}
              value={newPassword}
              onChangeText={handleNewPasswordChange}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowNewPassword(!showNewPassword)}
            >
              {showNewPassword ? (
                <EyeOffIcon size={20} color="#9CA3AF" />
              ) : (
                <EyeIcon size={20} color="#9CA3AF" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Retype New Password Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Retype New Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.input}
              placeholder="Re-enter New Password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showRetypePassword}
              value={retypePassword}
              onChangeText={handleRetypePasswordChange}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowRetypePassword(!showRetypePassword)}
            >
              {showRetypePassword ? (
                <EyeOffIcon size={20} color="#9CA3AF" />
              ) : (
                <EyeIcon size={20} color="#9CA3AF" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Password Requirements */}
        {newPassword.length > 0 && passwordErrors.length > 0 && (
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

        {/* Forgot Password Link */}
        <TouchableOpacity
          style={styles.forgotPasswordContainer}
          onPress={() => router.push("/auth/forgotpassword")}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
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

        {/* Change Password Button */}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            isLoading && styles.primaryButtonDisabled,
          ]}
          activeOpacity={0.85}
          onPress={handleChangePassword}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Change Password</Text>
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
  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginBottom: 20,
    marginTop: -10,
  },
  forgotPasswordText: {
    color: "#EC9A15",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
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
