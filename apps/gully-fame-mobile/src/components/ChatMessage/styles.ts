import { Dimensions, Platform, StyleSheet } from "react-native";
const SCREEN_WIDTH = Dimensions.get("window").width;
const MAX_BUBBLE_WIDTH = SCREEN_WIDTH * 0.8;
export const chatMessageStyles = StyleSheet.create({
  messageItemContainer: {
    marginBottom: 16,
  },
  messageWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  messageSent: {
    justifyContent: "flex-end",
  },
  messageReceived: {
    justifyContent: "flex-start",
  },
  messageSelected: {
    backgroundColor: "rgba(236, 154, 21, 0.1)",
    borderRadius: 12,
    padding: 4,
  },
  messageHighlighted: {
    opacity: 0.8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#72777A",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  checkboxSelected: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#EC9A15",
  },
  messageAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: MAX_BUBBLE_WIDTH,
  },
  messageBubbleSent: {
    backgroundColor: "#EC9A15",
  },
  messageBubbleReceived: {
    backgroundColor: "#F5F5F5",
  },
  messageText: {
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextSent: {
    color: "#FFFFFF",
  },
  messageTextReceived: {
    color: "#000000",
  },
  reactionsContainer: {
    flexDirection: "row",
    marginTop: 4,
    gap: 4,
  },
  reactionBadge: {
    fontSize: 16,
  },
});
