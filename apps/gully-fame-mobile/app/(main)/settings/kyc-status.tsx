

import { validatePickedAsset } from "@/utils/fileValidation";
import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Image,
  Alert,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { getMyKyc, submitKyc, KYC_DOC_TYPES, KycDocType, KycRecord } from "@/api/services/kycService";
import { getErrorMessage } from "@/api/client";
import { toastSuccess } from "@/components/ui/Toast";
import { showPermissionSettingsAlert } from "@/utils/permissionSettings";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SkeletonCards } from "@/components/Skeleton/Skeleton";


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

  const status: "unverified" | "pending" | "verified" | "rejected" = !kyc
    ? "unverified"
    : kyc.status === "APPROVED"
      ? "verified"
      : kyc.status === "REJECTED"
        ? "rejected"
        : "pending";

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
    setSubmitting(true);
    setProgress(0);
    try {
      const record = await submitKyc({ docType, frontImageUri: frontImage, backImageUri: backImage, onProgress: setProgress });
      setKyc(record);
      setShowForm(false);
      setFrontImage(null);
      setBackImage(null);
      toastSuccess("KYC submitted for review");
    } catch (error) {
      Alert.alert("Submission failed", getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const renderForm = () => (
    <View style={styles.formCard}>
      <Text style={styles.sectionTitle}>Document Type</Text>
      <View style={styles.docTypeRow}>
        {KYC_DOC_TYPES.map((item) => (
          <TouchableOpacity
            key={item.value}
            style={[styles.docTypeChip, docType === item.value && styles.docTypeChipActive]}
            onPress={() => setDocType(item.value)}
            disabled={submitting}
          >
            <Text style={[styles.docTypeText, docType === item.value && styles.docTypeTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.imageRow}>
        {(["front", "back"] as const).map((side) => {
          const uri = side === "front" ? frontImage : backImage;
          return (
            <TouchableOpacity key={side} style={styles.imagePicker} onPress={() => pickImage(side)} disabled={submitting}>
              {uri ? (
                <Image source={{ uri }} style={styles.imagePreview} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={28} color="#EC9A15" />
                  <Text style={styles.imagePickerText}>
                    {side === "front" ? "Front side *" : "Back side (optional)"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity style={styles.actionButtonGold} activeOpacity={0.8} onPress={handleSubmit} disabled={submitting}>
        {submitting ? (
          <Text style={styles.actionButtonTextGold}>Uploading… {progress}%</Text>
        ) : (
          <Text style={styles.actionButtonTextGold}>Submit for Review</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderStatusCard = () => {
    switch (status) {
      case "pending":
        return (
          <LinearGradient
            colors={['rgba(236, 154, 21, 0.15)', 'rgba(236, 154, 21, 0.05)']}
            style={[styles.statusCard, { borderColor: '#EC9A15' }]}
          >
            <View style={styles.iconGlowPending}>
              <MaterialCommunityIcons name="clock-fast" size={48} color="#EC9A15" />
            </View>
            <Text style={styles.statusTitle}>Verification Pending</Text>
            <Text style={styles.statusDesc}>
              Your documents are under review.
              {kyc?.submittedAt ? `\nSubmitted ${new Date(kyc.submittedAt).toLocaleDateString("en-IN")}` : ""}
            </Text>
          </LinearGradient>
        );
      case "verified":
        return (
          <LinearGradient
            colors={['rgba(37, 211, 102, 0.15)', 'rgba(37, 211, 102, 0.05)']}
            style={[styles.statusCard, { borderColor: '#25D366' }]}
          >
            <View style={styles.iconGlowVerified}>
              <MaterialCommunityIcons name="shield-check" size={48} color="#25D366" />
            </View>
            <Text style={styles.statusTitle}>Fully Verified</Text>
            <Text style={styles.statusDesc}>
              Your account is verified.
            </Text>
          </LinearGradient>
        );
      case "rejected":
        return (
          <LinearGradient
            colors={['rgba(255, 68, 68, 0.15)', 'rgba(255, 68, 68, 0.05)']}
            style={[styles.statusCard, { borderColor: '#ff4444' }]}
          >
            <View style={styles.iconGlowRejected}>
              <MaterialCommunityIcons name="shield-alert" size={48} color="#ff4444" />
            </View>
            <Text style={styles.statusTitle}>Verification Failed</Text>
            <Text style={styles.statusDesc}>
              {kyc?.reason || "Your document was rejected. Please submit it again."}
            </Text>
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.8} onPress={() => setShowForm(true)}>
              <Text style={styles.actionButtonText}>Re-Submit Documents</Text>
            </TouchableOpacity>
          </LinearGradient>
        );
      default:
        return (
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.02)']}
            style={[styles.statusCard, { borderColor: '#666' }]}
          >
            <View style={styles.iconGlowUnverified}>
              <MaterialCommunityIcons name="shield-off-outline" size={48} color="#ccc" />
            </View>
            <Text style={styles.statusTitle}>Account Unverified</Text>
            <Text style={styles.statusDesc}>
              Submit a government ID to verify your account.
            </Text>
            <TouchableOpacity 
              style={styles.actionButtonGold} 
              activeOpacity={0.8}
              onPress={() => setShowForm(true)}
            >
              <Text style={styles.actionButtonTextGold}>Start Verification</Text>
            </TouchableOpacity>
          </LinearGradient>
        );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2610" />

      {}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>KYC Verification</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {}
        <View style={styles.securityBanner}>
          <FontAwesome5 name="lock" size={14} color="#25D366" />
          <Text style={styles.securityText}>Documents are used for account verification, as described in the Privacy Policy.</Text>
        </View>

        {}
        {loading ? (
          <SkeletonCards count={3} height={72} style={{ marginVertical: 16 }} />
        ) : loadError ? (
          <TouchableOpacity onPress={loadKyc} style={{ alignItems: "center", marginVertical: 40 }}>
            <Text style={styles.statusDesc}>{loadError}</Text>
            <Text style={[styles.statusDesc, { color: "#EC9A15", marginTop: 8 }]}>Tap to retry</Text>
          </TouchableOpacity>
        ) : (
          <>
            {renderStatusCard()}
            {showForm && renderForm()}
          </>
        )}

        {}
        <Text style={styles.sectionTitle}>Verification Steps</Text>
        
        <View style={styles.stepsContainer}>
          {}
          <View style={styles.stepRow}>
            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, styles.stepDotCompleted]}>
                <Ionicons name="checkmark" size={16} color="#fff" />
              </View>
              <View style={[styles.stepLine, styles.stepLineCompleted]} />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Account Created</Text>
              <Text style={styles.stepDesc}>Signed in to Gully Fame</Text>
            </View>
          </View>

          {}
          <View style={styles.stepRow}>
            <View style={styles.stepIndicator}>
              <View style={[
                styles.stepDot, 
                status === 'verified' || status === 'pending' ? styles.stepDotCompleted : styles.stepDotPending
              ]}>
                {status === 'verified' || status === 'pending' ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : (
                  <Text style={styles.stepNumber}>2</Text>
                )}
              </View>
              <View style={[
                styles.stepLine, 
                status === 'verified' || status === 'pending' ? styles.stepLineCompleted : styles.stepLinePending
              ]} />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Identity Document</Text>
              <Text style={styles.stepDesc}>
                {status === 'verified'
                  ? 'Document verified'
                  : status === 'pending'
                    ? 'Document under review'
                    : status === 'rejected'
                      ? 'Document rejected, please re-submit'
                      : 'Upload a government ID'}
              </Text>
            </View>
          </View>

          {}
          <View style={styles.stepRow}>
            <View style={styles.stepIndicator}>
              <View style={[
                styles.stepDot,
                styles.stepDotPending
              ]}>
                <Text style={styles.stepNumber}>3</Text>
              </View>
            </View>
            <View style={[styles.stepContent, { paddingBottom: 0 }]}>
              <Text style={styles.stepTitle}>Selfie Verification</Text>
              <Text style={styles.stepDesc}>
                Not available yet
              </Text>
            </View>
          </View>
        </View>

        {}
        <TouchableOpacity style={styles.supportLink} onPress={() => router.push("/(main)/settings/help-support" as any)}>
          <Text style={styles.supportText}>Need help with verification? <Text style={styles.supportHighlight}>Contact Support</Text></Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  formCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.3)",
  },
  docTypeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  docTypeChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  docTypeChipActive: {
    backgroundColor: "#EC9A15",
    borderColor: "#EC9A15",
  },
  docTypeText: {
    color: "#ccc",
    fontSize: 13,
  },
  docTypeTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  imageRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  imagePicker: {
    flex: 1,
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(236, 154, 21, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  imagePickerText: {
    color: "#ccc",
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
  },
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
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  securityBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(37, 211, 102, 0.1)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(37, 211, 102, 0.2)",
    gap: 8,
  },
  securityText: {
    color: "#25D366",
    fontSize: 12,
    fontWeight: "600",
  },
  statusCard: {
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    marginBottom: 30,
  },
  iconGlowPending: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(236, 154, 21, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "rgba(236, 154, 21, 0.3)",
  },
  iconGlowVerified: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(37, 211, 102, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "rgba(37, 211, 102, 0.3)",
  },
  iconGlowRejected: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255, 68, 68, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 68, 68, 0.3)",
  },
  iconGlowUnverified: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  statusTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  statusDesc: {
    color: "#ccc",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  actionButtonGold: {
    backgroundColor: "#EC9A15",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginTop: 20,
    width: "100%",
    alignItems: "center",
    shadowColor: "#EC9A15",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  actionButtonTextGold: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  actionButton: {
    backgroundColor: "#ff4444",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginTop: 20,
    width: "100%",
    alignItems: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
  },
  stepsContainer: {
    backgroundColor: "#252525",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.1)",
  },
  stepRow: {
    flexDirection: "row",
  },
  stepIndicator: {
    alignItems: "center",
    marginRight: 16,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  stepDotCompleted: {
    backgroundColor: "#25D366",
  },
  stepDotPending: {
    backgroundColor: "#333",
    borderWidth: 1,
    borderColor: "#666",
  },
  stepNumber: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "bold",
  },
  stepLine: {
    width: 2,
    height: 40,
    marginVertical: 4,
  },
  stepLineCompleted: {
    backgroundColor: "#25D366",
  },
  stepLinePending: {
    backgroundColor: "#444",
  },
  stepContent: {
    flex: 1,
    paddingBottom: 24,
  },
  stepTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  stepDesc: {
    color: "#999",
    fontSize: 13,
  },
  supportLink: {
    marginTop: 30,
    alignItems: "center",
  },
  supportText: {
    color: "#aaa",
    fontSize: 14,
  },
  supportHighlight: {
    color: "#EC9A15",
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
});