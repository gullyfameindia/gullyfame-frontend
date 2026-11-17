import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  REPORT_DETAILS_MAX_LENGTH,
  REPORT_REASONS,
  ReportReason,
  reportReel,
} from "@/api/services/reportService";
import { getErrorMessage } from "@/api/client";

interface ReportReelModalProps {
  visible: boolean;
  /** Backend id of the reel being reported. */
  reelId: string | null;
  onClose: () => void;
  /** Called after the server accepted the report. */
  onReported?: (reelId: string, alreadyReported: boolean) => void;
}

const THEME = "#EC9A15";

/** Bottom sheet: pick a reason, optionally add details, send. */
export default function ReportReelModal({ visible, reelId, onClose, onReported }: ReportReelModalProps) {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Start fresh each time the sheet opens.
  useEffect(() => {
    if (visible) {
      setReason(null);
      setDetails("");
      setError("");
      setSending(false);
    }
  }, [visible, reelId]);

  const submit = async () => {
    if (!reelId || !reason || sending) return;
    setSending(true);
    setError("");
    try {
      const result = await reportReel(reelId, reason, details);
      onReported?.(reelId, !!result?.alreadyReported);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Report reel</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close" hitSlop={10}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            Why are you reporting this reel? The creator won&apos;t see who reported it.
          </Text>

          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {REPORT_REASONS.map((r) => {
              const selected = reason === r.key;
              return (
                <TouchableOpacity
                  key={r.key}
                  style={[styles.reasonRow, selected && styles.reasonRowSelected]}
                  onPress={() => setReason(r.key)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Text style={styles.reasonText}>{r.label}</Text>
                  <Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={20} color={selected ? THEME : "#8A7A69"} />
                </TouchableOpacity>
              );
            })}
            {reason ? (
              <TextInput
                style={styles.details}
                placeholder="Add details (optional)"
                placeholderTextColor="#8A7A69"
                value={details}
                onChangeText={(t) => setDetails(t.slice(0, REPORT_DETAILS_MAX_LENGTH))}
                multiline
                maxLength={REPORT_DETAILS_MAX_LENGTH}
              />
            ) : null}
          </ScrollView>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.submit, (!reason || sending) && styles.submitDisabled]}
            onPress={submit}
            disabled={!reason || sending}
            accessibilityRole="button"
          >
            {sending ? <ActivityIndicator color="#3C2610" /> : <Text style={styles.submitText}>Submit report</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: "flex-end" },
  backdrop: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: {
    backgroundColor: "#2A1A0B",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 8,
    maxHeight: "85%",
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "#55402D", marginBottom: 10 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: "#fff", fontSize: 18, fontWeight: "700" },
  subtitle: { color: "#C9B9A6", fontSize: 13, marginTop: 6, marginBottom: 10, lineHeight: 18 },
  list: { flexGrow: 0 },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  reasonRowSelected: { backgroundColor: "rgba(236,154,21,0.15)" },
  reasonText: { color: "#fff", fontSize: 15, flex: 1, marginRight: 10 },
  details: {
    minHeight: 80,
    color: "#fff",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#55402D",
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    marginBottom: 4,
    textAlignVertical: "top",
  },
  error: { color: "#FF6B5E", fontSize: 13, marginTop: 8 },
  submit: {
    marginTop: 12,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME,
    alignItems: "center",
    justifyContent: "center",
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: "#3C2610", fontSize: 16, fontWeight: "700" },
});
