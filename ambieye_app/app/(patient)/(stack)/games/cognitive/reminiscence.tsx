import React, { useState, useEffect } from "react";
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

interface ReminiscenceStoryConfig {
  id: number;
  titleKey: string;
  textKey: string;
  questionKey: string;
  sceneEmoji: string;
  bgGradient: string;
  options: {
    labelKey: string;
    isCorrect: boolean;
    emoji: string;
  }[];
}

const REMINISCENCE_STORIES: ReminiscenceStoryConfig[] = [
  {
    id: 1,
    titleKey: "rem_story1_title",
    textKey: "rem_story1_text",
    questionKey: "rem_story1_question",
    sceneEmoji: "🍃 🌅 🧺",
    bgGradient: "#ECFDF5",
    options: [
      { labelKey: "rem_story1_opt1", isCorrect: true, emoji: "🧺" },
      { labelKey: "rem_story1_opt2", isCorrect: false, emoji: "🪔" },
      { labelKey: "rem_story1_opt3", isCorrect: false, emoji: "🔔" },
    ],
  },
  {
    id: 2,
    titleKey: "rem_story2_title",
    textKey: "rem_story2_text",
    questionKey: "rem_story2_question",
    sceneEmoji: "🥁 🧣 🌾",
    bgGradient: "#FEF2F2",
    options: [
      { labelKey: "rem_story2_opt1", isCorrect: true, emoji: "🧣" },
      { labelKey: "rem_story2_opt2", isCorrect: false, emoji: "👓" },
      { labelKey: "rem_story2_opt3", isCorrect: false, emoji: "☂️" },
    ],
  },
  {
    id: 3,
    titleKey: "rem_story3_title",
    textKey: "rem_story3_text",
    questionKey: "rem_story3_question",
    sceneEmoji: "🌊 🌺 🛶",
    bgGradient: "#F0F9FF",
    options: [
      { labelKey: "rem_story3_opt1", isCorrect: true, emoji: "🌺" },
      { labelKey: "rem_story3_opt2", isCorrect: false, emoji: "🏜️" },
      { labelKey: "rem_story3_opt3", isCorrect: false, emoji: "🌴" },
    ],
  },
  {
    id: 4,
    titleKey: "rem_story4_title",
    textKey: "rem_story4_text",
    questionKey: "rem_story4_question",
    sceneEmoji: "🦏 🌿 🏞️",
    bgGradient: "#F0FDF4",
    options: [
      { labelKey: "rem_story4_opt1", isCorrect: true, emoji: "🦏" },
      { labelKey: "rem_story4_opt2", isCorrect: false, emoji: "🦁" },
      { labelKey: "rem_story4_opt3", isCorrect: false, emoji: "🐫" },
    ],
  },
];

export default function ReminiscenceGame() {
  const router = useRouter();
  const { t, currentLang } = useTranslation();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [gameStartTime] = useState(Date.now());

  useEffect(() => {
    return () => {
      VoiceAssistant.stop();
    };
  }, []);

  const currentStory = REMINISCENCE_STORIES[currentIndex];

  const handleReadStory = () => {
    const textToRead = `${t(currentStory.titleKey)}. ${t(currentStory.textKey)}. ${t(currentStory.questionKey)}`;
    VoiceAssistant.speak(textToRead, currentLang);
  };

  const handleSelectOption = (idx: number, isCorrect: boolean) => {
    if (selectedOption !== null) return;
    setSelectedOption(idx);

    if (isCorrect) {
      setScore((prev) => prev + 100);
      VoiceAssistant.speak(t("correct_feedback"), currentLang);
    } else {
      VoiceAssistant.speak(t("try_another"), currentLang);
    }

    setTimeout(() => {
      if (currentIndex + 1 < REMINISCENCE_STORIES.length) {
        setCurrentIndex((prev) => prev + 1);
        setSelectedOption(null);
      } else {
        finishGame();
      }
    }, 1500);
  };

  const finishGame = async () => {
    setCompleted(true);
    const duration = (Date.now() - gameStartTime) / 1000;
    await saveGameResult({
      gameId: 10,
      score: score + 100,
      duration: duration,
      date: new Date().toISOString(),
      details: {
        accuracy: 100,
        module: "Reminiscence Story Recall",
      },
    });
    VoiceAssistant.speak(`${t("well_done")}! ${t("game_complete_msg")}`, currentLang);
  };

  if (completed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.gameOverContainer}>
          <Text style={{ fontSize: 56, marginBottom: 12 }}>🌸</Text>
          <Text style={styles.gameOverTitle}>{t("well_done")}</Text>
          <Text style={styles.gameOverSub}>{t("game_complete_msg")}</Text>

          <View style={styles.scoreCard}>
            <Text style={styles.scoreCardNum}>{score}</Text>
            <Text style={styles.scoreCardLabel}>{t("score")}</Text>
          </View>

          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => {
              setCurrentIndex(0);
              setSelectedOption(null);
              setScore(0);
              setCompleted(false);
            }}
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.replace("/(patient)/games" as any)} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerBarTitle}>
          {t("round")} {currentIndex + 1}/{REMINISCENCE_STORIES.length}
        </Text>
        <TouchableOpacity style={styles.readAloudBtn} onPress={handleReadStory}>
          <Feather name="volume-2" size={20} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Story Card */}
        <View style={[styles.storyCard, { backgroundColor: currentStory.bgGradient }]}>
          <Text style={styles.sceneEmoji}>{currentStory.sceneEmoji}</Text>
          <Text style={styles.storyTitle}>
            {t(currentStory.titleKey)}
          </Text>
          <Text style={styles.storyText}>
            {t(currentStory.textKey)}
          </Text>
        </View>

        {/* Question Prompt */}
        <View style={styles.questionCard}>
          <View style={styles.questionIcon}>
            <Feather name="help-circle" size={22} color="#D97706" />
          </View>
          <Text style={styles.questionText}>
            {t(currentStory.questionKey)}
          </Text>
        </View>

        {/* Options List */}
        <View style={styles.optionsList}>
          {currentStory.options.map((opt, idx) => {
            const isSelected = selectedOption === idx;
            let optStyle = styles.optionCard;

            if (selectedOption !== null) {
              if (opt.isCorrect) optStyle = { ...optStyle, ...styles.optionCardCorrect };
              else if (isSelected && !opt.isCorrect) optStyle = { ...optStyle, ...styles.optionCardWrong };
            }

            return (
              <TouchableOpacity
                key={idx}
                style={optStyle}
                onPress={() => handleSelectOption(idx, opt.isCorrect)}
                disabled={selectedOption !== null}
                activeOpacity={0.7}
              >
                <Text style={styles.optEmoji}>{opt.emoji}</Text>
                <Text style={styles.optLabel}>
                  {t(opt.labelKey)}
                </Text>
                {selectedOption !== null && opt.isCorrect && (
                  <Feather name="check" size={24} color="#16A34A" />
                )}
              </TouchableOpacity>
            );
          })}
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
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  readAloudBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: Spacing.md,
  },
  storyCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  sceneEmoji: {
    fontSize: 44,
    marginBottom: 8,
  },
  storyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
  },
  storyText: {
    fontSize: 16,
    color: "#334155",
    lineHeight: 24,
    textAlign: "center",
  },
  questionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginBottom: Spacing.md,
    gap: 12,
  },
  questionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
  },
  questionText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#92400E",
    flex: 1,
    lineHeight: 22,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    gap: 14,
    minHeight: 64,
    ...Shadows.sm,
  },
  optionCardCorrect: {
    backgroundColor: "#DCFCE7",
    borderColor: "#22C55E",
  },
  optionCardWrong: {
    backgroundColor: "#FEE2E2",
    borderColor: "#EF4444",
  },
  optEmoji: {
    fontSize: 30,
  },
  optLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  gameOverContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
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
    lineHeight: 22,
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
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderRadius: BorderRadius.xl,
    paddingVertical: 16,
    paddingHorizontal: Spacing.xxl,
    gap: 8,
    ...Shadows.md,
  },
  startBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
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
