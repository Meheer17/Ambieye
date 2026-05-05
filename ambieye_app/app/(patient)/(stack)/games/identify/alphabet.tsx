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
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { saveGameResult } from "@/utils/gameUtils";

const { width, height } = Dimensions.get("window");
const LETTER_SIZE = width * 0.15; // Match similar size to BALL_SIZE in the reference
// const GRID_PADDING = 10; // Padding between letters

export default function AlphabetGame() {
  const router = useRouter();
  const [gameActive, setGameActive] = useState(false);
  const [targetLetter, setTargetLetter] = useState("");
  const [letters, setLetters] = useState<
    {
      id: number;
      letter: string;
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
  const [targetLettersRemaining, setTargetLettersRemaining] = useState(0);
  const timeElapsed = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  // Creates a grid-based position to avoid overlaps
  const generateNonOverlappingPositions = (count: number) => {
    const positions: { x: number; y: number }[] = [];
    const gameAreaWidth = width - 40; // Use more width
    const gameAreaHeight = height * 0.6; // Reduced height to match reference

    // Create a grid with exactly 5 columns
    const cols = 5; // Fixed to 5 columns as in reference
    const cellSize = gameAreaWidth / cols;
    const rows = Math.floor(gameAreaHeight / cellSize);

    // Calculate offset to center the grid
    const horizontalOffset = (width - (cellSize * cols)) / 2 - 20;

    // Create a grid of possible positions
    const grid: { x: number; y: number }[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        grid.push({
          x: horizontalOffset + col * cellSize + (cellSize - LETTER_SIZE) / 2 + (Math.random() * LETTER_SIZE * 0.1),
          y: row * cellSize + (cellSize - LETTER_SIZE) / 2 + (Math.random() * LETTER_SIZE * 0.1),
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

    // Select random target letter
    const newTargetLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
    setTargetLetter(newTargetLetter);

    // Create at least 30 letters
    const totalLetters = 30;

    // Generate positions for all letters without overlap
    const positions = generateNonOverlappingPositions(totalLetters);

    // Ensure at least 6 letters have the target letter
    const minimumTargetLetters = 6;
    const newLetters = [];

    // Add target letters first (at least 6)
    for (let i = 0; i < minimumTargetLetters; i++) {
      newLetters.push({
        id: i,
        letter: newTargetLetter,
        position: positions[i],
        selected: false,
      });
    }

    // Add remaining letters with random letters
    for (let i = minimumTargetLetters; i < totalLetters; i++) {
      // Get random letter, but avoid having too many target letters
      let letter;
      if (Math.random() < 0.85) { // 85% chance to get a non-target letter
        do {
          letter = alphabet[Math.floor(Math.random() * alphabet.length)];
        } while (letter === newTargetLetter);
      } else {
        letter = newTargetLetter;
      }

      newLetters.push({
        id: i,
        letter,
        position: positions[i],
        selected: false,
      });
    }

    // Count how many target letters we have
    const targetLetters = newLetters.filter(
      (item) => item.letter === newTargetLetter
    ).length;
    setTargetLettersRemaining(targetLetters);

    setLetters(newLetters);

    // Reset and start the timer animation - with longer duration for children with lazy eye
    timeElapsed.setValue(0);
    animationRef.current = Animated.timing(timeElapsed, {
      toValue: 100,
      duration: 60000, // 60 seconds per round to match reference
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
        (correctSelections / (correctSelections + wrongSelections)) * 100
      ) || 0;

    try {
      // Save game result to API
      await saveGameResult({
        gameId: 2, // ID for "Select the alphabet" game
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
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (error) {
      console.error("Failed to save game result:", error);
      Alert.alert(
        "Game Complete!",
        `Score: ${finalScore}%\nTime: ${Math.round(gameDuration)}s\n(Failed to save results)`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    }
  };

  const handleLetterPress = (letterId: number, letterValue: string) => {
    // Check if letter is already selected
    const selectedLetter = letters.find((letter) => letter.id === letterId);
    if (selectedLetter?.selected) return;

    // Mark this letter as selected
    const updatedLetters = letters.map((letter) =>
      letter.id === letterId ? { ...letter, selected: true } : letter
    );
    setLetters(updatedLetters);

    if (letterValue === targetLetter) {
      setCorrectSelections((prev) => prev + 1);
      setScore((prevScore) => prevScore + 10);
      setTargetLettersRemaining((prev) => prev - 1);

      // If we've found all target letters, move to next round
      if (targetLettersRemaining <= 1) {
        // Using 1 because state hasn't updated yet
        // Only move to next round if we found all target letters
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
          <TouchableOpacity onPress={() => router.back()}>
            <FontAwesome name="arrow-left" size={24} color="#0EA5E9" />
          </TouchableOpacity>
          <Text style={styles.gameTitle}>Select the Alphabet</Text>
        </View>

        {!gameActive ? (
          <View style={styles.startContainer}>
            <Text style={styles.instructionText}>
              Find and tap all letters that match the specified letter.
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
              <Text style={styles.targetLetter}>{targetLetter}</Text>{" "}
              letters
              <Text style={styles.remainingText}>
                {" "}
                ({targetLettersRemaining} remaining)
              </Text>
            </Text>

            <Animated.View
              style={{
                height: 6,
                width: timeElapsed.interpolate({
                  inputRange: [0, 100],
                  outputRange: ["0%", "100%"],
                }),
                backgroundColor: "#0EA5E9",
                borderRadius: 3,
                marginBottom: 20,
              }}
            />

            <View style={styles.gameArea}>
              {letters.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.letterBox,
                    {
                      left: item.position.x,
                      top: item.position.y,
                      opacity: item.selected ? 0.4 : 1,
                      borderWidth: item.selected ? 2 : 0,
                      borderColor: "#000",
                    },
                  ]}
                  onPress={() => handleLetterPress(item.id, item.letter)}
                >
                  <Text style={styles.letter}>{item.letter}</Text>
                </TouchableOpacity>
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
    backgroundColor: "#F8FAFC",
    padding: 20,
    paddingTop: 56,
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
    marginBottom: 20,
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
  targetText: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  targetLetter: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0EA5E9",
  },
  gameArea: {
    flex: 1,
    position: "relative",
    height: height * 0.6, // Reduced height to match reference
    paddingBottom: 20,
    alignItems: "center", // Center content horizontally
  },
  letterBox: {
    position: "absolute",
    width: LETTER_SIZE,
    height: LETTER_SIZE,
    borderRadius: 10,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  letter: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0EA5E9",
  },
});