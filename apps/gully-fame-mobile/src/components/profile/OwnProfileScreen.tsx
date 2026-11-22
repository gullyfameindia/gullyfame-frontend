import React, { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router/react-navigation";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
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
import { toastSuccess } from "@/components/ui/Toast";
import { formatCount, resolveMediaUrl } from "@/utils/mediaUrl";
import { Camera, ChevronLeft, Eye, Settings, Star, X } from "lucide-react-native";
import { useOwnProfile } from "@/components/profile/shared/profileHooks";
import {
  BIO_MAX_LENGTH,
  getProfileRoute,
  limitBio,
} from "@/components/profile/shared/profileTypes";
import { LevelUpSection } from "@/components/profile/shared/ProfileComponents";
import { participantSelfProfileScreenStyles as pStyles } from "@/styles/participantSelfProfileScreenStyles";
import { UserIconSVG, HomeIconSVG, ReelIconSVG, SearchIconSVG, BackIcon, SaveIcon, VerifiedBadgeIcon } from "@/icons";
import KeyboardAvoidingScreen from "@/components/KeyboardAvoidingScreen";
import OutlinedField, { darkFieldInputStyle } from "@/components/ui/OutlinedField";
import * as ImagePicker from "expo-image-picker";
import { updateProfile } from "@api/services/userService";
import { getErrorMessage } from "@api/client";
import { validatePickedAsset } from "@/utils/fileValidation";
import { showPermissionSettingsAlert } from "@/utils/permissionSettings";
import { cleanUsername, usernameRuleProblem, useUsernameCheck, USERNAME_MAX } from "@/hooks/useUsernameCheck";
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
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 4,
  },
  topIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  topActions: { flexDirection: "row", alignItems: "center" },
  handle: { flex: 1, color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  handleWrap: { flex: 1, alignItems: "center" },
  handleEmpty: { flex: 0, color: "#EC9A15" },
  identity: { paddingHorizontal: 16, paddingTop: 8 },
  identityRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  avatarRing: { width: 86, height: 86, borderRadius: 43, padding: 3, borderWidth: 2, borderColor: "#EC9A15" },
  avatarRingFan: { borderColor: "rgba(255, 255, 255, 0.35)" },
  avatarImage: { width: "100%", height: "100%", borderRadius: 40, backgroundColor: "#5A3C1C" },
  stats: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
  stat: { alignItems: "center", minWidth: 64, paddingVertical: 4 },
  statNumber: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { color: "#CAD7D8", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  name: { color: "#fff", fontSize: 20, fontFamily: "PlayfairDisplay_700Bold", flexShrink: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  rank: { color: "#EC9A15", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  rankFan: { color: "#C9C2B8" },
  words: { flexShrink: 1, color: "#CAD7D8", fontSize: 13, fontFamily: "Inter_400Regular" },
  bio: { color: "rgba(255,255,255,0.92)", fontSize: 14, lineHeight: 20, marginTop: 10, fontFamily: "Inter_400Regular" },
  upgradeButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 12,
    height: 32,
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "rgba(236,154,21,0.18)",
  },
  upgradeText: { color: "#EC9A15", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  link: { color: "#EC9A15", fontSize: 14, fontFamily: "Inter_500Medium", marginTop: 6 },
  insights: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, marginTop: 2, marginBottom: 10 },
  insightsText: { color: "#8A8F90", fontSize: 13, fontFamily: "Inter_400Regular" },
});

const editStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.55)" },
  sheet: {
    maxHeight: "92%",
    backgroundColor: "#1A1A1A",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.35)",
    paddingTop: 8,
  },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "#3A3A3A", marginBottom: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 8 },
  title: { color: "#fff", fontSize: 20, fontFamily: "PlayfairDisplay_700Bold" },
  body: { paddingHorizontal: 20, paddingBottom: 12 },
  photoRow: { alignItems: "center", paddingVertical: 8 },
  photoWrap: { width: 84, height: 84 },
  photo: { width: 84, height: 84, borderRadius: 42, backgroundColor: "#5A3C1C" },
  photoEmpty: { alignItems: "center", justifyContent: "center" },
  photoLetter: { color: "#EC9A15", fontSize: 32, fontFamily: "Inter_700Bold" },
  photoBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EC9A15",
    borderWidth: 2,
    borderColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  photoText: { color: "#EC9A15", fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  nameRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  bioBox: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3A3A3A",
    backgroundColor: "#252525",
  },
  boxFocused: { borderColor: "#EC9A15" },
  boxLabel: { color: "#CAD7D8", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  bioInput: {
    minHeight: 70,
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    textAlignVertical: "top",
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  counter: { alignSelf: "flex-end", color: "#8A8F90", fontSize: 11, fontFamily: "Inter_400Regular" },
  sectionLabel: { color: "#CAD7D8", fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 18, marginBottom: 6 },
  wordsRow: { flexDirection: "row", gap: 8 },
  wordInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3A3A3A",
    backgroundColor: "#252525",
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  at: { color: "#8A8F90", fontSize: 14, fontFamily: "Inter_500Medium", marginLeft: 8, marginRight: 2 },
  note: { color: "#8A8F90", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 6 },
  error: { color: "#F87171", fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 10 },
  footer: { paddingHorizontal: 20, paddingTop: 10 },
  save: { height: 48, borderRadius: 12, backgroundColor: "#EC9A15", alignItems: "center", justifyContent: "center" },
  saveText: { color: "#1A1A1A", fontSize: 16, fontFamily: "Inter_700Bold" },
});

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();


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
  const [activeTab, setActiveTab] = useState("MyFame");
  const [menuVisible, setMenuVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [levelUpVisible, setLevelUpVisible] = useState(false);
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [tempBio, setTempBio] = useState("");
  const [tempThreeWords, setTempThreeWords] = useState(["", "", ""]);
  const [tempInsta, setTempInsta] = useState("");
  const [tempX, setTempX] = useState("");
  const [tempFirst, setTempFirst] = useState("");
  const [tempLast, setTempLast] = useState("");
  const [tempUsername, setTempUsername] = useState("");
  const usernameCheck = useUsernameCheck(tempUsername, {
    signedIn: true,
    current: profileData.username || "",
  });
  const [tempPhoto, setTempPhoto] = useState<string | null>(null);
  const [editFocus, setEditFocus] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
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
    setTempInsta(cleanHandle(profileData.instagramLink || ""));
    setTempX(cleanHandle(profileData.xLink || ""));
    setTempFirst(profileData.firstName || "");
    setTempLast(profileData.lastName || "");
    setTempUsername(cleanUsername(profileData.username || ""));
    setTempPhoto(null);
    setEditError("");
    setEditVisible(true);
  }, [profileData]);

  // Gallery only: the photo is uploaded when Save is pressed.
  const pickPhoto = async () => {
    const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      if (!canAskAgain) showPermissionSettingsAlert("Photo library access");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const invalid = validatePickedAsset(result.assets[0], ["image"]);
    if (invalid) {
      setEditError(invalid);
      return;
    }
    setEditError("");
    setTempPhoto(result.assets[0].uri);
  };

  const saveEdit = async () => {
    if (savingEdit) return;
    const first = tempFirst.trim();
    const last = tempLast.trim();
    if (!first) {
      setEditError("First name can't be empty.");
      return;
    }
    const handle = cleanUsername(tempUsername);
    const usernameChanged = handle !== cleanUsername(profileData.username || "");
    if (usernameChanged) {
      const problem = usernameRuleProblem(handle);
      if (problem) {
        setEditError(problem === "Choose a username" ? "Choose a username." : `Username: ${problem.toLowerCase()}.`);
        return;
      }
      if (usernameCheck.status === "taken" || usernameCheck.status === "invalid") {
        setEditError(usernameCheck.message);
        return;
      }
    }
    setSavingEdit(true);
    setEditError("");
    const threeWordsFormatted = tempThreeWords.map((w) => w.trim()).filter(Boolean).join(" | ");
    const insta = cleanHandle(tempInsta.trim());
    const x = cleanHandle(tempX.trim());
    try {
      // Name and photo are saved on the server (PUT /user/profile).
      const nameChanged = first !== (profileData.firstName || "") || last !== (profileData.lastName || "");
      if (nameChanged || usernameChanged || tempPhoto) {
        const saved = await updateProfile({
          ...(nameChanged ? { firstName: first, lastName: last } : {}),
          ...(usernameChanged ? { username: handle } : {}),
          ...(tempPhoto ? { profileImage: tempPhoto } : {}),
        });
        setProfileData((prev) => ({
          ...prev,
          firstName: saved.firstName ?? first,
          lastName: saved.lastName ?? last,
          username: saved.username ?? (usernameChanged ? handle : prev.username),
          profileImage: saved.profileImage || prev.profileImage,
        }));
      }
      // The backend has no bio / three-words / social link fields yet, so these stay on this device.
      await AsyncStorage.multiSet([
        ["userBio", limitBio(tempBio).trim()],
        ["userThreeWords", threeWordsFormatted],
        ["userInstagram", insta],
        ["userXLink", x],
      ]);
      setProfileData((prev) => ({
        ...prev,
        bio: limitBio(tempBio).trim(),
        threeWords: threeWordsFormatted || undefined,
        instagramLink: insta,
        xLink: x,
      }));
      toastSuccess("Profile updated");
      setEditVisible(false);
    } catch (error) {
      setEditError(getErrorMessage(error));
    } finally {
      setSavingEdit(false);
    }
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
      <Text style={{ color: "#EC9A15", fontSize: 34, fontFamily: "Inter_700Bold" }}>
        {displayName.charAt(0).toUpperCase()}
      </Text>
    </View>
  );

  const editAvatar = tempPhoto ? { uri: tempPhoto } : avatar;

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
          <ChevronLeft color="#fff" size={28} />
        </TouchableOpacity>
        {/* @username centred in the top bar; without one, a shortcut to pick it. */}
        {handle ? (
          <Text style={ownStyles.handle} numberOfLines={1} testID="profile-username">
            {handle}
          </Text>
        ) : (
          <TouchableOpacity style={ownStyles.handleWrap} onPress={openEdit} accessibilityRole="button" testID="profile-add-username">
            <Text style={[ownStyles.handle, ownStyles.handleEmpty]} numberOfLines={1}>
              Add username
            </Text>
          </TouchableOpacity>
        )}
        <View style={ownStyles.topActions}>
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            style={ownStyles.topIcon}
            accessibilityLabel="Menu"
            testID="profile-menu"
          >
            <Settings color="#fff" size={23} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={ownStyles.identity}>
        <View style={ownStyles.identityRow}>
          <View style={[ownStyles.avatarRing, isFan && ownStyles.avatarRingFan]}>{avatarImage}</View>
          {/* Posts / Followers / Following as columns: number on top, label below. */}
          <View style={ownStyles.stats}>
            <View style={ownStyles.stat}>
              <Text style={ownStyles.statNumber}>{countText(postCount)}</Text>
              <Text style={ownStyles.statLabel}>Posts</Text>
            </View>
            <TouchableOpacity
              style={ownStyles.stat}
              onPress={() => openFollowers("followers")}
              testID="profile-followers-count"
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={ownStyles.statNumber}>{countText(followersCount)}</Text>
              <Text style={ownStyles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={ownStyles.stat}
              onPress={() => openFollowers("following")}
              testID="profile-following-count"
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={ownStyles.statNumber}>{countText(followingCount)}</Text>
              <Text style={ownStyles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={ownStyles.nameRow}>
          <Text style={ownStyles.name} numberOfLines={1}>
            {displayName || (isLoading ? "" : "User")}
          </Text>
          {!displayName && isLoading ? <Skeleton width={140} height={20} radius={6} /> : null}
          {profileData.isVerified ? <VerifiedBadgeIcon size={18} /> : null}
        </View>
        <View style={ownStyles.metaRow}>
          <Star size={13} color={isFan ? "#C9C2B8" : "#EC9A15"} fill={isFan ? "transparent" : "#EC9A15"} strokeWidth={2} />
          <Text style={[ownStyles.rank, isFan && ownStyles.rankFan]}>
            {isFan ? "Fan" : titleCase(String(profileData.currentRank || "Star"))}
          </Text>
          {words.length > 0 ? (
            <Text style={ownStyles.words} numberOfLines={1}>
              {"  ·  "}
              {words.join(", ")}
            </Text>
          ) : null}
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

      {insights ? (
        <View
          style={ownStyles.insights}
          accessibilityLabel={`${insights.views} profile views in the last ${insights.days} days`}
        >
          <Eye size={15} color="#8A8F90" strokeWidth={2} />
          <Text style={ownStyles.insightsText} numberOfLines={1}>
            {formatCount(insights.views)} profile {insights.views === 1 ? "view" : "views"} · last {insights.days} days
          </Text>
        </View>
      ) : null}

      <View>

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
      </View>
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
        animationType="slide"
        onRequestClose={() => !savingEdit && setEditVisible(false)}
      >
        {/* Bottom sheet that shrinks above the keyboard; the header and Save stay reachable. */}
        <KeyboardAvoidingScreen style={editStyles.overlay}>
          <Pressable style={{ flex: 1 }} onPress={() => !savingEdit && setEditVisible(false)} />
          <View style={[editStyles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={editStyles.grabber} />
            <View style={editStyles.header}>
              <Text style={editStyles.title}>Edit profile</Text>
              <TouchableOpacity
                onPress={() => setEditVisible(false)}
                disabled={savingEdit}
                hitSlop={10}
                accessibilityLabel="Close"
                testID="profile-edit-close"
              >
                <X size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flexShrink: 1 }}
              contentContainerStyle={editStyles.body}
              keyboardShouldPersistTaps="handled"
              testID="profile-edit-scroll"
            >
              <TouchableOpacity style={editStyles.photoRow} onPress={pickPhoto} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Change profile photo">
                <View style={editStyles.photoWrap}>
                  {editAvatar ? (
                    <ExpoImage source={editAvatar} style={editStyles.photo} contentFit="cover" />
                  ) : (
                    <View style={[editStyles.photo, editStyles.photoEmpty]}>
                      <Text style={editStyles.photoLetter}>{(tempFirst || displayName).charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={editStyles.photoBadge}>
                    <Camera size={14} color="#1A1A1A" strokeWidth={2.2} />
                  </View>
                </View>
                <Text style={editStyles.photoText}>{tempPhoto ? "New photo selected" : "Change photo"}</Text>
              </TouchableOpacity>

              <View style={editStyles.nameRow}>
                <OutlinedField dark label="First name" required focused={editFocus === "first"} style={{ flex: 1 }}>
                  <TextInput
                    style={darkFieldInputStyle}
                    value={tempFirst}
                    onChangeText={setTempFirst}
                    onFocus={() => setEditFocus("first")}
                    onBlur={() => setEditFocus(null)}
                    maxLength={40}
                    autoCapitalize="words"
                    testID="profile-edit-first-name"
                  />
                </OutlinedField>
                <OutlinedField dark label="Last name" focused={editFocus === "last"} style={{ flex: 1 }}>
                  <TextInput
                    style={darkFieldInputStyle}
                    value={tempLast}
                    onChangeText={setTempLast}
                    onFocus={() => setEditFocus("last")}
                    onBlur={() => setEditFocus(null)}
                    maxLength={40}
                    autoCapitalize="words"
                    testID="profile-edit-last-name"
                  />
                </OutlinedField>
              </View>

              <OutlinedField
                dark
                label="Username"
                required
                icon="at-outline"
                focused={editFocus === "username"}
                error={usernameCheck.status === "taken" || usernameCheck.status === "invalid" ? usernameCheck.message : false}
                helper={
                  usernameCheck.status === "available"
                    ? `✓ ${usernameCheck.message}`
                    : usernameCheck.status === "checking"
                      ? "Checking…"
                      : editFocus === "username"
                        ? "3–20 characters: a–z, 0–9, . and _"
                        : undefined
                }
              >
                <TextInput
                  style={darkFieldInputStyle}
                  value={tempUsername}
                  onChangeText={(t) => setTempUsername(cleanUsername(t))}
                  onFocus={() => setEditFocus("username")}
                  onBlur={() => setEditFocus(null)}
                  placeholder="e.g. john.dances"
                  placeholderTextColor="#7C8283"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={USERNAME_MAX}
                  testID="profile-edit-username"
                />
              </OutlinedField>

              <View style={[editStyles.bioBox, editFocus === "bio" && editStyles.boxFocused]}>
                <Text style={editStyles.boxLabel}>Bio</Text>
                <TextInput
                  style={editStyles.bioInput}
                  value={tempBio}
                  testID="profile-edit-bio"
                  onChangeText={(text) => setTempBio(limitBio(text))}
                  onFocus={() => setEditFocus("bio")}
                  onBlur={() => setEditFocus(null)}
                  placeholder="What do you perform? Where are you from?"
                  placeholderTextColor="#7C8283"
                  multiline
                  maxLength={BIO_MAX_LENGTH}
                />
                <Text style={editStyles.counter}>
                  {tempBio.length}/{BIO_MAX_LENGTH}
                </Text>
              </View>

              <Text style={editStyles.sectionLabel}>Three words about you</Text>
              <View style={editStyles.wordsRow}>
                {[0, 1, 2].map((i) => (
                  <TextInput
                    key={i}
                    style={[editStyles.wordInput, editFocus === `w${i}` && editStyles.boxFocused]}
                    placeholder={["Bold", "Creative", "Fearless"][i]}
                    placeholderTextColor="#7C8283"
                    value={tempThreeWords[i]}
                    maxLength={20}
                    testID={`profile-edit-word-${i + 1}`}
                    onFocus={() => setEditFocus(`w${i}`)}
                    onBlur={() => setEditFocus(null)}
                    onChangeText={(text) => {
                      const next = [...tempThreeWords];
                      next[i] = text;
                      setTempThreeWords(next);
                    }}
                  />
                ))}
              </View>

              <Text style={editStyles.sectionLabel}>Links</Text>
              <OutlinedField dark label="Instagram" focused={editFocus === "ig"}>
                <InstagramIconSVG width={18} height={18} color="#EC9A15" />
                <Text style={editStyles.at}>@</Text>
                <TextInput
                  style={darkFieldInputStyle}
                  placeholder="username"
                  placeholderTextColor="#7C8283"
                  value={tempInsta}
                  testID="profile-edit-instagram"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setEditFocus("ig")}
                  onBlur={() => setEditFocus(null)}
                  onChangeText={setTempInsta}
                />
              </OutlinedField>
              <OutlinedField dark label="X (Twitter)" focused={editFocus === "x"}>
                <XIconSVG width={16} height={16} color="#EC9A15" />
                <Text style={editStyles.at}>@</Text>
                <TextInput
                  style={darkFieldInputStyle}
                  placeholder="username"
                  placeholderTextColor="#7C8283"
                  value={tempX}
                  testID="profile-edit-x"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setEditFocus("x")}
                  onBlur={() => setEditFocus(null)}
                  onChangeText={setTempX}
                />
              </OutlinedField>
              <Text style={editStyles.note}>Bio, words and links are saved on this phone for now.</Text>

              {editError ? <Text style={editStyles.error}>{editError}</Text> : null}
            </ScrollView>

            <View style={editStyles.footer}>
              <TouchableOpacity
                style={[editStyles.save, savingEdit && { opacity: 0.6 }]}
                onPress={saveEdit}
                disabled={savingEdit}
                testID="profile-edit-save"
              >
                {savingEdit ? <ActivityIndicator color="#1A1A1A" /> : <Text style={editStyles.saveText}>Save</Text>}
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
