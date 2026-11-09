import React from "react";
import { safeDecode } from "@/utils/routeParams";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  StatusBar,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { openOwnProfile } from "@/utils/openProfile";
import Svg, { Path } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

export default function OnboardingVerifyId() {
  const params = useLocalSearchParams();
  const role = params.role ? String(params.role) : "participant";
  const firstName = params.firstName ? safeDecode(String(params.firstName)) : "Creator";
  const lastName = params.lastName ? safeDecode(String(params.lastName)) : "";
  const email = params.email ? safeDecode(String(params.email)) : "";
  const fromVerified = params.fromVerified === "true";
  const fromKycFlow = params.fromKycFlow === "true";

  const friendlyName = `${firstName}${lastName ? ` ${lastName}` : ""}`;

  const handleBegin = async () => {
    if (fromVerified) {
      
      
      await AsyncStorage.setItem("faceScanDone", "true");
      
      await openOwnProfile({ replace: true });
      return;
    }
    
    
    if (fromKycFlow) {
      const { navigateToNextKycStep } = await import("@utils/kycValidation");
      await navigateToNextKycStep('personalDetails');
      return;
    }
    
    const query = [
      `role=${encodeURIComponent(role)}`,
      `firstName=${encodeURIComponent(firstName)}`,
      `lastName=${encodeURIComponent(lastName)}`,
      `email=${encodeURIComponent(email)}`,
    ].join("&");
    router.push(`/onboarding/personal-details?${query}` as any);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2610" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
            <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
              <Path
                d="M16 7H3.83L9.42 1.41L8 0L0 8L8 16L9.41 14.59L3.83 9H16V7Z"
                fill="#EC9A15"
              />
            </Svg>
          </TouchableOpacity>

          <View style={styles.headerTextBlock}>
            <Text style={styles.headerEyebrow}>
              Step <Text style={styles.headerEyebrowNumber}>1</Text> of <Text style={styles.headerEyebrowNumber}>5</Text>
            </Text>
            <Text style={styles.headerTitle}>Verify your identity</Text>
          </View>
        </View>

        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Hey {friendlyName} 👋</Text>
          <Text style={styles.welcomeSubtitle}>Before we open the stage, we'll do a lightning-fast face check to keep things fair.</Text>
        </View>

        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>How to breeze through it</Text>
          {["Stand in good lighting — avoid harsh shadows.", "Hold the phone at eye level and look straight ahead.", "Follow the slow head-turn prompts shown on screen."].map((step, index) => (
            <View key={step} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepDescription}>{step}</Text>
            </View>
          ))}
        </View>

        <View style={styles.highlightCard}>
          <Text style={styles.highlightTitle}>Why it matters</Text>
          <Text style={styles.highlightText}>
            Verified performers get priority slots, brand collaborations, and extra trust from fans. Your scan is encrypted and never shared.
          </Text>
        </View>

        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.9} onPress={handleBegin}>
          <Text style={styles.primaryButtonText}>Begin verification</Text>
        </TouchableOpacity>

        {!fromVerified && (
          <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.75} onPress={() => router.push("/(main)") }>
            <Text style={styles.secondaryButtonText}>Skip for now (limited access)</Text>
          </TouchableOpacity>
        )}
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
    paddingTop: Platform.OS === "android" ? 50 : 60,
    paddingBottom: 48,
    paddingHorizontal: width * 0.06,
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
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
  headerEyebrow: {
    color: "#C8C8C8",
    fontSize: 14,
    letterSpacing: 0,
    textTransform: "uppercase",
    marginBottom: 1,
    fontFamily: "Inter_500Medium",
  },
  headerEyebrowNumber: {
    fontFamily: "Inter_500Medium",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 25,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  welcomeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical:20,
    paddingLeft:20,
    paddingRight:10,
    marginTop: 28,
  },
  welcomeTitle: {
    fontSize: 20,
    letterSpacing:0,
    color: "#000",
    marginBottom: 10,
    fontFamily: "Rubik_500Medium",
  },
  welcomeSubtitle: {
    color: "#000",
    fontSize: 13.8,
    lineHeight: 20,
    letterSpacing:0,
    fontFamily: "Rubik_400Regular",
  },
  instructionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    marginTop: 24,
  },
  instructionsTitle: {
    fontSize: 18,
    color: "#000",
    marginBottom: 20,
    letterSpacing:0,
    fontFamily: "Rubik_500Medium",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: 25,
    backgroundColor: "rgb(254, 237, 187)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stepBadgeText: {
    color: "#EC9A15",
    fontFamily: "Rubik_500Medium",
  },
  stepDescription: {
    color: "#000",
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Rubik_400Regular",
    letterSpacing:0,
  },
  highlightCard: {
    backgroundColor: "#55402D",
    borderRadius: 22,
    padding: 22,
    marginTop: 24,
  },
  highlightTitle: {
    color: "#CAD7D8",
    fontSize: 18,
    marginBottom: 5,
    fontFamily: "Rubik_500Medium",
  },
  highlightText: {
    color: "#CAD7D8",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Rubik_400Regular",
  },
  primaryButton: {
    marginTop: 32,
    backgroundColor: "#EC9A15",
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Rubik_700Bold",
  },
  secondaryButton: {
    alignSelf: "center",
    marginTop: 15,
  },
  secondaryButtonText: {
    color: "#CAD7D8",
    textDecorationLine: "underline",
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
  },
});

