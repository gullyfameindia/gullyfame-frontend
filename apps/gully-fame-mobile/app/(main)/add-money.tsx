import { useState, useCallback } from "react";
import KeyboardAvoidingScreen from "@/components/KeyboardAvoidingScreen";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform, Alert, ActivityIndicator, TextInput } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { BackIcon } from "@/icons";
import { getWallet, rechargeWallet, RECHARGE_LIMITS } from "@/api/services/walletService";
import { getProfile, displayName } from "@/api/services/userService";
import { getErrorMessage } from "@/api/client";
import { toastError, toastSuccess } from "@/components/ui/Toast";

interface CoinPackage {
  id: string;
  coins: number;
  finalPrice: number;
  popular?: boolean;
}

// The backend accepts any whole amount within RECHARGE_LIMITS at 1 coin per rupee;
// these are quick picks, the custom field covers any other amount.
const QUICK_AMOUNTS = [50, 100, 250, 500, 1000, 2000];
const COIN_PACKAGES: CoinPackage[] = QUICK_AMOUNTS.map((amount) => ({
  id: String(amount),
  coins: amount,
  finalPrice: amount,
  popular: amount === 250,
}));

export default function AddMoneyScreen() {
  const coinPackages = COIN_PACKAGES;
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(
    COIN_PACKAGES.find((p) => p.popular) || null
  );
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [userInfo, setUserInfo] = useState({ email: "", phone: "", name: "" });

  const loadDetails = useCallback(async () => {
    setLoading(true);
    try {
      const [wallet, profile] = await Promise.all([getWallet(1, 1), getProfile()]);
      setBalance(wallet.balance);
      setUserInfo({
        email: profile.email || "",
        phone: profile.mobile || "",
        name: displayName(profile),
      });
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDetails();
    }, [loadDetails])
  );

  const handleCustomAmount = (text: string) => {
    const digits = text.replace(/[^0-9]/g, "").slice(0, 6);
    setCustomAmount(digits);
    if (digits) {
      const amount = parseInt(digits, 10);
      setSelectedPackage({ id: "custom", coins: amount, finalPrice: amount });
    } else {
      setSelectedPackage(null);
    }
  };

  const handlePayment = async (packageData: CoinPackage) => {
    if (processing) return;
    setProcessing(true);
    try {
      const outcome = await rechargeWallet(packageData.finalPrice, {
        name: userInfo.name || undefined,
        email: userInfo.email || undefined,
        contact: userInfo.phone || undefined,
      });
      if (outcome.status === "paid") {
        if (typeof outcome.balance === "number") setBalance(outcome.balance);
        toastSuccess(`${packageData.coins} GFI coins added to your wallet.`);
        router.back();
      } else if (outcome.status === "pending") {
        Alert.alert("Payment processing", outcome.message);
      } else if (outcome.status === "failed") {
        Alert.alert("Payment failed", outcome.message);
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <KeyboardAvoidingScreen style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2610" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add GFI Coins</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#EC9A15" />
          <Text style={{ color: "#999", marginTop: 12 }}>Loading wallet...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {balance !== null && (
            <Text style={styles.sectionTitle}>Current balance: {balance.toLocaleString()} GFI Coins</Text>
          )}

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color="#EC9A15" />
            <Text style={styles.infoText}>
              GFI coins can be used to support creators and participate in exclusive competitions.
            </Text>
          </View>

          {/* Coin Packages Grid */}
          <Text style={styles.sectionTitle}>Choose a Package</Text>
          <View style={styles.packagesGrid}>
            {coinPackages.map((pkg) => (
              <TouchableOpacity
                key={pkg.id}
                style={[
                  styles.packageCard,
                  selectedPackage?.id === pkg.id && styles.packageCardSelected,
                ]}
                onPress={() => {
                  setCustomAmount("");
                  setSelectedPackage(pkg);
                }}
                disabled={processing}
              >
                {pkg.popular && (
                  <LinearGradient
                    colors={["#EC9A15", "#FF6B35"]}
                    style={styles.popularBadge}
                  >
                    <Text style={styles.popularBadgeText}>Popular</Text>
                  </LinearGradient>
                )}

                <Text style={styles.coinAmount}>{pkg.coins}</Text>
                <Text style={styles.coinLabel}>GFI Coins</Text>

                <Text style={styles.finalPrice}>₹{pkg.finalPrice}</Text>

              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Or enter an amount</Text>
          <TextInput
            style={styles.customAmountInput}
            value={customAmount}
            onChangeText={handleCustomAmount}
            keyboardType="number-pad"
            placeholder={`₹${RECHARGE_LIMITS.min} – ₹${RECHARGE_LIMITS.max.toLocaleString("en-IN")}`}
            placeholderTextColor="#999"
            editable={!processing}
          />

          {/* Selected Package Details */}
          {selectedPackage && (
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Coins</Text>
                <Text style={styles.detailValue}>{selectedPackage.coins}</Text>
              </View>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Price</Text>
                <Text style={[styles.detailValue, { fontSize: 20 }]}>
                  ₹{selectedPackage.finalPrice}
                </Text>
              </View>
            </View>
          )}

          {/* Payment Info */}
          <View style={styles.paymentInfoCard}>
            <Text style={styles.paymentInfoTitle}>Payment Details</Text>
            <View style={styles.paymentInfoItem}>
              <Text style={styles.paymentInfoLabel}>Email:</Text>
              <Text style={styles.paymentInfoValue}>{userInfo.email || "Not provided"}</Text>
            </View>
            <View style={styles.paymentInfoItem}>
              <Text style={styles.paymentInfoLabel}>Phone:</Text>
              <Text style={styles.paymentInfoValue}>{userInfo.phone || "Not provided"}</Text>
            </View>
            <Text style={styles.paymentNote}>
              💳 Payments are processed securely through Razorpay. Your payment information is encrypted and safe.
            </Text>
          </View>

          {/* Payment Button */}
          {selectedPackage && (
            <TouchableOpacity
              style={[styles.paymentButton, processing && styles.paymentButtonDisabled]}
              onPress={() => handlePayment(selectedPackage)}
              disabled={processing}
            >
              {processing ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.paymentButtonText}>Processing...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="card" size={20} color="#fff" />
                  <Text style={styles.paymentButtonText}>
                    Pay ₹{selectedPackage.finalPrice} Now
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Spacing */}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </KeyboardAvoidingScreen>
  );
}

const styles = StyleSheet.create({
  customAmountInput: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(236,154,21,0.4)",
    color: "#FFFFFF",
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
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
    fontWeight: "600",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  infoCard: {
    backgroundColor: "rgba(236, 154, 21, 0.1)",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: "#EC9A15",
  },
  infoText: {
    color: "#CCCCCC",
    fontSize: 14,
    flex: 1,
    marginLeft: 12,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  packagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 12,
  },
  packageCard: {
    width: "48%",
    backgroundColor: "#252525",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "#444",
    alignItems: "center",
  },
  packageCardSelected: {
    borderColor: "#EC9A15",
    backgroundColor: "rgba(236, 154, 21, 0.08)",
  },
  popularBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
    borderTopRightRadius: 14,
  },
  popularBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  coinAmount: {
    color: "#EC9A15",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 8,
  },
  coinLabel: {
    color: "#999",
    fontSize: 12,
    marginBottom: 8,
  },
  originalPrice: {
    color: "#666",
    fontSize: 12,
    textDecorationLine: "line-through",
  },
  discountBadge: {
    color: "#22C55E",
    fontSize: 12,
    fontWeight: "600",
    marginVertical: 4,
  },
  finalPrice: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginVertical: 8,
  },
  bonusBox: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
  },
  bonusText: {
    color: "#22C55E",
    fontSize: 12,
    fontWeight: "600",
  },
  detailsCard: {
    backgroundColor: "#252525",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#444",
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  detailLabel: {
    color: "#999",
    fontSize: 14,
    fontWeight: "500",
  },
  detailValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  detailDivider: {
    height: 1,
    backgroundColor: "#444",
  },
  paymentInfoCard: {
    backgroundColor: "#252525",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#444",
    marginBottom: 20,
  },
  paymentInfoTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  paymentInfoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  paymentInfoLabel: {
    color: "#999",
    fontSize: 14,
  },
  paymentInfoValue: {
    color: "#fff",
    fontSize: 14,
  },
  paymentNote: {
    color: "#666",
    fontSize: 12,
    marginTop: 12,
    fontStyle: "italic",
  },
  paymentButton: {
    backgroundColor: "#EC9A15",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
  },
  paymentButtonDisabled: {
    opacity: 0.6,
  },
  paymentButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
