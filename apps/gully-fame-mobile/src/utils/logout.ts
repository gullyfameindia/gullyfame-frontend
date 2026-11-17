import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { apiPost, removeAuthToken } from "@api/client";
import { socketChatService } from "@api/services/socketChatService";
import { store, resetStore } from "@/store";
import { SESSION_CACHE_KEYS } from "./userSession";
import { clearOwnProfileSnapshot } from "./ownProfileCache";
import { resetBlockedUsersCache } from "./moderation";

/**
 * Logout: POST /auth/logout first, so the server stops accepting this token
 * (and stops push notifications to this device), then drop the token, cached
 * profile, live socket and in-memory state. Offline or slow, the local logout
 * still happens after 3 s. `hasSeenOnboarding` is kept so returning users land
 * on sign-in.
 */
export const performLogout = async (): Promise<void> => {
  try {
    await Promise.race([
      apiPost("auth/logout", {}).catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
    socketChatService.disconnect();
    await removeAuthToken();
    clearOwnProfileSnapshot();
    await AsyncStorage.multiRemove([...SESSION_CACHE_KEYS, "termsAccepted"]);
    // After the stored list is gone, so a listener cannot reload the previous account's blocks.
    resetBlockedUsersCache();
    store.dispatch(resetStore());
  } finally {
    router.replace("/auth/signin");
  }
};
