import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Swipeable, { type SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import {
  Award,
  Bell,
  CalendarDays,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  CircleCheck,
  Coins,
  Gift,
  Settings2,
  Swords,
  Target,
  Trash2,
  TrendingUp,
  UserRoundPen,
  type LucideIcon,
} from "lucide-react-native";
import { safeBack } from "@/utils/safeBack";
import { safeIdParam } from "@/utils/routeParams";
import { openCompetition } from "@/utils/openCompetition";
import {
  fetchNotifications as fetchNotificationsPage,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  type Notification,
  type NotificationType,
} from "@/api/services/notificationIntegrationService";
import { getErrorMessage } from "@/api/client";
import { getProfile, toggleNotifications } from "@/api/services/userService";
import { registerPushTokenWithBackend } from "@/utils/pushToken";
import { toastError, toastSuccess } from "@/components/ui/Toast";
import { SkeletonList } from "@/components/Skeleton/Skeleton";
import { colors, font, radius, space } from "@/theme/tokens";

/** Notifications loaded per page. */
const PAGE_SIZE = 30;

const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  RANK_BOOST: TrendingUp,
  LEVEL_UP: Award,
  DAILY_CHALLENGE_READY: Target,
  DAILY_CHALLENGE_COMPLETE: CircleCheck,
  RAP_BATTLE_INVITE: Swords,
  UPCOMING_EVENT: CalendarDays,
  PROFILE_UPDATE: UserRoundPen,
  SUPPORT_RECEIVED: Coins,
  REFERRAL_REWARD: Gift,
  GENERAL: Bell,
};

const DAY = 24 * 60 * 60 * 1000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "now", "5m", "3h", "2d", "1w", then a short date: compact like a timestamp, not a sentence. */
const shortTime = (iso: string): string => {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  if (Number.isNaN(diff)) return "";
  const min = Math.floor(diff / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  if (day < 30) return `${Math.floor(day / 7)}w`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const SECTION_ORDER = ["Today", "Yesterday", "Last 7 days", "Last 30 days", "Earlier"] as const;
type SectionName = (typeof SECTION_ORDER)[number];

const sectionFor = (iso: string, today: number): SectionName => {
  const day = startOfDay(new Date(iso));
  if (day >= today) return "Today";
  if (day >= today - DAY) return "Yesterday";
  if (day >= today - 7 * DAY) return "Last 7 days";
  if (day >= today - 30 * DAY) return "Last 30 days";
  return "Earlier";
};

/** What a notification opens, if anything. Same ids the push-tap handler understands. */
const targetOf = (n: Notification): { label: string; open: () => void } | null => {
  const competitionId = safeIdParam(n.data.competitionId);
  if (competitionId) return { label: "View", open: () => openCompetition(competitionId) };
  const reelId = safeIdParam(n.data.reelId);
  if (reelId) {
    return {
      label: "Watch",
      open: () => router.push({ pathname: "/(main)/reel", params: { startReelId: reelId } } as any),
    };
  }
  return null;
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [clearing, setClearing] = useState(false);
  // Push notifications on/off (the profile's notificationAllowed); null until loaded.
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
  const [savingPush, setSavingPush] = useState(false);
  const openRow = useRef<SwipeableMethods | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    getProfile()
      .then((profile) => setPushEnabled(!!profile.notificationAllowed))
      .catch(() => {});
    try {
      const first = await fetchNotificationsPage(0, 1, PAGE_SIZE);
      setNotifications(first.notifications);
      setPage(1);
      setHasMore(first.hasMore);
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = await fetchNotificationsPage(0, page + 1, PAGE_SIZE);
      setNotifications((prev) => {
        const seen = new Set(prev.map((n) => n.id));
        return [...prev, ...next.notifications.filter((n) => !seen.has(n.id))];
      });
      setPage(page + 1);
      setHasMore(next.hasMore && next.notifications.length > 0);
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
      setLoadingMore(false);
    }
  };

  const handleOpen = async (n: Notification) => {
    openRow.current?.close();
    if (!n.read) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      const res = await markNotificationAsRead(n.id);
      if (!res.success) {
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: false } : x)));
        toastError(res.message);
      }
    }
    targetOf(n)?.open();
  };

  // Swipe left, tap the bin: a deliberate gesture, so no extra confirmation.
  const handleDelete = async (n: Notification) => {
    if (deleting) return;
    setDeleting(n.id);
    const res = await deleteNotification(n.id);
    if (res.success) setNotifications((prev) => prev.filter((x) => x.id !== n.id));
    else toastError(res.message);
    setDeleting(null);
  };

  const handleMarkAll = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    const res = await markAllNotificationsAsRead();
    if (res.success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setSheetOpen(false);
    } else {
      toastError(res.message);
    }
    setMarkingAll(false);
  };

  const handleClearAll = () => {
    if (clearing || notifications.length === 0) return;
    setSheetOpen(false);
    Alert.alert("Clear all notifications?", "They will be removed from your list.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear all",
        style: "destructive",
        onPress: async () => {
          setClearing(true);
          const res = await deleteAllNotifications();
          if (res.success) {
            setNotifications([]);
            setHasMore(false);
            toastSuccess(res.message);
          } else {
            toastError(res.message);
          }
          setClearing(false);
        },
      },
    ]);
  };

  const handleTogglePush = async (enabled: boolean) => {
    if (savingPush) return;
    const previous = pushEnabled;
    setPushEnabled(enabled);
    setSavingPush(true);
    try {
      setPushEnabled(await toggleNotifications(enabled));
      // The user chose this, so it is the right moment to show the system dialog.
      if (enabled) registerPushTokenWithBackend({ prompt: true });
    } catch (error) {
      setPushEnabled(previous);
      toastError(getErrorMessage(error));
    } finally {
      setSavingPush(false);
    }
  };

  const sections = useMemo(() => {
    const today = startOfDay(new Date());
    const groups = new Map<SectionName, Notification[]>();
    for (const n of notifications) {
      const key = sectionFor(n.createdAt, today);
      groups.set(key, [...(groups.get(key) ?? []), n]);
    }
    return SECTION_ORDER.filter((k) => groups.has(k)).map((k) => ({ title: k, items: groups.get(k)! }));
  }, [notifications]);

  const hasUnread = notifications.some((n) => !n.read);

  const renderRow = (n: Notification) => {
    const Icon = TYPE_ICON[n.type] ?? Bell;
    const target = targetOf(n);
    return (
      <Swipeable
        key={n.id}
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        renderRightActions={(_p, _t, methods) => (
          <TouchableOpacity
            style={styles.deleteAction}
            onPress={() => {
              openRow.current = methods;
              handleDelete(n);
            }}
            accessibilityRole="button"
            accessibilityLabel="Delete notification"
          >
            {deleting === n.id ? <ActivityIndicator color="#FFFFFF" /> : <Trash2 size={22} color="#FFFFFF" />}
          </TouchableOpacity>
        )}
      >
        <Pressable
          onPress={() => handleOpen(n)}
          style={({ pressed }) => [styles.row, !n.read && styles.rowUnread, pressed && styles.rowPressed]}
          testID={`notification-${n.id}`}
        >
          <View style={styles.avatar}>
            <Icon size={22} color={colors.accent} strokeWidth={1.8} />
          </View>
          <Text style={styles.rowText} numberOfLines={3}>
            <Text style={styles.rowTitle}>{n.title}</Text>
            {n.message ? <Text>{` ${n.message}`}</Text> : null}
            <Text style={styles.rowTime}>{`  ${shortTime(n.createdAt)}`}</Text>
          </Text>
          {target ? (
            <TouchableOpacity style={styles.actionButton} onPress={() => handleOpen(n)} activeOpacity={0.85}>
              <Text style={styles.actionButtonText}>{target.label}</Text>
            </TouchableOpacity>
          ) : !n.read ? (
            <View style={styles.unreadDot} />
          ) : null}
        </Pressable>
      </Swipeable>
    );
  };

  // "You're all caught up" sits between the new (unread) items and the older ones.
  let markerPlaced = !hasUnread;
  const caughtUp = (
    <View key="caught-up" style={styles.row}>
      <View style={[styles.avatar, styles.avatarMuted]}>
        <CheckCheck size={22} color={colors.textBody} strokeWidth={1.8} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>You&apos;re all caught up</Text>
        <Text style={styles.caughtUpSub}>Older activity is below.</Text>
      </View>
    </View>
  );

  let body: ReactNode;
  if (loading) {
    body = <SkeletonList rows={8} style={{ paddingTop: space.sm, paddingHorizontal: space.lg }} />;
  } else if (loadError) {
    body = (
      <View style={styles.emptyCard}>
        <View style={styles.avatar}>
          <Bell size={22} color={colors.accent} strokeWidth={1.8} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Couldn&apos;t load notifications</Text>
          <Text style={styles.caughtUpSub}>{loadError}</Text>
          <TouchableOpacity onPress={load} style={styles.emptyButton}>
            <Text style={styles.actionButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  } else if (notifications.length === 0) {
    body = (
      <View style={styles.emptyCard}>
        <View style={styles.avatar}>
          <Bell size={22} color={colors.accent} strokeWidth={1.8} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>No notifications yet</Text>
          <Text style={styles.caughtUpSub}>Votes on your reels, competition news and rewards will show up here.</Text>
        </View>
      </View>
    );
  } else {
    body = sections.map((section) => (
      <View key={section.title}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        {section.items.map((n) => {
          const nodes: ReactNode[] = [];
          if (!markerPlaced && n.read) {
            markerPlaced = true;
            nodes.push(caughtUp);
          }
          nodes.push(renderRow(n));
          return nodes;
        })}
      </View>
    ));
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.page} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack("/(main)/home")}
          style={styles.headerButton}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity
          onPress={() => setSheetOpen(true)}
          style={styles.headerButton}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Notification settings"
          testID="notifications-settings"
        >
          <Settings2 size={24} color={colors.text} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => openRow.current?.close()}
      >
        {body}

        {!loading && !loadError && hasMore ? (
          <TouchableOpacity onPress={loadMore} disabled={loadingMore} style={styles.showMore}>
            {loadingMore ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <>
                <Text style={styles.showMoreText}>Show more</Text>
                <ChevronDown size={18} color={colors.textBody} />
              </>
            )}
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {/* Settings sheet: push on/off and the bulk actions, out of the way of the list. */}
      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSheetOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <View style={styles.grabber} />
          <View style={styles.sheetRow}>
            <Text style={styles.sheetText}>Push notifications</Text>
            <Switch
              value={!!pushEnabled}
              onValueChange={handleTogglePush}
              disabled={pushEnabled === null || savingPush}
              trackColor={{ true: colors.accent, false: colors.line }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Push notifications"
            />
          </View>
          <TouchableOpacity
            style={styles.sheetRow}
            onPress={handleMarkAll}
            disabled={markingAll || !hasUnread}
          >
            <Text style={[styles.sheetText, !hasUnread && styles.sheetTextDisabled]}>Mark all as read</Text>
            {markingAll ? <ActivityIndicator color={colors.accent} /> : <CheckCheck size={20} color={hasUnread ? colors.text : colors.textMuted} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sheetRow}
            onPress={handleClearAll}
            disabled={clearing || notifications.length === 0}
          >
            <Text style={[styles.sheetText, { color: colors.danger }, notifications.length === 0 && styles.sheetTextDisabled]}>
              Clear all
            </Text>
            <Trash2 size={20} color={notifications.length === 0 ? colors.textMuted : colors.danger} />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const AVATAR = 48;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.page },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
  },
  headerButton: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  headerTitle: { flex: 1, marginLeft: space.xs, color: colors.text, fontSize: 22, fontFamily: font.title },

  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontFamily: font.semibold,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.sm,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: 10,
    backgroundColor: colors.page,
  },
  rowUnread: { backgroundColor: "#4A3116" },
  rowPressed: { opacity: 0.85 },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarMuted: { borderColor: colors.line },
  rowText: { flex: 1, color: colors.textBody, fontSize: 14, lineHeight: 19, fontFamily: font.regular },
  rowTitle: { color: colors.text, fontSize: 14, fontFamily: font.semibold },
  rowTime: { color: colors.textMuted, fontFamily: font.regular },
  caughtUpSub: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 2, fontFamily: font.regular },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },

  actionButton: {
    minWidth: 72,
    height: 32,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonText: { color: "#1A1A1A", fontSize: 13, fontFamily: font.semibold },

  deleteAction: {
    width: 76,
    backgroundColor: colors.dangerSolid,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyCard: {
    flexDirection: "row",
    gap: space.md,
    margin: space.lg,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.25)",
  },
  emptyButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    justifyContent: "center",
  },

  showMore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: space.lg,
  },
  showMoreText: { color: colors.textBody, fontSize: 14, fontFamily: font.medium },

  backdrop: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: space.sm,
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: space.sm,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.xl,
    minHeight: 56,
  },
  sheetText: { color: colors.text, fontSize: 16, fontFamily: font.medium },
  sheetTextDisabled: { color: colors.textMuted },
});
