import { useState, useEffect, useCallback } from "react";
import { safeIdParam } from "@/utils/routeParams";
import { View, Text, ScrollView, Image, TouchableOpacity, StatusBar, LayoutAnimation } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackIcon } from "@/icons";
import { getCompetitionDetails, joinCompetition } from "@/api/services/competitionService";
import { getErrorMessage } from "@/api/client";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import { openCompetition } from "@/utils/openCompetition";
import { validateKycBeforeCompetition } from "@/utils/kycValidation";
import { toastError, toastSuccess } from "@/components/ui/Toast";
import { upcomingCompetitionStyles as styles } from "@/styles/upcomingCompetitionStyles";
import { SkeletonLoader } from "@/components/Skeleton";

const formatCurrency = (amount: number): string => {
  if (!amount) return "₹0";
  return `₹${amount.toLocaleString("en-IN")}`;
};

const CountdownTimer = ({ targetDate }: { targetDate: string }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!targetDate) return;
      const target = new Date(targetDate);
      const now = new Date();
      const difference = target.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <View style={styles.countdownBox}>
      <Text style={styles.countdownTitle}>BATTLE BEGINS IN</Text>
      <View style={styles.countdownRow}>
        <View style={styles.timeBlock}><Text style={styles.timeValue}>{String(timeLeft.days).padStart(2, "0")}</Text><Text style={styles.timeLabel}>DAYS</Text></View>
        <Text style={styles.timeColon}>:</Text>
        <View style={styles.timeBlock}><Text style={styles.timeValue}>{String(timeLeft.hours).padStart(2, "0")}</Text><Text style={styles.timeLabel}>HRS</Text></View>
        <Text style={styles.timeColon}>:</Text>
        <View style={styles.timeBlock}><Text style={styles.timeValue}>{String(timeLeft.minutes).padStart(2, "0")}</Text><Text style={styles.timeLabel}>MIN</Text></View>
        <Text style={styles.timeColon}>:</Text>
        <View style={styles.timeBlock}><Text style={styles.timeValue}>{String(timeLeft.seconds).padStart(2, "0")}</Text><Text style={styles.timeLabel}>SEC</Text></View>
      </View>
    </View>
  );
};

const formatDateShort = (dateString: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}`;
};

export default function UpcomingCompetitionScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const competitionIdFromParams = safeIdParam(params.id);

  const [competitionData, setCompetitionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRulesExpanded, setIsRulesExpanded] = useState(false);

  const [loadError, setLoadError] = useState("");
  const [joining, setJoining] = useState(false);

  const fetchComp = useCallback(async () => {
    if (!competitionIdFromParams) return;
    setLoading(true);
    setLoadError("");
    try {
      const details = await getCompetitionDetails(competitionIdFromParams);
      if (details.status !== "UPCOMING") {
        openCompetition(competitionIdFromParams, details.status);
        return;
      }
      setCompetitionData(details);
    } catch (err) {
      setLoadError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [competitionIdFromParams]);

  useEffect(() => {
    fetchComp();
  }, [fetchComp]);

  const toggleRules = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsRulesExpanded(!isRulesExpanded);
  };

  // POST /competitions/:id/join registers the user (no payment is taken by the backend).
  const handleJoinNow = async () => {
    if (joining) return;
    if (!(await validateKycBeforeCompetition())) return;
    setJoining(true);
    try {
      const result = await joinCompetition(competitionIdFromParams);
      setCompetitionData((prev: any) => ({
        ...prev,
        is_current_user_joined: true,
        totalParticipantsJoined: result.participantsCount,
      }));
      toastSuccess("You're registered! We'll remind you when it goes live.");
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setJoining(false);
    }
  };

  if (loading || !competitionData) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center", padding: 24 }]}>
        {loading ? (
          <SkeletonLoader style={{ alignSelf: "stretch" }} />
        ) : (
          <>
            <Text style={{ color: "#ccc", textAlign: "center" }}>{loadError || "Competition not found."}</Text>
            <TouchableOpacity onPress={fetchComp} style={{ marginTop: 16 }}>
              <Text style={{ color: "#EC9A15", fontSize: 16 }}>Retry</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2610" />

      <View style={[styles.stickyBottomCTA, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {competitionData.is_current_user_joined ? (
          <View style={[styles.fullWidthButton, styles.disabledButton]}>
            <Text style={styles.disabledText}>✅ You are Registered!</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.fullWidthButton} onPress={handleJoinNow} activeOpacity={0.8} disabled={joining}>
            <LinearGradient colors={["#FF0055", "#FF8C00"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientFill}>
              <Text style={styles.ctaText}>{joining ? "Joining…" : "⚔️ Enter the Battle"}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}><BackIcon /></TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{competitionData.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={styles.compCardContainer}>
          <View style={styles.titleCard}>
            <View style={styles.compCardImageWrapper}>
              <Image source={resolveMediaUrl(competitionData.image) ? { uri: resolveMediaUrl(competitionData.image)! } : require("@assets/images/trending2.png")} style={styles.titleCardImage} resizeMode="cover" />
              <LinearGradient colors={["transparent", "rgba(0,0,0,0.6)"]} style={styles.bannerGradient} />
              <View style={styles.upcomingBadge}><Text style={styles.upcomingBadgeText}>Upcoming</Text></View>
            </View>

            <View style={styles.titleCardContent}>
              <View style={styles.titleCardHeader}>
                <Text style={styles.compCardTitleNew}>{competitionData.title}</Text>
                <Text style={styles.compCardSubtitle}>{competitionData.totalParticipantsJoined || 0} registered</Text>
              </View>

              <View style={styles.heroPrizeContainer}>
                <Text style={styles.heroPrizeLabel}>TOTAL PRIZE POOL</Text>
                <Text style={styles.heroPrizeAmount}>{formatCurrency(competitionData.prizePool || 0)}</Text>
              </View>

              <View style={styles.specsRow}>
                <View style={styles.specBox}>
                  <View style={styles.specHeader}><Text style={styles.specIcon}>🎟️</Text><Text style={styles.specLabel}>Entry</Text></View>
                  {competitionData.entryFee ? (
                    <Text style={styles.specValue}>{formatCurrency(competitionData.entryFee)}</Text>
                  ) : (
                    <View style={styles.freeBadge}><Text style={styles.freeBadgeText}>FREE</Text></View>
                  )}
                </View>
                <View style={styles.specVerticalDivider} />
                <View style={styles.specBox}>
                  <View style={styles.specHeader}><Text style={styles.specIcon}>📅</Text><Text style={styles.specLabel}>Starts On</Text></View>
                  <Text style={styles.specValue}>{formatDateShort(competitionData.startDate)}</Text>
                </View>
              </View>

              <CountdownTimer targetDate={competitionData.startDate} />

              {(competitionData.description || competitionData.rules) && (
                <TouchableOpacity style={styles.missionBriefingCard} activeOpacity={0.8} onPress={toggleRules}>
                  <View style={styles.missionHeader}>
                    <View style={styles.missionTitleRow}><Text style={styles.missionIcon}>📜</Text><Text style={styles.missionTitle}>Event Details</Text></View>
                    <Text style={styles.chevron}>{isRulesExpanded ? "▲" : "▼"}</Text>
                  </View>
                  {isRulesExpanded && (
                    <View style={styles.missionContent}>
                      <Text style={styles.missionSectionTitle}>About</Text>
                      <Text style={styles.missionText}>{competitionData.description}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}