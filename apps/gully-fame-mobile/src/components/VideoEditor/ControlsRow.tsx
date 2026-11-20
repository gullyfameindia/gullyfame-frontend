import React, { useMemo } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface ControlsRowProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  canUndo: boolean;
  canRedo: boolean;
  onPlayPress: () => void;
  onUndoPress: () => void;
  onRedoPress: () => void;
}

const ControlsRow: React.FC<ControlsRowProps> = ({
  isPlaying,
  currentTime,
  duration,
  canUndo,
  canRedo,
  onPlayPress,
  onUndoPress,
  onRedoPress,
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const currentTimeStr = useMemo(() => formatTime(currentTime), [currentTime]);
  const durationStr = useMemo(() => formatTime(duration), [duration]);

  return (
    <View style={styles.container}>
      {/* Left side: Play button */}
      <View style={styles.leftSection}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={isPlaying ? "Pause" : "Play"}
          style={styles.playButton}
          onPress={onPlayPress}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name={isPlaying ? "pause" : "play-arrow"}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {/* Center: Time display */}
      <View style={styles.centerSection}>
        {/* Fixed-width digits: Android clipped the last digit when the text width was re-measured. */}
        <Text style={[styles.currentTimeText, styles.timeText]} numberOfLines={1}>{currentTimeStr}</Text>
        <Text style={[styles.durationText, styles.timeText]} numberOfLines={1}>{durationStr}</Text>
      </View>

      {/* Right side: Undo/Redo */}
      <View style={styles.rightSection}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Undo" hitSlop={10}
          style={[styles.controlButton, !canUndo && styles.controlButtonDisabled]}
          onPress={onUndoPress}
          disabled={!canUndo}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="undo"
            size={22}
            color={canUndo ? "#fff" : "#666"}
          />
        </TouchableOpacity>

        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Redo" hitSlop={10}
          style={[styles.controlButton, !canRedo && styles.controlButtonDisabled]}
          onPress={onRedoPress}
          disabled={!canRedo}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="redo"
            size={22}
            color={canRedo ? "#fff" : "#666"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  centerSection: {
    flex: 1,
    alignItems: "center",
  },
  currentTimeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  durationText: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  },
  timeText: {
    minWidth: 72,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  controlButtonDisabled: {
    opacity: 0.3,
  },
});

export default ControlsRow;
