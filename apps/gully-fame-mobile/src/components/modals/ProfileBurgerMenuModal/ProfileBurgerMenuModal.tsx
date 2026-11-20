// File Route: apps/gully-fame-mobile/components/ProfileBurgerMenuModal.tsx

import { router } from "expo-router";
import { Modal, TouchableOpacity, View, Text, Image, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ProfileData } from "@/components/profile/shared/profileHooks";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { getMyKyc } from "@/api/services/kycService";
import { getWalletSummary } from "@/api/services/walletService";
import { getMyCompetitions } from "@/api/services/competitionService";
import { toastError } from "@/components/ui/Toast";
import ComingSoonPopup from "@/components/ui/ComingSoonPopup";
import { apiGet, getErrorMessage } from "@/api/client";

// Same brown + orange palette as the rest of the app.
const C = {
  bg: "#3C2610",
  card: "#1A1A1A",
  inner: "#252525",
  border: "#2A2A2A",
  accent: "#EC9A15",
  accentSoft: "rgba(236, 154, 21, 0.15)",
  danger: "#FF6B6B",
  dangerSoft: "rgba(255, 107, 107, 0.12)",
  success: "#22C55E",
  text: "#FFFFFF",
  muted: "#CAD7D8",
  faint: "#8A8F90",
};

interface ProfileBurgerMenuModalProps {
  isVisible: boolean;
  onClose?: () => void;
  profileData: ProfileData;
}

interface UserStats {
  competitionCount: number;
  coinsEarned: number;
  kycStatus: "not submitted" | "pending" | "approved" | "rejected";
  walletBalance: number;
  totalEarnings: number;
  totalTips: number;
}

type IconName = keyof typeof Ionicons.glyphMap;

type MenuItem = {
  id: string;
  label: string;
  icon: IconName;
  path: string;
  danger?: boolean;
};

const PROFILE_ITEMS: MenuItem[] = [
  { id: "account-center", label: "Account Center", icon: "person-circle-outline", path: "/(main)/account-center" },
  { id: "history", label: "History", icon: "time-outline", path: "/(main)/history" },
  { id: "saved-posts-reels", label: "Save Posts", icon: "bookmark-outline", path: "/(main)/saved" },
  { id: "invite-your-friend", label: "Invite Your Friend", icon: "person-add-outline", path: "/(main)/invite-friend" },
  { id: "downloads", label: "Downloads", icon: "download-outline", path: "/(main)/downloads" },
];

const SETTINGS_ITEMS: MenuItem[] = [
  { id: "help-and-support", label: "Help & Support", icon: "help-circle-outline", path: "/(main)/settings/help-support" },
  { id: "faqs", label: "FAQs", icon: "chatbubble-ellipses-outline", path: "/(main)/faq" },
  { id: "privacy-policy", label: "Privacy Policy", icon: "lock-closed-outline", path: "/(main)/privacy-policy" },
  { id: "terms-of-service", label: "Terms of Service", icon: "document-text-outline", path: "/(main)/terms-of-service" },
  { id: "blocked-users", label: "Blocked Users", icon: "ban-outline", path: "/(main)/settings/blocked-users" },
  { id: "kyc-status", label: "KYC Status", icon: "shield-checkmark-outline", path: "/(main)/settings/kyc-status" },
  { id: "about", label: "About", icon: "information-circle-outline", path: "/(main)/settings/about" },
  { id: "delete-account", label: "Delete Account", icon: "trash-outline", path: "/(main)/settings/delete-account", danger: true },
];

function ProfileBurgerMenuModal({ isVisible, onClose = () => {}, profileData }: ProfileBurgerMenuModalProps) {
  const [userStats, setUserStats] = useState<UserStats>({
    competitionCount: 0,
    coinsEarned: 0,
    kycStatus: "not submitted",
    walletBalance: 0,
    totalEarnings: 0,
    totalTips: 0,
  });
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [noCompetitionVisible, setNoCompetitionVisible] = useState(false);

  // Leaderboard is not ready yet: close the menu and show the coming-soon popup.
  // Opens the leaderboard of your current competition: a live one first, otherwise the latest you joined.
  const openLeaderboardRank = async (close: () => void) => {
    try {
      const { competitions } = await getMyCompetitions(1, 20);
      const target = competitions.find((c) => c.status === "LIVE") ?? competitions[0];
      close();
      setTimeout(() => {
        if (target) router.push(`/(main)/leaderboard/${target._id}` as any);
        else setNoCompetitionVisible(true);
      }, 120);
    } catch (e) {
      toastError(getErrorMessage(e));
    }
  };

  // Fetch real-time user statistics from backend
  const fetchUserStats = async () => {
    setLoading(true);
    try {
      const [kyc, wallet, competitions] = await Promise.all([
        getMyKyc().catch(() => null),
        getWalletSummary(),
        apiGet<{ total: number }>("user/competitions", { params: { page: 1, limit: 1 } }).catch(() => ({ total: 0 })),
      ]);
      const tipsReceived = wallet.transactions.filter((tx) => tx.type === "TIP_RECEIVED").length;
      setUserStats({
        competitionCount: competitions.total || 0,
        coinsEarned: wallet.earned,
        kycStatus: kyc ? (kyc.status.toLowerCase() as UserStats["kycStatus"]) : "not submitted",
        walletBalance: wallet.balance,
        totalEarnings: wallet.earned,
        totalTips: tipsReceived,
      });
    } catch {
      // Keep the previous values; the menu still works without stats.
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats when modal becomes visible
  useEffect(() => {
    if (isVisible) {
      fetchUserStats();
    }
  }, [isVisible]);

  // Pass a query flag so the target screen knows it was opened from the menu.
  const handleNavigation = (path: string) => {
    onClose();
    // Short delay so the drawer closes before the new screen opens.
    setTimeout(() => {
      router.push({
        pathname: path,
        params: { fromBurgerMenu: "true" },
      } as any);
    }, 120);
  };

  const kycLabel = userStats.kycStatus.charAt(0).toUpperCase() + userStats.kycStatus.slice(1);
  const kycColor = userStats.kycStatus === "approved" ? C.success : C.accent;

  const displayName =
    profileData.firstName && profileData.lastName
      ? `${profileData.firstName} ${profileData.lastName}`
      : profileData.firstName || profileData.lastName || "User";

  const renderItem = (item: MenuItem, extra?: React.ReactNode) => (
    <TouchableOpacity
      key={item.id}
      testID={`burger-menu-${item.id}`}
      style={styles.item}
      onPress={() => handleNavigation(item.path)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <View style={[styles.itemIcon, item.danger && styles.itemIconDanger]}>
        <Ionicons name={item.icon} size={18} color={item.danger ? C.danger : C.accent} />
      </View>
      <Text style={[styles.itemText, item.danger && styles.itemTextDanger]}>{item.label}</Text>
      {extra}
      <Ionicons name="chevron-forward" size={16} color={C.faint} />
    </TouchableOpacity>
  );

  return (
    <>
      <Modal visible={isVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
        <View style={styles.backdrop}>
          {/* Drawer */}
          <View style={[styles.drawer, { paddingTop: insets.top + 8, paddingBottom: insets.bottom }]}>
            <View style={styles.drawerTop}>
              <Text style={styles.drawerTitle}>Settings and activity</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close menu">
                <Ionicons name="close" size={20} color={C.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.drawerContent}>
              {/* Profile header */}
              <View style={styles.profile}>
                <View style={styles.avatarRing}>
                  <Image
                    source={
                      profileData.profileImage
                        ? { uri: profileData.profileImage }
                        : require("@assets/images/default-avatar.png")
                    }
                    style={styles.avatar}
                  />
                </View>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
                  {profileData.isVerified && (
                    <Ionicons name="checkmark-circle" size={18} color={C.accent} />
                  )}
                </View>
              </View>

              {/* Stat tiles */}
              <View style={styles.statRow}>
                <TouchableOpacity style={styles.statTile} onPress={() => handleNavigation("/(main)/coins")} activeOpacity={0.7}>
                  {loading ? (
                    <ActivityIndicator size="small" color={C.accent} />
                  ) : (
                    <Text style={styles.statValue}>{userStats.coinsEarned.toLocaleString("en-IN")}</Text>
                  )}
                  <Text style={styles.statLabel}>Coins</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.statTile}
                  onPress={() => openLeaderboardRank(onClose)}
                  activeOpacity={0.7}
                  testID="burger-menu-leaderboard-rank"
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={C.accent} />
                  ) : (
                    <Text style={styles.statValue}>{userStats.competitionCount > 0 ? userStats.competitionCount : "--"}</Text>
                  )}
                  <Text style={styles.statLabel}>Competitions</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.statTile} onPress={() => handleNavigation("/(main)/settings/kyc-status")} activeOpacity={0.7}>
                  {loading ? (
                    <ActivityIndicator size="small" color={C.accent} />
                  ) : (
                    <Text
                      style={[styles.statValue, { color: kycColor, fontSize: 13, textAlign: "center" }]}
                      numberOfLines={2}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                    >
                      {kycLabel}
                    </Text>
                  )}
                  <Text style={styles.statLabel}>KYC</Text>
                </TouchableOpacity>
              </View>

              {/* Profile */}
              <Text style={styles.sectionTitle}>Profile</Text>
              <View style={styles.group}>{PROFILE_ITEMS.map((item) => renderItem(item))}</View>

              {/* Rewards */}
              <Text style={styles.sectionTitle}>Rewards</Text>
              <View style={styles.group}>
                <TouchableOpacity
                  testID="burger-menu-leaderboard-item"
                  style={styles.item}
                  onPress={() => openLeaderboardRank(onClose)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Leaderboard rank"
                >
                  <View style={styles.itemIcon}>
                    <Ionicons name="trophy-outline" size={18} color={C.accent} />
                  </View>
                  <Text style={styles.itemText}>Leaderboard Rank</Text>
                  <Ionicons name="chevron-forward" size={16} color={C.faint} />
                </TouchableOpacity>
                <TouchableOpacity
                  testID="burger-menu-coins-earned"
                  style={styles.item}
                  onPress={() => handleNavigation("/(main)/coins")}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Coins earned"
                >
                  <View style={styles.itemIcon}>
                    <Ionicons name="cash-outline" size={18} color={C.accent} />
                  </View>
                  <Text style={styles.itemText}>Coins Earned</Text>
                  <Text style={styles.itemHint}>{`${userStats.coinsEarned.toLocaleString("en-IN")}`}</Text>
                  <Ionicons name="chevron-forward" size={16} color={C.faint} />
                </TouchableOpacity>
              </View>

              {/* Settings & help */}
              <Text style={styles.sectionTitle}>Settings & Help</Text>
              <View style={styles.group}>{SETTINGS_ITEMS.map((item) => renderItem(item))}</View>

              {/* Logout */}
              <TouchableOpacity
                testID="burger-menu-logout"
                style={styles.logout}
                onPress={async () => {
                  onClose();
                  const { performLogout } = await import("@utils/logout");
                  await performLogout();
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Ionicons name="log-out-outline" size={18} color={C.danger} />
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>

          {/* Tap outside the drawer to close */}
          <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} accessibilityLabel="Close menu" />
        </View>
      </Modal>

      <ComingSoonPopup
        visible={noCompetitionVisible}
        title="No ranking yet"
        message="Join a competition to see where you rank on its leaderboard."
        icon="trophy-outline"
        onClose={() => setNoCompetitionVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  drawer: {
    width: "84%",
    maxWidth: 360,
    height: "100%",
    backgroundColor: C.bg,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 16,
  },
  drawerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 6,
  },
  drawerTitle: {
    color: C.text,
    fontSize: 18,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.inner,
    justifyContent: "center",
    alignItems: "center",
  },
  drawerContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  scrim: {
    flex: 1,
  },

  // Profile
  profile: {
    alignItems: "center",
    paddingVertical: 14,
  },
  avatarRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: C.accent,
    padding: 3,
    marginBottom: 10,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "100%",
  },
  name: {
    color: C.text,
    fontSize: 18,
    fontFamily: "PlayfairDisplay_700Bold",
    flexShrink: 1,
  },

  // Stat tiles
  statRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
  },
  statTile: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: "center",
    minHeight: 68,
    justifyContent: "center",
  },
  statValue: {
    color: C.text,
    fontSize: 16,
    fontFamily: "Rubik_700Bold",
  },
  statLabel: {
    color: C.faint,
    fontSize: 11,
    marginTop: 4,
    fontFamily: "Rubik_500Medium",
  },

  // Sections and items
  sectionTitle: {
    color: C.accent,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontFamily: "Rubik_600SemiBold",
    marginTop: 18,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  group: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
    gap: 12,
  },
  itemIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.accentSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  itemIconDanger: {
    backgroundColor: C.dangerSoft,
  },
  itemText: {
    flex: 1,
    color: C.text,
    fontSize: 15,
    fontFamily: "Rubik_500Medium",
  },
  itemTextDanger: {
    color: C.danger,
  },
  itemHint: {
    color: C.accent,
    fontSize: 13,
    fontFamily: "Rubik_600SemiBold",
  },

  // Logout
  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 22,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.danger,
    paddingVertical: 14,
    backgroundColor: C.dangerSoft,
  },
  logoutText: {
    color: C.danger,
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
  },
});

export default ProfileBurgerMenuModal;
