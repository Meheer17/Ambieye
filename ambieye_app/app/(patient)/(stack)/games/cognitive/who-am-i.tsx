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
export interface MysteryClue {
  id: string;
  textEn: string;
  textAs: string;
  textHi: string;
  iconEmoji: string;
}

export interface RoleChoice {
  id: string;
  nameEn: string;
  nameAs: string;
  nameHi: string;
  emoji: string;
  isCorrect: boolean;
}

export interface MysteryRoleRound {
  roundNumber: number;
  roleNameEn: string;
  roleNameAs: string;
  roleNameHi: string;
  mysteryEmoji: string;
  themeColor: string;
  themeBg: string;
  visualIcons: string[]; // e.g. ["🩺", "💊", "🏥"]
  clues: MysteryClue[];
  choices: RoleChoice[];
}

export const TOTAL_ROUNDS = 5;
export const BASE_POINTS_PER_ROUND = 100;
export const HINT_PENALTY_POINTS = 10;

// ── 5 Mystery Person Rounds Dataset ──────────────────────────────────────────
export const MYSTERY_ROUNDS: Record<number, MysteryRoleRound> = {
  // Round 1: Doctor (🩺 + 💊 + 🏥)
  1: {
    roundNumber: 1,
    roleNameEn: "Doctor",
    roleNameAs: "চিকিৎসক / ডাক্তাৰ",
    roleNameHi: "डॉक्टर / चिकित्सक",
    mysteryEmoji: "🩺",
    themeColor: "#0284C7",
    themeBg: "#F0F9FF",
    visualIcons: ["🩺", "💊", "🏥"],
    clues: [
      {
        id: "c1_1",
        textEn: "I work in a hospital and clinic.",
        textAs: "মই চিকিৎসালয় আৰু ক্লিনিকত কাম কৰোঁ।",
        textHi: "मैं अस्पताल और क्लिनिक में काम करता हूँ।",
        iconEmoji: "🏥",
      },
      {
        id: "c1_2",
        textEn: "I help you get healthy when you feel sick.",
        textAs: "অসুখ হ'লে মই আপোনাক সুস্থ কৰি তোলোঁ।",
        textHi: "तबीयत खराब होने पर मैं आपकी देखभाल करता हूँ।",
        iconEmoji: "💊",
      },
      {
        id: "c1_3",
        textEn: "I listen to your heartbeat with a stethoscope.",
        textAs: "মই ষ্টেথ'স্কোপেৰে আপোনাৰ হৃদস্পন্দন শুনোঁ।",
        textHi: "मैं स्टेथोस्कोप से आपकी धड़कन सुनता हूँ।",
        iconEmoji: "🩺",
      },
    ],
    choices: [
      { id: "ch_doctor", nameEn: "Doctor", nameAs: "চিকিৎসক", nameHi: "डॉक्टर", emoji: "🩺", isCorrect: true },
      { id: "ch_teacher", nameEn: "Teacher", nameAs: "শিক্ষক", nameHi: "शिक्षक", emoji: "🧑‍🏫", isCorrect: false },
      { id: "ch_farmer", nameEn: "Farmer", nameAs: "কৃষক", nameHi: "किसान", emoji: "🌾", isCorrect: false },
      { id: "ch_police", nameEn: "Police Officer", nameAs: "আৰক্ষী", nameHi: "पुलिस", emoji: "👮", isCorrect: false },
    ],
  },

  // Round 2: Teacher (📚 + ✏️ + 🏫)
  2: {
    roundNumber: 2,
    roleNameEn: "Teacher",
    roleNameAs: "শিক্ষক / শিক্ষয়িত্ৰী",
    roleNameHi: "शिक्षक / अध्यापिका",
    mysteryEmoji: "🧑‍🏫",
    themeColor: "#7C3AED",
    themeBg: "#FAF5FF",
    visualIcons: ["📚", "✏️", "🏫"],
    clues: [
      {
        id: "c2_1",
        textEn: "I teach curious students in a classroom.",
        textAs: "মই শ্ৰেণীকোঠাত ছাত্ৰ-ছাত্ৰীক পাঠদান কৰোঁ।",
        textHi: "मैं कक्षा में बच्चों को पढ़ाता हूँ।",
        iconEmoji: "🏫",
      },
      {
        id: "c2_2",
        textEn: "I write helpful lessons on the blackboard.",
        textAs: "মই ব্লেকব'ৰ্ডত নতুন বিষয় লিখি দিওঁ।",
        textHi: "मैं श्यामपट्ट पर ज्ञानवर्धक बातें लिखता हूँ।",
        iconEmoji: "✏️",
      },
      {
        id: "c2_3",
        textEn: "I share wonderful books and stories.",
        textAs: "মই জ্ঞানবৰ্ধক কিতাপ আৰু সাধু পঢ়িবলৈ দিওঁ।",
        textHi: "मैं सुंदर किताबें और कहानियां सिखाता हूँ।",
        iconEmoji: "📚",
      },
    ],
    choices: [
      { id: "ch_cook", nameEn: "Cook / Chef", nameAs: "ৰান্ধনী", nameHi: "रसोइया", emoji: "👨‍🍳", isCorrect: false },
      { id: "ch_teacher_2", nameEn: "Teacher", nameAs: "শিক্ষক", nameHi: "शिक्षक", emoji: "🧑‍🏫", isCorrect: true },
      { id: "ch_artist", nameEn: "Artist", nameAs: "শিল্পী", nameHi: "कलाकार", emoji: "🎨", isCorrect: false },
      { id: "ch_driver", nameEn: "Bus Driver", nameAs: "চালক", nameHi: "ड्राइवर", emoji: "🚌", isCorrect: false },
    ],
  },

  // Round 3: Farmer (🌾 + 🚜 + ☀️)
  3: {
    roundNumber: 3,
    roleNameEn: "Farmer",
    roleNameAs: "কৃষক / খেতিয়ক",
    roleNameHi: "किसान",
    mysteryEmoji: "🌾",
    themeColor: "#059669",
    themeBg: "#F0FDF4",
    visualIcons: ["🌾", "🚜", "☀️"],
    clues: [
      {
        id: "c3_1",
        textEn: "I work outdoors in the fresh open green fields.",
        textAs: "মই মুকলি সেউজীয়া পথাৰত কাম কৰোঁ।",
        textHi: "मैं खुले हरे-भरे खेतों में काम करता हूँ।",
        iconEmoji: "☀️",
      },
      {
        id: "c3_2",
        textEn: "I grow nutritious rice, vegetables, and golden wheat.",
        textAs: "মই ধান, শাক-পাচলি আৰু শস্যৰ খেতি কৰোঁ।",
        textHi: "मैं अनाज, धान और ताज़ी सब्ज़ियां उगाता हूँ।",
        iconEmoji: "🌾",
      },
      {
        id: "c3_3",
        textEn: "I harvest fresh food for our whole country.",
        textAs: "সকলোৰে বাবে মই কষ্টৰে শস্য চপাওঁ।",
        textHi: "मैं सबके भोजन के लिए फसलें उगाता हूँ।",
        iconEmoji: "🚜",
      },
    ],
    choices: [
      { id: "ch_farmer_3", nameEn: "Farmer", nameAs: "কৃষক", nameHi: "किसान", emoji: "🌾", isCorrect: true },
      { id: "ch_doctor_3", nameEn: "Doctor", nameAs: "চিকিৎসক", nameHi: "डॉक्टर", emoji: "🩺", isCorrect: false },
      { id: "ch_gardener", nameEn: "Gardener", nameAs: "মালী", nameHi: "माली", emoji: "🧑‍🌾", isCorrect: false },
      { id: "ch_mechanic", nameEn: "Mechanic", nameAs: "মিস্ত্ৰী", nameHi: "मैकेनिक", emoji: "🔧", isCorrect: false },
    ],
  },

  // Round 4: Cook / Chef (🍳 + 🍲 + 🧑‍🍳)
  4: {
    roundNumber: 4,
    roleNameEn: "Cook / Chef",
    roleNameAs: "ৰান্ধনী / চেফ",
    roleNameHi: "रसोइया / बावर्ची",
    mysteryEmoji: "👨‍🍳",
    themeColor: "#D97706",
    themeBg: "#FFFBEB",
    visualIcons: ["🍳", "🍲", "🫖"],
    clues: [
      {
        id: "c4_1",
        textEn: "I work in a fragrant kitchen.",
        textAs: "মই সুগন্ধি পাকঘৰত কাম কৰোঁ।",
        textHi: "मैं स्वादिष्ट रसोई में काम करता हूँ।",
        iconEmoji: "🫖",
      },
      {
        id: "c4_2",
        textEn: "I use pots, pans, and aromatic spices.",
        textAs: "মই কেৰাহী, পাত্ৰ আৰু সুগন্ধি মছলা ব্যৱহাৰ কৰোঁ।",
        textHi: "मैं कड़ाही, बर्तन और मसालों का उपयोग करता हूँ।",
        iconEmoji: "🍳",
      },
      {
        id: "c4_3",
        textEn: "I prepare warm delicious meals and tea for you.",
        textAs: "মই সকলোৰে বাবে সুস্বাদু গৰম আহাৰ ৰান্ধোঁ।",
        textHi: "मैं आपके लिए गरमा-गरम स्वादिष्ट भोजन बनाता हूँ।",
        iconEmoji: "🍲",
      },
    ],
    choices: [
      { id: "ch_police_4", nameEn: "Police Officer", nameAs: "আৰক্ষী", nameHi: "पुलिस", emoji: "👮", isCorrect: false },
      { id: "ch_cook_4", nameEn: "Cook / Chef", nameAs: "ৰান্ধনী", nameHi: "रसोइया", emoji: "👨‍🍳", isCorrect: true },
      { id: "ch_shopkeeper", nameEn: "Shopkeeper", nameAs: "দোকানী", nameHi: "दुकानदार", emoji: "🏪", isCorrect: false },
      { id: "ch_teacher_4", nameEn: "Teacher", nameAs: "শিক্ষক", nameHi: "शिक्षक", emoji: "🧑‍🏫", isCorrect: false },
    ],
  },

  // Round 5: Gardener (🌸 + 🪴 + 🚿)
  5: {
    roundNumber: 5,
    roleNameEn: "Gardener",
    roleNameAs: "মালী / ফুলনিৰ যত্ন লোৱা",
    roleNameHi: "माली",
    mysteryEmoji: "🧑‍🌾",
    themeColor: "#EC4899",
    themeBg: "#FDF2F8",
    visualIcons: ["🌸", "🪴", "🚿"],
    clues: [
      {
        id: "c5_1",
        textEn: "I take care of beautiful courtyard gardens.",
        textAs: "মই সুন্দৰ ফুলনি বাগিচাৰ যত্ন লওঁ।",
        textHi: "मैं सुंदर बगीचे और फूलों की देखभाल करता हूँ।",
        iconEmoji: "🪴",
      },
      {
        id: "c5_2",
        textEn: "I water green plants and nurture blooming flowers.",
        textAs: "মই গছত পানী দিওঁ আৰু ফুল ফুলাওঁ।",
        textHi: "मैं पौधों में पानी डालता हूँ और फूल खिलाता हूँ।",
        iconEmoji: "🚿",
      },
      {
        id: "c5_3",
        textEn: "I love sweet fragrances and rich garden soil.",
        textAs: "মই ফুলৰ সুবাস আৰু সেউজীয়া প্ৰকৃতি ভাল পাওঁ।",
        textHi: "मुझे फूलों की मीठी खुशबू और मिट्टी बहुत पसंद है।",
        iconEmoji: "🌸",
      },
    ],
    choices: [
      { id: "ch_gardener_5", nameEn: "Gardener", nameAs: "মালী", nameHi: "माली", emoji: "🧑‍🌾", isCorrect: true },
      { id: "ch_artist_5", nameEn: "Artist", nameAs: "শিল্পী", nameHi: "कलाकार", emoji: "🎨", isCorrect: false },
      { id: "ch_farmer_5", nameEn: "Farmer", nameAs: "কৃষক", nameHi: "किसान", emoji: "🌾", isCorrect: false },
      { id: "ch_doctor_5", nameEn: "Doctor", nameAs: "চিকিৎসক", nameHi: "डॉक्टर", emoji: "🩺", isCorrect: false },
    ],
  },
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function WhoAmIScreen() {
  const router = useRouter();
  const { t, currentLang } = useTranslation();

  // ── Gameplay State ─────────────────────────────────────────────────────────
  const [round, setRound] = useState<number>(1);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [currentRound, setCurrentRound] = useState<MysteryRoleRound>(MYSTERY_ROUNDS[1]);
  const [revealedClueCount, setRevealedClueCount] = useState<number>(1);
  const [shuffledChoices, setShuffledChoices] = useState<RoleChoice[]>([]);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<number>(1);
  const [roundScore, setRoundScore] = useState<number>(0);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isCorrectFeedback, setIsCorrectFeedback] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [hintUsedInRound, setHintUsedInRound] = useState<boolean>(false);

  // ── Telemetry & Resilience State ───────────────────────────────────────────
  const sessionIdRef = useRef<string | null>(null);
  const gameStartTimeRef = useRef<number>(Date.now());
  const roundStartTimeRef = useRef<number>(Date.now());
  const totalMistakesRef = useRef<number>(0);
  const isCompletedRef = useRef<boolean>(false);
  const isAbandonedRef = useRef<boolean>(false);

  // ── Animations ─────────────────────────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getRoleName = (r: MysteryRoleRound) => {
    if (currentLang === "as") return r.roleNameAs;
    if (currentLang === "hi") return r.roleNameHi;
    return r.roleNameEn;
  };

  const getClueText = (clue: MysteryClue) => {
    if (currentLang === "as") return clue.textAs;
    if (currentLang === "hi") return clue.textHi;
    return clue.textEn;
  };

  const getChoiceName = (choice: RoleChoice) => {
    if (currentLang === "as") return choice.nameAs;
    if (currentLang === "hi") return choice.nameHi;
    return choice.nameEn;
  };

  // ── 1. Setup Round ─────────────────────────────────────────────────────────
  const setupRound = useCallback(
    async (roundNum: number) => {
      const r = MYSTERY_ROUNDS[roundNum] || MYSTERY_ROUNDS[1];
      const randomizedChoices = [...r.choices].sort(() => 0.5 - Math.random());

      setRound(roundNum);
      setCurrentRound(r);
      setRevealedClueCount(1);
      setShuffledChoices(randomizedChoices);
      setSelectedChoiceId(null);
      setAttempts(1);
      setHintUsedInRound(false);
      setFeedbackMessage(null);
      setIsProcessing(false);
      roundStartTimeRef.current = Date.now();

      // Trigger smooth transition animation
      fadeAnim.setValue(0);
      bounceAnim.setValue(0.95);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(bounceAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
      ]).start();

      // Record round_started and clue_revealed events
      if (sessionIdRef.current) {
        try {
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "who_am_i",
            eventType: "round_started",
            metadata: {
              round: roundNum,
              role: r.roleNameEn,
              clueCount: r.clues.length,
              cluesShown: [r.clues[0].textEn],
            },
          });

          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "who_am_i",
            eventType: "clue_revealed",
            metadata: {
              round: roundNum,
              role: r.roleNameEn,
              clueIndex: 1,
              clueText: r.clues[0].textEn,
            },
          });
        } catch {
          // Non-blocking
        }
      }

      // Voice prompt: narrate the first clue
      try {
        const firstClue = r.clues[0];
        const clueToSpeak =
          currentLang === "as"
            ? `মই কোন? ${firstClue.textAs}`
            : currentLang === "hi"
            ? `मैं कौन हूँ? ${firstClue.textHi}`
            : `Who am I? ${firstClue.textEn}`;
        VoiceAssistant.speak(clueToSpeak, currentLang);
      } catch {
        // Optional voice
      }
    },
    [currentLang, fadeAnim, bounceAnim]
  );

  // ── 2. Initialize Game Session on Mount ─────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    gameStartTimeRef.current = Date.now();

    const init = async () => {
      try {
        const session = await gameSessionService.startSession({
          gameId: "who_am_i",
          metadata: {
            gameTitle: "Who Am I? (Role Recognition)",
            totalRounds: TOTAL_ROUNDS,
            mode: "semantic_memory_role_recognition",
          },
        });
        if (isMounted && session) {
          sessionIdRef.current = session.sessionId;
        }
      } catch (err) {
        console.warn("[WhoAmI] Failed to start game session:", err);
      }
      if (isMounted) {
        setupRound(1);
      }
    };

    init();

    return () => {
      isMounted = false;
      // Early exit abandonment
      if (!isCompletedRef.current && !isAbandonedRef.current && sessionIdRef.current) {
        isAbandonedRef.current = true;
        gameSessionService
          .abandonSession(sessionIdRef.current, { reason: "patient_navigated_away" })
          .catch(() => {});
      }
    };
  }, [setupRound]);

  // ── 3. Reveal Next Clue / Assist Handler ───────────────────────────────────
  const handleRevealNextClue = async () => {
    if (isProcessing || isCompleted) return;
    if (revealedClueCount >= currentRound.clues.length) return;

    const nextIndex = revealedClueCount + 1;
    setRevealedClueCount(nextIndex);
    setHintUsedInRound(true);

    const nextClue = currentRound.clues[nextIndex - 1];

    if (sessionIdRef.current) {
      try {
        await gameSessionService.recordEvent({
          sessionId: sessionIdRef.current,
          gameId: "who_am_i",
          eventType: "clue_revealed",
          metadata: {
            round,
            role: currentRound.roleNameEn,
            clueIndex: nextIndex,
            clueText: nextClue.textEn,
          },
        });
      } catch {
        // Non-blocking
      }
    }

    try {
      VoiceAssistant.speak(getClueText(nextClue), currentLang);
    } catch {
      // Optional voice
    }
  };

  // ── 4. Answer Selection & Evaluation ───────────────────────────────────────
  const handleSelectAnswer = async (choice: RoleChoice) => {
    if (isProcessing || isCompleted) return;
    setIsProcessing(true);
    setSelectedChoiceId(choice.id);

    const responseTimeMs = Date.now() - roundStartTimeRef.current;
    const isCorrect = choice.isCorrect;

    // Record answer_selected event
    if (sessionIdRef.current) {
      try {
        await gameSessionService.recordEvent({
          sessionId: sessionIdRef.current,
          gameId: "who_am_i",
          eventType: "answer_selected",
          metadata: {
            round,
            role: currentRound.roleNameEn,
            selectedAnswer: choice.nameEn,
            correctAnswer: currentRound.roleNameEn,
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
      // ── CORRECT GUESS ──────────────────────────────────────────────────────
      setIsCorrectFeedback(true);
      const pointsEarned = hintUsedInRound
        ? BASE_POINTS_PER_ROUND - HINT_PENALTY_POINTS
        : BASE_POINTS_PER_ROUND;
      const nextTotalScore = totalScore + pointsEarned;
      setRoundScore(pointsEarned);
      setTotalScore(nextTotalScore);

      setFeedbackMessage(
        currentLang === "as"
          ? `সুন্দৰ! শুদ্ধ উত্তৰ: ${getRoleName(currentRound)} 🌟`
          : currentLang === "hi"
          ? `बहुत बढ़िया! सही उत्तर: ${getRoleName(currentRound)} 🌟`
          : `Wonderful! Correct: ${currentRound.roleNameEn} 🌟`
      );

      if (sessionIdRef.current) {
        try {
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "who_am_i",
            eventType: "answer_correct",
            metadata: {
              round,
              role: currentRound.roleNameEn,
              pointsEarned,
              attempts,
              responseTimeMs,
            },
          });
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "who_am_i",
            eventType: "round_completed",
            metadata: {
              round,
              role: currentRound.roleNameEn,
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
      // ── INCORRECT GUESS (Gentle retry, elderly-friendly) ───────────────────
      setIsCorrectFeedback(false);
      totalMistakesRef.current += 1;
      setAttempts((prev) => prev + 1);

      // Auto-reveal another clue if available to help patient!
      if (revealedClueCount < currentRound.clues.length) {
        setRevealedClueCount((prev) => prev + 1);
      }

      setFeedbackMessage(
        currentLang === "as"
          ? "অলপ হেৰফেৰ হ'ল! আন এটি বাছক 🌿"
          : currentLang === "hi"
          ? "थोड़ा सा अंतर रहा! दूसरा विकल्प आज़माएं 🌿"
          : "Almost! Try another one 🌿"
      );

      if (sessionIdRef.current) {
        try {
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "who_am_i",
            eventType: "answer_incorrect",
            metadata: {
              round,
              role: currentRound.roleNameEn,
              selectedAnswer: choice.nameEn,
              attempts,
              responseTimeMs,
            },
          });
        } catch {
          // Non-blocking
        }
      }

      // Allow retry after gentle highlight
      setTimeout(() => {
        setSelectedChoiceId(null);
        setFeedbackMessage(null);
        setIsProcessing(false);
      }, 1200);
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
        console.warn("[WhoAmI] Complete session API warning:", err);
      }
    }

    // 2. Persist to Caregiver Dashboard Storage
    try {
      const caregiverSession: CognitiveGameSession = {
        id: `sess-who-${Date.now()}`,
        gameName: "Who Am I? (Role Recognition)",
        iconEmoji: "🎭",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        durationMinutes,
        score: finalScore,
        accuracyPercent,
        mistakes: totalMistakesRef.current,
        responseTime: "Comfortable semantic recall pace",
        difficulty: "5 Familiar Community Roles",
        difficultyChangeReason: "Exercised semantic memory, descriptive clues, and role recognition.",
        completed: true,
        humanSummary: `Completed all 5 mystery person rounds (Doctor, Teacher, Farmer, Cook, Gardener) with ${accuracyPercent}% accuracy.`,
      };
      await caregiverStorage.recordGameSession(caregiverSession);
    } catch (err) {
      console.warn("[WhoAmI] Caregiver storage save error:", err);
    }

    // 3. Persist to Virtual Companion Context Pipeline
    try {
      await companionContextService.recordRawGameEvent({
        gameId: "who_am_i",
        eventType: "game_completed",
        payload: {
          gameName: "Who Am I? (Role Recognition)",
          score: finalScore,
          durationSeconds,
          accuracyPercent,
          completed: true,
          difficulty: "Semantic Memory & Recognition",
          metadata: {
            totalRounds: TOTAL_ROUNDS,
            totalMistakes: totalMistakesRef.current,
            rolesRecognized: Object.values(MYSTERY_ROUNDS).map((r) => r.roleNameEn),
          },
        },
      });
    } catch (err) {
      console.warn("[WhoAmI] Companion context save error:", err);
    }

    // Voice completion celebration
    try {
      const celebration =
        currentLang === "as"
          ? "অসাধাৰণ! আপুনি সকলো সমাজৰ চিনাকি ব্যক্তি সুন্দৰকৈ চিনাক্ত কৰিলে।"
          : currentLang === "hi"
          ? "अद्भुत! आपने सभी परिचित भूमिकाओं को बहुत सुंदर ढंग से पहचाना।"
          : "Splendid! You solved every mystery role with sharp semantic recall.";
      VoiceAssistant.speak(celebration, currentLang);
    } catch {
      // Optional voice
    }
  };

  // ── Render: Game Complete Screen ───────────────────────────────────────────
  if (isCompleted) {
    const durationSeconds = Math.max(
      1,
      Math.round((Date.now() - gameStartTimeRef.current) / 1000)
    );
    const durationMinutes = Math.floor(durationSeconds / 60);
    const remainingSeconds = durationSeconds % 60;
    const timeDisplay =
      durationMinutes > 0
        ? `${durationMinutes}m ${remainingSeconds}s`
        : `${remainingSeconds}s`;

    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.completionScroll}>
          <View style={styles.completionCard}>
            <View style={styles.completionIconCircle}>
              <Text style={styles.completionEmoji}>🎭</Text>
            </View>

            <View style={styles.completionTag}>
              <Feather name="check-circle" size={14} color="#059669" />
              <Text style={styles.completionTagText}>MYSTERY ROLES SOLVED</Text>
            </View>

            <Text style={styles.completionTitle}>
              {currentLang === "as"
                ? "চমৎকাৰ চিনাক্তকৰণ!"
                : currentLang === "hi"
                ? "शानदार पहचान!"
                : "Wonderful Recognition!"}
            </Text>

            <Text style={styles.completionSubtitle}>
              {currentLang === "as"
                ? "আপুনি সমাজৰ সকলো চিনাকি ভূমিকা আৰু বৃত্তিৰ লক্ষণসমূহ সুন্দৰভাৱে চিনি পালে।"
                : currentLang === "hi"
                ? "आपने सभी परिचित सामाजिक भूमिकाओं को संकेतों के माध्यम से बहुत अच्छे से पहचाना।"
                : "You recognized every everyday community role through clues and semantic memory."}
            </Text>

            {/* Score & Telemetry Cards */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>GAME SCORE</Text>
                <Text style={styles.statValue}>{totalScore}</Text>
                <Text style={styles.statSub}>Max 500</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statLabel}>ROUNDS</Text>
                <Text style={styles.statValue}>{TOTAL_ROUNDS} / {TOTAL_ROUNDS}</Text>
                <Text style={styles.statSub}>Completed</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statLabel}>TIME TAKEN</Text>
                <Text style={styles.statValue}>{timeDisplay}</Text>
                <Text style={styles.statSub}>Paced</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statLabel}>RETRIES</Text>
                <Text style={styles.statValue}>{totalMistakesRef.current}</Text>
                <Text style={styles.statSub}>Gentle Steps</Text>
              </View>
            </View>

            {/* Caregiver & Companion Sync Status */}
            <View style={styles.syncNotice}>
              <Feather name="shield" size={15} color="#2563EB" />
              <Text style={styles.syncNoticeText}>
                {currentLang === "as"
                  ? "ফলাফল তত্বাৱধায়ক ডেচব'ৰ্ডত সুৰক্ষিতভাৱে সংৰক্ষণ কৰা হ'ল"
                  : currentLang === "hi"
                  ? "परिणाम देखभालकर्ता डैशबोर्ड में सुरक्षित सहेजा गया"
                  : "Saved to Caregiver Dashboard & Companion Memory"}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => {
                  isCompletedRef.current = false;
                  setIsCompleted(false);
                  setTotalScore(0);
                  totalMistakesRef.current = 0;
                  setupRound(1);
                }}
                activeOpacity={0.85}
              >
                <Feather name="rotate-ccw" size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>
                  {currentLang === "as"
                    ? "আকৌ খেলক"
                    : currentLang === "hi"
                    ? "फिर से खेलें"
                    : "Play Again"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <Feather name="arrow-left" size={18} color="#475569" />
                <Text style={styles.secondaryButtonText}>
                  {currentLang === "as"
                    ? "খেলসমূহলৈ উভতি যাওক"
                    : currentLang === "hi"
                    ? "खेलों पर वापस जाएं"
                    : "Back to Games"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Render: Active Gameplay Screen ─────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="chevron-left" size={26} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.navTitleContainer}>
          <Text style={styles.navTitle}>
            {currentLang === "as"
              ? "মই কোন? (Who Am I?)"
              : currentLang === "hi"
              ? "मैं कौन हूँ? (Who Am I?)"
              : "Who Am I?"}
          </Text>
          <Text style={styles.navSubtitle}>
            {currentLang === "as"
              ? `পৰ্যায় ${round} / ${TOTAL_ROUNDS}`
              : currentLang === "hi"
              ? `दौर ${round} / ${TOTAL_ROUNDS}`
              : `Round ${round} of ${TOTAL_ROUNDS}`}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.hintButton,
            revealedClueCount >= currentRound.clues.length && styles.hintButtonDisabled,
          ]}
          onPress={handleRevealNextClue}
          activeOpacity={0.7}
          disabled={revealedClueCount >= currentRound.clues.length || isProcessing}
        >
          <MaterialCommunityIcons
            name="lightbulb-outline"
            size={22}
            color={revealedClueCount >= currentRound.clues.length ? "#94A3B8" : "#D97706"}
          />
        </TouchableOpacity>
      </View>

      {/* Progress Dots Bar */}
      <View style={styles.progressContainer}>
        {Array.from({ length: TOTAL_ROUNDS }).map((_, index) => {
          const stepNum = index + 1;
          const isDone = stepNum < round;
          const isCurrent = stepNum === round;
          return (
            <View
              key={`dot-${index}`}
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
        contentContainerStyle={styles.gameplayScroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ scale: bounceAnim }],
            width: "100%",
          }}
        >
          {/* Mystery Person Clue Card */}
          <View style={styles.mysteryCard}>
            {/* Visual Icon Clues Row */}
            <View style={styles.visualIconsRow}>
              {currentRound.visualIcons.map((ic, idx) => (
                <View key={`vis-${idx}`} style={styles.visualIconCircle}>
                  <Text style={styles.visualIconText}>{ic}</Text>
                </View>
              ))}
            </View>

            <View style={styles.mysteryTagBadge}>
              <Text style={styles.mysteryTagText}>MYSTERY PERSON CLUES</Text>
            </View>

            {/* Revealed Text Clues List */}
            <View style={styles.cluesList}>
              {currentRound.clues.slice(0, revealedClueCount).map((clue, idx) => (
                <View key={clue.id} style={styles.clueItemBox}>
                  <View style={styles.clueNumberBadge}>
                    <Text style={styles.clueNumberText}>#{idx + 1}</Text>
                  </View>
                  <Text style={styles.clueItemText}>{getClueText(clue)}</Text>
                </View>
              ))}
            </View>

            {/* Clue Progress / Reveal Next Prompt */}
            {revealedClueCount < currentRound.clues.length && (
              <TouchableOpacity
                style={styles.moreClueButton}
                onPress={handleRevealNextClue}
                activeOpacity={0.8}
                disabled={isProcessing}
              >
                <Feather name="plus-circle" size={15} color="#2563EB" />
                <Text style={styles.moreClueButtonText}>
                  {currentLang === "as"
                    ? "আৰু এটা সূত্ৰ চাওক (Next Clue)"
                    : currentLang === "hi"
                    ? "अगला संकेत देखें (Next Clue)"
                    : "Show Next Clue"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Feedback Message Banner */}
          {feedbackMessage && (
            <View
              style={[
                styles.feedbackBanner,
                isCorrectFeedback
                  ? styles.feedbackBannerCorrect
                  : styles.feedbackBannerIncorrect,
              ]}
            >
              <Feather
                name={isCorrectFeedback ? "check-circle" : "info"}
                size={18}
                color={isCorrectFeedback ? "#15803D" : "#B45309"}
              />
              <Text
                style={[
                  styles.feedbackBannerText,
                  isCorrectFeedback
                    ? styles.feedbackTextCorrect
                    : styles.feedbackTextIncorrect,
                ]}
              >
                {feedbackMessage}
              </Text>
            </View>
          )}

          {/* Instruction Label */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderText}>
              {currentLang === "as"
                ? "মই কোন? সঠিক বৃত্তিটো বাছক"
                : currentLang === "hi"
                ? "मैं कौन हूँ? सही भूमिका चुनें"
                : "Who am I? Select the right person"}
            </Text>
          </View>

          {/* 4 Large Answer Cards Grid (2x2) */}
          <View style={styles.choicesGrid}>
            {shuffledChoices.map((choice) => {
              const isSelected = selectedChoiceId === choice.id;
              const isCorrect = choice.isCorrect;

              let borderHighlight = "#E2E8F0";
              let bgHighlight = "#FFFFFF";

              if (isSelected) {
                if (isCorrectFeedback && isCorrect) {
                  borderHighlight = "#22C55E";
                  bgHighlight = "#F0FDF4";
                } else if (!isCorrectFeedback) {
                  borderHighlight = "#F59E0B";
                  bgHighlight = "#FFFBEB";
                }
              }

              return (
                <TouchableOpacity
                  key={choice.id}
                  style={[
                    styles.choiceCard,
                    {
                      borderColor: borderHighlight,
                      backgroundColor: bgHighlight,
                    },
                  ]}
                  onPress={() => handleSelectAnswer(choice)}
                  activeOpacity={0.8}
                  disabled={isProcessing}
                >
                  <View style={styles.choiceEmojiCircle}>
                    <Text style={styles.choiceEmojiText}>{choice.emoji}</Text>
                  </View>

                  <Text style={styles.choiceNameText} numberOfLines={2}>
                    {getChoiceName(choice)}
                  </Text>

                  {isSelected && (
                    <View style={styles.choiceStatusBadge}>
                      <Feather
                        name={isCorrectFeedback ? "check-circle" : "refresh-cw"}
                        size={16}
                        color={isCorrectFeedback ? "#15803D" : "#B45309"}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Footer Bar */}
      <View style={styles.footerBar}>
        <View style={styles.scorePill}>
          <Text style={styles.scorePillLabel}>GAME SCORE</Text>
          <Text style={styles.scorePillValue}>{totalScore}</Text>
        </View>

        <View style={styles.footerPrompt}>
          <Feather name="smile" size={14} color="#64748B" />
          <Text style={styles.footerPromptText}>
            {currentLang === "as"
              ? "চিনাকি ভূমিকাৰ স্মৃতি আৰু বুজাপৰা"
              : currentLang === "hi"
              ? "स्मृति एवं भूमिका पहचान"
              : "Semantic role recognition"}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ── Stylesheet ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  navTitleContainer: {
    alignItems: "center",
  },
  navTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  navSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 1,
  },
  hintButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  hintButtonDisabled: {
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    gap: 8,
    backgroundColor: "#FFFFFF",
  },
  progressDot: {
    width: 14,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
  },
  progressDotDone: {
    backgroundColor: "#10B981",
    width: 22,
  },
  progressDotCurrent: {
    backgroundColor: "#2563EB",
    width: 30,
  },
  gameplayScroll: {
    padding: Spacing.lg,
    alignItems: "center",
    paddingBottom: 40,
  },
  mysteryCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    ...Shadows.md,
    marginBottom: Spacing.md,
  },
  visualIconsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: Spacing.sm,
  },
  visualIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  visualIconText: {
    fontSize: 26,
  },
  mysteryTagBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  mysteryTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.8,
  },
  cluesList: {
    width: "100%",
    gap: 8,
    marginBottom: Spacing.sm,
  },
  clueItemBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: 10,
  },
  clueNumberBadge: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  clueNumberText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  clueItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    lineHeight: 22,
  },
  moreClueButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    gap: 6,
    marginTop: 4,
  },
  moreClueButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1D4ED8",
  },
  feedbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    width: "100%",
    gap: 8,
  },
  feedbackBannerCorrect: {
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  feedbackBannerIncorrect: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  feedbackBannerText: {
    fontSize: 15,
    fontWeight: "800",
  },
  feedbackTextCorrect: {
    color: "#166534",
  },
  feedbackTextIncorrect: {
    color: "#92400E",
  },
  sectionHeaderRow: {
    width: "100%",
    marginBottom: Spacing.sm,
    paddingHorizontal: 4,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  choicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
    gap: Spacing.md,
  },
  choiceCard: {
    width: (width - Spacing.lg * 2 - Spacing.md) / 2,
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    minHeight: 140,
    position: "relative",
    ...Shadows.sm,
  },
  choiceEmojiCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  choiceEmojiText: {
    fontSize: 32,
  },
  choiceNameText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
    lineHeight: 20,
  },
  choiceStatusBadge: {
    marginTop: 6,
  },
  footerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  scorePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
  },
  scorePillLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1D4ED8",
  },
  scorePillValue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1E40AF",
  },
  footerPrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerPromptText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  completionScroll: {
    padding: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  completionCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    ...Shadows.md,
  },
  completionIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  completionEmoji: {
    fontSize: 42,
  },
  completionTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
    marginBottom: Spacing.sm,
  },
  completionTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#059669",
    letterSpacing: 0.5,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 6,
  },
  completionSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statBox: {
    width: (width - Spacing.xl * 2 - Spacing.xl * 2 - Spacing.sm) / 2,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
    marginVertical: 2,
  },
  statSub: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
  },
  syncNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    gap: 8,
    width: "100%",
    marginBottom: Spacing.xl,
  },
  syncNoticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#1E40AF",
  },
  actionButtons: {
    width: "100%",
    gap: Spacing.sm,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: BorderRadius.xl,
    gap: 8,
    ...Shadows.sm,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 14,
    borderRadius: BorderRadius.xl,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#475569",
  },
});
