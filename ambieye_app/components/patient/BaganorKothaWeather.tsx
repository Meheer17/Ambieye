import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTranslation } from "@/constants/i18n";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import { Colors, Spacing, WarmPalette } from "@/constants/theme";

const { width } = Dimensions.get("window");

export function BaganorKothaWeather() {
  const { currentLang } = useTranslation();
  const [sunlightCompleted, setSunlightCompleted] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  // Determine time of day & circadian context
  const hour = new Date().getHours();
  const isMorning = hour >= 6 && hour < 12;
  const isAfternoon = hour >= 12 && hour < 17;
  const isEvening = hour >= 17 && hour < 21;
  const isNight = hour >= 21 || hour < 6;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Contextual weather and circadian recommendation
  const getPeriodData = () => {
    if (isMorning) {
      return {
        periodName: currentLang === "as" ? "ৰাতিপুৱাৰ চোতাল" : currentLang === "hi" ? "सुबह की धूप" : "Morning Courtyard",
        temp: "26°C",
        weatherLabel: currentLang === "as" ? "মিঠা সোনালী ৰ’দ" : currentLang === "hi" ? "हल्की सुनहरी धूप" : "Gentle Morning Sunlight",
        icon: "weather-sunny" as const,
        iconColor: "#F59E0B",
        bgGradient: "#FFFBEB",
        borderColor: "#FDE68A",
        advice:
          currentLang === "as"
            ? "চোতালত বহি ১৫ মিনিট মিঠা ৰ’দ লওক। ই শৰীৰত ভিটামিন-ডি দিয়ে আৰু মন প্ৰফুল্ল ৰাখে।"
            : currentLang === "hi"
            ? "आँगन में बैठकर 15 मिनट हल्की धूप लें। यह शरीर को ऊर्जा और मन को ताजगी देती है।"
            : "Sit in the sunny courtyard for 15 mins. Morning sunlight sets your body clock and brings vitality.",
        spokenNarration:
          currentLang === "as"
            ? "আজি কামৰূপৰ বতৰ খুবেই সুন্দৰ। চোতালৰ মিঠা ৰ’দত বহি অলপ সময় কটাওক।"
            : currentLang === "hi"
            ? "आज कामरूप का मौसम बहुत सुहावना है। आँगन की सुनहरी धूप में 15 मिनट बैठिए।"
            : "Today's weather in Kamrup is pleasant and sunny. Spend 15 minutes in the morning courtyard sunshine.",
        circadianTip: currentLang === "as" ? "সূৰ্য্যৰ পোহৰে টোপনি ভাল কৰে" : currentLang === "hi" ? "धूप से रात की नींद अच्छी होती है" : "Sunlight improves tonight's sleep",
      };
    } else if (isAfternoon) {
      return {
        periodName: currentLang === "as" ? "দুপৰীয়াৰ বিশ্ৰাম" : currentLang === "hi" ? "दोपहर का विश्राम" : "Afternoon Rest",
        temp: "29°C",
        weatherLabel: currentLang === "as" ? "উমাল বতাহ আৰু ছাঁ" : currentLang === "hi" ? "सुखद छाँव" : "Pleasant Shade & Breeze",
        icon: "weather-partly-cloudy" as const,
        iconColor: "#0284C7",
        bgGradient: "#F0F9FF",
        borderColor: "#BAE6FD",
        advice:
          currentLang === "as"
            ? "দুপৰীয়া চোতালৰ বকুল গছৰ ছাঁত অলপ জিৰণি লওক বা এগিলাচ নেমু-পানী খাওক।"
            : currentLang === "hi"
            ? "दोपहर में पेड़ की छाँव में आराम करें और एक गिलास पानी अवश्य पिएं।"
            : "Rest in the cool shade of the veranda. Stay hydrated with fresh water.",
        spokenNarration:
          currentLang === "as"
            ? "দুপৰীয়াৰ শান্ত পৰিৱেশ। বকুল গছৰ তলত বহি আৰামেৰে জিৰণি লওক।"
            : currentLang === "hi"
            ? "दोपहर का शांत समय है। बरामदे में छाँव में बैठकर विश्राम कीजिए।"
            : "It is a calm afternoon. Relax comfortably in the shaded veranda.",
        circadianTip: currentLang === "as" ? "হালকা জিৰণি লওক" : currentLang === "hi" ? "हल्का विश्राम लें" : "Take a light restful pause",
      };
    } else {
      return {
        periodName: currentLang === "as" ? "সন্ধিয়াৰ সুবাস" : currentLang === "hi" ? "शाम की शांति" : "Evening Calm",
        temp: "24°C",
        weatherLabel: currentLang === "as" ? "ব্ৰহ্মপুত্ৰৰ শীতল বতাহ" : currentLang === "hi" ? "ठंडी शाम की बयार" : "Brahmaputra Cool Breeze",
        icon: "weather-night" as const,
        iconColor: "#7C3AED",
        bgGradient: "#FAF5FF",
        borderColor: "#E9D5FF",
        advice:
          currentLang === "as"
            ? "সন্ধিয়া নামঘৰৰ ডবা আৰু তুলসী তলৰ চাকিৰ পোহৰত মন শান্ত ৰাখক।"
            : currentLang === "hi"
            ? "शाम के समय तुलसी के पास दीपक की रोशनी में शांत मन से बैठें।"
            : "Enjoy the peaceful evening breeze. A calm transition into the restful night.",
        spokenNarration:
          currentLang === "as"
            ? "সন্ধিয়াৰ স্নিগ্ধ বতাহ বৈছে। মন শান্ত ৰাখক, সকলো সুৰক্ষিত আছে।"
            : currentLang === "hi"
            ? "सुहानी शाम हो चुकी है। मन को शांत रखें, सब कुछ सुरक्षित है।"
            : "A gentle evening breeze is blowing. Keep your mind peaceful and relaxed.",
        circadianTip: currentLang === "as" ? "মন শান্ত কৰক" : currentLang === "hi" ? "मन को शांत रखें" : "Calm and peaceful sundown",
      };
    }
  };

  const period = getPeriodData();

  const handleSpeakWeather = () => {
    VoiceAssistant.speak(period.spokenNarration, currentLang);
  };

  const handleToggleSunlight = () => {
    const nextState = !sunlightCompleted;
    setSunlightCompleted(nextState);
    if (nextState) {
      const msg =
        currentLang === "as"
          ? "অপূৰ্ব! চোতালৰ ৰ’দ লোৱা সম্পূৰ্ণ হ’ল। ই আপোনাৰ স্বাস্থ্য আৰু মন সদায় সতেজ ৰাখিব।"
          : currentLang === "hi"
          ? "बहुत सुंदर! धूप लेने से आपका स्वास्थ्य और रात्रि की नींद उत्तम रहेगी।"
          : "Splendid! Completed your courtyard sunlight session. This supports your circadian rhythm and nighttime sleep.";
      VoiceAssistant.speak(msg, currentLang);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: period.bgGradient, borderColor: period.borderColor }]}>
      {/* Top Banner Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={[styles.iconCircle, { backgroundColor: "#FFFFFF" }]}>
            <MaterialCommunityIcons name={period.icon} size={26} color={period.iconColor} />
          </View>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.sectionTitle}>
                {currentLang === "as"
                  ? "বাগানৰ কথা · প্ৰকৃতি আৰু ৰ’দ"
                  : currentLang === "hi"
                  ? "आँगन की धूप · मौसम एवं प्रकृति"
                  : "Baganor Kotha · Courtyard Sunlight"}
              </Text>
              <View style={styles.circadianBadge}>
                <Text style={styles.circadianBadgeText}>Circadian Anchor</Text>
              </View>
            </View>
            <Text style={styles.locationSubText}>
              🏡 Kamrup Courtyard · {period.temp} · {period.weatherLabel}
            </Text>
          </View>
        </View>

        {/* Listen Voice Button */}
        <TouchableOpacity style={styles.listenBtn} onPress={handleSpeakWeather} activeOpacity={0.8}>
          <Feather name="volume-2" size={18} color="#0369A1" />
        </TouchableOpacity>
      </View>

      {/* Main Advice Box */}
      <View style={styles.adviceBox}>
        <Text style={styles.adviceText}>{period.advice}</Text>
        <View style={styles.tipSubRow}>
          <Feather name="sun" size={14} color="#D97706" />
          <Text style={styles.tipSubText}>{period.circadianTip}</Text>
        </View>
      </View>

      {/* 1-Tap Sunlight Complete Button */}
      <TouchableOpacity
        style={[
          styles.sunlightActionBtn,
          sunlightCompleted ? styles.sunlightBtnDone : styles.sunlightBtnPending,
        ]}
        onPress={handleToggleSunlight}
        activeOpacity={0.85}
      >
        <Animated.View style={{ transform: [{ scale: sunlightCompleted ? 1 : pulseAnim }] }}>
          <MaterialCommunityIcons
            name={sunlightCompleted ? "check-decagram" : "weather-sunny"}
            size={22}
            color={sunlightCompleted ? "#FFFFFF" : "#92400E"}
          />
        </Animated.View>
        <Text
          style={[
            styles.sunlightActionText,
            sunlightCompleted ? styles.sunlightTextDone : styles.sunlightTextPending,
          ]}
        >
          {sunlightCompleted
            ? currentLang === "as"
              ? "✓ আজি চোতালৰ মিঠা ৰ’দ লোৱা হ’ল"
              : currentLang === "hi"
              ? "✓ आज आँगन की धूप ले ली गई"
              : "✓ Sat in Courtyard Sunlight Today"
            : currentLang === "as"
            ? "☀️ মই চোতালৰ ৰ’দত বহিছোঁ (১-টেপ)"
            : currentLang === "hi"
            ? "☀️ मैं आँगन की धूप में बैठा हूँ (1-टैप)"
            : "☀️ I Sat in the Morning Sunlight (1-Tap)"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1.5,
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
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
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  circadianBadge: {
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  circadianBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#4F46E5",
    letterSpacing: 0.4,
  },
  locationSubText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
  },
  listenBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  adviceBox: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    marginBottom: 12,
  },
  adviceText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E2024",
    lineHeight: 22,
  },
  tipSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  tipSubText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4F46E5",
  },
  sunlightActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 16,
  },
  sunlightBtnPending: {
    backgroundColor: "#FAF7FD",
    borderWidth: 1.5,
    borderColor: "#EDE8F5",
  },
  sunlightBtnDone: {
    backgroundColor: "#10B981",
  },
  sunlightActionText: {
    fontSize: 14,
    fontWeight: "800",
  },
  sunlightTextPending: {
    color: "#4F46E5",
  },
  sunlightTextDone: {
    color: "#FFFFFF",
  },
});
