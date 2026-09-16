import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { gameSessionService } from "@/services/games";
import { companionContextService } from "@/services/companion";
import { caregiverStorage, CognitiveGameSession } from "@/utils/caregiverStorage";
import { useTranslation } from "@/constants/i18n";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import { Colors, BorderRadius, Shadows, Spacing } from "@/constants/theme";

const { width } = Dimensions.get("window");

// ── Types ────────────────────────────────────────────────────────────────────
export interface NumberCardItem {
  id: string;
  value: number;
  isTapped: boolean;
  orderRank: number | null; // 1 for 1st tapped, 2 for 2nd tapped, etc.
}

export interface RoundConfig {
  roundNumber: number;
  count: number;
  minRange: number;
  maxRange: number;
  difficultyLabel: string;
  difficultyKey: "easy" | "easy_medium" | "medium" | "challenging" | "mastery";
}

export const TOTAL_ROUNDS = 5;
export const BASE_POINTS_PER_ROUND = 100;
export const HINT_PENALTY_POINTS = 10;

// Progressive Round Specifications:
// Round 1-2: 4 numbers
// Round 3-4: 5 numbers
// Round 5: 6 numbers
export const ROUND_CONFIGS: Record<number, RoundConfig> = {
  1: {
    roundNumber: 1,
    count: 4,
    minRange: 1,
    maxRange: 20,
    difficultyLabel: "Level 1 · 4 Numbers (1–20)",
    difficultyKey: "easy",
  },
  2: {
    roundNumber: 2,
    count: 4,
    minRange: 5,
    maxRange: 35,
    difficultyLabel: "Level 2 · 4 Numbers (5–35)",
    difficultyKey: "easy_medium",
  },
  3: {
    roundNumber: 3,
    count: 5,
    minRange: 10,
    maxRange: 50,
    difficultyLabel: "Level 3 · 5 Numbers (10–50)",
    difficultyKey: "medium",
  },
  4: {
    roundNumber: 4,
    count: 5,
    minRange: 10,
    maxRange: 75,
    difficultyLabel: "Level 4 · 5 Numbers (10–75)",
    difficultyKey: "challenging",
  },
  5: {
    roundNumber: 5,
    count: 6,
    minRange: 1,
    maxRange: 99,
    difficultyLabel: "Level 5 · 6 Numbers (1–99)",
    difficultyKey: "mastery",
  },
};

export default function NumberOrderScreen() {
  const router = useRouter();
  const { t, currentLang } = useTranslation();

  // ── Gameplay State ─────────────────────────────────────────────────────────
  const [round, setRound] = useState<number>(1);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [currentConfig, setCurrentConfig] = useState<RoundConfig>(ROUND_CONFIGS[1]);
  const [cards, setCards] = useState<NumberCardItem[]>([]);
  const [sortedValues, setSortedValues] = useState<number[]>([]);
  const [userTappedValues, setUserTappedValues] = useState<number[]>([]);
  const [wrongCardId, setWrongCardId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<number>(1);
  const [roundScore, setRoundScore] = useState<number>(0);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isCorrectFeedback, setIsCorrectFeedback] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [hintUsedInRound, setHintUsedInRound] = useState<boolean>(false);
  const [hintCardId, setHintCardId] = useState<string | null>(null);

  // ── Telemetry & Resilience State ───────────────────────────────────────────
  const sessionIdRef = useRef<string | null>(null);
  const gameStartTimeRef = useRef<number>(Date.now());
  const roundStartTimeRef = useRef<number>(Date.now());
  const totalMistakesRef = useRef<number>(0);
  const isCompletedRef = useRef<boolean>(false);
  const isAbandonedRef = useRef<boolean>(false);

  // ── Animations ─────────────────────────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // ── Helper: Generate Random Unique Numbers ──────────────────────────────────
  const generateNumbersForRound = useCallback((config: RoundConfig) => {
    const numbersSet = new Set<number>();
    while (numbersSet.size < config.count) {
      const num =
        Math.floor(Math.random() * (config.maxRange - config.minRange + 1)) +
        config.minRange;
      numbersSet.add(num);
    }
    const numbers = Array.from(numbersSet);
    const sorted = [...numbers].sort((a, b) => a - b);
    const shuffled = [...numbers].sort(() => 0.5 - Math.random());

    const initialCards: NumberCardItem[] = shuffled.map((val, idx) => ({
      id: `card_${config.roundNumber}_${idx}_${val}`,
      value: val,
      isTapped: false,
      orderRank: null,
    }));

    return { cards: initialCards, sorted, numbersShown: shuffled };
  }, []);

  // ── 1. Start / Setup Round ─────────────────────────────────────────────────
  const setupRound = useCallback(
    async (roundNum: number) => {
      const config = ROUND_CONFIGS[roundNum] || ROUND_CONFIGS[1];
      const { cards: initialCards, sorted, numbersShown } = generateNumbersForRound(config);

      setRound(roundNum);
      setCurrentConfig(config);
      setCards(initialCards);
      setSortedValues(sorted);
      setUserTappedValues([]);
      setWrongCardId(null);
      setHintCardId(null);
      setAttempts(1);
      setHintUsedInRound(false);
      setFeedbackMessage(null);
      setIsProcessing(false);
      roundStartTimeRef.current = Date.now();

      // Fade animation
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();

      // Record round_started event
      if (sessionIdRef.current) {
        try {
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "number_order",
            eventType: "round_started",
            metadata: {
              round: roundNum,
              difficulty: config.difficultyKey,
              difficultyLabel: config.difficultyLabel,
              numbersShown,
              correctOrdering: sorted,
              count: config.count,
            },
          });
        } catch {
          // Non-blocking
        }
      }

      // Voice prompt: gentle instruction
      try {
        const prompt =
          currentLang === "as"
            ? "সকলোতকৈ সৰু সংখ্যাৰ পৰা আৰম্ভ কৰি ক্ৰমত স্পৰ্শ কৰক"
            : currentLang === "hi"
            ? "सबसे छोटी संख्या से शुरू करके क्रम में चुनें"
            : "Tap the numbers from smallest to largest";
        VoiceAssistant.speak(prompt, currentLang);
      } catch {
        // Optional voice
      }
    },
    [generateNumbersForRound, currentLang, fadeAnim]
  );

  // ── 2. Initialize Game Session on Mount ─────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    gameStartTimeRef.current = Date.now();

    const init = async () => {
      try {
        const session = await gameSessionService.startSession({
          gameId: "number_order",
          metadata: {
            gameTitle: "Number Order",
            totalRounds: TOTAL_ROUNDS,
            mode: "cognitive_numeracy_attention",
          },
        });
        if (isMounted && session) {
          sessionIdRef.current = session.sessionId;
        }
      } catch (err) {
        console.warn("[NumberOrder] Failed to start game session:", err);
      }
      if (isMounted) {
        setupRound(1);
      }
    };

    init();

    return () => {
      isMounted = false;
      // Early exit abandonment: if exited before completing all 5 rounds
      if (!isCompletedRef.current && !isAbandonedRef.current && sessionIdRef.current) {
        isAbandonedRef.current = true;
        gameSessionService
          .abandonSession(sessionIdRef.current, { reason: "patient_navigated_away" })
          .catch(() => {});
      }
    };
  }, [setupRound]);

  // ── 3. Hint / Assist Handler ───────────────────────────────────────────────
  const handleUseHint = async () => {
    if (isProcessing || isCompleted) return;

    // Find the next expected smallest number that hasn't been tapped
    const nextExpectedIndex = userTappedValues.length;
    const nextExpectedValue = sortedValues[nextExpectedIndex];
    const targetCard = cards.find((c) => c.value === nextExpectedValue && !c.isTapped);

    if (!targetCard) return;

    setHintUsedInRound(true);
    setHintCardId(targetCard.id);

    if (sessionIdRef.current) {
      try {
        await gameSessionService.recordEvent({
          sessionId: sessionIdRef.current,
          gameId: "number_order",
          eventType: "hint_used",
          metadata: {
            round,
            nextExpectedValue,
            tappedSoFar: userTappedValues,
          },
        });
      } catch {
        // Non-blocking
      }
    }

    try {
      const hintText =
        currentLang === "as"
          ? `পৰৱৰ্তী সৰু সংখ্যাটো হৈছে ${nextExpectedValue}`
          : currentLang === "hi"
          ? `अगली छोटी संख्या ${nextExpectedValue} है`
          : `The next smallest number is ${nextExpectedValue}`;
      VoiceAssistant.speak(hintText, currentLang);
    } catch {
      // Optional voice
    }
  };

  // ── 4. Card Selection & Evaluation ─────────────────────────────────────────
  const handleTapCard = async (card: NumberCardItem) => {
    if (isProcessing || isCompleted || card.isTapped) return;

    const nextExpectedIndex = userTappedValues.length;
    const expectedValue = sortedValues[nextExpectedIndex];
    const isCorrectChoice = card.value === expectedValue;
    const responseTimeMs = Date.now() - roundStartTimeRef.current;

    if (isCorrectChoice) {
      // ── CORRECT TAP ────────────────────────────────────────────────────────
      const nextTappedValues = [...userTappedValues, card.value];
      const nextRank = nextTappedValues.length;

      // Update card state with rank badge
      const updatedCards = cards.map((c) =>
        c.id === card.id ? { ...c, isTapped: true, orderRank: nextRank } : c
      );
      setCards(updatedCards);
      setUserTappedValues(nextTappedValues);
      setWrongCardId(null);
      setHintCardId(null);

      // Check if all numbers for this round are correctly ordered
      if (nextTappedValues.length === sortedValues.length) {
        setIsProcessing(true);
        setIsCorrectFeedback(true);

        const pointsEarned = hintUsedInRound
          ? BASE_POINTS_PER_ROUND - HINT_PENALTY_POINTS
          : BASE_POINTS_PER_ROUND;
        const nextTotalScore = totalScore + pointsEarned;
        setRoundScore(pointsEarned);
        setTotalScore(nextTotalScore);

        setFeedbackMessage(
          currentLang === "as"
            ? "সুন্দৰ! ক্ৰমটো সম্পূৰ্ণ শুদ্ধ হৈছে 🌟"
            : currentLang === "hi"
            ? "बहुत बढ़िया! सही क्रम में लगाया 🌟"
            : "Wonderful! Correct sequence 🌟"
        );

        // Record events in GameSessionService
        if (sessionIdRef.current) {
          try {
            await gameSessionService.recordEvent({
              sessionId: sessionIdRef.current,
              gameId: "number_order",
              eventType: "answer_submitted",
              metadata: {
                round,
                selectedOrdering: nextTappedValues,
                correctOrdering: sortedValues,
                isCorrect: true,
                attempts,
                responseTimeMs,
              },
            });
            await gameSessionService.recordEvent({
              sessionId: sessionIdRef.current,
              gameId: "number_order",
              eventType: "answer_correct",
              metadata: {
                round,
                pointsEarned,
                attempts,
                responseTimeMs,
              },
            });
            await gameSessionService.recordEvent({
              sessionId: sessionIdRef.current,
              gameId: "number_order",
              eventType: "round_completed",
              metadata: {
                round,
                totalScore: nextTotalScore,
              },
            });
          } catch {
            // Non-blocking
          }
        }

        // Advance or complete
        if (round >= TOTAL_ROUNDS) {
          setTimeout(() => {
            completeGame(nextTotalScore);
          }, 1500);
        } else {
          setTimeout(() => {
            setupRound(round + 1);
          }, 1500);
        }
      } else {
        // Correct step in progress
        if (sessionIdRef.current) {
          try {
            await gameSessionService.recordEvent({
              sessionId: sessionIdRef.current,
              gameId: "number_order",
              eventType: "answer_submitted",
              metadata: {
                round,
                tappedValue: card.value,
                step: nextRank,
                isCorrect: true,
                attempts,
                responseTimeMs,
              },
            });
          } catch {
            // Non-blocking
          }
        }
      }
    } else {
      // ── INCORRECT TAP (Gentle retry, elderly-friendly) ─────────────────────
      setWrongCardId(card.id);
      setIsCorrectFeedback(false);
      totalMistakesRef.current += 1;
      setAttempts((prev) => prev + 1);

      setFeedbackMessage(
        currentLang === "as"
          ? "অলপ হেৰফেৰ হ'ল! পৰৱৰ্তী সৰু সংখ্যাটো বাছক 🌿"
          : currentLang === "hi"
          ? "थोड़ा सा अंतर रहा! अगली सबसे छोटी संख्या चुनें 🌿"
          : "Almost! Find the next smallest number 🌿"
      );

      // Record answer_incorrect event
      if (sessionIdRef.current) {
        try {
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "number_order",
            eventType: "answer_submitted",
            metadata: {
              round,
              tappedValue: card.value,
              expectedValue,
              isCorrect: false,
              attempts,
              responseTimeMs,
            },
          });
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "number_order",
            eventType: "answer_incorrect",
            metadata: {
              round,
              tappedValue: card.value,
              expectedValue,
              attempts,
              responseTimeMs,
            },
          });
        } catch {
          // Non-blocking
        }
      }

      // Forgiving retry: after 1300ms, clear error card highlight
      setTimeout(() => {
        setWrongCardId(null);
        setFeedbackMessage(null);
      }, 1300);
    }
  };

  // ── 5. Complete Game & Full Persistence Pipeline ───────────────────────────
  const completeGame = async (finalScore: number) => {
    isCompletedRef.current = true;
    setIsCompleted(true);
    setIsProcessing(false);

    const durationSeconds = Math.max(
      1,
      Math.round((Date.now() - gameStartTimeRef.current) / 1000)
    );
    const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
    const totalAttempts = TOTAL_ROUNDS + totalMistakesRef.current;
    const accuracyPercent = Math.min(
      100,
      Math.max(50, Math.round((TOTAL_ROUNDS / totalAttempts) * 100))
    );

    // 1. Complete Session in GameSessionService
    if (sessionIdRef.current) {
      try {
        await gameSessionService.completeSession(sessionIdRef.current, finalScore, {
          totalRounds: TOTAL_ROUNDS,
          durationSeconds,
          accuracyPercent,
          totalMistakes: totalMistakesRef.current,
        });
      } catch (err) {
        console.warn("[NumberOrder] completeSession error:", err);
      }
    }

    // 2. Bridge to Companion Context Persistence (Raw Event Pipeline)
    try {
      await companionContextService.recordRawGameEvent({
        gameId: "number_order",
        eventType: "game_completed",
        payload: {
          gameName: "Number Order",
          score: finalScore,
          durationSeconds,
          accuracyPercent,
          completed: true,
          difficulty: "4 → 6 numbers (1–99)",
          metadata: {
            totalRounds: TOTAL_ROUNDS,
            totalMistakes: totalMistakesRef.current,
          },
        },
      });
    } catch (rawErr) {
      console.warn("[NumberOrder] Companion context bridge error:", rawErr);
    }

    // 3. Flow to Caregiver Dashboard Storage
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const caregiverSession: CognitiveGameSession = {
        id: `sess-no-${Date.now()}`,
        gameName: "Number Order",
        iconEmoji: "🔢",
        timestamp: `Today · ${timeStr}`,
        durationMinutes,
        score: finalScore,
        accuracyPercent,
        mistakes: totalMistakesRef.current,
        responseTime: "Calm numerical sequencing",
        difficulty: "Level 1 → 5 (4-6 numbers)",
        difficultyChangeReason: "Progressed through sequential numerical magnitude scaling.",
        completed: true,
        humanSummary: `Completed all 5 rounds ordering numbers from smallest to largest with ${accuracyPercent}% accuracy.`,
      };
      await caregiverStorage.recordGameSession(caregiverSession);
    } catch (cgErr) {
      console.warn("[NumberOrder] Caregiver storage record error:", cgErr);
    }
  };

  // ── 6. Restart Game ────────────────────────────────────────────────────────
  const handleRestartGame = async () => {
    setIsCompleted(false);
    isCompletedRef.current = false;
    isAbandonedRef.current = false;
    setTotalScore(0);
    setRoundScore(0);
    totalMistakesRef.current = 0;
    gameStartTimeRef.current = Date.now();

    try {
      const session = await gameSessionService.startSession({
        gameId: "number_order",
        metadata: {
          gameTitle: "Number Order",
          totalRounds: TOTAL_ROUNDS,
          mode: "cognitive_numeracy_attention",
        },
      });
      if (session) {
        sessionIdRef.current = session.sessionId;
      }
    } catch (err) {
      console.warn("[NumberOrder] Restart session error:", err);
    }

    setupRound(1);
  };

  // ── 7. Render Game Complete Result Screen ───────────────────────────────────
  if (isCompleted) {
    const durationSeconds = Math.max(
      1,
      Math.round((Date.now() - gameStartTimeRef.current) / 1000)
    );
    const mins = Math.floor(durationSeconds / 60);
    const secs = durationSeconds % 60;
    const timeFormatted = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    const totalAttempts = TOTAL_ROUNDS + totalMistakesRef.current;
    const accuracyPercent = Math.min(
      100,
      Math.max(50, Math.round((TOTAL_ROUNDS / totalAttempts) * 100))
    );

    return (
      <SafeAreaView style={styles.safeContainer} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={styles.resultScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Badge */}
          <View style={styles.resultHeader}>
            <View style={styles.resultBadge}>
              <Text style={styles.resultBadgeEmoji}>🌟</Text>
              <Text style={styles.resultBadgeText}>
                {currentLang === "as"
                  ? "খেল সম্পূৰ্ণ হ'ল!"
                  : currentLang === "hi"
                  ? "खेल पूरा हुआ!"
                  : "Activity Complete!"}
              </Text>
            </View>
            <Text style={styles.resultTitle}>
              {currentLang === "as"
                ? "চমৎকার সংখ্যা ক্ৰম!"
                : currentLang === "hi"
                ? "शानदार संख्या क्रम!"
                : "Great Sequencing!"}
            </Text>
            <Text style={styles.resultSubtitle}>
              {currentLang === "as"
                ? "আপুনি আটাইকেইটা ৫ টা পৰ্যায়তে সৰুৰ পৰা ডাঙৰলৈ সংখ্যাবোৰ সঠিকভাৱে সজালে।"
                : currentLang === "hi"
                ? "आपने सभी 5 स्तरों में छोटी से बड़ी संख्याओं को सही क्रम में लगाया।"
                : "You ordered all numbers from smallest to largest across 5 rounds."}
            </Text>
          </View>

          {/* Game Score Card */}
          <View style={styles.scoreHeroCard}>
            <Text style={styles.scoreHeroLabel}>
              {currentLang === "as" ? "খেলৰ নম্বৰ" : currentLang === "hi" ? "खेल स्कोर" : "Game Score"}
            </Text>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreHeroValue}>{totalScore}</Text>
              <Text style={styles.scoreHeroMax}>/ 500</Text>
            </View>
            <View style={styles.scorePill}>
              <Feather name="award" size={16} color="#059669" />
              <Text style={styles.scorePillText}>
                {accuracyPercent >= 90
                  ? currentLang === "as"
                    ? "উত্কৃষ্ট দক্ষতা"
                    : currentLang === "hi"
                    ? "उत्कृष्ट कौशल"
                    : "Excellent Focus"
                  : currentLang === "as"
                  ? "ভাল প্ৰয়াস"
                  : currentLang === "hi"
                  ? "अच्छा प्रयास"
                  : "Great Effort"}
              </Text>
            </View>
          </View>

          {/* Key Stats Row */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <View style={[styles.statIconWrap, { backgroundColor: "#F0FDF4" }]}>
                <Feather name="clock" size={20} color="#059669" />
              </View>
              <Text style={styles.statLabel}>
                {currentLang === "as" ? "সময়" : currentLang === "hi" ? "समय" : "Time"}
              </Text>
              <Text style={styles.statValue}>{timeFormatted}</Text>
            </View>

            <View style={styles.statBox}>
              <View style={[styles.statIconWrap, { backgroundColor: "#EFF6FF" }]}>
                <Feather name="check-circle" size={20} color="#0284C7" />
              </View>
              <Text style={styles.statLabel}>
                {currentLang === "as" ? "পৰ্যায়" : currentLang === "hi" ? "राउंड" : "Rounds"}
              </Text>
              <Text style={styles.statValue}>5 / 5</Text>
            </View>

            <View style={styles.statBox}>
              <View style={[styles.statIconWrap, { backgroundColor: "#FAF5FF" }]}>
                <Feather name="target" size={20} color="#7C3AED" />
              </View>
              <Text style={styles.statLabel}>
                {currentLang === "as" ? "শুদ্ধতা" : currentLang === "hi" ? "सटीकता" : "Accuracy"}
              </Text>
              <Text style={styles.statValue}>{accuracyPercent}%</Text>
            </View>
          </View>

          {/* Caregiver Sync Indicator Card */}
          <View style={styles.caregiverSyncCard}>
            <View style={styles.caregiverSyncHeader}>
              <MaterialCommunityIcons name="shield-check" size={20} color="#059669" />
              <Text style={styles.caregiverSyncTitle}>
                {currentLang === "as"
                  ? "তত্বাৱধায়কৰ ডেশ্ববৰ্ডত সংৰক্ষিত"
                  : currentLang === "hi"
                  ? "केयरगिवर डैशबोर्ड में सुरक्षित"
                  : "Saved to Caregiver Activity Log"}
              </Text>
            </View>
            <Text style={styles.caregiverSyncDesc}>
              {currentLang === "as"
                ? "আপোনাৰ এই কাৰ্যকলাপ পৰিয়াল আৰু তত্বাৱধায়কে চাব পাৰিব।"
                : currentLang === "hi"
                ? "आपकी यह गतिविधि परिवार और केयरगिवर के साथ साझा हो गई है।"
                : "Your completed session is logged for family & caregiver visibility."}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.resultActions}>
            <TouchableOpacity
              style={styles.playAgainBtn}
              onPress={handleRestartGame}
              activeOpacity={0.85}
            >
              <Feather name="rotate-ccw" size={20} color="#FFFFFF" />
              <Text style={styles.playAgainBtnText}>
                {currentLang === "as"
                  ? "আকৌ খেলক"
                  : currentLang === "hi"
                  ? "फिर से खेलें"
                  : "Play Again"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backHomeBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Feather name="home" size={20} color="#0F172A" />
              <Text style={styles.backHomeBtnText}>
                {currentLang === "as"
                  ? "কাৰ্যকলাপলৈ উভতি যাওক"
                  : currentLang === "hi"
                  ? "गतिविधियों पर लौटें"
                  : "Back to Activities"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── 8. Render Active Gameplay Screen ────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeContainer} edges={["top", "bottom"]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backIconButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="chevron-left" size={28} color="#1E293B" />
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <Text style={styles.gameHeaderTitle}>
            {currentLang === "as"
              ? "সংখ্যাৰ ক্ৰম"
              : currentLang === "hi"
              ? "संख्या क्रम"
              : "Number Order"}
          </Text>
          <Text style={styles.roundIndicatorText}>
            {currentLang === "as"
              ? `পৰ্যায় ${round} / ${TOTAL_ROUNDS}`
              : currentLang === "hi"
              ? `राउंड ${round} / ${TOTAL_ROUNDS}`
              : `Round ${round} of ${TOTAL_ROUNDS}`}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.hintIconButton, hintCardId !== null && styles.hintIconButtonActive]}
          onPress={handleUseHint}
          activeOpacity={0.7}
          disabled={isProcessing}
        >
          <MaterialCommunityIcons
            name="lightbulb-outline"
            size={22}
            color={hintCardId !== null ? "#D97706" : "#475569"}
          />
          <Text
            style={[styles.hintIconLabel, hintCardId !== null && styles.hintIconLabelActive]}
          >
            {currentLang === "as" ? "সংকেত" : currentLang === "hi" ? "संकेत" : "Clue"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Progress Dots */}
      <View style={styles.progressContainer}>
        {Array.from({ length: TOTAL_ROUNDS }).map((_, idx) => {
          const stepNum = idx + 1;
          const isDone = stepNum < round;
          const isCurrent = stepNum === round;
          return (
            <View
              key={idx}
              style={[
                styles.progressDot,
                isDone && styles.progressDotDone,
                isCurrent && styles.progressDotCurrent,
              ]}
            />
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.mainScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Instruction Header Card */}
        <Animated.View style={[styles.instructionCard, { opacity: fadeAnim }]}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>{currentConfig.difficultyLabel}</Text>
          </View>
          <Text style={styles.instructionHeading}>
            {currentLang === "as"
              ? "সৰুৰ পৰা ডাঙৰলৈ ক্ৰমত স্পৰ্শ কৰক"
              : currentLang === "hi"
              ? "छोटी से बड़ी संख्या क्रम में स्पर्श करें"
              : "Tap from smallest → largest"}
          </Text>
          <View style={styles.orderingGoalPill}>
            <Feather name="arrow-right" size={16} color="#0284C7" />
            <Text style={styles.orderingGoalText}>
              {currentLang === "as"
                ? "প্ৰথমে আটাইতকৈ সৰুটো, শেষত আটাইতকৈ ডাঙৰটো"
                : currentLang === "hi"
                ? "पहले सबसे छोटी, अंत में सबसे बड़ी"
                : "Lowest number first, highest number last"}
            </Text>
          </View>
        </Animated.View>

        {/* Feedback Message Banner */}
        {feedbackMessage && (
          <Animated.View
            style={[
              styles.feedbackBanner,
              isCorrectFeedback
                ? styles.feedbackBannerSuccess
                : styles.feedbackBannerWarning,
            ]}
          >
            <Text style={styles.feedbackBannerEmoji}>
              {isCorrectFeedback ? "🌟" : "🌿"}
            </Text>
            <Text
              style={[
                styles.feedbackBannerText,
                isCorrectFeedback
                  ? styles.feedbackBannerTextSuccess
                  : styles.feedbackBannerTextWarning,
              ]}
            >
              {feedbackMessage}
            </Text>
          </Animated.View>
        )}

        {/* Selected Progress Sequence Pill Bar */}
        {userTappedValues.length > 0 && (
          <View style={styles.tappedSequenceBar}>
            <Text style={styles.tappedSequenceLabel}>
              {currentLang === "as" ? "বাছনি:" : currentLang === "hi" ? "चुना गया:" : "Order:"}
            </Text>
            <View style={styles.tappedValuesRow}>
              {userTappedValues.map((val, idx) => (
                <View key={idx} style={styles.tappedValueChip}>
                  <Text style={styles.tappedValueChipText}>{val}</Text>
                  {idx < sortedValues.length - 1 && (
                    <Feather
                      name="chevron-right"
                      size={14}
                      color="#94A3B8"
                      style={{ marginLeft: 4 }}
                    />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Grid of Number Cards */}
        <Animated.View style={[styles.cardsGridContainer, { opacity: fadeAnim }]}>
          <View
            style={[
              styles.cardsGridWrap,
              cards.length > 4 ? styles.cardsGridWrapSix : styles.cardsGridWrapFour,
            ]}
          >
            {cards.map((card) => {
              const isTapped = card.isTapped;
              const isWrong = wrongCardId === card.id;
              const isHinted = hintCardId === card.id;

              return (
                <TouchableOpacity
                  key={card.id}
                  style={[
                    styles.numberCard,
                    cards.length > 4 ? styles.numberCardSix : styles.numberCardFour,
                    isTapped && styles.numberCardTapped,
                    isWrong && styles.numberCardWrong,
                    isHinted && styles.numberCardHinted,
                  ]}
                  onPress={() => handleTapCard(card)}
                  activeOpacity={0.8}
                  disabled={isTapped || isProcessing}
                >
                  <Text
                    style={[
                      styles.cardNumberValue,
                      isTapped && styles.cardNumberValueTapped,
                      isWrong && styles.cardNumberValueWrong,
                    ]}
                  >
                    {card.value}
                  </Text>

                  {/* Order Rank Badge (1st, 2nd, 3rd, etc.) */}
                  {isTapped && card.orderRank !== null && (
                    <View style={styles.rankBadge}>
                      <Feather name="check" size={14} color="#FFFFFF" />
                      <Text style={styles.rankBadgeText}>#{card.orderRank}</Text>
                    </View>
                  )}

                  {/* Hint Indicator Pulsing Icon */}
                  {isHinted && !isTapped && (
                    <View style={styles.hintMarkerBadge}>
                      <MaterialCommunityIcons
                        name="hand-pointing-down"
                        size={18}
                        color="#B45309"
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Score & Encouragement Footer */}
        <View style={styles.footerInfoCard}>
          <View style={styles.footerScoreBox}>
            <Text style={styles.footerScoreLabel}>
              {currentLang === "as" ? "নম্বৰ" : currentLang === "hi" ? "स्कोर" : "Score"}
            </Text>
            <Text style={styles.footerScoreValue}>{totalScore}</Text>
          </View>
          <View style={styles.footerDivider} />
          <View style={styles.footerEncouragementBox}>
            <Text style={styles.footerEncouragementText}>
              {currentLang === "as"
                ? "ধীৰে ধীৰে সংখ্যাবোৰ চাই সৰুৰ পৰা আৰম্ভ কৰক 🌸"
                : currentLang === "hi"
                ? "आराम से देखें और सबसे छोटी संख्या से शुरू करें 🌸"
                : "Take your time and start with the smallest 🌸"}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarCenter: {
    alignItems: "center",
  },
  gameHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  roundIndicatorText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0284C7",
    marginTop: 2,
  },
  hintIconButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    gap: 4,
  },
  hintIconButtonActive: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  hintIconLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  hintIconLabelActive: {
    color: "#B45309",
  },

  // Progress Dots
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  progressDot: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
  },
  progressDotDone: {
    backgroundColor: "#059669",
  },
  progressDotCurrent: {
    width: 36,
    backgroundColor: "#0284C7",
  },

  // Main Scroll
  mainScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },

  // Instruction Card
  instructionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Shadows.sm,
  },
  levelBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0369A1",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  instructionHeading: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  orderingGoalPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
    gap: 6,
  },
  orderingGoalText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0369A1",
  },

  // Feedback Banner
  feedbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
    ...Shadows.sm,
  },
  feedbackBannerSuccess: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  feedbackBannerWarning: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FFEDD5",
  },
  feedbackBannerEmoji: {
    fontSize: 22,
  },
  feedbackBannerText: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  feedbackBannerTextSuccess: {
    color: "#15803D",
  },
  feedbackBannerTextWarning: {
    color: "#C2410C",
  },

  // Tapped Sequence Bar
  tappedSequenceBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  tappedSequenceLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  tappedValuesRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  tappedValueChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#86EFAC",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tappedValueChipText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#15803D",
  },

  // Grid
  cardsGridContainer: {
    marginBottom: 16,
  },
  cardsGridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  cardsGridWrapFour: {
    // 2x2 grid
  },
  cardsGridWrapSix: {
    // 2x3 or 3x2 grid
  },
  numberCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    ...Shadows.sm,
  },
  numberCardFour: {
    width: (width - 44) / 2,
    height: 140,
    padding: 12,
  },
  numberCardSix: {
    width: (width - 44) / 2,
    height: 120,
    padding: 10,
  },
  numberCardTapped: {
    borderColor: "#86EFAC",
    backgroundColor: "#F0FDF4",
    opacity: 0.92,
  },
  numberCardWrong: {
    borderColor: "#F97316",
    backgroundColor: "#FFF7ED",
  },
  numberCardHinted: {
    borderColor: "#F59E0B",
    backgroundColor: "#FEF3C7",
    borderWidth: 2.5,
  },
  cardNumberValue: {
    fontSize: 48,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -1,
  },
  cardNumberValueTapped: {
    color: "#166534",
  },
  cardNumberValueWrong: {
    color: "#EA580C",
  },
  rankBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },
  rankBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  hintMarkerBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },

  // Footer Card
  footerInfoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Shadows.sm,
  },
  footerScoreBox: {
    paddingHorizontal: 12,
    alignItems: "center",
  },
  footerScoreLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
  },
  footerScoreValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  footerDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 8,
  },
  footerEncouragementBox: {
    flex: 1,
    paddingLeft: 4,
  },
  footerEncouragementText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#475569",
    lineHeight: 18,
  },

  // Result Screen Styles
  resultScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: "center",
  },
  resultHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  resultBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  resultBadgeEmoji: {
    fontSize: 16,
  },
  resultBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B45309",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  resultTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 6,
  },
  resultSubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  scoreHeroCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Shadows.md,
  },
  scoreHeroLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginBottom: 12,
  },
  scoreHeroValue: {
    fontSize: 52,
    fontWeight: "900",
    color: "#059669",
  },
  scoreHeroMax: {
    fontSize: 20,
    fontWeight: "600",
    color: "#94A3B8",
  },
  scorePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  scorePillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#059669",
  },
  statsGrid: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Shadows.sm,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  caregiverSyncCard: {
    width: "100%",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
  },
  caregiverSyncHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  caregiverSyncTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#166534",
  },
  caregiverSyncDesc: {
    fontSize: 12,
    color: "#15803D",
    lineHeight: 18,
  },
  resultActions: {
    width: "100%",
    gap: 12,
  },
  playAgainBtn: {
    backgroundColor: "#059669",
    borderRadius: 20,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    ...Shadows.sm,
  },
  playAgainBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  backHomeBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  backHomeBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },
});
