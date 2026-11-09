import { useState, useCallback } from "react";
import KeyboardAvoidingScreen from "@/components/KeyboardAvoidingScreen";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Circle } from "react-native-svg";
import { BackIcon } from "@/icons";
import { getWalletSummary, toDisplayTransaction } from "@/api/services/walletService";
import { getErrorMessage } from "@/api/client";
import { Skeleton, SkeletonGrid, SkeletonRoot } from "@/components/Skeleton/Skeleton";

export default function CoinsScreen() {
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    upiId: "",
    withdrawalMethod: "bank", 
    amount: "",
  });

  const [walletBalance, setWalletBalance] = useState(0);
  const [earnedTotal, setEarnedTotal] = useState(0);
  const [transactionHistory, setTransactionHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Same data source as Wallet history and the profile menu (getWalletSummary).
  const fetchWalletData = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const summary = await getWalletSummary();
      setWalletBalance(summary.balance);
      setEarnedTotal(summary.earned);
      setTransactionHistory(
        summary.transactions.map((tx) => {
          const display = toDisplayTransaction(tx);
          return {
            id: display.id,
            amount: display.amount,
            description: display.title,
            date: display.date,
            type: display.type === "credit" ? "earned" : "spent",
            status: "completed",
          };
        })
      );
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchWalletData();
    }, [fetchWalletData])
  );

  const availableBalance = walletBalance;
  const currentBalance = walletBalance;

  // Handle add money (redirect to add money modal or screen)
  const handleAddMoney = async () => {
    router.push({
      pathname: "/(main)/add-money",
      params: { fromCoins: "true" }
    } as any);
  };

  return (
    <KeyboardAvoidingScreen style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2610" />

      {}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>GFI Coins Earned</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <SkeletonRoot style={{ flex: 1, padding: 16, gap: 20 }}>
          <Skeleton height={160} radius={20} />
          <SkeletonGrid count={4} aspectRatio={1.4} />
        </SkeletonRoot>
      ) : loadError ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          <Text style={{ color: "#ccc", textAlign: "center" }}>{loadError}</Text>
          <TouchableOpacity onPress={fetchWalletData} style={{ marginTop: 16 }}>
            <Text style={{ color: "#EC9A15", fontSize: 16 }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {}
          <View style={styles.balanceCard}>
            <LinearGradient
              colors={["rgba(236, 154, 21, 0.2)", "rgba(236, 154, 21, 0.1)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.balanceGradient}
            >
              <Text style={styles.balanceLabel}>Current Balance</Text>
              <Text style={styles.balanceAmount}>
                {Math.floor(currentBalance).toLocaleString()} GFI coins
              </Text>
              <View style={styles.balanceStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Available</Text>
                  <Text style={styles.statValue}>
                    {Math.floor(availableBalance).toLocaleString()} GFI coins
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Earned</Text>
                  <Text style={styles.statValue}>
                    {Math.floor(earnedTotal).toLocaleString()} GFI coins
                  </Text>
                </View>
              </View>

              {/* Add Money Button - Inside Balance Card */}
              <TouchableOpacity
                style={styles.addMoneyButton}
                onPress={handleAddMoney}
              >
                <LinearGradient
                  colors={["#FF6B35", "#FF8C00"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.addMoneyGradient}
                >
                  <Text style={styles.addMoneyText}>+ Add GFI Coins</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Withdraw Button */}
              {availableBalance > 0 && (
                <TouchableOpacity
                  style={styles.withdrawButton}
                  onPress={() =>
                    Alert.alert(
                      "Withdrawals not available yet",
                      "Cashing out coins isn't supported by the server yet. Your coins stay safe in your wallet."
                    )
                  }
                >
                  <Text style={styles.withdrawButtonText}>
                    Withdraw GFI Coins
                  </Text>
                </TouchableOpacity>
              )}
            </LinearGradient>
          </View>

          {}
          <Text style={styles.sectionTitle}>Transaction History</Text>
          {transactionHistory.length > 0 ? (
            transactionHistory.map((item) => (
              <View key={item.id} style={styles.transactionCard}>
                <View style={styles.transactionHeader}>
                  <View style={styles.transactionIcon}>
                    <Circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill={item.type === "earned" ? "#22C55E" : "#FF6B35"}
                      opacity="0.2"
                    />
                    <Text style={styles.transactionIconText}>
                      {item.type === "earned" ? "+" : "-"}
                </Text>
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionDescription}>
                  {item.description}
                </Text>
                <View style={styles.transactionMeta}>
                  <Text style={styles.transactionDate}>{item.date}</Text>
                  {item.status === "pending" && (
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingText}>
                        Pending ({item.pendingTime || "Will be added in 1 hour"}
                        )
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <Text
                style={[
                  styles.transactionAmount,
                  item.type === "earned"
                    ? styles.amountEarned
                    : styles.amountSpent,
                ]}
              >
                {item.type === "earned" ? "+" : "-"}
                {item.amount.toLocaleString()} GFI coins
              </Text>
            </View>
          </View>
            ))
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Text style={{ color: "#999", fontSize: 16 }}>No transactions yet</Text>
            </View>
          )}
        </ScrollView>
      )}

      {}
      <Modal
        visible={showWithdrawModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowWithdrawModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Withdraw GFI Coins</Text>
              <TouchableOpacity onPress={() => setShowWithdrawModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.availableBalanceText}>
                Available Balance: {availableBalance.toLocaleString()} GFI coins
              </Text>

              <View style={styles.withdrawalMethodContainer}>
                <Text style={styles.sectionLabel}>Withdrawal Method</Text>
                <View style={styles.methodButtons}>
                  <TouchableOpacity
                    style={[
                      styles.methodButton,
                      withdrawForm.withdrawalMethod === "bank" &&
                        styles.methodButtonActive,
                    ]}
                    onPress={() =>
                      setWithdrawForm({
                        ...withdrawForm,
                        withdrawalMethod: "bank",
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.methodButtonText,
                        withdrawForm.withdrawalMethod === "bank" &&
                          styles.methodButtonTextActive,
                      ]}
                    >
                      Bank Transfer
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.methodButton,
                      withdrawForm.withdrawalMethod === "upi" &&
                        styles.methodButtonActive,
                    ]}
                    onPress={() =>
                      setWithdrawForm({
                        ...withdrawForm,
                        withdrawalMethod: "upi",
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.methodButtonText,
                        withdrawForm.withdrawalMethod === "upi" &&
                          styles.methodButtonTextActive,
                      ]}
                    >
                      UPI
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Amount (GFI coins)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter amount to withdraw"
                  placeholderTextColor="#666"
                  value={withdrawForm.amount}
                  onChangeText={(text) =>
                    setWithdrawForm({ ...withdrawForm, amount: text })
                  }
                  keyboardType="numeric"
                />
                <Text style={styles.inputHint}>
                  Maximum: {availableBalance.toLocaleString()} GFI coins
                </Text>
              </View>

              {withdrawForm.withdrawalMethod === "bank" ? (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Account Holder Name *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter account holder name"
                      placeholderTextColor="#666"
                      value={withdrawForm.accountHolderName}
                      onChangeText={(text) =>
                        setWithdrawForm({
                          ...withdrawForm,
                          accountHolderName: text,
                        })
                      }
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Account Number *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter account number"
                      placeholderTextColor="#666"
                      value={withdrawForm.accountNumber}
                      onChangeText={(text) =>
                        setWithdrawForm({
                          ...withdrawForm,
                          accountNumber: text,
                        })
                      }
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>IFSC Code *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter IFSC code"
                      placeholderTextColor="#666"
                      value={withdrawForm.ifscCode}
                      onChangeText={(text) =>
                        setWithdrawForm({
                          ...withdrawForm,
                          ifscCode: text.toUpperCase(),
                        })
                      }
                      autoCapitalize="characters"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Bank Name *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter bank name"
                      placeholderTextColor="#666"
                      value={withdrawForm.bankName}
                      onChangeText={(text) =>
                        setWithdrawForm({ ...withdrawForm, bankName: text })
                      }
                    />
                  </View>
                </>
              ) : (
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>UPI ID *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter UPI ID (e.g., yourname@paytm)"
                    placeholderTextColor="#666"
                    value={withdrawForm.upiId}
                    onChangeText={(text) =>
                      setWithdrawForm({ ...withdrawForm, upiId: text })
                    }
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              )}

              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => {
                  
                  if (
                    !withdrawForm.amount ||
                    parseFloat(withdrawForm.amount) <= 0
                  ) {
                    Alert.alert("Error", "Please enter a valid amount");
                    return;
                  }
                  if (parseFloat(withdrawForm.amount) > availableBalance) {
                    Alert.alert("Error", "Amount exceeds available balance");
                    return;
                  }
                  if (withdrawForm.withdrawalMethod === "bank") {
                    if (
                      !withdrawForm.accountHolderName ||
                      !withdrawForm.accountNumber ||
                      !withdrawForm.ifscCode ||
                      !withdrawForm.bankName
                    ) {
                      Alert.alert("Error", "Please fill all bank details");
                      return;
                    }
                  } else {
                    if (!withdrawForm.upiId) {
                      Alert.alert("Error", "Please enter UPI ID");
                      return;
                    }
                  }

                  
                  Alert.alert(
                    "Withdrawal Request Submitted",
                    `Your withdrawal request for ${withdrawForm.amount} GFI coins has been submitted. It will be processed within 24-48 hours.`,
                    [
                      {
                        text: "OK",
                        onPress: () => {
                          setShowWithdrawModal(false);
                          setWithdrawForm({
                            accountHolderName: "",
                            accountNumber: "",
                            ifscCode: "",
                            bankName: "",
                            upiId: "",
                            withdrawalMethod: "bank",
                            amount: "",
                          });
                        },
                      },
                    ],
                  );
                }}
              >
                <Text style={styles.submitButtonText}>
                  Submit Withdrawal Request
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3C2610",
    paddingTop: Platform.OS === "android" ? 20 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  balanceCard: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.3)",
  },
  balanceGradient: {
    padding: 20,
  },
  balanceLabel: {
    color: "#999",
    fontSize: 14,
    marginBottom: 8,
  },
  balanceAmount: {
    color: "#EC9A15",
    fontSize: 32,
    marginBottom: 20,
  },
  balanceStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    color: "#999",
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: "#fff",
    fontSize: 16,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    marginBottom: 12,
  },
  transactionCard: {
    backgroundColor: "#252525",
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  transactionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  transactionIconText: {
    position: "absolute",
    color: "#fff",
    fontSize: 20,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 4,
  },
  transactionDate: {
    color: "#999",
    fontSize: 12,
  },
  transactionAmount: {
    fontSize: 16,
  },
  amountEarned: {
    color: "#22C55E",
  },
  amountSpent: {
    color: "#FF6B35",
  },
  addCoinsButton: {
    marginTop: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  addCoinsGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  addCoinsText: {
    color: "#fff",
    fontSize: 16,
  },
  withdrawButton: {
    marginTop: 16,
    backgroundColor: "#EC9A15",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  withdrawButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  addMoneyButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addMoneyGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    minHeight: 48,
  },
  addMoneyText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  transactionMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  pendingBadge: {
    backgroundColor: "#FFA500",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pendingText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#3C2610",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  modalClose: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "300",
  },
  modalBody: {
    padding: 20,
  },
  availableBalanceText: {
    color: "#EC9A15",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  withdrawalMethodContainer: {
    marginBottom: 20,
  },
  sectionLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },
  methodButtons: {
    flexDirection: "row",
    gap: 12,
  },
  methodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#666",
    alignItems: "center",
  },
  methodButtonActive: {
    borderColor: "#EC9A15",
    backgroundColor: "rgba(236, 154, 21, 0.1)",
  },
  methodButtonText: {
    color: "#999",
    fontSize: 14,
    fontWeight: "500",
  },
  methodButtonTextActive: {
    color: "#EC9A15",
  },
  formGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#252525",
    borderRadius: 12,
    padding: 14,
    color: "#fff",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#444",
  },
  inputHint: {
    color: "#999",
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: "#EC9A15",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
