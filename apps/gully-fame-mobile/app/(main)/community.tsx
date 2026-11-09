import { router } from "expo-router";
import KeyboardAvoidingScreen from "@/components/KeyboardAvoidingScreen";
import { useState } from "react";
import { Dimensions, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import BottomNav from "@components/layout/BottomNav";
import { BackIcon, CommunityIcon, UserIconSVG as UserIcon, HomeIconSVG } from "@/icons";
import { ReelIconSVG as ReelIcon } from "@/icons";

const { width, height } = Dimensions.get("window");

const tabs = [
  { name: "Home", icon: HomeIconSVG, label: "" },
  { name: "Reel", icon: ReelIcon, label: "GullyReel" },
  { name: "Upload", icon: null, label: "UPLOAD" },
  { name: "Community", icon: CommunityIcon, label: "" },
  { name: "MyFame", icon: UserIcon, label: "" },
];

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState("Community");

  return (
    <KeyboardAvoidingScreen style={styles.container}>
      <StatusBar barStyle="light-content" />

      {}
      <ScrollView contentContainerStyle={styles.mainScrollContainer}>
        {}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push("/(main)")}
            style={styles.backButton}
            testID="community-back"
          >
            <BackIcon color="white" size={26} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Communities</Text>
        </View>

        {}
        <Text style={styles.subtitle}>
          Where creators and fans connect, cheer, and collab.
        </Text>

        {/* The API collection has no communities or community-posts endpoints yet, so nothing here can
            load or publish. Show one clear note instead of an empty list and a composer that does nothing. */}
        <View style={styles.comingSoonCard} testID="community-coming-soon">
          <CommunityIcon color="#EC9A15" />
          <Text style={styles.comingSoonTitle}>Communities are coming soon</Text>
          <Text style={styles.comingSoonText}>
            You&apos;ll be able to join communities, follow their feeds and post updates here. Until then, share
            your talent through reels and competitions.
          </Text>
          <TouchableOpacity
            style={styles.comingSoonButton}
            onPress={() => router.push("/(main)/competitions/live" as any)}
            testID="community-browse-competitions"
          >
            <Text style={styles.comingSoonButtonText}>Browse competitions</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tabs={tabs}
        onOpenDrawer={() => {}}
      />
    </KeyboardAvoidingScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3C2610",
    position: "relative",
  },
  
  comingSoonCard: {
    marginHorizontal: 20,
    marginTop: 28,
    padding: 24,
    borderRadius: 16,
    backgroundColor: "#252525",
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.4)",
    alignItems: "center",
    gap: 10,
  },
  comingSoonTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  comingSoonText: {
    color: "#bbb",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  comingSoonButton: {
    marginTop: 6,
    backgroundColor: "#EC9A15",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  comingSoonButtonText: {
    color: "white",
    fontWeight: "700",
  },
  mainScrollContainer: {
    paddingBottom: 100, 
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 12,
    paddingTop: 60, 
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 12,
  },
  backButton: {
    position: "absolute",
    left: 20,
    padding: 4,
    paddingTop: 60, 
  },
  headerTitle: {
    fontSize: 20,
    color: "white",
    textAlign: "center",
  },
  subtitle: {
    fontSize: width * 0.05,
    color: "white",
    textAlign: "center",
    marginTop: height * 0.01,
    paddingHorizontal: width * 0.15,
  },
  sectionTitle: {
    fontSize: width * 0.05,
    color: "white",
    marginTop: height * 0.05,
  },
  viewAll: {
    fontSize: width * 0.035,
    color: "white",
    opacity: 0.8,
    marginTop: height * 0.05,
  },
  
  horizontalScrollContainer: {
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  item: {
    alignItems: "center",
    width: width * 0.22,
  },
  imageWrapper: {
    position: "relative",
    width: width * 0.17,
    height: width * 0.17,
    borderRadius: width * 0.085,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  
  hotBadge: {
    position: "absolute",
    right: -5,
    top: -5,
    fontSize: 18,
  },
  comingSoonOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 35,
  },
  name: {
    color: "white",
    fontSize: width * 0.03,
    marginTop: height * 0.01,
    textAlign: "center",
  },

  
  sectionfeed: {
    backgroundColor: "white",
    marginTop: 40, 
    position: "relative",
  },
  feedTabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 20,
  },
  feedTab: {
    paddingVertical: 15,
    position: "relative", 
  },
  feedTabText: {
    fontSize: width * 0.04,
  },
  feedTabActiveText: {
    color: "#EC9A15", 
  },
  feedTabInactiveText: {
    color: "#4B5563", 
  },
  activeTabUnderline: {
    height: 5,
    backgroundColor: "#EC9A15", 
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  
  feedContent: {
    padding: 20,
    minHeight: 300, 
    alignItems: "center",
    justifyContent: "center",
  },
  feedContentText: {
    color: "white",
    fontSize: 16,
    opacity: 0.7,
  },

  
  sectionpost: {
    backgroundColor: "white",
    borderRadius: 12,
    marginTop: 50,
    marginBottom: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postInputContainer: {
    flexDirection: "row",
    gap: 0,
  },
  profileIconContainer: {
    width: width * 0.075,
    height: width * 0.075,
    borderRadius: width * 0.038,
    overflow: "hidden",
    marginTop: height * 0.006,
  },
  defaultProfileIcon: {
    width: "100%",
    height: "100%",
    backgroundColor: "#EC9A15",
    justifyContent: "center",
    alignItems: "center",
  },
  profileInitial: {
    color: "white",
    fontSize: width * 0.038,
  },
  postInputContent: {
    flex: 1,
    gap: 20,
  },
  postPlaceholder: {
    fontSize: 15,
    color: "#9CA3AF",
    lineHeight: 22,
  },
  postActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addPostButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    marginLeft: -25,
  },
  addPostText: {
    fontSize: width * 0.035,
    color: "#6B7280",
  },
  postInput: {
    fontSize: width * 0.038,
    color: "#111827",
    lineHeight: height * 0.027,
    borderWidth: 1,
    borderColor: "#ffffff",
  },
  publishButton: {
    backgroundColor: "#EC9A15",
    paddingHorizontal: width * 0.06,
    paddingVertical: height * 0.015,
    borderRadius: width * 0.06,
    color: "#ffffff",
  },
  publishButtonText: {
    color: "#ffffff",
    fontSize: width * 0.035,
  },
  postdivider: {
    height: 1,
    backgroundColor: "#EBEEF0",
    width: "100%",
    right: 30,
  },
});
