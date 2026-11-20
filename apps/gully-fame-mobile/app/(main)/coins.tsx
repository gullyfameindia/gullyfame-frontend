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
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Circle } from "react-native-svg";
import { BackIcon } from "@/icons";
import { WITHDRAW_MIN_COINS, WITHDRAW_ROUTE } from "@/config/features";
import { openAddCoins } from "@/utils/coinPurchase";
import { getWalletSummary, toDisplayTransaction } from "@/api/services/walletService";
import { getErrorMessage } from "@/api/client";
import { Skeleton, SkeletonGrid, SkeletonRoot } from "@/components/Skeleton/Skeleton";

export default function CoinsScreen() {
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
  // Opens Add Money, or shows "coming soon" while coin buying is off.
  const handleAddMoney = () => openAddCoins({ fromCoins: "true" });

  return (
    <KeyboardAvoidingScreen style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2610" />

      {}
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10}
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
                  colors={["#FF6B35", "#EC9A15"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.addMoneyGradient}
                >
                  <Text style={styles.addMoneyText}>+ Add GFI Coins</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Withdraw: earned coins to UPI / bank (the Withdraw screen explains any limits) */}
              {availableBalance > 0 && (
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.withdrawButton}
                  onPress={() => router.push(WITHDRAW_ROUTE as any)}
                >
                  <Text style={styles.withdrawButtonText}>
                    Withdraw GFI Coins
                  </Text>
                </TouchableOpacity>
              )}

              {/* Progress toward the withdrawal goal */}
              <Text style={{ color: "#C9B9A6", fontSize: 13, textAlign: "center", marginTop: 10 }}>
                {availableBalance >= WITHDRAW_MIN_COINS
                  ? "You can withdraw earned coins. Paid within 24-48 hours."
                  : `${Math.floor(Math.max(0, availableBalance)).toLocaleString()} / ${WITHDRAW_MIN_COINS.toLocaleString()} coins to unlock withdrawal`}
              </Text>
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
    backgroundColor: "#EC9A15",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pendingText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
});
