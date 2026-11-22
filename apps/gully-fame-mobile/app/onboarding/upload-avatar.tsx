import { useState } from "react";
import { safeDecode } from "@/utils/routeParams";
import KeyboardAvoidingScreen from "@/components/KeyboardAvoidingScreen";
import { validatePickedAsset } from "@/utils/fileValidation";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  Alert,
  TextInput,
  Image,
  ActivityIndicator,
} from "react-native";
import { safeBack } from "@/utils/safeBack";
import { router, useLocalSearchParams } from "expo-router";
import { updateProfile } from "@api/services/userService";
import { getErrorMessage } from "@api/client";
import Svg, { Path } from "react-native-svg";
import { colors, font, radius, space, type } from "@/theme/tokens";
import { UserProfileIcon } from "@/icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { showPermissionSettingsAlert } from "@/utils/permissionSettings";


export default function OnboardingUploadAvatar() {
  const params = useLocalSearchParams();
  const role = params.role ? String(params.role) : "participant";
  const categoriesParam = params.categories
    ? safeDecode(String(params.categories))
    : "[]";
  const categories: string[] = (() => {
    try {
      return JSON.parse(categoriesParam);
    } catch {
      return [];
    }
  })();
  const firstName = params.firstName
    ? safeDecode(String(params.firstName))
    : "";
  const lastName = params.lastName
    ? safeDecode(String(params.lastName))
    : "";
  const email = params.email ? safeDecode(String(params.email)) : "";
  const dob = params.dob ? safeDecode(String(params.dob)) : "";
  const gender = params.gender ? safeDecode(String(params.gender)) : "";
  const fromKycFlow = params.fromKycFlow === "true";

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [threeWords, setThreeWords] = useState(["", "", ""]);
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const handlePickImage = async () => {
    
    Alert.alert("Select Image", "Choose an option", [
      {
        text: "Camera",
        onPress: async () => {
          const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted" && !canAskAgain) {
            showPermissionSettingsAlert("Camera access");
            return;
          }
          if (status !== "granted") {
            Alert.alert(
              "Permission needed",
              "Please grant permission to access your camera.",
            );
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            await processImage(result.assets[0]);
          }
        },
      },
      {
        text: "Gallery",
        onPress: async () => {
          const { status, canAskAgain } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted" && !canAskAgain) {
            showPermissionSettingsAlert("Photo library access");
            return;
          }
          if (status !== "granted") {
            Alert.alert(
              "Permission needed",
              "Please grant permission to access your photos.",
            );
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            presentationStyle:
              ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
          });
          if (!result.canceled && result.assets[0]) {
            await processImage(result.assets[0]);
          }
        },
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  const processImage = async (asset: ImagePicker.ImagePickerAsset) => {
    const invalid = validatePickedAsset(asset, ["image"]);
    if (invalid) {
      setErrorMessage(invalid);
      return;
    }
    setProfileImage(asset.uri);
    setErrorMessage("");
  };

  const goToFaceScan = async (isSkip: boolean = false) => {
    if (isSkip) {
      const query = [
        `role=${encodeURIComponent(role)}`,
        `firstName=${encodeURIComponent(firstName)}`,
        `lastName=${encodeURIComponent(lastName)}`,
        `email=${encodeURIComponent(email)}`,
        `dob=${encodeURIComponent(dob)}`,
        `gender=${encodeURIComponent(gender)}`,
        `categories=${encodeURIComponent(JSON.stringify(categories))}`,
        `bio=${encodeURIComponent("")}`,
        `profileImage=${encodeURIComponent("")}`,
        `threeWords=${encodeURIComponent("")}`,
        fromKycFlow ? `fromKycFlow=true` : "",
      ]
        .filter(Boolean)
        .join("&");

      router.push(`/onboarding/face-scan?${query}` as any);
      return;
    }

    if (!profileImage) {
      setErrorMessage("Please upload a profile photo");
      return;
    }

    if (!bio || bio.trim().length === 0) {
      setErrorMessage("Please enter your bio");
      return;
    }

    setErrorMessage("");

    
    const threeWordsFormatted = threeWords.filter((w) => w.trim()).join(" | ");

    if (saving) return;
    setSaving(true);
    let uploadedImage = profileImage;
    try {
      // Uploads the photo to S3 and saves its URL on the profile.
      const profile = await updateProfile({ profileImage });
      uploadedImage = profile.profileImage || profileImage;
      // The backend user model has no bio field yet, so bio stays on this device.
      await AsyncStorage.multiSet([
        ["userBio", bio.trim()],
        ["userProfileImage", uploadedImage],
        ["userThreeWords", threeWordsFormatted],
      ]);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return;
    } finally {
      setSaving(false);
    }

    const query = [
      `role=${encodeURIComponent(role)}`,
      `firstName=${encodeURIComponent(firstName)}`,
      `lastName=${encodeURIComponent(lastName)}`,
      `email=${encodeURIComponent(email)}`,
      `dob=${encodeURIComponent(dob)}`,
      `gender=${encodeURIComponent(gender)}`,
      `categories=${encodeURIComponent(JSON.stringify(categories))}`,
      `bio=${encodeURIComponent(bio.trim())}`,
      `profileImage=${encodeURIComponent(uploadedImage || "")}`,
      `threeWords=${encodeURIComponent(threeWordsFormatted)}`,
      fromKycFlow ? `fromKycFlow=true` : "",
    ]
      .filter(Boolean)
      .join("&");

    router.push(`/onboarding/face-scan?${query}` as any);
  };

  return (
    <KeyboardAvoidingScreen style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2610" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10}
            onPress={() => safeBack()}
            style={styles.headerBackButton}
          >
            <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
              <Path
                d="M16 7H3.83L9.42 1.41L8 0L0 8L8 16L9.41 14.59L3.83 9H16V7Z"
                fill="#EC9A15"
              />
            </Svg>
          </TouchableOpacity>

          <View style={styles.headerTextBlock}>
            <Text style={styles.headerEyebrow}>
              Step <Text style={styles.headerEyebrowNumber}>4</Text> of{" "}
              <Text style={styles.headerEyebrowNumber}>5</Text>
            </Text>
            <Text style={styles.headerTitle}>Set up your profile</Text>
          </View>
        </View>

        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeSubtitle}>
            A photo and a short bio help people recognise you.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.avatarPlaceholder}>
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.avatarImage}
              />
            ) : (
              <UserProfileIcon width={62} height={66} color="#EC9A15" />
            )}
            <Text style={styles.avatarText}>
              {profileImage ? "Photo added" : "Add profile photo"}
            </Text>
            <TouchableOpacity
              style={styles.avatarButton}
              activeOpacity={0.85}
              onPress={handlePickImage}
            >
              <Text style={styles.avatarButtonText}>
                {profileImage ? "Change photo" : "Upload photo"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bioBlock}>
            <Text style={styles.bioLabel}>Bio <Text style={{ color: colors.danger }}>*</Text></Text>
            <TextInput
              style={[
                styles.bioInput,
                !bio.trim() &&
                  errorMessage.includes("bio") &&
                  styles.bioInputError,
              ]}
              placeholder="e.g. Street dancer from Delhi who loves hip-hop"
              placeholderTextColor={colors.placeholder}
              multiline
              numberOfLines={4}
              value={bio}
              onChangeText={(text) => {
                setBio(text);
                if (errorMessage) setErrorMessage("");
              }}
            />
            <Text style={styles.bioHelper}>
              You can change this later.
            </Text>
          </View>

          <View style={styles.threeWordsBlock}>
            <Text style={styles.threeWordsLabel}>
              Describe yourself in three words
            </Text>
            <View style={styles.threeWordsInputContainer}>
              <TextInput
                style={styles.threeWordsInput}
                placeholder="e.g. Bold"
                placeholderTextColor={colors.placeholder}
                value={threeWords[0]}
                onChangeText={(text) => {
                  const newWords = [...threeWords];
                  newWords[0] = text;
                  setThreeWords(newWords);
                }}
              />
              <Text style={styles.threeWordsSeparator}>|</Text>
              <TextInput
                style={styles.threeWordsInput}
                placeholder="e.g. Creative"
                placeholderTextColor={colors.placeholder}
                value={threeWords[1]}
                onChangeText={(text) => {
                  const newWords = [...threeWords];
                  newWords[1] = text;
                  setThreeWords(newWords);
                }}
              />
              <Text style={styles.threeWordsSeparator}>|</Text>
              <TextInput
                style={styles.threeWordsInput}
                placeholder="e.g. Fearless"
                placeholderTextColor={colors.placeholder}
                value={threeWords[2]}
                onChangeText={(text) => {
                  const newWords = [...threeWords];
                  newWords[2] = text;
                  setThreeWords(newWords);
                }}
              />
            </View>
            <Text style={styles.threeWordsHelper}>
              Optional. Shown on your profile.
            </Text>
          </View>

          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.9}
          onPress={() => goToFaceScan(false)}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Continue</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          activeOpacity={0.75}
          onPress={() => goToFaceScan(true)}
        >
          <Text style={styles.secondaryButtonText}>
            Skip for now
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.page },
  scrollContent: {
    paddingTop: Platform.OS === "android" ? 50 : 60,
    paddingBottom: 48,
    paddingHorizontal: space.lg,
    flexGrow: 1,
  },
  headerRow: { flexDirection: "row", alignItems: "center", marginTop: 20 },
  headerBackButton: { width: 24, height: 24, justifyContent: "center", alignItems: "center" },
  headerTextBlock: { flex: 1, marginHorizontal: space.md },
  headerEyebrow: { color: colors.textMuted, fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2, fontFamily: font.semibold },
  headerEyebrowNumber: { fontFamily: font.semibold },
  headerTitle: { ...type.screenTitle, fontSize: 24 },
  welcomeCard: { paddingTop: space.md, paddingBottom: space.lg },
  welcomeSubtitle: { ...type.body },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: space.lg,
  },
  avatarPlaceholder: { alignItems: "center", paddingTop: space.sm },
  avatarImage: { width: 112, height: 112, borderRadius: 56 },
  avatarText: { color: colors.text, fontSize: 15, marginTop: space.md, fontFamily: font.semibold },
  avatarButton: {
    marginTop: space.md,
    paddingHorizontal: space.lg,
    height: 38,
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  avatarButtonText: { color: colors.accent, fontFamily: font.semibold, fontSize: 14 },
  bioBlock: { marginTop: space.xl },
  bioLabel: { ...type.label, marginBottom: space.sm },
  bioInput: {
    backgroundColor: colors.field,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: space.md,
    minHeight: 96,
    fontSize: 14,
    color: colors.text,
    textAlignVertical: "top",
    fontFamily: font.regular,
  },
  bioHelper: { ...type.caption, marginTop: 6 },
  bioInputError: { borderColor: colors.danger, borderWidth: 1.5 },
  threeWordsBlock: { marginTop: space.lg },
  threeWordsLabel: { ...type.label, marginBottom: space.sm },
  threeWordsInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.field,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space.xs,
  },
  threeWordsInput: { flex: 1, paddingHorizontal: 10, height: 46, fontSize: 14, color: colors.text, fontFamily: font.regular },
  threeWordsSeparator: { width: 1, height: 20, backgroundColor: colors.line, color: "transparent" },
  threeWordsHelper: { ...type.caption, marginTop: 6 },
  errorContainer: {
    marginTop: space.md,
    padding: space.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.45)",
  },
  errorText: { color: colors.danger, fontSize: 13, fontFamily: font.medium },
  primaryButton: {
    marginTop: space.xl,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: { ...type.button, color: "#FFFFFF" },
  secondaryButton: { alignSelf: "center", marginTop: space.lg, padding: space.sm },
  secondaryButtonText: { color: colors.textMuted, fontSize: 14, fontFamily: font.medium },
});
