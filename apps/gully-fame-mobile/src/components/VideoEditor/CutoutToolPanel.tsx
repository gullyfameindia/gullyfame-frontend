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

export interface CutoutSettings {
  enabled: boolean;
  feathering: number; // 0-100 (edge softness)
  threshold: number; // 0-100 (detection sensitivity)
  backgroundColor: string;
  backgroundImage?: string;
}

interface CutoutToolPanelProps {
  onClose: () => void;
  onApplyCutout: (settings: CutoutSettings) => void;
  currentSettings?: CutoutSettings;
}

const BACKGROUND_COLORS = [
  { id: "transparent", label: "Transparent", color: "transparent" },
  { id: "white", label: "White", color: "#FFFFFF" },
  { id: "black", label: "Black", color: "#000000" },
  { id: "green", label: "Green", color: "#00FF00" },
  { id: "blue", label: "Blue", color: "#007AFF" },
  { id: "orange", label: "Orange", color: "#EC9A15" },
];

export default function CutoutToolPanel({
  onClose,
  onApplyCutout,
  currentSettings,
}: CutoutToolPanelProps) {
  const [enabled, setEnabled] = useState(currentSettings?.enabled || false);
  const [feathering, setFeathering] = useState(currentSettings?.feathering || 50);
  const [threshold, setThreshold] = useState(currentSettings?.threshold || 50);
  const [backgroundColor, setBackgroundColor] = useState(
    currentSettings?.backgroundColor || "transparent"
  );
  const [backgroundImage, setBackgroundImage] = useState(
    currentSettings?.backgroundImage
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPickingImage, setIsPickingImage] = useState(false);

  const handleApply = () => {
    setIsProcessing(true);

    const settings: CutoutSettings = {
      enabled,
      feathering,
      threshold,
      backgroundColor,
      backgroundImage,
    };

    // Apply settings immediately (no processing delay needed)
    onApplyCutout(settings);
    setIsProcessing(false);
  };

  const pickBackgroundImage = async () => {
    try {
      const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted" && !canAskAgain) {
        showPermissionSettingsAlert("Photo library access");
        return;
      }
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant photo library access to select a background"
        );
        return;
      }

      setIsPickingImage(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setBackgroundImage(result.assets[0].uri);
        setBackgroundColor("image");
      }
    } catch {
      Alert.alert("Error", "Failed to select background image");
    } finally {
      setIsPickingImage(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>CUTOUT</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Enable/Disable Toggle */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.toggleButton, enabled && styles.toggleButtonActive]}
            onPress={() => setEnabled(!enabled)}
          >
            <Ionicons
              name={enabled ? "cut" : "cut-outline"}
              size={24}
              color={enabled ? "#000" : "#fff"}
            />
            <Text
              style={[
                styles.toggleText,
                enabled && styles.toggleTextActive,
              ]}
            >
              {enabled ? "Background Removal Active" : "Enable Background Removal"}
            </Text>
          </TouchableOpacity>
        </View>

        {enabled && (
          <>
            {/* Feathering (Edge Softness) */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Edge Softness</Text>
                <Text style={styles.sectionValue}>{feathering}%</Text>
              </View>

              <View style={styles.sliderControl}>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => setFeathering(Math.max(0, feathering - 10))}
                >
                  <Ionicons name="remove-circle" size={28} color="#888" />
                </TouchableOpacity>

                <View style={styles.sliderBar}>
                  <View
                    style={[styles.sliderFill, { width: `${feathering}%` }]}
                  />
                </View>

                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => setFeathering(Math.min(100, feathering + 10))}
                >
                  <Ionicons name="add-circle" size={28} color="#888" />
                </TouchableOpacity>
              </View>
              <Text style={styles.helpText}>
                Higher values create softer, more natural edges
              </Text>
            </View>

            {/* Threshold (Detection Sensitivity) */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Detection Sensitivity</Text>
                <Text style={styles.sectionValue}>{threshold}%</Text>
              </View>

              <View style={styles.sliderControl}>
                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => setThreshold(Math.max(0, threshold - 10))}
                >
                  <Ionicons name="remove-circle" size={28} color="#888" />
                </TouchableOpacity>

                <View style={styles.sliderBar}>
                  <View
                    style={[styles.sliderFill, { width: `${threshold}%` }]}
                  />
                </View>

                <TouchableOpacity
                  style={styles.sliderButton}
                  onPress={() => setThreshold(Math.min(100, threshold + 10))}
                >
                  <Ionicons name="add-circle" size={28} color="#888" />
                </TouchableOpacity>
              </View>
              <Text style={styles.helpText}>
                Adjust if subject boundaries are not detected correctly
              </Text>
            </View>

            {/* Background Options */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Background</Text>

              <View style={styles.backgroundGrid}>
                {BACKGROUND_COLORS.map((bg) => (
                  <TouchableOpacity
                    key={bg.id}
                    style={[
                      styles.backgroundOption,
                      backgroundColor === bg.color && styles.backgroundOptionActive,
                    ]}
                    onPress={() => {
                      setBackgroundColor(bg.color);
                      if (bg.id !== "image") setBackgroundImage(undefined);
                    }}
                  >
                    {bg.color === "transparent" ? (
                      <View style={styles.transparentPattern}>
                        <Ionicons name="ban" size={24} color="#888" />
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.backgroundSwatch,
                          { backgroundColor: bg.color },
                        ]}
                      />
                    )}
                    <Text style={styles.backgroundLabel}>{bg.label}</Text>
                  </TouchableOpacity>
                ))}

                {/* Custom Image */}
                <TouchableOpacity
                  style={[
                    styles.backgroundOption,
                    backgroundColor === "image" && styles.backgroundOptionActive,
                  ]}
                  onPress={pickBackgroundImage}
                  disabled={isPickingImage}
                >
                  {isPickingImage ? (
                    <ActivityIndicator size="small" color="#EC9A15" />
                  ) : (
                    <View style={styles.backgroundSwatch}>
                      <Ionicons name="image" size={24} color="#EC9A15" />
                    </View>
                  )}
                  <Text style={styles.backgroundLabel}>Custom</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#888" />
          <Text style={styles.infoText}>
            {enabled
              ? "Background removal uses AI to detect the subject and remove everything else. This may take a few moments to process."
              : "Enable background removal to isolate the subject from the video. You can then replace the background with a color or image."}
          </Text>
        </View>
      </ScrollView>

      {/* Apply Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.applyButton}
          onPress={handleApply}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.applyButtonText}>
              {enabled ? "Apply Cutout" : "Remove Cutout"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  toggleButtonActive: {
    backgroundColor: "#EC9A15",
  },
  toggleText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  toggleTextActive: {
    color: "#000",
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
  },
  sectionValue: {
    color: "#EC9A15",
    fontSize: 14,
    fontWeight: "600",
  },
  sliderControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  sliderButton: {
    padding: 4,
  },
  sliderBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#2a2a2a",
    borderRadius: 3,
    overflow: "hidden",
  },
  sliderFill: {
    height: "100%",
    backgroundColor: "#EC9A15",
  },
  helpText: {
    color: "#666",
    fontSize: 12,
    lineHeight: 16,
  },
  backgroundGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  backgroundOption: {
    alignItems: "center",
    width: "30%",
    borderWidth: 2,
    borderColor: "transparent",
    borderRadius: 10,
    padding: 8,
  },
  backgroundOptionActive: {
    borderColor: "#EC9A15",
  },
  backgroundSwatch: {
    width: 64,
    height: 64,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#444",
    marginBottom: 8,
  },
  transparentPattern: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  backgroundLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#2a2a2a",
    borderRadius: 10,
    padding: 16,
  },
  infoText: {
    flex: 1,
    color: "#888",
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#2a2a2a",
  },
  applyButton: {
    backgroundColor: "#EC9A15",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  applyButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
});
