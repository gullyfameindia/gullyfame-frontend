import { StyleSheet, Dimensions } from "react-native";
const { width, height } = Dimensions.get("window");
export const pastCompetitionStyles = StyleSheet.create({
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
    heroPrizeContainer: {
        alignItems: "center",
        paddingVertical: 16,
        backgroundColor: "rgba(255, 215, 0, 0.05)",
        borderRadius: 12,
        marginBottom: 8,
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
    specsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.2)",
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginHorizontal: 16,
        marginBottom: 12,
    },
    specBox: {
        flex: 1,
        alignItems: "flex-start",
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
        fontSize: 14,
        fontWeight: "600",
    },
    specVerticalDivider: {
        width: 1,
        height: "80%",
        backgroundColor: "#4a3a2a",
        marginHorizontal: 16,
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
    missionText: {
        fontSize: 14,
        color: "#C7C7C7",
        lineHeight: 22,
    },

    // --- Glowing Leaderboard Title ---
    leaderboardTitleContainer: {
        alignItems: "center",
        marginBottom: 8,
        marginTop: 16,
    },
    leaderboardMainTitle: {
        fontSize: 20,
        color: "#FFD700",
        fontWeight: "800",
        letterSpacing: 1.5,
        textShadowColor: "rgba(255, 215, 0, 0.4)",
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
    },
    leaderboardSubTitle: {
        fontSize: 13,
        color: "#C7C7C7",
        marginTop: 4,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    specBoxCenter: {
        flex: 1,
        alignItems: "center", // Center aligns the specs to look like badges
    },
    specHeaderCenter: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
        gap: 6,
    },
    specValueLarge: {
        color: "#EC9A15", // Punchy orange for the participant count
        fontSize: 18,
        fontWeight: "800",
    },

    // --- Updated Accordion Styles ---
    missionBriefingCard: {
        backgroundColor: "#2A1A0B", // Deep dark brown
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(255, 215, 0, 0.15)", // Subtle gold border
        overflow: "hidden",
        marginHorizontal: 16,
        marginBottom: 16,
    },
    missionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        backgroundColor: "rgba(255, 215, 0, 0.05)", // Gold tint makes it look like a button
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
        backgroundColor: "#FF0055", // Neon pink/red dot
        marginTop: 8,
    },
    missionDivider: {
        height: 1,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        marginTop: 16,
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
    },
    scrollView: {
        flex: 1,
    },
    infoSection: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#1a1a1a",
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    categoryText: {
        fontSize: 15,
        color: "#FF6B35",
        flex: 1,
    },
    locationText: {
        fontSize: 13,
        color: "#999",
    },
    presenterText: {
        fontSize: 13,
        color: "#999",
    },
    endedText: {
        fontSize: 13,
        color: "#999",
    },
    section: {
        paddingHorizontal: 16,
        marginBottom: 16,
        marginTop: 12,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        color: "#fff",
        marginBottom: 20,
        textAlign: "center",
        fontWeight: "700",
    },
    morePastCompTitle: {
        fontSize: 16,
        color: "#fff",
        marginBottom: 10,
        fontWeight: "700",
    },
    viewAllLink: {
        fontSize: 14,
        color: "#FF6B35",
    },
    card: {
        backgroundColor: "#40301F",
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: "#4a3a2a",
    },
    detailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 6,
    },
    detailsBox: {
        backgroundColor: "rgba(0,0,0,0.2)", // Inner shadow box
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 4,
        marginBottom: 20,
    },
    detailLabel: {
        fontSize: 14,
        color: "#999",
    },
    detailValue: {
        fontSize: 14,
        color: "#fff",
    },
    statsGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    statBox: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 8,
        backgroundColor: "rgba(255,140,0,0.08)",
        borderRadius: 10,
        marginHorizontal: 4,
    },
    statBoxLabel: {
        fontSize: 11,
        color: "#999",
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    statBoxValue: {
        fontSize: 18,
        color: "#FFD700",
    },
    detailRowCompact: {
        flexDirection: "row",
        justifyContent: "space-between", // Spread left and right correctly
        alignItems: "center",
        paddingVertical: 12,
    },
    aboutSection: {
        marginTop: 4,
    },
    aboutLabel: {
        fontSize: 16,
        color: "#FFF",
        fontWeight: "700",
        marginBottom: 8,
    },
    aboutText: {
        fontSize: 14,
        color: "#CCC",
        lineHeight: 22, // Better readability for paragraphs
    },
    detailLabelCompact: {
        fontSize: 14,
        color: "#A0A0A0",
    },
    detailValueCompact: {
        fontSize: 14,
        color: "#FFF", // Changed to white so it looks less aggressive
        fontWeight: "600",
        textAlign: "right",
    },
    divider: {
        height: 1,
        backgroundColor: "rgba(255,255,255,0.08)", // Softer, modern divider
    },
    entriesScroll: {
        marginTop: 8,
    },
    entryCard: {
        width: width * 0.45,
        height: width * 0.6,
        marginRight: 12,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#252525",
        position: "relative",
    },
    entryThumbnail: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    entryPlayIcon: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: [{ translateX: -16 }, { translateY: -16 }],
    },
    entryGradient: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: 12,
    },
    entryUsername: {
        fontSize: 13,
        color: "#fff",
        marginBottom: 6,
    },
    entryStats: {
        flexDirection: "row",
        gap: 12,
    },
    entryStatItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    entryStatText: {
        fontSize: 11,
        color: "#fff",
    },
    // New Card Design - Content Below Image
    compCardContainer: {
        paddingTop: 16,
        paddingBottom: 10,
        width: "100%",
    },
    compCardNew: {
        borderRadius: 16, // Softer corners
        overflow: "hidden",
        flexShrink: 0,
        width: width * 0.8,
        backgroundColor: "#2E1F11", // Slightly darker to pop off the main background
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)", // Very subtle border
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    titleCard: {
        width: "100%",
        borderColor: "rgba(255,255,255,0.05)", // Very subtle border
        shadowColor: "#000",
        backgroundColor: "#2E1F11",
    },
    titleCardContent: {
        width: "100%",
    },
    titleCardHeader: {
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 16,
        paddingBottom: 8,
    },
    titleCardDetailsBox: {
        borderRadius: 0,
    },
    titleCardAboutSection: {
        padding: 16,
        paddingTop: 0,
    },
    compCardImageWrapper: {
        position: "relative",
        width: "100%",
        aspectRatio: 16 / 9,
        overflow: "hidden",
    },
    titleCardImage: {
        width: "100%",
    },
    compCardImageNew: {
        width: "100%",
        aspectRatio: 16 / 9,
    },
    compCardContentNew: {
        padding: 20,
    },
    cardHeaderArea: {
        marginBottom: 20,
    },
    bannerGradient: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "60%",
    },
    endedBadge: {
        position: "absolute",
        top: 12,
        left: 12,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.2)",
    },
    endedBadgeText: {
        color: "#fff",
        fontSize: 12,
        letterSpacing: 0.5,
        fontWeight: "600",
    },
    statsOverlay: {
        position: "absolute",
        bottom: 12,
        right: 12,
    },
    statItemOverlay: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    statTextOverlay: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "600",
    },

    compCardTitleNew: {
        fontSize: 22,
        color: "#fff",
        fontWeight: "700",
        textAlign: "left", // Left aligned for modern look
        marginBottom: 6,
    },
    compCardSubtitle: {
        fontSize: 14,
        color: "#EC9A15", // Make category pop
        fontWeight: "600",
        textAlign: "left",
    },
    // Winner Section - Yellow Background (Linear Gradient)
    winnerSection: {
        padding: 20,
        marginTop: 0,
        marginBottom: 0,
    },
    winnerHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        marginBottom: 20,
    },
    winnerTitle: {
        fontSize: 24,
        color: "#fff",
        fontWeight: "700",
    },
    winnerCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        marginBottom: 16,
    },
    winnerImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: "#FFD700",
    },
    winnerInfo: {
        flex: 1,
    },
    winnerUsername: {
        fontSize: 16,
        color: "#000",
        fontWeight: "700",
        marginBottom: 4,
    },
    winnerName: {
        fontSize: 14,
        color: "#000",
        marginBottom: 8,
    },
    winnerStats: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    winnerStatText: {
        fontSize: 13,
        color: "#000",
    },
    winnerStatDot: {
        fontSize: 13,
        color: "#000",
    },
    followWinnerButton: {
        backgroundColor: "#3C2610",
        paddingVertical: 14,
        paddingHorizontal: 5,
        borderRadius: 10,
        alignItems: "center",
    },
    followWinnerButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    // Final Results - Top 3
    finalResultsSection: {
        paddingHorizontal: 16,
        marginBottom: 0,
        marginTop: 14,
        alignItems: "center",
    },
    finalResultsContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "flex-end",
        gap: width * 0.04,
        paddingVertical: 15,
        paddingHorizontal: width * 0.02,
        marginTop: 30,
    },
    finalResultItem: {
        alignItems: "center",
        flex: 1,
    },
    finalResultItemCenter: {
        alignItems: "center",
        flex: 1,
        marginBottom: 20,
    },
    finalResultImageWrapper: {
        position: "relative",
        marginBottom: 8,
    },
    finalResultImage: {
        width: width * 0.22,
        height: width * 0.22,
        borderRadius: width * 0.11,
        borderWidth: 2.5,
        borderColor: "#EC9A15",
    },
    finalResultImageCenter: {
        width: width * 0.26,
        height: width * 0.26,
        borderRadius: width * 0.13,
        borderWidth: 3,
        borderColor: "#FFD700",
    },
    starIconWrapperFinal: {
        position: "absolute",
        top: -40,
        alignSelf: "center",
        zIndex: 10,
    },
    starIconFinal: {
        width: 45,
        height: 55,
    },
    finalResultRankBadge: {
        position: "absolute",
        bottom: -8,
        alignSelf: "center",
        backgroundColor: "#EC9A15",
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 3,
        borderColor: "#3C2610",
    },
    finalResultRankBadgeCenter: {
        position: "absolute",
        bottom: -8,
        alignSelf: "center",
        backgroundColor: "#FFD700",
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 3,
        borderColor: "#3C2610",
    },
    finalResultRankText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "700",
    },
    finalResultRankTextCenter: {
        color: "#000",
        fontSize: 14,
        fontWeight: "700",
    },
    finalResultName: {
        fontSize: 12,
        color: "#fff",
        fontWeight: "600",
        textAlign: "center",
        marginBottom: 4,
    },
    finalResultNameCenter: {
        fontSize: 14,
        color: "#fff",
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 4,
    },
    finalResultPoints: {
        fontSize: 11,
        color: "#fff",
        textAlign: "center",
        marginBottom: 4,
    },
    finalResultPointsCenter: {
        fontSize: 12,
        color: "#fff",
        textAlign: "center",
        marginBottom: 4,
    },
    finalResultPrize: {
        fontSize: 12,
        color: "#EC9A15",
        fontWeight: "600",
        textAlign: "center",
    },
    finalResultPrizeCenter: {
        fontSize: 13,
        color: "#EC9A15",
        fontWeight: "700",
        textAlign: "center",
    },
    // Top Entries
    topEntriesScroll: {
        gap: 12,
        paddingHorizontal: 0,
    },
    topEntryCard: {
        width: width * 0.45,
        marginRight: 12,
        backgroundColor: "#40301F",
        borderRadius: 12,
        overflow: "hidden",
    },
    topEntryImage: {
        width: "100%",
        height: width * 0.5,
        resizeMode: "cover",
    },
    topEntryInfo: {
        padding: 12,
    },
    topEntryUsername: {
        fontSize: 13,
        color: "#fff",
        fontWeight: "500",
        marginBottom: 8,
    },
    topEntryStats: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    topEntryStatText: {
        fontSize: 12,
        color: "#999",
        marginRight: 8,
    },
    // Winners Section (old - keeping for compatibility)
    winnersHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 20,
    },
    winnersTitle: {
        fontSize: 20,
        color: "#fff",
        fontWeight: "700",
    },
    topDancersContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "flex-end",
        gap: width * 0.04,
        paddingVertical: 15,
        paddingHorizontal: width * 0.02,
    },
    topDancerSide: {
        alignItems: "center",
        flex: 1,
    },
    topDancerCenter: {
        alignItems: "center",
        flex: 1,
        marginBottom: 20,
    },
    dancerImageWrapper: {
        position: "relative",
        marginBottom: 6,
    },
    dancerImageSide: {
        width: width * 0.24,
        height: width * 0.24,
        borderRadius: width * 0.12,
        borderWidth: 2.5,
        borderColor: "#EC9A15",
    },
    dancerImageCenter: {
        width: width * 0.28,
        height: width * 0.28,
        borderRadius: width * 0.14,
        borderWidth: 2.5,
        borderColor: "#EC9A15",
    },
    starIconWrapper: {
        position: "absolute",
        top: -45,
        alignSelf: "center",
        zIndex: 10,
    },
    starIcon: {
        width: 50,
        height: 60,
    },
    rankBadge: {
        position: "absolute",
        bottom: -5,
        alignSelf: "center",
        backgroundColor: "#EC9A15",
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 3,
        borderColor: "#3C2610",
    },
    rankBadgeText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "700",
    },
    rankBadgeLarge: {
        position: "absolute",
        bottom: -5,
        alignSelf: "center",
        backgroundColor: "#EC9A15",
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 3,
        borderColor: "#3C2610",
    },
    rankBadgeTextLarge: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
    dancerName: {
        color: "#fff",
        fontSize: 13,
        textAlign: "center",
        marginTop: 10,
        marginBottom: 2,
        fontWeight: "700",
    },
    dancerNameCenter: {
        color: "#fff",
        fontSize: 15,
        textAlign: "center",
        marginTop: 10,
        marginBottom: 2,
        fontWeight: "700",
    },
    dancerPoints: {
        color: "#fff",
        fontSize: 11,
        textAlign: "center",
        marginBottom: 6,
        fontWeight: "400",
    },
    dancerPointsCenter: {
        color: "#fff",
        fontSize: 12,
        textAlign: "center",
        marginBottom: 8,
        fontWeight: "400",
    },
    leaderboardButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#EC9A15",
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginTop: 20,
        gap: 8,
    },
    leaderboardButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
    // Best Moments
    bestMomentsScroll: {
        gap: 15,
        paddingHorizontal: 16,
    },
    bestMomentCard: {
        width: width * 0.75,
        height: 200,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#40301F",
        marginRight: 15,
        position: "relative",
    },
    bestMomentImage: {
        width: "100%",
        height: "100%",
    },
    topBadgeNew: {
        position: "absolute",
        top: 12,
        left: 12,
        backgroundColor: "#EC9A15",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    topBadgeTextNew: {
        color: "#fff",
        fontSize: 11,
        fontWeight: "700",
    },
    topBadgeNumberNew: {
        color: "#fff",
        fontSize: 11,
        fontWeight: "700",
    },
    bestMomentPlayIcon: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: [{ translateX: -20 }, { translateY: -20 }],
    },
    bestMomentGradient: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
    },
    bestMomentTitle: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 4,
    },
    bestMomentSubtitle: {
        color: "#fff",
        fontSize: 14,
        opacity: 0.9,
    },
    // More Past Competitions
    pastCompScroll: {
        gap: 15,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    compCardDetailsNew: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 8,
    },
    compDetailItemNew: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    compDetailTextNew: {
        fontSize: 12,
        color: "#ccc",
    },
    compCardFooterNew: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 8,
    },
    prizeRowNew: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    compPrizeTextNew: {
        fontSize: 14,
        color: "#EC9A15",
        fontWeight: "600",
    },
    resultsBtnNew: {
        backgroundColor: "#EC9A15",
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 8,
    },
    resultsBtnTextNew: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "600",
    },
    // Share Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        justifyContent: "flex-end",
    },
    shareModal: {
        backgroundColor: "#1a1a1a",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
        maxHeight: height * 0.6,
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: "#666",
        borderRadius: 2,
        alignSelf: "center",
        marginTop: 8,
        marginBottom: 16,
    },
    shareHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    shareHeaderTitle: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "700",
    },
    closeButton: {
        color: "#fff",
        fontSize: 24,
        fontWeight: "300",
    },
    shareOptionsList: {
        paddingVertical: 10,
    },
    shareOptionsContent: {
        paddingHorizontal: 20,
    },
    shareOption: {
        alignItems: "center",
        marginRight: 20,
        width: 70,
    },
    shareOptionIconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
    },
    shareIconImage: {
        width: 24,
        height: 24,
    },
    shareOptionName: {
        color: "#fff",
        fontSize: 12,
        textAlign: "center",
    },
});
