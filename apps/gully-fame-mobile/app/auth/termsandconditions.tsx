import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { TERMS_OF_SERVICE, TERMS_OF_SERVICE_TITLE } from "@/content/legal/termsOfService";

export default function TermsAndConditions() {
  const router = useRouter(); 
  const [isPressed, setIsPressed] = useState(false);
  const handleAgree = async () => {
    try {
      
      await AsyncStorage.setItem("termsAccepted", "true");
      
      router.back();
    } catch {
      
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      {}
     <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Svg width={15} height={15} viewBox="0 0 16 16" fill="none">
          <Path
            d="M16 7H3.83L9.42 1.41L8 0L0 8L8 16L9.41 14.59L3.83 9H16V7Z"
            fill="white"
          />
        </Svg>
      </TouchableOpacity>

      <Text style={[styles.headerTitle, { fontFamily: "PlayfairDisplay_500Medium" }]}>
        Terms & Conditions
      </Text>
    </View>

      {}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <LegalDocument title={TERMS_OF_SERVICE_TITLE} sections={TERMS_OF_SERVICE} />
      </ScrollView>

      {}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.agreeButton, isPressed && styles.agreeButtonPressed]}
          onPress={handleAgree}
          onPressIn={() => setIsPressed(true)}
          onPressOut={() => setIsPressed(false)}
          activeOpacity={1}
        >
          <Text style={styles.agreeButtonText}>Agree</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#3C2610',
    paddingTop:70,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 18,
    color: '#FFF',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'left',
    fontSize: 18,
    color: '#FFF',
    marginLeft: 15,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  termsText: {
    fontSize: 13,
    color: '#727272',
    textAlign: 'justify',
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  agreeButton: {
    backgroundColor: '#E9ECEF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
  },
  agreeButtonPressed: {
    backgroundColor: '#D1D5DB',
  },
  agreeButtonText: {
    fontSize: 16,
    color: '#000',
    fontFamily: "Inter_500Medium",
  },
});