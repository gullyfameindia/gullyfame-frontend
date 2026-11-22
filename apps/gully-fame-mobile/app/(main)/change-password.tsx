import { useState } from "react";
import KeyboardAvoidingScreen from "@/components/KeyboardAvoidingScreen";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { safeBack } from "@/utils/safeBack";
import OutlinedField, { darkFieldInputStyle } from "@/components/ui/OutlinedField";
import ScreenHeader from "@/components/ui/ScreenHeader";
import { colors, font, radius, space, type } from "@/theme/tokens";
import { EyeIcon, EyeOffIcon } from "@/icons";
import { authService, AUTH_RULES } from "@api/services/authService";
import { toastSuccess } from "@/components/ui/Toast";

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [retypePassword, setRetypePassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showRetypePassword, setShowRetypePassword] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

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
      setErrorMessage(`New password: ${passwordValidationErrors[0].toLowerCase()}.`);
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

    if (isLoading) return;
    setIsLoading(true);
    try {
      // PUT /auth/reset-password; the server checks the current password.
      const result = await authService.changePassword({ currentPassword, newPassword });
      if (!result.success) {
        setErrorMessage(result.message);
        return;
      }
      toastSuccess(result.message);
      setCurrentPassword("");
      setNewPassword("");
      setRetypePassword("");
      safeBack("/(main)/home");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingScreen style={styles.container} statusBarColor={colors.page}>
      <ScreenHeader title="Change Password" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <OutlinedField
            dark
            label="Current password"
            required
            icon="lock-closed-outline"
            focused={focus === "cur"}
            error={false}
          >
            <TextInput
              style={darkFieldInputStyle}
              placeholder="Your current password"
              placeholderTextColor={colors.placeholder}
              secureTextEntry={!showCurrentPassword}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              onFocus={() => setFocus("cur")}
              onBlur={() => setFocus(null)}
              autoCapitalize="none"
              autoComplete="current-password"
            />
            {currentPassword.length > 0 && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={showCurrentPassword ? "Hide password" : "Show password"}
                style={styles.eyeIcon}
                hitSlop={10}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? <EyeOffIcon size={20} color={colors.accent} /> : <EyeIcon size={20} color={colors.accent} />}
              </TouchableOpacity>
            )}
          </OutlinedField>
          <OutlinedField
            dark
            label="New password"
            required
            icon="key-outline"
            focused={focus === "new"}
            error={newPassword.length > 0 && passwordErrors.length > 0 ? passwordErrors[0] : false}
          >
            <TextInput
              style={darkFieldInputStyle}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.placeholder}
              secureTextEntry={!showNewPassword}
              value={newPassword}
              onChangeText={handleNewPasswordChange}
              onFocus={() => setFocus("new")}
              onBlur={() => setFocus(null)}
              autoCapitalize="none"
              autoComplete="new-password"
            />
            {newPassword.length > 0 && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={showNewPassword ? "Hide password" : "Show password"}
                style={styles.eyeIcon}
                hitSlop={10}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOffIcon size={20} color={colors.accent} /> : <EyeIcon size={20} color={colors.accent} />}
              </TouchableOpacity>
            )}
          </OutlinedField>
          <OutlinedField
            dark
            label="Confirm new password"
            required
            icon="shield-checkmark-outline"
            focused={focus === "re"}
            error={confirmPasswordError || false}
          >
            <TextInput
              style={darkFieldInputStyle}
              placeholder="Re-enter the new password"
              placeholderTextColor={colors.placeholder}
              secureTextEntry={!showRetypePassword}
              value={retypePassword}
              onChangeText={handleRetypePasswordChange}
              onFocus={() => setFocus("re")}
              onBlur={() => setFocus(null)}
              autoCapitalize="none"
              autoComplete="new-password"
            />
            {retypePassword.length > 0 && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={showRetypePassword ? "Hide password" : "Show password"}
                style={styles.eyeIcon}
                hitSlop={10}
                onPress={() => setShowRetypePassword(!showRetypePassword)}
              >
                {showRetypePassword ? <EyeOffIcon size={20} color={colors.accent} /> : <EyeIcon size={20} color={colors.accent} />}
              </TouchableOpacity>
            )}
          </OutlinedField>

          <TouchableOpacity
            style={styles.forgotPasswordContainer}
            onPress={() => router.push("/auth/forgotpassword")}
            hitSlop={8}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
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
            style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
            activeOpacity={0.85}
            onPress={handleChangePassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Update password</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.page },
  content: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.xl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: space.lg,
    paddingTop: space.xl,
  },
  eyeIcon: { paddingLeft: 10, paddingVertical: 4 },
  forgotPasswordContainer: { alignSelf: "flex-end", marginTop: space.xs, marginBottom: space.lg },
  forgotPasswordText: { color: colors.accent, fontSize: 13, fontFamily: font.semibold },
  primaryButton: {
    backgroundColor: colors.accent,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { ...type.button, color: "#FFFFFF" },
  errorContainer: {
    backgroundColor: colors.dangerSoft,
    borderColor: "rgba(248, 113, 113, 0.45)",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.md,
  },
  errorText: { color: colors.danger, fontSize: 13, fontFamily: font.medium, textAlign: "center" },
  successContainer: {
    backgroundColor: colors.successSoft,
    borderColor: "rgba(52, 211, 153, 0.45)",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.md,
  },
  successText: { color: colors.success, fontSize: 13, fontFamily: font.medium, textAlign: "center" },
});
