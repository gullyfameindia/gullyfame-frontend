import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { showPermissionSettingsAlert } from "@/utils/permissionSettings";

export interface OverlayItem {
  id: string;
  type: "image" | "video";
  uri: string;
  x: number; // Position (0-1 relative)
  y: number;
  width: number; // Size (0-1 relative)
  height: number;
  rotation: number;
  opacity: number; // 0-1
  startTime: number;
  endTime: number;
  blendMode: "normal" | "multiply" | "screen" | "overlay";
}

interface OverlayToolPanelProps {
  onClose: () => void;
  onAddOverlay: (overlay: Omit<OverlayItem, "id">) => void;
  currentTime: number;
  videoDuration: number;
  existingOverlays?: OverlayItem[];
}

const BLEND_MODES: { id: OverlayItem["blendMode"]; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "multiply", label: "Multiply" },
  { id: "screen", label: "Screen" },
  { id: "overlay", label: "Overlay" },
];

export default function OverlayToolPanel({
  onClose,
  onAddOverlay,
  currentTime,
  videoDuration,
  existingOverlays = [],
}: OverlayToolPanelProps) {
  const [isPickingMedia, setIsPickingMedia] = useState(false);
  const [opacity, setOpacity] = useState(100);
  const [blendMode, setBlendMode] = useState<OverlayItem["blendMode"]>("normal");
  const [duration, setDuration] = useState(3);

  const pickImage = async () => {
    try {
      const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted" && !canAskAgain) {
        showPermissionSettingsAlert("Photo library access");
        return;
      }
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant photo library access to add overlays"
        );
        return;
      }

      setIsPickingMedia(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const newOverlay: Omit<OverlayItem, "id"> = {
          type: "image",
          uri: result.assets[0].uri,
          x: 0.5,
          y: 0.5,
          width: 0.5,
          height: 0.5,
          rotation: 0,
          opacity: opacity / 100,
          startTime: currentTime,
          endTime: Math.min(currentTime + duration, videoDuration),
          blendMode,
        };

        onAddOverlay(newOverlay);
      }
    } catch {
      Alert.alert("Error", "Failed to add overlay");
    } finally {
      setIsPickingMedia(false);
    }
  };

  const pickVideo = async () => {
    try {
      const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted" && !canAskAgain) {
        showPermissionSettingsAlert("Photo library access");
        return;
      }
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant photo library access to add overlays"
        );
        return;
      }

      setIsPickingMedia(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const newOverlay: Omit<OverlayItem, "id"> = {
          type: "video",
          uri: result.assets[0].uri,
          x: 0.5,
          y: 0.5,
          width: 0.5,
          height: 0.5,
          rotation: 0,
          opacity: opacity / 100,
          startTime: currentTime,
          endTime: Math.min(currentTime + duration, videoDuration),
          blendMode,
        };

        onAddOverlay(newOverlay);
      }
    } catch {
      Alert.alert("Error", "Failed to add video overlay");
    } finally {
      setIsPickingMedia(false);
    }
  };

  const handleDurationChange = (delta: number) => {
    setDuration(Math.max(0.5, Math.min(videoDuration, duration + delta)));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>OVERLAY</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Add Overlay Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Add Overlay</Text>

          <TouchableOpacity
            style={styles.addButton}
            onPress={pickImage}
            disabled={isPickingMedia}
          >
            {isPickingMedia ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <Ionicons name="image" size={24} color="#000" />
                <Text style={styles.addButtonText}>Add Image Overlay</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addButton, styles.addButtonSecondary]}
            onPress={pickVideo}
            disabled={isPickingMedia}
          >
            {isPickingMedia ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="videocam" size={24} color="#fff" />
                <Text style={[styles.addButtonText, styles.addButtonTextSecondary]}>
                  Add Video Overlay
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Opacity Control */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Opacity</Text>
            <Text style={styles.sectionValue}>{opacity}%</Text>
          </View>

          <View style={styles.opacityControl}>
            <TouchableOpacity
              style={styles.opacityButton}
              onPress={() => setOpacity(Math.max(0, opacity - 10))}
            >
              <Ionicons name="remove-circle" size={28} color="#888" />
            </TouchableOpacity>

            <View style={styles.opacityBar}>
              <View
                style={[styles.opacityFill, { width: `${opacity}%` }]}
              />
            </View>

            <TouchableOpacity
              style={styles.opacityButton}
              onPress={() => setOpacity(Math.min(100, opacity + 10))}
            >
              <Ionicons name="add-circle" size={28} color="#888" />
            </TouchableOpacity>
          </View>

          {/* Opacity presets */}
          <View style={styles.presets}>
            {[25, 50, 75, 100].map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.presetButton,
                  opacity === value && styles.presetButtonActive,
                ]}
                onPress={() => setOpacity(value)}
              >
                <Text
                  style={[
                    styles.presetText,
                    opacity === value && styles.presetTextActive,
                  ]}
                >
                  {value}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Blend Mode */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Blend Mode</Text>
          <View style={styles.blendModes}>
            {BLEND_MODES.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                style={[
                  styles.blendButton,
                  blendMode === mode.id && styles.blendButtonActive,
                ]}
                onPress={() => setBlendMode(mode.id)}
              >
                <Text
                  style={[
                    styles.blendText,
                    blendMode === mode.id && styles.blendTextActive,
                  ]}
                >
                  {mode.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Duration Control */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            Duration: {duration.toFixed(1)}s
          </Text>
          <View style={styles.durationControl}>
            <TouchableOpacity
              style={styles.durationButton}
              onPress={() => handleDurationChange(-0.5)}
            >
              <Ionicons name="remove-circle" size={32} color="#888" />
            </TouchableOpacity>

            <View style={styles.durationDisplay}>
              <Text style={styles.durationText}>{duration.toFixed(1)}s</Text>
              <Text style={styles.durationSubtext}>
                Start: {currentTime.toFixed(1)}s
              </Text>
            </View>

            <TouchableOpacity
              style={styles.durationButton}
              onPress={() => handleDurationChange(0.5)}
            >
              <Ionicons name="add-circle" size={32} color="#888" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Existing Overlays */}
        {existingOverlays.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Overlays ({existingOverlays.length})
            </Text>
            {existingOverlays.map((overlay, index) => (
              <View key={overlay.id} style={styles.overlayItem}>
                <Ionicons
                  name={overlay.type === "image" ? "image" : "videocam"}
                  size={20}
                  color="#EC9A15"
                />
                <Text style={styles.overlayText}>
                  {overlay.type === "image" ? "Image" : "Video"} Overlay {index + 1}
                </Text>
                <Text style={styles.overlayTime}>
                  {overlay.startTime.toFixed(1)}s - {overlay.endTime.toFixed(1)}s
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#888" />
          <Text style={styles.infoText}>
            Overlays can be positioned, scaled, and rotated on the video. They
            appear at the set start time and fade out at the end time.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "70%",
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionLabel: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  sectionValue: {
    color: "#EC9A15",
    fontSize: 14,
    fontWeight: "600",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EC9A15",
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    marginBottom: 12,
  },
  addButtonSecondary: {
    backgroundColor: "#2a2a2a",
  },
  addButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  addButtonTextSecondary: {
    color: "#fff",
  },
  opacityControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  opacityButton: {
    padding: 4,
  },
  opacityBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#2a2a2a",
    borderRadius: 3,
    overflow: "hidden",
  },
  opacityFill: {
    height: "100%",
    backgroundColor: "#EC9A15",
  },
  presets: {
    flexDirection: "row",
    gap: 8,
  },
  presetButton: {
    flex: 1,
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  presetButtonActive: {
    backgroundColor: "#EC9A15",
  },
  presetText: {
    color: "#888",
    fontSize: 13,
    fontWeight: "600",
  },
  presetTextActive: {
    color: "#000",
  },
  blendModes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  blendButton: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  blendButtonActive: {
    backgroundColor: "#EC9A15",
  },
  blendText: {
    color: "#888",
    fontSize: 13,
    fontWeight: "600",
  },
  blendTextActive: {
    color: "#000",
  },
  durationControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  durationButton: {
    padding: 4,
  },
  durationDisplay: {
    flex: 1,
    alignItems: "center",
  },
  durationText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  durationSubtext: {
    color: "#888",
    fontSize: 12,
    marginTop: 4,
  },
  overlayItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  overlayText: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  overlayTime: {
    color: "#888",
    fontSize: 12,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#2a2a2a",
    borderRadius: 10,
    padding: 16,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    color: "#888",
    fontSize: 13,
    lineHeight: 18,
  },
});
