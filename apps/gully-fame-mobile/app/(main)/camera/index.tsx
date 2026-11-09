import { useState, useRef, useEffect, useCallback } from "react";
import { toastError } from "@/components/ui/Toast";
import { validatePickedAsset } from "@/utils/fileValidation";
import { AppState, View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform, Animated, Modal, ScrollView, Alert, Linking, PanResponder,  InteractionManager } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { setAudioModeAsync } from "expo-audio";
import { 
  Camera, 
  useCameraDevice, 
  useVideoOutput,
  type CameraRef,
} from "react-native-vision-camera";
import { useCameraPermission, useMicrophonePermission } from "react-native-vision-camera/lib/hooks/usePermission";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TopBar from "@modules/video-editor/camera-module/components/capture/TopBar";
import ToolRail from "@modules/video-editor/camera-module/components/capture/ToolRail";
import CaptureControls from "@modules/video-editor/camera-module/components/capture/CaptureControls";
import BottomTabs, { type CaptureTab } from "@modules/video-editor/camera-module/components/capture/BottomTabs";
import LensCarousel, { LENS_REMOVE_ROW } from "@modules/video-editor/camera-module/components/capture/LensCarousel";
import LensOverlay from "@modules/video-editor/camera-module/components/capture/LensOverlay";
import LensBar from "@modules/video-editor/camera-module/components/capture/LensBar";
import PhotoPreview from "@modules/video-editor/camera-module/components/capture/PhotoPreview";
import { useLenses, type Lens } from "@modules/video-editor/camera-module/components/capture/lenses";
import { capturePhotoWithLens } from "@modules/video-editor/camera-module/components/capture/photoCapture";
import * as Haptics from "expo-haptics";
import { importGalleryAsset } from "@modules/video-editor/camera-module/utils/clipImport";
import MusicLibraryModal from "@/components/MusicLibraryModal";
import { listFilters } from "@api/services/filterLibraryService";
import { matchPresetByName } from "@modules/video-editor/camera-module/components/preview/filterPresets";
import { CloseIcon } from "@/icons";

// ============================================================================
// CAMERA IMPLEMENTATION CHOICE: Set CAMERA_USE_EXPO_CAMERA to true to use expo-camera,
// or false to use react-native-vision-camera (v5.2.3, TextureView/compatible mode on Android)
// ============================================================================
const CAMERA_USE_EXPO_CAMERA = false;

type RecordingMode = "video" | "photo";
type CameraFacing = "front" | "back";
type FlashMode = "off" | "on" | "auto";
type SpeedOption = 0.5 | 1 | 1.5 | 2;
type TimerOption = 15 | 30 | 60 | 0;

interface VideoClip {
  id: string;
  uri: string;
  duration: number;
  /** Gallery photos are "photo"; recordings default to video. */
  type?: "video" | "photo";
  thumbnail?: string;
  speed?: SpeedOption;
  musicTrack?: {
    id?: string;
    uri?: string;
    title?: string;
    artist?: string;
    duration?: number;
    startTime?: number; // in milliseconds
  } | null;
  filter?: any;
  /** Lens applied while recording; not burned into video yet, the editor/export must apply it. */
  lens?: Pick<Lens, "id" | "name" | "overlayUrl" | "overlayRect"> | null;
  resolution?: string;
  frameRate?: number;
}

interface CameraFormat {
  resolution: string;
  frameRate: number;
  color: "SDR" | "HDR";
}

export default function TikTokCameraScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<CaptureTab>("camera");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const [transitionComplete, setTransitionComplete] = useState(false);
  const [, setMountError] = useState<string | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      setMountError(null);
      
      // Wait for screen transition to complete before mounting camera surface
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      
      transitionTimeoutRef.current = setTimeout(() => {
        const task = InteractionManager.runAfterInteractions(() => {
          setTransitionComplete(true);
        });
        return () => task.cancel();
      }, 300);

      return () => {
        setIsFocused(false);
        setTransitionComplete(false);
        if (transitionTimeoutRef.current) {
          clearTimeout(transitionTimeoutRef.current);
        }
      };
    }, [])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      setAppState(state);
      if (state !== "active") {
        setTransitionComplete(false);
      } else if (isFocused) {
        // When returning to active, remount camera
        setTimeout(() => {
          setTransitionComplete(true);
        }, 300);
      }
    });
    return () => subscription.remove();
  }, [isFocused]);

  const params = useLocalSearchParams();
  const competitionId = params.competitionId ? String(params.competitionId) : null;
  const competitionName = params.competitionName ? String(params.competitionName) : null;

  // The preview screen's "Discard" navigates back here with a fresh `reset` param.
  useEffect(() => {
    if (params.reset) setRecordedClips([]);
  }, [params.reset]);
  const entryFee = params.entryFee ? String(params.entryFee) : null;

  const supportedResolutions = ["HD", "FHD", "2K", "4K"];
  const supportedFrameRates = [24, 30, 60];


  // Declare facing state BEFORE using it in useCameraDevice
  const [facing, setFacing] = useState<CameraFacing>("back");
  const [flashEnabled, setFlashEnabled] = useState<FlashMode>("off");

  // Vision-camera permission and device hooks (v5)
  const cameraPermission = useCameraPermission();
  const micPermission = useMicrophonePermission();
  
  // Device hook - now facing is defined
  const device = useCameraDevice(facing);
  
  // Video output for vision-camera recording (v5 API)
  const videoOutput = useVideoOutput({
    enableAudio: true,
  });

  const [recordingMode, setRecordingMode] = useState<RecordingMode>("video");
  // Read by the shutter handler so it never acts on a stale mode.
  const modeRef = useRef<RecordingMode>("video");
  useEffect(() => {
    modeRef.current = recordingMode;
  }, [recordingMode]);
  const isCapturingRef = useRef(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [photoPreviewUri, setPhotoPreviewUri] = useState<string | null>(null);
  const [shutterFlash] = useState(() => new Animated.Value(0));
  const { lenses, loading: lensesLoading, toggleSaved: toggleLensSaved } = useLenses();
  const [lensCarouselOpen, setLensCarouselOpen] = useState(false);
  const [selectedLensId, setSelectedLensId] = useState<string | null>(null);
  const selectedLens = lenses.find((lens) => lens.id === selectedLensId) ?? null;
  const [isRecording, setIsRecording] = useState(false);
  const [, setRecordingTime] = useState("00:00");
  const [cameraReady, setCameraReady] = useState(false);
  const [recordedClips, setRecordedClips] = useState<VideoClip[]>([]);
  const [, setCurrentRecordingSegments] = useState<string[]>([]); // Track segments during camera flip
  const [selectedClipIndex, setSelectedClipIndex] = useState<number | null>(null);
  const [selectedMusicTrack, setSelectedMusicTrack] = useState<any | null>(null);
  const [filterList, setFilterList] = useState<any[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<any | null>(null);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [showFilterPopup, setShowFilterPopup] = useState(false);

  const [currentZoom] = useState<number>(1);
  const [showHDPopup, setShowHDPopup] = useState(false);
  const [hdPopupPos] = useState({ x: 0, y: 0 });
  const [selectedCameraFormat, setSelectedCameraFormat] = useState<CameraFormat>({
    resolution: "HD",
    frameRate: 30,
    color: "SDR",
  });

  const [selectedSpeed, setSelectedSpeed] = useState<SpeedOption>(1);
  const [maxRecordingDuration, setMaxRecordingDuration] = useState<TimerOption>(30);
  const [showSpeedPopup, setShowSpeedPopup] = useState(false);
  const [showTimerPopup, setShowTimerPopup] = useState(false);
  const [showMusicPickerModal, setShowMusicPickerModal] = useState(false);
  const [speedPopupPos] = useState({ x: 0, y: 0 });
  const [timerPopupPos] = useState({ x: 0, y: 0 });
  const [filterPopupPos] = useState({ x: 0, y: 0 });
  const [showFilterLabel, setShowFilterLabel] = useState(false);
  const [filterLabelOpacity] = useState(new Animated.Value(0));
  const [showFilterGrid, setShowFilterGrid] = useState(false);

  // Audio playback state
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioPlayerRef = useRef<any>(null);
  const recordingAudioPlayerRef = useRef<any>(null);

  const cameraRef = useRef<CameraRef | null>(null);
  const recordingRef = useRef<any>(null);
  const isCameraFlipping = useRef<boolean>(false); // Track if we're flipping camera during recording
  const autoStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // Track auto-stop timer
  const [progressAnim] = useState(() => new Animated.Value(0));
  const [toolbarOpacity] = useState(() => new Animated.Value(1));
  const [clipBarTranslateY] = useState(() => new Animated.Value(0));
  const [zoomMenuScale] = useState(() => new Animated.Value(0));
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartTime = useRef<number>(0);
  const filterLabelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCameraReady = () => {
    setCameraReady(true);
    
    // If we were recording before camera flip, automatically resume recording
    // This creates a seamless experience where recording continues after flip
    if (isRecording && !recordingRef.current && isCameraFlipping.current) {
      // Small delay to ensure camera is fully ready
      setTimeout(() => {
        if (isRecording && !recordingRef.current) {
          isCameraFlipping.current = false; // Clear flag before starting new segment
          startRecording();
        }
      }, 200);
    }
  };

  const resetRecordingUI = () => {
    Animated.timing(toolbarOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.spring(clipBarTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
    Animated.spring(zoomMenuScale, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
    progressAnim.setValue(0);
  };

  const startRecording = async () => {

    if (isRecording && recordingRef.current) {
      return;
    }

    if (!micPermission.hasPermission) {
      try {
        const granted = await micPermission.requestPermission();
        if (!granted) {
          Alert.alert(
            "Microphone Permission Required",
            "We need access to your microphone to record videos with audio.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Open Settings",
                onPress: () => Linking.openSettings(),
              },
            ]
          );
          return;
        }
      } catch {
        return;
      }
    }

    if (!cameraRef.current) {
      Alert.alert("Error", "Camera not ready. Please wait a moment and try again.");
      return;
    }

    if (!cameraReady) {
      Alert.alert("Error", "Camera is warming up. Please try again.");
      return;
    }

    const isResuming = isRecording; // True if resuming after camera flip

    if (!isResuming) {
      // Fresh start - set initial state
      setIsRecording(true);
      recordingStartTime.current = Date.now();
    } else { /* intentionally ignored */
    }

    // Only animate UI on fresh start, not when resuming
    if (!isResuming) {
      Animated.timing(toolbarOpacity, {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: true,
      }).start();

      Animated.spring(clipBarTranslateY, {
        toValue: -80,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      Animated.spring(zoomMenuScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      const maxDuration = maxRecordingDuration > 0 ? maxRecordingDuration : 60;
      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: maxDuration * 1000,
        useNativeDriver: false,
      }).start();
    }

    try {
      
      // Start music playback if track selected (only on fresh start, not resume)
      if (!isResuming && selectedMusicTrack?.uri) {
        try {
          if (audioPlayerRef.current) {
            await audioPlayerRef.current.pauseAsync();
            await audioPlayerRef.current.unloadAsync();
            audioPlayerRef.current = null;
            setIsPlayingPreview(false);
          }


          const musicStartTime = selectedMusicTrack.startTime || 0;
          
          // Store track info for playback
          recordingAudioPlayerRef.current = {
            uri: selectedMusicTrack.uri,
            startTime: musicStartTime,
            duration: selectedMusicTrack.duration,
            isLooping: true,
          };
          
          // Note: Actual playback would be handled by native module or Video component
        } catch {
          // Continue recording without music if playback fails
        }
      }
      
      // Vision-camera v5 recording via videoOutput.createRecorder()
      if (!videoOutput) {
        throw new Error("Video output not available");
      }

      const recorder = await videoOutput.createRecorder({});
      
      await recorder.startRecording(
        (filePath: string, reason: string) => {
          const elapsed = (Date.now() - recordingStartTime.current) / 1000;
          
          // Check if this is a segment from a camera flip
          if (isCameraFlipping.current) {
            // This is a mid-recording segment from camera flip
            setCurrentRecordingSegments((prev) => [...prev, `file://${filePath}`]);
            recordingRef.current = null;
            // isRecording stays true, camera will auto-resume
            return; // Don't create a clip yet, wait for final stop
          }
          
          // This is the final stop - check if we have segments to merge
          setCurrentRecordingSegments((prevSegments) => {
            const allSegments = prevSegments.length > 0 
              ? [...prevSegments, `file://${filePath}`]
              : [`file://${filePath}`];
            
            
            const newClip: VideoClip = {
              id: Date.now().toString(),
              uri: allSegments.length === 1 ? allSegments[0] : `file://${filePath}`, // Use last segment for now, TODO: merge
              duration: elapsed,
              speed: selectedSpeed,
              musicTrack: selectedMusicTrack ? {
                id: selectedMusicTrack.id || selectedMusicTrack._id,
                uri: selectedMusicTrack.uri,
                title: selectedMusicTrack.title || selectedMusicTrack.name,
                artist: selectedMusicTrack.artist || selectedMusicTrack.singer,
                duration: selectedMusicTrack.duration,
                startTime: selectedMusicTrack.startTime || 0,
              } : null,
              filter: selectedFilter,
              lens: selectedLens
                ? {
                    id: selectedLens.id,
                    name: selectedLens.name,
                    overlayUrl: selectedLens.overlayUrl,
                    overlayRect: selectedLens.overlayRect,
                  }
                : null,
              resolution: selectedCameraFormat.resolution,
              frameRate: selectedCameraFormat.frameRate,
            };
            
            setRecordedClips((prev) => [...prev, newClip]);
            
            // TODO: If allSegments.length > 1, merge video files using FFmpeg or similar
            if (allSegments.length > 1) {
              setTimeout(() => {
                Alert.alert(
                  "Camera Flip Recording",
                  `Recording captured ${allSegments.length} segments from camera flips. Note: These segments need to be merged into a single video. This feature requires FFmpeg integration.`,
                  [{ text: "OK" }]
                );
              }, 500);
            }
            
            return []; // Clear segments
          });
          
          setIsRecording(false);
          recordingRef.current = null;
          resetRecordingUI();
        },
        (error: Error) => {
          Alert.alert("Recording Error", error?.message || "Failed during recording");
          setIsRecording(false);
          setCurrentRecordingSegments([]); // Clear segments on error
          isCameraFlipping.current = false;
          recordingRef.current = null;
          resetRecordingUI();
        }
      );

      recordingRef.current = recorder;

      // Set auto-stop timer only on fresh start, not when resuming after camera flip
      if (!isResuming) {
        const maxDuration = maxRecordingDuration > 0 ? maxRecordingDuration : 60;
        
        // Clear any existing auto-stop timer
        if (autoStopTimeoutRef.current) {
          clearTimeout(autoStopTimeoutRef.current);
        }
        
        autoStopTimeoutRef.current = setTimeout(() => {
          if (recordingRef.current) {
            isCameraFlipping.current = false; // Ensure final stop
            recordingRef.current.stopRecording();
          }
        }, maxDuration * 1000);
        
      } else {
        // When resuming, calculate remaining time and set new timer
        const elapsed = (Date.now() - recordingStartTime.current) / 1000;
        const maxDuration = maxRecordingDuration > 0 ? maxRecordingDuration : 60;
        const remaining = maxDuration - elapsed;
        
        if (remaining > 0) {
          
          // Clear any existing auto-stop timer
          if (autoStopTimeoutRef.current) {
            clearTimeout(autoStopTimeoutRef.current);
          }
          
          autoStopTimeoutRef.current = setTimeout(() => {
            if (recordingRef.current) {
              isCameraFlipping.current = false; // Ensure final stop
              recordingRef.current.stopRecording();
            }
          }, remaining * 1000);
        } else {
          // Time already expired, stop immediately
          if (recordingRef.current) {
            isCameraFlipping.current = false;
            recordingRef.current.stopRecording();
          }
        }
      }
    } catch (error: any) {
      setIsRecording(false);
      setCurrentRecordingSegments([]);
      recordingRef.current = null;
      isCameraFlipping.current = false;
      resetRecordingUI();
      Alert.alert("Recording Error", error?.message || "Failed to start recording.");
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;


    // CRITICAL: Ensure this is treated as a FINAL stop, not a camera flip
    isCameraFlipping.current = false;

    // Clear auto-stop timer
    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }

    try {
      // Stop music playback
      if (recordingAudioPlayerRef.current) {
        try {
          await recordingAudioPlayerRef.current.pauseAsync();
          await recordingAudioPlayerRef.current.unloadAsync();
        } catch { /* intentionally ignored */
        }
        recordingAudioPlayerRef.current = null;
      }

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      if (recordingRef.current) {
        await recordingRef.current.stopRecording();
      } else {
        setIsRecording(false);
        setCurrentRecordingSegments([]);
        resetRecordingUI();
      }
    } catch {
      setIsRecording(false);
      setCurrentRecordingSegments([]);
      recordingRef.current = null;
      resetRecordingUI();
    }
  };

  const takePicture = async () => {
    if (isCapturingRef.current) return;
    if (!cameraRef.current || !cameraReady) {
      Alert.alert("Camera not ready", "Please wait a moment and try again.");
      return;
    }
    isCapturingRef.current = true;
    setIsCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    shutterFlash.setValue(1);
    Animated.timing(shutterFlash, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    try {
      const uri = await capturePhotoWithLens(cameraRef.current, selectedLens);
      setPhotoPreviewUri(uri);
    } catch (error: any) {
      Alert.alert("Couldn't take photo", error?.message ?? "Please try again.");
    } finally {
      isCapturingRef.current = false;
      setIsCapturing(false);
    }
  };

  /** Single entry point for the shutter (normal button and lens carousel centre icon). */
  const handleShutterPress = () => {
    const mode = modeRef.current;
    if (mode === "photo") {
      takePicture();
      return;
    }
    handleRecordPress();
  };

  const handlePhotoNext = () => {
    if (!photoPreviewUri) return;
    const photoClip = {
      id: `photo-${Date.now()}`,
      uri: photoPreviewUri,
      duration: 0,
      type: "photo",
      lens: selectedLens ? { id: selectedLens.id, name: selectedLens.name } : null,
    };
    setPhotoPreviewUri(null);
    router.push({
      pathname: "/(main)/upload/preview",
      params: {
        clips: JSON.stringify([photoClip]),
        mediaType: "photo",
        ...(competitionId && { competitionId }),
        ...(competitionName && { competitionName }),
        ...(entryFee && { entryFee }),
      },
    });
  };

  const openLenses = () => {
    setLensCarouselOpen(true);
    if (!selectedLensId && lenses[0]) setSelectedLensId(lenses[0].id);
  };

  const closeLenses = () => {
    setLensCarouselOpen(false);
    setSelectedLensId(null);
  };

  const handleRecordPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const deleteClip = (clipId: string) => {
    Alert.alert("Discard this clip?", "Are you sure you want to delete this clip?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: () => {
          setRecordedClips((prev) => prev.filter((clip) => clip.id !== clipId));
          if (selectedClipIndex !== null) {
            setSelectedClipIndex(null);
          }
        },
      },
    ]);
  };

  const toggleCamera = async () => {
    const wasRecording = isRecording;
    
    // CRITICAL: Turn off flash before flipping camera
    // Front camera doesn't have flash, so this prevents crash
    if (flashEnabled !== "off") {
      setFlashEnabled("off");
      // Wait a moment for flash to turn off
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // If currently recording, stop the current segment (but keep isRecording true)
    if (wasRecording && recordingRef.current) {
      isCameraFlipping.current = true; // Mark that we're flipping during recording
      try {
        // Stop current recording segment
        await recordingRef.current.stopRecording();
        // isRecording stays true, will auto-resume after camera switch
      } catch {
        isCameraFlipping.current = false;
      }
    }
    
    // Flip the camera - recording will auto-resume in handleCameraReady
    setCameraReady(false);
    setFacing((prev) => (prev === "back" ? "front" : "back"));
  };

  const handleClose = () => {
    if (recordedClips.length > 0) {
      Alert.alert(
        "Discard Recording?",
        "You have recorded clips. Are you sure you want to go back?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              setRecordedClips([]);
              router.back();
            },
          },
        ]
      );
    } else {
      router.replace("/(main)");
    }
  };

  const toggleFlash = () => {
    setFlashEnabled((prev) => {
      if (prev === "off") return "on";
      if (prev === "on") return "auto";
      return "off";
    });
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset) return;

      const invalid = validatePickedAsset(asset, ["image", "video"]);
      if (invalid) {
        toastError(invalid);
        return;
      }

      // True duration in seconds (the picker reports ms) and rotation baked into the pixels.
      const media = await importGalleryAsset(asset);
      const clip: VideoClip = {
        id: `gallery-${Date.now()}`,
        uri: media.uri,
        duration: media.duration,
        type: media.type,
        thumbnail: media.type === "video" ? media.uri : undefined,
        speed: selectedSpeed,
        musicTrack: selectedMusicTrack,
        filter: selectedFilter,
        resolution: selectedCameraFormat.resolution,
        frameRate: selectedCameraFormat.frameRate,
      };

      setRecordedClips((prev) => [...prev, clip]);
    } catch { /* intentionally ignored */
    }
  };

  const handleNext = () => {
    if (recordedClips.length === 0) {
      Alert.alert("No Clips", "Please record at least one clip before proceeding.");
      return;
    }

    const clipsWithMetadata = recordedClips.map((clip) => ({
      ...clip,
      speed: selectedSpeed,
      musicTrack: selectedMusicTrack,
      filter: selectedFilter,
      resolution: selectedCameraFormat.resolution,
      frameRate: selectedCameraFormat.frameRate,
    }));

    router.push({
      pathname: "/(main)/upload/preview",
      params: {
        clips: JSON.stringify(clipsWithMetadata),
        mediaType: "video",
        ...(competitionId && { competitionId }),
        ...(competitionName && { competitionName }),
        ...(entryFee && { entryFee }),
      },
    });
  };

  const showFilterLabelBriefly = () => {
    if (filterLabelTimeoutRef.current) {
      clearTimeout(filterLabelTimeoutRef.current);
    }

    setShowFilterLabel(true);
    Animated.sequence([
      Animated.timing(filterLabelOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(800),
      Animated.timing(filterLabelOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    filterLabelTimeoutRef.current = setTimeout(() => {
      setShowFilterLabel(false);
    }, 1300);
  };

  const handleFilterSwipe = (direction: "left" | "right") => {
    if (filterList.length === 0) return;

    const currentIndex = filterList.findIndex((f) => f.id === selectedFilter?.id);
    let nextIndex;

    if (direction === "left") {
      nextIndex = (currentIndex + 1) % filterList.length;
    } else {
      nextIndex = (currentIndex - 1 + filterList.length) % filterList.length;
    }

    const nextFilter = filterList[nextIndex];
    setSelectedFilter(nextFilter);
    showFilterLabelBriefly();
  };

  // The responder below is created once, so it reads live state through this ref.
  const filterSwipeBlockedRef = useRef(false);
  filterSwipeBlockedRef.current = isRecording || lensCarouselOpen || !!photoPreviewUri;

  const cameraSwipeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !filterSwipeBlockedRef.current,
      onMoveShouldSetPanResponder: (evt, gestureState) =>
        !filterSwipeBlockedRef.current && Math.abs(gestureState.dx) > 10,
      onPanResponderRelease: (evt, gestureState) => {
        if (filterSwipeBlockedRef.current || filterList.length === 0) return;

        const SWIPE_THRESHOLD = 50;
        if (gestureState.dx > SWIPE_THRESHOLD) {
          handleFilterSwipe("right");
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          handleFilterSwipe("left");
        }
      },
    })
  ).current;

  // Recording timer (mm:ss) - pehle ye kabhi update nahi hota tha
  useEffect(() => {
    if (!isRecording) {
      setRecordingTime("00:00");
      setRecordingSeconds(0);
      return;
    }
    const id = setInterval(() => {
      const elapsed = (Date.now() - recordingStartTime.current) / 1000;
      setRecordingSeconds(elapsed);
      const total = Math.floor(elapsed);
      const mm = String(Math.floor(total / 60)).padStart(2, "0");
      const ss = String(total % 60).padStart(2, "0");
      setRecordingTime(`${mm}:${ss}`);
    }, 500);
    return () => clearInterval(id);
  }, [isRecording]);

  useEffect(() => {
    const verifyRole = async () => {
      const role = await AsyncStorage.getItem("userRole");
      const isParticipant = role === "participant" || role === "participants";

      if (!isParticipant) {
        Alert.alert(
          "Participants only",
          "Switch your account role to participant to submit entries.",
          [{ text: "OK", onPress: () => router.replace("/(main)") }]
        );
      }
    };
    verifyRole();
  }, []);

  useEffect(() => {
    const loadFilterLibrary = async () => {
      setLoadingFilters(true);
      const response = await listFilters(undefined, 1, 50);
      if (response.success && response.data?.filters) {
        setFilterList(response.data.filters);
      } else {
        setFilterList([]);
      }
      setLoadingFilters(false);
    };
    loadFilterLibrary();
  }, []);

  // Music preview playback
  useEffect(() => {
    const playMusicPreview = async () => {
      // Stop any existing preview
      if (isPlayingPreview && audioPlayerRef.current) {
        try {
          // We'll implement this with a hidden Video component or just track state
          audioPlayerRef.current = null;
        } catch { /* intentionally ignored */
        }
        setIsPlayingPreview(false);
      }

      if (selectedMusicTrack?.uri) {
        try {
          
          // Store track reference for preview
          audioPlayerRef.current = {
            uri: selectedMusicTrack.uri,
            isPlaying: true,
          };
          
          setIsPlayingPreview(true);
          
          // Note: For actual playback, this would need a native audio player
          // or the hidden Video component. For now, we're tracking state.
          // The system will handle audio mode auto-ducking during preview.
        } catch {
          audioPlayerRef.current = null;
          setIsPlayingPreview(false);
        }
      }
    };

    playMusicPreview();

    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current = null;
      }
    };
    // Keyed on the chosen track only: isPlayingPreview is read to stop the previous
    // preview, and listing it would restart playback every time it toggles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMusicTrack]);

  useEffect(() => {
    (async () => {
      if (!cameraPermission.hasPermission) {
        await cameraPermission.requestPermission();
      }
      if (!micPermission.hasPermission) {
        await micPermission.requestPermission();
      }
      
      // Set audio mode for camera + music playback compatibility
      try {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
      } catch { /* intentionally ignored */
      }
    })();

    // Cleanup audio on unmount
    return () => {
      audioPlayerRef.current?.release();
      recordingAudioPlayerRef.current?.release();
    };
    // Mount-only on purpose: request permissions once when the screen opens. Re-running
    // when the permission objects change would re-prompt after the user denies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-disable flash when switching to front camera (front camera has no flash unit)
  useEffect(() => {
    if (facing === "front" && flashEnabled !== "off") {
      setFlashEnabled("off");
    }
  }, [facing, flashEnabled]);

  // Physical Android Device Guard: BOTH camera and microphone permissions chahiye mount se pehle
  const hasAllPermissions = cameraPermission.hasPermission && micPermission.hasPermission;

  if (!hasAllPermissions) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Permissions Required</Text>
          <Text style={styles.permissionText}>
            Camera and microphone permissions are required to record videos.
          </Text>
          <TouchableOpacity
            onPress={async () => {
              await cameraPermission.requestPermission();
              await micPermission.requestPermission();
            }}
            style={styles.permissionButton}
          >
            <Text style={styles.permissionButtonText}>Grant Permissions</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} {...cameraSwipeResponder.panHandlers}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* CRITICAL FIX: Camera ALWAYS rendered at bottom, no conditional mount to avoid Surface abandonment */}
      {CAMERA_USE_EXPO_CAMERA ? (
        // Stub for expo-camera (would need CameraView import)
        <View style={StyleSheet.absoluteFill} />
      ) : (
        // react-native-vision-camera v5 (TextureView mode on Android for compatibility)
        device && isFocused && transitionComplete && appState === "active" && cameraPermission.hasPermission && micPermission.hasPermission && (
          <Camera
            key={`camera-${facing}`}
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={true}
            outputs={[videoOutput]}
            torchMode={facing === "back" && flashEnabled === "on" ? "on" : "off"}
            zoom={currentZoom}
            implementationMode="compatible"
            onStarted={handleCameraReady}
            onError={(error: Error) => {
              setMountError(error.message);
            }}
          />
        )
      )}

      {/* Build markers removed for production */}

      {selectedLens && <LensOverlay lens={selectedLens} isRecording={isRecording} />}

      <Animated.View pointerEvents="none" style={[styles.shutterFlash, { opacity: shutterFlash }]} />

      <TopBar
        topInset={insets.top}
        showProgress={recordingMode === "video"}
        segments={recordedClips.map((clip) => clip.duration)}
        liveSeconds={isRecording ? recordingSeconds : 0}
        maxDuration={maxRecordingDuration}
        onClose={handleClose}
        onFlip={toggleCamera}
      />

      {activeTab === "camera" && (
        <ToolRail
          top={insets.top + 140}
          maxDuration={maxRecordingDuration}
          countdown={0}
          speed={selectedSpeed}
          flash={flashEnabled}
          hasSound={!!selectedMusicTrack}
          hasEffect={!!selectedFilter}
          showFlash={facing === "back"}
          disabled={isRecording}
          onSound={() => setShowMusicPickerModal(true)}
          onDuration={() => setMaxRecordingDuration((prev) => (prev === 15 ? 30 : prev === 30 ? 60 : 15))}
          onTimer={() => {}}
          onEffects={() => setShowFilterGrid(true)}
          onSpeed={() =>
            setSelectedSpeed((prev) => {
              const speeds: SpeedOption[] = [0.5, 1, 1.5, 2];
              return speeds[(speeds.indexOf(prev) + 1) % speeds.length];
            })
          }
          onFlash={toggleFlash}
        />
      )}

      {activeTab === "live" && (
        <View style={styles.liveComingSoon} pointerEvents="none">
          <Text style={styles.liveComingSoonTitle}>Live</Text>
          <Text style={styles.liveComingSoonText}>Coming soon</Text>
        </View>
      )}

      <View style={styles.captureBottom} pointerEvents="box-none">
        {activeTab === "camera" && (
          <CaptureControls
            mode={recordingMode}
            isRecording={isRecording}
            progress={recordingSeconds / (maxRecordingDuration > 0 ? maxRecordingDuration : 60)}
            clipCount={recordedClips.length}
            disabled={isCapturing}
            onModeChange={(mode) => !isCapturing && setRecordingMode(mode)}
            onRecordPress={handleShutterPress}
            onLenses={openLenses}
            onDeleteLast={() => {
              const last = recordedClips[recordedClips.length - 1];
              if (last) deleteClip(last.id);
            }}
            onNext={handleNext}
            lensCarousel={
              lensCarouselOpen && !isRecording ? (
                <LensCarousel
                  lenses={lenses}
                  loading={lensesLoading}
                  selectedId={selectedLensId}
                  mode={recordingMode}
                  disabled={isCapturing}
                  onSelect={(lens) => setSelectedLensId(lens.id)}
                  onShutter={handleShutterPress}
                  onRemove={closeLenses}
                />
              ) : undefined
            }
          />
        )}
        {/* Same height as the tab row, so the shutter stays put while recording. */}
        {isRecording && <View style={{ height: insets.bottom + 82 + (lensCarouselOpen ? LENS_REMOVE_ROW : 0) }} />}
        {!isRecording &&
          (lensCarouselOpen && activeTab === "camera" ? (
            <LensBar
              bottomInset={insets.bottom}
              lenses={lenses}
              selected={selectedLens}
              onSelect={(lens) => setSelectedLensId(lens.id)}
              onToggleSaved={toggleLensSaved}
            />
          ) : (
            <BottomTabs
              bottomInset={insets.bottom}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onGallery={pickFromGallery}
            />
          ))}
      </View>

      {/* MODALS */}
      <View style={styles.overlay} pointerEvents="box-none">
        <Modal
          visible={showHDPopup}
          transparent
          animationType="fade"
          onRequestClose={() => setShowHDPopup(false)}
        >
          <TouchableOpacity
            style={styles.popupOverlay}
            activeOpacity={1}
            onPress={() => setShowHDPopup(false)}
          >
            <View
              style={[
                styles.hdPopup,
                {
                  left: hdPopupPos.x,
                  top: hdPopupPos.y,
                },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.hdPopupArrow} />
              <View style={styles.hdPopupSection}>
                <Text style={styles.hdPopupLabel}>Resolution</Text>
                <View style={styles.hdPopupOptionsRow}>
                  {supportedResolutions.map((res) => (
                    <TouchableOpacity
                      key={res}
                      style={[
                        styles.hdPopupOption,
                        selectedCameraFormat.resolution === res && styles.hdPopupOptionActive,
                      ]}
                      onPress={() => {
                        setSelectedCameraFormat((prev) => ({
                          ...prev,
                          resolution: res,
                        }));
                        setShowHDPopup(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.hdPopupOptionText,
                          selectedCameraFormat.resolution === res && styles.hdPopupOptionTextActive,
                        ]}
                      >
                        {res}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.hdPopupSection}>
                <Text style={styles.hdPopupLabel}>Frame Rate</Text>
                <View style={styles.hdPopupOptionsRow}>
                  {supportedFrameRates.map((fps) => (
                    <TouchableOpacity
                      key={fps}
                      style={[
                        styles.hdPopupOption,
                        selectedCameraFormat.frameRate === fps && styles.hdPopupOptionActive,
                      ]}
                      onPress={() => {
                        setSelectedCameraFormat((prev) => ({
                          ...prev,
                          frameRate: fps,
                        }));
                        setShowHDPopup(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.hdPopupOptionText,
                          selectedCameraFormat.frameRate === fps && styles.hdPopupOptionTextActive,
                        ]}
                      >
                        {fps}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {showSpeedPopup && (
          <Modal
            visible={showSpeedPopup}
            transparent
            animationType="fade"
            onRequestClose={() => setShowSpeedPopup(false)}
          >
            <TouchableOpacity
              style={styles.popupOverlay}
              activeOpacity={1}
              onPress={() => setShowSpeedPopup(false)}
            >
              <View
                style={[
                  styles.smallPopup,
                  {
                    left: speedPopupPos.x,
                    top: speedPopupPos.y,
                  },
                ]}
                onStartShouldSetResponder={() => true}
              >
                <View style={styles.popupArrow} />
                <View style={styles.smallPopupContent}>
                  {([0.3, 0.5, 1, 1.5, 2, 3] as any[]).map((speed, index, array) => {
                    const isSupported = [0.5, 1, 1.5, 2].includes(speed);
                    const isLast = index === array.length - 1;
                    return (
                      <TouchableOpacity
                        key={speed}
                        style={[
                          styles.smallPopupOption,
                          selectedSpeed === speed && styles.smallPopupOptionActive,
                          !isSupported && { opacity: 0.5 },
                          isLast && { borderBottomWidth: 0 },
                        ]}
                        onPress={() => {
                          if (isSupported) {
                            setSelectedSpeed(speed as SpeedOption);
                            setShowSpeedPopup(false);
                          }
                        }}
                        disabled={!isSupported}
                      >
                        <Text
                          style={[
                            styles.smallPopupOptionText,
                            selectedSpeed === speed && styles.smallPopupOptionTextActive,
                          ]}
                        >
                          {speed}x
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        {showTimerPopup && (
          <Modal
            visible={showTimerPopup}
            transparent
            animationType="fade"
            onRequestClose={() => setShowTimerPopup(false)}
          >
            <TouchableOpacity
              style={styles.popupOverlay}
              activeOpacity={1}
              onPress={() => setShowTimerPopup(false)}
            >
              <View
                style={[
                  styles.smallPopup,
                  {
                    left: timerPopupPos.x,
                    top: timerPopupPos.y,
                  },
                ]}
                onStartShouldSetResponder={() => true}
              >
                <View style={styles.popupArrow} />
                <View style={styles.smallPopupContent}>
                  {([15, 30, 60] as TimerOption[]).map((duration, index) => (
                    <TouchableOpacity
                      key={duration}
                      style={[
                        styles.smallPopupOption,
                        maxRecordingDuration === duration && styles.smallPopupOptionActive,
                        index === 2 && { borderBottomWidth: 0 },
                      ]}
                      onPress={() => {
                        setMaxRecordingDuration(duration);
                        setShowTimerPopup(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.smallPopupOptionText,
                          maxRecordingDuration === duration && styles.smallPopupOptionTextActive,
                        ]}
                      >
                        {duration}s
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        <MusicLibraryModal
          visible={showMusicPickerModal}
          onCancel={() => setShowMusicPickerModal(false)}
          onSelect={(music: any) => {
            setSelectedMusicTrack(music);
          }}
          selectedMusic={selectedMusicTrack}
        />

        {showFilterGrid && (
          <Modal
            visible={showFilterGrid}
            transparent
            animationType="fade"
            onRequestClose={() => setShowFilterGrid(false)}
          >
            <TouchableOpacity
              style={styles.fullOverlay}
              activeOpacity={1}
              onPress={() => setShowFilterGrid(false)}
            >
              <View style={styles.filterGridContainer} onStartShouldSetResponder={() => true}>
                <View style={styles.filterGridHeader}>
                  <Text style={styles.filterGridTitle}>Filters</Text>
                  <TouchableOpacity onPress={() => setShowFilterGrid(false)}>
                    <CloseIcon size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                {loadingFilters ? (
                  <View style={styles.filterGridLoading}>
                    <Text style={styles.filterGridLoadingText}>Loading filters...</Text>
                  </View>
                ) : (
                  <ScrollView
                    scrollEnabled
                    showsVerticalScrollIndicator={false}
                    style={styles.filterGridScroll}
                  >
                    <View style={styles.filterGrid}>
                      <TouchableOpacity
                        style={[
                          styles.filterGridTile,
                          !selectedFilter && styles.filterGridTileSelected,
                        ]}
                        onPress={() => {
                          setSelectedFilter(null);
                          setShowFilterGrid(false);
                          showFilterLabelBriefly();
                        }}
                      >
                        <View
                          style={[
                            styles.filterGridThumbnail,
                            !selectedFilter && styles.filterGridThumbnailSelected,
                          ]}
                        >
                          <Text style={styles.filterGridThumbnailText}>◯</Text>
                        </View>
                        <Text style={styles.filterGridTileName} numberOfLines={2}>
                          None
                        </Text>
                      </TouchableOpacity>

                      {filterList.map((filter) => (
                        <TouchableOpacity
                          key={filter.id}
                          style={[
                            styles.filterGridTile,
                            selectedFilter?.id === filter.id && styles.filterGridTileSelected,
                          ]}
                          onPress={() => {
                            // Filters render on-device; a backend filter needs a matching preset.
                            const presetId = matchPresetByName(filter.name);
                            if (!presetId) {
                              Alert.alert("Not supported yet", `The "${filter.name}" filter can't be applied on this device yet.`);
                              return;
                            }
                            setSelectedFilter({ ...filter, presetId });
                            setShowFilterGrid(false);
                            showFilterLabelBriefly();
                          }}
                        >
                          <View
                            style={[
                              styles.filterGridThumbnail,
                              selectedFilter?.id === filter.id &&
                                styles.filterGridThumbnailSelected,
                            ]}
                          >
                            <Text style={styles.filterGridThumbnailText}>
                              {filter.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <Text style={styles.filterGridTileName} numberOfLines={2}>
                            {filter.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        {showFilterPopup && (
          <Modal
            visible={showFilterPopup}
            transparent
            animationType="fade"
            onRequestClose={() => setShowFilterPopup(false)}
          >
            <TouchableOpacity
              style={styles.popupOverlay}
              activeOpacity={1}
              onPress={() => setShowFilterPopup(false)}
            >
              <View
                style={[
                  styles.smallPopup,
                  {
                    left: filterPopupPos.x,
                    top: filterPopupPos.y,
                  },
                ]}
                onStartShouldSetResponder={() => true}
              >
                <View style={styles.popupArrow} />
                <View style={styles.smallPopupContent}>
                  {loadingFilters ? (
                    <Text style={styles.smallPopupOptionText}>Loading filters...</Text>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.smallPopupOption,
                          !selectedFilter && { backgroundColor: "#EC9A15" },
                        ]}
                        onPress={() => {
                          setSelectedFilter(null);
                          setShowFilterPopup(false);
                        }}
                      >
                        <Text style={styles.smallPopupOptionText}>None</Text>
                      </TouchableOpacity>
                      {filterList.map((filter, index) => (
                        <TouchableOpacity
                          key={filter.id}
                          style={[
                            styles.smallPopupOption,
                            selectedFilter?.id === filter.id && { backgroundColor: "#EC9A15" },
                            index === filterList.length - 1 && { borderBottomWidth: 0 },
                          ]}
                          onPress={() => {
                            setSelectedFilter(filter);
                            setShowFilterPopup(false);
                          }}
                        >
                          <Text style={styles.smallPopupOptionText} numberOfLines={1}>
                            {filter.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </Modal>
        )}
      </View>


      {showFilterLabel && selectedFilter && (
        <Animated.View
          style={[
            {
              position: "absolute",
              top: "50%",
              left: "50%",
              marginLeft: -60,
              marginTop: -20,
              opacity: filterLabelOpacity,
              zIndex: 100,
            },
          ]}
        >
          <View
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              borderRadius: 20,
              paddingHorizontal: 20,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.3)",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
              {selectedFilter.name}
            </Text>
          </View>
        </Animated.View>
      )}
      {photoPreviewUri && (
        <PhotoPreview
          uri={photoPreviewUri}
          topInset={insets.top}
          bottomInset={insets.bottom}
          onRetake={() => setPhotoPreviewUri(null)}
          onNext={handlePhotoNext}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shutterFlash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#fff",
    zIndex: 60,
  },
  captureBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
  },
  liveComingSoon: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
  },
  liveComingSoonTitle: { color: "#fff", fontSize: 28, fontWeight: "800" },
  liveComingSoonText: { color: "rgba(255,255,255,0.7)", fontSize: 16, marginTop: 8 },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  overlay: {
        ...StyleSheet.absoluteFill,
    zIndex: 100,
    pointerEvents: "box-none",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    backgroundColor: "#000",
  },
  permissionTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  permissionText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: "#EC9A15",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    minWidth: 200,
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  recordingTimerContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 40,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 15,
    flexDirection: "row",
    gap: 12,
  },
  recordingIndicatorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FF0000",
    opacity: 1,
    shadowColor: "#FF0000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  recordingTimerText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    fontFamily: "monospace",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  recordingIndicatorsContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    pointerEvents: "none",
    zIndex: 20,
  },
  modeSelector: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 40,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  modeScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  modeButton: {
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  modeButtonActive: {
    backgroundColor: "rgba(236, 154, 21, 0.3)",
    borderColor: "#EC9A15",
  },
  modeText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 15,
    fontWeight: "600",
  },
  modeTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  closeButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    left: 20,
    zIndex: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
  },
  leftToolbar: {
    position: "absolute",
    left: 15,
    top: Platform.OS === "ios" ? 140 : 120,
    alignItems: "center",
    gap: 24,
    zIndex: 10,
  },
  toolbarButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
  },
  toolbarLabel: {
    color: "#fff",
    fontSize: 9,
    marginTop: 2,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  toolbarText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  bottomControlsContainer: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 20,
  },
  bottomSideGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    width: 80,
  },
  bottomSideGroupRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    width: 80,
  },
  bottomActionBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
  },
  captureCenterGroup: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  curvedZoomDial: {
    flexDirection: "row",
    backgroundColor: "rgba(30, 30, 30, 0.7)",
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingHorizontal: 4,
    marginBottom: 15,
  },
  zoomPill: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  zoomPillActive: {
    backgroundColor: "#fff",
  },
  zoomPillText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  zoomPillTextActive: {
    color: "#000",
  },
  recordButtonContainer: {
    width: 90,
    height: 90,
    justifyContent: "center",
    alignItems: "center",
  },
  progressRing: {
    position: "absolute",
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  progressSvg: {
    position: "absolute",
  },
  progressRingIndicator: {
    position: "absolute",
    width: 100,
    height: 100,
    justifyContent: "flex-start",
    alignItems: "center",
  },
  progressRingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
    marginTop: 2,
  },
  recordButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 5,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordButtonRecording: {
    borderColor: "#EC9A15",
    shadowColor: "#EC9A15",
  },
  recordButtonCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#EC9A15",
  },
  recordButtonSquare: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#EC9A15",
  },
  clipTimeline: {
    position: "absolute",
    bottom: 130,
    left: 0,
    right: 0,
    height: 70,
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingVertical: 10,
  },
  clipTimelineContent: {
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 8,
  },
  clipSegment: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
    overflow: "hidden",
  },
  clipSegmentSelected: {
    borderColor: "#EC9A15",
  },
  clipSegmentInner: {
    width: "100%",
    height: "100%",
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  clipSegmentImage: {
    width: "100%",
    height: "100%",
    borderRadius: 6,
  },
  deleteClipButton: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#EC9A15",
    justifyContent: "center",
    alignItems: "center",
  },
  nextButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: "#EC9A15",
    marginLeft: 12,
    zIndex: 100,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  popupOverlay: {
        ...StyleSheet.absoluteFill,
    zIndex: 1000,
  },
  hdPopup: {
    position: "absolute",
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    padding: 12,
    width: 180,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 1001,
  },
  hdPopupArrow: {
    position: "absolute",
    left: -6,
    top: 20,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderRightWidth: 6,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderRightColor: "#2a2a2a",
  },
  hdPopupSection: {
    marginBottom: 12,
  },
  hdPopupLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  hdPopupOptionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  hdPopupOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  hdPopupOptionActive: {
    backgroundColor: "#EC9A15",
  },
  hdPopupOptionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  hdPopupOptionTextActive: {
    fontWeight: "700",
  },
  smallPopup: {
    position: "absolute",
    zIndex: 1001,
  },
  popupArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#2a2a2a",
    alignSelf: "flex-start",
    marginLeft: 20,
    marginTop: -1,
  },
  smallPopupContent: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    padding: 4,
    flexDirection: "column",
    minWidth: 80,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 8,
  },
  smallPopupOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
    backgroundColor: "transparent",
    alignItems: "center",
    minWidth: 72,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  smallPopupOptionActive: {
    backgroundColor: "rgba(236, 154, 21, 0.2)",
  },
  smallPopupOptionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  smallPopupOptionTextActive: {
    fontWeight: "600",
    color: "#EC9A15",
  },
  fullOverlay: {
        ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "flex-end",
    zIndex: 1001,
  },
  filterGridContainer: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "85%",
    paddingTop: 16,
  },
  filterGridHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  filterGridTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  filterGridScroll: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  filterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  filterGridTile: {
    width: "23%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 2,
    borderColor: "transparent",
  },
  filterGridTileSelected: {
    borderColor: "#EC9A15",
    backgroundColor: "rgba(236, 154, 21, 0.15)",
  },
  filterGridThumbnail: {
    width: "100%",
    height: "70%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 4,
  },
  filterGridThumbnailSelected: {
    backgroundColor: "rgba(236, 154, 21, 0.3)",
  },
  filterGridThumbnailText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  filterGridTileName: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
    width: "100%",
  },
  filterGridLoading: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  filterGridLoadingText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
});
