import type { ReactNode } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { safeBack } from "@/utils/safeBack";
import { colors, type } from "@/theme/tokens";

/**
 * Header used by in-app pages (settings, help, saved, ...): back chevron, centred Playfair title,
 * optional right-hand action. Same look as the existing settings pages.
 */
export default function ScreenHeader({
  title,
  fallback = "/(main)/home",
  onBack,
  right,
}: {
  title: string;
  /** Route to open when there is no screen to go back to. */
  fallback?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={onBack ?? (() => safeBack(fallback as any))}
        style={styles.side}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="chevron-back" size={28} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.side}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "ios" ? 60 : 12,
    paddingBottom: 8,
  },
  side: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  title: { ...type.headerTitle, fontSize: 20, flex: 1, textAlign: "center" },
});
