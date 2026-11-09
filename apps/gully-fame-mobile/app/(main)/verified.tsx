import { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform } from "react-native";
import { router } from "expo-router";
import { getMyKyc } from "@/api/services/kycService";
import { useFocusEffect } from "expo-router/react-navigation";
import { Circle } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useOwnProfile } from "@/components/profile/shared/profileHooks";
import {
  BackIcon,
  CheckIcon,
  VerifiedBadgeIcon as VerifiedBadge,
} from "@/icons";

export default function VerifiedScreen() {
  const { profileData } = useOwnProfile();
  const [verificationStatus, setVerificationStatus] = useState({
    isVerified: false,
    hasBio: false,
    hasImage: false,
    hasFaceScan: false,
    hasDob: false,
    hasGender: false,
  });

  // Avoid setting state after the screen is gone, and ignore a slow earlier
  // check finishing after a newer one.
  const isMounted = useRef(true);
  const latestCheck = useRef(0);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const checkVerificationStatus = useCallback(async () => {
    const checkId = ++latestCheck.current;
    try {
      const bio = profileData?.bio || "";
      const profileImage = profileData?.profileImage || "";
      const faceScanDone = await AsyncStorage.getItem("faceScanDone");
      const dob = (await AsyncStorage.getItem("userDateOfBirth")) || "";
      const gender = (await AsyncStorage.getItem("userGender")) || "";

      const hasBio = bio.trim().length > 0;
      const hasImage = profileImage.length > 0;
      const hasFaceScan = faceScanDone === "true";
      const hasDob = dob.trim().length > 0;
      const hasGender = gender.trim().length > 0;

      // "Verified" means an admin approved the KYC document on the backend.
      const kyc = await getMyKyc().catch(() => null);
      if (!isMounted.current || checkId !== latestCheck.current) return;
      setVerificationStatus({
        isVerified: kyc?.status === "APPROVED",
        hasBio,
        hasImage,
        hasFaceScan,
        hasDob,
        hasGender,
      });
    } catch { /* intentionally ignored */
    }
  }, [profileData]);

  // Runs on focus and whenever the profile changes (the callback identity changes with it).
  useFocusEffect(
    useCallback(() => {
      checkVerificationStatus();
    }, [checkVerificationStatus]),
  );

  const handleCompleteStep = async (step: string) => {
    const role = (await AsyncStorage.getItem("userRole")) || "participant";
    const firstName = profileData?.firstName || "";
    const lastName = profileData?.lastName || "";
    const email = profileData?.email || "";

    switch (step) {
      case "bio":
        router.push("/(main)/account-center?fromVerified=true" as any);
        break;
      case "image":
        router.push("/(main)/account-center?fromVerified=true" as any);
        break;
      case "dob":
      case "gender": {
        
        const query = [
          `role=${encodeURIComponent(role)}`,
          `firstName=${encodeURIComponent(firstName)}`,
          `lastName=${encodeURIComponent(lastName)}`,
          `email=${encodeURIComponent(email)}`,
          `fromVerified=true`, 
        ].join("&");
        router.push(`/onboarding/personal-details?${query}` as any);
        break;
      }
      case "faceScan": {
        
        const faceScanQuery = [
          `role=${encodeURIComponent(role)}`,
          `firstName=${encodeURIComponent(firstName)}`,
          `lastName=${encodeURIComponent(lastName)}`,
          `email=${encodeURIComponent(email)}`,
          `fromVerified=true`, 
        ].join("&");
        router.push(`/onboarding/face-scan?${faceScanQuery}` as any);
        break;
      }
    }
  };

  const handleVerifyNow = () => {
    router.push("/(main)/settings/kyc-status" as any);
  };

  const { isVerified, hasBio, hasImage, hasFaceScan, hasDob, hasGender } =
    verificationStatus;
  const allStepsComplete =
    hasBio && hasImage && hasFaceScan && hasDob && hasGender;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2610" />

      {}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verified</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isVerified && allStepsComplete ? (
          
          <View style={styles.verifiedContainer}>
            <VerifiedBadge size={100} />
            <Text style={styles.verifiedTitle}>You're Verified! ✅</Text>
            <Text style={styles.verifiedSubtitle}>
              Congratulations! Your account is fully verified. You have access
              to all features.
            </Text>

            <View style={styles.statusCard}>
              <View style={styles.statusItem}>
                <CheckIcon color="#EC9A15" />
                <Text style={styles.statusText}>Date of Birth</Text>
              </View>
              <View style={styles.statusItem}>
                <CheckIcon color="#EC9A15" />
                <Text style={styles.statusText}>Gender</Text>
              </View>
              <View style={styles.statusItem}>
                <CheckIcon color="#EC9A15" />
                <Text style={styles.statusText}>Profile Bio</Text>
              </View>
              <View style={styles.statusItem}>
                <CheckIcon color="#EC9A15" />
                <Text style={styles.statusText}>Profile Image</Text>
              </View>
              <View style={styles.statusItem}>
                <CheckIcon color="#EC9A15" />
                <Text style={styles.statusText}>Face Recognition</Text>
              </View>
            </View>
          </View>
        ) : (
          // Not Verified State
          <View style={styles.notVerifiedContainer}>
            <Text style={styles.notVerifiedTitle}>Complete Verification</Text>

            <View style={styles.stepsContainer}>
              <TouchableOpacity
                style={[styles.stepCard, hasDob && styles.stepCardComplete]}
                onPress={() => !hasDob && handleCompleteStep("dob")}
                disabled={hasDob}
              >
                <View style={styles.stepHeader}>
                  {hasDob ? (
                    <CheckIcon color="#EC9A15" />
                  ) : (
                    <Circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="#999"
                      strokeWidth={2}
                    />
                  )}
                  <Text
                    style={[
                      styles.stepTitle,
                      hasDob && styles.stepTitleComplete,
                    ]}
                  >
                    Date of Birth
                  </Text>
                </View>
                <Text style={styles.stepDescription}>
                  {hasDob ? "Date of birth added" : "Add your date of birth"}
                </Text>
                {!hasDob && <Text style={styles.stepAction}>Tap to add →</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.stepCard, hasGender && styles.stepCardComplete]}
                onPress={() => !hasGender && handleCompleteStep("gender")}
                disabled={hasGender}
              >
                <View style={styles.stepHeader}>
                  {hasGender ? (
                    <CheckIcon color="#EC9A15" />
                  ) : (
                    <Circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="#999"
                      strokeWidth={2}
                    />
                  )}
                  <Text
                    style={[
                      styles.stepTitle,
                      hasGender && styles.stepTitleComplete,
                    ]}
                  >
                    Gender
                  </Text>
                </View>
                <Text style={styles.stepDescription}>
                  {hasGender ? "Gender selected" : "Select your gender"}
                </Text>
                {!hasGender && (
                  <Text style={styles.stepAction}>Tap to select →</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.stepCard, hasBio && styles.stepCardComplete]}
                onPress={() => !hasBio && handleCompleteStep("bio")}
                disabled={hasBio}
              >
                <View style={styles.stepHeader}>
                  {hasBio ? (
                    <CheckIcon color="#EC9A15" />
                  ) : (
                    <Circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="#999"
                      strokeWidth={2}
                    />
                  )}
                  <Text
                    style={[
                      styles.stepTitle,
                      hasBio && styles.stepTitleComplete,
                    ]}
                  >
                    Add Profile Bio
                  </Text>
                </View>
                <Text style={styles.stepDescription}>
                  {hasBio
                    ? "Bio added successfully"
                    : "Add a bio to your profile"}
                </Text>
                {!hasBio && <Text style={styles.stepAction}>Tap to add →</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.stepCard, hasImage && styles.stepCardComplete]}
                onPress={() => !hasImage && handleCompleteStep("image")}
                disabled={hasImage}
              >
                <View style={styles.stepHeader}>
                  {hasImage ? (
                    <CheckIcon color="#EC9A15" />
                  ) : (
                    <Circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="#999"
                      strokeWidth={2}
                    />
                  )}
                  <Text
                    style={[
                      styles.stepTitle,
                      hasImage && styles.stepTitleComplete,
                    ]}
                  >
                    Upload Profile Image
                  </Text>
                </View>
                <Text style={styles.stepDescription}>
                  {hasImage
                    ? "Profile image uploaded"
                    : "Upload a profile picture"}
                </Text>
                {!hasImage && (
                  <Text style={styles.stepAction}>Tap to upload →</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.stepCard,
                  hasFaceScan && styles.stepCardComplete,
                ]}
                onPress={() => !hasFaceScan && handleCompleteStep("faceScan")}
                disabled={hasFaceScan}
              >
                <View style={styles.stepHeader}>
                  {hasFaceScan ? (
                    <CheckIcon color="#EC9A15" />
                  ) : (
                    <Circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="#999"
                      strokeWidth={2}
                    />
                  )}
                  <Text
                    style={[
                      styles.stepTitle,
                      hasFaceScan && styles.stepTitleComplete,
                    ]}
                  >
                    Face Recognition
                  </Text>
                </View>
                <Text style={styles.stepDescription}>
                  {hasFaceScan
                    ? "Face recognition completed"
                    : "Complete face recognition scan"}
                </Text>
                {!hasFaceScan && (
                  <Text style={styles.stepAction}>Tap to start →</Text>
                )}
              </TouchableOpacity>
            </View>

            {hasDob &&
              hasGender &&
              hasBio &&
              hasImage &&
              hasFaceScan &&
              !isVerified && (
                <TouchableOpacity
                  style={styles.verifyButton}
                  onPress={handleVerifyNow}
                  activeOpacity={0.8}
                >
                  <Text style={styles.verifyButtonText}>Verify Now</Text>
                </TouchableOpacity>
              )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3C2610",
    paddingTop: Platform.OS === "android" ? 20 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  verifiedContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  verifiedTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 12,
  },
  verifiedSubtitle: {
    color: "#999",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  statusCard: {
    backgroundColor: "#252525",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    borderWidth: 1,
    borderColor: "#333",
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 16,
  },
  notVerifiedContainer: {
    alignItems: "center",
    width: "100%",
  },
  notVerifiedTitle: {
    color: "#EC9A15",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  stepsContainer: {
    width: "100%",
    gap: 10,
  },
  stepCard: {
    backgroundColor: "#252525",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#333",
  },
  stepCardComplete: {
    borderColor: "#EC9A15",
    backgroundColor: "rgba(236, 154, 21, 0.1)",
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 10,
  },
  stepTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  stepTitleComplete: {
    color: "#EC9A15",
  },
  stepDescription: {
    color: "#999",
    fontSize: 13,
    marginBottom: 4,
  },
  stepAction: {
    color: "#EC9A15",
    fontSize: 12,
    fontWeight: "500",
  },
  verifyButton: {
    backgroundColor: "#EC9A15",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 20,
    alignItems: "center",
  },
  verifyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
