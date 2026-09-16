import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
  Platform,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTranslation } from "@/constants/i18n";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import { Colors, BorderRadius, Shadows, Spacing } from "@/constants/theme";

const { width } = Dimensions.get("window");

interface CalmCornerModalProps {
  visible: boolean;
  onClose: () => void;
}

type BreathingPattern = "gentle" | "simple" | "deep";
type CalmTab = "breathing" | "affirmations" | "grounding";

const AFFIRMATIONS = [
  "You are safe, loved, and supported in this moment.",
  "Take one gentle breath at a time. There is no rush.",
  "Your mind is capable of peace and calm right now.",
  "Surround yourself with kindness. You are doing well.",
  "Peace begins with this simple breath.",
  "You have overcome challenges before, and you are strong today.",
];

const GROUNDING_STEPS = [
  { step: 5, icon: "eye", title: "5 Things You Can See", prompt: "Look around your room: a window, a flower, a clock, a photo, your hands." },
  { step: 4, icon: "hand", title: "4 Things You Can Touch", prompt: "Feel the texture of your shirt, the warm chair, your blanket, a teacup." },
  { step: 3, icon: "headphones", title: "3 Sounds You Can Hear", prompt: "Listen for birds chirping, the breeze outside, gentle house sounds." },
  { step: 2, icon: "flower", title: "2 Things You Can Smell", prompt: "Notice the scent of fresh tea leaves, flowers, or clean morning air." },
  { step: 1, icon: "heart", title: "1 Thing You Love / Feel", prompt: "Feel the warmth in your chest. You are safe and cared for." },
];

export default function CalmCornerModal({ visible, onClose }: CalmCornerModalProps) {
  const { currentLang } = useTranslation();
  const [activeTab, setActiveTab] = useState<CalmTab>("breathing");

  // Breathing State
  const [pattern, setPattern] = useState<BreathingPattern>("gentle");
  const [breathPhase, setBreathPhase] = useState<"Inhale" | "Hold" | "Exhale">("Inhale");
  const [cycleSecondsLeft, setCycleSecondsLeft] = useState(4);
  const breathAnim = useRef(new Animated.Value(1)).current;
  const isBreathingActive = useRef(true);

  // Affirmations State
  const [currentAffirmationIndex, setCurrentAffirmationIndex] = useState(0);

  // Grounding Step
  const [activeGroundingStep, setActiveGroundingStep] = useState(0);

  // Breathing Animation Cycle
  useEffect(() => {
    if (!visible || activeTab !== "breathing") return;

    isBreathingActive.current = true;

    const runBreathingCycle = () => {
      if (!isBreathingActive.current) return;

      if (pattern === "gentle") {
        // 4s Inhale, 4s Exhale
        setBreathPhase("Inhale");
        Animated.timing(breathAnim, {
          toValue: 1.4,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }).start(() => {
          if (!isBreathingActive.current) return;
          setBreathPhase("Exhale");
          Animated.timing(breathAnim, {
            toValue: 1.0,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: Platform.OS !== "web",
          }).start(() => {
            if (isBreathingActive.current) runBreathingCycle();
          });
        });
      } else if (pattern === "simple") {
        // 4s Inhale, 2s Hold, 4s Exhale
        setBreathPhase("Inhale");
        Animated.timing(breathAnim, {
          toValue: 1.4,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }).start(() => {
          if (!isBreathingActive.current) return;
          setBreathPhase("Hold");
          setTimeout(() => {
            if (!isBreathingActive.current) return;
            setBreathPhase("Exhale");
            Animated.timing(breathAnim, {
              toValue: 1.0,
              duration: 4000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: Platform.OS !== "web",
            }).start(() => {
              if (isBreathingActive.current) runBreathingCycle();
            });
          }, 2000);
        });
      } else {
        // Deep 4-7-8 Relaxation (4s Inhale, 7s Hold, 8s Exhale)
        setBreathPhase("Inhale");
        Animated.timing(breathAnim, {
          toValue: 1.5,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }).start(() => {
          if (!isBreathingActive.current) return;
          setBreathPhase("Hold");
          setTimeout(() => {
            if (!isBreathingActive.current) return;
            setBreathPhase("Exhale");
            Animated.timing(breathAnim, {
              toValue: 1.0,
              duration: 8000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: Platform.OS !== "web",
            }).start(() => {
              if (isBreathingActive.current) runBreathingCycle();
            });
          }, 7000);
        });
      }
    };

    runBreathingCycle();

    return () => {
      isBreathingActive.current = false;
      breathAnim.stopAnimation();
    };
  }, [visible, activeTab, pattern, breathAnim]);

  const handleReadAffirmation = () => {
    VoiceAssistant.speak(AFFIRMATIONS[currentAffirmationIndex], currentLang);
  };

  const handleNextAffirmation = () => {
    setCurrentAffirmationIndex((prev) => (prev + 1) % AFFIRMATIONS.length);
  };

  const handlePrevAffirmation = () => {
    setCurrentAffirmationIndex((prev) => (prev === 0 ? AFFIRMATIONS.length - 1 : prev - 1));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ fontSize: 24 }}>🌙</Text>
              <View>
                <Text style={styles.title}>Calm Corner</Text>
                <Text style={styles.subtitle}>Gentle sensory relaxation & anxiety relief</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Sub Navigation Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "breathing" && styles.tabBtnActive]}
              onPress={() => setActiveTab("breathing")}
            >
              <Text style={[styles.tabBtnText, activeTab === "breathing" && styles.tabBtnTextActive]}>
                🌬️ Breathing
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "affirmations" && styles.tabBtnActive]}
              onPress={() => setActiveTab("affirmations")}
            >
              <Text style={[styles.tabBtnText, activeTab === "affirmations" && styles.tabBtnTextActive]}>
                ✨ Affirmations
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "grounding" && styles.tabBtnActive]}
              onPress={() => setActiveTab("grounding")}
            >
              <Text style={[styles.tabBtnText, activeTab === "grounding" && styles.tabBtnTextActive]}>
                🧘 5-4-3-2-1
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* ════════════ TAB 1: BREATHING ════════════ */}
            {activeTab === "breathing" && (
              <View style={styles.breathingSection}>
                {/* Pattern Selector */}
                <View style={styles.patternPillsRow}>
                  <TouchableOpacity
                    style={[styles.patternPill, pattern === "gentle" && styles.patternPillActive]}
                    onPress={() => setPattern("gentle")}
                  >
                    <Text style={[styles.patternPillText, pattern === "gentle" && styles.patternPillTextActive]}>
                      Gentle Calm (4-4)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.patternPill, pattern === "simple" && styles.patternPillActive]}
                    onPress={() => setPattern("simple")}
                  >
                    <Text style={[styles.patternPillText, pattern === "simple" && styles.patternPillTextActive]}>
                      Simple Breath (4-2-4)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.patternPill, pattern === "deep" && styles.patternPillActive]}
                    onPress={() => setPattern("deep")}
                  >
                    <Text style={[styles.patternPillText, pattern === "deep" && styles.patternPillTextActive]}>
                      Deep Relaxation (4-7-8)
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Animated Breathing Circle */}
                <View style={styles.circleContainer}>
                  <Animated.View
                    style={[
                      styles.breathCircleOuter,
                      {
                        transform: [{ scale: breathAnim }],
                        backgroundColor:
                          breathPhase === "Inhale"
                            ? "#DBEAFE"
                            : breathPhase === "Hold"
                            ? "#FEF3C7"
                            : "#DCFCE7",
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.breathCircleInner,
                        {
                          backgroundColor:
                            breathPhase === "Inhale"
                              ? "#2563EB"
                              : breathPhase === "Hold"
                              ? "#D97706"
                              : "#16A34A",
                        },
                      ]}
                    >
                      <Text style={styles.phaseText}>{breathPhase}</Text>
                      <Text style={styles.phaseSubText}>
                        {breathPhase === "Inhale"
                          ? "Breathe in peace..."
                          : breathPhase === "Hold"
                          ? "Gently hold..."
                          : "Release tension..."}
                      </Text>
                    </View>
                  </Animated.View>
                </View>

                <Text style={styles.breathingTip}>
                  Follow the expanding and shrinking circle at a comfortable pace.
                </Text>
              </View>
            )}

            {/* ════════════ TAB 2: AFFIRMATIONS ════════════ */}
            {activeTab === "affirmations" && (
              <View style={styles.affirmationSection}>
                <View style={styles.affirmationCard}>
                  <Text style={styles.quoteIcon}>“</Text>
                  <Text style={styles.affirmationText}>{AFFIRMATIONS[currentAffirmationIndex]}</Text>

                  <View style={styles.affirmationCounter}>
                    <Text style={styles.counterText}>
                      {currentAffirmationIndex + 1} of {AFFIRMATIONS.length}
                    </Text>
                  </View>

                  <View style={styles.affirmationControls}>
                    <TouchableOpacity style={styles.navBtn} onPress={handlePrevAffirmation}>
                      <Feather name="chevron-left" size={22} color="#2563EB" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.voiceAffirmationBtn} onPress={handleReadAffirmation}>
                      <Feather name="volume-2" size={20} color="#FFFFFF" />
                      <Text style={styles.voiceAffirmationText}>Listen</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.navBtn} onPress={handleNextAffirmation}>
                      <Feather name="chevron-right" size={22} color="#2563EB" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* ════════════ TAB 3: 5-4-3-2-1 GROUNDING ════════════ */}
            {activeTab === "grounding" && (
              <View style={styles.groundingSection}>
                <Text style={styles.groundingHeader}>
                  A sensory exercise to reconnect when feeling overwhelmed or confused:
                </Text>

                {GROUNDING_STEPS.map((item, idx) => {
                  const isCurrent = activeGroundingStep === idx;
                  return (
                    <TouchableOpacity
                      key={item.step}
                      style={[styles.groundingCard, isCurrent && styles.groundingCardActive]}
                      onPress={() => setActiveGroundingStep(idx)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.stepBadge,
                          isCurrent ? { backgroundColor: "#2563EB" } : { backgroundColor: "#E2E8F0" },
                        ]}
                      >
                        <Text style={[styles.stepNum, isCurrent ? { color: "#FFF" } : { color: "#475569" }]}>
                          {item.step}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.stepTitle, isCurrent && { color: "#1E40AF" }]}>
                          {item.title}
                        </Text>
                        <Text style={styles.stepPrompt}>{item.prompt}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    paddingTop: Spacing.md,
    ...Shadows.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 12,
    color: "#64748B",
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  tabBtnActive: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1.5,
    borderColor: "#3B82F6",
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  tabBtnTextActive: {
    color: "#1E40AF",
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  breathingSection: {
    alignItems: "center",
  },
  patternPillsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: Spacing.lg,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  patternPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  patternPillActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  patternPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  patternPillTextActive: {
    color: "#1E40AF",
  },
  circleContainer: {
    width: 260,
    height: 260,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: Spacing.lg,
  },
  breathCircleOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    justifyContent: "center",
    alignItems: "center",
    ...Shadows.md,
  },
  breathCircleInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  phaseText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  phaseSubText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginTop: 4,
  },
  breathingTip: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: Spacing.md,
  },
  affirmationSection: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  affirmationCard: {
    width: "100%",
    backgroundColor: "#FFFBEB",
    borderRadius: BorderRadius.xxl,
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    padding: Spacing.xl,
    alignItems: "center",
    ...Shadows.sm,
  },
  quoteIcon: {
    fontSize: 48,
    color: "#F59E0B",
    lineHeight: 48,
    marginBottom: -10,
  },
  affirmationText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#78350F",
    textAlign: "center",
    lineHeight: 30,
    marginBottom: Spacing.lg,
  },
  affirmationCounter: {
    marginBottom: Spacing.lg,
  },
  counterText: {
    fontSize: 12,
    color: "#B45309",
    fontWeight: "600",
  },
  affirmationControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  voiceAffirmationBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: BorderRadius.xl,
    gap: 8,
    ...Shadows.sm,
  },
  voiceAffirmationText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  groundingSection: {
    gap: 10,
  },
  groundingHeader: {
    fontSize: 13,
    color: "#475569",
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  groundingCard: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
    gap: 12,
  },
  groundingCardActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  stepBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  stepNum: {
    fontSize: 18,
    fontWeight: "900",
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 2,
  },
  stepPrompt: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 16,
  },
});
