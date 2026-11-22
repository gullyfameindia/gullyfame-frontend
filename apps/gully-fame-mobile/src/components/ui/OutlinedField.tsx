import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const FIELD_COLORS = {
  border: "#D9C7AC",
  focus: "#EC9A15",
  error: "#DC2626",
  label: "#6B5B45",
  text: "#1F2937",
  placeholder: "#A8A29E",
  icon: "#9A7B55",
};

/** Dark look used by the in-app (hamburger menu) pages: dark card, brown/orange accents. */
export const DARK_FIELD_COLORS = {
  border: "#3A3A3A",
  focus: "#EC9A15",
  error: "#F87171",
  label: "#CAD7D8",
  text: "#FFFFFF",
  placeholder: "#7C8283",
  icon: "#EC9A15",
  box: "#252525",
  surface: "#1A1A1A",
};

/**
 * Outlined text field: the label sits on the top border ("notched" style).
 * Put a borderless TextInput (use `fieldInputStyle`) and any icons inside as children.
 * `background` must match the surface behind the field so the label cuts the border cleanly.
 */
export default function OutlinedField({
  label,
  required,
  error,
  focused,
  icon,
  background,
  helper,
  children,
  style,
  dark = false,
}: {
  /** Dark variant for dark cards; `background` defaults to the dark card colour. */
  dark?: boolean;
  label: string;
  required?: boolean;
  error?: boolean | string;
  focused?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  background?: string;
  /** Small text under the field; turns red when `error` is a string. */
  helper?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const P = dark ? DARK_FIELD_COLORS : FIELD_COLORS;
  const surface = background ?? (dark ? DARK_FIELD_COLORS.surface : "#FFF9F1");
  const borderColor = error ? P.error : focused ? P.focus : P.border;
  const labelColor = error ? P.error : focused ? P.focus : P.label;
  const helperText = typeof error === "string" && error ? error : helper;
  return (
    <View style={[styles.wrap, style]}>
      <View
        style={[
          styles.box,
          { borderColor, borderWidth: focused || error ? 1.5 : 1, backgroundColor: dark ? DARK_FIELD_COLORS.box : "#FFFFFF" },
        ]}
      >
        {icon ? <Ionicons name={icon} size={18} color={error ? P.error : P.icon} style={styles.icon} /> : null}
        {children}
      </View>
      <View style={[styles.labelWrap, { backgroundColor: surface }]} pointerEvents="none">
        <Text style={[styles.label, { color: labelColor }]}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      </View>
      {helperText ? (
        <Text style={[styles.helper, dark && { color: "#8A8F90" }, typeof error === "string" && error ? { color: P.error } : null]}>{helperText}</Text>
      ) : null}
    </View>
  );
}

/** Style for the TextInput placed inside an OutlinedField. */
export const darkFieldInputStyle = {
  flex: 1,
  height: "100%",
  fontSize: 14,
  color: DARK_FIELD_COLORS.text,
  fontFamily: "Inter_400Regular",
  paddingVertical: 0,
  paddingHorizontal: 0,
} as const;

export const fieldInputStyle = {
  flex: 1,
  height: "100%",
  fontSize: 14,
  color: FIELD_COLORS.text,
  fontFamily: "Inter_400Regular",
  paddingVertical: 0,
  paddingHorizontal: 0,
} as const;

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    marginBottom: 6,
  },
  box: {
    flexDirection: "row",
    alignItems: "center",
    height: 46,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 8,
  },
  labelWrap: {
    position: "absolute",
    top: -8,
    left: 10,
    paddingHorizontal: 5,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    lineHeight: 15,
    fontFamily: "Inter_600SemiBold",
  },
  required: {
    color: FIELD_COLORS.error,
  },
  helper: {
    marginTop: 4,
    marginLeft: 12,
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "Inter_400Regular",
  },
  helperError: {
    color: FIELD_COLORS.error,
  },
});
