import React, { useCallback, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as FileSystem from "expo-file-system/legacy";
import { useVideoPlayer, VideoView } from "expo-video";
import { DownloadItem, listDownloads, removeDownload } from "@/services/downloadsStore";
import { SkeletonList } from "@/components/Skeleton/Skeleton";
import { toastError } from "@/components/ui/Toast";

// Same brown + orange palette as the rest of the app.
const C = {
  bg: "#3C2610",
  card: "#1A1A1A",
  inner: "#252525",
  border: "#2A2A2A",
  accent: "#EC9A15",
  accentLight: "#FFB84D",
  accentSoft: "rgba(236, 154, 21, 0.15)",
  text: "#FFFFFF",
  muted: "#CAD7D8",
  faint: "#8A8F90",
  success: "#25D366",
  danger: "#FF6B6B",
};

const formatMb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
const formatGb = (bytes: number) => `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

function DownloadPlayer({ uri, onClose }: { uri: string; onClose: () => void }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });
  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.playerContainer}>
        <VideoView style={styles.player} player={player} contentFit="contain" nativeControls />
        <TouchableOpacity style={styles.playerClose} onPress={onClose} accessibilityLabel="Close player">
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export default function DownloadsScreen() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState<DownloadItem | null>(null);
  const [disk, setDisk] = useState<{ free: number; total: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDownloads(await listDownloads());
      const [free, total] = await Promise.all([
        FileSystem.getFreeDiskStorageAsync().catch(() => 0),
        FileSystem.getTotalDiskCapacityAsync().catch(() => 0),
      ]);
      setDisk(total > 0 ? { free, total } : null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleDelete = (item: DownloadItem) => {
    Alert.alert("Delete download", `Remove "${item.title}" from Downloads? This doesn't delete it from your gallery.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await removeDownload(item.id);
          load();
        },
      },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert("Delete all downloads", "Remove every downloaded video from this phone? Your gallery is not affected.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete all",
        style: "destructive",
        onPress: async () => {
          try {
            for (const item of downloads) {
              await removeDownload(item.id);
            }
          } catch {
            toastError("Some downloads could not be removed. Try again.");
          }
          load();
        },
      },
    ]);
  };

  const totalBytes = downloads.reduce((sum, item) => sum + item.sizeBytes, 0);
  // Share of the phone's storage used by downloads (kept small, so the bar stays honest).
  const usedFraction = disk ? Math.min(1, totalBytes / disk.total) : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => router.back()} style={styles.headerSide}>
          <Ionicons name="chevron-back" size={28} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Downloads</Text>
        <View style={styles.headerSide} />
      </View>

      <Text style={styles.subtitle}>Manage the videos you've saved for offline viewing.</Text>

      {loading ? (
        <SkeletonList rows={5} avatarSize={72} avatarRadius={10} trailing style={{ padding: 16 }} />
      ) : (
        <>
          {/* Storage */}
          <View style={styles.storageCard}>
            <View style={styles.storageTop}>
              <Text style={styles.storageTitle}>Offline storage</Text>
              {downloads.length > 0 && (
                <TouchableOpacity onPress={handleClearAll} accessibilityRole="button">
                  <Text style={styles.clearText}>Clear all</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.max(2, usedFraction * 100)}%` }]} />
            </View>
            <Text style={styles.storageMeta}>
              {downloads.length} {downloads.length === 1 ? "video" : "videos"} · {formatMb(totalBytes)}
              {disk ? `  ·  ${formatGb(disk.free)} free of ${formatGb(disk.total)}` : ""}
            </Text>
          </View>

          {downloads.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="download-outline" size={28} color={C.accent} />
              </View>
              <Text style={styles.emptyTitle}>No downloads yet</Text>
              <Text style={styles.emptyText}>Tap the download button on a reel to save it here for offline viewing.</Text>
            </View>
          ) : (
            <FlatList
              data={downloads}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={7}
              removeClippedSubviews
              ListFooterComponent={
                <Text style={styles.footerNote}>
                  Downloads stay on this phone. Deleting one doesn't remove it from your gallery.
                </Text>
              }
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <TouchableOpacity style={styles.thumbWrap} onPress={() => setPlaying(item)} accessibilityLabel="Play">
                    {item.thumbnail ? (
                      <Image source={{ uri: item.thumbnail }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" />
                    ) : (
                      <View style={[styles.thumb, styles.thumbPlaceholder]}>
                        <Ionicons name="play" size={24} color={C.accent} />
                      </View>
                    )}
                    <View style={styles.playBadge}>
                      <Ionicons name="play" size={12} color="#000" />
                    </View>
                  </TouchableOpacity>

                  <View style={styles.info}>
                    <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.meta}>Video · {formatMb(item.sizeBytes)}</Text>
                    <View style={styles.statusRow}>
                      <Ionicons name="checkmark-circle" size={14} color={C.success} />
                      <Text style={styles.statusText}>Completed · {formatDate(item.createdAt)}</Text>
                    </View>
                  </View>

                  <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteButton} accessibilityLabel="Delete download">
                    <Ionicons name="trash-outline" size={20} color={C.danger} />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </>
      )}

      {playing ? <DownloadPlayer uri={playing.localUri} onClose={() => setPlaying(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    paddingTop: Platform.OS === "android" ? 20 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "ios" ? 60 : 12,
    paddingBottom: 8,
  },
  headerSide: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: C.text,
    fontSize: 20,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  subtitle: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontFamily: "Rubik_400Regular",
    marginBottom: 16,
    paddingHorizontal: 24,
  },

  // Storage card
  storageCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  storageTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  storageTitle: {
    color: C.text,
    fontSize: 16,
    fontFamily: "Rubik_600SemiBold",
  },
  clearText: {
    color: C.accent,
    fontSize: 14,
    fontFamily: "Rubik_600SemiBold",
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: C.inner,
    overflow: "hidden",
  },
  barFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: C.accent,
  },
  storageMeta: {
    color: C.faint,
    fontSize: 12,
    marginTop: 10,
    fontFamily: "Rubik_400Regular",
  },

  // List
  list: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 10,
    marginBottom: 12,
  },
  thumbWrap: {
    width: 96,
    height: 72,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: C.inner,
  },
  thumb: {
    width: 96,
    height: 72,
  },
  thumbPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.accentSoft,
  },
  playBadge: {
    position: "absolute",
    right: 6,
    bottom: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    color: C.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "Rubik_600SemiBold",
  },
  meta: {
    color: C.muted,
    fontSize: 12,
    marginTop: 4,
    fontFamily: "Rubik_400Regular",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  statusText: {
    color: C.success,
    fontSize: 12,
    fontFamily: "Rubik_500Medium",
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 107, 107, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  footerNote: {
    color: C.faint,
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 17,
    fontFamily: "Rubik_400Regular",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.accentSoft,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    color: C.text,
    fontSize: 18,
    fontFamily: "PlayfairDisplay_700Bold",
    marginBottom: 6,
  },
  emptyText: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontFamily: "Rubik_400Regular",
  },

  // Player
  playerContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
  },
  player: {
    flex: 1,
  },
  playerClose: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 6,
  },
});
