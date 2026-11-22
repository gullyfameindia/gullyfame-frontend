import { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform, TextInput } from "react-native";
import { router } from "expo-router";
import { safeBack } from "@/utils/safeBack";
import { Ionicons } from "@expo/vector-icons";
import { useFaqState } from "@/hooks/useCmsContent";
import type { LegalSection } from "@/content/legal/types";
import { SkeletonArticle } from "@/components/Skeleton/Skeleton";

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

export default function FaqScreen() {
  const { sections: faqs, loading: faqLoading } = useFaqState();
  const [query, setQuery] = useState("");
  const [openNumber, setOpenNumber] = useState<string | null>(null);

  const visible: LegalSection[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter(
      (f) => f.heading.toLowerCase().includes(q) || f.body.some((b) => b.x.toLowerCase().includes(q))
    );
  }, [faqs, query]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => safeBack("/(main)/home")} style={styles.headerSide}>
          <Ionicons name="chevron-back" size={28} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FAQs</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {faqLoading ? (
          <SkeletonArticle />
        ) : (
        <>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={C.faint} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              setOpenNumber(null);
            }}
            placeholder="Search FAQs"
            placeholderTextColor={C.faint}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search FAQs"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={8} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={C.faint} />
            </TouchableOpacity>
          )}
        </View>

        {visible.length === 0 ? (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>No FAQs match "{query.trim()}". Try another word.</Text>
          </View>
        ) : (
          visible.map((faq) => {
            const open = openNumber === faq.number;
            return (
              <View key={faq.number} style={styles.item}>
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => setOpenNumber(open ? null : faq.number)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                >
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>{faq.number}</Text>
                  </View>
                  <Text style={styles.question}>{faq.heading}</Text>
                  <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={C.muted} />
                </TouchableOpacity>

                {open && (
                  <View style={styles.answer}>
                    {faq.body.map((block, i) =>
                      block.t === "b" ? (
                        <View key={i} style={styles.bulletRow}>
                          <View style={styles.bulletDot} />
                          <Text style={styles.bulletText}>{block.x}</Text>
                        </View>
                      ) : (
                        <Text key={i} style={styles.paragraph}>{block.x}</Text>
                      )
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}

        <Text style={styles.footerNote}>Still have a question? Visit Help & Support to contact our team.</Text>
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
  subtitle: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    marginBottom: 18,
    paddingHorizontal: 12,
  },

  // Search
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: C.text,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },

  // Accordion items
  item: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  numberBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.accentSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  numberText: {
    color: C.accent,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  question: {
    flex: 1,
    color: C.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_500Medium",
  },
  answer: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    paddingTop: 2,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  paragraph: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
    fontFamily: "Inter_400Regular",
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 4,
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
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
  },

  noResults: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  noResultsText: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
  footerNote: {
    color: C.faint,
    fontSize: 12,
    textAlign: "center",
    marginTop: 16,
    fontFamily: "Inter_400Regular",
  },
});
