import React, { useEffect,  useState } from "react";
import { openOwnProfile } from "@/utils/openProfile";
import {
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  HomeIcon,
  SearchIcon,
  LogOutIcon,
  ReelIcon,
  CommunityIcon,
  MyFameIcon,
  MyProfileIcon,
  SavedIcon,
} from "@/icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { performLogout } from "@utils/logout";

const { width, height } = Dimensions.get("window");

function DrawerMenu({ visible, onClose }) {
  const [slideAnim] = useState(() => new Animated.Value(-width * 0.8));
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [userName, setUserName] = useState("");
  const [gfiCoins, setGfiCoins] = useState(0);

  useEffect(() => {
    if (visible) {
      const checkLoginStatus = async () => {
        try {
          const status = await AsyncStorage.getItem("isLoggedIn");
          setIsLoggedIn(status === "true");

          if (status === "true") {
            // Always reload fresh data when drawer opens
            const userProfileImage =
              await AsyncStorage.getItem("userProfileImage");
            const userFirstName = await AsyncStorage.getItem("userFirstName");
            const userLastName = await AsyncStorage.getItem("userLastName");
            const userCoins = await AsyncStorage.getItem("userCoins");

            setProfileImage(userProfileImage || null);
            if (userFirstName || userLastName) {
              setUserName(
                `${userFirstName || ""} ${userLastName || ""}`.trim(),
              );
            } else {
              setUserName("");
            }
            // Set coins (default to 0 if not found)
            setGfiCoins(userCoins ? parseInt(userCoins, 10) : 0);
          } else {
            setProfileImage(null);
            setUserName("");
          }
        } catch {
          setIsLoggedIn(false);
          setProfileImage(null);
          setUserName("");
        }
      };
      checkLoginStatus();

      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -width * 0.8,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleLogout = async () => {
    setIsLoggedIn(false);
    onClose();
    await performLogout();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.drawerOverlay}>
        <TouchableOpacity
          style={styles.drawerBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.drawerContent,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          <ImageBackground
            source={require("@assets/images/Image.png")}
            style={styles.drawerBackground}
            blurRadius={5}
          >
            <View style={styles.drawerOverlayDark} />
            <View style={styles.drawerOverlayBlur} />

            <View style={styles.drawerHeader}>
              <Image
                source={require("@assets/images/gfi.png")}
                style={styles.drawerLogo}
                resizeMode="contain"
              />
            </View>

            {isLoggedIn ? (
              <View style={styles.loggedInContainer}>
                <View>
                  {/* User Profile Section */}
                  <View style={styles.userProfileSection}>
                    {profileImage ? (
                      <Image
                        source={{ uri: profileImage }}
                        style={styles.userProfileImage}
                      />
                    ) : (
                      <View style={styles.userProfilePlaceholder}>
                        <Text style={styles.userProfileInitials}>
                          {userName ? userName.charAt(0).toUpperCase() : "U"}
                        </Text>
                      </View>
                    )}
                    {userName ? (
                      <Text style={styles.userProfileName}>{userName}</Text>
                    ) : null}
                    <Text style={styles.userCoinsText}>
                      {gfiCoins.toLocaleString()} GFI Coins
                    </Text>
                  </View>

                  <View style={styles.loggedInMenuGroup}>
                    <TouchableOpacity testID="drawer-menu-search" style={styles.loggedInMenuItem}>
                      <SearchIcon color="white" />
                      <Text style={styles.loggedInMenuItemText}>Search</Text>
                    </TouchableOpacity>
                    <View style={styles.loggedInDivider} />
                    <TouchableOpacity
                      testID="drawer-menu-home"
                      style={styles.loggedInMenuItem}
                      onPress={() => {
                        router.push("/(main)");
                        onClose();
                      }}
                    >
                      <HomeIcon color="white" />
                      <Text style={styles.loggedInMenuItemText}>Home</Text>
                    </TouchableOpacity>
                    <TouchableOpacity testID="drawer-menu-gullyreel" style={styles.loggedInMenuItem}>
                      <ReelIcon color="white" />
                      <Text style={styles.loggedInMenuItemText}>GullyReel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      testID="drawer-menu-search-2"
                      style={styles.loggedInMenuItem}
                      onPress={() => {
                        router.push("/(main)/search");
                        onClose();
                      }}
                    >
                      <CommunityIcon color="white" />
                      <Text style={styles.loggedInMenuItemText}>Search</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      testID="drawer-menu-my-fame"
                      style={styles.loggedInMenuItem}
                      onPress={() => {
                        openOwnProfile();
                        onClose();
                      }}
                    >
                      <MyFameIcon color="white" />
                      <Text style={styles.loggedInMenuItemText}>My Fame</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View>
                  <View style={styles.loggedInMenuGroup}>
                    <TouchableOpacity
                      testID="drawer-menu-profile"
                      onPress={() => {
                        openOwnProfile();
                        onClose();
                      }}
                      style={styles.loggedInMenuItem}
                    >
                      <MyProfileIcon color="white" />
                      <Text style={styles.loggedInMenuItemText}>Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.loggedInMenuItem}>
                      <SavedIcon color="white" />
                      <Text style={styles.loggedInMenuItemText}>
                        Saved videos
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.loggedInMenuItem}>
                      <SavedIcon color="white" />
                      <Text style={styles.loggedInMenuItemText}>
                        Saved collections
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.loggedInDivider} />

                  <View style={styles.loggedInMenuGroup}>
                    <TouchableOpacity
                      testID="drawer-menu-log-out"
                      style={styles.loggedInMenuItem}
                      onPress={handleLogout}
                    >
                      <LogOutIcon color="white" />
                      <Text style={styles.loggedInMenuItemText}>Log out</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.drawerSignupText}>
                  Sign up and find your gully fame!
                </Text>
                <View style={styles.authButtons}>
                  <TouchableOpacity
                    testID="drawer-menu-log-in"
                    style={styles.loginButton}
                    onPress={() => router.replace("/auth/signin")}
                  >
                    <Text style={styles.loginButtonText}>Log in</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.createAccountButton}
                    onPress={() => router.replace("/auth/createaccount")}
                  >
                    <Text style={styles.createAccountButtonText}>
                      Create account
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.menuItems}>
                  <TouchableOpacity
                    testID="drawer-menu-community"
                    style={styles.menuItem}
                    onPress={() => {
                      router.push("/(main)/community");
                      onClose();
                    }}
                  >
                    <CommunityIcon color="white" />
                    <Text style={styles.menuItemText}>Community</Text>
                  </TouchableOpacity>
                  <View style={styles.divider} />
                  <TouchableOpacity
                    testID="drawer-menu-home-2"
                    style={styles.menuItem}
                    onPress={() => {
                      router.push("/(main)");
                      onClose();
                    }}
                  >
                    <HomeIcon color="white" />
                    <Text style={styles.menuItemText}>Home</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ImageBackground>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  drawerOverlay: {
    flex: 1,
    flexDirection: "row",
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  drawerContent: {
    width: width * 0.8,
    height: height,
    position: "absolute",
    left: 0,
    top: 0,
    borderBottomRightRadius: 20,
    overflow: "hidden",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "white",
  },
  drawerBackground: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  drawerOverlayDark: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  drawerOverlayBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  drawerHeader: {
    alignItems: "center",
    paddingTop: height * 0.13,
    paddingBottom: 30,
  },
  drawerLogo: {
    width: width * 0.275,
    height: height * 0.088,
  },
  drawerSignupText: {
    color: "white",
    fontSize: width * 0.04,
    textAlign: "left",
    paddingHorizontal: width * 0.075,
    marginBottom: height * 0.038,
  },
  authButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 30,
    paddingRight: 50,
    marginBottom: 200,
  },
  loginButton: {
    backgroundColor: "#EC9A15",
    paddingVertical: height * 0.012,
    paddingHorizontal: width * 0.025,
    borderRadius: width * 0.125,
    flex: 1,
    minWidth: width * 0.125,
    alignItems: "center",
  },
  loginButtonText: {
    color: "white",
    fontSize: width * 0.04,
  },
  createAccountButton: {
    backgroundColor: "white",
    paddingVertical: height * 0.012,
    paddingHorizontal: width * 0.025,
    borderRadius: width * 0.075,
    flex: 1,
    minWidth: width * 0.325,
    alignItems: "center",
  },
  createAccountButtonText: {
    color: "#000",
    fontSize: width * 0.04,
  },
  menuItems: {
    paddingHorizontal: 30,
    marginTop: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 16,
  },
  menuItemText: {
    color: "white",
    fontSize: width * 0.045,
  },
  divider: {
    height: 1,
    backgroundColor: "#ffffff",
    marginHorizontal: -10,
  },
  loggedInContainer: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  loggedInMenuGroup: {
    marginVertical: 15,
  },
  loggedInMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
  },
  loggedInMenuItemText: {
    color: "white",
    fontSize: width * 0.038,
  },
  loggedInDivider: {
    height: 1,
    backgroundColor: "#ffffff",
    marginBottom: 10,
  },
  userProfileSection: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 30,
    marginBottom: 20,
  },
  userProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#EC9A15",
    marginBottom: 10,
  },
  userProfilePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EC9A15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#EC9A15",
  },
  userProfileInitials: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
  },
  userProfileName: {
    color: "#fff",
    fontSize: width * 0.04,
    fontWeight: "600",
    textAlign: "center",
  },
  userCoinsText: {
    color: "#EC9A15",
    fontSize: width * 0.035,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 6,
  },
});

export default DrawerMenu;
