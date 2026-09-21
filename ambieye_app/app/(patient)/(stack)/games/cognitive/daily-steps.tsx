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

interface RoutineStep {
  id: string;
  order: number;
  label: string;
  emoji: string;
}

interface RoutinePuzzle {
  id: string;
  title: string;
  category: string;
  steps: RoutineStep[];
}

const PUZZLES: RoutinePuzzle[] = [
  {
    id: "p1",
    title: "Making Fresh Morning Tea",
    category: "Kitchen & Daily Care",
    steps: [
      { id: "s1", order: 1, label: "Boil water in the kettle", emoji: "🫖" },
      { id: "s2", order: 2, label: "Add aromatic Assam tea leaves", emoji: "🍃" },
      { id: "s3", order: 3, label: "Pour fresh milk and ginger", emoji: "🥛" },
      { id: "s4", order: 4, label: "Strain into cup and enjoy warmly", emoji: "☕" },
    ],
  },
  {
    id: "p2",
    title: "Morning Garden & Walk Routine",
    category: "Physical & Well-being",
    steps: [
      { id: "s1", order: 1, label: "Wear comfortable walking shoes", emoji: "👟" },
      { id: "s2", order: 2, label: "Take gentle walk in the sunlight", emoji: "🚶" },
      { id: "s3", order: 3, label: "Water courtyard herbs and flowers", emoji: "🌻" },
      { id: "s4", order: 4, label: "Sit down and drink a glass of fresh water", emoji: "💧" },
    ],
  },
  {
    id: "p3",
    title: "Preparing for Night Rest",
    category: "Sleep & Calming",
    steps: [
      { id: "s1", order: 1, label: "Wash face and hands with warm water", emoji: "🧼" },
      { id: "s2", order: 2, label: "Take prescribed evening medicine", emoji: "💊" },
      { id: "s3", order: 3, label: "Listen to gentle calming flute music", emoji: "🎶" },
      { id: "s4", order: 4, label: "Turn off bright lights and sleep comfortably", emoji: "🛏️" },
    ],
  },
];

export default function DailyStepsGame() {
  const router = useRouter();
  const { currentLang } = useTranslation();

  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [currentSteps, setCurrentSteps] = useState<RoutineStep[]>(() => {
    return [...PUZZLES[0].steps].sort(() => 0.5 - Math.random());
  });
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [score, setScore] = useState(0);
  const [startTime] = useState(Date.now());

  const currentPuzzle = PUZZLES[puzzleIndex];

  const handleSelectStep = (id: string) => {
    if (!selectedStepId) {
      setSelectedStepId(id);
    } else {
      // Swap step positions
      const fromIdx = currentSteps.findIndex((s) => s.id === selectedStepId);
      const toIdx = currentSteps.findIndex((s) => s.id === id);
      const copy = [...currentSteps];
      const temp = copy[fromIdx];
      copy[fromIdx] = copy[toIdx];
      copy[toIdx] = temp;
      setCurrentSteps(copy);
      setSelectedStepId(null);
      setFeedback(null);
    }
  };

  const handleCheckOrder = async () => {
    const isCorrect = currentSteps.every((s, idx) => s.order === idx + 1);
    if (isCorrect) {
      setFeedback("correct");
      VoiceAssistant.speak("Well done! Perfect routine order.", currentLang);
      setScore((prev) => prev + 33);
      if (puzzleIndex < PUZZLES.length - 1) {
        setTimeout(() => {
          const nextIdx = puzzleIndex + 1;
          setPuzzleIndex(nextIdx);
          setCurrentSteps([...PUZZLES[nextIdx].steps].sort(() => 0.5 - Math.random()));
          setFeedback(null);
        }, 1200);
      } else {
        setIsCompleted(true);
        const durationSec = Math.round((Date.now() - startTime) / 1000);
        await saveGameResult({
          gameId: 5,
          score: 100,
          duration: durationSec,
          date: new Date().toISOString().split("T")[0],
          details: {
            puzzlesCompleted: PUZZLES.length,
          },
        });
      }
    } else {
      setFeedback("incorrect");
      VoiceAssistant.speak("Not quite. Tap two steps to swap their order.", currentLang);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Steps</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Puzzle {puzzleIndex + 1}/{PUZZLES.length}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!isCompleted ? (
          <>
            {/* Puzzle Title Card */}
            <View style={styles.puzzleCard}>
              <Text style={styles.puzzleCategory}>{currentPuzzle.category}</Text>
              <Text style={styles.puzzleTitle}>{currentPuzzle.title}</Text>
              <Text style={styles.puzzleInstruction}>
                Tap any step, then tap another step to swap their order (1 to 4):
              </Text>
            </View>

            {/* Steps List */}
            <View style={styles.stepsContainer}>
              {currentSteps.map((step, index) => {
                const isSelected = selectedStepId === step.id;
                return (
                  <TouchableOpacity
                    key={step.id}
                    style={[styles.stepItem, isSelected && styles.stepItemSelected]}
                    onPress={() => handleSelectStep(step.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.stepNumCircle}>
                      <Text style={styles.stepNumText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.stepEmoji}>{step.emoji}</Text>
                    <Text style={styles.stepLabel}>{step.label}</Text>
                    <Feather
                      name="move"
                      size={18}
                      color={isSelected ? "#2563EB" : "#94A3B8"}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Feedback Alert */}
            {feedback === "correct" && (
              <View style={styles.correctAlert}>
                <Feather name="check-circle" size={20} color="#16A34A" />
                <Text style={styles.correctAlertText}>Correct sequence! Moving to next...</Text>
              </View>
            )}

            {feedback === "incorrect" && (
              <View style={styles.incorrectAlert}>
                <Feather name="alert-circle" size={20} color="#DC2626" />
                <Text style={styles.incorrectAlertText}>Some steps are out of order. Try swapping again!</Text>
              </View>
            )}

            {/* Check Button */}
            <TouchableOpacity
              style={styles.checkBtn}
              onPress={handleCheckOrder}
              activeOpacity={0.85}
            >
              <Feather name="check" size={20} color="#FFFFFF" />
              <Text style={styles.checkBtnText}>Check Order</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* Completion Card */
          <View style={styles.completionCard}>
            <Text style={{ fontSize: 54, marginBottom: 12 }}>🌟</Text>
            <Text style={styles.completionTitle}>Sequencing Routine Mastered!</Text>
            <Text style={styles.completionSub}>
              You successfully organized all daily care steps in their proper chronological order.
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
  puzzleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  puzzleCategory: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  puzzleTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
  },
  puzzleInstruction: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
  stepsContainer: {
    gap: 10,
    marginBottom: Spacing.lg,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    gap: 12,
    ...Shadows.sm,
  },
  stepItemSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  stepNumCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
  },
  stepEmoji: {
    fontSize: 24,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  correctAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: 8,
    marginBottom: Spacing.md,
  },
  correctAlertText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
  },
  incorrectAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: 8,
    marginBottom: Spacing.md,
  },
  incorrectAlertText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#991B1B",
  },
  checkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderRadius: BorderRadius.xl,
    paddingVertical: 15,
    gap: 8,
    ...Shadows.md,
  },
  checkBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  completionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginTop: Spacing.lg,
    ...Shadows.md,
  },
  completionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center",
  },
  completionSub: {
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
