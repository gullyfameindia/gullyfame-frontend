import { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, StatusBar, Image } from "react-native";
import { safeBack } from "@/utils/safeBack";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Path } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

export default function OnboardingAllDone() {
  const params = useLocalSearchParams();
  const fromKycFlow = params.fromKycFlow === "true";

  useEffect(() => {
    
    if (fromKycFlow) {
      const timer = setTimeout(async () => {
        await AsyncStorage.removeItem('kycFlowActive');
        const { navigateToNextKycStep } = await import("@utils/kycValidation");
        await navigateToNextKycStep('allDone');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [fromKycFlow]);

  const handleExplore = async () => {
    if (fromKycFlow) {
      
      await AsyncStorage.removeItem('kycFlowActive');
      const { navigateToNextKycStep } = await import("@utils/kycValidation");
      await navigateToNextKycStep('allDone');
    } else {
      
      router.replace("/auth/signin");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2610" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => safeBack()} style={styles.headerBackButton}>
            <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
              <Path
                d="M16 7H3.83L9.42 1.41L8 0L0 8L8 16L9.41 14.59L3.83 9H16V7Z"
                fill="#EC9A15"
              />
            </Svg>
          </TouchableOpacity>

          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>All done!</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Image
              source={require("@assets/images/all_done.gif")}
              style={styles.successImage}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.mainTitle}>You're all set</Text>
          <Text style={styles.subtitle}>Your profile is ready. Find a competition to enter or start watching.</Text>

          <TouchableOpacity style={styles.exploreButton} onPress={handleExplore} activeOpacity={0.85}>
            <Text style={styles.exploreButtonText}>Go to home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3C2610",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 60,
    paddingHorizontal: width * 0.06,
  },
  headerBackButton: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextBlock: {
    flex: 1,
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 25,
    color: "#FFFFFF",
    fontFamily: "PlayfairDisplay_700Bold",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  iconContainer: {
    marginBottom: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  successImage: {
    width: 120,
    height: 160,
  },
  mainTitle: {
    fontSize: 32,
    color: "#FFFFFF",
    fontFamily: "PlayfairDisplay_700Bold",
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: "#C8C8C8",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 40,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  exploreButton: {
    backgroundColor: "#EC9A15",
    borderRadius: 12,
    height: 48,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  exploreButtonText: {
    fontSize: 18,
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },
});

