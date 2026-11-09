import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform, Linking, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SUPPORT_EMAIL } from "@/utils/moderation";

// Public page describing the same process; this is the URL entered in the Google Play listing.
const WEB_DELETION_URL = "https://gullyfameindia.com/delete-account";

/**
 * In-app account deletion request.
 *
 * The backend has no "delete account" endpoint yet, so the request is sent to support by email
 * (pre-filled with the account id, no other personal data). When an endpoint exists, replace
 * `requestDeletion` with that call; the screen and the Play listing link do not need to change.
 */
export default function DeleteAccountScreen() {
  const [busy, setBusy] = useState(false);

  const requestDeletion = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const userId = (await AsyncStorage.getItem("userId")) || "";
      const subject = "Account deletion request";
      const body =
        `I would like to delete my Gully Fame account and the data associated with it.\n\n` +
        `Account ID: ${userId || "(not available)"}\n` +
        `Registered mobile number or email: \n`;
      await Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    } catch {
      Alert.alert("Couldn't open email", `Please write to ${SUPPORT_EMAIL} with the subject "Account deletion request".`);
    } finally {
      setBusy(false);
    }
  };

  const confirm = () =>
    Alert.alert(
      "Request account deletion?",
      "This opens an email to our team. We confirm it is you, then delete your account and its personal data.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Continue", style: "destructive", onPress: requestDeletion },
      ]
    );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2610" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delete Account</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>What happens</Text>
          <Text style={styles.bodyText}>
            Deleting your account removes your profile and the personal data linked to it. This cannot be undone.
          </Text>
          <Text style={styles.bodyText}>
            Deletion may not immediately remove information we must keep by law or for security, fraud prevention or
            financial records, as described in our Privacy Policy.
          </Text>
          <Text style={styles.bodyText}>
            Use or withdraw any wallet balance first; it may not be recoverable after deletion.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.dangerButton, busy && styles.disabled]}
          onPress={confirm}
          testID="delete-account-confirm"
          disabled={busy}
          accessibilityRole="button"
        >
          <Text style={styles.dangerText}>Request account deletion</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => Linking.openURL(WEB_DELETION_URL).catch(() => {})} style={styles.linkButton}>
          <Text style={styles.linkText}>Can't use the app? Request deletion on our website</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#3C2610", paddingTop: Platform.OS === "android" ? 20 : 0 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 20,
  },
  backButton: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "700", letterSpacing: 0.5 },
  scrollContent: { padding: 20, paddingBottom: 30 },
  card: {
    backgroundColor: "#252525",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.2)",
  },
  sectionTitle: { color: "#EC9A15", fontSize: 18, fontWeight: "700", marginBottom: 12 },
  bodyText: { color: "#E5DCD0", fontSize: 14, lineHeight: 22, marginBottom: 10 },
  dangerButton: { backgroundColor: "#FF3B30", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  disabled: { opacity: 0.6 },
  dangerText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  linkButton: { paddingVertical: 18, alignItems: "center" },
  linkText: { color: "#EC9A15", fontSize: 14, textDecorationLine: "underline" },
});
