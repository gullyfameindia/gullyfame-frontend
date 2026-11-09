import { useEffect,  useState } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { wp, hp } from "@/utils/responsive";
import { getAuthToken } from "@/api/client";

// Points directly to apps/gully-fame-mobile/assets/images/logo.png
const DEFAULT_LOGO = require("../../assets/images/logo.png");
const DEFAULT_BACKGROUND = "#3C2610";

export default function SplashScreen() {
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [scaleAnim] = useState(() => new Animated.Value(0.9));
  const [hasStartedAnimation, setHasStartedAnimation] = useState(false);

  useEffect(() => {
    if (!hasStartedAnimation) {
      setHasStartedAnimation(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [hasStartedAnimation, fadeAnim, scaleAnim]);

  useEffect(() => {
    let isMounted = true;

    const navigationTimer = setTimeout(async () => {
      try {
        if (!isMounted) return;

        // The SecureStore token is the only source of truth for "signed in".
        const token = await getAuthToken();
        const hasSeenOnboarding = await AsyncStorage.getItem("hasSeenOnboarding");

        if (!isMounted) return;


        if (token) {
          router.replace("/(main)/home");
        } else if (hasSeenOnboarding === "true") {
          router.replace("/auth/signin");
        } else {
          router.replace("/auth/onboarding1");
        }
      } catch {
        if (isMounted) {
          router.replace("/auth/onboarding1");
        }
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearTimeout(navigationTimer);
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: DEFAULT_BACKGROUND }]}>
      <Animated.Image
        source={DEFAULT_LOGO}
        style={[
          styles.logo,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#3C2610",
  },
  logo: {
    width: wp(70),
    height: hp(40),
    maxWidth: 300,
    maxHeight: 300,
  },
});