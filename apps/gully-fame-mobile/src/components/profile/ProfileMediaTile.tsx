import { memo, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { EyeIcon, PlayIcon } from "@/icons";
import { MultiItemBadgeIcon } from "./profileIcons";
import { formatCount, resolveMediaUrl } from "@/utils/mediaUrl";
import { getCachedThumbnail, getVideoThumbnail } from "@/utils/videoThumbnailCache";

export interface ProfileMediaItem {
  id: string;
  thumbnail?: string | null;
  uri?: string | null;
  mediaType?: string;
  media?: unknown[];
  views?: number;
  stats?: { views?: number };
  [key: string]: any;
}

export const isPhotoItem = (item: ProfileMediaItem) =>
  item.mediaType === "photo" || item.mediaType === "image";

/** Views only when the backend sends them. Undefined hides the counter. */
const viewsOf = (item: ProfileMediaItem): number | undefined => {
  const v = item.views ?? item.stats?.views ?? item.viewCount;
  return typeof v === "number" ? v : undefined;
};

interface Props {
  item: ProfileMediaItem;
  size: number;
  /** Tile height; reels use a tall 9:16 tile like Instagram. */
  height: number;
  onPress: (item: ProfileMediaItem) => void;
  onLongPress?: (item: ProfileMediaItem) => void;
}

function ProfileMediaTileBase({ item, size, height, onPress, onLongPress }: Props) {
  const isPhoto = isPhotoItem(item);
  const videoUrl = isPhoto ? null : resolveMediaUrl(item.uri);
  const serverThumb = resolveMediaUrl(item.thumbnail);
  const [generatedThumb, setGeneratedThumb] = useState<string | null>(() =>
    !serverThumb && videoUrl ? getCachedThumbnail(videoUrl) : null
  );
  const [failed, setFailed] = useState(false);
  // A broken server thumbnail (404/403) falls back to a frame taken from the video itself.
  const [serverThumbFailed, setServerThumbFailed] = useState(false);
  const useServerThumb = !!serverThumb && !serverThumbFailed;

  useEffect(() => {
    if (useServerThumb || !videoUrl || generatedThumb) return;
    let active = true;
    getVideoThumbnail(videoUrl).then((uri) => {
      if (!active) return;
      if (uri) setGeneratedThumb(uri);
      else setFailed(true);
    });
    return () => {
      active = false;
    };
  }, [useServerThumb, videoUrl, generatedThumb]);

  const source =
    (useServerThumb ? serverThumb : null) || generatedThumb || (isPhoto ? resolveMediaUrl(item.uri) : null);
  const views = viewsOf(item);
  const isMulti = Array.isArray(item.media) && item.media.length > 1;

  return (
    <Pressable
      onPress={() => onPress(item)}
      onLongPress={onLongPress ? () => onLongPress(item) : undefined}
      delayLongPress={onLongPress ? 350 : undefined}
      style={[styles.tile, { width: size, height }]}
      accessibilityRole="imagebutton"
      accessibilityLabel={isPhoto ? "Photo post" : "Video post"}
    >
      {source && !failed ? (
        <Image
          source={{ uri: source }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
          recyclingKey={item.id}
          onError={() => {
            if (useServerThumb && source === serverThumb) setServerThumbFailed(true);
            else setFailed(true);
          }}
        />
      ) : (
        <View style={styles.fallback} testID="profile-tile-fallback">
          {failed || (!source && !videoUrl) ? (
            <>
              <PlayIcon size={26} color="rgba(255,255,255,0.7)" />
              <Text style={styles.fallbackText}>
                Unavailable
              </Text>
            </>
          ) : null}
        </View>
      )}

      {isMulti ? (
        <View style={styles.badge}>
          <MultiItemBadgeIcon size={15} />
        </View>
      ) : !isPhoto ? (
        <View style={styles.badge}>
          <PlayIcon size={14} color="#fff" />
        </View>
      ) : null}

      {views !== undefined ? (
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.55)"]} style={styles.scrim}>
          <View style={styles.viewsRow}>
            <EyeIcon size={13} color="#fff" />
            <Text style={styles.viewsText} numberOfLines={1}>
              {formatCount(views)}
            </Text>
          </View>
        </LinearGradient>
      ) : null}
    </Pressable>
  );
}

export const ProfileMediaTile = memo(
  ProfileMediaTileBase,
  (a, b) =>
    a.item === b.item && a.size === b.size && a.height === b.height && a.onPress === b.onPress && a.onLongPress === b.onLongPress
);

const styles = StyleSheet.create({
  tile: {
    backgroundColor: "#4A3218",
    overflow: "hidden",
  },
  fallback: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#4A3218",
  },
  fallbackText: {
    alignSelf: "stretch",
    textAlign: "center",
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    paddingHorizontal: 4,
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
  },
  scrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 6,
    paddingTop: 18,
    paddingBottom: 5,
  },
  viewsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewsText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 1,
  },
});
