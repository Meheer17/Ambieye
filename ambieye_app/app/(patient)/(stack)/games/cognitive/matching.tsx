import React, { useState, useRef, useEffect } from "react";
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

interface CulturalMotif {
  id: number;
  key: string;
  nameEn: string;
  nameAs: string;
  emoji: string;
  color: string;
  bg: string;
  iconName: string;
}

const NER_CULTURAL_PAIRS: CulturalMotif[] = [
  { id: 1, key: "item_gamosa", nameEn: "Assamese Gamosa", nameAs: "অসমীয়া গামোচা", emoji: "🧣", color: "#DC2626", bg: "#FEF2F2", iconName: "scarf" },
  { id: 2, key: "item_puan", nameEn: "Mizo Puan Shawl", nameAs: "মিজো পুয়ান চাদৰ", emoji: "🌸", color: "#DB2777", bg: "#FDF2F8", iconName: "palette" },
  { id: 3, key: "item_hornbill", nameEn: "Great Hornbill", nameAs: "ধনেশ পক্ষী", emoji: "🦅", color: "#D97706", bg: "#FFFBEB", iconName: "feather" },
  { id: 4, key: "item_rhino", nameEn: "One-Horned Rhino", nameAs: "এশিঙীয়া গঁড়", emoji: "🦏", color: "#059669", bg: "#ECFDF5", iconName: "shield" },
  { id: 5, key: "item_tea", nameEn: "Assam Tea Leaf", nameAs: "অসমৰ চাহপাত", emoji: "🍃", color: "#16A34A", bg: "#F0FDF4", iconName: "leaf" },
  { id: 6, key: "item_dhol", nameEn: "Bihu Dhol", nameAs: "বিহুৰ ঢোল", emoji: "🥁", color: "#9333EA", bg: "#FAF5FF", iconName: "music" },
  { id: 7, key: "item_bamboo", nameEn: "Bamboo Basket", nameAs: "বাঁহৰ খৰাহী", emoji: "🧺", color: "#B45309", bg: "#FEF3C7", iconName: "archive" },
  { id: 8, key: "item_xorai", nameEn: "Brass Xorai", nameAs: "পিতলৰ শৰাই", emoji: "🏆", color: "#CA8A04", bg: "#FEF08A", iconName: "award" },
  { id: 9, key: "item_loktak", nameEn: "Loktak Lake", nameAs: "লোকটাক হ্ৰদ", emoji: "🌊", color: "#0284C7", bg: "#F0F9FF", iconName: "droplet" },
  { id: 10, key: "item_orchid", nameEn: "Blue Vanda Orchid", nameAs: "ভাটৌ ফুল", emoji: "🌺", color: "#7C3AED", bg: "#F5F3FF", iconName: "sun" },
];

export default function CulturalMatchingGame() {
  const router = useRouter();
  const { t, currentLang } = useTranslation();

  const [gameActive, setGameActive] = useState(false);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [totalRounds] = useState(3);
  const [leftItems, setLeftItems] = useState<CulturalMotif[]>([]);
  const [rightItems, setRightItems] = useState<CulturalMotif[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<number[]>([]);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [correctMatches, setCorrectMatches] = useState(0);
  const [wrongMatches, setWrongMatches] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const countdownValue = useRef(new Animated.Value(100)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const roundCompleted = useRef(false);

  const getPairsCount = () => {
    switch (difficulty) {
      case "easy": return 3;
      case "medium": return 4;
      case "hard": return 5;
    }
  };

  const startGame = (diff?: "easy" | "medium" | "hard") => {
    const selectedDiff = diff || difficulty;
    setDifficulty(selectedDiff);
    setGameActive(true);
    setGameOver(false);
    setScore(0);
    setRound(0);
    setCorrectMatches(0);
    setWrongMatches(0);
    setGameStartTime(Date.now());
    VoiceAssistant.speak(`${t("game_motif_match")}. ${t("play_now")}`, currentLang);
    setupRound(1, selectedDiff);
  };

  const setupRound = (nextRound: number, diff: "easy" | "medium" | "hard") => {
    if (animationRef.current) {
      animationRef.current.stop();
    }

    roundCompleted.current = false;
    setRound(nextRound);
    setSelectedLeft(null);
    setSelectedRight(null);
    setMatchedPairs([]);

    const pairsCount = diff === "easy" ? 3 : diff === "medium" ? 4 : 5;
    const shuffledPool = [...NER_CULTURAL_PAIRS].sort(() => Math.random() - 0.5);
    const selectedMotifs = shuffledPool.slice(0, pairsCount);

    const left = [...selectedMotifs];
    const right = [...selectedMotifs].sort(() => Math.random() - 0.5);

    setLeftItems(left);
    setRightItems(right);

    countdownValue.setValue(100);
    animationRef.current = Animated.timing(countdownValue, {
      toValue: 0,
      duration: 60000,
      useNativeDriver: false,
    });

    animationRef.current.start(() => {
      if (!roundCompleted.current) {
        roundCompleted.current = true;
        if (nextRound < totalRounds) {
          setupRound(nextRound + 1, diff);
        } else {
          finishGame();
        }
      }
    });
  };

  const handleLeftSelect = (id: number, motif: CulturalMotif) => {
    if (matchedPairs.includes(id)) return;
    setSelectedLeft(id);
    VoiceAssistant.speak(t(motif.key), currentLang);

    if (selectedRight !== null) {
      checkMatch(id, selectedRight);
    }
  };

  const handleRightSelect = (id: number, motif: CulturalMotif) => {
    if (matchedPairs.includes(id)) return;
    setSelectedRight(id);
    VoiceAssistant.speak(t(motif.key), currentLang);

    if (selectedLeft !== null) {
      checkMatch(selectedLeft, id);
    }
  };

  const checkMatch = (leftId: number, rightId: number) => {
    if (leftId === rightId) {
      // Correct match
      const updatedMatches = [...matchedPairs, leftId];
      setMatchedPairs(updatedMatches);
      setCorrectMatches((prev) => prev + 1);
      setScore((prev) => prev + 100);
      setSelectedLeft(null);
      setSelectedRight(null);

      const pairsCount = getPairsCount();
      if (updatedMatches.length === pairsCount) {
        // Round Complete!
        roundCompleted.current = true;
        if (animationRef.current) animationRef.current.stop();

        setTimeout(() => {
          if (round < totalRounds) {
            setupRound(round + 1, difficulty);
          } else {
            finishGame();
          }
        }, 1200);
      }
    } else {
      // Wrong match
      setWrongMatches((prev) => prev + 1);
      setTimeout(() => {
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 700);
    }
  };

  const finishGame = async () => {
    setGameActive(false);
    setGameOver(true);
    const duration = (Date.now() - gameStartTime) / 1000;
    const totalAttempts = correctMatches + wrongMatches;
    const accuracy = totalAttempts > 0 ? Math.round((correctMatches / totalAttempts) * 100) : 100;

    await saveGameResult({
      gameId: 12,
      score: score,
      duration: duration,
      date: new Date().toISOString(),
      details: {
        accuracy,
        correctSelections: correctMatches,
        wrongSelections: wrongMatches,
        difficulty,
      },
    });

    VoiceAssistant.speak(`${t("well_done")}! ${t("game_complete_msg")}`, currentLang);
  };

  const getItemLabel = (item: CulturalMotif) => {
    return t(item.key);
  };

  // ── Welcome / Difficulty Selection Screen ──────────────────────────────
  if (!gameActive && !gameOver) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerBarTitle}>{t("game_motif_match")}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.introContent}>
          <View style={styles.heroCard}>
            <Text style={styles.heroEmoji}>🧣 🦏 🍃</Text>
            <Text style={styles.heroTitle}>{t("game_motif_match")}</Text>
            <Text style={styles.heroDesc}>{t("game_motif_match_desc")}</Text>
          </View>

          <Text style={styles.sectionLabel}>{t("select_difficulty")}</Text>

          <View style={styles.diffCardsContainer}>
            <TouchableOpacity
              style={[styles.diffCard, difficulty === "easy" && styles.diffCardSelected]}
              onPress={() => setDifficulty("easy")}
              activeOpacity={0.8}
            >
              <View style={[styles.diffBadge, { backgroundColor: "#DCFCE7" }]}>
                <Text style={styles.diffBadgeEmoji}>🌱</Text>
              </View>
              <View style={styles.diffInfo}>
                <Text style={styles.diffTitle}>{t("level_easy")}</Text>
                <Text style={styles.diffSub}>{t("diff_easy_desc")}</Text>
              </View>
              {difficulty === "easy" && <Feather name="check-circle" size={24} color="#16A34A" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.diffCard, difficulty === "medium" && styles.diffCardSelected]}
              onPress={() => setDifficulty("medium")}
              activeOpacity={0.8}
            >
              <View style={[styles.diffBadge, { backgroundColor: "#FEF3C7" }]}>
                <Text style={styles.diffBadgeEmoji}>🌿</Text>
              </View>
              <View style={styles.diffInfo}>
                <Text style={styles.diffTitle}>{t("level_medium")}</Text>
                <Text style={styles.diffSub}>{t("diff_medium_desc")}</Text>
              </View>
              {difficulty === "medium" && <Feather name="check-circle" size={24} color="#D97706" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.diffCard, difficulty === "hard" && styles.diffCardSelected]}
              onPress={() => setDifficulty("hard")}
              activeOpacity={0.8}
            >
              <View style={[styles.diffBadge, { backgroundColor: "#FEE2E2" }]}>
                <Text style={styles.diffBadgeEmoji}>🌳</Text>
              </View>
              <View style={styles.diffInfo}>
                <Text style={styles.diffTitle}>{t("level_hard")}</Text>
                <Text style={styles.diffSub}>{t("diff_hard_desc")}</Text>
              </View>
              {difficulty === "hard" && <Feather name="check-circle" size={24} color="#DC2626" />}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => startGame(difficulty)}
            activeOpacity={0.85}
          >
            <Feather name="play" size={22} color="#FFFFFF" />
            <Text style={styles.startBtnText}>{t("play_now")}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Game Over Screen ───────────────────────────────────────────────────
  if (gameOver) {
    const totalAttempts = correctMatches + wrongMatches;
    const accuracy = totalAttempts > 0 ? Math.round((correctMatches / totalAttempts) * 100) : 100;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.gameOverContainer}>
          <View style={styles.trophyIconBg}>
            <Text style={{ fontSize: 48 }}>🏆</Text>
          </View>
          <Text style={styles.gameOverTitle}>{t("well_done")}</Text>
          <Text style={styles.gameOverSub}>{t("game_complete_msg")}</Text>

          <View style={styles.resultsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxNum}>{score}</Text>
              <Text style={styles.statBoxLabel}>{t("score")}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxNum}>{accuracy}%</Text>
              <Text style={styles.statBoxLabel}>{t("accuracy")}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxNum}>{correctMatches}</Text>
              <Text style={styles.statBoxLabel}>{t("matches_stat")}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => startGame(difficulty)}
            activeOpacity={0.85}
          >
            <Feather name="rotate-ccw" size={20} color="#FFFFFF" />
            <Text style={styles.startBtnText}>{t("play_again")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>{t("back_to_games")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Active Gameplay Screen ─────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* Top Status Bar */}
      <View style={styles.topStatsBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.exitBtn}>
          <Feather name="x" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.roundBadge}>
          <Text style={styles.roundBadgeText}>
            {t("round")} {round}/{totalRounds}
          </Text>
        </View>

        <View style={styles.scoreBadge}>
          <Feather name="award" size={16} color="#CA8A04" />
          <Text style={styles.scoreBadgeText}>{score}</Text>
        </View>
      </View>

      {/* Spoken Audio Hint Helper */}
      <View style={styles.hintBar}>
        <Text style={styles.hintBarText}>
          {t("matching_instruction")}
        </Text>
      </View>

      {/* Dual Matching Columns */}
      <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xl, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.columnsWrapper}>
          {/* Left Column */}
          <View style={styles.column}>
            {leftItems.map((item) => {
              const isMatched = matchedPairs.includes(item.id);
              const isSelected = selectedLeft === item.id;
              return (
                <TouchableOpacity
                  key={`left-${item.id}`}
                  style={[
                    styles.matchCard,
                    { backgroundColor: item.bg, borderColor: isSelected ? "#2563EB" : item.color },
                    isMatched && styles.matchCardDone,
                    isSelected && styles.matchCardSelected,
                  ]}
                  onPress={() => handleLeftSelect(item.id, item)}
                  disabled={isMatched}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cardEmoji}>{item.emoji}</Text>
                  <Text style={[styles.cardText, isMatched && styles.cardTextDone]} numberOfLines={2}>
                    {getItemLabel(item)}
                  </Text>
                  {isMatched && <Feather name="check" size={20} color="#16A34A" style={styles.cardCheck} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Right Column */}
          <View style={styles.column}>
            {rightItems.map((item) => {
              const isMatched = matchedPairs.includes(item.id);
              const isSelected = selectedRight === item.id;
              return (
                <TouchableOpacity
                  key={`right-${item.id}`}
                  style={[
                    styles.matchCard,
                    { backgroundColor: item.bg, borderColor: isSelected ? "#2563EB" : item.color },
                    isMatched && styles.matchCardDone,
                    isSelected && styles.matchCardSelected,
                  ]}
                  onPress={() => handleRightSelect(item.id, item)}
                  disabled={isMatched}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cardEmoji}>{item.emoji}</Text>
                  <Text style={[styles.cardText, isMatched && styles.cardTextDone]} numberOfLines={2}>
                    {getItemLabel(item)}
                  </Text>
                  {isMatched && <Feather name="check" size={20} color="#16A34A" style={styles.cardCheck} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    padding: 8,
  },
  headerBarTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  introContent: {
    padding: Spacing.md,
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  heroEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 6,
  },
  heroDesc: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  diffCardsContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  diffCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    ...Shadows.sm,
  },
  diffCardSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  diffBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  diffBadgeEmoji: {
    fontSize: 24,
  },
  diffInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  diffTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  diffSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderRadius: BorderRadius.xl,
    paddingVertical: 16,
    gap: 8,
    ...Shadows.md,
  },
  startBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  topStatsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  exitBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    ...Shadows.sm,
  },
  roundBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roundBadgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0284C7",
  },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF9C3",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  scoreBadgeText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#854D0E",
  },
  hintBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: "#F1F5F9",
    marginHorizontal: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  hintBarText: {
    fontSize: 12,
    color: "#475569",
    textAlign: "center",
    fontWeight: "500",
  },
  columnsWrapper: {
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  column: {
    flex: 1,
    gap: 10,
  },
  matchCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    borderWidth: 2,
    minHeight: 88,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    ...Shadows.sm,
  },
  matchCardSelected: {
    borderWidth: 3,
    transform: [{ scale: 1.03 }],
    ...Shadows.md,
  },
  matchCardDone: {
    opacity: 0.4,
    backgroundColor: "#E2E8F0",
    borderColor: "#CBD5E1",
  },
  cardEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  cardText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
  },
  cardTextDone: {
    textDecorationLine: "line-through",
  },
  cardCheck: {
    position: "absolute",
    top: 6,
    right: 6,
  },
  gameOverContainer: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  trophyIconBg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#FEF08A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  gameOverTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  gameOverSub: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  resultsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
    width: "100%",
  },
  statBox: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Shadows.sm,
  },
  statBoxNum: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2563EB",
  },
  statBoxLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },
  secondaryBtn: {
    marginTop: Spacing.md,
    paddingVertical: 12,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748B",
  },
});