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
import { router } from "expo-router";
import OutlinedField, { FIELD_COLORS, fieldInputStyle } from "@/components/ui/OutlinedField";
import { safeBack } from "@/utils/safeBack";
import Svg, { Path } from "react-native-svg";
import { authService, AUTH_RULES } from "@api/services/authService";

const { width, height } = Dimensions.get("window");

export default function ForgotPassword() {
  const [focus, setFocus] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (isLoading) return;
    setErrorMessage("");
    setSuccessMessage("");
    const identifier = email.trim().toLowerCase();
    if (!identifier) {
      setErrorMessage("Please enter the email or mobile number associated with your account.");
      return;
    }
    if (identifier.includes("@") ? !AUTH_RULES.email.test(identifier) : !AUTH_RULES.mobile.test(identifier)) {
      setErrorMessage("Enter a valid email or 10-digit mobile number.");
      return;
    }
    setIsLoading(true);
    try {
      // Step 1: the backend emails a 6-digit code to the account's email.
      const result = await authService.forgotPassword(identifier);
      if (!result.success || !result.data?.txnId) {
        setErrorMessage(result.message);
        return;
      }
      setSuccessMessage(`Code sent to ${result.data.email}`);
      const query =
        `mode=reset&txnId=${encodeURIComponent(result.data.txnId)}` +
        `&target=${encodeURIComponent(result.data.email)}&userId=${encodeURIComponent(identifier)}` +
        `&resendIn=${result.data.resendIn ?? ""}`;
      router.push(`/auth/verify-otp?${query}` as any);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingScreen style={styles.container} statusBarColor="#3C2610">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {}
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => safeBack()} style={styles.headerSide}>
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
          Forgot Password
        </Text>

        {}
        <Text style={styles.subtitle}>
          Enter the email or mobile number linked to your Gully Fame account and we&apos;ll send you an OTP to reset your password.
        </Text>

        {}
        <OutlinedField label="Email / Mobile Number" required icon="person-outline" focused={focus === "id"}>
          <TextInput
            style={fieldInputStyle}
            placeholder="you@example.com or 98765 43210"
            placeholderTextColor={FIELD_COLORS.placeholder}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setFocus("id")}
            onBlur={() => setFocus(null)}
            testID="forgot-identifier"
          />
        </OutlinedField>

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
          style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
          activeOpacity={0.85}
          onPress={handleSend}
          testID="forgot-submit"
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Send OTP</Text>
          )}
        </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#FFF9F1",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 30,
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
    paddingTop: height * 0.015,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  logo: {
    width: width * 0.35,
    height: height * 0.08,
  },
  title: {
    color: "#1F2937",
    fontSize: 28,
    fontFamily: "PlayfairDisplay_800ExtraBold",
    marginBottom: 10,
  },
  subtitle: {
    color: "#6B7280",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 26,
    fontFamily: "Inter_400Regular",
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    color: "#1F2937",
    fontSize: 14,
    marginBottom: 8,
    fontFamily: "Inter_600SemiBold",
  },
  input: {
    paddingVertical: 14,
    color: "#1F2937",
    fontFamily: "Inter_400Regular",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E7D9C4",
    backgroundColor: "#FFFFFF",
    minHeight: 54,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  primaryButton: {
    paddingVertical: 18,
    marginTop: 12,
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
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  primaryButtonDisabled: {
    opacity: 0.6,
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
});

