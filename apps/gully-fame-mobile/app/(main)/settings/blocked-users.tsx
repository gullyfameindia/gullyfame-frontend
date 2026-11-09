import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, Platform, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { unblockUser, useBlockedUsers, type BlockedUser } from "@/utils/moderation";
import { toastSuccess } from "@/components/ui/Toast";

export default function BlockedUsersScreen() {
  const blocked = useBlockedUsers();

  const confirmUnblock = (user: BlockedUser) => {
    Alert.alert(`Unblock ${user.name}?`, "You will see their reels and comments again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unblock",
        onPress: async () => {
          await unblockUser(user.id);
          toastSuccess("User unblocked");
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2610" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blocked Users</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={blocked}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No blocked users</Text>
            <Text style={styles.emptyText}>People you block from a reel or a chat will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <TouchableOpacity
              style={styles.unblockButton}
              onPress={() => confirmUnblock(item)}
              accessibilityLabel={`Unblock ${item.name}`}
            >
              <Text style={styles.unblockText}>Unblock</Text>
            </TouchableOpacity>
          </View>
        )}
      />
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
  listContent: { padding: 20, paddingBottom: 30, flexGrow: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#252525",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.2)",
  },
  name: { flex: 1, color: "#fff", fontSize: 16, marginRight: 12 },
  unblockButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "#EC9A15" },
  unblockText: { color: "#EC9A15", fontSize: 14, fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 8 },
  emptyText: { color: "#E5DCD0", fontSize: 14, textAlign: "center", paddingHorizontal: 20 },
});
