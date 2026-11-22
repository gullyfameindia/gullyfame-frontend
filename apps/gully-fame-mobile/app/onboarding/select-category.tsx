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
import { safeBack } from "@/utils/safeBack";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { colors, font, radius, space, type } from "@/theme/tokens";
import { getCategories, updateProfile, Category } from "@api/services/userService";
import { getErrorMessage } from "@api/client";
import { SkeletonGrid } from "@/components/Skeleton/Skeleton";

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
      // The server may send `name`/`_id` instead of `label`/`id`; accept either.
      const raw = (data?.categories ?? (Array.isArray(data) ? data : [])) as any[];
      setOptions(
        raw
          .map((c) => ({ ...c, id: String(c.id ?? c._id ?? ""), label: String(c.label ?? c.name ?? c.title ?? "") }))
          .filter((c) => c.id && c.label)
      );
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

  const handleContinue = async (picked: string[] = selected, skipping = false) => {
    if (saving) return;
    if (picked.length === 0 && !skipping) {
      Alert.alert(
        "Choose at least one",
        role === "participant"
          ? "Tell us which stage fits best so we can highlight the right contests."
          : "Pick at least one vibe so we can personalize your feed."
      );
      return;
    }

    // The user profile stores a single category id.
    if (picked.length > 0) {
      setSaving(true);
      try {
        await updateProfile({ categories: picked[0] });
      } catch (error) {
        // Skipping must never be blocked by a failed save.
        if (!skipping) {
          Alert.alert("Could not save", getErrorMessage(error));
          return;
        }
      } finally {
        setSaving(false);
      }
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
              Step <Text style={styles.headerEyebrowNumber}>3</Text> of <Text style={styles.headerEyebrowNumber}>5</Text>
            </Text>
            <Text style={styles.headerTitle}>
              {role === "participant" ? "What do you perform?" : "What do you like to watch?"}
            </Text>
          </View>
        </View>

        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeSubtitle}>
            {role === "participant"
              ? "Pick one or more. We'll show you contests in these categories."
              : "Pick one or more. Your feed will show more of these."}
          </Text>
        </View>

        {loading ? (
          <SkeletonGrid count={6} columns={2} aspectRatio={1.6} />
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
                <Text style={[styles.cardText, isActive && styles.cardTextActive]} numberOfLines={2}>{item.label}</Text>
                {isActive ? <Ionicons name="checkmark-circle" size={18} color={colors.accent} /> : null}
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
            handleContinue(selected, true);
          }}
        >
          <Text style={styles.secondaryButtonText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
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
  welcomeCard: { paddingTop: space.md, paddingBottom: space.sm },
  welcomeSubtitle: { ...type.body },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: space.md },
  card: {
    width: (width - space.lg * 2 - space.md) / 2,
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: space.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  cardText: { flex: 1, color: colors.text, fontSize: 15, fontFamily: font.medium },
  cardTextActive: { color: colors.accent, fontFamily: font.semibold },
  cardHelper: { ...type.caption },
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
