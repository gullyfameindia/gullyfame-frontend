import { useState, useEffect,  useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, StatusBar, Platform, Animated, ActivityIndicator } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { BackIcon } from "@/icons";
import {
  fetchNotifications as fetchNotificationsPage,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type Notification,
} from "@/api/services/notificationIntegrationService";
import { getErrorMessage } from "@/api/client";
import { showToast, toastError, toastSuccess } from "@/components/ui/Toast";
import { SkeletonList } from "@/components/Skeleton/Skeleton";


const getDimensions = () => Dimensions.get("window");

const formatRelativeTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  } catch {
    return "";
  }
};

export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState<"Today" | "Past">("Today");
  const [dimensions, setDimensions] = useState(getDimensions());
  const insets = useSafeAreaInsets();
  const [slideAnim] = useState(() => new Animated.Value(0));
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);
  const deleting: string | null = null;
  const [markingAll, setMarkingAll] = useState(false);

  
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  
  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const [loadError, setLoadError] = useState("");

  // time=0 returns every notification plus the total unread count;
  // the Today / Past tabs split the list by date on the device.
  const fetchNotifications = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const page = await fetchNotificationsPage(0, 1, 100);
      setNotifications(page.notifications);
      setUnreadCount(page.unreadCount);
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    const target = notifications.find((n) => n.id === notificationId);
    if (!target || target.read || marking) return;
    setMarking(notificationId);
    const response = await markNotificationAsRead(notificationId);
    if (response.success) {
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)));
      setUnreadCount((count) => Math.max(0, count - 1));
    } else {
      toastError(response.message);
    }
    setMarking(null);
  };

  const handleMarkAllAsRead = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    const response = await markAllNotificationsAsRead();
    if (response.success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toastSuccess(response.message);
    } else {
      toastError(response.message);
    }
    setMarkingAll(false);
  };

  // The backend has no endpoint to delete a notification.
  const handleDeleteNotification = (_notificationId: string) => {
    showToast("Deleting notifications isn't available yet.", "info");
  };

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: activeTab === "Today" ? 0 : 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [activeTab, slideAnim]);

  
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const currentNotifications = notifications.filter((n) => {
    const notifDate = new Date(n.createdAt);
    const notifStart = new Date(notifDate.getFullYear(), notifDate.getMonth(), notifDate.getDate());
    
    if (activeTab === "Today") {
      return notifStart.getTime() === todayStart.getTime();
    } else {
      return notifStart.getTime() < todayStart.getTime();
    }
  });

  
  const scale = (size: number) => (dimensions.width / 375) * size;
  const scaleVertical = (size: number) => (dimensions.height / 812) * size;
  const getFontSize = (size: number) => {
    const scaled = scale(size);
    return Math.max(scaled, size * 0.8);
  };

  
  const isSmallScreen = dimensions.width < 375;
  const tabMargin = isSmallScreen ? scale(20) : scale(50);

  
  const responsiveStyles = {
    headerContainer: {
      ...styles.headerContainer,
      paddingTop: Math.max(insets.top, scale(20)),
      paddingBottom: scaleVertical(20),
      borderBottomLeftRadius: scale(30),
      borderBottomRightRadius: scale(30),
    },
    header: {
      ...styles.header,
      paddingHorizontal: scale(12),
      paddingTop: Platform.OS === "ios" ? scaleVertical(8) : scaleVertical(12),
      paddingBottom: scaleVertical(12),
      gap: scale(12),
    },
    headerButton: {
      ...styles.headerButton,
      width: scale(32),
      height: scale(32),
      minWidth: scale(32),
      minHeight: scale(32),
    },
    headerTitle: {
      ...styles.headerTitle,
      fontSize: getFontSize(22),
    },
    tabsContainer: {
      ...styles.tabsContainer,
      marginHorizontal: tabMargin,
      paddingHorizontal: scale(6),
      gap: scale(8),
      borderRadius: scale(12),
      marginTop: scaleVertical(8),
      marginBottom: scaleVertical(8),
    },
    tab: {
      ...styles.tab,
      paddingVertical: scaleVertical(10),
      paddingHorizontal: scale(6),
      borderRadius: scale(12),
      minHeight: scale(36),
    },
    tabText: {
      ...styles.tabText,
      fontSize: getFontSize(13),
    },
    scrollContent: {
      ...styles.scrollContent,
      paddingHorizontal: scale(12),
      paddingTop: scaleVertical(16),
      paddingBottom: scaleVertical(30),
    },
    sectionHeading: {
      ...styles.sectionHeading,
      fontSize: getFontSize(18),
      marginBottom: scaleVertical(12),
    },
    notificationsList: {
      ...styles.notificationsList,
      gap: scaleVertical(10),
    },
    notificationCard: {
      ...styles.notificationCard,
      borderRadius: scale(12),
      padding: scale(12),
      minHeight: scale(65),
    },
    bellIconContainer: {
      ...styles.bellIconContainer,
      marginRight: scale(10),
      borderRadius: scale(8),
      width: scale(45),
      height: scale(45),
      minWidth: scale(45),
      minHeight: scale(45),
    },
    bellBadge: {
      ...styles.bellBadge,
      top: scale(-5),
      right: scale(-5),
      borderRadius: scale(8),
      minWidth: scale(16),
      height: scale(16),
      paddingHorizontal: scale(3),
    },
    bellBadgeText: {
      ...styles.bellBadgeText,
      fontSize: getFontSize(7),
    },
    notificationContent: {
      ...styles.notificationContent,
      paddingRight: scale(3),
    },
    notificationTitle: {
      ...styles.notificationTitle,
      fontSize: getFontSize(16),
      marginBottom: scaleVertical(1),
    },
    notificationDescription: {
      ...styles.notificationDescription,
      fontSize: getFontSize(12),
      lineHeight: scale(16),
    },
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2610" />

      {}
      <View style={responsiveStyles.headerContainer}>
        <View style={responsiveStyles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={responsiveStyles.headerButton}
          >
            <BackIcon color="#EC9A15" />
          </TouchableOpacity>
          <Text
            style={responsiveStyles.headerTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            Notifications
          </Text>
          <TouchableOpacity
            onPress={handleMarkAllAsRead}
            disabled={markingAll || notifications.length === 0}
            style={[responsiveStyles.headerButton, { opacity: markingAll ? 0.5 : 1 }]}
          >
            <Text style={{ color: "#EC9A15", fontSize: 12, fontWeight: "600" }}>
              {markingAll ? "..." : "All"}
            </Text>
          </TouchableOpacity>
        </View>

        {}
        <View style={responsiveStyles.tabsContainer}>
          {}
          <Animated.View
            style={[
              styles.slidingIndicator,
              {
                top: 0,
                left: scale(6),
                borderRadius: scale(12),
                height: "100%",
                transform: [
                  {
                    translateX: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        0,
                        (dimensions.width -
                          tabMargin * 2 -
                          scale(6) * 2 -
                          scale(8)) /
                          2 +
                          scale(8),
                      ],
                    }),
                  },
                ],
                width:
                  (dimensions.width - tabMargin * 2 - scale(6) * 2 - scale(8)) /
                  2,
              },
            ]}
          />
          <TouchableOpacity
            style={responsiveStyles.tab}
            onPress={() => setActiveTab("Today")}
          >
            <Text
              style={[
                responsiveStyles.tabText,
                activeTab === "Today" && styles.tabTextActive,
              ]}
            >
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={responsiveStyles.tab}
            onPress={() => setActiveTab("Past")}
          >
            <Text
              style={[
                responsiveStyles.tabText,
                activeTab === "Past" && styles.tabTextActive,
              ]}
            >
              Past
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={responsiveStyles.scrollContent}
      >
        {loading ? (
          <SkeletonList rows={8} style={{ paddingTop: 8 }} />
        ) : loadError ? (
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <Text style={{ color: "#999", fontSize: 15, textAlign: "center" }}>{loadError}</Text>
            <TouchableOpacity onPress={fetchNotifications} style={{ marginTop: 12 }}>
              <Text style={{ color: "#EC9A15", fontSize: 15 }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : currentNotifications.length === 0 ? (
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <Text style={{ color: "#999", fontSize: 16 }}>
              No {activeTab === "Today" ? "today" : "past"} notifications
            </Text>
          </View>
        ) : (
          <>
            <Text style={responsiveStyles.sectionHeading}>
              {activeTab === "Today" ? "Earlier Today" : "Past Notifications"}
            </Text>
            <View style={responsiveStyles.notificationsList}>
              {currentNotifications.map((notification) => (
                <View key={notification.id} style={{ position: "relative" }}>
                  <TouchableOpacity
                    style={[
                      responsiveStyles.notificationCard,
                      !notification.read && styles.notificationCardHighlighted,
                    ]}
                    activeOpacity={0.7}
                    disabled={marking === notification.id}
                    onPress={() => handleMarkAsRead(notification.id)}
                    onLongPress={() => handleDeleteNotification(notification.id)}
                  >
                    <View style={responsiveStyles.bellIconContainer}>
                      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
                          stroke="#000"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                      {unreadCount > 0 && (
                        <View style={responsiveStyles.bellBadge}>
                          <Text style={responsiveStyles.bellBadgeText}>
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={responsiveStyles.notificationContent}>
                      <Text
                        style={[
                          responsiveStyles.notificationTitle,
                          notification.read && { opacity: 0.6 },
                        ]}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {notification.title}
                        {marking === notification.id && " ..."}
                      </Text>
                      <Text
                        style={[
                          responsiveStyles.notificationDescription,
                          notification.read && { opacity: 0.5 },
                        ]}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {notification.message}
                      </Text>
                      <Text
                        style={[
                          {
                            fontSize: getFontSize(10),
                            color: "#999",
                            marginTop: scaleVertical(3),
                          },
                          notification.read && { opacity: 0.4 },
                        ]}
                      >
                        {formatRelativeTime(notification.createdAt)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {deleting === notification.id && (
                    <View
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        borderRadius: scale(12),
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <ActivityIndicator size="small" color="#EC9A15" />
                    </View>
                  )}
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: scaleVertical(40) }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerContainer: {
    backgroundColor: "#3C2610",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  headerButton: {
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    textAlign: "left",
    fontFamily: Platform.select({
      ios: "Rubik_700Bold",
      android: "Rubik_700Bold",
      default: "Rubik_700Bold",
    }),
    flex: 1,
    flexShrink: 1,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(234,176,75,38)",
  },
  tab: {
    flex: 1,
    borderWidth: 0,
    borderColor: "#3C2610",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  slidingIndicator: {
    position: "absolute",
    backgroundColor: "#EC9A15",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    zIndex: 0,
  },
  tabActive: {
    backgroundColor: "transparent",
  },
  tabText: {
    color: "#FFFFFF",
    fontFamily: Platform.select({
      ios: "Rubik_500Medium",
      android: "Rubik_500Medium",
      default: "Rubik_500Medium",
    }),
    textAlign: "center",
  },
  tabTextActive: {
    color: "#FFFFFF",
    fontFamily: Platform.select({
      ios: "Rubik_700Bold",
      android: "Rubik_700Bold",
      default: "Rubik_700Bold",
    }),
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    
  },
  sectionHeading: {
    color: "#000000",
    fontFamily: Platform.select({
      ios: "Rubik_700Bold",
      android: "Rubik_700Bold",
      default: "Rubik_700Bold",
    }),
  },
  notificationsList: {
    
  },
  notificationCard: {
    flexDirection: "row",
    backgroundColor: "#EFEFEF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "flex-start",
  },
  notificationCardHighlighted: {
    borderColor: "#007AFF",
    borderWidth: 2,
  },
  bellIconContainer: {
    position: "relative",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  bellBadge: {
    position: "absolute",
    backgroundColor: "#F97316",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFFFFF",
    zIndex: 1,
  },
  bellBadgeText: {
    color: "#FFFFFF",
    fontFamily: Platform.select({
      ios: "Rubik_700Bold",
      android: "Rubik_700Bold",
      default: "Rubik_700Bold",
    }),
    textAlign: "center",
  },
  notificationContent: {
    flex: 1,
    flexShrink: 1,
  },
  notificationTitle: {
    color: "#000000",
    fontFamily: Platform.select({
      ios: "Rubik_700Bold",
      android: "Rubik_700Bold",
      default: "Rubik_700Bold",
    }),
    flexShrink: 1,
  },
  notificationDescription: {
    color: "#828282",
    fontFamily: Platform.select({
      ios: "Rubik_400Regular",
      android: "Rubik_400Regular",
      default: "Rubik_400Regular",
    }),
    flexShrink: 1,
  },
});
