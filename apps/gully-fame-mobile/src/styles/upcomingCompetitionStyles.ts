import { StyleSheet } from "react-native";

export const upcomingCompetitionStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#3C2610",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: "#3C2610",
    },
    headerButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        color: "#fff",
        textAlign: "center",
        marginHorizontal: 8,
        fontWeight: "700",
    },
    scrollView: {
        flex: 1,
    },

    // --- Floating Action Bar ---
    stickyBottomCTA: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        // Shrink the top gap
        paddingTop: 8,
        // Make the container invisible so the button truly floats
        backgroundColor: "transparent",
        // Remove the separator line
        borderTopWidth: 0,
        zIndex: 100,
    },
    fullWidthButton: {
        width: "100%",
        height: 56,
        borderRadius: 28,
        shadowColor: "#FF0055",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 8,
    },
    gradientFill: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 28,
    },
    ctaText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    disabledButton: {
        backgroundColor: "#2A1A0B",
        borderWidth: 1,
        borderColor: "#4A3A2A",
        justifyContent: "center",
        alignItems: "center",
        elevation: 0,
        shadowOpacity: 0,
    },
    disabledText: {
        color: "#22C55E", // Green to show success
        fontSize: 16,
        fontWeight: "700",
    },

    // --- Banner & Card ---
    compCardContainer: {
        paddingTop: 16,
        paddingBottom: 10,
        width: "100%",
    },
    titleCard: {
        width: "100%",
        backgroundColor: "#2E1F11",
    },
    compCardImageWrapper: {
        position: "relative",
        width: "100%",
        aspectRatio: 16 / 9,
        overflow: "hidden",
    },
    titleCardImage: {
        width: "100%",
        height: "100%",
    },
    bannerGradient: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "60%",
    },
    upcomingBadge: {
        position: "absolute",
        top: 16,
        left: 16,
        backgroundColor: "#3B82F6", // A cool blue for "Upcoming"
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.2)",
    },
    upcomingBadgeText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.5,
        textTransform: "uppercase",
    },

    titleCardContent: {
        width: "100%",
    },
    titleCardHeader: {
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 16,
        paddingBottom: 12,
    },
    compCardTitleNew: {
        fontSize: 24,
        color: "#fff",
        fontWeight: "800",
        textAlign: "center",
        marginBottom: 4,
    },
    compCardSubtitle: {
        fontSize: 14,
        color: "#3B82F6", // Matches upcoming badge
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 1,
    },

    // --- Hero Prize ---
    heroPrizeContainer: {
        alignItems: "center",
        paddingVertical: 16,
        backgroundColor: "rgba(255, 215, 0, 0.05)",
        borderRadius: 12,
        marginBottom: 12,
        marginHorizontal: 16,
        borderWidth: 1,
        borderColor: "rgba(255, 215, 0, 0.15)",
    },
    heroPrizeLabel: {
        fontSize: 12,
        color: "#EC9A15",
        letterSpacing: 1.5,
        fontWeight: "600",
        marginBottom: 4,
    },
    heroPrizeAmount: {
        fontSize: 36,
        color: "#FFD700",
        fontWeight: "800",
        textShadowColor: "rgba(255, 215, 0, 0.3)",
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10,
    },

    // --- Social Proof (Vanguard) ---
    socialProofContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginHorizontal: 16,
        marginBottom: 16,
        paddingVertical: 12,
        backgroundColor: "rgba(0, 0, 0, 0.2)",
        borderRadius: 12,
    },
    avatarPileContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    avatars: {
        flexDirection: "row",
        alignItems: "center",
    },
    pileAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: "#2E1F11",
    },
    battlingText: {
        color: "#C7C7C7",
        fontSize: 13,
    },
    battlingCount: {
        color: "#EC9A15",
        fontWeight: "700",
        fontSize: 14,
    },

    // --- Event Specs ---
    specsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.2)",
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginHorizontal: 16,
        marginBottom: 16,
    },
    specBox: {
        flex: 1,
        alignItems: "center",
    },
    specHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
        gap: 6,
    },
    specIcon: {
        fontSize: 14,
    },
    specLabel: {
        color: "#999",
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        fontWeight: "600",
    },
    specValue: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "700",
    },
    specVerticalDivider: {
        width: 1,
        height: "80%",
        backgroundColor: "#4a3a2a",
        marginHorizontal: 16,
    },
    freeBadge: {
        backgroundColor: "rgba(34, 197, 94, 0.15)",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: "rgba(34, 197, 94, 0.4)",
    },
    freeBadgeText: {
        color: "#22C55E",
        fontSize: 12,
        fontWeight: "800",
        letterSpacing: 1,
    },

    // --- Mission Briefing (Accordion) ---
    missionBriefingCard: {
        backgroundColor: "#2A1A0B",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#4A3A2A",
        overflow: "hidden",
        marginHorizontal: 16,
        marginBottom: 16,
    },
    missionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        backgroundColor: "rgba(255, 255, 255, 0.03)",
    },
    missionTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    missionIcon: {
        fontSize: 18,
    },
    missionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#fff",
    },
    chevron: {
        color: "#EC9A15",
        fontSize: 14,
    },
    missionContent: {
        padding: 16,
        paddingTop: 0,
    },
    missionSectionTitle: {
        fontSize: 12,
        color: "#EC9A15",
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginTop: 16,
        marginBottom: 8,
    },
    missionText: {
        fontSize: 14,
        color: "#C7C7C7",
        lineHeight: 22,
    },
    missionDivider: {
        height: 1,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        marginTop: 16,
    },
    rulesList: {
        gap: 10,
    },
    ruleBulletRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
    },
    ruleBullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#FF0055",
        marginTop: 8,
    },
    countdownBox: {
        backgroundColor: "#2A1A0B",
        marginHorizontal: 16,
        marginBottom: 16,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(59, 130, 246, 0.3)", // Cool blue to match "Upcoming"
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    countdownTitle: {
        color: "#3B82F6",
        fontSize: 12,
        fontWeight: "800",
        letterSpacing: 2,
        marginBottom: 8,
    },
    countdownRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    timeBlock: {
        alignItems: "center",
        width: 50,
    },
    timeValue: {
        color: "#fff",
        fontSize: 24,
        fontWeight: "900",
        fontVariant: ["tabular-nums"], // Keeps numbers from shifting width
    },
    timeLabel: {
        color: "#999",
        fontSize: 10,
        fontWeight: "700",
        marginTop: 2,
    },
    timeColon: {
        color: "#3B82F6",
        fontSize: 20,
        fontWeight: "900",
        marginBottom: 12, // Align with numbers, not labels
        marginHorizontal: 4,
    },

    // --- Podium Loot Styles ---
    podiumContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 8,
        marginTop: 8,
    },
    podiumPill: {
        flex: 1,
        backgroundColor: "rgba(255, 215, 0, 0.03)",
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 8,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255, 215, 0, 0.1)",
    },
    podiumMedal: {
        fontSize: 24,
        marginBottom: 4,
    },
    podiumTextContainer: {
        alignItems: "center",
    },
    podiumPosition: {
        fontSize: 11,
        color: "#999",
        fontWeight: "500",
        marginBottom: 2,
    },
    podiumAmount: {
        fontSize: 14,
        color: "#fff",
        fontWeight: "700",
    },
});
