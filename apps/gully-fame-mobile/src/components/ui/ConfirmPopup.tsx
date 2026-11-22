import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Same brown + orange palette as the rest of the app.
const C = {
  card: "#1A1A1A",
  border: "#2A2A2A",
  accent: "#EC9A15",
  accentSoft: "rgba(236, 154, 21, 0.15)",
  text: "#FFFFFF",
  muted: "#CAD7D8",
};

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Optional second choice between confirm and cancel, e.g. "Delete for everyone". */
  extraAction?: { text: string; onPress: () => void };
};

/** In-app confirmation popup with a cancel and a confirm button. */
export default function ConfirmPopup({
  visible,
  title,
  message,
  confirmText,
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  icon = "help-circle-outline",
  extraAction,
}: Props) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name={icon} size={28} color={C.accent} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <TouchableOpacity style={styles.primaryButton} onPress={onConfirm} activeOpacity={0.8} accessibilityRole="button">
            <Text style={styles.primaryText}>{confirmText}</Text>
          </TouchableOpacity>
          {extraAction ? (
            <TouchableOpacity style={styles.outlineButton} onPress={extraAction.onPress} activeOpacity={0.8} accessibilityRole="button">
              <Text style={styles.outlineText}>{extraAction.text}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.secondaryButton} onPress={onCancel} activeOpacity={0.7} accessibilityRole="button">
            <Text style={styles.secondaryText}>{cancelText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
    alignItems: "center",
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.accentSoft,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    color: C.text,
    fontSize: 20,
    fontFamily: "PlayfairDisplay_700Bold",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
  },
  primaryButton: {
    width: "100%",
    backgroundColor: C.accent,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  outlineButton: {
    width: "100%",
    paddingVertical: 13,
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
  },
  outlineText: {
    color: C.text,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  secondaryButton: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 6,
  },
  secondaryText: {
    color: C.muted,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
