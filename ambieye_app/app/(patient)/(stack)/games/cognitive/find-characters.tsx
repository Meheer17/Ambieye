import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { saveGameResult } from "@/utils/gameUtils";
import { useTranslation } from "@/constants/i18n";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import { Colors, BorderRadius, Shadows, Spacing } from "@/constants/theme";

const CULTURAL_CHARS = ["অ", "আ", "ক", "খ", "গ", "ঘ", "ম", "ৰ", "ল", "স", "হ", "ত", "দ", "ন", "প", "ব"];

export default function FindCharactersGame() {
  const router = useRouter();
  const { t, currentLang } = useTranslation();

  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [totalRounds] = useState(4);
  const [charGrid, setCharGrid] = useState<string[][]>([]);
  const [selectedCells, setSelectedCells] = useState<string[]>([]);
  const [targetChar, setTargetChar] = useState("");
  const [targetCount, setTargetCount] = useState(0);
  const [foundCount, setFoundCount] = useState(0);
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
    setFoundCount(0);
    setGameStartTime(Date.now());
    VoiceAssistant.speak(`${t("game_visual_search")}. ${t("play_now")}`, currentLang);
    setupRound(1, diff);
  };

  const setupRound = (nextRound: number, diff: "easy" | "medium" | "hard") => {
    setRound(nextRound);
    setSelectedCells([]);
    setFoundCount(0);

    const rows = diff === "easy" ? 3 : diff === "medium" ? 4 : 4;
    const cols = diff === "easy" ? 3 : diff === "medium" ? 4 : 5;
    const count = diff === "easy" ? 3 : diff === "medium" ? 4 : 5;
    setTargetCount(count);

    const target = CULTURAL_CHARS[Math.floor(Math.random() * CULTURAL_CHARS.length)];
    setTargetChar(target);

    // Generate positions for the target characters
    const positions: string[] = [];
    while (positions.length < count) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      const pos = `${r}-${c}`;
      if (!positions.includes(pos)) {
        positions.push(pos);
      }
    }

    // Build grid
    const grid: string[][] = [];
    for (let i = 0; i < rows; i++) {
      const rowChars: string[] = [];
      for (let j = 0; j < cols; j++) {
        if (positions.includes(`${i}-${j}`)) {
          rowChars.push(target);
        } else {
          const pool = CULTURAL_CHARS.filter((ch) => ch !== target);
          rowChars.push(pool[Math.floor(Math.random() * pool.length)]);
        }
      }
      grid.push(rowChars);
    }
    setCharGrid(grid);

    VoiceAssistant.speak(`${t("find_target_prompt")} ${target}`, currentLang);
  };

  const handleCellPress = (row: number, col: number) => {
    const pos = `${row}-${col}`;
    if (selectedCells.includes(pos)) return;

    const char = charGrid[row][col];
    if (char === targetChar) {
      const updated = [...selectedCells, pos];
      setSelectedCells(updated);
      const nextFound = foundCount + 1;
      setFoundCount(nextFound);
      setScore((prev) => prev + 50);

      if (nextFound === targetCount) {
        VoiceAssistant.speak(`${t("well_done")}! ${t("found_all_done")}`, currentLang);
        setTimeout(() => {
          if (round < totalRounds) {
            setupRound(round + 1, difficulty);
          } else {
            finishGame();
          }
        }, 1200);
      }
    } else {
      VoiceAssistant.speak(t("try_another"), currentLang);
    }
  };

  const finishGame = async () => {
    setGameActive(false);
    setGameOver(true);
    const duration = (Date.now() - gameStartTime) / 1000;
    await saveGameResult({
      gameId: 10,
      score: score + 100,
      duration: duration,
      date: new Date().toISOString(),
      details: {
        accuracy: 95,
        module: "Visual Search & Attention",
      },
    });
    VoiceAssistant.speak(`${t("well_done")}! ${t("game_complete_msg")}`, currentLang);
  };

  if (!gameActive && !gameOver) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.replace("/(patient)/games" as any)} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerBarTitle}>{t("game_visual_search")}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.introContent}>
          <View style={styles.heroCard}>
            <Text style={styles.heroEmoji}>🔍 🔤 ✨</Text>
            <Text style={styles.heroTitle}>{t("game_visual_search")}</Text>
            <Text style={styles.heroDesc}>{t("game_visual_search_desc")}</Text>
          </View>

          <Text style={styles.sectionLabel}>{t("select_difficulty")}</Text>
          <View style={styles.diffContainer}>
            <TouchableOpacity
              style={[styles.diffBtn, difficulty === "easy" && styles.diffBtnSelected]}
              onPress={() => setDifficulty("easy")}
            >
              <Text style={styles.diffBtnEmoji}>🌱</Text>
              <Text style={styles.diffBtnText}>{t("level_easy")}</Text>
              <Text style={styles.diffBtnSub}>3x3 Grid</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.diffBtn, difficulty === "medium" && styles.diffBtnSelected]}
              onPress={() => setDifficulty("medium")}
            >
              <Text style={styles.diffBtnEmoji}>🌿</Text>
              <Text style={styles.diffBtnText}>{t("level_medium")}</Text>
              <Text style={styles.diffBtnSub}>4x4 Grid</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.diffBtn, difficulty === "hard" && styles.diffBtnSelected]}
              onPress={() => setDifficulty("hard")}
            >
              <Text style={styles.diffBtnEmoji}>🌳</Text>
              <Text style={styles.diffBtnText}>{t("level_hard")}</Text>
              <Text style={styles.diffBtnSub}>4x5 Grid</Text>
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

  if (gameOver) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.gameOverContainer}>
          <Text style={{ fontSize: 50, marginBottom: 10 }}>🎉</Text>
          <Text style={styles.gameOverTitle}>{t("well_done")}</Text>
          <Text style={styles.gameOverSub}>{t("game_complete_msg")}</Text>

          <View style={styles.scoreCard}>
            <Text style={styles.scoreCardNum}>{score}</Text>
            <Text style={styles.scoreCardLabel}>{t("score")}</Text>
          </View>

          <TouchableOpacity style={styles.startBtn} onPress={() => startGame(difficulty)}>
            <Feather name="rotate-ccw" size={20} color="#FFFFFF" />
            <Text style={styles.startBtnText}>{t("play_again")}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.replace("/(patient)/games" as any)}>
            <Text style={styles.secondaryBtnText}>{t("back_to_games")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topStatsBar}>
        <TouchableOpacity onPress={() => router.replace("/(patient)/games" as any)} style={styles.exitBtn}>
          <Feather name="x" size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.roundBadge}>
          <Text style={styles.roundBadgeText}>{t("round_prefix")} {round}/{totalRounds}</Text>
        </View>

        <View style={styles.scoreBadge}>
          <Feather name="award" size={16} color="#CA8A04" />
          <Text style={styles.scoreBadgeText}>{score}</Text>
        </View>
      </View>

      {/* Target Banner */}
      <View style={styles.targetBanner}>
        <Text style={styles.targetLabel}>{t("find_target_prompt")}</Text>
        <View style={styles.targetCharBadge}>
          <Text style={styles.targetCharText}>{targetChar}</Text>
        </View>
        <Text style={styles.progressText}>
          {foundCount} / {targetCount} {t("found_stat")}
        </Text>
      </View>

      {/* Character Grid */}
      <View style={styles.gridWrapper}>
        {charGrid.map((row, rIdx) => (
          <View key={`row-${rIdx}`} style={styles.gridRow}>
            {row.map((ch, cIdx) => {
              const pos = `${rIdx}-${cIdx}`;
              const isFound = selectedCells.includes(pos);
              return (
                <TouchableOpacity
                  key={`cell-${pos}`}
                  style={[styles.gridCell, isFound && styles.gridCellFound]}
                  onPress={() => handleCellPress(rIdx, cIdx)}
                  activeOpacity={0.7}
                  disabled={isFound}
                >
                  <Text style={[styles.cellText, isFound && styles.cellTextFound]}>{ch}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
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
  targetBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    gap: 10,
    marginBottom: Spacing.md,
  },
  targetLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E40AF",
  },
  targetCharBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  targetCharText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  progressText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#059669",
    marginLeft: "auto",
  },
  gridWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
    gap: 12,
  },
  gridRow: {
    flexDirection: "row",
    gap: 12,
  },
  gridCell: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#CBD5E1",
    ...Shadows.sm,
  },
  gridCellFound: {
    backgroundColor: "#DCFCE7",
    borderColor: "#22C55E",
  },
  cellText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
  },
  cellTextFound: {
    color: "#16A34A",
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
  scoreCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: Spacing.xl,
    ...Shadows.md,
  },
  scoreCardNum: {
    fontSize: 36,
    fontWeight: "800",
    color: "#2563EB",
  },
  scoreCardLabel: {
    fontSize: 14,
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