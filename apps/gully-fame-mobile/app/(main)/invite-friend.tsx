

import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Linking,
  Alert,
  Share,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { getReferral, applyReferralCode, ReferralSummary } from "@/api/services/userService";
import { getErrorMessage } from "@/api/client";
import { toastError, toastSuccess } from "@/components/ui/Toast";

const socialPlatforms = [
  { id: 1, name: "WhatsApp", icon: "whatsapp", provider: FontAwesome5, color: "#25D366" },
  { id: 2, name: "Instagram", icon: "instagram", provider: FontAwesome5, color: "#E4405F" },
  { id: 3, name: "Snapchat", icon: "snapchat-ghost", provider: FontAwesome5, color: "#FFEC06" },
  { id: 4, name: "Twitter", icon: "twitter", provider: FontAwesome5, color: "#1DA1F2" },
  { id: 5, name: "Facebook", icon: "facebook", provider: FontAwesome5, color: "#1877F2" },
];

export default function InviteFriendScreen() {
  const insets = useSafeAreaInsets();
  
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [codeLoading, setCodeLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [friendCode, setFriendCode] = useState("");
  const [applying, setApplying] = useState(false);
  const userReferralCode = summary?.referralCode?.trim() || null;

  // GET user/referral: own code, rewards and invite stats (code is created on first visit).
  useEffect(() => {
    let active = true;
    getReferral()
      .then((data) => {
        if (active) setSummary(data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setCodeLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleApplyFriendCode = async () => {
    const code = friendCode.trim();
    if (!code || applying) return;
    setApplying(true);
    try {
      const updated = await applyReferralCode(code);
      setSummary(updated);
      setFriendCode("");
      toastSuccess(
        updated.usedCodeStatus === "REWARDED"
          ? `Code applied. You got ${updated.newUserCoins} GFI coins!`
          : "Code applied! Your coins arrive once your phone is verified, your profile is complete and your account is 3 days old."
      );
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
      setApplying(false);
    }
  };

  const shareUrl = "https://gullyfame.com/download";
  const shareMessage = `Join me on Gully Fame!${userReferralCode ? ` My referral code: ${userReferralCode}` : ""}\n\nDownload now: ${shareUrl}`;

  const copyToClipboard = async () => {
    if (!userReferralCode) return;
    await Clipboard.setStringAsync(userReferralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Sharing works without a code: the message then carries only the download link.
  const handleShare = async (platform: string) => {
    try {
      switch (platform) {
        case "WhatsApp": {
          const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(shareMessage)}`;
          const canOpenWhatsApp = await Linking.canOpenURL(whatsappUrl);
          if (canOpenWhatsApp) {
            await Linking.openURL(whatsappUrl);
          } else {
            Alert.alert("WhatsApp not installed", "Please install WhatsApp to share.");
          }
          break;
        }
        case "Instagram":
          await Share.share({ message: shareMessage, title: "Invite to Gully Fame" });
          break;
        case "Snapchat": {
          const snapchatUrl = `snapchat://share?text=${encodeURIComponent(shareMessage)}`;
          const canOpenSnap = await Linking.canOpenURL(snapchatUrl);
          if (canOpenSnap) {
            await Linking.openURL(snapchatUrl);
          } else {
            Alert.alert("Snapchat not installed", "Please install Snapchat to share.");
          }
          break;
        }
        case "Twitter": {
          const twitterUrl = `twitter://post?message=${encodeURIComponent(shareMessage)}`;
          const canOpenTwitter = await Linking.canOpenURL(twitterUrl);
          if (canOpenTwitter) {
            await Linking.openURL(twitterUrl);
          } else {
            await Linking.openURL(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`);
          }
          break;
        }
        case "Facebook": {
          const facebookUrl = `fb://share?text=${encodeURIComponent(shareMessage)}`;
          const canOpenFB = await Linking.canOpenURL(facebookUrl);
          if (canOpenFB) {
            await Linking.openURL(facebookUrl);
          } else {
            await Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`);
          }
          break;
        }
        default:
          await Share.share({ message: shareMessage, title: "Invite to Gully Fame" });
      }
    } catch {
      Alert.alert("Error", "Unable to share. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2610" />

      {}
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => router.back()} style={styles.backButton} testID="invite-back">
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite & Earn</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {}
        <View style={styles.referralCard}>
          <Text style={styles.referralTitle}>Your Referral Code</Text>
          {summary ? (
            <Text style={styles.rewardText} testID="invite-reward-text">
              Invite a friend: you get {summary.referrerCoins} GFI coins and your friend gets {summary.newUserCoins} once
              they verify their phone, complete their profile (name, username and photo) and their account is 3 days old.
            </Text>
          ) : null}
          {codeLoading ? (
            <View style={styles.codeBox}>
              <ActivityIndicator size="small" color="#EC9A15" />
            </View>
          ) : userReferralCode ? (
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{userReferralCode}</Text>
              <TouchableOpacity
                style={[styles.copyButton, copied && styles.copiedButton]}
                onPress={copyToClipboard}
                activeOpacity={0.7}
              >
                <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={20} color="#fff" />
                <Text style={styles.copyText}>{copied ? "Copied!" : "Copy"}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.comingSoonBox} testID="invite-referral-coming-soon">
              <Ionicons name="time-outline" size={22} color="#EC9A15" />
              <Text style={styles.comingSoonTitle}>Couldn't load your referral code</Text>
              <Text style={styles.comingSoonText}>
                Check your connection and open this page again. You can still share the download link below.
              </Text>
            </View>
          )}
          {userReferralCode ? (
            <Text style={styles.referralSubText}>Share this code with your friends.</Text>
          ) : null}
          {summary && summary.invited > 0 ? (
            <Text style={styles.statsText} testID="invite-stats">
              Invited {summary.invited} · Rewarded {summary.rewarded} · Coins earned {summary.coinsEarned}
            </Text>
          ) : null}
        </View>

        {/* Using a friend's code: new accounts only (the server decides with canApplyCode). */}
        {summary?.canApplyCode ? (
          <View style={styles.referralCard} testID="invite-apply-code">
            <Text style={styles.referralTitle}>Got a code from a friend?</Text>
            <TextInput
              style={styles.friendCodeInput}
              placeholder="Enter referral code"
              placeholderTextColor="#777"
              value={friendCode}
              onChangeText={(t) => setFriendCode(t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
            />
            <TouchableOpacity
              style={[styles.applyButton, (!friendCode.trim() || applying) && { opacity: 0.6 }]}
              onPress={handleApplyFriendCode}
              disabled={!friendCode.trim() || applying}
              activeOpacity={0.8}
            >
              {applying ? <ActivityIndicator color="#fff" /> : <Text style={styles.copyText}>Apply code</Text>}
            </TouchableOpacity>
          </View>
        ) : summary?.usedCode ? (
          <Text style={styles.usedCodeText} testID="invite-used-code">
            You joined with code {summary.usedCode}.{" "}
            {summary.usedCodeStatus === "REWARDED"
              ? `You received ${summary.newUserCoins} GFI coins.`
              : `Your ${summary.newUserCoins} GFI coins arrive once your phone is verified, your profile has a name, username and photo, and your account is 3 days old.`}
          </Text>
        ) : null}

        {}
        <Text style={styles.sectionTitle}>Share via</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.platformsContainer}>
          {socialPlatforms.map((platform) => {
            const IconProvider = platform.provider;
            return (
              <TouchableOpacity
                key={platform.id}
                style={styles.platformCard}
                onPress={() => handleShare(platform.name)}
                testID={`invite-share-${platform.name.toLowerCase()}`}
                activeOpacity={0.7}
              >
                <View style={styles.iconContainer}>
                  <IconProvider name={platform.icon} size={36} color={platform.color} />
                </View>
                <Text style={styles.platformName}>{platform.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3C2610",
    paddingTop: Platform.OS === "android" ? 20 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  referralCard: {
    backgroundColor: "#252525",
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.4)",
    alignItems: "center",
  },
  comingSoonBox: {
    alignSelf: "stretch",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 6,
  },
  comingSoonTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  comingSoonText: {
    color: "#aaa",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  referralTitle: {
    alignSelf: "stretch",
    textAlign: "center",
    color: "#ccc",
    fontSize: 16,
    marginBottom: 12,
  },
  codeBox: {
    flexDirection: "row",
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EC9A15",
    borderStyle: "dashed",
    paddingLeft: 20,
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 12,
  },
  codeText: {
    color: "#EC9A15",
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  copyButton: {
    backgroundColor: "#EC9A15",
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    alignItems: "center",
    gap: 6,
  },
  copiedButton: {
    backgroundColor: "#25D366",
  },
  copyText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  rewardText: {
    color: "#EC9A15",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 14,
  },
  statsText: {
    color: "#ccc",
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
  },
  friendCodeInput: {
    alignSelf: "stretch",
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#444",
    color: "#fff",
    fontSize: 18,
    letterSpacing: 2,
    textAlign: "center",
    paddingVertical: 12,
    marginBottom: 12,
  },
  applyButton: {
    alignSelf: "stretch",
    backgroundColor: "#EC9A15",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  usedCodeText: {
    color: "#aaa",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  referralSubText: {
    color: "#999",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  platformsContainer: {
    flexDirection: "row",
    paddingVertical: 10,
    gap: 12,
    marginBottom: 20,
  },
  platformCard: {
    backgroundColor: "#252525",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    minWidth: 90,
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.15)",
  },
  iconContainer: {
    marginBottom: 8,
  },
  platformName: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  infoCard: {
    backgroundColor: "#252525",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.2)",
    marginTop: 10,
  },
  infoTitle: {
    color: "#EC9A15",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    backgroundColor: "rgba(236, 154, 21, 0.2)",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EC9A15",
  },
  stepNumberText: {
    color: "#EC9A15",
    fontWeight: "bold",
    fontSize: 14,
  },
  stepText: {
    color: "#ccc",
    fontSize: 15,
    flex: 1,
  },
});