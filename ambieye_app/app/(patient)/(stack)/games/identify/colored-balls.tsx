import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { saveGameResult } from "@/utils/gameUtils";

const { width, height } = Dimensions.get("window");
const BALL_SIZE = width * 0.15;
const COLORS = ["red", "blue", "green", "yellow", "purple", "orange"];

export default function ColoredBallsGame() {
  const router = useRouter();
  const [gameActive, setGameActive] = useState(false);
  const [targetColor, setTargetColor] = useState("");
  const [balls, setBalls] = useState<
    {
      id: number;
      color: string;
      position: { x: number; y: number };
      selected?: boolean;
    }[]
  >([]);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [totalRounds] = useState(10);
  const [correctSelections, setCorrectSelections] = useState(0);
  const [wrongSelections, setWrongSelections] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [targetBallsRemaining, setTargetBallsRemaining] = useState(0);
  const timeElapsed = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Creates a grid-based position to avoid overlaps
  const generateNonOverlappingPositions = (count: number) => {
    const positions = [];
    const gameAreaWidth = width - 40; // Removed BALL_SIZE subtraction to use more width
    const gameAreaHeight = height * 0.6; // Reduced height as requested

    // Create a grid with exactly 5 columns
    const cols = 5; // Fixed to 5 columns as requested
    const cellSize = gameAreaWidth / cols;
    const rows = Math.floor(gameAreaHeight / cellSize);

    // Calculate offset to center the grid
    const horizontalOffset = (width - (cellSize * cols)) / 2 - 20;

    // Create a grid of possible positions
    const grid = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        grid.push({
          x: horizontalOffset + col * cellSize + (cellSize - BALL_SIZE) / 2 + (Math.random() * BALL_SIZE * 0.1),
          y: row * cellSize + (cellSize - BALL_SIZE) / 2 + (Math.random() * BALL_SIZE * 0.1),
        });
      }
    }

    // Shuffle the grid positions
    for (let i = grid.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [grid[i], grid[j]] = [grid[j], grid[i]];
    }

    // Take positions from the shuffled grid
    for (let i = 0; i < Math.min(count, grid.length); i++) {
      positions.push(grid[i]);
    }

    return positions;
  };

  const setupRound = () => {
    // Stop previous animation if exists
    if (animationRef.current) {
      animationRef.current.stop();
    }

    const nextRound = round + 1;
    // Check if we've reached the maximum rounds
    if (nextRound > totalRounds) {
      endGame();
      return;
    }

    setRound(nextRound);

    // Select random target color
    const newTargetColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    setTargetColor(newTargetColor);

    // Create at least 30 balls
    const totalBalls = 30;

    // Generate positions for all balls without overlap
    const positions = generateNonOverlappingPositions(totalBalls);

    // Ensure at least 6 balls have the target color
    const minimumTargetBalls = 6;
    const newBalls = [];

    // Add target color balls first (at least 6)
    for (let i = 0; i < minimumTargetBalls; i++) {
      newBalls.push({
        id: i,
        color: newTargetColor,
        position: positions[i],
        selected: false,
      });
    }

    // Add remaining balls with random colors
    for (let i = minimumTargetBalls; i < totalBalls; i++) {
      // Get random color, but avoid having too many target color balls
      let color;
      if (Math.random() < 0.85) { // 85% chance to get a non-target color
        do {
          color = COLORS[Math.floor(Math.random() * COLORS.length)];
        } while (color === newTargetColor);
      } else {
        color = newTargetColor;
      }

      newBalls.push({
        id: i,
        color,
        position: positions[i],
        selected: false,
      });
    }

    // Count how many target color balls we have
    const targetBalls = newBalls.filter(
      (ball) => ball.color === newTargetColor,
    ).length;
    setTargetBallsRemaining(targetBalls);

    setBalls(newBalls);

    // Reset and start the timer animation - with longer duration for children with lazy eye
    timeElapsed.setValue(0);
    animationRef.current = Animated.timing(timeElapsed, {
      toValue: 100,
      duration: 60000, // 60 seconds per round to give ample time
      useNativeDriver: false,
    });

    animationRef.current.start();
  };

  const startGame = () => {
    setGameActive(true);
    setScore(0);
    setRound(0);
    setCorrectSelections(0);
    setWrongSelections(0);
    setGameStartTime(Date.now());
    setupRound();
  };

  const endGame = async () => {
    // Stop animation if exists
    if (animationRef.current) {
      animationRef.current.stop();
    }

    setGameActive(false);
    const gameDuration = (Date.now() - gameStartTime) / 1000; // in seconds

    // Calculate score (percentage based on correct selections)
    const finalScore =
      Math.round(
        (correctSelections / (correctSelections + wrongSelections)) * 100,
      ) || 0;

    try {
      // Save game result to API
      await saveGameResult({
        gameId: 1, // ID for "Select the colored balls" game
        score: finalScore,
        duration: gameDuration,
        date: new Date().toISOString(),
        details: {
          rounds: round,
          correctSelections,
          wrongSelections,
        },
      });

      Alert.alert(
        "Game Complete!",
        `Score: ${finalScore}%\nTime: ${Math.round(gameDuration)}s`,
        [{ text: "OK", onPress: () => router.push("/games") }],
      );
    } catch (error) {
      console.error("Failed to save game result:", error);
      Alert.alert(
        "Game Complete!",
        `Score: ${finalScore}%\nTime: ${Math.round(gameDuration)}s\n(Failed to save results)`,
        [{ text: "OK", onPress: () => router.push("/games") }],
      );
    }
  };

  const handleBallPress = (ballId: number, ballColor: string) => {
    // Check if ball is already selected
    const selectedBall = balls.find((ball) => ball.id === ballId);
    if (selectedBall?.selected) return;

    // Mark this ball as selected
    const updatedBalls = balls.map((ball) =>
      ball.id === ballId ? { ...ball, selected: true } : ball,
    );
    setBalls(updatedBalls);

    if (ballColor === targetColor) {
      setCorrectSelections((prev) => prev + 1);
      setScore((prevScore) => prevScore + 10);
      setTargetBallsRemaining((prev) => prev - 1);

      // If we've found all target color balls, move to next round
      if (targetBallsRemaining <= 1) {
        // Using 1 because state hasn't updated yet
        // Only move to next round if we found all target balls
        setupRound();
      }
    } else {
      setWrongSelections((prev) => prev + 1);
      setScore((prevScore) => Math.max(0, prevScore - 5));
    }
  };

  return (
    <ScrollView contentContainerStyle={{flexGrow: 1}}>
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
          <Text style={styles.gameTitle}>Select the Colored Balls</Text>
        </View>

        {!gameActive ? (
          <View style={styles.startContainer}>
            <Text style={styles.instructionText}>
              Find and tap all balls that match the specified color.
            </Text>
            <TouchableOpacity style={styles.startButton} onPress={startGame}>
              <Text style={styles.startButtonText}>Start Game</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.gameContainer}>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreText}>Score: {score}</Text>
              <Text style={styles.roundText}>
                Round: {round}/{totalRounds}
              </Text>
            </View>

            <Text style={styles.targetText}>
              Find all{" "}
              <Text style={{ ...styles.targetColor, color: targetColor }}>
                {targetColor}
              </Text>{" "}
              balls
              <Text style={styles.remainingText}>
                {" "}
                ({targetBallsRemaining} remaining)
              </Text>
            </Text>

            <Animated.View
              style={{
                height: 6,
                width: timeElapsed.interpolate({
                  inputRange: [0, 100],
                  outputRange: ["0%", "100%"],
                }),
                backgroundColor: "#5f2446",
                borderRadius: 3,
                marginBottom: 20,
              }}
            />

            <View style={styles.gameArea}>
              {balls.map((ball) => (
                <TouchableOpacity
                  key={ball.id}
                  style={[
                    styles.ball,
                    {
                      backgroundColor: ball.color,
                      left: ball.position.x,
                      top: ball.position.y,
                      opacity: ball.selected ? 0.4 : 1,
                      borderWidth: ball.selected ? 2 : 0,
                      borderColor: "#000",
                    },
                  ]}
                  onPress={() => handleBallPress(ball.id, ball.color)}
                />
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  remainingText: {
    fontSize: 16,
    fontWeight: "normal",
    color: "#666",
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 20,
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
  },
  scoreContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
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
  targetText: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  targetColor: {
    fontWeight: "900",
  },
  gameArea: {
    flex: 1,
    position: "relative",
    height: height * 0.6, // Reduced height to match generateNonOverlappingPositions
    paddingBottom: 20,
    alignItems: "center", // Center content horizontally
  },
  ball: {
    position: "absolute",
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_SIZE / 2,
  },
});
