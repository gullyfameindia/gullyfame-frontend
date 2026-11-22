/**
 * GullyFame design tokens. Use these instead of raw hex values / sizes in new code.
 * Look: warm brown page, near-black cards with a faint gold edge, one orange accent.
 */
export const colors = {
  page: "#3C2610",
  card: "#1A1A1A",
  cardBorder: "rgba(236, 154, 21, 0.35)",
  field: "#252525",
  line: "#3A3A3A",

  accent: "#EC9A15",
  accentSoft: "rgba(236, 154, 21, 0.15)",

  text: "#FFFFFF",
  textBody: "#CAD7D8",
  textMuted: "#8A8F90",
  placeholder: "#7C8283",

  danger: "#F87171",
  dangerSolid: "#DC2626",
  dangerSoft: "rgba(248, 113, 113, 0.12)",
  success: "#34D399",
  successSoft: "rgba(52, 211, 153, 0.12)",
} as const;

/** Three corner sizes only: chips/inputs, buttons/cards, sheets/hero cards. */
export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

/** Playfair for screen titles only; Inter for everything else. */
export const font = {
  title: "PlayfairDisplay_800ExtraBold",
  titleMedium: "PlayfairDisplay_700Bold",
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

export const type = {
  screenTitle: { fontFamily: font.title, fontSize: 22, color: colors.text },
  headerTitle: { fontFamily: font.titleMedium, fontSize: 19, color: colors.text },
  section: { fontFamily: font.semibold, fontSize: 16, color: colors.text },
  body: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.textBody },
  caption: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: colors.textMuted },
  label: { fontFamily: font.semibold, fontSize: 13, color: colors.textBody },
  button: { fontFamily: font.bold, fontSize: 16 },
} as const;
