import React from "react";
import { View, TouchableOpacity, Text, Image, Dimensions } from "react-native";
import { Check, CheckCheck, CornerUpRight } from "lucide-react-native";
import { chatMessageStyles as styles } from "./styles";
import { type ChatMessage as ChatMessageAPIData } from "@/api/services/chatService";
import { colors } from "@/theme/tokens";

const SCREEN_WIDTH = Dimensions.get("window").width;
const MAX_BUBBLE_WIDTH = SCREEN_WIDTH * 0.78;

/** "7:42 pm" in the phone's locale. */
const timeOf = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

interface ChatMessageProps {
  message: ChatMessageAPIData;
  isSelected: boolean;
  isHighlighted: boolean;
  reactions: string[];
  isSent: boolean;
  chatUserAvatar: any;
  onPress: (msgId: string) => void;
  onLongPress: (msg: ChatMessageAPIData, event: any) => void;
  isMultiSelectMode: boolean;
  /** False when the previous message is from the same person (avatar hidden, tighter spacing). */
  showAvatar?: boolean;
}

function ChatMessage({
  message,
  isHighlighted,
  isSelected,
  reactions,
  isMultiSelectMode,
  isSent,
  chatUserAvatar,
  onPress,
  onLongPress,
  showAvatar = true,
}: ChatMessageProps) {
  const deleted = message.is_deleted;
  const textStyle = [
    styles.messageText,
    isSent ? styles.messageTextSent : styles.messageTextReceived,
    deleted && styles.deletedText,
    deleted && (isSent ? styles.deletedTextSent : styles.deletedTextReceived),
  ];
  const metaStyle = [styles.metaText, isSent ? styles.metaTextSent : styles.metaTextReceived];
  // Read receipts are only meaningful on messages I sent.
  const read = Boolean(message.read_at || message.is_read);

  return (
    <View style={styles.messageItemContainer}>
      <View
        style={[
          styles.messageWrapper,
          isSent ? styles.messageSent : styles.messageReceived,
          isSelected && styles.messageSelected,
          isHighlighted && styles.messageHighlighted,
        ]}
      >
        {isMultiSelectMode && (
          <TouchableOpacity
            accessibilityRole="checkbox"
            accessibilityLabel="Select message"
            accessibilityState={{ checked: !!isSelected }}
            style={styles.checkbox}
            onPress={() => onPress(message._id)}
          >
            {isSelected && <View style={styles.checkboxSelected} />}
          </TouchableOpacity>
        )}

        {!isSent &&
          (showAvatar ? (
            <Image source={chatUserAvatar} style={styles.messageAvatar} />
          ) : (
            <View style={styles.avatarSpacer} />
          ))}

        <TouchableOpacity
          activeOpacity={0.9}
          onLongPress={(e) => onLongPress(message, e)}
          onPress={() => onPress(message._id)}
          delayLongPress={300}
        >
          <View
            style={[
              styles.messageBubble,
              isSent ? styles.messageBubbleSent : styles.messageBubbleReceived,
              { maxWidth: MAX_BUBBLE_WIDTH },
            ]}
          >
            {message.is_forwarded && !deleted ? (
              <View style={styles.forwardedRow}>
                <CornerUpRight size={11} color={isSent ? "rgba(26,26,26,0.7)" : colors.textMuted} strokeWidth={2.2} />
                <Text style={[styles.forwardedText, isSent ? styles.forwardedTextSent : styles.forwardedTextReceived]}>
                  Forwarded
                </Text>
              </View>
            ) : null}

            <Text style={textStyle}>{deleted ? "This message was deleted" : message.message}</Text>

            <View style={styles.metaRow}>
              <Text style={metaStyle}>{timeOf(message.createdAt)}</Text>
              {isSent && !deleted ? (
                read ? (
                  <CheckCheck size={13} color="#1A1A1A" strokeWidth={2.4} />
                ) : (
                  <Check size={13} color="rgba(26, 26, 26, 0.65)" strokeWidth={2.4} />
                )
              ) : null}
            </View>
          </View>

          {reactions.length > 0 && (
            <View style={styles.reactionsContainer}>
              {reactions.map((emoji, idx) => (
                <Text key={idx} style={styles.reactionBadge}>
                  {emoji}
                </Text>
              ))}
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const Message = React.memo(ChatMessage);
Message.displayName = "ChatMessage";
export default Message;
