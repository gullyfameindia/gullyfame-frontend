import { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, Platform } from "react-native";
import { router } from "expo-router";
import { safeBack } from "@/utils/safeBack";
import { Ionicons } from "@expo/vector-icons";
import { unblockUser, useBlockedUsers, type BlockedUser } from "@/utils/moderation";
import { toastError, toastSuccess } from "@/components/ui/Toast";
import ConfirmPopup from "@/components/ui/ConfirmPopup";
import { getErrorMessage } from "@/api/client";

// Same brown + orange palette as the rest of the app.
const C = {
  bg: "#3C2610",
  card: "#1A1A1A",
  border: "#2A2A2A",
  accent: "#EC9A15",
  accentSoft: "rgba(236, 154, 21, 0.15)",
  text: "#FFFFFF",
  muted: "#CAD7D8",
  faint: "#8A8F90",
};

export default function BlockedUsersScreen() {
  const blocked = useBlockedUsers();

  const [pending, setPending] = useState<BlockedUser | null>(null);

  const doUnblock = async () => {
    if (!pending) return;
    const user = pending;
    setPending(null);
    try {
      await unblockUser(user.id);
      toastSuccess("User unblocked");
    } catch (error) {
      toastError(getErrorMessage(error));
    }
  };

  const confirmUnblock = (user: BlockedUser) => setPending(user);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack("/(main)/home")} style={styles.headerSide} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={28} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blocked Users</Text>
        <View style={styles.headerSide} />
      </View>

      <Text style={styles.subtitle}>
        People you block can't see your reels or comments, and you won't see theirs.
      </Text>

      <FlatList
        data={blocked}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="ban-outline" size={28} color={C.accent} />
            </View>
            <Text style={styles.emptyTitle}>No blocked users</Text>
            <Text style={styles.emptyText}>People you block from a reel or a chat will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase() || "?"}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.meta}>Blocked</Text>
            </View>
            <TouchableOpacity
              style={styles.unblockButton}
              onPress={() => confirmUnblock(item)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Unblock ${item.name}`}
            >
              <Text style={styles.unblockText}>Unblock</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      <ConfirmPopup
        visible={pending !== null}
        title={`Unblock ${pending?.name ?? ""}?`}
        message="You will see their reels and comments again."
        confirmText="Unblock"
        icon="people-outline"
        onConfirm={doUnblock}
        onCancel={() => setPending(null)}
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
  subtitle: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    marginBottom: 18,
    paddingHorizontal: 28,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    flexGrow: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.accentSoft,
    borderWidth: 1,
    borderColor: C.accent,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: C.accent,
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  info: {
    flex: 1,
    marginRight: 10,
  },
  name: {
    color: C.text,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  meta: {
    color: C.faint,
    fontSize: 12,
    marginTop: 2,
    fontFamily: "Inter_400Regular",
  },
  unblockButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: C.accentSoft,
    borderWidth: 1,
    borderColor: C.accent,
  },
  unblockText: {
    color: C.accent,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.accentSoft,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    color: C.text,
    fontSize: 18,
    fontFamily: "PlayfairDisplay_700Bold",
    marginBottom: 6,
  },
  emptyText: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
});
