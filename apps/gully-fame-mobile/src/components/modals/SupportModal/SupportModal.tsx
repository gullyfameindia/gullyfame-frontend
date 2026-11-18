import { useState, useEffect, useRef } from "react";
import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getWallet, tipReel } from "@/api/services/walletService";
import { ApiError, getErrorMessage } from "@/api/client";
import { toastError, toastSuccess } from "@/components/ui/Toast";
import { COIN_PURCHASE_ENABLED, EARN_COINS_MESSAGE } from "@/config/features";

interface SupportPackage {
  id: string;
  coins: number;
  label: string;
  price: number;
}

// Support amounts already used in the app (not from the backend, which has no amount list).
const SUPPORT_PACKAGES: SupportPackage[] = [
  { id: "1", coins: 5, label: "5 Coins", price: 5 },
  { id: "2", coins: 10, label: "10 Coins", price: 10 },
  { id: "3", coins: 25, label: "25 Coins", price: 25 },
  { id: "4", coins: 50, label: "50 Coins", price: 50 },
];

interface SupportModalProps {
  visible: boolean;
  onClose: () => void;
  creatorName: string;
  creatorId: string;
  reelId: string;
  onSupportSent?: () => void;
}

export default function SupportModal({
  visible,
  onClose,
  creatorName,
  creatorId,
  reelId,
  onSupportSent,
}: SupportModalProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedPackage, setSelectedPackage] = useState<SupportPackage | null>(SUPPORT_PACKAGES[0]);
  const [customAmount, setCustomAmount] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  // Synchronous lock so a fast double tap cannot send twice.
  const sendLock = useRef(false);

  // Reset the form and fetch a fresh balance every time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setSelectedPackage(SUPPORT_PACKAGES[0]);
    setCustomAmount("");
    setAgreed(false);
    fetchWalletBalance();
  }, [visible]);

  const fetchWalletBalance = async () => {
    setLoading(true);
    try {
      const wallet = await getWallet(1, 1);
      setWalletBalance(wallet.balance);
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const supportAmount = customAmount
    ? parseInt(customAmount, 10) || 0
    : selectedPackage?.coins || 0;

  const insufficient = !loading && supportAmount > 0 && supportAmount > walletBalance;
  const canSend = !loading && !sending && agreed && supportAmount > 0 && !insufficient;

  const goToWallet = () => {
    toastError("Insufficient balance. Please add coins to your wallet.");
    onClose();
    router.push("/(main)/coins" as any);
  };

  const handleSend = async () => {
    if (sendLock.current || !canSend) return;
    sendLock.current = true;
    setSending(true);
    try {
      // POST /reels/:reelId/tip. The API result is the final check on balance.
      const result = await tipReel(reelId, supportAmount);
      setWalletBalance(result.remainingBalance);
      toastSuccess(`You sent ${supportAmount} coins to ${creatorName}! 🎉`);
      onClose();
      onSupportSent?.();
    } catch (error) {
      const err = error as ApiError;
      toastError(err?.message || getErrorMessage(error));
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  };

  const sendLabel = `Send ${supportAmount} Coins`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Support @{creatorName}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            {/* Wallet Balance Card */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Your Wallet Balance</Text>
                {loading ? (
                  <ActivityIndicator color="#EC9A15" />
                ) : (
                  <Text style={styles.balanceAmount}>{walletBalance.toLocaleString()}</Text>
                )}
              </View>
              <Text style={styles.coinLabel}>GFI Coins</Text>
            </View>

            {/* Quick Packages */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Support Options</Text>
              <View style={styles.packagesGrid}>
                {SUPPORT_PACKAGES.map((pkg) => (
                  <TouchableOpacity
                    key={pkg.id}
                    style={[
                      styles.packageButton,
                      selectedPackage?.id === pkg.id && styles.packageButtonActive,
                      !!customAmount && styles.packageButtonDisabled,
                    ]}
                    onPress={() => {
                      setSelectedPackage(pkg);
                      setCustomAmount("");
                    }}
                    disabled={!!customAmount}
                  >
                    <Text
                      style={[
                        styles.packageCoins,
                        selectedPackage?.id === pkg.id && styles.packageCoinsActive,
                      ]}
                    >
                      {pkg.coins}
                    </Text>
                    <Text style={styles.packageLabel}>Coins</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Custom Amount */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Custom Amount</Text>
              <View style={styles.customInputContainer}>
                <TextInput
                  style={styles.customInput}
                  placeholder="Enter coin amount"
                  placeholderTextColor="#666"
                  keyboardType="number-pad"
                  value={customAmount}
                  onChangeText={(text) => {
                    setCustomAmount(text.replace(/\D/g, ""));
                    setSelectedPackage(null);
                    setAgreed(false);
                  }}
                />
              </View>
            </View>

            {/* Summary */}
            {supportAmount > 0 && (
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Support Amount</Text>
                  <Text style={styles.summaryValue}>{supportAmount}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Your Balance After</Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      { color: walletBalance - supportAmount >= 0 ? "#22C55E" : "#FF4444" },
                    ]}
                  >
                    {(walletBalance - supportAmount).toLocaleString()}
                  </Text>
                </View>
              </View>
            )}

            {/* Warning + confirmation (only when the amount can be sent) */}
            {supportAmount > 0 && !insufficient && (
              <>
                <View style={styles.warningCard}>
                  <Ionicons name="warning-outline" size={20} color="#EC9A15" />
                  <Text style={styles.warningText}>
                    Coins will be deducted from your wallet and sent to @{creatorName}. This action cannot be undone.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setAgreed((v) => !v)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: agreed }}
                >
                  <Ionicons
                    name={agreed ? "checkbox" : "square-outline"}
                    size={22}
                    color="#EC9A15"
                  />
                  <Text style={styles.checkboxText}>
                    I understand and want to send {supportAmount} coins
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {insufficient && (
              <Text style={styles.insufficientText}>
                {COIN_PURCHASE_ENABLED
                  ? `Insufficient balance. You need ${supportAmount} coins, you have ${walletBalance}.`
                  : `You need ${supportAmount} coins, you have ${walletBalance}. Earn coins by completing daily missions.`}
              </Text>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            {insufficient && COIN_PURCHASE_ENABLED ? (
              <TouchableOpacity style={styles.sendButton} onPress={goToWallet}>
                <Ionicons name="wallet-outline" size={20} color="#fff" />
                <Text style={styles.sendButtonText}>Add Coins</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={!canSend}
              >
                {sending ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.sendButtonText}>Sending...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="heart" size={20} color="#fff" />
                    <Text style={styles.sendButtonText}>{sendLabel}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={sending}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#3C2610",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flexShrink: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  balanceCard: {
    backgroundColor: "rgba(236, 154, 21, 0.15)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: "#EC9A15",
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  balanceLabel: {
    color: "#999",
    fontSize: 14,
  },
  balanceAmount: {
    color: "#EC9A15",
    fontSize: 24,
    fontWeight: "700",
  },
  coinLabel: {
    color: "#666",
    fontSize: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  packagesGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  packageButton: {
    flex: 1,
    backgroundColor: "#252525",
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: "#444",
    alignItems: "center",
    justifyContent: "center",
  },
  packageButtonActive: {
    borderColor: "#EC9A15",
    backgroundColor: "rgba(236, 154, 21, 0.1)",
  },
  packageButtonDisabled: {
    opacity: 0.5,
  },
  packageCoins: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  packageCoinsActive: {
    color: "#EC9A15",
  },
  packageLabel: {
    color: "#666",
    fontSize: 12,
  },
  customInputContainer: {
    backgroundColor: "#252525",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#444",
    overflow: "hidden",
  },
  customInput: {
    color: "#fff",
    padding: 12,
    fontSize: 14,
  },
  summaryCard: {
    backgroundColor: "#252525",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#444",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    color: "#999",
    fontSize: 14,
  },
  summaryValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  warningCard: {
    backgroundColor: "rgba(236, 154, 21, 0.1)",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  warningText: {
    color: "#E5DCD0",
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  checkboxText: {
    color: "#fff",
    fontSize: 14,
    flex: 1,
  },
  insufficientText: {
    color: "#FF6B6B",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#444",
    gap: 12,
  },
  sendButton: {
    backgroundColor: "#EC9A15",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    backgroundColor: "#444",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
});
