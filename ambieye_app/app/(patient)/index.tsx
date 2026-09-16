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
import { useRouter, useFocusEffect } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation, SUPPORTED_LANGUAGES, SupportedLanguage } from "@/constants/i18n";
import {
  reminderStorage,
  DailyHydration,
  MedicationItem,
  RoutineTask,
} from "@/utils/reminderStorage";
import {
  caregiverStorage,
  FamilySentItem,
  PatientProfile,
} from "@/utils/caregiverStorage";
import { companionService } from "@/services/companion/companionService";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import CalmCornerModal from "@/components/CalmCornerModal";
import { VirtualAvatar, AvatarState } from "@/components/companion/VirtualAvatar";
import { CompanionScreen } from "@/components/companion/CompanionScreen";
import { MusicHubModal } from "@/components/patient/MusicHubModal";
import { SmritiPhotobook } from "@/components/patient/SmritiPhotobook";
import { AponManuhSpeedDial } from "@/components/patient/AponManuhSpeedDial";
import { GharorBartaPostcards } from "@/components/patient/GharorBartaPostcards";

export default function PatientHomeScreen() {
  const router = useRouter();
  const { username, logout } = useAuth();
  const { t, currentLang, changeLanguage } = useTranslation();

  // Modals for feature discovery on-demand
  const [familyModalVisible, setFamilyModalVisible] = useState(false);
  const [musicModalVisible, setMusicModalVisible] = useState(false);
  const [photosModalVisible, setPhotosModalVisible] = useState(false);
  const [calmCornerVisible, setCalmCornerVisible] = useState(false);
  const [companionModalVisible, setCompanionModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  // Patient Profile, Routines & Family Postcards
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [routines, setRoutines] = useState<RoutineTask[]>([]);
  const [familyItems, setFamilyItems] = useState<FamilySentItem[]>([]);
  const [sosBanner, setSosBanner] = useState<string | null>(null);

  // Avatar Companion In-Hero State
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [avatarSpeechText, setAvatarSpeechText] = useState<string>(
    "Good day, Bhaben! I am your companion Smriti Mitr. Tap 'Talk to Me' whenever you want to chat."
  );

  const loadData = useCallback(async () => {
    try {
      const prof = await caregiverStorage.getPatientProfile();
      const rts = await reminderStorage.getTodayRoutines();
      const fam = await caregiverStorage.getFamilySentItems();
      setProfile(prof);
      setRoutines(rts);
      setFamilyItems(fam);
    } catch (err) {
      console.error("[PatientHome] Error loading data:", err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Formatted Date
  const getFormattedDate = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "long",
    };
    try {
      const locale = currentLang === "as" ? "as-IN" : currentLang === "hi" ? "hi-IN" : "en-US";
      return today.toLocaleDateString(locale, options);
    } catch {
      return today.toLocaleDateString("en-US", options);
    }
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
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const handleVoiceGreeting = () => {
    const greetingText = `${getGreeting()}, ${profile?.name || "Bhaben"}. Today is ${getFormattedDate()}. I am your companion Smriti Mitr. Everything is calm and safe at home.`;
    VoiceAssistant.speak(greetingText, currentLang);
  };

  // Avatar Voice Interaction: "Talk to Me"
  const handleAvatarMicTap = async () => {
    if (avatarState === "speaking") {
      companionService.stopSpeech();
      setAvatarState("idle");
      return;
    }

    setAvatarState("listening");
    const listenPrompt =
      currentLang === "as"
        ? "মই শুনি আছোঁ, কওকচোন..."
        : currentLang === "hi"
        ? "मैं सुन रहा हूँ, कहिए..."
        : "I am listening, please speak...";
    setAvatarSpeechText(listenPrompt);

    setTimeout(async () => {
      try {
        const result = await companionService.processElderInput(
          "Hello Smriti Mitr, how is my day looking?",
          currentLang as any
        );
        setAvatarSpeechText(result.responseText);
        setAvatarState("speaking");
        companionService.speakResponse(result.responseText, currentLang as any);

        const durationMs = Math.max(3000, result.responseText.length * 70);
        setTimeout(() => {
          setAvatarState("idle");
        }, durationMs);
      } catch {
        setAvatarState("idle");
      }
    }, 1800);
  };

  // Toggle routine completion
  const handleToggleRoutine = async (id: string) => {
    const updated = await reminderStorage.toggleRoutine(id);
    setRoutines(updated);
    const item = updated.find((r) => r.id === id);
    if (item && item.completed) {
      const msg =
        currentLang === "as"
          ? `${item.title} সম্পন্ন হ'ল!`
          : currentLang === "hi"
          ? `${item.title} पूरा हुआ!`
          : `${item.title} completed!`;
      VoiceAssistant.speak(msg, currentLang);
    }
  };

  // SOS Emergency Trigger
  const handleSOS = async () => {
    await reminderStorage.triggerSOS();
    const alertMsg =
      currentLang === "as"
        ? "জৰুৰীকালীন সহায় সংকেত পৰিয়াল আৰু ডাক্টৰলৈ প্ৰেৰণ কৰা হৈছে।"
        : currentLang === "hi"
        ? "आपातकालीन सहायता संदेश परिवार और डॉक्टर को भेज दिया गया है।"
        : "Emergency alert sent to family & assigned doctor.";

    setSosBanner(alertMsg);
    VoiceAssistant.speak(alertMsg, currentLang);
    if (Platform.OS !== "web") {
      Alert.alert(t("sos_button") || "Emergency Alert", alertMsg);
    }
  };

  const getRoutineIcon = (iconName: string) => {
    switch (iconName) {
      case "pill":
        return <MaterialCommunityIcons name="pill" size={24} color="#2563EB" />;
      case "shower":
        return <MaterialCommunityIcons name="shower" size={24} color="#0284C7" />;
      case "sparkles":
        return <MaterialCommunityIcons name="face-woman-shimmer" size={24} color="#D97706" />;
      case "music":
        return <Feather name="music" size={22} color="#7C3AED" />;
      case "coffee":
        return <Feather name="coffee" size={22} color="#B45309" />;
      case "sun":
        return <Feather name="sun" size={22} color="#EA580C" />;
      default:
        return <Feather name="check-circle" size={22} color="#16A34A" />;
    }
  };

  const currentLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* ── 1. TOP GREETING & DATE ─────────────────────────────────────── */}
        <View style={styles.topGreetingSection}>
          <View style={styles.greetingTextContainer}>
            <Text style={styles.greetingHeader}>
              {getGreeting()}, {profile?.name ? profile.name.split(" ")[0] : "Bhaben"} 👋
            </Text>
            <Text style={styles.dateSubheader}>{getFormattedDate()}</Text>
          </View>

          <View style={styles.topActionsRow}>
            {/* Language Picker Pill */}
            <TouchableOpacity
              style={styles.langPill}
              onPress={() => setLanguageModalVisible(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Change Language"
            >
              <Text style={styles.langEmoji}>{currentLangObj.flagEmoji}</Text>
              <Text style={styles.langPillText}>{currentLangObj.nativeName}</Text>
              <Feather name="chevron-down" size={14} color="#4F46E5" />
            </TouchableOpacity>

            {/* Read Aloud Voice Button */}
            <TouchableOpacity
              style={styles.voiceIconBtn}
              onPress={handleVoiceGreeting}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Listen to Greeting"
            >
              <Feather name="volume-2" size={20} color="#4F46E5" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 2. VIRTUAL COMPANION HERO ─────────────────────────────────── */}
        <View style={styles.companionCard}>
          <View style={styles.companionMainRow}>
            {/* Interactive Avatar with touch target */}
            <TouchableOpacity
              onPress={handleAvatarMicTap}
              activeOpacity={0.85}
              style={styles.avatarTouchTarget}
              accessibilityRole="button"
              accessibilityLabel="Companion Avatar"
            >
              <VirtualAvatar
                size={74}
                state={avatarState}
                onPress={handleAvatarMicTap}
                showStatusBadge={false}
              />
              <View
                style={[
                  styles.avatarStateBadge,
                  avatarState === "speaking" ? styles.badgeSpeaking : styles.badgeListening,
                ]}
              >
                <Feather
                  name={avatarState === "speaking" ? "volume-2" : "mic"}
                  size={12}
                  color="#FFFFFF"
                />
              </View>
            </TouchableOpacity>

            {/* Conversational Text Bubble */}
            <View style={styles.companionSpeechBox}>
              <View style={styles.companionNameRow}>
                <Text style={styles.companionNameTitle}>Smriti Mitr 🌸</Text>
                <TouchableOpacity
                  onPress={() => setCompanionModalVisible(true)}
                  style={styles.expandChatBtn}
                  activeOpacity={0.7}
                  accessibilityLabel="Open Full Conversation"
                >
                  <Feather name="maximize-2" size={14} color="#6366F1" />
                </TouchableOpacity>
              </View>
              <Text style={styles.companionSpeechText} numberOfLines={3}>
                {avatarSpeechText}
              </Text>
            </View>
          </View>

          {/* Large Prominent "Talk to Me" Button */}
          <TouchableOpacity
            style={[
              styles.talkToMeButton,
              avatarState === "listening" && styles.talkToMeButtonActive,
            ]}
            onPress={handleAvatarMicTap}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Talk to Companion"
          >
            <Feather
              name={avatarState === "speaking" ? "volume-x" : "mic"}
              size={22}
              color="#FFFFFF"
            />
            <Text style={styles.talkToMeButtonText}>
              {avatarState === "speaking"
                ? currentLang === "as"
                  ? "কথা বন্ধ কৰক"
                  : "Stop Speaking"
                : avatarState === "listening"
                ? currentLang === "as"
                  ? "শুনি আছোঁ... কওক"
                  : "Listening... Speak Now"
                : currentLang === "as"
                ? "মোৰ লগত কথা পাতক (Talk to Me)"
                : currentLang === "hi"
                ? "मुझसे बात करें (Talk to Me)"
                : "Talk to Me"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── 3. FEATURE DISCOVERY (4 CLEAR ELDERLY TILES) ───────────────── */}
        <View style={styles.discoverySection}>
          <Text style={styles.sectionHeaderTitle}>
            {currentLang === "as" ? "প্ৰধান সুবিধাসমূহ" : "Explore Features"}
          </Text>

          <View style={styles.tilesGrid}>
            {/* Tile 1: Games */}
            <TouchableOpacity
              style={styles.featureTile}
              onPress={() => router.push("/(patient)/games" as any)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Mind and Memory Games"
            >
              <View style={[styles.tileIconContainer, { backgroundColor: "#EEF2FF" }]}>
                <Text style={styles.tileEmoji}>🎮</Text>
              </View>
              <View style={styles.tileTextContainer}>
                <Text style={styles.tileTitle}>
                  {currentLang === "as" ? "খেলসমূহ" : "Games"}
                </Text>
                <Text style={styles.tileSubtitle} numberOfLines={1}>
                  {currentLang === "as" ? "স্মৃতি আৰু অন্তাক্ষৰী" : "Mind & Antakshari"}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color="#94A3B8" />
            </TouchableOpacity>

            {/* Tile 2: Family & Speed Dial */}
            <TouchableOpacity
              style={styles.featureTile}
              onPress={() => router.push("/(patient)/(stack)/family" as any)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Family and Speed Dial"
            >
              <View style={[styles.tileIconContainer, { backgroundColor: "#ECFDF5" }]}>
                <Text style={styles.tileEmoji}>📞</Text>
              </View>
              <View style={styles.tileTextContainer}>
                <Text style={styles.tileTitle}>
                  {currentLang === "as" ? "পৰিয়াল" : "Family"}
                </Text>
                <Text style={styles.tileSubtitle} numberOfLines={1}>
                  {currentLang === "as" ? "১-টেপ ফোন আৰু ভিডিঅ'" : "1-Tap Calls & Family"}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color="#94A3B8" />
            </TouchableOpacity>

            {/* Tile 3: Music & Radio */}
            <TouchableOpacity
              style={styles.featureTile}
              onPress={() => setMusicModalVisible(true)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Radio and Melodies"
            >
              <View style={[styles.tileIconContainer, { backgroundColor: "#FAF5FF" }]}>
                <Text style={styles.tileEmoji}>📻</Text>
              </View>
              <View style={styles.tileTextContainer}>
                <Text style={styles.tileTitle}>
                  {currentLang === "as" ? "সংগীত" : "Music"}
                </Text>
                <Text style={styles.tileSubtitle} numberOfLines={1}>
                  {currentLang === "as" ? "চোতালৰ পুৰণি গীত" : "Courtyard Radio"}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color="#94A3B8" />
            </TouchableOpacity>

            {/* Tile 4: Care & Hydration */}
            <TouchableOpacity
              style={styles.featureTile}
              onPress={() => router.push("/(patient)/reminders" as any)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Daily Care and Medicine"
            >
              <View style={[styles.tileIconContainer, { backgroundColor: "#FFF7ED" }]}>
                <Text style={styles.tileEmoji}>💊</Text>
              </View>
              <View style={styles.tileTextContainer}>
                <Text style={styles.tileTitle}>
                  {currentLang === "as" ? "স্বাস্থ্য যতন" : "Care"}
                </Text>
                <Text style={styles.tileSubtitle} numberOfLines={1}>
                  {currentLang === "as" ? "পানী আৰু ঔষধ" : "Hydration & Meds"}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 4. TODAY'S ROUTINE ─────────────────────────────────────────── */}
        <View style={styles.routineSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>
              {currentLang === "as" ? "আজিৰ কাৰ্যসূচী" : "Today's Routine"}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(patient)/reminders" as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAllText}>
                {currentLang === "as" ? "সকলো চাওক" : "View All"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.routineList}>
            {routines.slice(0, 4).map((task) => {
              return (
                <TouchableOpacity
                  key={task.id}
                  style={[
                    styles.routineCard,
                    task.completed && styles.routineCardCompleted,
                  ]}
                  onPress={() => handleToggleRoutine(task.id)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`${task.timeLabel} ${task.title}`}
                >
                  {/* Left: Time Badge */}
                  <View style={styles.timeBadge}>
                    <Text style={styles.timeBadgeText}>{task.timeLabel}</Text>
                  </View>

                  {/* Middle: Icon + Title + Description */}
                  <View style={styles.routineMiddle}>
                    <View style={styles.routineIconWrap}>
                      {getRoutineIcon(task.iconName)}
                    </View>
                    <View style={styles.routineDetails}>
                      <Text
                        style={[
                          styles.routineTitle,
                          task.completed && styles.routineTitleCompleted,
                        ]}
                        numberOfLines={1}
                      >
                        {task.title}
                      </Text>
                      {task.description ? (
                        <Text style={styles.routineDescription} numberOfLines={1}>
                          {task.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Right: Check Circle */}
                  <View
                    style={[
                      styles.checkCircle,
                      task.completed && styles.checkCircleCompleted,
                    ]}
                  >
                    {task.completed && (
                      <Feather name="check" size={16} color="#FFFFFF" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── 5. CLEAN EMERGENCY SOS BUTTON ──────────────────────────────── */}
        <TouchableOpacity
          style={styles.sosButton}
          onPress={handleSOS}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="Emergency SOS Alert"
        >
          <View style={styles.sosIconCircle}>
            <Feather name="alert-triangle" size={24} color="#DC2626" />
          </View>
          <View style={styles.sosTextContainer}>
            <Text style={styles.sosTitle}>
              {currentLang === "as"
                ? "জৰুৰীকালীন সহায় (SOS Alert)"
                : "Emergency Help (SOS)"}
            </Text>
            <Text style={styles.sosSubtitle}>
              {currentLang === "as"
                ? "অনিতা আৰু ডাক্টৰলৈ ১-টেপ সংকেত প্ৰেৰণ"
                : "1-Tap emergency alert to family & doctor"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* SOS Confirmation Banner */}
        {sosBanner && (
          <View style={styles.sosNotificationBanner}>
            <Feather name="check-circle" size={18} color="#16A34A" />
            <Text style={styles.sosNotificationText}>{sosBanner}</Text>
          </View>
        )}

        {/* Bottom padding for tabs */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── MODALS: REUSE EXISTING COMPONENTS ON-DEMAND ─────────────────── */}

      {/* 1. Family Modal */}
      <Modal
        visible={familyModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFamilyModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalTopBar}>
            <Text style={styles.modalTopBarTitle}>
              {currentLang === "as" ? "পৰিয়াল আৰু আপোন মানুহ" : "Family & Speed Dial"}
            </Text>
            <TouchableOpacity
              onPress={() => setFamilyModalVisible(false)}
              style={styles.modalCloseBtn}
            >
              <Feather name="x" size={22} color="#0F172A" />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalInnerScroll}
            showsVerticalScrollIndicator={false}
          >
            <AponManuhSpeedDial />
            <View style={{ height: 16 }} />
            <GharorBartaPostcards items={familyItems} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 2. Music Modal */}
      <MusicHubModal
        visible={musicModalVisible}
        onClose={() => setMusicModalVisible(false)}
        patientId={profile?.id || username || "mahi"}
      />

      {/* 3. Photos Modal */}
      <Modal
        visible={photosModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPhotosModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalTopBar}>
            <Text style={styles.modalTopBarTitle}>
              {currentLang === "as" ? "স্মৃতি ফটো এলবাম" : "Memory Photobook"}
            </Text>
            <TouchableOpacity
              onPress={() => setPhotosModalVisible(false)}
              style={styles.modalCloseBtn}
            >
              <Feather name="x" size={22} color="#0F172A" />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalInnerScroll}
            showsVerticalScrollIndicator={false}
          >
            <SmritiPhotobook />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 4. Calm Corner Modal */}
      <CalmCornerModal
        visible={calmCornerVisible}
        onClose={() => setCalmCornerVisible(false)}
      />

      {/* 5. Companion Full Screen Modal */}
      <Modal
        visible={companionModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCompanionModalVisible(false)}
      >
        <CompanionScreen onClose={() => setCompanionModalVisible(false)} isModal />
      </Modal>

      {/* 6. Language Selection Modal */}
      <Modal
        visible={languageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.dialogOverlay}
          activeOpacity={1}
          onPress={() => setLanguageModalVisible(false)}
        >
          <View style={styles.languageDialogCard} onStartShouldSetResponder={() => true}>
            <View style={styles.dialogHeader}>
              <Text style={styles.dialogTitle}>{t("select_language") || "Language"}</Text>
              <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
                <Feather name="x" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 10 }}>
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = currentLang === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.langChoiceRow, isSelected && styles.langChoiceSelected]}
                    onPress={async () => {
                      await changeLanguage(lang.code);
                      setLanguageModalVisible(false);
                      VoiceAssistant.speak(`Language set to ${lang.name}`, lang.code);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 24 }}>{lang.flagEmoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.langNativeText}>{lang.nativeName}</Text>
                      <Text style={styles.langRegionText}>
                        {lang.name} • {lang.region}
                      </Text>
                    </View>
                    {isSelected && <Feather name="check" size={20} color="#4F46E5" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FBF9F5",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },

  // 1. Top Greeting Area
  topGreetingSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 12,
  },
  greetingTextContainer: {
    flex: 1,
    minWidth: 160,
  },
  greetingHeader: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: -0.3,
  },
  dateSubheader: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 2,
  },
  topActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  langPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  langEmoji: {
    fontSize: 15,
  },
  langPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  voiceIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    justifyContent: "center",
    alignItems: "center",
  },

  // 2. Virtual Companion Hero
  companionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#EAE3D6",
    elevation: 3,
    shadowColor: "#78716C",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  companionMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  avatarTouchTarget: {
    position: "relative",
  },
  avatarStateBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeSpeaking: {
    backgroundColor: "#10B981",
  },
  badgeListening: {
    backgroundColor: "#6366F1",
  },
  companionSpeechBox: {
    flex: 1,
  },
  companionNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  companionNameTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#4338CA",
  },
  expandChatBtn: {
    padding: 4,
  },
  companionSpeechText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#334155",
    fontWeight: "500",
  },
  talkToMeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 10,
    elevation: 2,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  talkToMeButtonActive: {
    backgroundColor: "#10B981",
  },
  talkToMeButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },

  // 3. Feature Discovery (4 Tiles)
  discoverySection: {
    marginBottom: 22,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4F46E5",
  },
  tilesGrid: {
    gap: 10,
  },
  featureTile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EAE3D6",
    elevation: 1,
    shadowColor: "#78716C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    gap: 12,
  },
  tileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  tileEmoji: {
    fontSize: 22,
  },
  tileTextContainer: {
    flex: 1,
  },
  tileTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  tileSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 1,
    fontWeight: "500",
  },

  // 4. Today's Routine
  routineSection: {
    marginBottom: 22,
  },
  routineList: {
    gap: 10,
  },
  routineCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EAE3D6",
    elevation: 1,
    shadowColor: "#78716C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    gap: 12,
  },
  routineCardCompleted: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    opacity: 0.8,
  },
  timeBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 70,
    alignItems: "center",
  },
  timeBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
  },
  routineMiddle: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  routineIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },
  routineDetails: {
    flex: 1,
  },
  routineTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  routineTitleCompleted: {
    textDecorationLine: "line-through",
    color: "#94A3B8",
  },
  routineDescription: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
  },
  checkCircleCompleted: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },

  // 5. Emergency SOS Button
  sosButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#FECDD3",
    gap: 14,
    elevation: 2,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  sosIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  sosTextContainer: {
    flex: 1,
  },
  sosTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#991B1B",
  },
  sosSubtitle: {
    fontSize: 12,
    color: "#B91C1C",
    marginTop: 2,
  },
  sosNotificationBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    gap: 8,
  },
  sosNotificationText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#166534",
    flex: 1,
  },

  // Modals Styling
  modalSafeArea: {
    flex: 1,
    backgroundColor: "#FBF9F5",
  },
  modalTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  modalTopBarTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalInnerScroll: {
    padding: 16,
    paddingBottom: 40,
  },

  // Language Dialog
  dialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  languageDialogCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  dialogHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  langChoiceRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    gap: 12,
  },
  langChoiceSelected: {
    backgroundColor: "#EEF2FF",
    borderColor: "#4F46E5",
  },
  langNativeText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  langRegionText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
});
