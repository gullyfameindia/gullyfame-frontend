import { Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { registerDeviceToken } from "@api/services/userService";

const ASKED_KEY = "@gullyfame_notification_prompt_shown";

/**
 * The backend sends pushes through Firebase Admin, which needs the native
 * device token (FCM on Android, APNs on iOS), not an Expo push token.
 * Returns "" when permission is not granted or the native config is missing.
 *
 * Never shows the system permission dialog unless `prompt` is true. Sign-in
 * screens call this silently; the dialog is shown once, after sign-in, with
 * an explanation first (see askForNotificationsOnce).
 */
export async function getNativePushToken({ prompt = false }: { prompt?: boolean } = {}): Promise<string> {
  if (Platform.OS !== "android" && Platform.OS !== "ios") return "";
  try {
    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted && prompt && existing.canAskAgain) {
      granted = (await Notifications.requestPermissionsAsync()).granted;
    }
    if (!granted) return "";
    const token = await Notifications.getDevicePushTokenAsync();
    return typeof token.data === "string" ? token.data : "";
  } catch {
    return "";
  }
}

export const getDeviceType = (): "android" | "ios" | "" =>
  Platform.OS === "android" ? "android" : Platform.OS === "ios" ? "ios" : "";

/**
 * Saves the device token on the user profile (PUT /user/profile is the only
 * place the backend accepts it). Best-effort: never blocks the UI, and only
 * asks for permission when `prompt` is true.
 */
export async function registerPushTokenWithBackend({ prompt = false }: { prompt?: boolean } = {}): Promise<void> {
  const token = await getNativePushToken({ prompt });
  const platform = getDeviceType();
  if (!token || !platform) return;
  try {
    await registerDeviceToken(token, platform);
  } catch {
    // Push is optional; the in-app notification list still works.
  }
}

/**
 * Called once the user is signed in. If notifications are already allowed it
 * just registers the token. Otherwise, the first time only, it explains why
 * the app wants notifications and shows the system dialog if the user agrees.
 */
export async function askForNotificationsOnce(): Promise<void> {
  if (Platform.OS !== "android" && Platform.OS !== "ios") return;
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) {
      await registerPushTokenWithBackend();
      return;
    }
    if (!existing.canAskAgain) return;
    if (await AsyncStorage.getItem(ASKED_KEY)) return;
    await AsyncStorage.setItem(ASKED_KEY, "1");
  } catch {
    return;
  }

  Alert.alert(
    "Stay in the loop?",
    "Turn on notifications to hear when someone votes, comments, follows you or sends a message, and when a competition you entered has results. You can change this any time in Settings.",
    [
      { text: "Not now", style: "cancel" },
      { text: "Turn on", onPress: () => { registerPushTokenWithBackend({ prompt: true }); } },
    ]
  );
}
