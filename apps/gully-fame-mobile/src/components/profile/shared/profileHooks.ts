// Shared hooks for profile screens.
import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams } from "expo-router";
import { getProfile, getProgress } from "@api/services/userService";
import { getMyKyc } from "@api/services/kycService";
import { searchUsersPage } from "@api/services/searchService";
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
    const [isLoading, setIsLoading] = useState(() => !getOwnProfileSnapshot());
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
            setIsLoading(false);
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
                getProgress().catch(() => null),
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

// Another user's profile. The backend has no "get user by id" endpoint, so the
// header is seeded from navigation params and enriched from user search
// (follower count and follow state) when a name or username is known.
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

    useEffect(() => {
        if (!userId) {
            setIsLoading(false);
            return;
        }
        const query = (username || `${firstName} ${lastName}`).replace(/^@/, "").trim();
        if (!query) {
            setIsLoading(false);
            return;
        }
        let active = true;
        (async () => {
            try {
                const page = await searchUsersPage(query, 1, 30);
                const match = page.results.find((u) => u._id === userId);
                if (active && match) {
                    setProfileData((prev) => ({
                        ...prev,
                        firstName: match.first_name || prev.firstName,
                        lastName: match.last_name || prev.lastName,
                        username: match.username || prev.username,
                        profileImage: match.profile_picture_url || prev.profileImage,
                        followersCount: match.followers_count,
                        isFollowing: match.is_followed_by_me,
                    }));
                }
            } catch {
                // The seeded header is still shown.
            } finally {
                if (active) setIsLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, [userId, username, firstName, lastName]);

    return { profileData, setProfileData, isLoading };
}
