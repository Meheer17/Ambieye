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
const TARGET_SIZE = 40;
const TOTAL_ROUNDS = 10;

export default function TargetDirectionGame() {
  const router = useRouter();
  const [gameActive, setGameActive] = useState(false);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [direction, setDirection] = useState("");
  const [correctSelections, setCorrectSelections] = useState(0);
  const [wrongSelections, setWrongSelections] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);
  const [waitingForSelection, setWaitingForSelection] = useState(false);
  const targetPosition = useRef(new Animated.ValueXY()).current;
  const targetOpacity = useRef(new Animated.Value(0)).current;
  const gameStartTimeRef = useRef(0);
  const roundRef = useRef(0);
  const correctRef = useRef(0);
  const wrongRef = useRef(0);
  const targetAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const roundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEndingRef = useRef(false);

  const { frameProcessor, result: eyeResult, reset: resetEyeTracking } = useEyeTracking(gameActive);

  const directions = ["left", "right", "up", "down"] as const;

  const directionConfigs = {
    left:  { start: { x: width * 0.75, y: height * 0.3 }, end: { x: -TARGET_SIZE, y: height * 0.3 } },
    right: { start: { x: -TARGET_SIZE, y: height * 0.3 }, end: { x: width * 0.75, y: height * 0.3 } },
    up:    { start: { x: width * 0.4, y: height * 0.6 },  end: { x: width * 0.4, y: -TARGET_SIZE } },
    down:  { start: { x: width * 0.4, y: -TARGET_SIZE },  end: { x: width * 0.4, y: height * 0.6 } },
  };

  // ── Cleanup helper ────────────────────────────────────────────────────────
  const stopEverything = useCallback(() => {
    if (targetAnimRef.current) {
      targetAnimRef.current.stop();
      targetAnimRef.current = null;
    }
    if (roundTimeoutRef.current) {
      clearTimeout(roundTimeoutRef.current);
      roundTimeoutRef.current = null;
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
    setGameEnded(true);

    const gameDuration = (Date.now() - gameStartTimeRef.current) / 1000;
    const total = correctRef.current + wrongRef.current;
    const finalScore = total > 0 ? Math.round((correctRef.current / total) * 100) : 0;

    try {
      await saveGameResult({
        gameId: 9,
        score: finalScore,
        duration: gameDuration,
        date: new Date().toISOString(),
        details: {
          rounds: roundRef.current,
          correctSelections: correctRef.current,
          wrongSelections: wrongRef.current,
        },
      });
      setTimeout(() => {
        Alert.alert(
          "Game Complete!",
          `Score: ${finalScore}%\nTime: ${Math.round(gameDuration)}s`,
          [{ text: "OK", onPress: () => router.back() }]
        );
      }, 100);
    } catch {
      setTimeout(() => {
        Alert.alert(
          "Game Complete!",
          `Score: ${finalScore}%\nTime: ${Math.round(gameDuration)}s\n(Failed to save results)`,
          [{ text: "OK", onPress: () => router.back() }]
        );
      }, 100);
    }
  }, [stopEverything, router]);

  const setupRound = useCallback(() => {
    const nextRound = roundRef.current + 1;
    if (nextRound > TOTAL_ROUNDS) {
      endGame();
      return;
    }

    roundRef.current = nextRound;
    setRound(nextRound);
    setWaitingForSelection(true);

    const newDirection = directions[Math.floor(Math.random() * directions.length)];
    setDirection(newDirection);

    const config = directionConfigs[newDirection];
    targetPosition.setValue(config.start);
    targetOpacity.setValue(1);

    if (targetAnimRef.current) {
      targetAnimRef.current.stop();
    }

    targetAnimRef.current = Animated.parallel([
      Animated.timing(targetPosition, {
        toValue: config.end,
        duration: 3000,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(targetOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.delay(2800),
        Animated.timing(targetOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]),
    ]);
    targetAnimRef.current.start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endGame, targetOpacity, targetPosition]);

  const handleDirectionSelect = useCallback(
    (selectedDirection: string) => {
      if (gameEnded || !waitingForSelection) return;

      setWaitingForSelection(false);

      if (selectedDirection === direction) {
        correctRef.current += 1;
        setCorrectSelections(correctRef.current);
        setScore((prev) => prev + 10);
      } else {
        wrongRef.current += 1;
        setWrongSelections(wrongRef.current);
      }

      roundTimeoutRef.current = setTimeout(() => {
        if (roundRef.current >= TOTAL_ROUNDS) {
          endGame();
        } else {
          setupRound();
        }
      }, 1000);
    },
    [gameEnded, waitingForSelection, direction, endGame, setupRound]
  );

  const startGame = useCallback(() => {
    isEndingRef.current = false;
    roundRef.current = 0;
    correctRef.current = 0;
    wrongRef.current = 0;
    setGameActive(true);
    setGameEnded(false);
    setScore(0);
    setRound(0);
    setCorrectSelections(0);
    setWrongSelections(0);
    setWaitingForSelection(false);
    gameStartTimeRef.current = Date.now();
    // setupRound will be called after state settles via the effect below
  }, []);

  // Kick off the first round once the game becomes active
  useEffect(() => {
    if (gameActive && round === 0 && !gameEnded) {
      setupRound();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameActive]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <FontAwesome name="arrow-left" size={24} color="#0EA5E9" />
        </TouchableOpacity>
        <Text style={styles.gameTitle}>Direction of Target</Text>
      </View>

      {!gameActive ? (
        <View style={styles.startContainer}>
          <Text style={styles.instructionText}>
            Watch the moving target and identify which direction it&apos;s
            moving. Select the correct direction after the target disappears.
          </Text>
          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.startButtonText}>Start Game</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.gameContainer}>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>Score: {score}</Text>
            <Text style={styles.roundText}>Round: {round}/{TOTAL_ROUNDS}</Text>
          </View>

          <View style={styles.eyeTrackingRow}>
            <EyeTrackingOverlay
              frameProcessor={frameProcessor}
              result={eyeResult}
              active={gameActive}
            />
          </View>

          <View style={styles.gameArea}>
            <Animated.View
              style={[
                styles.target,
                {
                  opacity: targetOpacity,
                  transform: [
                    { translateX: targetPosition.x },
                    { translateY: targetPosition.y },
                  ],
                },
              ]}
            >
              <FontAwesome name="bullseye" size={TARGET_SIZE - 10} color="#0EA5E9" />
            </Animated.View>
          </View>

          <View style={styles.directionButtons}>
            <TouchableOpacity
              style={[styles.directionButton, gameEnded && styles.disabledButton]}
              onPress={() => handleDirectionSelect("up")}
              disabled={gameEnded}
            >
              <FontAwesome name="arrow-up" size={30} color="#0EA5E9" />
            </TouchableOpacity>

            <View style={styles.horizontalButtons}>
              <TouchableOpacity
                style={[styles.directionButton, gameEnded && styles.disabledButton]}
                onPress={() => handleDirectionSelect("left")}
                disabled={gameEnded}
              >
                <FontAwesome name="arrow-left" size={30} color="#0EA5E9" />
              </TouchableOpacity>

              <View style={styles.directionButtonPlaceholder} />

              <TouchableOpacity
                style={[styles.directionButton, gameEnded && styles.disabledButton]}
                onPress={() => handleDirectionSelect("right")}
                disabled={gameEnded}
              >
                <FontAwesome name="arrow-right" size={30} color="#0EA5E9" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.directionButton, gameEnded && styles.disabledButton]}
              onPress={() => handleDirectionSelect("down")}
              disabled={gameEnded}
            >
              <FontAwesome name="arrow-down" size={30} color="#0EA5E9" />
            </TouchableOpacity>
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
  },
  scoreContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
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
  gameArea: {
    width: "100%",
    height: height * 0.35,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 20,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#ddd",
  },
  target: {
    width: TARGET_SIZE,
    height: TARGET_SIZE,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
  },
  directionButtons: {
    alignItems: "center",
  },
  horizontalButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: 220,
    marginVertical: 10,
  },
  directionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  disabledButton: {
    opacity: 0.5,
  },
  directionButtonPlaceholder: {
    width: 60,
    height: 60,
  },
});
