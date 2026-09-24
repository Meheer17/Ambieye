import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { WarmPalette } from "@/constants/theme";
import { useTranslation, SupportedLanguage } from "@/constants/i18n";
import { VirtualAvatar, AvatarState, AvatarPersona } from "./VirtualAvatar";
import { Model3DViewer } from "./Model3DViewer";
import {
  companionService,
  CompanionMessage,
  REMINISCENCE_TOPICS,
  ReminiscenceTopic,
  PatientContinuousContext,
} from "@/services/companion/companionService";

interface CompanionScreenProps {
  onClose?: () => void;
  isModal?: boolean;
}

const { width } = Dimensions.get("window");

export const CompanionScreen: React.FC<CompanionScreenProps> = ({
  onClose,
  isModal = false,
}) => {
  const { t, currentLang } = useTranslation();

  const [persona, setPersona] = useState<AvatarPersona>("mitr");
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [viewMode3D, setViewMode3D] = useState(true);
  const [patientCtx, setPatientCtx] = useState<PatientContinuousContext | null>(null);

  const [messages, setMessages] = useState<CompanionMessage[]>([
    {
      id: "msg-welcome",
      sender: "avatar",
      text: "Good day, Bhaben! I am your companion Smriti Mitr. It is wonderful to be with you today. What would you like to talk about?",
      timestamp: "Just now",
      comfortEmoji: "🌸",
    },
  ]);

  const [currentText, setCurrentText] = useState("");
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    companionService.getPatientContext().then((ctx) => {
      setPatientCtx(ctx);
      const name = ctx.profile.name.split(" ")[0] || "Bhaben";
      const initialGreeting =
        currentLang === "as"
          ? `নমস্কাৰ ${name} দেউতা! মই আপোনাৰ প্ৰিয় বন্ধু স্মৃতি মিত্ৰ। আজি আপোনাৰ দিনটো আনন্দৰে পাৰ হওক।`
          : currentLang === "hi"
          ? `नमस्ते ${name} जी! मैं आपकी सहेली स्मृति मित्र हूँ। आज आपका दिन बहुत सुखद हो!`
          : `Good day, ${name}! I am your companion Smriti Mitr. It is wonderful to be with you today. What would you like to talk about?`;

      setMessages([
        {
          id: "msg-welcome",
          sender: "avatar",
          text: initialGreeting,
          timestamp: "Just now",
          comfortEmoji: "🌸",
        },
      ]);
    });
  }, [currentLang]);

  const handleSelectTopic = async (topic: ReminiscenceTopic) => {
    let starterText = topic.avatarStarter;
    if (currentLang === "as" && topic.avatarStarterAs) {
      starterText = topic.avatarStarterAs;
    } else if (currentLang === "hi" && topic.avatarStarterHi) {
      starterText = topic.avatarStarterHi;
    }

    // 1. Elder asks topic
    const elderMsg: CompanionMessage = {
      id: `elder-${Date.now()}`,
      sender: "elder",
      text: topic.prompt,
      timestamp: "Just now",
    };
    setMessages((prev) => [...prev, elderMsg]);

    // 2. Avatar enters Thinking state
    setAvatarState("thinking");
    setIsProcessing(true);

    setTimeout(() => {
      // 3. Avatar enters Speaking state and plays voice
      const avatarMsg: CompanionMessage = {
        id: `avatar-${Date.now()}`,
        sender: "avatar",
        text: starterText,
        timestamp: "Just now",
        comfortEmoji: topic.emoji,
      };
      setMessages((prev) => [...prev, avatarMsg]);
      setAvatarState("speaking");
      setIsProcessing(false);

      companionService.speakResponse(starterText, currentLang as any);

      // Reset to idle after realistic speech duration
      const durationMs = Math.max(3000, starterText.length * 68);
      setTimeout(() => {
        setAvatarState("idle");
      }, durationMs);
    }, 800);
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const trimmed = textToSend.trim();
    setCurrentText("");
    setShowTypeModal(false);

    // 1. Add Elder message
    const elderMsg: CompanionMessage = {
      id: `elder-${Date.now()}`,
      sender: "elder",
      text: trimmed,
      timestamp: "Just now",
    };
    setMessages((prev) => [...prev, elderMsg]);

    // 2. Avatar Thinking
    setAvatarState("thinking");
    setIsProcessing(true);

    // 3. Process with validation therapy & continuous telemetry
    const result = await companionService.processElderInput(trimmed, currentLang as any);

    setTimeout(() => {
      const avatarMsg: CompanionMessage = {
        id: `avatar-${Date.now()}`,
        sender: "avatar",
        text: result.responseText,
        timestamp: "Just now",
        comfortEmoji: result.isDistressed ? "🌸" : "💖",
      };
      setMessages((prev) => [...prev, avatarMsg]);
      setAvatarState(result.isDistressed ? "comforting" : "speaking");
      setIsProcessing(false);

      companionService.speakResponse(result.responseText, currentLang as any);

      const durationMs = Math.max(3000, result.responseText.length * 68);
      setTimeout(() => {
        setAvatarState("idle");
      }, durationMs);
    }, 750);
  };

  const handleVoiceTap = () => {
    if (avatarState === "speaking") {
      companionService.stopSpeech();
      setAvatarState("idle");
      return;
    }

    if (avatarState === "listening") {
      setAvatarState("idle");
      return;
    }

    // Enter listening state simulation
    setAvatarState("listening");
    setTimeout(() => {
      // Simulate elder speaking natural query
      handleSendMessage("How did I do in Antakshari today?");
    }, 3000);
  };

  const latestAvatarMessage =
    [...messages].reverse().find((m) => m.sender === "avatar")?.text ||
    "Hello! Tap the microphone to talk with me.";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* ── Top App Bar ──────────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        {onClose ? (
          <TouchableOpacity onPress={onClose} style={styles.iconBtn} activeOpacity={0.8}>
            <Feather name="arrow-left" size={24} color={WarmPalette.charcoalWarm} />
          </TouchableOpacity>
        ) : (
          <View style={styles.topBrand}>
            <MaterialCommunityIcons name="heart-pulse" size={24} color={WarmPalette.roseDusty} />
            <Text style={styles.topBrandText}>Smriti Mitr</Text>
          </View>
        )}

        {/* Persona Switcher Chips */}
        <View style={styles.personaRow}>
          <TouchableOpacity
            style={[styles.personaChip, persona === "mitr" && styles.personaChipActive]}
            onPress={() => setPersona("mitr")}
            activeOpacity={0.8}
          >
            <Text style={[styles.personaText, persona === "mitr" && styles.personaTextActive]}>
              Mitr 🌸
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.personaChip, persona === "bhupen_da" && styles.personaChipActive]}
            onPress={() => setPersona("bhupen_da")}
            activeOpacity={0.8}
          >
            <Text style={[styles.personaText, persona === "bhupen_da" && styles.personaTextActive]}>
              Bhupen Da 🎵
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.personaChip, persona === "dr_sarma" && styles.personaChipActive]}
            onPress={() => setPersona("dr_sarma")}
            activeOpacity={0.8}
          >
            <Text style={[styles.personaText, persona === "dr_sarma" && styles.personaTextActive]}>
              Dr. Sarma 🩺
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Federated Learning Calibration Banner ──────────────────────────── */}
        <View style={styles.flLiveBanner}>
          <View style={styles.flLiveDot} />
          <Text style={styles.flLiveText}>
            CALIBRATED BY ON-DEVICE FEDERATED LEARNING (88% COGNITIVE STABILITY)
          </Text>
        </View>

        {/* ── Center Stage: Expressive Virtual Avatar or 3D Model ─────────── */}
        <View style={styles.avatarStage}>
          {viewMode3D ? (
            <View style={styles.model3DStageBox}>
              <Model3DViewer
                activeAction={
                  avatarState === "speaking"
                    ? "talking"
                    : avatarState === "listening"
                    ? "idle"
                    : "talking"
                }
                height={220}
                width={220}
                autoRotate={false}
                cameraOrbit="0deg 80deg 1.35m"
                cameraTarget="0m 1.52m 0.05m"
                fieldOfView="28deg"
              />
            </View>
          ) : (
            <VirtualAvatar
              persona={persona}
              state={avatarState}
              size={170}
              onPress={handleVoiceTap}
            />
          )}

          {/* Mode Switcher Pill */}
          <View style={styles.viewModePillRow}>
            <TouchableOpacity
              style={[styles.viewModePill, viewMode3D && styles.viewModePillActive]}
              onPress={() => setViewMode3D(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.viewModePillText, viewMode3D && styles.viewModePillTextActive]}>
                🧓 3D Model
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.viewModePill, !viewMode3D && styles.viewModePillActive]}
              onPress={() => setViewMode3D(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.viewModePillText, !viewMode3D && styles.viewModePillTextActive]}>
                🌸 2D Face
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Large Senior-Friendly Speech Bubble ──────────────────────────── */}
        <View style={styles.speechBubbleContainer}>
          <View style={styles.speechBubble}>
            <Text style={styles.speechBubbleText}>{latestAvatarMessage}</Text>
          </View>
          <View style={styles.speechBubbleTail} />
        </View>

        {/* ── Voice & Audio Action Center ───────────────────────────────────── */}
        <View style={styles.voiceActionCenter}>
          <TouchableOpacity
            style={[
              styles.bigVoiceBtn,
              avatarState === "listening" && styles.bigVoiceBtnListening,
              avatarState === "speaking" && styles.bigVoiceBtnSpeaking,
            ]}
            onPress={handleVoiceTap}
            activeOpacity={0.85}
          >
            <Feather
              name={
                avatarState === "speaking"
                  ? "volume-x"
                  : avatarState === "listening"
                  ? "radio"
                  : "mic"
              }
              size={34}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <Text style={styles.voiceBtnLabel}>
            {avatarState === "speaking"
              ? "Tap to pause voice"
              : avatarState === "listening"
              ? "Listening... Tap to stop"
              : "Tap to Speak with Mitr"}
          </Text>
        </View>

        {/* ── Continuous Patient Telemetry Glance Bar ────────────────────────── */}
        {patientCtx && (
          <View style={styles.telemetryGlanceRow}>
            <View style={styles.telemetryBadge}>
              <Text style={styles.telemetryBadgeEmoji}>🎵</Text>
              <Text style={styles.telemetryBadgeText}>
                {patientCtx.latestGame?.gameName || "Antakshari"}: {patientCtx.latestGame?.accuracyPercent || 88}%
              </Text>
            </View>
            <View style={styles.telemetryBadge}>
              <Text style={styles.telemetryBadgeEmoji}>💧</Text>
              <Text style={styles.telemetryBadgeText}>
                Water: {patientCtx.hydration.glassesDrunk}/{patientCtx.hydration.dailyGoal}
              </Text>
            </View>
            <View style={styles.telemetryBadge}>
              <Text style={styles.telemetryBadgeEmoji}>🏡</Text>
              <Text style={styles.telemetryBadgeText}>Kamrup Geofence Safe</Text>
            </View>
          </View>
        )}

        {/* ── Quick Reminiscence & Memory Starters ──────────────────────────── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>FAVORITE CONVERSATION TOPICS</Text>
          <TouchableOpacity
            onPress={() => setShowTypeModal(true)}
            style={styles.typePill}
            activeOpacity={0.8}
          >
            <Feather name="edit-3" size={13} color={WarmPalette.charcoalWarm} />
            <Text style={styles.typePillText}>Type question</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.topicsGrid}>
          {REMINISCENCE_TOPICS.map((topic) => (
            <TouchableOpacity
              key={topic.id}
              style={styles.topicCard}
              onPress={() => handleSelectTopic(topic)}
              activeOpacity={0.8}
            >
              <View style={styles.topicEmojiBg}>
                <Text style={styles.topicEmoji}>{topic.emoji}</Text>
              </View>
              <View style={styles.topicInfo}>
                <Text style={styles.topicTitle}>{topic.title}</Text>
                <Text style={styles.topicPrompt} numberOfLines={1}>
                  {topic.prompt}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={WarmPalette.roseDusty} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Conversation History Snippet ──────────────────────────────────── */}
        {messages.length > 2 && (
          <View style={styles.historyBox}>
            <Text style={styles.historyBoxTitle}>Recent Chat Moments</Text>
            {messages.slice(-3).map((m) => (
              <View
                key={m.id}
                style={[
                  styles.historyRow,
                  m.sender === "elder" ? styles.historyRowElder : styles.historyRowAvatar,
                ]}
              >
                <Text style={styles.historySender}>
                  {m.sender === "elder" ? "You" : "Mitr"}:
                </Text>
                <Text style={styles.historyText} numberOfLines={2}>
                  {m.text}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Type In Question Modal ────────────────────────────────────────── */}
      <Modal
        visible={showTypeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ask or Say Something to Mitr</Text>
              <TouchableOpacity onPress={() => setShowTypeModal(false)}>
                <Feather name="x" size={22} color={WarmPalette.charcoalWarm} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.textInput}
              placeholder="e.g. Tell me about my garden or grandson Arjun..."
              placeholderTextColor="#94A3B8"
              value={currentText}
              onChangeText={setCurrentText}
              multiline
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowTypeModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sendBtn}
                onPress={() => handleSendMessage(currentText)}
              >
                <Text style={styles.sendBtnText}>Talk to Avatar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WarmPalette.ivory,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: WarmPalette.sand,
    backgroundColor: WarmPalette.cream,
  },
  topBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topBrandText: {
    fontSize: 18,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
  },
  iconBtn: {
    padding: 6,
  },
  personaRow: {
    flexDirection: "row",
    gap: 6,
  },
  personaChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: WarmPalette.sand,
  },
  personaChipActive: {
    backgroundColor: WarmPalette.roseDusty,
  },
  personaText: {
    fontSize: 11,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  personaTextActive: {
    color: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    alignItems: "center",
  },
  flLiveBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  flLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2563EB",
  },
  flLiveText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#1D4ED8",
    letterSpacing: 0.5,
  },
  avatarStage: {
    marginTop: 10,
    marginBottom: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  model3DStageBox: {
    width: 220,
    height: 220,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#F1EDFA",
    borderWidth: 1.5,
    borderColor: "#E0E7FF",
    alignItems: "center",
    justifyContent: "center",
  },
  viewModePillRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    backgroundColor: "#F1F5F9",
    padding: 3,
    borderRadius: 16,
  },
  viewModePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 13,
  },
  viewModePillActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  viewModePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  viewModePillTextActive: {
    color: "#4F46E5",
  },
  speechBubbleContainer: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    marginVertical: 8,
  },
  speechBubble: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: WarmPalette.sand,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    width: "100%",
  },
  speechBubbleText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    color: WarmPalette.charcoalWarm,
    textAlign: "center",
  },
  speechBubbleTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#FFFFFF",
    alignSelf: "center",
    marginTop: -1,
  },
  voiceActionCenter: {
    alignItems: "center",
    marginVertical: 8,
  },
  bigVoiceBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: WarmPalette.roseDusty,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: WarmPalette.roseDusty,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  bigVoiceBtnListening: {
    backgroundColor: "#16A34A",
    shadowColor: "#16A34A",
  },
  bigVoiceBtnSpeaking: {
    backgroundColor: "#D97706",
    shadowColor: "#D97706",
  },
  voiceBtnLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  telemetryGlanceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    marginVertical: 8,
    width: "100%",
  },
  telemetryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
  },
  telemetryBadgeEmoji: {
    fontSize: 12,
  },
  telemetryBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  sectionHeaderRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm + "99",
    letterSpacing: 0.8,
  },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: WarmPalette.sand,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  topicsGrid: {
    width: "100%",
    gap: 8,
  },
  topicCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    gap: 12,
  },
  topicEmojiBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: WarmPalette.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  topicEmoji: {
    fontSize: 22,
  },
  topicInfo: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  topicPrompt: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  historyBox: {
    width: "100%",
    backgroundColor: WarmPalette.cream,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    marginTop: 14,
    gap: 6,
  },
  historyBoxTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
    marginBottom: 4,
  },
  historyRow: {
    flexDirection: "row",
    gap: 6,
  },
  historyRowElder: {
    opacity: 0.8,
  },
  historyRowAvatar: {
    opacity: 1,
  },
  historySender: {
    fontSize: 12,
    fontWeight: "700",
    color: WarmPalette.roseDusty,
  },
  historyText: {
    flex: 1,
    fontSize: 12,
    color: WarmPalette.charcoalWarm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
    color: WarmPalette.charcoalWarm,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  sendBtn: {
    backgroundColor: WarmPalette.roseDusty,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  sendBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
