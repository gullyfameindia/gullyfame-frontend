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
import OutlinedField, { DARK_FIELD_COLORS, darkFieldInputStyle } from "@/components/ui/OutlinedField";
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
        <OutlinedField dark label="Email / Mobile Number" required icon="person-outline" focused={focus === "id"}>
          <TextInput
            style={darkFieldInputStyle}
            placeholder="you@example.com or 98765 43210"
            placeholderTextColor={DARK_FIELD_COLORS.placeholder}
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
});
