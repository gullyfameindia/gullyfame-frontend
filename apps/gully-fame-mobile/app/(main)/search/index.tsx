import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { TALENT_CATEGORIES } from "@/constants/talentCategories";
import { getHomeScreen, getCachedHomeScreen, type HomeScreenData } from "@/api/services/homeService";
import KeyboardAvoidingScreen from "@/components/KeyboardAvoidingScreen";
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
  Text,
  ScrollView,
  } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import BottomNav from "@components/layout/BottomNav";
import DrawerMenu from "@components/layout/DrawerMenu";
import { HomeIconSVG, ReelIconSVG, SearchIconSVG, UserIconSVG, BackIcon, FilterIcon, MicIcon, PlayIcon } from "@/icons";
import { formatCount } from "@/utils/mediaUrl";
import {
  scale,
  getFontSize,
  spacing,
  scaleVertical,
} from "@utils/responsive";

import { useRouter } from "expo-router";
import { safeBack } from "@/utils/safeBack";
import {
  searchAll,
  searchUsersPage,
  searchCompetitionsPage,
  searchReelsPage,
  SearchPage,
} from "@/api/services/searchService";
import { getErrorMessage } from "@/api/client";
import { openUserProfile } from "@/utils/openProfile";
import { openCompetition } from "@/utils/openCompetition";
import { toastError } from "@/components/ui/Toast";
import { Skeleton, SkeletonGrid, SkeletonList, SkeletonRoot } from "@/components/Skeleton/Skeleton";


const getScreenDimensions = () => {
  const dims = Dimensions.get("window");
  return {
    width: dims.width,
    height: dims.height,
  };
};


const initialDims = getScreenDimensions();
const SCREEN_WIDTH = initialDims.width;
const SCREEN_HEIGHT = initialDims.height;


const COLORS = {
  background: "#1E1005", 
  surface: "#361D0A", 
  border: "#4A2A0D", 
  text: "#FFFFFF",
  textMuted: "#A38F7E", 
  accent: "#EC9A15", 
};
const THEME_COLOR = COLORS.accent;

const EMPTY_RESULTS = {
  top_users: [],
  top_competitions: [],
  top_reels: [],
  results: [],
  hasMore: false,
  page: 1,
};

const fetchTypedPage = (type: string, q: string, page: number): Promise<SearchPage<any>> =>
  type === "users"
    ? searchUsersPage(q, page)
    : type === "competitions"
      ? searchCompetitionsPage(q, page)
      : searchReelsPage(q, page);

const safeImageSource = (uri: any) => {
  if (!uri || uri.endsWith(".mp4")) {
    return require("@assets/images/trending1.png");
  }
  return { uri };
};



export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Search");
  // The type pills (All / Stars / Competitions / Reels) sit behind the filter icon.
  const [showFilters, setShowFilters] = useState(false);
  // Home data (categories and trending reels) shown on the empty search screen.
  const [home, setHome] = useState<HomeScreenData | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeSearchType, setActiveSearchType] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Only the newest search may write results; an older slow response is dropped.
  const searchRequestRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<any>(EMPTY_RESULTS);
  const [searchError, setSearchError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);

  const loadMoreResults = useCallback(async () => {
    // The ref is a synchronous lock: state would not update before a second
    // onEndReached event fired in the same frame.
    if (loadingMoreRef.current || loadingMore || !searchResults.hasMore || activeSearchType === "all") return;
    loadingMoreRef.current = true;
    const requestId = searchRequestRef.current;
    setLoadingMore(true);
    try {
      const next = (searchResults.page || 1) + 1;
      const page = await fetchTypedPage(activeSearchType, searchQuery.trim(), next);
      // The query or tab changed while this page was loading: drop it.
      if (requestId !== searchRequestRef.current) return;
      setSearchResults((prev: any) => ({
        ...prev,
        results: [...prev.results, ...page.results],
        hasMore: page.hasMore,
        page: next,
      }));
    } catch (error) {
      if (requestId === searchRequestRef.current) toastError(getErrorMessage(error));
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [loadingMore, searchResults.hasMore, searchResults.page, activeSearchType, searchQuery]);

  const searchTabs = [
    { id: "all", label: "All" },
    { id: "users", label: "Stars" },
    { id: "competitions", label: "Competitions" },
    { id: "reels", label: "Reels" },
  ];

  // Load search history on mount
  useEffect(() => {
    const loadSearchHistory = async () => {
      try {
        const history = await AsyncStorage.getItem("searchHistory");
        if (history) {
          setSearchHistory(JSON.parse(history));
        }
      } catch { /* intentionally ignored */
      }
    };
    loadSearchHistory();
  }, []);

  // Show the cached home data at once, then refresh it.
  useEffect(() => {
    let active = true;
    // TEMP (testing skeletons): skip the saved copy in dev so the loading state is visible.
    if (!__DEV__) {
      getCachedHomeScreen().then((cached) => {
        if (active && cached) setHome(cached);
      });
    }
    getHomeScreen()
      .then((data) => {
        if (active) setHome(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Save search query to history when user performs a search
  const addToSearchHistory = useCallback(async (query: string) => {
    if (!query.trim()) return;
    
    try {
      setSearchHistory((prev) => {
        // Remove if already exists, then add to front
        const filtered = prev.filter((item) => item !== query);
        const updated = [query, ...filtered].slice(0, 10); // Keep last 10
        AsyncStorage.setItem("searchHistory", JSON.stringify(updated)).catch(() => undefined);
        return updated;
      });
    } catch { /* intentionally ignored */
    }
  }, []);

  const [, setScreenDimensions] = useState(
    getScreenDimensions(),
  );

  const bottomNavBaseHeight = 80;
  const bottomNavPadding =
    Platform.OS === "ios"
      ? Math.max(insets.bottom, SCREEN_HEIGHT * 0.025)
      : SCREEN_HEIGHT * 0.025;
  const bottomNavVerticalPadding = SCREEN_HEIGHT * 0.006 * 2;
  const bottomNavHeight =
    bottomNavBaseHeight + bottomNavPadding + bottomNavVerticalPadding;

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      const newDims = { width: window.width, height: window.height };
      setScreenDimensions(newDims);
    });
    return () => subscription?.remove();
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Debounced search handler
  useEffect(() => {
    // Clear previous timeout
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If query is empty, clear results immediately
    if (!searchQuery.trim()) {
      searchRequestRef.current++;
      setSearchResults(EMPTY_RESULTS);
      setSearchError("");
      setIsLoading(false);
      return;
    }

    // Add to search history when search starts
    addToSearchHistory(searchQuery);

    // Set loading state immediately
    setIsLoading(true);

    // Debounce API call by 400ms. GET /search?q&type (typed searches are paginated).
    const requestId = ++searchRequestRef.current;
    debounceTimerRef.current = setTimeout(async () => {
      const q = searchQuery.trim();
      setSearchError("");
      try {
        if (activeSearchType === "all") {
          const data = await searchAll(q);
          if (requestId !== searchRequestRef.current) return;
          setSearchResults({ ...EMPTY_RESULTS, ...data });
        } else {
          const page = await fetchTypedPage(activeSearchType, q, 1);
          if (requestId !== searchRequestRef.current) return;
          setSearchResults({ ...EMPTY_RESULTS, results: page.results, hasMore: page.hasMore, page: 1 });
        }
      } catch (error) {
        if (requestId !== searchRequestRef.current) return;
        setSearchResults(EMPTY_RESULTS);
        setSearchError(getErrorMessage(error));
      } finally {
        if (requestId === searchRequestRef.current) setIsLoading(false);
      }
    }, 400);
  }, [searchQuery, activeSearchType, addToSearchHistory]);

  // The 12 talent categories, linked to the backend id when a name matches (same rule as the home carousel).
  const suggestedCategories = useMemo(
    () =>
      TALENT_CATEGORIES.map((c) => {
        const match = (home?.categories || []).find((b) => {
          const n = String(b.name || "").trim().toLowerCase();
          return n === c.name.toLowerCase() || n === c.key;
        });
        return { key: c.key, id: match?.id ?? c.key, name: c.name, tagline: c.tagline, icon: c.icon };
      }),
    [home]
  );

  const tabs = [
    { name: "Home", icon: HomeIconSVG, label: "" },
    { name: "Reel", icon: ReelIconSVG, label: "GullyReel" },
    { name: "Upload", icon: null, label: "UPLOAD" },
    { name: "Search", icon: SearchIconSVG, label: "" },
    { name: "MyFame", icon: UserIconSVG, label: "" },
  ];

  return (
    <KeyboardAvoidingScreen>
    <SafeAreaView style={styles.container} edges={[]}>
      {}
      <View
        style={[
          styles.headerContainer,
          {
            paddingTop:
              Platform.OS === "ios" ? insets.top + 10 : insets.top + 10,
          },
        ]}
      >
        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? safeBack("/(main)/home") : router.replace("/(main)" as any))}
            style={styles.backButton}
            accessibilityLabel="Back"
          >
            <BackIcon color="#fff" size={22} />
          </TouchableOpacity>
          <View style={[styles.searchBar, styles.searchBarInRow]}>
            <View style={styles.searchIconContainer}>
              <SearchIconSVG color="#999" />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search creators, videos, sounds..."
              testID="search-input"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={() => {
              }}
            />
            <View style={styles.micWrap}>
              <MicIcon />
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setShowFilters((v) => !v)}
            style={styles.backButton}
            accessibilityLabel="Filters"
            accessibilityState={{ expanded: showFilters }}
          >
            <FilterIcon size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {showFilters ? (
        <View style={styles.pillsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsContainer}
          >
            {searchTabs.map((tab) => {
              const isActive = activeSearchType === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.pillButton,
                    isActive && styles.pillButtonActive,
                  ]}
                  onPress={() => setActiveSearchType(tab.id)}
                  testID={`search-type-${tab.id}`}
                >
                  <Text
                    style={[styles.pillText, isActive && styles.pillTextActive]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        ) : null}
      </View>

      {}
      {isLoading ? (
        <SkeletonList rows={8} style={{ flex: 1, padding: 16, backgroundColor: COLORS.background }} />
      ) : searchQuery.trim() === "" ? (
        // No query: recent searches (if any), then suggested categories and trending reels
        <ScrollView
          style={styles.mainContent}
          contentContainerStyle={{ paddingBottom: bottomNavHeight }}
          showsVerticalScrollIndicator={false}
        >
          {searchHistory.length > 0 ? (
          <View style={{ paddingHorizontal: scale(12) }}>
          <Text style={[styles.sectionTitle, { marginTop: scale(16) }]}>
            Recent Searches
          </Text>
          <View style={{ gap: scaleVertical(8) }}>
            {searchHistory.map((query, index) => (
              <TouchableOpacity
                key={`${query}-${index}`}
                onPress={() => setSearchQuery(query)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: scaleVertical(12),
                  paddingHorizontal: scale(12),
                  backgroundColor: COLORS.surface,
                  borderRadius: scale(8),
                }}
              >
                <Text style={{ color: COLORS.text, flex: 1, fontSize: getFontSize(14) }}>
                  {query}
                </Text>
                <TouchableOpacity
                  onPress={async () => {
                    const updated = searchHistory.filter((_, i) => i !== index);
                    setSearchHistory(updated);
                    await AsyncStorage.setItem("searchHistory", JSON.stringify(updated)).catch(
                      (err) => undefined
                    );
                  }}
                  style={{ padding: scale(8) }}
                >
                  <Text style={{ color: COLORS.textMuted, fontSize: getFontSize(12) }}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
          </View>
          ) : null}

          {home === null ? (
            <SkeletonRoot style={{ paddingHorizontal: scale(12), gap: scale(16), marginTop: scale(16) }}>
              <Skeleton width="45%" height={20} radius={6} />
              <View style={{ flexDirection: "row", gap: scale(12) }}>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} width={scale(140)} height={scale(64)} radius={12} />
                ))}
              </View>
              <Skeleton width="45%" height={20} radius={6} />
              <SkeletonGrid count={4} columns={2} />
            </SkeletonRoot>
          ) : (
          <>
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeading}>Explore Categories</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestRow}
            >
              {suggestedCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  activeOpacity={0.9}
                  accessibilityRole="button"
                  accessibilityLabel={cat.name}
                  style={styles.categoryCard}
                  onPress={() => router.push(`/(main)/category/${cat.id}` as any)}
                >
                  <MaterialCommunityIcons name={cat.icon} size={scale(34)} color={COLORS.accent} />
                  <View>
                    <Text style={styles.categoryName} numberOfLines={1}>
                      {cat.name}
                    </Text>
                    <Text style={styles.categoryTagline} numberOfLines={1}>
                      {cat.tagline}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {(home?.trending?.length ?? 0) > 0 && (
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>Explore Trending</Text>
                <TouchableOpacity
                  onPress={() => setActiveSearchType("reels")}
                  accessibilityRole="button"
                  accessibilityLabel="See all reels"
                >
                  <Text style={styles.seeAll}>See all ›</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.trendGrid}>
                {home!.trending.map((reel) => (
                  <TouchableOpacity
                    key={reel.id}
                    activeOpacity={0.9}
                    accessibilityRole="button"
                    accessibilityLabel="Open reel"
                    style={styles.trendCard}
                    onPress={() => {
                      router.push({ pathname: "/(main)/reel", params: { startReelId: reel.id } } as any);
                    }}
                  >
                    <Image source={safeImageSource(reel.image)} style={styles.trendImage} />
                    <View style={styles.trendMeta}>
                      <PlayIcon size={12} color="#fff" />
                      <Text style={styles.trendCount}>{formatCount(reel.views)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          </>
          )}
        </ScrollView>
      ) : (
        <View style={styles.mainContent}>
          {activeSearchType === "all" &&
            searchResults.top_users.length === 0 &&
            searchResults.top_competitions.length === 0 &&
            searchResults.top_reels.length === 0 && (
              <Text
                style={{
                  color: COLORS.textMuted,
                  textAlign: "center",
                  marginTop: scale(40),
                  fontSize: getFontSize(14),
                  alignSelf: "stretch",
                }}
              >
                {searchError || (searchQuery.trim() ? "No results found" : "Search for stars, competitions or reels")}
              </Text>
            )}

          {}
          {activeSearchType === "all" && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: bottomNavHeight }}
            >
              {searchResults.top_competitions.length > 0 && (
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionHeading}>Competitions</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.suggestRow}
                  >
                    {searchResults.top_competitions.map((comp: any) => (
                      <TouchableOpacity
                        key={comp._id}
                        activeOpacity={0.9}
                        onPress={() => openCompetition(comp._id, comp.status)}
                        style={styles.suggestCard}
                      >
                        <Image
                          source={safeImageSource(comp.image_url || comp.image)}
                          style={styles.suggestImage}
                        />
                        <View style={styles.suggestScrim} />
                        <Text style={styles.suggestTitle} numberOfLines={2}>
                          {comp.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {searchResults.top_users.length > 0 && (
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionHeading}>Meet your Stars</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.suggestRow}
                  >
                    {searchResults.top_users.map((user: any) => (
                      <TouchableOpacity
                        key={user._id}
                        style={styles.topUserCard}
                        onPress={() => {
                          openUserProfile({
                            id: user._id,
                            firstName: user.first_name,
                            lastName: user.last_name,
                            username: user.username,
                            avatar: user.profile_picture_url,
                          });
                        }}
                      >
                        <Image
                          source={safeImageSource(user.profile_picture_url)}
                          style={styles.topUserAvatar}
                        />
                        <Text style={styles.topUserName} numberOfLines={1}>
                          {user.username}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {searchResults.top_reels.length > 0 && (
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeading}>Reels</Text>
                    <TouchableOpacity
                      onPress={() => setActiveSearchType("reels")}
                      accessibilityRole="button"
                      accessibilityLabel="See all reels"
                    >
                      <Text style={styles.seeAll}>See all ›</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.trendGrid}>
                    {searchResults.top_reels.map((item: any) => {
                      const views = typeof item.views === "number" ? formatCount(item.views) : null;
                      return (
                        <TouchableOpacity
                          key={item._id}
                          activeOpacity={0.9}
                          accessibilityRole="button"
                          accessibilityLabel="Open reel"
                          style={styles.trendCard}
                          onPress={() => {
                            router.push({ pathname: "/(main)/reel", params: { startReelId: item._id } } as any);
                          }}
                        >
                          <Image
                            source={safeImageSource(item.thumbnail_url)}
                            style={styles.trendImage}
                          />
                          {views !== null ? (
                            <View style={styles.trendMeta}>
                              <PlayIcon size={12} color="#fff" />
                              <Text style={styles.trendCount}>{views}</Text>
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>
          )}

          {}
          {activeSearchType === "users" && (
            <FlatList
              data={searchResults.results}
              onEndReached={loadMoreResults}
              onEndReachedThreshold={0.5}
              ListFooterComponent={loadingMore ? <SkeletonList rows={2} style={{ paddingHorizontal: 16 }} /> : null}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ paddingBottom: bottomNavHeight }}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.userListItem}
                  onPress={() => {
                    openUserProfile({
                      id: item._id,
                      firstName: item.first_name,
                      lastName: item.last_name,
                      username: item.username,
                      avatar: item.profile_picture_url,
                    });
                  }}
                >
                  <Image
                    source={safeImageSource(item.profile_picture_url)}
                    style={styles.userListAvatar}
                  />
                  <View style={styles.userListInfo}>
                    <Text style={styles.userListName}>{item.username}</Text>
                    <Text style={styles.userListSub}>
                      {item.first_name} {item.last_name} •{" "}
                      {item.followers_count} followers
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.followButtonBox}
                    onPress={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <Text style={styles.followButtonBoxText}>
                      {item.is_followed_by_me ? "Following" : "Follow"}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
            />
          )}

          {}
          {activeSearchType === "competitions" && (
            <FlatList
              data={searchResults.results}
              onEndReached={loadMoreResults}
              onEndReachedThreshold={0.5}
              ListFooterComponent={loadingMore ? <SkeletonList rows={2} style={{ paddingHorizontal: 16 }} /> : null}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{
                paddingBottom: bottomNavHeight,
                paddingHorizontal: spacing.sm,
                paddingTop: spacing.sm,
              }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.compCard} activeOpacity={0.9} onPress={() => openCompetition(item._id, item.status)}>
                  <Image
                    source={safeImageSource(item.image)}
                    style={styles.compImage}
                  />
                  <View style={styles.compOverlay}>
                    <View style={styles.compBadge}>
                      <Text style={styles.compBadgeText}>{item.status}</Text>
                    </View>
                    <Text style={styles.compTitle}>{item.title}</Text>
                    <Text style={styles.compSub}>
                      Prize: ₹{item.prize} | {item.participants} Joined
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}

          {}
          {activeSearchType === "reels" && (
            <FlatList
              data={searchResults.results}
              onEndReached={loadMoreResults}
              onEndReachedThreshold={0.5}
              ListFooterComponent={loadingMore ? <SkeletonList rows={2} style={{ paddingHorizontal: 16 }} /> : null}
              numColumns={3}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ paddingBottom: bottomNavHeight }}
              renderItem={({ item }) => (
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open reel" 
                  style={styles.topReelCard}
                  onPress={() => {
                    router.push({ pathname: "/(main)/reel", params: { startReelId: item._id } } as any);
                  }}
                >
                  <Image
                    source={safeImageSource(item.thumbnail_url)}
                    style={styles.gridMedia}
                  />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}

      {}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tabs={tabs}
        onOpenDrawer={() => setDrawerVisible(true)}
      />

      {}
      <DrawerMenu
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      />
    </SafeAreaView>
    </KeyboardAvoidingScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerContainer: {
    backgroundColor: COLORS.background,
    paddingHorizontal: scale(12),
    borderBottomWidth: scale(0.5),
    borderBottomColor: COLORS.border,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: scale(10),
    height: scale(40),
    paddingHorizontal: scale(12),
    marginBottom: scale(8),
  },
  searchIconContainer: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: getFontSize(14),
    color: COLORS.text,
    padding: 0,
  },
  pillsWrapper: {
    marginTop: scale(4),
    marginBottom: scale(12),
  },
  pillsContainer: {
    paddingRight: scale(12),
    gap: scale(10),
  },
  pillButton: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  pillText: {
    color: COLORS.textMuted,
    fontSize: getFontSize(13),
    fontWeight: "600",
  },
  pillTextActive: {
    color: "#000",
    fontWeight: "700",
  },
  mainContent: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    marginBottom: scale(10),
  },
  backButton: {
    width: scale(36),
    height: scale(40),
    alignItems: "center",
    justifyContent: "center",
  },
  searchBarInRow: {
    flex: 1,
    marginBottom: 0,
  },
  micWrap: {
    marginLeft: scale(8),
  },
  sectionBlock: {
    marginTop: scale(18),
  },
  sectionHeading: {
    color: COLORS.text,
    fontSize: getFontSize(18),
    fontWeight: "700",
    marginHorizontal: scale(14),
    marginBottom: scale(12),
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: scale(14),
  },
  seeAll: {
    color: COLORS.accent,
    fontSize: getFontSize(14),
    fontWeight: "600",
  },
  suggestRow: {
    paddingHorizontal: scale(14),
    gap: scale(10),
  },
  suggestCard: {
    width: scale(110),
    height: scale(140),
    borderRadius: scale(12),
    overflow: "hidden",
    backgroundColor: COLORS.surface,
  },
  suggestImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  suggestScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  suggestTitle: {
    position: "absolute",
    left: scale(8),
    right: scale(8),
    bottom: scale(8),
    color: COLORS.text,
    fontSize: getFontSize(13),
    fontWeight: "700",
  },
  trendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: scale(14),
    gap: scale(10),
  },
  trendCard: {
    width: (SCREEN_WIDTH - scale(28) - scale(10)) / 2,
    aspectRatio: 0.78,
    borderRadius: scale(14),
    overflow: "hidden",
    backgroundColor: COLORS.surface,
  },
  trendImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  trendMeta: {
    position: "absolute",
    left: scale(10),
    bottom: scale(10),
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
  },
  categoryCard: {
    width: scale(96),
    height: scale(96),
    borderRadius: scale(12),
    padding: scale(10),
    justifyContent: "flex-start",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryName: {
    color: COLORS.text,
    fontSize: getFontSize(13),
    fontWeight: "700",
    marginTop: scale(8),
  },
  categoryTagline: {
    color: COLORS.textMuted,
    fontSize: getFontSize(11),
    marginTop: 0,
  },
  trendCount: {
    color: COLORS.text,
    fontSize: getFontSize(14),
    fontWeight: "700",
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: getFontSize(16),
    fontWeight: "bold",
    marginHorizontal: scale(12),
    marginBottom: scale(12),
  },
  horizontalScrollContainer: {
    paddingHorizontal: scale(12),
    gap: scale(16),
  },

  
  stickyStarsContainer: {
    backgroundColor: COLORS.background,
    paddingTop: scale(16),
    paddingBottom: scale(12),
    borderBottomWidth: scale(0.5),
    borderBottomColor: COLORS.border,
    zIndex: 10,
  },
  competitionsHeaderBox: {
    paddingTop: scale(16),
  },

  
  topUserCard: {
    alignItems: "center",
    width: scale(75),
  },
  topUserAvatar: {
    width: scale(65),
    height: scale(65),
    borderRadius: scale(32.5),
    marginBottom: scale(8),
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
  topUserName: {
    color: COLORS.text,
    fontSize: getFontSize(12),
    textAlign: "center",
    fontWeight: "500",
  },
  topCompCard: {
    width: scale(220),
    height: scale(130),
    borderRadius: scale(12),
    overflow: "hidden",
    backgroundColor: COLORS.surface,
  },
  topCompImage: {
    width: "100%",
    height: "100%",
    opacity: 0.8,
    resizeMode: "cover",
    backgroundColor: COLORS.surface,
  },
  topCompOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: scale(12),
    backgroundColor: "rgba(30, 16, 5, 0.7)",
  },
  topCompTitle: {
    color: COLORS.text,
    fontSize: getFontSize(14),
    fontWeight: "bold",
  },

  
  topReelCard: {
    width: SCREEN_WIDTH / 3,
    height: (SCREEN_WIDTH / 3) * 1.5,
    borderWidth: 0.5,
    borderColor: COLORS.background,
    backgroundColor: COLORS.surface,
  },
  gridMedia: {
    width: "100%",
    height: "100%",
    resizeMode: "cover", 
  },

  
  fullReelCard: {
    width: SCREEN_WIDTH,
    alignItems: "center",
    marginBottom: scale(24),
  },
  fullReelMedia: {
    width: "80%",
    aspectRatio: 4 / 5,
    resizeMode: "cover",
    borderRadius: scale(12),
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  
  userListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: scale(12),
    paddingHorizontal: scale(16),
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  userListAvatar: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
    borderWidth: 1,
    borderColor: COLORS.surface,
  },
  userListInfo: {
    flex: 1,
    marginLeft: scale(14),
  },
  userListName: {
    color: COLORS.text,
    fontSize: getFontSize(15),
    fontWeight: "700",
  },
  userListSub: {
    color: COLORS.textMuted,
    fontSize: getFontSize(13),
    marginTop: scale(2),
  },
  followButtonBox: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(8),
  },
  followButtonBoxText: {
    color: "#000",
    fontSize: getFontSize(13),
    fontWeight: "bold",
  },

  
  compCard: {
    height: scale(180),
    borderRadius: scale(16),
    overflow: "hidden",
    marginBottom: scale(16),
    backgroundColor: COLORS.surface,
  },
  compImage: {
    width: "100%",
    height: "100%",
    opacity: 0.7,
    resizeMode: "cover",
    backgroundColor: COLORS.surface,
  },
  compOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: scale(16),
    backgroundColor: "rgba(30, 16, 5, 0.7)",
  },
  compBadge: {
    backgroundColor: COLORS.accent,
    alignSelf: "flex-start",
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(6),
    marginBottom: scale(8),
  },
  compBadgeText: {
    color: "#000",
    fontSize: getFontSize(10),
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  compTitle: {
    color: COLORS.text,
    fontSize: getFontSize(20),
    fontWeight: "bold",
  },
  compSub: {
    color: COLORS.textMuted,
    fontSize: getFontSize(13),
    marginTop: scale(4),
    fontWeight: "500",
  },
});
