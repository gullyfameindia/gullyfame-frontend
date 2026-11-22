import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform } from "react-native";
import { router } from "expo-router";
import { safeBack } from "@/utils/safeBack";
import { Ionicons } from "@expo/vector-icons";
import { LegalCards } from "@/components/legal/LegalCards";
import { getCompetitionRules } from "@/api/services/cmsService";
import { SkeletonDetail } from "@/components/Skeleton/Skeleton";

/** Competition rules written in the admin panel (GET public/competitionRules). */
export default function CompetitionRulesScreen() {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCompetitionRules().then((r) => {
      if (cancelled) return;
      const content = r.success ? r.data?.content?.trim() : "";
      setText(content || null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2610" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack("/(main)/home")} style={styles.backButton} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Competition Rules</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <SkeletonDetail bannerHeight={0} style={{ padding: 0 }} />
        ) : text ? (
          <LegalCards title={["Competition Rules"]} sections={[]} plainText={text} icon="trophy-outline" />
        ) : (
          <Text style={styles.empty}>The competition rules haven&apos;t been published yet. Please check back soon.</Text>
        )}
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
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  empty: {
    color: "#C9B9A6",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 40,
  },
});
