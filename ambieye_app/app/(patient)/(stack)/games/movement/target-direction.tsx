import React, { useState, useRef } from "react";
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
const TARGET_SIZE = 40;

export default function TargetDirectionGame() {
  const router = useRouter();
  const [gameActive, setGameActive] = useState(false);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [totalRounds] = useState(10);
  const [direction, setDirection] = useState("");
  const [correctSelections, setCorrectSelections] = useState(0);
  const [wrongSelections, setWrongSelections] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);
  const [waitingForSelection, setWaitingForSelection] = useState(false);
  const targetPosition = useRef(new Animated.ValueXY()).current;
  const targetOpacity = useRef(new Animated.Value(0)).current;

  const directions = ["left", "right", "up", "down"];
  const directionIcons = {
    left: "arrow-left",
    right: "arrow-right",
    up: "arrow-up",
    down: "arrow-down",
  };

  // Animation configurations for different directions
  const directionConfigs = {
    left: { start: { x: width * 0.75, y: height * 0.3 }, end: { x: -TARGET_SIZE, y: height * 0.3 } },
    right: { start: { x: -TARGET_SIZE, y: height * 0.3 }, end: { x: width * 0.75, y: height * 0.3 } },
    up: { start: { x: width * 0.4, y: height * 0.6 }, end: { x: width * 0.4, y: -TARGET_SIZE } },
    down: { start: { x: width * 0.4, y: -TARGET_SIZE }, end: { x: width * 0.4, y: height * 0.6 } },
  };

  const setupRound = () => {
    const nextRound = round + 1;

    // Check if we've reached the total rounds limit
    if (nextRound > totalRounds) {
      endGame();
      return;
    }

    setRound(nextRound);
    setWaitingForSelection(true);

    // Select random direction
    const newDirection = directions[Math.floor(Math.random() * directions.length)];
    setDirection(newDirection);

    const config = directionConfigs[newDirection as keyof typeof directionConfigs];

    // Set initial position
    targetPosition.setValue(config.start);
    targetOpacity.setValue(1);

    // Animate target
    Animated.parallel([
      Animated.timing(targetPosition, {
        toValue: config.end,
        duration: 2000, // 2 seconds for the animation
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(targetOpacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.delay(1800), // Keep fully visible during most of the animation
        Animated.timing(targetOpacity, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        })
      ])
    ]).start();
  };

  const startGame = () => {
    setGameActive(true);
    setGameEnded(false);
    setScore(0);
    setRound(0);
    setCorrectSelections(0);
    setWrongSelections(0);
    setWaitingForSelection(false);
    setGameStartTime(Date.now());
    setupRound();
  };

  const handleDirectionSelect = (selectedDirection: string) => {
    // Prevent user interaction if game has ended, if we've reached max rounds, or if we're not waiting for selection
    if (gameEnded || !waitingForSelection) {
      return;
    }

    setWaitingForSelection(false);

    if (selectedDirection === direction) {
      setCorrectSelections(prev => prev + 1);
      setScore(prevScore => prevScore + 10);
    } else {
      setWrongSelections(prev => prev + 1);
    }

    // Wait a short time before setting up the next round
    setTimeout(() => {
      // Check if this was the last round
      if (round >= totalRounds) {
        endGame();
      } else {
        setupRound();
      }
    }, 1000);
  };

  const endGame = async () => {
    // Ensure we only end the game once
    if (gameEnded) return;

    setGameActive(false);
    setGameEnded(true);

    const gameDuration = (Date.now() - gameStartTime) / 1000; // in seconds

    // Ensure we use the latest state values
    const finalCorrect = correctSelections;
    const finalWrong = wrongSelections;
    const totalSelections = finalCorrect + finalWrong;

    // Calculate score (percentage based on correct selections)
    const finalScore = totalSelections > 0 
      ? Math.round((finalCorrect / totalSelections) * 100) 
      : 0;

    try {
      // Save game result to API
      await saveGameResult({
        gameId: 9, // ID for "Direction of the target" game
        score: finalScore,
        duration: gameDuration,
        date: new Date().toISOString(),
        details: {
          rounds: round,
          correctSelections: finalCorrect,
          wrongSelections: finalWrong
        }
      });

      // Ensure Alert is shown
      setTimeout(() => {
        Alert.alert(
          "Game Complete!",
          `Score: ${finalScore}%\nTime: ${Math.round(gameDuration)}s`,
          [{ text: "OK", onPress: () => router.push("/games") }]
        );
      }, 100);
    } catch (error) {
      console.error("Failed to save game result:", error);
      setTimeout(() => {
        Alert.alert(
          "Game Complete!",
          `Score: ${finalScore}%\nTime: ${Math.round(gameDuration)}s\n(Failed to save results)`,
          [{ text: "OK", onPress: () => router.push("/games") }]
        );
      }, 100);
    }
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
        <Text style={styles.gameTitle}>Direction of Target</Text>
      </View>
      {!gameActive ? (
        <View style={styles.startContainer}>
          <Text style={styles.instructionText}>
            Watch the moving target and identify which direction it's moving.
            Select the correct direction after the target disappears.
          </Text>
          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.startButtonText}>Start Game</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.gameContainer}>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>Score: {score}</Text>
            <Text style={styles.roundText}>Round: {round}/{totalRounds}</Text>
          </View>

          <View style={styles.gameArea}>
            <Animated.View
              style={[
                styles.target,
                {
                  opacity: targetOpacity,
                  transform: [
                    { translateX: targetPosition.x },
                    { translateY: targetPosition.y }
                  ]
                }
              ]}
            >
              <FontAwesome name="bullseye" size={TARGET_SIZE - 10} color="#5f2446" />
            </Animated.View>
          </View>

          <View style={styles.directionButtons}>
            <TouchableOpacity 
              style={[styles.directionButton, gameEnded && styles.disabledButton]}
              onPress={() => handleDirectionSelect("up")}
              disabled={gameEnded}
            >
              <FontAwesome name="arrow-up" size={30} color="#5f2446" />
            </TouchableOpacity>

            <View style={styles.horizontalButtons}>
              <TouchableOpacity 
                style={[styles.directionButton, gameEnded && styles.disabledButton]}
                onPress={() => handleDirectionSelect("left")}
                disabled={gameEnded}
              >
                <FontAwesome name="arrow-left" size={30} color="#5f2446" />
              </TouchableOpacity>

              <View style={styles.directionButtonPlaceholder} />

              <TouchableOpacity 
                style={[styles.directionButton, gameEnded && styles.disabledButton]}
                onPress={() => handleDirectionSelect("right")}
                disabled={gameEnded}
              >
                <FontAwesome name="arrow-right" size={30} color="#5f2446" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.directionButton, gameEnded && styles.disabledButton]}
              onPress={() => handleDirectionSelect("down")}
              disabled={gameEnded}
            >
              <FontAwesome name="arrow-down" size={30} color="#5f2446" />
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
  gameArea: {
    width: "100%",
    height: height * 0.4,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginBottom: 30,
    position: "relative",
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