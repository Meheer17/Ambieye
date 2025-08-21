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

const { width, height } = Dimensions.get("window");
const BALL_SIZE = 30;
const EXERCISE_DURATION = 120; // 1 minute in seconds

export default function EyeballMovementGame() {
  const router = useRouter();
  const [gameActive, setGameActive] = useState(false);
  const [score, setScore] = useState(100);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(EXERCISE_DURATION);
  const [currentPatternIndex, setCurrentPatternIndex] = useState(0);
  const [currentPatternName, setCurrentPatternName] = useState("");
  const ballPosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const animationRef = useRef<any>(null);
  const patternsRef = useRef<any[]>([]);
  const timerRef = useRef<NodeJS.Timeout | number | null>(null);
  const isAnimatingRef = useRef(false);

  // Define the different movement patterns
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
          { x: -width * 0.4, y: -height * 0.25 }, // top-left corner
          { x: width * 0.4, y: -height * 0.25 },  // top-right
          { x: width * 0.4, y: height * 0.25 },   // bottom-right
          { x: -width * 0.4, y: height * 0.25 },  // bottom-left
          { x: 0, y: 0 },                         // center
          { x: -width * 0.4, y: -height * 0.25 }, // back to start
        ],
      },
      {
        name: "Spiral Square",
        positions: [
          // Outer layer (1)
          { x: -width * 0.4, y: -height * 0.25 },  // top-left
          { x: width * 0.4, y: -height * 0.25 },   // top-right
          { x: width * 0.4, y: height * 0.25 },    // bottom-right
          { x: -width * 0.4, y: height * 0.25 },   // bottom-left

          // Second layer (2)
          { x: -width * 0.3, y: -height * 0.18 },  // top-left
          { x: width * 0.3, y: -height * 0.18 },   // top-right
          { x: width * 0.3, y: height * 0.18 },    // bottom-right
          { x: -width * 0.3, y: height * 0.18 },   // bottom-left

          // Third layer (3)
          { x: -width * 0.2, y: -height * 0.12 },  // top-left
          { x: width * 0.2, y: -height * 0.12 },   // top-right
          { x: width * 0.2, y: height * 0.12 },    // bottom-right
          { x: -width * 0.2, y: height * 0.12 },   // bottom-left

          // Inner layer (4)
          { x: -width * 0.1, y: -height * 0.06 },  // top-left
          { x: width * 0.1, y: -height * 0.06 },   // top-right
          { x: width * 0.1, y: height * 0.06 },    // bottom-right
          { x: -width * 0.1, y: height * 0.06 },   // bottom-left

          // Center
          { x: 0, y: 0 },

          // Return to start (optional)
          { x: -width * 0.4, y: -height * 0.25 },
        ],
      },
      {
        name: "Hourglass",
        positions: [
          { x: -width * 0.3, y: -height * 0.2 }, // Position 1: top-left
          { x: 0, y: -height * 0.2 },            // Position 2: top-center
          { x: width * 0.3, y: -height * 0.2 },  // Position 3: top-right
          { x: 0, y: 0 },                        // Position 5: center
          { x: -width * 0.3, y: height * 0.2 },  // Position 7: bottom-left
          { x: 0, y: height * 0.2 },             // Position 8: bottom-center
          { x: width * 0.3, y: height * 0.2 },   // Position 9: bottom-right
          { x: 0, y: 0 },                        // Position 5: center again
          { x: -width * 0.3, y: -height * 0.2 }, // Position 1: back to top-left
          // Reverse pattern
          { x: 0, y: 0 },                        // Position 5: center
          { x: width * 0.3, y: height * 0.2 },   // Position 9: bottom-right
          { x: 0, y: height * 0.2 },             // Position 8: bottom-center
          { x: -width * 0.3, y: height * 0.2 },  // Position 7: bottom-left
          { x: 0, y: 0 },                        // Position 5: center
          { x: width * 0.3, y: -height * 0.2 },  // Position 3: top-right
          { x: 0, y: -height * 0.2 },            // Position 2: top-center
          { x: -width * 0.3, y: -height * 0.2 }, // Position 1: top-left
        ],
      },
      {
        name: "Zigzag",
        positions: [
          // Start at top left
          { x: -width * 0.4, y: -height * 0.25 },
          // Move right
          { x: width * 0.4, y: -height * 0.25 },
          // Diagonal down to left
          { x: -width * 0.4, y: -height * 0.17 },
          // Move right
          { x: width * 0.4, y: -height * 0.17 },
          // Diagonal down to left
          { x: -width * 0.4, y: -height * 0.08 },
          // Move right
          { x: width * 0.4, y: -height * 0.08 },
          // Diagonal down to left
          { x: -width * 0.4, y: 0 },
          // Move right
          { x: width * 0.4, y: 0 },
          // Diagonal down to left
          { x: -width * 0.4, y: height * 0.08 },
          // Move right
          { x: width * 0.4, y: height * 0.08 },
          // Diagonal down to left
          { x: -width * 0.4, y: height * 0.17 },
          // Move right
          { x: width * 0.4, y: height * 0.17 },
          // Diagonal down to left
          { x: -width * 0.4, y: height * 0.25 },
          // Move right (final horizontal line)
          { x: width * 0.4, y: height * 0.25 },
          // Return to start
          { x: -width * 0.4, y: -height * 0.25 },
        ],
      },
    ];
  }, []);

  const endGame = useCallback(async () => {
    setGameActive(false);

    // Stop any ongoing animations
    if (animationRef.current) {
      animationRef.current.stop();
    }

    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const gameDuration = (Date.now() - gameStartTime) / 1000; // in seconds

    try {
      // Save game result to API
      await saveGameResult({
        gameId: 8, // ID for "Eyeball movement" game
        score: score,
        duration: gameDuration,
        date: new Date().toISOString(),
        details: {
          completedExerciseTime: EXERCISE_DURATION - timeRemaining,
        },
      });

      Alert.alert(
        "Exercise Complete!",
        `Score: ${score}%\nTime: ${Math.round(gameDuration)}s`,
        [{ text: "OK", onPress: () => router.push("/games") }],
      );
    } catch (error) {
      console.error("Failed to save game result:", error);
      Alert.alert(
        "Exercise Complete!",
        `Score: ${score}%\nTime: ${Math.round(gameDuration)}s\n(Failed to save results)`,
        [{ text: "OK", onPress: () => router.push("/games") }],
      );
    }
  }, [gameStartTime, router, score, timeRemaining]);

  const animateBall = useCallback(
    (pattern: any, patternIndex: number) => {
      if (!gameActive) return;

      isAnimatingRef.current = true;
      setCurrentPatternName(pattern.name);
      setCurrentPatternIndex(patternIndex);

      // Create an animation sequence
      const sequence = pattern.positions.map((position: any) => {
        return Animated.timing(ballPosition, {
          toValue: { x: position.x, y: position.y },
          duration: 1200, // Slightly faster to ensure more pattern changes
          useNativeDriver: true,
        });
      });

      // Reset any ongoing animation
      if (animationRef.current) {
        animationRef.current.stop();
      }

      // Start the new animation sequence
      animationRef.current = Animated.sequence(sequence);
      animationRef.current.start(({ finished }: {finished: any}) => {
        isAnimatingRef.current = false;

        // Only proceed if game is still active
        if (gameActive) {
          // Move to the next pattern regardless of whether animation finished
          const nextPatternIndex =
            (patternIndex + 1) % patternsRef.current.length;

          // Start next pattern animation immediately
          setTimeout(() => {
            if (gameActive) {
              animateBall(
                patternsRef.current[nextPatternIndex],
                nextPatternIndex,
              );
            }
          }, 100);
        }
      });
    },
    [gameActive, ballPosition],
  );

  // Timer effect
  useEffect(() => {
    if (gameActive && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // When time is up
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            // Set score to 100% and end game
            setScore(100);
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameActive, endGame, timeRemaining]);

  // Ensure animations continue through the full minute
  useEffect(() => {
    if (gameActive && !isAnimatingRef.current) {
      animateBall(
        patternsRef.current[currentPatternIndex],
        currentPatternIndex,
      );
    }
  }, [gameActive, currentPatternIndex, animateBall]);

  const startGame = () => {
    setGameActive(true);
    setScore(0);
    setTimeRemaining(EXERCISE_DURATION);
    setCurrentPatternIndex(0);
    setGameStartTime(Date.now());
    isAnimatingRef.current = false;

    // Start with the first pattern
    ballPosition.setValue({ x: 0, y: 0 });
    // Animation will be triggered by useEffect
  };

  return (
    <View style={styles.container}>
      <View
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity onPress={() => router.push("/games")}>
          <FontAwesome name="arrow-left" size={24} color="#5f2446" />
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

          <Text style={styles.instructions}>
            Follow the ball with your eyes for 1 minute
          </Text>

          <View style={styles.gameArea}>
            {/* Animated Ball */}
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

          <View style={styles.patternGuide}>
            <Text style={styles.patternText}>
              Keep your head still and follow only with your eyes
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  backButton: {
    marginTop: 20,
    marginBottom: 10,
  },
  gameTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#5f2446",
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
    backgroundColor: "#5f2446",
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
    marginBottom: 20,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#5f2446",
  },
  roundText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  instructions: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
    color: "#333",
  },
  gameArea: {
    width: width * 0.9,
    height: height * 0.5,
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
    backgroundColor: "#5f2446",
    position: "absolute",
  },
  patternGuide: {
    marginTop: 30,
    padding: 15,
    backgroundColor: "#f0e6eb",
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#5f2446",
  },
  patternText: {
    color: "#333",
    fontSize: 14,
  },
});
