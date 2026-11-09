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
import { useVideoPlayer, VideoView } from "expo-video";
import { DownloadItem, listDownloads, removeDownload } from "@/services/downloadsStore";
import { SkeletonList } from "@/components/Skeleton/Skeleton";

const formatMb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  const load = useCallback(async () => {
    setLoading(true);
    setDownloads(await listDownloads());
    setLoading(false);
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

  const totalBytes = downloads.reduce((sum, item) => sum + item.sizeBytes, 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2610" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Downloads</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <SkeletonList rows={5} avatarSize={72} avatarRadius={10} trailing style={{ padding: 16 }} />
      ) : downloads.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="download-outline" size={56} color="#EC9A15" />
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
          ListHeaderComponent={
            <Text style={styles.summary}>
              {downloads.length} {downloads.length === 1 ? "video" : "videos"} · {formatMb(totalBytes)}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity style={styles.thumbWrap} onPress={() => setPlaying(item)} accessibilityLabel="Play">
                {item.thumbnail ? (
                  <Image source={{ uri: item.thumbnail }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Ionicons name="play" size={28} color="#EC9A15" />
                  </View>
                )}
                <View style={styles.playBadge}>
                  <Ionicons name="play" size={14} color="#000" />
                </View>
              </TouchableOpacity>

              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.meta}>
                  {formatDate(item.createdAt)} · {formatMb(item.sizeBytes)}
                </Text>
              </View>

              <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteButton} accessibilityLabel="Delete download">
                <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {playing ? <DownloadPlayer uri={playing.localUri} onClose={() => setPlaying(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3C2610",
    paddingTop: Platform.OS === "android" ? 20 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
  },
  emptyText: {
    color: "#C9B9A6",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  summary: {
    color: "#C9B9A6",
    fontSize: 13,
    marginBottom: 4,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2A1A0B",
    borderRadius: 14,
    padding: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(236,154,21,0.2)",
  },
  thumbWrap: {
    width: 84,
    height: 112,
    borderRadius: 10,
    overflow: "hidden",
  },
  thumb: {
    width: "100%",
    height: "100%",
    backgroundColor: "#1E1005",
  },
  thumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  playBadge: {
    position: "absolute",
    right: 6,
    bottom: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#EC9A15",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 2,
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  title: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  meta: {
    color: "#C9B9A6",
    fontSize: 12,
  },
  deleteButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
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
    top: 48,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});
