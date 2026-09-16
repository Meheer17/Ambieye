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
export interface GridItem {
  id: string;
  nameEn: string;
  nameAs: string;
  nameHi: string;
  emoji: string;
  isTarget: boolean;
}

export interface TreasureHuntRoundConfig {
  roundNumber: number;
  difficultyLabel: string;
  difficultyKey: "easy" | "easy_medium" | "medium" | "challenging" | "mastery";
  targetNameEn: string;
  targetNameAs: string;
  targetNameHi: string;
  targetEmoji: string;
  targetCount: number;
  totalItems: number;
  columns: number;
  missionPromptEn: string;
  missionPromptAs: string;
  missionPromptHi: string;
  themeColor: string;
  themeBg: string;
  clueEn: string;
  clueAs: string;
  clueHi: string;
  distractorPool: Array<{ nameEn: string; nameAs: string; nameHi: string; emoji: string }>;
}

export const TOTAL_ROUNDS = 5;
export const BASE_POINTS_PER_ROUND = 100;
export const HINT_PENALTY_POINTS = 10;

// ── 5 Progressive Rounds Configurations ───────────────────────────────────────
export const ROUND_CONFIGS: Record<number, TreasureHuntRoundConfig> = {
  // Round 1: 2 targets / 6 items (3 cols x 2 rows)
  1: {
    roundNumber: 1,
    difficultyLabel: "Level 1 · Easy (2 Targets)",
    difficultyKey: "easy",
    targetNameEn: "Blossom Flower",
    targetNameAs: "ফুল",
    targetNameHi: "फूल",
    targetEmoji: "🌸",
    targetCount: 2,
    totalItems: 6,
    columns: 3,
    missionPromptEn: "Find all the flowers 🌸",
    missionPromptAs: "সকলো ফুল 🌸 বিচাৰি উলিয়াওক",
    missionPromptHi: "सभी फूल 🌸 खोजें",
    themeColor: "#EC4899",
    themeBg: "#FDF2F8",
    clueEn: "Look for the pink cherry blossom flowers 🌸",
    clueAs: "গোলাপী ৰঙৰ ফুলবোৰ 🌸 বিচাৰক",
    clueHi: "गुलाबी रंग के फूलों 🌸 को खोजें",
    distractorPool: [
      { nameEn: "Red Apple", nameAs: "আপেল", nameHi: "सेब", emoji: "🍎" },
      { nameEn: "Car", nameAs: "গাড়ী", nameHi: "गाड़ी", emoji: "🚗" },
      { nameEn: "Mobile Phone", nameAs: "ফোন", nameHi: "फोन", emoji: "📱" },
      { nameEn: "Football", nameAs: "বল", nameHi: "गेंद", emoji: "⚽" },
      { nameEn: "Bicycle", nameAs: "চাইকেল", nameHi: "साइकिल", emoji: "🚲" },
      { nameEn: "Wrist Watch", nameAs: "ঘড়ী", nameHi: "घड़ी", emoji: "⌚" },
    ],
  },

  // Round 2: 3 targets / 9 items (3 cols x 3 rows)
  2: {
    roundNumber: 2,
    difficultyLabel: "Level 2 · Easy-Medium (3 Targets)",
    difficultyKey: "easy_medium",
    targetNameEn: "Red Apple",
    targetNameAs: "ৰঙা আপেল",
    targetNameHi: "लाल सेब",
    targetEmoji: "🍎",
    targetCount: 3,
    totalItems: 9,
    columns: 3,
    missionPromptEn: "Find all the red apples 🍎",
    missionPromptAs: "সকলো ৰঙা আপেল 🍎 বিচাৰি উলিয়াওক",
    missionPromptHi: "सभी लाल सेब 🍎 खोजें",
    themeColor: "#E11D48",
    themeBg: "#FFF1F2",
    clueEn: "Spot the delicious red fruits 🍎 among the groceries.",
    clueAs: "সকলো ৰঙা আপেল 🍎 চিনাক্ত কৰক।",
    clueHi: "सामग्रियों में से सभी लाल सेब 🍎 पहचानें।",
    distractorPool: [
      { nameEn: "Purple Grapes", nameAs: "আঙুৰ", nameHi: "अंगूर", emoji: "🍇" },
      { nameEn: "Yellow Banana", nameAs: "কল", nameHi: "केला", emoji: "🍌" },
      { nameEn: "Orange Carrot", nameAs: "গাজৰ", nameHi: "गाजर", emoji: "🥕" },
      { nameEn: "Green Broccoli", nameAs: "ব্ৰকলি", nameHi: "ब्रोकली", emoji: "🥦" },
      { nameEn: "Hot Tea Cup", nameAs: "চাহৰ কাপ", nameHi: "चाय का कप", emoji: "☕" },
      { nameEn: "Sliced Bread", nameAs: "পাউৰুটি", nameHi: "ब्रेड", emoji: "🍞" },
      { nameEn: "Water Bottle", nameAs: "পানীৰ বটল", nameHi: "पानी की बोतल", emoji: "💧" },
      { nameEn: "Dinner Plate", nameAs: "কাঁহী", nameHi: "थाली", emoji: "🍽️" },
    ],
  },

  // Round 3: 3 targets / 12 items (3 cols x 4 rows)
  3: {
    roundNumber: 3,
    difficultyLabel: "Level 3 · Medium (3 Targets)",
    difficultyKey: "medium",
    targetNameEn: "Songbird",
    targetNameAs: "চৰাই",
    targetNameHi: "चिड़िया",
    targetEmoji: "🐦",
    targetCount: 3,
    totalItems: 12,
    columns: 3,
    missionPromptEn: "Find all the songbirds 🐦",
    missionPromptAs: "সকলো চৰাই 🐦 বিচাৰি উলিয়াওক",
    missionPromptHi: "सभी चिड़ियों 🐦 को खोजें",
    themeColor: "#0284C7",
    themeBg: "#F0F9FF",
    clueEn: "Search for the blue songbirds 🐦 in the garden.",
    clueAs: "বাগিচাত উৰি থকা নীলা চৰাইবোৰ 🐦 বিচাৰক।",
    clueHi: "बगीचे में उड़ती नीली चिड़ियों 🐦 को ढूंढें।",
    distractorPool: [
      { nameEn: "Butterfly", nameAs: "পখিলা", nameHi: "तितली", emoji: "🦋" },
      { nameEn: "Honeybee", nameAs: "মৌমাখি", nameHi: "मधुमक्खी", emoji: "🐝" },
      { nameEn: "Blossom Flower", nameAs: "ফুল", nameHi: "फूल", emoji: "🌸" },
      { nameEn: "Green Tree", nameAs: "গছ", nameHi: "पेड़", emoji: "🌳" },
      { nameEn: "Green Leaf", nameAs: "পাত", nameHi: "पत्ता", emoji: "🌿" },
      { nameEn: "Bird Nest", nameAs: "চৰাইৰ বাহ", nameHi: "घोंसला", emoji: "🪺" },
      { nameEn: "Autumn Leaf", nameAs: "শুকান পাত", nameHi: "सूखा पत्ता", emoji: "🍂" },
      { nameEn: "Ladybug", nameAs: "পোক", nameHi: "गुबरैला", emoji: "🐞" },
      { nameEn: "Sunflower", nameAs: "সূৰ্যমুখী", nameHi: "सूरजमुखी", emoji: "🌻" },
      { nameEn: "Song Sparrow", nameAs: "ঘনচিৰিকা", nameHi: "गौरैया", emoji: "🐤" },
    ],
  },

  // Round 4: 4 targets / 12 items (3 cols x 4 rows)
  4: {
    roundNumber: 4,
    difficultyLabel: "Level 4 · Challenging (4 Targets)",
    difficultyKey: "challenging",
    targetNameEn: "Tea Kettle",
    targetNameAs: "চাহৰ কেটলি",
    targetNameHi: "चाय की केतली",
    targetEmoji: "🫖",
    targetCount: 4,
    totalItems: 12,
    columns: 3,
    missionPromptEn: "Find all the tea kettles 🫖",
    missionPromptAs: "সকলো চাহৰ কেটলি 🫖 বিচাৰি উলিয়াওক",
    missionPromptHi: "सभी चाय की केतलियां 🫖 खोजें",
    themeColor: "#D97706",
    themeBg: "#FFFBEB",
    clueEn: "Look closely for the tea pouring kettles 🫖.",
    clueAs: "চাহ বাকিব পৰা কেটলিবোৰ 🫖 বিচাৰি উলিয়াওক।",
    clueHi: "चाय छानने वाली केतलियों 🫖 को ध्यान से पहचानें।",
    distractorPool: [
      { nameEn: "Tea Cup", nameAs: "চাহৰ কাপ", nameHi: "चाय का कप", emoji: "☕" },
      { nameEn: "Soup Bowl", nameAs: "বাটি", nameHi: "कटोरा", emoji: "🥣" },
      { nameEn: "Dinner Plate", nameAs: "কাঁহী", nameHi: "थाली", emoji: "🍽️" },
      { nameEn: "Spoon", nameAs: "চামুচ", nameHi: "चम्मच", emoji: "🥄" },
      { nameEn: "Milk Glass", nameAs: "গাখীৰৰ গিলাচ", nameHi: "दूध का गिलास", emoji: "🥛" },
      { nameEn: "Water Jug", nameAs: "পানীৰ জগ", nameHi: "जग", emoji: "🍶" },
      { nameEn: "Frying Pan", nameAs: "কেৰাহী", nameHi: "कड़ाही", emoji: "🍳" },
      { nameEn: "Pitcher", nameAs: "কলহ", nameHi: "सुराही", emoji: "🫗" },
      { nameEn: "Coffee Mug", nameAs: "মগ", nameHi: "मग", emoji: "🍵" },
    ],
  },

  // Round 5: 4 targets / 15 items (3 cols x 5 rows with similar visual distractors)
  5: {
    roundNumber: 5,
    difficultyLabel: "Level 5 · Mastery (4 Targets / 15 Tiles)",
    difficultyKey: "mastery",
    targetNameEn: "Crescent Moon",
    targetNameAs: "কাঁচিজোন",
    targetNameHi: "अर्धचंद्र",
    targetEmoji: "🌙",
    targetCount: 4,
    totalItems: 15,
    columns: 3,
    missionPromptEn: "Find all the crescent moons 🌙",
    missionPromptAs: "সকলো কাঁচিজোন 🌙 বিচাৰি উলিয়াওক",
    missionPromptHi: "सभी अर्धचंद्र 🌙 खोजें",
    themeColor: "#7C3AED",
    themeBg: "#FAF5FF",
    clueEn: "Spot all 4 curved crescent moons 🌙 among the celestial stars.",
    clueAs: "তৰাবোৰৰ মাজৰ পৰা ৪ টা কাঁচিজোন 🌙 বিচাৰক।",
    clueHi: "सितारों के बीच से चारों अर्धचंद्र 🌙 पहचानें।",
    distractorPool: [
      { nameEn: "Bright Sun", nameAs: "সূৰ্য", nameHi: "सूरज", emoji: "☀️" },
      { nameEn: "Golden Star", nameAs: "তৰা", nameHi: "तारा", emoji: "⭐" },
      { nameEn: "Glowing Star", nameAs: "উজ্বল তৰা", nameHi: "चमकता तारा", emoji: "🌟" },
      { nameEn: "Dizzy Star", nameAs: "ঘূৰ্ণিত তৰা", nameHi: "घूमता तारा", emoji: "💫" },
      { nameEn: "Full Moon", nameAs: "পূৰ্ণিমাৰ জোন", nameHi: "पूर्णिमा का चांद", emoji: "🌕" },
      { nameEn: "Ringed Planet", nameAs: "গ্ৰহ", nameHi: "ग्रह", emoji: "🪐" },
      { nameEn: "Fluffy Cloud", nameAs: "ডাৱৰ", nameHi: "बादल", emoji: "☁️" },
      { nameEn: "Milky Way", nameAs: "ছাঁয়াপথ", nameHi: "आकाशगंगा", emoji: "🌌" },
      { nameEn: "Lightning Spark", nameAs: "বিজুলী", nameHi: "बिजली", emoji: "⚡" },
      { nameEn: "Comet", nameAs: "ধূমকেতু", nameHi: "धूमकेतु", emoji: "☄️" },
      { nameEn: "Sunrise", nameAs: "সূৰ্যোদয়", nameHi: "सूर्योदय", emoji: "🌅" },
    ],
  },
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function TreasureHuntScreen() {
  const router = useRouter();
  const { t, currentLang } = useTranslation();

  // ── Gameplay State ─────────────────────────────────────────────────────────
  const [round, setRound] = useState<number>(1);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [currentConfig, setCurrentConfig] = useState<TreasureHuntRoundConfig>(ROUND_CONFIGS[1]);
  const [gridItems, setGridItems] = useState<GridItem[]>([]);
  const [foundTargetIds, setFoundTargetIds] = useState<string[]>([]);
  const [failedItemId, setFailedItemId] = useState<string | null>(null);
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

  // ── Animations ─────────────────────────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getMissionPrompt = (cfg: TreasureHuntRoundConfig) => {
    if (currentLang === "as") return cfg.missionPromptAs;
    if (currentLang === "hi") return cfg.missionPromptHi;
    return cfg.missionPromptEn;
  };

  const getTargetName = (cfg: TreasureHuntRoundConfig) => {
    if (currentLang === "as") return cfg.targetNameAs;
    if (currentLang === "hi") return cfg.targetNameHi;
    return cfg.targetNameEn;
  };

  const getItemName = (item: GridItem) => {
    if (currentLang === "as") return item.nameAs;
    if (currentLang === "hi") return item.nameHi;
    return item.nameEn;
  };

  const getClueText = (cfg: TreasureHuntRoundConfig) => {
    if (currentLang === "as") return cfg.clueAs;
    if (currentLang === "hi") return cfg.clueHi;
    return cfg.clueEn;
  };

  // ── 1. Setup Round ─────────────────────────────────────────────────────────
  const setupRound = useCallback(
    async (roundNum: number) => {
      const cfg = ROUND_CONFIGS[roundNum] || ROUND_CONFIGS[1];

      // Build Grid Items
      const targets: GridItem[] = Array.from({ length: cfg.targetCount }, (_, i) => ({
        id: `tgt_${roundNum}_${i}`,
        nameEn: cfg.targetNameEn,
        nameAs: cfg.targetNameAs,
        nameHi: cfg.targetNameHi,
        emoji: cfg.targetEmoji,
        isTarget: true,
      }));

      const distractorCount = cfg.totalItems - cfg.targetCount;
      const shuffledDistractors = [...cfg.distractorPool].sort(() => 0.5 - Math.random());
      const distractors: GridItem[] = Array.from({ length: distractorCount }, (_, i) => {
        const poolItem = shuffledDistractors[i % shuffledDistractors.length];
        return {
          id: `dist_${roundNum}_${i}`,
          nameEn: poolItem.nameEn,
          nameAs: poolItem.nameAs,
          nameHi: poolItem.nameHi,
          emoji: poolItem.emoji,
          isTarget: false,
        };
      });

      const fullGrid = [...targets, ...distractors].sort(() => 0.5 - Math.random());

      setRound(roundNum);
      setCurrentConfig(cfg);
      setGridItems(fullGrid);
      setFoundTargetIds([]);
      setFailedItemId(null);
      setAttempts(1);
      setHintUsedInRound(false);
      setHintRevealed(false);
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

      // Record round_started event
      if (sessionIdRef.current) {
        try {
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "treasure_hunt",
            eventType: "round_started",
            metadata: {
              round: roundNum,
              targetItem: cfg.targetNameEn,
              targetEmoji: cfg.targetEmoji,
              targetCount: cfg.targetCount,
              totalItems: cfg.totalItems,
              gridItems: fullGrid.map((it) => it.nameEn),
            },
          });
        } catch {
          // Non-blocking
        }
      }

      // Voice prompt: gentle narration of mission
      try {
        const promptToSpeak =
          currentLang === "as"
            ? `${cfg.missionPromptAs}। মুঠ ${cfg.targetCount} টা আছে।`
            : currentLang === "hi"
            ? `${cfg.missionPromptHi}। कुल ${cfg.targetCount} हैं।`
            : `${cfg.missionPromptEn}. Find all ${cfg.targetCount}.`;
        VoiceAssistant.speak(promptToSpeak, currentLang);
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
          gameId: "treasure_hunt",
          metadata: {
            gameTitle: "Treasure Hunt",
            totalRounds: TOTAL_ROUNDS,
            mode: "visual_selective_attention",
          },
        });
        if (isMounted && session) {
          sessionIdRef.current = session.sessionId;
        }
      } catch (err) {
        console.warn("[TreasureHunt] Failed to start game session:", err);
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

  // ── 3. Hint / Assist Handler ───────────────────────────────────────────────
  const handleUseHint = async () => {
    if (isProcessing || isCompleted) return;
    setHintUsedInRound(true);
    setHintRevealed(true);

    if (sessionIdRef.current) {
      try {
        await gameSessionService.recordEvent({
          sessionId: sessionIdRef.current,
          gameId: "treasure_hunt",
          eventType: "hint_used",
          metadata: {
            round,
            targetItem: currentConfig.targetNameEn,
          },
        });
      } catch {
        // Non-blocking
      }
    }

    try {
      VoiceAssistant.speak(getClueText(currentConfig), currentLang);
    } catch {
      // Optional voice
    }
  };

  // ── 4. Item Tap Evaluation ─────────────────────────────────────────────────
  const handleTapItem = async (item: GridItem) => {
    // If already found or processing, ignore
    if (isProcessing || isCompleted) return;
    if (foundTargetIds.includes(item.id)) return;

    setIsProcessing(true);
    const responseTimeMs = Date.now() - roundStartTimeRef.current;
    const isTarget = item.isTarget;

    // Record answer_submitted event
    if (sessionIdRef.current) {
      try {
        await gameSessionService.recordEvent({
          sessionId: sessionIdRef.current,
          gameId: "treasure_hunt",
          eventType: "answer_submitted",
          metadata: {
            round,
            targetItem: currentConfig.targetNameEn,
            selectedItem: item.nameEn,
            isCorrect: isTarget,
            currentFound: foundTargetIds.length + (isTarget ? 1 : 0),
            totalTargets: currentConfig.targetCount,
            attempts,
            responseTimeMs,
          },
        });
      } catch {
        // Non-blocking
      }
    }

    if (isTarget) {
      // ── CORRECT TARGET FOUND ───────────────────────────────────────────────
      const updatedFound = [...foundTargetIds, item.id];
      setFoundTargetIds(updatedFound);
      setFailedItemId(null);
      setIsCorrectFeedback(true);

      const isRoundDone = updatedFound.length === currentConfig.targetCount;

      if (isRoundDone) {
        // Round Completed!
        const pointsEarned = hintUsedInRound
          ? BASE_POINTS_PER_ROUND - HINT_PENALTY_POINTS
          : BASE_POINTS_PER_ROUND;
        const nextTotalScore = totalScore + pointsEarned;
        setRoundScore(pointsEarned);
        setTotalScore(nextTotalScore);

        setFeedbackMessage(
          currentLang === "as"
            ? `অসাধাৰণ! আপুনি সকলো ${currentConfig.targetCount} টা ${getTargetName(currentConfig)} বিচাৰি পালে 🌟`
            : currentLang === "hi"
            ? `बहुत बढ़िया! आपने सभी ${currentConfig.targetCount} ${getTargetName(currentConfig)} खोज लिए 🌟`
            : `Splendid! You found all ${currentConfig.targetCount} targets 🌟`
        );

        if (sessionIdRef.current) {
          try {
            await gameSessionService.recordEvent({
              sessionId: sessionIdRef.current,
              gameId: "treasure_hunt",
              eventType: "answer_correct",
              metadata: {
                round,
                targetItem: currentConfig.targetNameEn,
                pointsEarned,
                attempts,
                responseTimeMs,
              },
            });
            await gameSessionService.recordEvent({
              sessionId: sessionIdRef.current,
              gameId: "treasure_hunt",
              eventType: "round_completed",
              metadata: {
                round,
                targetItem: currentConfig.targetNameEn,
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
        // Target found, more remaining
        setFeedbackMessage(
          currentLang === "as"
            ? `সুন্দৰ! ${updatedFound.length} / ${currentConfig.targetCount} পোৱা গ'ল`
            : currentLang === "hi"
            ? `शाबाश! ${updatedFound.length} / ${currentConfig.targetCount} मिले`
            : `Great! ${updatedFound.length} of ${currentConfig.targetCount} found`
        );

        setTimeout(() => {
          setFeedbackMessage(null);
          setIsProcessing(false);
        }, 500);
      }
    } else {
      // ── INCORRECT DISTRACTOR (Gentle retry, elderly-friendly) ───────────────
      setIsCorrectFeedback(false);
      setFailedItemId(item.id);
      totalMistakesRef.current += 1;
      setAttempts((prev) => prev + 1);

      setFeedbackMessage(
        currentLang === "as"
          ? `অলপ ভাবক! ই ${currentConfig.targetEmoji} নহয় 🌿`
          : currentLang === "hi"
          ? `ध्यान से देखें! यह ${currentConfig.targetEmoji} नहीं है 🌿`
          : `Almost! Look for ${currentConfig.targetEmoji} 🌿`
      );

      if (sessionIdRef.current) {
        try {
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "treasure_hunt",
            eventType: "answer_incorrect",
            metadata: {
              round,
              targetItem: currentConfig.targetNameEn,
              selectedItem: item.nameEn,
              attempts,
              responseTimeMs,
            },
          });
        } catch {
          // Non-blocking
        }
      }

      // Allow retry after gentle glow
      setTimeout(() => {
        setFailedItemId(null);
        setFeedbackMessage(null);
        setIsProcessing(false);
      }, 1000);
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
        console.warn("[TreasureHunt] Complete session API warning:", err);
      }
    }

    // 2. Persist to Caregiver Dashboard Storage
    try {
      const caregiverSession: CognitiveGameSession = {
        id: `sess-hunt-${Date.now()}`,
        gameName: "Treasure Hunt (Visual Attention)",
        iconEmoji: "💎",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        durationMinutes,
        score: finalScore,
        accuracyPercent,
        mistakes: totalMistakesRef.current,
        responseTime: "Comfortable visual search pace",
        difficulty: "2 → 4 Targets (6 → 15 Item Grids)",
        difficultyChangeReason: "Progressed through selective visual search grids.",
        completed: true,
        humanSummary: `Completed all 5 visual search rounds (Flowers, Apples, Birds, Kettles, Moons) with ${accuracyPercent}% accuracy.`,
      };
      await caregiverStorage.recordGameSession(caregiverSession);
    } catch (err) {
      console.warn("[TreasureHunt] Caregiver storage save error:", err);
    }

    // 3. Persist to Virtual Companion Context Pipeline
    try {
      await companionContextService.recordRawGameEvent({
        gameId: "treasure_hunt",
        eventType: "game_completed",
        payload: {
          gameName: "Treasure Hunt",
          score: finalScore,
          durationSeconds,
          accuracyPercent,
          completed: true,
          difficulty: "Visual Attention & Search",
          metadata: {
            totalRounds: TOTAL_ROUNDS,
            totalMistakes: totalMistakesRef.current,
            targetsHunted: Object.values(ROUND_CONFIGS).map((c) => c.targetNameEn),
          },
        },
      });
    } catch (err) {
      console.warn("[TreasureHunt] Companion context save error:", err);
    }

    // Voice completion celebration
    try {
      const celebration =
        currentLang === "as"
          ? "অসাধাৰণ! আপুনি সকলো লুকাই থকা লক্ষ্য সুন্দৰকৈ বিচাৰি পালে।"
          : currentLang === "hi"
          ? "अद्भुत! आपने सभी छिपे हुए लक्ष्यों को बहुत ध्यान से खोज निकाला।"
          : "Splendid! You completed every visual search treasure hunt with sharp attention.";
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
              <Text style={styles.completionEmoji}>💎</Text>
            </View>

            <View style={styles.completionTag}>
              <Feather name="check-circle" size={14} color="#059669" />
              <Text style={styles.completionTagText}>TREASURE HUNT COMPLETE</Text>
            </View>

            <Text style={styles.completionTitle}>
              {currentLang === "as"
                ? "সুন্দৰ মনোযোগ!"
                : currentLang === "hi"
                ? "शानदार एकाग्रता!"
                : "Wonderful Visual Focus!"}
            </Text>

            <Text style={styles.completionSubtitle}>
              {currentLang === "as"
                ? "আপুনি সকলো প্ৰত্যাহ্বানৰ মাজৰ পৰা লক্ষ্যসমূহ সুন্দৰকৈ বিচাৰি পালে।"
                : currentLang === "hi"
                ? "आपने सभी चित्रों के बीच से अपने लक्ष्यों को बहुत ध्यान से खोजा।"
                : "You identified every target with calm, steady selective attention."}
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
  const tileWidth = (width - Spacing.lg * 2 - Spacing.md * 2) / 3;

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
              ? "সন্ধান খেল (Treasure Hunt)"
              : currentLang === "hi"
              ? "खोज खेल (Treasure Hunt)"
              : "Treasure Hunt"}
          </Text>
          <Text style={styles.navSubtitle}>
            {currentLang === "as"
              ? `পৰ্যায় ${round} / ${TOTAL_ROUNDS} · (${currentConfig.totalItems} টা কাৰ্ড)`
              : currentLang === "hi"
              ? `दौर ${round} / ${TOTAL_ROUNDS} · (${currentConfig.totalItems} कार्ड)`
              : `Round ${round} of ${TOTAL_ROUNDS} · (${currentConfig.totalItems} Tiles)`}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.hintButton, hintUsedInRound && styles.hintButtonUsed]}
          onPress={handleUseHint}
          activeOpacity={0.7}
          disabled={hintUsedInRound || isProcessing}
        >
          <MaterialCommunityIcons
            name="lightbulb-outline"
            size={22}
            color={hintUsedInRound ? "#94A3B8" : "#D97706"}
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
          {/* Mission Target Banner Card */}
          <View style={styles.missionCard}>
            <View
              style={[
                styles.missionIconPill,
                { backgroundColor: currentConfig.themeBg },
              ]}
            >
              <Text style={styles.missionEmojiText}>
                {currentConfig.targetEmoji}
              </Text>
            </View>

            <View style={styles.missionTagBadge}>
              <Text style={styles.missionTagText}>YOUR MISSION</Text>
            </View>

            <Text style={styles.missionTitleText}>
              {getMissionPrompt(currentConfig)}
            </Text>

            {/* Target Found Counter Bar */}
            <View style={styles.targetProgressPill}>
              <Feather name="check" size={16} color="#166534" />
              <Text style={styles.targetProgressText}>
                {currentLang === "as"
                  ? `${foundTargetIds.length} / ${currentConfig.targetCount} পোৱা গ'ল`
                  : currentLang === "hi"
                  ? `${foundTargetIds.length} / ${currentConfig.targetCount} मिले`
                  : `${foundTargetIds.length} of ${currentConfig.targetCount} found`}
              </Text>
            </View>
          </View>

          {/* Hint Card if Revealed */}
          {hintRevealed && (
            <View style={styles.revealedHintCard}>
              <MaterialCommunityIcons name="lightbulb-on" size={20} color="#D97706" />
              <Text style={styles.revealedHintText}>
                {getClueText(currentConfig)}
              </Text>
            </View>
          )}

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

          {/* Grid Title Instruction */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderText}>
              {currentLang === "as"
                ? "সকলো লক্ষ্যবস্তু স্পৰ্শ কৰক"
                : currentLang === "hi"
                ? "सभी लक्ष्य चित्रों पर टैप करें"
                : "Tap every matching target tile"}
            </Text>
          </View>

          {/* Search Grid Tiles */}
          <View style={styles.tilesGrid}>
            {gridItems.map((item) => {
              const isFound = foundTargetIds.includes(item.id);
              const isFailed = failedItemId === item.id;
              const foundIndex = foundTargetIds.indexOf(item.id);

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.gridTile,
                    { width: tileWidth, height: tileWidth * 1.15 },
                    isFound && styles.gridTileFound,
                    isFailed && styles.gridTileFailed,
                  ]}
                  onPress={() => handleTapItem(item)}
                  activeOpacity={0.75}
                  disabled={isFound || isProcessing}
                >
                  <View
                    style={[
                      styles.tileEmojiCircle,
                      isFound && styles.tileEmojiCircleFound,
                      isFailed && styles.tileEmojiCircleFailed,
                    ]}
                  >
                    <Text style={styles.tileEmojiText}>{item.emoji}</Text>
                  </View>

                  <Text
                    style={[
                      styles.tileNameText,
                      isFound && styles.tileNameTextFound,
                    ]}
                    numberOfLines={1}
                  >
                    {getItemName(item)}
                  </Text>

                  {/* Top Right Status Badge */}
                  {isFound && (
                    <View style={styles.tileFoundBadge}>
                      <Text style={styles.tileFoundBadgeText}>#{foundIndex + 1}</Text>
                    </View>
                  )}
                  {isFailed && (
                    <View style={styles.tileFailedBadge}>
                      <Feather name="x" size={12} color="#B45309" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Footer Live Score Status */}
      <View style={styles.footerBar}>
        <View style={styles.scorePill}>
          <Text style={styles.scorePillLabel}>GAME SCORE</Text>
          <Text style={styles.scorePillValue}>{totalScore}</Text>
        </View>

        <View style={styles.footerPrompt}>
          <Feather name="eye" size={14} color="#64748B" />
          <Text style={styles.footerPromptText}>
            {currentLang === "as"
              ? "মনোযোগ আৰু দৃষ্টি শক্তিৰ অভ্যাস"
              : currentLang === "hi"
              ? "एकाग्रता एवं दृश्य ध्यान"
              : "Visual search attention exercise"}
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
  hintButtonUsed: {
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
  missionCard: {
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
  missionIconPill: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  missionEmojiText: {
    fontSize: 36,
  },
  missionTagBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: Spacing.sm,
  },
  missionTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.8,
  },
  missionTitleText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 28,
  },
  targetProgressPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  targetProgressText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#166534",
  },
  revealedHintCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: 10,
    width: "100%",
  },
  revealedHintText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
    lineHeight: 20,
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
  tilesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
    gap: Spacing.md,
  },
  gridTile: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    position: "relative",
    ...Shadows.sm,
  },
  gridTileFound: {
    backgroundColor: "#F0FDF4",
    borderColor: "#22C55E",
  },
  gridTileFailed: {
    backgroundColor: "#FFFBEB",
    borderColor: "#F59E0B",
  },
  tileEmojiCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  tileEmojiCircleFound: {
    backgroundColor: "#DCFCE7",
  },
  tileEmojiCircleFailed: {
    backgroundColor: "#FEF3C7",
  },
  tileEmojiText: {
    fontSize: 28,
  },
  tileNameText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
  },
  tileNameTextFound: {
    color: "#166534",
    fontWeight: "900",
  },
  tileFoundBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#166534",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tileFoundBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  tileFailedBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#FEF3C7",
    padding: 3,
    borderRadius: 8,
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
    width: "47%",
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
