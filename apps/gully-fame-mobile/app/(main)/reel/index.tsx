import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library/legacy";
import { Asset } from "expo-asset";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Platform,
  Modal,
  Animated,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Linking,
  AppState,
  Alert,
  ViewToken,
  Share,
} from "react-native";

import { H264_ENCODE, runFFmpeg } from "@modules/video-editor/camera-module/utils/ffmpeg";

import { SafeAreaView } from "react-native-safe-area-context";
import { VideoView, useVideoPlayer } from "expo-video";
import { Image as ExpoImage } from "expo-image";
import Svg, { Path } from "react-native-svg";
import BottomNav from "@components/layout/BottomNav";
import DrawerMenu from "@components/layout/DrawerMenu";
import SupportModal from "@/components/modals/SupportModal/SupportModal";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { scale, getFontSize, wp, spacing } from "@utils/responsive";
import { toggleFollow } from "@api/services/userService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import { followUpdateEmitter } from "@utils/followEmitter";
import { listUiReels, toggleReelAction, toUiReel } from "@api/services/reelsService";
import { getCompetitionReels } from "@api/services/competitionService";
import { deletePost } from "@/api/services/profileExtrasService";
import {
  addComment,
  listComments,
  commentAuthorName,
  ReelComment,
  COMMENT_MAX_LENGTH,
} from "@api/services/commentService";
import { getErrorMessage } from "@api/client";
import { showToast, toastError, toastSuccess } from "@/components/ui/Toast";
import { blockUser, getBlockedUserIds, reportContent } from "@/utils/moderation";
import {
  HomeIconSVG,
  ReelIconSVG,
  SearchIconSVG,
  UserIconSVG,
  StarIcon,
  BlockIcon,
  CoinIcon,
  CommentIcon,
  DownloadIcon,
  SaveIcon,
  FlagIcon,
  HeartIcon,
  MusicIcon,
  PauseIcon,
  PlayIcon,
  ShareIcon,
  ThreeDotsIcon,
} from "@/icons";
import { showPermissionSettingsAlert } from "@/utils/permissionSettings";
import { saveDownload } from "@/services/downloadsStore";
import { SkeletonLoader } from "@/components/Skeleton";
import UserAvatar from "@/components/UserAvatar";

// Turns the backend's flat comment list into top-level comments with replies.
function groupComments(list: ReelComment[], blockedIds: Set<string> = new Set()) {
  const toUi = (c: ReelComment, idx: number) => ({
    id: parseInt(c._id.slice(-8), 16) || idx + 1,
    _backendId: c._id,
    username: commentAuthorName(c.author),
    avatar: typeof c.author === "object" ? c.author.profileImage || undefined : undefined,
    level: undefined,
    comment: c.text,
    likes: 0,
    isLiked: false,
    createdAt: c.createdAt,
    parentId: c.parentComment,
    replies: [] as any[],
  });
  // Comments from blocked users are hidden.
  const all = list
    .filter((c) => !(typeof c.author === "object" && c.author && blockedIds.has(c.author._id)))
    .map(toUi);
  const byId = new Map(all.map((c) => [c._backendId, c]));
  const top: typeof all = [];
  for (const c of all) {
    const parent = c.parentId ? byId.get(c.parentId) : undefined;
    if (parent) parent.replies.push(c);
    else top.push(c);
  }
  return top;
}

const { width, height } = Dimensions.get("window");
/** Extra feed pages (10 reels each) loaded to find a reel opened by id before giving up. */
const MAX_PAGES_TO_FIND_START = 10;

/** Thumbnail shown in place of a video that has not drawn its first frame (or is not mounted yet). */
function ReelPoster({ uri }: { uri: string }) {
  return (
    <ExpoImage
      source={{ uri }}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      cachePolicy="memory-disk"
      pointerEvents="none"
    />
  );
}

interface ReelVideoPlayerProps {
  reel: any;
  isVisible: boolean;
  videoRefs: React.MutableRefObject<Map<number, ReturnType<typeof useVideoPlayer>>>;
}

function ReelVideoPlayer({ reel, isVisible, videoRefs }: ReelVideoPlayerProps) {
  const player = useVideoPlayer(reel.video, (player) => {
    player.loop = true;
    player.muted = false;
  });

  // A video that cannot be loaded (for example the server answers 403/404) used to leave a plain
  // black screen. Track the player status so the user sees why, and can retry.
  const [playbackFailed, setPlaybackFailed] = React.useState(false);
  // The poster covers the player until the first frame is drawn, so the reel never shows a
  // blank black screen while the video downloads.
  const [firstFrameShown, setFirstFrameShown] = React.useState(false);
  const [isBuffering, setIsBuffering] = React.useState(player.status === "loading");
  React.useEffect(() => {
    const sub = player.addListener("statusChange", ({ status }) => {
      setIsBuffering(status === "loading");
      if (status === "error") setPlaybackFailed(true);
      else if (status === "readyToPlay") setPlaybackFailed(false);
    });
    return () => sub.remove();
  }, [player]);

  const retryPlayback = React.useCallback(() => {
    setPlaybackFailed(false);
    setFirstFrameShown(false);
    player.replace(reel.video);
    player.play();
  }, [player, reel.video]);

  const poster = resolveMediaUrl(reel.thumbnail);

  React.useEffect(() => {
    const registry = videoRefs.current;
    registry.set(reel.id, player);
    return () => {
      registry.delete(reel.id);
    };
  }, [player, reel.id, videoRefs]);

  React.useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (isVisible && AppState.currentState === "active") {
      timeoutId = setTimeout(() => {
        if (AppState.currentState === "active") {
          player.play();
        }
      }, 100);
    } else {
      player.pause();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isVisible, player]);

  
  return (
    <>
      <VideoView
        style={styles.reelImage}
        player={player}
        contentFit="cover"
        nativeControls={false} // 🛠️ FIX 2: Default video player controls ko hide karega
        onFirstFrameRender={() => setFirstFrameShown(true)}
      />
      {!firstFrameShown && poster ? (
        <ReelPoster uri={poster} />
      ) : null}
      {isVisible && !playbackFailed && (!firstFrameShown || isBuffering) ? (
        <View style={styles.reelBuffering} pointerEvents="none" testID="reel-buffering">
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : null}
      {playbackFailed ? (
        <View style={styles.playbackFailed} testID="reel-playback-error">
          <Text style={styles.playbackFailedTitle}>This video can&apos;t be played right now</Text>
          <Text style={styles.playbackFailedText}>The video file could not be loaded. Check your connection and try again.</Text>
          <TouchableOpacity style={styles.playbackFailedButton} onPress={retryPlayback} testID="reel-playback-retry">
            <Text style={styles.playbackFailedButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </>
  );
}


export default function GullyReelScreen() {
  const params = useLocalSearchParams();
  const [isFocused, setIsFocused] = useState(false);
  const [activeTab, setActiveTab] = useState("Reel");
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [showVotePopup, setShowVotePopup] = useState<number | null>(null);
  const [votePopupAnim] = useState(() => new Animated.Value(0));
  const [reels, setReels] = useState<any[]>([]);
  const [isLoadingReels, setIsLoadingReels] = useState(true);
  const [reelsError, setReelsError] = useState("");
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
  const [hasMoreReels, setHasMoreReels] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const flatListRef = useRef<FlatList<any>>(null);
  const [showMoreShareOptions, setShowMoreShareOptions] = useState(false);
  const [currentVisibleIndex, setCurrentVisibleIndex] = useState<number | null>(null);
  const videoRefs = useRef<Map<number, ReturnType<typeof useVideoPlayer>>>(new Map());
  const [showStarAnimation, setShowStarAnimation] = useState<number | null>(null);
  const [showThreeDotsMenu, setShowThreeDotsMenu] = useState(false);
  const [currentReelForMenu, setCurrentReelForMenu] = useState<number | null>(null);
  const [expandedCaptions, setExpandedCaptions] = useState<Set<number>>(new Set());
  const starAnimations = useRef<Map<number, { scale: Animated.Value; opacity: Animated.Value }>>(
    new Map()
  );
  const lastTap = useRef<{ time: number; id: number | null }>({
    time: 0,
    id: null,
  });

  const [threeDotsSlideAnim] = useState(() => new Animated.Value(height));
  const [tipModalVisible, setTipModalVisible] = useState(false);
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);
  const walletBalance = useWalletBalance();
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedReelForDownload, setSelectedReelForDownload] = useState<any>(null);
  const [currentTipReelId, setCurrentTipReelId] = useState<number | null>(null);
  const [currentTipCreatorId, setCurrentTipCreatorId] = useState<string | undefined>(undefined);
  const [showPlayPauseIcon, setShowPlayPauseIcon] = useState<{
    reelId: number;
    isPlaying: boolean;
  } | null>(null);
  const playPauseIconTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoPlayingStates = useRef<Map<number, boolean>>(new Map());
  const [playPauseIconOpacity] = useState(() => new Animated.Value(0));
  const THEME_COLOR = "#EC9A15";

  // The signed-in user, to show their real profile photo and hide Follow on their own reels.
  const [myUserId, setMyUserId] = useState("");
  const [myAvatar, setMyAvatar] = useState<string | null>(null);
  const [myName, setMyName] = useState("");
  useEffect(() => {
    AsyncStorage.multiGet(["userId", "userProfileImage", "userFirstName"])
      .then(([[, id], [, img], [, first]]) => {
        setMyUserId(id || "");
        setMyAvatar(resolveMediaUrl(img));
        setMyName(first || "");
      })
      .catch(() => {});
  }, []);
  const [followingStates, setFollowingStates] = useState<{ [key: string]: boolean }>({});
  
  const [shareModalFollowers, setShareModalFollowers] = useState<any[]>([]);
  const [isLoadingShareFollowers, setIsLoadingShareFollowers] = useState(false);

  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [currentReelBackendId, setCurrentReelBackendId] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const BOTTOM_NAV_HEIGHT = scale(60);

  const memoizedReels = useMemo(() => reels, [reels]);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, [])
  );

  // GET /reels (cursor), or GET /competitions/:id/reels for a competition's entries.
  // From a profile (params.userId) only that author's reels are kept; there is no
  // per-user reels endpoint, so the feed is filtered on the device.
  const fetchPage = useCallback(
    async (cursor: string | null | undefined) => {
      // Reels from users the viewer has blocked are never shown.
      const blocked = await getBlockedUserIds();
      const hideBlocked = <T extends { userId?: string }>(items: T[]) =>
        blocked.size === 0 ? items : items.filter((r) => !r.userId || !blocked.has(r.userId));
      if (params.competitionId) {
        const res = await getCompetitionReels(String(params.competitionId), cursor, 10);
        return { reels: hideBlocked(res.reels.map(toUiReel)), nextCursor: res.nextCursor, hasMore: res.hasMore };
      }
      const page = await listUiReels(cursor, 10);
      return { ...page, reels: hideBlocked(page.reels) };
    },
    [params.competitionId]
  );

  const loadFeed = useCallback(
    async (mode: "initial" | "refresh") => {
      if (mode === "initial") setIsLoadingReels(true);
      setReelsError("");
      try {
        let page = await fetchPage(null);
        let list = params.userId ? page.reels.filter((r) => r.userId === params.userId) : page.reels;
        // A reel opened from elsewhere (e.g. Home's Trending) may be older than the first page:
        // keep paging until it is loaded, so it opens instead of the newest reel.
        const startId = params.startReelId ? String(params.startReelId) : null;
        for (let extra = 0; startId && extra < MAX_PAGES_TO_FIND_START && page.hasMore && page.nextCursor; extra++) {
          if (list.some((r) => r._backendId === startId)) break;
          page = await fetchPage(page.nextCursor);
          const more = params.userId ? page.reels.filter((r) => r.userId === params.userId) : page.reels;
          list = [...list, ...more];
        }
        setReels(list);
        setCurrentCursor(page.nextCursor || undefined);
        setHasMoreReels(page.hasMore);
      } catch (error) {
        if (mode === "initial") {
          setReels([]);
          setHasMoreReels(false);
        }
        setReelsError(getErrorMessage(error));
      } finally {
        setIsLoadingReels(false);
      }
    },
    [params.userId, params.startReelId, fetchPage]
  );

  useFocusEffect(
    useCallback(() => {
      loadFeed(reels.length ? "refresh" : "initial");
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadFeed])
  );

  // GET /reels/:id/comments returns a flat list; replies carry parentComment.
  useEffect(() => {
    if (!commentModalVisible || !currentReelBackendId) return;
    let active = true;
    (async () => {
      setIsLoadingComments(true);
      try {
        const page = await listComments(currentReelBackendId, 1, 50);
        if (!active) return;
        setComments(groupComments(page.comments, await getBlockedUserIds()));
      } catch (error) {
        if (active) {
          setComments([]);
          toastError(getErrorMessage(error));
        }
      } finally {
        if (active) setIsLoadingComments(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [commentModalVisible, currentReelBackendId]);

  useEffect(() => {
    setCommentLikes(new Map());
  }, []);

  // There is no followers-list endpoint, so "share to followers" has no list to show.
  useEffect(() => {
    if (shareModalVisible) {
      setShareModalFollowers([]);
      setIsLoadingShareFollowers(false);
    }
  }, [shareModalVisible]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState !== "active") {
        videoRefs.current.forEach((videoRef) => {
          if (videoRef) {
            videoRef.pause();
          }
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Position the feed ONCE per "feed identity" (start target + first reel). Appending the next
  // page must not move the list or reset the active index: that made the video the user was
  // watching stop playing, and re-scrolled back to the start reel on every page load.
  const positionedFeedKeyRef = useRef<string | null>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    },
    []
  );

  useEffect(() => {
    if (reels.length === 0) {
      positionedFeedKeyRef.current = null;
      return;
    }
    const startReelId = params.startReelId ? String(params.startReelId) : "";
    const feedKey = `${startReelId}|${reels[0]?._backendId ?? ""}`;
    if (positionedFeedKeyRef.current === feedKey) return;

    if (startReelId) {
      const reelIndex = reels.findIndex((r) => r._backendId === startReelId);
      // The target is not loaded yet: wait for a later page instead of resetting to 0.
      if (reelIndex < 0 || !flatListRef.current) return;
      positionedFeedKeyRef.current = feedKey;
      setCurrentVisibleIndex(reelIndex);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: reelIndex, animated: false });
        const videoRef = videoRefs.current.get(reels[reelIndex]?.id);
        if (videoRef && AppState.currentState === "active") {
          videoRef.play();
        }
      }, 50);
      return;
    }

    positionedFeedKeyRef.current = feedKey;
    setCurrentVisibleIndex(0);
  }, [params.startReelId, reels]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        videoRefs.current.forEach((videoRef) => {
          if (videoRef) {
            videoRef.pause();
          }
        });
        starAnimations.current.clear();
      };
    }, [])
  );

  const onViewableItemsChangedRef = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (
      viewableItems.length > 0 &&
      viewableItems[0].index !== null &&
      viewableItems[0].index !== undefined
    ) {
      setCurrentVisibleIndex(viewableItems[0].index);
    }
  });

  const handleBackPress = () => {
    router.push("/(main)" as any);
  };

  const [currentReelId, setCurrentReelId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [replyingToComment, setReplyingToComment] = useState<number | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set());
  const [commentLikes, setCommentLikes] = useState<
    Map<number, { likes: number; isLiked: boolean }>
  >(new Map());
  const [slideAnim] = useState(() => new Animated.Value(height));
  const shareScrollViewRef = useRef<ScrollView>(null);

  const executeDownloadWithWatermark = async (reelData: any) => {
    setIsDownloading(true);
    // Temp files are removed in `finally`, so a failed download does not leave them behind.
    let videoUri = "";
    let outputUri = "";
    try {
      // Write-only access: saving needs no read permission, so the app does not have to request
      // READ_MEDIA_IMAGES / READ_MEDIA_VIDEO (restricted by Google Play policy).
      const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync(true);
      if (status !== "granted" && !canAskAgain) {
        showPermissionSettingsAlert("Photo library access");
        setIsDownloading(false);
        return;
      }
      if (status !== "granted") {
        Alert.alert("Permission Denied", "We need access to save the video.");
        setIsDownloading(false);
        setDownloadModalVisible(false);
        return;
      }

      const remoteUri: string = reelData.video?.uri || "";
      if (!remoteUri) throw new Error("No video to download");
      videoUri = `${FileSystem.cacheDirectory}gully_reel_${Date.now()}.mp4`;
      await FileSystem.downloadAsync(remoteUri, videoUri);

      const watermarkAsset = Asset.fromModule(require("@assets/images/gfi.png"));
      await watermarkAsset.downloadAsync();
      const watermarkUri = watermarkAsset.localUri || watermarkAsset.uri;

      outputUri = `${FileSystem.cacheDirectory}gully_watermarked_${Date.now()}.mp4`;

      const ffmpegCommand = `-i ${videoUri} -i ${watermarkUri} -filter_complex "[1:v]scale=120:-1,format=rgba,colorchannelmixer=aa=0.6[wm];[0:v][wm]overlay=W-w-20:H-h-20" ${H264_ENCODE} -c:a copy ${outputUri}`;

      await runFFmpeg(ffmpegCommand, "watermark reel");
      const asset = await MediaLibrary.createAssetAsync(outputUri);
      // Grouping into a "GullyFame" album needs read access to the library. It is best-effort:
      // without read access the video is still saved to the gallery.
      try {
        const existingAlbum = await MediaLibrary.getAlbumAsync("GullyFame");
        if (existingAlbum) {
          await MediaLibrary.addAssetsToAlbumAsync([asset], existingAlbum, false);
        } else {
          await MediaLibrary.createAlbumAsync("GullyFame", asset, false);
        }
      } catch {
        // Album grouping is optional.
      }

      // Keep a copy in the app's Downloads (listed on the Downloads screen).
      await saveDownload({
        title: reelData.caption || reelData.username || "Gully Fame reel",
        thumbnail: reelData.thumbnail || "",
        sourceUri: outputUri,
      });

      toastSuccess("Saved to your gallery and Downloads");
    } catch {
      Alert.alert("Error", "Something went wrong during download.");
    } finally {
      if (outputUri) await FileSystem.deleteAsync(outputUri, { idempotent: true }).catch(() => {});
      if (videoUri) await FileSystem.deleteAsync(videoUri, { idempotent: true }).catch(() => {});
      setIsDownloading(false);
      setDownloadModalVisible(false);
      setSelectedReelForDownload(null);
    }
  };

  // Opens the app, else a web link, else the system share sheet.
  const openApp = async (appUrl: string, webUrl: string | null, text: string) => {
    try {
      await Linking.openURL(appUrl);
      return;
    } catch {
      // App not installed (or its scheme is not allowed to be opened).
    }
    if (webUrl) {
      await Linking.openURL(webUrl);
    } else {
      await Share.share({ message: text });
    }
  };

  const handleShare = async (option: string) => {
    const backendId = reels.find((r) => r.id === currentReelId)?._backendId || String(currentReelId);
    const reelUrl = `https://gullyfame.com/reel/${backendId}`;
    const reelText = `Check out this amazing reel on Gully Fame! ${reelUrl}`;

    try {
      switch (option) {
        case "copy":
          await Clipboard.setStringAsync(reelUrl);
          toastSuccess("Link copied");
          break;
        case "whatsapp":
        case "whatsappstatus":
          await openApp(`whatsapp://send?text=${encodeURIComponent(reelText)}`, `https://wa.me/?text=${encodeURIComponent(reelText)}`, reelText);
          break;
        case "instagram":
          await openApp("instagram://share", null, reelText);
          break;
        case "snapchat":
          await openApp("snapchat://", null, reelText);
          break;
        case "download": {
          const target = reels.find((r) => r.id === currentReelId);
          if (target) {
            setSelectedReelForDownload(target);
            setDownloadModalVisible(true);
          }
          break;
        }
        case "facebook":
          await openApp(`fb://share?text=${encodeURIComponent(reelText)}`, `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(reelUrl)}`, reelText);
          break;
        case "twitter":
          await openApp(`twitter://post?message=${encodeURIComponent(reelText)}`, `https://twitter.com/intent/tweet?text=${encodeURIComponent(reelText)}`, reelText);
          break;
      }
      
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setShareModalVisible(false);
        setShowMoreShareOptions(false);
      });
    } catch {
      Alert.alert("Error", "Unable to share. Please try again.");
    }
  };

  // The star button is "Vote": POST /reels/:id/action { action_type: "vote" }.
  // The backend only accepts votes on entries in a LIVE competition.
  const voteInFlight = useRef<Set<number>>(new Set());
  const handleLike = useCallback(
    async (id: number) => {
      const targetReel = reels.find((r) => r.id === id);
      if (!targetReel || !targetReel._backendId || voteInFlight.current.has(id)) return;
      // One vote per user per reel: the backend action is a toggle, so never send a second one.
      if (targetReel.hasVoted) {
        showToast("You have already voted", "error");
        return;
      }
      voteInFlight.current.add(id);
      if (!targetReel.hasVoted) {
        setShowVotePopup(id);
        votePopupAnim.setValue(0);
        Animated.timing(votePopupAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }).start(() => setShowVotePopup(null));
      }
      setReels((prev) =>
        prev.map((reel) =>
          reel.id === id
            ? { ...reel, hasVoted: !reel.hasVoted, votes: reel.hasVoted ? reel.votes - 1 : reel.votes + 1 }
            : reel
        )
      );
      try {
        const result = await toggleReelAction(targetReel._backendId, "vote");
        setReels((prev) =>
          prev.map((reel) =>
            reel.id === id
              ? {
                  ...reel,
                  hasVoted: result.user_interactions.has_voted,
                  votes: result.updated_stats.votes,
                  isSaved: result.user_interactions.is_saved,
                }
              : reel
          )
        );
      } catch (error) {
        setReels((prev) => prev.map((reel) => (reel.id === id ? targetReel : reel)));
        toastError(getErrorMessage(error));
      } finally {
        voteInFlight.current.delete(id);
      }
    },
    [reels, votePopupAnim]
  );

  const handleSave = useCallback(
    async (id: number) => {
      const targetReel = reels.find((r) => r.id === id);
      if (!targetReel || !targetReel._backendId) return;
      setReels((prev) =>
        prev.map((reel) =>
          reel.id === id
            ? {
                ...reel,
                isSaved: !reel.isSaved,
                saves: reel.isSaved ? Math.max(0, (reel.saves || 0) - 1) : (reel.saves || 0) + 1,
              }
            : reel
        )
      );
      try {
        const result = await toggleReelAction(targetReel._backendId, "save");
        setReels((prev) =>
          prev.map((reel) =>
            reel.id === id ? { ...reel, isSaved: result.user_interactions.is_saved, saves: result.updated_stats.saves } : reel
          )
        );
        toastSuccess(result.user_interactions.is_saved ? "Saved" : "Removed from saved");
      } catch (error) {
        setReels((prev) => prev.map((reel) => (reel.id === id ? targetReel : reel)));
        toastError(getErrorMessage(error));
      }
    },
    [reels]
  );

  const handleVideoTap = useCallback((id: number) => {
    const videoRef = videoRefs.current.get(id);
    if (!videoRef) return;

    try {
      // 🛠️ FIX for expo-video: using 'playing' property directly instead of getStatusAsync()
      const isPlaying = videoRef.playing;
      videoPlayingStates.current.set(id, !isPlaying);

      if (isPlaying) {
        videoRef.pause();
        setShowPlayPauseIcon({ reelId: id, isPlaying: false });
      } else {
        if (AppState.currentState === "active") {
          videoRef.play();
          setShowPlayPauseIcon({ reelId: id, isPlaying: true });
        }
      }

      playPauseIconOpacity.setValue(0);
      Animated.timing(playPauseIconOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      if (playPauseIconTimeout.current) {
        clearTimeout(playPauseIconTimeout.current);
      }

      playPauseIconTimeout.current = setTimeout(() => {
        Animated.timing(playPauseIconOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setShowPlayPauseIcon(null);
        });
      }, 1000);
    } catch { /* intentionally ignored */
    }
  }, [playPauseIconOpacity]);

  const handleDoubleTap = useCallback(
    (id: number) => {
      // Called by the tap handler once it has detected a double tap.
      {
        const targetReel = reels.find((r) => r.id === id);

        if (targetReel && !targetReel.hasVoted) {
          if (!starAnimations.current.has(id)) {
            starAnimations.current.set(id, {
              scale: new Animated.Value(0),
              opacity: new Animated.Value(0),
            });
          }

          const anim = starAnimations.current.get(id)!;
          setShowStarAnimation(id);
          anim.scale.setValue(0);
          anim.opacity.setValue(1);

          Animated.parallel([
            Animated.spring(anim.scale, {
              toValue: 1.2,
              useNativeDriver: true,
              tension: 50,
              friction: 3,
            }),
            Animated.timing(anim.opacity, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setShowStarAnimation(null);
            anim.scale.setValue(0);
          });
        }

        if (targetReel && !targetReel.hasVoted) handleLike(id);
      }
    },
    [reels, handleLike]
  );

  // Synchronous lock: state alone would not stop two onEndReached events in the same frame.
  const isLoadingMoreRef = useRef(false);
  const handleEndReached = useCallback(() => {
    if (isLoadingMoreRef.current || isLoadingMore || !hasMoreReels || !currentCursor) {
      return;
    }
    isLoadingMoreRef.current = true;

    const fetchMoreReels = async () => {
      setIsLoadingMore(true);
      try {
        const page = await fetchPage(currentCursor);
        const list = params.userId ? page.reels.filter((r) => r.userId === params.userId) : page.reels;
        setReels((prev) => {
          const seen = new Set(prev.map((r) => r._backendId));
          return [...prev, ...list.filter((r) => !seen.has(r._backendId))];
        });
        setCurrentCursor(page.nextCursor || undefined);
        setHasMoreReels(page.hasMore);
      } catch (error) {
        toastError(getErrorMessage(error));
      } finally {
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
      }
    };
    fetchMoreReels();
  }, [isLoadingMore, hasMoreReels, currentCursor, params.userId, fetchPage]);

  const [isPostingComment, setIsPostingComment] = useState(false);
  const handlePostComment = useCallback(async () => {
    const text = commentText.trim();
    if (!text || !currentReelBackendId || isPostingComment) return;
    if (text.length > COMMENT_MAX_LENGTH) {
      toastError(`Comments can be up to ${COMMENT_MAX_LENGTH} characters.`);
      return;
    }
    const parent = replyingToComment !== null ? comments.find((c) => c.id === replyingToComment) : null;
    setIsPostingComment(true);
    try {
      await addComment(currentReelBackendId, text, parent?._backendId);
      // Re-read so the new comment shows with its author populated.
      const page = await listComments(currentReelBackendId, 1, 50);
      setComments(groupComments(page.comments, await getBlockedUserIds()));
      setReels((prev) =>
        prev.map((r) => (r._backendId === currentReelBackendId ? { ...r, comments: (r.comments || 0) + 1 } : r))
      );
      if (parent) setExpandedReplies((prev) => new Set(prev).add(parent.id));
      setCommentText("");
      setReplyingToComment(null);
      toastSuccess("Comment posted");
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
      setIsPostingComment(false);
    }
  }, [commentText, currentReelBackendId, comments, replyingToComment, isPostingComment]);

  // The backend has no comment-like endpoint.
  const handleToggleCommentLike = useCallback((_comment: any) => {
    showToast("Liking comments isn't available yet.", "info");
  }, []);

  // POST /user/:userId/follow toggles; the response says the new state.
  const handleToggleFollow = useCallback(async (userId: string, username: string, _reelId: number) => {
    if (!userId) return;
    try {
      const { following } = await toggleFollow(userId);
      setReels((prev) => prev.map((reel) => (reel.userId === userId ? { ...reel, isFollowed: following } : reel)));
      setFollowingStates((prev) => ({ ...prev, [userId]: following }));
      followUpdateEmitter.emit({ type: following ? "follow" : "unfollow", userId });
      toastSuccess(following ? `Now following ${username}` : `Unfollowed ${username}`);
    } catch (error) {
      toastError(getErrorMessage(error));
    }
  }, []);
  const handleFollowUser = handleToggleFollow;
  const handleUnfollowUser = handleToggleFollow;

  // The reel the three-dots menu was opened on; its owner gets "Delete" instead of "Report".
  const menuReel = reels.find((r) => r.id === currentReelForMenu);
  const menuReelIsMine = !!menuReel && !!myUserId && menuReel.userId === myUserId;

  const confirmDeleteReel = (reel: any) => {
    if (!reel) return;
    Alert.alert("Delete this post?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const result = await deletePost(String(reel._backendId || reel.id));
          if (!result.success) {
            toastError(result.message || "Couldn't delete this post.");
            return;
          }
          toastSuccess("Post deleted");
          const remaining = reels.filter((r) => r.id !== reel.id);
          setReels(remaining);
          if (remaining.length === 0) router.back();
        },
      },
    ]);
  };

  const handleSupportPress = useCallback(async (reelId: number, creatorId: string | undefined) => {
    try {
      setIsFetchingBalance(true);
      const balance = await walletBalance.fetchBalance();
      if (balance === null) {
        toastError(walletBalance.error || "Couldn't check your wallet balance.");
        return;
      }

      if (balance < 1) {
        toastError("Insufficient balance. Please add coins to your wallet.");
        router.push("/(main)/coins");
      } else {
        setCurrentTipReelId(reelId);
        setCurrentTipCreatorId(creatorId);
        setTipModalVisible(true);
      }
    } catch {
      Alert.alert("Error", "Failed to check balance. Please try again.");
    } finally {
      setIsFetchingBalance(false);
    }
  }, [walletBalance]);

  const tabs = [
    { name: "Home", icon: HomeIconSVG, label: "Home" },
    { name: "Reel", icon: ReelIconSVG, label: "GullyReel" },
    { name: "Upload", icon: null, label: "Upload" },
    { name: "Search", icon: SearchIconSVG, label: "Search" },
    { name: "MyFame", icon: UserIconSVG, label: "MyFame" },
  ];

  const renderReel = useCallback(
    ({ item: reel, index }: { item: any; index: number }) => {
      const isVisible = currentVisibleIndex === index;
      const anim = starAnimations.current.get(reel.id);
      const showAnimation = showStarAnimation === reel.id && isVisible && anim;
      const shouldLoadVideo =
        isFocused && currentVisibleIndex !== null && Math.abs(currentVisibleIndex - index) <= 1;
      return (
        <View style={styles.reelContainer}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              const now = Date.now();
              const DOUBLE_TAP_DELAY = 300;

              if (now - lastTap.current.time < DOUBLE_TAP_DELAY && lastTap.current.id === reel.id) {
                handleDoubleTap(reel.id);
                lastTap.current = { time: 0, id: null };
              } else {
                handleVideoTap(reel.id);
                lastTap.current = { time: now, id: reel.id };
              }
            }}
            style={styles.videoTouchable}
          >
            {shouldLoadVideo ? (
              <ReelVideoPlayer 
                reel={reel}
                isVisible={isVisible}
                videoRefs={videoRefs}
              />
            ) : (
              <View style={[styles.reelImage, { backgroundColor: "#111" }]}>
                {resolveMediaUrl(reel.thumbnail) ? (
                  <ReelPoster uri={resolveMediaUrl(reel.thumbnail) as string} />
                ) : null}
              </View>
            )}

            {showAnimation && (
              <Animated.View
                style={[
                  styles.starAnimationContainer,
                  {
                    transform: [{ scale: anim.scale }],
                    opacity: anim.opacity,
                  },
                ]}
                pointerEvents="none"
              >
                <StarIcon filled={true} color={THEME_COLOR} size={80} themeColor={THEME_COLOR} />
              </Animated.View>
            )}
          </TouchableOpacity>

          <View style={styles.overlay} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.threeDotsButton}
              onPress={() => {
                setCurrentReelForMenu(reel.id);
                threeDotsSlideAnim.setValue(height);
                setShowThreeDotsMenu(true);
                Animated.spring(threeDotsSlideAnim, {
                  toValue: 0,
                  useNativeDriver: true,
                  tension: 50,
                  friction: 8,
                }).start();
              }}
            >
              <ThreeDotsIcon color="#fff" size={24} />
            </TouchableOpacity>

            <View style={styles.rightActionContainer}>
              <TouchableOpacity
                style={styles.rightActionButton}
                onPress={() => {
                  setCurrentReelId(reel.id);
                  setCurrentReelBackendId(reel._backendId || String(reel.id));
                  
                  slideAnim.setValue(height);
                  setCommentModalVisible(true);
                  
                  Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                  }).start();
                }}
              >
                <CommentIcon color="#fff" size={32} />
                <Text style={styles.actionIconCount}>{reel.comments}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rightActionButton}
                onPress={() => {
                  slideAnim.setValue(height);
                  setShareModalVisible(true);
                  Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                  }).start();
                }}
              >
                <ShareIcon color="#fff" size={32} />
                <Text style={styles.actionIconCount}>{reel.shares || 0}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rightActionButton}
                onPress={() => {
                  setSelectedReelForDownload(reel);
                  setDownloadModalVisible(true);
                }}
              >
                <DownloadIcon size={32} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rightActionButton}
                onPress={() => handleSave(reel.id)}
                accessibilityRole="button"
                accessibilityLabel={reel.isSaved ? "Remove from saved" : "Save reel"}
              >
                <SaveIcon filled={!!reel.isSaved} color={reel.isSaved ? "#EC9A15" : "#fff"} size={32} />
                <Text style={styles.actionIconCount}>{reel.saves || 0}</Text>
              </TouchableOpacity>
            </View>

            {showPlayPauseIcon && showPlayPauseIcon.reelId === reel.id && (
              <View style={styles.playPauseIconContainer} pointerEvents="none">
                <Animated.View
                  style={[styles.playPauseIconWrapper, { opacity: playPauseIconOpacity }]}
                >
                  {showPlayPauseIcon.isPlaying ? (
                    <PlayIcon size={scale(80)} color="#fff" />
                  ) : (
                    <PauseIcon size={scale(80)} color="#fff" />
                  )}
                </Animated.View>
              </View>
            )}

            <View
              style={[styles.bottomContent, { bottom: BOTTOM_NAV_HEIGHT + scale(16) }]}
              pointerEvents="box-none"
            >
              <View style={styles.bottomInfoContainer}>
                <View style={styles.profileRow}>
                  <TouchableOpacity style={styles.profileImageContainer}>
                    <UserAvatar
                      uri={reel.userId && reel.userId === myUserId && myAvatar ? myAvatar : resolveMediaUrl(reel.profileImage)}
                      name={reel.userId && reel.userId === myUserId && myName ? myName : reel.username}
                      style={styles.profileImage}
                    />
                    {reel.userId !== myUserId && (
                      <View style={styles.followButton}>
                        <Text style={styles.followButtonText}>+</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity>
                    <Text style={styles.username}>{reel.username}</Text>
                  </TouchableOpacity>
                  {reel.userId !== myUserId && (
                  <TouchableOpacity style={styles.followButtonBox}
                    onPress={() => {
                      const userId = reel.userId || "";
                      const isFollowing = followingStates[userId];
                      if (isFollowing) {
                        handleUnfollowUser(userId, reel.username, reel.id);
                      } else {
                        handleFollowUser(userId, reel.username, reel.id);
                      }
                    }}
                  >
                    <Text style={styles.followButtonBoxText}>
                      {reel.isFollowed || followingStates[reel.userId || ""] ? "Following" : "Follow"}
                    </Text>
                  </TouchableOpacity>
                  )}
                </View>

                <View style={styles.captionContainer}>
                  <Text
                    style={styles.caption}
                    numberOfLines={expandedCaptions.has(reel.id) ? undefined : 2}
                  >
                    {reel.caption}
                  </Text>
                  {reel.caption.length > 100 && (
                    <TouchableOpacity
                      onPress={() => {
                        setExpandedCaptions((prev) => {
                          const newSet = new Set(prev);
                          if (newSet.has(reel.id)) newSet.delete(reel.id);
                          else newSet.add(reel.id);
                          return newSet;
                        });
                      }}
                    >
                      <Text style={styles.showMoreText}>
                        {expandedCaptions.has(reel.id) ? "Show less" : "Show more"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.musicRow}>
                  <MusicIcon color="#fff" size={16} />
                  <Text style={styles.musicName} numberOfLines={1}>
                    {reel.musicName}
                  </Text>
                </View>
              </View>

              <View style={styles.bottomButtonsRow}>
                <View style={styles.flexButtonWrapper}>
                  <TouchableOpacity
                    style={[styles.tipButton, isFetchingBalance && { opacity: 0.6 }]}
                    onPress={() => {
                      if (!isFetchingBalance) {
                        handleSupportPress(reel.id, reel.userId);
                      }
                    }}
                    disabled={isFetchingBalance}
                  >
                    {isFetchingBalance ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <CoinIcon size={16} color="#fff" />
                        <Text style={styles.tipButtonText}>Support</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.flexButtonWrapper}>
                  {showVotePopup === reel.id && (
                    <Animated.View
                      style={[
                        styles.floatingXP,
                        {
                          opacity: votePopupAnim.interpolate({
                            inputRange: [0, 0.2, 0.8, 1],
                            outputRange: [0, 1, 1, 0],
                          }),
                          transform: [
                            {
                              translateY: votePopupAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -40],
                              }),
                            },
                            {
                              scale: votePopupAnim.interpolate({
                                inputRange: [0, 0.2, 1],
                                outputRange: [0.5, 1.2, 1],
                              }),
                            },
                          ],
                        },
                      ]}
                      pointerEvents="none"
                    >
                      <Text style={styles.floatingXPText}>+5 XP 🔥</Text>
                    </Animated.View>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.tipButton,
                      reel.hasVoted ? styles.voteButtonActive : styles.voteButtonInactive,
                    ]}
                    onPress={() => handleLike(reel.id)}
                  >
                    <StarIcon
                      filled={reel.hasVoted}
                      size={18}
                      color={reel.hasVoted ? "#fff" : THEME_COLOR}
                      themeColor={reel.hasVoted ? "#fff" : THEME_COLOR}
                    />
                    <Text
                      style={[
                        styles.tipButtonText,
                        {
                          color: reel.hasVoted ? "#fff" : THEME_COLOR,
                        },
                      ]}
                    >
                      {reel.hasVoted ? "Voted" : "Vote"} • {reel.votes}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      );
    },
    [
      currentVisibleIndex,
      showStarAnimation,
      showVotePopup,
      handleDoubleTap,
      handleLike,
      handleSave,
      handleSupportPress,
      myUserId,
      myAvatar,
      myName,
      followingStates,
      BOTTOM_NAV_HEIGHT,
      expandedCaptions,
      handleFollowUser,
      handleUnfollowUser,
      handleVideoTap,
      isFetchingBalance,
      isFocused,
      playPauseIconOpacity,
      showPlayPauseIcon,
      slideAnim,
      threeDotsSlideAnim,
      votePopupAnim,
    ]
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

      <View style={styles.backButtonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path
              d="M19 12H5M12 19l-7-7 7-7"
              stroke="#fff"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
      </View>

      {isLoadingReels && reels.length === 0 ? (
        <SkeletonLoader style={feedStateStyles.center} />
      ) : reels.length === 0 ? (
        <View style={feedStateStyles.center}>
          <Text style={feedStateStyles.title}>
            {reelsError || (params.competitionId ? "No entries in this competition yet" : "No reels yet")}
          </Text>
          <TouchableOpacity onPress={() => loadFeed("initial")} style={feedStateStyles.retry}>
            <Text style={feedStateStyles.retryText}>{reelsError ? "Retry" : "Refresh"}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <FlatList
        ref={flatListRef}
        data={memoizedReels}
        renderItem={renderReel}
        keyExtractor={(item) => item.id.toString()}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={styles.flatListContent}
        getItemLayout={(data: any, index: number) => ({
          length: height,
          offset: height * index,
          index,
        })}
        onViewableItemsChanged={onViewableItemsChangedRef.current}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
        }}
        // Keep one reel above and below mounted so their players start buffering before the
        // swipe (renderReel only creates players within ±1 of the visible reel).
        windowSize={3}
        maxToRenderPerBatch={2}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={true}
        initialNumToRender={2}
        maintainVisibleContentPosition={null}
        onScrollToIndexFailed={(info) => {
          const wait = new Promise((resolve) => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: false,
            });
          });
        }}
      />

      <Modal
        visible={commentModalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={() => {
          Animated.timing(slideAnim, {
            toValue: height,
            duration: 300,
            useNativeDriver: true,
          }).start(() => setCommentModalVisible(false));
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            Animated.timing(slideAnim, {
              toValue: height,
              duration: 300,
              useNativeDriver: true,
            }).start(() => setCommentModalVisible(false));
          }}
        >
          <Animated.View style={[styles.gamifiedModal, { transform: [{ translateY: slideAnim }] }]}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={{ flex: 1 }}
            >
              <View style={styles.handleBar} />

              <View style={styles.commentHeader}>
                <Text style={styles.commandPanelTitle}>COMMENTS</Text>
                <TouchableOpacity
                  onPress={() => {
                    Animated.timing(slideAnim, {
                      toValue: height,
                      duration: 300,
                      useNativeDriver: true,
                    }).start(() => setCommentModalVisible(false));
                  }}
                >
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flex: 1 }}>
                <KeyboardAvoidingView
                  behavior={Platform.OS === "ios" ? "padding" : undefined}
                  style={{ flex: 1 }}
                >
                  <ScrollView
                    style={styles.commentsList}
                    contentContainerStyle={{
                      flexGrow: 1,
                      paddingBottom: 20,
                    }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    {isLoadingComments ? (
                      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                        <ActivityIndicator size="large" color={THEME_COLOR} />
                      </View>
                    ) : comments.length === 0 ? (
                      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                        <Text style={{ color: "#999", fontSize: 14 }}>No comments yet</Text>
                      </View>
                    ) : (
                      comments.map((comment) => {
                      const commentLikeData = commentLikes.get(comment.id) || {
                        likes: comment.likes,
                        isLiked: comment.isLiked,
                      };
                      return (
                        <View key={comment.id} style={styles.cleanCommentRow}>
                          <View style={styles.commentItemInner}>
                            <UserAvatar uri={resolveMediaUrl(comment.avatar)} name={comment.username} style={styles.commentAvatar} />
                            <View style={styles.commentContent}>
                              <View style={styles.usernameRow}>
                                <Text style={styles.commentUsername}>{comment.username}</Text>
                                <Text style={styles.levelText}>
                                  Lv.
                                  {comment.level}
                                </Text>
                              </View>
                              <Text style={styles.commentText}>{comment.comment}</Text>

                              <View style={styles.commentActions}>
                                <TouchableOpacity
                                  onPress={() => {
                                    if (replyingToComment === comment.id) {
                                      setReplyingToComment(null);
                                      setCommentText("");
                                    } else {
                                      setReplyingToComment(comment.id);
                                      setCommentText(`@${comment.username} `);
                                    }
                                  }}
                                >
                                  <Text style={styles.commentReply}>
                                    {replyingToComment === comment.id ? "Cancel" : "Reply"}
                                  </Text>
                                </TouchableOpacity>
                              </View>

                              {comment.replies && comment.replies.length > 0 && (
                                <TouchableOpacity
                                  onPress={() => {
                                    setExpandedReplies((prev) => {
                                      const newSet = new Set(prev);
                                      if (newSet.has(comment.id)) newSet.delete(comment.id);
                                      else newSet.add(comment.id);
                                      return newSet;
                                    });
                                  }}
                                  style={styles.viewRepliesButton}
                                >
                                  <Text style={styles.viewRepliesText}>
                                    {expandedReplies.has(comment.id)
                                      ? `—  Hide ${comment.replies.length} ${comment.replies.length === 1 ? "reply" : "replies"}`
                                      : `—  View ${comment.replies.length} ${comment.replies.length === 1 ? "reply" : "replies"}`}
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>

                            <TouchableOpacity
                              style={styles.commentLikeButton}
                              onPress={() => handleToggleCommentLike(comment)}
                            >
                              <StarIcon
                                filled={commentLikeData.isLiked}
                                color="#666"
                                size={16}
                                themeColor={THEME_COLOR}
                              />
                              <Text
                                style={[
                                  styles.commentLikeCount,
                                  commentLikeData.isLiked && {
                                    color: THEME_COLOR,
                                  },
                                ]}
                              >
                                {commentLikeData.likes}
                              </Text>
                            </TouchableOpacity>
                          </View>

                          {expandedReplies.has(comment.id) &&
                            comment.replies &&
                            comment.replies.length > 0 && (
                              <View style={styles.repliesContainer}>
                                {comment.replies.map((reply: { id: number; likes: number; isLiked: boolean; avatar?: string; username: string; level: number; comment: string }) => {
                                  const replyLikeData = commentLikes.get(reply.id) || {
                                    likes: reply.likes,
                                    isLiked: reply.isLiked,
                                  };
                                  return (
                                    <View key={reply.id} style={styles.cleanReplyRow}>
                                      <UserAvatar uri={resolveMediaUrl(reply.avatar)} name={reply.username} style={styles.replyAvatar} />
                                      <View style={styles.replyContent}>
                                        <View style={styles.usernameRow}>
                                          <Text style={styles.replyUsername}>{reply.username}</Text>
                                          <Text style={styles.levelTextSub}>
                                            Lv.
                                            {reply.level}
                                          </Text>
                                        </View>
                                        <Text style={styles.replyText}>{reply.comment}</Text>
                                      </View>
                                      <TouchableOpacity
                                        style={styles.commentLikeButton}
                                        onPress={() => handleToggleCommentLike(reply)}
                                      >
                                        <StarIcon
                                          filled={replyLikeData.isLiked}
                                          color="#666"
                                          size={14}
                                          themeColor={THEME_COLOR}
                                        />
                                        <Text
                                          style={[
                                            styles.commentLikeCount,
                                            replyLikeData.isLiked && {
                                              color: THEME_COLOR,
                                            },
                                          ]}
                                        >
                                          {replyLikeData.likes}
                                        </Text>
                                      </TouchableOpacity>
                                    </View>
                                  );
                                })}
                              </View>
                            )}
                        </View>
                      );
                    })
                    )}
                  </ScrollView>

                  <View style={styles.gamifiedInputWrapper}>
                    <View style={styles.gamifiedInputContainer}>
                      <UserAvatar uri={myAvatar} name={myName} style={styles.commentInputAvatar} />
                      <TextInput
                        style={styles.commentInput}
                        placeholder="Add a comment..."
                        placeholderTextColor="#666"
                        value={commentText}
                        onChangeText={setCommentText}
                        multiline
                        maxLength={500}
                      />
                      <TouchableOpacity
                        style={styles.sendCommentButton}
                        onPress={handlePostComment}
                        disabled={!commentText.trim()}
                      >
                        <Text style={styles.sendCommentText}>Send</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </KeyboardAvoidingView>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={shareModalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={() => {
          Animated.timing(slideAnim, {
            toValue: height,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setShareModalVisible(false);
            setShowMoreShareOptions(false);
          });
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            Animated.timing(slideAnim, {
              toValue: height,
              duration: 300,
              useNativeDriver: true,
            }).start(() => {
              setShareModalVisible(false);
              setShowMoreShareOptions(false);
            });
          }}
        >
          <Animated.View
            style={[
              styles.shareModal,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.handleBar} />

              <View style={styles.shareHeader}>
                <Text style={styles.shareHeaderTitle}>Share</Text>
                <TouchableOpacity
                  onPress={() => {
                    Animated.timing(slideAnim, {
                      toValue: height,
                      duration: 300,
                      useNativeDriver: true,
                    }).start(() => {
                      setShareModalVisible(false);
                      setShowMoreShareOptions(false);
                    });
                  }}
                >
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.friendsSection}>
                <Text style={styles.sectionTitle}>Send to</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.friendsList}
                >
                  {isLoadingShareFollowers ? (
                    <ActivityIndicator
                      size="small"
                      color="#EC9A15"
                      style={{ marginHorizontal: spacing.lg }}
                    />
                  ) : shareModalFollowers.length > 0 ? (
                    shareModalFollowers.map((friend) => (
                      <TouchableOpacity key={friend.id} style={styles.friendItem}>
                        <Image source={friend.avatar} style={styles.friendAvatar} />
                        <Text style={styles.friendName} numberOfLines={1}>
                          {friend.name}
                        </Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text
                      style={[
                        styles.friendName,
                        { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
                      ]}
                    >
                      No followers yet
                    </Text>
                  )}
                </ScrollView>
              </View>

              <View style={styles.shareOptionsSection}>
                <Text style={styles.sectionTitle}>Share to</Text>
                <ScrollView
                  ref={shareScrollViewRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.shareOptionsList}
                >
                  <TouchableOpacity style={styles.shareOption} onPress={() => handleShare("copy")}>
                    <View style={[styles.shareOptionIconCircle, { backgroundColor: "#FFFFFF26" }]}>
                      <MaterialCommunityIcons name="link-variant" size={scale(26)} color="#fff" />
                    </View>
                    <Text style={styles.shareOptionName} numberOfLines={1}>
                      Copy Link
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.shareOption}
                    onPress={() => handleShare("whatsapp")}
                  >
                    <View
                      style={[
                        styles.shareOptionIconCircle,
                        {
                          backgroundColor: "#25D36620",
                        },
                      ]}
                    >
                      <MaterialCommunityIcons name="whatsapp" size={scale(26)} color="#25D366" />
                    </View>
                    <Text style={styles.shareOptionName} numberOfLines={1}>
                      WhatsApp
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.shareOption}
                    onPress={() => handleShare("whatsappstatus")}
                  >
                    <View
                      style={[
                        styles.shareOptionIconCircle,
                        {
                          backgroundColor: "#25D36620",
                        },
                      ]}
                    >
                      <MaterialCommunityIcons name="progress-clock" size={scale(26)} color="#25D366" />
                    </View>
                    <Text style={styles.shareOptionName} numberOfLines={1}>
                      Status
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.shareOption}
                    onPress={() => handleShare("instagram")}
                  >
                    <View
                      style={[
                        styles.shareOptionIconCircle,
                        {
                          backgroundColor: "#E4405F20",
                        },
                      ]}
                    >
                      <MaterialCommunityIcons name="instagram" size={scale(26)} color="#E4405F" />
                    </View>
                    <Text style={styles.shareOptionName} numberOfLines={1}>
                      Instagram
                    </Text>
                  </TouchableOpacity>

                  {showMoreShareOptions && (
                    <>
                      <TouchableOpacity
                        style={styles.shareOption}
                        onPress={() => handleShare("snapchat")}
                      >
                        <View
                          style={[
                            styles.shareOptionIconCircle,
                            {
                              backgroundColor: "#FFEC0620",
                            },
                          ]}
                        >
                          <MaterialCommunityIcons name="snapchat" size={scale(26)} color="#FFFC00" />
                        </View>
                        <Text style={styles.shareOptionName} numberOfLines={1}>
                          Snapchat
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.shareOption}
                        onPress={() => handleShare("download")}
                      >
                        <View
                          style={[
                            styles.shareOptionIconCircle,
                            {
                              backgroundColor: "#FFFFFF26",
                            },
                          ]}
                        >
                          <MaterialCommunityIcons name="download" size={scale(26)} color="#fff" />
                        </View>
                        <Text style={styles.shareOptionName} numberOfLines={1}>
                          Download
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.shareOption}
                        onPress={() => handleShare("facebook")}
                      >
                        <View
                          style={[
                            styles.shareOptionIconCircle,
                            {
                              backgroundColor: "#485a9620",
                            },
                          ]}
                        >
                          <MaterialCommunityIcons name="facebook" size={scale(26)} color="#4267B2" />
                        </View>
                        <Text style={styles.shareOptionName} numberOfLines={1}>
                          Facebook
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.shareOption}
                        onPress={() => handleShare("twitter")}
                      >
                        <View
                          style={[
                            styles.shareOptionIconCircle,
                            {
                              backgroundColor: "#1DA1F220",
                            },
                          ]}
                        >
                          <MaterialCommunityIcons name="twitter" size={scale(26)} color="#1DA1F2" />
                        </View>
                        <Text style={styles.shareOptionName} numberOfLines={1}>
                          Twitter
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {!showMoreShareOptions && (
                    <TouchableOpacity
                      style={styles.shareOption}
                      onPress={() => {
                        setShowMoreShareOptions(true);
                        
                        setTimeout(() => {
                          shareScrollViewRef.current?.scrollToEnd({
                            animated: true,
                          });
                        }, 100);
                      }}
                    >
                      <View
                        style={[
                          styles.shareOptionIconCircle,
                          {
                            backgroundColor: "#FFFFFF26",
                          },
                        ]}
                      >
                        <MaterialCommunityIcons name="dots-horizontal" size={scale(28)} color="#fff" />
                      </View>
                      <Text style={styles.shareOptionName} numberOfLines={1}>
                        More
                      </Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showThreeDotsMenu}
        transparent={true}
        animationType="none"
        onRequestClose={() => {
          Animated.timing(threeDotsSlideAnim, {
            toValue: height,
            duration: 300,
            useNativeDriver: true,
          }).start(() => setShowThreeDotsMenu(false));
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            Animated.timing(threeDotsSlideAnim, {
              toValue: height,
              duration: 300,
              useNativeDriver: true,
            }).start(() => setShowThreeDotsMenu(false));
          }}
        >
          <Animated.View
            style={[styles.commandPanelModal, { transform: [{ translateY: threeDotsSlideAnim }] }]}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.handleBar} />

              <Text style={styles.commandPanelTitle}>OPTIONS</Text>

              <View style={styles.commandGrid}>

                <TouchableOpacity
                  style={styles.commandItem}
                  onPress={() => {
                    Animated.timing(threeDotsSlideAnim, {
                      toValue: height,
                      duration: 300,
                      useNativeDriver: true,
                    }).start(() => {
                      setShowThreeDotsMenu(false);
                      showToast("Feed preferences aren't available yet.", "info");
                    });
                  }}
                >
                  <View style={styles.commandIconBox}>
                    <HeartIcon color="#EC9A15" size={22} />
                  </View>
                  <Text style={styles.commandItemText}>Interested</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.commandItem}
                  onPress={() => {
                    Animated.timing(threeDotsSlideAnim, {
                      toValue: height,
                      duration: 300,
                      useNativeDriver: true,
                    }).start(() => {
                      setShowThreeDotsMenu(false);
                      showToast("Feed preferences aren't available yet.", "info");
                    });
                  }}
                >
                  <View style={styles.commandIconBox}>
                    <BlockIcon color="#fff" size={22} />
                  </View>
                  <Text style={styles.commandItemText}>Not Interested</Text>
                </TouchableOpacity>

                {menuReelIsMine ? (
                <TouchableOpacity
                  style={[styles.commandItem, styles.commandItemDanger]}
                  onPress={() => {
                    Animated.timing(threeDotsSlideAnim, {
                      toValue: height,
                      duration: 300,
                      useNativeDriver: true,
                    }).start(() => {
                      setShowThreeDotsMenu(false);
                      confirmDeleteReel(menuReel);
                    });
                  }}
                >
                  <View
                    style={[
                      styles.commandIconBox,
                      {
                        backgroundColor: "rgba(255, 59, 48, 0.15)",
                      },
                    ]}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={22} color="#FF3B30" />
                  </View>
                  <Text style={[styles.commandItemText, styles.commandTextDanger]}>Delete</Text>
                </TouchableOpacity>
                ) : (
                <TouchableOpacity
                  style={[styles.commandItem, styles.commandItemDanger]}
                  onPress={() => {
                    Animated.timing(threeDotsSlideAnim, {
                      toValue: height,
                      duration: 300,
                      useNativeDriver: true,
                    }).start(() => {
                      setShowThreeDotsMenu(false);
                      // No backend report endpoint yet: opens a pre-filled email to support.
                      if (menuReel?._backendId) reportContent("reel", menuReel._backendId);
                    });
                  }}
                >
                  <View
                    style={[
                      styles.commandIconBox,
                      {
                        backgroundColor: "rgba(255, 59, 48, 0.15)",
                      },
                    ]}
                  >
                    <FlagIcon size={22} />
                  </View>
                  <Text style={[styles.commandItemText, styles.commandTextDanger]}>Report</Text>
                </TouchableOpacity>
                )}
                {!menuReelIsMine && !!menuReel?.userId && (
                  <TouchableOpacity
                    style={[styles.commandItem, styles.commandItemDanger]}
                    onPress={() => {
                      Animated.timing(threeDotsSlideAnim, {
                        toValue: height,
                        duration: 300,
                        useNativeDriver: true,
                      }).start(() => {
                        setShowThreeDotsMenu(false);
                        const target = menuReel;
                        Alert.alert(
                          `Block ${target.username || "this user"}?`,
                          "You won't see their reels or comments. You can unblock them from Settings & Help > Blocked Users.",
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Block",
                              style: "destructive",
                              onPress: async () => {
                                await blockUser(target.userId, target.username);
                                setReels((prev) => prev.filter((r) => r.userId !== target.userId));
                                toastSuccess("User blocked");
                              },
                            },
                          ]
                        );
                      });
                    }}
                  >
                    <View style={[styles.commandIconBox, { backgroundColor: "rgba(255, 59, 48, 0.15)" }]}>
                      <MaterialCommunityIcons name="block-helper" size={20} color="#FF3B30" />
                    </View>
                    <Text style={[styles.commandItemText, styles.commandTextDanger]}>Block user</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.commandCancelButton}
                onPress={() => {
                  Animated.timing(threeDotsSlideAnim, {
                    toValue: height,
                    duration: 300,
                    useNativeDriver: true,
                  }).start(() => setShowThreeDotsMenu(false));
                }}
              >
                <Text style={styles.commandCancelText}>Cancel</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
      <Modal
        visible={downloadModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !isDownloading && setDownloadModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { justifyContent: "center", alignItems: "center" }]}>
          <View style={styles.downloadCard}>
            <Text style={styles.downloadTitle}>Save to Gallery?</Text>
            <Text style={styles.downloadSubtitle}>This will download the reel to your device.</Text>

            {isDownloading ? (
              <View style={styles.downloadingState}>
                <ActivityIndicator size="large" color="#EC9A15" />
                <Text style={styles.processingText}>Applying Watermark...</Text>
              </View>
            ) : (
              <View style={styles.downloadButtonRow}>
                <TouchableOpacity
                  style={styles.downloadCancelBtn}
                  onPress={() => setDownloadModalVisible(false)}
                >
                  <Text style={styles.downloadCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.downloadConfirmBtn}
                  onPress={() =>
                    selectedReelForDownload && executeDownloadWithWatermark(selectedReelForDownload)
                  }
                >
                  <Text style={styles.downloadConfirmText}>Download</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
      
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tabs={tabs}
        onOpenDrawer={() => setDrawerVisible(true)}
      />

      <DrawerMenu visible={drawerVisible} onClose={() => setDrawerVisible(false)} />

      {currentTipReelId !== null && (
        <SupportModal
          visible={tipModalVisible}
          onClose={() => {
            setTipModalVisible(false);
            setCurrentTipReelId(null);
            setCurrentTipCreatorId(undefined);
          }}
          reelId={reels.find((r) => r.id === currentTipReelId)?._backendId || ""}
          creatorId={currentTipCreatorId ?? ''}
          creatorName={
            reels.find((r) => r.id === currentTipReelId)?.username || "Creator"
          }
          onSupportSent={() => {
            if (currentTipReelId !== null) {
              try {
                setReels((prevReels) =>
                  prevReels.map((reel) =>
                    reel.id === currentTipReelId
                      ? {
                        ...reel,
                        tips: (reel.tips || 0) + 1,
                      }
                      : reel
                  )
                );
              } catch { /* intentionally ignored */
              }
            }
          }}
        />
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  
  logEntryCard: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: scale(16),
    padding: scale(14),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  commentItemInner: {
    flexDirection: "row",
  },

  viewRepliesButton: {
    marginTop: scale(10),
    marginBottom: scale(4),
    alignSelf: "flex-start",
  },
  viewRepliesText: {
    color: "#EC9A15", 
    fontSize: getFontSize(12),
    fontWeight: "700",
  },
  levelText: {
    color: "#EC9A15",
    fontSize: getFontSize(11),
    fontWeight: "800",
    fontStyle: "italic",
  },
  levelTextSub: {
    color: "#888",
    fontSize: getFontSize(10),
    fontWeight: "700",
    fontStyle: "italic",
  },
  repliesContainer: {
    marginTop: scale(12),
    paddingLeft: scale(44),
  },
  logReplyCard: {
    flexDirection: "row",
    marginBottom: scale(12), 
  },
  replyAvatar: {
    width: scale(22), 
    height: scale(22),
    borderRadius: scale(11),
    marginRight: scale(10),
    marginTop: scale(2), 
  },
  replyContent: {
    flex: 1,
  },
  replyUsername: {
    color: "#fff",
    fontSize: getFontSize(13),
    fontWeight: "600",
  },
  replyText: {
    color: "#fff",
    fontSize: getFontSize(13),
    lineHeight: scale(18),
    marginTop: scale(2),
    marginBottom: scale(4),
  },
  replyActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  levelBadgeSub: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(6),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  levelBadgeTextSub: {
    color: "#aaa",
    fontSize: getFontSize(9),
    fontWeight: "800",
    textTransform: "uppercase",
  },

  viewRepliesLine: {
    width: scale(24),
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginRight: scale(8),
  },

  repliesSpine: {
    position: "absolute",
    left: scale(15), 
    top: scale(-12), 
    bottom: scale(20), 
    width: 1.5,
    backgroundColor: "rgba(255, 255, 255, 0.15)", 
  },

  replyThreadPeg: {
    position: "absolute",
    left: scale(-29), 
    top: scale(11), 
    width: scale(20), 
    height: 1.5,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  cleanCommentRow: {
    paddingVertical: scale(14), 
    backgroundColor: "transparent",
  },
  cleanReplyRow: {
    flexDirection: "row",
    marginTop: scale(12),
  },
  replyThreadConnector: {
    position: "absolute",
    left: 0,
    top: scale(12), 
    width: scale(12),
    height: 1.5,
    backgroundColor: "rgba(255, 255, 255, 0.15)", 
  },

  gamifiedModal: {
    backgroundColor: "#2A1B0D", 
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    height: height * 0.7,
    borderTopWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.3)", 
    shadowColor: "#EC9A15",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
    paddingTop: scale(10), 
  },
  handleBar: {
    width: scale(40),
    height: scale(4),
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: scale(2),
    alignSelf: "center",
    marginBottom: scale(8), 
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    
  },

  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: scale(4),
    gap: scale(6),
  },
  levelBadge: {
    backgroundColor: "rgba(236, 154, 21, 0.15)",
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(6),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(236, 154, 21, 0.4)",
  },
  levelBadgeText: {
    color: "#EC9A15",
    fontSize: getFontSize(9),
    fontWeight: "800",
    textTransform: "uppercase",
  },
  gamifiedInputWrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: scale(8),
    paddingBottom: Platform.OS === "ios" ? scale(32) : scale(20),
    backgroundColor: "#2A1B0D", 
  },
  gamifiedInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)", 
    borderRadius: scale(24),
    paddingHorizontal: scale(6),
    paddingVertical: scale(6),
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    minHeight: scale(56),
  },
  gamifiedInput: {
    flex: 1,
    color: "#fff",
    fontSize: getFontSize(14),
    paddingHorizontal: scale(12),
    maxHeight: scale(100),
  },
  gamifiedPostButton: {
    backgroundColor: "rgba(236, 154, 21, 0.2)",
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.5)",
  },
  gamifiedPostButtonDisabled: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  gamifiedPostButtonText: {
    color: "#EC9A15",
    fontSize: getFontSize(12),
    fontWeight: "800",
    letterSpacing: 1,
  },
  gamifiedPostButtonTextDisabled: {
    color: "#666",
  },
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  backButtonContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? scale(50) : scale(40),
    left: spacing.lg,
    zIndex: 10,
  },
  integratedCommentRow: {
    paddingVertical: scale(14),
    borderBottomWidth: StyleSheet.hairlineWidth, 
    borderBottomColor: "rgba(236, 154, 21, 0.15)", 
    backgroundColor: "transparent", 
  },
  integratedReplyRow: {
    flexDirection: "row",
    marginTop: scale(12),
    paddingTop: scale(12),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.05)", 
    paddingLeft: scale(20), 
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    minWidth: scale(40),
    minHeight: scale(40),
    justifyContent: "center",
    alignItems: "center",
  },
  flatListContent: {
    paddingBottom: 0,
  },
  reelContainer: {
    width: width,
    height: height,
    position: "relative",
    backgroundColor: "#000",
    overflow: "hidden",
  },
  playbackFailed: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  playbackFailedTitle: { color: "#fff", fontSize: 18, fontWeight: "700", textAlign: "center" },
  playbackFailedText: { color: "#aaa", fontSize: 14, textAlign: "center", lineHeight: 20 },
  playbackFailedButton: {
    marginTop: 8,
    backgroundColor: "#EC9A15",
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 10,
  },
  playbackFailedButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  reelBuffering: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  reelImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
    alignSelf: "center",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 0,
    paddingBottom: 0,
    paddingTop: 0,
  },
  videoTouchable: {
    width: "100%",
    height: "100%",
  },
  starAnimationContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: scale(-40),
    marginTop: scale(-40),
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  playPauseIconContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: scale(-40),
    marginTop: scale(-40),
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  playPauseIconWrapper: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: scale(50),
    width: scale(80),
    height: scale(80),
    alignItems: "center",
    justifyContent: "center",
  },

  gamifiedCommentCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)", 
    borderRadius: scale(16),
    padding: scale(12),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },

  gamifiedReplyCard: {
    flexDirection: "row",
    marginTop: scale(12),
    paddingTop: scale(12),
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
    paddingLeft: scale(8), 
  },

  threeDotsButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? scale(50) : scale(40),
    right: spacing.lg,
    width: scale(44),
    height: scale(44),
    minWidth: scale(44),
    minHeight: scale(44),
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: scale(22),
  },
  
  actionIconsContainer: {
    position: "absolute",
    right: scale(1),
    left: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  
  tipButton: {
    width: "100%", 
    backgroundColor: "#EC9A15",
    paddingVertical: scale(12),
    borderRadius: scale(25),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  tipButtonText: {
    color: "#fff",
    fontSize: getFontSize(15),
    fontWeight: "700",
  },
  bottomInfoContainer: {
    width: width * 0.75, 
    marginBottom: scale(12),
    paddingRight: scale(16), 
  },
  
  actionIconsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(16), 
  },
  actionIconButton: {
    alignItems: "center",
    justifyContent: "center",
    gap: scale(4), 
    width: scale(50),
    height: scale(50),
    minWidth: scale(50),
    minHeight: scale(50),
  },
  
  horizontalLine: {
    position: "absolute",
    alignSelf: "center",
    width: scale(180),
    height: scale(0.6),
    backgroundColor: "#fff",
    opacity: 0.6,
    zIndex: 10,
  },
  questTracker: {
    position: "absolute",
    top: Platform.OS === "ios" ? scale(100) : scale(90), 
    left: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.4)",
    zIndex: 10,
  },
  questIcon: {
    fontSize: getFontSize(18),
    marginRight: scale(6),
  },
  questTitle: {
    color: "#EC9A15",
    fontSize: getFontSize(10),
    fontWeight: "800",
    textTransform: "uppercase",
  },
  questProgress: {
    color: "#fff",
    fontSize: getFontSize(11),
    fontWeight: "500",
  },
  floatingXP: {
    position: "absolute",
    top: -20,
    left: 10,
    zIndex: 20,
  },
  floatingXPText: {
    color: "#FFD700", 
    fontSize: getFontSize(16),
    fontWeight: "900",
    fontStyle: "italic",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  actionIconCount: {
    color: "#fff",
    fontSize: getFontSize(11), 
    fontWeight: "600",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: scale(1) },
    textShadowRadius: scale(3),
    marginTop: scale(2),
    marginBottom: scale(10), 
    textAlign: "center",
  },
  
  musicBarContainer: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: scale(20),
    zIndex: 10,
    maxWidth: scale(200),
    minWidth: scale(120),
  },
  actionButtons: {
    position: "absolute",
    right: scale(12),
    bottom: Platform.OS === "ios" ? scale(100) : scale(80),
    justifyContent: "flex-end",
    alignItems: "center",
    gap: scale(28),
  },
  actionButton: {
    alignItems: "center",
    gap: scale(6),
    minWidth: scale(50),
  },
  actionCount: {
    color: "#fff",
    fontSize: getFontSize(13),
    fontWeight: "600",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: scale(1) },
    textShadowRadius: scale(2),
  },
  threeDotsMenuModal: {
    backgroundColor: "#3C2610",
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    paddingBottom: Platform.OS === "ios" ? scale(32) : scale(20),
    maxHeight: height * 0.5,
  },
  menuItem: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: scale(1),
    borderBottomColor: "#2a2a2a",
    borderWidth: scale(1),
    borderColor: "transparent",
    minHeight: scale(50),
  },
  menuItemText: {
    color: "#fff",
    fontSize: getFontSize(16),
    textAlign: "center",
  },
  menuItemTextDanger: {
    color: "#FF3B30",
  },

  captionContainer: {
    marginTop: scale(6),
    marginBottom: scale(4),
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
    gap: scale(10),
    flexWrap: "nowrap",
  },
  followButtonBox: {
    backgroundColor: "#EC9A15",
    paddingHorizontal: spacing.lg,
    paddingVertical: scale(6),
    borderRadius: scale(6),
    marginLeft: spacing.sm,
    minHeight: scale(28),
  },
  followButtonBoxText: {
    color: "#fff",
    fontSize: getFontSize(13),
    fontWeight: "600",
  },
  profileImageContainer: {
    position: "relative",
  },
  profileImage: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    borderWidth: scale(1),
    borderColor: "#fff",
  },
  commandPanelModal: {
    backgroundColor: "#2A1B0D", 
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === "ios" ? scale(40) : scale(24),
    borderTopWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.3)", 
    shadowColor: "#EC9A15",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
  },
  commandPanelTitle: {
    color: "#9CA3AF",
    fontSize: getFontSize(12),
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: scale(16),
    marginLeft: scale(4),
  },
  commandGrid: {
    gap: scale(10),
  },
  commandItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)", 
    borderRadius: scale(16),
    padding: scale(12),
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  commandItemDanger: {
    backgroundColor: "rgba(255, 59, 48, 0.05)",
    borderColor: "rgba(255, 59, 48, 0.2)",
  },
  commandIconBox: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: "rgba(236, 154, 21, 0.15)", 
    alignItems: "center",
    justifyContent: "center",
    marginRight: scale(14),
  },
  commandItemText: {
    color: "#fff",
    fontSize: getFontSize(16),
    fontWeight: "600",
  },
  commandTextDanger: {
    color: "#FF3B30",
  },
  commandCancelButton: {
    marginTop: scale(20),
    paddingVertical: scale(16),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: scale(25),
  },
  downloadCard: {
    width: wp(80),
    backgroundColor: "#1E1111",
    borderRadius: scale(16),
    padding: scale(20),
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.3)",
  },
  downloadTitle: {
    color: "#fff",
    fontSize: getFontSize(18),
    fontWeight: "bold",
    marginBottom: scale(8),
  },
  downloadSubtitle: {
    color: "#CAD7D8",
    fontSize: getFontSize(13),
    textAlign: "center",
    marginBottom: scale(20),
  },
  downloadingState: {
    alignItems: "center",
    marginVertical: scale(10),
  },
  processingText: {
    color: "#EC9A15",
    marginTop: scale(12),
    fontSize: getFontSize(14),
    fontWeight: "600",
  },
  downloadButtonRow: {
    flexDirection: "row",
    gap: scale(12),
    width: "100%",
  },
  downloadCancelBtn: {
    flex: 1,
    paddingVertical: scale(12),
    borderRadius: scale(8),
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
  },
  downloadConfirmBtn: {
    flex: 1,
    paddingVertical: scale(12),
    borderRadius: scale(8),
    backgroundColor: "#EC9A15",
    alignItems: "center",
  },
  downloadCancelText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: getFontSize(14),
  },
  downloadConfirmText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: getFontSize(14),
  },
  commandCancelText: {
    color: "#fff",
    fontSize: getFontSize(16),
    fontWeight: "700",
  },
  followButton: {
    position: "absolute",
    bottom: scale(-2),
    right: scale(-2),
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    backgroundColor: "#EC9A15",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: scale(1),
    borderColor: "#000",
  },
  followButtonText: {
    color: "#fff",
    fontSize: getFontSize(14),
    fontWeight: "700",
  },
  username: {
    color: "#ffffff", 
    fontSize: getFontSize(15),
    fontWeight: "600",
    textShadowColor: "rgba(0, 0, 0, 0.8)", 
    textShadowOffset: { width: 0, height: scale(1) },
    textShadowRadius: scale(2),
  },
  caption: {
    color: "#ffffff", 
    fontSize: getFontSize(14),
    marginTop: 0,
    marginBottom: 0,
    lineHeight: scale(20),
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: scale(1) },
    textShadowRadius: scale(3),
  },
  showMoreText: {
    color: "#EC9A15",
    fontSize: getFontSize(14),
    fontWeight: "600",
    marginTop: scale(4),
    marginBottom: scale(10),
  },
  musicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    marginTop: scale(4),
    marginBottom: spacing.sm,
  },
  musicName: {
    color: "#ffffff", 
    fontSize: getFontSize(13),
    flex: 1,
    fontWeight: "500",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: scale(1) },
    textShadowRadius: scale(3),
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  commentModal: {
    backgroundColor: "#3C2610",
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    height: height * 0.7,
    paddingBottom: Platform.OS === "ios" ? scale(32) : scale(20),
  },
  shareModal: {
    backgroundColor: "#3C2610",
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    maxHeight: height * 0.6,
    paddingBottom: Platform.OS === "ios" ? scale(32) : scale(20),
  },

  commentHeaderTitle: {
    color: "#fff",
    fontSize: getFontSize(18),
    fontWeight: "700",
  },
  closeButton: {
    color: "#fff",
    fontSize: getFontSize(24),
    fontWeight: "300",
    minWidth: scale(44),
    minHeight: scale(44),
    textAlign: "center",
    textAlignVertical: "center",
  },
  commentsList: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    maxHeight: height * 0.5,
  },
  commentItem: {
    flexDirection: "row",
    paddingVertical: scale(12),
    borderBottomWidth: scale(1),
    borderBottomColor: "#2a2a2a",
    minHeight: scale(60),
  },
  commentAvatar: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    marginRight: scale(12),
  },
  commentContent: {
    flex: 1,
  },
  commentUsername: {
    color: "#fff",
    fontSize: getFontSize(14),
    fontWeight: "600",
    marginBottom: scale(4),
  },
  commentText: {
    color: "#fff",
    fontSize: getFontSize(14),
    marginBottom: scale(6),
    lineHeight: scale(20),
  },
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  commentTime: {
    color: "#999",
    fontSize: getFontSize(12),
  },
  commentReply: {
    color: "#999",
    fontSize: getFontSize(12),
    fontWeight: "600",
  },
  commentLikeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    minWidth: scale(44),
    minHeight: scale(44),
    justifyContent: "center",
  },
  commentLikeCount: {
    color: "#999",
    fontSize: getFontSize(12),
  },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: scale(12),
    borderTopWidth: scale(1),
    borderTopColor: "#333",
    gap: scale(12),
    minHeight: scale(60),
  },
  commentInputAvatar: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
  },
  commentInput: {
    flex: 1,
    backgroundColor: "#2a2a2a",
    borderRadius: scale(20),
    paddingHorizontal: spacing.lg,
    paddingVertical: scale(10),
    color: "#fff",
    fontSize: getFontSize(14),
    maxHeight: scale(100),
    minHeight: scale(40),
  },
  sendCommentButton: {
    marginLeft: scale(8),
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    backgroundColor: "#EC9A15",
    borderRadius: scale(16),
    justifyContent: "center",
    alignItems: "center",
  },
  sendCommentText: {
    color: "#000",
    fontSize: getFontSize(12),
    fontWeight: "600",
  },
  postButton: {
    paddingHorizontal: spacing.lg,
    minWidth: scale(44),
    minHeight: scale(44),
    justifyContent: "center",
    alignItems: "center",
  },
  flexButtonWrapper: {
    flex: 1, 
    alignItems: "center",
    justifyContent: "center",
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonText: {
    color: "#EC9A15",
    fontSize: getFontSize(14),
    fontWeight: "600",
  },
  postButtonTextDisabled: {
    color: "#666",
  },
  shareHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: scale(1),
    borderBottomColor: "#333",
    minHeight: scale(50),
  },
  shareHeaderTitle: {
    color: "#fff",
    fontSize: getFontSize(18),
    fontWeight: "700",
  },
  friendsSection: {
    paddingVertical: spacing.lg,
    borderBottomWidth: scale(1),
    borderBottomColor: "#2a2a2a",
  },
  sectionTitle: {
    color: "#fff",
    fontSize: getFontSize(14),
    fontWeight: "600",
    paddingHorizontal: spacing.lg,
    marginBottom: scale(12),
  },
  friendsList: {
    paddingHorizontal: spacing.lg,
  },
  friendItem: {
    alignItems: "center",
    marginRight: spacing.lg,
    width: scale(70),
  },
  friendAvatar: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    marginBottom: spacing.sm,
  },
  friendName: {
    color: "#fff",
    fontSize: getFontSize(12),
    textAlign: "center",
  },
  shareOptionsSection: {
    paddingVertical: spacing.lg,
  },
  shareOptionsList: {
    paddingHorizontal: spacing.lg,
  },
  shareOption: {
    alignItems: "center",
    marginRight: scale(20),
    width: scale(70),
  },
  shareOptionIconCircle: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  shareOptionIconText: {
    fontSize: getFontSize(28),
    color: "#fff",
  },
  shareOptionName: {
    color: "#fff",
    fontSize: getFontSize(12),
    textAlign: "center",
  },
  shareIconImage: {
    width: scale(24),
    height: scale(24),
  },
  replyItem: {
    flexDirection: "row",
    paddingVertical: scale(8),
    paddingLeft: scale(44),
    marginTop: scale(8),
    borderTopWidth: scale(1),
    borderTopColor: "#2a2a2a",
  },

  rightActionContainer: {
    position: "absolute",
    right: scale(6),
    bottom: Platform.OS === "ios" ? scale(150) : scale(140),
    alignItems: "center",
    gap: scale(20),
    zIndex: 10,
  },
  rightActionButton: {
    alignItems: "center",
    justifyContent: "center",
    gap: scale(4),
  },
  
  bottomButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: scale(12), 
    width: "100%", 
  },
  
  voteButtonActive: {
    backgroundColor: "#EC9A15",
  },
  voteButtonInactive: {
    backgroundColor: "rgba(0, 0, 0, 0.5)", 
    borderWidth: 1,
    borderColor: "#EC9A15",
  },
  
  bottomContent: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg, 
    justifyContent: "flex-end",
    zIndex: 10,
    marginBottom: scale(4),
  },
});

const feedStateStyles = StyleSheet.create({
  center: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    zIndex: 1,
  },
  title: {
    color: "#ccc",
    fontSize: 15,
    textAlign: "center",
  },
  retry: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#EC9A15",
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },
});
