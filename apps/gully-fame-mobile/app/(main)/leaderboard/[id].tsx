import { router, useLocalSearchParams } from "expo-router";
import { safeIdParam } from "@/utils/routeParams";
import { openOwnProfile } from "@/utils/openProfile";
import { useState, useEffect, useCallback } from "react";
import { LeaderboardStyles as styles } from "@/components/TopTenLeaderboard/styles";
import {
  Image,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator
} from "react-native";
import BottomNav from "@components/layout/BottomNav";
import {
  BackIcon,
  CommunityIcon,
  HomeIcon,
  ReelIcon,
  UserIconSVG,
} from "@/icons";
import Svg, { Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from '@expo/vector-icons';
import { getLeaderboard, LeaderboardRow } from "@/api/services/competitionService";
import { getErrorMessage } from "@/api/client";
import { toastError } from "@/components/ui/Toast";
import { SkeletonLoader } from "@/components/Skeleton";


const tabs = [
  { name: "Home", icon: HomeIcon, label: "" },
  { name: "Reel", icon: ReelIcon, label: "GullyReel" },
  { name: "Upload", icon: null, label: "UPLOAD" },
  { name: "Community", icon: CommunityIcon, label: "" },
  { name: "MyFame", icon: UserIconSVG, label: "" },
];

export default function MyFameScreen() {
  const params = useLocalSearchParams();
  const competitionId = safeIdParam(params.id);

  const [activeTab, setActiveTab] = useState("Home");
  const [isLoading, setIsLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);

  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const toRows = (rows: LeaderboardRow[]) =>
    rows.map((entry) => {
      const [firstName, ...rest] = (entry.name || "").split(" ");
      return {
        rank: entry.rank,
        isTop: entry.rank <= 3,
        name: entry.name || "Participant",
        firstName: firstName || "",
        lastName: rest.join(" "),
        role: "participants",
        userId: entry.id,
        isYou: !!entry.isCurrentUser,
        points: entry.points ?? entry.votes ?? 0,
        avatarUrl: entry.profilePictureUrl || "",
        profileImage: entry.profilePictureUrl ? { uri: entry.profilePictureUrl } : require("@assets/images/user1.png"),
      };
    });

  // GET /competitions/:id/leaderboard?page&limit (ranked by votes).
  const loadPage = useCallback(
    async (nextPage: number) => {
      const res = await getLeaderboard(competitionId, nextPage, 20);
      setLeaderboardData((prev) => (nextPage === 1 ? toRows(res.leaderboard) : [...prev, ...toRows(res.leaderboard)]));
      setPage(nextPage);
      setHasMore(res.hasMore);
    },
    [competitionId]
  );

  const initialLoad = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      await loadPage(1);
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [loadPage]);

  useEffect(() => {
    if (competitionId) initialLoad();
  }, [competitionId, initialLoad]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      await loadPage(page + 1);
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
      setLoadingMore(false);
    }
  };

  const topThree = leaderboardData.filter((item) => item.isTop);
  const restOfList = leaderboardData.filter((item) => !item.isTop);

  if (isLoading || loadError) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center", padding: 24 }]}>
        <StatusBar barStyle="light-content" />
        {isLoading ? (
          <SkeletonLoader style={{ alignSelf: "stretch" }} />
        ) : (
          <>
            <Text style={{ color: "#ccc", textAlign: "center" }}>{loadError}</Text>
            <TouchableOpacity onPress={initialLoad} style={{ marginTop: 16 }}>
              <Text style={{ color: "#EC9A15", fontSize: 16 }}>Retry</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <BackIcon color="white" size={24} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Leaderboard</Text>
        
        <TouchableOpacity onPress={() => router.push("/(main)/invite-friend" as any)} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="gift-outline" size={26} color="#EC9A15" />
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        🔥 Who's ruling the gullies right now?
      </Text>

      {leaderboardData.length === 0 ? (
         <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
             <Text style={{ color: '#999', fontSize: 16 }}>No rankings available yet.</Text>
         </View>
      ) : (
      <>
        <View style={styles.podiumContainer}>
            <View style={styles.topThreeContainer}>
            
            {topThree[1] && (
                <TouchableOpacity
                style={styles.podiumItem}
                onPress={() =>
                    router.push({
                    pathname: "/(main)/profile/[id]",
                    params: {
                        id: topThree[1].userId,
                        userId: topThree[1].userId,
                        firstName: topThree[1].firstName,
                        lastName: topThree[1].lastName,
                        role: topThree[1].role,
                        bio: topThree[1].bio,
                    },
                    } as any)
                }
                activeOpacity={0.8}
                >
                <View style={styles.avatarContainer}>
                    <Image source={topThree[1].profileImage} style={styles.avatar} />
                    <LinearGradient
                    colors={["#C0C0C0", "#A8A8A8"]}
                    style={[styles.rankBadgeCircle, styles.rankBadge2]}
                    >
                    <Text style={styles.rankBadgeText}>2</Text>
                    </LinearGradient>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>{topThree[1].name}</Text>
                <View style={styles.pointsRow}>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#C0C0C0" />
                    </Svg>
                    <Text style={styles.podiumPoints}>{topThree[1].points}</Text>
                </View>
                </TouchableOpacity>
            )}

            {topThree[0] && (
                <TouchableOpacity
                style={[styles.podiumItem, styles.podiumFirst]}
                onPress={() =>
                    router.push({
                    pathname: "/(main)/profile/[id]",
                    params: {
                        id: topThree[0].userId,
                        userId: topThree[0].userId,
                        firstName: topThree[0].firstName,
                        lastName: topThree[0].lastName,
                        role: topThree[0].role,
                        bio: topThree[0].bio,
                    },
                    } as any)
                }
                activeOpacity={0.8}
                >
                <View style={styles.avatarContainer}>
                    <Svg width={35} height={35} viewBox="0 0 24 24" fill="none" style={styles.crownIcon}>
                    <Path d="M12 2l3 6 6-2-3 10H6L3 6l6 2 3-6z" fill="#FFD700" stroke="#FFA500" strokeWidth={1.5} />
                    </Svg>
                    <Image source={topThree[0].profileImage} style={styles.avatarLarge} />
                    <LinearGradient colors={["#FFD700", "#FFA500"]} style={[styles.rankBadgeCircle, styles.rankBadge1]}>
                    <Text style={[styles.rankBadgeText, styles.rankBadgeText1]}>1</Text>
                    </LinearGradient>
                </View>
                <Text style={[styles.podiumName, styles.podiumName1]} numberOfLines={1}>{topThree[0].name}</Text>
                <View style={styles.pointsRow}>
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#FFD700" />
                    </Svg>
                    <Text style={[styles.podiumPoints, styles.podiumPoints1]}>{topThree[0].points}</Text>
                </View>
                </TouchableOpacity>
            )}

            {topThree[2] && (
                <TouchableOpacity
                style={styles.podiumItem}
                onPress={() =>
                    router.push({
                    pathname: "/(main)/profile/[id]",
                    params: {
                        id: topThree[2].userId,
                        userId: topThree[2].userId,
                        firstName: topThree[2].firstName,
                        lastName: topThree[2].lastName,
                        role: topThree[2].role,
                        bio: topThree[2].bio,
                    },
                    } as any)
                }
                activeOpacity={0.8}
                >
                <View style={styles.avatarContainer}>
                    <Image source={topThree[2].profileImage} style={styles.avatar} />
                    <LinearGradient colors={["#CD7F32", "#8B4513"]} style={[styles.rankBadgeCircle, styles.rankBadge3]}>
                    <Text style={styles.rankBadgeText}>3</Text>
                    </LinearGradient>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>{topThree[2].name}</Text>
                <View style={styles.pointsRow}>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#CD7F32" />
                    </Svg>
                    <Text style={styles.podiumPoints}>{topThree[2].points}</Text>
                </View>
                </TouchableOpacity>
            )}
            </View>
        </View>

        <View style={styles.leaderboardSection}>
            <View style={styles.leaderboardListContainer}>
            <ScrollView contentContainerStyle={styles.leaderboardContent} showsVerticalScrollIndicator={false}>
                {restOfList.map((item, index) => (
                <TouchableOpacity
                    key={item.rank}
                    style={[styles.leaderboardItem, item.isYou && styles.leaderboardItemYou, index !== restOfList.length - 1 && styles.leaderboardItemBorder]}
                    onPress={async () => {
                    if (item.isYou) {
                        openOwnProfile();
                    } else if (item.userId) {
                        router.push({
                        pathname: "/(main)/profile/[id]",
                        params: { id: item.userId, userId: item.userId, firstName: item.firstName, lastName: item.lastName, role: item.role, avatar: item.avatarUrl },
                        } as any);
                    }
                    }}
                    activeOpacity={0.8}
                >
                    <View style={[styles.rankBadgeContainer, item.isYou && styles.rankBadgeYou]}>
                    <Text style={[styles.rankNumber, item.isYou && styles.rankNumberYou]}>{item.rank}</Text>
                    </View>

                    <View style={styles.leaderboardAvatarWrapper}>
                    <Image source={item.profileImage || require("@assets/images/user2.png")} style={styles.leaderboardAvatarImage} />
                    {item.isYou && <View style={styles.yourBadge}><Text style={styles.yourBadgeText}>YOU</Text></View>}
                    </View>

                    <View style={styles.leaderboardInfo}>
                    <Text style={[styles.leaderboardName, item.isYou && styles.leaderboardNameYou]} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.pointsRowList}>
                        <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                        <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={item.isYou ? "#000" : "#EC9A15"} />
                        </Svg>
                        <Text style={[styles.leaderboardPoints, item.isYou && styles.leaderboardPointsYou]}>{item.points} pts</Text>
                    </View>
                    </View>

                    <View style={{ width: 20, alignItems: "center" }}>
                    {item.isYou && (
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                        <Path d="M9 18l6-6-6-6" stroke="#000" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                    )}
                    </View>
                </TouchableOpacity>
                ))}
              {hasMore && (
                <TouchableOpacity onPress={loadMore} disabled={loadingMore} style={{ alignItems: "center", paddingVertical: 16 }}>
                  {loadingMore ? <ActivityIndicator color="#EC9A15" /> : <Text style={{ color: "#EC9A15" }}>Load more</Text>}
                </TouchableOpacity>
              )}
            </ScrollView>
            </View>
        </View>
      </>
      )}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tabs={tabs}
        onOpenDrawer={() => {}}
      />
    </View>
  );
}