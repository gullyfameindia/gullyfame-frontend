

import { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  Platform,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useInteractionReels } from "@/hooks/useInteractionReels";
import { SkeletonGrid } from "@/components/Skeleton/Skeleton";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 60) / 2; 


export default function SavedScreen() {
  const [activeTab, setActiveTab] = useState<"all" | "reel" | "post">("all");
  // Saved reels come from the feed's is_saved flag (there is no saved-reels endpoint).
  const saved = useInteractionReels("saved", true);
  const savedContent = useMemo(
    () =>
      saved.items.map((reel: any) => ({
        id: String(reel._id || reel.id),
        type: "reel" as const,
        title: reel.caption || "Reel",
        author: reel.author?.username || "",
        thumbnail: reel.thumbnail_url || reel.thumbnail || "",
      })),
    [saved.items]
  );

  const filteredContent = savedContent.filter((item) => {
    if (activeTab === "all") return true;
    return item.type === activeTab;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2610" />

      {}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Content</Text>
        <View style={styles.backButton} />
      </View>

      {}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === "all" && styles.activeTab]} 
          onPress={() => setActiveTab("all")}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === "all" && styles.activeTabText]}>All</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === "reel" && styles.activeTab]} 
          onPress={() => setActiveTab("reel")}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === "reel" && styles.activeTabText]}>Reels</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === "post" && styles.activeTab]} 
          onPress={() => setActiveTab("post")}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === "post" && styles.activeTabText]}>Posts</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={saved.loading ? [] : filteredContent}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onEndReached={saved.loadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        ListEmptyComponent={
          saved.loading ? (
            <SkeletonGrid count={6} aspectRatio={1 / 1.5} caption style={{ marginTop: 8 }} />
          ) : saved.error ? (
            <TouchableOpacity onPress={saved.retry} style={styles.emptyState}>
              <Text style={styles.emptyStateDesc}>{saved.error}</Text>
              <Text style={[styles.emptyStateDesc, { color: "#EC9A15" }]}>Tap to retry</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="bookmark-outline" size={48} color="#EC9A15" />
              </View>
              <Text style={styles.emptyStateTitle}>No Saved Items</Text>
              <Text style={styles.emptyStateDesc}>
                Jab aapko koi post ya reel pasand aaye, toh uspar bookmark icon dabayein, woh yahan save ho jayegi.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          saved.loadingMore ? <ActivityIndicator color="#EC9A15" style={{ paddingVertical: 16 }} /> : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => router.push({ pathname: "/(main)/reel", params: { startReelId: item.id } } as any)}
          >
            <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} contentFit="cover" cachePolicy="memory-disk" recyclingKey={item.id} />

            <View style={styles.typeBadge}>
              <Ionicons name={item.type === "reel" ? "play-circle" : "image"} size={16} color="#fff" />
            </View>

            <View style={styles.infoOverlay}>
              <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.itemAuthor} numberOfLines={1}>{item.author}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
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
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: "#252525",
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.2)",
  },
  activeTab: {
    backgroundColor: "#EC9A15",
    borderColor: "#EC9A15",
  },
  tabText: {
    color: "#aaa",
    fontSize: 14,
    fontWeight: "600",
  },
  activeTabText: {
    color: "#fff",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  gridRow: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.5,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#252525",
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.15)",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  typeBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 6,
    borderRadius: 12,
  },
  infoOverlay: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: 12,
    paddingTop: 24, 
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  itemTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  itemAuthor: {
    color: "#EC9A15",
    fontSize: 11,
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(236, 154, 21, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.3)",
  },
  emptyStateTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  emptyStateDesc: {
    color: "#aaa",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
});