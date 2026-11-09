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
import Svg, { Path } from "react-native-svg";
import { authService, AUTH_RULES } from "@api/services/authService";

const { width, height } = Dimensions.get("window");

export default function ForgotPassword() {
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
        `&target=${encodeURIComponent(result.data.email)}&userId=${encodeURIComponent(identifier)}`;
      router.push(`/auth/verify-otp?${query}` as any);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingScreen style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Svg width={20} height={20} viewBox="0 0 16 16" fill="none">
              <Path
                d="M16 7H3.83L9.42 1.41L8 0L0 8L8 16L9.41 14.59L3.83 9H16V7Z"
                fill="#EC9A15"
              />
            </Svg>
          </TouchableOpacity>
        </View>

        {}
        <View style={styles.logoContainer}>
          <Image
            source={require("@assets/images/gfi.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {}
        <Text style={[styles.title, { fontFamily: "PlayfairDisplay_700Bold" }]}>
          Forgot Password
        </Text>

        {}
        <Text style={styles.subtitle}>
          Enter the email or mobile number linked to your Gully Fame account and we&apos;ll send you an OTP to reset your password.
        </Text>

        {}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address / Mobile Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter email or mobile number"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            testID="forgot-identifier"
          />
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
    marginTop:10,
  },
  logoContainer: {
    alignItems: "center",
    marginTop:-50,
    marginBottom: 60,
  },
  logo: {
    width: width * 0.35,
    height: height * 0.08,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 25,
    marginBottom: 15,
  },
  subtitle: {
    color: "#C8C8C8",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 30,
    fontFamily: "Inter_400Regular",
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
  input: {
    backgroundColor: "#55402d",
    borderRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    borderWidth: 0,
    borderColor: "rgba(255,255,255,0.2)",
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
});

