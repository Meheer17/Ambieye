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
export interface WordItem {
  id: string;
  wordEn: string;
  wordAs: string;
  wordHi: string;
  emoji: string;
  category: string;
}

export interface WordRecallRoundConfig {
  roundNumber: number;
  wordCount: number; // 3 words for rounds 1-2; 4 words for rounds 3-4; 5 words for round 5
  difficultyLabel: string;
  difficultyKey: "easy" | "easy_medium" | "medium" | "challenging" | "mastery";
}

export const TOTAL_ROUNDS = 5;
export const BASE_POINTS_PER_ROUND = 100;
export const HINT_PENALTY_POINTS = 10;
export const WORD_DISPLAY_DURATION_MS = 2500;

// Local everyday familiar words pool
export const WORD_POOL: WordItem[] = [
  { id: "apple", wordEn: "APPLE", wordAs: "আপেল", wordHi: "सेब", emoji: "🍎", category: "Food" },
  { id: "flower", wordEn: "FLOWER", wordAs: "ফুল", wordHi: "फूल", emoji: "🌸", category: "Nature" },
  { id: "house", wordEn: "HOUSE", wordAs: "ঘৰ", wordHi: "घर", emoji: "🏠", category: "Daily" },
  { id: "teapot", wordEn: "TEAPOT", wordAs: "কেটলি", wordHi: "केतली", emoji: "🫖", category: "Kitchen" },
  { id: "sun", wordEn: "SUN", wordAs: "সূৰ্য্য", wordHi: "सूरज", emoji: "☀️", category: "Nature" },
  { id: "bell", wordEn: "BELL", wordAs: "ঘণ্টা", wordHi: "घंटी", emoji: "🔔", category: "Daily" },
  { id: "leaf", wordEn: "LEAF", wordAs: "পাত", wordHi: "पत्ता", emoji: "🍃", category: "Nature" },
  { id: "river", wordEn: "RIVER", wordAs: "নদী", wordHi: "नदी", emoji: "🌊", category: "Nature" },
  { id: "tree", wordEn: "TREE", wordAs: "গছ", wordHi: "पेड़", emoji: "🌳", category: "Nature" },
  { id: "bird", wordEn: "BIRD", wordAs: "চৰাই", wordHi: "चिड़िया", emoji: "🐦", category: "Animal" },
  { id: "cloud", wordEn: "CLOUD", wordAs: "ডাৱৰ", wordHi: "बादल", emoji: "☁️", category: "Nature" },
  { id: "lamp", wordEn: "LAMP", wordAs: "চাকি", wordHi: "दीपक", emoji: "🪔", category: "Culture" },
  { id: "bread", wordEn: "BREAD", wordAs: "ৰুটি", wordHi: "रोटी", emoji: "🍞", category: "Food" },
  { id: "clock", wordEn: "CLOCK", wordAs: "ঘড়ী", wordHi: "घड़ी", emoji: "🕰️", category: "Daily" },
  { id: "book", wordEn: "BOOK", wordAs: "কিতাপ", wordHi: "किताब", emoji: "📖", category: "Daily" },
  { id: "star", wordEn: "STAR", wordAs: "তৰা", wordHi: "तारा", emoji: "⭐", category: "Nature" },
];

export const ROUND_CONFIGS: Record<number, WordRecallRoundConfig> = {
  1: { roundNumber: 1, wordCount: 3, difficultyLabel: "Level 1 · 3 Words", difficultyKey: "easy" },
  2: { roundNumber: 2, wordCount: 3, difficultyLabel: "Level 2 · 3 Words", difficultyKey: "easy_medium" },
  3: { roundNumber: 3, wordCount: 4, difficultyLabel: "Level 3 · 4 Words", difficultyKey: "medium" },
  4: { roundNumber: 4, wordCount: 4, difficultyLabel: "Level 4 · 4 Words", difficultyKey: "challenging" },
  5: { roundNumber: 5, wordCount: 5, difficultyLabel: "Level 5 · 5 Words", difficultyKey: "mastery" },
};

export type GamePhase = "showing" | "question" | "result";

export default function WordRecallScreen() {
  const router = useRouter();
  const { t, currentLang } = useTranslation();

  // ── Gameplay State ─────────────────────────────────────────────────────────
  const [round, setRound] = useState<number>(1);
  const [phase, setPhase] = useState<GamePhase>("showing");
  const [currentConfig, setCurrentConfig] = useState<WordRecallRoundConfig>(ROUND_CONFIGS[1]);
  const [shownWords, setShownWords] = useState<WordItem[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
  const [targetWord, setTargetWord] = useState<WordItem | null>(null);
  const [choices, setChoices] = useState<WordItem[]>([]);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<number>(1);
  const [roundScore, setRoundScore] = useState<number>(0);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isCorrectFeedback, setIsCorrectFeedback] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [hintUsedInRound, setHintUsedInRound] = useState<boolean>(false);
  const [hintRevealed, setHintRevealed] = useState<boolean>(false);

  // ── Telemetry & Resilience State ───────────────────────────────────────────
  const sessionIdRef = useRef<string | null>(null);
  const gameStartTimeRef = useRef<number>(Date.now());
  const roundStartTimeRef = useRef<number>(Date.now());
  const totalMistakesRef = useRef<number>(0);
  const isCompletedRef = useRef<boolean>(false);
  const isAbandonedRef = useRef<boolean>(false);
  const timerRef = useRef<any>(null);

  // ── Animations ─────────────────────────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // ── Localized Word Text Helper ─────────────────────────────────────────────
  const getWordText = (item: WordItem) => {
    if (currentLang === "as") return item.wordAs;
    if (currentLang === "hi") return item.wordHi;
    return item.wordEn;
  };

  // ── Helper: Generate Words for Round ───────────────────────────────────────
  const generateWordsForRound = useCallback((config: WordRecallRoundConfig) => {
    const shuffled = [...WORD_POOL].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, config.wordCount);

    // Pick 1 target word from the shown words
    const target = selected[Math.floor(Math.random() * selected.length)];

    // Pick 3 distractor words from pool that were NOT shown
    const poolWithoutShown = WORD_POOL.filter((w) => !selected.some((sw) => sw.id === w.id));
    const shuffledDistractors = [...poolWithoutShown].sort(() => 0.5 - Math.random());
    const distractors = shuffledDistractors.slice(0, 3);

    // Combine 1 target + 3 distractors and shuffle
    const questionChoices = [target, ...distractors].sort(() => 0.5 - Math.random());

    return { selected, target, choices: questionChoices };
  }, []);

  // ── 1. Start / Setup Round ─────────────────────────────────────────────────
  const setupRound = useCallback(
    async (roundNum: number) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      const config = ROUND_CONFIGS[roundNum] || ROUND_CONFIGS[1];
      const { selected, target, choices: roundChoices } = generateWordsForRound(config);

      setRound(roundNum);
      setCurrentConfig(config);
      setShownWords(selected);
      setCurrentWordIndex(0);
      setTargetWord(target);
      setChoices(roundChoices);
      setSelectedWordId(null);
      setAttempts(1);
      setHintUsedInRound(false);
      setHintRevealed(false);
      setFeedbackMessage(null);
      setIsProcessing(false);
      setPhase("showing");
      roundStartTimeRef.current = Date.now();

      // Trigger smooth fade animation
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
      ]).start();

      // Record round_started event
      if (sessionIdRef.current) {
        try {
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "word_recall",
            eventType: "round_started",
            metadata: {
              round: roundNum,
              difficulty: config.difficultyKey,
              difficultyLabel: config.difficultyLabel,
              wordsCount: config.wordCount,
              wordsShown: selected.map((w) => w.wordEn),
              targetWord: target.wordEn,
            },
          });
        } catch {
          // Non-blocking
        }
      }

      // Voice prompt: Remember the words
      try {
        const prompt =
          currentLang === "as"
            ? "শব্দবোৰ মনত ৰাখক"
            : currentLang === "hi"
            ? "शब्दों को ध्यान से याद रखें"
            : "Remember the words";
        VoiceAssistant.speak(prompt, currentLang);
      } catch {
        // Optional voice
      }
    },
    [generateWordsForRound, currentLang, fadeAnim, scaleAnim]
  );

  // ── 2. Word Stepper / Timer during "showing" phase ──────────────────────────
  useEffect(() => {
    if (phase !== "showing") return;
    if (shownWords.length === 0) return;

    // Speak current word
    try {
      const currentWord = shownWords[currentWordIndex];
      if (currentWord) {
        VoiceAssistant.speak(getWordText(currentWord), currentLang);
      }
    } catch {
      // Optional voice
    }

    timerRef.current = setTimeout(() => {
      if (currentWordIndex < shownWords.length - 1) {
        // Next word in sequence
        setCurrentWordIndex((prev) => prev + 1);
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      } else {
        // All words shown, switch to question phase
        setPhase("question");
        try {
          const questionPrompt =
            currentLang === "as"
              ? "আপুনি কোনটো শব্দ দেখিছিল?"
              : currentLang === "hi"
              ? "आपने कौन सा शब्द देखा था?"
              : "Which word did you see?";
          VoiceAssistant.speak(questionPrompt, currentLang);
        } catch {
          // Optional voice
        }
      }
    }, WORD_DISPLAY_DURATION_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, currentWordIndex, shownWords, currentLang, fadeAnim]);

  // ── 3. Manual Advance Button (Elder-Friendly Pacing) ────────────────────────
  const handleManualNextWord = () => {
    if (phase !== "showing") return;
    if (timerRef.current) clearTimeout(timerRef.current);

    if (currentWordIndex < shownWords.length - 1) {
      setCurrentWordIndex((prev) => prev + 1);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    } else {
      setPhase("question");
    }
  };

  // ── 4. Initialize Game Session on Mount ─────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    gameStartTimeRef.current = Date.now();

    const init = async () => {
      try {
        const session = await gameSessionService.startSession({
          gameId: "word_recall",
          metadata: {
            gameTitle: "Word Recall",
            totalRounds: TOTAL_ROUNDS,
            mode: "cognitive_memory",
          },
        });
        if (isMounted && session) {
          sessionIdRef.current = session.sessionId;
        }
      } catch (err) {
        console.warn("[WordRecall] Failed to start game session:", err);
      }
      if (isMounted) {
        setupRound(1);
      }
    };

    init();

    return () => {
      isMounted = false;
      VoiceAssistant.stop();
      if (timerRef.current) clearTimeout(timerRef.current);
      // Early exit abandonment
      if (!isCompletedRef.current && !isAbandonedRef.current && sessionIdRef.current) {
        isAbandonedRef.current = true;
        gameSessionService
          .abandonSession(sessionIdRef.current, { reason: "patient_navigated_away" })
          .catch(() => {});
      }
    };
  }, [setupRound]);

  // ── 5. Hint / Assist Handler ───────────────────────────────────────────────
  const handleUseHint = async () => {
    if (isProcessing || phase === "result" || !targetWord) return;
    setHintUsedInRound(true);
    setHintRevealed(true);

    if (sessionIdRef.current) {
      try {
        await gameSessionService.recordEvent({
          sessionId: sessionIdRef.current,
          gameId: "word_recall",
          eventType: "hint_used",
          metadata: {
            round,
            targetWord: targetWord.wordEn,
          },
        });
      } catch {
        // Non-blocking
      }
    }

    try {
      const hintText =
        currentLang === "as"
          ? `সংকেত: বস্তুটো হৈছে ${targetWord.emoji} ${getWordText(targetWord)}`
          : currentLang === "hi"
          ? `संकेत: शब्द है ${targetWord.emoji} ${getWordText(targetWord)}`
          : `Hint: The word was ${targetWord.emoji} ${targetWord.wordEn}`;
      VoiceAssistant.speak(hintText, currentLang);
    } catch {
      // Optional voice
    }
  };

  // ── 6. Select Answer & Evaluate ────────────────────────────────────────────
  const handleSelectChoice = async (item: WordItem) => {
    if (isProcessing || phase !== "question" || !targetWord) return;
    setIsProcessing(true);
    setSelectedWordId(item.id);

    const responseTimeMs = Date.now() - roundStartTimeRef.current;
    const isCorrect = item.id === targetWord.id;

    // Record answer_submitted event
    if (sessionIdRef.current) {
      try {
        await gameSessionService.recordEvent({
          sessionId: sessionIdRef.current,
          gameId: "word_recall",
          eventType: "answer_submitted",
          metadata: {
            round,
            selectedWord: item.wordEn,
            targetWord: targetWord.wordEn,
            wordsShown: shownWords.map((w) => w.wordEn),
            isCorrect,
            attempts,
            responseTimeMs,
          },
        });
      } catch {
        // Non-blocking
      }
    }

    if (isCorrect) {
      // ── CORRECT ────────────────────────────────────────────────────────────
      setIsCorrectFeedback(true);
      const pointsEarned = hintUsedInRound
        ? BASE_POINTS_PER_ROUND - HINT_PENALTY_POINTS
        : BASE_POINTS_PER_ROUND;
      const nextTotalScore = totalScore + pointsEarned;
      setRoundScore(pointsEarned);
      setTotalScore(nextTotalScore);

      setFeedbackMessage(
        currentLang === "as"
          ? "সুন্দৰ! আপুনি শুদ্ধ শব্দটো বাছনি কৰিলে 🌟"
          : currentLang === "hi"
          ? "बहुत बढ़िया! आपने सही शब्द चुना 🌟"
          : "Wonderful! Correct word recalled 🌟"
      );

      // Record answer_correct & round_completed events
      if (sessionIdRef.current) {
        try {
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "word_recall",
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
            gameId: "word_recall",
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
      // ── INCORRECT (Gentle retry, elderly-friendly) ─────────────────────────
      setIsCorrectFeedback(false);
      totalMistakesRef.current += 1;
      setAttempts((prev) => prev + 1);

      setFeedbackMessage(
        currentLang === "as"
          ? "অলপ হেৰফেৰ হ'ল! মনত পেলাই আকৌ চেষ্টা কৰক 🌿"
          : currentLang === "hi"
          ? "थोड़ा सा अंतर रहा! याद करके फिर से प्रयास करें 🌿"
          : "Almost! Think back and try again 🌿"
      );

      // Record answer_incorrect event
      if (sessionIdRef.current) {
        try {
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "word_recall",
            eventType: "answer_incorrect",
            metadata: {
              round,
              selectedWord: item.wordEn,
              targetWord: targetWord.wordEn,
              attempts,
              responseTimeMs,
            },
          });
        } catch {
          // Non-blocking
        }
      }

      // Forgiving retry: clear selection state after 1300ms
      setTimeout(() => {
        setSelectedWordId(null);
        setFeedbackMessage(null);
        setIsProcessing(false);
      }, 1300);
    }
  };

  // ── 7. Complete Game & Full Persistence Pipeline ───────────────────────────
  const completeGame = async (finalScore: number) => {
    isCompletedRef.current = true;
    setPhase("result");
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
        console.warn("[WordRecall] completeSession error:", err);
      }
    }

    // 2. Bridge to Companion Context Persistence
    try {
      await companionContextService.recordRawGameEvent({
        gameId: "word_recall",
        eventType: "game_completed",
        payload: {
          gameName: "Word Recall",
          score: finalScore,
          durationSeconds,
          accuracyPercent,
          completed: true,
          difficulty: "3 → 5 words",
          metadata: {
            totalRounds: TOTAL_ROUNDS,
            totalMistakes: totalMistakesRef.current,
          },
        },
      });
    } catch (rawErr) {
      console.warn("[WordRecall] Companion context bridge error:", rawErr);
    }

    // 3. Flow to Caregiver Dashboard Storage
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const caregiverSession: CognitiveGameSession = {
        id: `sess-wr-${Date.now()}`,
        gameName: "Word Recall",
        iconEmoji: "📖",
        timestamp: `Today · ${timeStr}`,
        durationMinutes,
        score: finalScore,
        accuracyPercent,
        mistakes: totalMistakesRef.current,
        responseTime: "Thoughtful verbal recall",
        difficulty: "Level 1 → 5 (3-5 words)",
        difficultyChangeReason: "Progressed through verbal memory span scaling.",
        completed: true,
        humanSummary: `Completed all 5 rounds recalling visual words across increasing list sizes with ${accuracyPercent}% accuracy.`,
      };
      await caregiverStorage.recordGameSession(caregiverSession);
    } catch (cgErr) {
      console.warn("[WordRecall] Caregiver storage record error:", cgErr);
    }
  };

  // ── 8. Restart Game ────────────────────────────────────────────────────────
  const handleRestartGame = async () => {
    isCompletedRef.current = false;
    isAbandonedRef.current = false;
    setTotalScore(0);
    setRoundScore(0);
    totalMistakesRef.current = 0;
    gameStartTimeRef.current = Date.now();

    try {
      const session = await gameSessionService.startSession({
        gameId: "word_recall",
        metadata: {
          gameTitle: "Word Recall",
          totalRounds: TOTAL_ROUNDS,
          mode: "cognitive_memory",
        },
      });
      if (session) {
        sessionIdRef.current = session.sessionId;
      }
    } catch (err) {
      console.warn("[WordRecall] Restart session error:", err);
    }

    setupRound(1);
  };

  // ── 9. Render Game Complete Result Screen ───────────────────────────────────
  if (phase === "result") {
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
                ? "চমৎকার স্মৃতি শক্তি!"
                : currentLang === "hi"
                ? "शानदार स्मरण शक्ति!"
                : "Great Memory!"}
            </Text>
            <Text style={styles.resultSubtitle}>
              {currentLang === "as"
                ? "আপুনি আটাইকেইটা ৫ টা পৰ্যায়তে শব্দবোৰ মনত ৰাখি সঠিক বাছনি কৰিলে।"
                : currentLang === "hi"
                ? "आपने सभी 5 स्तरों में शब्दों को याद रखकर सही उत्तर चुना।"
                : "You recalled the words across all 5 progressive rounds."}
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
                    ? "উত্কৃষ্ট স্মৃতি"
                    : currentLang === "hi"
                    ? "उत्कृष्ट स्मरण"
                    : "Excellent Recall"
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

  // ── 10. Render Active Gameplay (Showing / Question Phases) ───────────────────
  const activeWord = shownWords[currentWordIndex] || shownWords[0];

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
              ? "শব্দ মনত ৰখাৰ খেল"
              : currentLang === "hi"
              ? "शब्द स्मरण खेल"
              : "Word Recall"}
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
          style={[styles.hintIconButton, hintRevealed && styles.hintIconButtonActive]}
          onPress={handleUseHint}
          activeOpacity={0.7}
          disabled={isProcessing || phase === "showing"}
        >
          <MaterialCommunityIcons
            name="lightbulb-outline"
            size={22}
            color={hintRevealed ? "#D97706" : "#475569"}
          />
          <Text
            style={[styles.hintIconLabel, hintRevealed && styles.hintIconLabelActive]}
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
        {/* PHASE 1: SHOWING WORDS ONE AT A TIME */}
        {phase === "showing" && activeWord && (
          <View style={styles.showingPhaseContainer}>
            {/* Header prompt */}
            <View style={styles.phaseHeaderCard}>
              <View style={styles.modeBadgeShowing}>
                <Feather name="eye" size={14} color="#6366F1" />
                <Text style={styles.modeBadgeShowingText}>
                  {currentLang === "as"
                    ? `শব্দ ${currentWordIndex + 1} / ${shownWords.length} মন কৰক`
                    : currentLang === "hi"
                    ? `शब्द ${currentWordIndex + 1} / ${shownWords.length} देखें`
                    : `Word ${currentWordIndex + 1} of ${shownWords.length}`}
                </Text>
              </View>
              <Text style={styles.phaseInstructionHeading}>
                {currentLang === "as"
                  ? "এই শব্দটো মনত ৰাখক"
                  : currentLang === "hi"
                  ? "इस शब्द को याद रखें"
                  : "Remember this word"}
              </Text>
            </View>

            {/* Word Hero Card */}
            <Animated.View
              style={[
                styles.wordHeroCard,
                { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
              ]}
            >
              <Text style={styles.wordHeroEmoji}>{activeWord.emoji}</Text>
              <Text style={styles.wordHeroText}>{getWordText(activeWord)}</Text>
              {currentLang !== "en" && (
                <Text style={styles.wordHeroEnSubtitle}>({activeWord.wordEn})</Text>
              )}
            </Animated.View>

            {/* Elder-Friendly Advance Button */}
            <TouchableOpacity
              style={styles.nextWordButton}
              onPress={handleManualNextWord}
              activeOpacity={0.8}
            >
              <Text style={styles.nextWordButtonText}>
                {currentWordIndex < shownWords.length - 1
                  ? currentLang === "as"
                    ? "পৰৱৰ্তী শব্দ →"
                    : currentLang === "hi"
                    ? "अगला शब्द →"
                    : "Next Word →"
                  : currentLang === "as"
                  ? "উত্তৰ দিয়ক →"
                  : currentLang === "hi"
                  ? "उत्तर दें →"
                  : "I Remember →"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* PHASE 2: QUESTION / RECALL CHOICES */}
        {phase === "question" && (
          <View style={styles.questionPhaseContainer}>
            {/* Question Card */}
            <Animated.View style={[styles.instructionCard, { opacity: fadeAnim }]}>
              <View style={styles.modeBadgeQuestion}>
                <Feather name="help-circle" size={14} color="#0284C7" />
                <Text style={styles.modeBadgeQuestionText}>
                  {currentConfig.difficultyLabel}
                </Text>
              </View>
              <Text style={styles.instructionHeading}>
                {currentLang === "as"
                  ? "আপুনি কোনটো শব্দ দেখিছিল?"
                  : currentLang === "hi"
                  ? "आपने कौन सा शब्द देखा था?"
                  : "Which word did you see?"}
              </Text>
              <Text style={styles.instructionSubheading}>
                {currentLang === "as"
                  ? "তলৰ তালিকাৰ পৰা সঠিক শব্দটো স্পৰ্শ কৰক।"
                  : currentLang === "hi"
                  ? "नीचे दिए गए विकल्पों में से सही शब्द चुनें।"
                  : "Tap the word that was shown in this round."}
              </Text>
            </Animated.View>

            {/* Revealed Clue Banner */}
            {hintRevealed && targetWord && (
              <View style={styles.clueBanner}>
                <MaterialCommunityIcons name="lightbulb-on" size={20} color="#D97706" />
                <Text style={styles.clueBannerText}>
                  {currentLang === "as"
                    ? `সংকেত: ${targetWord.emoji} ${getWordText(targetWord)}`
                    : currentLang === "hi"
                    ? `संकेत: ${targetWord.emoji} ${getWordText(targetWord)}`
                    : `Clue: ${targetWord.emoji} ${targetWord.wordEn}`}
                </Text>
              </View>
            )}

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

            {/* 4 Large Choices Grid */}
            <View style={styles.choicesGrid}>
              {choices.map((item) => {
                const isSelected = selectedWordId === item.id;
                const isCorrectCard = isSelected && isCorrectFeedback;
                const isIncorrectCard = isSelected && !isCorrectFeedback && feedbackMessage !== null;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.choiceCard,
                      isSelected && styles.choiceCardSelected,
                      isCorrectCard && styles.choiceCardCorrect,
                      isIncorrectCard && styles.choiceCardIncorrect,
                    ]}
                    onPress={() => handleSelectChoice(item)}
                    activeOpacity={0.8}
                    disabled={isProcessing}
                  >
                    <Text style={styles.choiceEmoji}>{item.emoji}</Text>
                    <Text style={styles.choiceText} numberOfLines={1}>
                      {getWordText(item)}
                    </Text>

                    {/* Status Badge */}
                    {isCorrectCard && (
                      <View style={styles.choiceStatusBadgeCorrect}>
                        <Feather name="check" size={16} color="#FFFFFF" />
                      </View>
                    )}
                    {isIncorrectCard && (
                      <View style={styles.choiceStatusBadgeIncorrect}>
                        <Feather name="rotate-ccw" size={14} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Footer Score & Encouragement */}
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
                ? "ধীৰে ধীৰে মনত পেলাই আনন্দৰে খেলক 🌸"
                : currentLang === "hi"
                ? "आराम से याद करें और खेल का आनंद लें 🌸"
                : "Relax and take your time recalling each word 🌸"}
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
    color: "#6366F1",
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
    backgroundColor: "#6366F1",
  },

  // Main Scroll
  mainScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },

  // Phase 1: Showing
  showingPhaseContainer: {
    marginBottom: 16,
    alignItems: "center",
  },
  phaseHeaderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Shadows.sm,
  },
  modeBadgeShowing: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
    gap: 6,
  },
  modeBadgeShowingText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4F46E5",
  },
  phaseInstructionHeading: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  wordHeroCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#E0E7FF",
    ...Shadows.md,
  },
  wordHeroEmoji: {
    fontSize: 72,
    marginBottom: 12,
  },
  wordHeroText: {
    fontSize: 38,
    fontWeight: "900",
    color: "#1E1B4B",
    textAlign: "center",
    letterSpacing: 1,
  },
  wordHeroEnSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 4,
  },
  nextWordButton: {
    backgroundColor: "#6366F1",
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.sm,
  },
  nextWordButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Phase 2: Question
  questionPhaseContainer: {
    marginBottom: 16,
  },
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
  modeBadgeQuestion: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
    gap: 6,
  },
  modeBadgeQuestionText: {
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
  instructionSubheading: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
  },
  clueBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  clueBannerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#B45309",
    flex: 1,
  },
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

  // Choices Grid
  choicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  choiceCard: {
    width: "47%",
    minHeight: 130,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    position: "relative",
    ...Shadows.sm,
  },
  choiceCardSelected: {
    borderColor: "#6366F1",
    backgroundColor: "#EEF2FF",
  },
  choiceCardCorrect: {
    borderColor: "#059669",
    backgroundColor: "#F0FDF4",
  },
  choiceCardIncorrect: {
    borderColor: "#F97316",
    backgroundColor: "#FFF7ED",
  },
  choiceEmoji: {
    fontSize: 44,
    marginBottom: 6,
  },
  choiceText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
  },
  choiceStatusBadgeCorrect: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
  },
  choiceStatusBadgeIncorrect: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F97316",
    alignItems: "center",
    justifyContent: "center",
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
    marginTop: 8,
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
