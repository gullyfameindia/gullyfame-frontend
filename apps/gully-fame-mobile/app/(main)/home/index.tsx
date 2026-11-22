import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Bell, MessageCircle } from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Dimensions,
  ImageBackground,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Alert,
  StyleSheet,
  AppState,
} from "react-native";
import { homeScreenStyles as styles } from "@/styles/homeScreenStyles";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BottomNav from "@components/layout/BottomNav";
import DrawerMenu from "@components/layout/DrawerMenu";
import { hp, wp } from "@utils/responsive";
import RoleBasedBanner from "@/components/home/RoleBasedBanner/RoleBasedBanner";
import Svg, { Rect, Defs, RadialGradient, Stop } from "react-native-svg";
import { getUnreadNotificationCount } from "@/api/services/notificationIntegrationService";
import {
  HomeIconSVG,
  ReelIconSVG,
  PeopleIcon,
  SearchIconSVG,
  TrophyIcon,
  UserIconSVG,
  ViewsEyeIcon,
  CaretRightIcon,
  LimitedTimeEventClockIcon,
} from "@/icons";
import SafeImage from "@/components/SafeImage";
import HeroBannerCarousel from "@/components/home/HeroBannerCarousel/HeroBannerCarousel";
import { Skeleton, SkeletonCaption, SkeletonCards, SkeletonList, SkeletonRoot } from "@/components/Skeleton/Skeleton";
import CategoriesCarousel from "@/components/home/CategoriesCarousel/CategoriesCarousel";
import { getAuthToken, getErrorMessage } from "@/api/client";
import { getCachedHomeScreen, getHomeScreen, HomeScreenData } from "@/api/services/homeService";
import { listReels, FeedReel } from "@/api/services/reelsService";
import type { Progress } from "@/api/services/userService";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import { categoryIconKey } from "@/utils/categoryDisplay";
import { convertToFormattedString } from "@/utils/convertToFormattedString";
import { convertToFormattedPrize } from "@/utils/convertToFormattedPrize";
import { convertDateToDaysLeft } from "@/utils/convertDateToDaysLeft";
import { XP_AND_MISSIONS_ENABLED } from "@/config/features";

const getDimensions = () => Dimensions.get("window");

type FeedTab = "trending" | "for-you" | "popular" | "saved";

interface FeedCard {
  id: string;
  title: string;
  image: string;
  /** Not shown; the Popular tab sorts by it. */
  votes: number;
}

const reelToCard = (reel: FeedReel): FeedCard => ({
  id: reel._id,
  title: reel.caption || reel.author?.username || "",
  image: reel.thumbnail_url || "",
  votes: reel.stats?.votes || 0,
});

export default function GullyFameHome() {
  const [activeTab, setActiveTab] = useState("Home");
  const [unreadCount, setUnreadCount] = useState(0);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [dimensions, setDimensions] = useState(getDimensions());
  const insets = useSafeAreaInsets();

  const [feedTab, setFeedTab] = useState<FeedTab>("trending");
  const [feedLoading, setFeedLoading] = useState(false);
  // Spinner only before the first feed load; later focuses refresh silently.
  const feedLoadedRef = useRef(false);

  // null until the first home data (saved copy or server) arrives, so no placeholder slides flash.
  const [categories, setCategories] = useState<any[]>([]);
  const [trendingData, setTrendingData] = useState<FeedCard[]>([]);
  const [forYouData, setForYouData] = useState<FeedCard[]>([]);
  const [popularData, setPopularData] = useState<FeedCard[]>([]);
  const [savedData, setSavedData] = useState<FeedCard[]>([]);
  const [liveCompetitions, setLiveCompetitions] = useState<any[]>([]);
  const [pastCompetitions, setPastCompetitions] = useState<any[]>([]);
  const [upcomingCompetitions, setUpcomingCompeitions] = useState<any[]>([]);
  const [topCompetitors, setTopCompetitors] = useState<any[]>([]);


  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [liveDotBlink] = useState(() => new Animated.Value(1));
  const [pulseAnim] = useState(() => new Animated.Value(1));
  // True once the banner has scrolled away; only this flip re-renders, not every scroll frame.
  // Drives the fixed header's gradient: hidden at the top, fully shown after ~120pt of scroll.
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerFade = scrollY.interpolate({ inputRange: [40, 160], outputRange: [0, 1], extrapolate: "clamp" });

  const [homeError, setHomeError] = useState("");
  // False until the first home data (saved copy or server) arrives; sections show skeletons meanwhile.
  const [homeReady, setHomeReady] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [dailyMission, setDailyMission] = useState<{ target: number; current: number; completed: boolean } | null>(null);
  const [feedError, setFeedError] = useState("");

  const applyHome = useCallback((data: HomeScreenData) => {
    setCategories(
      data.categories.map((c) => ({ id: c.id, name: c.name, imageUrl: c.icon, icon: categoryIconKey(c.name) }))
    );
    setTrendingData(data.trending.map((t) => ({ id: t.id, title: t.title, image: t.image, votes: t.views })));
    setLiveCompetitions(data.liveCompetitions);
    setPastCompetitions(data.pastCompetitions);
    setUpcomingCompeitions(data.upcomingCompetitions);
    setTopCompetitors(data.topCompetitors);
    // Level card and daily mission are hidden while XP and missions are switched off.
    setProgress(XP_AND_MISSIONS_ENABLED ? data.progress : null);
    setDailyMission(XP_AND_MISSIONS_ENABLED ? data.dailyMission : null);
    setHomeReady(true);
  }, []);

  // The last home screen saved on this device shows first; the server copy replaces it.
  const homeLoadedRef = useRef(false);
  useEffect(() => {
    getCachedHomeScreen().then((cached) => {
      if (cached && !homeLoadedRef.current) applyHome(cached);
    });
  }, [applyHome]);

  // GET /user/homeScreen feeds every section of this screen in one call.
  const loadHome = useCallback(async () => {
    setHomeError("");
    try {
      const data = await getHomeScreen();
      homeLoadedRef.current = true;
      applyHome(data);
    } catch (error) {
      setHomeError(getErrorMessage(error));
      setHomeReady(true);
    }
  }, [applyHome]);

  // Feed tabs come from GET /reels: For You = newest, Popular = most voted of the
  // latest reels, Saved = the ones the user saved (is_saved).
  const loadFeed = useCallback(async () => {
    if (!feedLoadedRef.current) setFeedLoading(true);
    setFeedError("");
    try {
      const page = await listReels(null, 30);
      const cards = page.reels.map(reelToCard);
      setForYouData(cards.slice(0, 10));
      setPopularData([...cards].sort((a, b) => b.votes - a.votes).slice(0, 10));
      setSavedData(page.reels.filter((r) => r.user_interactions?.is_saved).map(reelToCard));
    } catch (error) {
      setFeedError(getErrorMessage(error));
    } finally {
      feedLoadedRef.current = true;
      setFeedLoading(false);
    }
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    const result = await getUnreadNotificationCount();
    if (result.success && result.data) setUnreadCount(result.data.count);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHome();
      loadFeed();
      refreshUnreadCount();
    }, [loadHome, loadFeed, refreshUnreadCount])
  );

  // Poll the unread badge only while this screen is focused AND the app is in the foreground.
  useFocusEffect(
    useCallback(() => {
      let pollInterval: ReturnType<typeof setInterval> | null = null;
      const start = () => {
        if (!pollInterval) pollInterval = setInterval(refreshUnreadCount, 30000);
      };
      const stop = () => {
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      };
      if (AppState.currentState === "active") start();
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") {
          refreshUnreadCount();
          start();
        } else {
          stop();
        }
      });
      return () => {
        stop();
        subscription.remove();
      };
    }, [refreshUnreadCount])
  );

  const openReel = (reelId: string) =>
    router.push({ pathname: "/(main)/reel", params: { startReelId: reelId } } as any);

  const liveCompetitionsFull = useMemo(
    () =>
      liveCompetitions.map((comp) => ({
        defaultThumbnailImage: require("@assets/images/trending_reel2.png"),
        people: convertToFormattedString(Number(comp.participants ?? 0)),
        endDate: comp.endDate ? String(comp.endDate) : "",
        prize: convertToFormattedPrize(comp.prize),
        ...comp,
      })),
    [liveCompetitions]
  );
  
  const pastCompetitionsFull = useMemo(
    () =>
      pastCompetitions.map((comp) => ({
        defaultThumbnailImage: require("@assets/images/trending_reel2.png"),
        ...comp,
      })),
    [pastCompetitions]
  );
  
  const upcomingCompetitionsFull = useMemo(
    () =>
      upcomingCompetitions.map((comp) => ({
        defaultThumbnailImage: require("@assets/images/trending_reel2.png"),
        ...comp,
      })),
    [upcomingCompetitions]
  );

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) =>
      setDimensions(window)
    );
    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  useEffect(() => {
    fadeAnim.setValue(1);
    const blinkAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(liveDotBlink, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(liveDotBlink, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    const heartbeatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
         }),
      ])
    );

    blinkAnimation.start();
    heartbeatAnimation.start();
    return () => {
      blinkAnimation.stop();
      heartbeatAnimation.stop();
    };
  }, [fadeAnim, liveDotBlink, pulseAnim]);

  const tabs = [
    { name: "Home", icon: HomeIconSVG, label: "" },
    { name: "Reel", icon: ReelIconSVG, label: "GullyReel" },
    { name: "Upload", icon: null, label: "UPLOAD" },
    { name: "Search", icon: SearchIconSVG, label: "" },
    { name: "MyFame", icon: UserIconSVG, label: "" },
  ];

  const checkAuthAndNavigate = async (route: string, requiresParticipant: boolean = false) => {
    try {
      if (!(await getAuthToken())) {
        setDrawerVisible(true);
        return;
      }
      if (requiresParticipant) {
        const role = await AsyncStorage.getItem("userRole");
        if (role !== "participant" && role !== "participants") {
          Alert.alert(
            "Participants only",
            "Switch your account role to participant to submit entries. Fans can still follow and vote!"
          );
          return;
        }
      }
      router.push(route as any);
    } catch {
      setDrawerVisible(true);
    }
  };

  // Removed 'user_progress' section since it contained hardcoded gamification dummy data
  const homeSections = [
    { id: "hero" },
    { id: "progress" },
    { id: "categories" },
    { id: "trending" },
    { id: "live" },
    { id: "upcoming" },
    { id: "past" },
    { id: "top_competitors" },
    { id: "role_banner" },
  ];

  const renderSection = ({ item }: { item: { id: string } }) => {
    // Skeletons for every data section until the first home data arrives.
    if (!homeReady) {
      switch (item.id) {
        case "categories":
          return (
            <SkeletonRoot style={{ paddingHorizontal: 32, marginTop: 24, marginBottom: 24, gap: 18 }}>
              <Skeleton width={170} height={22} radius={6} />
              <View style={{ flexDirection: "row", gap: 28 }}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={{ alignItems: "center", gap: 8 }}>
                    <Skeleton width={58} height={58} radius={29} />
                    <Skeleton width={56} height={12} radius={4} />
                  </View>
                ))}
              </View>
            </SkeletonRoot>
          );
        case "live":
        case "upcoming":
        case "past":
          return (
            <View style={{ paddingHorizontal: 16, marginBottom: 24, gap: 12 }}>
              <Skeleton width="55%" height={20} radius={6} />
              <SkeletonCards count={1} height={170} />
            </View>
          );
        case "top_competitors":
          return (
            <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
              <Skeleton width="45%" height={20} radius={6} />
              <SkeletonList rows={3} />
            </View>
          );
        default:
          break;
      }
    }
    switch (item.id) {
      case "hero":
        return (
          <View style={[styles.heroSection, { height: hp(45), marginBottom: 8 }]}>
            <View style={styles.radialGradientContainer} pointerEvents="none">
              <Svg width={dimensions.width} height={hp(45)} style={styles.radialGradientSvg}>
                <Defs>
                  <RadialGradient id="radialGradient" cx="50%" cy="0%" r="200%">
                    <Stop offset="0%" stopColor="#EC9A15" stopOpacity="1" />
                    <Stop offset="100%" stopColor="#1E1111" stopOpacity="1" />
                  </RadialGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#radialGradient)" />
              </Svg>
            </View>
            {homeReady ? (
              <HeroBannerCarousel />
            ) : (
              <SkeletonRoot style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 32 }}>
                <Skeleton width={72} height={72} radius={36} />
                <Skeleton width="45%" height={22} radius={6} />
                <Skeleton width="30%" height={14} radius={4} />
                <Skeleton width="80%" height={14} radius={4} />
              </SkeletonRoot>
            )}
          </View>
        );

      case "categories":
        return <CategoriesCarousel categories={categories}></CategoriesCarousel>;

      case "trending": {
        const currentFeedData = 
          feedTab === "trending" ? trendingData :
          feedTab === "for-you" ? forYouData :
          feedTab === "popular" ? popularData :
          savedData;

        return (
          <View style={styles.section}>
            <View style={styles.sectionHeaderWithIcon}>
              <View style={styles.sectionTitleRow}>
                {homeReady ? (
                  <Text style={styles.sectionTitle}>Feed</Text>
                ) : (
                  <SkeletonRoot>
                    <Skeleton width={120} height={22} radius={6} />
                  </SkeletonRoot>
                )}
              </View>
            </View>

            {!homeReady ? (
              <SkeletonRoot style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 12 }}>
                {[96, 84, 90, 70].map((w, i) => (
                  <Skeleton key={i} width={w} height={34} radius={20} />
                ))}
              </SkeletonRoot>
            ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 12, marginHorizontal: -wp(5) }}
              contentContainerStyle={{ paddingHorizontal: wp(5), gap: 8 }}
            >
              {[
                { id: "trending", label: "Trending" },
                { id: "for-you", label: "For You" },
                { id: "popular", label: "Popular" },
                { id: "saved", label: "Saved" },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setFeedTab(tab.id as any)}
                  testID={`home-feed-tab-${tab.id}`}
                  style={[
                    {
                      paddingHorizontal: 14,
                      height: 32,
                      justifyContent: "center",
                      borderRadius: 16,
                      backgroundColor: feedTab === tab.id ? "#EC9A15" : "rgba(255,255,255,0.08)",
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: feedTab === tab.id ? "#1A1A1A" : "#CAD7D8",
                      fontSize: 13,
                      fontFamily: "Inter_600SemiBold",
                    }}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            )}

            {feedLoading || !homeReady ? (
              <SkeletonRoot style={[styles.trendingScroll, { flexDirection: "row", overflow: "hidden" }]}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={styles.trendingReelCardWrapper}>
                    <Skeleton style={styles.trendingReelCard} radius={0} />
                    <SkeletonCaption />
                  </View>
                ))}
              </SkeletonRoot>
            ) : feedTab !== "trending" && feedError ? (
              <TouchableOpacity onPress={loadFeed} style={{ paddingVertical: 40, alignItems: "center" }}>
                <Text style={{ color: "#999", fontSize: 14, textAlign: "center" }}>{feedError}</Text>
                <Text style={{ color: "#EC9A15", fontSize: 14, marginTop: 8 }}>Tap to retry</Text>
              </TouchableOpacity>
            ) : currentFeedData && currentFeedData.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.trendingScroll}
                nestedScrollEnabled={true}
              >
                {currentFeedData.map((reel, index) => (
                  <View key={reel.id || index} style={styles.trendingReelCardWrapper}>
                    <TouchableOpacity
                      style={styles.trendingReelCard}
                      onPress={() => openReel(reel.id)}
                      activeOpacity={0.9}
                    >
                      <ImageBackground
                        source={require("@assets/images/badge.png")}
                        style={styles.topBadge}
                        resizeMode="contain"
                      >
                        <View style={styles.topBadgeContent}>
                          <Text style={styles.topBadgeText}>TOP</Text>
                          <Text style={styles.topBadgeNumber}>{index + 1}</Text>
                        </View>
                      </ImageBackground>

                      <SafeImage
                        style={styles.trendingReelImage}
                        imageUrl={resolveMediaUrl(reel.image) || undefined}
                        defaultImage={require("@assets/images/trending_reel2.png")}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                    <Text
                      style={styles.trendingReelTitleBelow}
                      numberOfLines={1}
                      onPress={() => openReel(reel.id)}
                    >
                      {reel.title}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={homeExtraStyles.emptyFeed} testID="home-feed-empty">
                <View style={homeExtraStyles.emptyFeedIcon}>
                  <Ionicons name={feedTab === "saved" ? "bookmark-outline" : "film-outline"} size={22} color="#EC9A15" />
                </View>
                <View style={homeExtraStyles.emptyFeedBody}>
                  <Text style={homeExtraStyles.emptyFeedTitle}>
                    {feedTab === "saved" ? "Nothing saved yet" : "No reels here yet"}
                  </Text>
                  <Text style={homeExtraStyles.emptyFeedText}>
                    {feedTab === "saved"
                      ? "Tap the bookmark on any reel to keep it here."
                      : "Post the first one and get your talent seen."}
                  </Text>
                  <TouchableOpacity
                    style={homeExtraStyles.emptyFeedButton}
                    onPress={() =>
                      feedTab === "saved" ? router.push("/(main)/reel" as any) : checkAuthAndNavigate("/(main)/camera")
                    }
                    activeOpacity={0.8}
                    testID="home-feed-empty-action"
                  >
                    <Ionicons name={feedTab === "saved" ? "play" : "add"} size={16} color="#1A1A1A" />
                    <Text style={homeExtraStyles.emptyFeedButtonText}>
                      {feedTab === "saved" ? "Watch reels" : "Upload a reel"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        );
      }

      case "live":
        if (!liveCompetitionsFull.length) return null;
        return (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionTitleRow, { alignItems: "center" }]}>
                <Animated.View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: "#FF3B30",
                    marginRight: 8,
                    opacity: liveDotBlink,
                  }}
                />
                <Text style={styles.sectionTitle}>Live Competitions</Text>
              </View>
              <TouchableOpacity
                style={styles.viewAllContainer}
                onPress={() => checkAuthAndNavigate("/(main)/competitions/live")}
                testID="home-live-view-all"
              >
                <Text style={styles.viewAllButton}>View All</Text>
                <CaretRightIcon></CaretRightIcon>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.competitionsScroll}
              nestedScrollEnabled={true}
            >
              {liveCompetitionsFull.map((comp) => (
                <View key={`live-${comp.id}`} style={styles.upcomingCompCardWrapper}>
                  <TouchableOpacity
                    style={[styles.upcomingCompCard, styles.glowingCard]}
                    activeOpacity={0.9}
                    onPress={() => router.push(`/(main)/competition/live/${comp.id}` as any)}
                  >
                    <View style={styles.upcomingCompImageWrapper}>
                      <SafeImage
                        defaultImage={comp.defaultThumbnailImage}
                        imageUrl={resolveMediaUrl(comp.image) || undefined}
                        style={styles.upcomingCompImage}
                        resizeMode="contain"
                      />
                      <View
                        style={{
                          position: "absolute",
                          top: 12,
                          left: 12,
                          backgroundColor: "#FF3B30",
                          paddingHorizontal: 12,
                          paddingVertical: 4,
                          borderRadius: 20,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: "#FFF",
                          }}
                        />
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 11,
                            fontWeight: "700",
                            letterSpacing: 0.5,
                          }}
                        >
                          LIVE
                        </Text>
                      </View>

                      <Animated.View
                        style={[
                          styles.joinButtonOverlay,
                          {
                            transform: [
                              {
                                scale: pulseAnim,
                              },
                            ],
                          },
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.joinButtonOnImage}
                          onPress={(e) => {
                            e.stopPropagation();
                            router.push(`/(main)/competition/live/${comp.id}` as any);
                          }}
                        >
                          <LinearGradient
                            colors={["#FF3B30", "#D32F2F"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.joinButtonGradientOnImage}
                          >
                            <Text style={styles.joinButtonTextOnImage}>Vote Now</Text>
                            <Text style={styles.joinButtonPrizeText}>
                              {convertToFormattedPrize(comp.prize)}
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </Animated.View>
                    </View>
                    <View style={styles.upcomingCompContent}>
                      <Text style={styles.upcomingCompTitle} numberOfLines={2}>
                        {comp.title}
                      </Text>
                      <View style={styles.compInfoRow}>
                        <View style={styles.compInfoItem}>
                          <LimitedTimeEventClockIcon />
                          <Text style={styles.upcomingCompDeadline}>
                            {convertDateToDaysLeft(comp.endDate ? String(comp.endDate) : "")} Days Left
                          </Text>
                        </View>
                        <View style={styles.compInfoItem}>
                          <PeopleIcon color="#EC9A15" size={14} />
                          <Text style={styles.upcomingCompParticipants}>
                            {comp.people}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        );

      case "upcoming":
        // Always shown; with nothing scheduled it says "Coming soon" instead of disappearing.
        return (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <TrophyIcon size={24} />
                <Text style={styles.sectionTitle}>Upcoming Competitions</Text>
              </View>
              {upcomingCompetitionsFull.length ? (
                <TouchableOpacity
                  style={styles.viewAllContainer}
                  onPress={() => checkAuthAndNavigate("/(main)/competitions/upcoming")}
                  testID="home-upcoming-view-all"
                >
                  <Text style={styles.viewAllButton}>View all</Text>
                  <CaretRightIcon></CaretRightIcon>
                </TouchableOpacity>
              ) : null}
            </View>
            {!upcomingCompetitionsFull.length ? (
              <View style={homeExtraStyles.emptyFeed} testID="home-upcoming-coming-soon">
                <View style={homeExtraStyles.emptyFeedIcon}>
                  <Ionicons name="trophy-outline" size={22} color="#EC9A15" />
                </View>
                <View style={homeExtraStyles.emptyFeedBody}>
                  <Text style={homeExtraStyles.emptyFeedTitle}>No upcoming competitions</Text>
                  <Text style={homeExtraStyles.emptyFeedText}>
                    New ones are announced here first. Check back soon.
                  </Text>
                </View>
              </View>
            ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.competitionsScroll}
              nestedScrollEnabled={true}
            >
              {upcomingCompetitionsFull.map((comp) => (
                <View key={`upcoming-${comp.id}`} style={styles.upcomingCompCardWrapper}>
                  <TouchableOpacity
                    style={styles.upcomingCompCard}
                    activeOpacity={0.9}
                    onPress={() => router.push(`/(main)/competition/upcoming/${comp.id}` as any)}
                  >
                    <View style={styles.upcomingCompImageWrapper}>
                      <SafeImage
                        defaultImage={comp.defaultThumbnailImage}
                        imageUrl={resolveMediaUrl(comp.image) || undefined}
                        style={styles.upcomingCompImage}
                        resizeMode="cover"
                      ></SafeImage>
                      <View style={styles.joinButtonOverlay}>
                        <TouchableOpacity
                          style={homeExtraStyles.joinPill}
                          activeOpacity={0.85}
                          onPress={(e) => {
                            e.stopPropagation();
                            router.push(`/(main)/competition/upcoming/${comp.id}` as any);
                          }}
                        >
                          <Text style={homeExtraStyles.joinPillText}>Join Now</Text>
                          {typeof comp.prize === "number" ? (
                            <Text style={homeExtraStyles.joinPillPrize}>
                              ₹{new Intl.NumberFormat("en-IN").format(comp.prize)}/-
                            </Text>
                          ) : null}
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.upcomingCompContent}>
                      <Text style={styles.upcomingCompTitle} numberOfLines={2}>
                        {comp.title}
                      </Text>
                      <View style={styles.compInfoRow}>
                        <View style={styles.compInfoItem}>
                          <LimitedTimeEventClockIcon size={14} strokeWidth={2} />
                          <Text style={homeExtraStyles.metaText}>
                            {(() => {
                              const days = convertDateToDaysLeft(comp.endDate ? String(comp.endDate) : "");
                              return `${days} ${days === 1 ? "day" : "days"} left`;
                            })()}
                          </Text>
                        </View>
                        <View style={styles.compInfoItem}>
                          <PeopleIcon color="#EC9A15" size={14} />
                          <Text style={homeExtraStyles.metaText}>
                            {convertToFormattedString(Number(comp.participants ?? 0))}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            )}
          </View>
        );

      case "past":
        if (!pastCompetitionsFull.length) return null;
        return (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <TrophyIcon size={24} />
                <Text style={styles.sectionTitle}>Past Competitions</Text>
              </View>
              <TouchableOpacity
                style={styles.viewAllContainer}
                onPress={() => checkAuthAndNavigate("/(main)/competitions/past")}
                testID="home-past-view-all"
              >
                <Text style={styles.viewAllButton}>View All</Text>
                <CaretRightIcon></CaretRightIcon>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pastCompScroll}
              nestedScrollEnabled={true}
            >
              {pastCompetitionsFull.map((comp) => (
                <TouchableOpacity
                  key={comp.id}
                  style={styles.pastCompCard}
                  onPress={() => router.push(`/(main)/competition/past/${comp.id}` as any)}
                  activeOpacity={0.9}
                >
                  <View style={styles.pastCompImageWrapper}>
                    <SafeImage
                      style={styles.pastCompImage}
                      resizeMode="contain"
                      imageUrl={resolveMediaUrl(comp.image) || undefined}
                      defaultImage={comp.defaultThumbnailImage}
                    ></SafeImage>
                    <View style={styles.pastCompBadge}>
                      <Text style={styles.pastCompBadgeText}>Ended</Text>
                    </View>
                    <View style={styles.viewResultsButtonOverlay}>
                      <TouchableOpacity
                        style={styles.viewResultsButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          router.push(`/(main)/competition/past/${comp.id}` as any);
                        }}
                      >
                        <LinearGradient
                          colors={["#EBA229", "#EBA229"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.viewResultsButtonGradient}
                        >
                          <Text style={styles.viewResultsButtonText}>View Results</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.pastCompContent}>
                    <Text style={styles.pastCompTitle} numberOfLines={1}>
                      {comp.title}
                    </Text>
                    <View style={styles.winnerViewsRow}>
                      <View style={styles.winnerRow}>
                        <TrophyIcon size={10} />
                        <Text style={styles.pastCompWinnerLabel}>Winner: </Text>
                        <Text style={styles.pastCompWinner}>{comp.winner}</Text>
                      </View>
                      <View style={styles.viewsRow}>
                        <ViewsEyeIcon size={15}></ViewsEyeIcon>
                        <Text style={styles.pastCompViews}>
                          {convertToFormattedString(Number(comp.views ?? 0))} Views
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );

      case "progress":
        if (homeError) {
          return (
            <TouchableOpacity onPress={loadHome} style={homeExtraStyles.card}>
              <Text style={homeExtraStyles.muted}>{homeError}</Text>
              <Text style={homeExtraStyles.accent}>Tap to retry</Text>
            </TouchableOpacity>
          );
        }
        if (!progress && !dailyMission) return null;
        return (
          <View style={homeExtraStyles.card}>
            {progress ? (
              <>
                <View style={homeExtraStyles.row}>
                  <Text style={homeExtraStyles.title}>
                    {progress.levelTitle} · Level {progress.level}
                  </Text>
                  <Text style={homeExtraStyles.accent}>{progress.streakCount}-day streak</Text>
                </View>
                <View style={homeExtraStyles.track}>
                  <View
                    style={[
                      homeExtraStyles.fill,
                      { width: `${Math.min(100, Math.round((progress.xpIntoLevel / progress.xpPerLevel) * 100))}%` },
                    ]}
                  />
                </View>
                <Text style={homeExtraStyles.muted}>
                  {progress.xpToNextLevel} XP to Level {progress.level + 1}
                </Text>
              </>
            ) : null}
            {dailyMission ? (() => {
              const done = Math.min(dailyMission.current, dailyMission.target);
              const pct = dailyMission.target > 0 ? Math.round((done / dailyMission.target) * 100) : 0;
              return (
                <View style={homeExtraStyles.missionCard} testID="home-daily-mission">
                  <View style={homeExtraStyles.missionHeader}>
                    <Text style={homeExtraStyles.missionLabel}>DAILY MISSION</Text>
                    <Text style={homeExtraStyles.missionCount}>
                      {dailyMission.completed ? "Completed ✓" : `${done}/${dailyMission.target}`}
                    </Text>
                  </View>
                  <Text style={homeExtraStyles.missionTitle}>
                    Vote on {dailyMission.target} videos
                  </Text>
                  <View style={homeExtraStyles.missionTrack}>
                    <LinearGradient
                      colors={["#FFE066", "#EC9A15"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[homeExtraStyles.missionFill, { width: `${pct}%` }]}
                    />
                  </View>
                </View>
              );
            })() : null}
          </View>
        );

      case "top_competitors":
        if (!topCompetitors.length) return null;
        return (
          <View style={[styles.section, styles.hallOfFameSection]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <TrophyIcon size={24} color="#EAB04B" />
                <Text style={styles.sectionTitle}>Hall of Fame</Text>
              </View>
            </View>
            <Text style={styles.hallOfFameSubtitle}>
              Overall point leaders across all Gully Fame events.
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.competitionsScroll}
              nestedScrollEnabled={true}
            >
              {topCompetitors.map((competitor) => (
                <View
                  key={`top-${competitor.rank}`}
                  style={[
                    styles.hallOfFameCard,
                    {
                      borderColor: competitor.rank === 1 ? "#EAB04B" : "#333",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.hallOfFameRank,
                      {
                        color: competitor.rank === 1 ? "#EAB04B" : "#aaa",
                      },
                    ]}
                  >
                    #{competitor.rank}
                  </Text>
                  <SafeImage
                    style={styles.hallOfFameImage}
                    imageUrl={resolveMediaUrl(competitor.image) || undefined}
                    defaultImage={require("@assets/images/trending_reel2.png")}
                  />
                  <Text style={styles.hallOfFameName} numberOfLines={1}>
                    {competitor.name}
                  </Text>
                  <Text style={styles.hallOfFamePoints}>
                    {convertToFormattedString(Number(competitor.points ?? 0))} pts
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        );

      case "role_banner":
        return (
          <View style={{ marginBottom: 40 }}>
            {homeReady ? (
              <RoleBasedBanner />
            ) : (
              <SkeletonRoot style={{ paddingHorizontal: 16 }}>
                <Skeleton height={76} radius={16} />
              </SkeletonRoot>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  //if (typeof BottomNav !== "function" || typeof DrawerMenu !== "function") return null;
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      {/* One fixed header that never moves. Its gradient is invisible over the banner and fades in
          as the page scrolls, so content slides softly underneath the icons. */}
      <View
        style={[styles.stickyHeader, { paddingTop: insets.top + 10 }]}
        pointerEvents="box-none"
      >
          <Animated.View
            style={[homeExtraStyles.stickyFade, { opacity: headerFade }]}
            pointerEvents="none"
          >
            <LinearGradient
              colors={["#3C2610", "rgba(60, 38, 16, 0.95)", "rgba(60, 38, 16, 0)"]}
              locations={[0, 0.7, 1]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <View style={styles.stickyHeaderContent}>
            <TouchableOpacity
              style={styles.stickyHeaderIconButton}
              onPress={() => checkAuthAndNavigate("/(main)/settings/notifications")}
              testID="home-sticky-notifications"
                accessibilityRole="button"
                accessibilityLabel={unreadCount > 0 ? "Notifications, unread" : "Notifications"}
                hitSlop={4}
            >
              <Bell size={24} color="#FFFFFF" strokeWidth={1.8} />
              {unreadCount > 0 && <View style={styles.notificationDot} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stickyHeaderIconButton}
              onPress={() => checkAuthAndNavigate("/(main)/inbox")}
              testID="home-sticky-inbox"
                accessibilityRole="button"
                accessibilityLabel="Messages"
                hitSlop={4}
            >
              <MessageCircle size={24} color="#FFFFFF" strokeWidth={1.8} />
            </TouchableOpacity>
          </View>
      </View>

      <Animated.FlatList
        data={homeSections}
        keyExtractor={(item) => item.id}
        renderItem={renderSection}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { opacity: fadeAnim }]}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
      />

      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tabs={tabs}
        onOpenDrawer={() => setDrawerVisible(true)}
      />
      <DrawerMenu visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
}

const homeExtraStyles = StyleSheet.create({
  stickyFade: { position: "absolute", top: 0, left: 0, right: 0, bottom: -28 },
  emptyFeed: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.25)",
  },
  emptyFeedIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "rgba(236, 154, 21, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyFeedBody: { flex: 1 },
  emptyFeedTitle: { color: "#FFFFFF", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptyFeedText: { color: "#CAD7D8", fontSize: 13, lineHeight: 18, marginTop: 2, fontFamily: "Inter_400Regular" },
  emptyFeedButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#EC9A15",
  },
  emptyFeedButtonText: { color: "#1A1A1A", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  card: {
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(236,154,21,0.35)",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  accent: {
    color: "#EC9A15",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  muted: {
    color: "#bbb",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    marginBottom: 6,
  },
  fill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EC9A15",
  },
  // Daily mission card: gold accent, progress bar matches the profile's Gully Star bar.
  missionCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(236,154,21,0.12)",
    borderWidth: 1,
    borderColor: "rgba(236,154,21,0.45)",
  },
  missionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  missionLabel: {
    color: "#EC9A15",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  missionCount: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  missionTitle: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
  },
  missionTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  missionFill: {
    height: 8,
    borderRadius: 4,
  },
  // Upcoming Competitions: gold "Join Now ₹1,00,000/-" pill and grey meta line, per the design.
  joinPill: {
    minWidth: "70%",
    maxWidth: "92%",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#E9A83A",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
  },
  joinPillText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  joinPillPrize: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  metaText: {
    color: "#CAD7D8",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
});
