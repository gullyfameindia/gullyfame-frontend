import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

interface InsufficientBalanceModalProps {
  visible: boolean;
  balance?: number;
  onDismiss: () => void;
}

export default function InsufficientBalanceModal({
  visible,
  balance = 0,
  onDismiss,
}: InsufficientBalanceModalProps) {
  const router = useRouter();

  const handleGoToWallet = () => {
    onDismiss();
    router.push("/(main)/coins" as any);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close Button */}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={onDismiss} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="wallet-outline" size={60} color="#EC9A15" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Insufficient Balance</Text>

          {/* Message */}
          <Text style={styles.message}>
            You don't have enough coins to support this creator. Add funds to your wallet to continue.
          </Text>

          {/* Balance Info */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Current Balance</Text>
              <Text style={styles.infoValue}>{balance.toLocaleString()}</Text>
            </View>
            <Text style={styles.infoSubtext}>GFI Coins</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.addFundsButton}
              onPress={handleGoToWallet}
            >
              <Ionicons name="wallet-outline" size={20} color="#fff" />
              <Text style={styles.addFundsButtonText}>Go to Wallet</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onDismiss}
            >
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
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    backgroundColor: "#3C2610",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    alignItems: "center",
    maxWidth: 320,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 10,
  },
  iconContainer: {
    marginTop: 20,
    marginBottom: 20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(236, 154, 21, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    color: "#CCCCCC",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
    textAlign: "center",
  },
  infoCard: {
    backgroundColor: "rgba(236, 154, 21, 0.15)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: "#EC9A15",
    width: "100%",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  infoLabel: {
    color: "#999",
    fontSize: 13,
  },
  infoValue: {
    color: "#EC9A15",
    fontSize: 20,
    fontWeight: "700",
  },
  infoSubtext: {
    color: "#999",
    fontSize: 12,
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
  },
  addFundsButton: {
    backgroundColor: "#EC9A15",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addFundsButtonText: {
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
