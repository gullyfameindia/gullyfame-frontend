import { useState, useEffect,  useCallback } from "react";
import { safeIdParam } from "@/utils/routeParams";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
    View,
    Text,
    ScrollView,
    Image,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    Alert,
    Modal,
    Animated,
    Platform,
    Linking,
    LayoutAnimation,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import {
    BackIcon,
    ShareIcon,
    FacebookIcon,
    TrophyIcon,
    EyeIcon,
} from "@/icons";
import { pastCompetitionStyles as styles } from "@/styles/pastCompetitionStyles";
import TopPerformer from "@/components/home/TopDancers/TopPerformer";
import { SkeletonLoader } from "@/components/Skeleton";
import TopTenLeaderboard from "@/components/TopTenLeaderboard/TopTenLeaderboard";
import SafeImage from "@/components/SafeImage";
import { getCompetitionDetails } from "@/api/services/competitionService";
import { getErrorMessage } from "@/api/client";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import { openCompetition } from "@/utils/openCompetition";

const { height } = Dimensions.get("window");

const formatDateShort = (dateString: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[date.getMonth()]} ${date.getDate()}`;
};

const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
};

const formatCurrency = (amount: number): string => {
    if (!amount) return "₹0";
    return `₹${amount.toLocaleString("en-IN")}`;
};

export default function PastCompetitionScreen() {
    const params = useLocalSearchParams();
    const competitionIdFromParams = safeIdParam(params.id);

    const [competitionData, setCompetitionData] = useState<any>(null);
    const [morePastComps, setMorePastComps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [isRulesExpanded, setIsRulesExpanded] = useState(false);
    const [shareSlideAnim] = useState(() => new Animated.Value(height));

    const toggleRules = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsRulesExpanded(!isRulesExpanded);
    };

    const [loadError, setLoadError] = useState("");

    // GET /competitions/:id returns the ENDED shape: top-10 results and recommended past events.
    const fetchData = useCallback(async () => {
        if (!competitionIdFromParams) return;
        setLoading(true);
        setLoadError("");
        try {
            const details = await getCompetitionDetails(competitionIdFromParams);
            if (details.status !== "ENDED") {
                openCompetition(competitionIdFromParams, details.status);
                return;
            }
            const leaderboard = details.results.map((entry) => ({
                rank: entry.rank,
                name: entry.name || "Participant",
                id: entry.id,
                userId: entry.id,
                votes: entry.votes || 0,
                prizeMoneyWon: entry.prizeMoneyWon || 0,
                defaultProfilePicture: entry.profilePictureUrl
                    ? { uri: entry.profilePictureUrl }
                    : require("@assets/images/user1.png"),
                isCurrentUser: false,
                role: "participants",
                badge: entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : "⭐",
            }));
            setCompetitionData({ ...details, leaderboard });
            setMorePastComps(details.recommendedPastCompetitions);
        } catch (err) {
            setLoadError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [competitionIdFromParams]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleShare = async (platform: string) => {
        const competitionLink = `https://gullyfame.com/competition/${competitionData?._id || competitionIdFromParams}`;
        const competitionText = `Check out "${competitionData?.title || 'this competition'}" on Gully Fame! ${competitionLink}`;

        try {
            switch (platform) {
                case "copy":
                    if (Platform.OS === "web") {
                        await navigator.clipboard.writeText(competitionLink);
                        Alert.alert("Copied!", "Link copied to clipboard");
                    } else {
                        Alert.alert("Copy Link", competitionLink, [{ text: "OK" }]);
                    }
                    break;
                case "whatsapp":
                case "whatsapp-status": {
                    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(competitionText)}`;
                    if (await Linking.canOpenURL(whatsappUrl)) {
                        await Linking.openURL(whatsappUrl);
                    } else {
                        Alert.alert("Error", "Please install WhatsApp to share");
                    }
                    break;
                  }
                case "twitter": {
                    const twitterUrl = `twitter://post?message=${encodeURIComponent(competitionText)}`;
                    if (await Linking.canOpenURL(twitterUrl)) {
                        await Linking.openURL(twitterUrl);
                    } else {
                        const twitterWebUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(competitionText)}`;
                        await Linking.openURL(twitterWebUrl);
                    }
                    break;
                  }
            }
            Animated.timing(shareSlideAnim, {
                toValue: height,
                duration: 300,
                useNativeDriver: true,
            }).start(() => setShareModalVisible(false));
        } catch {
            Alert.alert("Error", "Unable to share. Please try again.");
        }
    };

    if (loading || !competitionData) {
        return (
            <View style={[styles.container, { justifyContent: "center", alignItems: "center", padding: 24 }]}>
                {loading ? (
                    <SkeletonLoader style={{ alignSelf: "stretch" }} />
                ) : (
                    <>
                        <Text style={{ color: "#ccc", textAlign: "center" }}>{loadError || "Competition not found."}</Text>
                        <TouchableOpacity onPress={fetchData} style={{ marginTop: 16 }}>
                            <Text style={{ color: "#EC9A15", fontSize: 16 }}>Retry</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        );
    }

    const topThreePerformers = competitionData.leaderboard?.filter((p: any) => p.rank <= 3) || [];
    const leaderboardPerformers = competitionData.leaderboard?.filter((p: any) => p.rank > 3) || [];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#3C2610" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                    <BackIcon />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {competitionData.title}
                </Text>
                <TouchableOpacity
                    onPress={() => {
                        shareSlideAnim.setValue(height);
                        setShareModalVisible(true);
                        Animated.spring(shareSlideAnim, {
                            toValue: 0,
                            useNativeDriver: true,
                            tension: 50,
                            friction: 8,
                        }).start();
                    }}
                    style={styles.headerButton}
                >
                    <ShareIcon color="#fff" size={20} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.compCardContainer}>
                    <View style={styles.titleCard}>
                        <View style={styles.compCardImageWrapper}>
                            <Image
                                source={resolveMediaUrl(competitionData.image) ? { uri: resolveMediaUrl(competitionData.image)! } : require("@assets/images/trending1.png")}
                                style={styles.titleCardImage}
                                resizeMode="cover"
                            />
                            <LinearGradient colors={["transparent", "rgba(0,0,0,0.6)"]} style={styles.bannerGradient} />
                            <View style={styles.endedBadge}>
                                <Text style={styles.endedBadgeText}>Ended</Text>
                            </View>
                            <View style={styles.statsOverlay}>
                                <View style={styles.statItemOverlay}>
                                    <EyeIcon color="#fff" size={18} />
                                    <Text style={styles.statTextOverlay}>
                                        {formatNumber(competitionData.totalViews || 0)}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.titleCardContent}>
                            <View style={styles.titleCardHeader}>
                                <Text style={styles.compCardTitleNew}>{competitionData.title}</Text>
                                <Text style={styles.compCardSubtitle}>{competitionData.subtitle || "Competition"}</Text>
                            </View>

                            <View style={styles.heroPrizeContainer}>
                                <Text style={styles.heroPrizeLabel}>PRIZE POOL DISTRIBUTED</Text>
                                <Text style={styles.heroPrizeAmount}>{formatCurrency(competitionData.prizePool || 0)}</Text>
                            </View>

                            <View style={styles.specsRow}>
                                <View style={styles.specBoxCenter}>
                                    <View style={styles.specHeaderCenter}>
                                        <Text style={styles.specIcon}>👥</Text>
                                        <Text style={styles.specLabel}>Participants</Text>
                                    </View>
                                    <Text style={styles.specValueLarge}>
                                        {competitionData.totalParticipants || 0}
                                    </Text>
                                </View>
                                <View style={styles.specVerticalDivider} />
                                <View style={styles.specBoxCenter}>
                                    <View style={styles.specHeaderCenter}>
                                        <Text style={styles.specIcon}>📅</Text>
                                        <Text style={styles.specLabel}>Timeline</Text>
                                    </View>
                                    <Text style={styles.specValue}>
                                        {formatDateShort(competitionData.startDate)} - {formatDateShort(competitionData.endDate)}
                                    </Text>
                                </View>
                            </View>

                            {(competitionData.description || competitionData.rules) && (
                                <TouchableOpacity style={styles.missionBriefingCard} activeOpacity={0.8} onPress={toggleRules}>
                                    <View style={styles.missionHeader}>
                                        <View style={styles.missionTitleRow}>
                                            <Text style={styles.missionIcon}>📜</Text>
                                            <Text style={styles.missionTitle}>Event Details & Rules</Text>
                                        </View>
                                        <Text style={styles.chevron}>{isRulesExpanded ? "▲" : "▼"}</Text>
                                    </View>
                                    {isRulesExpanded && (
                                        <View style={styles.missionContent}>
                                            {competitionData.description && (
                                                <>
                                                    <Text style={styles.missionSectionTitle}>About</Text>
                                                    <Text style={styles.missionText}>{competitionData.description}</Text>
                                                </>
                                            )}
                                            {competitionData.rules && (
                                                <>
                                                    {competitionData.description && <View style={styles.missionDivider} />}
                                                    <Text style={styles.missionSectionTitle}>Rules</Text>
                                                    <View style={styles.rulesList}>
                                                        {competitionData.rules.split("\n").map((rule: string, index: number) => (
                                                            <View key={index} style={styles.ruleBulletRow}>
                                                                <View style={styles.ruleBullet} />
                                                                <Text style={styles.missionText}>{rule.trim()}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                </>
                                            )}
                                        </View>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>

                {topThreePerformers.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.finalResultsSection}>
                            <View style={styles.leaderboardTitleContainer}>
                                <Text style={styles.leaderboardMainTitle}>🏆 FINAL STANDINGS</Text>
                                <Text style={styles.leaderboardSubTitle}>Top 10 Champions</Text>
                            </View>
                            <View style={styles.finalResultsContainer}>
                                {topThreePerformers.filter((p: any) => p.rank === 2).map((p: any) => (
                                    <TopPerformer performer={p} key={p.userId} />
                                ))}
                                {topThreePerformers.filter((p: any) => p.rank === 1).map((p: any) => (
                                    <TopPerformer performer={p} key={p.userId} />
                                ))}
                                {topThreePerformers.filter((p: any) => p.rank === 3).map((p: any) => (
                                    <TopPerformer performer={p} key={p.userId} />
                                ))}
                            </View>
                        </View>
                        <TopTenLeaderboard performers={leaderboardPerformers} />
                    </View>
                )}

                {morePastComps.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.morePastCompTitle}>More Past Competitions</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pastCompScroll}>
                            {morePastComps.map((comp: any) => (
                                <TouchableOpacity
                                    key={comp._id}
                                    style={styles.compCardNew}
                                    activeOpacity={0.9}
                                    onPress={() => router.push(`/(main)/competition/past/${comp._id}` as any)}
                                >
                                    <SafeImage
                                        defaultImage={require("@assets/images/trending1.png")}
                                        imageUrl={resolveMediaUrl(comp.image) || undefined}
                                        style={styles.compCardImageNew}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.compCardContentNew}>
                                        <Text style={styles.compCardTitleNew} numberOfLines={2}>{comp.title}</Text>
                                        <View style={styles.compCardDetailsNew}>
                                            <View style={styles.compDetailItemNew}>
                                                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                                                    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#FFD700" />
                                                </Svg>
                                                <Text style={styles.compDetailTextNew}>
                                                    Winner: {comp.winnerName || "Not announced"}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.compCardFooterNew}>
                                            <View style={styles.prizeRowNew}>
                                                <TrophyIcon size={18} />
                                                <Text style={styles.compPrizeTextNew}>{formatCurrency(comp.prizePool || 0)}</Text>
                                            </View>
                                            <TouchableOpacity
                                                style={styles.resultsBtnNew}
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/(main)/competition/past/${comp._id}` as any);
                                                }}
                                            >
                                                <Text style={styles.resultsBtnTextNew}>View Results</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
                <View style={{ height: 20 }} />
            </ScrollView>

 

            {}
            <Modal
                visible={shareModalVisible}
                transparent={true}
                animationType="none"
                onRequestClose={() => {
                    Animated.timing(shareSlideAnim, {
                        toValue: height,
                        duration: 300,
                        useNativeDriver: true,
                    }).start(() => setShareModalVisible(false));
                }}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => {
                        Animated.timing(shareSlideAnim, {
                            toValue: height,
                            duration: 300,
                            useNativeDriver: true,
                        }).start(() => setShareModalVisible(false));
                    }}
                >
                    <Animated.View
                        style={[
                            styles.shareModal,
                            { transform: [{ translateY: shareSlideAnim }] },
                        ]}
                    >
                        <TouchableOpacity
                            activeOpacity={1}
                            onPress={(e) => e.stopPropagation()}
                        >
                            <View style={styles.handleBar} />
                            <View style={styles.shareHeader}>
                                <Text style={styles.shareHeaderTitle}>
                                    Share Competition
                                </Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        Animated.timing(shareSlideAnim, {
                                            toValue: height,
                                            duration: 300,
                                            useNativeDriver: true,
                                        }).start(() =>
                                            setShareModalVisible(false),
                                        );
                                    }}
                                >
                                    <Text style={styles.closeButton}>✕</Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.shareOptionsList}
                                contentContainerStyle={
                                    styles.shareOptionsContent
                                }
                            >
                                <TouchableOpacity
                                    style={styles.shareOption}
                                    onPress={() => handleShare("copy")}
                                >
                                    <View
                                        style={[
                                            styles.shareOptionIconCircle,
                                            { backgroundColor: "#fff" },
                                        ]}
                                    >
                                        <MaterialCommunityIcons name="link-variant" size={26} color="#fff" />
                                    </View>
                                    <Text
                                        style={styles.shareOptionName}
                                        numberOfLines={1}
                                    >
                                        Copy Link
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.shareOption}
                                    onPress={() => handleShare("whatsapp")}
                                >
                                    <View
                                        style={[
                                            styles.shareOptionIconCircle,
                                            { backgroundColor: "#25D36620" },
                                        ]}
                                    >
                                        <MaterialCommunityIcons name="whatsapp" size={26} color="#25D366" />
                                    </View>
                                    <Text
                                        style={styles.shareOptionName}
                                        numberOfLines={1}
                                    >
                                        WhatsApp
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.shareOption}
                                    onPress={() =>
                                        handleShare("whatsapp-status")
                                    }
                                >
                                    <View
                                        style={[
                                            styles.shareOptionIconCircle,
                                            { backgroundColor: "#25D36620" },
                                        ]}
                                    >
                                        <MaterialCommunityIcons name="progress-clock" size={26} color="#25D366" />
                                    </View>
                                    <Text
                                        style={styles.shareOptionName}
                                        numberOfLines={1}
                                    >
                                        Status
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.shareOption}
                                    onPress={() => handleShare("instagram")}
                                >
                                    <View
                                        style={[
                                            styles.shareOptionIconCircle,
                                            { backgroundColor: "#E4405F20" },
                                        ]}
                                    >
                                        <MaterialCommunityIcons name="instagram" size={26} color="#E4405F" />
                                    </View>
                                    <Text
                                        style={styles.shareOptionName}
                                        numberOfLines={1}
                                    >
                                        Instagram
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.shareOption}
                                    onPress={() => handleShare("facebook")}
                                >
                                    <View
                                        style={[
                                            styles.shareOptionIconCircle,
                                            { backgroundColor: "#1877F2" },
                                        ]}
                                    >
                                        <FacebookIcon size={24} />
                                    </View>
                                    <Text
                                        style={styles.shareOptionName}
                                        numberOfLines={1}
                                    >
                                        Facebook
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.shareOption}
                                    onPress={() => handleShare("twitter")}
                                >
                                    <View
                                        style={[
                                            styles.shareOptionIconCircle,
                                            { backgroundColor: "#1DA1F220" },
                                        ]}
                                    >
                                        <MaterialCommunityIcons name="twitter" size={26} color="#1DA1F2" />
                                    </View>
                                    <Text
                                        style={styles.shareOptionName}
                                        numberOfLines={1}
                                    >
                                        Twitter
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.shareOption}
                                    onPress={() => handleShare("snapchat")}
                                >
                                    <View
                                        style={[
                                            styles.shareOptionIconCircle,
                                            { backgroundColor: "#FFEC0620" },
                                        ]}
                                    >
                                        <MaterialCommunityIcons name="snapchat" size={26} color="#FFFC00" />
                                    </View>
                                    <Text
                                        style={styles.shareOptionName}
                                        numberOfLines={1}
                                    >
                                        Snapchat
                                    </Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </TouchableOpacity>
                    </Animated.View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}
