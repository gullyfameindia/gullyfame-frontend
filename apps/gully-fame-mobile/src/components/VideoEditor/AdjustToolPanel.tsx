import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";

export interface VideoAdjustments {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  exposure: number; // -100 to 100
  temperature: number; // -100 to 100 (cool to warm)
  vignette: number; // 0 to 100
  sharpen: number; // 0 to 100
}

interface AdjustToolPanelProps {
  onClose: () => void;
  onAdjustmentsChange: (adjustments: VideoAdjustments) => void;
  initialAdjustments?: VideoAdjustments;
}

const DEFAULT_ADJUSTMENTS: VideoAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  temperature: 0,
  vignette: 0,
  sharpen: 0,
};

const ADJUSTMENT_CONFIGS = [
  {
    key: "brightness" as keyof VideoAdjustments,
    label: "Brightness",
    icon: "sunny",
    min: -100,
    max: 100,
    step: 1,
  },
  {
    key: "contrast" as keyof VideoAdjustments,
    label: "Contrast",
    icon: "contrast",
    min: -100,
    max: 100,
    step: 1,
  },
  {
    key: "saturation" as keyof VideoAdjustments,
    label: "Saturation",
    icon: "color-palette",
    min: -100,
    max: 100,
    step: 1,
  },
  {
    key: "exposure" as keyof VideoAdjustments,
    label: "Exposure",
    icon: "bulb",
    min: -100,
    max: 100,
    step: 1,
  },
  {
    key: "temperature" as keyof VideoAdjustments,
    label: "Temperature",
    icon: "thermometer",
    min: -100,
    max: 100,
    step: 1,
  },
  {
    key: "vignette" as keyof VideoAdjustments,
    label: "Vignette",
    icon: "ellipse",
    min: 0,
    max: 100,
    step: 1,
  },
  {
    key: "sharpen" as keyof VideoAdjustments,
    label: "Sharpen",
    icon: "radio-button-on",
    min: 0,
    max: 100,
    step: 1,
  },
];

export default function AdjustToolPanel({
  onClose,
  onAdjustmentsChange,
  initialAdjustments = DEFAULT_ADJUSTMENTS,
}: AdjustToolPanelProps) {
  const [adjustments, setAdjustments] = useState<VideoAdjustments>(initialAdjustments);

  const handleAdjustmentChange = (key: keyof VideoAdjustments, value: number) => {
    const newAdjustments = { ...adjustments, [key]: Math.round(value) };
    setAdjustments(newAdjustments);
    onAdjustmentsChange(newAdjustments);
  };

  const resetAdjustment = (key: keyof VideoAdjustments) => {
    const newAdjustments = { ...adjustments, [key]: DEFAULT_ADJUSTMENTS[key] };
    setAdjustments(newAdjustments);
    onAdjustmentsChange(newAdjustments);
  };

  const resetAll = () => {
    setAdjustments(DEFAULT_ADJUSTMENTS);
    onAdjustmentsChange(DEFAULT_ADJUSTMENTS);
  };

  const hasChanges = Object.entries(adjustments).some(
    ([key, value]) => value !== DEFAULT_ADJUSTMENTS[key as keyof VideoAdjustments]
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>ADJUST</Text>
        <View style={styles.headerButtons}>
          {hasChanges && (
            <TouchableOpacity style={styles.resetButton} onPress={resetAll}>
              <Text style={styles.resetButtonText}>Reset All</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {ADJUSTMENT_CONFIGS.map((config) => {
          const value = adjustments[config.key];
          const isDefault = value === DEFAULT_ADJUSTMENTS[config.key];
          const normalizedValue = ((value - config.min) / (config.max - config.min)) * 100;

          return (
            <View key={config.key} style={styles.adjustmentRow}>
              <View style={styles.adjustmentHeader}>
                <View style={styles.adjustmentLabel}>
                  <Ionicons
                    name={config.icon as any}
                    size={20}
                    color={isDefault ? "#888" : "#EC9A15"}
                  />
                  <Text
                    style={[
                      styles.adjustmentName,
                      !isDefault && styles.adjustmentNameActive,
                    ]}
                  >
                    {config.label}
                  </Text>
                </View>
                <View style={styles.adjustmentValue}>
                  <Text
                    style={[
                      styles.valueText,
                      !isDefault && styles.valueTextActive,
                    ]}
                  >
                    {value > 0 ? "+" : ""}
                    {value}
                  </Text>
                  {!isDefault && (
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Reset"
                      style={styles.resetIconButton}
                      onPress={() => resetAdjustment(config.key)}
                    >
                      <Ionicons name="refresh" size={16} color="#EC9A15" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.sliderContainer}>
                <Slider
                  style={styles.slider}
                  minimumValue={config.min}
                  maximumValue={config.max}
                  step={config.step}
                  value={value}
                  onValueChange={(val) => handleAdjustmentChange(config.key, val)}
                  minimumTrackTintColor="#EC9A15"
                  maximumTrackTintColor="#2a2a2a"
                  thumbTintColor="#EC9A15"
                />
              </View>

              {/* Visual indicator bar */}
              <View style={styles.indicatorContainer}>
                <View style={styles.indicatorTrack}>
                  {/* Center line */}
                  <View style={styles.centerLine} />
                  {/* Fill indicator */}
                  <View
                    style={[
                      styles.indicatorFill,
                      {
                        left: value >= 0 ? "50%" : `${normalizedValue}%`,
                        width:
                          value >= 0
                            ? `${normalizedValue - 50}%`
                            : `${50 - normalizedValue}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          );
        })}

        {/* Info */}
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle" size={20} color="#888" />
          <Text style={styles.infoText}>
            Adjustments are applied in real-time. Tap Reset to undo changes.
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
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  resetButton: {
    backgroundColor: "#2a2a2a",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  resetButtonText: {
    color: "#EC9A15",
    fontSize: 13,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  adjustmentRow: {
    marginBottom: 24,
  },
  adjustmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  adjustmentLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  adjustmentName: {
    color: "#888",
    fontSize: 15,
    fontWeight: "600",
  },
  adjustmentNameActive: {
    color: "#fff",
  },
  adjustmentValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  valueText: {
    color: "#888",
    fontSize: 15,
    fontWeight: "600",
    minWidth: 40,
    textAlign: "right",
  },
  valueTextActive: {
    color: "#EC9A15",
  },
  resetIconButton: {
    padding: 4,
  },
  sliderContainer: {
    marginBottom: 4,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  indicatorContainer: {
    paddingHorizontal: 4,
  },
  indicatorTrack: {
    height: 4,
    backgroundColor: "#2a2a2a",
    borderRadius: 2,
    position: "relative",
    overflow: "hidden",
  },
  centerLine: {
    position: "absolute",
    left: "50%",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "#444",
    marginLeft: -1,
  },
  indicatorFill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: "#EC9A15",
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#2a2a2a",
    borderRadius: 10,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    color: "#888",
    fontSize: 13,
    lineHeight: 18,
  },
});
