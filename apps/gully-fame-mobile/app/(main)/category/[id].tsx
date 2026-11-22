import React, { useState, useEffect } from "react";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, Image, ImageBackground, StatusBar, Modal, Animated } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { safeBack } from "@/utils/safeBack";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import { getCategories } from "@/api/services/userService";
import { getFollowedCategories, setCategoryFollowed } from "@/utils/followedCategories";
import { TALENT_CATEGORIES } from "@/constants/talentCategories";
import { listCompetitionsByCategory, getCompetitionReels, type CompetitionListItem } from "@/api/services/competitionService";
import { SkeletonCards, SkeletonGrid } from "@/components/Skeleton/Skeleton";
import { Award, CalendarDays, Check, ChevronDown, ChevronLeft, Clock, Film, Plus, Trophy, Users } from "lucide-react-native";
import { colors, font, radius, space } from "@/theme/tokens";

const { width, height } = Dimensions.get("window");


const matchTalent = (name?: string) => {
  const n = String(name || "").trim().toLowerCase();
  return TALENT_CATEGORIES.find((c) => c.key === n || c.name.toLowerCase() === n);
};

const defaultCategoryData = {
  name: "Category",
  tagline: "Explore amazing content",
  description: "Discover exciting content in this category",
  banner: require("@assets/images/carousel1.png"),
};

type CategoryComp = {
  id: string;
  title: string;
  image: any;
  prize: string;
  participants: number;
  startDate: string;
  endDate: string;
};
type CategoryReel = { id: string; competitionId: string; thumbnail: any; votes: number };

const PLACEHOLDER_IMAGE = require("@assets/images/carousel1.png");

const formatDay = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const toCard = (c: CompetitionListItem): CategoryComp => ({
  id: String(c._id),
  title: c.title,
  image: c.imageUrl ? { uri: c.imageUrl } : PLACEHOLDER_IMAGE,
  prize: `₹${Number(c.prize || 0).toLocaleString("en-IN")}`,
  participants: c.participants || 0,
  startDate: formatDay(c.startDate),
  endDate: c.endDate ? `Ends ${formatDay(c.endDate)}` : "",
});

// Top performers per category need a backend endpoint; the section stays hidden while empty.
const topPerformers: any[] = [];



const CompetitionCard = React.memo(({ comp, index, type }: any) => {
  const [scaleAnim] = React.useState(() => new Animated.Value(0));
  const [fadeAnim] = React.useState(() => new Animated.Value(0));

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
    // Entrance animation runs once on mount; re-running on `index` would replay it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePress = React.useCallback(async () => {
    
    if (type !== "live") {
      const { validateKycBeforeCompetition } = await import('@utils/kycValidation');
      const isValid = await validateKycBeforeCompetition();
      
      if (!isValid) {
        return; 
      }
    }
    
    if (type === "live") {
      router.push(`/(main)/competition/live/${comp.id}?scrollToEntries=true` as any);
    } else {
      router.push(`/(main)/competition/upcoming/${comp.id}` as any);
    }
  }, [comp.id, type]);

  const animatedStyle = {
    opacity: fadeAnim,
    transform: [
      {
        scale: scaleAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1],
        }),
      },
    ],
  };

  return (
    <Animated.View style={[styles.compCard, animatedStyle]}>
      <Image source={comp.image} style={styles.compCardImage} resizeMode="cover" />
      <View style={styles.compCardContent}>
        <Text style={styles.compCardTitle} numberOfLines={2}>{comp.title}</Text>
        <View style={styles.compCardDetails}>
          {type === "live" ? (
            <>
              <View style={styles.compDetailItem}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Circle cx="12" cy="12" r="10" stroke="#EC9A15" strokeWidth={2}/>
                  <Path d="M12 6v6l4 2" stroke="#EC9A15" strokeWidth={2} strokeLinecap="round"/>
                </Svg>
                <Text style={styles.compDetailText}>{comp.endDate}</Text>
              </View>
              <View style={styles.compDetailItem}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#EC9A15" strokeWidth={2}/>
                  <Circle cx="9" cy="7" r="4" stroke="#EC9A15" strokeWidth={2}/>
                  <Path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="#EC9A15" strokeWidth={2}/>
                </Svg>
                <Text style={styles.compDetailText}>{comp.participants} joined</Text>
              </View>
            </>
          ) : (
            <View style={styles.compDetailItem}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Rect x="3" y="4" width="18" height="18" rx="2" stroke="#EC9A15" strokeWidth={2}/>
                <Path d="M16 2v4M8 2v4M3 10h18" stroke="#EC9A15" strokeWidth={2}/>
              </Svg>
              <Text style={styles.compDetailText}>Starts: {comp.startDate}</Text>
            </View>
          )}
        </View>
        <View style={styles.compCardFooter}>
          <View style={styles.prizeTag}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
              <Path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M18 2H6v7a6 6 0 0 0 12 0V2z" stroke="#FFD700" strokeWidth={2}/>
            </Svg>
            <Text style={styles.prizeText}>{comp.prize}</Text>
          </View>
          <TouchableOpacity 
            style={type === "live" ? styles.voteBtn : styles.joinBtn}
            activeOpacity={0.8}
            onPress={handlePress}
          >
            <Text style={type === "live" ? styles.voteBtnText : styles.joinBtnText}>
              {type === "live" ? "Vote Now" : "Join Now"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
});

CompetitionCard.displayName = 'CompetitionCard';

export default function CategoryDetailScreen() {
  const params = useLocalSearchParams();
  const { id, tab } = params;
  // Category ids are backend ObjectId strings.
  const categoryId = Array.isArray(id) ? String(id[0]) : String(id || "");
  const [category, setCategory] = useState(defaultCategoryData);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState(tab === "reels" ? "reels" : "competitions");

  
  // Header comes from the fixed talent list; the backend only supplies a banner when ids match.
  useEffect(() => {
    const applyLocal = (banner?: string) => {
      const local = matchTalent(categoryId);
      if (!local) return;
      setCategory({
        name: local.name,
        tagline: local.tagline,
        description: local.description,
        banner: banner ? { uri: banner } : require("@assets/images/carousel1.png"),
      });
    };
    applyLocal();
    const fetchCategoryData = async () => {
      try {
        const data = await getCategories(1, 50);
        setAllCategories(data.categories);
        const found = data.categories.find((cat) => cat.id === categoryId);
        if (found) {
          const local = matchTalent(found.label);
          setCategory({
            name: local?.name || found.label,
            tagline: local?.tagline || found.tagline || `${found.label} on Gully Fame`,
            description: local?.description || found.description || `Explore ${found.label}`,
            banner: found.banner ? { uri: found.banner } : require("@assets/images/carousel1.png"),
          });
        }
      } catch {
        // Keep the local header; the rest of the screen still works.
      }
    };

    fetchCategoryData();
  }, [categoryId]);
  
  useEffect(() => {
    if (tab === "reels") {
      setActiveTab("reels");
    }
  }, [tab]);
  // Competitions and reels in this category (N1).
  const [liveCompetitions, setLiveCompetitions] = useState<CategoryComp[]>([]);
  const [upcomingCompetitions, setUpcomingCompetitions] = useState<CategoryComp[]>([]);
  const [pastCompetitions, setPastCompetitions] = useState<CategoryComp[]>([]);
  const [sampleReels, setSampleReels] = useState<CategoryReel[]>([]);
  const [listsError, setListsError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // Loading until the lists for this category (and retry) have arrived.
  const listsKey = `${categoryId}:${reloadKey}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const listsLoading = loadedKey !== listsKey;

  useEffect(() => {
    if (!categoryId) return;
    let cancelled = false;
    // Talent keys (e.g. "fashion") are sent as their display name; backend ids are sent as is.
    const query = matchTalent(categoryId)?.name || categoryId;
    (async () => {
      try {
        const comps = await listCompetitionsByCategory(query);
        if (cancelled) return;
        const live = comps.filter((c) => c.normalizedStatus === "LIVE");
        setLiveCompetitions(live.map(toCard));
        setUpcomingCompetitions(comps.filter((c) => c.normalizedStatus === "UPCOMING").map(toCard));
        setPastCompetitions(comps.filter((c) => c.normalizedStatus === "ENDED").map(toCard));

        // Reels: the latest entries of up to 3 live competitions in this category.
        const pages = await Promise.all(
          live.slice(0, 3).map((c) => getCompetitionReels(String(c._id), null, 12).catch(() => null))
        );
        if (cancelled) return;
        const reels: CategoryReel[] = [];
        pages.forEach((p) =>
          p?.reels.forEach((r) =>
            reels.push({
              id: String(r._id),
              competitionId: p.competitionId,
              thumbnail: r.thumbnail_url ? { uri: r.thumbnail_url } : PLACEHOLDER_IMAGE,
              votes: r.stats?.votes || 0,
            })
          )
        );
        setSampleReels(reels.sort((a, b) => b.votes - a.votes).slice(0, 24));
        setListsError(false);
      } catch {
        if (!cancelled) setListsError(true);
      } finally {
        if (!cancelled) setLoadedKey(listsKey);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [categoryId, listsKey]);

  const [isFollowing, setIsFollowing] = useState(false);
  const talentKey = matchTalent(category.name)?.key;
  useEffect(() => {
    if (!talentKey) return;
    getFollowedCategories().then((list) => setIsFollowing(list.includes(talentKey)));
  }, [talentKey]);
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryId);
  const [statusFilter, setStatusFilter] = useState<"live" | "past" | "upcoming" | "all">("all");
  
  
  const handleFilterChange = React.useCallback((status: "live" | "past" | "upcoming" | "all") => {
    setStatusFilter(status);
  }, []);
  
  const handleTabChange = React.useCallback((tabName: string) => {
    setActiveTab(tabName);
  }, []);
  
  
  const [liveDotBlink] = React.useState(() => new Animated.Value(1));
  
  React.useEffect(() => {
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
    blinkAnimation.start();
    return () => blinkAnimation.stop();
  }, [liveDotBlink]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2610" />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {}
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => safeBack("/(main)/home")} style={styles.backButton}>
            <ChevronLeft size={28} color="#fff" />
          </TouchableOpacity>

          {/* Category switcher: the name itself is the button. */}
          <TouchableOpacity
            style={styles.categoryDropdown}
            onPress={() => setFilterVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={`${category.name}. Change category`}
          >
            <Text style={styles.categoryDropdownText} numberOfLines={1}>{category.name}</Text>
            <ChevronDown size={18} color={colors.accent} strokeWidth={2.2} />
          </TouchableOpacity>

          <View style={{ width: 44 }} />
        </View>

        {}
        <ImageBackground
          source={category.banner}
          style={styles.heroSection}
          resizeMode="cover"
        >
          {/* Darkens slightly for the text, then melts into the page colour (no hard edge). */}
          <LinearGradient
            colors={["rgba(60, 38, 16, 0.15)", "rgba(60, 38, 16, 0.55)", "#3C2610"]}
            locations={[0, 0.55, 1]}
            style={styles.heroOverlay}
          >
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle} numberOfLines={1}>{category.name}</Text>
              {category.tagline ? (
                <Text style={styles.heroTagline} numberOfLines={2}>{category.tagline}</Text>
              ) : null}
              <TouchableOpacity
                style={[styles.followBtn, isFollowing && styles.followingBtn]}
                onPress={() => {
                  const next = !isFollowing;
                  setIsFollowing(next);
                  if (talentKey) setCategoryFollowed(talentKey, next);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: isFollowing }}
              >
                {isFollowing ? (
                  <Check size={16} color={colors.text} strokeWidth={2.4} />
                ) : (
                  <Plus size={16} color="#1A1A1A" strokeWidth={2.4} />
                )}
                <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]} numberOfLines={1}>
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </ImageBackground>

        {}
        <View style={styles.tabButtons}>
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => handleTabChange("competitions")}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "competitions" }}
          >
            <Text style={[styles.tabButtonText, activeTab === "competitions" && styles.tabButtonTextActive]}>
              Competitions
            </Text>
            <View style={[styles.tabUnderline, activeTab === "competitions" && styles.tabUnderlineActive]} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => handleTabChange("reels")}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "reels" }}
          >
            <Text style={[styles.tabButtonText, activeTab === "reels" && styles.tabButtonTextActive]}>
              Reels
            </Text>
            <View style={[styles.tabUnderline, activeTab === "reels" && styles.tabUnderlineActive]} />
          </TouchableOpacity>
        </View>

        {}
        {activeTab === "competitions" && (
          <View style={styles.filterContainer}>
            <View style={styles.filterRow}>
              {(["all", "live", "upcoming", "past"] as const).map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
                  onPress={() => handleFilterChange(status)}
                  activeOpacity={0.7}
                >
                  {status === "live" && <Animated.View style={[styles.liveIndicator, { opacity: liveDotBlink }]} />}
                  <Text style={[styles.filterChipText, statusFilter === status && styles.filterChipTextActive]} numberOfLines={1}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {}
        {activeTab === "competitions" ? (
          <View style={styles.content}>
            {(() => {
              
              let filteredComps: any[] = [];
              
              if (statusFilter === "live") {
                filteredComps = liveCompetitions.map(comp => ({ ...comp, type: "live" }));
              } else if (statusFilter === "upcoming") {
                filteredComps = upcomingCompetitions.map(comp => ({ ...comp, type: "upcoming" }));
              } else if (statusFilter === "past") {
                filteredComps = pastCompetitions.map(comp => ({ ...comp, type: "past" }));
              } else {
                
                filteredComps = [
                  ...liveCompetitions.map(comp => ({ ...comp, type: "live" })),
                  ...upcomingCompetitions.map(comp => ({ ...comp, type: "upcoming" })),
                  ...pastCompetitions.map(comp => ({ ...comp, type: "past" })),
                ];
              }


              if (filteredComps.length === 0) {
                if (listsLoading) {
                  return (
                    <SkeletonCards count={3} />
                  );
                }
                return (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIcon}>
                      <Trophy size={22} color={colors.accent} strokeWidth={1.8} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.emptyStateText}>
                        {listsError
                          ? "Couldn't load competitions"
                          : statusFilter === "all"
                            ? `No ${category.name} competitions yet`
                            : `No ${statusFilter} ${category.name} competitions`}
                      </Text>
                      <Text style={styles.emptyStateSubtext}>
                        {listsError
                          ? "Check your connection and try again."
                          : "Follow this category and new competitions will show up here."}
                      </Text>
                      <TouchableOpacity
                        accessibilityRole="button"
                        style={styles.emptyButton}
                        onPress={() =>
                          listsError
                            ? setReloadKey((k) => k + 1)
                            : router.push("/(main)/competitions/upcoming" as any)
                        }
                      >
                        <Text style={styles.emptyButtonText}>{listsError ? "Try again" : "See all competitions"}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }

              
              const liveComps = filteredComps.filter(c => c.type === "live");
              const upcomingComps = filteredComps.filter(c => c.type === "upcoming");
              const pastComps = filteredComps.filter(c => c.type === "past");

              return (
                <>
                  {liveComps.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleRow}>
                          <Animated.View style={[styles.liveDot, { opacity: liveDotBlink }]} />
                          <Text style={styles.sectionTitle}>Live Competitions</Text>
                        </View>
                      </View>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pastCompScroll}>
                        {liveComps.map((comp) => (
                          <TouchableOpacity 
                            key={comp.id} 
                            style={styles.compCardNew}
                            activeOpacity={0.9}
                            onPress={() => router.push(`/(main)/competition/live/${comp.id}?scrollToEntries=true` as any)}
                          >
                            <Image source={comp.image} style={styles.compCardImageNew} resizeMode="cover" />
                            <View style={styles.compCardContentNew}>
                              <Text style={styles.compCardTitleNew} numberOfLines={2}>{comp.title}</Text>
                              <View style={styles.compCardDetailsNew}>
                                <View style={styles.compDetailItemNew}>
                                  <Clock size={14} color={colors.accent} strokeWidth={2} />
                                  <Text style={styles.compDetailTextNew}>{comp.endDate}</Text>
                                </View>
                                <View style={styles.compDetailItemNew}>
                                  <Users size={14} color={colors.accent} strokeWidth={2} />
                                  <Text style={styles.compDetailTextNew}>{comp.participants} joined</Text>
                                </View>
                              </View>
                              <View style={styles.compCardFooterNew}>
                                <View style={styles.prizeRowNew}>
                                  <Trophy size={16} color={colors.accent} strokeWidth={2} />
                                  <Text style={styles.compPrizeTextNew}>{comp.prize}</Text>
                                </View>
                                <TouchableOpacity 
                                  style={styles.voteBtnNew}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    router.push(`/(main)/competition/live/${comp.id}?scrollToEntries=true` as any);
                                  }}
                                >
                                  <Text style={styles.voteBtnTextNew}>Vote</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {upcomingComps.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Upcoming Competitions</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pastCompScroll}>
                        {upcomingComps.map((comp) => (
                          <TouchableOpacity 
                            key={comp.id} 
                            style={styles.compCardNew}
                            activeOpacity={0.9}
                            onPress={() => {
                              
                              router.push(`/(main)/competition/upcoming/${comp.id}` as any);
                            }}
                          >
                            <Image source={comp.image} style={styles.compCardImageNew} resizeMode="cover" />
                            <View style={styles.compCardContentNew}>
                              <Text style={styles.compCardTitleNew} numberOfLines={2}>{comp.title}</Text>
                              <View style={styles.compCardDetailsNew}>
                                <View style={styles.compDetailItemNew}>
                                  <CalendarDays size={14} color={colors.accent} strokeWidth={2} />
                                  <Text style={styles.compDetailTextNew}>Starts {comp.startDate}</Text>
                                </View>
                              </View>
                              <View style={styles.compCardFooterNew}>
                                <View style={styles.prizeRowNew}>
                                  <Trophy size={16} color={colors.accent} strokeWidth={2} />
                                  <Text style={styles.compPrizeTextNew}>{comp.prize}</Text>
                                </View>
                                <TouchableOpacity 
                                  style={styles.joinBtnNew}
                                  onPress={async (e) => {
                                    e.stopPropagation();
                                    
                                    const { validateKycBeforeCompetition } = await import('@utils/kycValidation');
                                    const isValid = await validateKycBeforeCompetition();
                                    if (!isValid) {
                                      return; 
                                    }
                                    
                                    router.push(`/(main)/competition/upcoming/${comp.id}` as any);
                                  }}
                                >
                                  <Text style={styles.joinBtnTextNew}>Join</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {pastComps.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Past Competitions</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pastCompScroll}>
                        {pastComps.map((comp) => (
                          <TouchableOpacity 
                            key={comp.id} 
                            style={styles.compCardNew}
                            activeOpacity={0.9}
                            onPress={() => router.push(`/(main)/competition/past/${comp.id}` as any)}
                          >
                            <Image source={comp.image} style={styles.compCardImageNew} resizeMode="cover" />
                            <View style={styles.compCardContentNew}>
                              <Text style={styles.compCardTitleNew} numberOfLines={2}>{comp.title}</Text>
                              <View style={styles.compCardDetailsNew}>
                                <View style={styles.compDetailItemNew}>
                                  <Award size={14} color={colors.accent} strokeWidth={2} />
                                  <Text style={styles.compDetailTextNew}>Ended · {comp.participants} joined</Text>
                                </View>
                              </View>
                              <View style={styles.compCardFooterNew}>
                                <View style={styles.prizeRowNew}>
                                  <Trophy size={16} color={colors.accent} strokeWidth={2} />
                                  <Text style={styles.compPrizeTextNew}>{comp.prize}</Text>
                                </View>
                                <TouchableOpacity 
                                  style={styles.resultsBtnNew}
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    router.push(`/(main)/competition/past/${comp.id}` as any);
                                  }}
                                >
                                  <Text style={styles.resultsBtnTextNew}>Results</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </>
              );
            })()}

            {}
            {topPerformers.length > 0 && (
            <View style={styles.section}>
              <View style={[styles.sectionHeader, { justifyContent: 'center', width: '100%' }]}>
                <Text style={[styles.sectionTitle, { textAlign: 'center', width: '100%' }]}>Top performers this week</Text>
              </View>
              <View style={styles.topDancersContainer}>
                {}
                {topPerformers
                  .filter((d) => d.rank === 2)
                  .map((dancer) => {
                    return (
                      <TouchableOpacity 
                        key={dancer.rank} 
                        style={styles.topDancerSide}
                        onPress={() => {
                          
                          const userId = dancer.userId || `performer${dancer.rank}`;
                          const firstName = dancer.firstName || dancer.name?.split(' ')[0] || dancer.name || 'User';
                          const lastName = dancer.lastName || dancer.name?.split(' ').slice(1).join(' ') || '';
                          router.push({
                            pathname: "/(main)/profile/[id]",
                            params: {
                              id: userId,
                              userId: userId,
                              firstName: firstName,
                              lastName: lastName,
                              role: dancer.role || "participants",
                              bio: dancer.bio || "",
                            }
                          } as any);
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={styles.dancerImageWrapper}>
                          <Image
                            source={dancer.image}
                            style={styles.dancerImageSide}
                          />
                          <View style={styles.rankBadge}>
                            <Text style={styles.rankBadgeText}>{dancer.rank}</Text>
                          </View>
                        </View>
                        <Text style={styles.dancerName} numberOfLines={1}>
                          {dancer.name}
                        </Text>
                        <Text style={styles.dancerPoints}>{dancer.points} pts</Text>
                        <View style={styles.followButtonSmall}>
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                {}
                {topPerformers
                  .filter((d) => d.rank === 1)
                  .map((dancer) => {
                    const nameParts = dancer.name?.split(' ') || [];
                    const firstName = nameParts[0] || dancer.name || 'User';
                    const lastName = nameParts.slice(1).join(' ') || '';
                    return (
                      <TouchableOpacity 
                        key={dancer.rank} 
                        style={styles.topDancerCenter}
                        onPress={() => {
                          router.push({
                            pathname: "/(main)/profile/[id]",
                            params: {
                              id: dancer.userId || `performer${dancer.rank}`,
                              userId: dancer.userId || `performer${dancer.rank}`,
                              firstName: firstName,
                              lastName: lastName,
                              role: "participants",
                              bio: "",
                            }
                          } as any);
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={styles.dancerImageWrapper}>
                          {}
                          <View style={styles.starIconWrapper}>
                            <Image
                              source={require("@assets/images/star.png")}
                              style={styles.starIcon}
                              resizeMode="contain"
                            />
                          </View>
                          <Image
                            source={dancer.image}
                            style={styles.dancerImageCenter}
                          />
                          <View style={styles.rankBadgeLarge}>
                            <Text style={styles.rankBadgeTextLarge}>
                              {dancer.rank}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.dancerNameCenter} numberOfLines={1}>
                          {dancer.name}
                        </Text>
                        <Text style={styles.dancerPointsCenter}>{dancer.points} pts</Text>
                        <View style={styles.followButtonCenter}>
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                {}
                {topPerformers
                  .filter((d) => d.rank === 3)
                  .map((dancer) => {
                    return (
                      <TouchableOpacity 
                        key={dancer.rank} 
                        style={styles.topDancerSide}
                        onPress={() => {
                          
                          const userId = dancer.userId || `performer${dancer.rank}`;
                          const firstName = dancer.firstName || dancer.name?.split(' ')[0] || dancer.name || 'User';
                          const lastName = dancer.lastName || dancer.name?.split(' ').slice(1).join(' ') || '';
                          router.push({
                            pathname: "/(main)/profile/[id]",
                            params: {
                              id: userId,
                              userId: userId,
                              firstName: firstName,
                              lastName: lastName,
                              role: dancer.role || "participants",
                              bio: dancer.bio || "",
                            }
                          } as any);
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={styles.dancerImageWrapper}>
                          <Image
                            source={dancer.image}
                            style={styles.dancerImageSide}
                          />
                          <View style={styles.rankBadge}>
                            <Text style={styles.rankBadgeText}>{dancer.rank}</Text>
                          </View>
                        </View>
                        <Text style={styles.dancerName} numberOfLines={1}>
                          {dancer.name}
                        </Text>
                        <Text style={styles.dancerPoints}>{dancer.points} pts</Text>
                        <View style={styles.followButtonSmall}>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </View>
            )}
          </View>
        ) : (
          <View style={styles.content}>
            {sampleReels.length === 0 && listsLoading && (
              <SkeletonGrid count={6} columns={2} />
            )}
            {sampleReels.length === 0 && !listsLoading && (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Film size={22} color={colors.accent} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.emptyStateText}>No {category.name} entries yet</Text>
                  <Text style={styles.emptyStateSubtext}>Competition entries in this category show up here.</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.emptyButton}
                    onPress={() => router.push("/(main)/reel" as any)}
                  >
                    <Text style={styles.emptyButtonText}>Watch GullyReel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <View style={styles.reelsGrid}>
              {sampleReels.map((reel) => (
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open reel" 
                  key={reel.id} 
                  style={styles.reelCard}
                  onPress={() => router.push(`/(main)/reel?startReelId=${reel.id}&competitionId=${reel.competitionId}&from=category` as any)}
                  activeOpacity={0.9}
                >
                  <Image source={reel.thumbnail} style={styles.reelImage} />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.reelGradient}
                  >
                    <View style={styles.reelStats}>
                      <View style={styles.reelStat}>
                        <Ionicons name="flame" size={13} color="#EC9A15" />
                        <Text style={styles.reelStatText}>{reel.votes.toLocaleString("en-IN")}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {}
      {/* Category switcher: a bottom sheet listing every talent category. */}
      <Modal
        visible={filterVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFilterVisible(false)} />
        <View style={styles.filterPopup}>
          <View style={styles.sheetGrabber} />
          <Text style={styles.filterHeaderText}>Categories</Text>
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {TALENT_CATEGORIES.map((t) => {
              const backend = allCategories.find((b) => matchTalent(b.label)?.key === t.key);
              const id = String(backend?.id ?? t.key);
              const active = String(selectedCategoryId) === id || talentKey === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.filterOption, active && styles.filterOptionActive]}
                  onPress={() => {
                    setFilterVisible(false);
                    if (active) return;
                    setSelectedCategoryId(id);
                    router.replace(`/(main)/category/${id}` as any);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <View style={[styles.filterOptionIcon, active && styles.filterOptionIconActive]}>
                    <MaterialCommunityIcons name={t.icon} size={22} color={active ? "#1A1A1A" : colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.filterOptionText, active && styles.filterOptionTextActive]}>{t.name}</Text>
                    <Text style={styles.filterOptionSub} numberOfLines={1}>{t.tagline}</Text>
                  </View>
                  {active ? <Check size={20} color={colors.accent} strokeWidth={2.5} /> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetGrabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: space.sm },
  filterOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  filterOptionIconActive: { backgroundColor: colors.accent },
  filterOptionSub: { fontSize: 13, color: colors.textMuted, fontFamily: font.regular, marginTop: 1 },
  followingBtnText: { color: colors.text },
  tabUnderline: { height: 2, alignSelf: "stretch", borderRadius: 1, backgroundColor: "transparent" },
  tabUnderlineActive: { backgroundColor: colors.accent },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    justifyContent: "center",
  },
  emptyButtonText: { color: "#1A1A1A", fontSize: 13, fontFamily: font.semibold },
  container: {
    flex: 1,
    backgroundColor: "#3C2610",
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.sm, paddingTop: 44, paddingBottom: space.sm },
  backButton: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  categoryDropdown: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 44 },
  categoryDropdownText: { flexShrink: 1, color: colors.text, fontSize: 20, fontFamily: font.titleMedium },
  heroSection: { width: width, height: height * 0.26 },
  heroOverlay: { flex: 1, justifyContent: "flex-end", paddingHorizontal: space.lg, paddingBottom: space.lg },
  heroContent: { alignItems: "flex-start" },
  heroTitle: { alignSelf: "stretch", fontSize: 30, color: colors.text, fontFamily: font.title },
  heroTagline: { fontSize: 14, lineHeight: 20, color: colors.textBody, fontFamily: font.regular, marginTop: 2, marginBottom: space.md },
  followBtn: { flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingHorizontal: 14, borderRadius: radius.sm, backgroundColor: colors.accent, borderWidth: 1, borderColor: colors.accent },
  followingBtn: { backgroundColor: "rgba(0, 0, 0, 0.35)", borderColor: "rgba(255, 255, 255, 0.35)" },
  followBtnText: { color: "#1A1A1A", fontSize: 14, fontFamily: font.semibold, includeFontPadding: false },
  statsSection: {
    flexDirection: "row",
    backgroundColor: "#40301F",
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statItemCenter: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#3a3a3a",
  },
  statNumber: {
    fontSize: 15,
    color: "#EC9A15",
    marginTop: 5,
  },
  statLabel: {
    fontSize: 10,
    color: "#999",
    marginTop: 2,
  },
  tabButtons: { flexDirection: "row", paddingHorizontal: space.lg, gap: space.xl, borderBottomWidth: 1, borderBottomColor: "rgba(255, 255, 255, 0.08)" },
  tabButton: { alignItems: "center", paddingTop: space.sm },
  tabButtonActive: {},
  tabButtonText: { fontSize: 15, color: colors.textMuted, fontFamily: font.semibold, includeFontPadding: false, paddingBottom: 10 },
  tabButtonTextActive: { color: colors.text },
  content: { paddingTop: space.lg },
  section: { marginBottom: space.xl, paddingHorizontal: space.lg },
  sectionHeader: { marginBottom: space.md },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF3B30",
    marginTop: 2,
  },
  sectionTitle: { fontSize: 16, color: colors.text, fontFamily: font.semibold, marginBottom: space.md },
  compCard: {
    backgroundColor: "#40301F",
    borderRadius: 10,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compCardImage: {
    width: "100%",
    height: 200,
  },
  compCardContent: {
    padding: 9,
  },
  compCardTitle: {
    fontSize: 20,
    color: "#fff",
    marginBottom: 7,
    marginTop: 7,
    lineHeight: 26,
    fontWeight: "bold",
  },
  compCardDetails: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 7,
    flexWrap: "wrap",
  },
  compDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  compDetailText: {
    fontSize: 11,
    color: "#ccc",
  },
  compCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 3,
  },
  prizeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255, 215, 0, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 12,
  },
  prizeText: {
    fontSize: 13,
    color: "#FFD700",
  },
  voteBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EC9A15",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: "#EC9A15",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  voteBtnText: {
    textAlign: "center",
    includeFontPadding: false,
    color: "#fff",
    fontSize: 13,
  },
  joinBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(236, 154, 21, 0.15)",
    borderWidth: 1.5,
    borderColor: "#EC9A15",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  joinBtnText: {
    textAlign: "center",
    includeFontPadding: false,
    color: "#EC9A15",
    fontSize: 13,
  },
  pastCompScroll: { gap: space.md, paddingRight: space.lg },
  pastCompCard: {
    width: width * 0.6,
    height: 280,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#2a2a2a",
  },
  pastCompImage: {
    width: "100%",
    height: "100%",
  },
  pastCompGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    padding: 16,
    justifyContent: "flex-end",
  },
  pastCompTitle: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 8,
  },
  winnerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  winnerText: {
    fontSize: 13,
    color: "#ccc",
  },
  prizeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  pastCompPrize: {
    fontSize: 15,
    color: "#EC9A15",
  },
  resultsBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  resultsBtnText: {
    color: "#fff",
    fontSize: 13,
  },
  
  topDancersContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    gap: width * 0.04,
    paddingVertical: 15,
    paddingHorizontal: width * 0.02,
    marginTop: 30,
  },
  topDancerSide: {
    alignItems: "center",
    flex: 1,
  },
  topDancerCenter: {
    alignItems: "center",
    flex: 1,
    marginBottom: 20,
  },
  dancerImageWrapper: {
    position: "relative",
    marginBottom: 6,
  },
  
  dancerImageSide: {
    width: width * 0.24,
    height: width * 0.24,
    borderRadius: width * 0.5,
    borderWidth: 2.5,
    borderColor: "#EC9A15",
  },
  
  dancerImageCenter: {
    width: width * 0.28,
    height: width * 0.28,
    borderRadius: width * 0.14,
    borderWidth: 2.5,
    borderColor: "#EC9A15",
  },
  starIconWrapper: {
    position: "absolute",
    top: -45,
    alignSelf: "center",
    zIndex: 10,
  },
  starIcon: {
    width: 50,
    height: 60,
  },
  rankBadge: {
    position: "absolute",
    top: 80,
    left: 30,
    backgroundColor: "#EC9A15",
    width: width * 0.08,
    height: width * 0.08,
    borderRadius: width * 0.050,
    justifyContent: "center",
    alignItems: "center",
  },
  rankBadgeLarge: {
    position: "absolute",
    top: 95,
    left: 40,
    backgroundColor: "#EC9A15",
    width: width * 0.08,
    height: width * 0.08,
    borderRadius: width * 0.050,
    justifyContent: "center",
    alignItems: "center",
  },
  rankBadgeText: {
    color: "#fff",
    fontSize: width * 0.028,
    fontWeight: "700",
  },
  rankBadgeTextLarge: {
    color: "#fff",
    fontSize: width * 0.035,
    fontWeight: "700",
  },
  dancerName: {
    color: "#fff",
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 2,
    fontWeight: "700",
  },
  dancerNameCenter: {
    color: "#fff",
    fontSize: 15,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 2,
    fontWeight: "700",
  },
  dancerPoints: {
    color: "#fff",
    fontSize: 11,
    textAlign: "center",
    marginBottom: 6,
    fontWeight: "400",
  },
  dancerPointsCenter: {
    color: "#fff",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "400",
  },
  followButtonSmall: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  followButtonSmallText: {
    textAlign: "center",
    includeFontPadding: false,
    color: "#fff",
    fontSize: width * 0.025,
  },
  followButtonCenter: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  followButtonCenterText: {
    textAlign: "center",
    includeFontPadding: false,
    color: "#000",
    fontSize: width * 0.028,
  },
  reelsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 10,
  },
  reelCard: {
    width: (width - 50) / 2,
    height: 260,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#2a2a2a",
    marginBottom: 10,
  },
  reelImage: {
    width: "100%",
    height: "100%",
  },
  reelGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  reelStats: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 6,
  },
  reelStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reelStatText: {
    fontSize: 11,
    color: "#fff",
  },
  reelCreator: {
    fontSize: 12,
    color: "#fff",
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.55)" },
  filterPopup: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "75%", backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderTopWidth: 1, borderColor: colors.cardBorder, paddingTop: space.sm, paddingBottom: space.xl },
  filterHeader: {},
  filterHeaderText: { color: colors.text, fontSize: 20, fontFamily: font.titleMedium, paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.md },
  filterOption: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.xl, paddingVertical: 10 },
  filterOptionActive: { backgroundColor: "rgba(236, 154, 21, 0.08)" },
  filterOptionText: { fontSize: 16, color: colors.text, fontFamily: font.semibold },
  filterOptionTextActive: { color: colors.accent },
  filterContainer: { paddingTop: space.md, paddingHorizontal: space.lg },
  filterRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: "rgba(255, 255, 255, 0.08)" },
  filterChipActive: { backgroundColor: colors.accent },
  filterChipText: { fontSize: 13, color: colors.textBody, fontFamily: font.semibold, includeFontPadding: false },
  filterChipTextActive: { color: "#1A1A1A" },
  liveIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FF3B30" },
  emptyState: { flexDirection: "row", gap: space.md, marginHorizontal: space.lg, padding: 14, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: "rgba(236, 154, 21, 0.25)" },
  emptyStateText: { fontSize: 15, color: colors.text, fontFamily: font.semibold },
  emptyStateSubtext: { fontSize: 13, lineHeight: 18, color: colors.textBody, fontFamily: font.regular, marginTop: 2 },
  
  compCardNew: { width: width * 0.72, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.card, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.06)" },
  compCardImageNew: { width: "100%", height: 190 },
  compCardContentNew: { padding: space.md },
  compCardTitleNew: { fontSize: 16, lineHeight: 21, color: colors.text, fontFamily: font.semibold, marginBottom: 6 },
  compCardDetailsNew: { flexDirection: "row", flexWrap: "wrap", gap: space.md, marginBottom: space.md },
  compDetailItemNew: { flexDirection: "row", alignItems: "center", gap: 5 },
  compDetailTextNew: { fontSize: 12, color: colors.textBody, fontFamily: font.regular },
  compCardFooterNew: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  prizeRowNew: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  compPrizeTextNew: { fontSize: 14, color: colors.accent, fontFamily: font.semibold },
  voteBtnNew: { alignItems: "center", justifyContent: "center", height: 32, paddingHorizontal: 16, borderRadius: radius.sm, backgroundColor: colors.accent },
  voteBtnTextNew: { color: "#1A1A1A", fontSize: 13, fontFamily: font.semibold, includeFontPadding: false },
  joinBtnNew: { alignItems: "center", justifyContent: "center", height: 32, paddingHorizontal: 16, borderRadius: radius.sm, backgroundColor: colors.accent },
  joinBtnTextNew: { color: "#1A1A1A", fontSize: 13, fontFamily: font.semibold, includeFontPadding: false },
  resultsBtnNew: { alignItems: "center", justifyContent: "center", height: 32, paddingHorizontal: 16, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line },
  resultsBtnTextNew: { color: colors.text, fontSize: 13, fontFamily: font.semibold, includeFontPadding: false },
});
