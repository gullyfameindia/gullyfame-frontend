// Shared hooks for profile screens.
import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams } from "expo-router";
import { getProfile, getProgress, getPublicProfile } from "@api/services/userService";
import { getMyKyc } from "@api/services/kycService";
import { XP_AND_MISSIONS_ENABLED } from "@/config/features";
import { apiGet, getErrorMessage } from "@api/client";
import { cacheUserProfile } from "@utils/userSession";
import { getOwnProfileSnapshot, ownProfileSnapshotReady, saveOwnProfileSnapshot } from "@utils/ownProfileCache";

export interface ProfileData {
    id?: string;
    _id?: string;
    firstName: string;
    lastName: string;
    username?: string;
    /** Bio, three words and social links are not stored by the backend yet; kept on this device. */
    bio: string;
    threeWords?: string;
    profileImage: string | null;
    role: string;
    isVerified: boolean;
    competitionCount: number;
    levelPercentage: number;
    levelTitle?: string;
    level?: number;
    xLink: string;
    instagramLink: string;
    followersCount?: number;
    followingCount?: number;
    reelsCount?: number;
    isFollowing?: boolean;
    // Participant-specific fields
    rank?: number;
    currentRank?: number;
    nextRank?: number;
    competitionsParticipated?: number;
    competitionsRequiredForNextRank?: number;
    achievements?: { id: string; name: string }[];
    email?: string;
}

const EMPTY_PROFILE: ProfileData = {
    firstName: "",
    lastName: "",
    bio: "",
    profileImage: null,
    role: "",
    isVerified: false,
    competitionCount: 0,
    levelPercentage: 0,
    xLink: "",
    instagramLink: "",
};

// Own profile: the last loaded profile renders instantly, then the backend profile,
// progress, competitions and KYC status replace it.
export function useOwnProfile() {
    const [profileData, setProfileData] = useState<ProfileData>(() => ({
        ...EMPTY_PROFILE,
        ...(getOwnProfileSnapshot<ProfileData>() || {}),
    }));
    // TEMP (testing skeletons): in dev, ignore the saved profile so the loading state shows.
    const [isLoading, setIsLoading] = useState(() => __DEV__ || !getOwnProfileSnapshot());
    const [error, setError] = useState("");

    // Remember the latest profile for the next visit.
    useEffect(() => {
        if (profileData.id) saveOwnProfileSnapshot(profileData);
    }, [profileData]);

    const loadUserData = useCallback(async () => {
        setError("");
        // The startup read may still be running on the very first visit.
        await ownProfileSnapshotReady();
        const snapshot = getOwnProfileSnapshot<ProfileData>();
        if (snapshot) {
            setProfileData((prev) => (prev.id ? prev : { ...prev, ...snapshot }));
            if (!__DEV__) setIsLoading(false);
        }
        const cached = Object.fromEntries(
            await AsyncStorage.multiGet([
                "userFirstName",
                "userLastName",
                "userBio",
                "userThreeWords",
                "userProfileImage",
                "userRole",
                "userInstagram",
                "userXLink",
            ])
        );
        setProfileData((prev) => ({
            ...prev,
            firstName: cached.userFirstName || prev.firstName,
            lastName: cached.userLastName || prev.lastName,
            bio: cached.userBio || "",
            threeWords: cached.userThreeWords || undefined,
            profileImage: cached.userProfileImage || prev.profileImage,
            role: cached.userRole || prev.role,
            instagramLink: cached.userInstagram || "",
            xLink: cached.userXLink || "",
        }));

        try {
            const [user, progress, competitions, kyc] = await Promise.all([
                getProfile(),
                XP_AND_MISSIONS_ENABLED ? getProgress().catch(() => null) : Promise.resolve(null),
                apiGet<{ total: number }>("user/competitions", { params: { page: 1, limit: 1 } }).catch(() => null),
                getMyKyc().catch(() => null),
            ]);
            await cacheUserProfile(user);
            setProfileData((prev) => ({
                ...prev,
                id: user._id,
                _id: user._id,
                firstName: user.firstName || "",
                lastName: user.lastName || "",
                username: user.username || "",
                email: user.email || "",
                profileImage: user.profileImage || null,
                role: user.role || "",
                followersCount: typeof user.followersCount === "number" ? user.followersCount : prev.followersCount,
                followingCount: typeof user.followingCount === "number" ? user.followingCount : prev.followingCount,
                isVerified: kyc?.status === "APPROVED",
                competitionCount: competitions?.total || 0,
                level: progress?.level,
                levelTitle: progress?.levelTitle,
                levelPercentage: progress ? Math.round((progress.xpIntoLevel / progress.xpPerLevel) * 100) : 0,
            }));
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUserData();
    }, [loadUserData]);

    return {
        profileData,
        setProfileData,
        isLoading,
        error,
        reloadProfile: loadUserData,
    };
}

// Another user's profile. The header is seeded from navigation params (so it
// renders instantly) and then filled from GET /user/:userId, which works with
// only the id - e.g. when the profile is opened from a shared link.
export function useOtherUserProfile() {
    const params = useLocalSearchParams();
    const userId = (params.userId as string) || (params.id as string) || "";
    const firstName = (params.firstName as string) || "";
    const lastName = (params.lastName as string) || "";
    const username = (params.username as string) || "";
    const avatar = (params.avatar as string) || "";
    const role = (params.role as string) || "";

    const [profileData, setProfileData] = useState<ProfileData>({
        ...EMPTY_PROFILE,
        id: userId,
        _id: userId,
        firstName,
        lastName,
        username,
        profileImage: avatar || null,
        role,
    });
    const [isLoading, setIsLoading] = useState(!!userId);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!userId) {
            setIsLoading(false);
            return;
        }
        let active = true;
        setError("");
        (async () => {
            try {
                const user = await getPublicProfile(userId);
                if (active) {
                    setProfileData((prev) => ({
                        ...prev,
                        id: user._id || prev.id,
                        _id: user._id || prev._id,
                        firstName: user.firstName || prev.firstName,
                        lastName: user.lastName || prev.lastName,
                        username: user.username || prev.username,
                        profileImage: user.profileImage || prev.profileImage,
                        role: user.role || prev.role,
                        level: typeof user.level === "number" ? user.level : prev.level,
                        followersCount: user.followersCount,
                        followingCount: user.followingCount,
                        reelsCount: user.reelsCount,
                        isFollowing: user.isFollowedByMe,
                    }));
                }
            } catch (err) {
                // The seeded header (if any) is still shown.
                if (active) setError(getErrorMessage(err));
            } finally {
                if (active) setIsLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, [userId]);

    return { profileData, setProfileData, isLoading, error };
}
