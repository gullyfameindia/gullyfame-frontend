import { View, TouchableOpacity, Text, Image, Dimensions } from "react-native";
import { chatMessageStyles as styles } from "./styles";
import { type ChatMessage as ChatMessageAPIData } from "@/api/services/chatService";
import React from "react";
const SCREEN_WIDTH = Dimensions.get("window").width;
const MAX_BUBBLE_WIDTH = SCREEN_WIDTH * 0.8;
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
}: ChatMessageProps) {
  const avatarSource = isSent
    ? require("@assets/images/default-avatar.png")
    : chatUserAvatar;
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
            style={styles.checkbox}
            onPress={() => onPress(message._id)}
          >
            {isSelected && <View style={styles.checkboxSelected} />}
          </TouchableOpacity>
        )}

        {!isSent && (
          <Image source={avatarSource} style={styles.messageAvatar} />
        )}

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
            <Text
              style={[
                styles.messageText,
                isSent ? styles.messageTextSent : styles.messageTextReceived,
              ]}
            >
              {message.is_deleted ? "This message was deleted" : message.message}
            </Text>
            {reactions.length > 0 && (
              <View style={styles.reactionsContainer}>
                {reactions.map((emoji, idx) => (
                  <Text key={idx} style={styles.reactionBadge}>
                    {emoji}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const Message = React.memo(ChatMessage);
Message.displayName = "ChatMessage";
export default Message;
