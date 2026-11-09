import { memo, useState } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";

interface Props {
  /** Photo URL. Empty, missing or failing to load shows the user's initial instead. */
  uri?: string | null;
  /** Used for the initial. */
  name?: string | null;
  /** Give the width, height and borderRadius (and any border) here, like for an Image. */
  style?: StyleProp<ViewStyle>;
}

/** First letter of the name, ignoring a leading "@". */
export const initialOf = (name?: string | null): string => {
  const letter = (name ?? "").trim().replace(/^@+/, "").charAt(0);
  return letter ? letter.toUpperCase() : "?";
};

/**
 * A user's profile picture. Replaces the stock photo that used to stand in for every user without
 * one, so a missing picture looks the same as on the profile page: a coloured circle with an initial.
 */
function UserAvatarBase({ uri, name, style }: Props) {
  const [failed, setFailed] = useState(false);
  const flat = StyleSheet.flatten(style) ?? {};
  const size = typeof flat.width === "number" ? flat.width : 40;
  const radius = typeof flat.borderRadius === "number" ? flat.borderRadius : size / 2;
  const showPhoto = !!uri && !failed;

  return (
    <View style={[styles.base, style, { borderRadius: radius, overflow: "hidden" }]}>
      {showPhoto ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={[styles.initial, { fontSize: Math.max(10, Math.round(size * 0.45)) }]}>{initialOf(name)}</Text>
      )}
    </View>
  );
}

const UserAvatar = memo(UserAvatarBase);
export default UserAvatar;

const styles = StyleSheet.create({
  base: {
    backgroundColor: "#5A3C1C",
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    color: "#EC9A15",
    fontWeight: "700",
  },
});
