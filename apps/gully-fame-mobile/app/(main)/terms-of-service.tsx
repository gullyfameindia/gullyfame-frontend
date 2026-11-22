import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform } from "react-native";
import { router } from "expo-router";
import { safeBack } from "@/utils/safeBack";
import { Ionicons } from "@expo/vector-icons";
import { TERMS_OF_SERVICE, TERMS_OF_SERVICE_TITLE } from "@/content/legal/termsOfService";
import { LegalCards } from "@/components/legal/LegalCards";
import { useTermsPage } from "@/hooks/useCmsContent";
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

export default function TermsOfServiceScreen() {
  const { text: remoteText, loading: termsLoading } = useTermsPage();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => safeBack("/(main)/home")} style={styles.headerSide}>
          <Ionicons name="chevron-back" size={28} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {termsLoading ? (
          <SkeletonArticle />
        ) : (
        <>
        <LegalCards title={TERMS_OF_SERVICE_TITLE} sections={TERMS_OF_SERVICE} plainText={remoteText} />

        <Text style={styles.footerNote}>
          Questions about these terms? Contact our Grievance Officer in section 27 or reach out from Help & Support.
        </Text>
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

  // Title card

  // Section cards
  footerNote: {
    color: C.faint,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 8,
    fontFamily: "Rubik_400Regular",
  },
});
