

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Linking,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { BackIcon } from "@/icons";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { useFaqSections, useSupportContact } from "@/hooks/useCmsContent";


// Support contacts. The email is the official support address. The WhatsApp number is
// not known yet: leave it empty and the WhatsApp button shows "not available yet".
const DEFAULT_SUPPORT_EMAIL = "admin@gullyfame.com";
const DEFAULT_SUPPORT_WHATSAPP: string = "+91 98212 34605";

export default function HelpSupportScreen() {
  // Contact details and FAQs are managed in the admin panel; the constants above are the fallback.
  const contact = useSupportContact();
  const faqs = useFaqSections();
  const SUPPORT_EMAIL = contact.email?.trim() || DEFAULT_SUPPORT_EMAIL;
  const SUPPORT_WHATSAPP_NUMBER = contact.whatsapp?.trim() || DEFAULT_SUPPORT_WHATSAPP;
  const handleEmailSupport = async () => {
    const emailUrl = `mailto:${SUPPORT_EMAIL}?subject=Gully%20Fame%20Support%20Request`;
    try {
      if (await Linking.canOpenURL(emailUrl)) {
        await Linking.openURL(emailUrl);
      } else {
        Alert.alert("Email not available", `No email app is set up on this device. Write to ${SUPPORT_EMAIL}.`);
      }
    } catch {
      Alert.alert("Email not available", `Could not open your email app. Write to ${SUPPORT_EMAIL}.`);
    }
  };

  const handleWhatsAppSupport = async () => {
    if (!SUPPORT_WHATSAPP_NUMBER) {
      Alert.alert("WhatsApp not available yet", "WhatsApp support isn't set up yet. Please use email instead.");
      return;
    }
    const message = "Hello Gully Fame Support, I need assistance with my account.";
    const digits = SUPPORT_WHATSAPP_NUMBER.replace(/\D/g, "");
    try {
      await Linking.openURL(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`);
    } catch {
      Alert.alert("WhatsApp not available", "Could not open WhatsApp on this device.");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3C2610" />

      {}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
           <BackIcon color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {}
        <View style={styles.supportBanner}>
          <Ionicons name="headset-outline" size={48} color="#EC9A15" style={styles.bannerIcon} />
          <Text style={styles.bannerTitle}>We're here to help!</Text>
          <Text style={styles.bannerSubtitle}>
            Koi dikkat aa rahi hai? Niche diye gaye direct options se humari team se turant sampark karein.
          </Text>
        </View>

        {/* Quick Contact Grid */}
        <Text style={styles.sectionTitle}>Direct Support</Text>
        <View style={styles.contactRow}>
          <TouchableOpacity style={styles.contactCard} onPress={handleWhatsAppSupport} activeOpacity={0.8}>
            <View style={[styles.iconCircle, { backgroundColor: "rgba(37, 211, 102, 0.15)" }]}>
              <FontAwesome5 name="whatsapp" size={24} color="#25D366" />
            </View>
            <Text style={styles.contactText}>WhatsApp Chat</Text>
            <Text style={styles.contactTiming}>{SUPPORT_WHATSAPP_NUMBER ? "Chat with us" : "Not available yet"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} onPress={handleEmailSupport} activeOpacity={0.8}>
            <View style={[styles.iconCircle, { backgroundColor: "rgba(236, 154, 21, 0.15)" }]}>
              <Ionicons name="mail-outline" size={24} color="#EC9A15" />
            </View>
            <Text style={styles.contactText}>Email Us</Text>
            <Text style={styles.contactTiming}>{SUPPORT_EMAIL}</Text>
          </TouchableOpacity>
        </View>

        {/* Same FAQ document as the FAQ screen, word for word */}
        <Text style={styles.sectionTitle}>FAQs</Text>
        <LegalDocument title={[]} sections={faqs} accordion />

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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  supportBanner: {
    backgroundColor: "#252525",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.2)",
  },
  bannerIcon: {
    marginBottom: 12,
  },
  bannerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  bannerSubtitle: {
    color: "#aaa",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  sectionTitle: {
    color: "#EC9A15",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    paddingHorizontal: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  contactRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 26,
  },
  contactCard: {
    flex: 1,
    backgroundColor: "#252525",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.12)",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  contactText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  contactTiming: {
    color: "#777",
    fontSize: 11,
  },
  faqList: {
    gap: 10,
  },
  faqItem: {
    backgroundColor: "#252525",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(236, 154, 21, 0.1)",
    overflow: "hidden",
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  faqQuestion: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    paddingRight: 10,
  },
  faqAnswerBox: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  faqAnswerText: {
    color: "#ccc",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
});