import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { autoCaption } from "@/api/services/captionsService";

export interface Caption {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string;
  position: "top" | "center" | "bottom";
  animation: "none" | "fade" | "slide" | "typewriter";
}

interface CaptionsToolPanelProps {
  onClose: () => void;
  onCaptionsGenerated: (captions: Caption[]) => void;
  videoUri: string;
  videoDuration: number;
  /** Captions already in the project, so reopening the panel shows them. */
  initialCaptions?: Caption[];
}

const PRESET_COLORS = [
  "#FFFFFF", // White
  "#000000", // Black
  "#EC9A15", // Brand Orange
  "#FFFF00", // Yellow
  "#FF3B30", // Red
  "#34C759", // Green
  "#007AFF", // Blue
  "#FF2D55", // Pink
];

const FONT_SIZES = [
  { label: "Small", value: 16 },
  { label: "Medium", value: 20 },
  { label: "Large", value: 24 },
  { label: "X-Large", value: 28 },
];

const ANIMATIONS = [
  { id: "none", label: "None", icon: "ban" },
  { id: "fade", label: "Fade", icon: "contrast" },
  { id: "slide", label: "Slide", icon: "arrow-forward" },
  { id: "typewriter", label: "Type", icon: "text" },
];

export default function CaptionsToolPanel({
  onClose,
  onCaptionsGenerated,
  videoUri,
  videoDuration,
  initialCaptions,
}: CaptionsToolPanelProps) {
  const [captions, setCaptions] = useState<Caption[]>(initialCaptions ?? []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  // Global caption styles
  const [fontSize, setFontSize] = useState(20);
  const [fontFamily] = useState("System");
  const [color, setColor] = useState("#FFFFFF");
  const [backgroundColor] = useState("rgba(0,0,0,0.7)");
  const [position, setPosition] = useState<"top" | "center" | "bottom">("bottom");
  const [animation, setAnimation] = useState<"none" | "fade" | "slide" | "typewriter">("fade");

  // Generate captions from video audio
  const generateCaptions = async () => {
    try {
      setIsGenerating(true);

      // Call auto-caption service
      const result = await autoCaption("temp-reel-id", videoUri);

      if (result.success && result.data) {
        // Parse captions from API response
        const captionText = result.data.caption || "";
        
        // Split caption into sentences for better timing
        const sentences = captionText
          .split(/[.!?]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        const generatedCaptions: Caption[] = sentences.map(
          (text: string, index: number) => {
            const startTime = (index * videoDuration) / Math.max(sentences.length, 1);
            const endTime = Math.min(
              startTime + 3,
              videoDuration
            );

            return {
              id: `caption-${Date.now()}-${index}`,
              text: text,
              startTime,
              endTime,
              fontSize,
              fontFamily,
              color,
              backgroundColor,
              position,
              animation,
            };
          }
        );

        setCaptions(generatedCaptions);
        Alert.alert(
          "Success",
          `Generated ${generatedCaptions.length} caption(s) from audio`
        );
      } else {
        Alert.alert("Info", result.message || "No speech detected in video");
      }
    } catch {

      // For demo purposes, create sample captions if API fails
      if (__DEV__) {
        const sampleCaptions: Caption[] = [
          {
            id: `caption-${Date.now()}-0`,
            text: "Welcome to the video",
            startTime: 0,
            endTime: 2,
            fontSize,
            fontFamily,
            color,
            backgroundColor,
            position,
            animation,
          },
          {
            id: `caption-${Date.now()}-1`,
            text: "This is a sample caption",
            startTime: 2,
            endTime: 4,
            fontSize,
            fontFamily,
            color,
            backgroundColor,
            position,
            animation,
          },
          {
            id: `caption-${Date.now()}-2`,
            text: "You can edit or add more",
            startTime: 4,
            endTime: 6,
            fontSize,
            fontFamily,
            color,
            backgroundColor,
            position,
            animation,
          },
        ];
        setCaptions(sampleCaptions);
        Alert.alert("Captions unavailable", "Showing sample captions because the captions service is not available.");
      } else {
        Alert.alert(
          "Error",
          "Failed to generate captions. Please check your internet connection."
        );
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Add manual caption
  const addManualCaption = () => {
    const newCaption: Caption = {
      id: `caption-${Date.now()}`,
      text: "New caption",
      startTime: 0,
      endTime: 2,
      fontSize,
      fontFamily,
      color,
      backgroundColor,
      position,
      animation,
    };
    setCaptions([...captions, newCaption]);
    setSelectedCaptionId(newCaption.id);
    setEditingText(newCaption.text);
  };

  // Update caption text
  const updateCaptionText = (captionId: string, newText: string) => {
    setCaptions(
      captions.map((cap) =>
        cap.id === captionId ? { ...cap, text: newText } : cap
      )
    );
  };

  // Update caption timing
  const updateCaptionTiming = (
    captionId: string,
    field: "startTime" | "endTime",
    delta: number
  ) => {
    setCaptions(
      captions.map((cap) => {
        if (cap.id !== captionId) return cap;

        if (field === "startTime") {
          const newStart = Math.max(0, cap.startTime + delta);
          return { ...cap, startTime: Math.min(newStart, cap.endTime - 0.5) };
        } else {
          const newEnd = Math.min(videoDuration, cap.endTime + delta);
          return { ...cap, endTime: Math.max(newEnd, cap.startTime + 0.5) };
        }
      })
    );
  };

  // Delete caption
  const deleteCaption = (captionId: string) => {
    setCaptions(captions.filter((cap) => cap.id !== captionId));
    if (selectedCaptionId === captionId) {
      setSelectedCaptionId(null);
      setEditingText("");
    }
  };

  // Apply global styles to all captions
  const applyStylesToAll = () => {
    setCaptions(
      captions.map((cap) => ({
        ...cap,
        fontSize,
        fontFamily,
        color,
        backgroundColor,
        position,
        animation,
      }))
    );
    Alert.alert("Success", "Styles applied to all captions");
  };

  // Apply captions
  const handleApplyCaptions = () => {
    if (captions.length === 0) {
      Alert.alert("Error", "Please generate or add captions first");
      return;
    }
    onCaptionsGenerated(captions);
    onClose();
  };

  const selectedCaption = captions.find((cap) => cap.id === selectedCaptionId);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>CAPTIONS</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Generate Section */}
        {captions.length === 0 && (
          <View style={styles.section}>
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="closed-caption"
                size={48}
                color="#666"
              />
              <Text style={styles.emptyText}>No captions yet</Text>
              <Text style={styles.emptySubtext}>
                Auto-generate from audio or add manually
              </Text>
            </View>

            <TouchableOpacity
              style={styles.generateButton}
              onPress={generateCaptions}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <ActivityIndicator size="small" color="#000" />
                  <Text style={styles.generateButtonText}>Generating...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color="#000" />
                  <Text style={styles.generateButtonText}>
                    Auto-Generate Captions
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.manualButton}
              onPress={addManualCaption}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.manualButtonText}>Add Manual Caption</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Captions List */}
        {captions.length > 0 && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>
                  Captions ({captions.length})
                </Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={addManualCaption}
                >
                  <Ionicons name="add" size={20} color="#EC9A15" />
                </TouchableOpacity>
              </View>

              {captions.map((caption) => (
                <TouchableOpacity
                  key={caption.id}
                  style={[
                    styles.captionItem,
                    selectedCaptionId === caption.id && styles.captionItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedCaptionId(caption.id);
                    setEditingText(caption.text);
                  }}
                >
                  <View style={styles.captionContent}>
                    <Text style={styles.captionText} numberOfLines={2}>
                      {caption.text}
                    </Text>
                    <Text style={styles.captionTime}>
                      {caption.startTime.toFixed(1)}s - {caption.endTime.toFixed(1)}s
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteCaption(caption.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ff3b30" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>

            {/* Edit Caption */}
            {selectedCaption && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Edit Caption</Text>

                <TextInput
                  style={styles.textInput}
                  value={editingText}
                  onChangeText={setEditingText}
                  onBlur={() => updateCaptionText(selectedCaption.id, editingText)}
                  placeholder="Caption text"
                  placeholderTextColor="#666"
                  multiline
                />

                <View style={styles.timingRow}>
                  <View style={styles.timingControl}>
                    <Text style={styles.timingLabel}>Start</Text>
                    <View style={styles.timingButtons}>
                      <TouchableOpacity
                        onPress={() =>
                          updateCaptionTiming(selectedCaption.id, "startTime", -0.1)
                        }
                      >
                        <Ionicons name="remove-circle" size={24} color="#888" />
                      </TouchableOpacity>
                      <Text style={styles.timingValue}>
                        {selectedCaption.startTime.toFixed(1)}s
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          updateCaptionTiming(selectedCaption.id, "startTime", 0.1)
                        }
                      >
                        <Ionicons name="add-circle" size={24} color="#888" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.timingControl}>
                    <Text style={styles.timingLabel}>End</Text>
                    <View style={styles.timingButtons}>
                      <TouchableOpacity
                        onPress={() =>
                          updateCaptionTiming(selectedCaption.id, "endTime", -0.1)
                        }
                      >
                        <Ionicons name="remove-circle" size={24} color="#888" />
                      </TouchableOpacity>
                      <Text style={styles.timingValue}>
                        {selectedCaption.endTime.toFixed(1)}s
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          updateCaptionTiming(selectedCaption.id, "endTime", 0.1)
                        }
                      >
                        <Ionicons name="add-circle" size={24} color="#888" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Global Styles */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Caption Styles</Text>
                <TouchableOpacity
                  style={styles.applyAllButton}
                  onPress={applyStylesToAll}
                >
                  <Text style={styles.applyAllText}>Apply to All</Text>
                </TouchableOpacity>
              </View>

              {/* Font Size */}
              <View style={styles.styleRow}>
                <Text style={styles.styleLabel}>Size</Text>
                <View style={styles.sizeButtons}>
                  {FONT_SIZES.map((size) => (
                    <TouchableOpacity
                      key={size.value}
                      style={[
                        styles.sizeButton,
                        fontSize === size.value && styles.sizeButtonActive,
                      ]}
                      onPress={() => setFontSize(size.value)}
                    >
                      <Text
                        style={[
                          styles.sizeButtonText,
                          fontSize === size.value && styles.sizeButtonTextActive,
                        ]}
                      >
                        {size.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Text Color */}
              <View style={styles.styleRow}>
                <Text style={styles.styleLabel}>Color</Text>
                <View style={styles.colorGrid}>
                  {PRESET_COLORS.map((presetColor) => (
                    <TouchableOpacity
                      key={presetColor}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: presetColor },
                        color === presetColor && styles.colorSwatchActive,
                      ]}
                      onPress={() => setColor(presetColor)}
                    />
                  ))}
                </View>
              </View>

              {/* Position */}
              <View style={styles.styleRow}>
                <Text style={styles.styleLabel}>Position</Text>
                <View style={styles.positionButtons}>
                  {(["top", "center", "bottom"] as const).map((pos) => (
                    <TouchableOpacity
                      key={pos}
                      style={[
                        styles.positionButton,
                        position === pos && styles.positionButtonActive,
                      ]}
                      onPress={() => setPosition(pos)}
                    >
                      <Text
                        style={[
                          styles.positionButtonText,
                          position === pos && styles.positionButtonTextActive,
                        ]}
                      >
                        {pos.charAt(0).toUpperCase() + pos.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Animation */}
              <View style={styles.styleRow}>
                <Text style={styles.styleLabel}>Animation</Text>
                <View style={styles.animationButtons}>
                  {ANIMATIONS.map((anim) => (
                    <TouchableOpacity
                      key={anim.id}
                      style={[
                        styles.animationButton,
                        animation === anim.id && styles.animationButtonActive,
                      ]}
                      onPress={() => setAnimation(anim.id as any)}
                    >
                      <Ionicons
                        name={anim.icon as any}
                        size={16}
                        color={animation === anim.id ? "#000" : "#fff"}
                      />
                      <Text
                        style={[
                          styles.animationButtonText,
                          animation === anim.id && styles.animationButtonTextActive,
                        ]}
                      >
                        {anim.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Apply Button */}
      {captions.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={handleApplyCaptions}
          >
            <Text style={styles.applyButtonText}>Apply Captions</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "75%",
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
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
  },
  emptySubtext: {
    color: "#888",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EC9A15",
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
    marginBottom: 12,
  },
  generateButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  manualButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  manualButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  addButton: {
    padding: 4,
  },
  captionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a2a",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  captionItemSelected: {
    borderColor: "#EC9A15",
  },
  captionContent: {
    flex: 1,
    marginRight: 12,
  },
  captionText: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 4,
  },
  captionTime: {
    color: "#888",
    fontSize: 12,
  },
  deleteButton: {
    padding: 4,
  },
  textInput: {
    backgroundColor: "#2a2a2a",
    borderRadius: 10,
    padding: 12,
    color: "#fff",
    fontSize: 15,
    minHeight: 60,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  timingRow: {
    flexDirection: "row",
    gap: 16,
  },
  timingControl: {
    flex: 1,
  },
  timingLabel: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  timingButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#2a2a2a",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  timingValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  applyAllButton: {
    backgroundColor: "#EC9A15",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  applyAllText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "600",
  },
  styleRow: {
    marginBottom: 16,
  },
  styleLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  sizeButtons: {
    flexDirection: "row",
    gap: 8,
  },
  sizeButton: {
    flex: 1,
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  sizeButtonActive: {
    backgroundColor: "#EC9A15",
  },
  sizeButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  sizeButtonTextActive: {
    color: "#000",
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: "transparent",
  },
  colorSwatchActive: {
    borderColor: "#EC9A15",
  },
  positionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  positionButton: {
    flex: 1,
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  positionButtonActive: {
    backgroundColor: "#EC9A15",
  },
  positionButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  positionButtonTextActive: {
    color: "#000",
  },
  animationButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  animationButton: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  animationButtonActive: {
    backgroundColor: "#EC9A15",
  },
  animationButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  animationButtonTextActive: {
    color: "#000",
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
