import { Dimensions, Platform, PixelRatio, StatusBar } from "react-native";

// Get window dimensions with orientation support
const getDimensions = () => {
  const dims = Dimensions.get("window");
  return {
    width: Math.min(dims.width, dims.height), // Always use smaller dimension as width
    height: Math.max(dims.width, dims.height), // Always use larger dimension as height
    scale: PixelRatio.get(),
    fontScale: PixelRatio.getFontScale(),
  };
};

// Base dimensions (iPhone X - standard reference)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Responsive scaling functions with better handling
export const scale = (size: number): number => {
  const { width, scale: pixelRatio } = getDimensions();
  const scaleFactor = width / BASE_WIDTH;
  const scaledSize = size * scaleFactor;
  // Round to nearest pixel for crisp rendering
  return Math.round(scaledSize * pixelRatio) / pixelRatio;
};

export const scaleVertical = (size: number): number => {
  const { height, scale: pixelRatio } = getDimensions();
  const scaleFactor = height / BASE_HEIGHT;
  const scaledSize = size * scaleFactor;
  // Round to nearest pixel for crisp rendering
  return Math.round(scaledSize * pixelRatio) / pixelRatio;
};

// Responsive font size with minimum constraint and better scaling
export const getFontSize = (size: number): number => {
  const { fontScale } = getDimensions();
  const scaled = scale(size);
  // Respect system font scale but ensure minimum readability
  const minSize = size * 0.75;
  const maxSize = size * 1.2;
  const finalSize = scaled * fontScale;
  return Math.max(minSize, Math.min(maxSize, finalSize));
};

// Get responsive dimensions with orientation support
export const getResponsiveDimensions = () => {
  const dimensions = getDimensions();
  const isPortrait = dimensions.height > dimensions.width;
  
  return {
    width: dimensions.width,
    height: dimensions.height,
    scale,
    scaleVertical,
    getFontSize,
    isSmallScreen: dimensions.width < 375,
    isMediumScreen: dimensions.width >= 375 && dimensions.width < 414,
    isLargeScreen: dimensions.width >= 414,
    isTablet: dimensions.width >= 768,
    isPortrait,
    isLandscape: !isPortrait,
    pixelRatio: dimensions.scale,
    fontScale: dimensions.fontScale,
  };
};

// Percentage-based width
export const wp = (percentage: number): number => {
  const { width } = getDimensions();
  return (width * percentage) / 100;
};

// Percentage-based height
export const hp = (percentage: number): number => {
  const { height } = getDimensions();
  return (height * percentage) / 100;
};

// Platform-specific scaling with version compatibility
export const platformScale = (ios: number, android: number): number => {
  const baseSize = Platform.OS === "ios" ? ios : android;
  return scale(baseSize);
};

// Safe area padding with better handling
export const getSafeAreaPadding = (insets: {
  top: number;
  bottom: number;
  left: number;
  right: number;
}) => {
  return {
    paddingTop: Math.max(insets.top || 0, scale(Platform.OS === "ios" ? 20 : 16)),
    paddingBottom: Math.max(insets.bottom || 0, scale(Platform.OS === "ios" ? 20 : 16)),
    paddingLeft: Math.max(insets.left || 0, scale(16)),
    paddingRight: Math.max(insets.right || 0, scale(16)),
  };
};

// Minimum touch target size (accessibility - 44pt minimum)
export const MIN_TOUCH_TARGET = Math.max(scale(44), 44);

// Responsive border radius
export const getBorderRadius = (size: number): number => {
  return scale(size);
};

// Responsive spacing (consistent gaps and margins)
export const spacing = {
  xs: scale(4),
  sm: scale(8),
  md: scale(12),
  lg: scale(16),
  xl: scale(20),
  xxl: scale(24),
  xxxl: scale(32),
};

// Get status bar height (platform and version aware)
export const getStatusBarHeight = (): number => {
  if (Platform.OS === "ios") {
    // iOS: Use safe area insets, fallback to 44 for older devices
    return 44;
  } else {
    // Android: Use StatusBar.currentHeight or fallback
    return StatusBar?.currentHeight || scale(24);
  }
};

// Export dimensions for direct use (with orientation handling)
const dims = getDimensions();
export const SCREEN_WIDTH = dims.width;
export const SCREEN_HEIGHT = dims.height;

