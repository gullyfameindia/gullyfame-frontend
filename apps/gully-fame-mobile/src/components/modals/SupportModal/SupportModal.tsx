import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Coins, UserPlus, Wallet, X } from "lucide-react-native";
import { getWallet, tipReel } from "@/api/services/walletService";
import { getErrorMessage } from "@/api/client";
import { toastSuccess } from "@/components/ui/Toast";
import { COIN_PURCHASE_ENABLED } from "@/config/features";
import { colors, font, radius, space } from "@/theme/tokens";

// Quick amounts (the backend has no list; any whole number is accepted).
const QUICK_AMOUNTS = [5, 10, 25, 50];
/** Largest amount accepted in the custom field; the server also enforces a daily limit. */
const MAX_AMOUNT = 100000;

interface SupportModalProps {
  visible: boolean;
  onClose: () => void;
  creatorName: string;
  creatorId: string;
  reelId: string;
  onSupportSent?: () => void;
}

export default function SupportModal({ visible, onClose, creatorName, reelId, onSupportSent }: SupportModalProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState<number>(QUICK_AMOUNTS[0]);
  const [custom, setCustom] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  // Synchronous lock so a fast double tap cannot send twice.
  const sendLock = useRef(false);

  const loadBalance = async () => {
    setBalance(null);
    setBalanceError("");
    try {
      setBalance((await getWallet(1, 1)).balance);
    } catch (error) {
      setBalanceError(getErrorMessage(error));
    }
  };

  // Fresh form and balance every time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setAmount(QUICK_AMOUNTS[0]);
    setCustom("");
    setConfirmed(false);
    setSendError("");
    loadBalance();
  }, [visible]);

  const value = custom ? Math.min(parseInt(custom, 10) || 0, MAX_AMOUNT) : amount;
  const loadingBalance = balance === null && !balanceError;
  const noCoins = balance !== null && balance < 1;
  const tooMuch = balance !== null && value > balance;
  const canSend = !sending && balance !== null && value > 0 && !tooMuch && confirmed;

  const handle = creatorName.replace(/^@+/, "");

  const pick = (n: number) => {
    setAmount(n);
    setCustom("");
    setConfirmed(false);
    setSendError("");
  };

  const goEarn = () => {
    onClose();
    router.push((COIN_PURCHASE_ENABLED ? "/(main)/coins" : "/(main)/invite-friend") as any);
  };

  const send = async () => {
    if (sendLock.current || !canSend) return;
    sendLock.current = true;
    setSending(true);
    setSendError("");
    try {
      // POST /reels/:reelId/tip. The server is the final check on balance and limits.
      const result = await tipReel(reelId, value);
      setBalance(result.remainingBalance);
      toastSuccess(`You sent ${value} coins to @${handle}`);
      onClose();
      onSupportSent?.();
    } catch (error) {
      // Daily limit, new-account wait, low balance...: shown here so the sheet stays open.
      setSendError(getErrorMessage(error));
      setConfirmed(false);
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={sending ? undefined : onClose} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        <View style={styles.grabber} />

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>Support @{handle}</Text>
            <Text style={styles.subtitle}>Send coins from your wallet to this creator.</Text>
          </View>
          <TouchableOpacity onPress={onClose} disabled={sending} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
            <X size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.balanceRow}>
            <Wallet size={18} color={colors.accent} strokeWidth={2} />
            <Text style={styles.balanceLabel}>Your balance</Text>
            {loadingBalance ? (
              <ActivityIndicator color={colors.accent} />
            ) : balanceError ? (
              <TouchableOpacity onPress={loadBalance}>
                <Text style={styles.retry}>Retry</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.balanceValue}>{balance!.toLocaleString("en-IN")} coins</Text>
            )}
          </View>
          {balanceError ? <Text style={styles.errorText}>{balanceError}</Text> : null}

          {noCoins ? (
            // Nothing to send yet: say why and where coins come from.
            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>You don&apos;t have any coins yet</Text>
              <Text style={styles.noticeText}>
                {COIN_PURCHASE_ENABLED
                  ? "Add coins to your wallet to support creators."
                  : "Earn coins by inviting friends and winning competitions, then come back to support creators."}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.label}>Amount</Text>
              <View style={styles.amounts}>
                {QUICK_AMOUNTS.map((n) => {
                  const on = !custom && amount === n;
                  const disabled = balance !== null && n > balance;
                  return (
                    <TouchableOpacity
                      key={n}
                      style={[styles.amount, on && styles.amountOn, disabled && styles.amountDisabled]}
                      onPress={() => pick(n)}
                      disabled={disabled}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on, disabled }}
                    >
                      <Coins size={14} color={on ? colors.accent : colors.textMuted} strokeWidth={2} />
                      <Text style={[styles.amountText, on && styles.amountTextOn]}>{n}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={[styles.customWrap, !!custom && styles.customWrapOn]}>
                <TextInput
                  style={styles.customInput}
                  value={custom}
                  onChangeText={(t) => {
                    setCustom(t.replace(/\D/g, "").slice(0, 6));
                    setConfirmed(false);
                    setSendError("");
                  }}
                  placeholder="Other amount"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                  testID="support-custom-amount"
                />
                <Text style={styles.customSuffix}>coins</Text>
              </View>

              {tooMuch ? (
                <Text style={styles.errorText}>
                  You have {balance} coins. Choose {balance} or less.
                </Text>
              ) : value > 0 && balance !== null ? (
                <Text style={styles.after}>Balance after: {(balance - value).toLocaleString("en-IN")} coins</Text>
              ) : null}

              {value > 0 && !tooMuch && balance !== null ? (
                <TouchableOpacity
                  style={styles.confirmRow}
                  onPress={() => setConfirmed((v) => !v)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: confirmed }}
                  testID="support-confirm"
                >
                  <View style={[styles.box, confirmed && styles.boxOn]}>
                    {confirmed ? <Check size={14} color="#1A1A1A" strokeWidth={3} /> : null}
                  </View>
                  <Text style={styles.confirmText}>
                    Send {value} coins to @{handle}. This can&apos;t be undone.
                  </Text>
                </TouchableOpacity>
              ) : null}

              {sendError ? <Text style={[styles.errorText, { marginTop: space.md }]}>{sendError}</Text> : null}
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {noCoins ? (
            <TouchableOpacity style={styles.primary} onPress={goEarn} accessibilityRole="button">
              {COIN_PURCHASE_ENABLED ? <Wallet size={18} color="#1A1A1A" /> : <UserPlus size={18} color="#1A1A1A" />}
              <Text style={styles.primaryText}>{COIN_PURCHASE_ENABLED ? "Add coins" : "Invite friends to earn coins"}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primary, !canSend && styles.primaryDisabled]}
              onPress={send}
              disabled={!canSend}
              accessibilityRole="button"
              testID="support-send"
            >
              {sending ? (
                <ActivityIndicator color="#1A1A1A" />
              ) : (
                <>
                  <Coins size={18} color="#1A1A1A" strokeWidth={2} />
                  <Text style={styles.primaryText}>{value > 0 ? `Send ${value} coins` : "Send coins"}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)" },
  sheet: {
    maxHeight: "88%",
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: colors.cardBorder,
    paddingTop: space.sm,
  },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: space.md },
  header: { flexDirection: "row", alignItems: "flex-start", gap: space.md, paddingHorizontal: space.xl, paddingBottom: space.md },
  title: { color: colors.text, fontSize: 20, fontFamily: font.titleMedium },
  subtitle: { color: colors.textMuted, fontSize: 13, fontFamily: font.regular, marginTop: 2 },

  body: { paddingHorizontal: space.xl, paddingBottom: space.md },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.field,
  },
  balanceLabel: { flex: 1, color: colors.textBody, fontSize: 14, fontFamily: font.medium },
  balanceValue: { color: colors.accent, fontSize: 15, fontFamily: font.bold },
  retry: { color: colors.accent, fontSize: 14, fontFamily: font.semibold },

  label: { color: colors.textBody, fontSize: 13, fontFamily: font.semibold, marginTop: space.xl, marginBottom: space.sm },
  amounts: { flexDirection: "row", gap: space.sm },
  amount: {
    flex: 1,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: radius.md,
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.line,
  },
  amountOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  amountDisabled: { opacity: 0.35 },
  amountText: { color: colors.text, fontSize: 15, fontFamily: font.semibold },
  amountTextOn: { color: colors.accent },

  customWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: space.sm,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.line,
  },
  customWrapOn: { borderColor: colors.accent },
  customInput: { flex: 1, height: "100%", color: colors.text, fontSize: 15, fontFamily: font.regular, paddingVertical: 0 },
  customSuffix: { color: colors.textMuted, fontSize: 13, fontFamily: font.regular },

  after: { color: colors.textMuted, fontSize: 12, fontFamily: font.regular, marginTop: space.sm },
  errorText: { color: colors.danger, fontSize: 13, lineHeight: 18, fontFamily: font.medium, marginTop: space.sm },

  confirmRow: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.lg },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  boxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  confirmText: { flex: 1, color: colors.textBody, fontSize: 13, lineHeight: 18, fontFamily: font.regular },

  notice: { marginTop: space.lg, padding: 14, borderRadius: radius.md, backgroundColor: colors.accentSoft },
  noticeTitle: { color: colors.text, fontSize: 15, fontFamily: font.semibold },
  noticeText: { color: colors.textBody, fontSize: 13, lineHeight: 19, fontFamily: font.regular, marginTop: 4 },

  footer: { paddingHorizontal: space.xl, paddingTop: space.md },
  primary: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  primaryDisabled: { opacity: 0.45 },
  primaryText: { color: "#1A1A1A", fontSize: 16, fontFamily: font.bold },
});
