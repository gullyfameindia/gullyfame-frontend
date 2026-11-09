// Shared profile components - used across all profile screens
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { ProfileData } from "./profileHooks";
import { BIO_PREVIEW_LINES, limitBio } from "./profileTypes";
import { VerifiedBadgeIcon as VerifiedBadge } from "@/icons";
const { width, height } = Dimensions.get("window");

// Competitions needed to unlock the 1st..5th star (matches the "How to Level Up" rules).
const STAR_UNLOCK_COMPETITIONS = [3, 5, 10, 20, 30];

// Level Up Section Component
export const LevelUpSection = ({
    onPress,
    levelPercentage = 30,
    competitions = 0,
    compact = false,
}: {
    onPress: () => void;
    levelPercentage?: number;
    competitions?: number;
    /** Tighter bottom gap, used when the section sits inside the rank card. */
    compact?: boolean;
}) => (
    <TouchableOpacity
        style={[styles.levelUpContainer, compact && styles.levelUpContainerCompact]}
        onPress={onPress}
        activeOpacity={0.8}
    >
        <View style={styles.levelUpGradientWrapper}>
            <LinearGradient
                colors={["#EDD6AF", "#F0BA5D", "#EC9A15"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.levelUpGradient}
            >
                <View style={styles.starsContainer}>
                    {STAR_UNLOCK_COMPETITIONS.map((required, starIndex) => {
                        const starPosition = starIndex * 20 + 10;
                        // Earned stars are solid white; locked ones are dark gold outlines.
                        const earned = competitions >= required;
                        return (
                            <View
                                key={starIndex}
                                style={[
                                    styles.starWrapper,
                                    { left: `${starPosition}%` },
                                ]}
                            >
                                <Svg
                                    width={26}
                                    height={26}
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <Path
                                        d="M11.2691 4.41115C11.5006 3.89177 11.6164 3.63208 11.7776 3.55211C11.9176 3.48263 12.082 3.48263 12.222 3.55211C12.3832 3.63208 12.499 3.89177 12.7305 4.41115L14.5745 8.54808C14.643 8.70162 14.6772 8.77839 14.7302 8.83718C14.777 8.8892 14.8343 8.93081 14.8982 8.95929C14.9705 8.99149 15.0541 9.00031 15.2213 9.01795L19.7256 9.49336C20.2911 9.55304 20.5738 9.58288 20.6997 9.71147C20.809 9.82316 20.8598 9.97956 20.837 10.1342C20.8108 10.3122 20.5996 10.5025 20.1772 10.8832L16.8125 13.9154C16.6877 14.0279 16.6252 14.0842 16.5857 14.1527C16.5507 14.2134 16.5288 14.2807 16.5215 14.3503C16.5132 14.429 16.5306 14.5112 16.5655 14.6757L17.5053 19.1064C17.6233 19.6627 17.6823 19.9408 17.5989 20.1002C17.5264 20.2388 17.3934 20.3354 17.2393 20.3615C17.0619 20.3915 16.8156 20.2495 16.323 19.9654L12.3995 17.7024C12.2539 17.6184 12.1811 17.5765 12.1037 17.56C12.0352 17.5455 11.9644 17.5455 11.8959 17.56C11.8185 17.5765 11.7457 17.6184 11.6001 17.7024L7.67662 19.9654C7.18404 20.2495 6.93775 20.3915 6.76034 20.3615C6.60623 20.3354 6.47319 20.2388 6.40075 20.1002C6.31736 19.9408 6.37635 19.6627 6.49434 19.1064L7.4341 14.6757C7.46898 14.5112 7.48642 14.429 7.47814 14.3503C7.47081 14.2807 7.44894 14.2134 7.41394 14.1527C7.37439 14.0842 7.31195 14.0279 7.18708 13.9154L3.82246 10.8832C3.40005 10.5025 3.18884 10.3122 3.16258 10.1342C3.13978 9.97956 3.19059 9.82316 3.29993 9.71147C3.42581 9.58288 3.70856 9.55304 4.27406 9.49336L8.77835 9.01795C8.94553 9.00031 9.02911 8.99149 9.10139 8.95929C9.16534 8.93081 9.2226 8.8892 9.26946 8.83718C9.32241 8.77839 9.35663 8.70162 9.42508 8.54808L11.2691 4.41115Z"
                                        fill={earned ? "#FFFFFF" : "rgba(122, 67, 0, 0.35)"}
                                        stroke={earned ? "#7A4300" : "#FFFFFF"}
                                        strokeWidth={1}
                                        strokeOpacity={earned ? 1 : 0.9}
                                    />
                                </Svg>
                            </View>
                        );
                    })}
                </View>
            </LinearGradient>
        </View>
        <Text style={styles.levelUpText}>
            Level up yourself to become a Gully Star
        </Text>
    </TouchableOpacity>
);

/** Characters dropped from the last preview line to make room for "… more". */
const BIO_MORE_ROOM = 8;

/**
 * Bio cut to BIO_PREVIEW_LINES lines ending in "… more"; tapping it shows the whole bio.
 * `inset` is where the name starts, so the left-aligned bio lines up with it.
 */
const BioText = ({ text, inset }: { text: string; inset: number }) => {
    const [expanded, setExpanded] = useState(false);
    const [lines, setLines] = useState<string[]>([]);

    let preview: string | null = null;
    if (lines.length > BIO_PREVIEW_LINES) {
        const last = lines[BIO_PREVIEW_LINES - 1].trimEnd();
        preview =
            lines.slice(0, BIO_PREVIEW_LINES - 1).join("") +
            last.slice(0, Math.max(0, last.length - BIO_MORE_ROOM)).trimEnd();
    }

    return (
        <View style={[styles.bioContainer, { paddingLeft: inset }]}>
            {/* Hidden full-length copy, measured to find where the third line ends. */}
            <Text
                style={[styles.userBio, styles.bioMeasure, { left: inset }]}
                onTextLayout={(e) => {
                    const next = e.nativeEvent.lines.map((l) => l.text);
                    setLines((prev) => (prev.join("\u0000") === next.join("\u0000") ? prev : next));
                }}
                pointerEvents="none"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
            >
                {text}
            </Text>
            <Text style={styles.userBio}>
                {preview === null || expanded ? text : `${preview}… `}
                {preview !== null ? (
                    <Text style={styles.bioToggle} onPress={() => setExpanded((v) => !v)} accessibilityRole="button">
                        {expanded ? " less" : "more"}
                    </Text>
                ) : null}
            </Text>
        </View>
    );
};

// Stats Section Component
export const StatsSection = ({
    photos = 0,
    followers = 0,
    following = 0,
    onFollowersPress,
    onFollowingPress,
}: {
    /** null means the backend did not send the number; shown as "–" instead of a made-up 0. */
    photos?: number | null;
    followers?: number | null;
    following?: number | null;
    onFollowersPress?: () => void;
    onFollowingPress?: () => void;
}) => (
    <View style={styles.statsContainer}>
        <View style={styles.statItem}>
            <Text style={styles.statNumber}>{photos ?? "–"}</Text>
            <Text style={styles.statLabel}>Posts</Text>
        </View>
        <TouchableOpacity 
            style={styles.statItem}
            onPress={onFollowersPress}
            testID="profile-followers-count"
            activeOpacity={0.7}
        >
            <Text style={styles.statNumber}>{followers ?? "–"}</Text>
            <Text style={styles.statLabel}>Followers</Text>
        </TouchableOpacity>
        <TouchableOpacity 
            style={styles.statItem}
            onPress={onFollowingPress}
            testID="profile-following-count"
            activeOpacity={0.7}
        >
            <Text style={styles.statNumber}>{following ?? "–"}</Text>
            <Text style={styles.statLabel}>Following</Text>
        </TouchableOpacity>
    </View>
);

// User Info Section Component
export const UserInfoSection = ({
    profileData,
    onEditBio,
    showEditButton,
    threeWords,
    userNameMarginTop,
    role = "fan",
    handleUpgradeClick = () => {},
    nameFallback = "User",
}: {
    profileData: ProfileData;
    onEditBio?: () => void;
    showEditButton?: boolean;
    threeWords?: string;
    userNameMarginTop?: number;
    role?: "participant" | "fan" | "other";
    handleUpgradeClick?: () => void;
    /** Shown when there is no name; the own profile passes "" while it is still loading. */
    nameFallback?: string;
}) => {
    // Only the words the user actually saved are shown (no placeholder words).
    // Where the name starts, so the bio can line up under it (capped for very short names).
    const [nameStart, setNameStart] = useState(0);
    const bioInset = Math.min(nameStart, width * 0.3);

    const displayWords: string[] = threeWords && threeWords.trim()
        ? threeWords
              .split("|")
              .map((w) => w.trim())
              .filter((w) => w)
        : [];

    return (
        <View style={styles.userInfo}>
            <View
                style={[
                    styles.userNameRow,
                    userNameMarginTop !== undefined && {
                        marginTop: userNameMarginTop,
                    },
                ]}
            >
                <View style={styles.userNameRowSpacerLeft} />
                <View style={styles.userNameWithBadge} onLayout={(e) => setNameStart(e.nativeEvent.layout.x)}>
                    <Text
                        style={styles.userName}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.6}
                    >
                        {profileData.firstName && profileData.lastName
                            ? `${profileData.firstName} ${profileData.lastName}`
                            : profileData.firstName ||
                              profileData.lastName ||
                              nameFallback}
                    </Text>
                    {profileData.isVerified && (
                        <View style={styles.verifiedBadgeContainer}>
                            <VerifiedBadge size={width * 0.08} />
                        </View>
                    )}
                </View>
                <View style={styles.userNameRowSpacerRight} />
            </View>
            {profileData.bio ? <BioText text={limitBio(profileData.bio).trim()} inset={bioInset} /> : null}
            {displayWords.length > 0 && (
                <View style={styles.threeWordsContainer}>
                    <Text style={styles.threeWordsText} numberOfLines={1}>
                        {displayWords.map((word, index) => (
                            <React.Fragment key={index}>
                                {index > 0 && (
                                    <Text style={styles.threeWordsSeparator}>
                                        {" "}
                                        •{" "}
                                    </Text>
                                )}
                                <Text>{word}</Text>
                            </React.Fragment>
                        ))}
                    </Text>
                </View>
            )}
            {(role === "fan" || (showEditButton && onEditBio)) && (
            <View
                style={[
                    styles.editContainer,
                    role === "fan" && showEditButton && onEditBio ? styles.contentAway : role === "fan" ? styles.contentCenter : styles.contentEnd,
                ]}
            >
                {role === "fan" && (
                    <TouchableOpacity
                        style={styles.upgradeButton}
                        onPress={handleUpgradeClick}
                    >
                        {/* <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              stroke="#EC9A15"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg> */}
                        <Text style={styles.menuItemText}>
                            Upgrade to Participant
                        </Text>
                    </TouchableOpacity>
                )}

                {showEditButton && onEditBio && (
                    <TouchableOpacity
                        style={styles.editBioButton}
                        onPress={onEditBio}
                    >
                        <Svg
                            width={20}
                            height={20}
                            viewBox="0 0 24 24"
                            fill="none"
                        >
                            <Path
                                d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                                stroke="#EC9A15"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <Path
                                d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                                stroke="#EC9A15"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </Svg>
                    </TouchableOpacity>
                )}
            </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    verifiedBadge: {
        marginLeft: 4,
    },
    levelUpContainer: {
        marginTop: 0,
        marginBottom: 20,
    },
    levelUpContainerCompact: {
        marginBottom: 8,
    },
    contentAway: {
        justifyContent: "space-between",
    },
    contentEnd: {
        justifyContent: "flex-end",
    },
    contentCenter: {
        justifyContent: "center",
    },
    levelUpGradientWrapper: {
        borderRadius: 30,
        height: 50,
        width: "100%",
        overflow: "hidden",
        position: "relative",
    },
    editContainer: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        padding: 10,
    },
    levelUpGradient: {
        width: "100%",
        height: "100%",
        borderRadius: 30,
        paddingVertical: 6,
        paddingHorizontal: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    starsContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingHorizontal: 0,
    },
    starWrapper: {
        position: "absolute",
        transform: [{ translateX: -13 }],
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 0,
    },
    levelUpText: {
        color: "#fff",
        fontSize: 14,
        textAlign: "center",
        fontWeight: "500",
        marginTop: 4,
        textDecorationLine: "underline",
    },
    statsContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        paddingHorizontal: 30,
        marginBottom: 20,
    },
    upgradeButton: {
        backgroundColor: "#ec9c1c",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        alignSelf: "center",
        paddingVertical: 12,
        paddingHorizontal: 24,
        marginHorizontal: 8,
        marginVertical: 1,
        borderRadius: 12,
    },
    statItem: {
        alignItems: "center",
    },
    statNumber: {
        // Stretch + center: content-sized text clipped its last digit on some devices ("31" -> "3").
        alignSelf: "stretch",
        textAlign: "center",
        minWidth: width * 0.18,
        fontSize: width * 0.05,
        color: "white",
        marginBottom: height * 0.005,
    },
    statLabel: {
        fontSize: width * 0.03,
        color: "white",
        opacity: 0.8,
    },
    userInfo: {
        alignItems: "center",
        marginTop: -height * 0.012,
        paddingHorizontal: width * 0.05,
        marginBottom: 0,
    },
    userNameRow: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        marginTop: height * 0.02,
        marginBottom: height * 0.001,
        justifyContent: "center",
    },
    userNameRowSpacerLeft: {
        flex: 1,
    },
    userNameRowSpacerRight: {
        flex: 1,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 24,
        marginHorizontal: 8,
        marginVertical: 1,
        borderRadius: 12,
        backgroundColor: "transparent",
    },
    menuItemText: {
        fontSize: 16,
        color: "#fff",
        marginLeft: 16,
        fontWeight: "500",
        letterSpacing: 0.2,
    },
    userNameWithBadge: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 1,
        maxWidth: "88%",
    },
    verifiedBadgeContainer: {
        marginLeft: 3,
        justifyContent: "center",
        alignItems: "center",
    },
    userName: {
        fontSize: width * 0.07,
        color: "white",
        textAlign: "center",
        flexShrink: 1,
    },
    bioContainer: {
        width: "100%",
    },
    bioMeasure: {
        position: "absolute",
        right: 0,
        top: 0,
        opacity: 0,
    },
    bioToggle: {
        color: "#EC9A15",
        fontWeight: "600",
    },
    userBio: {
        fontSize: 14,
        lineHeight: 20,
        color: "white",
        opacity: 0.8,
        textAlign: "left",
        // Full width (not shrink-to-fit) so the hidden measuring copy wraps exactly like the visible bio.
        width: "100%",
    },
    threeWordsContainer: {
        marginTop: 12,
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
    },
    threeWordsText: {
        fontSize: width * 0.035,
        color: "white",
        opacity: 0.9,
        textAlign: "center",
        fontFamily: "Rubik_500Medium",
        flexDirection: "row",
        flexWrap: "nowrap",
    },
    editBioButton: {
        alignSelf: "flex-end",
        marginTop: 12,
        marginRight: width * 0.1,
        padding: 5,
    },
    threeWordsSeparator: {
        color: "white",
        opacity: 0.6,
        fontFamily: "Rubik_500Medium",
    },
});
