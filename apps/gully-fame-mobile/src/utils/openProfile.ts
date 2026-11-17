import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_ROLE, getProfileRoute } from "@/components/profile/shared/profileTypes";

/**
 * Opens the signed-in user's own profile screen directly. Going through profile/[id]
 * showed a spinner screen and then navigated a second time.
 */
export async function openOwnProfile(options: { replace?: boolean } = {}) {
  let role: string | null = null;
  try {
    role = await AsyncStorage.getItem("userRole");
  } catch {
    // Fall back to the default role's screen; it redirects if the role differs.
  }
  const route = getProfileRoute(role || DEFAULT_ROLE, true);
  if (options.replace) router.replace(route as any);
  else router.push(route as any);
}

/**
 * Opens a user's profile. Whatever the caller already knows about the user
 * (from a reel, search result or leaderboard row) travels with the navigation
 * so the header shows at once; the profile screen then loads the rest from
 * GET /user/:userId.
 */
export function openUserProfile(user: {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  username?: string;
  avatar?: string;
  role?: string;
}) {
  if (!user.id) return;
  let firstName = user.firstName || "";
  let lastName = user.lastName || "";
  if (!firstName && !lastName && user.name) {
    const [first, ...rest] = user.name.trim().split(/\s+/);
    firstName = first || "";
    lastName = rest.join(" ");
  }
  const openOther = () =>
    router.push({
      pathname: "/(main)/profile/[id]",
      params: {
        id: user.id,
        userId: user.id,
        firstName,
        lastName,
        username: user.username || "",
        avatar: user.avatar || "",
        role: user.role || "",
      },
    } as any);
  // Tapping your own name or avatar opens your profile directly.
  AsyncStorage.getItem("userId")
    .then((myId) => (myId && myId === user.id ? openOwnProfile() : openOther()))
    .catch(openOther);
}
