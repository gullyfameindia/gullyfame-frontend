import { useState, useEffect } from "react";
import { getWalletBalance } from "@/api/services/walletService";
import { safeDecode } from "@/utils/routeParams";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
  Modal,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { joinCompetition } from "@/api/services/competitionService";
import { ApiError, getErrorMessage } from "@/api/client";
import { openCompetition } from "@/utils/openCompetition";
import { toastError, toastSuccess } from "@/components/ui/Toast";
import Svg, { Path, Circle } from "react-native-svg";


import { getUserSession } from "@utils/userSession";



const paymentMethods = [
  
  
  { id: "wallet", label: "GFI Coins Wallet", helper: "Use available coin balance" },
];

export default function CompetitionPaymentScreen() {
  const params = useLocalSearchParams();
  const competitionId = params.competitionId ? String(params.competitionId) : "";
  const competitionNameParam = params.competitionName ? String(params.competitionName) : "";
  const entryFeeParam = params.entryFee ? String(params.entryFee) : "";

  const competitionName = competitionNameParam ? safeDecode(competitionNameParam) : "Gully Fame Competition";
  const entryFee = entryFeeParam ? safeDecode(entryFeeParam) : "Free Entry";
  
  const [selectedMethod, setSelectedMethod] = useState("wallet");
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [, setUserSession] = useState<any>(null);
  // Real wallet balance (null while loading, -1 if it could not be loaded).
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    getWalletBalance().then((result) => {
      if (!active) return;
      setWalletBalance(result.success && result.data ? result.data.balance : -1);
    });
    return () => {
      active = false;
    };
  }, []);

  
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const session = await getUserSession();
        setUserSession(session);
      } catch { /* intentionally ignored */
      }
    };
    loadUserData();
  }, []);

  // The backend joins competitions for free (POST /competitions/:id/join) and has
  // no entry-fee payment endpoint, so "pay" registers the user directly.
  const handlePay = async () => {
    if (isProcessing || !competitionId) return;
    setIsProcessing(true);
    try {
      await joinCompetition(competitionId);
      toastSuccess("You're registered for this competition!");
    } catch (error) {
      if ((error as ApiError)?.key !== "already_joined") {
        toastError(getErrorMessage(error));
        return;
      }
    } finally {
      setIsProcessing(false);
    }
    openCompetition(competitionId);
  };

  const handleCloseModal = () => {
    setShowApprovalModal(false);
    openCompetition(competitionId);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2610" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pay Entry Fee</Text>
          <View style={styles.headerBackButton} />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Competition</Text>
          <Text style={styles.summaryValue}>{competitionName}</Text>
          <View style={styles.summaryDivider} />
          <Text style={styles.summaryLabel}>Entry Fee</Text>
          <Text style={[styles.summaryValue, { color: "#FFD700" }]}>{entryFee}</Text>
          <Text style={styles.summaryHint}>
            Entry-fee payments aren&apos;t available yet, so joining is free for now.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>
          {paymentMethods.map((method) => {
            const isActive = selectedMethod === method.id;
            return (
              <TouchableOpacity
                key={method.id}
                onPress={() => setSelectedMethod(method.id)}
                activeOpacity={0.85}
                style={[styles.methodCard, isActive && styles.methodCardActive]}
              >
                <View>
                  <Text style={[styles.methodLabel, isActive && styles.methodLabelActive]}>{method.label}</Text>
                  <Text style={styles.methodHelper}>{method.helper}</Text>
                </View>
                <View style={[styles.radioOuter, isActive && styles.radioOuterActive]}>
                  {isActive && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.walletCard}>
          <View>
            <Text style={styles.walletLabel}>Wallet Balance</Text>
            <Text style={styles.walletValue}>
              {walletBalance === null ? "..." : walletBalance < 0 ? "Unavailable" : `${walletBalance.toLocaleString()} coins`}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.walletButton}
            onPress={() => router.push("/(main)/add-money" as any)}
          >
            <Text style={styles.walletButtonText}>Add Coins</Text>
          </TouchableOpacity>
        </View>

        <LinearGradient
          colors={['#1F1F1F', '#121212']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.breakdownCard}
        >
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Entry Fee</Text>
            <Text style={styles.breakdownValue}>{entryFee}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Platform Safety Fee</Text>
            <Text style={styles.breakdownValue}>₹0 (Waived)</Text>
          </View>
          <View style={styles.breakdownDivider} />
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownTotal}>Total payable</Text>
            <Text style={styles.breakdownTotal}>{entryFee}</Text>
          </View>
        </LinearGradient>

        <TouchableOpacity 
          style={[styles.payButton, isProcessing && styles.payButtonDisabled]} 
          activeOpacity={0.85} 
          onPress={handlePay}
          disabled={isProcessing}
        >
          <LinearGradient
            colors={isProcessing ? ['#666', '#555'] : ['#FF6B35', '#FF8C00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.payGradient}
          >
            {isProcessing ? (
              <View style={styles.payButtonLoading}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.payButtonText}>Processing...</Text>
              </View>
            ) : (
              <Text style={styles.payButtonText}>Pay & Submit Entry</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.supportLink} onPress={() => Alert.alert("Need help?", "Contact support@gullyfame.com")}>
          <Text style={styles.supportText}>Having issues with payment?</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Approval Pending Modal */}
      <Modal
        visible={showApprovalModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Circle cx="30" cy="30" r="28" fill="#FF8C00" opacity="0.2" />
              <Svg width={60} height={60} viewBox="0 0 24 24" fill="none" style={styles.modalIcon}>
                <Path
                  d="M12 2a7 7 0 0 1 7 7v2a7 7 0 0 1-14 0V9a7 7 0 0 1 7-7z"
                  stroke="#FF8C00"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                <Path
                  d="M9.172 14.828A4.001 4.001 0 0 1 8 17v1m8-3a4.001 4.001 0 0 0 1.172 2.828"
                  stroke="#FF8C00"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
            </View>
            <Text style={styles.modalTitle}>Approval Pending</Text>
            <Text style={styles.modalSubtitle}>
              Your entry has been submitted successfully! We&apos;re reviewing your submission and will notify you once it&apos;s approved.
            </Text>
            <View style={styles.modalBadge}>
              <Circle cx="6" cy="6" r="5" fill="#FF8C00" />
              <Text style={styles.modalBadgeText}>Waiting for Approval</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3C2610",
    paddingTop: Platform.OS === "android" ? 20 : 0,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
  },
  summaryCard: {
    marginHorizontal: 20,
    backgroundColor: "#121212",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  summaryLabel: {
    color: "#8C8C8C",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  summaryValue: {
    color: "#fff",
    fontSize: 16,
    marginTop: 4,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#1f1f1f",
    marginVertical: 16,
  },
  summaryHint: {
    color: "#8F8F8F",
    fontSize: 12,
    marginTop: 16,
    lineHeight: 18,
  },
  section: {
    marginHorizontal: 20,
    marginTop: 28,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 16,
  },
  methodCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#1f1f1f",
    marginBottom: 12,
  },
  methodCardActive: {
    borderColor: "rgba(255,108,54,0.6)",
    backgroundColor: "rgba(255,108,54,0.12)",
  },
  methodLabel: {
    color: "#F5F5F5",
    fontSize: 14,
  },
  methodLabelActive: {
    color: "#FF8C00",
  },
  methodHelper: {
    color: "#8A8A8A",
    fontSize: 12,
    marginTop: 4,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#2f2f2f",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterActive: {
    borderColor: "#FF8C00",
    backgroundColor: "rgba(255,108,54,0.1)",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF8C00",
  },
  walletCard: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: "#121212",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f1f1f",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  walletLabel: {
    color: "#8A8A8A",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  walletValue: {
    color: "#fff",
    fontSize: 16,
    marginTop: 4,
  },
  walletButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255,108,54,0.15)",
  },
  walletButtonText: {
    color: "#FF8C00",
  },
  breakdownCard: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  breakdownLabel: {
    color: "#B0B0B0",
    fontSize: 13,
  },
  breakdownValue: {
    color: "#F8F8F8",
    fontSize: 13,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: "#1f1f1f",
    marginVertical: 8,
  },
  breakdownTotal: {
    color: "#FFD700",
    fontSize: 15,
  },
  payButton: {
    marginHorizontal: 20,
    marginTop: 28,
    borderRadius: 18,
    overflow: "hidden",
  },
  payGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  payButtonText: {
    color: "#fff",
    fontSize: 15,
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  payButtonLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  supportLink: {
    alignItems: "center",
    marginTop: 24,
  },
  supportText: {
    color: "#9CA3AF",
    fontSize: 13,
    textDecorationLine: "underline",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#252525",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "#333",
  },
  modalIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,140,0,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  modalIcon: {
    position: "absolute",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 24,
    marginBottom: 12,
    textAlign: "center",
  },
  modalSubtitle: {
    color: "#C7C7C7",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  modalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,140,0,0.15)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,140,0,0.3)",
  },
  modalBadgeText: {
    color: "#FF8C00",
    fontSize: 14,
  },
});

