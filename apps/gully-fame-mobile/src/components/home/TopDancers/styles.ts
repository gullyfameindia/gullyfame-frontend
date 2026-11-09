import { getFontSize, scale } from "@/utils/responsive";
import { Dimensions, StyleSheet } from "react-native";
const getDimensions = () => Dimensions.get("window");
const { width } = getDimensions();

export const styles = StyleSheet.create({
    topDancerCenter: {
        alignItems: "center",
        flex: 1,
        marginBottom: 20,
        zIndex: 10, // Keep 1st place on top
    },
    topDancerSide: {
        alignItems: "center",
        flex: 1,
    },
    dancerImageWrapper: {
        position: "relative",
        marginBottom: 12, // Give room for the badge at the bottom
    },
    dancerImageSide: {
        width: width * 0.24,
        height: width * 0.24,
        borderRadius: width * 0.12, // Perfectly round
        borderWidth: 3, // Thicker border to show off the material
    },
    dancerImageCenter: {
        width: width * 0.28,
        height: width * 0.28,
        borderRadius: width * 0.14,
        borderWidth: 4, // Even thicker for 1st
    },
    starIconWrapper: {
        position: "absolute",
        top: scale(-55), // Adjusted so it sits perfectly on the avatar's head
        alignSelf: "center",
        zIndex: 10,
    },
    starIcon: {
        width: scale(50),
        height: scale(60),
    },

    // --- Fixed Rank Badges ---
    rankBadge: {
        position: "absolute",
        bottom: -10, // Locks it to the bottom edge
        alignSelf: "center", // Perfectly centered horizontally!
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#3C2610", // Cuts into the image to look embedded
    },
    rankBadgeLarge: {
        position: "absolute",
        bottom: -12, // Locks to bottom edge
        alignSelf: "center",
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 3,
        borderColor: "#3C2610",
    },
    rankBadgeText: {
        color: "#3C2610", // Dark text on the metallic backgrounds looks much better
        fontSize: width * 0.035,
        fontFamily: "Inter_700Bold",
        fontWeight: "900",
    },
    rankBadgeTextLarge: {
        color: "#3C2610",
        fontSize: width * 0.045,
        fontFamily: "Inter_700Bold",
        fontWeight: "900",
    },

    // --- Text Styles ---
    dancerName: {
        color: "#fff",
        fontSize: getFontSize(13),
        textAlign: "center",
        marginTop: scale(4),
        marginBottom: scale(2),
        fontFamily: "Inter_700Bold",
        fontWeight: "700",
    },
    dancerNameCenter: {
        color: "#fff",
        fontSize: getFontSize(15),
        textAlign: "center",
        marginTop: scale(4),
        marginBottom: scale(2),
        fontFamily: "Inter_700Bold",
        fontWeight: "800",
    },
    dancerPoints: {
        color: "#C7C7C7",
        fontSize: getFontSize(11),
        textAlign: "center",
        fontFamily: "Inter_400Regular",
    },
    dancerPointsCenter: {
        fontSize: getFontSize(13),
        textAlign: "center",
        fontFamily: "Inter_700Bold",
        fontWeight: "700",
    },
});
