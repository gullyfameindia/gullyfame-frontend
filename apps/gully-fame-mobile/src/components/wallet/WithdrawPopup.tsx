import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getErrorMessage } from "@/api/client";
import {
  coinsToRupees,
  getWithdrawalSummary,
  requestWithdrawal,
  STATUS_LABEL,
  validateWithdrawal,
  type WithdrawalMethod,
  type WithdrawalRequest,
  type WithdrawalSummary,
} from "@/api/services/withdrawalService";
import { toastError, toastSuccess } from "@/components/ui/Toast";

// Same brown + orange palette as the rest of the app.
const C = {
  bg: "#3C2610",
  card: "#1A1A1A",
  inner: "#252525",
  inputBorder: "#3A3A3A",
  border: "#2A2A2A",
  accent: "#EC9A15",
  accentSoft: "rgba(236, 154, 21, 0.15)",
  text: "#FFFFFF",
  muted: "#CAD7D8",
  faint: "#8A8F90",
  danger: "#FF6B6B",
};

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Called after a withdrawal request is accepted, so the wallet can refresh. */
  onWithdrawn: () => void;
};

/** Same wording as the Withdraw screen, for why a withdrawal is not possible yet. */
function blockerText(s: WithdrawalSummary): string | null {
  if (s.blockers.includes("KYC_REQUIRED"))
    return s.kycStatus === "PENDING"
      ? "Your KYC is being reviewed. You can withdraw once it's approved."
      : "Complete KYC verification to withdraw.";
  if (s.blockers.includes("ACCOUNT_TOO_NEW")) return `New accounts can withdraw after ${s.minAccountDays} days.`;
  if (s.blockers.includes("REQUEST_OPEN")) return "You have a withdrawal in progress. You can request another after it's paid.";
  if (s.blockers.includes("MONTHLY_LIMIT"))
    return `You've reached this month's limit of ${coinsToRupees(s.monthlyMaxCoins, s.coinValuePaise)}.`;
  if (s.blockers.includes("NOT_ENOUGH_COINS"))
    return `You need at least ${s.minCoins.toLocaleString("en-IN")} earned coins. You have ${s.withdrawableCoins.toLocaleString("en-IN")}.`;
  return null;
}

/** Withdraw popup: enter coins and payout details, review, then confirm. Uses the same API and rules as the Withdraw screen. */
export default function WithdrawPopup({ visible, onClose, onWithdrawn }: Props) {
  const [summary, setSummary] = useState<WithdrawalSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [step, setStep] = useState<"form" | "review">("form");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");

  const [coins, setCoins] = useState("");
  const [method, setMethod] = useState<WithdrawalMethod>("UPI");
  const [holder, setHolder] = useState("");
  const [upiId, setUpiId] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");

  const coinCount = parseInt(coins.replace(/\D/g, ""), 10) || 0;

  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      setSummary(await getWithdrawalSummary());
    } catch (e) {
      setLoadError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  // Each time the popup opens, start from the form with fresh numbers.
  useEffect(() => {
    if (!visible) return;
    setStep("form");
    setFormError("");
    setCoins("");
    load();
  }, [visible]);

  const buildRequest = (): WithdrawalRequest => ({
    coins: coinCount,
    method,
    accountHolderName: holder.trim(),
    ...(method === "UPI"
      ? { upiId: upiId.trim().toLowerCase() }
      : { accountNumber: accountNumber.replace(/\s/g, ""), ifsc: ifsc.trim().toUpperCase() }),
  });

  const review = () => {
    if (!summary) return;
    const problem = validateWithdrawal(buildRequest(), summary);
    if (problem) {
      setFormError(problem);
      return;
    }
    setFormError("");
    setStep("review");
  };

  const confirm = async () => {
    if (!summary || sending) return;
    setSending(true);
    try {
      await requestWithdrawal(buildRequest());
      toastSuccess(`You'll be paid within ${summary.payoutTime}.`);
      onWithdrawn();
      onClose();
    } catch (e) {
      toastError(getErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const payTo =
    method === "UPI" ? upiId.trim().toLowerCase() : `account ending ${accountNumber.replace(/\s/g, "").slice(-4)}`;
  const blocked = summary ? blockerText(summary) : null;

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>{step === "review" ? "Confirm withdrawal" : "Withdraw coins"}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={C.muted} />
            </TouchableOpacity>
          </View>

          {loading && !summary ? (
            <View style={styles.center}>
              <ActivityIndicator color={C.accent} />
            </View>
          ) : loadError && !summary ? (
            <View style={styles.center}>
              <Text style={styles.muted}>{loadError}</Text>
              <TouchableOpacity onPress={load} style={{ marginTop: 12 }}>
                <Text style={styles.link}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : summary ? (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Balance */}
              <View style={styles.balanceBox}>
                <Text style={styles.muted}>Earned coins you can withdraw</Text>
                <Text style={styles.balanceNumber}>{summary.withdrawableCoins.toLocaleString("en-IN")}</Text>
                <Text style={styles.balanceValue}>= {coinsToRupees(summary.withdrawableCoins, summary.coinValuePaise)}</Text>
                <Text style={styles.small}>
                  Minimum {summary.minCoins.toLocaleString("en-IN")} coins · Paid within {summary.payoutTime}
                </Text>
              </View>

              {summary.openRequest && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoTitle}>In progress</Text>
                  <Text style={styles.infoText}>
                    {summary.openRequest.coins.toLocaleString("en-IN")} coins · {STATUS_LABEL[summary.openRequest.status]}
                  </Text>
                </View>
              )}

              {!summary.canWithdraw && !summary.openRequest && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>{blocked}</Text>
                  {summary.blockers.includes("KYC_REQUIRED") && summary.kycStatus !== "PENDING" && (
                    <TouchableOpacity
                      style={styles.kycButton}
                      onPress={() => {
                        onClose();
                        router.push("/(main)/settings/kyc-status" as any);
                      }}
                    >
                      <Text style={styles.kycText}>Go to KYC</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {summary.canWithdraw && step === "form" && (
                <>
                  <Text style={styles.label}>Coins to withdraw</Text>
                  <View style={styles.coinRow}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={coins}
                      onChangeText={(t) => {
                        setCoins(t);
                        setFormError("");
                      }}
                      placeholder={`Min ${summary.minCoins.toLocaleString("en-IN")}`}
                      placeholderTextColor={C.faint}
                      keyboardType="number-pad"
                    />
                    <TouchableOpacity
                      style={styles.maxChip}
                      onPress={() => setCoins(String(summary.maxCoinsNow))}
                      accessibilityRole="button"
                    >
                      <Text style={styles.maxText}>Max</Text>
                    </TouchableOpacity>
                  </View>
                  {coinCount > 0 && (
                    <Text style={styles.small}>= {coinsToRupees(coinCount, summary.coinValuePaise)}</Text>
                  )}

                  <Text style={styles.label}>Pay to</Text>
                  <View style={styles.segment}>
                    {(["UPI", "BANK"] as WithdrawalMethod[]).map((m) => {
                      const active = method === m;
                      return (
                        <TouchableOpacity
                          key={m}
                          style={[styles.segmentItem, active && styles.segmentActive]}
                          onPress={() => setMethod(m)}
                          accessibilityRole="button"
                        >
                          <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                            {m === "UPI" ? "UPI" : "Bank account"}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.label}>Account holder name</Text>
                  <TextInput
                    style={styles.input}
                    value={holder}
                    onChangeText={setHolder}
                    placeholder="As on your KYC document"
                    placeholderTextColor={C.faint}
                    autoCapitalize="words"
                  />

                  {method === "UPI" ? (
                    <>
                      <Text style={styles.label}>UPI ID</Text>
                      <TextInput
                        style={styles.input}
                        value={upiId}
                        onChangeText={setUpiId}
                        placeholder="name@okbank"
                        placeholderTextColor={C.faint}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </>
                  ) : (
                    <>
                      <Text style={styles.label}>Account number</Text>
                      <TextInput
                        style={styles.input}
                        value={accountNumber}
                        onChangeText={setAccountNumber}
                        placeholder="9 to 18 digits"
                        placeholderTextColor={C.faint}
                        keyboardType="number-pad"
                      />
                      <Text style={styles.label}>IFSC code</Text>
                      <TextInput
                        style={styles.input}
                        value={ifsc}
                        onChangeText={setIfsc}
                        placeholder="SBIN0001234"
                        placeholderTextColor={C.faint}
                        autoCapitalize="characters"
                        autoCorrect={false}
                      />
                    </>
                  )}

                  {!!formError && <Text style={styles.error}>{formError}</Text>}

                  <TouchableOpacity style={styles.primaryButton} onPress={review} activeOpacity={0.8} accessibilityRole="button">
                    <Text style={styles.primaryText}>Review withdrawal</Text>
                  </TouchableOpacity>
                </>
              )}

              {summary.canWithdraw && step === "review" && (
                <>
                  <View style={styles.infoBox}>
                    <Row label="Coins" value={coinCount.toLocaleString("en-IN")} />
                    <Row label="You receive" value={coinsToRupees(coinCount, summary.coinValuePaise)} />
                    <Row label="Pay to" value={payTo} />
                    <Row label="Name" value={holder.trim()} last />
                  </View>
                  <Text style={styles.small}>
                    The name must match your KYC document. You'll be paid within {summary.payoutTime}.
                  </Text>

                  <TouchableOpacity
                    style={[styles.primaryButton, sending && styles.disabled]}
                    onPress={confirm}
                    disabled={sending}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                  >
                    {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Confirm withdrawal</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep("form")} disabled={sending}>
                    <Text style={styles.secondaryText}>Edit details</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.rowLine, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
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
    paddingBottom: 28,
    paddingTop: 10,
    maxHeight: "88%",
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
    marginBottom: 14,
  },
  title: {
    color: C.text,
    fontSize: 20,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  center: {
    paddingVertical: 40,
    alignItems: "center",
  },
  muted: {
    color: C.muted,
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    textAlign: "center",
  },
  small: {
    color: C.faint,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Rubik_400Regular",
    marginTop: 6,
  },
  link: {
    color: C.accent,
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
  },
  balanceBox: {
    backgroundColor: C.inner,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  balanceNumber: {
    color: C.text,
    fontSize: 34,
    fontFamily: "Rubik_700Bold",
    marginTop: 4,
  },
  balanceValue: {
    color: C.accent,
    fontSize: 16,
    fontFamily: "Rubik_600SemiBold",
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: C.accentSoft,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  infoTitle: {
    color: C.accent,
    fontSize: 14,
    fontFamily: "Rubik_600SemiBold",
    marginBottom: 4,
  },
  infoText: {
    color: C.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Rubik_400Regular",
  },
  kycButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    backgroundColor: C.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  kycText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Rubik_600SemiBold",
  },
  label: {
    color: C.muted,
    fontSize: 13,
    fontFamily: "Rubik_500Medium",
    marginTop: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: C.inner,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 15,
    fontFamily: "Rubik_400Regular",
    borderWidth: 1,
    borderColor: C.inputBorder,
  },
  coinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  maxChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.accentSoft,
    borderWidth: 1,
    borderColor: C.accent,
  },
  maxText: {
    color: C.accent,
    fontSize: 14,
    fontFamily: "Rubik_700Bold",
  },
  segment: {
    flexDirection: "row",
    backgroundColor: C.inner,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: C.accentSoft,
  },
  segmentText: {
    color: C.faint,
    fontSize: 14,
    fontFamily: "Rubik_600SemiBold",
  },
  segmentTextActive: {
    color: C.accent,
  },
  error: {
    color: C.danger,
    fontSize: 13,
    fontFamily: "Rubik_500Medium",
    marginTop: 12,
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
  secondaryButton: {
    alignItems: "center",
    paddingVertical: 14,
  },
  secondaryText: {
    color: C.muted,
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
  },
  disabled: {
    opacity: 0.6,
  },
  rowLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
    gap: 12,
  },
  rowLabel: {
    color: C.faint,
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
  },
  rowValue: {
    color: C.text,
    fontSize: 14,
    fontFamily: "Rubik_600SemiBold",
    flexShrink: 1,
    textAlign: "right",
  },
});
