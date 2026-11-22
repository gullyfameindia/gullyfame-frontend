import { useEffect, useState } from "react";
import { AppState } from "react-native";
// From expo-router, not @react-navigation/native: that copy has no navigator context here.
import { useIsFocused } from "expo-router";

/**
 * True while the current screen is focused and the app is in the foreground.
 * Use it to pause timers/animations on tabs that stay mounted in the background.
 */
export function useScreenActive(): boolean {
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState === "active");

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      setForeground(state === "active");
    });
    return () => sub.remove();
  }, []);

  return focused && foreground;
}
