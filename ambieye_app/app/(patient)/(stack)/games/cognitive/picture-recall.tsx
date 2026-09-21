import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { saveGameResult } from "@/utils/gameUtils";
import { useTranslation } from "@/constants/i18n";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import { Colors, BorderRadius, Shadows, Spacing } from "@/constants/theme";

const { width } = Dimensions.get("window");

interface ItemData {
  id: string;
  name: string;
  emoji: string;
  category: string;
}

const ALL_ITEMS: ItemData[] = [
  { id: "1", name: "Tea Leaf", emoji: "🍃", category: "Nature" },
  { id: "2", name: "Brass Xorai", emoji: "🏆", category: "Heritage" },
  { id: "3", name: "Hornbill", emoji: "🦅", category: "Animals" },
  { id: "4", name: "Puan Shawl", emoji: "🌸", category: "Attire" },
  { id: "5", name: "Bihu Dhol", emoji: "🥁", category: "Music" },
  { id: "6", name: "Gamosa", emoji: "🧣", category: "Heritage" },
  { id: "7", name: "Bamboo Flute", emoji: "🎋", category: "Music" },
  { id: "8", name: "Water Teapot", emoji: "🫖", category: "Home" },
  { id: "9", name: "Sun Flower", emoji: "🌻", category: "Nature" },
  { id: "10", name: "Wooden Boat", emoji: "🛶", category: "Travel" },
  { id: "11", name: "Clay Lamp", emoji: "🪔", category: "Culture" },
  { id: "12", name: "Fresh Mango", emoji: "🥭", category: "Food" },
];

export default function PictureRecallGame() {
  const router = useRouter();
  const { t, currentLang } = useTranslation();

  const [gameState, setGameState] = useState<"intro" | "memorize" | "recall" | "result">("intro");
  const [round, setRound] = useState(1);
  const [totalRounds] = useState(3);
  const [score, setScore] = useState(0);
  const [memorizeCountdown, setMemorizeCountdown] = useState(6);

  const [targetItems, setTargetItems] = useState<ItemData[]>([]);
  const [choiceItems, setChoiceItems] = useState<ItemData[]>([]);
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [gameStartTime, setGameStartTime] = useState(0);

  const timerAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      VoiceAssistant.stop();
    };
  }, []);

  const startNewGame = () => {
    setScore(0);
    setRound(1);
    setGameStartTime(Date.now());
    VoiceAssistant.speak("Picture Recall. Memorize the items shown on screen.", currentLang);
    startRound(1);
  };

  const startRound = (roundNum: number) => {
    setRound(roundNum);
    setSelectedChoices([]);

    // Select 3 items to memorize for round 1, 4 items for round 2 & 3
    const countToMemorize = roundNum === 1 ? 3 : 4;
    const shuffled = [...ALL_ITEMS].sort(() => 0.5 - Math.random());
    const targets = shuffled.slice(0, countToMemorize);
    const decoys = shuffled.slice(countToMemorize, countToMemorize + 4);
    const choices = [...targets, ...decoys].sort(() => 0.5 - Math.random());

    setTargetItems(targets);
    setChoiceItems(choices);
    setMemorizeCountdown(6);
    setGameState("memorize");

    // Start countdown
    timerAnim.setValue(1);
    Animated.timing(timerAnim, {
      toValue: 0,
      duration: 6000,
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    let interval: any;
    if (gameState === "memorize") {
      interval = setInterval(() => {
        setMemorizeCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setGameState("recall");
            VoiceAssistant.speak("Now pick the items you saw!", currentLang);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState, currentLang]);

  const toggleChoice = (id: string) => {
    if (selectedChoices.includes(id)) {
      setSelectedChoices(selectedChoices.filter((item) => item !== id));
    } else {
      if (selectedChoices.length < targetItems.length) {
        setSelectedChoices([...selectedChoices, id]);
      }
    }
  };

  const handleVerifyRecall = async () => {
    const targetIds = targetItems.map((item) => item.id);
    let roundCorrect = 0;
    selectedChoices.forEach((id) => {
      if (targetIds.includes(id)) {
        roundCorrect += 1;
      }
    });

    const roundScore = Math.round((roundCorrect / targetItems.length) * 100);
    setScore((prev) => prev + roundScore);

    if (round < totalRounds) {
      startRound(round + 1);
    } else {
      const finalScore = Math.round((score + roundScore) / totalRounds);
      setGameState("result");
      const durationSec = Math.round((Date.now() - gameStartTime) / 1000);
      await saveGameResult({
        gameId: 2,
        score: finalScore,
        duration: durationSec,
        date: new Date().toISOString().split("T")[0],
        details: {
          roundsCompleted: totalRounds,
          accuracy: finalScore,
        },
      });
      VoiceAssistant.speak(`Game complete! Your memory score is ${finalScore}%`, currentLang);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/(patient)/games" as any)} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Picture Recall</Text>
        <View style={styles.roundBadge}>
          <Text style={styles.roundBadgeText}>Round {round}/{totalRounds}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ════════════ INTRO SCREEN ════════════ */}
        {gameState === "intro" && (
          <View style={styles.introCard}>
            <Text style={{ fontSize: 54, marginBottom: 12 }}>🖼️</Text>
            <Text style={styles.introTitle}>Picture Recall Exercise</Text>
            <Text style={styles.introDesc}>
              Memorize the items shown on screen during the countdown timer. Then select the correct items from the memory choices.
            </Text>
            <TouchableOpacity style={styles.startBtn} onPress={startNewGame} activeOpacity={0.85}>
              <Feather name="play" size={20} color="#FFFFFF" />
              <Text style={styles.startBtnText}>Start Exercise</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ════════════ MEMORIZE PHASE ════════════ */}
        {gameState === "memorize" && (
          <View style={styles.gamePhaseContainer}>
            <View style={styles.phaseAlert}>
              <Text style={styles.phaseAlertTitle}>👀 Memorize These Items!</Text>
              <Text style={styles.phaseCountdownText}>{memorizeCountdown}s remaining</Text>
            </View>

            <View style={styles.itemsGrid}>
              {targetItems.map((item) => (
                <View key={item.id} style={styles.targetItemCard}>
                  <Text style={styles.itemEmoji}>{item.emoji}</Text>
                  <Text style={styles.itemName}>{item.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ════════════ RECALL PHASE ════════════ */}
        {gameState === "recall" && (
          <View style={styles.gamePhaseContainer}>
            <View style={styles.recallPromptCard}>
              <Text style={styles.recallPromptTitle}>Which items did you see?</Text>
              <Text style={styles.recallPromptSub}>
                Selected: {selectedChoices.length} / {targetItems.length}
              </Text>
            </View>

            <View style={styles.choicesGrid}>
              {choiceItems.map((item) => {
                const isSelected = selectedChoices.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.choiceCard, isSelected && styles.choiceCardSelected]}
                    onPress={() => toggleChoice(item.id)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.choiceEmoji}>{item.emoji}</Text>
                    <Text style={[styles.choiceName, isSelected && styles.choiceNameSelected]}>
                      {item.name}
                    </Text>
                    {isSelected && (
                      <View style={styles.checkIcon}>
                        <Feather name="check" size={16} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, selectedChoices.length === 0 && { opacity: 0.5 }]}
              onPress={handleVerifyRecall}
              disabled={selectedChoices.length === 0}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>Check Answer</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ════════════ RESULT SCREEN ════════════ */}
        {gameState === "result" && (
          <View style={styles.resultCard}>
            <Text style={{ fontSize: 56, marginBottom: 10 }}>🎉</Text>
            <Text style={styles.resultTitle}>Exercise Complete!</Text>
            <Text style={styles.resultScoreText}>{score} / 100</Text>
            <Text style={styles.resultDesc}>
              Great job practicing visual retention and item recall.
            </Text>

            <View style={styles.resultActions}>
              <TouchableOpacity style={styles.retryBtn} onPress={startNewGame}>
                <Feather name="refresh-cw" size={18} color="#2563EB" />
                <Text style={styles.retryBtnText}>Play Again</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace("/(patient)/games" as any)}>
                <Text style={styles.doneBtnText}>Back to Games</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  roundBadge: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roundBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  content: {
    padding: Spacing.lg,
  },
  introCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    ...Shadows.md,
    marginTop: Spacing.lg,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },
  introDesc: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: BorderRadius.xl,
    gap: 10,
    ...Shadows.md,
  },
  startBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  gamePhaseContainer: {
    width: "100%",
  },
  phaseAlert: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1.5,
    borderColor: "#FCD34D",
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  phaseAlertTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#92400E",
  },
  phaseCountdownText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#B45309",
    marginTop: 2,
  },
  itemsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    justifyContent: "center",
  },
  targetItemCard: {
    width: (width - Spacing.lg * 3) / 2,
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#3B82F6",
    ...Shadows.md,
  },
  itemEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  recallPromptCard: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  recallPromptTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1E40AF",
  },
  recallPromptSub: {
    fontSize: 13,
    color: "#3B82F6",
    fontWeight: "600",
    marginTop: 2,
  },
  choicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  choiceCard: {
    width: (width - Spacing.lg * 3) / 2,
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    position: "relative",
  },
  choiceCardSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
    ...Shadows.sm,
  },
  choiceEmoji: {
    fontSize: 40,
    marginBottom: 6,
  },
  choiceName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  choiceNameSelected: {
    color: "#1E40AF",
    fontWeight: "800",
  },
  checkIcon: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtn: {
    backgroundColor: "#2563EB",
    borderRadius: BorderRadius.xl,
    paddingVertical: 15,
    alignItems: "center",
    ...Shadows.md,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    ...Shadows.md,
    marginTop: Spacing.md,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  resultScoreText: {
    fontSize: 36,
    fontWeight: "900",
    color: "#16A34A",
    marginBottom: 8,
  },
  resultDesc: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  resultActions: {
    width: "100%",
    gap: 10,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    borderRadius: BorderRadius.xl,
    paddingVertical: 14,
    gap: 8,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#2563EB",
  },
  doneBtn: {
    backgroundColor: "#2563EB",
    borderRadius: BorderRadius.xl,
    paddingVertical: 14,
    alignItems: "center",
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
