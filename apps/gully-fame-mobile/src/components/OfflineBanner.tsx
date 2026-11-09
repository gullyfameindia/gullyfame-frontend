import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Slim banner shown while the device has no connection. It does not block touches. When the
 * connection returns it disappears; screens that failed to load keep their own "Retry" button.
 */
export default function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // addEventListener returns the unsubscribe function.
    return NetInfo.addEventListener((state) => {
      setOffline(state.isConnected === false || state.isInternetReachable === false);
    });
  }, []);

  if (!offline) return null;

  return (
    <View
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.bar, { paddingTop: insets.top + 6 }]}
    >
      <Text style={styles.text}>You're offline. Check your internet connection.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 1000,
    backgroundColor: "#B3261E",
    paddingBottom: 6,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  text: { color: "#fff", fontSize: 13, fontWeight: "600" },
});
