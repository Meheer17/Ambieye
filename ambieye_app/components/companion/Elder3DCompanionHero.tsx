import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  ScrollView,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Model3DViewer, Model3DAction } from "./Model3DViewer";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import { useTranslation } from "@/constants/i18n";
import {
  companionService,
  REMINISCENCE_TOPICS,
  ReminiscenceTopic,
} from "@/services/companion/companionService";

interface Elder3DCompanionHeroProps {
  elderName?: string;
  onOpenCompanionModal?: () => void;
  onNext?: () => void;
}

export const Elder3DCompanionHero: React.FC<Elder3DCompanionHeroProps> = ({
  elderName = "Bhaben",
  onOpenCompanionModal,
  onNext,
}) => {
  const { currentLang } = useTranslation();

  const [activeAction, setActiveAction] = useState<Model3DAction>("talking");
  const [isSpeaking, setIsSpeaking] = useState(true);
  const [speechText, setSpeechText] = useState<string>("");
  const [hasSpokenInitialHello, setHasSpokenInitialHello] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [zoomMode, setZoomMode] = useState<"face" | "body">("face");
  const [autoRotate, setAutoRotate] = useState(false);

  // Pulse animation for speaking status badge
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Generate language-specific greeting
  const getGreetingText = () => {
    const firstName = elderName.split(" ")[0] || "Bhaben";
    if (currentLang === "as") {
      return `নমস্কাৰ ${firstName} দেউতা! মই আপোনাৰ প্ৰিয় বন্ধু। আজি আপোনাৰ দিনটো শুভ আৰু আনন্দদায়ক হওক!`;
    }
    if (currentLang === "hi") {
      return `नमस्ते ${firstName} जी! मैं आपका साथी हूँ। आपको देखकर बहुत खुशी हुई! आज आप कैसा महसूस कर रहे हैं?`;
    }
    return `Hello ${firstName}! I am your 3D companion. Welcome back! Everything is peaceful and safe at home.`;
  };

  // Speak on initial load as soon as app opens
  useEffect(() => {
    const greeting = getGreetingText();
    setSpeechText(greeting);
    setActiveAction("talking");
    setIsSpeaking(true);

    // Give a brief delay for audio context & model rendering
    const timer = setTimeout(() => {
      VoiceAssistant.speak(greeting, currentLang as any, () => {
        setIsSpeaking(false);
        setActiveAction("idle");
      });
      setHasSpokenInitialHello(true);
    }, 600);

    return () => {
      clearTimeout(timer);
      VoiceAssistant.stop();
    };
  }, [currentLang]);

  // Speaking pulse animation loop
  useEffect(() => {
    if (isSpeaking) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isSpeaking, pulseAnim]);

  // Handle manual "Say Hello" button tap
  const handleSayHelloAgain = () => {
    const greeting = getGreetingText();
    setSpeechText(greeting);
    setActiveAction("talking");
    setIsSpeaking(true);

    VoiceAssistant.speak(greeting, currentLang as any, () => {
      setIsSpeaking(false);
      setActiveAction("idle");
    });
  };

  // Switch animation directly
  const handleActionSwitch = (action: Model3DAction) => {
    if (action === "walking") {
      VoiceAssistant.stop();
      setIsSpeaking(false);
      setActiveAction("walking");
      setSpeechText(
        currentLang === "as"
          ? "খোজ কাঢ়ি ফুৰোঁ আহক! খোজ কঢ়াটো শৰীৰৰ বাবে বৰ ভাল।"
          : currentLang === "hi"
          ? "चलिए टहलते हैं! घूमना स्वास्थ्य के लिए बहुत अच्छा है।"
          : "Let's take a nice peaceful walk together!"
      );
    } else if (action === "talking") {
      handleSayHelloAgain();
    } else {
      VoiceAssistant.stop();
      setIsSpeaking(false);
      setActiveAction("idle");
      setSpeechText(
        currentLang === "as"
          ? "মই ইয়াতেই আছোঁ। যেতিয়াই কিবা সুধিব লাগে কওক।"
          : currentLang === "hi"
          ? "मैं यहीं हूँ। जब भी कुछ पूछना हो, बताइए।"
          : "I am right here with you. Ready whenever you need me."
      );
    }
  };

  // Ask a prompt topic
  const handleTopicAsk = (topic: ReminiscenceTopic) => {
    let response = topic.avatarStarter;
    if (currentLang === "as" && topic.avatarStarterAs) {
      response = topic.avatarStarterAs;
    } else if (currentLang === "hi" && topic.avatarStarterHi) {
      response = topic.avatarStarterHi;
    }

    setSpeechText(response);
    setActiveAction("talking");
    setIsSpeaking(true);

    VoiceAssistant.speak(response, currentLang as any, () => {
      setIsSpeaking(false);
      setActiveAction("idle");
    });
  };

  return (
    <View style={styles.cardContainer}>
      {/* ── Top Header Row ────────────────────────────────────────── */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.badge3D}>
            <Text style={styles.badge3DText}>3D MODEL</Text>
          </View>
          <Text style={styles.headerTitle}>Elder Companion · 🧓</Text>
        </View>

        <View style={styles.headerActions}>
          {/* Action indicator pill */}
          <View
            style={[
              styles.statusPill,
              activeAction === "talking"
                ? styles.statusPillTalking
                : activeAction === "walking"
                ? styles.statusPillWalking
                : styles.statusPillIdle,
            ]}
          >
            <Animated.View
              style={[
                styles.statusDot,
                {
                  transform: [{ scale: isSpeaking ? pulseAnim : 1 }],
                  backgroundColor:
                    activeAction === "talking"
                      ? "#10B981"
                      : activeAction === "walking"
                      ? "#3B82F6"
                      : "#94A3B8",
                },
              ]}
            />
            <Text
              style={[
                styles.statusPillText,
                {
                  color:
                    activeAction === "talking"
                      ? "#047857"
                      : activeAction === "walking"
                      ? "#1D4ED8"
                      : "#475569",
                },
              ]}
            >
              {activeAction === "talking"
                ? isSpeaking
                  ? "Talking..."
                  : "Talk"
                : activeAction === "walking"
                ? "Walking..."
                : "Idle"}
            </Text>
          </View>

          {/* Expand Modal Icon */}
          {onOpenCompanionModal && (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={onOpenCompanionModal}
              activeOpacity={0.8}
            >
              <Feather name="maximize-2" size={13} color="#4F46E5" />
            </TouchableOpacity>
          )}

          {/* Toggle size */}
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setIsCompact(!isCompact)}
            activeOpacity={0.8}
          >
            <Feather
              name={isCompact ? "chevron-down" : "chevron-up"}
              size={14}
              color="#4F46E5"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 3D Viewport ────────────────────────────────────────────── */}
      <View style={[styles.modelStage, isCompact && { height: 180 }]}>
        <Model3DViewer
          activeAction={activeAction}
          height={isCompact ? 180 : 250}
          autoRotate={autoRotate}
          cameraOrbit={zoomMode === "face" ? "0deg 80deg 1.35m" : "0deg 75deg 3.5m"}
          cameraTarget={zoomMode === "face" ? "0m 1.52m 0.05m" : "0m 0.95m 0m"}
          fieldOfView={zoomMode === "face" ? "28deg" : "38deg"}
          onActionChange={(act) => setActiveAction(act)}
        />

        {/* Floating Camera Badges */}
        <View style={styles.stageOverlayControls}>
          {/* Zoom Toggle Pill */}
          <TouchableOpacity
            style={styles.stageControlPill}
            onPress={() => setZoomMode(zoomMode === "face" ? "body" : "face")}
            activeOpacity={0.8}
          >
            <Feather
              name={zoomMode === "face" ? "zoom-out" : "zoom-in"}
              size={11}
              color="#4F46E5"
            />
            <Text style={styles.stageControlText}>
              {zoomMode === "face" ? "Face Zoom" : "Full Body"}
            </Text>
          </TouchableOpacity>

          {/* Rotate hint badge */}
          <TouchableOpacity
            style={[styles.stageControlPill, autoRotate && styles.stageControlPillActive]}
            onPress={() => setAutoRotate(!autoRotate)}
            activeOpacity={0.8}
          >
            <Feather
              name="rotate-cw"
              size={11}
              color={autoRotate ? "#FFFFFF" : "#6366F1"}
            />
            <Text
              style={[
                styles.stageControlText,
                autoRotate && styles.stageControlTextActive,
              ]}
            >
              {autoRotate ? "Auto Rotating" : "360° Rotate"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Conversational Speech Subtitle Bubble ────────────────────── */}
      <View style={styles.speechBubbleWrapper}>
        <View style={styles.speakerAvatarCircle}>
          <Text style={{ fontSize: 16 }}>🗣️</Text>
        </View>
        <View style={styles.speechBubble}>
          <View style={styles.bubbleSpeakerTitleRow}>
            <Text style={styles.speakerName}>Smriti Mitr (3D Elder)</Text>
            {isSpeaking && (
              <View style={styles.speakingWaveRow}>
                <View style={[styles.soundBar, { height: 8 }]} />
                <View style={[styles.soundBar, { height: 14 }]} />
                <View style={[styles.soundBar, { height: 10 }]} />
              </View>
            )}
          </View>
          <Text style={styles.speechBodyText}>{speechText}</Text>
        </View>
      </View>

      {/* ── Control Action Buttons (Walk / Talk / Say Hello / Pause) ── */}
      <View style={styles.controlRow}>
        <TouchableOpacity
          style={[
            styles.actionChip,
            activeAction === "talking" && styles.actionChipActive,
          ]}
          onPress={() => handleActionSwitch("talking")}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="account-voice"
            size={17}
            color={activeAction === "talking" ? "#FFFFFF" : "#4F46E5"}
          />
          <Text
            style={[
              styles.actionChipText,
              activeAction === "talking" && styles.actionChipTextActive,
            ]}
          >
            🗣️ Say Hello
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionChip,
            activeAction === "walking" && styles.actionChipActive,
          ]}
          onPress={() => handleActionSwitch("walking")}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="walk"
            size={17}
            color={activeAction === "walking" ? "#FFFFFF" : "#4F46E5"}
          />
          <Text
            style={[
              styles.actionChipText,
              activeAction === "walking" && styles.actionChipTextActive,
            ]}
          >
            🚶 Walk
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionChip,
            activeAction === "idle" && styles.actionChipActive,
          ]}
          onPress={() => handleActionSwitch("idle")}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="pause-circle-outline"
            size={17}
            color={activeAction === "idle" ? "#FFFFFF" : "#64748B"}
          />
          <Text
            style={[
              styles.actionChipText,
              activeAction === "idle" && styles.actionChipTextActive,
            ]}
          >
            ⏹️ Rest
          </Text>
        </TouchableOpacity>

        {onNext && (
          <TouchableOpacity
            style={styles.nextStepBtn}
            onPress={onNext}
            activeOpacity={0.85}
          >
            <Text style={styles.nextStepBtnText}>Next Step</Text>
            <Feather name="arrow-right" size={13} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Quick Topic Prompts ─────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.promptRow}
      >
        {REMINISCENCE_TOPICS.map((topic) => (
          <TouchableOpacity
            key={topic.id}
            style={styles.topicChip}
            onPress={() => handleTopicAsk(topic)}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 13 }}>{topic.emoji}</Text>
            <Text style={styles.topicChipText} numberOfLines={1}>
              {topic.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#FAF8FD",
    borderRadius: 22,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#E5DEFF",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge3D: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badge3DText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusPillTalking: {
    backgroundColor: "#D1FAE5",
  },
  statusPillWalking: {
    backgroundColor: "#DBEAFE",
  },
  statusPillIdle: {
    backgroundColor: "#F1F5F9",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  headerIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  modelStage: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#F1EDFA",
    position: "relative",
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  stageOverlayControls: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    gap: 6,
  },
  stageControlPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E7FF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  stageControlPillActive: {
    backgroundColor: "#6366F1",
    borderColor: "#4F46E5",
  },
  stageControlText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4F46E5",
  },
  stageControlTextActive: {
    color: "#FFFFFF",
  },
  speechBubbleWrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 10,
    marginBottom: 8,
  },
  speakerAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    marginTop: 2,
  },
  speechBubble: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E0E7FF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleSpeakerTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  speakerName: {
    fontSize: 11,
    fontWeight: "800",
    color: "#4F46E5",
  },
  speakingWaveRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  soundBar: {
    width: 2.5,
    backgroundColor: "#10B981",
    borderRadius: 1,
  },
  speechBodyText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: "#1E293B",
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  actionChipActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4338CA",
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4F46E5",
  },
  actionChipTextActive: {
    color: "#FFFFFF",
  },
  nextStepBtn: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: "#10B981",
  },
  nextStepBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  promptRow: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 2,
  },
  topicChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  topicChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
    maxWidth: 130,
  },
});
