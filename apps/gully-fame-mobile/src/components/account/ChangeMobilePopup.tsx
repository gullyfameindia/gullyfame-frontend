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
import { apiPost, getErrorMessage } from "@/api/client";

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
  currentMobile: string;
  onClose: () => void;
  /** Called with the new number once the server has saved it. */
  onChanged: (mobile: string) => void;
};

/**
 * Change mobile number: enter the new number, get a code by SMS, enter the code.
 * POST user/mobile/send-otp { mobile } -> { txnId }; POST user/mobile/verify { txnId, otp } -> { mobile }.
 */
export default function ChangeMobilePopup({ visible, currentMobile, onClose, onChanged }: Props) {
  const [step, setStep] = useState<"number" | "code">("number");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [txnId, setTxnId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);

  // Start fresh each time the popup opens.
  useEffect(() => {
    if (!visible) return;
    setStep("number");
    setMobile("");
    setOtp("");
    setTxnId("");
    setError("");
    setResendIn(0);
  }, [visible]);

  // Countdown before another code can be requested.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const digits = mobile.replace(/\D/g, "");

  const sendCode = async () => {
    if (busy) return;
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await apiPost<{ txnId: string }>("user/mobile/send-otp", { mobile: digits });
      setTxnId(res.txnId);
      setStep("code");
      setOtp("");
      setResendIn(RESEND_SECONDS);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    if (busy) return;
    if (!/^\d{4,8}$/.test(otp.trim())) {
      setError("Enter the code we sent to your new number.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await apiPost<{ mobile: string }>("user/mobile/verify", { txnId, otp: otp.trim() });
      onChanged(res.mobile || digits);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{step === "number" ? "Change mobile number" : "Enter the code"}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={C.muted} />
            </TouchableOpacity>
          </View>

          {step === "number" ? (
            <>
              <Text style={styles.desc}>
                {currentMobile ? `Your current number is ${currentMobile}. ` : ""}We'll send a code to your new number to confirm it.
              </Text>
              <Text style={styles.label}>New mobile number</Text>
              <View style={styles.phoneRow}>
                <View style={styles.cc}>
                  <Text style={styles.ccText}>+91</Text>
                </View>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={mobile}
                  onChangeText={(t) => {
                    setMobile(t.replace(/[^\d]/g, "").slice(0, 10));
                    setError("");
                  }}
                  placeholder="10-digit number"
                  placeholderTextColor={C.faint}
                  keyboardType="number-pad"
                  maxLength={10}
                  autoFocus
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.desc}>We sent a code to +91 {digits}.</Text>
              <Text style={styles.label}>Code</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                value={otp}
                onChangeText={(t) => {
                  setOtp(t.replace(/[^\d]/g, "").slice(0, 8));
                  setError("");
                }}
                placeholder="Enter code"
                placeholderTextColor={C.faint}
                keyboardType="number-pad"
                autoFocus
              />
              <View style={styles.linkRow}>
                <TouchableOpacity onPress={() => setStep("number")} disabled={busy}>
                  <Text style={styles.link}>Change number</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={sendCode} disabled={busy || resendIn > 0}>
                  <Text style={[styles.link, resendIn > 0 && styles.linkDisabled]}>
                    {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.primaryButton, busy && styles.disabled]}
            onPress={step === "number" ? sendCode : verifyCode}
            disabled={busy}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>{step === "number" ? "Send code" : "Verify and save"}</Text>
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
    fontFamily: "Rubik_400Regular",
  },
  label: {
    color: C.muted,
    fontSize: 13,
    fontFamily: "Rubik_500Medium",
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
    fontFamily: "Rubik_500Medium",
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
    fontFamily: "Rubik_400Regular",
  },
  otpInput: {
    letterSpacing: 6,
    textAlign: "center",
    fontSize: 20,
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  link: {
    color: C.accent,
    fontSize: 14,
    fontFamily: "Rubik_600SemiBold",
  },
  linkDisabled: {
    color: C.faint,
  },
  error: {
    color: C.danger,
    fontSize: 13,
    marginTop: 12,
    fontFamily: "Rubik_500Medium",
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
    fontFamily: "Rubik_700Bold",
  },
  disabled: {
    opacity: 0.6,
  },
});
