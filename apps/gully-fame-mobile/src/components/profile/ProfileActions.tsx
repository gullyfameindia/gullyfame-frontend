import { memo, useCallback, useMemo, useState } from "react";
import { Alert, Linking, Modal, Pressable, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getProfileShareMessage } from "@/api/services/profileExtrasService";

const SURFACE = "rgba(255,255,255,0.12)";
const ACCENT = "#EC9A15";

export interface ContactInfo {
  email?: string;
  phone?: string;
  website?: string;
}

const Button = memo(function Button({
  label,
  onPress,
  primary,
  disabled,
  testID,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.button, primary && styles.buttonPrimary, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
    >
      <Text
        style={[styles.buttonText, primary && styles.buttonTextPrimary]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
});

/* ------------------------------ own profile ------------------------------ */

export const OwnProfileActions = memo(function OwnProfileActions({
  userId,
  displayName,
  contact,
  onEditProfile,
}: {
  userId: string;
  displayName: string;
  contact: ContactInfo;
  /** Opens the profile editor. Defaults to the Account Center screen. */
  onEditProfile?: () => void;
}) {
  const [contactVisible, setContactVisible] = useState(false);

  const share = useCallback(() => {
    if (!userId) return;
    Share.share({ message: getProfileShareMessage(userId, displayName) }).catch(() => {});
  }, [userId, displayName]);

  return (
    <>
      <View style={styles.row}>
        <Button testID="profile-edit" label="Edit profile" onPress={onEditProfile ?? (() => router.push("/(main)/account-center" as any))} />
        <Button testID="profile-share" label="Share profile" onPress={share} disabled={!userId} />
        <Button testID="profile-contact" label="Contact" onPress={() => setContactVisible(true)} />
      </View>
      <ContactSheet
        visible={contactVisible}
        onClose={() => setContactVisible(false)}
        contact={contact}
        isOwn
      />
    </>
  );
});

/* ---------------------------- other's profile ---------------------------- */

export const OtherProfileActions = memo(function OtherProfileActions({
  isFollowing,
  followBusy,
  onToggleFollow,
  onMessage,
  onSupport,
}: {
  isFollowing: boolean;
  followBusy: boolean;
  onToggleFollow?: () => void;
  onMessage?: () => void;
  onSupport?: () => void;
}) {
  if (!onToggleFollow && !onMessage && !onSupport) return null;
  return (
    <View style={styles.row}>
      {onToggleFollow ? (
        <Button
          testID="profile-follow"
          label={isFollowing ? "Following" : "Follow"}
          primary={!isFollowing}
          disabled={followBusy}
          onPress={onToggleFollow}
        />
      ) : null}
      {onMessage ? <Button testID="profile-message" label="Message" onPress={onMessage} /> : null}
      {onSupport ? <Button testID="profile-support" label="Support" onPress={onSupport} /> : null}
    </View>
  );
});

/* ------------------------------ contact sheet ----------------------------- */

function ContactSheet({
  visible,
  onClose,
  contact,
  isOwn,
}: {
  visible: boolean;
  onClose: () => void;
  contact: ContactInfo;
  isOwn: boolean;
}) {
  const insets = useSafeAreaInsets();
  const options = useMemo(() => {
    const list: { key: string; label: string; value: string; url: string }[] = [];
    const email = contact.email?.trim();
    const phone = contact.phone?.trim();
    const website = contact.website?.trim();
    if (email) list.push({ key: "email", label: "Email", value: email, url: `mailto:${email}` });
    if (phone) list.push({ key: "phone", label: "Phone", value: phone, url: `tel:${phone.replace(/\s+/g, "")}` });
    if (website) {
      const url = /^https?:\/\//i.test(website) ? website : `https://${website}`;
      list.push({ key: "website", label: "Website", value: website, url });
    }
    return list;
  }, [contact.email, contact.phone, contact.website]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close contact options">
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Contact</Text>
          {options.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {isOwn ? "You haven't added any contact details yet." : "No contact details shared."}
              </Text>
              {isOwn ? (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => {
                    onClose();
                    router.push("/(main)/account-center" as any);
                  }}
                >
                  <Text style={styles.emptyButtonText}>Add contact info</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            options.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={styles.option}
                accessibilityRole="button"
                onPress={() => {
                  onClose();
                  Linking.openURL(option.url).catch(() => Alert.alert("Couldn't open", option.value));
                }}
              >
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.optionValue} numberOfLines={1}>
                  {option.value}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
    alignSelf: "stretch",
  },
  button: {
    flex: 1,
    minHeight: 38,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimary: { backgroundColor: ACCENT },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { alignSelf: "stretch", textAlign: "center", color: "#fff", fontSize: 14, fontWeight: "600" },
  buttonTextPrimary: { color: "#1A1208" },

  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#2A1B0B",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginBottom: 12,
  },
  sheetTitle: { color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 6 },
  option: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  optionLabel: { color: ACCENT, fontSize: 13, fontWeight: "600" },
  optionValue: { color: "#fff", fontSize: 15, marginTop: 2 },
  empty: { alignItems: "center", paddingVertical: 20 },
  emptyText: { alignSelf: "stretch", textAlign: "center", color: "rgba(255,255,255,0.7)", fontSize: 14 },
  emptyButton: { marginTop: 14, backgroundColor: ACCENT, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  emptyButtonText: { color: "#1A1208", fontWeight: "700", fontSize: 14 },
});
