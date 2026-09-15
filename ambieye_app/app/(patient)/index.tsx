import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  Alert,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation, SUPPORTED_LANGUAGES, SupportedLanguage } from "@/constants/i18n";
import { reminderStorage, DailyHydration, MedicationItem } from "@/utils/reminderStorage";
import {
  caregiverStorage,
  FamilySentItem,
  CognitiveGameSession,
  CaregiverSleepRecord,
  PatientProfile,
} from "@/utils/caregiverStorage";
import { dementiaCareStorage } from "@/utils/dementiaCareStorage";
import { federatedService, CognitiveStabilityResult } from "@/services/api/federatedService";
import {
  companionService,
  REMINISCENCE_TOPICS,
  ReminiscenceTopic,
} from "@/services/companion/companionService";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import TimeOrientationCard from "@/components/TimeOrientationCard";
import CalmCornerModal from "@/components/CalmCornerModal";
import { VirtualAvatar, AvatarState } from "@/components/companion/VirtualAvatar";
import { CompanionScreen } from "@/components/companion/CompanionScreen";
import { SmritiGeetiRadio } from "@/components/patient/SmritiGeetiRadio";
import { SmritiPhotobook } from "@/components/patient/SmritiPhotobook";
import { AponManuhSpeedDial } from "@/components/patient/AponManuhSpeedDial";
import { BaganorKothaWeather } from "@/components/patient/BaganorKothaWeather";
import { ManorSthitiMood } from "@/components/patient/ManorSthitiMood";
import { GharorBartaPostcards } from "@/components/patient/GharorBartaPostcards";
import { Colors, Spacing, WarmPalette } from "@/constants/theme";

const { width } = Dimensions.get("window");

export type SeniorFeatureTab = "radio" | "photos" | "family" | "mood";

export default function PatientHomeScreen() {
  const router = useRouter();
  const { username, logout } = useAuth();
  const { t, currentLang, changeLanguage } = useTranslation();

  const [activeFeatureTab, setActiveFeatureTab] = useState<SeniorFeatureTab>("radio");
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [calmCornerVisible, setCalmCornerVisible] = useState(false);
  const [companionModalVisible, setCompanionModalVisible] = useState(false);

  // Daily Care & Reminder Data
  const [hydration, setHydration] = useState<DailyHydration>({ date: "", glassesDrunk: 3, dailyGoal: 8 });
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [familyItems, setFamilyItems] = useState<FamilySentItem[]>([]);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [sosBanner, setSosBanner] = useState<string | null>(null);

  // Avatar Companion In-Hero State
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [avatarSpeechText, setAvatarSpeechText] = useState<string>(
    "Good day, Bhaben! I am your companion Smriti Mitr. Tap any question below or speak with me!"
  );

  // Feedback animation
  const [celebrateAnim] = useState(new Animated.Value(1));

  const loadData = useCallback(async () => {
    const hyd = await reminderStorage.getTodayHydration();
    const meds = await reminderStorage.getTodayMedications();
    const fam = await caregiverStorage.getFamilySentItems();
    const prof = await caregiverStorage.getPatientProfile();

    setHydration(hyd);
    setMedications(meds);
    setFamilyItems(fam);
    setProfile(prof);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleLogout = () => {
    Alert.alert(
      currentLang === "as" ? "লগআউট কৰিব নেকি?" : currentLang === "hi" ? "लॉग आउट करें?" : "Log Out",
      currentLang === "as" ? "আপুনি নিজৰ একাউণ্টৰ পৰা ওলাই যাব বিচাৰে নেকি?" : "Are you sure you want to log out of AmbiEye?",
      [
        { text: currentLang === "as" ? "বাতিল" : "Cancel", style: "cancel" },
        {
          text: currentLang === "as" ? "লগআউট" : "Log Out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/auth/login");
          },
        },
      ]
    );
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (currentLang === "as") {
      if (hour < 12) return "শুভ প্ৰভাত";
      if (hour < 17) return "শুভ অপৰাহ্ন";
      return "শুভ সন্ধিয়া";
    }
    if (currentLang === "hi") {
      if (hour < 12) return "शुभ प्रभात";
      if (hour < 17) return "शुभ दोपहर";
      return "शुभ संध्या";
    }
    if (hour < 12) return t("greeting_morning");
    if (hour < 17) return t("greeting_afternoon");
    return t("greeting_evening");
  };

  const handleVoiceGreeting = () => {
    const greetingText = `${getGreeting()} ${profile?.name || "Bhaben"}. I am your Smriti Mitr companion. Everything is safe and peaceful at home in Kamrup.`;
    VoiceAssistant.speak(greetingText, currentLang);
  };

  // Avatar Companion Voice Interaction
  const handleAskCompanion = async (topic: ReminiscenceTopic) => {
    setAvatarState("thinking");
    let response = topic.avatarStarter;
    if (currentLang === "as" && topic.avatarStarterAs) {
      response = topic.avatarStarterAs;
    } else if (currentLang === "hi" && topic.avatarStarterHi) {
      response = topic.avatarStarterHi;
    }

    setTimeout(() => {
      setAvatarSpeechText(response);
      setAvatarState("speaking");
      companionService.speakResponse(response, currentLang as any);

      const durationMs = Math.max(3000, response.length * 68);
      setTimeout(() => {
        setAvatarState("idle");
      }, durationMs);
    }, 700);
  };

  const handleAvatarMicTap = async () => {
    if (avatarState === "speaking") {
      companionService.stopSpeech();
      setAvatarState("idle");
      return;
    }

    setAvatarState("listening");
    setTimeout(async () => {
      const result = await companionService.processElderInput("How did I do in Antakshari today?", currentLang as any);
      setAvatarSpeechText(result.responseText);
      setAvatarState("speaking");
      companionService.speakResponse(result.responseText, currentLang as any);

      const durationMs = Math.max(3000, result.responseText.length * 68);
      setTimeout(() => {
        setAvatarState("idle");
      }, durationMs);
    }, 2200);
  };

  // Doinik Niyam (Hydration & Meds)
  const triggerCelebrationAnim = () => {
    Animated.sequence([
      Animated.timing(celebrateAnim, {
        toValue: 1.05,
        duration: 150,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(celebrateAnim, {
        toValue: 1,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleAddWater = async () => {
    const updated = await reminderStorage.addWaterGlass();
    setHydration(updated);
    triggerCelebrationAnim();

    const voiceMsg =
      currentLang === "as"
        ? `বহুত ভাল! আপুনি ${updated.glassesDrunk} গিলাচ পানী খালে।`
        : currentLang === "hi"
        ? `बहुत बढ़िया! आपने ${updated.glassesDrunk} गिलास पानी पिया।`
        : `Wonderful job! You drank ${updated.glassesDrunk} of ${updated.dailyGoal} glasses.`;

    VoiceAssistant.speak(voiceMsg, currentLang);
  };

  const handleMarkMedTaken = async (id: string) => {
    const updated = await reminderStorage.toggleMedication(id);
    setMedications(updated);
    triggerCelebrationAnim();

    const voiceMsg =
      currentLang === "as"
        ? "ঔষধ খোৱা সম্পন্ন হ'ল।"
        : currentLang === "hi"
        ? "दवाई ले ली गई है।"
        : "Prescribed medication marked as taken.";

    VoiceAssistant.speak(voiceMsg, currentLang);
  };

  const handleSOS = async () => {
    await reminderStorage.triggerSOS();
    const alertMsg =
      currentLang === "as"
        ? "জৰুৰী সহায় বাৰ্তা কন্যা অনিতা আৰু পৰিয়াললৈ প্ৰেৰণ কৰা হৈছে।"
        : currentLang === "hi"
        ? "आपातकालीन सहायता संदेश अनिता और परिवार को भेज दिया गया है।"
        : t("sos_alert_sent");

    setSosBanner(alertMsg);
    VoiceAssistant.speak(alertMsg, currentLang);
    if (Platform.OS !== "web") {
      Alert.alert(t("sos_button"), alertMsg);
    }
  };

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0];
  const nextPendingMed = medications.find((m) => !m.taken);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── 1. TIGHT NATIVE TOP APP BAR ─────────────────────────────────── */}
        <View style={styles.topAppBar}>
          <View style={styles.userTitleGroup}>
            <View style={styles.userAvatarCircle}>
              <Text style={{ fontSize: 20 }}>🧓</Text>
              <View style={styles.greenOnlineDot} />
            </View>
            <View>
              <Text style={styles.greetingMiniText}>{getGreeting()},</Text>
              <Text style={styles.userNameMiniText} numberOfLines={1}>
                {profile?.name || "Bhaben Barman"}
              </Text>
            </View>
          </View>

          <View style={styles.appBarActions}>
            {/* Language Pill */}
            <TouchableOpacity
              style={styles.langPill}
              onPress={() => setLanguageModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.langEmoji}>{currentLangObj.flagEmoji}</Text>
              <Text style={styles.langPillText}>{currentLangObj.nativeName}</Text>
              <Feather name="chevron-down" size={12} color="#6366F1" />
            </TouchableOpacity>

            {/* Voice Assistant Button */}
            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={handleVoiceGreeting}
              activeOpacity={0.8}
            >
              <Feather name="volume-2" size={17} color="#6366F1" />
            </TouchableOpacity>

            {/* Logout Exit Button */}
            <TouchableOpacity
              style={[styles.actionIconBtn, { backgroundColor: "#FFF1F2", borderColor: "#FECDD3" }]}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Feather name="log-out" size={16} color="#E11D48" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 2. SLEEK COMPACT HERO: AI AVATAR & REALITY ORIENTATION ──────── */}
        <View style={styles.heroCompanionBox}>
          <View style={styles.avatarSpeechRow}>
            {/* Left: Interactive Avatar */}
            <TouchableOpacity
              onPress={handleAvatarMicTap}
              activeOpacity={0.85}
              style={styles.avatarTapWrapper}
            >
              <VirtualAvatar
                size={68}
                state={avatarState}
                onPress={handleAvatarMicTap}
                showStatusBadge={false}
              />
              <View style={styles.tapMicBadge}>
                <Feather
                  name={avatarState === "speaking" ? "volume-x" : "mic"}
                  size={11}
                  color="#FFFFFF"
                />
              </View>
            </TouchableOpacity>

            {/* Right: Conversational Bubble */}
            <View style={styles.speechBubbleRight}>
              <View style={styles.bubbleTopHeader}>
                <Text style={styles.avatarNameText}>Smriti Mitr 🌸</Text>
                <TouchableOpacity
                  onPress={() => setCompanionModalVisible(true)}
                  style={styles.expandMiniBtn}
                >
                  <Feather name="maximize-2" size={12} color="#6366F1" />
                </TouchableOpacity>
              </View>
              <Text style={styles.avatarSpeechBody} numberOfLines={3}>
                {avatarSpeechText}
              </Text>
            </View>
          </View>

          {/* Quick Voice Prompt Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promptChipsRow}
          >
            {REMINISCENCE_TOPICS.map((topic) => (
              <TouchableOpacity
                key={topic.id}
                style={styles.miniPromptChip}
                onPress={() => handleAskCompanion(topic)}
                activeOpacity={0.8}
              >
                <Text style={styles.miniPromptEmoji}>{topic.emoji}</Text>
                <Text style={styles.miniPromptText} numberOfLines={1}>
                  {topic.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── 3. FOUR-WAY MOBILE FEATURE SEGMENT TABS ───────────────────────── */}
        <View style={styles.segmentNavContainer}>
          <TouchableOpacity
            style={[styles.segmentTabItem, activeFeatureTab === "radio" && styles.segmentTabActive]}
            onPress={() => setActiveFeatureTab("radio")}
            activeOpacity={0.8}
          >
            <Text style={styles.segmentTabEmoji}>📻</Text>
            <Text
              style={[
                styles.segmentTabText,
                activeFeatureTab === "radio" && styles.segmentTabTextActive,
              ]}
              numberOfLines={1}
            >
              {currentLang === "as" ? "ৰেডিঅ’" : currentLang === "hi" ? "रेडियो" : "Radio"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentTabItem, activeFeatureTab === "photos" && styles.segmentTabActive]}
            onPress={() => setActiveFeatureTab("photos")}
            activeOpacity={0.8}
          >
            <Text style={styles.segmentTabEmoji}>📖</Text>
            <Text
              style={[
                styles.segmentTabText,
                activeFeatureTab === "photos" && styles.segmentTabTextActive,
              ]}
              numberOfLines={1}
            >
              {currentLang === "as" ? "স্মৃতি ফটো" : currentLang === "hi" ? "तस्वीरें" : "Photos"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentTabItem, activeFeatureTab === "family" && styles.segmentTabActive]}
            onPress={() => setActiveFeatureTab("family")}
            activeOpacity={0.8}
          >
            <Text style={styles.segmentTabEmoji}>📞</Text>
            <Text
              style={[
                styles.segmentTabText,
                activeFeatureTab === "family" && styles.segmentTabTextActive,
              ]}
              numberOfLines={1}
            >
              {currentLang === "as" ? "পৰিয়াল" : currentLang === "hi" ? "परिवार" : "Family"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentTabItem, activeFeatureTab === "mood" && styles.segmentTabActive]}
            onPress={() => setActiveFeatureTab("mood")}
            activeOpacity={0.8}
          >
            <Text style={styles.segmentTabEmoji}>🌸</Text>
            <Text
              style={[
                styles.segmentTabText,
                activeFeatureTab === "mood" && styles.segmentTabTextActive,
              ]}
              numberOfLines={1}
            >
              {currentLang === "as" ? "শান্তি" : currentLang === "hi" ? "शांति" : "Peace"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── ACTIVE FEATURE CARD CONTENT ─────────────────────────────────── */}
        <View style={styles.activeFeatureWrapper}>
          {activeFeatureTab === "radio" && <SmritiGeetiRadio />}

          {activeFeatureTab === "photos" && (
            <SmritiPhotobook
              onAskCompanion={(topicTitle) =>
                handleAskCompanion({
                  id: "mem-custom",
                  title: topicTitle,
                  prompt: `Tell me about ${topicTitle}`,
                  avatarStarter: `Ah, ${topicTitle}! Looking at our family memories brings so much joy. What part of that day do you remember most?`,
                  avatarStarterAs: `আহা, ${topicTitle}! পৰিয়ালৰ এনে মধুৰ স্মৃতি সুঁৱৰিলে মনটো আনন্দেৰে ভৰি পৰে। আপোনাৰ কি কি মনত পৰিছে কওকচোন?`,
                  avatarStarterHi: `अहा, ${topicTitle}! अपने परिवार की इन प्यारी यादों को देखकर मन कितना खुश हो जाता है। आप उस दिन के बारे में क्या सोच रहे हैं?`,
                  emoji: "📖",
                  category: "places",
                })
              }
            />
          )}

          {activeFeatureTab === "family" && (
            <View style={{ gap: 12 }}>
              <AponManuhSpeedDial />
              <GharorBartaPostcards items={familyItems} />
            </View>
          )}

          {activeFeatureTab === "mood" && (
            <View style={{ gap: 12 }}>
              <ManorSthitiMood
                onOpenCalmCorner={() => setCalmCornerVisible(true)}
                onOpenFamilyCall={() => {
                  const dialMsg =
                    currentLang === "as"
                      ? "অনিতালৈ ফোন সংযোগ কৰা হৈছে..."
                      : currentLang === "hi"
                      ? "अनिता को फोन मिलाया जा रहा है..."
                      : "Connecting call to Anita...";
                  VoiceAssistant.speak(dialMsg, currentLang);
                }}
              />
              <BaganorKothaWeather />
              {/* Calm Corner Shortcut */}
              <TouchableOpacity
                style={styles.calmCornerBanner}
                onPress={() => setCalmCornerVisible(true)}
                activeOpacity={0.85}
              >
                <View style={styles.calmBannerLeft}>
                  <Text style={{ fontSize: 22 }}>🌙</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.calmBannerTitle}>Sandhya Shanti · Calm Corner</Text>
                    <Text style={styles.calmBannerSub} numberOfLines={1}>
                      Guided breathing & Bhupen Hazarika melodies
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={18} color="#6366F1" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── 4. DOINIK NIYAM (SINGLE-ACTION FOCUS CARE) ──────────────────── */}
        <Animated.View style={[styles.dailyFocusCard, { transform: [{ scale: celebrateAnim }] }]}>
          <View style={styles.focusHeaderRow}>
            <View style={styles.focusTitleGroup}>
              <MaterialCommunityIcons name="water-check" size={20} color="#6366F1" />
              <Text style={styles.focusCardTitle}>
                {currentLang === "as" ? "দৈনিক নিয়ম · পানী আৰু ঔষধ" : "Daily Routine Care"}
              </Text>
            </View>
            <View style={styles.focusCountPill}>
              <Text style={styles.focusCountText}>
                {hydration.glassesDrunk}/{hydration.dailyGoal} 🥛
              </Text>
            </View>
          </View>

          {/* 8 Compact Water Glasses */}
          <View style={styles.waterGlassesTrack}>
            {Array.from({ length: hydration.dailyGoal }).map((_, idx) => {
              const isFilled = idx < hydration.glassesDrunk;
              return (
                <View
                  key={idx}
                  style={[
                    styles.waterCupBubble,
                    isFilled ? styles.waterCupFilled : styles.waterCupEmpty,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={isFilled ? "cup-water" : "cup-outline"}
                    size={16}
                    color={isFilled ? "#6366F1" : "#CBD5E1"}
                  />
                </View>
              );
            })}
          </View>

          {/* 1-Tap Drink Water Action */}
          <TouchableOpacity
            style={styles.oneTapWaterBtn}
            onPress={handleAddWater}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="plus-circle" size={18} color="#FFFFFF" />
            <Text style={styles.oneTapWaterBtnText} numberOfLines={1}>
              {currentLang === "as"
                ? "✓ ১ গিলাচ পানী খালোঁ"
                : currentLang === "hi"
                ? "✓ १ गिलास पानी पिया"
                : "✓ Drank 1 Glass of Water"}
            </Text>
          </TouchableOpacity>

          {/* Next Medication Reminder if pending */}
          {nextPendingMed && (
            <View style={styles.compactMedRow}>
              <MaterialCommunityIcons name="pill" size={18} color="#10B981" />
              <View style={{ flex: 1 }}>
                <Text style={styles.compactMedTitle} numberOfLines={1}>
                  {nextPendingMed.name} ({nextPendingMed.timeLabel})
                </Text>
              </View>
              <TouchableOpacity
                style={styles.compactMedTakenBtn}
                onPress={() => handleMarkMedTaken(nextPendingMed.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.compactMedTakenText}>✓ Taken</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* ── 5. CULTURAL COGNITIVE GAMES DEDICATED BANNER ─────────────────── */}
        <TouchableOpacity
          style={styles.aestheticGamesBanner}
          onPress={() => router.push("/(patient)/games" as any)}
          activeOpacity={0.85}
        >
          <View style={styles.gamesBannerIconCircle}>
            <Text style={{ fontSize: 24 }}>🎮</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.gamesBannerBadgeRow}>
              <Text style={styles.gamesBannerBadgeText}>COGNITIVE EXERCISES</Text>
            </View>
            <Text style={styles.gamesBannerTitle}>
              {t("games_title") || "Mind & Eye Games"}
            </Text>
            <Text style={styles.gamesBannerSub} numberOfLines={1}>
              {currentLang === "as"
                ? "অন্তাক্ষৰী, গামোচা মিলোৱা আৰু চকুৰ পৰীক্ষা"
                : currentLang === "hi"
                ? "अंताक्षरी, स्मृति खेल और नेत्र ट्रैकिंग"
                : "Antakshari recall, motif match & OpenCV gaze games"}
            </Text>
          </View>
          <View style={styles.gamesBannerArrowCircle}>
            <Feather name="arrow-right" size={16} color="#6366F1" />
          </View>
        </TouchableOpacity>

        {/* ── 6. BOTTOM NATIVE EMERGENCY SOS BUTTON ────────────────────────── */}
        <TouchableOpacity
          style={styles.mobileSosButton}
          onPress={handleSOS}
          activeOpacity={0.85}
        >
          <Feather name="alert-triangle" size={20} color="#E11D48" />
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.mobileSosText} numberOfLines={1}>
              {currentLang === "as"
                ? "জৰুৰীকালীন সহায় (SOS Alert)"
                : currentLang === "hi"
                ? "आपातकालीन सहायता (SOS Alert)"
                : t("sos_button")}
            </Text>
            <Text style={styles.mobileSosSubText} numberOfLines={1}>
              {currentLang === "as"
                ? "অনিতা আৰু ডাক্টৰলৈ ১-টেপ সংকেত"
                : "1-Tap Emergency Alert to Family & Doctor"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* SOS Sent Banner */}
        {sosBanner && (
          <View style={styles.sosSentNotification}>
            <Feather name="check-circle" size={16} color="#16A34A" />
            <Text style={styles.sosSentText}>{sosBanner}</Text>
          </View>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <CalmCornerModal
        visible={calmCornerVisible}
        onClose={() => setCalmCornerVisible(false)}
      />

      <Modal
        visible={languageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setLanguageModalVisible(false)}
        >
          <View style={styles.langModalBox} onStartShouldSetResponder={() => true}>
            <View style={styles.langModalHeader}>
              <Text style={styles.langModalTitle}>{t("select_language")}</Text>
              <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
                <Feather name="x" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8 }}>
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = currentLang === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.langChoiceCard, isSelected && styles.langChoiceSelected]}
                    onPress={async () => {
                      await changeLanguage(lang.code);
                      setLanguageModalVisible(false);
                      VoiceAssistant.speak(`Language set to ${lang.name}`, lang.code);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 20 }}>{lang.flagEmoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.langChoiceNative}>{lang.nativeName}</Text>
                      <Text style={styles.langChoiceSub}>{lang.name} • {lang.region}</Text>
                    </View>
                    {isSelected && <Feather name="check" size={20} color="#2563EB" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={companionModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCompanionModalVisible(false)}
      >
        <CompanionScreen onClose={() => setCompanionModalVisible(false)} isModal />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFC",
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 24,
  },

  // 1. App Bar
  topAppBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  userTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  userAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#E0E7FF",
    position: "relative",
  },
  greenOnlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  greetingMiniText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#78716C",
  },
  userNameMiniText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E2024",
  },
  appBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  langPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  langEmoji: {
    fontSize: 13,
  },
  langPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4F46E5",
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },

  // 2. Hero AI Companion Box
  heroCompanionBox: {
    backgroundColor: "#FAF7FD",
    borderRadius: 20,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#EDE8F5",
  },
  avatarSpeechRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarTapWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  tapMicBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#6366F1",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  speechBubbleRight: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#EDE8F5",
  },
  bubbleTopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  avatarNameText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4F46E5",
  },
  expandMiniBtn: {
    padding: 2,
  },
  avatarSpeechBody: {
    fontSize: 12.5,
    color: "#334155",
    lineHeight: 17,
  },
  promptChipsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  miniPromptChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EDE8F5",
  },
  miniPromptEmoji: {
    fontSize: 12,
  },
  miniPromptText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4F46E5",
  },

  // 3. Segment Navigation Container
  segmentNavContainer: {
    flexDirection: "row",
    backgroundColor: "#F4F2EE",
    borderRadius: 16,
    padding: 3,
    marginBottom: 10,
    gap: 4,
  },
  segmentTabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 13,
  },
  segmentTabActive: {
    backgroundColor: "#6366F1",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentTabEmoji: {
    fontSize: 14,
  },
  segmentTabText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#64748B",
  },
  segmentTabTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  activeFeatureWrapper: {
    marginBottom: 10,
  },

  // Calm Corner Banner in Peace Tab
  calmCornerBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FAF5FF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#E9D5FF",
  },
  calmBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  calmBannerTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#4F46E5",
  },
  calmBannerSub: {
    fontSize: 11,
    color: "#6366F1",
    marginTop: 1,
  },

  // 4. Daily Focus Routine Card
  dailyFocusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EAE7E1",
    shadowColor: "#A8A29E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  focusHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  focusTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  focusCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E2024",
  },
  focusCountPill: {
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  focusCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#4F46E5",
  },
  waterGlassesTrack: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  waterCupBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  waterCupFilled: {
    backgroundColor: "#EEF2FF",
  },
  waterCupEmpty: {
    backgroundColor: "#F8FAFC",
  },
  oneTapWaterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#6366F1",
    paddingVertical: 10,
    borderRadius: 12,
  },
  oneTapWaterBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  compactMedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0FDF4",
    padding: 8,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  compactMedTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
  },
  compactMedTakenBtn: {
    backgroundColor: "#10B981",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  compactMedTakenText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // 5. Aesthetic Games Banner
  aestheticGamesBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAF7FD",
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#EDE8F5",
    gap: 10,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  gamesBannerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  gamesBannerBadgeRow: {
    marginBottom: 1,
  },
  gamesBannerBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#6366F1",
    letterSpacing: 0.5,
  },
  gamesBannerTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#1E2024",
  },
  gamesBannerSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  gamesBannerArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },

  // 6. Mobile SOS Button
  mobileSosButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFF1F2",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#FECDD3",
  },
  mobileSosText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#BE123C",
  },
  mobileSosSubText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#9F1239",
    marginTop: 1,
  },
  sosSentNotification: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    padding: 10,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  sosSentText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
    flex: 1,
  },

  // Language Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  langModalBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderColor: "#EAE7E1",
  },
  langModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  langModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E2024",
  },
  langChoiceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FAFAFC",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EAE7E1",
  },
  langChoiceSelected: {
    backgroundColor: "#F5F3FF",
    borderColor: "#6366F1",
  },
  langChoiceNative: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E2024",
  },
  langChoiceSub: {
    fontSize: 11,
    color: "#64748B",
  },
});
