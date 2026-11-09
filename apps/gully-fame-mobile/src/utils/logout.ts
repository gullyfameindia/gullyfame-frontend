import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { removeAuthToken } from "@api/client";
import { socketChatService } from "@api/services/socketChatService";
import { store, resetStore } from "@/store";
import { SESSION_CACHE_KEYS } from "./userSession";
import { clearOwnProfileSnapshot } from "./ownProfileCache";
import { resetBlockedUsersCache } from "./moderation";

/**
 * Logout is local-only: the backend has no logout endpoint and its JWTs never
 * expire, so we drop the token, cached profile, live socket and in-memory state.
 * `hasSeenOnboarding` is kept so returning users land on sign-in.
 */
export const performLogout = async (): Promise<void> => {
  try {
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
