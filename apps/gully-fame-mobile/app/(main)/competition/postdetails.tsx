import { useMemo, useState } from "react";
import { safeDecode } from "@/utils/routeParams";
import KeyboardAvoidingScreen from "@/components/KeyboardAvoidingScreen";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  Platform,
  Dimensions,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Path } from "react-native-svg";

const { width } = Dimensions.get("window");

const categoryOptions = [
  "Hip-Hop",
  "Freestyle",
  "Classical",
  "Bollywood",
  "Street",
  "Folk",
  "Jazz",
  "Contemporary",
];

export default function PostDetailsScreen() {
  const params = useLocalSearchParams();

  const imageUri = params.imageUri ? safeDecode(String(params.imageUri)) : undefined;
  const competitionId = params.competitionId ? String(params.competitionId) : "";
  const competitionNameParam = params.competitionName ? String(params.competitionName) : "";
  const entryFeeParam = params.entryFee ? String(params.entryFee) : "";

  const competitionName = competitionNameParam ? safeDecode(competitionNameParam) : "Gully Fame Competition";
  const entryFee = entryFeeParam ? safeDecode(entryFeeParam) : "Free Entry";

  const [caption, setCaption] = useState(
    params.caption ? safeDecode(String(params.caption)) : ""
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(
    params.category ? safeDecode(String(params.category)) : categoryOptions[0]
  );
  const [makePublic, setMakePublic] = useState(true);
  const [allowMentions, setAllowMentions] = useState(true);
  const [enableTips, setEnableTips] = useState(true);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);

  const truncatedCompetitionName = useMemo(() => {
    if (competitionName.length > 28) {
      return `${competitionName.slice(0, 28)}…`;
    }
    return competitionName;
  }, [competitionName]);

  const handleSubmit = () => {
    if (!guidelinesAccepted) {
      Alert.alert("Action required", "Please agree to the GFI Community Guidelines before submitting.");
      return;
    }

    const encodedCaption = encodeURIComponent(caption);
    const encodedCategory = encodeURIComponent(selectedCategory);
    const encodedCompetitionName = encodeURIComponent(competitionName);
    const encodedEntryFee = encodeURIComponent(entryFee);

    router.push(
      `/(main)/competition/verify?competitionId=${competitionId}&competitionName=${encodedCompetitionName}&entryFee=${encodedEntryFee}&imageUri=${
        params.imageUri ?? ""
      }&caption=${encodedCaption}&category=${encodedCategory}&makePublic=${makePublic}&allowMentions=${allowMentions}&enableTips=${enableTips}` as any
    );
  };

  const renderCategoryChip = (category: string) => {
    const isActive = selectedCategory === category;
    return (
      <TouchableOpacity
        key={category}
        style={[styles.categoryChip, isActive && styles.categoryChipActive]}
        onPress={() => setSelectedCategory(category)}
        activeOpacity={0.85}
      >
        <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>{category}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingScreen style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2610" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Post Details</Text>
          <TouchableOpacity style={styles.headerSpacer} activeOpacity={0.9} onPress={handleSubmit}>
            <Text style={styles.headerActionText}>Submit Post</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mediaCard}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.mediaPreview} />
          ) : (
            <View style={styles.emptyMedia}>
              <Text style={styles.emptyMediaText}>No preview available</Text>
            </View>
          )}
          <View style={styles.captionContainer}>
            <Text style={styles.captionLabel}>Add a Caption</Text>
            <TextInput
              style={styles.captionInput}
              placeholder="Write something about your amazing dance..."
              placeholderTextColor="#9CA3AF"
              multiline
              value={caption}
              onChangeText={setCaption}
              maxLength={300}
            />
            <Text style={styles.captionHelper}>#StreetMoves #GFCompetition</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesRow}
          >
            {categoryOptions.map(renderCategoryChip)}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleTitle}>Make Post Public</Text>
              <Text style={styles.toggleSubtitle}>Visible to all users on timelines</Text>
            </View>
            <Switch value={makePublic} onValueChange={setMakePublic} trackColor={{ true: "#FF8C00" }} />
          </View>

          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleTitle}>Tag Dancers</Text>
              <Text style={styles.toggleSubtitle}>@Mention your friends or crew members</Text>
            </View>
            <Switch value={allowMentions} onValueChange={setAllowMentions} trackColor={{ true: "#FF8C00" }} />
          </View>

          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleTitle}>Enable Tips for this Post</Text>
              <Text style={styles.toggleSubtitle}>Allow fans to send you love instantly</Text>
            </View>
            <Switch value={enableTips} onValueChange={setEnableTips} trackColor={{ true: "#FF8C00" }} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.linkHeader}>
            <Text style={styles.sectionTitle}>Link to Competition</Text>
            <TouchableOpacity style={styles.changeButton} activeOpacity={0.7}>
              <Text style={styles.changeButtonText}>Change</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.linkCard} activeOpacity={0.8}>
            <View style={styles.linkCardImageWrapper}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.linkCardImage} />
              ) : (
                <View style={styles.linkCardPlaceholder}>
                  <Text style={styles.linkCardPlaceholderText}>GFI</Text>
                </View>
              )}
            </View>
            <View style={styles.linkCardContent}>
              <Text style={styles.linkCardTitle}>{truncatedCompetitionName}</Text>
              <Text style={styles.linkCardSubtitle}>Entry Fee: {entryFee}</Text>
            </View>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="M9 18l6-6-6-6" stroke="#EC9A15" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
        </View>

        <View style={styles.guidelinesRow}>
          <TouchableOpacity
            style={[styles.checkbox, guidelinesAccepted && styles.checkboxChecked]}
            onPress={() => setGuidelinesAccepted((prev) => !prev)}
            activeOpacity={0.7}
          >
            {guidelinesAccepted && (
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M20 6L9 17l-5-5" stroke="#0B0B0B" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            )}
          </TouchableOpacity>
          <Text style={styles.guidelinesText}>I agree to GFI Community Guidelines</Text>
        </View>

        <TouchableOpacity style={styles.submitButton} activeOpacity={0.85} onPress={handleSubmit}>
          <LinearGradient
            colors={['#FF6B35', '#FF8C00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.submitGradient}
          >
            <Text style={styles.submitButtonText}>Continue to Identity Verification</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3C2610",
    paddingTop: Platform.OS === "android" ? 20 : 0,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
  },
  headerSpacer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255,108,54,0.2)",
    borderRadius: 16,
  },
  headerActionText: {
    color: "#FF8C00",
    fontSize: 13,
  },
  mediaCard: {
    marginHorizontal: 20,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
  },
  mediaPreview: {
    width: "100%",
    height: width * 0.55,
  },
  emptyMedia: {
    width: "100%",
    height: width * 0.55,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f1f1f",
  },
  emptyMediaText: {
    color: "#777",
    fontSize: 14,
  },
  captionContainer: {
    padding: 16,
    backgroundColor: "#121212",
  },
  captionLabel: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 8,
  },
  captionInput: {
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    padding: 12,
    color: "#fff",
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#2F2F2F",
    textAlignVertical: "top",
  },
  captionHelper: {
    color: "#FF8C00",
    marginTop: 8,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 12,
  },
  categoriesRow: {
    flexDirection: "row",
    gap: 10,
  },
  categoryChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#2b2b2b",
  },
  categoryChipActive: {
    borderColor: "#FF8C00",
    backgroundColor: "rgba(255,108,54,0.18)",
  },
  categoryChipText: {
    color: "#ccc",
    fontSize: 13,
  },
  categoryChipTextActive: {
    color: "#FF8C00",
  },
  toggleRow: {
    backgroundColor: "#121212",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1f1f1f",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleTitle: {
    color: "#fff",
    fontSize: 14,
  },
  toggleSubtitle: {
    color: "#888",
    fontSize: 12,
    marginTop: 4,
    maxWidth: width * 0.55,
  },
  linkHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  changeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(255,108,54,0.15)",
  },
  changeButtonText: {
    color: "#FF8C00",
    fontSize: 12,
  },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#121212",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  linkCardImageWrapper: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 12,
    backgroundColor: "#1f1f1f",
    alignItems: "center",
    justifyContent: "center",
  },
  linkCardImage: {
    width: "100%",
    height: "100%",
  },
  linkCardPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#222",
  },
  linkCardPlaceholderText: {
    color: "#FF8C00",
    fontSize: 16,
  },
  linkCardContent: {
    flex: 1,
  },
  linkCardTitle: {
    color: "#fff",
    fontSize: 14,
  },
  linkCardSubtitle: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 4,
  },
  guidelinesRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 24,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#FF8C00",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkboxChecked: {
    backgroundColor: "#FF8C00",
  },
  guidelinesText: {
    color: "#fff",
    fontSize: 13,
    flex: 1,
    flexWrap: "wrap",
  },
  submitButton: {
    marginHorizontal: 20,
    marginTop: 28,
    borderRadius: 16,
    overflow: "hidden",
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 15,
  },
});

