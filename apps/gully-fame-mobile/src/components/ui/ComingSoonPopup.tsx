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
  onClose: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
};

/** Small in-app popup for features that are not ready yet. */
export default function ComingSoonPopup({ visible, title, message, onClose, icon = "time-outline" }: Props) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name={icon} size={28} color={C.accent} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity style={styles.button} onPress={onClose} activeOpacity={0.8} accessibilityRole="button">
            <Text style={styles.buttonText}>Got it</Text>
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
  button: {
    width: "100%",
    backgroundColor: C.accent,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
