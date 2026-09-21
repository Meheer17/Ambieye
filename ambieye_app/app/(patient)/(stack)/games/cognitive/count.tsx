import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { saveGameResult } from "@/utils/gameUtils";
import { useTranslation } from "@/constants/i18n";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import { Colors, BorderRadius, Shadows, Spacing } from "@/constants/theme";

const { width } = Dimensions.get("window");

interface CountItemType {
  nameKey: string;
  emoji: string;
  color: string;
  bg: string;
}

const COUNTABLE_ITEMS: CountItemType[] = [
  { nameKey: "item_xorai", emoji: "🏆", color: "#CA8A04", bg: "#FEF08A" },
  { nameKey: "item_tea", emoji: "🍵", color: "#16A34A", bg: "#DCFCE7" },
  { nameKey: "item_bamboo", emoji: "🧺", color: "#B45309", bg: "#FEF3C7" },
  { nameKey: "item_dhol", emoji: "🥁", color: "#9333EA", bg: "#FAF5FF" },
  { nameKey: "item_rhino", emoji: "🦏", color: "#059669", bg: "#ECFDF5" },
];

export default function CulturalCountGame() {
  const router = useRouter();
  const { t, currentLang } = useTranslation();

  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [totalRounds] = useState(5);
  const [currentItem, setCurrentItem] = useState<CountItemType>(COUNTABLE_ITEMS[0]);
  const [targetCount, setTargetCount] = useState(3);
  const [options, setOptions] = useState<number[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctSelections, setCorrectSelections] = useState(0);
  const [wrongSelections, setWrongSelections] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(0);

  useEffect(() => {
    return () => {
      VoiceAssistant.stop();
    };
  }, []);

  const startGame = (diff: "easy" | "medium" | "hard" = "easy") => {
    setDifficulty(diff);
    setGameActive(true);
    setGameOver(false);
    setScore(0);
    setRound(0);
    setCorrectSelections(0);
    setWrongSelections(0);
    setGameStartTime(Date.now());
    VoiceAssistant.speak(`${t("game_count")}. ${t("play_now")}`, currentLang);
    setupRound(1, diff);
  };

  const setupRound = (nextRound: number, diff: "easy" | "medium" | "hard") => {
    setRound(nextRound);
    setSelectedOption(null);
    setIsCorrect(null);

    // Pick random item
    const item = COUNTABLE_ITEMS[Math.floor(Math.random() * COUNTABLE_ITEMS.length)];
    setCurrentItem(item);

    // Determine count based on difficulty
    let count = 3;
    if (diff === "easy") {
      count = Math.floor(Math.random() * 3) + 3; // 3 to 5
    } else if (diff === "medium") {
      count = Math.floor(Math.random() * 4) + 4; // 4 to 7
    } else {
      count = Math.floor(Math.random() * 5) + 5; // 5 to 9
    }
    setTargetCount(count);

    // Generate 4 distinct options
    const optionSet = new Set<number>([count]);
    while (optionSet.size < 4) {
      const offset = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 3) + 1);
      const val = Math.max(1, count + offset);
      optionSet.add(val);
    }
    const shuffledOptions = Array.from(optionSet).sort(() => Math.random() - 0.5);
    setOptions(shuffledOptions);

    // Read question aloud
    const questionText = `${t(item.nameKey)}?`;
    VoiceAssistant.speak(questionText, currentLang);
  };

  const handleSelectOption = (num: number) => {
    if (selectedOption !== null) return; // Prevent double taps
    setSelectedOption(num);

    const correct = num === targetCount;
    setIsCorrect(correct);

    if (correct) {
      setScore((prev) => prev + 100);
      setCorrectSelections((prev) => prev + 1);
      VoiceAssistant.speak(t("correct_feedback"), currentLang);
    } else {
      setWrongSelections((prev) => prev + 1);
      VoiceAssistant.speak(`${t("wrong_feedback_prefix")} ${targetCount}`, currentLang);
    }

    setTimeout(() => {
      if (round < totalRounds) {
        setupRound(round + 1, difficulty);
      } else {
        finishGame();
      }
    }, 1200);
  };

  const finishGame = async () => {
    setGameActive(false);
    setGameOver(true);
    const duration = (Date.now() - gameStartTime) / 1000;
    const totalAttempts = correctSelections + wrongSelections;
    const accuracy = totalAttempts > 0 ? Math.round((correctSelections / totalAttempts) * 100) : 100;

    await saveGameResult({
      gameId: 11,
      score: score,
      duration: duration,
      date: new Date().toISOString(),
      details: {
        accuracy,
        correctSelections,
        wrongSelections,
        difficulty,
      },
    });

    VoiceAssistant.speak(`${t("well_done")}! ${t("game_complete_msg")}`, currentLang);
  };

  // ── Intro Screen ───────────────────────────────────────────────────────
  if (!gameActive && !gameOver) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.replace("/(patient)/games" as any)} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerBarTitle}>{t("game_count")}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.introContent}>
          <View style={styles.heroCard}>
            <Text style={styles.heroEmoji}>🏆 🍵 🧺</Text>
            <Text style={styles.heroTitle}>{t("game_count")}</Text>
            <Text style={styles.heroDesc}>{t("game_count_desc")}</Text>
          </View>

          <Text style={styles.sectionLabel}>{t("select_difficulty")}</Text>
          <View style={styles.diffContainer}>
            <TouchableOpacity
              style={[styles.diffBtn, difficulty === "easy" && styles.diffBtnSelected]}
              onPress={() => setDifficulty("easy")}
            >
              <Text style={styles.diffBtnEmoji}>🌱</Text>
              <Text style={styles.diffBtnText}>{t("level_easy")}</Text>
              <Text style={styles.diffBtnSub}>3 - 5 Items</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.diffBtn, difficulty === "medium" && styles.diffBtnSelected]}
              onPress={() => setDifficulty("medium")}
            >
              <Text style={styles.diffBtnEmoji}>🌿</Text>
              <Text style={styles.diffBtnText}>{t("level_medium")}</Text>
              <Text style={styles.diffBtnSub}>4 - 7 Items</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.diffBtn, difficulty === "hard" && styles.diffBtnSelected]}
              onPress={() => setDifficulty("hard")}
            >
              <Text style={styles.diffBtnEmoji}>🌳</Text>
              <Text style={styles.diffBtnText}>{t("level_hard")}</Text>
              <Text style={styles.diffBtnSub}>5 - 9 Items</Text>
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
    const totalAttempts = correctSelections + wrongSelections;
    const accuracy = totalAttempts > 0 ? Math.round((correctSelections / totalAttempts) * 100) : 100;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.gameOverContainer}>
          <Text style={{ fontSize: 50, marginBottom: 10 }}>🎉</Text>
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
              <Text style={styles.statBoxNum}>{correctSelections}/{totalRounds}</Text>
              <Text style={styles.statBoxLabel}>{t("correct_stat")}</Text>
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
            onPress={() => router.replace("/(patient)/games" as any)}
          >
            <Text style={styles.secondaryBtnText}>{t("back_to_games")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Gameplay Screen ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topStatsBar}>
        <TouchableOpacity onPress={() => router.replace("/(patient)/games" as any)} style={styles.exitBtn}>
          <Feather name="x" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.roundBadge}>
          <Text style={styles.roundBadgeText}>{t("round")} {round}/{totalRounds}</Text>
        </View>

        <View style={styles.scoreBadge}>
          <Feather name="award" size={16} color="#CA8A04" />
          <Text style={styles.scoreBadgeText}>{score}</Text>
        </View>
      </View>

      {/* Spoken Audio Helper Prompt */}
      <TouchableOpacity
        style={styles.promptBar}
        onPress={() => VoiceAssistant.speak(`${t(currentItem.nameKey)}?`, currentLang)}
      >
        <Feather name="volume-2" size={20} color="#2563EB" />
        <Text style={styles.promptText}>
          {t("count_question_prompt")} ({t(currentItem.nameKey)})
        </Text>
      </TouchableOpacity>

      {/* Object Display Canvas */}
      <View style={[styles.canvasCard, { backgroundColor: currentItem.bg }]}>
        <View style={styles.itemsGrid}>
          {Array.from({ length: targetCount }).map((_, idx) => (
            <View key={idx} style={styles.itemEmojiWrapper}>
              <Text style={styles.itemEmoji}>{currentItem.emoji}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Answer Options Grid (Big Touch Targets) */}
      <View style={styles.optionsWrapper}>
        <Text style={styles.chooseLabel}>Choose the correct number:</Text>
        <View style={styles.optionsGrid}>
          {options.map((opt) => {
            const isSelected = selectedOption === opt;
            const isAnswer = opt === targetCount;
            let btnStyle = styles.optionBtn;

            if (selectedOption !== null) {
              if (isSelected && isCorrect) btnStyle = { ...btnStyle, ...styles.optionBtnCorrect };
              else if (isSelected && !isCorrect) btnStyle = { ...btnStyle, ...styles.optionBtnWrong };
              else if (isAnswer) btnStyle = { ...btnStyle, ...styles.optionBtnCorrect };
            }

            return (
              <TouchableOpacity
                key={opt}
                style={btnStyle}
                onPress={() => handleSelectOption(opt)}
                disabled={selectedOption !== null}
                activeOpacity={0.7}
              >
                <Text style={styles.optionBtnText}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
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
  },
  diffContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: Spacing.xl,
  },
  diffBtn: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    ...Shadows.sm,
  },
  diffBtnSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  diffBtnEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  diffBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  diffBtnSub: {
    fontSize: 11,
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
  promptBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: 10,
    marginBottom: Spacing.sm,
  },
  promptText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E40AF",
    flex: 1,
  },
  canvasCard: {
    flex: 1,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E2E8F0",
  },
  itemsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  itemEmojiWrapper: {
    padding: 8,
  },
  itemEmoji: {
    fontSize: 48,
  },
  optionsWrapper: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  chooseLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  optionsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  optionBtn: {
    flex: 1,
    height: 64,
    borderRadius: BorderRadius.xl,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#CBD5E1",
    ...Shadows.md,
  },
  optionBtnCorrect: {
    backgroundColor: "#22C55E",
    borderColor: "#16A34A",
  },
  optionBtnWrong: {
    backgroundColor: "#EF4444",
    borderColor: "#DC2626",
  },
  optionBtnText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
  },
  gameOverContainer: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: "center",
    alignItems: "center",
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