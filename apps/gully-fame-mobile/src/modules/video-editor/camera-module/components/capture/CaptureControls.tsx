import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

import RecordButton from "./RecordButton";
import { CAPTURE_ORANGE, iconShadow } from "./theme";

export type CaptureMode = "video" | "photo";

interface CaptureControlsProps {
  mode: CaptureMode;
  isRecording: boolean;
  progress: number;
  clipCount: number;
  disabled?: boolean;
  onModeChange: (mode: CaptureMode) => void;
  onRecordPress: () => void;
  onRecordLongPress?: () => void;
  onRecordPressOut?: () => void;
  /** Leave out to hide the Lenses button (see LENSES_ENABLED). */
  onLenses?: () => void;
  onDeleteLast: () => void;
  onNext: () => void;
  /** Replaces the Lenses/shutter row while the lens carousel is open. */
  lensCarousel?: React.ReactNode;
}

const CaptureControls: React.FC<CaptureControlsProps> = ({
  mode,
  isRecording,
  progress,
  clipCount,
  disabled,
  onModeChange,
  onRecordPress,
  onRecordLongPress,
  onRecordPressOut,
  onLenses,
  onDeleteLast,
  onNext,
  lensCarousel,
}) => {
  const showClipActions = clipCount > 0 && !isRecording;

  return (
    <View>
      {/* Kept in the layout while recording so the shutter doesn't jump. */}
      <View style={[styles.modeSwitch, isRecording && styles.invisible]} pointerEvents={isRecording ? "none" : "auto"}>
        {(["video", "photo"] as CaptureMode[]).map(m => (
          <TouchableOpacity key={m} onPress={() => onModeChange(m)} hitSlop={8} accessibilityState={{ selected: mode === m }}>
            <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>{m.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {lensCarousel ?? (
        <View style={styles.row}>
          <View style={styles.side}>
            {!isRecording && onLenses && (
              <TouchableOpacity style={styles.sideBtn} onPress={onLenses} accessibilityLabel="Lenses">
                <View style={styles.lensIcon}>
                  <MaterialCommunityIcons name="camera-iris" size={26} color="#fff" />
                </View>
                <Text style={styles.sideLabel}>Lenses</Text>
              </TouchableOpacity>
            )}
          </View>

          <RecordButton
            variant={mode}
            isRecording={isRecording}
            progress={progress}
            disabled={disabled}
            onPress={onRecordPress}
            onLongPress={onRecordLongPress}
            onPressOut={onRecordPressOut}
          />

          <View style={[styles.side, styles.sideRight]}>
            {showClipActions && (
              <>
                <TouchableOpacity style={styles.roundBtn} onPress={onDeleteLast} accessibilityLabel="Delete last clip">
                  <Ionicons name="backspace-outline" size={22} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.roundBtn, styles.nextBtn]} onPress={onNext} accessibilityLabel="Next">
                  <MaterialCommunityIcons name="check" size={26} color="#000" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  modeSwitch: { flexDirection: "row", justifyContent: "center", gap: 22, marginBottom: 14 },
  modeText: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "700", letterSpacing: 1, ...iconShadow },
  modeTextActive: { color: "#fff" },
  invisible: { opacity: 0 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  side: { flex: 1, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 14 },
  sideRight: { justifyContent: "center" },
  sideBtn: { alignItems: "center" },
  lensIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  sideLabel: { color: "#fff", fontSize: 13, marginTop: 6, ...iconShadow },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtn: { backgroundColor: CAPTURE_ORANGE },
});

export default CaptureControls;
