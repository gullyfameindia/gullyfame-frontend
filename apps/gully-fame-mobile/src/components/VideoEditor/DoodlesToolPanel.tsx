import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

export interface DoodlePath {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  timestamp: number; // When this doodle appears in video
  duration: number; // How long it stays visible
}

export interface DoodleState {
  paths: DoodlePath[];
  isDrawing: boolean;
  currentColor: string;
  currentWidth: number;
}

interface DoodlesToolPanelProps {
  onClose: () => void;
  onDoodlesChange: (doodles: DoodlePath[]) => void;
  currentTime: number;
  videoDuration: number;
  initialDoodles?: DoodlePath[];
  isDrawingMode?: boolean;
  onDrawingModeChange?: (mode: boolean) => void;
  brushColor?: string;
  onBrushColorChange?: (color: string) => void;
  brushSize?: number;
  onBrushSizeChange?: (size: number) => void;
}

const PRESET_COLORS = [
  "#FFFFFF", // White
  "#000000", // Black
  "#EC9A15", // Orange
  "#FF3B30", // Red
  "#34C759", // Green
  "#007AFF", // Blue
  "#5856D6", // Purple
  "#FF9500", // Orange
  "#FFCC00", // Yellow
  "#FF2D55", // Pink
];

const BRUSH_SIZES = [
  { label: "Thin", value: 2 },
  { label: "Medium", value: 5 },
  { label: "Thick", value: 10 },
  { label: "Wide", value: 20 },
];

export default function DoodlesToolPanel({
  onClose,
  onDoodlesChange,
  currentTime,
  videoDuration,
  initialDoodles = [],
  isDrawingMode: externalIsDrawingMode,
  onDrawingModeChange,
  brushColor: externalBrushColor,
  onBrushColorChange,
  brushSize: externalBrushSize,
  onBrushSizeChange,
}: DoodlesToolPanelProps) {
  const [doodles, setDoodles] = useState<DoodlePath[]>(initialDoodles);
  const [selectedColor, setSelectedColor] = useState(externalBrushColor || "#EC9A15");
  const [selectedBrushSize, setSelectedBrushSize] = useState(externalBrushSize || 5);
  const [isDrawingMode, setIsDrawingMode] = useState(externalIsDrawingMode || false);
  const [doodleDuration, setDoodleDuration] = useState(3); // Default 3 seconds

  // Sync external drawing mode state
  React.useEffect(() => {
    if (externalIsDrawingMode !== undefined) {
      setIsDrawingMode(externalIsDrawingMode);
    }
  }, [externalIsDrawingMode]);

  // Sync external brush color
  React.useEffect(() => {
    if (externalBrushColor) {
      setSelectedColor(externalBrushColor);
    }
  }, [externalBrushColor]);

  // Sync external brush size
  React.useEffect(() => {
    if (externalBrushSize) {
      setSelectedBrushSize(externalBrushSize);
    }
  }, [externalBrushSize]);

  const handleStartDrawing = () => {
    setIsDrawingMode(true);
    if (onDrawingModeChange) {
      onDrawingModeChange(true);
    }
  };

  const handleStopDrawing = () => {
    setIsDrawingMode(false);
    if (onDrawingModeChange) {
      onDrawingModeChange(false);
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      "Clear All Doodles",
      "Are you sure you want to remove all drawings?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            setDoodles([]);
            onDoodlesChange([]);
          },
        },
      ]
    );
  };

  const handleUndo = () => {
    if (doodles.length === 0) return;
    const newDoodles = doodles.slice(0, -1);
    setDoodles(newDoodles);
    onDoodlesChange(newDoodles);
  };

  const handleDurationChange = (delta: number) => {
    setDoodleDuration(Math.max(1, Math.min(videoDuration, doodleDuration + delta)));
  };

  // This would be called from the video preview component

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>DOODLES</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Drawing Status */}
        {isDrawingMode ? (
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <MaterialCommunityIcons
                name="gesture"
                size={24}
                color="#EC9A15"
              />
              <Text style={styles.statusText}>Drawing Mode Active</Text>
            </View>
            <Text style={styles.statusSubtext}>
              Draw on the video preview above
            </Text>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={handleStopDrawing}
            >
              <Text style={styles.doneButtonText}>Done Drawing</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartDrawing}
          >
            <MaterialCommunityIcons name="gesture" size={24} color="#000" />
            <Text style={styles.startButtonText}>Start Drawing</Text>
          </TouchableOpacity>
        )}

        {/* Color Picker */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Brush Color</Text>
          <View style={styles.colorGrid}>
            {PRESET_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorSwatchSelected,
                ]}
                onPress={() => {
                  setSelectedColor(color);
                  if (onBrushColorChange) {
                    onBrushColorChange(color);
                  }
                }}
              >
                {selectedColor === color && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={color === "#FFFFFF" ? "#000" : "#fff"}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Brush Size */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Brush Size</Text>
          <View style={styles.brushSizes}>
            {BRUSH_SIZES.map((size) => (
              <TouchableOpacity
                key={size.value}
                style={[
                  styles.brushButton,
                  selectedBrushSize === size.value && styles.brushButtonActive,
                ]}
                onPress={() => {
                  setSelectedBrushSize(size.value);
                  if (onBrushSizeChange) {
                    onBrushSizeChange(size.value);
                  }
                }}
              >
                <View
                  style={[
                    styles.brushPreview,
                    {
                      width: size.value * 2,
                      height: size.value * 2,
                      backgroundColor:
                        selectedBrushSize === size.value ? "#000" : "#888",
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.brushText,
                    selectedBrushSize === size.value && styles.brushTextActive,
                  ]}
                >
                  {size.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Duration Control */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            Doodle Duration: {doodleDuration.toFixed(1)}s
          </Text>
          <View style={styles.durationControl}>
            <TouchableOpacity
              style={styles.durationButton}
              onPress={() => handleDurationChange(-0.5)}
            >
              <Ionicons name="remove-circle" size={32} color="#888" />
            </TouchableOpacity>
            <View style={styles.durationDisplay}>
              <Text style={styles.durationText}>{doodleDuration.toFixed(1)}s</Text>
              <Text style={styles.durationSubtext}>
                Visible at {currentTime.toFixed(1)}s
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

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              doodles.length === 0 && styles.actionButtonDisabled,
            ]}
            onPress={handleUndo}
            disabled={doodles.length === 0}
          >
            <Ionicons
              name="arrow-undo"
              size={20}
              color={doodles.length > 0 ? "#fff" : "#666"}
            />
            <Text
              style={[
                styles.actionText,
                doodles.length === 0 && styles.actionTextDisabled,
              ]}
            >
              Undo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              doodles.length === 0 && styles.actionButtonDisabled,
            ]}
            onPress={handleClearAll}
            disabled={doodles.length === 0}
          >
            <Ionicons
              name="trash-outline"
              size={20}
              color={doodles.length > 0 ? "#ff3b30" : "#666"}
            />
            <Text
              style={[
                styles.actionText,
                { color: doodles.length > 0 ? "#ff3b30" : "#666" },
              ]}
            >
              Clear All
            </Text>
          </TouchableOpacity>
        </View>

        {/* Doodles Count */}
        {doodles.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{doodles.length} doodle(s) added</Text>
          </View>
        )}

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#888" />
          <Text style={styles.infoText}>
            Doodles appear at the current playback time and stay visible for the
            set duration. Use gestures to draw freely on the video.
          </Text>
        </View>
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
  statusCard: {
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#EC9A15",
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  statusText: {
    color: "#EC9A15",
    fontSize: 16,
    fontWeight: "600",
  },
  statusSubtext: {
    color: "#888",
    fontSize: 14,
    marginBottom: 12,
  },
  doneButton: {
    backgroundColor: "#EC9A15",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  doneButtonText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "600",
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EC9A15",
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    marginBottom: 20,
  },
  startButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  colorSwatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  colorSwatchSelected: {
    borderColor: "#EC9A15",
  },
  brushSizes: {
    flexDirection: "row",
    gap: 12,
  },
  brushButton: {
    flex: 1,
    backgroundColor: "#2a2a2a",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    gap: 8,
  },
  brushButtonActive: {
    backgroundColor: "#EC9A15",
  },
  brushPreview: {
    borderRadius: 100,
  },
  brushText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
  },
  brushTextActive: {
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
  actions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2a2a2a",
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  actionTextDisabled: {
    color: "#666",
  },
  countBadge: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: "center",
    marginBottom: 16,
  },
  countText: {
    color: "#EC9A15",
    fontSize: 13,
    fontWeight: "600",
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
});
