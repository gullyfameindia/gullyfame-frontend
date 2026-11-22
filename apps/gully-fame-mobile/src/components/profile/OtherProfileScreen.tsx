import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Image, Share, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { safeBack } from "@/utils/safeBack";
import BottomNav from "@components/layout/BottomNav";
import { UserIconSVG, HomeIconSVG, ReelIconSVG, SearchIconSVG, BackIcon, ShareIcon } from "@/icons";
import { useOtherUserProfile } from "@/components/profile/shared/profileHooks";
import ProfileView, { ProfileTab } from "@/components/profile/ProfileView";
import { OtherProfileActions } from "@/components/profile/ProfileActions";
import { ReelsTabIcon } from "@/components/profile/profileIcons";
import { isPhotoItem } from "@/components/profile/ProfileMediaTile";
import { StatsSection, UserInfoSection } from "@/components/profile/shared/ProfileComponents";
import { otherProfileStyles as styles } from "@/styles/otherProfileStyles";
import { getProfileShareMessage } from "@/api/services/profileExtrasService";
import { resolveMediaUrl } from "@/utils/mediaUrl";
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
const headerHandleStyle = {
  flex: 1,
  color: "#fff",
  fontSize: 16,
  fontFamily: "Inter_600SemiBold",
  textAlign: "center" as const,
  marginHorizontal: 8,
};

export default function OtherProfileScreen() {
  const params = useLocalSearchParams();
  const { profileData, setProfileData, isLoading } = useOtherUserProfile();
  const [activeTab, setActiveTab] = useState("MyFame");
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
    { key: "reels", label: "Reels", Icon: ReelsTabIcon, source: { ...posts, items: videos }, emptyTitle: "No reels yet" },
  ];

  const avatarPath = profileData.profileImage || (params.avatar ? String(params.avatar) : null);
  const avatarUri = resolveMediaUrl(avatarPath);
  const avatarStyle = isFanProfile ? styles.fanProfileImage : styles.profileImage;
  const avatar = avatarUri ? (
    <Image source={{ uri: avatarUri }} style={avatarStyle} />
  ) : (
    <View style={[avatarStyle, { backgroundColor: "#5A3C1C", alignItems: "center", justifyContent: "center" }]}>
      <Text style={{ color: "#EC9A15", fontSize: 36, fontWeight: "700" }}>{(displayName || "?").charAt(0).toUpperCase()}</Text>
    </View>
  );

  // Level is shown only when the backend sends one (no default "Beginner").
  const levelLabel = (profileData as any).levelName || (profileData.currentRank ? String(profileData.currentRank) : "");

  const top = (
    <View>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack("/(main)/home")} style={styles.backButton} accessibilityLabel="Back">
          <BackIcon color="white" size={24} />
        </TouchableOpacity>
        {/* Their @username, centred between Back and Share. */}
        <Text style={headerHandleStyle} numberOfLines={1} testID="other-profile-username">
          {profileData.username ? `@${String(profileData.username).replace(/^@+/, "")}` : ""}
        </Text>
        <TouchableOpacity
          onPress={() => userId && Share.share({ message: getProfileShareMessage(userId, displayName) }).catch(() => {})}
          style={styles.shareButton}
          accessibilityLabel="Share profile"
        >
          <ShareIcon color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      {isFanProfile ? (
        <View style={styles.fanCircleContainer}>
          <View style={styles.fanCircleShape}>
            {avatar}
            <View style={styles.fanCircleFrame} />
          </View>
        </View>
      ) : (
        <View style={styles.starContainer}>
          <View style={styles.starShape}>
            {avatar}
            <Image source={require("@assets/images/Starprofile.png")} style={styles.starImage} />
          </View>
        </View>
      )}

      <UserInfoSection profileData={{ ...profileData, firstName, lastName, bio }} role="other" showEditButton={false} />

      {!unavailable ? (
        <View style={{ marginBottom: 16 }}>
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

      <LinearGradient colors={["rgba(41, 33, 24, 0.2)", "#3C2610"]} locations={[0.0, 0.4]} style={styles.contentContainer}>
        <StatsSection
          photos={typeof profileData.reelsCount === "number" ? profileData.reelsCount : reels.loading && items.length === 0 ? null : items.length}
          followers={typeof profileData.followersCount === "number" ? profileData.followersCount : followCounts ? followCounts.followers : null}
          following={typeof profileData.followingCount === "number" ? profileData.followingCount : followCounts ? followCounts.following : null}
          onFollowersPress={() => userId && router.push({ pathname: "/(main)/followers", params: { userId, tab: "followers" } } as any)}
          onFollowingPress={() => userId && router.push({ pathname: "/(main)/followers", params: { userId, tab: "following" } } as any)}
        />
        {levelLabel ? (
          <View style={styles.levelDisplayContainer}>
            <View style={styles.levelDisplayGradientWrapper}>
              <LinearGradient
                colors={["#EDD6AF", "#F0BA5D", "#EC9A15"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.levelDisplayGradient}
              >
                <Text style={styles.levelDisplayText}>Level: {levelLabel}</Text>
              </LinearGradient>
            </View>
          </View>
        ) : null}
      </LinearGradient>
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
