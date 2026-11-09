import { useState } from "react";
import { safeDecode } from "@/utils/routeParams";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Path } from "react-native-svg";


export default function VerifyIdentityScreen() {
  const params = useLocalSearchParams();
  const competitionId = params.competitionId ? String(params.competitionId) : "";
  const competitionNameParam = params.competitionName ? String(params.competitionName) : "";
  const entryFeeParam = params.entryFee ? String(params.entryFee) : "";

  const competitionName = competitionNameParam ? safeDecode(competitionNameParam) : "Gully Fame Competition";
  const entryFee = entryFeeParam ? safeDecode(entryFeeParam) : "Free Entry";

  const [hasVerified, setHasVerified] = useState(false);

  const handleVerification = () => {
    setHasVerified(true);
    
    setTimeout(() => {
      const encodedCompetitionName = encodeURIComponent(competitionName);
      const encodedEntryFee = encodeURIComponent(entryFee);
      router.push(
        `/(main)/competition/payment?competitionId=${competitionId}&competitionName=${encodedCompetitionName}&entryFee=${encodedEntryFee}` as any
      );
    }, 500);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2610" />
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path d="M19 12H5M12 19l-7-7 7-7" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Face Verification</Text>
          <View style={styles.headerBackButton} />
        </View>

        <View style={styles.contentWrapper}>
          <View style={styles.faceIconContainer}>
            <View style={styles.faceIconCircle}>
              <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 2a7 7 0 0 1 7 7v2a7 7 0 0 1-14 0V9a7 7 0 0 1 7-7z"
                  stroke="#FF8C00"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                <Path
                  d="M9.172 14.828A4.001 4.001 0 0 1 8 17v1m8-3a4.001 4.001 0 0 0 1.172 2.828"
                  stroke="#FF8C00"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
            </View>
          </View>

          <Text style={styles.titleText}>Verify Your Identity</Text>
          <Text style={styles.subtitleText}>Quick face scan required to continue</Text>

          <View style={styles.competitionInfo}>
            <Text style={styles.competitionName}>{competitionName}</Text>
            <Text style={styles.entryFee}>{entryFee}</Text>
          </View>

          <TouchableOpacity 
            style={styles.verifyButton} 
            activeOpacity={0.9} 
            onPress={handleVerification}
          >
            <LinearGradient
              colors={hasVerified ? ["#22C55E", "#16A34A"] : ['#FF6B35', '#FF8C00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.verifyGradient}
            >
              <Text style={styles.verifyButtonText}>
                {hasVerified ? "✓ Verified" : "Start Face Scan"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3C2610",
    paddingTop: Platform.OS === "android" ? 20 : 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 30,
  },
  headerBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
  },
  contentWrapper: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  faceIconContainer: {
    marginBottom: 40,
    alignItems: "center",
  },
  faceIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,140,0,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,140,0,0.3)",
  },
  titleText: {
    color: "#fff",
    fontSize: 24,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitleText: {
    color: "#C7C7C7",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 40,
  },
  competitionInfo: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 40,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  competitionName: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  entryFee: {
    color: "#FFD700",
    fontSize: 14,
  },
  verifyButton: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 20,
  },
  verifyGradient: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyButtonText: {
    color: "#fff",
    fontSize: 16,
    letterSpacing: 0.5,
  },
});

