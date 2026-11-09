import { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { showPermissionSettingsAlert } from "@/utils/permissionSettings";

interface VoiceToolPanelProps {
  onClose: () => void;
  onAddVoice: (voiceRecording: {
    uri: string;
    duration: number;
    title: string;
  }) => void;
  currentTime: number;
}

export default function VoiceToolPanel({
  onClose,
  onAddVoice,
  currentTime,
}: VoiceToolPanelProps) {
  const [recording, setRecording] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [sound, setSound] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [pulseAnim] = useState(() => new Animated.Value(1));
  const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start recording animation
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Stop recording animation
  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  // Request audio permissions and start recording
  const startRecording = async () => {
    try {
      // Import expo-audio for recording
      let Audio;
      try {
        Audio = require('expo-audio').Audio;
      } catch {
        Alert.alert(
          "Audio Not Available",
          "Voice recording requires a native rebuild with expo-audio. This feature is not available in this build."
        );
        return;
      }
      
      // Request permissions
      const { status, canAskAgain } = await Audio.requestPermissionsAsync();
      if (status !== "granted" && !canAskAgain) {
        showPermissionSettingsAlert("Microphone access");
        return;
      }
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant microphone access to record audio"
        );
        return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
      startPulseAnimation();

      // Track duration
      durationInterval.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 0.1);
      }, 100);
    } catch {
      Alert.alert("Error", "Failed to start recording");
    }
  };

  // Stop recording
  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      stopPulseAnimation();

      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (uri) {
        setRecordedUri(uri);
      }

      setRecording(null);
    } catch {
      Alert.alert("Error", "Failed to stop recording");
    }
  };

  // Play recorded audio
  const playRecording = async () => {
    if (!recordedUri) return;

    try {
      if (sound && isPlaying) {
        // Stop playback
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
      } else {
        // Import expo-audio for playback
        let Audio;
        try {
          Audio = require('expo-audio').Audio;
        } catch {
          Alert.alert(
            "Audio Not Available",
            "Playback requires a native rebuild with expo-audio."
          );
          return;
        }
        
        // Start playback
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: recordedUri },
          { shouldPlay: true }
        );

        newSound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
          }
        });

        setSound(newSound);
        setIsPlaying(true);
      }
    } catch {
      Alert.alert("Error", "Failed to play recording");
    }
  };

  // Delete recording
  const deleteRecording = () => {
    Alert.alert(
      "Delete Recording",
      "Are you sure you want to delete this recording?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (sound) {
              await sound.unloadAsync();
              setSound(null);
            }
            setRecordedUri(null);
            setRecordingDuration(0);
            setIsPlaying(false);
          },
        },
      ]
    );
  };

  // Add voice recording to timeline
  const handleAddVoice = async () => {
    if (!recordedUri) {
      Alert.alert("Error", "No recording to add");
      return;
    }

    try {
      setIsUploading(true);

      // Voice-overs stay on the device while editing; publishing uploads them
      // (POST /reels/upload-url with assetType "voiceovers").
      onAddVoice({
        uri: recordedUri,
        duration: recordingDuration,
        title: `Voice Recording ${new Date().toLocaleTimeString()}`,
      });
    } catch {
      Alert.alert("Error", "Failed to add voice recording");
    } finally {
      setIsUploading(false);
    }
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}.${ms}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>VOICE</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Recording Status */}
        <View style={styles.statusContainer}>
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Recording...</Text>
            </View>
          )}
          <Text style={styles.durationText}>
            {formatDuration(recordingDuration)}
          </Text>
        </View>

        {/* Recording Controls */}
        <View style={styles.recordingControls}>
          {!recordedUri ? (
            // Recording mode
            <TouchableOpacity
              style={styles.recordButton}
              onPress={isRecording ? stopRecording : startRecording}
              activeOpacity={0.8}
            >
              <Animated.View
                style={[
                  styles.recordButtonInner,
                  isRecording && styles.recordButtonInnerActive,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                {isRecording ? (
                  <MaterialCommunityIcons
                    name="stop"
                    size={48}
                    color="#fff"
                  />
                ) : (
                  <Ionicons name="mic" size={48} color="#fff" />
                )}
              </Animated.View>
            </TouchableOpacity>
          ) : (
            // Playback mode
            <View style={styles.playbackControls}>
              <TouchableOpacity
                style={styles.playbackButton}
                onPress={playRecording}
              >
                <Ionicons
                  name={isPlaying ? "pause-circle" : "play-circle"}
                  size={64}
                  color="#EC9A15"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteRecordingButton}
                onPress={deleteRecording}
              >
                <Ionicons name="trash" size={32} color="#ff3b30" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          {!recordedUri ? (
            <>
              <Ionicons name="information-circle" size={20} color="#888" />
              <Text style={styles.instructionText}>
                {isRecording
                  ? "Tap the button to stop recording"
                  : "Tap the microphone to start recording"}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.instructionText}>
                Recording ready! Preview or add to timeline
              </Text>
            </>
          )}
        </View>

        {/* Add Button */}
        {recordedUri && (
          <TouchableOpacity
            style={[styles.addButton, isUploading && styles.addButtonDisabled]}
            onPress={handleAddVoice}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <ActivityIndicator size="small" color="#000" />
                <Text style={styles.addButtonText}>Adding...</Text>
              </>
            ) : (
              <>
                <Text style={styles.addButtonText}>Add to Timeline</Text>
                <Ionicons name="arrow-forward" size={20} color="#000" />
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Tips for Better Recording:</Text>
          <View style={styles.tip}>
            <Ionicons name="checkmark" size={16} color="#EC9A15" />
            <Text style={styles.tipText}>Find a quiet environment</Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="checkmark" size={16} color="#EC9A15" />
            <Text style={styles.tipText}>
              Hold the phone 6-8 inches from your mouth
            </Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="checkmark" size={16} color="#EC9A15" />
            <Text style={styles.tipText}>Speak clearly and at a normal pace</Text>
          </View>
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
    height: "60%",
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
    marginBottom: 24,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  statusContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ff3b30",
  },
  recordingText: {
    color: "#ff3b30",
    fontSize: 14,
    fontWeight: "600",
  },
  durationText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  recordingControls: {
    alignItems: "center",
    marginBottom: 32,
  },
  recordButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordButtonInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#EC9A15",
    justifyContent: "center",
    alignItems: "center",
  },
  recordButtonInnerActive: {
    backgroundColor: "#ff3b30",
  },
  playbackControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  playbackButton: {
    padding: 8,
  },
  deleteRecordingButton: {
    padding: 8,
  },
  instructions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#2a2a2a",
    borderRadius: 10,
    marginBottom: 24,
  },
  instructionText: {
    flex: 1,
    color: "#888",
    fontSize: 13,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EC9A15",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    width: "100%",
    marginBottom: 24,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  tipsContainer: {
    width: "100%",
    backgroundColor: "#2a2a2a",
    borderRadius: 10,
    padding: 16,
    gap: 8,
  },
  tipsTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  tip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tipText: {
    flex: 1,
    color: "#888",
    fontSize: 13,
  },
});
