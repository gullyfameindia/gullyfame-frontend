import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Pressable,
  Animated,
  FlatList,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import { safeBack } from "@/utils/safeBack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import {
  Ban,
  Check,
  ChevronLeft,
  Copy,
  CornerUpRight,
  EllipsisVertical,
  Flag,
  ListChecks,
  MessageCircle,
  SendHorizontal,
  Trash2,
  X,
} from "lucide-react-native";
import {
  ChatMessage,
  getChatDetails,
  getChatList,
  sendMessage,
  toggleReaction,
  deleteMessages,
  markConversationRead,
  clearConversationForMe,
  MESSAGE_MAX_LENGTH,
  DeleteType,
} from "@api/services/chatService";
import { socketChatService } from "@api/services/socketChatService";
import { getErrorMessage } from "@api/client";
import { getChatContacts, rememberChatContact, fallbackChatName } from "@utils/chatContacts";
import { toastError, toastSuccess } from "@components/ui/Toast";
import ConfirmPopup from "@components/ui/ConfirmPopup";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { chatScreenStyles as styles } from "@/styles/chatScreenStyles";
import Message from "@/components/ChatMessage/ChatMessage";
import { Skeleton, SkeletonRoot } from "@/components/Skeleton/Skeleton";
import { blockUser, reportContent } from "@/utils/moderation";
import { colors } from "@/theme/tokens";

const getDimensions = () => Dimensions.get("window");
const SCREEN_WIDTH = Dimensions.get("window").width;
const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "🙏", "🔥"];
/** The character counter appears once the message is this close to the limit. */
const COUNTER_FROM = MESSAGE_MAX_LENGTH - 200;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "Today", "Yesterday", or a short date for the separator between days. */
function dayLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = startOfDay(date);
  const today = startOfDay(new Date());
  if (day === today) return "Today";
  if (day === today - 24 * 60 * 60 * 1000) return "Yesterday";
  return date.toLocaleDateString([], { day: "numeric", month: "short", year: day < today - 300 * 86400000 ? "numeric" : undefined });
}

export default function ChatDetailScreen() {
  const { id, name, avatar, username } = useLocalSearchParams();
  const chatUserId = safeIdParam(id);
  const [, setDimensions] = useState(getDimensions());
  const [message, setMessage] = useState("");
  const [androidKeyboardSpacer, setAndroidKeyboardSpacer] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showForwardScreen, setShowForwardScreen] = useState(false);
  const [forwardingMessages, setForwardingMessages] = useState<any[]>([]);
  const [forwardTargets, setForwardTargets] = useState<{ id: string; name: string; avatar: any }[]>([]);
  const [selectedForwardChats, setSelectedForwardChats] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [actionBarTop] = useState(() => new Animated.Value(0));
  const [actionBarOpacity] = useState(() => new Animated.Value(0));

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatUserName, setChatUserName] = useState(name || "User");
  const [chatUserHandle, setChatUserHandle] = useState(String(username || ""));
  const [chatUserAvatar, setChatUserAvatar] = useState(require("@assets/images/default-avatar.png"));
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  // My own connection to the live-message socket (the backend reports no presence for other people).
  const [socketConnected, setSocketConnected] = useState(true);
  // Confirmations, in the app's own popup rather than the system alert.
  const [confirm, setConfirm] = useState<
    | null
    | { kind: "deleteMessages"; ids: string[]; allMine: boolean; anyRead: boolean }
    | { kind: "deleteChat" }
    | { kind: "block" }
  >(null);
  const [deletingChat, setDeletingChat] = useState(false);

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

  useEffect(() => {
    if (username) setChatUserHandle(String(username));
  }, [username]);

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
    const offStatus = socketChatService.onStatusChange(setSocketConnected);
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

  const handleMessageLongPress = useCallback(
    (msg: any, event: any) => {
      if (isMultiSelectMode) return;
      setSelectedMessage(msg);
      // Sit the menu just above the message, clear of the header and the input bar.
      if (event?.nativeEvent) {
        const { pageY } = event.nativeEvent;
        const top = Math.min(Math.max(pageY - 150, insets.top + 60), getDimensions().height - 260);
        actionBarTop.setValue(top);
      }
      actionBarOpacity.setValue(0);
      Animated.timing(actionBarOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    },
    [isMultiSelectMode, actionBarTop, actionBarOpacity, insets.top]
  );

  const handleMessagePress = useCallback(
    (msgId: string) => {
      if (isMultiSelectMode) {
        setSelectedMessages((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(msgId)) newSet.delete(msgId);
          else newSet.add(msgId);
          return newSet;
        });
      }
    },
    [isMultiSelectMode]
  );

  const hideActionBar = useCallback(() => {
    Animated.timing(actionBarOpacity, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setSelectedMessage(null);
    });
  }, [actionBarOpacity]);

  const handleCopyMessage = useCallback(() => {
    if (!selectedMessage) return;
    Clipboard.setStringAsync(selectedMessage.message || "");
    hideActionBar();
    toastSuccess("Copied");
  }, [selectedMessage, hideActionBar]);

  const handleForwardMessage = useCallback(() => {
    if (isMultiSelectMode && selectedMessages.size > 0) {
      setForwardingMessages(messages.filter((m: any) => selectedMessages.has(m._id)));
    } else if (selectedMessage) {
      setForwardingMessages([selectedMessage]);
    }
    hideActionBar();
    setShowForwardScreen(true);
    setIsMultiSelectMode(false);
    setSelectedMessages(new Set());
  }, [isMultiSelectMode, selectedMessages, selectedMessage, hideActionBar, messages]);

  // POST /chat/message/delete { message_ids, delete_type }. "For everyone" only
  // works for my own messages that haven't been read yet.
  const runDelete = useCallback(
    async (ids: string[], type: DeleteType) => {
      setConfirm(null);
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
    const picked = ids.map((mid) => messages.find((m) => m._id === mid)).filter(Boolean) as ChatMessage[];
    const allMine = picked.every((m) => m.sender_id === currentUserId);
    // The server refuses "for everyone" once the other person has read the message.
    const anyRead = picked.some((m) => Boolean(m.read_at || m.is_read));
    hideActionBar();
    setConfirm({ kind: "deleteMessages", ids, allMine, anyRead });
  }, [isMultiSelectMode, selectedMessages, selectedMessage, messages, currentUserId, hideActionBar]);

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
    [selectedMessage, hideActionBar]
  );

  const handleSelectMessage = useCallback(() => {
    if (selectedMessage) {
      setIsMultiSelectMode(true);
      setSelectedMessages(new Set([selectedMessage._id]));
      hideActionBar();
    }
  }, [selectedMessage, hideActionBar]);

  const handleSendForwardedMessages = useCallback(async () => {
    if (selectedForwardChats.length === 0) return;
    try {
      for (const target of selectedForwardChats) {
        for (const msg of forwardingMessages) {
          if (msg?.message) await sendMessage(target, msg.message, null, true);
        }
      }
      toastSuccess(`Forwarded to ${selectedForwardChats.length} chat${selectedForwardChats.length > 1 ? "s" : ""}`);
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
      setShowForwardScreen(false);
      setSelectedForwardChats([]);
      setForwardingMessages([]);
    }
  }, [selectedForwardChats, forwardingMessages]);

  // Deletes every message of this conversation for me (there is no delete-conversation endpoint).
  const handleDeleteChat = useCallback(async () => {
    setConfirm(null);
    setDeletingChat(true);
    try {
      await clearConversationForMe(chatUserId);
      setMessages([]);
      toastSuccess("Chat deleted");
      safeBack("/(main)/inbox");
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
      setDeletingChat(false);
    }
  }, [chatUserId]);

  const handleBlock = useCallback(async () => {
    setConfirm(null);
    try {
      await blockUser(chatUserId, String(chatUserName) || "User");
      safeBack("/(main)/inbox");
    } catch (error) {
      toastError(getErrorMessage(error));
    }
  }, [chatUserId, chatUserName]);

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
              name: c.name || contacts[c.chatter_user_id]?.name || fallbackChatName(c.chatter_user_id),
              avatar: contacts[c.chatter_user_id]?.avatar
                ? { uri: contacts[c.chatter_user_id].avatar }
                : require("@assets/images/default-avatar.png"),
            }))
        );
      } catch (error) {
        toastError(getErrorMessage(error));
      }
    })();
  }, [showForwardScreen, chatUserId]);

  // Messages with a day separator before the first message of each day, and the avatar
  // only on the first of a run from the same person.
  const rows = useMemo(
    () =>
      messages.map((msg, i) => {
        const prev = i > 0 ? messages[i - 1] : null;
        const label = dayLabel(msg.createdAt);
        const newDay = !prev || label !== dayLabel(prev.createdAt);
        return {
          msg,
          dayLabel: newDay ? label : null,
          showAvatar: newDay || !prev || String(prev.sender_id) !== String(msg.sender_id),
        };
      }),
    [messages]
  );

  const handle = chatUserHandle ? `@${chatUserHandle.replace(/^@+/, "")}` : "";
  const overLimit = message.length > MESSAGE_MAX_LENGTH;
  const canSend = !!message.trim() && !sending && !overLimit;

  const menuItems = [
    { key: "report", label: "Report", icon: Flag, danger: false, onPress: () => reportContent("chat", chatUserId) },
    { key: "block", label: "Block", icon: Ban, danger: true, onPress: () => setConfirm({ kind: "block" }) },
    { key: "delete", label: "Delete chat", icon: Trash2, danger: true, onPress: () => setConfirm({ kind: "deleteChat" }) },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.page} />

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) + 6, paddingBottom: 10 }]}>
        {isMultiSelectMode ? (
          <>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                setIsMultiSelectMode(false);
                setSelectedMessages(new Set());
              }}
              accessibilityLabel="Cancel selection"
            >
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{selectedMessages.size} selected</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleForwardMessage}
                style={styles.headerActionButton}
                disabled={selectedMessages.size === 0}
                accessibilityLabel="Forward"
              >
                <CornerUpRight size={22} color={selectedMessages.size ? colors.text : colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteMessage}
                style={styles.headerActionButton}
                disabled={selectedMessages.size === 0}
                accessibilityLabel="Delete"
              >
                <Trash2 size={22} color={selectedMessages.size ? colors.danger : colors.textMuted} />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={10}
              onPress={() => safeBack("/(main)/inbox")}
              testID="chat-back"
              style={styles.headerButton}
            >
              <ChevronLeft size={28} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Image source={chatUserAvatar} style={styles.headerAvatar} />
              <View style={styles.headerInfo}>
                <Text style={styles.headerName} numberOfLines={1}>
                  {chatUserName}
                </Text>
                {!socketConnected ? (
                  <Text style={[styles.headerSub, styles.headerSubWarn]}>Connecting…</Text>
                ) : handle ? (
                  <Text style={styles.headerSub} numberOfLines={1}>
                    {handle}
                  </Text>
                ) : null}
              </View>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="More options"
              style={styles.headerButton}
              onPress={() => setShowMenu(true)}
              testID="chat-menu"
            >
              <EllipsisVertical size={22} color={colors.text} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {loading ? (
        <SkeletonRoot style={{ flex: 1, padding: 16, gap: 14, justifyContent: "flex-end" }}>
          {["60%", "45%", "70%", "40%", "55%", "65%"].map((w, i) => (
            <Skeleton
              key={i}
              width={w as `${number}%`}
              height={40}
              radius={18}
              style={{ alignSelf: i % 2 ? "flex-end" : "flex-start" }}
            />
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
            keyboardShouldPersistTaps="handled"
          >
            {rows.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIcon}>
                    <MessageCircle size={22} color={colors.accent} strokeWidth={1.8} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.emptyTitle}>No messages yet</Text>
                    <Text style={styles.emptyText}>
                      Say hello to {chatUserName} — your messages appear here.
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              rows.map(({ msg, dayLabel: label, showAvatar }) => (
                <View key={msg._id}>
                  {label ? (
                    <View style={styles.dayRow}>
                      <Text style={styles.dayText}>{label}</Text>
                    </View>
                  ) : null}
                  <Message
                    chatUserAvatar={chatUserAvatar}
                    isHighlighted={selectedMessage?._id === msg._id && !isMultiSelectMode}
                    isMultiSelectMode={isMultiSelectMode}
                    isSelected={isMultiSelectMode && selectedMessages.has(msg._id)}
                    isSent={msg.sender_id === currentUserId}
                    message={msg}
                    onLongPress={handleMessageLongPress}
                    onPress={handleMessagePress}
                    reactions={(msg.reactions || []).map((r) => r.emoji)}
                    showAvatar={showAvatar}
                  />
                </View>
              ))
            )}
          </ScrollView>

          {/* Tap anywhere else to dismiss the long-press menu. */}
          {selectedMessage && !isMultiSelectMode && (
            <Pressable style={StyleSheet.absoluteFill} onPress={hideActionBar} />
          )}

          {selectedMessage && !isMultiSelectMode && (
            <Animated.View
              style={[
                styles.actionBar,
                // translateY (not `top`): the native animation driver can't animate layout props.
                { opacity: actionBarOpacity, transform: [{ translateY: actionBarTop }], width: SCREEN_WIDTH },
              ]}
              pointerEvents="box-none"
            >
              <View style={styles.reactionRow}>
                {REACTION_EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.reactionEmoji}
                    onPress={() => handleReactToMessage(emoji)}
                    accessibilityLabel={`React ${emoji}`}
                  >
                    <Text style={styles.reactionEmojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.actionBarContent}>
                <TouchableOpacity style={styles.actionBarButton} onPress={handleCopyMessage}>
                  <Copy size={18} color={colors.text} strokeWidth={1.8} />
                  <Text style={styles.actionBarButtonText}>Copy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBarButton} onPress={handleForwardMessage}>
                  <CornerUpRight size={18} color={colors.text} strokeWidth={1.8} />
                  <Text style={styles.actionBarButtonText}>Forward</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBarButton} onPress={handleSelectMessage}>
                  <ListChecks size={18} color={colors.text} strokeWidth={1.8} />
                  <Text style={styles.actionBarButtonText}>Select</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBarButton} onPress={handleDeleteMessage}>
                  <Trash2 size={18} color={colors.danger} strokeWidth={1.8} />
                  <Text style={[styles.actionBarButtonText, styles.actionBarButtonDanger]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </View>
      )}

      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Message…"
            testID="chat-input"
            placeholderTextColor={colors.placeholder}
            value={message}
            onChangeText={setMessage}
            multiline
          />
          {message.length >= COUNTER_FROM ? (
            <Text style={[styles.charCount, overLimit && { color: colors.danger }]}>
              {MESSAGE_MAX_LENGTH - message.length}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Send message"
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          onPress={handleSend}
          testID="chat-send"
          disabled={!canSend}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#1A1A1A" />
          ) : (
            <SendHorizontal size={20} color={canSend ? "#1A1A1A" : colors.textMuted} strokeWidth={2} />
          )}
        </TouchableOpacity>
      </View>
      {Platform.OS === "android" && <View style={{ height: androidKeyboardSpacer }} />}

      {/* Forward sheet */}
      <Modal
        visible={showForwardScreen}
        animationType="slide"
        onRequestClose={() => {
          setShowForwardScreen(false);
          setSelectedForwardChats([]);
        }}
      >
        <View style={styles.forwardScreenContainer}>
          <StatusBar barStyle="light-content" backgroundColor={colors.page} />
          <View style={[styles.forwardScreenHeader, { paddingTop: Math.max(insets.top, 10) + 6 }]}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={10}
              style={styles.headerButton}
              onPress={() => {
                setShowForwardScreen(false);
                setSelectedForwardChats([]);
              }}
            >
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.forwardScreenTitle}>
              Forward {forwardingMessages.length > 1 ? `${forwardingMessages.length} messages` : "message"}
            </Text>
            <View style={styles.headerButton} />
          </View>

          <FlatList
            data={forwardTargets}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <View style={[styles.emptyCard, { margin: 16 }]}>
                <View style={styles.emptyIcon}>
                  <MessageCircle size={22} color={colors.accent} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.emptyTitle}>No other chats</Text>
                  <Text style={styles.emptyText}>Start a conversation first, then you can forward to it.</Text>
                </View>
              </View>
            }
            renderItem={({ item }) => {
              const picked = selectedForwardChats.includes(item.id);
              return (
                <TouchableOpacity
                  style={styles.forwardChatItem}
                  onPress={() =>
                    setSelectedForwardChats((prev) =>
                      prev.includes(item.id) ? prev.filter((x) => x !== item.id) : [...prev, item.id]
                    )
                  }
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: picked }}
                >
                  <Image source={item.avatar} style={styles.forwardChatAvatar} />
                  <Text style={styles.forwardChatName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {picked ? (
                    <View style={styles.forwardChatCheck}>
                      <Check size={15} color="#1A1A1A" strokeWidth={3} />
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            }}
            style={styles.forwardChatList}
          />

          {selectedForwardChats.length > 0 && (
            <View style={[styles.forwardBottomBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
              <TouchableOpacity style={styles.forwardSendButton} onPress={handleSendForwardedMessages}>
                <Text style={styles.forwardSendButtonText}>Send to {selectedForwardChats.length}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* "More" menu */}
      <Modal visible={showMenu} transparent animationType="slide" onRequestClose={() => setShowMenu(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setShowMenu(false)} />
        <View style={[styles.menuContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.menuGrabber} />
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                item.onPress();
              }}
            >
              <item.icon size={20} color={item.danger ? colors.danger : colors.text} strokeWidth={1.8} />
              <Text style={[styles.menuItemText, item.danger && styles.menuItemDanger]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      {/* Confirmations, in the app's popup style */}
      <ConfirmPopup
        visible={confirm?.kind === "deleteMessages"}
        title={confirm?.kind === "deleteMessages" && confirm.ids.length > 1 ? "Delete messages?" : "Delete message?"}
        message={
          confirm?.kind !== "deleteMessages"
            ? ""
            : !confirm.allMine
              ? "This removes it from your side of the chat only. You can't delete someone else's message for everyone."
              : confirm.anyRead
                ? `Remove it for you. ${chatUserName} has already read it, so it can no longer be deleted for everyone.`
                : "Remove it for you, or for everyone in this chat."
        }
        confirmText="Delete for me"
        cancelText="Cancel"
        icon="trash-outline"
        onConfirm={() => confirm?.kind === "deleteMessages" && runDelete(confirm.ids, "for_me")}
        onCancel={() => setConfirm(null)}
        extraAction={
          confirm?.kind === "deleteMessages" && confirm.allMine && !confirm.anyRead
            ? {
                text: "Delete for everyone",
                onPress: () => confirm.kind === "deleteMessages" && runDelete(confirm.ids, "for_everyone"),
              }
            : undefined
        }
      />

      <ConfirmPopup
        visible={confirm?.kind === "deleteChat"}
        title="Delete this chat?"
        message={`Every message with ${chatUserName} is removed for you. They keep their copy.`}
        confirmText={deletingChat ? "Deleting…" : "Delete chat"}
        icon="trash-outline"
        onConfirm={handleDeleteChat}
        onCancel={() => setConfirm(null)}
      />

      <ConfirmPopup
        visible={confirm?.kind === "block"}
        title={`Block ${chatUserName}?`}
        message="You won't see their reels, comments or chat. You can unblock them in Settings & Help › Blocked Users."
        confirmText="Block"
        icon="ban-outline"
        onConfirm={handleBlock}
        onCancel={() => setConfirm(null)}
      />
    </KeyboardAvoidingView>
  );
}
