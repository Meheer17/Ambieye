import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { saveGameResult } from "@/utils/gameUtils";

export default function CountAndChooseGame() {
  const router = useRouter();
  const [gameActive, setGameActive] = useState(false);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [totalRounds] = useState(10);
  const [objects, setObjects] = useState<any[]>([]);
  const [options, setOptions] = useState<number[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [correctSelections, setCorrectSelections] = useState(0);
  const [wrongSelections, setWrongSelections] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(0);
  const timerValue = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Array of icons to use in the game
  const iconOptions = [
    { name: "star", color: "#FFD700" },
    { name: "heart", color: "#FF6B6B" },
    { name: "circle", color: "#4ECDC4" },
    { name: "square", color: "#5762D5" },
    { name: "diamond", color: "#FF9F1C" },
    { name: "triangle", color: "#FF5733" },
  ];

  const setupRound = () => {
    // Check if we've completed all rounds first
    const nextRound = round + 1;
    if (nextRound > totalRounds) {
      endGame();
      return;
    }

    // Stop any existing animation
    if (animationRef.current) {
      animationRef.current.stop();
    }

    setRound(nextRound);

    // Choose a random icon for this round
    const randomIcon = iconOptions[Math.floor(Math.random() * iconOptions.length)];

    // Decide the number of objects to display (3-15 based on the round)
    const count = Math.min(3 + nextRound, 15);
    setCorrectAnswer(count);

    // Create objects with non-overlapping positions
    const newObjects = [];
    for (let i = 0; i < count; i++) {
      const size = Math.random() * 10 + 20; // Size between 20-30
      let position;
      let overlapFound;
      let attempts = 0;
      const maxAttempts = 50; // Prevent infinite loop

      // Keep generating positions until we find one with no overlap
      do {
        overlapFound = false;
        position = {
          x: Math.random() * 240 + 20, // Adjust based on screen width
          y: Math.random() * 200 + 20, // Position within the game area
        };

        // Check for overlap with existing objects
        for (let j = 0; j < newObjects.length; j++) {
          const existingObj = newObjects[j];
          const minDistance = (size + existingObj.size) / 2; // Minimum distance to avoid overlap

          // Calculate distance between objects
          const dx = position.x - existingObj.position.x;
          const dy = position.y - existingObj.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < minDistance) {
            overlapFound = true;
            break;
          }
        }

        attempts++;
      } while (overlapFound && attempts < maxAttempts);

      // If we exceeded max attempts, adjust position to ensure no overlap
      if (attempts >= maxAttempts) {
        // Place objects in a grid-like pattern if we can't find non-overlapping positions
        const gridSize = Math.ceil(Math.sqrt(count));
        const cellWidth = 240 / gridSize;
        const cellHeight = 200 / gridSize;
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;
        position = {
          x: 20 + col * cellWidth + (cellWidth - size) / 2,
          y: 20 + row * cellHeight + (cellHeight - size) / 2
        };
      }

      newObjects.push({
        id: i,
        icon: randomIcon.name,
        color: randomIcon.color,
        size: size,
        rotation: Math.random() * 360,
        position: position
      });
    }
    setObjects(newObjects);

    // Generate answer options (including the correct one)
    const correctOption = count;
    let answerOptions = [correctOption];

    while (answerOptions.length < 4) {
      let option;
      if (count <= 5) {
        // For small counts, options close to correct answer
        option = Math.max(1, correctOption + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 3) + 1));
      } else {
        // For larger counts, options can be further off
        option = Math.max(1, correctOption + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 5) + 1));
      }

      if (!answerOptions.includes(option)) {
        answerOptions.push(option);
      }
    }

    // Shuffle the options
    answerOptions.sort(() => Math.random() - 0.5);
    setOptions(answerOptions);

    // Reset and start the timer animation (from 0 to 100)
    timerValue.setValue(0);
    animationRef.current = Animated.timing(timerValue, {
      toValue: 100,
      duration: 15000, // 15 seconds per round
      useNativeDriver: false,
      easing: Easing.linear // Use linear easing for smooth progression
    });

    animationRef.current.start(({finished}) => {
      if (finished && nextRound < totalRounds) {
        setupRound();
      }
    });
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

  const handleOptionSelect = (selectedCount: number) => {
    if (selectedCount === correctAnswer) {
      setCorrectSelections(prev => prev + 1);
      setScore(prevScore => prevScore + 10);
    } else {
      setWrongSelections(prev => prev + 1);
      setScore(prevScore => Math.max(0, prevScore - 5));
    }

    // Check if this was the last round
    if (round >= totalRounds) {
      endGame();
    } else {
      setupRound();
    }
  };

  const endGame = async () => {
    // Stop the timer animation if it's running
    if (animationRef.current) {
      animationRef.current.stop();
    }

    setGameActive(false);
    const gameDuration = (Date.now() - gameStartTime) / 1000; // in seconds

    // Calculate final score (cap at 100)
    const finalScore = Math.min(100, Math.max(0, score));

    try {
      // Save game result to API
      await saveGameResult({
        gameId: 11, // ID for "Count and choose" game
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
        <Text style={styles.gameTitle}>Count and Choose</Text>
      </View>

      {!gameActive ? (
        <View style={styles.startContainer}>
          <Text style={styles.instructionText}>
            Count the number of objects displayed on the screen and select the correct answer.
            Be quick - you have 15 seconds for each round!
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
            How many objects do you see?
          </Text>

          <View style={styles.timerContainer}>
            <Animated.View 
              style={[
                styles.timerBar,
                {
                  width: timerValue.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%']
                  })
                }
              ]} 
            />
          </View>

          <View style={styles.objectsContainer}>
            {objects.map((obj) => (
              <View
                key={obj.id}
                style={[
                  styles.object,
                  {
                    left: obj.position.x,
                    top: obj.position.y,
                    transform: [{ rotate: `${obj.rotation}deg` }],
                  }
                ]}
              >
                <FontAwesome
                  name={obj.icon}
                  size={obj.size}
                  color={obj.color}
                />
              </View>
            ))}
          </View>

          <View style={styles.optionsContainer}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.optionButton}
                onPress={() => handleOptionSelect(option)}
              >
                <Text style={styles.optionText}>{option}</Text>
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
    paddingBottom: 40,
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
  questionText: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  timerContainer: {
    height: 6,
    width: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginBottom: 20,
    overflow: 'hidden',
  },
  timerBar: {
    height: '100%',
    backgroundColor: '#0EA5E9',
    borderRadius: 3,
  },
  objectsContainer: {
    width: "100%",
    height: 300,
    backgroundColor: "#fff",
    borderRadius: 10,
    position: "relative",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  object: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  optionButton: {
    width: "48%",
    backgroundColor: "#fff",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  optionText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0EA5E9",
  },
});