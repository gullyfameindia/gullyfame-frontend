import { StyleSheet, Text, type TextProps } from "react-native";
import { useThemeColor } from "@hooks/use-theme-color";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: "default" | "title" | "defaultSemiBold" | "subtitle" | "link";
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "default",
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, "text");

  // Map fontWeight to the matching Inter font file
  const getFontFamily = (weight: string | undefined) => {
    if (!weight) return "Inter_400Regular";
    const weightNum =
      weight === "normal" || weight === "400"
        ? 400
        : weight === "500"
        ? 500
        : weight === "bold" || weight === "600" || weight === "700"
        ? 700
        : 400;

    if (weightNum >= 700) return "Inter_700Bold";
    if (weightNum >= 500) return "Inter_500Medium";
    return "Inter_400Regular";
  };

  // Extract fontWeight from style prop or type
  const styleArray = Array.isArray(style) ? style : style ? [style] : [];
  const styleFontWeight = styleArray.find((s: any) => s && typeof s === 'object' && 'fontWeight' in s)
    ? (styleArray.find((s: any) => s && typeof s === 'object' && 'fontWeight' in s) as any)?.fontWeight : undefined;

  const getFontWeight = () => {
    if (styleFontWeight) return String(styleFontWeight);
    if (type === "defaultSemiBold") return "500";
    if (type === "title") return "700";
    if (type === "subtitle") return "600";
    if (type === "link") return "500";
    return "400";
  };

  const fontWeight = getFontWeight();
  const fontFamily = getFontFamily(fontWeight);

  // Process style to remove fontWeight and ensure fontFamily is applied
  const processStyle = (styleItem: any) => {
    if (!styleItem) return null;
    if (typeof styleItem === 'number') return styleItem; // StyleSheet reference
    const { fontWeight: _, ...restStyle } = styleItem;
    return restStyle;
  };

  const processedStyle = Array.isArray(style) 
    ? style.map(processStyle).filter(Boolean)
    : processStyle(style);

  return (
    <Text
      style={[
        { color, fontFamily }, // Apply fontFamily first
        type === "default" && styles.default,
        type === "defaultSemiBold" && styles.defaultSemiBold,
        type === "title" && styles.title,
        type === "subtitle" && styles.subtitle,
        type === "link" && styles.link,
        processedStyle, // Processed style without fontWeight
        { fontFamily }, // Ensure fontFamily is always last
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 20,
    lineHeight: 28,
  },
  link: {
    fontSize: 16,
    lineHeight: 30,
    color: "#0a7ea4",
  },
});
