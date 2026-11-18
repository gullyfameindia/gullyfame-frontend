import { topPerformersForHomeScreenFullData } from "@/types/topDancers";
import { LeaderboardStyles as styles } from "./styles";
import { TouchableOpacity, View, Text, Image } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
interface TopTenLeaderbaordProps {
    performers: topPerformersForHomeScreenFullData[];
}
const formatNumber = (num: number): string => {
    if (!num) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
};
function TopTenLeaderboard({ performers }: TopTenLeaderbaordProps) {
    const onNavigate = (userId: string | number | undefined) => {
        if (!userId) return;
        router.push({
            pathname: "/(main)/profile/[id]",
            params: { id: userId, userId: userId },
        });
    };
    return (
        <View style={styles.leaderboardSection}>
            {/* Removed the solid list container. We want floating cards now. */}
            <ScrollView
                contentContainerStyle={styles.leaderboardContent}
                showsVerticalScrollIndicator={false}
            >
                {performers.map((performer) => (
                    <TouchableOpacity
                        style={styles.playerBannerCard} // NEW style
                        onPress={() =>
                            onNavigate(performer.userId || performer.id)
                        }
                        key={performer.rank}
                        activeOpacity={0.8}
                    >
                        {/* Gamified accent strip on the left */}
                        <View style={styles.cardAccentStrip} />

                        <View style={styles.rankBadgeContainer}>
                            <Text style={styles.rankNumber}>
                                {performer.rank}
                            </Text>
                        </View>

                        <View style={styles.leaderboardAvatarWrapper}>
                            <Image
                                source={
                                    performer.defaultProfilePicture ||
                                    require("@assets/images/default-avatar.png")
                                }
                                style={styles.leaderboardAvatarImage}
                            />
                        </View>

                        <View style={styles.leaderboardInfo}>
                            <Text
                                style={styles.leaderboardName}
                                numberOfLines={1}
                            >
                                {performer.name}
                            </Text>

                            <View style={styles.pointsRowList}>
                                <Svg
                                    width={14}
                                    height={14}
                                    viewBox="0 0 24 24"
                                    fill="#FFD700"
                                >
                                    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </Svg>
                                <Text style={styles.leaderboardPoints}>
                                    {formatNumber(
                                        performer.votes || performer.votes || 0,
                                    )}{" "}
                                    Votes
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}
export default TopTenLeaderboard;
