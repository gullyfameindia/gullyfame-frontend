import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Directions, Gesture, GestureDetector } from "react-native-gesture-handler";
import { ProfileMediaItem, ProfileMediaTile } from "./ProfileMediaTile";
import { CAN_DELETE_POSTS, deletePost } from "@/api/services/profileExtrasService";
import { resolveMediaUrl } from "@/utils/mediaUrl";

const BG = "#3C2610";
const ACCENT = "#EC9A15";
const TEXT_MUTED = "rgba(255,255,255,0.7)";
const GAP = 2;
const BOTTOM_NAV_SPACE = 96;

export interface TabSource {
  items: ProfileMediaItem[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  isOffline: boolean;
  error: string | null;
  refresh: () => void;
  retry: () => void;
  loadMore: () => void;
}

export interface ProfileTab {
  key: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  source: TabSource;
  /** Text for the empty state, e.g. "No reels yet". */
  emptyTitle: string;
  emptyText?: string;
  /** Own posts only: long press quick actions and the "Create your first post" button. */
  ownContent?: boolean;
  /** Shows a lock next to the label (private tabs). Only used with textTabs. */
  locked?: boolean;
}

interface Props {
  /** Everything above the tabs, unchanged from the original profile. */
  top: React.ReactNode;
  tabs: ProfileTab[];
  /** Whether "Create your first post" is offered (fans cannot upload). */
  canCreatePost: boolean;
  /** Other user's account that could not be loaded (deleted, private or missing). */
  unavailable?: boolean;
  /** Owner id passed to the reel viewer so it opens this profile's reels. */
  ownerId: string;
  /** Tabs show their text label (with a lock where set) instead of the icon. */
  textTabs?: boolean;
}

type Row = { type: "top" } | { type: "tabs" } | { type: "row"; key: string; items: ProfileMediaItem[] } | { type: "state" };

const Skeleton = ({ style }: { style: any }) => <View style={[styles.skeleton, style]} />;

export default function ProfileView({
  top,
  tabs,
  canCreatePost,
  unavailable,
  ownerId,
  textTabs = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width, height: windowHeight } = useWindowDimensions();
  const tileSize = Math.floor((width - GAP * 2) / 3);
  // Tall 9:16 tiles, the same shape as the reels themselves.
  const tileHeight = Math.round((tileSize * 16) / 9);

  const [tabKey, setTabKey] = useState(tabs[0]?.key ?? "");
  const tab = tabs.find((t) => t.key === tabKey) ?? tabs[0];
  const source = tab?.source;

  const listRef = useRef<FlatList<Row>>(null);
  const offsets = useRef<Record<string, number>>({});
  const currentOffset = useRef(0);
  const tabsTop = useRef(0);
  // The tab bar only needs the status-bar inset once it is pinned to the top of the screen.
  const [tabsStuck, setTabsStuck] = useState(false);

  const rows: Row[] = useMemo(() => {
    const base: Row[] = [{ type: "top" }];
    if (unavailable || !tab) return base.concat({ type: "state" });
    base.push({ type: "tabs" });
    const items = source?.items ?? [];
    if (items.length === 0) return base.concat({ type: "state" });
    for (let i = 0; i < items.length; i += 3) {
      const slice = items.slice(i, i + 3);
      base.push({ type: "row", key: `${tab.key}:${slice.map((s) => s.id).join("|")}`, items: slice });
    }
    return base;
  }, [source?.items, tab, unavailable]);

  // Each tab keeps its own scroll position once the tab bar is pinned.
  const switchTab = useCallback(
    (next: string) => {
      if (next === tabKey) return;
      offsets.current[tabKey] = currentOffset.current;
      setTabKey(next);
      const pinned = Math.max(tabsTop.current, 0);
      const saved = offsets.current[next] ?? pinned;
      const target = currentOffset.current >= pinned ? Math.max(saved, pinned) : currentOffset.current;
      requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: target, animated: false }));
    },
    [tabKey]
  );

  const tabIndex = Math.max(0, tabs.findIndex((t) => t.key === tabKey));
  const swipe = useMemo(
    () =>
      Gesture.Race(
        Gesture.Fling()
          .direction(Directions.LEFT)
          .runOnJS(true)
          .onEnd(() => {
            const next = tabs[Math.min(tabs.length - 1, tabIndex + 1)];
            if (next) switchTab(next.key);
          }),
        Gesture.Fling()
          .direction(Directions.RIGHT)
          .runOnJS(true)
          .onEnd(() => {
            const prev = tabs[Math.max(0, tabIndex - 1)];
            if (prev) switchTab(prev.key);
          })
      ),
    [tabs, tabIndex, switchTab]
  );

  const openItem = useCallback(
    (item: ProfileMediaItem) => {
      router.push({ pathname: "/(main)/reel", params: { reelId: item.id, userId: ownerId } } as any);
    },
    [ownerId]
  );

  const refreshCurrent = source?.refresh;
  const ownActions = useCallback(
    (item: ProfileMediaItem) => {
      const shareItem = () => {
        const link = resolveMediaUrl(item.uri) || `gullyfamemobile://reel?reelId=${item.id}`;
        Share.share({ message: `Watch this on Gully Fame: ${link}` }).catch(() => {});
      };
      const buttons: any[] = [{ text: "Share", onPress: shareItem }];
      if (CAN_DELETE_POSTS) {
        buttons.push({
          text: "Delete",
          style: "destructive",
          onPress: () =>
            Alert.alert("Delete this post?", "This can't be undone.", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                  const result = await deletePost(item.id);
                  if (result.success) refreshCurrent?.();
                  else Alert.alert("Couldn't delete", result.message);
                },
              },
            ]),
        });
      }
      buttons.push({ text: "Cancel", style: "cancel" });
      Alert.alert("Post options", undefined, buttons);
    },
    [refreshCurrent]
  );

  const renderTabs = () => (
    <View
      // Top padding keeps the icons below the status bar once the tab bar is pinned.
      style={[styles.tabs, { paddingTop: tabsStuck ? insets.top : 0 }]}
    >
      {tabs.map(({ key, label, Icon, locked }) => {
        const active = key === tabKey;
        const color = active ? "#fff" : "rgba(255,255,255,0.45)";
        return (
          <TouchableOpacity
            key={key}
            style={[styles.tab, textTabs && styles.tabTextLayout]}
            onPress={() => switchTab(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
          >
            {textTabs ? (
              <View style={styles.textTabRow}>
                <Text style={[styles.textTab, active && styles.textTabActive, { color }]}>{label}</Text>
                {locked ? <Ionicons name="lock-closed" size={13} color={color} /> : null}
              </View>
            ) : (
              <Icon size={23} color={color} />
            )}
            <View
              style={[
                styles.indicator,
                textTabs && styles.indicatorTextLayout,
                active && styles.indicatorActive,
              ]}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderState = () => {
    if (unavailable) {
      return (
        <View style={styles.state}>
          <Text style={styles.stateTitle}>This account isn't available</Text>
          <Text style={styles.stateText}>It may have been removed or made private.</Text>
        </View>
      );
    }
    if (!source) return null;
    if (source.loading) {
      return (
        <View style={styles.skeletonGrid}>
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} style={{ width: tileSize, height: tileHeight }} />
          ))}
        </View>
      );
    }
    if (source.error && source.items.length === 0) {
      return (
        <View style={styles.state}>
          <Text style={styles.stateTitle}>Couldn't load this tab</Text>
          <Text style={styles.stateText}>
            {source.isOffline ? "You're offline. Connect and try again." : "Something went wrong. Please try again."}
          </Text>
          <TouchableOpacity style={styles.stateButton} onPress={source.retry} accessibilityRole="button">
            <Text style={styles.stateButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.state}>
        <Text style={styles.stateTitle}>{tab.emptyTitle}</Text>
        {tab.emptyText ? <Text style={styles.stateText}>{tab.emptyText}</Text> : null}
        {tab.ownContent && canCreatePost ? (
          <TouchableOpacity
            style={styles.stateButton}
            onPress={() => router.push("/(main)/camera" as any)}
            accessibilityRole="button"
          >
            <Text style={styles.stateButtonText}>Create your first post</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const renderRow = ({ item }: { item: Row }) => {
    if (item.type === "top") {
      return (
        // The tab bar's scroll offset equals the height of everything above it.
        <View onLayout={(e) => (tabsTop.current = e.nativeEvent.layout.height)}>
          {top}
          {source?.isOffline && source.items.length > 0 ? (
            <View style={styles.offline}>
              <Text style={styles.offlineText}>You're offline. Showing saved posts.</Text>
            </View>
          ) : null}
        </View>
      );
    }
    if (item.type === "tabs") return renderTabs();
    // A tall state area keeps the pinned tab bar in place when a tab has little or no content.
    if (item.type === "state") return <View style={{ minHeight: windowHeight * 0.75 }}>{renderState()}</View>;
    return (
      <View style={styles.gridRow}>
        {item.items.map((media) => (
          <ProfileMediaTile
            key={media.id}
            item={media}
            size={tileSize}
            height={tileHeight}
            onPress={openItem}
            onLongPress={tab?.ownContent ? ownActions : undefined}
            reference={textTabs}
          />
        ))}
      </View>
    );
  };

  const keyExtractor = useCallback((item: Row) => (item.type === "row" ? item.key : item.type), []);

  return (
    <GestureDetector gesture={swipe}>
      <FlatList
        ref={listRef}
        style={styles.list}
        data={rows}
        renderItem={renderRow}
        keyExtractor={keyExtractor}
        extraData={`${tabKey}-${tabsStuck}`}
        stickyHeaderIndices={unavailable ? undefined : [1]}
        onScroll={(e) => {
          currentOffset.current = e.nativeEvent.contentOffset.y;
          const stuck = tabsTop.current > 0 && currentOffset.current >= tabsTop.current;
          if (stuck !== tabsStuck) setTabsStuck(stuck);
        }}
        scrollEventThrottle={32}
        onEndReached={source?.hasMore ? source.loadMore : undefined}
        onEndReachedThreshold={0.6}
        removeClippedSubviews
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        refreshControl={
          <RefreshControl
            refreshing={!!source?.refreshing}
            onRefresh={source?.refresh}
            tintColor={ACCENT}
            colors={[ACCENT]}
          />
        }
        ListFooterComponent={
          <View style={{ paddingBottom: BOTTOM_NAV_SPACE + insets.bottom }}>
            {source?.loadingMore ? <ActivityIndicator color={ACCENT} style={{ marginTop: 12 }} /> : null}
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: BG },
  tabs: {
    flexDirection: "row",
    backgroundColor: BG,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.15)",
  },
  tab: { flex: 1, alignItems: "center", paddingTop: 12 },
  textTabRow: { flexDirection: "row", alignItems: "center", gap: 5, paddingBottom: 2 },
  textTab: { fontSize: 17, fontWeight: "600" },
  textTabActive: { fontWeight: "700" },
  tabTextLayout: { paddingTop: 14 },
  indicatorTextLayout: { width: "100%", height: 3, marginTop: 12 },
  indicator: { marginTop: 10, height: 2.5, width: "60%", borderRadius: 2, backgroundColor: "transparent" },
  indicatorActive: { backgroundColor: ACCENT },
  gridRow: { flexDirection: "row", gap: GAP, marginTop: GAP },
  skeletonGrid: { flexDirection: "row", flexWrap: "wrap", gap: GAP, marginTop: GAP },
  skeleton: { backgroundColor: "rgba(255,255,255,0.08)" },
  offline: {
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(236,154,21,0.18)",
  },
  offlineText: { color: "#FFD9A0", fontSize: 13 },
  state: { alignItems: "center", paddingHorizontal: 32, paddingVertical: 48 },
  stateTitle: { alignSelf: "stretch", color: "#fff", fontSize: 17, fontWeight: "700", textAlign: "center" },
  stateText: { alignSelf: "stretch", color: TEXT_MUTED, fontSize: 14, textAlign: "center", marginTop: 6, lineHeight: 20 },
  stateButton: { marginTop: 16, backgroundColor: ACCENT, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  stateButtonText: { color: "#1A1208", fontWeight: "700", fontSize: 14 },
});
