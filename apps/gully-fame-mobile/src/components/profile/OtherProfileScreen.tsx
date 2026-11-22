import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Image, Share, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Share2, Star } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { safeBack } from "@/utils/safeBack";
import BottomNav from "@components/layout/BottomNav";
import { UserIconSVG, HomeIconSVG, ReelIconSVG, SearchIconSVG } from "@/icons";
import { useOtherUserProfile } from "@/components/profile/shared/profileHooks";
import ProfileView, { ProfileTab } from "@/components/profile/ProfileView";
import { OtherProfileActions } from "@/components/profile/ProfileActions";
import { ReelsTabIcon } from "@/components/profile/profileIcons";
import { isPhotoItem } from "@/components/profile/ProfileMediaTile";
import { getProfileShareMessage } from "@/api/services/profileExtrasService";
import { formatCount, resolveMediaUrl } from "@/utils/mediaUrl";
import SupportModal from "@/components/modals/SupportModal/SupportModal";
import { TIPPING_ENABLED } from "@/config/features";
import { useUserReels } from "@/hooks/useUserReels";
import { useProfileExtras } from "@/hooks/useProfileExtras";
import { userService } from "@/api/services/userService";
import { followUpdateEmitter } from "@/utils/followEmitter";
import { SkeletonProfileHeader } from "@/components/Skeleton/Skeleton";

const profileTabs = [
  { name: "Home", icon: HomeIconSVG, label: "" },
  { name: "Reel", icon: ReelIconSVG, label: "GullyReel" },
  { name: "Upload", icon: null, label: "UPLOAD" },
  { name: "Search", icon: SearchIconSVG, label: "Search" },
  { name: "MyFame", icon: UserIconSVG, label: "" },
];

/** Another user's profile (fan or participant). */
const titleCase = (t: string) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();

/* Mirrors OwnProfileScreen's header so both profiles look the same. */
const otherStyles = StyleSheet.create({
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingBottom: 4 },
  topIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  handle: { flex: 1, color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  identity: { paddingHorizontal: 16, paddingTop: 8 },
  identityRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  avatarRing: { width: 86, height: 86, borderRadius: 43, padding: 3, borderWidth: 2, borderColor: "#EC9A15" },
  avatarRingFan: { borderColor: "rgba(255, 255, 255, 0.35)" },
  avatarImage: { width: "100%", height: "100%", borderRadius: 40, backgroundColor: "#5A3C1C" },
  stats: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
  stat: { alignItems: "center", minWidth: 64, paddingVertical: 4 },
  statNumber: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { color: "#CAD7D8", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
  name: { color: "#fff", fontSize: 20, fontFamily: "PlayfairDisplay_700Bold", marginTop: 12 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  rank: { color: "#EC9A15", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  rankFan: { color: "#C9C2B8" },
  bio: { color: "rgba(255,255,255,0.92)", fontSize: 14, lineHeight: 20, marginTop: 10, fontFamily: "Inter_400Regular" },
});

export default function OtherProfileScreen() {
  const params = useLocalSearchParams();
  const { profileData, setProfileData, isLoading } = useOtherUserProfile();
  // Someone else's profile: no bottom-nav tab is highlighted (MyFame is your own profile).
  const [activeTab, setActiveTab] = useState("");
  const [supportVisible, setSupportVisible] = useState(false);
  const [isFollowing, setIsFollowing] = useState(String(params.isFollowing ?? "") === "true");
  // Follow state comes from GET /user/:userId once the profile loads.
  useEffect(() => {
    if (typeof profileData.isFollowing === "boolean") setIsFollowing(profileData.isFollowing);
  }, [profileData.isFollowing]);
  const [followBusy, setFollowBusy] = useState(false);

  const userId = String(params.userId || params.id || profileData.id || "");
  const reels = useUserReels(userId);
  const { followCounts } = useProfileExtras(userId, false);
  const insets = useSafeAreaInsets();
  // The server's role wins once loaded; the opening screen's param (or a shared link's
  // default) only covers the first moment.
  const isFanProfile = String(profileData.role || params.role || "").toLowerCase().startsWith("fan");

  // The name/avatar passed by the opening screen show first; GET /user/:userId
  // then fills in the rest (see useOtherUserProfile).
  const firstName = profileData.firstName || String(params.firstName || "");
  const lastName = profileData.lastName || String(params.lastName || "");
  const displayName = [firstName, lastName].filter(Boolean).join(" ");
  const bio = profileData.bio || String(params.bio || "");
  const unavailable = !isLoading && !displayName && !userId;

  const items = useMemo(
    () => reels.reels.filter((r) => !!r.id).map((r) => ({ ...r, id: String(r.id) })),
    [reels.reels]
  );
  // Support goes to a competition entry (normal reels can't receive coins); use the newest one.
  const latestReelId = items.find((r: any) => !!r.competition)?.id;

  const posts = useMemo(
    () => ({
      items,
      loading: reels.loading,
      refreshing: reels.refreshing,
      loadingMore: reels.loadingMore,
      hasMore: reels.hasMore,
      isOffline: reels.isOffline,
      error: reels.error,
      refresh: reels.refresh,
      retry: reels.refetch,
      loadMore: reels.loadMore,
    }),
    [items, reels.loading, reels.refreshing, reels.loadingMore, reels.hasMore, reels.isOffline, reels.error, reels.refresh, reels.refetch, reels.loadMore]
  );

  const toggleFollow = useCallback(async () => {
    if (!userId || followBusy) return;
    const previous = isFollowing;
    setFollowBusy(true);
    setIsFollowing(!previous);
    const result = await userService.toggleFollowUser(userId);
    if (result.success) {
      const next = result.data ? result.data.following : !previous;
      setIsFollowing(next);
      if (next !== previous) {
        setProfileData((prev) =>
          typeof prev.followersCount === "number"
            ? { ...prev, followersCount: Math.max(0, prev.followersCount + (next ? 1 : -1)) }
            : prev
        );
      }
      followUpdateEmitter.emit({ type: next ? "follow" : "unfollow", userId });
    } else {
      setIsFollowing(previous);
      Alert.alert("Couldn't update", result.message || "Please try again.");
    }
    setFollowBusy(false);
  }, [userId, isFollowing, followBusy, setProfileData]);

  const openMessage = useCallback(() => {
    if (!userId) return;
    router.push({
      pathname: "/(main)/chat/[id]",
      params: { id: userId, name: displayName || "User", avatar: profileData.profileImage || "" },
    } as any);
  }, [userId, displayName, profileData.profileImage]);

  const videos = useMemo(() => items.filter((p) => !isPhotoItem(p)), [items]);
  // Video-only platform: no photo grid.
  const tabs: ProfileTab[] = [
    { key: "reels", label: "Videos", Icon: ReelsTabIcon, source: { ...posts, items: videos }, emptyTitle: "No reels yet" },
  ];

  const avatarPath = profileData.profileImage || (params.avatar ? String(params.avatar) : null);
  const avatarUri = resolveMediaUrl(avatarPath);
  const avatarStyle = otherStyles.avatarImage;
  const avatar = avatarUri ? (
    <Image source={{ uri: avatarUri }} style={avatarStyle} />
  ) : (
    <View style={[avatarStyle, { backgroundColor: "#5A3C1C", alignItems: "center", justifyContent: "center" }]}>
      <Text style={{ color: "#EC9A15", fontSize: 34, fontFamily: "Inter_700Bold" }}>{(displayName || "?").charAt(0).toUpperCase()}</Text>
    </View>
  );

  // Level is shown only when the backend sends one (no default "Beginner").
  const levelLabel = (profileData as any).levelName || (profileData.currentRank ? String(profileData.currentRank) : "");

  const countText = (n: number | null) => (typeof n === "number" ? formatCount(n) : "–");
  const handle = profileData.username ? `@${String(profileData.username).replace(/^@+/, "")}` : "";

  // Same layout as the signed-in user's own profile (OwnProfileScreen), with visitor actions.
  const top = (
    <View>
      <View style={[otherStyles.topBar, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={() => safeBack("/(main)/home")} style={otherStyles.topIcon} accessibilityLabel="Back">
          <ChevronLeft color="#fff" size={28} />
        </TouchableOpacity>
        <Text style={otherStyles.handle} numberOfLines={1} testID="other-profile-username">
          {handle}
        </Text>
        <TouchableOpacity
          onPress={() => userId && Share.share({ message: getProfileShareMessage(userId, displayName) }).catch(() => {})}
          style={otherStyles.topIcon}
          accessibilityLabel="Share profile"
        >
          <Share2 color="#fff" size={22} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      <View style={otherStyles.identity}>
        <View style={otherStyles.identityRow}>
          <View style={[otherStyles.avatarRing, isFanProfile && otherStyles.avatarRingFan]}>{avatar}</View>
          <View style={otherStyles.stats}>
            <View style={otherStyles.stat}>
              <Text style={otherStyles.statNumber}>{countText(typeof profileData.reelsCount === "number" ? profileData.reelsCount : reels.loading && items.length === 0 ? null : items.length)}</Text>
              <Text style={otherStyles.statLabel}>Posts</Text>
            </View>
            <TouchableOpacity
              style={otherStyles.stat}
              activeOpacity={0.7}
              onPress={() => userId && router.push({ pathname: "/(main)/followers", params: { userId, tab: "followers" } } as any)}
              accessibilityRole="button"
            >
              <Text style={otherStyles.statNumber}>{countText(typeof profileData.followersCount === "number" ? profileData.followersCount : followCounts ? followCounts.followers : null)}</Text>
              <Text style={otherStyles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={otherStyles.stat}
              activeOpacity={0.7}
              onPress={() => userId && router.push({ pathname: "/(main)/followers", params: { userId, tab: "following" } } as any)}
              accessibilityRole="button"
            >
              <Text style={otherStyles.statNumber}>{countText(typeof profileData.followingCount === "number" ? profileData.followingCount : followCounts ? followCounts.following : null)}</Text>
              <Text style={otherStyles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={otherStyles.name} numberOfLines={1}>
          {displayName || (unavailable ? "Account unavailable" : "")}
        </Text>
        {!unavailable ? (
          <View style={otherStyles.metaRow}>
            <Star
              size={13}
              strokeWidth={2}
              color={isFanProfile ? "#C9C2B8" : "#EC9A15"}
              fill={isFanProfile ? "transparent" : "#EC9A15"}
            />
            <Text style={[otherStyles.rank, isFanProfile && otherStyles.rankFan]}>
              {isFanProfile ? "Fan" : levelLabel ? titleCase(levelLabel) : "Participant"}
            </Text>
          </View>
        ) : null}
        {bio ? <Text style={otherStyles.bio}>{bio}</Text> : null}
      </View>

      {!unavailable ? (
        <View style={{ marginTop: 12, marginBottom: 12 }}>
          <OtherProfileActions
            isFollowing={isFollowing}
            followBusy={followBusy}
            onToggleFollow={userId ? toggleFollow : undefined}
            onMessage={userId ? openMessage : undefined}
            // Tips go to a competition entry (POST reels/:id/tip), so Support needs at least one entry.
            onSupport={TIPPING_ENABLED && latestReelId ? () => setSupportVisible(true) : undefined}
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#3C2610" }}>
      <StatusBar barStyle="light-content" />
      <ProfileView
        loading={isLoading}
        top={isLoading ? <SkeletonProfileHeader style={{ paddingTop: 64 }} /> : top}
        tabs={tabs}
        canCreatePost={false}
        unavailable={unavailable}
        ownerId={userId}
        textTabs
      />

      {latestReelId ? (
        <SupportModal
          visible={supportVisible}
          onClose={() => setSupportVisible(false)}
          creatorName={displayName || "this creator"}
          creatorId={userId}
          reelId={latestReelId}
        />
      ) : null}

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} tabs={profileTabs} onOpenDrawer={() => {}} />
    </View>
  );
}
