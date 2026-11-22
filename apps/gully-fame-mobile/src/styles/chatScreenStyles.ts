import { StyleSheet } from "react-native";
import { colors, font, radius, space } from "@/theme/tokens";

/** Chat screen, in the app's dark brown theme (same tokens as Home, Inbox and the profiles). */
export const chatScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.page,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.sm,
    backgroundColor: colors.page,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginHorizontal: space.xs,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    color: colors.text,
    fontSize: 16,
    fontFamily: font.semibold,
  },
  /** @username, or the connection state while the socket is down. */
  headerSub: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: font.regular,
    marginTop: 1,
  },
  headerSubWarn: {
    color: colors.accent,
  },
  headerCancelText: {
    fontSize: 15,
    color: colors.accent,
    fontFamily: font.semibold,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontFamily: font.semibold,
    textAlign: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.lg,
    flexGrow: 1,
  },

  /** Long-press menu above a message. */
  actionBar: {
    position: "absolute",
    top: 0,
    left: 0,
    alignItems: "center",
    zIndex: 1000,
  },
  actionBarContent: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space.xs,
    paddingVertical: space.xs,
    gap: 2,
  },
  actionBarButton: {
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 56,
  },
  actionBarButtonText: {
    color: colors.text,
    fontSize: 11,
    fontFamily: font.medium,
  },
  actionBarButtonDanger: {
    color: colors.danger,
  },
  reactionRow: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    marginBottom: space.sm,
    gap: space.sm,
    alignSelf: "center",
  },
  reactionEmoji: {
    padding: 4,
  },
  reactionEmojiText: {
    fontSize: 22,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    backgroundColor: colors.page,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    gap: space.sm,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    minHeight: 44,
    maxHeight: 120,
  },
  input: {
    flex: 1,
    color: colors.text,
    paddingVertical: 10,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: font.regular,
  },
  charCount: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: font.regular,
    marginLeft: space.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: colors.field,
    borderWidth: 1,
    borderColor: colors.line,
  },

  /** "More" menu: a bottom sheet, like the rest of the app. */
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  menuContainer: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: colors.cardBorder,
    paddingTop: space.sm,
  },
  menuGrabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: space.sm,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: space.xl,
    minHeight: 54,
  },
  menuItemText: {
    color: colors.text,
    fontSize: 16,
    fontFamily: font.medium,
  },
  menuItemDanger: {
    color: colors.danger,
  },

  /** Forward sheet. */
  forwardScreenContainer: {
    flex: 1,
    backgroundColor: colors.page,
  },
  forwardScreenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.sm,
    paddingBottom: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  forwardScreenTitle: {
    flex: 1,
    fontSize: 18,
    color: colors.text,
    fontFamily: font.titleMedium,
    textAlign: "center",
  },
  forwardChatList: {
    flex: 1,
  },
  forwardChatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: 10,
  },
  forwardChatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
  },
  forwardChatName: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    fontFamily: font.semibold,
  },
  forwardChatCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  forwardBottomBar: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  forwardSendButton: {
    backgroundColor: colors.accent,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  forwardSendButtonText: {
    color: "#1A1A1A",
    fontSize: 16,
    fontFamily: font.bold,
  },

  /** Empty state, in the same card style as Home and Inbox. */
  emptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyCard: {
    flexDirection: "row",
    gap: space.md,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.25)",
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontFamily: font.semibold,
  },
  emptyText: {
    color: colors.textBody,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
    fontFamily: font.regular,
  },

  /** Day separator between messages ("Today", "Yesterday", a date). */
  dayRow: {
    alignSelf: "center",
    marginVertical: space.md,
    paddingHorizontal: space.md,
    height: 24,
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
  },
  dayText: {
    color: colors.textBody,
    fontSize: 12,
    fontFamily: font.medium,
  },
});
