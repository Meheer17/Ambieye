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
export type RuleType =
  | "color_red"
  | "shape_circle"
  | "category_nature"
  | "color_blue"
  | "shape_square";

export interface RuleTileItem {
  id: string;
  nameEn: string;
  nameAs: string;
  nameHi: string;
  emoji: string;
  colorName: "red" | "blue" | "green" | "yellow" | "pink" | "multi";
  shapeName: "circle" | "square" | "triangle" | "star" | "object";
  category: "shape" | "nature" | "food" | "vehicle" | "household";
  isTarget: boolean;
}

export interface RuleRoundConfig {
  roundNumber: number;
  ruleType: RuleType;
  ruleBadgeEn: string;
  ruleBadgeAs: string;
  ruleBadgeHi: string;
  ruleTitleEn: string;
  ruleTitleAs: string;
  ruleTitleHi: string;
  ruleSubtitleEn: string;
  ruleSubtitleAs: string;
  ruleSubtitleHi: string;
  ruleIconName: string;
  themeColor: string;
  themeBg: string;
  targetCount: number;
  totalItems: number;
  clueEn: string;
  clueAs: string;
  clueHi: string;
  gridItems: RuleTileItem[];
}

export const TOTAL_ROUNDS = 5;
export const BASE_POINTS_PER_ROUND = 100;
export const HINT_PENALTY_POINTS = 10;

// ── 5 Progressive Rule Switch Rounds Dataset ──────────────────────────────────
export const RULE_ROUNDS: Record<number, RuleRoundConfig> = {
  // Round 1: Color Rule (Tap all RED items 🔴)
  1: {
    roundNumber: 1,
    ruleType: "color_red",
    ruleBadgeEn: "COLOR RULE",
    ruleBadgeAs: "ৰঙৰ নিয়ম",
    ruleBadgeHi: "रंग का नियम",
    ruleTitleEn: "Tap all RED items 🔴",
    ruleTitleAs: "সকলো ৰঙা বস্তু 🔴 স্পৰ্শ কৰক",
    ruleTitleHi: "सभी लाल वस्तुओं 🔴 को चुनें",
    ruleSubtitleEn: "Focus on color: select only items that are red",
    ruleSubtitleAs: "ৰঙলৈ লক্ষ্য কৰক: কেৱল ৰঙা বস্তুবোৰ বাছক",
    ruleSubtitleHi: "रंग पर ध्यान दें: केवल लाल वस्तुओं को चुनें",
    ruleIconName: "palette",
    themeColor: "#E11D48",
    themeBg: "#FFF1F2",
    targetCount: 2,
    totalItems: 6,
    clueEn: "Look only for the red items: the red apple 🍎 and red circle 🔴.",
    clueAs: "কেৱল ৰঙা বস্তুবোৰ চাওক: ৰঙা আপেল 🍎 আৰু ৰঙা বৃত্ত 🔴।",
    clueHi: "केवल लाल वस्तुओं को देखें: लाल सेब 🍎 और लाल वृत्त 🔴।",
    gridItems: [
      { id: "r1_1", nameEn: "Red Apple", nameAs: "আপেল", nameHi: "सेब", emoji: "🍎", colorName: "red", shapeName: "object", category: "food", isTarget: true },
      { id: "r1_2", nameEn: "Red Circle", nameAs: "ৰঙা বৃত্ত", nameHi: "लाल वृत्त", emoji: "🔴", colorName: "red", shapeName: "circle", category: "shape", isTarget: true },
      { id: "r1_3", nameEn: "Blue Circle", nameAs: "নীলা বৃত্ত", nameHi: "नीला वृत्त", emoji: "🔵", colorName: "blue", shapeName: "circle", category: "shape", isTarget: false },
      { id: "r1_4", nameEn: "Green Leaf", nameAs: "সেউজীয়া পাত", nameHi: "हरा पत्ता", emoji: "🌿", colorName: "green", shapeName: "object", category: "nature", isTarget: false },
      { id: "r1_5", nameEn: "Yellow Star", nameAs: "হালধীয়া তৰা", nameHi: "पीला तारा", emoji: "⭐", colorName: "yellow", shapeName: "star", category: "shape", isTarget: false },
      { id: "r1_6", nameEn: "Blue Car", nameAs: "নীলা গাড়ী", nameHi: "नीली गाड़ी", emoji: "🚗", colorName: "blue", shapeName: "object", category: "vehicle", isTarget: false },
    ],
  },

  // Round 2: Shape Switch (Tap all CIRCLES ⭕)
  2: {
    roundNumber: 2,
    ruleType: "shape_circle",
    ruleBadgeEn: "RULE SWITCH: SHAPES",
    ruleBadgeAs: "নিয়ম সলনি: আকৃতি",
    ruleBadgeHi: "नियम बदला: आकार",
    ruleTitleEn: "Tap all CIRCLES ⭕",
    ruleTitleAs: "সকলো বৃত্তাকাৰ বস্তু ⭕ স্পৰ্শ কৰক",
    ruleTitleHi: "सभी गोल आकृतियों ⭕ को चुनें",
    ruleSubtitleEn: "Color does not matter now: tap any round circular shape",
    ruleSubtitleAs: "এতিয়া ৰং যিয়েই নহওক: যিকোনো ঘূৰণীয়া বৃত্ত বাছক",
    ruleSubtitleHi: "अब रंग नहीं, केवल गोल आकृतियों को चुनें",
    ruleIconName: "shape-outline",
    themeColor: "#2563EB",
    themeBg: "#EFF6FF",
    targetCount: 3,
    totalItems: 6,
    clueEn: "Ignore colors: find all 3 round circle shapes (🔴, 🔵, 🟡).",
    clueAs: "ৰং পাহৰি ৩ টা ঘূৰণীয়া বৃত্ত বিচাৰি উলিয়াওক (🔴, 🔵, 🟡)।",
    clueHi: "रंग को भूलकर तीनों गोल वृत्त पहचानें (🔴, 🔵, 🟡)।",
    gridItems: [
      { id: "r2_1", nameEn: "Red Circle", nameAs: "ৰঙা বৃত্ত", nameHi: "लाल वृत्त", emoji: "🔴", colorName: "red", shapeName: "circle", category: "shape", isTarget: true },
      { id: "r2_2", nameEn: "Blue Circle", nameAs: "নীলা বৃত্ত", nameHi: "नीला वृत्त", emoji: "🔵", colorName: "blue", shapeName: "circle", category: "shape", isTarget: true },
      { id: "r2_3", nameEn: "Yellow Circle", nameAs: "হালধীয়া বৃত্ত", nameHi: "पीला वृत्त", emoji: "🟡", colorName: "yellow", shapeName: "circle", category: "shape", isTarget: true },
      { id: "r2_4", nameEn: "Red Square", nameAs: "ৰঙা বৰ্গক্ষেত্ৰ", nameHi: "लाल चौकोर", emoji: "🟥", colorName: "red", shapeName: "square", category: "shape", isTarget: false },
      { id: "r2_5", nameEn: "Blue Square", nameAs: "নীলা বৰ্গক্ষেত্ৰ", nameHi: "नीला चौकोर", emoji: "🟦", colorName: "blue", shapeName: "square", category: "shape", isTarget: false },
      { id: "r2_6", nameEn: "Red Triangle", nameAs: "ৰঙা ত্ৰিভুজ", nameHi: "लाल त्रिकोण", emoji: "🔺", colorName: "red", shapeName: "triangle", category: "shape", isTarget: false },
    ],
  },

  // Round 3: Category Switch (Tap all FLOWERS & PLANTS 🌸)
  3: {
    roundNumber: 3,
    ruleType: "category_nature",
    ruleBadgeEn: "RULE SWITCH: NATURE",
    ruleBadgeAs: "নিয়ম সলনি: প্ৰকৃতি",
    ruleBadgeHi: "नियम बदला: प्रकृति",
    ruleTitleEn: "Tap all FLOWERS & PLANTS 🌸",
    ruleTitleAs: "সকলো ফুল আৰু গছ-পাত 🌸 স্পৰ্শ কৰক",
    ruleTitleHi: "सभी फूल और पौधे 🌸 चुनें",
    ruleSubtitleEn: "Switch focus: select blossoms, flowers, and fresh leaves",
    ruleSubtitleAs: "মনোযোগ সলনি কৰক: ফুল আৰু সেউজীয়া পাতসমূহ বাছক",
    ruleSubtitleHi: "ध्यान बदलें: केवल फूल और पत्तियों को चुनें",
    ruleIconName: "flower",
    themeColor: "#059669",
    themeBg: "#F0FDF4",
    targetCount: 3,
    totalItems: 9,
    clueEn: "Find the 3 living garden plants: flower 🌸, sunflower 🌻, and leaf 🌿.",
    clueAs: "বাগিচাৰ ৩ বিধ উদ্ভিদ বিচাৰক: ফুল 🌸, সূৰ্যমুখী 🌻 আৰু পাত 🌿।",
    clueHi: "बगीचे के तीनों पौधों को चुनें: फूल 🌸, सूरजमुखी 🌻 और पत्ता 🌿।",
    gridItems: [
      { id: "r3_1", nameEn: "Blossom Flower", nameAs: "ফুল", nameHi: "फूल", emoji: "🌸", colorName: "pink", shapeName: "object", category: "nature", isTarget: true },
      { id: "r3_2", nameEn: "Sunflower", nameAs: "সূৰ্যমুখী", nameHi: "सूरजमुखी", emoji: "🌻", colorName: "yellow", shapeName: "object", category: "nature", isTarget: true },
      { id: "r3_3", nameEn: "Green Leaf", nameAs: "সেউজীয়া পাত", nameHi: "हरा पत्ता", emoji: "🌿", colorName: "green", shapeName: "object", category: "nature", isTarget: true },
      { id: "r3_4", nameEn: "Red Apple", nameAs: "আপেল", nameHi: "सेब", emoji: "🍎", colorName: "red", shapeName: "object", category: "food", isTarget: false },
      { id: "r3_5", nameEn: "Blue Car", nameAs: "গাড়ী", nameHi: "गाड़ी", emoji: "🚗", colorName: "blue", shapeName: "object", category: "vehicle", isTarget: false },
      { id: "r3_6", nameEn: "Mobile Phone", nameAs: "ফোন", nameHi: "फोन", emoji: "📱", colorName: "blue", shapeName: "object", category: "household", isTarget: false },
      { id: "r3_7", nameEn: "Football", nameAs: "বল", nameHi: "गेंद", emoji: "⚽", colorName: "multi", shapeName: "circle", category: "household", isTarget: false },
      { id: "r3_8", nameEn: "Toothbrush", nameAs: "ব্ৰাশ", nameHi: "ब्रश", emoji: "🪥", colorName: "blue", shapeName: "object", category: "household", isTarget: false },
      { id: "r3_9", nameEn: "Brass Key", nameAs: "চাবি", nameHi: "चाबी", emoji: "🔑", colorName: "yellow", shapeName: "object", category: "household", isTarget: false },
    ],
  },

  // Round 4: Color Switch (Tap all BLUE items 🔵)
  4: {
    roundNumber: 4,
    ruleType: "color_blue",
    ruleBadgeEn: "RULE SWITCH: BLUE COLOR",
    ruleBadgeAs: "নিয়ম সলনি: নীলা ৰং",
    ruleBadgeHi: "नियम बदला: नीला रंग",
    ruleTitleEn: "Tap all BLUE items 🔵",
    ruleTitleAs: "সকলো নীলা বস্তু 🔵 স্পৰ্শ কৰক",
    ruleTitleHi: "सभी नीली वस्तुओं 🔵 को चुनें",
    ruleSubtitleEn: "Switch back to color: tap only blue objects of any shape",
    ruleSubtitleAs: "পুনৰ ৰঙলৈ ঘূৰি আহক: যিকোনো নীলা বস্তু বাছক",
    ruleSubtitleHi: "आकार कोई भी हो, केवल नीले रंग की वस्तुओं को चुनें",
    ruleIconName: "water",
    themeColor: "#0284C7",
    themeBg: "#F0F9FF",
    targetCount: 3,
    totalItems: 9,
    clueEn: "Look only for the blue color: blue circle 🔵, blue square 🟦, and blue car 🚗.",
    clueAs: "কেৱল নীলা ৰং চাওক: নীলা বৃত্ত 🔵, নীলা বৰ্গক্ষেত্ৰ 🟦 আৰু নীলা গাড়ী 🚗।",
    clueHi: "केवल नीले रंग को देखें: नीला वृत्त 🔵, नीला चौकोर 🟦 और नीली गाड़ी 🚗।",
    gridItems: [
      { id: "r4_1", nameEn: "Blue Circle", nameAs: "নীলা বৃত্ত", nameHi: "नीला वृत्त", emoji: "🔵", colorName: "blue", shapeName: "circle", category: "shape", isTarget: true },
      { id: "r4_2", nameEn: "Blue Square", nameAs: "নীলা বৰ্গক্ষেত্ৰ", nameHi: "नीला चौकोर", emoji: "🟦", colorName: "blue", shapeName: "square", category: "shape", isTarget: true },
      { id: "r4_3", nameEn: "Blue Car", nameAs: "নীলা গাড়ী", nameHi: "नीली गाड़ी", emoji: "🚗", colorName: "blue", shapeName: "object", category: "vehicle", isTarget: true },
      { id: "r4_4", nameEn: "Red Circle", nameAs: "ৰঙা বৃত্ত", nameHi: "लाल वृत्त", emoji: "🔴", colorName: "red", shapeName: "circle", category: "shape", isTarget: false },
      { id: "r4_5", nameEn: "Red Square", nameAs: "ৰঙা বৰ্গক্ষেত্ৰ", nameHi: "लाल चौकोर", emoji: "🟥", colorName: "red", shapeName: "square", category: "shape", isTarget: false },
      { id: "r4_6", nameEn: "Yellow Star", nameAs: "হালধীয়া তৰা", nameHi: "पीला तारा", emoji: "⭐", colorName: "yellow", shapeName: "star", category: "shape", isTarget: false },
      { id: "r4_7", nameEn: "Green Leaf", nameAs: "সেউজীয়া পাত", nameHi: "हरा पत्ता", emoji: "🌿", colorName: "green", shapeName: "object", category: "nature", isTarget: false },
      { id: "r4_8", nameEn: "Pink Flower", nameAs: "গোলাপী ফুল", nameHi: "गुलाबी फूल", emoji: "🌸", colorName: "pink", shapeName: "object", category: "nature", isTarget: false },
      { id: "r4_9", nameEn: "Red Apple", nameAs: "ৰঙা আপেল", nameHi: "लाल सेब", emoji: "🍎", colorName: "red", shapeName: "object", category: "food", isTarget: false },
    ],
  },

  // Round 5: Complex Shape Switch (Tap all SQUARES / BOXES 🟦)
  5: {
    roundNumber: 5,
    ruleType: "shape_square",
    ruleBadgeEn: "FINAL RULE SWITCH: SQUARES",
    ruleBadgeAs: "চূড়ান্ত নিয়ম: চতুৰ্ভুজ",
    ruleBadgeHi: "अंतिम नियम: चौकोर आकृतियां",
    ruleTitleEn: "Tap all SQUARES & BOXES 🟦",
    ruleTitleAs: "সকলো চতুৰ্ভুজ / বাকচ 🟦 স্পৰ্শ কৰক",
    ruleTitleHi: "सभी चौकोर आकृतियों 🟦 को चुनें",
    ruleSubtitleEn: "Ignore previous color rules: tap every square shape across all colors",
    ruleSubtitleAs: "আগৰ নিয়ম পাহৰি কেৱল চতুৰ্ভুজ বা বাকচবোৰ বাছক",
    ruleSubtitleHi: "पिछले रंगों को भूलकर सभी रंगों की चौकोर आकृतियों को चुनें",
    ruleIconName: "vector-square",
    themeColor: "#7C3AED",
    themeBg: "#FAF5FF",
    targetCount: 4,
    totalItems: 12,
    clueEn: "Find all 4 square boxes in any color: 🟦, 🟥, 🟩, 🟨.",
    clueAs: "যিকোনো ৰঙৰ ৪ টা চতুৰ্ভুজ বা বাকচ বিচাৰি উলিয়াওক: 🟦, 🟥, 🟩, 🟨।",
    clueHi: "सभी रंगों की चारों चौकोर आकृतियों को चुनें: 🟦, 🟥, 🟩, 🟨।",
    gridItems: [
      { id: "r5_1", nameEn: "Blue Square", nameAs: "নীলা বৰ্গক্ষেত্ৰ", nameHi: "नीला चौकोर", emoji: "🟦", colorName: "blue", shapeName: "square", category: "shape", isTarget: true },
      { id: "r5_2", nameEn: "Red Square", nameAs: "ৰঙা বৰ্গক্ষেত্ৰ", nameHi: "लाल चौकोर", emoji: "🟥", colorName: "red", shapeName: "square", category: "shape", isTarget: true },
      { id: "r5_3", nameEn: "Green Square", nameAs: "সেউজীয়া বৰ্গক্ষেত্ৰ", nameHi: "हरा चौकोर", emoji: "🟩", colorName: "green", shapeName: "square", category: "shape", isTarget: true },
      { id: "r5_4", nameEn: "Yellow Square", nameAs: "হালধীয়া বৰ্গক্ষেত্ৰ", nameHi: "पीला चौकोर", emoji: "🟨", colorName: "yellow", shapeName: "square", category: "shape", isTarget: true },
      { id: "r5_5", nameEn: "Blue Circle", nameAs: "নীলা বৃত্ত", nameHi: "नीला वृत्त", emoji: "🔵", colorName: "blue", shapeName: "circle", category: "shape", isTarget: false },
      { id: "r5_6", nameEn: "Red Circle", nameAs: "ৰঙা বৃত্ত", nameHi: "लाल वृत्त", emoji: "🔴", colorName: "red", shapeName: "circle", category: "shape", isTarget: false },
      { id: "r5_7", nameEn: "Red Triangle", nameAs: "ৰঙা ত্ৰিভুজ", nameHi: "लाल त्रिकोण", emoji: "🔺", colorName: "red", shapeName: "triangle", category: "shape", isTarget: false },
      { id: "r5_8", nameEn: "Yellow Star", nameAs: "হালধীয়া তৰা", nameHi: "पीला तारा", emoji: "⭐", colorName: "yellow", shapeName: "star", category: "shape", isTarget: false },
      { id: "r5_9", nameEn: "Pink Flower", nameAs: "ফুল", nameHi: "फूल", emoji: "🌸", colorName: "pink", shapeName: "object", category: "nature", isTarget: false },
      { id: "r5_10", nameEn: "Red Apple", nameAs: "আপেল", nameHi: "सेब", emoji: "🍎", colorName: "red", shapeName: "object", category: "food", isTarget: false },
      { id: "r5_11", nameEn: "Blue Car", nameAs: "গাড়ী", nameHi: "गाड़ी", emoji: "🚗", colorName: "blue", shapeName: "object", category: "vehicle", isTarget: false },
      { id: "r5_12", nameEn: "Football", nameAs: "বল", nameHi: "गेंद", emoji: "⚽", colorName: "multi", shapeName: "circle", category: "household", isTarget: false },
    ],
  },
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function RuleSwitchScreen() {
  const router = useRouter();
  const { t, currentLang } = useTranslation();

  // ── Gameplay State ─────────────────────────────────────────────────────────
  const [round, setRound] = useState<number>(1);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [currentConfig, setCurrentConfig] = useState<RuleRoundConfig>(RULE_ROUNDS[1]);
  const [shuffledGrid, setShuffledGrid] = useState<RuleTileItem[]>([]);
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
  const getRuleBadge = (cfg: RuleRoundConfig) => {
    if (currentLang === "as") return cfg.ruleBadgeAs;
    if (currentLang === "hi") return cfg.ruleBadgeHi;
    return cfg.ruleBadgeEn;
  };

  const getRuleTitle = (cfg: RuleRoundConfig) => {
    if (currentLang === "as") return cfg.ruleTitleAs;
    if (currentLang === "hi") return cfg.ruleTitleHi;
    return cfg.ruleTitleEn;
  };

  const getRuleSubtitle = (cfg: RuleRoundConfig) => {
    if (currentLang === "as") return cfg.ruleSubtitleAs;
    if (currentLang === "hi") return cfg.ruleSubtitleHi;
    return cfg.ruleSubtitleEn;
  };

  const getItemName = (item: RuleTileItem) => {
    if (currentLang === "as") return item.nameAs;
    if (currentLang === "hi") return item.nameHi;
    return item.nameEn;
  };

  const getClueText = (cfg: RuleRoundConfig) => {
    if (currentLang === "as") return cfg.clueAs;
    if (currentLang === "hi") return cfg.clueHi;
    return cfg.clueEn;
  };

  // ── 1. Setup Round ─────────────────────────────────────────────────────────
  const setupRound = useCallback(
    async (roundNum: number) => {
      const cfg = RULE_ROUNDS[roundNum] || RULE_ROUNDS[1];
      const randomized = [...cfg.gridItems].sort(() => 0.5 - Math.random());

      setRound(roundNum);
      setCurrentConfig(cfg);
      setShuffledGrid(randomized);
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

      // Record round_started and rule_presented events
      if (sessionIdRef.current) {
        try {
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "rule_switch",
            eventType: "round_started",
            metadata: {
              round: roundNum,
              ruleType: cfg.ruleType,
              ruleDescription: cfg.ruleTitleEn,
              targetCount: cfg.targetCount,
              totalItems: cfg.totalItems,
              displayedItems: randomized.map((it) => it.nameEn),
              targetItems: cfg.gridItems.filter((it) => it.isTarget).map((it) => it.nameEn),
            },
          });

          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "rule_switch",
            eventType: "rule_presented",
            metadata: {
              round: roundNum,
              ruleType: cfg.ruleType,
              ruleDescription: cfg.ruleTitleEn,
            },
          });
        } catch {
          // Non-blocking
        }
      }

      // Voice prompt: gentle narration of new rule
      try {
        const promptToSpeak =
          currentLang === "as"
            ? `${cfg.ruleTitleAs}। ${cfg.ruleSubtitleAs}`
            : currentLang === "hi"
            ? `${cfg.ruleTitleHi}। ${cfg.ruleSubtitleHi}`
            : `${cfg.ruleTitleEn}. ${cfg.ruleSubtitleEn}`;
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
          gameId: "rule_switch",
          metadata: {
            gameTitle: "Change Your Mind (Rule Switch)",
            totalRounds: TOTAL_ROUNDS,
            mode: "cognitive_flexibility_rule_switching",
          },
        });
        if (isMounted && session) {
          sessionIdRef.current = session.sessionId;
        }
      } catch (err) {
        console.warn("[RuleSwitch] Failed to start game session:", err);
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
          gameId: "rule_switch",
          eventType: "hint_used",
          metadata: {
            round,
            ruleType: currentConfig.ruleType,
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
  const handleTapTile = async (item: RuleTileItem) => {
    // If already found or processing, ignore
    if (isProcessing || isCompleted) return;
    if (foundTargetIds.includes(item.id)) return;

    setIsProcessing(true);
    const responseTimeMs = Date.now() - roundStartTimeRef.current;
    const isTarget = item.isTarget;

    // Record item_selected event
    if (sessionIdRef.current) {
      try {
        await gameSessionService.recordEvent({
          sessionId: sessionIdRef.current,
          gameId: "rule_switch",
          eventType: "item_selected",
          metadata: {
            round,
            ruleType: currentConfig.ruleType,
            ruleDescription: currentConfig.ruleTitleEn,
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
      // ── CORRECT SELECTION UNDER CURRENT RULE ───────────────────────────────
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
            ? "অসাধাৰণ! বৰ্তমান নিয়মৰ সকলো লক্ষ্য বাছনি কৰা হ'ল 🌟"
            : currentLang === "hi"
            ? "बहुत बढ़िया! वर्तमान नियम के सभी लक्ष्य पूरे हुए 🌟"
            : "Splendid! All targets found under the current rule 🌟"
        );

        if (sessionIdRef.current) {
          try {
            await gameSessionService.recordEvent({
              sessionId: sessionIdRef.current,
              gameId: "rule_switch",
              eventType: "correct_selection",
              metadata: {
                round,
                ruleType: currentConfig.ruleType,
                pointsEarned,
                attempts,
                responseTimeMs,
              },
            });
            await gameSessionService.recordEvent({
              sessionId: sessionIdRef.current,
              gameId: "rule_switch",
              eventType: "round_completed",
              metadata: {
                round,
                ruleType: currentConfig.ruleType,
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
            ? `শুদ্ধ! ${updatedFound.length} / ${currentConfig.targetCount} পোৱা গ'ল`
            : currentLang === "hi"
            ? `सही! ${updatedFound.length} / ${currentConfig.targetCount} मिले`
            : `Great! ${updatedFound.length} of ${currentConfig.targetCount} found`
        );

        setTimeout(() => {
          setFeedbackMessage(null);
          setIsProcessing(false);
        }, 500);
      }
    } else {
      // ── INCORRECT SELECTION (Gentle feedback, elderly-friendly) ─────────────
      setIsCorrectFeedback(false);
      setFailedItemId(item.id);
      totalMistakesRef.current += 1;
      setAttempts((prev) => prev + 1);

      setFeedbackMessage(
        currentLang === "as"
          ? "অলপ ভাবক! ওপৰৰ বৰ্তমান নিয়মটো চাওক 🌿"
          : currentLang === "hi"
          ? "थोड़ा सोचें! ऊपर दिए गए वर्तमान नियम को देखें 🌿"
          : "Almost! Check the current rule above 🌿"
      );

      if (sessionIdRef.current) {
        try {
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "rule_switch",
            eventType: "incorrect_selection",
            metadata: {
              round,
              ruleType: currentConfig.ruleType,
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
        console.warn("[RuleSwitch] Complete session API warning:", err);
      }
    }

    // 2. Persist to Caregiver Dashboard Storage
    try {
      const caregiverSession: CognitiveGameSession = {
        id: `sess-switch-${Date.now()}`,
        gameName: "Rule Switch (Change Your Mind)",
        iconEmoji: "🔄",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        durationMinutes,
        score: finalScore,
        accuracyPercent,
        mistakes: totalMistakesRef.current,
        responseTime: "Comfortable flexibility pace",
        difficulty: "5 Rule Switching Rounds",
        difficultyChangeReason: "Exercised rule switching and cognitive adaptability across colors, shapes, and categories.",
        completed: true,
        humanSummary: `Completed all 5 cognitive rule switching rounds (Red Color, Circles, Nature, Blue Color, Squares) with ${accuracyPercent}% accuracy.`,
      };
      await caregiverStorage.recordGameSession(caregiverSession);
    } catch (err) {
      console.warn("[RuleSwitch] Caregiver storage save error:", err);
    }

    // 3. Persist to Virtual Companion Context Pipeline
    try {
      await companionContextService.recordRawGameEvent({
        gameId: "rule_switch",
        eventType: "game_completed",
        payload: {
          gameName: "Change Your Mind (Rule Switch)",
          score: finalScore,
          durationSeconds,
          accuracyPercent,
          completed: true,
          difficulty: "Cognitive Flexibility & Rule Switching",
          metadata: {
            totalRounds: TOTAL_ROUNDS,
            totalMistakes: totalMistakesRef.current,
            rulesExercised: Object.values(RULE_ROUNDS).map((r) => r.ruleTitleEn),
          },
        },
      });
    } catch (err) {
      console.warn("[RuleSwitch] Companion context save error:", err);
    }

    // Voice completion celebration
    try {
      const celebration =
        currentLang === "as"
          ? "অসাধাৰণ! আপুনি সকলো নিয়ম সলনিৰ লগত সুন্দৰভাৱে খাপ খাই পৰিল।"
          : currentLang === "hi"
          ? "अद्भुत! आपने सभी बदलते नियमों के साथ बहुत सुंदर तालमेल बैठाया।"
          : "Splendid! You adapted to every shifting rule with sharp flexibility.";
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
              <Text style={styles.completionEmoji}>🔄</Text>
            </View>

            <View style={styles.completionTag}>
              <Feather name="check-circle" size={14} color="#059669" />
              <Text style={styles.completionTagText}>FLEXIBILITY MASTERED</Text>
            </View>

            <Text style={styles.completionTitle}>
              {currentLang === "as"
                ? "চমৎকাৰ নিয়ম সলনি!"
                : currentLang === "hi"
                ? "शानदार मानसिक लचीलापन!"
                : "Wonderful Rule Flexibility!"}
            </Text>

            <Text style={styles.completionSubtitle}>
              {currentLang === "as"
                ? "আপুনি প্ৰতিটো পৰ্যায়ৰ নতুন নিয়ম অতি সহজে বুজি পাই শুদ্ধকৈ বাছনি কৰিলে।"
                : currentLang === "hi"
                ? "आपने प्रत्येक दौर के नए नियमों को बहुत सरलता से समझा और सही चयन किया।"
                : "You adapted to every shifting rule with calm, steady cognitive agility."}
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
              ? "মন সলনি (Rule Switch)"
              : currentLang === "hi"
              ? "मन बदलो (Rule Switch)"
              : "Change Your Mind"}
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
          {/* Active Rule Card */}
          <View style={styles.ruleCard}>
            <View
              style={[
                styles.ruleIconPill,
                { backgroundColor: currentConfig.themeBg },
              ]}
            >
              <MaterialCommunityIcons
                name={currentConfig.ruleIconName as any}
                size={34}
                color={currentConfig.themeColor}
              />
            </View>

            <View style={styles.ruleBadge}>
              <Feather name="refresh-cw" size={11} color="#475569" />
              <Text style={styles.ruleBadgeText}>
                {getRuleBadge(currentConfig)}
              </Text>
            </View>

            <Text style={styles.ruleTitleText}>
              {getRuleTitle(currentConfig)}
            </Text>

            <Text style={styles.ruleSubtitleText}>
              {getRuleSubtitle(currentConfig)}
            </Text>

            {/* Target Found Counter Pill */}
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
                ? "নিয়ম অনুযায়ী বস্তুসমূহ বাছক"
                : currentLang === "hi"
                ? "नियम के अनुसार वस्तुएं चुनें"
                : "Select objects matching this rule"}
            </Text>
          </View>

          {/* Search Grid Tiles */}
          <View style={styles.tilesGrid}>
            {shuffledGrid.map((item) => {
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
                  onPress={() => handleTapTile(item)}
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

      {/* Footer Bar */}
      <View style={styles.footerBar}>
        <View style={styles.scorePill}>
          <Text style={styles.scorePillLabel}>GAME SCORE</Text>
          <Text style={styles.scorePillValue}>{totalScore}</Text>
        </View>

        <View style={styles.footerPrompt}>
          <Feather name="zap" size={14} color="#64748B" />
          <Text style={styles.footerPromptText}>
            {currentLang === "as"
              ? "মানসিক নমনীয়তা আৰু মনোযোগ"
              : currentLang === "hi"
              ? "मानसिक लचीलापन एवं ध्यान"
              : "Cognitive flexibility exercise"}
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
  ruleCard: {
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
  ruleIconPill: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  ruleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
    marginBottom: Spacing.sm,
  },
  ruleBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.8,
  },
  ruleTitleText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 6,
    lineHeight: 28,
  },
  ruleSubtitleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.sm,
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
