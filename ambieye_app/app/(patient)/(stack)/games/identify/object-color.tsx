import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { saveGameResult } from "@/utils/gameUtils";

// Define colored objects
const COLORED_OBJECTS = [
  { name: "Apple", color: "red", icon: "apple" },
  { name: "Banana", color: "yellow", icon: "lemon-o" },
  { name: "Orange", color: "orange", icon: "circle" },
  { name: "Grapes", color: "purple", icon: "gratipay" },
  { name: "Leaf", color: "green", icon: "leaf" },
  { name: "Sky", color: "blue", icon: "cloud" },
  { name: "Heart", color: "red", icon: "heart" },
  { name: "Star", color: "gold", icon: "star" },
  { name: "Diamond", color: "blue", icon: "diamond" },
];

// All colors to choose from
const COLORS = ["red", "blue", "green", "yellow", "purple", "orange", "gold"];

export default function ObjectColorGame() {
  const router = useRouter();
  const [gameActive, setGameActive] = useState(false);
  const [currentObject, setCurrentObject] = useState<any>(null);
  const [colorOptions, setColorOptions] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [totalRounds] = useState(10);
  const [correctSelections, setCorrectSelections] = useState(0);
  const [wrongSelections, setWrongSelections] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [roundStartTime, setRoundStartTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const setupRound = () => {
    // Check if we've already completed all rounds
    if (round >= totalRounds) {
      endGame();
      return;
    }

    const nextRound = round + 1;
    setRound(nextRound);
    setRoundStartTime(Date.now());

    // Select random object
    const newObject = COLORED_OBJECTS[Math.floor(Math.random() * COLORED_OBJECTS.length)];
    setCurrentObject(newObject);

    // Create color options (1 correct, 3 incorrect)
    const correctColor = newObject.color;

    // Get other random colors excluding the correct one
    let availableColors = COLORS.filter(color => color !== correctColor);
    let randomColors = [];
    for (let i = 0; i < 3; i++) {
      if (availableColors.length === 0) break;

      const randomIndex = Math.floor(Math.random() * availableColors.length);
      randomColors.push(availableColors[randomIndex]);
      availableColors.splice(randomIndex, 1);
    }

    // Combine and shuffle color options
    const allColors = [correctColor, ...randomColors].sort(() => Math.random() - 0.5);
    setColorOptions(allColors);
  };

  // Update elapsed time
  useEffect(() => {
    if (gameActive && roundStartTime > 0) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Date.now() - roundStartTime);
      }, 100) as unknown as NodeJS.Timeout;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameActive, roundStartTime]);

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
    // Clear timer if exists
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setGameActive(false);
    const gameDuration = (Date.now() - gameStartTime) / 1000; // in seconds

    // Calculate score (percentage based on correct selections)
    const finalScore = Math.round((correctSelections / (correctSelections + wrongSelections)) * 100) || 0;

    try {
      // Save game result to API
      await saveGameResult({
        gameId: 5, // ID for "Identify the color of the object" game
        score: finalScore,
        duration: gameDuration,
        date: new Date().toISOString(),
        details: {
          rounds: round,
          correctSelections,
          wrongSelections
        }
      });

      Alert.alert(
        "Game Complete!",
        `Score: ${finalScore}%\nTime: ${Math.round(gameDuration)}s`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      console.error("Failed to save game result:", error);
      Alert.alert(
        "Game Complete!",
        `Score: ${finalScore}%\nTime: ${Math.round(gameDuration)}s\n(Failed to save results)`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  };

  const handleColorSelection = (selectedColor: string) => {
    if (selectedColor === currentObject?.color) {
      setCorrectSelections(prev => prev + 1);
      setScore(prevScore => prevScore + 10);
    } else {
      setWrongSelections(prev => prev + 1);
      setScore(prevScore => Math.max(0, prevScore - 5));
    }

    if (round < totalRounds) {
      setupRound();
    } else {
      endGame();
    }
  };

  return (
    <ScrollView style={styles.container}>
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
        <Text style={styles.gameTitle}>Identify the Object&apos;s Color</Text>
      </View>
  
      {!gameActive ? (
        <View style={styles.startContainer}>
          <Text style={styles.instructionText}>
            Choose the correct color of the displayed object.
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

          <Text style={styles.questionText}>
            What color is this {currentObject?.name}?
          </Text>

          <View style={styles.objectDisplay}>
            <FontAwesome
              name={currentObject?.icon}
              size={80}
              color={currentObject?.color}
            />
          </View>

          <Text style={styles.timeText}>
            Time: {Math.floor(elapsedTime / 1000)}s
          </Text>

          <View style={styles.colorOptions}>
            {colorOptions.map((color, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.colorButton, { backgroundColor: color }]}
                onPress={() => handleColorSelection(color)}
              >
                <Text style={[
                  styles.colorButtonText, 
                  { color: ["yellow", "gold"].includes(color) ? "#333" : "#fff" }
                ]}>
                  {color}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
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
    height: 500,
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
    paddingBottom: 50,
    minHeight: 600,
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
  timeText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0EA5E9",
    textAlign: "center",
    marginBottom: 15,
  },
  questionText: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  objectDisplay: {
    alignItems: "center",
    justifyContent: "center",
    height: 150,
    marginBottom: 30,
  },
  colorOptions: {
    marginTop: 20,
    flexDirection: "column",
  },
  colorButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 15,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  colorButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    textTransform: "capitalize",
  },
});