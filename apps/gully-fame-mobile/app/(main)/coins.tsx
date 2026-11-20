import { useState, useCallback } from "react";
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
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { BackIcon } from "@/icons";
import { WITHDRAW_MIN_COINS } from "@/config/features";
import {
  coinsToRupees,
  getWithdrawalSummary,
} from "@/api/services/withdrawalService";
import { getWalletSummary, toDisplayTransaction } from "@/api/services/walletService";
import { getErrorMessage } from "@/api/client";
import WithdrawPopup from "@/components/wallet/WithdrawPopup";
import { Skeleton, SkeletonGrid, SkeletonRoot } from "@/components/Skeleton/Skeleton";

// Same brown + orange palette as the rest of the app.
const C = {
  bg: "#3C2610",
  card: "#1A1A1A",
  inner: "#252525",
  border: "#2A2A2A",
  accent: "#EC9A15",
  accentLight: "#FFB84D",
  accentSoft: "rgba(236, 154, 21, 0.15)",
  text: "#FFFFFF",
  muted: "#CAD7D8",
  faint: "#8A8F90",
  credit: "#FFB84D",
  debit: "#FF6B6B",
};

type EarningRow = {
  id: string;
  amount: number;
  title: string;
  description: string;
  date: string;
  time: string;
  icon: string;
  type: "earned" | "spent";
};

export default function CoinsScreen() {
  const [walletBalance, setWalletBalance] = useState(0);
  const [coinValuePaise, setCoinValuePaise] = useState(0);
  const [rows, setRows] = useState<EarningRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [withdrawVisible, setWithdrawVisible] = useState(false);

  // Same data source as the Wallet screen. The coin value comes from the withdrawal summary.
  const fetchWalletData = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [wallet, withdrawSummary] = await Promise.all([
        getWalletSummary(),
        getWithdrawalSummary().catch(() => null),
      ]);
      setWalletBalance(wallet.balance);
      setCoinValuePaise(withdrawSummary?.coinValuePaise ?? 0);
      setRows(
        wallet.transactions.map((tx) => {
          const d = toDisplayTransaction(tx);
          return {
            id: d.id,
            amount: d.amount,
            title: d.title,
            description: d.description,
            date: d.date,
            time: d.time,
            icon: d.icon,
            type: d.type === "credit" ? "earned" : "spent",
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

  const balance = Math.floor(walletBalance);
  const canWithdraw = walletBalance >= WITHDRAW_MIN_COINS;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => router.back()} style={styles.headerSide}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>GFI Coins Earned</Text>
        <View style={styles.headerSide} />
      </View>

      <Text style={styles.subtitle}>
        Keep track of your coins from tips, prizes and referrals.
      </Text>

      {loading ? (
        <SkeletonRoot style={{ flex: 1, padding: 16, gap: 20 }}>
          <Skeleton height={170} radius={20} />
          <SkeletonGrid count={4} aspectRatio={1.4} />
        </SkeletonRoot>
      ) : loadError ? (
        <View style={styles.errorState}>
          <Ionicons name="cloud-offline-outline" size={48} color={C.faint} />
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity onPress={fetchWalletData} style={{ marginTop: 16 }}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Balance card */}
          <LinearGradient
            colors={[C.accent, "#B86E0A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <View style={styles.balanceTop}>
              <View style={{ flex: 1 }}>
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceAmount}>{balance.toLocaleString("en-IN")}</Text>
                  <Text style={styles.balanceUnit}>Coins</Text>
                </View>
                {coinValuePaise > 0 && (
                  <Text style={styles.balanceValue}>Est. value: {coinsToRupees(balance, coinValuePaise)}</Text>
                )}
              </View>
              <FontAwesome5 name="coins" size={44} color="rgba(255,255,255,0.9)" />
            </View>

            <View style={styles.balanceActions}>
              <TouchableOpacity
                style={styles.earnButton}
                activeOpacity={0.8}
                onPress={() => router.push("/(main)/invite-friend" as any)}
                accessibilityRole="button"
                accessibilityLabel="Earn more coins"
              >
                <Ionicons name="add" size={18} color={C.text} />
                <Text style={styles.earnButtonText}>Earn More</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.redeemButton}
                activeOpacity={0.8}
                onPress={() => setWithdrawVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Redeem coins"
              >
                <Text style={styles.redeemButtonText}>Redeem</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.progressText}>
              {canWithdraw
                ? "You can withdraw your earned coins. Paid within 24-48 hours."
                : `${balance.toLocaleString("en-IN")} / ${WITHDRAW_MIN_COINS.toLocaleString("en-IN")} coins to unlock withdrawal`}
            </Text>
          </LinearGradient>

          {/* Earnings history */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Earnings History</Text>
              <TouchableOpacity onPress={() => router.push("/(main)/history" as any)} accessibilityRole="button">
                <Text style={styles.viewAll}>View all</Text>
              </TouchableOpacity>
            </View>

            {rows.length > 0 ? (
              rows.map((item, index) => (
                <View key={item.id} style={[styles.row, index > 0 && styles.rowDivider]}>
                  <View style={styles.rowIcon}>
                    <Ionicons name={item.icon as any} size={20} color={C.accent} />
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle}>{item.title}</Text>
                    <Text style={styles.rowDesc} numberOfLines={1}>{item.description}</Text>
                    <Text style={styles.rowDate}>{item.date} • {item.time}</Text>
                  </View>
                  <Text style={[styles.rowAmount, { color: item.type === "earned" ? C.credit : C.debit }]}>
                    {item.type === "earned" ? "+" : "-"}
                    {item.amount.toLocaleString("en-IN")}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={40} color={C.faint} />
                <Text style={styles.emptyText}>No transactions yet</Text>
              </View>
            )}
          </View>

          <Text style={styles.footerNote}>
            Earned coins can be withdrawn once you reach the minimum amount.
          </Text>
        </ScrollView>
      )}

      <WithdrawPopup
        visible={withdrawVisible}
        onClose={() => setWithdrawVisible(false)}
        onWithdrawn={fetchWalletData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    paddingTop: Platform.OS === "android" ? 20 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "ios" ? 60 : 12,
    paddingBottom: 8,
  },
  headerSide: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: C.text,
    fontSize: 20,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  subtitle: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontFamily: "Rubik_400Regular",
    marginBottom: 18,
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // Balance card
  balanceCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  balanceTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  balanceAmount: {
    color: C.text,
    fontSize: 38,
    fontFamily: "Rubik_700Bold",
  },
  balanceUnit: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 18,
    fontFamily: "Rubik_500Medium",
  },
  balanceValue: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    marginTop: 2,
  },
  balanceActions: {
    flexDirection: "row",
    gap: 12,
  },
  earnButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.bg,
  },
  earnButtonText: {
    color: C.text,
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
  },
  redeemButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  redeemButtonText: {
    color: C.text,
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
  },
  progressText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
    fontFamily: "Rubik_400Regular",
  },

  // History card
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardTitle: {
    color: C.text,
    fontSize: 19,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  viewAll: {
    color: C.accent,
    fontSize: 14,
    fontFamily: "Rubik_600SemiBold",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.accentSoft,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rowInfo: {
    flex: 1,
    marginRight: 10,
  },
  rowTitle: {
    color: C.text,
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
  },
  rowDesc: {
    color: C.muted,
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    marginTop: 2,
  },
  rowDate: {
    color: C.faint,
    fontSize: 11,
    fontFamily: "Rubik_400Regular",
    marginTop: 3,
  },
  rowAmount: {
    fontSize: 15,
    fontFamily: "Rubik_700Bold",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 30,
  },
  emptyText: {
    color: C.faint,
    fontSize: 15,
    marginTop: 10,
    fontFamily: "Rubik_400Regular",
  },
  footerNote: {
    color: C.faint,
    fontSize: 12,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 17,
    fontFamily: "Rubik_400Regular",
  },

  // Error state
  errorState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    color: C.muted,
    marginTop: 12,
    textAlign: "center",
    fontFamily: "Rubik_400Regular",
  },
  retryText: {
    color: C.accent,
    fontSize: 16,
    fontFamily: "Rubik_600SemiBold",
  },
});
