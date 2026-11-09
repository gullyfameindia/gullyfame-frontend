import { useState } from "react";
import { safeDecode } from "@/utils/routeParams";
import KeyboardAvoidingScreen from "@/components/KeyboardAvoidingScreen";
import { validatePickedAsset } from "@/utils/fileValidation";
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
  TextInput,
  Image,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { updateProfile } from "@api/services/userService";
import { getErrorMessage } from "@api/client";
import Svg, { Path } from "react-native-svg";
import { UserProfileIcon } from "@/icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { showPermissionSettingsAlert } from "@/utils/permissionSettings";

const { width } = Dimensions.get("window");

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
          <TouchableOpacity
            onPress={() => router.back()}
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
            Add a friendly face and a short bio so the community knows who's
            stepping on stage.
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
            <Text style={styles.bioLabel}>Bio *</Text>
            <TextInput
              style={[
                styles.bioInput,
                !bio.trim() &&
                  errorMessage.includes("bio") &&
                  styles.bioInputError,
              ]}
              placeholder="Introduce yourself in a sentence or two"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              value={bio}
              onChangeText={(text) => {
                setBio(text);
                if (errorMessage) setErrorMessage("");
              }}
            />
            <Text style={styles.bioHelper}>
              Share your crew, wins or vibe. You can always edit this later.
            </Text>
          </View>

          <View style={styles.threeWordsBlock}>
            <Text style={styles.threeWordsLabel}>
              Describe yourself in three words
            </Text>
            <View style={styles.threeWordsInputContainer}>
              <TextInput
                style={styles.threeWordsInput}
                placeholder="1st word"
                placeholderTextColor="#94A3B8"
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
                placeholder="2nd word"
                placeholderTextColor="#94A3B8"
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
                placeholder="3rd word"
                placeholderTextColor="#94A3B8"
                value={threeWords[2]}
                onChangeText={(text) => {
                  const newWords = [...threeWords];
                  newWords[2] = text;
                  setThreeWords(newWords);
                }}
              />
            </View>
            <Text style={styles.threeWordsHelper}>
              Example: MusicLover | DanceFreak | VibeCreator
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
            Skip (Add details later)
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingScreen>
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
  avatarPlaceholder: {
    alignItems: "center",
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  avatarText: {
    color: "#000",
    fontSize: 16,
    marginTop: 16,
    fontFamily: "Rubik_500Medium",
  },
  avatarButton: {
    marginTop: 18,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: "#EC9A15",
  },
  avatarButtonText: {
    color: "#FFFFFF",
    fontFamily: "Rubik_500Medium",
  },
  bioBlock: {
    marginTop: 20,
  },
  bioLabel: {
    color: "#000",
    fontSize: 16,
    paddingVertical: 12,
    letterSpacing: 0,
    fontFamily: "Rubik_500Medium",
  },
  bioInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#D9D9D9",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#000",
    textAlignVertical: "top",
    fontFamily: "Rubik_400Regular",
  },
  bioHelper: {
    color: "#6A6A6A",
    fontSize: 12,
    marginTop: 10,
    lineHeight: 18,
    fontFamily: "Rubik_400Regular",
  },
  bioInputError: {
    borderColor: "#EF4444",
    borderWidth: 1.5,
  },
  threeWordsBlock: {
    marginTop: 20,
  },
  threeWordsLabel: {
    color: "#000",
    fontSize: 16,
    paddingVertical: 12,
    letterSpacing: 0,
    fontFamily: "Rubik_500Medium",
  },
  threeWordsInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#D9D9D9",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  threeWordsInput: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 12,
    fontSize: 14,
    color: "#000",
    fontFamily: "Rubik_400Regular",
  },
  threeWordsSeparator: {
    color: "#6B7280",
    fontSize: 16,
    paddingHorizontal: 4,
    fontFamily: "Rubik_500Medium",
  },
  threeWordsHelper: {
    color: "#6A6A6A",
    fontSize: 12,
    marginTop: 10,
    lineHeight: 18,
    fontFamily: "Rubik_400Regular",
  },
  errorContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
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
