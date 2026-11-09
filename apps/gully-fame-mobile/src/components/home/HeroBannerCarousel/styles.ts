import { getFontSize, hp, scale, scaleVertical, wp } from "@/utils/responsive";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  heroSlideWrapper: {
    height: hp(45),
    position: "relative",
  },
  heroBackgroundImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  heroContent: {
    width: "100%",
    height: hp(45),
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: wp(8),
    paddingTop: scaleVertical(60),
    paddingBottom: scaleVertical(20),
  },
  gfiLogoImage: {
    width: wp(25),
    height: wp(25),
    maxWidth: 120,
    maxHeight: 120,
    marginBottom: scaleVertical(20),
  },
  heroIcon: {
    marginBottom: scaleVertical(10),
  },
  heroTagline: {
    fontSize: getFontSize(15),
    color: "#F2EDE4",
    textAlign: "center",
    marginBottom: scaleVertical(10),
    fontFamily: "Inter_600SemiBold",
  },
  heroTitle: {
    fontSize: getFontSize(20),
    color: "#fff",
    textAlign: "center",
    marginBottom: scaleVertical(12),
    textShadowColor: "rgba(0, 0, 0, 0.7)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0,
    fontFamily: "Inter_700Bold",
  },
  heroSubtitle: {
    fontSize: getFontSize(13),
    color: "#F2EDE4",
    textAlign: "center",
    lineHeight: scale(22),
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    fontFamily: "Inter_500Medium",
  },
  carouselDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    bottom: scaleVertical(18),
    alignSelf: "center",
    backgroundColor: "#F0F0F5",
    paddingHorizontal: scale(12),
    paddingVertical: scaleVertical(6),
    borderRadius: scale(20),
    gap: scale(8),
  },
  heroDotActive: {
    backgroundColor: "#EC9A15",
  },
  heroDotInactive: {
    backgroundColor: "#9C9AAC",
  },
  heroDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(2),
    transform: [{ rotate: "45deg" }],
  },
});
