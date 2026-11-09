import { Dimensions, StyleSheet } from "react-native";
const getDimensions = () => Dimensions.get("window");
const { width } = getDimensions();
export const styles = StyleSheet.create({
  communityBannerSection: {
    marginBottom: 0,
    paddingHorizontal: 0,
  },
  communityBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 10,
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,

    marginBottom: 50,
  },
  bannerLogo: {
    width: width * 0.12,
    height: 28,
    marginRight: 8,
  },
  bannerTitle: {
    color: "#fff",
    fontSize: width * 0.031,
    flex: 1,
    letterSpacing: 0.2,
  },
  bannerButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  bannerButtonText: {
    color: "#fff",
    fontSize: width * 0.03,
  },
});
