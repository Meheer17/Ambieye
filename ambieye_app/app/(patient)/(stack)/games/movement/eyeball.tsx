import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { saveGameResult } from "@/utils/gameUtils";
import EyeTrackingOverlay from "@/components/EyeTrackingOverlay";
import { useEyeTracking } from "@/hooks/useEyeTracking";

const { width, height } = Dimensions.get("window");
const BALL_SIZE = 30;
const EXERCISE_DURATION = 120;

export default function EyeballMovementGame() {
  const router = useRouter();
  const [gameActive, setGameActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(EXERCISE_DURATION);
  const [currentPatternIndex, setCurrentPatternIndex] = useState(0);
  const [currentPatternName, setCurrentPatternName] = useState("");
  const ballPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const patternsRef = useRef<{ name: string; positions: { x: number; y: number }[] }[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAnimatingRef = useRef(false);
  const gameStartTimeRef = useRef(0);
  const isEndingRef = useRef(false);
  // Keep a ref of timeRemaining so endGame can read the latest value
  const timeRemainingRef = useRef(EXERCISE_DURATION);

  const { frameProcessor, result: eyeResult, reset: resetEyeTracking } = useEyeTracking(gameActive);

  // ── Movement patterns ─────────────────────────────────────────────────────
  useEffect(() => {
    patternsRef.current = [
      {
        name: "Horizontal",
        positions: [
          { x: -width * 0.4, y: 0 },
          { x: width * 0.4, y: 0 },
          { x: -width * 0.4, y: 0 },
        ],
      },
      {
        name: "Vertical",
        positions: [
          { x: 0, y: -height * 0.25 },
          { x: 0, y: height * 0.25 },
          { x: 0, y: -height * 0.25 },
        ],
      },
      {
        name: "Diagonal 1",
        positions: [
          { x: -width * 0.35, y: -height * 0.2 },
          { x: width * 0.35, y: height * 0.2 },
          { x: -width * 0.35, y: -height * 0.2 },
        ],
      },
      {
        name: "Diagonal 2",
        positions: [
          { x: width * 0.35, y: -height * 0.2 },
          { x: -width * 0.35, y: height * 0.2 },
          { x: width * 0.35, y: -height * 0.2 },
        ],
      },
      {
        name: "Box Shape",
        positions: [
          { x: -width * 0.4, y: -height * 0.25 },
          { x: width * 0.4, y: -height * 0.25 },
          { x: width * 0.4, y: height * 0.25 },
          { x: -width * 0.4, y: height * 0.25 },
          { x: 0, y: 0 },
          { x: -width * 0.4, y: -height * 0.25 },
        ],
      },
      {
        name: "Zigzag",
        positions: [
          { x: -width * 0.4, y: -height * 0.25 },
          { x: width * 0.4, y: -height * 0.25 },
          { x: -width * 0.4, y: -height * 0.08 },
          { x: width * 0.4, y: -height * 0.08 },
          { x: -width * 0.4, y: height * 0.08 },
          { x: width * 0.4, y: height * 0.08 },
          { x: -width * 0.4, y: height * 0.25 },
          { x: width * 0.4, y: height * 0.25 },
          { x: -width * 0.4, y: -height * 0.25 },
        ],
      },
    ];
  }, []);

  // ── Cleanup helper ────────────────────────────────────────────────────────
  const stopEverything = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }
    isAnimatingRef.current = false;
    resetEyeTracking();
  }, [resetEyeTracking]);

  // ── Unmount cleanup ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopEverything();
    };
  }, [stopEverything]);

  // ── Back button ───────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    stopEverything();
    setGameActive(false);
    router.back();
  }, [stopEverything, router]);

  const endGame = useCallback(async () => {
    if (isEndingRef.current) return;
    isEndingRef.current = true;

    stopEverything();
    setGameActive(false);

    const gameDuration = (Date.now() - gameStartTimeRef.current) / 1000;
    const completedTime = EXERCISE_DURATION - timeRemainingRef.current;

    try {
      await saveGameResult({
        gameId: 8,
        score: 100,
        duration: gameDuration,
        date: new Date().toISOString(),
        details: { completedExerciseTime: completedTime },
      });
      Alert.alert(
        "Exercise Complete!",
        `Time: ${Math.round(gameDuration)}s`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch {
      Alert.alert(
        "Exercise Complete!",
        `Time: ${Math.round(gameDuration)}s\n(Failed to save results)`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  }, [stopEverything, router]);

  // ── Ball animation ────────────────────────────────────────────────────────
  const animateBall = useCallback(
    (patternIndex: number) => {
      const pattern = patternsRef.current[patternIndex];
      if (!pattern) return;

      isAnimatingRef.current = true;
      setCurrentPatternName(pattern.name);
      setCurrentPatternIndex(patternIndex);

      if (animationRef.current) {
        animationRef.current.stop();
      }

      const sequence = pattern.positions.map((pos) =>
        Animated.timing(ballPosition, {
          toValue: { x: pos.x, y: pos.y },
          duration: 1200,
          useNativeDriver: true,
        })
      );

      animationRef.current = Animated.sequence(sequence);
      animationRef.current.start(() => {
        isAnimatingRef.current = false;
        // Only chain next pattern if game is still running
        if (timerRef.current !== null) {
          const next = (patternIndex + 1) % patternsRef.current.length;
          setTimeout(() => {
            if (timerRef.current !== null) {
              animateBall(next);
            }
          }, 100);
        }
      });
    },
    [ballPosition]
  );

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameActive) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = prev - 1;
        timeRemainingRef.current = next;
        if (next <= 0) {
          endGame();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [gameActive, endGame]);

  // ── Start animation when game becomes active ──────────────────────────────
  useEffect(() => {
    if (gameActive && !isAnimatingRef.current) {
      animateBall(currentPatternIndex);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameActive]);

  const startGame = useCallback(() => {
    isEndingRef.current = false;
    setGameActive(true);
    setTimeRemaining(EXERCISE_DURATION);
    timeRemainingRef.current = EXERCISE_DURATION;
    setCurrentPatternIndex(0);
    setCurrentPatternName("");
    gameStartTimeRef.current = Date.now();
    isAnimatingRef.current = false;
    ballPosition.setValue({ x: 0, y: 0 });
  }, [ballPosition]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <FontAwesome name="arrow-left" size={24} color="#0EA5E9" />
        </TouchableOpacity>
        <Text style={styles.gameTitle}>Eyeball Movement</Text>
      </View>

      {!gameActive ? (
        <View style={styles.startContainer}>
          <Text style={styles.instructionText}>
            Follow the ball with your eyes as it moves in different patterns.
            This exercise helps strengthen your eye muscles and improve
            coordination.
          </Text>
          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.startButtonText}>Start Exercise</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.gameContainer}>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>Time: {timeRemaining}s</Text>
            <Text style={styles.roundText}>Pattern: {currentPatternName}</Text>
          </View>

          <View style={styles.eyeTrackingRow}>
            <EyeTrackingOverlay
              frameProcessor={frameProcessor}
              result={eyeResult}
              active={gameActive}
            />
          </View>

          <Text style={styles.instructions}>
            Keep your head still and follow only with your eyes
          </Text>

          <View style={styles.gameArea}>
            <Animated.View
              style={[
                styles.ball,
                {
                  transform: [
                    { translateX: ballPosition.x },
                    { translateY: ballPosition.y },
                  ],
                },
              ]}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 20,
    paddingTop: 56,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gameTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0EA5E9",
    marginBottom: 20,
    textAlign: "center",
  },
  startContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  instructionText: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 30,
    color: "#333",
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  startButton: {
    backgroundColor: "#0EA5E9",
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
  },
  startButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  gameContainer: {
    flex: 1,
    alignItems: "center",
  },
  scoreContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 12,
  },
  eyeTrackingRow: {
    alignItems: "center",
    marginBottom: 10,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0EA5E9",
  },
  roundText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  instructions: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
    color: "#666",
  },
  gameArea: {
    width: width * 0.9,
    height: height * 0.45,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
    borderRadius: 10,
  },
  ball: {
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_SIZE / 2,
    backgroundColor: "#0EA5E9",
    position: "absolute",
  },
});
