import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Platform,
  } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { safeBack } from "@/utils/safeBack";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { getWallet, toDisplayTransaction, DisplayTransaction } from "@/api/services/walletService";
import { getErrorMessage } from "@/api/client";
import { toastError } from "@/components/ui/Toast";
import { COIN_PURCHASE_ENABLED } from "@/config/features";
import WithdrawPopup from "@/components/wallet/WithdrawPopup";
import { openAddCoins } from "@/utils/coinPurchase";
import { Skeleton, SkeletonList, SkeletonRoot } from "@/components/Skeleton/Skeleton";

type Transaction = DisplayTransaction;

const PAGE_SIZE = 20;

// Same brown + orange palette as the rest of the app.
const C = {
  bg: "#3C2610",
  card: "#1A1A1A",
  cardInner: "#252525",
  border: "#2A2A2A",
  accent: "#EC9A15",
  accentLight: "#FFB84D",
  accentSoft: "rgba(236, 154, 21, 0.15)",
  text: "#FFFFFF",
  muted: "#CAD7D8",
  faint: "#8A8F90",
  credit: "#25D366",
  debit: "#FF4444",
};

export default function HistoryScreen() {
  const [filter, setFilter] = useState<"all" | "earned" | "spent">("all");
  const [transactionData, setTransactionData] = useState<Transaction[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [withdrawVisible, setWithdrawVisible] = useState(false);

  const fetchWalletData = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const wallet = await getWallet(1, PAGE_SIZE);
      setTotalBalance(wallet.balance);
      setTransactionData(wallet.transactions.map(toDisplayTransaction));
      setPage(1);
      setHasMore(wallet.hasMore);
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  // Synchronous lock: onEndReached can fire twice before state updates.
  const loadingMoreRef = useRef(false);
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const wallet = await getWallet(page + 1, PAGE_SIZE);
      setTransactionData((prev) => {
        // Never show the same transaction twice if a page overlaps.
        const seen = new Set(prev.map((tx) => tx.id));
        return [...prev, ...wallet.transactions.map(toDisplayTransaction).filter((tx) => !seen.has(tx.id))];
      });
      setPage(page + 1);
      setHasMore(wallet.hasMore);
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, page]);

  useFocusEffect(
    useCallback(() => {
      fetchWalletData();
    }, [fetchWalletData])
  );

  const filteredTransactions = transactionData.filter((item) => {
    if (filter === "all") return true;
    return item.kind === filter;
  });

  const filterTabs: { key: "all" | "earned" | "spent"; label: string }[] = [
    { key: "all", label: "All" },
    { key: "earned", label: "Earned" },
    { key: "spent", label: "Spent" },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => safeBack("/(main)/home")} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet & History</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <SkeletonRoot style={{ flex: 1, padding: 16, gap: 16 }}>
          <Skeleton height={140} radius={16} />
          <SkeletonList rows={6} trailing />
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
        <FlatList
          data={filteredTransactions}
          keyExtractor={(tx) => tx.id}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews
          ListHeaderComponent={
            <>
              <Text style={styles.subtitle}>
                Track your coins, withdraw your earnings and view your activity.
              </Text>

              {/* Wallet balance */}
              <Text style={styles.sectionTitle}>Wallet Balance</Text>
              <LinearGradient
                colors={[C.accent, "#B86E0A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.balanceCard}
              >
                <Text style={styles.balanceLabel}>Available balance</Text>
                <View style={styles.balanceRow}>
                  <FontAwesome5 name="coins" size={22} color={C.text} />
                  <Text style={styles.balanceAmount}>{Math.floor(totalBalance).toLocaleString()}</Text>
                  <Text style={styles.balanceUnit}>coins</Text>
                </View>

                <View style={styles.balanceActions}>
                  {COIN_PURCHASE_ENABLED && (
                  <TouchableOpacity
                    style={styles.addMoneyButton}
                    activeOpacity={0.8}
                    onPress={() => openAddCoins()}
                    accessibilityRole="button"
                    accessibilityLabel="Add money"
                  >
                    <Ionicons name="add" size={18} color={C.text} />
                    <Text style={styles.addMoneyText}>Add Money</Text>
                  </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.withdrawButton}
                    activeOpacity={0.8}
                    onPress={() => setWithdrawVisible(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Withdraw"
                  >
                    <Text style={styles.withdrawText}>Withdraw</Text>
                    <Ionicons name="arrow-forward" size={16} color={C.text} />
                  </TouchableOpacity>
                </View>
              </LinearGradient>

              <TouchableOpacity
                style={styles.earnLink}
                onPress={() => router.push("/(main)/invite-friend" as any)}
                activeOpacity={0.7}
              >
                <Ionicons name="gift-outline" size={16} color={C.accent} />
                <Text style={styles.earnLinkText}>Earn more coins</Text>
              </TouchableOpacity>

              {/* History: this card continues through the rows and closes in the footer */}
              <View style={styles.historyTop}>
                <View style={styles.historyHeaderRow}>
                  <Text style={styles.historyTitle}>History</Text>
                  <Text style={styles.historyCount}>
                    {filteredTransactions.length} {filteredTransactions.length === 1 ? "item" : "items"}
                  </Text>
                </View>
                <View style={styles.filterContainer}>
                  {filterTabs.map((tab) => {
                    const active = filter === tab.key;
                    return (
                      <TouchableOpacity
                        key={tab.key}
                        style={[styles.filterTab, active && styles.activeFilterTab]}
                        onPress={() => setFilter(tab.key)}
                        accessibilityRole="button"
                      >
                        <Text style={[styles.filterText, active && styles.activeFilterText]}>{tab.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </>
          }
          renderItem={({ item: tx }) => (
            <View style={styles.txRow}>
              <View style={styles.txIconContainer}>
                <Ionicons name={tx.icon as any} size={20} color={C.accent} />
              </View>

              <View style={styles.txDetails}>
                <Text style={styles.txTitle}>{tx.title}</Text>
                <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                <Text style={styles.txDate}>{tx.date} • {tx.time}</Text>
              </View>

              <View style={styles.txAmountContainer}>
                <Text style={[styles.txAmount, { color: tx.type === "credit" ? C.credit : C.debit }]}>
                  {tx.type === "credit" ? "+" : "-"}{tx.amount.toLocaleString()}
                </Text>
                <Text style={styles.txCoinText}>Coins</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={44} color={C.faint} />
              <Text style={styles.emptyStateText}>
                {filter === "all"
                  ? "No transactions yet"
                  : `No ${filter === "earned" ? "earned" : "spent"} transactions`}
              </Text>
            </View>
          }
          ListFooterComponent={
            <View style={styles.historyBottom}>
              {hasMore ? (
                <TouchableOpacity onPress={loadMore} disabled={loadingMore} style={styles.loadMore}>
                  {loadingMore ? (
                    <SkeletonList rows={2} avatarSize={40} />
                  ) : (
                    <Text style={styles.loadMoreText}>Load more</Text>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />
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
  backButton: {
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  subtitle: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontFamily: "Rubik_400Regular",
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 19,
    fontFamily: "PlayfairDisplay_700Bold",
    marginBottom: 10,
    marginTop: 8,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 20,
  },

  // Balance
  balanceCard: {
    borderRadius: 18,
    padding: 18,
  },
  balanceLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginTop: 6,
    marginBottom: 16,
  },
  balanceAmount: {
    color: C.text,
    fontSize: 36,
    fontFamily: "Rubik_700Bold",
  },
  balanceUnit: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    fontFamily: "Rubik_500Medium",
  },
  balanceActions: {
    flexDirection: "row",
    gap: 12,
  },
  addMoneyButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.bg,
  },
  addMoneyText: {
    color: C.text,
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
  },
  withdrawButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  withdrawText: {
    color: C.text,
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
  },
  earnLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  earnLinkText: {
    color: C.accent,
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
  },

  // Payment methods
  emptyMethods: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 10,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.accentSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyMethodsText: {
    color: C.faint,
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
  },
  addMethodButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.accent,
    backgroundColor: C.accentSoft,
  },
  addMethodText: {
    color: C.accent,
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
  },

  // History card (top piece, rows, bottom piece)
  historyTop: {
    backgroundColor: C.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    marginTop: 8,
  },
  historyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  historyTitle: {
    color: C.text,
    fontSize: 19,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  historyCount: {
    color: C.faint,
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
  },
  filterContainer: {
    flexDirection: "row",
    backgroundColor: C.cardInner,
    borderRadius: 12,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 8,
  },
  activeFilterTab: {
    backgroundColor: C.accentSoft,
  },
  filterText: {
    color: C.faint,
    fontSize: 14,
    fontFamily: "Rubik_600SemiBold",
  },
  activeFilterText: {
    color: C.accent,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  txIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.accentSoft,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  txDetails: {
    flex: 1,
    marginRight: 10,
  },
  txTitle: {
    color: C.text,
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
  },
  txDesc: {
    color: C.muted,
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    marginTop: 2,
  },
  txDate: {
    color: C.faint,
    fontSize: 11,
    fontFamily: "Rubik_400Regular",
    marginTop: 4,
  },
  txAmountContainer: {
    alignItems: "flex-end",
  },
  txAmount: {
    fontSize: 16,
    fontFamily: "Rubik_700Bold",
  },
  txCoinText: {
    color: C.faint,
    fontSize: 11,
    fontFamily: "Rubik_400Regular",
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    backgroundColor: C.card,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: C.border,
  },
  emptyStateText: {
    color: C.faint,
    fontSize: 15,
    marginTop: 12,
    fontFamily: "Rubik_400Regular",
  },
  historyBottom: {
    backgroundColor: C.card,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: C.border,
    marginBottom: 20,
    minHeight: 8,
  },
  loadMore: {
    alignItems: "center",
    paddingVertical: 16,
  },
  loadMoreText: {
    color: C.accent,
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
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
