import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Image,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import Svg, { Path, Circle } from "react-native-svg";
import { useCompetitionList } from "@/hooks/useCompetitionList";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import { SkeletonCards } from "@/components/Skeleton/Skeleton";

const { width } = Dimensions.get("window");

export default function UpcomingCompetitionsScreen() {
  const { items: competitions, loading, error, reload } = useCompetitionList("UPCOMING");

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2610" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upcoming Competitions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.listContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        <View style={styles.competitionsSection}>
          <Text style={styles.sectionTitle}>Register Now</Text>

          {loading ? (
            <SkeletonCards count={3} />
          ) : error ? (
            <TouchableOpacity onPress={reload} style={{ padding: 40, alignItems: "center" }}>
              <Text style={{ color: "#ccc", textAlign: "center" }}>{error}</Text>
              <Text style={{ color: "#EC9A15", marginTop: 8 }}>Tap to retry</Text>
            </TouchableOpacity>
          ) : competitions.length === 0 ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <Text style={{ color: "#ccc" }}>No upcoming competitions right now.</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pastCompScroll}
            >
              {competitions.map((comp) => (
                <TouchableOpacity
                  key={comp.id}
                  style={styles.compCardNew}
                  activeOpacity={0.9}
                  onPress={() => router.push(`/(main)/competition/upcoming/${comp.id}` as any)}
                >
                  <View style={styles.compCardImageWrapper}>
                    <Image
                      source={resolveMediaUrl(comp.image) ? { uri: resolveMediaUrl(comp.image)! } : require("@assets/images/trending1.png")}
                      style={styles.compCardImageNew}
                      resizeMode="cover"
                    />
                    <View style={styles.upcomingBadge}>
                      <Text style={styles.upcomingBadgeText}>Upcoming</Text>
                    </View>
                    <View style={styles.dateBadge}>
                      <Text style={styles.dateBadgeText}>
                        Starts {comp.startDate ? new Date(comp.startDate).toLocaleDateString() : "TBD"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.compCardContentNew}>
                    <Text style={styles.compCardTitleNew} numberOfLines={2}>
                      {comp.title}
                    </Text>
                    <Text style={styles.compCardSubtitle}>
                      Prize pool ₹{Number(comp.prize || 0).toLocaleString("en-IN")}
                    </Text>
                    <View style={styles.compCardDetailsNew}>
                      <View style={styles.compDetailItemNew}>
                        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                          <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#EC9A15" strokeWidth={2} />
                          <Circle cx="9" cy="7" r="4" stroke="#EC9A15" strokeWidth={2} />
                        </Svg>
                        <Text style={styles.compDetailTextNew}>
                          {comp.participants} Registered
                        </Text>
                      </View>
                    </View>
                    <View style={styles.compCardFooterNew}>
                      <View style={styles.prizeRowNew}>
                        <Text style={styles.compPrizeTextNew}>
                          {comp.entryFee > 0 ? `${comp.entryFee} Coins` : "Free Entry"}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.actionBtnNew}
                        onPress={(e) => {
                          e.stopPropagation();
                          router.push(`/(main)/competition/upcoming/${comp.id}` as any);
                        }}
                      >
                        <Text style={styles.actionBtnTextNew}>Join Now</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  upcomingBadge: { position: "absolute", top: 12, left: 12, backgroundColor: "#1E88E5", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  upcomingBadgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  actionBtnNew: { backgroundColor: "#EC9A15", paddingHorizontal: 18, paddingVertical: 8, borderRadius: 8 },
  actionBtnTextNew: { color: "#fff", fontSize: 13, fontWeight: "600" },
  container: { flex: 1, backgroundColor: "#3C2610" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15, backgroundColor: "#3C2610" },
  backButton: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: 20, color: "#fff", fontWeight: "600" },
  listContainer: { flex: 1 },
  listContent: { paddingBottom: 30 },
  competitionsSection: { paddingHorizontal: 16, marginTop: 10, marginBottom: 30 },
  sectionTitle: { fontSize: 20, color: "#fff", marginBottom: 14, fontWeight: "700" },
  pastCompScroll: { gap: 15, paddingHorizontal: 0 },
  compCardNew: { borderRadius: 10, overflow: "hidden", backgroundColor: "#40301F", marginRight: 15, width: width * 0.75, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  compCardImageWrapper: { position: "relative", width: "100%" },
  compCardImageNew: { width: "100%", height: 220 },
  compCardContentNew: { backgroundColor: "#40301F", padding: 12 },
  dateBadge: { position: "absolute", top: 12, right: 12, backgroundColor: "rgba(60, 38, 16, 0.85)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  dateBadgeText: { color: "#fff", fontSize: 11, fontWeight: "500" },
  compCardTitleNew: { fontSize: 18, color: "#fff", fontWeight: "700", marginTop: 0, marginBottom: 4 },
  compCardSubtitle: { fontSize: 13, color: "#ccc", marginBottom: 8 },
  compCardDetailsNew: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  compDetailItemNew: { flexDirection: "row", alignItems: "center", gap: 5 },
  compDetailTextNew: { fontSize: 12, color: "#ccc" },
  compCardFooterNew: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  prizeRowNew: { flexDirection: "row", alignItems: "center", gap: 5 },
  compPrizeTextNew: { fontSize: 14, color: "#EC9A15", fontWeight: "600" },
});