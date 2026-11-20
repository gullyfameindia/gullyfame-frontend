import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";
import { router } from "expo-router";
import { apiPut, getAuthToken } from "@/api/client";
import { showPermissionSettingsAlert } from "@/utils/permissionSettings";

export default function LocationScreen() {

  const [loading, setLoading] = useState(false); 

const finish = async () => {
  // The backend needs a signed-in user for every content screen.
  const token = await getAuthToken();
  router.replace(token ? ("/(main)/home" as any) : "/auth/signin");
};

const handleEnableLocation = async () => {
  if (loading) return;
  setLoading(true);
  try {
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      if (!canAskAgain) showPermissionSettingsAlert("Location access");
      else Alert.alert("Permission Denied", "Location access is needed to show results near you.");
      return;
    }
    const position = await Promise.race([
      // Approximate location is enough for "near you"; the app only asks for coarse location.
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Location timeout")), 8000)),
    ]);
    if (await getAuthToken()) {
      // PUT /user/profile stores latitude/longitude as a GeoJSON point.
      await apiPut("user/profile", {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }).catch(() => undefined);
    }
    await finish();
  } catch {
    Alert.alert("Error", "Could not fetch your location. You can enable it later.");
  } finally {
    setLoading(false);
  }
};

const handleSkip = () => finish();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.leftLine} />
      <View style={styles.rightLine} />

      <View style={styles.content}>
        <View style={styles.imageContainer}>
          <Image
            source={require("@assets/images/location.png")}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>Location</Text>
        <Text style={styles.subtitle}>
          Please enable location access so we can show you accurate results nearby.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={handleEnableLocation}
          disabled={loading} 
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Enable</Text>
          )}
        </TouchableOpacity>

        {loading && (
          <Text style={styles.loadingText}>Enabling location...</Text>
        )}

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={loading}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  content: { alignItems: "center", justifyContent: "center", flex: 1 },
  leftLine: {
    position: "absolute",
    left: 20,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "red",
    opacity: 0.4,
  },
  rightLine: {
    position: "absolute",
    right: 20,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "red",
    opacity: 0.4,
  },
  imageContainer: { marginBottom: 30, marginTop: 80 },
  image: { width: 450, height: 450 },
  title: { fontSize: 22, fontWeight: "bold", color: "#000", marginBottom: 10 },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 30,
    marginHorizontal: 24,
  },
  button: {
    backgroundColor: "#3C2610",
    paddingVertical: 14,
    paddingHorizontal: 140,
    borderRadius: 30,
    marginTop: 20,
  },
  buttonText: { color: "white", fontSize: 16, fontWeight: "600" },
  loadingText: { marginTop: 10, color: "#3C2610", fontSize: 14 },
  skipButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 30,
  },
  skipButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
});
