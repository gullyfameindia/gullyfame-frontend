import { useState, useEffect } from "react";
import { safeDecode } from "@/utils/routeParams";
import KeyboardAvoidingScreen from "@/components/KeyboardAvoidingScreen";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  TextInput,
  StatusBar,
  Platform,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { updateProfile, toBackendGender } from "@api/services/userService";
import { getErrorMessage } from "@api/client";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

const genders = ["Female", "Male", "Non-binary", "Prefer not to say"];

export default function OnboardingPersonalDetails() {
  const params = useLocalSearchParams();
  const role = params.role ? String(params.role) : "participant";
  const firstName = params.firstName ? safeDecode(String(params.firstName)) : "";
  const lastName = params.lastName ? safeDecode(String(params.lastName)) : "";
  const email = params.email ? safeDecode(String(params.email)) : "";
  const fromVerified = params.fromVerified === "true";
  const fromKycFlow = params.fromKycFlow === "true";

  const [dob, setDob] = useState("");
  const [selectedGender, setSelectedGender] = useState(genders[0]);
  const [saving, setSaving] = useState(false);
  
  
  useEffect(() => {
    if (fromVerified) {
      AsyncStorage.getItem("userDateOfBirth").then((savedDob) => {
        if (savedDob) setDob(savedDob);
      });
      AsyncStorage.getItem("userGender").then((savedGender) => {
        if (savedGender) setSelectedGender(savedGender);
      });
    }
  }, [fromVerified]);

  const formatDOB = (text: string) => {
    
    const digits = text.replace(/\D/g, "");
    
    
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    }
  };

  const handleDobChange = (text: string) => {
    const formatted = formatDOB(text);
    if (formatted.length <= 10) {
      setDob(formatted);
    }
  };

  const handleContinue = async () => {
    if (saving) return;
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dob.trim())) {
      Alert.alert("Missing information", "Please enter your date of birth as DD/MM/YYYY.");
      return;
    }

    setSaving(true);
    try {
      await updateProfile({ dob: dob.trim(), gender: toBackendGender(selectedGender) });
      await AsyncStorage.multiSet([
        ["userDateOfBirth", dob],
        ["userGender", selectedGender],
      ]);
    } catch (error) {
      Alert.alert("Could not save", getErrorMessage(error));
      return;
    } finally {
      setSaving(false);
    }

    if (fromKycFlow) {
      const query = [
        `role=${encodeURIComponent(role)}`,
        `firstName=${encodeURIComponent(firstName)}`,
        `lastName=${encodeURIComponent(lastName)}`,
        `email=${encodeURIComponent(email)}`,
        `dob=${encodeURIComponent(dob)}`,
        `gender=${encodeURIComponent(selectedGender)}`,
        `fromKycFlow=true`,
      ].join("&");
      router.push(`/onboarding/select-category?${query}` as any);
      return;
    }

    
    if (fromVerified) {
      router.replace("/(main)/verified" as any);
      return;
    }

    
    const query = [
      `role=${encodeURIComponent(role)}`,
      `firstName=${encodeURIComponent(firstName)}`,
      `lastName=${encodeURIComponent(lastName)}`,
      `email=${encodeURIComponent(email)}`,
      `dob=${encodeURIComponent(dob)}`,
      `gender=${encodeURIComponent(selectedGender)}`,
    ].join("&");

    router.push(`/onboarding/select-category?${query}` as any);
  };

  return (
    <KeyboardAvoidingScreen style={styles.container}>
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
              Step <Text style={styles.headerEyebrowNumber}>2</Text> of <Text style={styles.headerEyebrowNumber}>5</Text>
            </Text>
            <Text style={styles.headerTitle}>Personal details</Text>
          </View>
        </View>

        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeSubtitle}>Help us tailor contests and opportunities that match your age group and identity.</Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Date of birth</Text>
            <View style={styles.dobContainer}>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#6B7280"
                value={dob}
                onChangeText={handleDobChange}
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>
            <Text style={styles.helperText}>You must be 13+ to participate. We never display this publicly.</Text>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.genderRow}>
              {genders.map((gender) => {
                const isActive = selectedGender === gender;
                return (
                  <TouchableOpacity
                    key={gender}
                    style={[styles.genderChip, isActive && styles.genderChipActive]}
                    onPress={() => setSelectedGender(gender)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.genderChipText, isActive && styles.genderChipTextActive]}>{gender}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.9} onPress={handleContinue}>
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.75} onPress={handleContinue}>
          <Text style={styles.secondaryButtonText}>Skip (You can update later)</Text>
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
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    marginTop: 20,
  },
  fieldBlock: {
    marginBottom: 0,
  },
  fieldLabel: {
    color: "#000",
    fontSize: 16,
    paddingVertical:15,
    letterSpacing: 0,
    fontFamily: "Rubik_500Medium",
  },
  dobContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#D9D9D9",
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#000",
    fontFamily: "Rubik_400Regular",
  },
  helperText: {
    color: "#6A6A6A",
    fontSize: 11,
    marginTop: 10,
    lineHeight: 18,
    fontFamily: "Rubik_400Regular",
  },
  genderRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  genderChip: {
    paddingHorizontal: 18,
    paddingVertical: 5,
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  genderChipActive: {
    backgroundColor: "rgba(234, 176, 75, 0.54)",
    borderColor: "rgba(234, 176, 75, 0.54)",
  },
  genderChipText: {
    color: "#000",
    fontFamily: "Rubik_400Regular",
    fontSize:16,
  },
  genderChipTextActive: {
    color: "#EC9A15",
    fontFamily: "Rubik_500Medium",
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

