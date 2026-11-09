// File Route: apps/gully-fame-mobile/components/ProfileBurgerMenuModal.tsx

import { router } from "expo-router";
import { openOwnProfile } from "@/utils/openProfile";
import { styles } from "./styles";
import {
  Modal,
  TouchableOpacity,
  View,
  Text,
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Svg, Path, Circle, Polyline, Line, Text as SvgText } from "react-native-svg";
import { ProfileData } from "@/components/profile/shared/profileHooks";
import { useEffect, useState } from "react";
import { getMyKyc } from "@/api/services/kycService";
import { getWalletSummary } from "@/api/services/walletService";
import { apiGet } from "@/api/client";

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

function ProfileBurgerMenuModal({
  isVisible,
  onClose = () => {},
  profileData,
}: ProfileBurgerMenuModalProps) {
  const [userStats, setUserStats] = useState<UserStats>({
    competitionCount: 0,
    coinsEarned: 0,
    kycStatus: "not submitted",
    walletBalance: 0,
    totalEarnings: 0,
    totalTips: 0,
  });
  const [loading, setLoading] = useState(false);

  // ✅ Fetch real-time user statistics from backend
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

  // ✅ FIXED: Pass metadata query state parameter to capture deep-back history intent
  const handleNavigation = (path: string) => {
    onClose();
    
    // Smooth transition buffer queue
    setTimeout(() => {
      router.push({
        pathname: path,
        params: { fromBurgerMenu: "true" }
      } as any);
    }, 120);
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.menuOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.menuContainer}>
          {/* Profile Section */}
          <View style={styles.menuProfileSection}>
            {profileData.profileImage ? (
              <Image
                source={{ uri: profileData.profileImage }}
                style={styles.menuProfileImage}
              />
            ) : (
              <Image
                source={require("@assets/images/user2.png")}
                style={styles.menuProfileImage}
              />
            )}
            <View style={styles.menuProfileNameRow}>
              <Text style={styles.menuProfileName}>
                {profileData.firstName && profileData.lastName
                  ? `${profileData.firstName} ${profileData.lastName}`
                  : profileData.firstName || profileData.lastName || "User"}
              </Text>
              {profileData.isVerified && (
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" style={styles.menuVerifiedBadge}>
                  <Path d="M21.5609 10.7386L20.2009 9.15859C19.9409 8.85859 19.7309 8.29859 19.7309 7.89859V6.19859C19.7309 5.13859 18.8609 4.26859 17.8009 4.26859H16.1009C15.7109 4.26859 15.1409 4.05859 14.8409 3.79859L13.2609 2.43859C12.5709 1.84859 11.4409 1.84859 10.7409 2.43859L9.17086 3.80859C8.87086 4.05859 8.30086 4.26859 7.91086 4.26859H6.18086C5.12086 4.26859 4.25086 5.13859 4.25086 6.19859V7.90859C4.25086 8.29859 4.04086 8.85859 3.79086 9.15859L2.44086 10.7486C1.86086 11.4386 1.86086 12.5586 2.44086 13.2486L3.79086 14.8386C4.04086 15.1386 4.25086 15.6986 4.25086 16.0886V17.7986C4.25086 18.8586 5.12086 19.7286 6.18086 19.7286H7.91086C8.30086 19.7286 8.87086 19.9386 9.17086 20.1986L10.7509 21.5586C11.4409 22.1486 12.5709 22.1486 13.2709 21.5586L14.8509 20.1986C15.1509 19.9386 15.7109 19.7286 16.1109 19.7286H17.8109C18.8709 19.7286 19.7409 18.8586 19.7409 17.7986V16.0986C19.7409 15.7086 19.9509 15.1386 20.2109 14.8386L21.5709 13.2586C22.1509 12.5686 22.1509 11.4286 21.5609 10.7386ZM16.1609 10.1086L11.3309 14.9386C11.1909 15.0786 11.0009 15.1586 10.8009 15.1586C10.6009 15.1586 10.4109 15.0786 10.2709 14.9386L7.85086 12.5186C7.56086 12.2286 7.56086 11.7486 7.85086 11.4586C8.14086 11.1686 8.62086 11.1686 8.91086 11.4586L10.8009 13.3486L15.1009 9.04859C15.3909 8.75859 15.8709 8.75859 16.1609 9.04859C16.4509 9.33859 16.4509 9.81859 16.1609 10.1086Z" fill="#ec9a15" />
                </Svg>
              )}
            </View>
          </View>

          <View style={styles.menuDividerGold} />

          <ScrollView showsVerticalScrollIndicator={false} style={styles.menuScrollView}>
            {/* Profile Management Section */}
            <Text style={styles.menuSectionTitle}>Profile Management</Text>

            <TouchableOpacity testID="burger-menu-account-center" style={styles.menuItem} onPress={() => handleNavigation(`/(main)/account-center`)}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="#EC9A15" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M12 11v8M12 19l-3-3m3 3l3-3" stroke="#EC9A15" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.menuItemText}>Account Center</Text>
            </TouchableOpacity>

            <TouchableOpacity testID="burger-menu-history" style={styles.menuItem} onPress={() => handleNavigation("/(main)/history")}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#EC9A15" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="#EC9A15" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.menuItemText}>History</Text>
            </TouchableOpacity>

            <TouchableOpacity testID="burger-menu-leaderboard-rank" style={styles.menuItem} onPress={() => {
              onClose();
              setTimeout(() => openOwnProfile(), 120);
            }}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="#EC9A15" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <View style={styles.menuItemWithBadge}>
                <Text style={styles.menuItemText}>Leaderboard Rank</Text>
                {loading ? (
                  <ActivityIndicator size="small" color="#EC9A15" />
                ) : (
                  <Text style={styles.rankBadgeText}>{userStats.competitionCount > 0 ? `${userStats.competitionCount} comps` : "--"}</Text>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity testID="burger-menu-coins-earned" style={styles.menuItem} onPress={() => handleNavigation("/(main)/history")}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="12" r="10" stroke="#EC9A15" strokeWidth={2} />
                <Path d="M12 6v6l4 2" stroke="#EC9A15" strokeWidth={2} strokeLinecap="round" />
              </Svg>
              <View style={styles.menuItemWithBadge}>
                <Text style={styles.menuItemText}>Coins Earned</Text>
                {loading ? (
                  <ActivityIndicator size="small" color="#EC9A15" />
                ) : (
                  <Text style={styles.rankBadgeText}>
                    {`${userStats.coinsEarned.toLocaleString()} coins`}
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity testID="burger-menu-saved-posts-reels" style={styles.menuItem} onPress={() => handleNavigation("/(main)/saved")}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke="#EC9A15" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.menuItemText}>Saved Posts / Reels</Text>
            </TouchableOpacity>

            <TouchableOpacity testID="burger-menu-invite-your-friend" style={styles.menuItem} onPress={() => handleNavigation("/(main)/invite-friend")}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="#EC9A15" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <Circle cx="9" cy="7" r="4" stroke="#EC9A15" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="#EC9A15" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.menuItemText}>Invite Your Friend</Text>
            </TouchableOpacity>

            <TouchableOpacity testID="burger-menu-downloads" style={styles.menuItem} onPress={() => handleNavigation("/(main)/downloads")}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#EC9A15" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <Polyline points="7 10 12 15 17 10" stroke="#EC9A15" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <Line x1="12" y1="15" x2="12" y2="3" stroke="#EC9A15" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.menuItemText}>Downloads</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            {/* Settings & Help Section */}
            <Text style={styles.menuSectionTitle}>Settings & Help</Text>

            <TouchableOpacity testID="burger-menu-help-and-support" style={styles.menuItem} onPress={() => handleNavigation("/(main)/settings/help-support")}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="12" r="10" stroke="#EC9A15" strokeWidth={2} />
                <Path d="M12 16v-4M12 8h.01" stroke="#EC9A15" strokeWidth={2} strokeLinecap="round" />
              </Svg>
              <Text style={styles.menuItemText}>Help & Support</Text>
            </TouchableOpacity>

            <TouchableOpacity testID="burger-menu-faqs" style={styles.menuItem} onPress={() => handleNavigation("/(main)/faq")}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="12" r="10" stroke="#EC9A15" strokeWidth={2} />
                <SvgText x="12" y="16" textAnchor="middle" stroke="#EC9A15" fill="#EC9A15" fontSize="12" fontWeight="bold">?</SvgText>
                <Path d="M12 16v-4M12 8h.01" stroke="#EC9A15" strokeWidth={2} strokeLinecap="round" />
              </Svg>
              <Text style={styles.menuItemText}>FAQs</Text>
            </TouchableOpacity>

            <TouchableOpacity testID="burger-menu-privacy-policy" style={styles.menuItem} onPress={() => handleNavigation("/(main)/privacy-policy")}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#EC9A15" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.menuItemText}>Privacy Policy</Text>
            </TouchableOpacity>

            <TouchableOpacity testID="burger-menu-terms-of-service" style={styles.menuItem} onPress={() => handleNavigation("/(main)/terms-of-service")}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#EC9A15" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="#EC9A15" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.menuItemText}>Terms of Service</Text>
            </TouchableOpacity>
            

            <TouchableOpacity testID="burger-menu-blocked-users" style={styles.menuItem} onPress={() => handleNavigation("/(main)/settings/blocked-users")}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="12" r="10" stroke="#EC9A15" strokeWidth={2} />
                <Path d="M4.9 4.9l14.2 14.2" stroke="#EC9A15" strokeWidth={2} strokeLinecap="round" />
              </Svg>
              <Text style={styles.menuItemText}>Blocked Users</Text>
            </TouchableOpacity>

            <TouchableOpacity testID="burger-menu-delete-account" style={styles.menuItem} onPress={() => handleNavigation("/(main)/settings/delete-account")}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#EC9A15" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.menuItemText}>Delete Account</Text>
            </TouchableOpacity>

            <TouchableOpacity testID="burger-menu-kyc-status" style={styles.menuItem} onPress={() => handleNavigation("/(main)/settings/kyc-status")}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path d="M9 12l2 2 4-4" stroke="#EC9A15" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3" stroke="#EC9A15" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3" stroke="#EC9A15" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <View style={styles.menuItemWithBadge}>
                <Text style={styles.menuItemText}>KYC Status</Text>
                {loading ? (
                  <ActivityIndicator size="small" color="#EC9A15" />
                ) : (
                  <Text style={[styles.rankBadgeText, { color: userStats.kycStatus === "approved" ? "#22c55e" : "#EC9A15" }]}>
                    {userStats.kycStatus.charAt(0).toUpperCase() + userStats.kycStatus.slice(1)}
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity testID="burger-menu-about" style={styles.menuItem} onPress={() => handleNavigation("/(main)/settings/about")}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="12" r="10" stroke="#EC9A15" strokeWidth={2} />
                <Path d="M12 16v-4M12 8h.01" stroke="#EC9A15" strokeWidth={2} strokeLinecap="round" />
              </Svg>
              <Text style={styles.menuItemText}>About</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              testID="burger-menu-logout"
              style={[styles.menuItem, styles.logoutItem]}
              onPress={async () => {
                onClose();
                const { performLogout } = await import("@utils/logout");
                await performLogout();
              }}
            >
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="#FF6B6B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
            </TouchableOpacity>

            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export default ProfileBurgerMenuModal;
