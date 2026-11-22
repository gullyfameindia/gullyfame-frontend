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
import { safeBack } from "@/utils/safeBack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { getReferral, applyReferralCode, ReferralSummary } from "@/api/services/userService";
import { getErrorMessage } from "@/api/client";
import { toastError, toastSuccess } from "@/components/ui/Toast";
import { Skeleton } from "@/components/Skeleton/Skeleton";

// Same brown + orange palette as the rest of the app.
const C = {
  bg: "#3C2610",
  card: "#1A1A1A",
  inner: "#252525",
  border: "#2A2A2A",
  accent: "#EC9A15",
  accentLight: "#FFB84D",
  accentSoft: "rgba(236, 154, 21, 0.15)",
  text: "#FFFFFF",
  muted: "#CAD7D8",
  faint: "#8A8F90",
  success: "#25D366",
};

const SHARE_URL = "https://gullyfame.com/download";

type SharePlatform = "WhatsApp" | "Telegram" | "Message" | "Messenger" | "More";

const SHARE_OPTIONS: { name: SharePlatform; icon: string; lib: "fa" | "io"; color: string }[] = [
  { name: "WhatsApp", icon: "whatsapp", lib: "fa", color: "#25D366" },
  { name: "Telegram", icon: "telegram-plane", lib: "fa", color: "#229ED9" },
  { name: "Message", icon: "chatbubble", lib: "io", color: "#34C759" },
  { name: "Messenger", icon: "facebook-messenger", lib: "fa", color: "#0084FF" },
  { name: "More", icon: "ellipsis-horizontal", lib: "io", color: C.muted },
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

  const shareMessage = `Join me on GullyFame!${userReferralCode ? ` My referral code: ${userReferralCode}` : ""}\n\nDownload now: ${SHARE_URL}`;
  const encodedMessage = encodeURIComponent(shareMessage);

  const copyToClipboard = async () => {
    if (!userReferralCode) return;
    await Clipboard.setStringAsync(userReferralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Opens an app if it is installed, otherwise tells the user to install it.
  const openAppOrAlert = async (url: string, appName: string) => {
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    } else {
      Alert.alert(`${appName} not installed`, `Please install ${appName} to share.`);
    }
  };

  // Sharing works without a code: the message then carries only the download link.
  const handleShare = async (platform: SharePlatform) => {
    try {
      switch (platform) {
        case "WhatsApp":
          await openAppOrAlert(`whatsapp://send?text=${encodedMessage}`, "WhatsApp");
          break;
        case "Telegram":
          await openAppOrAlert(`tg://msg?text=${encodedMessage}`, "Telegram");
          break;
        case "Message":
          await Linking.openURL(`sms:?body=${encodedMessage}`);
          break;
        case "Messenger":
          await openAppOrAlert(`fb-messenger://share?link=${encodeURIComponent(SHARE_URL)}`, "Messenger");
          break;
        default:
          await Share.share({ message: shareMessage, title: "Invite to GullyFame" });
      }
    } catch {
      Alert.alert("Error", "Unable to share. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => safeBack("/(main)/home")} style={styles.headerSide} testID="invite-back">
          <Ionicons name="chevron-back" size={28} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite & Earn</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>Invite your friends and earn coins when they join and verify.</Text>

        {/* Hero */}
        <LinearGradient
          colors={[C.accent, "#B86E0A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Invite friends, earn coins!</Text>
            {summary ? (
              <Text style={styles.heroBody} testID="invite-reward-text">
                You get {summary.referrerCoins} GFI coins and your friend gets {summary.newUserCoins} once they verify
                their phone, complete their profile and their account is 3 days old.
              </Text>
            ) : null}
          </View>
          <View style={styles.heroIcon}>
            <Ionicons name="gift" size={34} color={C.text} />
          </View>
        </LinearGradient>

        {/* Progress */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your referral progress</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Invites</Text>
              <View style={styles.statValueRow}>
                <Ionicons name="people-outline" size={18} color={C.accent} />
                <Text style={styles.statValue} testID="invite-stats">{summary ? summary.invited : "–"}</Text>
              </View>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Coins earned</Text>
              <View style={styles.statValueRow}>
                <FontAwesome5 name="coins" size={16} color={C.accent} />
                <Text style={styles.statValue}>{summary ? summary.coinsEarned.toLocaleString("en-IN") : "–"}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.historyLink} onPress={() => router.push("/(main)/history" as any)} accessibilityRole="button">
            <Text style={styles.historyLinkText}>View detailed history</Text>
            <Ionicons name="chevron-forward" size={16} color={C.accent} />
          </TouchableOpacity>
        </View>

        {/* Referral code */}
        <Text style={styles.sectionLabel}>Your referral code</Text>
        {codeLoading ? (
          <View style={styles.codeLoading}>
            <Skeleton height={44} radius={12} />
          </View>
        ) : userReferralCode ? (
          <View style={styles.codeBox}>
            <Text style={styles.codeText} testID="invite-code">{userReferralCode}</Text>
            <TouchableOpacity style={[styles.copyButton, copied && styles.copiedButton]} onPress={copyToClipboard} activeOpacity={0.7}>
              <Ionicons name={copied ? "checkmark" : "copy-outline"} size={16} color={C.text} />
              <Text style={styles.copyText}>{copied ? "Copied" : "Copy"}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.errorBox} testID="invite-referral-coming-soon">
            <Ionicons name="cloud-offline-outline" size={22} color={C.accent} />
            <Text style={styles.errorTitle}>Couldn't load your referral code</Text>
            <Text style={styles.errorText}>
              Check your connection and open this page again. You can still share the download link below.
            </Text>
          </View>
        )}

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Or share your unique link</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity onPress={() => handleShare("More")} activeOpacity={0.8} accessibilityRole="button">
          <LinearGradient
            colors={[C.accent, C.accentLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.inviteButton}
          >
            <Text style={styles.inviteButtonText}>Invite Contacts</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Share targets */}
        <View style={styles.shareRow}>
          {SHARE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.name}
              style={styles.shareItem}
              onPress={() => handleShare(option.name)}
              activeOpacity={0.7}
              testID={`invite-share-${option.name.toLowerCase()}`}
              accessibilityRole="button"
              accessibilityLabel={`Share via ${option.name}`}
            >
              <View style={[styles.shareCircle, { backgroundColor: option.name === "More" ? C.inner : option.color }]}>
                {option.lib === "fa" ? (
                  <FontAwesome5 name={option.icon as any} size={22} color={C.text} />
                ) : (
                  <Ionicons name={option.icon as any} size={24} color={C.text} />
                )}
              </View>
              <Text style={styles.shareLabel}>{option.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Using a friend's code: new accounts only (the server decides with canApplyCode). */}
        {summary?.canApplyCode ? (
          <View style={styles.card} testID="invite-apply-code">
            <Text style={styles.cardTitle}>Got a code from a friend?</Text>
            <TextInput
              style={styles.friendCodeInput}
              placeholder="Enter referral code"
              placeholderTextColor={C.faint}
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
              {applying ? <ActivityIndicator color={C.text} /> : <Text style={styles.applyText}>Apply code</Text>}
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

        {/* How it works */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>How it works</Text>
          {[
            { n: "1", text: "Share your link" },
            { n: "2", text: "They sign up" },
            { n: "3", text: "You both earn" },
          ].map((step) => (
            <View key={step.n} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{step.n}</Text>
              </View>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    paddingTop: Platform.OS === "android" ? 20 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "ios" ? 60 : 12,
    paddingBottom: 8,
  },
  headerSide: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: C.text,
    fontSize: 20,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  subtitle: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    marginBottom: 18,
    paddingHorizontal: 12,
  },

  // Hero
  heroCard: {
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  heroText: {
    flex: 1,
  },
  heroTitle: {
    color: C.text,
    fontSize: 20,
    fontFamily: "PlayfairDisplay_700Bold",
    marginBottom: 6,
  },
  heroBody: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Cards
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    color: C.text,
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: C.inner,
    borderRadius: 14,
    padding: 12,
  },
  statLabel: {
    color: C.faint,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 6,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statValue: {
    color: C.text,
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  historyLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 14,
  },
  historyLinkText: {
    color: C.accent,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },

  // Code
  sectionLabel: {
    color: C.muted,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginBottom: 8,
  },
  codeLoading: {
    height: 64,
    justifyContent: "center",
    alignItems: "center",
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.accent,
    paddingLeft: 18,
    paddingRight: 8,
    paddingVertical: 8,
  },
  codeText: {
    color: C.text,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.accentSoft,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  copiedButton: {
    backgroundColor: "rgba(37, 211, 102, 0.2)",
  },
  copyText: {
    color: C.accent,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  errorBox: {
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 6,
  },
  errorTitle: {
    color: C.text,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  errorText: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
  },
  dividerText: {
    color: C.faint,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  inviteButton: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
  },
  inviteButtonText: {
    color: C.text,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },

  // Share row
  shareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 20,
  },
  shareItem: {
    alignItems: "center",
    width: 64,
  },
  shareCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  shareLabel: {
    color: C.muted,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },

  // Apply code
  friendCodeInput: {
    backgroundColor: C.inner,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    color: C.text,
    fontSize: 18,
    letterSpacing: 2,
    textAlign: "center",
    paddingVertical: 12,
    marginBottom: 12,
  },
  applyButton: {
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  applyText: {
    color: C.text,
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  usedCodeText: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 8,
    fontFamily: "Inter_400Regular",
  },

  // How it works
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.accentSoft,
    borderWidth: 1,
    borderColor: C.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumberText: {
    color: C.accent,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  stepText: {
    color: C.muted,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
