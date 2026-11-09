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
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Path } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

export default function OnboardingFaceScan() {
  const params = useLocalSearchParams();
  const role = params.role ? String(params.role) : "participant";
  const firstName = params.firstName ? safeDecode(String(params.firstName)) : "";
  const lastName = params.lastName ? safeDecode(String(params.lastName)) : "";
  const email = params.email ? safeDecode(String(params.email)) : "";
  const dob = params.dob ? safeDecode(String(params.dob)) : "";
  const gender = params.gender ? safeDecode(String(params.gender)) : "";
  const categoriesParam = params.categories ? safeDecode(String(params.categories)) : "[]";
  const bio = params.bio ? safeDecode(String(params.bio)) : "";
  const profileImage = params.profileImage ? safeDecode(String(params.profileImage)) : "";
  const fromVerified = params.fromVerified === "true";
  const fromKycFlow = params.fromKycFlow === "true";

  const categories: string[] = (() => {
    try {
      return JSON.parse(categoriesParam);
    } catch {
      return [];
    }
  })();

  const scanComplete = false;

  // There is no face-verification service on the backend yet, so the scan
  // can't actually verify anything; the step is skippable.
  const handleScan = () => {
    Alert.alert("Not available yet", "Face verification isn't available yet. You can continue without it.", [
      { text: "Continue", onPress: () => handleFinish(true) },
    ]);
  };

  const handleFinish = async (force?: boolean) => {
    if (!scanComplete && !force) {
      Alert.alert("Almost there", "Tap 'Start face scan' to finish verification.");
      return;
    }

    try {
      
      if (fromKycFlow) {
        await AsyncStorage.removeItem('kycFlowActive');
        router.replace("/onboarding/all-done");
        return;
      }

      if (fromVerified) {
        const query = [
          `role=${encodeURIComponent(role)}`,
          `firstName=${encodeURIComponent(firstName)}`,
          `lastName=${encodeURIComponent(lastName)}`,
          `email=${encodeURIComponent(email)}`,
          `fromVerified=true`,
        ].join("&");
        router.replace(`/onboarding/verify-id?${query}` as any);
        return;
      }

      
      const backendRole = role === 'participant' ? 'participants' : (role === 'fan' ? 'fan' : 'participants');
      
      await AsyncStorage.multiSet([
        ["profileCompleted", "true"],
        ["userRole", backendRole],
        ["userFirstName", firstName],
        ["userLastName", lastName],
        ["userEmail", email],
        ["userDob", dob],
        ["userGender", gender],
        ["userCategories", JSON.stringify(categories)],
        ["userBio", bio],
        ["userProfileImage", profileImage || ""],
      ]);
      router.replace("/onboarding/all-done");
    } catch {
      Alert.alert("Save failed", "We couldn't finish onboarding. Please try again.");
    }
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
              Step <Text style={styles.headerEyebrowNumber}>5</Text> of <Text style={styles.headerEyebrowNumber}>5</Text>
            </Text>
            <Text style={styles.headerTitle}>Verify yourself</Text>
          </View>
        </View>

        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeSubtitle}>Hold steady for a quick scan. This future-proofs your profile for payouts, contests, and brand deals.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.scanFrame}>
            <View style={styles.scanCorners}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
            <Svg width={70} height={70} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4 0-7 2-7 5v1h14v-1c0-3-3-5-7-5z"
                fill="#EC9A15"
              />
            </Svg>
            <Text style={styles.scanPrompt}>{scanComplete ? "Scan captured" : "Center your face"}</Text>
          </View>

          <View style={styles.checklist}>
            {["Keep your face inside the frame", "Turn slowly left and right", "Smile or stay neutral — your call"].map((item) => (
              <View key={item} style={styles.checkRow}>
                <View style={styles.checkDot} />
                <Text style={styles.checkText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, scanComplete && styles.primaryButtonDone]}
          activeOpacity={0.9}
          onPress={scanComplete ? () => handleFinish() : handleScan}
        >
          <Text style={styles.primaryButtonText}>{scanComplete ? "Finish onboarding" : "Start face scan"}</Text>
        </TouchableOpacity>

        {!scanComplete && (
          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.75}
            onPress={() => handleFinish(true)}
          >
            {}
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
    borderRadius: 22,
    paddingVertical: 20,
    paddingLeft: 13,
    paddingRight: 10,
    marginTop: 5,
  },
  welcomeSubtitle: {
    color: "#CAD7D8",
    fontSize: 13.8,
    lineHeight: 20,
    letterSpacing: 0,
    fontFamily: "Rubik_400Regular",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    marginTop: 20,
  },
  scanFrame: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    paddingVertical: 36,
    position: "relative",
  },
  scanCorners: {
    position: "absolute",
    top: 16,
    bottom: 16,
    left: 16,
    right: 16,
  },
  corner: {
    position: "absolute",
    width: 20,
    height: 20,
    borderColor: "#EC9A15",
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderLeftWidth: 3,
    borderTopWidth: 3,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderRightWidth: 3,
    borderTopWidth: 3,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
  },
  scanPrompt: {
    color: "#000",
    fontSize: 15,
    marginTop: 16,
    fontFamily: "Rubik_500Medium",
  },
  checklist: {
    marginTop: 20,
    gap: 10,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EC9A15",
  },
  checkText: {
    color: "#000",
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
    fontFamily: "Rubik_400Regular",
    letterSpacing: 0,
  },
  primaryButton: {
    marginTop: 32,
    backgroundColor: "#EC9A15",
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonDone: {
    backgroundColor: "#22C55E",
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
