import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform, Linking, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiDelete, getErrorMessage } from "@/api/client";
import { performLogout } from "@/utils/logout";
import { toastError, toastSuccess } from "@/components/ui/Toast";

// Public page describing the same process; this is the URL entered in the Google Play listing.
const WEB_DELETION_URL = "https://gullyfameindia.com/delete-account";

/**
 * In-app account deletion: DELETE /user/account { confirm: "DELETE" }.
 * The server closes the account at once, erases personal data, deletes the user's reels and
 * signs out every device; the app then clears its local session.
 */
export default function DeleteAccountScreen() {
  const [busy, setBusy] = useState(false);

  const deleteAccount = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await apiDelete("user/account", { data: { confirm: "DELETE" } });
      toastSuccess("Your account has been deleted");
      await performLogout({ skipServer: true });
    } catch (error) {
      toastError(getErrorMessage(error, "Couldn't delete your account. Please try again."));
      setBusy(false);
    }
  };

  // Two steps, because this cannot be undone.
  const confirm = () =>
    Alert.alert(
      "Delete your account?",
      "Your profile, reels, comments, followers and personal details will be deleted. You will be signed out on every device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () =>
            Alert.alert("This cannot be undone", "Delete your Gully Fame account permanently?", [
              { text: "Keep my account", style: "cancel" },
              { text: "Delete permanently", style: "destructive", onPress: deleteAccount },
            ]),
        },
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
            Deleting your account removes your profile, reels, comments, followers and the personal data linked to
            it, and signs you out everywhere. This cannot be undone.
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
          <Text style={styles.dangerText}>{busy ? "Deleting..." : "Delete my account"}</Text>
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
