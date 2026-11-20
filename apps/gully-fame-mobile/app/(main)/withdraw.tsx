import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import KeyboardAvoidingScreen from "@/components/KeyboardAvoidingScreen";
import { BackIcon } from "@/icons";
import { getErrorMessage } from "@/api/client";
import {
  cancelWithdrawal,
  coinsToRupees,
  getWithdrawalSummary,
  listWithdrawals,
  requestWithdrawal,
  STATUS_LABEL,
  validateWithdrawal,
  type Withdrawal,
  type WithdrawalMethod,
  type WithdrawalRequest,
  type WithdrawalSummary,
} from "@/api/services/withdrawalService";

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#EC9A15",
  APPROVED: "#3B82F6",
  PAID: "#22C55E",
  REJECTED: "#EF4444",
  CANCELLED: "#999",
};

/** Withdraw earned coins to UPI or a bank account (paid by Gully Fame within 24-48 hours). */
export default function WithdrawScreen() {
  const [summary, setSummary] = useState<WithdrawalSummary | null>(null);
  const [history, setHistory] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [sending, setSending] = useState(false);

  const [coins, setCoins] = useState("");
  const [method, setMethod] = useState<WithdrawalMethod>("UPI");
  const [holder, setHolder] = useState("");
  const [upiId, setUpiId] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [s, h] = await Promise.all([getWithdrawalSummary(), listWithdrawals(1, 20)]);
      setSummary(s);
      setHistory(h.withdrawals);
    } catch (e) {
      setLoadError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const coinCount = parseInt(coins.replace(/\D/g, ""), 10) || 0;

  const submit = () => {
    if (!summary) return;
    const body: WithdrawalRequest = {
      coins: coinCount,
      method,
      accountHolderName: holder.trim(),
      ...(method === "UPI"
        ? { upiId: upiId.trim().toLowerCase() }
        : { accountNumber: accountNumber.replace(/\s/g, ""), ifsc: ifsc.trim().toUpperCase() }),
    };
    const problem = validateWithdrawal(body, summary);
    if (problem) {
      Alert.alert("Check the details", problem);
      return;
    }
    const to = method === "UPI" ? body.upiId : `account ending ${(body.accountNumber || "").slice(-4)}`;
    Alert.alert(
      "Confirm withdrawal",
      `Withdraw ${coinCount.toLocaleString("en-IN")} coins (${coinsToRupees(coinCount, summary.coinValuePaise)}) to ${to} in the name of ${body.accountHolderName}?\n\nThe name must match your KYC document. You'll be paid within ${summary.payoutTime}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Withdraw",
          onPress: async () => {
            setSending(true);
            try {
              await requestWithdrawal(body);
              setCoins("");
              Alert.alert("Withdrawal requested", `You'll be paid within ${summary.payoutTime}. We'll notify you when it's sent.`);
              load();
            } catch (e) {
              Alert.alert("Couldn't request withdrawal", getErrorMessage(e));
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  const cancel = (w: Withdrawal) => {
    Alert.alert("Cancel withdrawal?", `Your ${w.coins.toLocaleString("en-IN")} coins will go back to your wallet.`, [
      { text: "Keep it", style: "cancel" },
      {
        text: "Cancel withdrawal",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelWithdrawal(w.id);
            load();
          } catch (e) {
            Alert.alert("Couldn't cancel", getErrorMessage(e));
          }
        },
      },
    ]);
  };

  const blockerText = (s: WithdrawalSummary): string | null => {
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
  };

  return (
    <KeyboardAvoidingScreen style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2610" />
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => router.back()} style={styles.backButton}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Withdraw</Text>
        <View style={styles.backButton} />
      </View>

      {loading && !summary ? (
        <View style={styles.center}>
          <ActivityIndicator color="#EC9A15" />
        </View>
      ) : loadError && !summary ? (
        <View style={styles.center}>
          <Text style={styles.muted}>{loadError}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={load} style={{ marginTop: 12 }}>
            <Text style={styles.link}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : summary ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.muted}>Earned coins you can withdraw</Text>
            <Text style={styles.big}>{summary.withdrawableCoins.toLocaleString("en-IN")}</Text>
            <Text style={styles.amount}>= {coinsToRupees(summary.withdrawableCoins, summary.coinValuePaise)}</Text>
            <Text style={styles.small}>
              1 coin = {coinsToRupees(1, summary.coinValuePaise)} · Minimum {summary.minCoins.toLocaleString("en-IN")} coins · Up to{" "}
              {coinsToRupees(summary.monthlyMaxCoins, summary.coinValuePaise)} a month · Paid within {summary.payoutTime}
            </Text>
            <Text style={styles.small}>Only earned coins (tips received, prizes, referral rewards) can be withdrawn.</Text>
          </View>

          {summary.openRequest && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>In progress</Text>
              <Text style={styles.rowTitle}>
                {summary.openRequest.amount} · {summary.openRequest.coins.toLocaleString("en-IN")} coins
              </Text>
              <Text style={[styles.status, { color: STATUS_COLOR[summary.openRequest.status] }]}>
                {STATUS_LABEL[summary.openRequest.status]}
              </Text>
              <Text style={styles.small}>To {summary.openRequest.payTo}</Text>
              {summary.openRequest.status === "PENDING" && (
                <TouchableOpacity accessibilityRole="button" onPress={() => cancel(summary.openRequest!)} style={{ marginTop: 10 }}>
                  <Text style={styles.link}>Cancel request</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {!summary.canWithdraw && !summary.openRequest && (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>{blockerText(summary)}</Text>
              {summary.blockers.includes("KYC_REQUIRED") && summary.kycStatus !== "PENDING" && (
                <TouchableOpacity accessibilityRole="button" onPress={() => router.push("/(main)/settings/kyc-status" as any)}>
                  <Text style={[styles.link, { marginTop: 8 }]}>Go to KYC</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {summary.canWithdraw && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>New withdrawal</Text>

              <Text style={styles.label}>Coins</Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={coins}
                  onChangeText={(t) => setCoins(t.replace(/\D/g, ""))}
                  keyboardType="number-pad"
                  placeholder={`${summary.minCoins} - ${summary.maxCoinsNow}`}
                  placeholderTextColor="#777"
                  accessibilityLabel="Coins to withdraw"
                />
                <TouchableOpacity accessibilityRole="button" style={styles.maxButton} onPress={() => setCoins(String(summary.maxCoinsNow))}>
                  <Text style={styles.maxText}>Max</Text>
                </TouchableOpacity>
              </View>
              {coinCount > 0 && <Text style={styles.amount}>You get {coinsToRupees(coinCount, summary.coinValuePaise)}</Text>}

              <Text style={styles.label}>Pay to</Text>
              <View style={styles.row}>
                {(["UPI", "BANK"] as WithdrawalMethod[]).map((m) => (
                  <TouchableOpacity
                    key={m}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: method === m }}
                    style={[styles.methodButton, method === m && styles.methodActive]}
                    onPress={() => setMethod(m)}
                  >
                    <Text style={[styles.methodText, method === m && styles.methodTextActive]}>{m === "UPI" ? "UPI" : "Bank account"}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {method === "UPI" ? (
                <>
                  <Text style={styles.label}>UPI ID</Text>
                  <TextInput
                    style={styles.input}
                    value={upiId}
                    onChangeText={setUpiId}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="name@okbank"
                    placeholderTextColor="#777"
                  />
                </>
              ) : (
                <>
                  <Text style={styles.label}>Account number</Text>
                  <TextInput
                    style={styles.input}
                    value={accountNumber}
                    onChangeText={(t) => setAccountNumber(t.replace(/\D/g, ""))}
                    keyboardType="number-pad"
                    placeholder="9 to 18 digits"
                    placeholderTextColor="#777"
                  />
                  <Text style={styles.label}>IFSC code</Text>
                  <TextInput
                    style={styles.input}
                    value={ifsc}
                    onChangeText={(t) => setIfsc(t.toUpperCase())}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    placeholder="SBIN0001234"
                    placeholderTextColor="#777"
                    maxLength={11}
                  />
                </>
              )}

              <Text style={styles.label}>Account holder name</Text>
              <TextInput
                style={styles.input}
                value={holder}
                onChangeText={setHolder}
                autoCapitalize="words"
                placeholder="As on your KYC document"
                placeholderTextColor="#777"
              />
              <Text style={styles.small}>The name must match your KYC document, or the request will be rejected and your coins returned.</Text>

              <TouchableOpacity
                accessibilityRole="button"
                disabled={sending}
                style={[styles.submit, sending && { opacity: 0.6 }]}
                onPress={submit}
              >
                {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Request withdrawal</Text>}
              </TouchableOpacity>
            </View>
          )}

          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>History</Text>
          {history.length === 0 ? (
            <Text style={styles.muted}>No withdrawals yet.</Text>
          ) : (
            history.map((w) => (
              <View key={w.id} style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>
                    {w.amount} · {w.coins.toLocaleString("en-IN")} coins
                  </Text>
                  <Text style={styles.small}>
                    {new Date(w.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} · {w.payTo}
                  </Text>
                  {w.status === "REJECTED" && !!w.rejectReason && <Text style={styles.small}>Reason: {w.rejectReason}</Text>}
                  {w.status === "PAID" && !!w.paymentRef && <Text style={styles.small}>Reference: {w.paymentRef}</Text>}
                </View>
                <Text style={[styles.status, { color: STATUS_COLOR[w.status] }]}>{w.status === "PAID" ? "Paid" : STATUS_LABEL[w.status].split(",")[0]}</Text>
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : null}
    </KeyboardAvoidingScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#3C2610", paddingTop: Platform.OS === "android" ? 20 : 0 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 20,
  },
  backButton: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  content: { padding: 16, gap: 16 },
  card: { backgroundColor: "#252525", borderRadius: 16, padding: 16 },
  big: { color: "#fff", fontSize: 36, fontWeight: "800", marginTop: 4 },
  amount: { color: "#EC9A15", fontSize: 16, fontWeight: "700", marginTop: 4 },
  muted: { color: "#999", fontSize: 14, textAlign: "left" },
  small: { color: "#999", fontSize: 12, marginTop: 6, lineHeight: 17 },
  link: { color: "#EC9A15", fontSize: 15, fontWeight: "600" },
  sectionTitle: { color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 8 },
  rowTitle: { color: "#fff", fontSize: 15, fontWeight: "600" },
  status: { fontSize: 13, fontWeight: "700", marginTop: 4 },
  notice: { backgroundColor: "rgba(236,154,21,0.12)", borderColor: "#EC9A15", borderWidth: 1, borderRadius: 12, padding: 14 },
  noticeText: { color: "#fff", fontSize: 14, lineHeight: 20 },
  label: { color: "#ccc", fontSize: 13, marginTop: 14, marginBottom: 6 },
  input: {
    backgroundColor: "#1A1A1A",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#444",
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    fontSize: 16,
  },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  maxButton: { backgroundColor: "#3C2610", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12 },
  maxText: { color: "#EC9A15", fontWeight: "700" },
  methodButton: { flex: 1, borderWidth: 1, borderColor: "#444", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  methodActive: { borderColor: "#EC9A15", backgroundColor: "rgba(236,154,21,0.15)" },
  methodText: { color: "#ccc", fontWeight: "600" },
  methodTextActive: { color: "#EC9A15" },
  submit: { backgroundColor: "#EC9A15", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 18 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  historyRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#252525", borderRadius: 12, padding: 14, gap: 10 },
});
