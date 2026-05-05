import React, { useState, useRef, useEffect } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { saveGameResult } from "@/utils/gameUtils";

const { width } = Dimensions.get("window");
const BALL_SIZE = 30;
const TRACK_RADIUS = width * 0.35;
const CIRCLE_DURATION = 5000; // 3 seconds per circle - faster for better visual feedback

export default function AntiClockwiseGame() {
  const router = useRouter();
  const [gameActive, setGameActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameStartTime, setGameStartTime] = useState(0);
  const ballPosition = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Create the circular path animation for anti-clockwise motion
  const createAnimation = () => {
    // Create the animation for continuous anti-clockwise circles
    animationRef.current = Animated.loop(
      Animated.timing(ballPosition, {
        toValue: 1,
        duration: CIRCLE_DURATION,
        easing: Easing.linear, // Linear easing for consistent speed
        useNativeDriver: true,
      })
    );
  };

  const startGame = () => {
    setGameActive(true);
    setTimeLeft(60);
    setGameStartTime(Date.now());

    // Reset the ball position to ensure smooth animation start
    ballPosition.setValue(0);

    // Start the timer
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // End game when timer reaches 0
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000) as unknown as NodeJS.Timeout;

    // Start the animation that will loop until the game ends
    createAnimation();
    animationRef.current?.start();
  };

  const endGame = async () => {
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop animation
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }

    setGameActive(false);
    const gameDuration = (Date.now() - gameStartTime) / 1000; // in seconds

    try {
      // Save game result to API
      await saveGameResult({
        gameId: 7, // ID for "Follow the ball in anti-clockwise direction" game
        score: 100, // Perfect score since they completed the full minute
        duration: gameDuration,
        date: new Date().toISOString(),
        details: {
          completedTime: gameDuration,
        }
      });

      Alert.alert(
        "Exercise Complete!",
        `You successfully followed the ball for 1 minute!`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      console.error("Failed to save game result:", error);
      Alert.alert(
        "Exercise Complete!",
        `You successfully followed the ball for 1 minute!\n(Failed to save results)`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, []);

  // Calculate the position for anti-clockwise movement using sine and cosine for a perfect circle
  const translateX = ballPosition.interpolate({
    inputRange: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1],
    outputRange: [
      -TRACK_RADIUS,                                  // 0°
      -TRACK_RADIUS * Math.cos(Math.PI * 0.05 * 2),   // 36°
      -TRACK_RADIUS * Math.cos(Math.PI * 0.1 * 2),    // 72°
      -TRACK_RADIUS * Math.cos(Math.PI * 0.15 * 2),   // 108°
      -TRACK_RADIUS * Math.cos(Math.PI * 0.2 * 2),    // 144°
      -TRACK_RADIUS * Math.cos(Math.PI * 0.25 * 2),   // 180°
      -TRACK_RADIUS * Math.cos(Math.PI * 0.3 * 2),    // 216°
      -TRACK_RADIUS * Math.cos(Math.PI * 0.35 * 2),   // 252°
      -TRACK_RADIUS * Math.cos(Math.PI * 0.4 * 2),    // 288°
      -TRACK_RADIUS * Math.cos(Math.PI * 0.45 * 2),   // 324°
      -TRACK_RADIUS * Math.cos(Math.PI * 0.5 * 2),    // 360°
      -TRACK_RADIUS * Math.cos(Math.PI * 0.55 * 2),   // 396°
      -TRACK_RADIUS * Math.cos(Math.PI * 0.6 * 2),    // 432°
      -TRACK_RADIUS * Math.cos(Math.PI * 0.65 * 2),   // 468°
      -TRACK_RADIUS * Math.cos(Math.PI * 0.7 * 2),    // 504°
      -TRACK_RADIUS * Math.cos(Math.PI * 0.75 * 2),   // 540°
      -TRACK_RADIUS * Math.cos(Math.PI * 0.8 * 2),    // 576°
      -TRACK_RADIUS * Math.cos(Math.PI * 0.85 * 2),   // 612°
      -TRACK_RADIUS * Math.cos(Math.PI * 0.9 * 2),    // 648°
      -TRACK_RADIUS * Math.cos(Math.PI * 0.95 * 2),   // 684°
      -TRACK_RADIUS,                                  // 720°
    ],
  });

  const translateY = ballPosition.interpolate({
    inputRange: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1],
    outputRange: [
      0,                                              // 0°
      TRACK_RADIUS * Math.sin(Math.PI * 0.05 * 2),    // 36°
      TRACK_RADIUS * Math.sin(Math.PI * 0.1 * 2),     // 72°
      TRACK_RADIUS * Math.sin(Math.PI * 0.15 * 2),    // 108°
      TRACK_RADIUS * Math.sin(Math.PI * 0.2 * 2),     // 144°
      TRACK_RADIUS * Math.sin(Math.PI * 0.25 * 2),    // 180°
      TRACK_RADIUS * Math.sin(Math.PI * 0.3 * 2),     // 216°
      TRACK_RADIUS * Math.sin(Math.PI * 0.35 * 2),    // 252°
      TRACK_RADIUS * Math.sin(Math.PI * 0.4 * 2),     // 288°
      TRACK_RADIUS * Math.sin(Math.PI * 0.45 * 2),    // 324°
      TRACK_RADIUS * Math.sin(Math.PI * 0.5 * 2),     // 360°
      TRACK_RADIUS * Math.sin(Math.PI * 0.55 * 2),    // 396°
      TRACK_RADIUS * Math.sin(Math.PI * 0.6 * 2),     // 432°
      TRACK_RADIUS * Math.sin(Math.PI * 0.65 * 2),    // 468°
      TRACK_RADIUS * Math.sin(Math.PI * 0.7 * 2),     // 504°
      TRACK_RADIUS * Math.sin(Math.PI * 0.75 * 2),    // 540°
      TRACK_RADIUS * Math.sin(Math.PI * 0.8 * 2),     // 576°
      TRACK_RADIUS * Math.sin(Math.PI * 0.85 * 2),    // 612°
      TRACK_RADIUS * Math.sin(Math.PI * 0.9 * 2),     // 648°
      TRACK_RADIUS * Math.sin(Math.PI * 0.95 * 2),    // 684°
      0,                                              // 720°
    ],
  });

  return (
    <View style={styles.container}>
      <View
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={24} color="#0EA5E9" />
        </TouchableOpacity>
        <Text style={styles.gameTitle}>Follow the Ball (Anti-clockwise)</Text>
      </View>

      {!gameActive ? (
        <View style={styles.startContainer}>
          <Text style={styles.instructionText}>
            Follow the ball with your eyes as it moves in an anti-clockwise direction for 1 minute. 
            This exercise helps strengthen your eye muscles and improve tracking ability.
          </Text>
          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.startButtonText}>Start Exercise</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.gameContainer}>
          <View style={styles.scoreContainer}>
            <Text style={styles.timerText}>Time Left: {timeLeft}s</Text>
          </View>

          <Text style={styles.instructions}>
            Follow the red ball with your eyes as it moves anti-clockwise
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
  backButton: {
    marginTop: 20,
    marginBottom: 10,
  },
  gameTitle: {
    fontSize: 24,
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
    justifyContent: "center",
    width: "100%",
    marginBottom: 20,
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