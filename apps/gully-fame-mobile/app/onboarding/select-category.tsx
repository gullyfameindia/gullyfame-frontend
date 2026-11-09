import { useCallback, useEffect, useState } from "react";
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
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { getCategories, updateProfile, Category } from "@api/services/userService";
import { getErrorMessage } from "@api/client";

const { width } = Dimensions.get("window");


export default function OnboardingSelectCategory() {
  const params = useLocalSearchParams();
  const role = params.role ? String(params.role) : "participant";
  const firstName = params.firstName ? safeDecode(String(params.firstName)) : "";
  const lastName = params.lastName ? safeDecode(String(params.lastName)) : "";
  const email = params.email ? safeDecode(String(params.email)) : "";
  const dob = params.dob ? safeDecode(String(params.dob)) : "";
  const gender = params.gender ? safeDecode(String(params.gender)) : "";
  const fromKycFlow = params.fromKycFlow === "true";

  const [options, setOptions] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await getCategories(1, 50);
      setOptions(data.categories);
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const toggleOption = (item: string) => {
    setSelected((prev) => (prev.includes(item) ? prev.filter((value) => value !== item) : [...prev, item]));
  };

  const handleContinue = async (picked: string[] = selected) => {
    if (saving) return;
    if (picked.length === 0) {
      Alert.alert(
        "Choose at least one",
        role === "participant"
          ? "Tell us which stage fits best so we can highlight the right contests."
          : "Pick at least one vibe so we can personalize your feed."
      );
      return;
    }

    // The user profile stores a single category id.
    setSaving(true);
    try {
      await updateProfile({ categories: picked[0] });
    } catch (error) {
      Alert.alert("Could not save", getErrorMessage(error));
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
      `categories=${encodeURIComponent(JSON.stringify(picked))}`,
      fromKycFlow ? `fromKycFlow=true` : '',
    ].filter(Boolean).join("&");

    router.push(`/onboarding/upload-avatar?${query}` as any);
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
              Step <Text style={styles.headerEyebrowNumber}>3</Text> of <Text style={styles.headerEyebrowNumber}>5</Text>
            </Text>
            <Text style={styles.headerTitle}>
              {role === "participant" ? "What's your vibe?" : "What do you love watching?"}
            </Text>
          </View>
        </View>

        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeSubtitle}>
            {role === "participant"
              ? "Pick the categories you want to shine in. We'll surface contests and audiences tailored to your craft."
              : "Choose the moments you never want to miss. We'll tune your feed around them."}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#EC9A15" style={{ marginVertical: 32 }} />
        ) : loadError ? (
          <TouchableOpacity onPress={loadCategories} style={{ marginVertical: 24 }}>
            <Text style={[styles.cardText, { textAlign: "center" }]}>{loadError}</Text>
            <Text style={[styles.cardHelper, { textAlign: "center", marginTop: 8 }]}>Tap to retry</Text>
          </TouchableOpacity>
        ) : options.length === 0 ? (
          <Text style={[styles.cardText, { textAlign: "center", marginVertical: 24 }]}>
            No categories are available yet.
          </Text>
        ) : null}

        <View style={styles.grid}>
          {options.map((item) => {
            const isActive = selected.includes(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, isActive && styles.cardActive]}
                onPress={() => toggleOption(item.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.cardText, isActive && styles.cardTextActive]}>{item.label}</Text>
                <Text style={[styles.cardHelper, isActive && styles.cardHelperActive]}>
                  {role === "participant" ? "Category" : "Interest"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.9}
          onPress={() => handleContinue()}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Continue</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          activeOpacity={0.75}
          onPress={() => {
            if (selected.length === 0 && options.length > 0) {
              setSelected([options[0].id]);
              handleContinue([options[0].id]);
            } else {
              handleContinue();
            }
          }}
        >
          <Text style={styles.secondaryButtonText}>Skip (We&apos;ll guess for now)</Text>
        </TouchableOpacity>
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
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
    textAlign: "left",
    fontFamily: "Rubik_400Regular",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 20,
  },
  card: {
    width: (width - width * 0.12 - 16) / 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 25,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardActive: {
    borderColor: "#EC9A15",
    backgroundColor: "rgba(234, 176, 75, 0.54)",
  },
  cardText: {
    color: "#000",
    fontSize: 15,
    fontFamily: "Rubik_500Medium",
  },
  cardTextActive: {
    color: "#EC9A15",
    fontFamily: "Rubik_500Medium",
  },
  cardHelper: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 2,
    fontFamily: "Rubik_400Regular",
  },
  cardHelperActive: {
    color: "#EC9A15",
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

