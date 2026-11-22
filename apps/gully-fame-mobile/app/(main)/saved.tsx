import { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { safeBack } from "@/utils/safeBack";
import { Ionicons } from "@expo/vector-icons";
import { useInteractionReels } from "@/hooks/useInteractionReels";
import { reelsService } from "@/api/services/reelsService";
import { showToast, toastError } from "@/components/ui/Toast";
import { SkeletonGrid, SkeletonList, SkeletonRoot } from "@/components/Skeleton/Skeleton";

// Same brown + orange palette as the rest of the app.
const C = {
  bg: "#3C2610",
  card: "#1A1A1A",
  inner: "#252525",
  border: "#2A2A2A",
  accent: "#EC9A15",
  accentSoft: "rgba(236, 154, 21, 0.15)",
  text: "#FFFFFF",
  muted: "#CAD7D8",
  faint: "#8A8F90",
};

type Filter = "all" | "reel";

export default function SavedScreen() {
  const [filter, setFilter] = useState<Filter>("all");
  // Ids unsaved on this screen. They are hidden at once and come back if the server call fails.
  const [unsavedIds, setUnsavedIds] = useState<Set<string>>(new Set());

  // Saved reels come from the feed's is_saved flag (there is no saved-posts endpoint yet).
  const saved = useInteractionReels("saved", true);

  const savedContent = useMemo(
    () =>
      saved.items
        .map((reel: any) => ({
          id: String(reel._id || reel.id),
          title: reel.caption || "Reel",
          author: reel.author?.username || "",
          thumbnail: reel.thumbnail_url || reel.thumbnail || "",
        }))
        .filter((item) => !unsavedIds.has(item.id)),
    [saved.items, unsavedIds]
  );

  // Posts are not saved yet, so the Reels filter shows the same list as All.
  const visibleContent = filter === "all" || filter === "reel" ? savedContent : [];

  const unsave = async (id: string) => {
    setUnsavedIds((prev) => new Set(prev).add(id));
    const res = await reelsService.toggleSaveReel(id);
    if (!res.success) {
      setUnsavedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toastError(res.message || "Couldn't remove this save. Try again.");
    } else {
      showToast("Removed from saved", "info");
    }
  };

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "reel", label: "Reels" },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => safeBack("/(main)/home")} style={styles.headerSide}>
          <Ionicons name="chevron-back" size={28} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved</Text>
        <View style={styles.headerSide} />
      </View>

      <Text style={styles.subtitle}>Access the reels you've bookmarked in one place.</Text>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {tabs.map((tab) => {
          const active = filter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => setFilter(tab.key)}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              {active && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {saved.loading ? (
        <SkeletonRoot style={{ flex: 1, padding: 20 }}>
          <SkeletonList rows={5} trailing />
        </SkeletonRoot>
      ) : (
        <FlatList
          data={visibleContent}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={saved.loadMore}
          onEndReachedThreshold={0.5}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          ListEmptyComponent={
            saved.error ? (
              <TouchableOpacity onPress={saved.retry} style={styles.emptyState}>
                <Text style={styles.emptyDesc}>{saved.error}</Text>
                <Text style={[styles.emptyDesc, { color: C.accent, marginTop: 8 }]}>Tap to retry</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="bookmark-outline" size={28} color={C.accent} />
                </View>
                <Text style={styles.emptyTitle}>No saved items yet</Text>
                <Text style={styles.emptyDesc}>Tap the bookmark on a reel to save it here.</Text>
              </View>
            )
          }
          ListFooterComponent={
            <View style={styles.footer}>
              {saved.loadingMore && <SkeletonGrid count={2} columns={2} style={{ paddingVertical: 12 }} />}
              <Text style={styles.footerNote}>Only you can see what you've saved.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: "/(main)/reel", params: { startReelId: item.id } } as any)}
            >
              <Image
                source={{ uri: item.thumbnail }}
                style={styles.thumbnail}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={item.id}
              />

              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {item.author ? `@${item.author} • ` : ""}Reel
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => unsave(item.id)}
                hitSlop={10}
                style={styles.bookmarkButton}
                accessibilityRole="button"
                accessibilityLabel="Remove from saved"
              >
                <Ionicons name="bookmark" size={22} color={C.accent} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
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
    fontFamily: "Inter_400Regular",
    marginBottom: 18,
    paddingHorizontal: 24,
  },

  // Tabs
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    marginBottom: 8,
  },
  tab: {
    paddingVertical: 12,
    alignItems: "center",
  },
  tabText: {
    color: C.faint,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  tabTextActive: {
    color: C.accent,
    fontFamily: "Inter_600SemiBold",
  },
  tabUnderline: {
    position: "absolute",
    bottom: -1,
    height: 2,
    width: "100%",
    backgroundColor: C.accent,
    borderRadius: 1,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
  thumbnail: {
    width: 84,
    height: 84,
    borderRadius: 12,
    backgroundColor: C.inner,
  },
  rowInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  rowTitle: {
    color: C.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "Inter_600SemiBold",
  },
  rowMeta: {
    color: C.faint,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 6,
  },
  bookmarkButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.accentSoft,
    justifyContent: "center",
    alignItems: "center",
  },

  // Empty + footer
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
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
  emptyDesc: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
  footer: {
    alignItems: "center",
    paddingTop: 14,
  },
  footerNote: {
    color: C.faint,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
