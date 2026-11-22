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
import { safeBack } from "@/utils/safeBack";
import { toBackendGender, genderLabel } from "@/api/services/userService";
import { toastSuccess } from "@/components/ui/Toast";
import { useFocusEffect } from "expo-router/react-navigation";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { authService } from "@api/services/authService";
import { BackIcon, CameraIcon, EditIcon, LockIcon } from "@/icons";
import { showPermissionSettingsAlert } from "@/utils/permissionSettings";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateOfBirthCalendar from "@/components/ui/DateOfBirthCalendar";
import ChangeMobilePopup from "@/components/account/ChangeMobilePopup";
import ChangeEmailPopup from "@/components/account/ChangeEmailPopup";
import { SkeletonDetail } from "@/components/Skeleton/Skeleton";


export default function AccountCenterScreen() {
  const insets = useSafeAreaInsets();
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
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [slideAnim] = React.useState(() => new Animated.Value(0));

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [originalData, setOriginalData] = useState<any>({});
  const [originalRole, setOriginalRole] = useState<string>("");
  const [originalEmail, setOriginalEmail] = useState<string>("");
  const [originalMobile, setOriginalMobile] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [fullNameInput, setFullNameInput] = useState("");
  const [openDropdown, setOpenDropdown] = useState<null | "gender" | "role">(null);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [mobilePopupVisible, setMobilePopupVisible] = useState(false);
  const [emailPopupVisible, setEmailPopupVisible] = useState(false);
  // Public/private choice per field (email, mobile, gender, dob). Kept on this device only.
  const [fieldPublic, setFieldPublic] = useState<Record<string, boolean>>({}); 

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
  // Full name box follows the saved first/last name whenever the user isn't typing in it.
  useEffect(() => {
    if (!isEditingRef.current) setFullNameInput(`${firstName} ${lastName}`.trim());
  }, [firstName, lastName]);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem("accountFieldVisibility")
      .then((raw) => {
        if (raw) setFieldPublic(JSON.parse(raw));
      })
      .catch(() => {});
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
      // Email is changed through ChangeEmailPopup (verified with a code), not this form.
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
  // The selfie is taken and uploaded as part of KYC verification.
  const handleVerificationSelfie = () => {
    router.push("/(main)/settings/kyc-status" as any);
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
        <SkeletonDetail avatar style={{ alignSelf: "stretch" }} />
      </View>
    );
  }

  const privacyFor = (key: string) => ({
    isPublic: !!fieldPublic[key],
    onToggle: () => {
      const next = { ...fieldPublic, [key]: !fieldPublic[key] };
      setFieldPublic(next);
      AsyncStorage.setItem("accountFieldVisibility", JSON.stringify(next)).catch(() => {});
    },
  });

  // Splits the single name box into first name (first word) and last name (the rest).
  const handleFullNameChange = (text: string) => {
    setFullNameInput(text);
    const parts = text.trim().split(/\s+/).filter(Boolean);
    setFirstName(parts[0] ?? "");
    setLastName(parts.slice(1).join(" "));
  };

  const startEditing = () => {
    if (!isEditing) handleUpdateProfile();
  };

  const roleLabel = role ? (role === "participant" ? "Participant" : "Fan") : "";
  const threeWordsLabel = threeWords.filter((w) => w.trim()).join(" | ");

  return (
    <KeyboardAvoidingScreen style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10}
          onPress={() => safeBack("/(main)/home")}
          style={styles.headerSide}
        >
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Center</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={isEditing ? "Cancel editing" : "Edit profile"}
          hitSlop={10}
          onPress={isEditing ? handleCancelEdit : handleUpdateProfile}
          style={[styles.headerSide, styles.headerSideRight]}
          disabled={isSaving}
        >
          <Text style={styles.headerAction}>{isEditing ? "Cancel" : "Edit"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isEditing && { paddingBottom: 110 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>
          Manage your personal information and keep your account secure.
        </Text>

        {/* Profile summary */}
        <Text style={styles.sectionTitle}>Profile Summary</Text>
        <View style={[styles.card, styles.summaryCard]}>
          <TouchableOpacity
            onPress={handlePickImage}
            activeOpacity={0.8}
            disabled={isProcessingImage}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
          >
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.avatar}
                resizeMode="cover"
                onError={() => setProfileImage(null)}
              />
            ) : (
              <LinearGradient colors={[C.accent, C.accentLight]} style={styles.avatar}>
                <Text style={styles.avatarInitials}>
                  {firstName.charAt(0).toUpperCase()}
                  {lastName.charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
            )}
            <View style={styles.avatarBadge}>
              <EditIcon color="#fff" />
            </View>
          </TouchableOpacity>
          <View style={styles.summaryText}>
            <Text style={styles.summaryName} numberOfLines={1}>{fullName}</Text>
            <Text style={styles.summarySub} numberOfLines={1}>{email || "No email"}</Text>
            {!!roleLabel && (
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>{roleLabel}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Personal details */}
        <Text style={styles.sectionTitle}>Personal Details</Text>
        <View style={[styles.card, styles.groupCard]}>
          <Text style={styles.groupLabel}>Basic Info</Text>

          <FieldRow label="Full name" value={fullNameInput} editing={isEditing} onPress={startEditing}>
            <TextInput
              style={styles.input}
              value={fullNameInput}
              onChangeText={handleFullNameChange}
              placeholder="Enter full name"
              placeholderTextColor={C.placeholder}
            />
          </FieldRow>

          <FieldRow
            label="Date of birth"
            privacy={privacyFor("dob")}
            value={dateOfBirth}
            editing={isEditing}
            onPress={startEditing}
          >
            <DropdownTrigger
              value={dateOfBirth}
              placeholder="Select date of birth"
              onPress={() => setCalendarVisible(true)}
            />
          </FieldRow>

          <FieldRow label="Gender" privacy={privacyFor("gender")} value={gender} editing={isEditing} onPress={startEditing}>
            <DropdownTrigger value={gender} placeholder="Select gender" onPress={() => setOpenDropdown("gender")} />
          </FieldRow>

          <FieldRow label="Role" value={roleLabel} editing={isEditing} onPress={startEditing} last>
            <DropdownTrigger value={roleLabel} placeholder="Select role" onPress={() => setOpenDropdown("role")} />
          </FieldRow>
        </View>

        <View style={[styles.card, styles.groupCard]}>
          <Text style={styles.groupLabel}>Contact Info</Text>

          <FieldRow
            label="Email"
            privacy={privacyFor("email")}
            value={email}
            editing={false}
            onPress={() => setEmailPopupVisible(true)}
            caption="We'll send a code to confirm a new address. Tap to change it."
          />

          <FieldRow
            label="Phone number"
            privacy={privacyFor("mobile")}
            value={mobile}
            editing={false}
            onPress={() => setMobilePopupVisible(true)}
            caption="We use this to help secure your account. Tap to change it."
            last
          />
        </View>

        <View style={[styles.card, styles.groupCard]}>
          <Text style={styles.groupLabel}>About You</Text>

          <FieldRow label="Bio" value={bio} editing={isEditing} onPress={startEditing} stacked>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Enter your bio"
              placeholderTextColor={C.placeholder}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </FieldRow>

          <FieldRow
            label="Three words"
            value={threeWordsLabel}
            editing={isEditing}
            onPress={startEditing}
            last
          >
            <View style={styles.threeWordsRow}>
              {[0, 1, 2].map((i) => (
                <TextInput
                  key={i}
                  style={[styles.input, styles.threeWordsInput]}
                  placeholder={["1st word", "2nd word", "3rd word"][i]}
                  placeholderTextColor={C.placeholder}
                  value={threeWords[i]}
                  onChangeText={(text) => {
                    const newWords = [...threeWords];
                    newWords[i] = text;
                    setThreeWords(newWords);
                  }}
                />
              ))}
            </View>
          </FieldRow>
        </View>

        {/* Password and security */}
        <Text style={styles.sectionTitle}>Password & Security</Text>
        <ActionCard
          icon={<LockIcon />}
          title="Change password"
          subtitle="Update your password for better security"
          onPress={handleChangePassword}
        />
        <ActionCard
          icon={<CameraIcon />}
          title="Verification selfie"
          subtitle="Verify your identity with a selfie"
          onPress={handleVerificationSelfie}
        />
      </ScrollView>

      {/* Sticky save bar */}
      {isEditing && (
        <View style={[styles.saveBar, { paddingBottom: 12 + insets.bottom }]}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Save changes"
            style={styles.saveButton}
            onPress={handleSave}
            disabled={!hasChanges || isSaving}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={!hasChanges || isSaving ? [C.disabled, C.disabled] : [C.accent, C.accentLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButtonGradient}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.saveButtonText, !hasChanges && styles.saveButtonTextDisabled]}>
                  Save Changes
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
      <ChangeMobilePopup
        visible={mobilePopupVisible}
        currentMobile={mobile}
        onClose={() => setMobilePopupVisible(false)}
        onChanged={(newMobile) => {
          setMobilePopupVisible(false);
          setMobile(newMobile);
          setOriginalMobile(newMobile);
          setOriginalData((prev: any) => ({ ...prev, mobile: newMobile }));
          AsyncStorage.setItem("userMobile", newMobile).catch(() => {});
          toastSuccess("Your mobile number has been updated");
        }}
      />

      <ChangeEmailPopup
        visible={emailPopupVisible}
        currentEmail={email}
        onClose={() => setEmailPopupVisible(false)}
        onChanged={(newEmail) => {
          setEmailPopupVisible(false);
          setEmail(newEmail);
          setOriginalEmail(newEmail);
          setOriginalData((prev: any) => ({ ...prev, email: newEmail }));
          AsyncStorage.setItem("userEmail", newEmail).catch(() => {});
          toastSuccess("Your email address has been updated");
        }}
      />

      <DateOfBirthCalendar
        visible={calendarVisible}
        value={dateOfBirth}
        onClose={() => setCalendarVisible(false)}
        onSelect={(v) => {
          setDateOfBirth(v);
          setCalendarVisible(false);
        }}
      />

      {/* Dropdown sheet for gender / role */}
      <Modal
        transparent={true}
        visible={openDropdown !== null}
        animationType="fade"
        onRequestClose={() => setOpenDropdown(null)}
      >
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setOpenDropdown(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.dropdownSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.dropdownTitle}>
              {openDropdown === "role" ? "Select role" : "Select gender"}
            </Text>
            {(openDropdown === "role" ? ROLE_OPTIONS : GENDER_OPTIONS).map((opt) => {
              const selected = openDropdown === "role" ? role === opt.value : gender === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.dropdownOption, selected && styles.dropdownOptionActive]}
                  onPress={() => {
                    if (openDropdown === "role") setRole(opt.value);
                    else setGender(opt.value);
                    setOpenDropdown(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dropdownOptionText, selected && styles.dropdownOptionTextActive]}>
                    {opt.label}
                  </Text>
                  {selected && <Text style={styles.dropdownCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>


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

// App theme (brown + orange) applied to the grouped-list layout.
const C = {
  bg: "#3C2610",
  card: "#1A1A1A",
  cardBorder: "#2A2A2A",
  divider: "#2A2A2A",
  inputBg: "#252525",
  inputBorder: "#3A3A3A",
  accent: "#EC9A15",
  accentLight: "#FFB84D",
  accentSoft: "rgba(236, 154, 21, 0.15)",
  text: "#FFFFFF",
  muted: "#CAD7D8",
  faint: "#8A8F90",
  placeholder: "#999",
  disabled: "#555",
};

function Chevron() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={C.faint} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SmallLock() {
  return (
    <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
      <Path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z" fill={C.faint} />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={C.faint} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

type FieldRowProps = {
  label: string;
  value?: string;
  editing: boolean;
  onPress?: () => void;
  caption?: string;
  captionLock?: boolean;
  showChevron?: boolean;
  stacked?: boolean;
  last?: boolean;
  privacy?: { isPublic: boolean; onToggle: () => void };
  children?: React.ReactNode;
};

/** Public / Private switch shown beside a field label. */
function PrivacyPill({ isPublic, onToggle }: { isPublic: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.7}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={isPublic ? "Shown publicly. Tap to make private" : "Private. Tap to make public"}
      style={[styles.privacyPill, isPublic ? styles.privacyPublic : styles.privacyPrivate]}
    >
      <Text style={[styles.privacyText, isPublic ? styles.privacyTextPublic : styles.privacyTextPrivate]}>
        {isPublic ? "Public" : "Private"}
      </Text>
    </TouchableOpacity>
  );
}

/** One row of a grouped card: label on the left, value + chevron on the right; the editor below it while editing. */
function FieldRow({ label, value, editing, onPress, caption, captionLock, showChevron = true, stacked, last, privacy, children }: FieldRowProps) {
  const pill = privacy ? <PrivacyPill isPublic={privacy.isPublic} onToggle={privacy.onToggle} /> : null;

  const captionEl = caption ? (
    <View style={styles.captionRow}>
      {captionLock && <SmallLock />}
      <Text style={styles.caption}>{caption}</Text>
    </View>
  ) : null;

  if (editing && children) {
    return (
      <View style={[styles.row, styles.rowEditing, last && styles.rowLast]}>
        <View style={styles.labelGroup}>
          <Text style={styles.editLabel}>{label}</Text>
          {pill}
        </View>
        {children}
        {captionEl}
      </View>
    );
  }

  const valueText = value && value.trim() ? value : "Not set";
  const isEmpty = valueText === "Not set";
  const labelEl = (
    <View style={styles.labelGroup}>
      <Text style={styles.rowLabel}>{label}</Text>
      {pill}
    </View>
  );

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.6 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.row, last && styles.rowLast]}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${label}: ${valueText}`}
    >
      {stacked ? (
        <View style={styles.rowStacked}>
          <View style={styles.rowTop}>
            {labelEl}
            {showChevron && onPress && <Chevron />}
          </View>
          <Text style={[styles.rowValueStacked, isEmpty && styles.rowValueEmpty]}>{valueText}</Text>
        </View>
      ) : (
        <View style={styles.rowTop}>
          <View style={styles.rowLabelWrap}>{labelEl}</View>
          <View style={styles.rowRight}>
            <Text style={[styles.rowValue, isEmpty && styles.rowValueEmpty]} numberOfLines={1}>
              {valueText}
            </Text>
            {showChevron && onPress && <Chevron />}
          </View>
        </View>
      )}
      {captionEl}
    </TouchableOpacity>
  );
}

function ActionCard({ icon, title, subtitle, onPress }: { icon: React.ReactNode; title: string; subtitle: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.card, styles.actionCard]} onPress={onPress} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={title}>
      <View style={styles.actionIcon}>{icon}</View>
      <View style={styles.actionText}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Chevron />
    </TouchableOpacity>
  );
}

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Non-binary", label: "Non-binary" },
  { value: "Prefer not to say", label: "Prefer not to say" },
];

const ROLE_OPTIONS = [
  { value: "participant", label: "Participant" },
  { value: "fan", label: "Fan" },
];

/** Tappable box that shows the current choice and opens the dropdown sheet. */
function DropdownTrigger({ value, placeholder, onPress }: { value: string; placeholder: string; onPress: () => void }) {
  const hasValue = !!value;
  return (
    <TouchableOpacity style={styles.dropdown} onPress={onPress} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={placeholder}>
      <Text style={[styles.dropdownText, !hasValue && styles.dropdownPlaceholder]}>{hasValue ? value : placeholder}</Text>
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path d="M6 9l6 6 6-6" stroke={C.accent} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </TouchableOpacity>
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
    width: 64,
    height: 44,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingLeft: 4,
  },
  headerSideRight: {
    alignItems: "flex-end",
    paddingLeft: 0,
    paddingRight: 4,
  },
  headerTitle: {
    color: C.text,
    fontSize: 20,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  headerAction: {
    color: C.accent,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  subtitle: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 19,
    fontFamily: "PlayfairDisplay_700Bold",
    marginBottom: 10,
    marginTop: 8,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },

  // Profile summary
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginBottom: 20,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: C.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    fontSize: 24,
    color: C.text,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  avatarBadge: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.accent,
    borderWidth: 3,
    borderColor: C.card,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryText: {
    flex: 1,
    marginLeft: 16,
  },
  summaryName: {
    color: C.text,
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  summarySub: {
    color: C.muted,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  rolePill: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: C.accentSoft,
  },
  rolePillText: {
    color: C.accent,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },

  // Grouped rows
  groupCard: {
    paddingHorizontal: 14,
    paddingTop: 12,
    marginBottom: 14,
  },
  groupLabel: {
    color: C.text,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.divider,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowEditing: {
    paddingVertical: 12,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLabelWrap: {
    marginRight: 12,
  },
  rowLabel: {
    color: C.text,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  rowRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  rowValue: {
    color: C.muted,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    flexShrink: 1,
    textAlign: "right",
  },
  rowValueEmpty: {
    color: C.faint,
    fontStyle: "italic",
  },
  rowStacked: {
    width: "100%",
  },
  rowValueStacked: {
    color: C.muted,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: "Inter_400Regular",
    marginTop: 6,
  },
  captionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  caption: {
    color: C.faint,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Inter_400Regular",
    flexShrink: 1,
  },
  editLabel: {
    color: C.muted,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginBottom: 8,
  },
  input: {
    backgroundColor: C.inputBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    borderColor: C.inputBorder,
    width: "100%",
  },
  bioInput: {
    minHeight: 84,
    textAlignVertical: "top",
  },
  threeWordsRow: {
    flexDirection: "row",
    gap: 8,
  },
  threeWordsInput: {
    flex: 1,
    width: undefined,
    paddingHorizontal: 10,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.inputBorder,
  },
  chipActive: {
    backgroundColor: C.accentSoft,
    borderColor: C.accent,
  },
  chipText: {
    color: C.muted,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  chipTextActive: {
    color: C.accent,
    fontFamily: "Inter_600SemiBold",
  },

  // Security action cards
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginBottom: 12,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.accentSoft,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  actionText: {
    flex: 1,
    marginRight: 8,
  },
  actionTitle: {
    color: C.text,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  actionSubtitle: {
    color: C.faint,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },

  // Sticky save bar
  saveBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: C.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  saveButton: {
    borderRadius: 26,
    overflow: "hidden",
  },
  saveButtonGradient: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  saveButtonTextDisabled: {
    color: "#BBB",
  },

  labelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  privacyPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  privacyPublic: {
    backgroundColor: C.accentSoft,
    borderColor: C.accent,
  },
  privacyPrivate: {
    backgroundColor: "transparent",
    borderColor: C.inputBorder,
  },
  privacyText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  privacyTextPublic: {
    color: C.accent,
  },
  privacyTextPrivate: {
    color: C.faint,
  },

  // Dropdown (gender / role)
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.inputBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.inputBorder,
  },
  dropdownText: {
    color: C.text,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  dropdownPlaceholder: {
    color: C.placeholder,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  dropdownSheet: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 10,
  },
  dropdownTitle: {
    color: C.muted,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 10,
  },
  dropdownOptionActive: {
    backgroundColor: C.accentSoft,
  },
  dropdownOptionText: {
    color: C.text,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  dropdownOptionTextActive: {
    color: C.accent,
    fontFamily: "Inter_600SemiBold",
  },
  dropdownCheck: {
    color: C.accent,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },

  // Photo picker sheet + processing overlay (unchanged)
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
