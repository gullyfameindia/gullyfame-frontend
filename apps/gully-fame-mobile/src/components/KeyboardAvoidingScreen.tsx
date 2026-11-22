import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, View, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Root container for screens with text inputs, so the keyboard never covers a field.
 *
 * KeyboardAvoidingView only reacts to the part of the keyboard that actually overlaps it. If the
 * system has already resized the window (adjustResize), the overlap is zero and nothing is applied
 * twice; under edge-to-edge (Android 15+), where adjustResize can no longer be relied on, this
 * container does the work.
 */
export default function KeyboardAvoidingScreen({
  style,
  children,
  statusBarColor,
  ...rest
}: ViewProps & { children?: ReactNode; /** Paints the status-bar area so scrolled content never slides under it. */ statusBarColor?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      {...rest}
      style={[{ flex: 1 }, style]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {statusBarColor ? <View style={{ height: insets.top, backgroundColor: statusBarColor }} /> : null}
      {children}
    </KeyboardAvoidingView>
  );
}
