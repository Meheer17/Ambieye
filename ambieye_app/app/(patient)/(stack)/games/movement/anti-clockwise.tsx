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

const { width } = Dimensions.get("window");
const BALL_SIZE = 30;
const TRACK_RADIUS = width * 0.35;
const INITIAL_DURATION = 10000; // 10 seconds for the first round

export default function AntiClockwiseGame() {
  const router = useRouter();
  const [gameActive, setGameActive] = useState(false);
  const [score, setScore] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [completedRounds, setCompletedRounds] = useState(0);
  const [totalRounds] = useState(3); // 3 full circles
  const ballPosition = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<any>(null);
  const roundCounterRef = useRef(0);

  // Define the interpolated position values for counter-clockwise motion
  const translateX = ballPosition.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -TRACK_RADIUS, 0, TRACK_RADIUS, 0],
  });

  const translateY = ballPosition.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [-TRACK_RADIUS, 0, TRACK_RADIUS, 0, -TRACK_RADIUS],
  });

  // Create the circular path animation with adjustable speed (counter-clockwise)
  const createAnimation = (roundNumber: number) => {
    // Reset position
    ballPosition.setValue(0);

    // Calculate duration - decrease by 20% each round (faster speed)
    const speedFactor = Math.max(0.5, 1 - (roundNumber * 0.2)); // Get faster by 20% each round, minimum 50% speed
    const duration = INITIAL_DURATION * speedFactor;

    // Create the animation for a full circle
    animationRef.current = Animated.timing(ballPosition, {
      toValue: 1,
      duration: duration,
      useNativeDriver: true,
    });
  };

  const startGame = () => {
    setGameActive(true);
    setScore(0);
    setCompletedRounds(0);
    roundCounterRef.current = 0;
    setGameStartTime(Date.now());

    createAnimation(0);
    runAnimation();
  };

  const runAnimation = () => {
    animationRef.current?.reset();

    // Start the animation
    animationRef.current?.start(() => {
      // Increment the round counter
      roundCounterRef.current += 1;

      // Update UI state
      setCompletedRounds(roundCounterRef.current);
      setScore(roundCounterRef.current * 30); // 30 points per completed round

      if (roundCounterRef.current < totalRounds) {
        // Continue with the next round with increased speed
        createAnimation(roundCounterRef.current);
        runAnimation();
      } else {
        // End the game
        endGame();
      }
    });
  };

  const endGame = async () => {
    setGameActive(false);
    const gameDuration = (Date.now() - gameStartTime) / 1000; // in seconds

    // Calculate final score based on completed rounds (max 100)
    const finalScore = Math.min(100, roundCounterRef.current * 30);

    try {
      // Save game result to API
      await saveGameResult({
        gameId: 7, // ID for "Follow the ball in anti-clockwise direction" game
        score: finalScore,
        duration: gameDuration,
        date: new Date().toISOString(),
        details: {
          completedRounds: roundCounterRef.current,
        }
      });

      Alert.alert(
        "Game Complete!",
        `Score: ${finalScore}%\nTime: ${Math.round(gameDuration)}s`,
        [{ text: "OK", onPress: () => router.push("/games") }]
      );
    } catch (error) {
      console.error("Failed to save game result:", error);
      Alert.alert(
        "Game Complete!",
        `Score: ${finalScore}%\nTime: ${Math.round(gameDuration)}s\n(Failed to save results)`,
        [{ text: "OK", onPress: () => router.push("/games") }]
      );
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
        <Text style={styles.gameTitle}>Follow the Ball (Counter-Clockwise)</Text>
      </View>

      {!gameActive ? (
        <View style={styles.startContainer}>
          <Text style={styles.instructionText}>
            Follow the ball with your eyes as it moves in a counter-clockwise direction. 
            This exercise helps strengthen your eye muscles and improve tracking ability.
          </Text>
          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.startButtonText}>Start Game</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.gameContainer}>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>Score: {score}</Text>
            <Text style={styles.roundText}>Round: {completedRounds}/{totalRounds}</Text>
          </View>

          <Text style={styles.instructions}>
            Follow the red ball with your eyes as it moves
          </Text>

          <View style={styles.trackContainer}>
            {/* Draw the circular track */}
            <View style={styles.track} />

            {/* Animated Ball */}
            <Animated.View
              style={[
                styles.ball,
                {
                  transform: [
                    { translateX },
                    { translateY }
                  ]
                }
              ]}
            />
          </View>

          <View style={styles.directionIndicator}>
            <FontAwesome name="rotate-left" size={24} color="#5f2446" />
            <Text style={styles.directionText}>Counter-Clockwise</Text>
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
  directionIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
  },
  directionText: {
    fontSize: 16,
    color: "#5f2446",
    marginLeft: 10,
    fontWeight: "bold",
  },
});