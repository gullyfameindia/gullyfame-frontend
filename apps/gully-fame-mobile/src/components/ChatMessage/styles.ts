import { Dimensions, StyleSheet } from "react-native";
import { colors, font, radius, space } from "@/theme/tokens";

const SCREEN_WIDTH = Dimensions.get("window").width;
const MAX_BUBBLE_WIDTH = SCREEN_WIDTH * 0.78;

export const chatMessageStyles = StyleSheet.create({
  messageItemContainer: {
    marginBottom: 8,
  },
  messageWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: space.sm,
  },
  messageSent: {
    justifyContent: "flex-end",
  },
  messageReceived: {
    justifyContent: "flex-start",
  },
  messageSelected: {
    backgroundColor: "rgba(236, 154, 21, 0.12)",
    borderRadius: radius.md,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  messageHighlighted: {
    opacity: 0.75,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  messageAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.card,
  },
  /** Keeps received bubbles lined up when the avatar is hidden (same sender in a row). */
  avatarSpacer: {
    width: 26,
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: MAX_BUBBLE_WIDTH,
  },
  messageBubbleSent: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 6,
  },
  messageBubbleReceived: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: font.regular,
  },
  messageTextSent: {
    color: "#1A1A1A",
  },
  messageTextReceived: {
    color: colors.text,
  },
  deletedText: {
    fontStyle: "italic",
  },
  deletedTextSent: {
    color: "rgba(26, 26, 26, 0.65)",
  },
  deletedTextReceived: {
    color: colors.textMuted,
  },
  /** "Forwarded" label above the text. */
  forwardedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  forwardedText: {
    fontSize: 11,
    fontFamily: font.medium,
    fontStyle: "italic",
  },
  forwardedTextSent: {
    color: "rgba(26, 26, 26, 0.7)",
  },
  forwardedTextReceived: {
    color: colors.textMuted,
  },
  /** Time and read ticks, bottom-right inside the bubble. */
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: 10,
    fontFamily: font.regular,
  },
  metaTextSent: {
    color: "rgba(26, 26, 26, 0.65)",
  },
  metaTextReceived: {
    color: colors.textMuted,
  },
  reactionsContainer: {
    flexDirection: "row",
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    gap: 2,
  },
  reactionBadge: {
    fontSize: 13,
  },
});
