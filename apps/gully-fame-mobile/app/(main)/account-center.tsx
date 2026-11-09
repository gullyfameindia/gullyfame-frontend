import React, { useState, useEffect, useRef } from "react";
import KeyboardAvoidingScreen from "@/components/KeyboardAvoidingScreen";
import { validatePickedAsset } from "@/utils/fileValidation";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { toBackendGender, genderLabel } from "@/api/services/userService";
import { AUTH_RULES } from "@/api/services/authService";
import { showToast, toastSuccess } from "@/components/ui/Toast";
import { SelfieCaptureModal } from "@/components/kyc/SelfieCaptureModal";
import { useFocusEffect } from "expo-router/react-navigation";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { authService } from "@api/services/authService";
import { BackIcon, CameraIcon, EditIcon, LockIcon } from "@/icons";
import { showPermissionSettingsAlert } from "@/utils/permissionSettings";


export default function AccountCenterScreen() {
  const params = useLocalSearchParams();
  const fromVerified = params.fromVerified === "true";
  const fromKycFlow = params.fromKycFlow === "true";
  const kycStep = params.step as string | undefined; 
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [bio, setBio] = useState("");
  const [threeWords, setThreeWords] = useState(["", "", ""]);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [role, setRole] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [selfieVisible, setSelfieVisible] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [slideAnim] = React.useState(() => new Animated.Value(0));

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [originalData, setOriginalData] = useState<any>({});
  const [originalRole, setOriginalRole] = useState<string>("");
  const [originalEmail, setOriginalEmail] = useState<string>("");
  const [originalMobile, setOriginalMobile] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true); 

  // The screen re-reads the saved profile when it regains focus, but never while the user
  // is editing: a reload used to reset every typed value (for example the bio) on each keystroke.
  const isEditingRef = useRef(false);
  const bioRef = useRef("");
  const profileImageRef = useRef<string | null>(null);
  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);
  useEffect(() => {
    bioRef.current = bio;
  }, [bio]);
  useEffect(() => {
    profileImageRef.current = profileImage;
  }, [profileImage]);

  useEffect(() => {
    loadUserData();
  }, []);

  // handlePickImage is re-created every render; the focus effect reads the latest one through a ref.
  const handlePickImageRef = React.useRef<() => void>(() => {});

  useFocusEffect(
    React.useCallback(() => {
      if (!isEditingRef.current) loadUserData();

      let kycTimer: ReturnType<typeof setTimeout> | null = null;
      if (fromKycFlow && kycStep) {
        kycTimer = setTimeout(() => {
          if (kycStep === "bio" && !bioRef.current.trim()) {
            setIsEditing(true);
          } else if (kycStep === "image" && !profileImageRef.current) {
            handlePickImageRef.current();
          }
        }, 500);
      }
      // Cancel the pending prompt if the user leaves the screen first.
      return () => {
        if (kycTimer) clearTimeout(kycTimer);
      };
    }, [fromKycFlow, kycStep]),
  );

  const loadUserData = async () => {
    try {
      
      const userFirstName = await AsyncStorage.getItem("userFirstName");
      const userLastName = await AsyncStorage.getItem("userLastName");
      const userEmail = await AsyncStorage.getItem("userEmail");
      const userMobile = await AsyncStorage.getItem("userMobile");
      const userDateOfBirth = await AsyncStorage.getItem("userDateOfBirth");
      const userGender = await AsyncStorage.getItem("userGender");
      const userProfileImage = await AsyncStorage.getItem("userProfileImage");
      const userRole = await AsyncStorage.getItem("userRole");
      const userBio = await AsyncStorage.getItem("userBio");
      const userThreeWords =
        (await AsyncStorage.getItem("userThreeWords")) || "";

      const backendRole = userRole || "";
      const frontendRole =
        backendRole === "participants"
          ? "participant"
          : backendRole === "fan"
            ? "fan"
            : "participant";

      
      const threeWordsArray = userThreeWords
        ? userThreeWords.split("|").map((w) => w.trim())
        : ["", "", ""];
      while (threeWordsArray.length < 3) threeWordsArray.push("");

      const cachedData = {
        firstName: userFirstName || "",
        lastName: userLastName || "",
        email: userEmail || "",
        mobile: userMobile || "",
        dob: userDateOfBirth || "",
        gender: userGender || "",
        role: frontendRole,
        profileImage: userProfileImage || "",
        bio: userBio || "",
        threeWords: userThreeWords || "",
      };

      
      setFirstName(cachedData.firstName);
      setLastName(cachedData.lastName);
      setEmail(cachedData.email);
      setMobile(cachedData.mobile);
      setDateOfBirth(cachedData.dob);
      setGender(cachedData.gender);
      setProfileImage(cachedData.profileImage);
      setBio(cachedData.bio);
      setThreeWords(threeWordsArray);
      setRole(cachedData.role);
      setOriginalRole(cachedData.role);
      setOriginalEmail(cachedData.email || "");
      setOriginalMobile(cachedData.mobile || "");
      setOriginalData(cachedData);

      
      setIsLoading(false);

      
      if (__DEV__) { /* intentionally ignored */
      }

      const profileResult = await authService.getUserProfile();

      if (profileResult.success && profileResult.data) {
        const userData = profileResult.data;

        if (__DEV__) { /* intentionally ignored */
        }

        const backendRole = userData.role || "";
        const frontendRole =
          backendRole === "participants"
            ? "participant"
            : backendRole === "fan"
              ? "fan"
              : "participant";

        
        const backendThreeWords = (userData as any).threeWords || "";
        const backendThreeWordsArray = backendThreeWords
          ? backendThreeWords.split("|").map((w: string) => w.trim())
          : ["", "", ""];
        while (backendThreeWordsArray.length < 3)
          backendThreeWordsArray.push("");

        const data = {
          firstName: userData.firstName || "",
          lastName: userData.lastName || "",
          email: userData.email || "",
          mobile: userData.mobile || "",
          dob: userData.dob || "",
          gender: genderLabel(userData.gender),
          role: frontendRole,
          profileImage: userData.profileImage || "",
          // Bio isn't stored by the backend; keep the one saved on this device.
          bio: cachedData.bio,
          threeWords: backendThreeWords,
        };

        
        setFirstName(data.firstName);
        setLastName(data.lastName);
        setEmail(data.email);
        setMobile(data.mobile);
        setDateOfBirth(data.dob);
        setGender(data.gender);
        setProfileImage(data.profileImage);
        setBio(data.bio);
        setThreeWords(backendThreeWordsArray);
        setRole(data.role);
        setOriginalRole(data.role);
        setOriginalData(data);
        setOriginalEmail(data.email || "");
        setOriginalMobile(data.mobile || "");

        
        await AsyncStorage.multiSet([
          ["userFirstName", data.firstName],
          ["userLastName", data.lastName],
          ["userEmail", data.email],
          ["userMobile", data.mobile],
          ["userDateOfBirth", data.dob],
          ["userGender", data.gender],
          ["userRole", backendRole],
          ["userProfileImage", data.profileImage],
          ["userBio", data.bio],
          ["userThreeWords", data.threeWords],
        ]);
      } else {
        if (__DEV__) { /* intentionally ignored */
        }
      }
    } catch {
      
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = () => {
    
    
    setOriginalRole(role);
    setOriginalEmail(email);
    setOriginalMobile(mobile);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    
    setFirstName(originalData.firstName || "");
    setLastName(originalData.lastName || "");
    setEmail(originalData.email || "");
    setMobile(originalData.mobile || "");
    setDateOfBirth(originalData.dob || "");
    setGender(originalData.gender || "");
    setRole(originalData.role || "");
    setProfileImage(originalData.profileImage || "");
    setBio(originalData.bio || "");
    const resetThreeWords = (originalData.threeWords || "")
      .split("|")
      .map((w: string) => w.trim());
    while (resetThreeWords.length < 3) resetThreeWords.push("");
    setThreeWords(resetThreeWords);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (isSaving) {
      Alert.alert("Saving in progress", "Please wait for the current save to complete.");
      return;
    }

    setIsSaving(true);
    try {
      if (__DEV__) { /* intentionally ignored */
      }

      const backendRole = role === "participant" ? "participants" : "fan";

      
      const updateData: any = {
        role: backendRole, 
      };

      
      if (firstName !== (originalData.firstName || "")) {
        updateData.firstName = firstName;
      }
      if (lastName !== (originalData.lastName || "")) {
        updateData.lastName = lastName;
      }
      if (email !== originalEmail) {
        const nextEmail = email.trim().toLowerCase();
        if (!AUTH_RULES.email.test(nextEmail) || nextEmail.length > AUTH_RULES.emailMaxLength) {
          Alert.alert("Invalid email", "Enter a valid email address (max 50 characters).");
          return;
        }
        updateData.email = nextEmail;
      }
      if (dateOfBirth !== (originalData.dob || "")) {
        updateData.dob = dateOfBirth;
      }
      if (gender !== (originalData.gender || "")) {
        updateData.gender = toBackendGender(gender);
      }
      // Bio and three words are not stored by the backend yet; they stay on this device.

      if (profileImage !== (originalData.profileImage || "")) {
        updateData.profileImage = profileImage || undefined;
      }

      if (__DEV__) { /* intentionally ignored */
      }

      const updateResult = await authService.updateProfile(updateData);

      if (updateResult.success) {
        if (__DEV__) { /* intentionally ignored */
        }

        
        const threeWordsFormatted = threeWords
          .filter((w) => w.trim())
          .join(" | ");
        const updatedData = {
          firstName: firstName || originalData.firstName || "",
          lastName: lastName || originalData.lastName || "",
          email: email || originalData.email || "",
          mobile: mobile || originalData.mobile || "",
          dob: dateOfBirth || originalData.dob || "",
          gender: gender || originalData.gender || "",
          role: role || originalData.role || "",
          profileImage: profileImage || originalData.profileImage || "",
          bio: bio || originalData.bio || "",
          threeWords: threeWordsFormatted || originalData.threeWords || "",
        };

        setOriginalData(updatedData);
        setOriginalRole(role);
        setOriginalEmail(email);
        setOriginalMobile(mobile);
        setIsEditing(false); 

        
        await AsyncStorage.multiSet([
          ["userFirstName", updatedData.firstName],
          ["userLastName", updatedData.lastName],
          ["userEmail", updatedData.email],
          ["userMobile", updatedData.mobile],
          ["userDateOfBirth", updatedData.dob],
          ["userGender", updatedData.gender],
          ["userRole", backendRole],
          ["userProfileImage", updatedData.profileImage],
          ["userBio", updatedData.bio],
          ["userThreeWords", updatedData.threeWords],
        ]);

        toastSuccess("Your profile has been updated successfully!");

        
        if (fromKycFlow) {
          if (kycStep === "bio") {
            
            const { navigateToNextKycStep } =
              await import("@utils/kycValidation");
            await navigateToNextKycStep("image");
          } else if (kycStep === "image") {
            
            const { navigateToNextKycStep } =
              await import("@utils/kycValidation");
            await navigateToNextKycStep("faceScan");
          } else {
            
            const { navigateToNextKycStep } =
              await import("@utils/kycValidation");
            await navigateToNextKycStep("image");
          }
          return;
        }

        
        if (fromVerified) {
          router.replace("/(main)/verified" as any);
          return;
        }
      } else {
        const errorStatus = updateResult.status;
        let errorMsg = updateResult.error || "Failed to update profile. Please try again.";

        // Improve error messaging for auth failures
        if (errorStatus === 401 || errorMsg.toLowerCase().includes("invalid token") || errorMsg.toLowerCase().includes("session expired")) {
          errorMsg = "Your session has expired. Please log in again.";
        }

        Alert.alert("Error", errorMsg);

        if (__DEV__) { /* intentionally ignored */
        }
      }
    } catch (error: any) {
      let errorMsg = error.message || "Failed to save profile. Please try again.";
      
      // Check for network errors
      if (error.isNetworkError) {
        errorMsg = "Network error. Please check your connection and try again.";
      }
      
      Alert.alert("Error", errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickImage = () => {
    setImagePickerVisible(true);
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };
  // Keep the ref pointing at the latest handler (effect, not render, so refs stay render-pure).
  React.useEffect(() => {
    handlePickImageRef.current = handlePickImage;
  });

  const closeImagePicker = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setImagePickerVisible(false);
    });
  };

  const handleCameraPress = async () => {
    closeImagePicker();
    setIsProcessingImage(true);
    try {
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
        setIsProcessingImage(false);
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, 
        base64: true,
        allowsMultipleSelection: false,
      });
      if (!result.canceled && result.assets[0]) {
        await processImage(result.assets[0]);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to open camera.");
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleGalleryPress = async () => {
    closeImagePicker();
    setIsProcessingImage(true);
    try {
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
        setIsProcessingImage(false);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, 
        base64: true,
        allowsMultipleSelection: false,
        presentationStyle:
          ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
      });
      if (!result.canceled && result.assets[0]) {
        await processImage(result.assets[0]);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to open gallery.");
    } finally {
      setIsProcessingImage(false);
    }
  };

  const processImage = async (asset: ImagePicker.ImagePickerAsset) => {
    const invalid = validatePickedAsset(asset, ["image"]);
    if (invalid) {
      Alert.alert("Can't use this file", invalid);
      return;
    }
    try {
      const imageUri = asset.uri;
      let base64Image = asset.base64;

      
      setProfileImage(imageUri);

      if (base64Image) {
        
        const base64Size = (base64Image.length * 3) / 4;
        const maxSize = 2 * 1024 * 1024; 

        if (__DEV__) { /* intentionally ignored */
        }

        
        if (base64Size > maxSize) {
          if (__DEV__) { /* intentionally ignored */
          }

          
          
          
          if (base64Size > maxSize * 1.5) {
            Alert.alert(
              "Image Too Large",
              "The selected image is too large. Please choose a smaller image or take a new photo.",
              [{ text: "OK" }],
            );
            setIsProcessingImage(false);
            return;
          }
        }

        const imageDataUri = `data:image/jpeg;base64,${base64Image}`;

        if (__DEV__) { /* intentionally ignored */
        }

        setIsSaving(true);
        setIsProcessingImage(true);

        try {
          const updateResult = await authService.updateProfile({
            profileImage: imageDataUri,
          });

          if (updateResult.success) {
            if (__DEV__) { /* intentionally ignored */
            }

            // updateProfile uploaded the photo to S3; keep its public URL.
            const uploadedUrl = updateResult.data?.profileImage || imageDataUri;
            await AsyncStorage.setItem("userProfileImage", uploadedUrl);
            setOriginalData({ ...originalData, profileImage: uploadedUrl });
            setProfileImage(uploadedUrl);
            toastSuccess("Profile photo updated");

            
            if (__DEV__) { /* intentionally ignored */
            }

            
            if (fromKycFlow && kycStep === "image") {
              const { navigateToNextKycStep } =
                await import("@utils/kycValidation");
              await navigateToNextKycStep("faceScan");
              return;
            }
          } else {
            const errorMsg =
              updateResult.error || "Failed to upload image. Please try again.";

            
            if (
              errorMsg.includes("413") ||
              errorMsg.includes("too large") ||
              errorMsg.includes("Payload Too Large")
            ) {
              Alert.alert(
                "Image Too Large",
                "The image file is too large. Please choose a smaller image or take a new photo with lower quality.",
                [{ text: "OK" }],
              );
            } else {
              Alert.alert("Error", errorMsg);
            }

            if (__DEV__) { /* intentionally ignored */
            }
          }
        } catch (error: any) {

          
          if (
            error.message?.includes("413") ||
            error.message?.includes("too large") ||
            error.message?.includes("Payload Too Large")
          ) {
            Alert.alert(
              "Image Too Large",
              "The image file is too large. Please choose a smaller image or take a new photo with lower quality.",
              [{ text: "OK" }],
            );
          } else {
            Alert.alert(
              "Error",
              error.message || "Failed to upload image. Please try again.",
            );
          }
        } finally {
          setIsSaving(false);
          setIsProcessingImage(false);
        }
      }
    } catch (error: any) {
      setIsProcessingImage(false);
      Alert.alert("Error", error.message || "Failed to process image.");
    }
  };

  const handleChangePassword = () => {
    router.push("/(main)/change-password");
  };

  // Opens the front-camera selfie capture. The photo is not uploaded: the backend
  // has no selfie field on the KYC endpoint (see BACKEND GAPS).
  const handleVerificationSelfie = () => {
    setSelfieVisible(true);
  };

  const fullName = `${firstName} ${lastName}`.trim() || "User";
  const hasChanges =
    isEditing &&
    (firstName !== (originalData.firstName || "") ||
      lastName !== (originalData.lastName || "") ||
      email !== originalEmail ||
      mobile !== originalMobile ||
      dateOfBirth !== (originalData.dob || "") ||
      gender !== (originalData.gender || "") ||
      role !== originalRole ||
      bio !== (originalData.bio || "") ||
      threeWords.filter((w) => w.trim()).join(" | ") !==
        (originalData.threeWords || "") ||
      profileImage !== (originalData.profileImage || ""));

  
  if (isLoading && !firstName && !lastName && !profileImage) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <StatusBar barStyle="light-content" backgroundColor="#3C2610" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingScreen style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2610" />

      {}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Center</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {}
        <LinearGradient
          colors={[
            "rgba(236, 154, 21, 0.15)",
            "rgba(236, 154, 21, 0.05)",
            "transparent",
          ]}
          style={styles.profileHeaderGradient}
        >
          <View style={styles.profileHeader}>
            <TouchableOpacity
              onPress={handlePickImage}
              style={styles.profileImageContainer}
              activeOpacity={0.8}
              disabled={isProcessingImage}
            >
              <View style={styles.profileImageWrapper}>
                {profileImage ? (
                  <Image
                    source={{ uri: profileImage }}
                    style={styles.profileImage}
                    resizeMode="cover"
                    onError={(error) => {
                      setProfileImage(null);
                    }}
                    onLoadStart={() => {
                      
                    }}
                    onLoadEnd={() => {
                      
                    }}
                  />
                ) : (
                  <LinearGradient
                    colors={["#EC9A15", "#FFB84D"]}
                    style={styles.profileImagePlaceholder}
                  >
                    <Text style={styles.profileImageInitials}>
                      {firstName.charAt(0).toUpperCase()}
                      {lastName.charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                )}
                <View style={styles.profileImageOverlay}>
                  <View style={styles.editImageBadge}>
                    <EditIcon color="#fff" />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{fullName}</Text>
              <View style={styles.profileEmailContainer}>
                <Svg
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  style={styles.emailIcon}
                >
                  <Path
                    d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                    stroke="#CAD7D8"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M22 6l-10 7L2 6"
                    stroke="#CAD7D8"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text style={styles.profileEmail}>{email || "No email"}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionTitleIcon}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                    stroke="#EC9A15"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"
                    stroke="#EC9A15"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
              <Text style={styles.sectionTitle}>Personal Details</Text>
            </View>
            {!isEditing && (
              <TouchableOpacity
                style={styles.updateButtonIcon}
                onPress={handleUpdateProfile}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={["#EC9A15", "#FFB84D"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.updateButtonIconGradient}
                >
                  <EditIcon color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderText}>
                {isEditing
                  ? "Edit your information"
                  : "Your account information"}
              </Text>
            </View>
            {}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>First Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Enter first name"
                  placeholderTextColor="#999"
                />
              ) : (
                <Text style={styles.fieldValue}>{firstName || "Not set"}</Text>
              )}
            </View>

            {}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Last Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Enter last name"
                  placeholderTextColor="#999"
                />
              ) : (
                <Text style={styles.fieldValue}>{lastName || "Not set"}</Text>
              )}
            </View>

            {}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Email</Text>
              {isEditing ? (
                <View style={styles.inputWithVerify}>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter email"
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              ) : (
                <Text style={styles.fieldValue}>{email || "Not set"}</Text>
              )}
            </View>

            {}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Mobile Number</Text>
              {isEditing ? (
                <Text style={styles.fieldValue}>
                  {mobile || "Not set"}
                  {"\n"}Changing your mobile number isn&apos;t available yet.
                </Text>
              ) : (
                <Text style={styles.fieldValue}>{mobile || "Not set"}</Text>
              )}
            </View>

            {}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Date of Birth</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#999"
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {dateOfBirth || "Not set"}
                </Text>
              )}
            </View>

            {}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Gender</Text>
              {isEditing ? (
                <View style={styles.genderContainer}>
                  {["Male", "Female", "Non-binary", "Prefer not to say"].map(
                    (g) => (
                      <TouchableOpacity
                        key={g}
                        style={[
                          styles.genderChip,
                          gender === g && styles.genderChipActive,
                        ]}
                        onPress={() => setGender(g)}
                      >
                        <Text
                          style={[
                            styles.genderChipText,
                            gender === g && styles.genderChipTextActive,
                          ]}
                        >
                          {g}
                        </Text>
                      </TouchableOpacity>
                    ),
                  )}
                </View>
              ) : (
                <Text style={styles.fieldValue}>{gender || "Not set"}</Text>
              )}
            </View>

            {}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Role</Text>
              {isEditing ? (
                <View>
                  <View style={styles.genderContainer}>
                    {["participant", "fan"].map((r) => (
                      <TouchableOpacity
                        key={r}
                        style={[
                          styles.genderChip,
                          role === r && styles.genderChipActive,
                        ]}
                        onPress={() => setRole(r)}
                      >
                        <Text
                          style={[
                            styles.genderChipText,
                            role === r && styles.genderChipTextActive,
                          ]}
                        >
                          {r === "participant" ? "Participant" : "Fan"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : (
                <Text style={styles.fieldValue}>
                  {role
                    ? role === "participant"
                      ? "Participant"
                      : "Fan"
                    : "Not set"}
                </Text>
              )}
            </View>

            {}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Bio</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Enter your bio"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              ) : (
                <Text style={styles.fieldValue}>{bio || "Not set"}</Text>
              )}
            </View>

            {}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>
                Describe yourself in three words
              </Text>
              {isEditing ? (
                <View style={styles.threeWordsInputContainer}>
                  <TextInput
                    style={styles.threeWordsInput}
                    placeholder="1st word"
                    placeholderTextColor="#999"
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
                    placeholderTextColor="#999"
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
                    placeholderTextColor="#999"
                    value={threeWords[2]}
                    onChangeText={(text) => {
                      const newWords = [...threeWords];
                      newWords[2] = text;
                      setThreeWords(newWords);
                    }}
                  />
                </View>
              ) : (
                <Text style={styles.fieldValue}>
                  {threeWords.filter((w) => w.trim()).length > 0
                    ? threeWords.filter((w) => w.trim()).join(" | ")
                    : "Not set"}
                </Text>
              )}
            </View>

            {}
            {isEditing && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelEdit}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (!hasChanges || isSaving) && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={!hasChanges || isSaving}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={
                      !hasChanges || isSaving
                        ? ["#666", "#666"]
                        : ["#EC9A15", "#FFB84D"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.saveButtonGradient}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {}
        <View style={styles.section}>
          <View style={styles.sectionTitleContainer}>
            <View style={styles.sectionTitleIcon}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z"
                  stroke="#EC9A15"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M7 11V7a5 5 0 0 1 10 0v4"
                  stroke="#EC9A15"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <Text style={styles.sectionTitle}>Password and Security</Text>
          </View>

          <View style={[styles.card, styles.securityCard]}>
            {}
            <TouchableOpacity
              style={styles.securityOption}
              onPress={handleChangePassword}
              activeOpacity={0.7}
            >
              <View style={styles.securityOptionLeft}>
                <LinearGradient
                  colors={[
                    "rgba(236, 154, 21, 0.2)",
                    "rgba(236, 154, 21, 0.1)",
                  ]}
                  style={styles.securityIconContainer}
                >
                  <LockIcon />
                </LinearGradient>
                <View style={styles.securityOptionText}>
                  <Text style={styles.securityOptionTitle}>
                    Change Password
                  </Text>
                  <Text style={styles.securityOptionSubtitle}>
                    Update your password for better security
                  </Text>
                </View>
              </View>
              <View style={styles.arrowContainer}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M9 18l6-6-6-6"
                    stroke="#EC9A15"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
            </TouchableOpacity>

            {}
            <View style={styles.divider} />

            {}
            <TouchableOpacity
              style={styles.securityOption}
              onPress={handleVerificationSelfie}
              activeOpacity={0.7}
            >
              <View style={styles.securityOptionLeft}>
                <LinearGradient
                  colors={[
                    "rgba(236, 154, 21, 0.2)",
                    "rgba(236, 154, 21, 0.1)",
                  ]}
                  style={styles.securityIconContainer}
                >
                  <CameraIcon />
                </LinearGradient>
                <View style={styles.securityOptionText}>
                  <Text style={styles.securityOptionTitle}>
                    Verification Selfie
                  </Text>
                  <Text style={styles.securityOptionSubtitle}>
                    Verify your identity with a selfie
                  </Text>
                </View>
              </View>
              <View style={styles.arrowContainer}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M9 18l6-6-6-6"
                    stroke="#EC9A15"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <SelfieCaptureModal
        visible={selfieVisible}
        onClose={() => setSelfieVisible(false)}
        onCaptured={() =>
          showToast("Selfie captured. Uploading selfies isn't available yet.", "info")
        }
      />

      {}
      <Modal
        visible={imagePickerVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeImagePicker}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeImagePicker}
        >
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              {}
              <View style={styles.handleBar} />

              {}
              <View style={styles.bottomSheetContent}>
                <TouchableOpacity
                  style={styles.bottomSheetOption}
                  onPress={handleCameraPress}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bottomSheetOptionText}>Take Photo</Text>
                </TouchableOpacity>

                <View style={styles.bottomSheetDivider} />

                <TouchableOpacity
                  style={styles.bottomSheetOption}
                  onPress={handleGalleryPress}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bottomSheetOptionText}>
                    Choose from Library
                  </Text>
                </TouchableOpacity>

                <View style={styles.bottomSheetDivider} />

                <TouchableOpacity
                  style={[styles.bottomSheetOption, styles.bottomSheetCancel]}
                  onPress={closeImagePicker}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bottomSheetCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {}
      {isProcessingImage && (
        <Modal transparent={true} visible={isProcessingImage}>
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#EC9A15" />
              <Text style={styles.loadingText}>Processing image...</Text>
            </View>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingScreen>
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
    fontFamily: "PlayfairDisplay_700Bold",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileHeaderGradient: {
    marginBottom: 24,
    paddingBottom: 30,
  },
  profileHeader: {
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  profileImageContainer: {
    marginBottom: 20,
  },
  profileImageWrapper: {
    position: "relative",
    width: 140,
    height: 140,
  },
  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 5,
    borderColor: "#EC9A15",
  },
  profileImagePlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 5,
    borderColor: "#EC9A15",
  },
  profileImageInitials: {
    fontSize: 42,
    color: "#fff",
    fontFamily: "PlayfairDisplay_700Bold",
  },
  profileImageOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EC9A15",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#3C2610",
    shadowColor: "#EC9A15",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  editImageBadge: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  profileInfo: {
    alignItems: "center",
  },
  profileName: {
    color: "#fff",
    fontSize: 26,
    fontFamily: "PlayfairDisplay_700Bold",
    marginBottom: 8,
    textAlign: "center",
  },
  profileEmailContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emailIcon: {
    marginTop: 2,
  },
  profileEmail: {
    color: "#CAD7D8",
    fontSize: 15,
    fontFamily: "Rubik_400Regular",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  sectionTitleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(236, 154, 21, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "PlayfairDisplay_700Bold",
    flexShrink: 1,
  },
  updateButtonIcon: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#EC9A15",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    width: 44,
    height: 44,
  },
  updateButtonIconGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    width: "100%",
  },
  securityCard: {
    marginTop: 16,
  },
  cardHeader: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A2A",
  },
  cardHeaderText: {
    color: "#CAD7D8",
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  fieldRow: {
    marginBottom: 20,
    width: "100%",
  },
  fieldLabel: {
    color: "#CAD7D8",
    fontSize: 12,
    fontFamily: "Rubik_600SemiBold",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  fieldValue: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Rubik_400Regular",
    paddingVertical: 4,
  },
  input: {
    backgroundColor: "#252525",
    borderRadius: 14,
    padding: 14,
    color: "#fff",
    fontSize: 16,
    fontFamily: "Rubik_400Regular",
    borderWidth: 1.5,
    borderColor: "#3A3A3A",
    width: "100%",
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  threeWordsInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#252525",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#3A3A3A",
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: "100%",
  },
  threeWordsInput: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 12,
    fontSize: 16,
    color: "#fff",
    fontFamily: "Rubik_400Regular",
  },
  threeWordsSeparator: {
    color: "#EC9A15",
    fontSize: 16,
    paddingHorizontal: 4,
    fontFamily: "Rubik_500Medium",
  },
  genderContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    width: "100%",
  },
  genderChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: "#252525",
    borderWidth: 1.5,
    borderColor: "#3A3A3A",
    minWidth: 100,
    flex: 1,
    maxWidth: "48%",
  },
  genderChipActive: {
    backgroundColor: "rgba(236, 154, 21, 0.2)",
    borderColor: "#EC9A15",
    shadowColor: "#EC9A15",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  genderChipText: {
    color: "#999",
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
  },
  genderChipTextActive: {
    color: "#EC9A15",
    fontFamily: "Rubik_600SemiBold",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#2A2A2A",
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#252525",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#3A3A3A",
  },
  cancelButtonText: {
    color: "#CAD7D8",
    fontSize: 16,
    fontFamily: "Rubik_600SemiBold",
  },
  saveButton: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#EC9A15",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Rubik_700Bold",
  },
  securityOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 4,
    width: "100%",
    marginBottom: 8,
  },
  securityOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  securityIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  securityOptionText: {
    flex: 1,
    marginRight: 12,
  },
  securityOptionTitle: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Rubik_600SemiBold",
    marginBottom: 6,
  },
  securityOptionSubtitle: {
    color: "#CAD7D8",
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
    lineHeight: 18,
  },
  arrowContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(236, 154, 21, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#2A2A2A",
    marginVertical: 8,
    marginHorizontal: 4,
  },
  inputWithVerify: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  inputWithButton: {
    flex: 1,
  },
  verifyButton: {
    backgroundColor: "#EC9A15",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
  },
  verifyButtonRole: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  verifyButtonText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Rubik_500Medium",
    textAlign: "center",
  },
  verifiedBadge: {
    backgroundColor: "#25D366",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
  },
  verifiedBadgeRole: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  verifiedText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Rubik_500Medium",
    textAlign: "center",
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: 300,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: "#666",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  bottomSheetContent: {
    paddingHorizontal: 0,
  },
  bottomSheetOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "transparent",
  },
  bottomSheetOptionText: {
    color: "#FFFFFF",
    fontSize: 18,
    textAlign: "center",
    fontWeight: "400",
  },
  bottomSheetDivider: {
    height: 1,
    backgroundColor: "#333",
    marginHorizontal: 20,
  },
  bottomSheetCancel: {
    marginTop: 8,
    borderTopWidth: 8,
    borderTopColor: "#333",
    paddingTop: 20,
  },
  bottomSheetCancelText: {
    color: "#FF3B30",
    fontSize: 18,
    textAlign: "center",
    fontWeight: "600",
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
  },
  loadingText: {
    color: "#FFFFFF",
    marginTop: 12,
    fontSize: 16,
  },
});
