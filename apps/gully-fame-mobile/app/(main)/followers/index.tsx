import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { TALENT_CATEGORIES } from "@/constants/talentCategories";
import { getFollowedCategories } from "@/utils/followedCategories";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getFollowList, type FollowListKind, type FollowUser } from "@/api/services/followService";
import { getErrorMessage } from "@/api/client";
import { openUserProfile } from "@/utils/openProfile";
import { safeIdParam } from "@/utils/routeParams";

type TabKey = FollowListKind;
const TABS: TabKey[] = ["followers", "following"];
const PAGE_SIZE = 20;

/** One tab: paginated list from GET user/:id/{followers|following} with loading, empty and error states. */
function FollowList({
  kind,
  userId,
  active,
  header,
}: {
  kind: FollowListKind;
  userId: string;
  active: boolean;
  header?: React.ReactElement | null;
}) {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const requestRef = useRef(0);
  const loadingMoreRef = useRef(false);

  // State is only updated in the promise callbacks (after the request), never synchronously:
  // the first load starts from loading=true / error="" already.
  const fetchFirstPage = useCallback(() => {
    const requestId = ++requestRef.current;
    return getFollowList(kind, { userId: userId || undefined, page: 1, limit: PAGE_SIZE })
      .then((result) => {
        if (requestId !== requestRef.current) return;
        setUsers(result.users);
        setTotal(result.total);
        setPage(1);
        setHasMore(result.hasMore);
        setLoaded(true);
      })
      .catch((e) => {
        if (requestId === requestRef.current) setError(getErrorMessage(e));
      })
      .finally(() => {
        if (requestId === requestRef.current) setLoading(false);
      });
  }, [kind, userId]);

  /** Retry / pull-to-refresh: show the spinner again, then reload page 1. */
  const loadFirstPage = useCallback(() => {
    setLoading(true);
    setError("");
    fetchFirstPage();
  }, [fetchFirstPage]);

  // Load a tab the first time it is shown.
  useEffect(() => {
    if (active && !loaded) fetchFirstPage();
  }, [active, loaded, fetchFirstPage]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore || loading) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const requestId = requestRef.current;
    try {
      const next = page + 1;
      const result = await getFollowList(kind, { userId: userId || undefined, page: next, limit: PAGE_SIZE });
      if (requestId !== requestRef.current) return;
      setUsers((prev) => {
        const seen = new Set(prev.map((u) => u.id));
        return [...prev, ...result.users.filter((u) => !seen.has(u.id))];
      });
      setPage(next);
      setHasMore(result.hasMore);
    } catch {
      // Keep what is shown; scrolling again retries.
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, loading, page, kind, userId]);

  if (loading && !loaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#EC9A15" size="large" />
      </View>
    );
  }

  if (error && !loaded) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cloud-offline-outline" size={48} color="#EC9A15" />
        <Text style={styles.emptyTitle}>{error}</Text>
        <TouchableOpacity onPress={loadFirstPage} style={styles.retryButton} testID={`followers-${kind}-retry`}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={users}
      keyExtractor={(u) => u.id}
      testID={`followers-${kind}-list`}
      contentContainerStyle={users.length === 0 ? styles.listEmptyContent : styles.listContent}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      onRefresh={loadFirstPage}
      refreshing={loading && loaded}
      initialNumToRender={12}
      windowSize={7}
      removeClippedSubviews
      ListHeaderComponent={
        <>
          {header}
          {users.length > 0 ? (
            <Text style={styles.countText}>
              {total} {kind === "followers" ? (total === 1 ? "follower" : "followers") : "following"}
            </Text>
          ) : null}
        </>
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={56} color="#EC9A15" />
          <Text style={styles.emptyTitle}>{kind === "followers" ? "No followers yet" : "Not following anyone yet"}</Text>
          <Text style={styles.emptySubtitle}>
            {kind === "followers"
              ? "When people follow this account, they will show up here."
              : "Follow creators from their profile or reels and they will show up here."}
          </Text>
        </View>
      }
      ListFooterComponent={loadingMore ? <ActivityIndicator color="#EC9A15" style={{ padding: 16 }} /> : null}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.userRow}
          onPress={() =>
            openUserProfile({ id: item.id, name: item.name, username: item.username, avatar: item.avatar ?? undefined, role: item.role })
          }
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.name}'s profile`}
        >
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarLetter}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.username ? (
              <Text style={styles.userHandle} numberOfLines={1}>
                @{item.username}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color="#C9B9A6" />
        </TouchableOpacity>
      )}
    />
  );
}

/**
 * Followers / following of a user (the `userId` param), or of the signed-in user when absent.
 * The Following tab also lists the talent categories the user follows on this device.
 */
const FollowersScreen: React.FC = () => {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const userId = safeIdParam(params.userId);
  const initialIndex = params.tab === "following" ? 1 : 0;
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const pagerRef = useRef<ScrollView>(null);
  const [followedKeys, setFollowedKeys] = useState<string[]>([]);
  useFocusEffect(
    useCallback(() => {
      getFollowedCategories().then(setFollowedKeys);
    }, [])
  );
  const followedCategories = TALENT_CATEGORIES.filter((c) => followedKeys.includes(c.key));

  const goToTab = (index: number) => {
    setActiveIndex(index);
    pagerRef.current?.scrollTo({ x: index * width, animated: true });
  };

  const categoriesHeader =
    followedCategories.length > 0 ? (
      <View style={styles.catList}>
        <Text style={styles.catHeading}>Categories</Text>
        {followedCategories.map((c) => (
          <TouchableOpacity
            key={c.key}
            style={styles.catRow}
            onPress={() => router.push(`/(main)/category/${c.key}` as any)}
          >
            <View style={styles.catIcon}>
              <MaterialCommunityIcons name={c.icon} size={24} color="#EC9A15" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.catName}>{c.name}</Text>
              <Text style={styles.catTagline}>{c.tagline}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C9B9A6" />
          </TouchableOpacity>
        ))}
        <Text style={[styles.catHeading, { marginTop: 12 }]}>People</Text>
      </View>
    ) : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Back" testID="followers-back">
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {TABS.map((tab, index) => {
          const active = activeIndex === index;
          return (
            <TouchableOpacity
              key={tab}
              style={styles.tab}
              onPress={() => goToTab(index)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              testID={`followers-tab-${tab}`}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {tab === "followers" ? "Followers" : "Following"}
              </Text>
              <View style={[styles.tabIndicator, active && styles.tabIndicatorActive]} />
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: initialIndex * width, y: 0 }}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setActiveIndex(index);
        }}
      >
        {TABS.map((tab, index) => (
          <View key={tab} style={[styles.page, { width }]}>
            <FollowList
              kind={tab}
              userId={userId}
              active={activeIndex === index}
              header={tab === "following" ? categoriesHeader : null}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3C2610",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(236,154,21,0.2)",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingTop: 12,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#C9B9A6",
    paddingBottom: 12,
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  tabIndicator: {
    height: 3,
    width: "100%",
    backgroundColor: "transparent",
  },
  tabIndicatorActive: {
    backgroundColor: "#EC9A15",
  },
  catList: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  catHeading: { color: "#C9B9A6", fontSize: 13, marginBottom: 4 },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  catIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#55402D",
    alignItems: "center",
    justifyContent: "center",
  },
  catName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  catTagline: { color: "#C9B9A6", fontSize: 12, marginTop: 2 },
  page: {
    flex: 1,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingBottom: 32 },
  listEmptyContent: { flexGrow: 1 },
  countText: { color: "#C9B9A6", fontSize: 13, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#55402D" },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarLetter: { color: "#EC9A15", fontSize: 18, fontWeight: "700" },
  userName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  userHandle: { color: "#C9B9A6", fontSize: 13, marginTop: 2 },
  retryButton: { marginTop: 8, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: "#EC9A15" },
  retryText: { color: "#EC9A15", fontSize: 15, fontWeight: "600" },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#C9B9A6",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default FollowersScreen;
