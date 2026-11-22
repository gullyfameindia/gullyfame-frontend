import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform, Image, Alert } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { safeBack } from "@/utils/safeBack";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { getMyKyc, submitKyc, KYC_DOC_TYPES, KycDocType, KycRecord } from "@/api/services/kycService";
import { getErrorMessage } from "@/api/client";
import { toastSuccess } from "@/components/ui/Toast";
import ComingSoonPopup from "@/components/ui/ComingSoonPopup";
import { SelfieCaptureModal } from "@/components/kyc/SelfieCaptureModal";
import { validatePickedAsset } from "@/utils/fileValidation";
import { showPermissionSettingsAlert } from "@/utils/permissionSettings";
import { SkeletonCards } from "@/components/Skeleton/Skeleton";

// Same brown + orange palette as the rest of the app.
const C = {
  bg: "#3C2610",
  card: "#1A1A1A",
  inner: "#252525",
  border: "#2A2A2A",
  accent: "#EC9A15",
  accentSoft: "rgba(236, 154, 21, 0.15)",
  success: "#25D366",
  successSoft: "rgba(37, 211, 102, 0.15)",
  danger: "#FF5A4E",
  dangerSoft: "rgba(255, 90, 78, 0.15)",
  text: "#FFFFFF",
  muted: "#CAD7D8",
  faint: "#8A8F90",
};

type Status = "unverified" | "pending" | "verified" | "rejected";

export default function KYCStatusScreen() {
  const [kyc, setKyc] = useState<KycRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [docType, setDocType] = useState<KycDocType>("aadhaar");
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [whyVisible, setWhyVisible] = useState(false);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [selfieVisible, setSelfieVisible] = useState(false);

  const status: Status = !kyc
    ? "unverified"
    : kyc.status === "APPROVED"
      ? "verified"
      : kyc.status === "REJECTED"
        ? "rejected"
        : "pending";

  const canSubmit = status === "unverified" || status === "rejected";

  // Step 1: send a document. Step 2: review. Step 3: verified.
  const currentStep = status === "verified" ? 3 : status === "pending" ? 2 : 1;

  const loadKyc = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setKyc(await getMyKyc());
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadKyc();
    }, [loadKyc])
  );

  const pickImage = async (side: "front" | "back") => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      if (!permission.canAskAgain) showPermissionSettingsAlert("Photo library access");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const invalid = validatePickedAsset(result.assets[0], ["image"]);
    if (invalid) {
      Alert.alert("Can't use this file", invalid);
      return;
    }
    if (side === "front") setFrontImage(result.assets[0].uri);
    else setBackImage(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!frontImage) {
      Alert.alert("Front image required", "Add a clear photo of the front of your document.");
      return;
    }
    if (!selfieImage) {
      Alert.alert("Selfie required", "Take a selfie in step 2 so we can match it with your ID.");
      return;
    }
    setSubmitting(true);
    setProgress(0);
    try {
      const record = await submitKyc({
        docType,
        frontImageUri: frontImage,
        backImageUri: backImage,
        selfieImageUri: selfieImage,
        onProgress: setProgress,
      });
      setKyc(record);
      setShowForm(false);
      setFrontImage(null);
      setBackImage(null);
      setSelfieImage(null);
      toastSuccess("KYC submitted for review");
    } catch (error) {
      Alert.alert("Submission failed", getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  // Document upload form, opened from the ID card.
  const renderForm = () => (
    <View style={styles.formCard}>
      <Text style={styles.formLabel}>Document type</Text>
      <View style={styles.chipRow}>
        {KYC_DOC_TYPES.map((item) => {
          const active = docType === item.value;
          return (
            <TouchableOpacity
              key={item.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setDocType(item.value)}
              disabled={submitting}
              accessibilityRole="button"
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.imageRow}>
        {(["front", "back"] as const).map((side) => {
          const uri = side === "front" ? frontImage : backImage;
          return (
            <TouchableOpacity
              key={side}
              style={styles.imagePicker}
              onPress={() => pickImage(side)}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel={side === "front" ? "Add front of document" : "Add back of document"}
            >
              {uri ? (
                <Image source={{ uri }} style={styles.imagePreview} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={26} color={C.accent} />
                  <Text style={styles.imagePickerText}>{side === "front" ? "Front side *" : "Back side (optional)"}</Text>
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

    </View>
  );

  // Status message shown above the steps.
  const renderStatus = () => {
    if (status === "pending") {
      return (
        <View style={[styles.statusBox, { backgroundColor: C.accentSoft, borderColor: C.accent }]}>
          <Ionicons name="time-outline" size={22} color={C.accent} />
          <View style={styles.statusText}>
            <Text style={styles.statusTitle}>Verification pending</Text>
            <Text style={styles.statusDesc}>
              Your documents are under review.
              {kyc?.submittedAt ? ` Submitted ${new Date(kyc.submittedAt).toLocaleDateString("en-IN")}.` : ""}
            </Text>
          </View>
        </View>
      );
    }
    if (status === "verified") {
      return (
        <View style={[styles.statusBox, { backgroundColor: C.successSoft, borderColor: C.success }]}>
          <Ionicons name="shield-checkmark-outline" size={22} color={C.success} />
          <View style={styles.statusText}>
            <Text style={styles.statusTitle}>Fully verified</Text>
            <Text style={styles.statusDesc}>Your account is verified.</Text>
          </View>
        </View>
      );
    }
    if (status === "rejected") {
      return (
        <View style={[styles.statusBox, { backgroundColor: C.dangerSoft, borderColor: C.danger }]}>
          <Ionicons name="alert-circle-outline" size={22} color={C.danger} />
          <View style={styles.statusText}>
            <Text style={styles.statusTitle}>Verification failed</Text>
            <Text style={styles.statusDesc}>{kyc?.reason || "Your document was rejected. Please submit it again."}</Text>
          </View>
        </View>
      );
    }
    return null;
  };

  const idCardDesc =
    status === "verified"
      ? "Document verified"
      : status === "pending"
        ? "Document under review"
        : status === "rejected"
          ? "Rejected. Tap to submit again"
          : "Tap to scan or upload your ID or passport";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => safeBack("/(main)/home")} style={styles.headerSide}>
          <Ionicons name="chevron-back" size={28} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>KYC Verification</Text>
        <Text style={styles.stepLabel}>Step {currentStep} of 3</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <Text style={styles.heroTitle}>Verify your identity</Text>
        <Text style={styles.heroSub}>
          Complete identity verification to secure your account and unlock all features.
        </Text>

        {loading ? (
          <SkeletonCards count={2} height={80} style={{ marginVertical: 16 }} />
        ) : loadError ? (
          <TouchableOpacity onPress={loadKyc} style={styles.errorBox}>
            <Text style={styles.errorText}>{loadError}</Text>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        ) : (
          <>
            {renderStatus()}

            {/* 1. Government ID */}
            <Text style={styles.sectionTitle}>1. Government-issued ID</Text>
            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => setShowForm((v) => !v)}
              disabled={status === "verified" || status === "pending"}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <View style={styles.optionIcon}>
                <Ionicons name="card-outline" size={24} color={C.accent} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Government ID or passport</Text>
                <Text style={styles.optionDesc}>{idCardDesc}</Text>
              </View>
              {status !== "verified" && status !== "pending" && (
                <Ionicons name={showForm ? "chevron-up" : "chevron-forward"} size={20} color={C.faint} />
              )}
            </TouchableOpacity>

            {showForm && (status === "unverified" || status === "rejected") && renderForm()}

            {/* 2. Selfie */}
            <Text style={styles.sectionTitle}>2. Selfie check</Text>
            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => setSelfieVisible(true)}
              disabled={!canSubmit || submitting}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={selfieImage ? "Retake selfie" : "Take a selfie"}
            >
              {selfieImage ? (
                <Image source={{ uri: selfieImage }} style={styles.selfieThumb} />
              ) : (
                <View style={styles.optionIcon}>
                  <Ionicons name="scan-outline" size={24} color={C.accent} />
                </View>
              )}
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Take a selfie</Text>
                <Text style={styles.optionDesc}>
                  {status === "verified"
                    ? "Selfie verified"
                    : status === "pending"
                      ? "Selfie under review"
                      : selfieImage
                        ? "Selfie added. Tap to retake"
                        : "Our team compares it with your ID photo"}
                </Text>
              </View>
              {canSubmit &&
                (selfieImage ? (
                  <Ionicons name="checkmark-circle" size={22} color={C.success} />
                ) : (
                  <Ionicons name="camera-outline" size={22} color={C.faint} />
                ))}
            </TouchableOpacity>

            {/* Details */}
            <LinearGradient colors={[C.inner, C.card]} style={styles.detailsCard}>
              <Text style={styles.detailsTitle}>Verification details</Text>
              <Text style={styles.detailsText}>
                Upload a government-issued ID, passport or driving licence, then take a selfie. Use clear photos with all four corners of the ID visible.
              </Text>
              <View style={styles.tipRow}>
                <Ionicons name="bulb-outline" size={16} color={C.accent} />
                <Text style={styles.tipText}>Make sure your documents are valid and clearly readable. Our team reviews every submission and you'll see the result here.</Text>
              </View>
            </LinearGradient>

            {/* Actions */}
            {canSubmit ? (
              <TouchableOpacity
                style={[styles.primaryButton, submitting && styles.disabled]}
                onPress={showForm ? handleSubmit : () => setShowForm(true)}
                disabled={submitting}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Text style={styles.primaryText}>
                  {submitting
                    ? `Uploading… ${progress}%`
                    : showForm
                      ? "Submit for review"
                      : status === "rejected"
                        ? "Submit again"
                        : "Start verification"}
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.secondaryButton} onPress={() => setWhyVisible(true)} activeOpacity={0.8} accessibilityRole="button">
              <Text style={styles.secondaryText}>Why is this required?</Text>
            </TouchableOpacity>

            <Text style={styles.footerNote}>
              Documents are used only for account verification, as described in our Privacy Policy.
            </Text>
            <TouchableOpacity onPress={() => router.push("/(main)/settings/help-support" as any)} style={styles.supportLink}>
              <Text style={styles.supportText}>
                Need help? <Text style={styles.supportHighlight}>Contact support</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <ComingSoonPopup
        visible={whyVisible}
        icon="shield-checkmark-outline"
        title="Why we ask"
        message="Identity checks help keep GullyFame safe, stop fake accounts and make sure prizes and withdrawals reach the right person."
        onClose={() => setWhyVisible(false)}
      />
      <SelfieCaptureModal
        visible={selfieVisible}
        onClose={() => setSelfieVisible(false)}
        onCaptured={(photo) => {
          setSelfieImage(photo.uri);
          setSelfieVisible(false);
          setShowForm(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    paddingTop: Platform.OS === "android" ? 20 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "ios" ? 60 : 12,
    paddingBottom: 8,
  },
  headerSide: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: C.text,
    fontSize: 19,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  stepLabel: {
    color: C.faint,
    fontSize: 12,
    width: 64,
    textAlign: "right",
    paddingRight: 12,
    fontFamily: "Rubik_500Medium",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // Intro
  heroTitle: {
    color: C.text,
    fontSize: 24,
    textAlign: "center",
    fontFamily: "PlayfairDisplay_700Bold",
    marginTop: 8,
  },
  heroSub: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 18,
    paddingHorizontal: 12,
    fontFamily: "Rubik_400Regular",
  },

  // Status
  statusBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  statusText: {
    flex: 1,
  },
  statusTitle: {
    color: C.text,
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
  },
  statusDesc: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
    fontFamily: "Rubik_400Regular",
  },
  errorBox: {
    alignItems: "center",
    marginVertical: 40,
  },
  errorText: {
    color: C.muted,
    fontSize: 14,
    textAlign: "center",
    fontFamily: "Rubik_400Regular",
  },
  retryText: {
    color: C.accent,
    fontSize: 14,
    marginTop: 8,
    fontFamily: "Rubik_600SemiBold",
  },

  // Sections and option cards
  sectionTitle: {
    color: C.text,
    fontSize: 16,
    fontFamily: "Rubik_700Bold",
    marginTop: 18,
    marginBottom: 10,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 12,
  },
  optionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.inner,
    justifyContent: "center",
    alignItems: "center",
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    color: C.text,
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
  },
  optionDesc: {
    color: C.faint,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
    fontFamily: "Rubik_400Regular",
  },
  selfieThumb: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  soonBadge: {
    backgroundColor: C.accentSoft,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  soonText: {
    color: C.accent,
    fontSize: 11,
    fontFamily: "Rubik_600SemiBold",
  },

  // Upload form
  formCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.accent,
    padding: 16,
    marginTop: 10,
  },
  formLabel: {
    color: C.muted,
    fontSize: 13,
    fontFamily: "Rubik_500Medium",
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.inner,
  },
  chipActive: {
    backgroundColor: C.accentSoft,
    borderColor: C.accent,
  },
  chipText: {
    color: C.muted,
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
  },
  chipTextActive: {
    color: C.accent,
    fontFamily: "Rubik_600SemiBold",
  },
  imageRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  imagePicker: {
    flex: 1,
    height: 116,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: C.accent,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: C.inner,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  imagePickerText: {
    color: C.muted,
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
    fontFamily: "Rubik_400Regular",
  },

  // Details card
  detailsCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginTop: 20,
  },
  detailsTitle: {
    color: C.text,
    fontSize: 16,
    fontFamily: "Rubik_700Bold",
    marginBottom: 8,
  },
  detailsText: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Rubik_400Regular",
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 10,
  },
  tipText: {
    flex: 1,
    color: C.faint,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Rubik_400Regular",
  },

  // Buttons
  primaryButton: {
    backgroundColor: C.accent,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 20,
  },
  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Rubik_700Bold",
  },
  disabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.accent,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  secondaryText: {
    color: C.accent,
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
  },
  footerNote: {
    color: C.faint,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 16,
    paddingHorizontal: 12,
    fontFamily: "Rubik_400Regular",
  },
  supportLink: {
    alignItems: "center",
    marginTop: 12,
  },
  supportText: {
    color: C.faint,
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
  },
  supportHighlight: {
    color: C.accent,
    fontFamily: "Rubik_600SemiBold",
    textDecorationLine: "underline",
  },
});
