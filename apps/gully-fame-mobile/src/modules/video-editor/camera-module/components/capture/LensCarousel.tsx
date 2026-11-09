import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import type { Lens } from "./lenses";
import type { CaptureMode } from "./CaptureControls";

const ITEM = 76;
const CENTER_SIZE = 92;
const SIDE_ICON = 52;
/** Height of the remove-lens row under the carousel (marginTop + button). */
export const LENS_REMOVE_ROW = 38;

interface LensCarouselProps {
  lenses: Lens[];
  loading: boolean;
  selectedId: string | null;
  mode: CaptureMode;
  disabled?: boolean;
  onSelect: (lens: Lens) => void;
  onShutter: () => void;
  onRemove: () => void;
}

const LensCarousel: React.FC<LensCarouselProps> = ({
  lenses,
  loading,
  selectedId,
  mode,
  disabled,
  onSelect,
  onShutter,
  onRemove,
}) => {
  const { width } = useWindowDimensions();
  const sidePadding = (width - ITEM) / 2;
  const [scrollX] = useState(() => new Animated.Value(0));
  const listRef = useRef<Animated.FlatList<Lens>>(null);
  const lastIndex = useRef(-1);

  const selectedIndex = Math.max(0, lenses.findIndex(l => l.id === selectedId));

  // Keep the list centred on the selection when it changes from outside (search/browse).
  useEffect(() => {
    if (lenses.length === 0) return;
    lastIndex.current = selectedIndex;
    listRef.current?.scrollToOffset({ offset: selectedIndex * ITEM, animated: true });
  }, [selectedIndex, lenses.length]);

  const settle = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.min(lenses.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / ITEM)));
      if (index !== lastIndex.current && lenses[index]) {
        lastIndex.current = index;
        Haptics.selectionAsync().catch(() => {});
        onSelect(lenses[index]);
      }
    },
    [lenses, onSelect]
  );

  if (loading) {
    return (
      <View style={styles.row}>
        {[0, 1, 2, 3, 4].map(i => (
          <View key={i} style={[styles.skeleton, i === 2 && styles.skeletonCenter]} />
        ))}
      </View>
    );
  }

  return (
    <View>
      <View style={styles.carouselBox}>
        <Animated.FlatList
          ref={listRef}
          data={lenses}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={ITEM}
          decelerationRate="fast"
          scrollEnabled={!disabled}
          contentContainerStyle={{ paddingHorizontal: sidePadding }}
          getItemLayout={(_, index) => ({ length: ITEM, offset: ITEM * index, index })}
          initialScrollIndex={selectedIndex}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
          onMomentumScrollEnd={settle}
          scrollEventThrottle={16}
          renderItem={({ item, index }) => {
            const inputRange = [(index - 1) * ITEM, index * ITEM, (index + 1) * ITEM];
            const scale = scrollX.interpolate({ inputRange, outputRange: [0.7, 1, 0.7], extrapolate: "clamp" });
            const isCentre = index === selectedIndex;
            return (
              <Pressable
                style={styles.item}
                onPress={() =>
                  isCentre ? onShutter() : listRef.current?.scrollToOffset({ offset: index * ITEM, animated: true })
                }
                accessibilityLabel={isCentre ? `${item.name}: ${mode === "photo" ? "take photo" : "record"}` : item.name}
              >
                <Animated.View style={[styles.iconWrap, { transform: [{ scale }] }]}>
                  <Image source={item.iconUrl} style={styles.icon} contentFit="contain" cachePolicy="memory-disk" />
                </Animated.View>
              </Pressable>
            );
          }}
        />
        {/* Shutter ring around the centred lens */}
        <View pointerEvents="none" style={[styles.centerRing, { left: (width - CENTER_SIZE) / 2 }]} />
      </View>

      <TouchableOpacity style={styles.removeBtn} onPress={onRemove} hitSlop={8} accessibilityLabel="Remove lens">
        <Ionicons name="close" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { height: CENTER_SIZE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18 },
  skeleton: { width: SIDE_ICON - 8, height: SIDE_ICON - 8, borderRadius: SIDE_ICON, backgroundColor: "rgba(255,255,255,0.18)" },
  skeletonCenter: { width: CENTER_SIZE - 16, height: CENTER_SIZE - 16 },
  carouselBox: { height: CENTER_SIZE, justifyContent: "center" },
  item: { width: ITEM, height: CENTER_SIZE, alignItems: "center", justifyContent: "center" },
  iconWrap: {
    width: ITEM - 8,
    height: ITEM - 8,
    borderRadius: ITEM,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  icon: { width: "100%", height: "100%" },
  centerRing: {
    position: "absolute",
    top: 0,
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    borderWidth: 5,
    borderColor: "#fff",
  },
  removeBtn: {
    alignSelf: "center",
    marginTop: LENS_REMOVE_ROW - 28,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default LensCarousel;
