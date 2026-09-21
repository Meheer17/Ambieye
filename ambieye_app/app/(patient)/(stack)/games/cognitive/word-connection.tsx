import React, { useState } from "react";
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
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { saveGameResult } from "@/utils/gameUtils";
import { useTranslation } from "@/constants/i18n";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import { Colors, BorderRadius, Shadows, Spacing } from "@/constants/theme";

const { width } = Dimensions.get("window");

interface WordPairQuestion {
  id: string;
  targetWord: string;
  targetEmoji: string;
  category: string;
  correctAnswer: string;
  options: { word: string; emoji: string }[];
}

const QUESTIONS: WordPairQuestion[] = [
  {
    id: "q1",
    targetWord: "Assam Tea",
    targetEmoji: "🍃",
    category: "Food & Drinks",
    correctAnswer: "Ceramic Cup",
    options: [
      { word: "Ceramic Cup", emoji: "☕" },
      { word: "Shoes", emoji: "👞" },
      { word: "Clock", emoji: "⏰" },
      { word: "Bicycle", emoji: "🚲" },
    ],
  },
  {
    id: "q2",
    targetWord: "Rain / Monsoon",
    targetEmoji: "🌧️",
    category: "Weather & Nature",
    correctAnswer: "Umbrella",
    options: [
      { word: "Candle", emoji: "🕯️" },
      { word: "Umbrella", emoji: "☂️" },
      { word: "Pillow", emoji: "🛏️" },
      { word: "Hammer", emoji: "🔨" },
    ],
  },
  {
    id: "q3",
    targetWord: "Doctor / ASHA",
    targetEmoji: "🩺",
    category: "Healthcare",
    correctAnswer: "Clinic & Medicine",
    options: [
      { word: "Frying Pan", emoji: "🍳" },
      { word: "Clinic & Medicine", emoji: "🏥" },
      { word: "Kite", emoji: "🪁" },
      { word: "Paintbrush", emoji: "🖌️" },
    ],
  },
  {
    id: "q4",
    targetWord: "Brahmaputra River",
    targetEmoji: "🌊",
    category: "Geography & Travel",
    correctAnswer: "Wooden Boat",
    options: [
      { word: "Wooden Boat", emoji: "🛶" },
      { word: "Table Lamp", emoji: "💡" },
      { word: "Keyring", emoji: "🔑" },
      { word: "Scissors", emoji: "✂️" },
    ],
  },
  {
    id: "q5",
    targetWord: "Night Sky",
    targetEmoji: "🌌",
    category: "Time & Universe",
    correctAnswer: "Bright Moon",
    options: [
      { word: "Bright Moon", emoji: "🌙" },
      { word: "Wristwatch", emoji: "⌚" },
      { word: "Apple", emoji: "🍎" },
      { word: "Door", emoji: "🚪" },
    ],
  },
];

export default function WordConnectionGame() {
  const router = useRouter();
  const { currentLang } = useTranslation();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [startTime] = useState(Date.now());

  const currentQ = QUESTIONS[currentIndex];

  const handleSelectOption = (word: string) => {
    if (feedback !== null) return;
    setSelectedWord(word);

    if (word === currentQ.correctAnswer) {
      setFeedback("correct");
      setScore((prev) => prev + 20);
      VoiceAssistant.speak(`Correct! ${currentQ.targetWord} connects with ${word}.`, currentLang);
    } else {
      setFeedback("wrong");
      VoiceAssistant.speak(`Not quite. The matching connection is ${currentQ.correctAnswer}.`, currentLang);
    }

    setTimeout(async () => {
      if (currentIndex < QUESTIONS.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setSelectedWord(null);
        setFeedback(null);
      } else {
        setIsGameOver(true);
        const finalScore = score + (word === currentQ.correctAnswer ? 20 : 0);
        const durationSec = Math.round((Date.now() - startTime) / 1000);
        await saveGameResult({
          gameId: 6,
          score: finalScore,
          duration: durationSec,
          date: new Date().toISOString().split("T")[0],
          details: {
            totalQuestions: QUESTIONS.length,
          },
        });
      }
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Word Connection</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Q {currentIndex + 1}/{QUESTIONS.length}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!isGameOver ? (
          <>
            {/* Stimulus Card */}
            <View style={styles.stimulusCard}>
              <Text style={styles.stimulusCategory}>{currentQ.category}</Text>
              <Text style={styles.stimulusEmoji}>{currentQ.targetEmoji}</Text>
              <Text style={styles.stimulusWord}>{currentQ.targetWord}</Text>
              <Text style={styles.stimulusPrompt}>Which word connects best with this?</Text>
            </View>

            {/* Options List */}
            <View style={styles.optionsGrid}>
              {currentQ.options.map((opt) => {
                const isSelected = selectedWord === opt.word;
                const isCorrect = opt.word === currentQ.correctAnswer;

                let cardStyle: any = styles.optionCard;
                if (feedback && isSelected) {
                  cardStyle = isCorrect ? [styles.optionCard, styles.optionCardCorrect] : [styles.optionCard, styles.optionCardWrong];
                } else if (feedback && isCorrect) {
                  cardStyle = [styles.optionCard, styles.optionCardCorrect];
                }

                return (
                  <TouchableOpacity
                    key={opt.word}
                    style={cardStyle}
                    onPress={() => handleSelectOption(opt.word)}
                    disabled={feedback !== null}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                    <Text style={styles.optionWord}>{opt.word}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : (
          <View style={styles.resultCard}>
            <Text style={{ fontSize: 54, marginBottom: 10 }}>🎉</Text>
            <Text style={styles.resultTitle}>Connection Mastered!</Text>
            <Text style={styles.resultScoreText}>{score} / 100</Text>
            <Text style={styles.resultDesc}>
              Excellent semantic association and vocabulary practice.
            </Text>
            <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
              <Text style={styles.doneBtnText}>Back to Games Hub</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  badge: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  content: {
    padding: Spacing.lg,
  },
  stimulusCard: {
    backgroundColor: "#1E293B",
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    alignItems: "center",
    marginBottom: Spacing.xl,
    ...Shadows.md,
  },
  stimulusCategory: {
    fontSize: 12,
    fontWeight: "700",
    color: "#93C5FD",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  stimulusEmoji: {
    fontSize: 52,
    marginBottom: 8,
  },
  stimulusWord: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  stimulusPrompt: {
    fontSize: 13,
    color: "#94A3B8",
  },
  optionsGrid: {
    gap: 12,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    gap: 14,
    ...Shadows.sm,
  },
  optionCardCorrect: {
    backgroundColor: "#DCFCE7",
    borderColor: "#16A34A",
  },
  optionCardWrong: {
    backgroundColor: "#FEE2E2",
    borderColor: "#DC2626",
  },
  optionEmoji: {
    fontSize: 32,
  },
  optionWord: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginTop: Spacing.lg,
    ...Shadows.md,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  resultScoreText: {
    fontSize: 36,
    fontWeight: "900",
    color: "#16A34A",
    marginBottom: 8,
  },
  resultDesc: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  doneBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: BorderRadius.xl,
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
