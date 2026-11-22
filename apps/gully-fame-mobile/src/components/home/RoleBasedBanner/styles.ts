import { Dimensions, StyleSheet } from "react-native";
const getDimensions = () => Dimensions.get("window");
const { width } = getDimensions();
export const styles = StyleSheet.create({
  communityBannerSection: {
    marginBottom: 20,
    paddingHorizontal: width * 0.05,
  },
  communityBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.25)",
  },
  bannerLogo: {
    width: width * 0.12,
    height: 28,
  },
  bannerTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    flex: 1,
    fontFamily: "Inter_600SemiBold",
  },
  bannerButton: {
    backgroundColor: "#EC9A15",
    paddingHorizontal: 14,
    height: 32,
    justifyContent: "center",
    borderRadius: 8,
  },
  bannerButtonText: {
    color: "#1A1A1A",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
