import React, { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router/react-navigation";
import {
  Dimensions,
  Linking,
  Modal,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image as ExpoImage } from "expo-image";
import Svg, { Path } from "react-native-svg";
import BottomNav from "@components/layout/BottomNav";
import { toastError, toastSuccess } from "@/components/ui/Toast";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import { useOwnProfile } from "@/components/profile/shared/profileHooks";
import {
  BIO_MAX_LENGTH,
  getProfileRoute,
  limitBio,
} from "@/components/profile/shared/profileTypes";
import {
  LevelUpSection,
  StatsSection,
  UserInfoSection,
} from "@/components/profile/shared/ProfileComponents";
import { participantSelfProfileScreenStyles as pStyles } from "@/styles/participantSelfProfileScreenStyles";
import { fanSelfProfileScreenStyles as fStyles } from "@/styles/fanSelfProfileScreenStyles";
import { UserIconSVG, HomeIconSVG, ReelIconSVG, SearchIconSVG, BackIcon, SaveIcon } from "@/icons";
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

const { height } = Dimensions.get("window");

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
  const { followCounts } = useProfileExtras(userId, true);

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
      label: "Reels",
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
      source: saved,
      emptyTitle: "Nothing saved yet",
    },
  ];

  const avatar = avatarSource(profileData.profileImage);
  // Disk-cached so the photo shows straight away on later visits.
  const avatarImage = avatar ? (
    <ExpoImage
      source={avatar}
      style={styles.gamifiedProfileImage}
      cachePolicy="memory-disk"
      contentFit="cover"
    />
  ) : (
    <View
      style={[
        styles.gamifiedProfileImage,
        { backgroundColor: "#5A3C1C", alignItems: "center", justifyContent: "center" },
      ]}
    >
      <Text style={{ color: "#EC9A15", fontSize: 40, fontWeight: "700" }}>
        {displayName.charAt(0).toUpperCase()}
      </Text>
    </View>
  );

  const top = (
    <View>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace("/(main)" as any)}
          style={styles.backButton}
          accessibilityLabel="Back"
          testID="profile-back"
        >
          <BackIcon color="white" size={24} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          style={styles.menuButton}
          accessibilityLabel="Menu"
          testID="profile-menu"
        >
          <View style={styles.hamburgerIcon}>
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
          </View>
        </TouchableOpacity>
      </View>

      {isFan ? (
        <View style={styles.gamifiedAvatarContainer}>
          <LinearGradient
            colors={["#E3E4E5", "#9CA3AF", "#4B5563"]}
            style={styles.avatarGradientRing}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {avatarImage}
          </LinearGradient>
          <View
            style={[
              styles.rankBadgeContainer,
              { backgroundColor: "#4B5563", borderColor: "#E3E4E5" },
            ]}
          >
            <Text style={[styles.rankBadgeText, { color: "#fff" }]}>FAN</Text>
          </View>
        </View>
      ) : (
        <View style={styles.gamifiedAvatarContainer}>
          <LinearGradient
            colors={["#FFD700", "#FF8C00", "#FF0055"]}
            style={styles.avatarGradientRing}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {avatarImage}
          </LinearGradient>
          <View style={styles.rankBadgeContainer}>
            <Text style={styles.rankBadgeText}>{profileData.currentRank || "STAR"}</Text>
          </View>
        </View>
      )}

      <UserInfoSection
        profileData={profileData}
        showEditButton={false}
        role={isFan ? "fan" : "participant"}
        threeWords={profileData.threeWords}
        userNameMarginTop={isFan ? height * 0.001 : undefined}
        handleUpgradeClick={() => setUpgradeVisible(true)}
        nameFallback={isLoading ? "" : "User"}
      />

      {/* The social row below pulls itself up 20px (it used to sit under the pencil row). */}
      <View style={{ marginBottom: 20 }}>
        <OwnProfileActions
          userId={userId}
          displayName={displayName}
          contact={{ email: profileData.email || storedEmail, phone: mobile }}
          onEditProfile={openEdit}
        />
      </View>

      <View style={styles.socialLinksContainer}>
        {profileData.instagramLink ? (
          <TouchableOpacity
            style={styles.socialIconButton}
            accessibilityLabel="Instagram"
            onPress={() =>
              Linking.openURL(
                `https://instagram.com/${cleanHandle(profileData.instagramLink)}`
              ).catch(() => {})
            }
          >
            <InstagramIconSVG width={22} height={22} color="#fff" />
          </TouchableOpacity>
        ) : null}
        {profileData.xLink ? (
          <TouchableOpacity
            style={styles.socialIconButton}
            accessibilityLabel="X"
            onPress={() =>
              Linking.openURL(`https://x.com/${cleanHandle(profileData.xLink)}`).catch(() => {})
            }
          >
            <XIconSVG width={20} height={20} color="#fff" />
          </TouchableOpacity>
        ) : null}
      </View>

      <LinearGradient
        colors={["rgba(41, 33, 24, 0.2)", "#3C2610"]}
        locations={[0.0, 0.4]}
        style={styles.contentContainer}
      >
        <StatsSection
          photos={reels.loading && posts.length === 0 ? null : posts.length}
          followers={followCounts ? followCounts.followers : null}
          following={followCounts ? followCounts.following : null}
          onFollowersPress={() => openFollowers("followers")}
          onFollowingPress={() => openFollowers("following")}
        />

        {isFan ? (
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
      <ProfileView top={top} tabs={tabs} canCreatePost={!isFan} ownerId={userId} />

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
