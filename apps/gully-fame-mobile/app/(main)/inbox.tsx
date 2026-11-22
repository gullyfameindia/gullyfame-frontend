import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router/react-navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import {
  Archive,
  ArchiveRestore,
  Ban,
  BellOff,
  Bell,
  ChevronLeft,
  CircleCheck,
  CircleUserRound,
  Ellipsis,
  Flag,
  MessageCircle,
  Pin,
  PinOff,
  Search,
  SquarePen,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { safeBack } from "@/utils/safeBack";
import {
  type ChatListItem,
  type ChatSearchResult,
  getChatList,
  setArchived,
  setPinned,
  setMuted,
  searchMessages,
  clearConversationForMe,
} from "@api/services/chatService";
import { searchUsersPage, type SearchUser } from "@api/services/searchService";
import { socketChatService } from "@api/services/socketChatService";
import { getErrorMessage } from "@api/client";
import { getChatContacts, fallbackChatName, rememberChatContact } from "@utils/chatContacts";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import { toastError, toastSuccess } from "@components/ui/Toast";
import { blockUser, getBlockedUserIds, reportContent } from "@/utils/moderation";
import { convertDateToChatTimePassed } from "@/utils/convertDateToChatTimePassed";
import { SkeletonList } from "@/components/Skeleton/Skeleton";
import { DEFAULT_ROLE, getProfileRoute } from "@/components/profile/shared/profileTypes";
import { colors, font, radius, space } from "@/theme/tokens";

const DEFAULT_AVATAR = require("@assets/images/default-avatar.png");

interface ChatItem {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  lastMessage: string;
  lastAt: string;
  unread: number;
  pinned: boolean;
  muted: boolean;
  archived: boolean;
}

type Filter = "All" | "Unread" | "Archived";

/** Pinned first, then newest message first (same order the server uses). */
const sortChats = (list: ChatItem[]) =>
  [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
  });

const openChat = (c: { id: string; name: string; avatar: string | null }) =>
  router.push({
    pathname: "/(main)/chat/[id]",
    params: { id: c.id, name: c.name, ...(c.avatar ? { avatar: c.avatar } : {}) },
  });

function Avatar({ uri, size = 52 }: { uri: string | null; size?: number }) {
  return (
    <Image
      source={uri ? { uri } : DEFAULT_AVATAR}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.card }}
    />
  );
}

function SideAction({ icon: Icon, label, onPress, tone }: { icon: LucideIcon; label: string; onPress: () => void; tone: string }) {
  return (
    <TouchableOpacity style={[styles.sideAction, { backgroundColor: tone }]} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Icon size={22} color="#FFFFFF" />
      <Text style={styles.sideActionText}>{label}</Text>
    </TouchableOpacity>
  );
}

function BarAction({
  icon: Icon,
  label,
  onPress,
  danger,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity style={[styles.barAction, disabled && { opacity: 0.4 }]} onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label}>
      <Icon size={22} color={danger ? colors.danger : colors.text} />
      <Text style={[styles.barActionText, danger && { color: colors.danger }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [messageHits, setMessageHits] = useState<ChatSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [menuChat, setMenuChat] = useState<ChatItem | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Both lists come from GET /chat/chatlist (view=archived for the archived ones).
  const loadChats = useCallback(async () => {
    setLoadError("");
    try {
      const [all, archived, contacts, blocked] = await Promise.all([
        getChatList("all"),
        getChatList("archived"),
        getChatContacts(),
        getBlockedUserIds(),
      ]);
      const toItem = (c: ChatListItem): ChatItem => {
        const id = String(c.chatter_user_id);
        const contact = contacts[id];
        return {
          id,
          name: c.name || contact?.name || fallbackChatName(id),
          username: c.username || "",
          avatar: resolveMediaUrl(c.profile_image) || contact?.avatar || null,
          lastMessage: c.latest_message,
          lastAt: c.last_message_time,
          unread: c.unread_count || 0,
          pinned: !!c.pinned,
          muted: !!c.muted,
          archived: !!c.archived,
        };
      };
      // Conversations with users the viewer has blocked are hidden.
      const visible = (list: ChatListItem[]) => list.filter((c) => !blocked.has(String(c.chatter_user_id))).map(toItem);
      setChats(sortChats([...visible(all.chatlist), ...visible(archived.chatlist)]));
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [loadChats]),
  );

  // A message arriving over the socket refreshes the list.
  useEffect(() => socketChatService.onMessage(() => loadChats()), [loadChats]);

  // Message search (server side) once the query has 2+ characters, debounced.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setMessageHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        setMessageHits((await searchMessages(q)).results);
      } catch {
        setMessageHits([]); // Older servers have no /chat/search; chat-name matches still show.
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const byId = useMemo(() => new Map(chats.map((c) => [c.id, c])), [chats]);

  const visibleChats = useMemo(() => {
    const q = query.trim().toLowerCase();
    return chats.filter((c) => {
      if (filter === "Archived" ? !c.archived : c.archived) return false;
      if (filter === "Unread" && c.unread === 0) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q) ||
        c.lastMessage.toLowerCase().includes(q)
      );
    });
  }, [chats, filter, query]);

  const unreadTotal = chats.filter((c) => !c.archived && c.unread > 0).length;

  // ---------- actions ----------

  const patch = (ids: string[], change: Partial<ChatItem>) =>
    setChats((prev) => sortChats(prev.map((c) => (ids.includes(c.id) ? { ...c, ...change } : c))));

  const endSelection = () => {
    setSelecting(false);
    setSelected([]);
  };

  const run = async (ids: string[], change: Partial<ChatItem>, call: (id: string) => Promise<unknown>, done: string) => {
    if (busy || ids.length === 0) return;
    setBusy(true);
    patch(ids, change);
    try {
      for (const id of ids) await call(id);
      toastSuccess(done);
    } catch (error) {
      toastError(getErrorMessage(error));
      loadChats();
    } finally {
      setBusy(false);
      endSelection();
    }
  };

  const pin = (ids: string[], value: boolean) =>
    run(ids, { pinned: value }, (id) => setPinned(id, value), value ? "Pinned" : "Unpinned");
  const mute = (ids: string[], value: boolean) =>
    run(ids, { muted: value }, (id) => setMuted(id, value), value ? "Notifications muted" : "Notifications on");
  const archive = (ids: string[], value: boolean) =>
    run(ids, { archived: value }, (id) => setArchived(id, value), value ? "Archived" : "Moved to chats");

  const confirmDelete = (ids: string[]) => {
    if (ids.length === 0) return;
    Alert.alert(
      ids.length > 1 ? `Delete ${ids.length} chats?` : "Delete this chat?",
      "Messages are removed for you only. The other person still has their copy.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              for (const id of ids) await clearConversationForMe(id);
              setChats((prev) => prev.filter((c) => !ids.includes(c.id)));
              toastSuccess(ids.length > 1 ? "Chats deleted" : "Chat deleted");
            } catch (error) {
              toastError(getErrorMessage(error));
              loadChats();
            } finally {
              setBusy(false);
              endSelection();
            }
          },
        },
      ],
    );
  };

  const confirmBlock = (ids: string[]) => {
    Alert.alert(
      ids.length > 1 ? `Block ${ids.length} people?` : "Block this person?",
      "You won't see their chats, reels or comments.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              for (const id of ids) await blockUser(id, byId.get(id)?.name || "User");
              setChats((prev) => prev.filter((c) => !ids.includes(c.id)));
              toastSuccess("Blocked");
            } catch (error) {
              toastError(getErrorMessage(error));
            } finally {
              endSelection();
            }
          },
        },
      ],
    );
  };

  const startSelection = (id: string) => {
    setMenuChat(null);
    setSelecting(true);
    setSelected([id]);
  };

  const toggleSelected = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const openOwnProfile = async () => {
    let role: string | null = null;
    try {
      role = await AsyncStorage.getItem("userRole");
    } catch {
      /* falls back to the default role */
    }
    router.push(getProfileRoute((role as any) || DEFAULT_ROLE, true) as any);
  };

  // ---------- rendering ----------

  const renderChat = ({ item: c }: { item: ChatItem }) => {
    const isSelected = selected.includes(c.id);
    const row = (
      <Pressable
        onPress={() => (selecting ? toggleSelected(c.id) : openChat(c))}
        onLongPress={() => {
          if (!selecting) setMenuChat(c);
        }}
        delayLongPress={300}
        style={({ pressed }) => [styles.row, isSelected && styles.rowSelected, pressed && !selecting && styles.rowPressed]}
        testID={`chat-${c.id}`}
      >
        {selecting ? (
          <View style={[styles.check, isSelected && styles.checkOn]}>
            {isSelected ? <CircleCheck size={22} color={colors.accent} /> : null}
          </View>
        ) : null}
        <Avatar uri={c.avatar} />
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={[styles.name, c.unread > 0 && styles.nameUnread]} numberOfLines={1}>
              {c.name}
            </Text>
            {c.muted ? <BellOff size={14} color={colors.textMuted} /> : null}
            {c.pinned ? <Pin size={14} color={colors.accent} /> : null}
            <Text style={[styles.time, c.unread > 0 && styles.timeUnread]}>{convertDateToChatTimePassed(c.lastAt)}</Text>
          </View>
          <View style={styles.rowBottom}>
            <Text style={[styles.preview, c.unread > 0 && styles.previewUnread]} numberOfLines={1}>
              {c.lastMessage}
            </Text>
            {c.unread > 0 ? (
              <View style={[styles.badge, c.muted && styles.badgeMuted]}>
                <Text style={styles.badgeText}>{c.unread > 99 ? "99+" : c.unread}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
    if (selecting) return row;
    // Swipe either way to reveal an icon; tapping it opens selection mode with this chat picked.
    return (
      <Swipeable
        friction={2}
        leftThreshold={40}
        rightThreshold={40}
        overshootLeft={false}
        overshootRight={false}
        renderLeftActions={(_p, _t, methods) => (
          <SideAction
            icon={CircleCheck}
            label="Select"
            tone="#5B3A12"
            onPress={() => {
              methods.close();
              startSelection(c.id);
            }}
          />
        )}
        renderRightActions={(_p, _t, methods) => (
          <SideAction
            icon={Ellipsis}
            label="More"
            tone={colors.card}
            onPress={() => {
              methods.close();
              startSelection(c.id);
            }}
          />
        )}
      >
        {row}
      </Swipeable>
    );
  };

  const selectedItems = selected.map((id) => byId.get(id)).filter(Boolean) as ChatItem[];
  const allPinned = selectedItems.length > 0 && selectedItems.every((c) => c.pinned);
  const allMuted = selectedItems.length > 0 && selectedItems.every((c) => c.muted);
  const allArchived = selectedItems.length > 0 && selectedItems.every((c) => c.archived);

  const q = query.trim();
  const showMessageHits = q.length >= 2;

  const listHeader = (
    <>
      {!selecting ? (
        <View style={styles.filters}>
          {(["All", "Unread", "Archived"] as Filter[]).map((f) => (
            <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipOn]}>
              <Text style={[styles.chipText, filter === f && styles.chipTextOn]}>
                {f}
                {f === "Unread" && unreadTotal > 0 ? ` ${unreadTotal}` : ""}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      {showMessageHits && visibleChats.length > 0 ? <Text style={styles.sectionLabel}>Chats</Text> : null}
    </>
  );

  const listFooter = showMessageHits ? (
    <View>
      <Text style={styles.sectionLabel}>Messages</Text>
      {searching ? (
        <ActivityIndicator color={colors.accent} style={{ marginVertical: space.lg }} />
      ) : messageHits.length === 0 ? (
        <Text style={styles.noHits}>No messages contain &ldquo;{q}&rdquo;.</Text>
      ) : (
        messageHits.map((m) => {
          const chat = byId.get(String(m.chatter_user_id));
          const name = chat?.name || fallbackChatName(String(m.chatter_user_id));
          return (
            <Pressable
              key={m.message_id}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => openChat({ id: String(m.chatter_user_id), name, avatar: chat?.avatar ?? null })}
            >
              <Avatar uri={chat?.avatar ?? null} size={44} />
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.name} numberOfLines={1}>{name}</Text>
                  <Text style={styles.time}>{convertDateToChatTimePassed(m.createdAt)}</Text>
                </View>
                <Text style={styles.preview} numberOfLines={2}>
                  {m.from_me ? "You: " : ""}
                  {m.message}
                </Text>
              </View>
            </Pressable>
          );
        })
      )}
    </View>
  ) : (
    <View style={{ height: space.xl }} />
  );

  const emptyText = loadError
    ? loadError
    : q
      ? `No chats match "${q}".`
      : filter === "Archived"
        ? "Chats you archive show up here."
        : filter === "Unread"
          ? "You're all caught up."
          : "Start a conversation with someone from GullyFame.";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.page} />

      {selecting ? (
        <View style={styles.header}>
          <TouchableOpacity onPress={endSelection} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Cancel selection">
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.selectTitle}>{selected.length} selected</Text>
          <TouchableOpacity
            onPress={() => setSelected(selected.length === visibleChats.length ? [] : visibleChats.map((c) => c.id))}
            style={styles.textButton}
          >
            <Text style={styles.textButtonText}>{selected.length === visibleChats.length ? "Clear" : "Select all"}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => safeBack("/(main)/home")} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Go back">
            <ChevronLeft size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Messages</Text>
          <TouchableOpacity onPress={openOwnProfile} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="My profile" testID="inbox-profile">
            <CircleUserRound size={24} color={colors.text} strokeWidth={1.8} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setComposeOpen(true)} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="New message" testID="inbox-new-message">
            <SquarePen size={23} color={colors.text} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.searchWrap}>
        <Search size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search chats and messages"
          placeholderTextColor={colors.placeholder}
          returnKeyType="search"
          autoCorrect={false}
          testID="inbox-search"
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={8} accessibilityLabel="Clear search">
            <X size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <SkeletonList rows={8} trailing style={{ paddingHorizontal: space.lg }} />
      ) : (
        <FlatList
          data={visibleChats}
          keyExtractor={(c) => c.id}
          renderItem={renderChat}
          extraData={[selecting, selected]}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          ListEmptyComponent={
            showMessageHits ? null : (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <MessageCircle size={22} color={colors.accent} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{loadError ? "Couldn't load chats" : "Nothing here"}</Text>
                  <Text style={styles.emptyText}>{emptyText}</Text>
                  {loadError ? (
                    <TouchableOpacity onPress={loadChats} style={styles.emptyButton}>
                      <Text style={styles.emptyButtonText}>Try again</Text>
                    </TouchableOpacity>
                  ) : filter === "All" && !q ? (
                    <TouchableOpacity onPress={() => setComposeOpen(true)} style={styles.emptyButton}>
                      <Text style={styles.emptyButtonText}>New message</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            )
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: selecting ? 96 : insets.bottom + space.lg }}
        />
      )}

      {selecting ? (
        <View style={[styles.bar, { paddingBottom: insets.bottom + space.sm }]}>
          <BarAction icon={allPinned ? PinOff : Pin} label={allPinned ? "Unpin" : "Pin"} onPress={() => pin(selected, !allPinned)} disabled={busy || !selected.length} />
          <BarAction icon={allMuted ? Bell : BellOff} label={allMuted ? "Unmute" : "Mute"} onPress={() => mute(selected, !allMuted)} disabled={busy || !selected.length} />
          <BarAction
            icon={allArchived ? ArchiveRestore : Archive}
            label={allArchived ? "Unarchive" : "Archive"}
            onPress={() => archive(selected, !allArchived)}
            disabled={busy || !selected.length}
          />
          <BarAction icon={Ban} label="Block" onPress={() => confirmBlock(selected)} disabled={busy || !selected.length} />
          <BarAction
            icon={Flag}
            label="Report"
            onPress={() => {
              reportContent("chat", selected[0]);
              endSelection();
            }}
            disabled={busy || selected.length !== 1}
          />
          <BarAction icon={Trash2} label="Delete" danger onPress={() => confirmDelete(selected)} disabled={busy || !selected.length} />
        </View>
      ) : null}

      {/* Long-press popup */}
      <Modal visible={!!menuChat} transparent animationType="fade" onRequestClose={() => setMenuChat(null)}>
        <Pressable style={styles.popupBackdrop} onPress={() => setMenuChat(null)}>
          {menuChat ? (
            <Pressable style={styles.popup} onPress={() => undefined}>
              <View style={styles.popupHead}>
                <Avatar uri={menuChat.avatar} size={40} />
                <Text style={[styles.name, { flex: 1 }]} numberOfLines={1}>{menuChat.name}</Text>
              </View>
              {[
                {
                  icon: menuChat.pinned ? PinOff : Pin,
                  label: menuChat.pinned ? "Unpin chat" : "Pin chat",
                  onPress: () => pin([menuChat.id], !menuChat.pinned),
                },
                {
                  icon: menuChat.muted ? Bell : BellOff,
                  label: menuChat.muted ? "Unmute notifications" : "Mute notifications",
                  onPress: () => mute([menuChat.id], !menuChat.muted),
                },
                {
                  icon: CircleCheck,
                  label: "Select",
                  onPress: () => startSelection(menuChat.id),
                },
                {
                  icon: Trash2,
                  label: "Delete chat",
                  danger: true,
                  onPress: () => confirmDelete([menuChat.id]),
                },
              ].map((o) => (
                <TouchableOpacity
                  key={o.label}
                  style={styles.popupItem}
                  onPress={() => {
                    setMenuChat(null);
                    o.onPress();
                  }}
                >
                  <o.icon size={20} color={o.danger ? colors.danger : colors.text} />
                  <Text style={[styles.popupText, o.danger && { color: colors.danger }]}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>

      <NewMessageSheet visible={composeOpen} onClose={() => setComposeOpen(false)} />
    </View>
  );
}

/** Full-screen picker: search people on GullyFame and open a chat with them. */
function NewMessageSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setError("");
    const t = setTimeout(async () => {
      try {
        setPeople((await searchUsersPage(q.trim(), 1, 30)).results);
      } catch (e) {
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, visible]);

  const pick = (u: SearchUser) => {
    const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.username;
    const avatar = resolveMediaUrl(u.profile_picture_url);
    rememberChatContact(u._id, { name, avatar: avatar || "" });
    onClose();
    setQ("");
    openChat({ id: u._id, name, avatar });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Close">
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>New message</Text>
        </View>
        <View style={styles.searchWrap}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={q}
            onChangeText={setQ}
            placeholder="Search people"
            placeholderTextColor={colors.placeholder}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            testID="new-message-search"
          />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + space.lg }}>
          <Text style={styles.sectionLabel}>{q.trim() ? "Results" : "Suggested"}</Text>
          {loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginVertical: space.lg }} />
          ) : error ? (
            <Text style={styles.noHits}>{error}</Text>
          ) : people.length === 0 ? (
            <Text style={styles.noHits}>No one found.</Text>
          ) : (
            people.map((u) => {
              const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.username;
              return (
                <Pressable key={u._id} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={() => pick(u)}>
                  <Avatar uri={resolveMediaUrl(u.profile_picture_url)} size={44} />
                  <View style={styles.rowBody}>
                    <Text style={styles.name} numberOfLines={1}>{name}</Text>
                    {u.username ? <Text style={styles.preview} numberOfLines={1}>@{u.username.replace(/^@+/, "")}</Text> : null}
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.page },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: space.sm, paddingVertical: space.sm, gap: 2 },
  iconButton: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  title: { flex: 1, marginLeft: space.xs, color: colors.text, fontSize: 22, fontFamily: font.title },
  selectTitle: { flex: 1, marginLeft: space.xs, color: colors.text, fontSize: 18, fontFamily: font.semibold },
  textButton: { paddingHorizontal: space.md, height: 44, justifyContent: "center" },
  textButtonText: { color: colors.accent, fontSize: 14, fontFamily: font.semibold },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    marginHorizontal: space.lg,
    marginBottom: space.sm,
    paddingHorizontal: space.md,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchInput: { flex: 1, height: "100%", color: colors.text, fontSize: 15, fontFamily: font.regular, paddingVertical: 0 },

  filters: { flexDirection: "row", gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: space.sm },
  chip: { paddingHorizontal: 14, height: 32, borderRadius: 16, justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" },
  chipOn: { backgroundColor: colors.accent },
  chipText: { color: colors.textBody, fontSize: 13, fontFamily: font.semibold },
  chipTextOn: { color: "#1A1A1A" },

  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: font.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.xs,
  },
  noHits: { color: colors.textMuted, fontSize: 14, fontFamily: font.regular, paddingHorizontal: space.lg, paddingVertical: space.md },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: 10,
    backgroundColor: colors.page,
  },
  rowPressed: { backgroundColor: "#4A3116" },
  rowSelected: { backgroundColor: "#4A3116" },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  checkOn: { borderWidth: 0 },
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowBottom: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: 3 },
  name: { flexShrink: 1, color: colors.text, fontSize: 15, fontFamily: font.semibold },
  nameUnread: { fontFamily: font.bold },
  time: { marginLeft: "auto", color: colors.textMuted, fontSize: 12, fontFamily: font.regular },
  timeUnread: { color: colors.accent, fontFamily: font.semibold },
  preview: { flex: 1, color: colors.textMuted, fontSize: 13, fontFamily: font.regular },
  previewUnread: { color: colors.textBody, fontFamily: font.medium },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeMuted: { backgroundColor: colors.textMuted },
  badgeText: { color: "#1A1A1A", fontSize: 11, fontFamily: font.bold },

  sideAction: { width: 84, justifyContent: "center", alignItems: "center", gap: 4 },
  sideActionText: { color: "#FFFFFF", fontSize: 12, fontFamily: font.semibold },

  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: space.sm,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  barAction: { alignItems: "center", gap: 4, paddingVertical: 4, minWidth: 52 },
  barActionText: { color: colors.text, fontSize: 11, fontFamily: font.medium },

  popupBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: space.xl },
  popup: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: space.sm,
  },
  popupHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    marginBottom: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  popupItem: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: space.lg, height: 50 },
  popupText: { color: colors.text, fontSize: 15, fontFamily: font.medium },

  empty: {
    flexDirection: "row",
    gap: space.md,
    margin: space.lg,
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
  emptyText: { color: colors.textBody, fontSize: 13, lineHeight: 18, marginTop: 2, fontFamily: font.regular },
  emptyButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    justifyContent: "center",
  },
  emptyButtonText: { color: "#1A1A1A", fontSize: 13, fontFamily: font.semibold },
});
