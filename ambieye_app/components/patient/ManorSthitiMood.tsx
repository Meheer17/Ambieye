import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTranslation } from "@/constants/i18n";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import { Colors, Spacing, WarmPalette } from "@/constants/theme";

export interface MoodOption {
  id: string;
  emoji: string;
  title: string;
  titleAs: string;
  titleHi: string;
  sub: string;
  subAs: string;
  subHi: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  spokenFeedback: string;
  spokenFeedbackAs: string;
  spokenFeedbackHi: string;
  isComfortAlert?: boolean;
}

const MOOD_OPTIONS: MoodOption[] = [
  {
    id: "mood-joyful",
    emoji: "🌸",
    title: "Anondo",
    titleAs: "আনন্দিত",
    titleHi: "खुश एवं प्रसन्न",
    sub: "Joyful & Energetic",
    subAs: "মন প্ৰফুল্ল আৰু আনন্দময়",
    subHi: "मन में उमंग और खुशी",
    bgColor: "#FEF2F2",
    borderColor: "#FECDD3",
    textColor: "#9F1239",
    spokenFeedback: "Wonderful! It brings so much happiness to see you cheerful and smiling today!",
    spokenFeedbackAs: "বৰ আনন্দৰ কথা! আজি আপোনাৰ মন প্ৰফুল্ল আৰু হাঁহিমুখীয়া দেখি সকলোৰে আনন্দ লাগিছে।",
    spokenFeedbackHi: "बहुत सुंदर! आपका मन प्रसन्न देखकर बहुत खुशी हुई। मुस्कुराते रहिए!",
  },
  {
    id: "mood-calm",
    emoji: "🕊️",
    title: "Shanto",
    titleAs: "শান্ত",
    titleHi: "शांत एवं सहज",
    sub: "Peaceful & Restful",
    subAs: "শান্ত আৰু স্থিৰ মন",
    subHi: "शांतिपूर्ण और आराम",
    bgColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    textColor: "#166534",
    spokenFeedback: "Peace and tranquility are with you. Rest comfortably in the courtyard breeze.",
    spokenFeedbackAs: "শান্তি আৰু আৰাম আপোনাৰ লগত আছে। জিৰণি লওক, সকলো ঠিকেই আছে।",
    spokenFeedbackHi: "मन शांत और विश्राम में है। आराम से बैठें, सब कुशल-मंगल है।",
  },
  {
    id: "mood-anxious",
    emoji: "🌧️",
    title: "Udbigno",
    titleAs: "উদ্বিগ্ন",
    titleHi: "चिंता या भ्रम",
    sub: "Restless / Confused",
    subAs: "মনত অলপ অস্থিৰতা",
    subHi: "मन में थोड़ी घबराहट",
    bgColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    textColor: "#1E40AF",
    spokenFeedback:
      "Deuta, please don't worry. You are safe in your Kamrup home. Take a deep breath with me.",
    spokenFeedbackAs:
      "দেউতা, কোনো চিন্তা নকৰিব। আপুনি কামৰূপৰ ঘৰত সম্পূৰ্ণ সুৰক্ষিত। দীঘলকৈ উশাহ লওক। অনিতাক খবৰ দিয়া হৈছে।",
    spokenFeedbackHi:
      "पिताजी, बिल्कुल घबराइए मत। आप अपने घर में सुरक्षित हैं। गहरी सांस लीजिए, अनिता को संदेश भेज दिया गया है।",
    isComfortAlert: true,
  },
  {
    id: "mood-lonely",
    emoji: "🫂",
    title: "Apon Manuh",
    titleAs: "পৰিয়ালক মনত পৰিছে",
    titleHi: "अपनों की याद",
    sub: "Want to talk to family",
    subAs: "আপোনজনক কাষত বিচাৰিছোঁ",
    subHi: "परिवार से बात करने का मन",
    bgColor: "#FAF5FF",
    borderColor: "#E9D5FF",
    textColor: "#6B21A8",
    spokenFeedback:
      "Sent a loving comfort pulse to Anita. She knows you are thinking of her and is coming home soon.",
    spokenFeedbackAs:
      "অনিতালৈ আপোনাৰ বাৰ্তা পঠোৱা হ'ল! তাই সোনকালেই ঘৰ পাবহি।",
    spokenFeedbackHi:
      "अनिता को आपका संदेश भेज दिया गया है! वह जल्द ही घर आ रही हैं।",
    isComfortAlert: true,
  },
];

interface Props {
  onOpenCalmCorner?: () => void;
  onOpenFamilyCall?: () => void;
}

export function ManorSthitiMood({ onOpenCalmCorner, onOpenFamilyCall }: Props) {
  const { currentLang } = useTranslation();
  const [selectedMoodId, setSelectedMoodId] = useState<string | null>(null);
  const [alertSentNotice, setAlertSentNotice] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      VoiceAssistant.stop();
    };
  }, []);

  const getTitle = (m: MoodOption) => {
    if (currentLang === "as") return m.titleAs;
    if (currentLang === "hi") return m.titleHi;
    return m.title;
  };

  const getSub = (m: MoodOption) => {
    if (currentLang === "as") return m.subAs;
    if (currentLang === "hi") return m.subHi;
    return m.sub;
  };

  const getFeedback = (m: MoodOption) => {
    if (currentLang === "as") return m.spokenFeedbackAs;
    if (currentLang === "hi") return m.spokenFeedbackHi;
    return m.spokenFeedback;
  };

  const handleSelectMood = (mood: MoodOption) => {
    setSelectedMoodId(mood.id);
    const feedback = getFeedback(mood);
    VoiceAssistant.speak(feedback, currentLang);

    if (mood.isComfortAlert) {
      const notice =
        currentLang === "as"
          ? "অনিতালৈ যত্ন বাৰ্তা পঠোৱা হ'ল (Silent Comfort Pulse Sent)"
          : currentLang === "hi"
          ? "अनिता को सहायता संदेश भेज दिया गया (Comfort Pulse Sent)"
          : "Silent Comfort Pulse sent to Daughter Anita";
      setAlertSentNotice(notice);
      setTimeout(() => setAlertSentNotice(null), 6000);
    } else {
      setAlertSentNotice(null);
    }
  };

  const selectedMood = MOOD_OPTIONS.find((m) => m.id === selectedMoodId);

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="heart-pulse" size={24} color="#E11D48" />
          </View>
          <View>
            <Text style={styles.sectionTitle}>
              {currentLang === "as"
                ? "মনৰ স্থিতি · ১-টেপ অনুভৱ"
                : currentLang === "hi"
                ? "मन की स्थिति · 1-टैप मनोभाव"
                : "Manor Sthiti · 1-Tap Mood Check"}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {currentLang === "as"
                ? "আজি আপোনাৰ মন কেনে লাগিছে? ছবি চুই জনাব পাৰে"
                : currentLang === "hi"
                ? "आज आपका मन कैसा है? छूकर बताएं"
                : "Tap how your heart feels right now for instant comfort"}
            </Text>
          </View>
        </View>
      </View>

      {/* 4 Big Feeling Touch Cards */}
      <View style={styles.moodGrid}>
        {MOOD_OPTIONS.map((mood) => {
          const isSelected = selectedMoodId === mood.id;
          return (
            <TouchableOpacity
              key={mood.id}
              style={[
                styles.moodCard,
                {
                  backgroundColor: mood.bgColor,
                  borderColor: isSelected ? mood.textColor : mood.borderColor,
                  borderWidth: isSelected ? 2.5 : 1.5,
                },
              ]}
              onPress={() => handleSelectMood(mood)}
              activeOpacity={0.8}
            >
              <Text style={styles.moodEmoji}>{mood.emoji}</Text>
              <Text style={[styles.moodTitle, { color: mood.textColor }]}>{getTitle(mood)}</Text>
              <Text style={styles.moodSubText}>{getSub(mood)}</Text>
              {isSelected && (
                <View style={[styles.selectedCheckBadge, { backgroundColor: mood.textColor }]}>
                  <Feather name="check" size={12} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Silent Caregiver Alert Banner */}
      {alertSentNotice && (
        <View style={styles.caregiverAlertBanner}>
          <Feather name="shield" size={16} color="#16A34A" />
          <Text style={styles.caregiverAlertText}>{alertSentNotice}</Text>
        </View>
      )}

      {/* Reassurance & Quick Support Action Bar when an emotion is selected */}
      {selectedMood && selectedMood.isComfortAlert && (
        <View style={styles.comfortAssistBox}>
          <Text style={styles.comfortAssistTitle}>🌸 We are right here with you, Bhaben</Text>
          <View style={styles.comfortButtonsRow}>
            {onOpenCalmCorner && (
              <TouchableOpacity
                style={styles.calmCornerActionBtn}
                onPress={onOpenCalmCorner}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 16 }}>🌙</Text>
                <Text style={styles.calmCornerActionText}>Calm Corner · Breathing</Text>
              </TouchableOpacity>
            )}

            {onOpenFamilyCall && (
              <TouchableOpacity
                style={styles.familyCallActionBtn}
                onPress={onOpenFamilyCall}
                activeOpacity={0.8}
              >
                <Feather name="phone" size={16} color="#FFFFFF" />
                <Text style={styles.familyCallActionText}>Call Anita</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: "#FFE4E6",
    shadowColor: "#E11D48",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  moodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  moodCard: {
    width: "48%",
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  moodEmoji: {
    fontSize: 34,
    marginBottom: 4,
  },
  moodTitle: {
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  moodSubText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
    marginTop: 2,
  },
  selectedCheckBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  caregiverAlertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    marginTop: 12,
  },
  caregiverAlertText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
    flex: 1,
  },
  comfortAssistBox: {
    backgroundColor: "#FAF7FD",
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#EDE8F5",
  },
  comfortAssistTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E2024",
    marginBottom: 8,
    textAlign: "center",
  },
  comfortButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  calmCornerActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  calmCornerActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4F46E5",
  },
  familyCallActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#6366F1",
    paddingVertical: 10,
    borderRadius: 12,
  },
  familyCallActionText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
