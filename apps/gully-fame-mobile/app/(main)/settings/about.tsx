import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform } from "react-native";
import { router } from "expo-router";
import { safeBack } from "@/utils/safeBack";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { FAQS } from "@/content/legal/faq";
import { useAboutPage } from "@/hooks/useCmsContent";
import { SkeletonArticle } from "@/components/Skeleton/Skeleton";

// Same brown + orange palette as the rest of the app.
const C = {
  bg: "#3C2610",
  card: "#1A1A1A",
  border: "#2A2A2A",
  accent: "#EC9A15",
  accentSoft: "rgba(236, 154, 21, 0.15)",
  text: "#FFFFFF",
  muted: "#CAD7D8",
  faint: "#8A8F90",
};

// The first paragraph of FAQ 1 in the legal document describes the platform.
const ABOUT_TEXT = FAQS[0].body.find((block) => block.t === "p")?.x ?? "";

const FEATURES: { text: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { text: "Upload short videos and share them with the community", icon: "cloud-upload-outline" },
  { text: "Watch, like and vote on reels, and save the ones you like", icon: "heart-outline" },
  { text: "Comment on reels and reply to other users", icon: "chatbubble-outline" },
  { text: "Join live competitions and follow the leaderboard", icon: "trophy-outline" },
  { text: "Follow creators and chat with other users", icon: "people-outline" },
  { text: "Recharge your wallet with coins and tip creators", icon: "wallet-outline" },
  { text: "Complete KYC verification from your profile", icon: "shield-checkmark-outline" },
];

export default function AboutScreen() {
  const version = Constants.expoConfig?.version ?? "";
  const { text: remoteAbout, loading: aboutLoading } = useAboutPage();
  const aboutText = remoteAbout || ABOUT_TEXT;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => safeBack("/(main)/home")} style={styles.headerSide}>
          <Ionicons name="chevron-back" size={28} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {aboutLoading ? (
          <SkeletonArticle />
        ) : (
        <>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="sparkles-outline" size={30} color={C.accent} />
          </View>
          <Text style={styles.heroName}>GullyFame India</Text>
          {version ? (
            <View style={styles.versionChip}>
              <Text style={styles.versionText}>Version {version}</Text>
            </View>
          ) : null}
        </View>

        {/* About */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About us</Text>
          {aboutText ? <Text style={styles.bodyText}>{aboutText}</Text> : null}
        </View>

        {/* Features */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What you can do</Text>
          {FEATURES.map((feature, index) => (
            <View key={feature.text} style={[styles.featureRow, index > 0 && styles.featureDivider]}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon} size={18} color={C.accent} />
              </View>
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          ))}
        </View>
        </>
        )}
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
    paddingBottom: 40,
  },

  // Hero
  hero: {
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.accent,
    paddingVertical: 24,
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.accentSoft,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  heroName: {
    color: C.text,
    fontSize: 20,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  versionChip: {
    marginTop: 10,
    backgroundColor: C.accentSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  versionText: {
    color: C.accent,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },

  // Cards
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    color: C.text,
    fontSize: 17,
    fontFamily: "PlayfairDisplay_700Bold",
    marginBottom: 10,
  },
  bodyText: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  featureDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.accentSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: {
    flex: 1,
    color: C.muted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
  },
});
