import React, { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router/react-navigation";
import {
  Linking,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import Svg, { Path } from "react-native-svg";
import BottomNav from "@components/layout/BottomNav";
import { toastError, toastSuccess } from "@/components/ui/Toast";
import { formatCount, resolveMediaUrl } from "@/utils/mediaUrl";
import { Ionicons } from "@expo/vector-icons";
import { useOwnProfile } from "@/components/profile/shared/profileHooks";
import {
  BIO_MAX_LENGTH,
  getProfileRoute,
  limitBio,
} from "@/components/profile/shared/profileTypes";
import { LevelUpSection } from "@/components/profile/shared/ProfileComponents";
import { participantSelfProfileScreenStyles as pStyles } from "@/styles/participantSelfProfileScreenStyles";
import { fanSelfProfileScreenStyles as fStyles } from "@/styles/fanSelfProfileScreenStyles";
import { UserIconSVG, HomeIconSVG, ReelIconSVG, SearchIconSVG, BackIcon, SaveIcon, VerifiedBadgeIcon } from "@/icons";
import KeyboardAvoidingScreen from "@/components/KeyboardAvoidingScreen";
import ProfileBurgerMenuModal from "@/components/modals/ProfileBurgerMenuModal/ProfileBurgerMenuModal";
import UpgradeFanToParticipantModal from "@/components/modals/UpgradeFanToParticipantModal/UpgradeFanToParticipantModal";
import ProfileView, { ProfileTab } from "@/components/profile/ProfileView";
import { OwnProfileActions } from "@/components/profile/ProfileActions";
import { ReelsTabIcon } from "@/components/profile/profileIcons";
import { isPhotoItem } from "@/components/profile/ProfileMediaTile";
import { useUserReels } from "@/hooks/useUserReels";
import { useProfileExtras } from "@/hooks/useProfileExtras";
import { useInteractionReels } from "@/hooks/useInteractionReels";
import { XP_AND_MISSIONS_ENABLED } from "@/config/features";
import { Skeleton, SkeletonProfileHeader } from "@/components/Skeleton/Skeleton";

const profileTabs = [
  { name: "Home", icon: HomeIconSVG, label: "" },
  { name: "Reel", icon: ReelIconSVG, label: "GullyReel" },
  { name: "Upload", icon: null, label: "UPLOAD" },
  { name: "Search", icon: SearchIconSVG, label: "Search" },
  { name: "MyFame", icon: UserIconSVG, label: "" },
];

const XIconSVG = ({ width = 26, height = 26, color = "#fff" }) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill={color}>
    <Path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.008 4.076H5.059z" />
  </Svg>
);

const InstagramIconSVG = ({ width = 26, height = 26, color = "#fff" }) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM17.5 6.5h.01" />
  </Svg>
);

const BookmarkTabIcon = ({ size = 22, color = "#fff" }: { size?: number; color?: string }) => (
  <SaveIcon size={size} color={color} />
);

const cleanHandle = (input: string) =>
  (input || "")
    .replace(/(https?:\/\/)?(www\.)?(instagram\.com|x\.com|twitter\.com)\/?/g, "")
    .replace(/^@/, "")
    .replace(/\/$/, "");

// Relative image paths are served from the API host, not from the /v1/api prefix.
const avatarSource = (path: string | null) => {
  const uri = resolveMediaUrl(path);
  return uri ? { uri } : null;
};

/* Own-profile header, identity and stats pill. Layout follows the reference design; brand colours are unchanged. */
const ownStyles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 4,
  },
  topIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  topActions: { flexDirection: "row", alignItems: "center" },
  handle: { flex: 1, color: "#fff", fontSize: 17, fontWeight: "700", textAlign: "center" },
  identity: { paddingHorizontal: 16, paddingTop: 8 },
  identityRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatarRing: { width: 92, height: 92, borderRadius: 22, padding: 2.5 },
  avatarImage: { width: "100%", height: "100%", borderRadius: 20, backgroundColor: "#5A3C1C" },
  identityText: { flex: 1, alignItems: "flex-start" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { color: "#fff", fontSize: 20, fontWeight: "700", flexShrink: 1 },
  rankPill: { marginTop: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  rankPillFan: { backgroundColor: "#4B5563" },
  rankPillParticipant: { backgroundColor: "#EC9A15" },
  rankPillText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  rankTextFan: { color: "#fff" },
  rankTextParticipant: { color: "#1A1208" },
  words: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 6 },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    alignSelf: "stretch",
    marginTop: 16,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  statText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  statDot: { color: "rgba(255,255,255,0.5)", fontSize: 13 },
  bio: { color: "rgba(255,255,255,0.92)", fontSize: 14, lineHeight: 20, marginTop: 12 },
  upgradeButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(236,154,21,0.18)",
  },
  upgradeText: { color: "#EC9A15", fontSize: 13, fontWeight: "700" },
  link: { color: "#EC9A15", fontSize: 14, fontWeight: "600", marginTop: 8 },
});

/** The signed-in user's profile (MyFame). The top section is the original layout for each role. */
export default function OwnProfileScreen({ role }: { role: "fan" | "participant" }) {
  // The saved profile role wins over the route: switching role in Account Center must
  // show the matching layout (Fan shows "Upgrade to Participant").
  const { profileData, setProfileData, isLoading, reloadProfile } = useOwnProfile();
  const savedRole = (profileData.role || "").toLowerCase();
  const effectiveRole: "fan" | "participant" = savedRole
    ? savedRole.startsWith("fan")
      ? "fan"
      : "participant"
    : role;
  const isFan = effectiveRole === "fan";
  useEffect(() => {
    if (!isLoading && savedRole && effectiveRole !== role) {
      router.replace(
        getProfileRoute(effectiveRole === "fan" ? "fan" : "participants", true) as any
      );
    }
  }, [isLoading, savedRole, effectiveRole, role]);
  const styles = isFan ? fStyles : pStyles;
  const [activeTab, setActiveTab] = useState("MyFame");
  const [menuVisible, setMenuVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [levelUpVisible, setLevelUpVisible] = useState(false);
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [tempBio, setTempBio] = useState("");
  const [tempThreeWords, setTempThreeWords] = useState(["", "", ""]);
  const [tempInsta, setTempInsta] = useState("");
  const [tempX, setTempX] = useState("");
  const [mobile, setMobile] = useState("");
  const [storedEmail, setStoredEmail] = useState("");

  const userId = profileData.id || profileData._id || "";
  // "me" resolves to the stored user id, so posts (and their offline cache) load even
  // before the profile request returns.
  const reels = useUserReels(userId || "me");
  const saved = useInteractionReels("saved", true);
  const { followCounts, insights } = useProfileExtras(userId, true);

  useEffect(() => {
    // Contact details saved at sign-in (the profile hook does not load them).
    AsyncStorage.multiGet(["userMobile", "userEmail"])
      .then(([[, phone], [, email]]) => {
        setMobile(phone || "");
        setStoredEmail(email || "");
      })
      .catch(() => {});
  }, []);

  const { refetch: refetchReels } = reels;
  useFocusEffect(
    useCallback(() => {
      reloadProfile();
      refetchReels();
    }, [reloadProfile, refetchReels])
  );

  const openFollowers = useCallback(
    (tab: "followers" | "following") => {
      if (!userId) return;
      router.push({ pathname: "/(main)/followers", params: { userId, tab } } as any);
    },
    [userId]
  );

  const openEdit = useCallback(() => {
    setTempBio(limitBio(profileData.bio || ""));
    const words = (profileData.threeWords || "")
      .split("|")
      .map((w) => w.trim())
      .filter(Boolean);
    setTempThreeWords([words[0] || "", words[1] || "", words[2] || ""]);
    setTempInsta(profileData.instagramLink || "");
    setTempX(profileData.xLink || "");
    setEditVisible(true);
  }, [profileData]);

  const saveEdit = async () => {
    const threeWordsFormatted = tempThreeWords.filter((w) => w.trim()).join(" | ");
    setProfileData((prev) => ({
      ...prev,
      bio: limitBio(tempBio).trim(),
      threeWords: threeWordsFormatted || undefined,
      instagramLink: tempInsta,
      xLink: tempX,
    }));
    // The backend user model has no bio / three-words / social link fields yet,
    // so these are kept on this device only.
    try {
      await AsyncStorage.multiSet([
        ["userBio", limitBio(tempBio).trim()],
        ["userThreeWords", threeWordsFormatted],
        ["userInstagram", tempInsta],
        ["userXLink", tempX],
      ]);
      toastSuccess("Profile details saved on this device");
    } catch {
      toastError("Could not save your profile details.");
    }
    setEditVisible(false);
  };

  const displayName = [profileData.firstName, profileData.lastName].filter(Boolean).join(" ");
  const posts = useMemo(
    () => reels.reels.filter((r) => !!r.id).map((r) => ({ ...r, id: String(r.id) })),
    [reels.reels]
  );
  const videos = useMemo(() => posts.filter((p) => !isPhotoItem(p)), [posts]);

  const postsSource = {
    items: posts,
    loading: reels.loading,
    refreshing: reels.refreshing,
    loadingMore: reels.loadingMore,
    hasMore: reels.hasMore,
    isOffline: reels.isOffline,
    error: reels.error,
    refresh: reels.refresh,
    retry: reels.refetch,
    loadMore: reels.loadMore,
  };

  // Video-only platform: no photo grid and no Liked tab.
  const tabs: ProfileTab[] = [
    {
      key: "reels",
      label: "Videos",
      Icon: ReelsTabIcon,
      source: { ...postsSource, items: videos },
      emptyTitle: "No reels yet",
      emptyText: isFan
        ? "Upgrade to Participant to start posting."
        : "Share your talent with the Gully Fame community.",
      ownContent: true,
    },
    {
      key: "saved",
      label: "Saved",
      Icon: BookmarkTabIcon,
      // Saved posts are private to the owner, so the tab shows a lock.
      locked: true,
      source: saved,
      emptyTitle: "Nothing saved yet",
    },
  ];

  const insets = useSafeAreaInsets();
  const handle = profileData.username ? `@${profileData.username}` : "";
  const words = (profileData.threeWords || "")
    .split("|")
    .map((w) => w.trim())
    .filter(Boolean);
  const bioText = limitBio(profileData.bio || "").trim();
  const postCount = reels.loading && posts.length === 0 ? null : posts.length;
  const followersCount =
    typeof profileData.followersCount === "number"
      ? profileData.followersCount
      : followCounts
        ? followCounts.followers
        : null;
  const followingCount =
    typeof profileData.followingCount === "number"
      ? profileData.followingCount
      : followCounts
        ? followCounts.following
        : null;
  const countText = (n: number | null) => (typeof n === "number" ? formatCount(n) : "–");

  const avatar = avatarSource(profileData.profileImage);
  // Disk-cached so the photo shows straight away on later visits.
  const avatarImage = avatar ? (
    <ExpoImage
      source={avatar}
      style={ownStyles.avatarImage}
      cachePolicy="memory-disk"
      contentFit="cover"
    />
  ) : (
    <View
      style={[
        ownStyles.avatarImage,
        { alignItems: "center", justifyContent: "center" },
      ]}
    >
      <Text style={{ color: "#EC9A15", fontSize: 40, fontWeight: "700" }}>
        {displayName.charAt(0).toUpperCase()}
      </Text>
    </View>
  );

  // While the profile loads, keep the top bar and show shimmer blocks for everything below it.
  const topLoading = (
    <View>
      <View style={[ownStyles.topBar, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={() => router.replace("/(main)" as any)} style={ownStyles.topIcon} accessibilityLabel="Back">
          <BackIcon color="white" size={22} />
        </TouchableOpacity>
        <View style={ownStyles.topActions} />
      </View>
      <SkeletonProfileHeader />
    </View>
  );

  const top = (
    <View>
      <View style={[ownStyles.topBar, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity
          onPress={() => router.replace("/(main)" as any)}
          style={ownStyles.topIcon}
          accessibilityLabel="Back"
          testID="profile-back"
        >
          <BackIcon color="white" size={22} />
        </TouchableOpacity>
        <Text style={ownStyles.handle} numberOfLines={1}>
          {handle}
        </Text>
        <View style={ownStyles.topActions}>
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            style={ownStyles.topIcon}
            accessibilityLabel="Menu"
            testID="profile-menu"
          >
            <Ionicons name="settings-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={ownStyles.identity}>
        <View style={ownStyles.identityRow}>
          <LinearGradient
            colors={isFan ? ["#E3E4E5", "#9CA3AF", "#4B5563"] : ["#FFD700", "#FF8C00", "#FF0055"]}
            style={ownStyles.avatarRing}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {avatarImage}
          </LinearGradient>
          <View style={ownStyles.identityText}>
            <View style={ownStyles.nameRow}>
              <Text
                style={ownStyles.name}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {displayName || (isLoading ? "" : "User")}
              </Text>
              {!displayName && isLoading ? <Skeleton width={140} height={20} radius={6} /> : null}
              {profileData.isVerified ? <VerifiedBadgeIcon size={18} /> : null}
            </View>
            <View
              style={[
                ownStyles.rankPill,
                isFan ? ownStyles.rankPillFan : ownStyles.rankPillParticipant,
              ]}
            >
              <Text
                style={[
                  ownStyles.rankPillText,
                  isFan ? ownStyles.rankTextFan : ownStyles.rankTextParticipant,
                ]}
              >
                {isFan ? "FAN" : profileData.currentRank || "STAR"}
              </Text>
            </View>
            {words.length > 0 ? (
              <Text style={ownStyles.words} numberOfLines={1}>
                {words.join(" • ")}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={ownStyles.statPill}>
          <Text style={ownStyles.statText} numberOfLines={1} adjustsFontSizeToFit>Posts ({countText(postCount)})</Text>
          <Text style={ownStyles.statDot}>•</Text>
          <TouchableOpacity
            onPress={() => openFollowers("followers")}
            testID="profile-followers-count"
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={ownStyles.statText} numberOfLines={1} adjustsFontSizeToFit>Followers ({countText(followersCount)})</Text>
          </TouchableOpacity>
          <Text style={ownStyles.statDot}>•</Text>
          <TouchableOpacity
            onPress={() => openFollowers("following")}
            testID="profile-following-count"
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={ownStyles.statText} numberOfLines={1} adjustsFontSizeToFit>Following ({countText(followingCount)})</Text>
          </TouchableOpacity>
        </View>

        {bioText ? <Text style={ownStyles.bio}>{bioText}</Text> : null}

        {isFan ? (
          <TouchableOpacity
            style={ownStyles.upgradeButton}
            onPress={() => setUpgradeVisible(true)}
            accessibilityRole="button"
          >
            <Text style={ownStyles.upgradeText}>Upgrade to Participant</Text>
          </TouchableOpacity>
        ) : null}

        {profileData.instagramLink ? (
          <TouchableOpacity
            accessibilityLabel="Instagram"
            onPress={() =>
              Linking.openURL(
                `https://instagram.com/${cleanHandle(profileData.instagramLink)}`
              ).catch(() => {})
            }
          >
            <Text style={ownStyles.link} numberOfLines={1}>
              instagram.com/{cleanHandle(profileData.instagramLink)}
            </Text>
          </TouchableOpacity>
        ) : null}
        {profileData.xLink ? (
          <TouchableOpacity
            accessibilityLabel="X"
            onPress={() =>
              Linking.openURL(`https://x.com/${cleanHandle(profileData.xLink)}`).catch(() => {})
            }
          >
            <Text style={ownStyles.link} numberOfLines={1}>
              x.com/{cleanHandle(profileData.xLink)}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={{ marginTop: 6, marginBottom: 8 }}>
        <OwnProfileActions
          userId={userId}
          displayName={displayName}
          contact={{ email: profileData.email || storedEmail, phone: mobile }}
          onEditProfile={openEdit}
        />
      </View>

      <LinearGradient
        colors={["rgba(41, 33, 24, 0.2)", "#3C2610"]}
        locations={[0.0, 0.4]}
        style={styles.contentContainer}
      >
        {insights ? (
          <View
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 6, marginBottom: 4 }}
            accessibilityLabel={`${insights.views} profile views in the last ${insights.days} days`}
          >
            <Ionicons name="eye-outline" size={15} color="#C9B9A6" />
            <Text style={{ color: "#C9B9A6", fontSize: 13 }}>
              {formatCount(insights.views)} profile {insights.views === 1 ? "view" : "views"} in the last {insights.days} days
            </Text>
          </View>
        ) : null}

        {/* Level-up stars, Next Rank bar and "How to Level Up": hidden while levels are switched off */}
        {!XP_AND_MISSIONS_ENABLED ? null : isFan ? (
          <LevelUpSection
            onPress={() => setLevelUpVisible(true)}
            levelPercentage={profileData.levelPercentage || 0}
            competitions={profileData.competitionsParticipated || 0}
          />
        ) : (
          <View style={pStyles.rankCardContainer}>
            <LevelUpSection
              onPress={() => setLevelUpVisible(true)}
              levelPercentage={profileData.levelPercentage || 0}
              competitions={profileData.competitionsParticipated || 0}
              compact
            />
            <View style={pStyles.progressContainer}>
              <View style={pStyles.progressHeader}>
                <Text style={pStyles.progressText}>
                  Next Rank: {profileData.nextRank || "Superstar"}
                </Text>
                <Text style={pStyles.progressFraction}>
                  {profileData.competitionsParticipated || 0}/
                  {profileData.competitionsRequiredForNextRank || 5} Comps
                </Text>
              </View>
              <View style={pStyles.progressBarBackground}>
                <LinearGradient
                  colors={["#FFE066", "#EC9A15"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    pStyles.progressBarFill,
                    { width: `${profileData.levelPercentage || 0}%` },
                  ]}
                />
              </View>
              <Text style={pStyles.progressHint}>
                Just{" "}
                {Math.max(
                  0,
                  (profileData.competitionsRequiredForNextRank || 5) -
                    (profileData.competitionsParticipated || 0)
                )}{" "}
                more competitions to level up!
              </Text>
            </View>
          </View>
        )}
      </LinearGradient>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#3C2610" }}>
      <StatusBar barStyle="light-content" />
      <ProfileView loading={isLoading} top={isLoading ? topLoading : top} tabs={tabs} canCreatePost={!isFan} ownerId={userId} textTabs />

      <ProfileBurgerMenuModal
        isVisible={menuVisible}
        onClose={() => setMenuVisible(false)}
        profileData={profileData}
      />
      {isFan ? (
        <UpgradeFanToParticipantModal
          isVisible={upgradeVisible}
          onClose={() => setUpgradeVisible(false)}
          onUpgradeSuccess={() => setUpgradeVisible(false)}
        />
      ) : null}

      <Modal
        visible={levelUpVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLevelUpVisible(false)}
      >
        <TouchableOpacity
          style={pStyles.modalOverlay}
          activeOpacity={1}
          onPress={() => setLevelUpVisible(false)}
        >
          <View style={pStyles.levelUpModalContainer}>
            <View style={pStyles.levelUpModalContent}>
              <Text style={pStyles.levelUpModalTitle}>How to Level Up</Text>
              <View style={pStyles.levelUpRulesContainer}>
                {[
                  "Unlock 1st star → after 3 competitions",
                  "Unlock 2nd star → after 5 competitions",
                  "Unlock 3rd star → after 10 competitions",
                  "Unlock 4th star → after 20 competitions",
                  "Unlock 5th star → after 30 competitions",
                ].map((rule) => (
                  <View key={rule} style={pStyles.levelUpRuleItem}>
                    <Text style={pStyles.levelUpRuleText}>{rule}</Text>
                  </View>
                ))}
              </View>
              <Text style={pStyles.levelUpModalNote}>
                If your fans upgrade your profile to Participant, your level-up progress will
                increase.
              </Text>
              <TouchableOpacity
                style={pStyles.levelUpModalCloseButton}
                onPress={() => setLevelUpVisible(false)}
              >
                <Text style={pStyles.levelUpModalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={editVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditVisible(false)}
      >
        {/* The sheet shrinks above the keyboard: header and Cancel/Save stay fixed, only the fields
            scroll. Before, Save sat under the Android keyboard and could not be reached. */}
        <KeyboardAvoidingScreen style={pStyles.editBioOverlay}>
          <View style={[pStyles.editBioContainer, { maxHeight: "100%", flexShrink: 1 }]}>
            <View style={pStyles.editBioHeader}>
              <Text style={pStyles.editBioTitle}>Edit profile</Text>
              <TouchableOpacity
                onPress={() => setEditVisible(false)}
                accessibilityLabel="Close"
                testID="profile-edit-close"
              >
                <Text style={pStyles.editBioClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={{ flexShrink: 1 }}
              keyboardShouldPersistTaps="handled"
              testID="profile-edit-scroll"
            >
              <Text style={pStyles.editLabel}>Bio</Text>
              <TextInput
                style={pStyles.editBioInput}
                value={tempBio}
                testID="profile-edit-bio"
                onChangeText={(text) => setTempBio(limitBio(text))}
                placeholder="Write something about yourself..."
                placeholderTextColor="#999"
                multiline
                maxLength={BIO_MAX_LENGTH}
              />
              <Text style={pStyles.bioCharCount}>
                {tempBio.length}/{BIO_MAX_LENGTH}
              </Text>

              <Text style={[pStyles.editLabel, { marginTop: 20 }]}>
                Describe yourself in three words
              </Text>
              <View style={pStyles.threeWordsEditContainer}>
                {[0, 1, 2].map((i) => (
                  <React.Fragment key={i}>
                    {i > 0 ? <Text style={pStyles.threeWordsEditSeparator}>|</Text> : null}
                    <TextInput
                      style={pStyles.threeWordsEditInput}
                      placeholder={["1st word", "2nd word", "3rd word"][i]}
                      placeholderTextColor="#999"
                      value={tempThreeWords[i]}
                      testID={`profile-edit-word-${i + 1}`}
                      onChangeText={(text) => {
                        const next = [...tempThreeWords];
                        next[i] = text;
                        setTempThreeWords(next);
                      }}
                    />
                  </React.Fragment>
                ))}
              </View>

              <Text style={[pStyles.editLabel, { marginTop: 20 }]}>Social links</Text>
              <View style={{ gap: 10 }}>
                <View style={pStyles.socialInputContainer}>
                  <View style={{ marginRight: 8 }}>
                    <InstagramIconSVG width={18} height={18} color="#EC9A15" />
                  </View>
                  <TextInput
                    style={pStyles.socialInput}
                    placeholder="Instagram handle"
                    placeholderTextColor="#999"
                    value={tempInsta}
                    testID="profile-edit-instagram"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setTempInsta}
                  />
                </View>
                <View style={pStyles.socialInputContainer}>
                  <View style={{ marginRight: 8 }}>
                    <XIconSVG width={18} height={18} color="#EC9A15" />
                  </View>
                  <TextInput
                    style={pStyles.socialInput}
                    placeholder="X (Twitter) handle"
                    placeholderTextColor="#999"
                    value={tempX}
                    testID="profile-edit-x"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setTempX}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={pStyles.editBioButtons}>
              <TouchableOpacity
                style={pStyles.cancelButton}
                onPress={() => setEditVisible(false)}
                testID="profile-edit-cancel"
              >
                <Text style={pStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={pStyles.saveButton}
                onPress={saveEdit}
                testID="profile-edit-save"
              >
                <Text style={pStyles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingScreen>
      </Modal>

      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tabs={profileTabs}
        onOpenDrawer={() => {}}
      />
    </View>
  );
}
