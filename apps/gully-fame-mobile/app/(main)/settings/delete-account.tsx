import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform, Linking } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiDelete, apiPost, getErrorMessage } from "@/api/client";
import { performLogout } from "@/utils/logout";
import { toastError, toastSuccess } from "@/components/ui/Toast";
import ConfirmPopup from "@/components/ui/ConfirmPopup";

// Public page describing the same process; this is the URL entered in the Google Play listing.
const WEB_DELETION_URL = "https://gullyfameindia.com/delete-account";

// Same brown + orange palette as the rest of the app.
const C = {
  bg: "#3C2610",
  card: "#1A1A1A",
  border: "#2A2A2A",
  accent: "#EC9A15",
  accentSoft: "rgba(236, 154, 21, 0.15)",
  danger: "#FF3B30",
  dangerSoft: "rgba(255, 59, 48, 0.15)",
  text: "#FFFFFF",
  muted: "#CAD7D8",
  faint: "#8A8F90",
};

const CONSEQUENCES = [
  "Your profile and reels will be removed",
  "Your followers, comments and likes will be deleted",
  "Any earned coins and wallet balance will be lost",
  "Your username may be claimed by someone else",
];

/**
 * In-app account deletion: DELETE /user/account { confirm: "DELETE" }.
 * The server closes the account at once, erases personal data, deletes the user's reels and
 * signs out every device; the app then clears its local session.
 */
export default function DeleteAccountScreen() {
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [deactivateConfirm, setDeactivateConfirm] = useState(false);

  const deleteAccount = async () => {
    if (busy) return;
    setStep(0);
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

  // Hides the profile and content and signs out every device; logging in again reactivates it.
  const deactivateAccount = async () => {
    if (busy) return;
    setDeactivateConfirm(false);
    setBusy(true);
    try {
      await apiPost("user/account/deactivate", {});
      toastSuccess("Your account has been deactivated. Log in again any time to reactivate it.");
      await performLogout({ skipServer: true });
    } catch (error) {
      toastError(getErrorMessage(error, "Couldn't deactivate your account. Please try again."));
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerSide} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={28} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delete Account</Text>
        <View style={styles.headerSide} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Warning */}
        <View style={styles.warningIcon}>
          <Ionicons name="warning-outline" size={30} color={C.danger} />
        </View>
        <Text style={styles.question}>Are you sure you want to delete your account?</Text>
        <Text style={styles.subtext}>This action is permanent and cannot be undone. Everything linked to your account will be erased.</Text>

        {/* Consequences */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>What you will lose</Text>
            <Ionicons name="alert-circle" size={20} color={C.danger} />
          </View>
          {CONSEQUENCES.map((item) => (
            <View key={item} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
          <Text style={styles.note}>
            Deletion may not remove information we must keep by law or for security, fraud prevention or financial
            records, as described in our Privacy Policy.
          </Text>
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={[styles.dangerButton, busy && styles.disabled]}
          onPress={() => setStep(1)}
          testID="delete-account-confirm"
          disabled={busy}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Text style={styles.dangerText}>{busy ? "Deleting…" : "Delete permanently"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.keepButton} onPress={() => router.back()} activeOpacity={0.8} accessibilityRole="button">
          <Text style={styles.keepText}>Cancel, keep my account</Text>
        </TouchableOpacity>

        <Text style={styles.breakText}>
          If you just want a break, you can deactivate your account instead. Log in again any time to come back.{" "}
          <Text style={styles.breakLink} onPress={() => !busy && setDeactivateConfirm(true)} accessibilityRole="button">
            Deactivate account
          </Text>
        </Text>

        <TouchableOpacity onPress={() => Linking.openURL(WEB_DELETION_URL).catch(() => {})} style={styles.webLink}>
          <Text style={styles.webLinkText}>Can't use the app? Request deletion on our website</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Step 1 of 2 */}
      <ConfirmPopup
        visible={step === 1}
        icon="warning-outline"
        title="Delete your account?"
        message="Your profile, reels, comments, followers and personal details will be deleted. You will be signed out on every device."
        confirmText="Continue"
        onConfirm={() => setStep(2)}
        onCancel={() => setStep(0)}
      />

      {/* Step 2 of 2 */}
      <ConfirmPopup
        visible={step === 2}
        icon="warning-outline"
        title="This cannot be undone"
        message="Delete your GullyFame account permanently?"
        confirmText="Delete permanently"
        onConfirm={deleteAccount}
        onCancel={() => setStep(0)}
      />

      <ConfirmPopup
        visible={deactivateConfirm}
        icon="pause-circle-outline"
        title="Deactivate your account?"
        message="Your profile, reels and comments will be hidden and you'll be signed out on every device. Log in again any time to reactivate your account."
        confirmText="Deactivate"
        onConfirm={deactivateAccount}
        onCancel={() => setDeactivateConfirm(false)}
      />
    </View>
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
    paddingBottom: 30,
  },

  // Warning header
  warningIcon: {
    alignSelf: "center",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.dangerSoft,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 14,
  },
  question: {
    color: C.text,
    fontSize: 20,
    lineHeight: 26,
    textAlign: "center",
    fontFamily: "PlayfairDisplay_700Bold",
    paddingHorizontal: 12,
  },
  subtext: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 12,
    fontFamily: "Rubik_400Regular",
  },

  // Consequences card
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 20,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardTitle: {
    color: C.text,
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.danger,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    color: C.muted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Rubik_400Regular",
  },
  note: {
    color: C.faint,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    fontFamily: "Rubik_400Regular",
  },

  // Buttons
  dangerButton: {
    backgroundColor: C.danger,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
  },
  disabled: {
    opacity: 0.6,
  },
  dangerText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Rubik_700Bold",
  },
  keepButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.accent,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  keepText: {
    color: C.accent,
    fontSize: 15,
    fontFamily: "Rubik_600SemiBold",
  },
  breakText: {
    color: C.faint,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 18,
    paddingHorizontal: 12,
    fontFamily: "Rubik_400Regular",
  },
  breakLink: {
    color: C.accent,
    fontFamily: "Rubik_600SemiBold",
  },
  webLink: {
    alignItems: "center",
    paddingVertical: 16,
  },
  webLinkText: {
    color: C.accent,
    fontSize: 13,
    textDecorationLine: "underline",
    fontFamily: "Rubik_400Regular",
  },
});
