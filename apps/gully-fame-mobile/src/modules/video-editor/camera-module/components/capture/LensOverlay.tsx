import React, { useEffect,  useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

import { FULL_FRAME, type Lens } from "./lenses";
import { iconShadow } from "./theme";

interface LensOverlayProps {
  lens: Lens;
  isRecording: boolean;
}

const LensOverlay: React.FC<LensOverlayProps> = ({ lens, isRecording }) => {
  const [hintOpacity] = useState(() => new Animated.Value(1));
  const rect = lens.overlayRect ?? FULL_FRAME;

  useEffect(() => {
    Animated.timing(hintOpacity, {
      toValue: isRecording ? 0 : 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isRecording, hintOpacity]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image
        source={lens.overlayUrl}
        contentFit={lens.overlayRect ? "contain" : "fill"}
        cachePolicy="memory-disk"
        style={{
          position: "absolute",
          left: `${rect.x * 100}%`,
          top: `${rect.y * 100}%`,
          width: `${rect.width * 100}%`,
          height: `${rect.height * 100}%`,
        }}
      />
      {!!lens.hintText && (
        <Animated.View style={[styles.hint, { opacity: hintOpacity }]}>
          <Text style={styles.hintText}>{lens.hintText}</Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  hint: { position: "absolute", top: "42%", left: 24, right: 24, alignItems: "center" },
  hintText: { color: "#fff", fontSize: 20, fontWeight: "700", textAlign: "center", ...iconShadow },
});

export default LensOverlay;
