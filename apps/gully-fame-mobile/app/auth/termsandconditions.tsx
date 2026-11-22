import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { safeBack } from "@/utils/safeBack";
import { LegalCards, LEGAL_COLORS as C } from "@/components/legal/LegalCards";
import { TERMS_OF_SERVICE, TERMS_OF_SERVICE_TITLE } from "@/content/legal/termsOfService";
import { useTermsText } from "@/hooks/useCmsContent";

/** Terms shown during sign-up: same layout as Settings > Terms of Service, plus an Agree footer. */
export default function TermsAndConditions() {
  const insets = useSafeAreaInsets();
  const remoteText = useTermsText();

  const handleAgree = async () => {
    try {
      await AsyncStorage.setItem("termsAccepted", "true");
    } catch {
      /* still go back; the sign-up screen asks again if it was not saved */
    }
    safeBack();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={10}
          onPress={() => safeBack()}
          style={styles.headerSide}
        >
          <Ionicons name="chevron-back" size={28} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <LegalCards title={TERMS_OF_SERVICE_TITLE} sections={TERMS_OF_SERVICE} plainText={remoteText} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <Text style={styles.footerHint}>
          By tapping <Text style={styles.footerHintStrong}>I Agree</Text>, you accept these Terms and our Privacy Policy.
        </Text>
        <TouchableOpacity
          style={styles.agreeButton}
          onPress={handleAgree}
          activeOpacity={0.85}
          accessibilityRole="button"
          testID="terms-agree"
        >
          <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
          <Text style={styles.agreeButtonText}>I Agree</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerSide: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: C.text,
    fontSize: 20,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  footerHint: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    marginBottom: 12,
    fontFamily: "Inter_400Regular",
  },
  footerHintStrong: {
    color: C.accent,
    fontFamily: "Inter_600SemiBold",
  },
  agreeButton: {
    flexDirection: "row",
    gap: 8,
    height: 54,
    borderRadius: 14,
    backgroundColor: C.accent,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  agreeButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
});
