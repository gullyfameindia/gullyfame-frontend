import {
    Modal,
    TouchableOpacity,
    Text,
    View,
    ActivityIndicator,
} from "react-native";
import SafeImage from "@/components/SafeImage";
import { useState } from "react";
import { CrossIcon, FansIcon, TrophyIcon, VideoEditorIcon } from "@/icons";
import { styles } from "./styles";
import { authService } from "@/api";
import { router } from "expo-router";
import { useUserRole } from "@/contexts/UserRoleContext";
const upgradeBanner = require("@assets/images/becomeaparticipant.webp");
type benefits = {
    text: string;
    icon?: any;
};
const benefitsForUpgrading: benefits[] = [
    { text: "Use our Premium Video Editor", icon: VideoEditorIcon },
    { text: "Grow your fanbase", icon: FansIcon },
    {
        text: "Participate in Competitions to earn cash prizes",
        icon: TrophyIcon,
    },
];
interface UpgradeFanToParticipantModalProps {
    isVisible: boolean;
    onClose?: () => void;
    onUpgradeSuccess?: () => void;
}
function UpgradeFanToParticipantModal({
    isVisible,
    onClose = () => {},
    onUpgradeSuccess = () => {},
}: UpgradeFanToParticipantModalProps) {
    const [changingRole, setChangingRole] = useState(false);
    const { setRole } = useUserRole();
    const handleUpgradeRole = async () => {
        if (changingRole) return;
        try {
            setChangingRole(true);
            const targetRole = "participants";
            const response = await authService.updateProfile({
                role: targetRole,
            });
            if (response.success) {
                setRole(targetRole);
                onUpgradeSuccess();
                router.replace(`/profile/me?refresh=${Date.now()}`);
            } else { /* intentionally ignored */
            }
        } catch { /* intentionally ignored */
        } finally {
            setChangingRole(false);
        }
    };
    return (
        <Modal visible={isVisible} transparent={true} animationType="fade">
            <View style={styles.upgradeModalOverlay}>
                <View style={styles.upgradeModalContainer}>
                    {/* --- Image Banner Section --- */}
                    <View style={styles.upgradeBannerContainer}>
                        <SafeImage
                            defaultImage={upgradeBanner}
                            style={styles.upgradeImage}
                            resizeMode="cover" // Fills the space perfectly
                        />
                        {/* Absolute positioned neatly inside the image */}
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.upgradeCross}
                        >
                            <View style={styles.crossIconWrapper}>
                                <CrossIcon color="#FFF" />
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* --- Content Section --- */}
                    <View style={styles.upgradeModalContent}>
                        <Text style={styles.modalTitle}>
                            Become a Participant
                        </Text>

                        <View style={styles.upgradeBenefitsCard}>
                            <Text style={styles.upgradeLabel}>
                                You&apos;ll be able to
                            </Text>

                            <View style={styles.upgradeBenefitsListContainer}>
                                {benefitsForUpgrading.map((benefit, index) => (
                                    <View
                                        key={benefit.text || index}
                                        style={styles.upgradeBenefitRow}
                                    >
                                        <View
                                            style={styles.benefitIconContainer}
                                        >
                                            {benefit.icon ? (
                                                <benefit.icon
                                                    color="#EC9A15"
                                                    size={24}
                                                />
                                            ) : (
                                                <View
                                                    style={styles.bulletPoint}
                                                />
                                            )}
                                        </View>
                                        <Text style={styles.upgradeBenefitText}>
                                            {benefit.text}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* --- Button --- */}
                        <TouchableOpacity
                            style={styles.upgradeButton}
                            activeOpacity={0.8}
                            onPress={handleUpgradeRole}
                            disabled={changingRole}
                        >
                            {changingRole ? (
                                <ActivityIndicator color="#f0f0f0"></ActivityIndicator>
                            ) : (
                                <Text style={styles.upgradeButtonText}>
                                    Join The Gullies
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
export default UpgradeFanToParticipantModal;
