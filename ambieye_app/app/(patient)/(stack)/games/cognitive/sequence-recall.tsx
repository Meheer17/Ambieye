import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
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

const { width } = Dimensions.get("window");

export interface SequenceItem {
  id: string;
  name: string;
  emoji: string;
  category: string;
}

export const SEQUENCE_ITEMS: SequenceItem[] = [
  { id: "apple", name: "Apple", emoji: "🍎", category: "Food" },
  { id: "home", name: "Home", emoji: "🏠", category: "Daily" },
  { id: "flower", name: "Flower", emoji: "🌸", category: "Nature" },
  { id: "teapot", name: "Teapot", emoji: "🫖", category: "Kitchen" },
  { id: "sun", name: "Sun", emoji: "☀️", category: "Nature" },
  { id: "bell", name: "Bell", emoji: "🔔", category: "Daily" },
  { id: "leaf", name: "Leaf", emoji: "🍃", category: "Nature" },
  { id: "diya", name: "Diya", emoji: "🪔", category: "Culture" },
  { id: "banana", name: "Banana", emoji: "🍌", category: "Food" },
  { id: "tree", name: "Tree", emoji: "🌳", category: "Nature" },
  { id: "scarf", name: "Gamosa", emoji: "🧣", category: "Heritage" },
  { id: "mango", name: "Mango", emoji: "🥭", category: "Food" },
];

export const TOTAL_ROUNDS = 3;
export const BASE_POINTS_PER_ROUND = 100;
export const HINT_PENALTY_POINTS = 10;
export const MEMORIZE_DURATION_SECONDS = 3.5;

export type GamePhase = "watch" | "turn" | "feedback" | "result";

export default function SequenceRecallScreen() {
  const router = useRouter();
  const { t, currentLang } = useTranslation();

  // ── Game State ─────────────────────────────────────────────────────────────
  const [round, setRound] = useState<number>(1);
  const [phase, setPhase] = useState<GamePhase>("watch");
  const [countdown, setCountdown] = useState<number>(MEMORIZE_DURATION_SECONDS);
  const [targetSequence, setTargetSequence] = useState<SequenceItem[]>([]);
  const [shuffledChoices, setShuffledChoices] = useState<SequenceItem[]>([]);
  const [userSelection, setUserSelection] = useState<SequenceItem[]>([]);
  const [attempts, setAttempts] = useState<number>(1);
  const [roundScore, setRoundScore] = useState<number>(0);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isCorrectFeedback, setIsCorrectFeedback] = useState<boolean>(false);
  const [hintUsedInRound, setHintUsedInRound] = useState<boolean>(false);

  // ── Telemetry & Persistence State ──────────────────────────────────────────
  const sessionIdRef = useRef<string | null>(null);
  const gameStartTimeRef = useRef<number>(Date.now());
  const roundStartTimeRef = useRef<number>(Date.now());
  const totalMistakesRef = useRef<number>(0);
  const isCompletedRef = useRef<boolean>(false);
  const isAbandonedRef = useRef<boolean>(false);

  // ── Animation Values ───────────────────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── Generate Sequence for Current Round ────────────────────────────────────
  const generateSequenceForRound = useCallback((roundNumber: number) => {
    // Round 1: 3 items, Round 2: 4 items, Round 3: 5 items
    const sequenceLength = roundNumber + 2;
    const shuffled = [...SEQUENCE_ITEMS].sort(() => 0.5 - Math.random());
    const sequence = shuffled.slice(0, sequenceLength);

    // Candidates: target items + 1 extra distractor (if available) shuffled
    const distractors = shuffled.slice(sequenceLength, sequenceLength + 1);
    const pool = [...sequence, ...distractors].sort(() => 0.5 - Math.random());

    return { sequence, pool, sequenceLength };
  }, []);

  // ── 1. Start / Advance Round ───────────────────────────────────────────────
  const startRound = useCallback(
    async (roundNum: number) => {
      const { sequence, pool, sequenceLength } = generateSequenceForRound(roundNum);
      setRound(roundNum);
      setTargetSequence(sequence);
      setShuffledChoices(pool);
      setUserSelection([]);
      setAttempts(1);
      setHintUsedInRound(false);
      setFeedbackMessage(null);
      setCountdown(MEMORIZE_DURATION_SECONDS);
      setPhase("watch");
      roundStartTimeRef.current = Date.now();

      // Record round_started event
      if (sessionIdRef.current) {
        try {
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "sequence_recall",
            eventType: "round_started",
            metadata: {
              round: roundNum,
              sequenceLength,
              sequence: sequence.map((i) => i.name),
            },
          });
        } catch {
          // Non-blocking persistence
        }
      }

      // Voice prompt: Watch carefully
      try {
        const prompt =
          currentLang === "as"
            ? "ক্ৰমটো ভালদৰে মন কৰক"
            : currentLang === "hi"
            ? "क्रम को ध्यान से देखें"
            : "Watch the sequence carefully";
        VoiceAssistant.speak(prompt, currentLang);
      } catch {
        // Voice is optional
      }
    },
    [generateSequenceForRound, currentLang]
  );

  // ── 2. Initialize Game Session on Mount ─────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    gameStartTimeRef.current = Date.now();

    const init = async () => {
      try {
        const session = await gameSessionService.startSession({
          gameId: "sequence_recall",
          metadata: {
            gameTitle: "Sequence Recall",
            totalRounds: TOTAL_ROUNDS,
            mode: "cognitive_memory",
          },
        });
        if (isMounted && session) {
          sessionIdRef.current = session.sessionId;
        }
      } catch (err) {
        console.warn("[SequenceRecall] Failed to start game session:", err);
      }
      if (isMounted) {
        startRound(1);
      }
    };

    init();

    return () => {
      isMounted = false;
      // Early exit abandonment: if exited before completing all rounds
      if (!isCompletedRef.current && !isAbandonedRef.current && sessionIdRef.current) {
        isAbandonedRef.current = true;
        gameSessionService
          .abandonSession(sessionIdRef.current, { reason: "patient_navigated_away" })
          .catch(() => {});
      }
    };
  }, [startRound]);

  // ── 3. Watch Phase Countdown Timer ─────────────────────────────────────────
  useEffect(() => {
    if (phase !== "watch") return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setPhase("turn");
          try {
            const yourTurnPrompt =
              currentLang === "as"
                ? "এতিয়া একে ক্ৰমত স্পৰ্শ কৰক"
                : currentLang === "hi"
                ? "अब उसी क्रम में चुनें"
                : "Now tap them in order";
            VoiceAssistant.speak(yourTurnPrompt, currentLang);
          } catch {
            // Optional voice
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, currentLang]);

  // ── 4. Hint / Watch Again ──────────────────────────────────────────────────
  const handleWatchAgain = async () => {
    if (phase !== "turn") return;
    setHintUsedInRound(true);
    setCountdown(2.5);
    setPhase("watch");

    if (sessionIdRef.current) {
      try {
        await gameSessionService.recordEvent({
          sessionId: sessionIdRef.current,
          gameId: "sequence_recall",
          eventType: "hint_used",
          metadata: {
            round,
            sequenceLength: targetSequence.length,
          },
        });
      } catch {
        // Non-blocking
      }
    }
  };

  // ── 5. User Selection Logic ────────────────────────────────────────────────
  const handleSelectItem = (item: SequenceItem) => {
    if (phase !== "turn") return;
    if (userSelection.length >= targetSequence.length) return;

    const nextSelection = [...userSelection, item];
    setUserSelection(nextSelection);

    // If all items for this round are selected, evaluate answer
    if (nextSelection.length === targetSequence.length) {
      evaluateSelection(nextSelection);
    }
  };

  const handleRemoveSlotItem = (index: number) => {
    if (phase !== "turn") return;
    const nextSelection = [...userSelection];
    nextSelection.splice(index, 1);
    setUserSelection(nextSelection);
  };

  const handleClearSelection = () => {
    if (phase !== "turn") return;
    setUserSelection([]);
  };

  // ── 6. Evaluate Sequence ───────────────────────────────────────────────────
  const evaluateSelection = async (selected: SequenceItem[]) => {
    setPhase("feedback");
    const responseTimeMs = Date.now() - roundStartTimeRef.current;

    const isMatch =
      selected.length === targetSequence.length &&
      selected.every((item, idx) => item.id === targetSequence[idx].id);

    // Record answer_submitted event
    if (sessionIdRef.current) {
      try {
        await gameSessionService.recordEvent({
          sessionId: sessionIdRef.current,
          gameId: "sequence_recall",
          eventType: "answer_submitted",
          metadata: {
            round,
            sequenceLength: targetSequence.length,
            isCorrect: isMatch,
            attempts,
            responseTimeMs,
            targetSequence: targetSequence.map((i) => i.name),
            userSequence: selected.map((i) => i.name),
          },
        });
      } catch {
        // Non-blocking
      }
    }

    if (isMatch) {
      // ── CORRECT ──────────────────────────────────────────────────────────
      setIsCorrectFeedback(true);
      const points = hintUsedInRound
        ? BASE_POINTS_PER_ROUND - HINT_PENALTY_POINTS
        : BASE_POINTS_PER_ROUND;
      const nextTotalScore = totalScore + points;
      setRoundScore(points);
      setTotalScore(nextTotalScore);

      setFeedbackMessage(
        currentLang === "as"
          ? "সুন্দৰ! সঠিক ক্ৰমত বাছনি কৰিলে 🌟"
          : currentLang === "hi"
          ? "बहुत बढ़िया! सही क्रम चुना 🌟"
          : "Wonderful! Correct sequence 🌟"
      );

      // Record answer_correct & round_completed events
      if (sessionIdRef.current) {
        try {
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "sequence_recall",
            eventType: "answer_correct",
            metadata: {
              round,
              pointsEarned: points,
              attempts,
              responseTimeMs,
            },
          });
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "sequence_recall",
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

      // Check if this was the final round
      if (round >= TOTAL_ROUNDS) {
        setTimeout(() => {
          completeGame(nextTotalScore);
        }, 1500);
      } else {
        setTimeout(() => {
          startRound(round + 1);
        }, 1600);
      }
    } else {
      // ── INCORRECT (Gentle retry, forgiving patient experience) ───────────
      setIsCorrectFeedback(false);
      totalMistakesRef.current += 1;
      setAttempts((prev) => prev + 1);

      setFeedbackMessage(
        currentLang === "as"
          ? "অলপ হেৰফেৰ হ'ল! আকৌ এবাৰ চেষ্টা কৰক 🌿"
          : currentLang === "hi"
          ? "थोड़ा सा अंतर रहा! फिर से प्रयास करें 🌿"
          : "Almost there! Let's try once more 🌿"
      );

      // Record answer_incorrect event
      if (sessionIdRef.current) {
        try {
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "sequence_recall",
            eventType: "answer_incorrect",
            metadata: {
              round,
              attempts,
              responseTimeMs,
            },
          });
        } catch {
          // Non-blocking
        }
      }

      // Allow patient to retry without buzzer or harsh state
      setTimeout(() => {
        setUserSelection([]);
        setFeedbackMessage(null);
        setPhase("turn");
      }, 1500);
    }
  };

  // ── 7. Complete Game & Full Persistence Pipeline ───────────────────────────
  const completeGame = async (finalScore: number) => {
    isCompletedRef.current = true;
    setPhase("result");

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
        console.warn("[SequenceRecall] completeSession error:", err);
      }
    }

    // 2. Bridge to Companion Context Persistence (Raw Event Pipeline)
    try {
      await companionContextService.recordRawGameEvent({
        gameId: "sequence_recall",
        eventType: "game_completed",
        payload: {
          gameName: "Sequence Recall",
          score: finalScore,
          durationSeconds,
          accuracyPercent,
          completed: true,
          difficulty: "3 → 5 items",
          metadata: {
            totalRounds: TOTAL_ROUNDS,
            totalMistakes: totalMistakesRef.current,
          },
        },
      });
    } catch (rawErr) {
      console.warn("[SequenceRecall] Companion context bridge error:", rawErr);
    }

    // 3. Flow to Caregiver Dashboard Storage
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const caregiverSession: CognitiveGameSession = {
        id: `sess-sr-${Date.now()}`,
        gameName: "Sequence Recall",
        iconEmoji: "🔢",
        timestamp: `Today · ${timeStr}`,
        durationMinutes,
        score: finalScore,
        accuracyPercent,
        mistakes: totalMistakesRef.current,
        responseTime: "Good focus & ordered recall",
        difficulty: "Level 1 → 3 (3-5 items)",
        difficultyChangeReason: "Progressed through sequential memory scaling.",
        completed: true,
        humanSummary: `Completed all 3 rounds recalling item sequences up to 5 items with ${accuracyPercent}% accuracy.`,
      };
      await caregiverStorage.recordGameSession(caregiverSession);
    } catch (cgErr) {
      console.warn("[SequenceRecall] Caregiver storage record error:", cgErr);
    }
  };

  // ── Restart Game ───────────────────────────────────────────────────────────
  const handleRestart = () => {
    isCompletedRef.current = false;
    isAbandonedRef.current = false;
    sessionIdRef.current = null;
    totalMistakesRef.current = 0;
    setTotalScore(0);
    setRoundScore(0);

    // Re-initialize session
    gameSessionService
      .startSession({
        gameId: "sequence_recall",
        metadata: {
          gameTitle: "Sequence Recall",
          totalRounds: TOTAL_ROUNDS,
          mode: "cognitive_memory",
        },
      })
      .then((session) => {
        if (session) sessionIdRef.current = session.sessionId;
      })
      .catch(() => {});

    startRound(1);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* ── HEADER BAR ────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {currentLang === "as"
              ? "ক্ৰমিক স্মৃতি খেল"
              : currentLang === "hi"
              ? "क्रम स्मरण खेल"
              : "Sequence Recall"}
          </Text>
          <Text style={styles.headerSubtitle}>
            ROUND {round} / {TOTAL_ROUNDS}
          </Text>
        </View>

        <View style={styles.scoreBadge}>
          <Text style={styles.scoreBadgeText}>{totalScore} PTS</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PHASE 1: WATCH THE SEQUENCE                                        */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {phase === "watch" && (
          <View style={styles.phaseContainer}>
            <View style={styles.bannerWatch}>
              <View style={styles.bannerIconCircle}>
                <Feather name="eye" size={24} color="#0284C7" />
              </View>
              <View style={styles.bannerTextWrap}>
                <Text style={styles.bannerTitle}>
                  {currentLang === "as"
                    ? "ক্ৰমটো মনত ৰাখক"
                    : currentLang === "hi"
                    ? "क्रम ध्यान से देखें"
                    : "Watch the Sequence"}
                </Text>
                <Text style={styles.bannerSubtitle}>
                  {currentLang === "as"
                    ? `${countdown} ছেকেণ্ড পিছত ঢাকি দিয়া হ'ব`
                    : currentLang === "hi"
                    ? `${countdown} सेकंड में छिप जाएगा`
                    : `Hiding in ${countdown} seconds`}
                </Text>
              </View>
              <View style={styles.countdownPill}>
                <Text style={styles.countdownText}>{countdown}s</Text>
              </View>
            </View>

            {/* Sequence Display Cards */}
            <View style={styles.sequenceRow}>
              {targetSequence.map((item, index) => (
                <View key={`watch-${item.id}-${index}`} style={styles.sequenceCardWrapper}>
                  <View style={styles.sequenceIndexBadge}>
                    <Text style={styles.sequenceIndexText}>{index + 1}</Text>
                  </View>
                  <View style={styles.watchCard}>
                    <Text style={styles.cardEmoji}>{item.emoji}</Text>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.tipBox}>
              <Feather name="info" size={16} color="#0284C7" />
              <Text style={styles.tipText}>
                {currentLang === "as"
                  ? "বাওঁফালৰ পৰা সোঁফাললৈ বস্তুবোৰৰ ক্ৰম মনত ৰাখক।"
                  : currentLang === "hi"
                  ? "बाएं से दाएं चित्रों का क्रम याद रखें।"
                  : "Remember the items from left to right."}
              </Text>
            </View>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PHASE 2: YOUR TURN / TAP IN ORDER                                  */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {(phase === "turn" || phase === "feedback") && (
          <View style={styles.phaseContainer}>
            <View style={styles.bannerTurn}>
              <View style={[styles.bannerIconCircle, { backgroundColor: "#ECFDF5" }]}>
                <Feather name="check-circle" size={24} color="#059669" />
              </View>
              <View style={styles.bannerTextWrap}>
                <Text style={styles.bannerTitle}>
                  {currentLang === "as"
                    ? "আপোনাৰ পাল: ক্ৰমত বাছক"
                    : currentLang === "hi"
                    ? "आपकी बारी: क्रम में चुनें"
                    : "Your Turn: Tap in Order"}
                </Text>
                <Text style={styles.bannerSubtitle}>
                  {userSelection.length} / {targetSequence.length} selected
                </Text>
              </View>
              <TouchableOpacity
                style={styles.hintButton}
                onPress={handleWatchAgain}
                disabled={phase === "feedback"}
                activeOpacity={0.8}
              >
                <Feather name="help-circle" size={16} color="#0284C7" />
                <Text style={styles.hintButtonText}>
                  {currentLang === "as" ? "আকৌ চাওক" : currentLang === "hi" ? "फिर देखें" : "Hint"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Destination Slots */}
            <View style={styles.slotsContainer}>
              <Text style={styles.slotsSectionLabel}>
                {currentLang === "as"
                  ? "আপোনাৰ ক্ৰম (TAP TO REMOVE):"
                  : currentLang === "hi"
                  ? "आपका चुना क्रम (हटाने के लिए टैप करें):"
                  : "Your Sequence (Tap to remove):"}
              </Text>
              <View style={styles.slotsRow}>
                {targetSequence.map((_, index) => {
                  const filledItem = userSelection[index];
                  return (
                    <TouchableOpacity
                      key={`slot-${index}`}
                      style={[
                        styles.slotBox,
                        filledItem ? styles.slotBoxFilled : styles.slotBoxEmpty,
                      ]}
                      onPress={() => filledItem && handleRemoveSlotItem(index)}
                      disabled={!filledItem || phase === "feedback"}
                      activeOpacity={0.7}
                    >
                      <View style={styles.slotNumberBadge}>
                        <Text style={styles.slotNumberText}>{index + 1}</Text>
                      </View>
                      {filledItem ? (
                        <>
                          <Text style={styles.slotEmoji}>{filledItem.emoji}</Text>
                          <Text style={styles.slotName} numberOfLines={1}>
                            {filledItem.name}
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.slotPlaceholder}>?</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Feedback Message Banner */}
            {feedbackMessage && (
              <View
                style={[
                  styles.feedbackBanner,
                  isCorrectFeedback
                    ? styles.feedbackBannerSuccess
                    : styles.feedbackBannerWarning,
                ]}
              >
                <Feather
                  name={isCorrectFeedback ? "check-circle" : "alert-circle"}
                  size={20}
                  color={isCorrectFeedback ? "#059669" : "#D97706"}
                />
                <Text
                  style={[
                    styles.feedbackBannerText,
                    { color: isCorrectFeedback ? "#065F46" : "#92400E" },
                  ]}
                >
                  {feedbackMessage}
                </Text>
              </View>
            )}

            {/* Candidate Shuffled Choices */}
            <View style={styles.choicesSection}>
              <View style={styles.choicesHeaderRow}>
                <Text style={styles.choicesTitle}>
                  {currentLang === "as"
                    ? "বস্তুবোৰ বাছনি কৰক"
                    : currentLang === "hi"
                    ? "वस्तुओं का चयन करें"
                    : "Choose the items:"}
                </Text>
                {userSelection.length > 0 && (
                  <TouchableOpacity
                    onPress={handleClearSelection}
                    disabled={phase === "feedback"}
                  >
                    <Text style={styles.clearText}>
                      {currentLang === "as" ? "পৰিস্কাৰ কৰক" : currentLang === "hi" ? "हटाएं" : "Reset"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.choicesGrid}>
                {shuffledChoices.map((item, index) => {
                  const timesSelected = userSelection.filter((s) => s.id === item.id).length;
                  const timesInTarget = targetSequence.filter((s) => s.id === item.id).length;
                  const isExhausted = timesSelected >= timesInTarget;

                  return (
                    <TouchableOpacity
                      key={`choice-${item.id}-${index}`}
                      style={[
                        styles.choiceCard,
                        isExhausted && styles.choiceCardDisabled,
                      ]}
                      onPress={() => handleSelectItem(item)}
                      disabled={isExhausted || phase === "feedback"}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.choiceEmoji}>{item.emoji}</Text>
                      <Text style={styles.choiceName} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PHASE 3: GAME COMPLETED RESULT MODAL                                */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {phase === "result" && (
          <View style={styles.resultCard}>
            <View style={styles.resultTrophyCircle}>
              <Text style={{ fontSize: 44 }}>🏆</Text>
            </View>

            <Text style={styles.resultTitle}>
              {currentLang === "as"
                ? "অভিনন্দন! খেল সমাপ্ত"
                : currentLang === "hi"
                ? "बधाई हो! खेल पूरा हुआ"
                : "Great Job! Game Completed"}
            </Text>
            <Text style={styles.resultSubtitle}>
              {currentLang === "as"
                ? "আপুনি আটাইকেইটা ক্ৰম সফলভাৱে মনত পেলালে"
                : currentLang === "hi"
                ? "आपने सभी क्रमिक स्मृति स्तर सफलतापूर्वक पूरे किए"
                : "You successfully recalled all item sequences"}
            </Text>

            {/* Metric Chips */}
            <View style={styles.resultMetricsRow}>
              <View style={styles.resultMetricBox}>
                <Text style={styles.resultMetricValue}>{totalScore}</Text>
                <Text style={styles.resultMetricLabel}>GAME SCORE</Text>
              </View>
              <View style={styles.resultMetricBox}>
                <Text style={styles.resultMetricValue}>{TOTAL_ROUNDS}</Text>
                <Text style={styles.resultMetricLabel}>ROUNDS</Text>
              </View>
              <View style={styles.resultMetricBox}>
                <Text style={styles.resultMetricValue}>
                  {totalMistakesRef.current === 0 ? "100%" : "Good"}
                </Text>
                <Text style={styles.resultMetricLabel}>ACCURACY</Text>
              </View>
            </View>

            <View style={styles.caregiverRecordedBadge}>
              <Feather name="check" size={16} color="#059669" />
              <Text style={styles.caregiverRecordedText}>
                {currentLang === "as"
                  ? "অভিভাৱক ডেচবৰ্ডত সংৰক্ষিত হৈছে"
                  : currentLang === "hi"
                  ? "अभिभावक डैशबोर्ड में दर्ज हो गया"
                  : "Activity saved to Caregiver Dashboard"}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.resultActions}>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={handleRestart}
                activeOpacity={0.85}
              >
                <Feather name="refresh-cw" size={18} color="#FFFFFF" />
                <Text style={styles.btnPrimaryText}>
                  {currentLang === "as" ? "আকৌ খেলক" : currentLang === "hi" ? "फिर से खेलें" : "Play Again"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <Text style={styles.btnSecondaryText}>
                  {currentLang === "as" ? "খেলসমূহলৈ ঘূৰি যাওক" : currentLang === "hi" ? "खेल सूची में जाएं" : "Back to Games"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFBF7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EAE3D6",
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 1,
  },
  scoreBadge: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scoreBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4338CA",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // ── Phase Layout ──────────────────────────────────────────────────────────
  phaseContainer: {
    gap: 16,
  },

  // ── Banners ───────────────────────────────────────────────────────────────
  bannerWatch: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#BAE6FD",
    gap: 12,
  },
  bannerTurn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#BBF7D0",
    gap: 12,
  },
  bannerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTextWrap: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  bannerSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
  },
  countdownPill: {
    backgroundColor: "#0284C7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  countdownText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  hintButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  hintButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0284C7",
  },

  // ── Sequence Display (Watch Phase) ────────────────────────────────────────
  sequenceRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginVertical: 12,
  },
  sequenceCardWrapper: {
    alignItems: "center",
  },
  sequenceIndexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#0284C7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: -12,
    zIndex: 2,
    elevation: 3,
  },
  sequenceIndexText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  watchCard: {
    width: width > 400 ? 96 : 80,
    height: 110,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#BAE6FD",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
    shadowColor: "#0284C7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardEmoji: {
    fontSize: 38,
    marginBottom: 4,
  },
  cardName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  tipBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
  },
  tipText: {
    fontSize: 13,
    color: "#475569",
    flex: 1,
    fontWeight: "500",
  },

  // ── Destination Slots (Your Turn Phase) ────────────────────────────────────
  slotsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EAE3D6",
  },
  slotsSectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  slotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  slotBox: {
    width: width > 400 ? 68 : 58,
    height: 84,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  slotBoxEmpty: {
    backgroundColor: "#F8FAFC",
    borderWidth: 2,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
  },
  slotBoxFilled: {
    backgroundColor: "#F0FDF4",
    borderWidth: 2,
    borderColor: "#10B981",
  },
  slotNumberBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  slotNumberText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#475569",
  },
  slotEmoji: {
    fontSize: 28,
    marginTop: 10,
  },
  slotName: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 2,
  },
  slotPlaceholder: {
    fontSize: 22,
    fontWeight: "800",
    color: "#94A3B8",
  },

  // ── Feedback Banner ────────────────────────────────────────────────────────
  feedbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  feedbackBannerSuccess: {
    backgroundColor: "#ECFDF5",
    borderColor: "#6EE7B7",
  },
  feedbackBannerWarning: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FCD34D",
  },
  feedbackBannerText: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },

  // ── Candidate Choices Grid ─────────────────────────────────────────────────
  choicesSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EAE3D6",
  },
  choicesHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  choicesTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  clearText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#EF4444",
  },
  choicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  choiceCard: {
    width: width > 400 ? 90 : 76,
    height: 94,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  choiceCardDisabled: {
    opacity: 0.35,
    backgroundColor: "#E2E8F0",
    borderColor: "#CBD5E1",
  },
  choiceEmoji: {
    fontSize: 34,
    marginBottom: 4,
  },
  choiceName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },

  // ── Result Phase Card ──────────────────────────────────────────────────────
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#EAE3D6",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  resultTrophyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FEF3C7",
    borderWidth: 2,
    borderColor: "#FDE68A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  resultSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },
  resultMetricsRow: {
    flexDirection: "row",
    gap: 12,
    marginVertical: 20,
    width: "100%",
  },
  resultMetricBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  resultMetricValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#059669",
  },
  resultMetricLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    marginTop: 2,
  },
  caregiverRecordedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 20,
  },
  caregiverRecordedText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#065F46",
  },
  resultActions: {
    width: "100%",
    gap: 10,
  },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#059669",
    paddingVertical: 14,
    borderRadius: 16,
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  btnSecondary: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    borderRadius: 16,
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
});
