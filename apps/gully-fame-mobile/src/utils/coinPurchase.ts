import { Alert } from "react-native";
import { router } from "expo-router";
import { COIN_PURCHASE_ENABLED } from "@/config/features";

export const COINS_COMING_SOON_TITLE = "Coming soon";
export const COINS_COMING_SOON_MESSAGE =
  "Buying GFI coins is coming soon. For now, earn coins by winning competitions and inviting friends.";

/** Shows the "coming soon" note used while coin buying is switched off. */
export const showCoinsComingSoon = () => Alert.alert(COINS_COMING_SOON_TITLE, COINS_COMING_SOON_MESSAGE);

/**
 * Used by every "Add coins" button. Opens the Add Money screen when coin
 * buying is on, otherwise shows the "coming soon" note.
 */
export const openAddCoins = (params?: Record<string, string>) => {
  if (!COIN_PURCHASE_ENABLED) {
    showCoinsComingSoon();
    return;
  }
  router.push((params ? { pathname: "/(main)/add-money", params } : "/(main)/add-money") as any);
};
