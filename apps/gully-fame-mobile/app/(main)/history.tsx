

import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons, FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { getWallet, toDisplayTransaction, DisplayTransaction } from "@/api/services/walletService";
import { getErrorMessage } from "@/api/client";
import { toastError } from "@/components/ui/Toast";
import { Skeleton, SkeletonList, SkeletonRoot } from "@/components/Skeleton/Skeleton";

type Transaction = DisplayTransaction;

const PAGE_SIZE = 20;

const showWithdrawUnavailable = () =>
  Alert.alert("Withdrawals not available yet", "Cashing out coins isn't supported by the server yet.");

export default function HistoryScreen() {
  const [filter, setFilter] = useState<"all" | "earned" | "spent">("all");
  const [transactionData, setTransactionData] = useState<Transaction[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2610" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet & History</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <SkeletonRoot style={{ flex: 1, padding: 16, gap: 16 }}>
          <Skeleton height={120} radius={16} />
          <SkeletonList rows={6} trailing />
        </SkeletonRoot>
      ) : loadError ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          <Ionicons name="cloud-offline-outline" size={48} color="#666" />
          <Text style={{ color: "#ccc", marginTop: 12, textAlign: "center" }}>{loadError}</Text>
          <TouchableOpacity onPress={fetchWalletData} style={{ marginTop: 16 }}>
            <Text style={{ color: "#EC9A15", fontSize: 16 }}>Retry</Text>
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
        
        {/* Wallet Card */}
        <View style={styles.walletCard}>
          <Text style={styles.walletLabel}>Total Available Balance</Text>
          <View style={styles.balanceRow}>
            <FontAwesome5 name="coins" size={28} color="#EC9A15" style={styles.coinIcon} />
            <Text style={styles.balanceAmount}>{totalBalance.toLocaleString()}</Text>
          </View>
          
          <View style={styles.walletActions}>
            <TouchableOpacity 
              style={styles.addMoneyButton} 
              activeOpacity={0.8}
              onPress={() => router.push("/(main)/add-money" as any)}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.addMoneyButtonText}>Add Money</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.withdrawButton} 
              activeOpacity={0.8}
              onPress={showWithdrawUnavailable}
            >
              <MaterialIcons name="account-balance" size={20} color="#fff" />
              <Text style={styles.withdrawButtonText}>Withdraw</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.earnMoreButton} 
              onPress={() => router.push("/(main)/invite-friend" as any)} 
              activeOpacity={0.8}
            >
              <Ionicons name="gift" size={20} color="#EC9A15" />
              <Text style={styles.earnMoreText}>Earn More</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <TouchableOpacity 
            style={[styles.filterTab, filter === "all" && styles.activeFilterTab]} 
            onPress={() => setFilter("all")}
          >
            <Text style={[styles.filterText, filter === "all" && styles.activeFilterText]}>All</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterTab, filter === "earned" && styles.activeFilterTab]} 
            onPress={() => setFilter("earned")}
          >
            <Text style={[styles.filterText, filter === "earned" && styles.activeFilterText]}>Earned</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterTab, filter === "spent" && styles.activeFilterTab]} 
            onPress={() => setFilter("spent")}
          >
            <Text style={[styles.filterText, filter === "spent" && styles.activeFilterText]}>Spent</Text>
          </TouchableOpacity>
        </View>


              <View style={styles.transactionsContainer}>
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
              </View>
            </>
          }
          renderItem={({ item: tx }) => (
              <View style={styles.transactionCard}>
                <View style={styles.txIconContainer}>
                  <Ionicons name={tx.icon as any} size={24} color="#EC9A15" />
                </View>
                
                <View style={styles.txDetails}>
                  <Text style={styles.txTitle}>{tx.title}</Text>
                  <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text>
                  <Text style={styles.txDate}>{tx.date} • {tx.time}</Text>
                </View>
                
                <View style={styles.txAmountContainer}>
                  <Text style={[styles.txAmount, { color: tx.type === 'credit' ? '#25D366' : '#FF4444' }]}>
                    {tx.type === 'credit' ? '+' : '-'}{tx.amount.toLocaleString()}
                  </Text>
                  <Text style={styles.txCoinText}>Coins</Text>
                </View>
              </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={50} color="#666" />
              <Text style={styles.emptyStateText}>
                {filter === "all" 
                  ? "No transactions yet" 
                  : `No ${filter === "earned" ? "earned" : "spent"} transactions`}
              </Text>
            </View>
          }
          ListFooterComponent={
            hasMore ? (
            <TouchableOpacity onPress={loadMore} disabled={loadingMore} style={{ alignItems: "center", paddingVertical: 16 }}>
              {loadingMore ? (
                <ActivityIndicator color="#EC9A15" />
              ) : (
                <Text style={{ color: "#EC9A15", fontSize: 15 }}>Load more</Text>
              )}
            </TouchableOpacity>
              ) : null
          }
        />
      )}
    </View>
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
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  walletCard: {
    backgroundColor: "#252525",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.4)",
    marginBottom: 24,
    alignItems: "center",
    shadowColor: "#EC9A15",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  walletLabel: {
    color: "#ccc",
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  coinIcon: {
    marginRight: 10,
  },
  balanceAmount: {
    color: "#EC9A15",
    fontSize: 42,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  walletActions: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  addMoneyButton: {
    flex: 1,
    minWidth: 100,
    backgroundColor: "#FF6B35",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addMoneyButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  withdrawButton: {
    flex: 1,
    minWidth: 100,
    backgroundColor: "#EC9A15",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  withdrawButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  earnMoreButton: {
    flex: 1,
    minWidth: 100,
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EC9A15",
    gap: 8,
  },
  earnMoreText: {
    color: "#EC9A15",
    fontSize: 15,
    fontWeight: "700",
  },
  filterContainer: {
    flexDirection: "row",
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  activeFilterTab: {
    backgroundColor: "#252525",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  filterText: {
    color: "#888",
    fontSize: 14,
    fontWeight: "600",
  },
  activeFilterText: {
    color: "#fff",
  },
  transactionsContainer: {
    marginTop: 10,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  transactionCard: {
    flexDirection: "row",
    backgroundColor: "#252525",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.1)",
  },
  txIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(236, 154, 21, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  txDetails: {
    flex: 1,
    marginRight: 10,
  },
  txTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  txDesc: {
    color: "#aaa",
    fontSize: 12,
    marginBottom: 6,
  },
  txDate: {
    color: "#666",
    fontSize: 11,
  },
  txAmountContainer: {
    alignItems: "flex-end",
  },
  txAmount: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 2,
  },
  txCoinText: {
    color: "#888",
    fontSize: 11,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    color: "#666",
    fontSize: 15,
    marginTop: 12,
  },
});
