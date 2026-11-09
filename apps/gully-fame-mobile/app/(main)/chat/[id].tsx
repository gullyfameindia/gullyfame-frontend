import { useState, useEffect, useRef, useCallback } from "react";
import { safeIdParam } from "@/utils/routeParams";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Modal,
  Alert,
  Animated,
  FlatList,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import * as Clipboard from "expo-clipboard";
import {
  ChatMessage,
  getChatDetails,
  getChatList,
  sendMessage,
  toggleReaction,
  deleteMessages,
  markConversationRead,
  MESSAGE_MAX_LENGTH,
  DeleteType,
} from "@api/services/chatService";
import { socketChatService } from "@api/services/socketChatService";
import { getErrorMessage } from "@api/client";
import { getChatContacts, rememberChatContact, fallbackChatName } from "@utils/chatContacts";
import { showToast, toastError, toastSuccess } from "@components/ui/Toast";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BackIcon, MicIcon, SendIcon } from "@/icons";
import { chatScreenStyles as styles } from "@/styles/chatScreenStyles";
import Message from "@/components/ChatMessage/ChatMessage";
import { Skeleton, SkeletonRoot } from "@/components/Skeleton/Skeleton";
import { blockUser, reportContent } from "@/utils/moderation";

const getDimensions = () => Dimensions.get("window");
const SCREEN_WIDTH = Dimensions.get("window").width;
const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "🙏", "🔥"];
export default function ChatDetailScreen() {
  const { id, name, avatar } = useLocalSearchParams();
  const chatUserId = safeIdParam(id);
  const [, setDimensions] = useState(getDimensions());
  const [message, setMessage] = useState("");
  const [androidKeyboardSpacer, setAndroidKeyboardSpacer] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showForwardScreen, setShowForwardScreen] = useState(false);
  const [forwardingMessages, setForwardingMessages] = useState<any[]>([]);
  const [forwardTargets, setForwardTargets] = useState<{ id: string; name: string; avatar: any }[]>([]);
  const [selectedForwardChats, setSelectedForwardChats] = useState<string[]>(
    [],
  );
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(
    new Set(),
  );
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [actionBarPosition] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));
  const [actionBarOpacity] = useState(() => new Animated.Value(0));
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatUserName, setChatUserName] = useState(name || "User");
  const [chatUserAvatar, setChatUserAvatar] = useState(
    require("@assets/images/user1.png"),
  );
  const [isOnline] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [, setSocketConnected] = useState(false);
  const [, setSocketError] = useState<string | null>(null);
  useEffect(() => {
    if (Platform.OS === "ios") return;
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setAndroidKeyboardSpacer(e.endCoordinates.height + 10);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setAndroidKeyboardSpacer(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  
  // Who I am (cached from the profile) and who I'm talking to.
  useEffect(() => {
    (async () => {
      setCurrentUserId(await AsyncStorage.getItem("userId"));
      const contacts = await getChatContacts();
      const known = contacts[chatUserId];
      const displayName = (name as string) || known?.name || fallbackChatName(chatUserId || "");
      setChatUserName(displayName);
      const avatarUrl = (avatar as string) || known?.avatar || "";
      if (avatarUrl) setChatUserAvatar({ uri: avatarUrl });
      if (name || avatar) rememberChatContact(chatUserId, { name: name as string, avatar: avatar as string });
    })();
  }, [chatUserId, name, avatar]);

  // GET /chat/chatDetails returns newest first; the screen shows oldest -> newest.
  const loadMessages = useCallback(async () => {
    if (!chatUserId || chatUserId === "new") {
      setLoading(false);
      return;
    }
    try {
      const page = await getChatDetails(chatUserId, 1, 50);
      setMessages([...page.messages].reverse());
      markConversationRead(chatUserId).catch(() => undefined);
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [chatUserId]);

  useFocusEffect(
    useCallback(() => {
      loadMessages();
    }, [loadMessages])
  );

  // Live delivery: the backend emits `new_message` to the receiver's room.
  useEffect(() => {
    socketChatService.connect();
    setSocketConnected(socketChatService.isConnected());
    const offStatus = socketChatService.onStatusChange((connected) => {
      setSocketConnected(connected);
      setSocketError(connected ? null : "Reconnecting…");
    });
    const offMessage = socketChatService.onMessage((incoming) => {
      if (String(incoming.sender_id) !== chatUserId) return;
      setMessages((prev) => (prev.some((m) => m._id === incoming._id) ? prev : [...prev, incoming]));
      markConversationRead(chatUserId).catch(() => undefined);
    });
    return () => {
      offStatus();
      offMessage();
    };
  }, [chatUserId]);

  useEffect(() => {
    if (scrollViewRef.current && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // POST /chat/sendChat; the response carries the saved message.
  const handleSend = async () => {
    const messageText = message.trim();
    if (!messageText || !chatUserId || chatUserId === "new" || sending) return;
    if (messageText.length > MESSAGE_MAX_LENGTH) {
      toastError(`Messages can be up to ${MESSAGE_MAX_LENGTH} characters.`);
      return;
    }
    setSending(true);
    setMessage("");
    try {
      const result = await sendMessage(chatUserId, messageText);
      setMessages((prev) => [...prev, result.message]);
      rememberChatContact(chatUserId, { name: String(chatUserName) });
    } catch (error) {
      setMessage(messageText);
      toastError(getErrorMessage(error));
    } finally {
      setSending(false);
    }
  };

  const handleMicPress = () => {
    showToast("Voice messages aren't available yet.", "info");
    // Voice recording feature not implemented in managed Expo workflow
    // Would require native audio module (expo-av supports playback but not voice memo recording)
    // TODO: Implement voice message recording when available
  };

  
  const handleMessageLongPress = useCallback(
    (msg: any, event: any) => {
      if (isMultiSelectMode) return;

      
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }

      setSelectedMessage(msg);

      
      if (event && event.nativeEvent) {
        const { pageY } = event.nativeEvent;
        actionBarPosition.setValue({ x: SCREEN_WIDTH / 2, y: pageY - 60 });
      }

      
      Animated.parallel([
        Animated.timing(actionBarOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [isMultiSelectMode, actionBarPosition, actionBarOpacity],
  );

  
  const handleMessagePress = useCallback(
    (msgId: string) => {
      if (isMultiSelectMode) {
        setSelectedMessages((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(msgId)) {
            newSet.delete(msgId);
          } else {
            newSet.add(msgId);
          }
          return newSet;
        });
      }
    },
    [isMultiSelectMode],
  );

  
  const hideActionBar = useCallback(() => {
    Animated.timing(actionBarOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setSelectedMessage(null);
    });
  }, [actionBarOpacity]);

  
  const handleCopyMessage = useCallback(() => {
    if (selectedMessage) {
      Clipboard.setStringAsync(selectedMessage.message || "");
      toastSuccess("Copied");
      hideActionBar();
      
      Alert.alert("Copied", "Message copied to clipboard");
    }
  }, [selectedMessage, hideActionBar]);

  
  const handleForwardMessage = useCallback(() => {
    if (isMultiSelectMode && selectedMessages.size > 0) {
      
      const messagesToForward = messages.filter((m: any) =>
        selectedMessages.has(m._id),
      );
      setForwardingMessages(messagesToForward);
    } else if (selectedMessage) {
      
      setForwardingMessages([selectedMessage]);
    }
    hideActionBar();
    setShowForwardScreen(true);
    setIsMultiSelectMode(false);
    setSelectedMessages(new Set());
  }, [
    isMultiSelectMode,
    selectedMessages,
    selectedMessage,
    hideActionBar,
    messages,
  ]);

  
  // POST /chat/message/delete { message_ids, delete_type }. "For everyone" only
  // works for my own messages that haven't been read yet.
  const runDelete = useCallback(
    async (ids: string[], type: DeleteType) => {
      try {
        await deleteMessages(ids, type);
        setMessages((prev) =>
          type === "for_me"
            ? prev.filter((m) => !ids.includes(m._id))
            : prev.map((m) => (ids.includes(m._id) ? { ...m, is_deleted: true, message: "" } : m))
        );
        toastSuccess(ids.length > 1 ? "Messages deleted" : "Message deleted");
      } catch (error) {
        toastError(getErrorMessage(error));
      } finally {
        setIsMultiSelectMode(false);
        setSelectedMessages(new Set());
        hideActionBar();
      }
    },
    [hideActionBar]
  );

  const handleDeleteMessage = useCallback(() => {
    const ids =
      isMultiSelectMode && selectedMessages.size > 0
        ? Array.from(selectedMessages)
        : selectedMessage
          ? [selectedMessage._id]
          : [];
    if (ids.length === 0) return;
    const allMine = ids.every((mid) => messages.find((m) => m._id === mid)?.sender_id === currentUserId);
    Alert.alert(ids.length > 1 ? "Delete Messages" : "Delete Message", `Delete ${ids.length} message(s)?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete for me", style: "destructive", onPress: () => runDelete(ids, "for_me") },
      ...(allMine
        ? [{ text: "Delete for everyone", style: "destructive" as const, onPress: () => runDelete(ids, "for_everyone") }]
        : []),
    ]);
  }, [isMultiSelectMode, selectedMessages, selectedMessage, messages, currentUserId, runDelete]);

  // POST /chat/message/:id/react toggles my emoji; the response has all reactions.
  const handleReactToMessage = useCallback(
    async (emoji: string) => {
      if (!selectedMessage) return;
      const msgId = selectedMessage._id;
      hideActionBar();
      try {
        const result = await toggleReaction(msgId, emoji);
        setMessages((prev) => prev.map((m) => (m._id === msgId ? { ...m, reactions: result.reactions } : m)));
      } catch (error) {
        toastError(getErrorMessage(error));
      }
    },
    [selectedMessage, hideActionBar],
  );

  const handleSelectMessage = useCallback(() => {
    if (selectedMessage) {
      setIsMultiSelectMode(true);
      setSelectedMessages(new Set([selectedMessage._id]));
      hideActionBar();
    }
  }, [selectedMessage, hideActionBar]);

  
  const handleSendForwardedMessages = useCallback(async () => {
    if (selectedForwardChats.length === 0) {
      Alert.alert("Select Chats", "Please select at least one chat to forward to");
      return;
    }
    try {
      for (const target of selectedForwardChats) {
        for (const msg of forwardingMessages) {
          if (msg?.message) await sendMessage(target, msg.message, null, true);
        }
      }
      toastSuccess(`Forwarded to ${selectedForwardChats.length} chat(s)`);
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
      setShowForwardScreen(false);
      setSelectedForwardChats([]);
      setForwardingMessages([]);
    }
  }, [selectedForwardChats, forwardingMessages]);

  // Forward targets are the people I already chat with.
  useEffect(() => {
    if (!showForwardScreen) return;
    (async () => {
      try {
        const [list, contacts] = await Promise.all([getChatList("all"), getChatContacts()]);
        setForwardTargets(
          list.chatlist
            .filter((c) => c.chatter_user_id !== chatUserId)
            .map((c) => ({
              id: c.chatter_user_id,
              name: contacts[c.chatter_user_id]?.name || fallbackChatName(c.chatter_user_id),
              avatar: contacts[c.chatter_user_id]?.avatar
                ? { uri: contacts[c.chatter_user_id].avatar }
                : require("@assets/images/user1.png"),
            }))
        );
      } catch (error) {
        toastError(getErrorMessage(error));
      }
    })();
  }, [showForwardScreen, chatUserId]);
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {}
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top, 10) + 10, paddingBottom: 12 },
        ]}
      >
        {isMultiSelectMode ? (
          <>
            <TouchableOpacity
              onPress={() => {
                setIsMultiSelectMode(false);
                setSelectedMessages(new Set());
              }}
            >
              <Text style={styles.headerCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {selectedMessages.size} selected
            </Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleDeleteMessage}
                style={styles.headerActionButton}
              >
                <Text style={styles.headerActionText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleForwardMessage}
                style={styles.headerActionButton}
              >
                <Text style={styles.headerActionText}>Forward</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={() => router.back()}
              testID="chat-back"
              style={styles.headerButton}
            >
              <BackIcon />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Image source={chatUserAvatar} style={styles.headerAvatar} />
              <View style={styles.headerInfo}>
                <Text style={styles.headerName}>{chatUserName}</Text>
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.onlineDot,
                      { backgroundColor: isOnline ? "#4CAF50" : "#72777A" },
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {isOnline ? "Always active" : "Offline"}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowMenu(true)}
              testID="chat-menu"
            >
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="5" r="1.5" fill="#72777A" />
                <Circle cx="12" cy="12" r="1.5" fill="#72777A" />
                <Circle cx="12" cy="19" r="1.5" fill="#72777A" />
              </Svg>
            </TouchableOpacity>
          </>
        )}
      </View>

      {}
      {loading ? (
        <SkeletonRoot style={{ flex: 1, padding: 16, gap: 14, justifyContent: "flex-end" }}>
          {["60%", "45%", "70%", "40%", "55%", "65%"].map((w, i) => (
            <Skeleton key={i} width={w as `${number}%`} height={40} radius={18} style={{ alignSelf: i % 2 ? "flex-end" : "flex-start" }} />
          ))}
        </SkeletonRoot>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={hideActionBar}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No messages yet. Start the conversation!
                </Text>
              </View>
            ) : (
              messages.map((msg) => (
                <Message
                  key={msg._id}
                  chatUserAvatar={chatUserAvatar}
                  isHighlighted={
                    selectedMessage?._id === msg._id && !isMultiSelectMode
                  }
                  isMultiSelectMode={isMultiSelectMode}
                  isSelected={
                    isMultiSelectMode && selectedMessages.has(msg._id)
                  }
                  isSent={msg.sender_id === currentUserId}
                  message={msg}
                  onLongPress={handleMessageLongPress}
                  onPress={handleMessagePress}
                  reactions={(msg.reactions || []).map((r) => r.emoji)}
                ></Message>
              ))
            )}
          </ScrollView>
          {selectedMessage && !isMultiSelectMode && (
            <Animated.View
              style={[
                styles.actionBar,
                {
                  position: "absolute",
                  zIndex: 1000,
                  opacity: actionBarOpacity,
                  transform: [
                    {
                      translateX: actionBarPosition.x.interpolate({
                        inputRange: [0, SCREEN_WIDTH],
                        outputRange: [-SCREEN_WIDTH / 2, SCREEN_WIDTH / 2],
                      }),
                    },
                    { translateY: actionBarPosition.y },
                  ],
                },
              ]}
              pointerEvents="box-none"
            >
              <View style={styles.actionBarContent}>
                {}
                <TouchableOpacity
                  style={styles.actionBarButton}
                  onPress={handleCopyMessage}
                >
                  <Text style={styles.actionBarButtonText}>Copy</Text>
                </TouchableOpacity>
                {}
                <TouchableOpacity
                  style={styles.actionBarButton}
                  onPress={handleForwardMessage}
                >
                  <Text style={styles.actionBarButtonText}>Forward</Text>
                </TouchableOpacity>
                {}
                <TouchableOpacity
                  style={styles.actionBarButton}
                  onPress={handleDeleteMessage}
                >
                  <Text
                    style={[
                      styles.actionBarButtonText,
                      styles.actionBarButtonDanger,
                    ]}
                  >
                    Delete
                  </Text>
                </TouchableOpacity>
                {/* React button - currently no emoji picker implementation */}
                <TouchableOpacity
                  style={styles.actionBarButton}
                  disabled={true}
                >
                  <Text style={[styles.actionBarButtonText, { opacity: 0.5 }]}>React</Text>
                </TouchableOpacity>
                {}
                <TouchableOpacity
                  style={styles.actionBarButton}
                  onPress={handleSelectMessage}
                >
                  <Text style={styles.actionBarButtonText}>Select</Text>
                </TouchableOpacity>
              </View>

              {}
              <View style={styles.reactionRow}>
                {REACTION_EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.reactionEmoji}
                    onPress={() => handleReactToMessage(emoji)}
                  >
                    <Text style={styles.reactionEmojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}

          {}
          {selectedMessage && !isMultiSelectMode && (
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={hideActionBar}
            />
          )}
        </View>
      )}

      {}
      <View
        style={[
          styles.inputContainer,
          {
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ]}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            testID="chat-input"
            placeholderTextColor="#72777A"
            value={message}
            onChangeText={setMessage}
            multiline
          />
          <TouchableOpacity style={styles.micButton} onPress={handleMicPress}>
            <MicIcon />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!message.trim() || sending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          testID="chat-send"
          disabled={!message.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <SendIcon />
          )}
        </TouchableOpacity>
      </View>
      {Platform.OS === "android" && (
        <View style={{ height: androidKeyboardSpacer }}></View>
      )}
      {}
      <Modal
        visible={showForwardScreen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowForwardScreen(false);
          setSelectedForwardChats([]);
        }}
      >
        <View style={styles.forwardScreenContainer}>
          <View
            style={[
              styles.forwardScreenHeader,
              { paddingTop: Math.max(insets.top, 10) + 10 },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                setShowForwardScreen(false);
                setSelectedForwardChats([]);
              }}
            >
              <BackIcon color="#000" />
            </TouchableOpacity>
            <Text style={styles.forwardScreenTitle}>Forward to</Text>
            <View style={{ width: 24 }} />
          </View>

          <FlatList
            data={forwardTargets}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <Text style={[styles.forwardChatName, { textAlign: "center", marginTop: 24 }]}>No other chats yet</Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.forwardChatItem}
                onPress={() => {
                  setSelectedForwardChats((prev) => {
                    const newSet = [...prev];
                    const index = newSet.indexOf(item.id);
                    if (index > -1) {
                      newSet.splice(index, 1);
                    } else {
                      newSet.push(item.id);
                    }
                    return newSet;
                  });
                }}
              >
                <Image source={item.avatar} style={styles.forwardChatAvatar} />
                <Text style={styles.forwardChatName}>{item.name}</Text>
                {selectedForwardChats.includes(item.id) && (
                  <View style={styles.forwardChatCheck}>
                    <Text style={styles.forwardChatCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            style={styles.forwardChatList}
          />

          {selectedForwardChats.length > 0 && (
            <View
              style={[
                styles.forwardBottomBar,
                { paddingBottom: Math.max(insets.bottom, 10) },
              ]}
            >
              <TouchableOpacity
                style={styles.forwardSendButton}
                onPress={handleSendForwardedMessages}
              >
                <Text style={styles.forwardSendButtonText}>
                  Send ({selectedForwardChats.length})
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                Alert.alert("Delete Chat", "Are you sure?", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => router.back(),
                  },
                ]);
              }}
            >
              <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                Delete Chat
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                Alert.alert("Report", "Report this user's messages? This opens an email to our support team.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Report", style: "destructive", onPress: () => reportContent("chat", chatUserId) },
                ]);
              }}
            >
              <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                Report
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                Alert.alert(
                  "Block this user?",
                  "You won't see their reels, comments or chat in your inbox. You can unblock them from Settings & Help > Blocked Users.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Block",
                      style: "destructive",
                      onPress: async () => {
                        await blockUser(chatUserId, (name as string) || "User");
                        router.back();
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                Block
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}
