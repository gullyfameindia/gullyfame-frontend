import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, type ViewProps } from "react-native";

/**
 * Root container for screens with text inputs, so the keyboard never covers a field.
 *
 * KeyboardAvoidingView only reacts to the part of the keyboard that actually overlaps it. If the
 * system has already resized the window (adjustResize), the overlap is zero and nothing is applied
 * twice; under edge-to-edge (Android 15+), where adjustResize can no longer be relied on, this
 * container does the work.
 */
export default function KeyboardAvoidingScreen({ style, children, ...rest }: ViewProps & { children?: ReactNode }) {
  return (
    <KeyboardAvoidingView
      {...rest}
      style={[{ flex: 1 }, style]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
