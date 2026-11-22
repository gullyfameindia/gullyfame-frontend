import * as Notifications from "expo-notifications";
import { apiDelete, apiGet, apiPut, toResult } from "../client";
import { registerPushTokenWithBackend } from "@/utils/pushToken";

/**
 * In-app notifications.
 * GET /notification/notification?time&page&limit
 *   time=1 today, time=2 before today, time=0 everything.
 *   Returns { totalNotifications, unreadCount, notifications } for that window.
 * PUT /notification/:id/read, PUT /notification/read-all
 * Each item carries id, title, description, status, type, data (deep-link ids) and createdAt.
 */

export type NotificationWindow = 0 | 1 | 2;

interface BackendNotification {
  _id: string;
  title: string;
  description: string;
  status: "read" | "unRead";
  type?: NotificationType;
  data?: NotificationData;
  createdAt: string;
}

export type NotificationType =
  | "RANK_BOOST"
  | "LEVEL_UP"
  | "DAILY_CHALLENGE_READY"
  | "DAILY_CHALLENGE_COMPLETE"
  | "RAP_BATTLE_INVITE"
  | "UPCOMING_EVENT"
  | "PROFILE_UPDATE"
  | "SUPPORT_RECEIVED"
  | "REFERRAL_REWARD"
  | "GENERAL";

/** Ids the client can open: a competition, a reel or the user who triggered it. */
export interface NotificationData {
  competitionId?: string;
  reelId?: string;
  fromUserId?: string;
  [key: string]: unknown;
}

interface NotificationsPage {
  page: number;
  limit: number;
  time: number;
  totalNotifications: number;
  unreadCount: number;
  notifications: BackendNotification[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  type: NotificationType;
  data: NotificationData;
  createdAt: string;
}

const toNotification = (n: BackendNotification): Notification => ({
  id: n._id,
  title: n.title,
  message: n.description || "",
  read: n.status === "read",
  type: n.type || "GENERAL",
  data: n.data && typeof n.data === "object" ? n.data : {},
  createdAt: n.createdAt,
});

export async function fetchNotifications(time: NotificationWindow = 0, page = 1, limit = 20) {
  const data = await apiGet<NotificationsPage>("notification/notification", { params: { time, page, limit } });
  return {
    total: data.totalNotifications,
    unreadCount: data.unreadCount,
    hasMore: page * limit < data.totalNotifications,
    notifications: data.notifications.map(toNotification),
  };
}

export const getNotifications = (time: NotificationWindow = 0, page = 1, limit = 20) =>
  toResult(() => fetchNotifications(time, page, limit));

export const markNotificationAsRead = (notificationId: string) =>
  toResult(() => apiPut(`notification/${notificationId}/read`, {}));

/** DELETE /notification/:id - removes it from the list for good. */
export const deleteNotification = (notificationId: string) =>
  toResult(() => apiDelete(`notification/${notificationId}`), "Notification deleted");

/** DELETE /notification - removes every notification. */
export const deleteAllNotifications = () =>
  toResult(() => apiDelete<{ deleted: number }>("notification"), "All notifications deleted");

export const markAllNotificationsAsRead = () =>
  toResult(() => apiPut<{ updated: number }>("notification/read-all", {}), "All notifications marked as read");

/** Total unread across all dates (time=0 disables the date filter). */
export const getUnreadNotificationCount = () =>
  toResult(async () => ({ count: (await fetchNotifications(0, 1, 1)).unreadCount }));

/** Registers this device's push token on the user profile. */
export const registerDeviceForNotifications = registerPushTokenWithBackend;

/** Foreground and tap listeners for push notifications. Returns a cleanup function. */
export function setupNotificationListeners(
  onNotificationReceived?: (content: Notifications.NotificationContent) => void,
  onNotificationTapped?: (content: Notifications.NotificationContent) => void
): () => void {
  const received = Notifications.addNotificationReceivedListener((notification) => {
    onNotificationReceived?.(notification.request.content);
  });
  const tapped = Notifications.addNotificationResponseReceivedListener((response) => {
    onNotificationTapped?.(response.notification.request.content);
  });
  return () => {
    received.remove();
    tapped.remove();
  };
}
