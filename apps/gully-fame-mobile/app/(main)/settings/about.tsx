import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform } from "react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { FAQS } from "@/content/legal/faq";
import { useAboutText } from "@/hooks/useCmsContent";

// The first paragraph of FAQ 1 in the legal document describes the platform.
const ABOUT_TEXT = FAQS[0].body.find((block) => block.t === "p")?.x ?? "";

const FEATURES = [
  "Upload short videos and share them with the community",
  "Watch, like and vote on reels, and save the ones you like",
  "Comment on reels and reply to other users",
  "Join live competitions and follow the leaderboard",
  "Follow creators and chat with other users",
  "Recharge your wallet with coins and tip creators",
  "Complete KYC verification from your profile",
];

export default function AboutScreen() {
  const version = Constants.expoConfig?.version ?? "";
  const remoteAbout = useAboutText();
  const aboutText = remoteAbout || ABOUT_TEXT;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2610" />

      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>About Gully Fame India</Text>
          {aboutText ? <Text style={styles.bodyText}>{aboutText}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>What you can do</Text>
          {FEATURES.map((feature) => (
            <View key={feature} style={styles.bulletRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bodyText}>{feature}</Text>
            </View>
          ))}
        </View>

        {version ? (
          <Text style={styles.version}>Version {version}</Text>
        ) : null}
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
  card: {
    backgroundColor: "#252525",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.2)",
  },
  sectionTitle: {
    color: "#EC9A15",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  bodyText: {
    flex: 1,
    color: "#E5DCD0",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 6,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  bullet: {
    color: "#EC9A15",
    fontSize: 14,
    width: 16,
    lineHeight: 22,
  },
  version: {
    color: "#999",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
});
