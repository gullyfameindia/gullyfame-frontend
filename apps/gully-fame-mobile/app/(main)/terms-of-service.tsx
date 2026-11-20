import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TERMS_OF_SERVICE, TERMS_OF_SERVICE_TITLE } from "@/content/legal/termsOfService";
import type { LegalBlock, LegalSection } from "@/content/legal/types";
import { useTermsText } from "@/hooks/useCmsContent";

// Same brown + orange palette as the rest of the app.
const C = {
  bg: "#3C2610",
  card: "#1A1A1A",
  inner: "#252525",
  border: "#2A2A2A",
  accent: "#EC9A15",
  accentSoft: "rgba(236, 154, 21, 0.15)",
  text: "#FFFFFF",
  muted: "#CAD7D8",
  faint: "#8A8F90",
};

/** One paragraph or bullet. */
function Block({ block }: { block: LegalBlock }) {
  if (block.t === "b") {
    return (
      <View style={styles.bulletRow}>
        <View style={styles.bulletDot} />
        <Text style={styles.bulletText}>{block.x}</Text>
      </View>
    );
  }
  return <Text style={styles.paragraph}>{block.x}</Text>;
}

/** Admin-panel text: lines starting with "• ", "- " or "* " render as bullets. */
function PlainTextBlocks({ text }: { text: string }) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return (
    <View style={styles.card}>
      {lines.map((line, i) =>
        /^[•\-*]\s+/.test(line) ? (
          <Block key={i} block={{ t: "b", x: line.replace(/^[•\-*]\s+/, "") }} />
        ) : (
          <Text key={i} style={styles.paragraph}>{line}</Text>
        )
      )}
    </View>
  );
}

function SectionCard({ section }: { section: LegalSection }) {
  // Numbers like "4.1" are sub-sections of a numbered section.
  const isSub = section.number.includes(".");
  return (
    <View style={[styles.card, isSub && styles.subCard]}>
      <View style={styles.sectionHead}>
        {!isSub && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{section.number}</Text>
          </View>
        )}
        <Text style={[styles.heading, isSub && styles.subHeading]}>
          {isSub ? `${section.number}  ${section.heading}` : section.heading}
        </Text>
      </View>
      {section.body.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </View>
  );
}

export default function TermsOfServiceScreen() {
  const remoteText = useTermsText();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => router.back()} style={styles.headerSide}>
          <Ionicons name="chevron-back" size={28} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Title card */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="document-text-outline" size={26} color={C.accent} />
          </View>
          <Text style={styles.heroTitle}>{TERMS_OF_SERVICE_TITLE[0]}</Text>
          {TERMS_OF_SERVICE_TITLE[1] ? <Text style={styles.heroMeta}>{TERMS_OF_SERVICE_TITLE[1]}</Text> : null}
          {TERMS_OF_SERVICE_TITLE[2] ? <Text style={styles.heroWelcome}>{TERMS_OF_SERVICE_TITLE[2]}</Text> : null}
        </View>

        {remoteText ? (
          <PlainTextBlocks text={remoteText} />
        ) : (
          TERMS_OF_SERVICE.map((section, i) => <SectionCard key={`${section.number}-${i}`} section={section} />)
        )}

        <Text style={styles.footerNote}>
          Questions about these terms? Contact our Grievance Officer in section 27 or reach out from Help & Support.
        </Text>
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

  // Title card
  hero: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.accent,
    padding: 18,
    alignItems: "center",
    marginBottom: 14,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.accentSoft,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  heroTitle: {
    color: C.text,
    fontSize: 16,
    fontFamily: "Rubik_700Bold",
    textAlign: "center",
  },
  heroMeta: {
    color: C.faint,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
    textAlign: "center",
    fontFamily: "Rubik_400Regular",
  },
  heroWelcome: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
    textAlign: "center",
    fontFamily: "Rubik_500Medium",
  },

  // Section cards
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 12,
  },
  subCard: {
    backgroundColor: C.inner,
    marginTop: -4,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.accentSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: C.accent,
    fontSize: 12,
    fontFamily: "Rubik_700Bold",
  },
  heading: {
    flex: 1,
    color: C.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "Rubik_600SemiBold",
  },
  subHeading: {
    color: C.accent,
    fontSize: 14,
  },
  paragraph: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
    fontFamily: "Rubik_400Regular",
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 6,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.accent,
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    color: C.muted,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Rubik_400Regular",
  },
  footerNote: {
    color: C.faint,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 8,
    fontFamily: "Rubik_400Regular",
  },
});
