import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getRetryAfterSeconds } from "@/api/client";
import { authService, AUTH_RULES } from "@/api/services/authService";
import OtpCodeInput, { OTP_LENGTH } from "@/components/ui/OtpCodeInput";

// Same brown + orange palette as the rest of the app.
const C = {
  card: "#1A1A1A",
  inner: "#252525",
  inputBorder: "#3A3A3A",
  border: "#2A2A2A",
  accent: "#EC9A15",
  text: "#FFFFFF",
  muted: "#CAD7D8",
  faint: "#8A8F90",
  danger: "#FF6B6B",
};

const RESEND_SECONDS = 30;

type Props = {
  visible: boolean;
  currentEmail: string;
  onClose: () => void;
  /** Called with the new address once the server has saved it. */
  onChanged: (email: string) => void;
};

/**
 * Change email: enter the new address, get a code there, enter the code. The profile update
 * can't change email directly; the code proves the person owns the new address.
 * POST user/email/send-otp { email } -> { txnId }; POST user/email/verify { txnId, otp } -> { email }.
 */
export default function ChangeEmailPopup({ visible, currentEmail, onClose, onChanged }: Props) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [txnId, setTxnId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);

  // Start fresh each time the popup opens.
  useEffect(() => {
    if (!visible) return;
    setStep("email");
    setEmail("");
    setMaskedEmail("");
    setOtp("");
    setTxnId("");
    setError("");
    setResendIn(0);
  }, [visible]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const address = email.trim().toLowerCase();

  // First send inside the resend window returns the code already emailed (no error);
  // "Resend code" passes resend=true and is told exactly how long to wait if it is too soon.
  const sendCode = async (resend = false) => {
    if (busy) return;
    if (!AUTH_RULES.email.test(address) || address.length > AUTH_RULES.emailMaxLength) {
      setError("Enter a valid email address (max 50 characters).");
      return;
    }
    if (address === currentEmail.trim().toLowerCase()) {
      setError("This is already your email address.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await authService.sendEmailChangeCode(address, { resend });
    setBusy(false);
    if (!result.success || !result.data?.txnId) {
      setError(result.message);
      if (result.retryAfterSeconds) setResendIn(result.retryAfterSeconds);
      return;
    }
    setTxnId(result.data.txnId);
    setMaskedEmail(result.data.email || address);
    setStep("code");
    setOtp("");
    setResendIn(result.data.resendIn ?? RESEND_SECONDS);
  };

  const verifyCode = async () => {
    if (busy || otp.length !== OTP_LENGTH) return;
    setBusy(true);
    setError("");
    const result = await authService.verifyEmailChange(txnId, otp);
    setBusy(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    onChanged(result.data?.email || address);
  };

  const codeIncomplete = step === "code" && otp.length !== OTP_LENGTH;

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{step === "email" ? "Change email address" : "Enter the code"}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={C.muted} />
            </TouchableOpacity>
          </View>

          {step === "email" ? (
            <>
              <Text style={styles.desc}>
                {currentEmail ? `Your current email is ${currentEmail}. ` : ""}We&apos;ll send a code to your new address to confirm it.
              </Text>
              <Text style={styles.label}>New email address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setError("");
                }}
                placeholder="you@example.com"
                placeholderTextColor={C.faint}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                autoFocus
              />
            </>
          ) : (
            <>
              <Text style={styles.desc}>We sent a code to {maskedEmail}. Check your spam folder if you don&apos;t see it.</Text>
              <Text style={styles.label}>Code</Text>
              <OtpCodeInput
                value={otp}
                onChangeText={(t) => {
                  setOtp(t);
                  setError("");
                }}
                theme="dark"
                source="email"
                autoFocus
                hasError={Boolean(error)}
                testID="change-email-otp"
              />
              <View style={styles.linkRow}>
                <TouchableOpacity onPress={() => setStep("email")} disabled={busy}>
                  <Text style={styles.link}>Change email</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => sendCode(true)} disabled={busy || resendIn > 0}>
                  <Text style={[styles.link, resendIn > 0 && styles.linkDisabled]}>
                    {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.primaryButton, (busy || codeIncomplete) && styles.disabled]}
            onPress={step === "email" ? () => sendCode(false) : verifyCode}
            disabled={busy || codeIncomplete}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>{step === "email" ? "Send code" : "Verify and save"}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#555",
    alignSelf: "center",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    color: C.text,
    fontSize: 20,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  desc: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
  },
  label: {
    color: C.muted,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 16,
    marginBottom: 8,
  },
  phoneRow: {
    flexDirection: "row",
    gap: 10,
  },
  cc: {
    backgroundColor: C.inner,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.inputBorder,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  ccText: {
    color: C.text,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  input: {
    backgroundColor: C.inner,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.inputBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  link: {
    color: C.accent,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  linkDisabled: {
    color: C.faint,
  },
  error: {
    color: C.danger,
    fontSize: 13,
    marginTop: 12,
    fontFamily: "Inter_500Medium",
  },
  primaryButton: {
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 18,
  },
  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  disabled: {
    opacity: 0.6,
  },
});
