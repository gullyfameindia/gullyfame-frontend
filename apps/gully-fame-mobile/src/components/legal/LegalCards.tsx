import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { LegalBlock, LegalSection } from "@/content/legal/types";

/**
 * Shared look for every legal / info document (Terms, Privacy, Rules...): a title card
 * followed by one card per numbered section, on the app's dark brown background.
 */
// Same brown + orange palette as the rest of the app.
export const LEGAL_COLORS = {
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
const C = LEGAL_COLORS;

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
export function LegalPlainText({ text }: { text: string }) {
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

export function LegalSectionCard({ section }: { section: LegalSection }) {
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

/** Title card: document name, effective date line, optional welcome line. */
export function LegalHero({ lines, icon = "document-text-outline" }: { lines: string[]; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroIcon}>
        <Ionicons name={icon} size={26} color={C.accent} />
      </View>
      <Text style={styles.heroTitle}>{lines[0]}</Text>
      {lines[1] ? <Text style={styles.heroMeta}>{lines[1]}</Text> : null}
      {lines[2] ? <Text style={styles.heroWelcome}>{lines[2]}</Text> : null}
    </View>
  );
}

/** Title card + section cards, or the admin's plain text when it is set. */
export function LegalCards({
  title,
  sections,
  plainText,
  icon,
}: {
  title: string[];
  sections: LegalSection[];
  plainText?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <>
      <LegalHero lines={title} icon={icon} />
      {plainText ? (
        <LegalPlainText text={plainText} />
      ) : (
        sections.map((section, i) => <LegalSectionCard key={`${section.number}-${i}`} section={section} />)
      )}
    </>
  );
}

const styles = StyleSheet.create({

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
});
