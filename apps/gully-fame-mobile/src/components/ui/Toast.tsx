import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastType = "success" | "error" | "info";
interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
}

type Listener = (toast: ToastMessage) => void;
const listeners = new Set<Listener>();
let nextId = 1;

/** Shows a short non-blocking message at the top of the screen. */
export function showToast(text: string, type: ToastType = "success") {
  if (!text) return;
  const toast = { id: nextId++, text, type };
  listeners.forEach((l) => l(toast));
}

export const toastSuccess = (text: string) => showToast(text, "success");
export const toastError = (text: string) => showToast(text, "error");

const COLORS: Record<ToastType, string> = {
  success: "#EC9A15",
  error: "#C0392B",
  info: "#3C2610",
};

/** Mounted once at the app root. */
export default function ToastHost() {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const listener: Listener = (next) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setToast(next);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() =>
          setToast((current) => (current?.id === next.id ? null : current))
        );
      }, 2600);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [opacity]);

  if (!toast) return null;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.container, { top: insets.top + 12, opacity, backgroundColor: COLORS[toast.type] }]}
    >
      <Text style={styles.text}>{toast.text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    zIndex: 9999,
    elevation: 12,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
});
