import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { apiPost, removeAuthToken, getAuthToken, getRefreshToken } from "@api/client";
import { socketChatService } from "@api/services/socketChatService";
import { store, resetStore } from "@/store";
import { SESSION_CACHE_KEYS } from "./userSession";
import { clearOwnProfileSnapshot } from "./ownProfileCache";
import { resetBlockedUsersCache } from "./moderation";

/**
 * Logout: go to the sign-in screen at once, then clean up behind it. POST /auth/logout is sent
 * with the current token (read before it is removed) so the server stops accepting it and stops
 * push notifications to this device; the screen never waits for that answer. The token, cached
 * profile, live socket and in-memory state are dropped right after. `hasSeenOnboarding` is kept
 * so returning users land on sign-in.
 */
export const performLogout = async ({ skipServer = false }: { skipServer?: boolean } = {}): Promise<void> => {
  // Show the sign-in screen first, before any storage read or network call.
  router.replace("/auth/signin");

  try {
    // Read what the server call needs while the session still exists (nothing is removed yet).
    const [token, refreshToken] = skipServer ? [null, null] : await Promise.all([getAuthToken(), getRefreshToken()]);
    // skipServer: the account was just deleted, its tokens are already dead on the server.
    if (!skipServer && token) {
      apiPost(
        "auth/logout",
        refreshToken ? { refreshToken } : {},
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(() => undefined);
    }
    socketChatService.disconnect();
    await removeAuthToken();
    clearOwnProfileSnapshot();
    await AsyncStorage.multiRemove([...SESSION_CACHE_KEYS, "termsAccepted"]);
    // After the stored list is gone, so a listener cannot reload the previous account's blocks.
    resetBlockedUsersCache();
    store.dispatch(resetStore());
  } catch {
    // The user is already on the sign-in screen; a cleanup error must not bring them back.
  }
};
