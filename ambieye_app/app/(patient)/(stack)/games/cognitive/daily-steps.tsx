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
export interface RoutineActivity {
  id: string;
  order: number; // 1-indexed chronological position
  titleEn: string;
  titleAs: string;
  titleHi: string;
  emoji: string;
}

export interface RoutineRoundData {
  roundNumber: number;
  routineTitleEn: string;
  routineTitleAs: string;
  routineTitleHi: string;
  difficultyLabel: string;
  difficultyKey: "easy" | "easy_medium" | "medium" | "challenging" | "mastery";
  activities: RoutineActivity[];
}

export interface RoutineCardItem extends RoutineActivity {
  isTapped: boolean;
  orderRank: number | null;
}

export const TOTAL_ROUNDS = 5;
export const BASE_POINTS_PER_ROUND = 100;
export const HINT_PENALTY_POINTS = 10;

// ── 5 Progressive Rounds Dataset ─────────────────────────────────────────────
// Round 1-2: 4 activities
// Round 3-5: 5 activities
export const ROUTINE_ROUNDS: Record<number, RoutineRoundData> = {
  1: {
    roundNumber: 1,
    routineTitleEn: "Morning Wake Up Routine",
    routineTitleAs: "পুৱাৰ শুই উঠা সময়",
    routineTitleHi: "सुबह उठने की दिनचर्या",
    difficultyLabel: "Level 1 · 4 Activities",
    difficultyKey: "easy",
    activities: [
      { id: "r1_a1", order: 1, titleEn: "Wake up in bed", titleAs: "টোপনিৰ পৰা উঠা", titleHi: "सोकर उठना", emoji: "🛏️" },
      { id: "r1_a2", order: 2, titleEn: "Brush your teeth", titleAs: "দাঁত ব্ৰাশ কৰা", titleHi: "दांत साफ करना", emoji: "🪥" },
      { id: "r1_a3", order: 3, titleEn: "Get dressed", titleAs: "কাপোৰ পিন্ধা", titleHi: "कपड़े पहनना", emoji: "👕" },
      { id: "r1_a4", order: 4, titleEn: "Eat morning breakfast", titleAs: "পুৱাৰ জলপান খোৱা", titleHi: "नाश्ता करना", emoji: "🍳" },
    ],
  },
  2: {
    roundNumber: 2,
    routineTitleEn: "Making Warm Morning Tea",
    routineTitleAs: "পুৱাৰ গৰম চাহ বনোৱা",
    routineTitleHi: "सुबह की गरम चाय बनाना",
    difficultyLabel: "Level 2 · 4 Activities",
    difficultyKey: "easy_medium",
    activities: [
      { id: "r2_a1", order: 1, titleEn: "Boil water in kettle", titleAs: "কেটলীত পানী গৰম কৰা", titleHi: "केतली में पानी उबालना", emoji: "🫖" },
      { id: "r2_a2", order: 2, titleEn: "Add aromatic tea leaves", titleAs: "চাহপাত দিয়া", titleHi: "चायपत्ती डालना", emoji: "🍃" },
      { id: "r2_a3", order: 3, titleEn: "Add milk and ginger", titleAs: "গাখীৰ আৰু আদা দিয়া", titleHi: "दूध और अदरक मिलाना", emoji: "🥛" },
      { id: "r2_a4", order: 4, titleEn: "Drink warm cup of tea", titleAs: "গৰম চাহ উপভোগ কৰা", titleHi: "गरम चाय पीना", emoji: "☕" },
    ],
  },
  3: {
    roundNumber: 3,
    routineTitleEn: "Garden Walk & Freshness",
    routineTitleAs: "ফুলনিত খোজকঢ়া আৰু সতেজতা",
    routineTitleHi: "बगीचे में टहलना और ताजगी",
    difficultyLabel: "Level 3 · 5 Activities",
    difficultyKey: "medium",
    activities: [
      { id: "r3_a1", order: 1, titleEn: "Put on walking shoes", titleAs: "খোজকঢ়া জোতা পিন্ধা", titleHi: "जूते पहनना", emoji: "👟" },
      { id: "r3_a2", order: 2, titleEn: "Step out for morning walk", titleAs: "বাহিৰলৈ খোজকঢ়া", titleHi: "टहलने निकलना", emoji: "🚶" },
      { id: "r3_a3", order: 3, titleEn: "Water courtyard flowers", titleAs: "ফুলনিত পানী দিয়া", titleHi: "फूलों को पानी देना", emoji: "🌻" },
      { id: "r3_a4", order: 4, titleEn: "Wash hands with soap", titleAs: "চাবোনেৰে হাত ধোৱা", titleHi: "साबुन से हाथ धोना", emoji: "🧼" },
      { id: "r3_a5", order: 5, titleEn: "Drink a glass of water", titleAs: "এগিলাচ পানী খোৱা", titleHi: "पानी पीना", emoji: "💧" },
    ],
  },
  4: {
    roundNumber: 4,
    routineTitleEn: "Evening Bath & Courtyard Diya",
    routineTitleAs: "সন্ধিয়াৰ স্নান আৰু চাকি জ্বলোৱা",
    routineTitleHi: "शाम का स्नान और संध्या दीपक",
    difficultyLabel: "Level 4 · 5 Activities",
    difficultyKey: "challenging",
    activities: [
      { id: "r4_a1", order: 1, titleEn: "Take a refreshing bath", titleAs: "গা ধোৱা", titleHi: "स्नान करना", emoji: "🚿" },
      { id: "r4_a2", order: 2, titleEn: "Wear clean clothes", titleAs: "পৰিষ্কাৰ কাপোৰ পিন্ধা", titleHi: "साफ कपड़े पहनना", emoji: "🥻" },
      { id: "r4_a3", order: 3, titleEn: "Light evening diya lamp", titleAs: "সন্ধিয়া চাকি জ্বলোৱা", titleHi: "संध्या दीपक जलाना", emoji: "🪔" },
      { id: "r4_a4", order: 4, titleEn: "Eat warm dinner", titleAs: "ৰাতিৰ ভাত খোৱা", titleHi: "रात का भोजन करना", emoji: "🍲" },
      { id: "r4_a5", order: 5, titleEn: "Take evening medication", titleAs: "সন্ধিয়াৰ দৰব খোৱা", titleHi: "शाम की दवाई लेना", emoji: "💊" },
    ],
  },
  5: {
    roundNumber: 5,
    routineTitleEn: "Night Rest & Sleep Preparation",
    routineTitleAs: "ৰাতিৰ বিশ্ৰাম আৰু শুবলৈ প্ৰস্তুতি",
    routineTitleHi: "रात का विश्राम और सोने की तैयारी",
    difficultyLabel: "Level 5 · 5 Activities",
    difficultyKey: "mastery",
    activities: [
      { id: "r5_a1", order: 1, titleEn: "Wash face and hands", titleAs: "মুখ-হাত ধোৱা", titleHi: "मुंह-हाथ धोना", emoji: "🧼" },
      { id: "r5_a2", order: 2, titleEn: "Listen to soothing flute music", titleAs: "শান্ত বাঁহীৰ সুৰ শুনা", titleHi: "मधुर संगीत सुनना", emoji: "🎶" },
      { id: "r5_a3", order: 3, titleEn: "Read a few pages of a book", titleAs: "কিতাপৰ কেইটামান পৃষ্ঠা পঢ়া", titleHi: "किताब पढ़ना", emoji: "📖" },
      { id: "r5_a4", order: 4, titleEn: "Turn off bright room lights", titleAs: "কোঠাৰ লাইট নুমোৱা", titleHi: "बत्ती बंद करना", emoji: "💡" },
      { id: "r5_a5", order: 5, titleEn: "Lie down and sleep comfortably", titleAs: "বিছনাত আৰামেৰে শোৱা", titleHi: "आराम से सो जाना", emoji: "🛏️" },
    ],
  },
};

export default function DailyStepsGame() {
  const router = useRouter();
  const { t, currentLang } = useTranslation();

  // ── Gameplay State ─────────────────────────────────────────────────────────
  const [round, setRound] = useState<number>(1);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [currentRoundData, setCurrentRoundData] = useState<RoutineRoundData>(ROUTINE_ROUNDS[1]);
  const [cards, setCards] = useState<RoutineCardItem[]>([]);
  const [userTappedOrder, setUserTappedOrder] = useState<RoutineActivity[]>([]);
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

  // ── Localized Activity Title Helper ────────────────────────────────────────
  const getActivityTitle = (act: RoutineActivity) => {
    if (currentLang === "as") return act.titleAs;
    if (currentLang === "hi") return act.titleHi;
    return act.titleEn;
  };

  const getRoutineHeader = (roundData: RoutineRoundData) => {
    if (currentLang === "as") return roundData.routineTitleAs;
    if (currentLang === "hi") return roundData.routineTitleHi;
    return roundData.routineTitleEn;
  };

  // ── 1. Start / Setup Round ─────────────────────────────────────────────────
  const setupRound = useCallback(
    async (roundNum: number) => {
      const data = ROUTINE_ROUNDS[roundNum] || ROUTINE_ROUNDS[1];
      const shuffled = [...data.activities].sort(() => 0.5 - Math.random());

      const initialCards: RoutineCardItem[] = shuffled.map((act) => ({
        ...act,
        isTapped: false,
        orderRank: null,
      }));

      setRound(roundNum);
      setCurrentRoundData(data);
      setCards(initialCards);
      setUserTappedOrder([]);
      setWrongCardId(null);
      setHintCardId(null);
      setAttempts(1);
      setHintUsedInRound(false);
      setFeedbackMessage(null);
      setIsProcessing(false);
      roundStartTimeRef.current = Date.now();

      // Trigger smooth fade animation
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();

      // Record round_started event in GameSessionService
      if (sessionIdRef.current) {
        try {
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "daily_routine_order",
            eventType: "round_started",
            metadata: {
              round: roundNum,
              difficulty: data.difficultyKey,
              difficultyLabel: data.difficultyLabel,
              routineTitle: data.routineTitleEn,
              activitiesCount: data.activities.length,
              activitiesShown: shuffled.map((a) => a.titleEn),
              expectedOrder: data.activities.map((a) => a.titleEn),
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
            ? "কাৰ্যকলাপবোৰ সঠিক সময়ৰ ক্ৰমত স্পৰ্শ কৰক"
            : currentLang === "hi"
            ? "कार्यों को सही समय क्रम में लगाएं"
            : "Put these activities in the right order";
        VoiceAssistant.speak(prompt, currentLang);
      } catch {
        // Optional voice
      }
    },
    [currentLang, fadeAnim]
  );

  // ── 2. Initialize Game Session on Mount ─────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    gameStartTimeRef.current = Date.now();

    const init = async () => {
      try {
        const session = await gameSessionService.startSession({
          gameId: "daily_routine_order",
          metadata: {
            gameTitle: "Daily Routine Order",
            totalRounds: TOTAL_ROUNDS,
            mode: "cognitive_sequencing",
          },
        });
        if (isMounted && session) {
          sessionIdRef.current = session.sessionId;
        }
      } catch (err) {
        console.warn("[DailyRoutineOrder] Failed to start game session:", err);
      }
      if (isMounted) {
        setupRound(1);
      }
    };

    init();

    return () => {
      isMounted = false;
      VoiceAssistant.stop();
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

    // The next expected step is (current tapped count + 1)
    const nextExpectedOrder = userTappedOrder.length + 1;
    const targetCard = cards.find((c) => c.order === nextExpectedOrder && !c.isTapped);

    if (!targetCard) return;

    setHintUsedInRound(true);
    setHintCardId(targetCard.id);

    if (sessionIdRef.current) {
      try {
        await gameSessionService.recordEvent({
          sessionId: sessionIdRef.current,
          gameId: "daily_routine_order",
          eventType: "hint_used",
          metadata: {
            round,
            nextExpectedStep: targetCard.titleEn,
            stepNumber: nextExpectedOrder,
          },
        });
      } catch {
        // Non-blocking
      }
    }

    try {
      const hintText =
        currentLang === "as"
          ? `পৰৱৰ্তী কামটো হৈছে: ${targetCard.emoji} ${getActivityTitle(targetCard)}`
          : currentLang === "hi"
          ? `अगला कार्य है: ${targetCard.emoji} ${getActivityTitle(targetCard)}`
          : `Next step: ${targetCard.emoji} ${targetCard.titleEn}`;
      VoiceAssistant.speak(hintText, currentLang);
    } catch {
      // Optional voice
    }
  };

  // ── 4. Card Selection & Evaluation ─────────────────────────────────────────
  const handleTapCard = async (card: RoutineCardItem) => {
    if (isProcessing || isCompleted || card.isTapped) return;

    const nextExpectedOrder = userTappedOrder.length + 1;
    const isCorrectChoice = card.order === nextExpectedOrder;
    const responseTimeMs = Date.now() - roundStartTimeRef.current;

    if (isCorrectChoice) {
      // ── CORRECT STEP ───────────────────────────────────────────────────────
      const nextTappedOrder = [...userTappedOrder, card];
      const nextRank = nextTappedOrder.length;

      const updatedCards = cards.map((c) =>
        c.id === card.id ? { ...c, isTapped: true, orderRank: nextRank } : c
      );
      setCards(updatedCards);
      setUserTappedOrder(nextTappedOrder);
      setWrongCardId(null);
      setHintCardId(null);

      // Check if full round routine is ordered
      if (nextTappedOrder.length === currentRoundData.activities.length) {
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
            ? "সুন্দৰ! দিনচৰ্যাৰ ক্ৰমটো শুদ্ধ হৈছে 🌟"
            : currentLang === "hi"
            ? "बहुत बढ़िया! दिनचर्या का सही क्रम 🌟"
            : "Wonderful! Correct routine order 🌟"
        );

        // Record events in GameSessionService
        if (sessionIdRef.current) {
          try {
            await gameSessionService.recordEvent({
              sessionId: sessionIdRef.current,
              gameId: "daily_routine_order",
              eventType: "answer_submitted",
              metadata: {
                round,
                selectedOrder: nextTappedOrder.map((a) => a.titleEn),
                expectedOrder: currentRoundData.activities.map((a) => a.titleEn),
                isCorrect: true,
                attempts,
                responseTimeMs,
              },
            });
            await gameSessionService.recordEvent({
              sessionId: sessionIdRef.current,
              gameId: "daily_routine_order",
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
              gameId: "daily_routine_order",
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
        // Step progress event
        if (sessionIdRef.current) {
          try {
            await gameSessionService.recordEvent({
              sessionId: sessionIdRef.current,
              gameId: "daily_routine_order",
              eventType: "answer_submitted",
              metadata: {
                round,
                tappedActivity: card.titleEn,
                stepRank: nextRank,
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
      // ── INCORRECT STEP (Gentle retry, elderly-friendly) ────────────────────
      setWrongCardId(card.id);
      setIsCorrectFeedback(false);
      totalMistakesRef.current += 1;
      setAttempts((prev) => prev + 1);

      setFeedbackMessage(
        currentLang === "as"
          ? "অলপ হেৰফেৰ হ'ল! ক্ৰমটো আকৌ এবাৰ চেষ্টা কৰক 🌿"
          : currentLang === "hi"
          ? "थोड़ा सा अंतर रहा! फिर से प्रयास करें 🌿"
          : "Almost, try again 🌿"
      );

      // Record answer_incorrect event
      if (sessionIdRef.current) {
        try {
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "daily_routine_order",
            eventType: "answer_submitted",
            metadata: {
              round,
              tappedActivity: card.titleEn,
              expectedStepOrder: nextExpectedOrder,
              isCorrect: false,
              attempts,
              responseTimeMs,
            },
          });
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "daily_routine_order",
            eventType: "answer_incorrect",
            metadata: {
              round,
              tappedActivity: card.titleEn,
              attempts,
              responseTimeMs,
            },
          });
        } catch {
          // Non-blocking
        }
      }

      // Forgiving retry: clear error highlight after 1300ms
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
        console.warn("[DailyRoutineOrder] completeSession error:", err);
      }
    }

    // 2. Bridge to Companion Context Persistence
    try {
      await companionContextService.recordRawGameEvent({
        gameId: "daily_routine_order",
        eventType: "game_completed",
        payload: {
          gameName: "Daily Routine Order",
          score: finalScore,
          durationSeconds,
          accuracyPercent,
          completed: true,
          difficulty: "4 → 5 activities",
          metadata: {
            totalRounds: TOTAL_ROUNDS,
            totalMistakes: totalMistakesRef.current,
          },
        },
      });
    } catch (rawErr) {
      console.warn("[DailyRoutineOrder] Companion context bridge error:", rawErr);
    }

    // 3. Flow to Caregiver Dashboard Storage
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const caregiverSession: CognitiveGameSession = {
        id: `sess-dro-${Date.now()}`,
        gameName: "Daily Routine Order",
        iconEmoji: "📋",
        timestamp: `Today · ${timeStr}`,
        durationMinutes,
        score: finalScore,
        accuracyPercent,
        mistakes: totalMistakesRef.current,
        responseTime: "Thoughtful daily sequencing",
        difficulty: "Level 1 → 5 (4-5 activities)",
        difficultyChangeReason: "Progressed through chronological routine sequencing.",
        completed: true,
        humanSummary: `Completed all 5 rounds arranging familiar daily activities in chronological order with ${accuracyPercent}% accuracy.`,
      };
      await caregiverStorage.recordGameSession(caregiverSession);
    } catch (cgErr) {
      console.warn("[DailyRoutineOrder] Caregiver storage record error:", cgErr);
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
        gameId: "daily_routine_order",
        metadata: {
          gameTitle: "Daily Routine Order",
          totalRounds: TOTAL_ROUNDS,
          mode: "cognitive_sequencing",
        },
      });
      if (session) {
        sessionIdRef.current = session.sessionId;
      }
    } catch (err) {
      console.warn("[DailyRoutineOrder] Restart session error:", err);
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
                ? "সুন্দৰ নিয়মৰ ক্ৰম!"
                : currentLang === "hi"
                ? "शानदार दिनचर्या क्रम!"
                : "Great Routine Sequencing!"}
            </Text>
            <Text style={styles.resultSubtitle}>
              {currentLang === "as"
                ? "আপুনি আটাইকেইটা ৫ টা পৰ্যায়তে দৈনন্দিন কামবোৰ সঠিক ক্ৰমত সজালে।"
                : currentLang === "hi"
                ? "आपने सभी 5 स्तरों में दैनिक कार्यों को सही समय क्रम में लगाया।"
                : "You organized all daily routines in sensible chronological order."}
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
                    ? "উত্কৃষ্ট স্পষ্টতা"
                    : currentLang === "hi"
                    ? "उत्कृष्ट स्पष्टता"
                    : "Excellent Sequencing"
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
              onPress={() => router.replace("/(patient)/games" as any)}
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
          onPress={() => router.replace("/(patient)/games" as any)}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="chevron-left" size={28} color="#1E293B" />
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <Text style={styles.gameHeaderTitle}>
            {currentLang === "as"
              ? "দৈনিক নিয়মৰ ক্ৰম"
              : currentLang === "hi"
              ? "दैनिक दिनचर्या क्रम"
              : "Daily Routine Order"}
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
        {/* Instruction Card */}
        <Animated.View style={[styles.instructionCard, { opacity: fadeAnim }]}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>{currentRoundData.difficultyLabel}</Text>
          </View>
          <Text style={styles.routineThemeTitle}>{getRoutineHeader(currentRoundData)}</Text>
          <Text style={styles.instructionHeading}>
            {currentLang === "as"
              ? "কামবোৰ সঠিক সময়ৰ ক্ৰমত স্পৰ্শ কৰক"
              : currentLang === "hi"
              ? "कार्यों को सही समय क्रम में लगाएं"
              : "Put these in the right order"}
          </Text>
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
        {userTappedOrder.length > 0 && (
          <View style={styles.tappedSequenceBar}>
            <Text style={styles.tappedSequenceLabel}>
              {currentLang === "as" ? "ক্ৰম:" : currentLang === "hi" ? "क्रम:" : "Order:"}
            </Text>
            <View style={styles.tappedValuesRow}>
              {userTappedOrder.map((act, idx) => (
                <View key={idx} style={styles.tappedValueChip}>
                  <Text style={styles.tappedValueChipEmoji}>{act.emoji}</Text>
                  <Text style={styles.tappedValueChipRank}>#{idx + 1}</Text>
                  {idx < currentRoundData.activities.length - 1 && (
                    <Feather
                      name="arrow-right"
                      size={12}
                      color="#94A3B8"
                      style={{ marginLeft: 4 }}
                    />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* List of Routine Cards */}
        <Animated.View style={[styles.cardsListContainer, { opacity: fadeAnim }]}>
          {cards.map((card) => {
            const isTapped = card.isTapped;
            const isWrong = wrongCardId === card.id;
            const isHinted = hintCardId === card.id;

            return (
              <TouchableOpacity
                key={card.id}
                style={[
                  styles.routineCard,
                  isTapped && styles.routineCardTapped,
                  isWrong && styles.routineCardWrong,
                  isHinted && styles.routineCardHinted,
                ]}
                onPress={() => handleTapCard(card)}
                activeOpacity={0.8}
                disabled={isTapped || isProcessing}
              >
                <View style={styles.cardLeftIconWrap}>
                  <Text style={styles.cardEmoji}>{card.emoji}</Text>
                </View>

                <View style={styles.cardCenterContent}>
                  <Text
                    style={[
                      styles.cardTitleText,
                      isTapped && styles.cardTitleTextTapped,
                      isWrong && styles.cardTitleTextWrong,
                    ]}
                  >
                    {getActivityTitle(card)}
                  </Text>
                </View>

                {/* Right Status Badge */}
                {isTapped && card.orderRank !== null ? (
                  <View style={styles.rankBadge}>
                    <Feather name="check" size={14} color="#FFFFFF" />
                    <Text style={styles.rankBadgeText}>#{card.orderRank}</Text>
                  </View>
                ) : isHinted ? (
                  <View style={styles.hintMarkerBadge}>
                    <MaterialCommunityIcons
                      name="hand-pointing-left"
                      size={20}
                      color="#B45309"
                    />
                  </View>
                ) : (
                  <View style={styles.unselectedIndicator}>
                    <Feather name="circle" size={18} color="#CBD5E1" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
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
                ? "দৈনন্দিন কামবোৰ মনত পেলাই আনন্দৰে সজাওক 🌸"
                : currentLang === "hi"
                ? "रोजमर्रा के कार्यों को याद करें और क्रम में लगाएं 🌸"
                : "Think of your daily routine and enjoy each round 🌸"}
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
    color: "#059669",
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
    backgroundColor: "#059669",
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
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  routineThemeTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0284C7",
    marginBottom: 4,
    textAlign: "center",
  },
  instructionHeading: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
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
  tappedValueChipEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  tappedValueChipRank: {
    fontSize: 13,
    fontWeight: "800",
    color: "#15803D",
  },

  // Cards List
  cardsListContainer: {
    gap: 10,
    marginBottom: 16,
  },
  routineCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    ...Shadows.sm,
  },
  routineCardTapped: {
    borderColor: "#86EFAC",
    backgroundColor: "#F0FDF4",
    opacity: 0.94,
  },
  routineCardWrong: {
    borderColor: "#F97316",
    backgroundColor: "#FFF7ED",
  },
  routineCardHinted: {
    borderColor: "#F59E0B",
    backgroundColor: "#FEF3C7",
    borderWidth: 2.5,
  },
  cardLeftIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardEmoji: {
    fontSize: 28,
  },
  cardCenterContent: {
    flex: 1,
  },
  cardTitleText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },
  cardTitleTextTapped: {
    color: "#166534",
  },
  cardTitleTextWrong: {
    color: "#EA580C",
  },
  rankBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 4,
  },
  rankBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  hintMarkerBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  unselectedIndicator: {
    padding: 4,
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
