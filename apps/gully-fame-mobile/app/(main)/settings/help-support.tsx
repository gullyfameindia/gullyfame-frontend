import { useMemo, useState } from "react";
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
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { safeBack } from "@/utils/safeBack";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { useSupportContactState } from "@/hooks/useCmsContent";
import { FAQS } from "@/content/legal/faq";
import type { LegalSection } from "@/content/legal/types";
import { SkeletonArticle } from "@/components/Skeleton/Skeleton";

// Support contacts used when the admin panel has none set.
const DEFAULT_SUPPORT_EMAIL = "admin@gullyfame.com";
const DEFAULT_SUPPORT_WHATSAPP: string = "+91 98212 34605";

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

// Help & support questions from the FAQ document (FAQs - GullyFame India V.03.09.2026):
// 3 registration, 5 AI content and reporting/appeals, 9 moderation, 10 personal data,
// 11 account security, 12 reporting content, 13 grievance redressal, 14 legal disputes.
const HELP_FAQ_NUMBERS = ["3", "5", "9", "10", "11", "12", "13", "14"];
const HELP_FAQS: LegalSection[] = FAQS.filter((f) => HELP_FAQ_NUMBERS.includes(f.number));

export default function HelpSupportScreen() {
  // Contact details and FAQs are managed in the admin panel; the constants above are the fallback.
  const { contact: contact, loading: supportLoading } = useSupportContactState();
  const [query, setQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const SUPPORT_EMAIL = contact.email?.trim() || DEFAULT_SUPPORT_EMAIL;
  const SUPPORT_WHATSAPP_NUMBER = contact.whatsapp?.trim() || DEFAULT_SUPPORT_WHATSAPP;

  // All help & support questions, or the matches for the search text.
  const visibleFaqs: LegalSection[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return HELP_FAQS;
    return HELP_FAQS.filter(
      (f) =>
        f.heading.toLowerCase().includes(q) ||
        f.body.some((b) => b.x.toLowerCase().includes(q))
    );
  }, [query]);

  const handleEmailSupport = async (subject = "GullyFame Support Request") => {
    const emailUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
    try {
      if (await Linking.canOpenURL(emailUrl)) {
        await Linking.openURL(emailUrl);
      } else {
        Alert.alert("Email not available", `No email app is set up on this device. Write to ${SUPPORT_EMAIL}.`);
      }
    } catch {
      Alert.alert("Email not available", `Could not open your email app. Write to ${SUPPORT_EMAIL}.`);
    }
  };

  const handleWhatsAppSupport = async () => {
    const message = "Hello GullyFame Support, I need assistance with my account.";
    const digits = SUPPORT_WHATSAPP_NUMBER.replace(/\D/g, "");
    try {
      await Linking.openURL(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`);
    } catch {
      Alert.alert("WhatsApp not available", "Could not open WhatsApp on this device.");
    }
  };

  // Category shortcuts open the screens where those things are handled.
  const categories: { title: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }[] = [
    { title: "Account & Security", icon: "shield-checkmark-outline", onPress: () => router.push("/(main)/change-password" as any) },
    { title: "Payments & Wallet", icon: "wallet-outline", onPress: () => router.push("/(main)/history" as any) },
    { title: "Safety & Privacy", icon: "lock-closed-outline", onPress: () => router.push("/(main)/settings/privacy" as any) },
    { title: "Technical Issues", icon: "construct-outline", onPress: () => handleEmailSupport("Technical issue") },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => safeBack("/(main)/home")} style={styles.headerSide}>
          <Ionicons name="chevron-back" size={28} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {supportLoading ? (
          <SkeletonArticle />
        ) : (
        <>
        <Text style={styles.subtitle}>How can we help you today? Find answers or get in touch with our team.</Text>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={C.faint} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              setOpenIndex(null);
            }}
            placeholder="Search questions and answers"
            placeholderTextColor={C.faint}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search help"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={8} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={C.faint} />
            </TouchableOpacity>
          )}
        </View>

        {/* Direct contact */}
        <View style={styles.contactRow}>
          <TouchableOpacity style={styles.contactCard} onPress={handleWhatsAppSupport} activeOpacity={0.8} accessibilityRole="button">
            <View style={[styles.contactIcon, { backgroundColor: "rgba(37, 211, 102, 0.15)" }]}>
              <FontAwesome5 name="whatsapp" size={20} color="#25D366" />
            </View>
            <Text style={styles.contactTitle}>WhatsApp Chat</Text>
            <Text style={styles.contactSub}>Chat with our team</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} onPress={() => handleEmailSupport()} activeOpacity={0.8} accessibilityRole="button">
            <View style={[styles.contactIcon, { backgroundColor: C.accentSoft }]}>
              <Ionicons name="mail-outline" size={20} color={C.accent} />
            </View>
            <Text style={styles.contactTitle}>Email Us</Text>
            <Text style={styles.contactSub} numberOfLines={1}>{SUPPORT_EMAIL}</Text>
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <Text style={styles.sectionTitle}>Support categories</Text>
        <View style={styles.categoryGrid}>
          {categories.map((cat) => (
            <TouchableOpacity key={cat.title} style={styles.categoryCard} onPress={cat.onPress} activeOpacity={0.8} accessibilityRole="button">
              <View style={styles.categoryIcon}>
                <Ionicons name={cat.icon} size={20} color={C.accent} />
              </View>
              <Text style={styles.categoryText}>{cat.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQs */}
        <View style={styles.faqHeader}>
          <View>
            <Text style={styles.sectionTitle}>{query.trim() ? "Search results" : "Help & support FAQs"}</Text>
            <Text style={styles.faqSub}>Account, reports, privacy and support</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/(main)/faq" as any)} accessibilityRole="button">
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>

        {visibleFaqs.length === 0 ? (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>No questions match "{query.trim()}". Try another word or email us.</Text>
          </View>
        ) : (
          visibleFaqs.map((faq, index) => {
            const open = openIndex === index;
            return (
              <View key={`${faq.number}-${faq.heading}`} style={styles.faqItem}>
                <TouchableOpacity
                  style={styles.faqRow}
                  onPress={() => setOpenIndex(open ? null : index)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                >
                  <Text style={styles.faqQuestion}>{faq.heading}</Text>
                  <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={C.muted} />
                </TouchableOpacity>
                {open && (
                  <View style={styles.faqAnswer}>
                    {faq.body.map((block, i) => (
                      <Text key={i} style={styles.faqAnswerText}>
                        {block.t === "b" ? `•  ${block.x}` : block.x}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Can't find what you're looking for? </Text>
          <TouchableOpacity onPress={() => handleEmailSupport()} accessibilityRole="button">
            <Text style={styles.footerLink}>Contact us</Text>
          </TouchableOpacity>
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
  subtitle: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontFamily: "Rubik_400Regular",
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
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: C.text,
    fontSize: 15,
    fontFamily: "Rubik_400Regular",
    padding: 0,
  },

  // Contact cards
  contactRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 22,
  },
  contactCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  contactTitle: {
    color: C.text,
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
  },
  contactSub: {
    color: C.faint,
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    marginTop: 3,
  },

  // Sections
  sectionTitle: {
    color: C.text,
    fontSize: 19,
    fontFamily: "PlayfairDisplay_700Bold",
    marginBottom: 10,
  },
  categoryGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  categoryCard: {
    width: "23.5%",
    aspectRatio: 0.9,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.accentSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryText: {
    color: C.text,
    fontSize: 11,
    lineHeight: 14,
    textAlign: "center",
    fontFamily: "Rubik_600SemiBold",
  },

  // FAQs
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  faqSub: {
    color: C.faint,
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
    marginTop: -6,
  },
  viewAll: {
    color: C.accent,
    fontSize: 14,
    fontFamily: "Rubik_600SemiBold",
    marginBottom: 2,
  },
  faqItem: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
    overflow: "hidden",
  },
  faqRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    gap: 10,
  },
  faqQuestion: {
    flex: 1,
    color: C.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Rubik_500Medium",
  },
  faqAnswer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  faqAnswerText: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    fontFamily: "Rubik_400Regular",
  },
  noResults: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 10,
  },
  noResultsText: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    fontFamily: "Rubik_400Regular",
  },

  // Footer
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
  },
  footerText: {
    color: C.faint,
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
  },
  footerLink: {
    color: C.accent,
    fontSize: 13,
    fontFamily: "Rubik_600SemiBold",
  },
});
