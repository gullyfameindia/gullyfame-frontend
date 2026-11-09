import React from "react";
import { View, Image, StyleSheet } from "react-native";
import type { OverlayItem } from "./OverlayToolPanel";

interface OverlayLayerProps {
  overlays: OverlayItem[];
  videoWidth: number;
  videoHeight: number;
  currentTime: number;
}

export default function OverlayLayer({
  overlays,
  videoWidth,
  videoHeight,
  currentTime,
}: OverlayLayerProps) {
  return (
    <View style={styles.container}>
      {overlays.map((overlay) => {
        // Check if overlay should be visible at current time
        const isVisible =
          currentTime >= overlay.startTime && currentTime <= overlay.endTime;

        if (!isVisible) return null;

        const overlayWidth = (overlay.width ?? 0.5) * videoWidth;
        const overlayHeight = (overlay.height ?? 0.5) * videoHeight;

        return (
          <View
            key={overlay.id}
            style={[
              styles.overlayItem,
              {
                position: "absolute",
                left: (overlay.x ?? 0) * videoWidth,
                top: (overlay.y ?? 0) * videoHeight,
                width: overlayWidth,
                height: overlayHeight,
                opacity: overlay.opacity ?? 1,
                transform: [
                  { rotate: `${overlay.rotation ?? 0}deg` },
                ],
              },
            ]}
          >
            <Image
              source={{
                uri: overlay.uri || "",
              }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    pointerEvents: "box-none",
  },
  overlayItem: {
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
