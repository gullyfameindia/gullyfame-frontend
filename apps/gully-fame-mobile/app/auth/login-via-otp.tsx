import { useState, useEffect } from "react";
import KeyboardAvoidingScreen from "@/components/KeyboardAvoidingScreen";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ScrollView,
  Dimensions,
  Platform,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { showGuestModeUnavailable } from "@utils/guestMode";
import { GoogleIcon, InstagramIcon, AppleIcon } from "@/icons";
import { authService, AUTH_RULES } from "@api/services/authService";

const { width, height } = Dimensions.get("window");

export default function LoginViaOTP() {
  const params = useLocalSearchParams();
  const [emailOrMobile, setEmailOrMobile] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (params.email) {
      setEmailOrMobile(params.email as string);
    }
  }, [params.email]);

  const handleSendOTP = async () => {
    if (isLoading) return;
    setErrorMessage("");
    const mobile = emailOrMobile.trim();
    // The backend only delivers OTPs by SMS, so OTP login needs a mobile number.
    if (!AUTH_RULES.mobile.test(mobile)) {
      setErrorMessage("Enter your 10-digit mobile number.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await authService.login({ userId: mobile, viaPassword: false });
      if (!result.success || !result.data?.txnId) {
        setErrorMessage(result.message);
        return;
      }
      const query = `txnId=${encodeURIComponent(result.data.txnId)}&mobile=${encodeURIComponent(mobile)}`;
      router.replace(`/auth/verify-otp?${query}` as any);
    } finally {
      setIsLoading(false);
    }
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
            Login via OTP
          </Text>

          {}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Mobile Number <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your 10-digit mobile number"
              placeholderTextColor="#B0B0B0"
              value={emailOrMobile}
              onChangeText={setEmailOrMobile}
              testID="otp-login-mobile"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {}
          <View style={styles.orContainer}>
            <Text style={styles.orText}>Or</Text>
          </View>

          {}
          <TouchableOpacity
            style={styles.passwordLoginButton}
            onPress={() => router.back()}
            testID="otp-login-back"
            activeOpacity={0.7}
          >
            <Text style={styles.passwordLoginText}>
              Login via{" "}
              <Text style={styles.passwordUnderlinedText}>Password</Text>
            </Text>
          </TouchableOpacity>

          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {}
          <TouchableOpacity
            style={[
              styles.sendOtpButton,
              isLoading && styles.sendOtpButtonDisabled,
            ]}
            onPress={handleSendOTP}
            testID="otp-login-send"
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.sendOtpText}>Send OTP</Text>
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
            >
              <GoogleIcon size={40} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialIconButton}
              activeOpacity={0.7}
            >
              <InstagramIcon size={40} />
            </TouchableOpacity>
            {Platform.OS === "ios" && (
              <TouchableOpacity
                style={styles.socialIconButton}
                activeOpacity={0.7}
              >
                <AppleIcon size={40} />
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
    paddingBottom: height * 0.24,
    top: height * 0.075,
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
    marginBottom: 6,
  },
  label: {
    fontSize: 16,
    color: "#111827",
    marginBottom: 4,
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
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: "#111827",
    fontFamily: "Inter_400Regular",
    height: 50,
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
  sendOtpButton: {
    backgroundColor: "#3C2610",
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
    marginTop: 10,
  },
  sendOtpText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  sendOtpButtonDisabled: {
    opacity: 0.6,
  },
  passwordLoginButton: {
    borderWidth: 0,
    borderRadius: 30,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "transparent",
  },
  passwordLoginText: {
    color: "#000",
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  passwordUnderlinedText: {
    color: "#EC9A15",
    textDecorationLine: "underline",
    fontFamily: "Inter_400Regular",
  },
  orContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  orText: {
    fontSize: 14,
    color: "#000",
    fontFamily: "Inter_400Regular",
  },
  createAccountContainer: {
    alignItems: "center",
    marginBottom: -10,
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
});
