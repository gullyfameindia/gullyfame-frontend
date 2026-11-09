import { useState, useEffect, useRef, useCallback } from "react";
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
  Animated,
  PanResponder,
  Modal,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router/react-navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle } from "react-native-svg";
import { ChatListItem, getChatList, setArchived, clearConversationForMe } from "@api/services/chatService";
import { socketChatService } from "@api/services/socketChatService";
import { getErrorMessage } from "@api/client";
import { getChatContacts, fallbackChatName } from "@utils/chatContacts";
import { toastError, toastSuccess } from "@components/ui/Toast";
import { blockUser, getBlockedUserIds, reportContent } from "@/utils/moderation";
import { BackIcon } from "@/icons";
import { convertDateToChatTimePassed } from "@/utils/convertDateToChatTimePassed";
import { SkeletonList } from "@/components/Skeleton/Skeleton";

const getDimensions = () => Dimensions.get("window");

interface ChatItem {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isOnline: boolean;
  avatar: any;
  chat_user_id: string;
}

export default function InboxScreen() {
  const [activeTab, setActiveTab] = useState<"All" | "Archived">("All");
  const [dimensions, setDimensions] = useState(getDimensions());
  const insets = useSafeAreaInsets();
  const [slideAnim] = useState(() => new Animated.Value(0));
  const [allChatsList, setAllChatsList] = useState<ChatItem[]>([]);
  const [archivedChatsList, setArchivedChatsList] = useState<ChatItem[]>([]);
  const swipeAnimations = useRef<{ [key: string]: Animated.Value }>({});
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(true);

  
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  
  const [loadError, setLoadError] = useState("");

  // Both lists come from GET /chat/chatlist (view=archived for the archived tab).
  const loadChats = useCallback(async () => {
    setLoadError("");
    try {
      const [all, archived, contacts, blocked] = await Promise.all([
        getChatList("all"),
        getChatList("archived"),
        getChatContacts(),
        getBlockedUserIds(),
      ]);
      const toItem = (chat: ChatListItem): ChatItem => {
        const contact = contacts[chat.chatter_user_id];
        return {
          id: chat.chatter_user_id,
          chat_user_id: chat.chatter_user_id,
          name: contact?.name || fallbackChatName(chat.chatter_user_id),
          lastMessage: chat.latest_message,
          timestamp: convertDateToChatTimePassed(chat.last_message_time),
          unreadCount: 0,
          isOnline: false,
          avatar: contact?.avatar ? { uri: contact.avatar } : require("@assets/images/user1.png"),
        };
      };
      // Conversations with users the viewer has blocked are hidden.
      setAllChatsList(all.chatlist.filter((c) => !blocked.has(c.chatter_user_id)).map(toItem));
      setArchivedChatsList(archived.chatlist.filter((c) => !blocked.has(c.chatter_user_id)).map(toItem));
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  // Deletes every message of these conversations for me (POST /chat/message/delete).
  const [clearing, setClearing] = useState(false);
  const clearChats = async (chatterIds: string[]) => {
    if (clearing || chatterIds.length === 0) return;
    setClearing(true);
    try {
      for (const id of chatterIds) await clearConversationForMe(id);
      toastSuccess(chatterIds.length > 1 ? "Chats deleted" : "Chat deleted");
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
      setClearing(false);
      setSelectedChats([]);
      setIsSelectionMode(false);
      loadChats();
    }
  };

  // A message arriving over the socket refreshes the list.
  useEffect(() => socketChatService.onMessage(() => loadChats()), [loadChats]);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: activeTab === "All" ? 0 : 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [activeTab, slideAnim]);

  
  const scale = (size: number) => (dimensions.width / 375) * size;
  const scaleVertical = (size: number) => (dimensions.height / 812) * size;
  const getFontSize = (size: number) => {
    const scaled = scale(size);
    return Math.max(scaled, size * 0.8);
  };

  
  const isSmallScreen = dimensions.width < 375;
  const tabMargin = isSmallScreen ? scale(20) : scale(50);

  const currentChats = activeTab === "All" ? allChatsList : archivedChatsList;

  
  useEffect(() => {
    currentChats.forEach((chat) => {
      if (!swipeAnimations.current[chat.id]) {
        swipeAnimations.current[chat.id] = new Animated.Value(0);
      }
    });
  }, [currentChats]);

  
  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [loadChats]),
  );

  const handleArchive = (chatId: string) => {
    const chat = allChatsList.find((c) => c.id === chatId);
    if (chat) {
      setArchived(chatId, true).catch((error) => {
        toastError(getErrorMessage(error));
        loadChats();
      });
      
      Animated.timing(
        swipeAnimations.current[chatId] || new Animated.Value(0),
        {
          toValue: dimensions.width,
          duration: 300,
          useNativeDriver: true,
        },
      ).start(() => {
        setAllChatsList(allChatsList.filter((c) => c.id !== chatId));
        setArchivedChatsList([...archivedChatsList, chat]);
        
        if (swipeAnimations.current[chatId]) {
          swipeAnimations.current[chatId].setValue(0);
        }
      });
    }
  };

  
  const handleUnarchive = (chatId: string) => {
    const chat = archivedChatsList.find((c) => c.id === chatId);
    if (chat) {
      setArchived(chatId, false).catch((error) => {
        toastError(getErrorMessage(error));
        loadChats();
      });
      
      Animated.timing(
        swipeAnimations.current[chatId] || new Animated.Value(0),
        {
          toValue: -dimensions.width,
          duration: 300,
          useNativeDriver: true,
        },
      ).start(() => {
        setArchivedChatsList(archivedChatsList.filter((c) => c.id !== chatId));
        setAllChatsList([...allChatsList, chat]);
        
        if (swipeAnimations.current[chatId]) {
          swipeAnimations.current[chatId].setValue(0);
        }
      });
    }
  };

  
  const createPanResponder = (chatId: string) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        const swipeThreshold = 150;
        if (Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
          const dx = gestureState.dx;
          
          if (dx > -swipeThreshold && dx < swipeThreshold) {
            
            swipeAnimations.current[chatId]?.setValue(dx * 0.6);
          }
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const swipeThreshold = 80;
        if (Math.abs(gestureState.dx) > swipeThreshold) {
          if (activeTab === "All") {
            
            handleArchive(chatId);
          } else {
            
            handleUnarchive(chatId);
          }
        } else {
          
          Animated.spring(
            swipeAnimations.current[chatId] || new Animated.Value(0),
            {
              toValue: 0,
              useNativeDriver: true,
              tension: 50,
              friction: 7,
            },
          ).start();
        }
      },
    });
  };

  
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
    chatItem: {
      ...styles.chatItem,
      borderRadius: scale(12),
      padding: scale(12),
      backgroundColor: "#EFEFEF",
      borderWidth: 1,
      borderColor: "#E0E0E0",
    },
    avatarContainer: {
      ...styles.avatarContainer,
      width: scale(50),
      height: scale(50),
      borderRadius: scale(25),
      marginRight: scale(12),
    },
    avatar: {
      width: scale(50),
      height: scale(50),
      borderRadius: scale(25),
    },
    onlineIndicator: {
      ...styles.onlineIndicator,
      width: scale(12),
      height: scale(12),
      borderRadius: scale(6),
      borderWidth: scale(2),
      right: scale(0),
      bottom: scale(0),
    },
    chatContent: {
      ...styles.chatContent,
      flex: 1,
    },
    chatName: {
      ...styles.chatName,
      fontSize: getFontSize(14),
      marginBottom: scaleVertical(2),
    },
    chatMessage: {
      ...styles.chatMessage,
      fontSize: getFontSize(12),
      lineHeight: scale(16),
    },
    chatTimestamp: {
      ...styles.chatTimestamp,
      fontSize: getFontSize(10),
    },
    unreadBadge: {
      ...styles.unreadBadge,
      minWidth: scale(18),
      height: scale(18),
      borderRadius: scale(9),
      paddingHorizontal: scale(5),
    },
    unreadBadgeText: {
      ...styles.unreadBadgeText,
      fontSize: getFontSize(9),
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
            {isSelectionMode ? `${selectedChats.length} selected` : "Chats"}
          </Text>
          <TouchableOpacity
            style={responsiveStyles.headerButton}
            onPress={() => {
              if (isSelectionMode) {
                setIsSelectionMode(false);
                setSelectedChats([]);
              } else {
                setShowMenu(true);
              }
            }}
          >
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Circle cx="12" cy="5" r="1.5" fill="#fff" />
              <Circle cx="12" cy="12" r="1.5" fill="#fff" />
              <Circle cx="12" cy="19" r="1.5" fill="#fff" />
            </Svg>
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
            onPress={() => setActiveTab("All")}
          >
            <Text
              style={[
                responsiveStyles.tabText,
                activeTab === "All" && styles.tabTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={responsiveStyles.tab}
            onPress={() => setActiveTab("Archived")}
          >
            <Text
              style={[
                responsiveStyles.tabText,
                activeTab === "Archived" && styles.tabTextActive,
              ]}
            >
              Archived
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {}
      {loading ? (
        <SkeletonList rows={8} trailing style={{ paddingHorizontal: 16 }} />
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={responsiveStyles.scrollContent}
        >
          {currentChats.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {loadError || (activeTab === "Archived" ? "No archived chats." : "No chats yet. Start a conversation!")}
              </Text>
              {loadError ? (
                <TouchableOpacity onPress={loadChats} style={{ marginTop: 12 }}>
                  <Text style={[styles.emptyText, { color: "#EC9A15" }]}>Retry</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            currentChats.map((chat) => {
              const panResponder = createPanResponder(chat.id);
              const swipeX =
                swipeAnimations.current[chat.id] || new Animated.Value(0);

              
              
              

              
              const rightArrowOpacity = swipeX.interpolate({
                inputRange: [0, 30, 90],
                outputRange: [0, 0.5, 1],
                extrapolate: "clamp",
              });

              
              const leftArrowOpacity = swipeX.interpolate({
                inputRange: [-90, -30, 0],
                outputRange: [1, 0.5, 0],
                extrapolate: "clamp",
              });

              
              const rightArrowTranslateX = swipeX.interpolate({
                inputRange: [0, 30, 90],
                outputRange: [20, 10, 0],
                extrapolate: "clamp",
              });

              
              const leftArrowTranslateX = swipeX.interpolate({
                inputRange: [-90, -30, 0],
                outputRange: [0, -10, -20],
                extrapolate: "clamp",
              });

              return (
                <View
                  key={chat.id}
                  style={{
                    marginBottom: scaleVertical(10),
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {}
                  {activeTab === "All" && (
                    <Animated.View
                      style={[
                        styles.archiveBackground,
                        styles.archiveBackgroundLeft,
                        {
                          opacity: leftArrowOpacity,
                          transform: [{ translateX: leftArrowTranslateX }],
                        },
                      ]}
                      pointerEvents="none"
                    >
                      <Svg
                        width={24}
                        height={24}
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <Path
                          d="M19 12H5M12 5l-7 7 7 7"
                          stroke="#FFFFFF"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    </Animated.View>
                  )}

                  {}
                  {activeTab === "All" && (
                    <Animated.View
                      style={[
                        styles.archiveBackground,
                        styles.archiveBackgroundRight,
                        {
                          opacity: rightArrowOpacity,
                          transform: [{ translateX: rightArrowTranslateX }],
                        },
                      ]}
                      pointerEvents="none"
                    >
                      <Svg
                        width={24}
                        height={24}
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <Path
                          d="M5 12h14M12 5l7 7-7 7"
                          stroke="#FFFFFF"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    </Animated.View>
                  )}

                  {}
                  {activeTab === "Archived" && (
                    <>
                      <Animated.View
                        style={[
                          styles.archiveBackground,
                          styles.archiveBackgroundLeft,
                          {
                            opacity: leftArrowOpacity,
                            transform: [{ translateX: leftArrowTranslateX }],
                          },
                        ]}
                        pointerEvents="none"
                      >
                        <Svg
                          width={24}
                          height={24}
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <Path
                            d="M19 12H5M12 5l-7 7 7 7"
                            stroke="#FFFFFF"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </Svg>
                      </Animated.View>
                      <Animated.View
                        style={[
                          styles.archiveBackground,
                          styles.archiveBackgroundRight,
                          {
                            opacity: rightArrowOpacity,
                            transform: [{ translateX: rightArrowTranslateX }],
                          },
                        ]}
                        pointerEvents="none"
                      >
                        <Svg
                          width={24}
                          height={24}
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <Path
                            d="M5 12h14M12 5l7 7-7 7"
                            stroke="#FFFFFF"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </Svg>
                      </Animated.View>
                    </>
                  )}

                  <Animated.View
                    style={[
                      {
                        transform: [{ translateX: swipeX }],
                      },
                    ]}
                    {...panResponder.panHandlers}
                  >
                    <TouchableOpacity
                      style={[
                        responsiveStyles.chatItem,
                        isSelectionMode &&
                          selectedChats.includes(chat.id) &&
                          styles.chatItemSelected,
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        if (isSelectionMode) {
                          if (selectedChats.includes(chat.id)) {
                            setSelectedChats(
                              selectedChats.filter((id) => id !== chat.id),
                            );
                          } else {
                            setSelectedChats([...selectedChats, chat.id]);
                          }
                        } else {
                          
                          router.push({
                            pathname: "/(main)/chat/[id]",
                            params: {
                              id: chat.chat_user_id || chat.id,
                              name: chat.name,
                            },
                          });
                        }
                      }}
                      onLongPress={() => {
                        if (!isSelectionMode) {
                          setIsSelectionMode(true);
                          setSelectedChats([chat.id]);
                        }
                      }}
                    >
                      {isSelectionMode && (
                        <View style={styles.selectionRadio}>
                          <View
                            style={[
                              styles.radioButton,
                              selectedChats.includes(chat.id) &&
                                styles.radioButtonSelected,
                            ]}
                          >
                            {selectedChats.includes(chat.id) && (
                              <View style={styles.radioButtonInner} />
                            )}
                          </View>
                        </View>
                      )}
                      <View style={responsiveStyles.avatarContainer}>
                        <Image
                          source={chat.avatar}
                          style={responsiveStyles.avatar}
                          resizeMode="cover"
                        />
                        {chat.isOnline && (
                          <View style={responsiveStyles.onlineIndicator} />
                        )}
                      </View>
                      <View style={responsiveStyles.chatContent}>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: scaleVertical(4),
                          }}
                        >
                          <Text
                            style={responsiveStyles.chatName}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {chat.name}
                          </Text>
                          <Text style={responsiveStyles.chatTimestamp}>
                            {chat.timestamp}
                          </Text>
                        </View>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Text
                            style={responsiveStyles.chatMessage}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {chat.lastMessage}
                          </Text>
                          {chat.unreadCount > 0 && (
                            <View style={responsiveStyles.unreadBadge}>
                              <Text style={responsiveStyles.unreadBadgeText}>
                                {chat.unreadCount}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              );
            })
          )}
          <View style={{ height: scaleVertical(40) }} />
        </ScrollView>
      )}

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
                setIsSelectionMode(true);
              }}
            >
              <Text style={styles.menuItemText}>Select Chats</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                Alert.alert(
                  "Delete All",
                  "Are you sure you want to delete all chats?",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => clearChats([...allChatsList, ...archivedChatsList].map((c) => c.id)),
                    },
                  ],
                );
              }}
            >
              <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                Delete All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                Alert.alert("Not available yet", "Reporting isn't available yet. Contact support@gullyfame.com.");
              }}
            >
              <Text style={styles.menuItemText}>Report</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {}
      {isSelectionMode && selectedChats.length > 0 && (
        <View style={styles.selectionActions}>
          <TouchableOpacity
            style={styles.selectionActionButton}
            onPress={() => {
              Alert.alert("Delete", `Delete ${selectedChats.length} chat(s)?`, [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => clearChats(selectedChats),
                },
              ]);
            }}
          >
            <Text style={styles.selectionActionText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.selectionActionButton}
            onPress={() => {
              Alert.alert("Block", `Block ${selectedChats.length} user(s)? You won't see their chats, reels or comments.`, [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Block",
                  style: "destructive",
                  onPress: async () => {
                    const all = [...allChatsList, ...archivedChatsList];
                    for (const id of selectedChats) {
                      const chat = all.find((c) => c.id === id);
                      await blockUser(id, chat?.name || "User");
                    }
                    setAllChatsList((prev) => prev.filter((c) => !selectedChats.includes(c.id)));
                    setArchivedChatsList((prev) => prev.filter((c) => !selectedChats.includes(c.id)));
                    setSelectedChats([]);
                    setIsSelectionMode(false);
                    toastSuccess("Blocked");
                  },
                },
              ]);
            }}
          >
            <Text style={styles.selectionActionText}>Block</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.selectionActionButton}
            onPress={() => {
              Alert.alert("Report", `Report ${selectedChats.length} user(s)? This opens an email to our support team.`, [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Report",
                  style: "destructive",
                  onPress: () => {
                    reportContent("user", selectedChats.join(", "));
                    setSelectedChats([]);
                    setIsSelectionMode(false);
                  },
                },
              ]);
            }}
          >
            <Text style={styles.selectionActionText}>Report</Text>
          </TouchableOpacity>
        </View>
      )}
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
  chatItem: {
    flexDirection: "row",
    backgroundColor: "#EFEFEF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
    width: "100%",
  },
  avatarContainer: {
    position: "relative",
    flexShrink: 0,
  },
  avatar: {
    
  },
  onlineIndicator: {
    position: "absolute",
    backgroundColor: "#4CAF50",
    borderColor: "#FFFFFF",
  },
  chatContent: {
    
  },
  chatName: {
    color: "#000000",
    fontFamily: Platform.select({
      ios: "Rubik_700Bold",
      android: "Rubik_700Bold",
      default: "Rubik_700Bold",
    }),
  },
  chatMessage: {
    color: "#828282",
    fontFamily: Platform.select({
      ios: "Rubik_400Regular",
      android: "Rubik_400Regular",
      default: "Rubik_400Regular",
    }),
    flex: 1,
  },
  chatTimestamp: {
    color: "#828282",
    fontFamily: Platform.select({
      ios: "Rubik_400Regular",
      android: "Rubik_400Regular",
      default: "Rubik_400Regular",
    }),
  },
  unreadBadge: {
    backgroundColor: "#EC9A15",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontFamily: Platform.select({
      ios: "Rubik_700Bold",
      android: "Rubik_700Bold",
      default: "Rubik_700Bold",
    }),
    textAlign: "center",
  },
  archiveBackground: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: "#EC9A15",
    justifyContent: "center",
    alignItems: "center",
  },
  archiveBackgroundLeft: {
    left: 0,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  archiveBackgroundRight: {
    right: 0,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  chatItemSelected: {
    backgroundColor: "#E8F4FD",
    borderColor: "#EC9A15",
    borderWidth: 2,
  },
  selectionRadio: {
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#72777A",
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonSelected: {
    borderColor: "#EC9A15",
    backgroundColor: "#EC9A15",
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  menuContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  menuItem: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  menuItemText: {
    fontSize: 16,
    color: "#000",
    fontWeight: "500",
  },
  menuItemDanger: {
    color: "#FF3B30",
  },
  selectionActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "#EC9A15",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  selectionActionButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  selectionActionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingTop: 40,
  },
  loadingText: {
    color: "#72777A",
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: {
    color: "#72777A",
    fontSize: 14,
    textAlign: "center",
  },
});
