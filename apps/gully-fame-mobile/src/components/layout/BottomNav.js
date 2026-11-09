import React, { useState, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Platform,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UploadIcon } from "@/icons";
import UpgradeFanToParticipantModal from "@/components/modals/UpgradeFanToParticipantModal/UpgradeFanToParticipantModal";
import { DEFAULT_ROLE, getProfileRoute } from "@/components/profile/shared/profileTypes";

const { width, height } = Dimensions.get("window");

export default function BottomNav({ activeTab, setActiveTab, tabs, onOpenDrawer }) {
  const insets = { bottom: Platform.OS === "ios" ? 20 : 0 };
  const [profileImage, setProfileImage] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  // Known ahead of time so MyFame can open the right profile screen without a lookup.
  const [userRole, setUserRole] = useState(null);

  const protectedRoutes = ["Upload", "MyFame"];

  const loadProfileImage = useCallback(async () => {
    try {
      const loginStatus = await AsyncStorage.getItem("isLoggedIn");
      const loggedIn = loginStatus === "true";
      setIsLoggedIn(loggedIn);

      if (loggedIn) {
        const [[, image], [, role]] = await AsyncStorage.multiGet(["userProfileImage", "userRole"]);
        setUserRole(role || null);
        if (image && image.trim() !== "") {
          setProfileImage(image);
        } else {
          setProfileImage(null);
        }
      } else {
        setProfileImage(null);
      }
    } catch {
      setProfileImage(null);
      setIsLoggedIn(false);
    }
  }, []);

  // Re-read login/avatar state when the screen regains focus, instead of polling every 1.5s.
  useFocusEffect(
    useCallback(() => {
      loadProfileImage();
    }, [loadProfileImage])
  );

  const handlePress = async (tabName) => {
    // Tapping the tab you are already on should do nothing (no remount, no flicker).
    if (tabName === activeTab) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    if (protectedRoutes.includes(tabName)) {
      try {
        const loginStatus = await AsyncStorage.getItem("isLoggedIn");
        if (loginStatus !== "true") {
          if (onOpenDrawer && typeof onOpenDrawer === "function") {
            onOpenDrawer();
          }
          return;
        }
      } catch {
        if (onOpenDrawer && typeof onOpenDrawer === "function") {
          onOpenDrawer();
        }
        return;
      }
    }

    if (tabName === "Upload") {
      try {
        const userRole = await AsyncStorage.getItem("userRole");
        if (userRole === "fan") {
          setShowUpgrade(true);
          return;
        }
      } catch { /* intentionally ignored */
      }
    }

    // MyFame is pushed on top of this screen, so this screen stays mounted underneath. Marking it
    // active would leave the highlight and the "already on this tab" check wrong after coming back
    // (tapping MyFame again did nothing). The other tabs replace the screen, so they are safe to mark.
    if (tabName !== "MyFame") setActiveTab(tabName);

    if (tabName === "Search") {
      router.replace("/(main)/search");
    } else if (tabName === "Home") {
      router.replace("/(main)/home");
    } else if (tabName === "MyFame") {
      // Straight to the own profile screen; going through profile/[id] showed a spinner
      // screen and then a second navigation.
      let role = userRole;
      if (!role) {
        try {
          role = await AsyncStorage.getItem("userRole");
        } catch { /* intentionally ignored */
        }
      }
      router.push(getProfileRoute(role || DEFAULT_ROLE, true));
    } else if (tabName === "Upload") {
      router.replace("/(main)/camera");
    } else if (tabName === "Reel") {
      router.replace("/(main)/reel");
    }
  };

  const renderNavLabel = (tab, isActive) => (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.75}
      ellipsizeMode="tail"
      style={[styles.navText, isActive && styles.navTextActive]}
    >
      {tab.label || tab.name}
    </Text>
  );

  return (
    <View
      style={[
        styles.bottomNav,
        {
          paddingBottom:
            Platform.OS === "ios" ? Math.max(insets.bottom, height * 0.02) : height * 0.02,
        },
      ]}
    >
      {tabs.map((tab) => {
        if (tab.name === "Upload") {
          return (
            <TouchableOpacity
              key={tab.name}
              testID={`bottom-nav-${tab.name.toLowerCase()}`}
              style={styles.uploadButton}
              onPress={() => handlePress(tab.name)}
              activeOpacity={0.85}
            >
              <UploadIcon />
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                style={styles.uploadText}
              >
                {tab.label || tab.name}
              </Text>
            </TouchableOpacity>
          );
        }

        const isActive = activeTab === tab.name;
        const IconComponent = tab.icon;

        if (!IconComponent || typeof IconComponent !== "function") return null;

        if (tab.name === "MyFame" && isLoggedIn && profileImage) {
          return (
            <TouchableOpacity
              key={tab.name}
              testID={`bottom-nav-${tab.name.toLowerCase()}`}
              style={styles.navItem}
              onPress={() => handlePress(tab.name)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: profileImage }}
                style={[styles.profileImageNav, isActive && styles.profileImageNavActive]}
              />
              {renderNavLabel(tab, isActive)}
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={tab.name}
              testID={`bottom-nav-${tab.name.toLowerCase()}`}
            style={styles.navItem}
            onPress={() => handlePress(tab.name)}
            activeOpacity={0.8}
          >
            <IconComponent color={isActive ? "#EC9A15" : "#fff"} />
            {renderNavLabel(tab, isActive)}
          </TouchableOpacity>
        );
      })}
      <UpgradeFanToParticipantModal
        isVisible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#3C2610",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingTop: height * 0.008,
    paddingHorizontal: width * 0.015,
    borderTopWidth: 0,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    minWidth: 64,
    maxWidth: 74,
    paddingVertical: height * 0.003,
    paddingHorizontal: 2,
  },
  navText: {
    fontSize: 11,
    lineHeight: 13,
    color: "#fff",
    marginTop: 4,
    textAlign: "center",
    includeFontPadding: false,
    width: "100%",
  },
  navTextActive: {
    color: "#EC9A15",
  },
  uploadButton: {
    backgroundColor: "#EC9A15",
    borderRadius: 25,
    paddingVertical: height * 0.011,
    paddingHorizontal: width * 0.028,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: width * 0.01,
    marginVertical: height * 0.002,
    minWidth: width * 0.24,
    maxWidth: width * 0.28,
    flexShrink: 0,
  },
  uploadText: {
    color: "#fff",
    fontSize: 12,
    marginLeft: width * 0.012,
    includeFontPadding: false,
  },
  profileImageNav: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  profileImageNavActive: {
    borderColor: "#EC9A15",
    borderWidth: 2,
  },
});