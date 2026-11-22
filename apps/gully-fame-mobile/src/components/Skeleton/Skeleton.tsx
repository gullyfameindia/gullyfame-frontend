import React, { useEffect, useState } from "react";
import { StyleSheet, View, type DimensionValue, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  FadeOut,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const BASE = "rgba(255,255,255,0.08)";
const HIGHLIGHT = "rgba(255,255,255,0.14)";
const SWEEP_MS = 1200;
const FADE_OUT_MS = 200;

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A placeholder block shaped like the content that is loading, with a light band
 * sweeping across it. With "reduce motion" switched on it stays still.
 */
export function Skeleton({ width = "100%", height, radius = 8, style }: SkeletonProps) {
  const reduceMotion = useReducedMotion();
  const [blockWidth, setBlockWidth] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || blockWidth === 0) return;
    progress.value = 0;
    progress.value = withRepeat(withTiming(1, { duration: SWEEP_MS, easing: Easing.inOut(Easing.ease) }), -1);
    return () => cancelAnimation(progress);
  }, [reduceMotion, blockWidth, progress]);

  const sweep = useAnimatedStyle(() => ({
    transform: [{ translateX: -blockWidth + progress.value * blockWidth * 2 }],
  }));

  const onLayout = (e: LayoutChangeEvent) => setBlockWidth(e.nativeEvent.layout.width);

  return (
    <View onLayout={onLayout} style={[styles.block, { width, height, borderRadius: radius }, style]}>
      {!reduceMotion && blockWidth > 0 && (
        <Animated.View style={[StyleSheet.absoluteFill, sweep]}>
          <LinearGradient
            colors={["transparent", HIGHLIGHT, "transparent"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

/**
 * Wraps a skeleton layout so screen readers announce "Loading" once instead of every block.
 * When the real content replaces it, the skeleton fades out over it instead of vanishing.
 */
export function SkeletonRoot({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return (
    <Animated.View
      style={style}
      exiting={FadeOut.duration(FADE_OUT_MS)}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
    >
      {children}
    </Animated.View>
  );
}

/** Two short text lines, like a title and a meta line under a card. */
export function SkeletonCaption() {
  return (
    <View style={styles.caption}>
      <Skeleton width="80%" height={14} radius={4} />
      <Skeleton width="45%" height={12} radius={4} />
    </View>
  );
}

/** Media cards in columns, e.g. the reel feed, saved reels and downloads. */
export function SkeletonGrid({
  count = 4,
  columns = 2,
  aspectRatio = 0.62,
  caption = false,
  gap = 12,
  style,
}: {
  count?: number;
  columns?: number;
  /** Width / height of each card. */
  aspectRatio?: number;
  /** Show two text lines under each card. */
  caption?: boolean;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SkeletonRoot style={[styles.grid, { margin: -gap / 2 }, style]}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ width: `${100 / columns}%`, padding: gap / 2 }}>
          <Skeleton radius={12} style={{ aspectRatio }} />
          {caption && <SkeletonCaption />}
        </View>
      ))}
    </SkeletonRoot>
  );
}

/** Rows with a thumbnail, a title bar with a pill on the right and two text lines, e.g. chats, notifications, transactions. */
export function SkeletonList({
  rows = 6,
  avatar = true,
  avatarSize = 44,
  avatarRadius = 12,
  trailing = true,
  style,
}: {
  rows?: number;
  avatar?: boolean;
  avatarSize?: number;
  /** Corner radius of the thumbnail; a soft square by default. */
  avatarRadius?: number;
  /** A short pill at the end of the title line, e.g. an amount or a time. */
  trailing?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SkeletonRoot style={style}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.listRow}>
          {avatar && (
            <View style={[styles.thumb, { width: avatarSize, height: avatarSize, borderRadius: avatarRadius }]}>
              <Skeleton width="100%" height="100%" radius={avatarRadius} />
              <Ionicons name="image" size={avatarSize * 0.4} color="rgba(255,255,255,0.14)" style={styles.thumbIcon} />
            </View>
          )}
          <View style={styles.rowText}>
            <View style={styles.titleRow}>
              <Skeleton height={14} radius={4} style={styles.flex} />
              {trailing && <Skeleton width={56} height={14} radius={4} />}
            </View>
            <Skeleton width="50%" height={12} radius={4} />
            <Skeleton width="50%" height={12} radius={4} />
          </View>
        </View>
      ))}
    </SkeletonRoot>
  );
}

/** A text page: a title card followed by a few section cards, e.g. privacy policy, terms, about, FAQs. */
export function SkeletonArticle({ sections = 4, style }: { sections?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <SkeletonRoot style={[styles.cards, style]}>
      <View style={{ alignItems: "center", gap: 10 }}>
        <Skeleton width={52} height={52} radius={26} />
        <Skeleton width="60%" height={20} radius={6} />
        <Skeleton width="35%" height={12} radius={4} />
      </View>
      {Array.from({ length: sections }, (_, i) => (
        <View key={i} style={{ gap: 10 }}>
          <Skeleton width="50%" height={16} radius={4} />
          <Skeleton height={12} radius={4} />
          <Skeleton height={12} radius={4} />
          <Skeleton width="70%" height={12} radius={4} />
        </View>
      ))}
    </SkeletonRoot>
  );
}

/** The top of a profile page: avatar, name, stats pill, and the action buttons. */
export function SkeletonProfileHeader({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <SkeletonRoot style={[{ gap: 16, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }, style]}>
      <View style={styles.row}>
        <Skeleton width={96} height={96} radius={20} />
        <View style={styles.rowText}>
          <Skeleton width="60%" height={20} radius={6} />
          <Skeleton width="30%" height={16} radius={8} />
        </View>
      </View>
      <Skeleton height={52} radius={26} />
      <View style={styles.detailButtons}>
        <Skeleton height={44} radius={12} style={styles.flex} />
        <Skeleton height={44} radius={12} style={styles.flex} />
      </View>
      <Skeleton width="80%" height={14} radius={4} />
    </SkeletonRoot>
  );
}

/** Full-width cards with a caption, e.g. competition lists. */
export function SkeletonCards({
  count = 3,
  height = 180,
  style,
}: {
  count?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SkeletonRoot style={[styles.cards, style]}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i}>
          <Skeleton height={height} radius={16} />
          <SkeletonCaption />
        </View>
      ))}
    </SkeletonRoot>
  );
}

/** A page with a banner, a title and paragraphs, e.g. a competition or profile page. */
export function SkeletonDetail({
  bannerHeight = 220,
  avatar = false,
  style,
}: {
  bannerHeight?: number;
  /** Show a round avatar and name instead of a banner, for profile pages. */
  avatar?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SkeletonRoot style={[styles.detail, style]}>
      {avatar ? (
        <View style={styles.detailAvatar}>
          <Skeleton width={120} height={120} radius={60} />
          <Skeleton width="50%" height={22} radius={6} />
          <View style={styles.detailButtons}>
            <Skeleton height={40} radius={12} style={styles.flex} />
            <Skeleton height={40} radius={12} style={styles.flex} />
            <Skeleton height={40} radius={12} style={styles.flex} />
          </View>
        </View>
      ) : (
        <>
          <Skeleton height={bannerHeight} radius={16} />
          <Skeleton width="70%" height={22} radius={6} />
        </>
      )}
      <View style={styles.detailLines}>
        <Skeleton height={14} radius={4} />
        <Skeleton height={14} radius={4} />
        <Skeleton width="60%" height={14} radius={4} />
      </View>
      <Skeleton height={avatar ? 160 : 100} radius={16} />
    </SkeletonRoot>
  );
}

/** A full-screen reel: the video area, the creator row and caption at the bottom, the action column on the right. */
export function SkeletonReel({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <SkeletonRoot style={[styles.reel, style]}>
      <Skeleton radius={0} style={StyleSheet.absoluteFill} />
      <View style={styles.reelActions}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} width={40} height={40} radius={20} />
        ))}
      </View>
      <View style={styles.reelInfo}>
        <View style={styles.row}>
          <Skeleton width={48} height={48} radius={24} />
          <Skeleton width="40%" height={16} radius={4} />
        </View>
        <Skeleton width="60%" height={14} radius={4} />
        <Skeleton width="45%" height={14} radius={4} />
      </View>
    </SkeletonRoot>
  );
}

const styles = StyleSheet.create({
  reel: { flex: 1, justifyContent: "flex-end" },
  reelActions: { position: "absolute", right: 16, bottom: 140, gap: 24 },
  reelInfo: { padding: 16, paddingBottom: 32, gap: 10, marginRight: 80 },
  block: { backgroundColor: BASE, overflow: "hidden" },
  caption: { gap: 6, marginTop: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  rowText: { flex: 1, gap: 8 },
  listRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12 },
  thumb: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  thumbIcon: { position: "absolute" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  cards: { gap: 20 },
  detail: { gap: 16, padding: 16 },
  detailAvatar: { alignItems: "center", gap: 16 },
  detailButtons: { flexDirection: "row", gap: 10, alignSelf: "stretch" },
  detailLines: { gap: 10 },
  flex: { flex: 1 },
});
