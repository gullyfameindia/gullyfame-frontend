import { useState, useEffect } from "react";
import { colors, font, radius, space, type } from "@/theme/tokens";
import { safeDecode } from "@/utils/routeParams";
import KeyboardAvoidingScreen from "@/components/KeyboardAvoidingScreen";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StatusBar,
  Platform,
  Alert,
} from "react-native";
import { safeBack } from "@/utils/safeBack";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { updateProfile, toBackendGender, applyReferralCode } from "@api/services/userService";
import { getErrorMessage } from "@api/client";
import AsyncStorage from "@react-native-async-storage/async-storage";


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
  // Optional friend's referral code (new accounts only; checked by the server).
  const [referralCode, setReferralCode] = useState("");
  
  
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
      setSaving(false);
      Alert.alert("Could not save", getErrorMessage(error));
      return;
    }

    // Friend's referral code, if entered. On a problem the user can fix it or go on without it.
    const code = referralCode.trim();
    if (code) {
      try {
        await applyReferralCode(code);
        setReferralCode("");
      } catch (error) {
        setSaving(false);
        Alert.alert("Referral code", getErrorMessage(error), [
          { text: "Edit code", style: "cancel" },
          {
            text: "Continue without code",
            onPress: () => {
              setReferralCode("");
              goNext();
            },
          },
        ]);
        return;
      }
    }
    setSaving(false);
    goNext();
  };

  const goNext = () => {
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
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => safeBack()} style={styles.headerBackButton}>
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
          <Text style={styles.welcomeSubtitle}>We use this to put you in the right age group for contests.</Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Date of birth</Text>
            <View style={styles.dobContainer}>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/YYYY"
                placeholderTextColor={colors.placeholder}
                value={dob}
                onChangeText={handleDobChange}
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>
            <Text style={styles.helperText}>You must be 13+ to participate. We never display this publicly.</Text>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Referral code (optional)</Text>
            <View style={styles.dobContainer}>
              <TextInput
                style={styles.input}
                placeholder="e.g. GULLY123"
                placeholderTextColor={colors.placeholder}
                value={referralCode}
                onChangeText={(t) => setReferralCode(t.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
              />
            </View>
            <Text style={styles.helperText}>You and your friend both get GFI coins once your profile is complete and your account is 3 days old.</Text>
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
          <Text style={styles.secondaryButtonText}>Skip for now</Text>
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
  formCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
  },
  fieldBlock: { marginTop: space.lg },
  fieldLabel: { ...type.label, marginBottom: space.sm },
  dobContainer: { backgroundColor: colors.field, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line },
  input: { paddingHorizontal: 14, height: 46, fontSize: 14, color: colors.text, fontFamily: font.regular },
  helperText: { ...type.caption, marginTop: 6 },
  genderRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  genderChip: {
    paddingHorizontal: 14,
    height: 36,
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.line,
  },
  genderChipActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  genderChipText: { color: colors.text, fontFamily: font.medium, fontSize: 14 },
  genderChipTextActive: { color: colors.accent, fontFamily: font.semibold },
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
