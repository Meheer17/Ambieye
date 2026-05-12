import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  Easing,
} from "react-native";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { saveGameResult } from "@/utils/gameUtils";
import EyeTrackingOverlay from "@/components/EyeTrackingOverlay";
import { useEyeTracking } from "@/hooks/useEyeTracking";

const { width } = Dimensions.get("window");
const BALL_SIZE = 30;
const TRACK_RADIUS = width * 0.35;
const CIRCLE_DURATION = 5000;

export default function AntiClockwiseGame() {
  const router = useRouter();
  const [gameActive, setGameActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const gameStartTimeRef = useRef(0);
  const ballPosition = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const isEndingRef = useRef(false);

  const { frameProcessor, result: eyeResult, reset: resetEyeTracking } = useEyeTracking(gameActive);

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

    try {
      await saveGameResult({
        gameId: 7,
        score: 100,
        duration: gameDuration,
        date: new Date().toISOString(),
        details: { completedTime: gameDuration },
      });
      Alert.alert(
        "Exercise Complete!",
        "You successfully followed the ball for 1 minute!",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch {
      Alert.alert(
        "Exercise Complete!",
        "You successfully followed the ball for 1 minute!\n(Failed to save results)",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  }, [stopEverything, router]);

  const startGame = useCallback(() => {
    isEndingRef.current = false;
    setGameActive(true);
    setTimeLeft(60);
    gameStartTimeRef.current = Date.now();
    ballPosition.setValue(0);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    animationRef.current = Animated.loop(
      Animated.timing(ballPosition, {
        toValue: 1,
        duration: CIRCLE_DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animationRef.current.start();
  }, [ballPosition, endGame]);

  const translateX = ballPosition.interpolate({
    inputRange: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1],
    outputRange: [
      -TRACK_RADIUS,
      -TRACK_RADIUS * Math.cos(Math.PI * 0.05 * 2),
      -TRACK_RADIUS * Math.cos(Math.PI * 0.1 * 2),
      -TRACK_RADIUS * Math.cos(Math.PI * 0.15 * 2),
      -TRACK_RADIUS * Math.cos(Math.PI * 0.2 * 2),
      -TRACK_RADIUS * Math.cos(Math.PI * 0.25 * 2),
      -TRACK_RADIUS * Math.cos(Math.PI * 0.3 * 2),
      -TRACK_RADIUS * Math.cos(Math.PI * 0.35 * 2),
      -TRACK_RADIUS * Math.cos(Math.PI * 0.4 * 2),
      -TRACK_RADIUS * Math.cos(Math.PI * 0.45 * 2),
      -TRACK_RADIUS * Math.cos(Math.PI * 0.5 * 2),
      -TRACK_RADIUS * Math.cos(Math.PI * 0.55 * 2),
      -TRACK_RADIUS * Math.cos(Math.PI * 0.6 * 2),
      -TRACK_RADIUS * Math.cos(Math.PI * 0.65 * 2),
      -TRACK_RADIUS * Math.cos(Math.PI * 0.7 * 2),
      -TRACK_RADIUS * Math.cos(Math.PI * 0.75 * 2),
      -TRACK_RADIUS * Math.cos(Math.PI * 0.8 * 2),
      -TRACK_RADIUS * Math.cos(Math.PI * 0.85 * 2),
      -TRACK_RADIUS * Math.cos(Math.PI * 0.9 * 2),
      -TRACK_RADIUS * Math.cos(Math.PI * 0.95 * 2),
      -TRACK_RADIUS,
    ],
  });

  const translateY = ballPosition.interpolate({
    inputRange: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1],
    outputRange: [
      0,
      TRACK_RADIUS * Math.sin(Math.PI * 0.05 * 2),
      TRACK_RADIUS * Math.sin(Math.PI * 0.1 * 2),
      TRACK_RADIUS * Math.sin(Math.PI * 0.15 * 2),
      TRACK_RADIUS * Math.sin(Math.PI * 0.2 * 2),
      TRACK_RADIUS * Math.sin(Math.PI * 0.25 * 2),
      TRACK_RADIUS * Math.sin(Math.PI * 0.3 * 2),
      TRACK_RADIUS * Math.sin(Math.PI * 0.35 * 2),
      TRACK_RADIUS * Math.sin(Math.PI * 0.4 * 2),
      TRACK_RADIUS * Math.sin(Math.PI * 0.45 * 2),
      TRACK_RADIUS * Math.sin(Math.PI * 0.5 * 2),
      TRACK_RADIUS * Math.sin(Math.PI * 0.55 * 2),
      TRACK_RADIUS * Math.sin(Math.PI * 0.6 * 2),
      TRACK_RADIUS * Math.sin(Math.PI * 0.65 * 2),
      TRACK_RADIUS * Math.sin(Math.PI * 0.7 * 2),
      TRACK_RADIUS * Math.sin(Math.PI * 0.75 * 2),
      TRACK_RADIUS * Math.sin(Math.PI * 0.8 * 2),
      TRACK_RADIUS * Math.sin(Math.PI * 0.85 * 2),
      TRACK_RADIUS * Math.sin(Math.PI * 0.9 * 2),
      TRACK_RADIUS * Math.sin(Math.PI * 0.95 * 2),
      0,
    ],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <FontAwesome name="arrow-left" size={24} color="#0EA5E9" />
        </TouchableOpacity>
        <Text style={styles.gameTitle}>Follow the Ball (Anti-clockwise)</Text>
      </View>

      {!gameActive ? (
        <View style={styles.startContainer}>
          <Text style={styles.instructionText}>
            Follow the ball with your eyes as it moves in an anti-clockwise
            direction for 1 minute. This exercise helps strengthen your eye
            muscles and improve tracking ability.
          </Text>
          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.startButtonText}>Start Exercise</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.gameContainer}>
          <View style={styles.scoreContainer}>
            <Text style={styles.timerText}>Time Left: {timeLeft}s</Text>
            <EyeTrackingOverlay
              frameProcessor={frameProcessor}
              result={eyeResult}
              active={gameActive}
            />
          </View>

          <Text style={styles.instructions}>
            Follow the red ball with your eyes as it moves anti-clockwise
          </Text>

          <View style={styles.trackContainer}>
            <View style={styles.track} />
            <Animated.View
              style={[styles.ball, { transform: [{ translateX }, { translateY }] }]}
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
    alignItems: "center",
    width: "100%",
    marginBottom: 16,
  },
  timerText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0EA5E9",
  },
  instructions: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    color: "#333",
  },
  trackContainer: {
    width: TRACK_RADIUS * 2,
    height: TRACK_RADIUS * 2,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  track: {
    width: TRACK_RADIUS * 2,
    height: TRACK_RADIUS * 2,
    borderRadius: TRACK_RADIUS,
    borderWidth: 2,
    borderColor: "#ddd",
    position: "absolute",
  },
  ball: {
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_SIZE / 2,
    backgroundColor: "red",
    position: "absolute",
  },
});
