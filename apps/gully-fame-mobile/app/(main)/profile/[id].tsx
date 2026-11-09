import { useEffect, useRef } from "react";
import { safeIdParam } from "@/utils/routeParams";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, StatusBar } from "react-native";
import { getProfileRoute, DEFAULT_ROLE } from "@/components/profile/shared/profileTypes";
import { SkeletonLoader } from "@/components/Skeleton";

export default function ProfileRouter() {
  const params = useLocalSearchParams();
  const hasRouted = useRef(false);
  const profileIdRef = useRef<string>("");
  const lastRefreshRef = useRef<string>("");

  const profileId = safeIdParam(params.id) || safeIdParam(params.userId);
  const role = (params.role as string) || DEFAULT_ROLE;
  const firstName = (params.firstName as string) || "";
  const lastName = (params.lastName as string) || "";
  const bio = (params.bio as string) || "";
  const avatar = (params.avatar as string) || "";
  const username = (params.username as string) || "";
  const refresh = (params.refresh as string) || "";

  useEffect(() => {
    if (refresh && refresh !== lastRefreshRef.current) {
      hasRouted.current = false;
      profileIdRef.current = "";
      lastRefreshRef.current = refresh;
    }

    if (hasRouted.current) return;

    if (!profileId || profileId === profileIdRef.current) {
      return;
    }

    profileIdRef.current = profileId;

    const determineRoute = async () => {
      try {
        const currentUserId = await AsyncStorage.getItem("userId");

        const isViewingOther =
          profileId &&
          profileId !== "me" &&
          profileId !== "" &&
          profileId !== currentUserId;

        if (isViewingOther) {
          const userRole = role || DEFAULT_ROLE;
          const route = getProfileRoute(userRole, false);

          hasRouted.current = true;
          router.replace({
            pathname: route,
            params: {
              id: profileId,
              userId: profileId,
              firstName: firstName,
              lastName: lastName,
              role: userRole,
              bio: bio,
              avatar,
              username,
            },
          } as any);
        } else {
          const userRole =
            (await AsyncStorage.getItem("userRole")) || DEFAULT_ROLE;
          const route = getProfileRoute(userRole, true);

          hasRouted.current = true;
          router.replace(route as any);
        }
      } catch {
        try {
          const userRole =
            (await AsyncStorage.getItem("userRole")) || DEFAULT_ROLE;
          const fallbackRoute = getProfileRoute(userRole, true);
          hasRouted.current = true;
          router.replace(fallbackRoute as any);
        } catch { /* intentionally ignored */
        }
      }
    };

    determineRoute();
  }, [profileId, role, firstName, lastName, bio, avatar, username, refresh]);

  return (
    <View style={{ flex: 1, backgroundColor: "#3C2610" }}>
      <StatusBar barStyle="light-content" />
      <SkeletonLoader />
    </View>
  );
}
