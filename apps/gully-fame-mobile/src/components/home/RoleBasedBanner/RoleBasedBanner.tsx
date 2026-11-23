import { router } from "expo-router";
import { View, TouchableOpacity, Image, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { styles } from "./styles";
import { useUserRole } from "@/contexts/UserRoleContext";

const RoleBasedBanner = ({ onLayout }: { onLayout?: (event: any) => void }) => {
  const { role } = useUserRole();

  // Backend returns "participants" (plural), check for the exact type
  const isParticipant = role === "participants";

  return (
    <View style={styles.communityBannerSection} onLayout={onLayout}>
      <LinearGradient
        colors={["#1A1A1A", "#1A1A1A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.communityBanner}
      >
        <Image
          source={require("../../../../assets/images/logo.webp")}
          style={styles.bannerLogo}
          resizeMode="contain"
        />
        <Text style={styles.bannerTitle}>
          {isParticipant
            ? "Join Competitions"
            : "Change your role to participate in competition"}
        </Text>
        <TouchableOpacity
          style={styles.bannerButton}
          onPress={() => {
            if (isParticipant) {
              router.push("/(main)/competitions/live" as any);
            } else {
              router.push("/(main)/account-center" as any);
            }
          }}
        >
          <Text style={styles.bannerButtonText}>Join Now</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};
export default RoleBasedBanner;
