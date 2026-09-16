import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { patientService, Query } from "@/services/api/patientService";
import { useTranslation } from "@/constants/i18n";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import { PastelPalette, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { callService } from "@/services/family/callService";

const { width } = Dimensions.get("window");

const QUICK_PRESETS = [
  {
    en: "Can I go for a 20-min garden walk today?",
    as: "আজি মই ২০ মিনিট বাগিচাত ফুৰিবলৈ যাব পাৰোনে?",
    hi: "क्या मैं आज 20 मिनट बगीचे में टहलने जा सकता हूँ?",
    emoji: "🌿",
  },
  {
    en: "Should I take my blood pressure medicine before or after breakfast?",
    as: "মই ৰাতিপুৱাৰ জলপানৰ আগত নে পিছত ঔষধ খাব লাগে?",
    hi: "क्या मुझे नाश्ते से पहले या बाद में बीपी की दवा लेनी चाहिए?",
    emoji: "💊",
  },
  {
    en: "Feeling slightly restless this evening, what should I do?",
    as: "আজি সন্ধিয়া অলপ অশান্তি লাগিছে, মই কি কৰিম?",
    hi: "आज शाम थोड़ा बेचैनी लग रही है, मुझे क्या करना चाहिए?",
    emoji: "🍵",
  },
  {
    en: "When is my next virtual checkup with Dr. Sharma?",
    as: "ডাঃ শৰ্মাৰ লগত মোৰ পৰৱৰ্তী ভিডিঅ' পৰামৰ্শ কেতিয়া আছে?",
    hi: "डॉ. शर्मा के साथ मेरा अगला चेकअप कब है?",
    emoji: "🩺",
  },
];

const CARE_TEAM = [
  {
    id: "doc-1",
    name: "Dr. Ananya Sharma",
    role: "Lead Neurologist · GNRC Guwahati",
    avatarEmoji: "👩‍⚕️",
    badge: "Primary Neurologist",
    bgColor: PastelPalette.lavenderBase,
    borderColor: PastelPalette.lavenderBorder,
    accentColor: PastelPalette.lavenderAccent,
    available: "Available on Video",
    phone: "+91 98640 11223",
  },
  {
    id: "asha-1",
    name: "Geeta Saikia",
    role: "Community ASHA Didi · Majuli Center",
    avatarEmoji: "🌸",
    badge: "Home Visit & Vitals",
    bgColor: PastelPalette.pinkBase,
    borderColor: PastelPalette.pinkBorder,
    accentColor: PastelPalette.pinkAccent,
    available: "Visiting Thursday 11 AM",
    phone: "+91 94350 44556",
  },
  {
    id: "nurse-1",
    name: "Sister Meena Roy",
    role: "Dementia Care Nurse · Tele-Care Support",
    avatarEmoji: "🩺",
    badge: "24/7 Helpline",
    bgColor: PastelPalette.mintBase,
    borderColor: PastelPalette.mintBorder,
    accentColor: PastelPalette.mintAccent,
    available: "Active Line",
    phone: "+91 98640 99887",
  },
];

export default function PatientTeleCareScreen() {
  const router = useRouter();
  const { t, currentLang } = useTranslation();

  const [queries, setQueries] = useState<Query[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewQueryModal, setShowNewQueryModal] = useState(false);
  const [newQueryText, setNewQueryText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const fetchQueries = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await patientService.getQueries();
      if (response.success && response.queries) {
        setQueries(response.queries);
      }
    } catch {
      console.log("Using cached tele-care queries");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueries();
  }, [fetchQueries]);

  const handleSubmitQuery = async () => {
    if (!newQueryText.trim()) {
      Alert.alert(
        currentLang === "as" ? "প্ৰশ্ন লিখক" : currentLang === "hi" ? "प्रश्न लिखें" : "Please ask a question",
        currentLang === "as"
          ? "অনুগ্ৰহ কৰি আপোনাৰ প্ৰশ্ন লিখক বা এটা পৰামৰ্শ বাছক।"
          : "Please write your question or select one of the suggested topics."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await patientService.createQuery(newQueryText.trim(), "medium");
      setShowNewQueryModal(false);
      setNewQueryText("");
      const successMsg =
        currentLang === "as"
          ? "ডাঃ শৰ্মালৈ প্ৰশ্ন প্ৰেৰণ কৰা হ'ল। তেওঁলোকে অতি সোনকালে উত্তৰ দিব।"
          : currentLang === "hi"
          ? "डॉक्टर को प्रश्न भेज दिया गया है। वे जल्द ही उत्तर देंगे।"
          : "Question sent to your doctor. You will receive gentle advice shortly.";
      VoiceAssistant.speak(successMsg, currentLang);
      fetchQueries();
    } catch {
      setShowNewQueryModal(false);
      setNewQueryText("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReadText = (text: string, id: string) => {
    if (speakingId === id) {
      VoiceAssistant.stop();
      setSpeakingId(null);
    } else {
      setSpeakingId(id);
      VoiceAssistant.speak(text, currentLang);
    }
  };

  const handleStartDoctorCall = async (doc: typeof CARE_TEAM[0]) => {
    try {
      await callService.startCall({
        contactId: doc.id,
        contactName: doc.name,
        contactAvatar: doc.avatarEmoji,
        contactRelationship: doc.role,
        phone: doc.phone,
        callType: "video",
      });
      router.push({
        pathname: "/(patient)/(stack)/call",
        params: {
          contactId: doc.id,
          contactName: doc.name,
          contactAvatar: doc.avatarEmoji,
          contactRelationship: doc.role,
          callType: "video",
          initiator: "patient",
        },
      });
    } catch (e) {
      console.warn("Could not start doctor call:", e);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ── 1. AESTHETIC GREETING HERO CARD (LAVENDER & BABY PINK GRADIENT) ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroAvatarCircle}>
              <Text style={{ fontSize: 32 }}>🌸</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.onlinePill}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlinePillText}>
                  {currentLang === "as" ? "সুৰক্ষিত টেলি-কেয়াৰ লাইন সক্ৰিয়" : "Tele-Care Connected"}
                </Text>
              </View>
              <Text style={styles.heroTitle}>
                {currentLang === "as"
                  ? "নমস্কাৰ, ভবেন দা 🌿"
                  : currentLang === "hi"
                  ? "नमस्ते, भबेन जी 🌿"
                  : "Hello, Bhaben Da 🌿"}
              </Text>
              <Text style={styles.heroSubtitle}>
                {currentLang === "as"
                  ? "ডাঃ অনন্যা শৰ্মা আৰু গীতা দিদি আপোনাৰ স্বাস্থ্যৰ যত্ন লৈ আছে।"
                  : "Dr. Ananya Sharma & Geeta Didi are watching over your health today."}
              </Text>
            </View>
          </View>
        </View>

        {/* ── 2. ELDERLY-FRIENDLY QUICK ACTION TILES ─────────────────────── */}
        <View style={styles.quickActionsGrid}>
          {/* Ask Doctor / ASHA Didi Button */}
          <TouchableOpacity
            style={[styles.actionTile, { backgroundColor: PastelPalette.lavenderLight, borderColor: PastelPalette.lavenderBorder }]}
            onPress={() => setShowNewQueryModal(true)}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: PastelPalette.lavenderBase }]}>
              <Feather name="mic" size={22} color={PastelPalette.lavenderAccent} />
            </View>
            <Text style={[styles.actionTileTitle, { color: PastelPalette.lavenderDeep }]}>
              {currentLang === "as" ? "ডাঃ ক সোধক" : "Ask Doctor"}
            </Text>
            <Text style={styles.actionTileSub}>
              {currentLang === "as" ? "প্ৰশ্ন বা কণ্ঠবাৰ্তা" : "Voice / Question"}
            </Text>
          </TouchableOpacity>

          {/* Call Doctor Video Checkup */}
          <TouchableOpacity
            style={[styles.actionTile, { backgroundColor: PastelPalette.pinkLight, borderColor: PastelPalette.pinkBorder }]}
            onPress={() => handleStartDoctorCall(CARE_TEAM[0])}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: PastelPalette.pinkBase }]}>
              <Feather name="video" size={22} color={PastelPalette.pinkAccent} />
            </View>
            <Text style={[styles.actionTileTitle, { color: PastelPalette.pinkDeep }]}>
              {currentLang === "as" ? "ডাঃ শৰ্মা কল" : "Call Doctor"}
            </Text>
            <Text style={styles.actionTileSub}>
              {currentLang === "as" ? "পোনপটীয়া ভিডিঅ'" : "Direct Video"}
            </Text>
          </TouchableOpacity>

          {/* ASHA Home Visit */}
          <TouchableOpacity
            style={[styles.actionTile, { backgroundColor: PastelPalette.mintLight, borderColor: PastelPalette.mintBorder }]}
            onPress={() => handleStartDoctorCall(CARE_TEAM[1])}
            activeOpacity={0.85}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: PastelPalette.mintBase }]}>
              <Feather name="phone-call" size={22} color={PastelPalette.mintAccent} />
            </View>
            <Text style={[styles.actionTileTitle, { color: PastelPalette.mintAccent }]}>
              {currentLang === "as" ? "গীতা দিদি" : "ASHA Didi"}
            </Text>
            <Text style={styles.actionTileSub}>
              {currentLang === "as" ? "ঘৰৰ স্বাস্থ্য সহায়" : "Home Health"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── 3. UPCOMING VIRTUAL VISIT CARD ──────────────────────────────── */}
        <View style={styles.upcomingVisitCard}>
          <View style={styles.upcomingHeader}>
            <View style={styles.upcomingIconCircle}>
              <Feather name="calendar" size={18} color="#7C3AED" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.upcomingCardTitle}>
                {currentLang === "as" ? "পৰৱৰ্তী ভিডিঅ' পৰামৰ্শ" : "Upcoming Tele-Consultation"}
              </Text>
              <Text style={styles.upcomingDate}>
                {currentLang === "as" ? "বৃহস্পতিবাৰ, আবেলি ৪:৩০ বজাত" : "Thursday, 4:30 PM"}
              </Text>
            </View>
            <View style={styles.familyJoinPill}>
              <Text style={styles.familyJoinText}>
                {currentLang === "as" ? "অনিতাও থাকিব" : "Anita joins"}
              </Text>
            </View>
          </View>
          <Text style={styles.upcomingNote}>
            {currentLang === "as"
              ? "ডাঃ অনন্যা শৰ্মাই ৰাতিপুৱাৰ খোজ কঢ়া আৰু টোপনিৰ নিয়ম পৰীক্ষা কৰিব।"
              : "Dr. Ananya Sharma will review gentle morning walking and sleep rhythm with you."}
          </Text>
        </View>

        {/* ── 4. DOCTOR'S GENTLE ADVICE & ANSWERS ──────────────────────────── */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 18 }}>💌</Text>
            <Text style={styles.sectionHeaderTitle}>
              {currentLang === "as" ? "ডাঃ শৰ্মাৰ পৰামৰ্শ" : "Doctor's Gentle Advice"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.askNewSmallBtn}
            onPress={() => setShowNewQueryModal(true)}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={14} color="#7C3AED" />
            <Text style={styles.askNewSmallBtnText}>
              {currentLang === "as" ? "নতুন প্ৰশ্ন" : "Ask"}
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#9333EA" style={{ marginVertical: 24 }} />
        ) : queries.length > 0 ? (
          queries.map((q) => {
            const isSpeaking = speakingId === q.id;
            return (
              <View key={q.id} style={styles.queryCard}>
                {/* Question Row */}
                <View style={styles.queryTopRow}>
                  <View style={styles.questionIconCircle}>
                    <Text style={{ fontSize: 16 }}>🙋‍♂️</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.queryQuestionText}>"{q.question}"</Text>
                    <Text style={styles.queryDateText}>
                      {new Date(q.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </Text>
                  </View>
                </View>

                {/* Doctor's Response Box */}
                {q.response ? (
                  <View style={styles.responseBox}>
                    <View style={styles.responseHeaderRow}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={{ fontSize: 18 }}>👩‍⚕️</Text>
                        <Text style={styles.doctorNameHeading}>
                          {q.doctorName || "Dr. Ananya Sharma"}
                        </Text>
                        <View style={styles.verifiedBadge}>
                          <Text style={styles.verifiedBadgeText}>Verified</Text>
                        </View>
                      </View>
                      
                      {/* Audio Read-Out Button */}
                      <TouchableOpacity
                        style={[styles.listenBtn, isSpeaking && styles.listenBtnSpeaking]}
                        onPress={() => handleReadText(q.response || "", q.id)}
                        activeOpacity={0.8}
                      >
                        <Feather
                          name={isSpeaking ? "volume-x" : "volume-2"}
                          size={15}
                          color={isSpeaking ? "#FFFFFF" : "#7C3AED"}
                        />
                        <Text style={[styles.listenBtnText, isSpeaking && styles.listenBtnTextSpeaking]}>
                          {isSpeaking
                            ? currentLang === "as" ? "বন্ধ কৰক" : "Stop"
                            : currentLang === "as" ? "শুনক" : "Listen"}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.responseText}>{q.response}</Text>
                  </View>
                ) : (
                  <View style={styles.pendingReplyBox}>
                    <Feather name="clock" size={14} color="#D97706" />
                    <Text style={styles.pendingReplyText}>
                      {currentLang === "as"
                        ? "ডাঃ শৰ্মাই সোনকালে উত্তৰ লিখি আছে..."
                        : "Dr. Sharma is reviewing and will reply shortly..."}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={{ fontSize: 32 }}>🌸</Text>
            <Text style={styles.emptyTitle}>
              {currentLang === "as" ? "কোনো প্ৰশ্ন নাই" : "No questions asked yet"}
            </Text>
            <Text style={styles.emptySub}>
              {currentLang === "as"
                ? "আপোনাৰ মনৰ যিকোনো প্ৰশ্ন ডাঃ শৰ্মাক সহজভাৱে সুধিব পাৰে।"
                : "Feel free to ask Dr. Sharma or ASHA Didi any health question whenever you want."}
            </Text>
          </View>
        )}

        {/* ── 5. MY TRUSTED CARE CIRCLE ──────────────────────────────────── */}
        <View style={[styles.sectionHeaderRow, { marginTop: 22 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 18 }}>🤝</Text>
            <Text style={styles.sectionHeaderTitle}>
              {currentLang === "as" ? "মোৰ স্বাস্থ্য সহায়িকা মণ্ডল" : "My Care Team"}
            </Text>
          </View>
        </View>

        <View style={styles.teamList}>
          {CARE_TEAM.map((member) => (
            <View
              key={member.id}
              style={[styles.teamCard, { backgroundColor: member.bgColor, borderColor: member.borderColor }]}
            >
              <View style={styles.teamAvatarCircle}>
                <Text style={{ fontSize: 26 }}>{member.avatarEmoji}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.teamName}>{member.name}</Text>
                  <View style={[styles.teamBadge, { borderColor: member.accentColor }]}>
                    <Text style={[styles.teamBadgeText, { color: member.accentColor }]}>
                      {member.badge}
                    </Text>
                  </View>
                </View>
                <Text style={styles.teamRole}>{member.role}</Text>
                <Text style={[styles.teamAvailability, { color: member.accentColor }]}>
                  {member.available}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.teamCallBtn, { backgroundColor: member.accentColor }]}
                onPress={() => handleStartDoctorCall(member)}
                activeOpacity={0.8}
              >
                <Feather name="video" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── 6. EASY ASK DOCTOR MODAL (PASTEL LAVENDER & BABY PINK) ────────── */}
      <Modal
        visible={showNewQueryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNewQueryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Drag Handle */}
            <View style={styles.sheetHandleBar}>
              <View style={styles.sheetHandle} />
            </View>

            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 22 }}>💬</Text>
                <View>
                  <Text style={styles.modalTitle}>
                    {currentLang === "as" ? "ডাঃ ক এটা প্ৰশ্ন সোধক" : "Ask Doctor or ASHA Didi"}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {currentLang === "as"
                      ? "প্ৰশ্নটো লিখক বা তলৰ পৰা বাছক"
                      : "Type your question or choose a quick prompt"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowNewQueryModal(false)} style={styles.modalCloseBtn}>
                <Feather name="x" size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* Quick Suggestions */}
            <Text style={styles.modalSectionLabel}>
              {currentLang === "as" ? "দ্ৰুত পৰামৰ্শ (টিপক)" : "QUICK TOPICS (TAP TO FILL)"}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
              {QUICK_PRESETS.map((p, idx) => {
                const text = currentLang === "as" ? p.as : currentLang === "hi" ? p.hi : p.en;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={styles.presetChip}
                    onPress={() => setNewQueryText(text)}
                    activeOpacity={0.75}
                  >
                    <Text style={{ fontSize: 16 }}>{p.emoji}</Text>
                    <Text style={styles.presetChipText} numberOfLines={2}>
                      {text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Text Input */}
            <Text style={styles.modalSectionLabel}>
              {currentLang === "as" ? "আপোনাৰ বাৰ্তা বা প্ৰশ্ন" : "YOUR MESSAGE OR QUESTION"}
            </Text>
            <TextInput
              style={styles.queryInput}
              multiline
              numberOfLines={4}
              placeholder={
                currentLang === "as"
                  ? "আপোনাৰ প্ৰশ্ন ইয়াত লিখক..."
                  : currentLang === "hi"
                  ? "अपना प्रश्न यहाँ लिखें..."
                  : "Type what you'd like to ask Dr. Sharma..."
              }
              placeholderTextColor="#94A3B8"
              value={newQueryText}
              onChangeText={setNewQueryText}
            />

            {/* Send Button */}
            <TouchableOpacity
              style={[styles.sendBtn, isSubmitting && { opacity: 0.7 }]}
              onPress={handleSubmitQuery}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Feather name="send" size={18} color="#FFFFFF" />
                  <Text style={styles.sendBtnText}>
                    {currentLang === "as" ? "ডাঃ লৈ বাৰ্তা পঠিয়াওক" : "Send to Care Team"}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF5FF", // Soft Lavender Mist
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1.5,
    borderColor: PastelPalette.lavenderBorder,
    shadowColor: "#9333EA",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroAvatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: PastelPalette.pinkBase,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: PastelPalette.pinkBorder,
  },
  onlinePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#10B981",
  },
  onlinePillText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#047857",
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#1E1B4B",
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 17,
  },
  quickActionsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  actionTile: {
    flex: 1,
    borderRadius: 18,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionTileTitle: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  actionTileSub: {
    fontSize: 10.5,
    color: "#64748B",
    marginTop: 1,
    textAlign: "center",
  },
  upcomingVisitCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: PastelPalette.lavenderBorder,
    marginBottom: 16,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  upcomingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  upcomingIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PastelPalette.lavenderBase,
    alignItems: "center",
    justifyContent: "center",
  },
  upcomingCardTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  upcomingDate: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7C3AED",
    marginTop: 1,
  },
  familyJoinPill: {
    backgroundColor: PastelPalette.pinkBase,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PastelPalette.pinkBorder,
  },
  familyJoinText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: PastelPalette.pinkDeep,
  },
  upcomingNote: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 4,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  askNewSmallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PastelPalette.lavenderBase,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PastelPalette.lavenderBorder,
  },
  askNewSmallBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#7C3AED",
  },
  queryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  queryTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  questionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PastelPalette.peachBase,
    alignItems: "center",
    justifyContent: "center",
  },
  queryQuestionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E1B4B",
    lineHeight: 19,
  },
  queryDateText: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  responseBox: {
    backgroundColor: PastelPalette.lavenderLight,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: PastelPalette.lavenderBorder,
  },
  responseHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  doctorNameHeading: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#6B21A8",
  },
  verifiedBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 0.8,
    borderColor: "#A7F3D0",
  },
  verifiedBadgeText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#047857",
  },
  listenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PastelPalette.lavenderBase,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PastelPalette.lavenderBorder,
  },
  listenBtnSpeaking: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  listenBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7C3AED",
  },
  listenBtnTextSpeaking: {
    color: "#FFFFFF",
  },
  responseText: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
  },
  pendingReplyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFBEB",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  pendingReplyText: {
    fontSize: 12,
    color: "#92400E",
    fontStyle: "italic",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E1B4B",
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12.5,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 17,
    maxWidth: 260,
  },
  teamList: {
    gap: 8,
  },
  teamCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
  },
  teamAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  teamName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  teamBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
  },
  teamBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
  },
  teamRole: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  teamAvailability: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  teamCallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(30, 27, 75, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
    maxHeight: "90%",
  },
  sheetHandleBar: {
    alignItems: "center",
    paddingVertical: 6,
  },
  sheetHandle: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: "#CBD5E1",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 6,
  },
  presetsRow: {
    gap: 8,
    paddingBottom: 4,
  },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PastelPalette.lavenderLight,
    borderWidth: 1,
    borderColor: PastelPalette.lavenderBorder,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    maxWidth: 230,
  },
  presetChipText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#6B21A8",
    lineHeight: 15,
  },
  queryInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1E1B4B",
    minHeight: 85,
    textAlignVertical: "top",
  },
  sendBtn: {
    backgroundColor: "#7C3AED",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  sendBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
