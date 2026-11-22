import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from "react-native";

export const OTP_LENGTH = 6;

const THEMES = {
  light: {
    box: "#FFFDF9",
    border: "#E7D9C4",
    filled: "#EC9A15",
    active: "#3C2610",
    text: "#1F2937",
    doneBorder: "#059669",
    doneBox: "#ECFDF5",
  },
  dark: {
    box: "#252525",
    border: "#3A3A3A",
    filled: "#EC9A15",
    active: "#EC9A15",
    text: "#FFFFFF",
    doneBorder: "#34D399",
    doneBox: "rgba(52, 211, 153, 0.12)",
  },
};

type Props = {
  value: string;
  onChangeText: (code: string) => void;
  length?: number;
  autoFocus?: boolean;
  /** Read-only, e.g. once this code is verified. */
  disabled?: boolean;
  /** Shows the boxes as verified (green). */
  done?: boolean;
  hasError?: boolean;
  /** "sms" offers the code from a text message on Android; "email" leaves autofill to the keyboard. */
  source?: "sms" | "email";
  theme?: "light" | "dark";
  /** Called once each time all digits are entered. */
  onComplete?: (code: string) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * N display boxes over one transparent TextInput that covers them, so tapping anywhere focuses,
 * long-press paste works, and SMS / one-time-code autofill fills every box at once.
 */
export default function OtpCodeInput({
  value,
  onChangeText,
  length = OTP_LENGTH,
  autoFocus = false,
  disabled = false,
  done = false,
  hasError = false,
  source = "sms",
  theme = "light",
  onComplete,
  style,
  testID,
}: Props) {
  const C = THEMES[theme];
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const lastCompleted = useRef("");

  useEffect(() => {
    if (value.length === length && lastCompleted.current !== value) {
      lastCompleted.current = value;
      onComplete?.(value);
    } else if (value.length < length) {
      lastCompleted.current = "";
    }
  }, [value, length, onComplete]);

  const editable = !disabled && !done;

  return (
    <Pressable onPress={() => editable && inputRef.current?.focus()} style={[styles.row, style]}>
      {Array.from({ length }).map((_, i) => {
        const char = value[i] ?? "";
        const active = focused && editable && i === Math.min(value.length, length - 1);
        return (
          <View
            key={i}
            style={[
              styles.box,
              { backgroundColor: C.box, borderColor: C.border },
              char ? { borderColor: C.filled } : null,
              active ? { borderColor: C.active, borderWidth: 2 } : null,
              hasError ? styles.boxError : null,
              done ? { borderColor: C.doneBorder, backgroundColor: C.doneBox } : null,
            ]}
          >
            <Text style={[styles.char, { color: C.text }]}>{char}</Text>
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChangeText(t.replace(/\D/g, "").slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={source === "sms" && Platform.OS === "android" ? "sms-otp" : "one-time-code"}
        importantForAutofill="yes"
        maxLength={length}
        editable={editable}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        caretHidden
        style={styles.input}
        accessibilityLabel={`${length}-digit verification code`}
        testID={testID}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  box: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  boxError: { borderColor: "#DC2626" },
  char: { fontSize: 20, fontFamily: "Inter_700Bold" },
  // Covers the boxes (not hidden) so it can take focus, paste and autofill.
  input: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.02,
    color: "transparent",
  },
});
