import { useEffect,  useState } from "react";
import {
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  View,
  SafeAreaView,
  Dimensions,
  Animated,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@components/themed-text";
import { ThemedView } from "@components/themed-view";
import Svg, { Path } from "react-native-svg";
import { useBranding } from "@contexts/BrandingContext";

const { width, height } = Dimensions.get("window");


const DEFAULT_ONBOARDING3 = require("@assets/images/onboarding3.webp");

export default function Onboarding3() {
  const { splashImages } = useBranding();
  
  const backgroundImage = splashImages[2] ? { uri: splashImages[2] } : DEFAULT_ONBOARDING3;
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(50));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground
        source={backgroundImage}
        style={styles.fullScreen}
        resizeMode="cover"
      >
        <ThemedView style={styles.overlay} />
        <View style={styles.container}>
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <ThemedText style={styles.title}>
              Get love from your hood.
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Build your fanbase, join street challenges, and vibe with others
              who share your energy.
            </ThemedText>
          </Animated.View>

          <Animated.View
            style={[
              styles.footer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <TouchableOpacity
              onPress={async () => {
                await AsyncStorage.setItem("hasSeenOnboarding", "true");
                router.replace("/(main)/home" as any);
              }}
              style={styles.skipButton}
            >
              <ThemedText style={styles.skip}>Skip</ThemedText>
            </TouchableOpacity>

            <View style={styles.dots}>
              <View style={styles.dot} />
              <View style={styles.dot} />
              <View style={[styles.dot, styles.activeDot]} />
              <View style={styles.dot} />
            </View>

            <TouchableOpacity
              onPress={() => router.push("/auth/onboarding4")}
              style={styles.nextButton}
            >
              <Svg width={15} height={15} viewBox="0 0 8 12" fill="none">
                <Path
                  d="M0 10.59L4.58 6L0 1.41L1.41 0L7.41 6L1.41 12L0 10.59Z"
                  fill="black"
                />
              </Svg>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "black",
  },
  fullScreen: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    zIndex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: width * 0.06,
    paddingVertical: height * 0.08,
    paddingBottom: height * 0.15,
    zIndex: 2,
  },
  content: {
    flex: 1,
    justifyContent: "flex-end",
    width: "90%",
    maxWidth: width * 0.90,
    paddingHorizontal: width * 0.07,
    paddingBottom: height * 0.04,
  },
  title: {
    fontSize: width * 0.11,
    fontWeight: "bold",
    color: "white",
    lineHeight: height * 0.05,
    marginBottom: height * 0.03,
    fontFamily: "Rubik_700Bold",
  },
  subtitle: {
    fontSize: width * 0.04,
    color: "white",
    lineHeight: height * 0.03,
    fontFamily: "Rubik_400Regular",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: width * 0.045,
    marginBottom: height * -0.09,
    width: "100%",
    marginLeft:width * 0.05,
  },
  skip: { color: "white", fontSize: width * 0.035, fontWeight: "400", fontFamily: "Rubik_400Regular" },
  skipButton: {
    paddingVertical: 8,
  },
  dots: { flexDirection: "row" },
  dot: {
    width: width * 0.075,
    height: height * 0.004,
    borderRadius: width * 0.0125,
    backgroundColor: "rgba(255,255,255,0.4)",
    marginHorizontal: width * 0.0125,
    right: width * 0.075,
  },
  activeDot: { backgroundColor: "white" },
  nextButton: {
    width: width * 0.1125,
    height: width * 0.1125,
    borderRadius: width * 0.05625,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    right: width * 0.125,
  },
});
