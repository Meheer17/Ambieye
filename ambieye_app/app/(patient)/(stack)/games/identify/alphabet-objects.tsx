import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { saveGameResult } from "@/utils/gameUtils";

const { width } = Dimensions.get("window");
const ITEM_SIZE = width * 0.25;

// Sample objects for each letter
const alphabetObjects = {
  A: { name: "Apple", image: require("@/assets/images/objects/apple.png") },
  B: { name: "Ball", image: require("@/assets/images/objects/ball.png") },
  C: { name: "Cat", image: require("@/assets/images/objects/cat.png") },
  D: { name: "Dog", image: require("@/assets/images/objects/dog.png") },
  E: {
    name: "Elephant",
    image: require("@/assets/images/objects/elephant.png"),
  },
  F: { name: "Fish", image: require("@/assets/images/objects/fish.png") },
  G: { name: "Giraffe", image: require("@/assets/images/objects/gira.png") },
  H: { name: "Hat", image: require("@/assets/images/objects/hat.png") },
  I: { name: "Ice Cream", image: require("@/assets/images/objects/ice.png") },
  J: { name: "Juice", image: require("@/assets/images/objects/juice.png") },
  K: { name: "Kite", image: require("@/assets/images/objects/kite.png") },
  L: { name: "Lion", image: require("@/assets/images/objects/lion.png") },
  M: { name: "Monkey", image: require("@/assets/images/objects/monkey.png") },
  N: { name: "Nest", image: require("@/assets/images/objects/nest.png") },
  O: { name: "Orange", image: require("@/assets/images/objects/orange.png") },
  P: { name: "Pen", image: require("@/assets/images/objects/pen.png") },
  Q: { name: "Queen", image: require("@/assets/images/objects/queen.png") },
  R: { name: "RCB", image: require("@/assets/images/objects/rcb.png") },
  S: { name: "Sun", image: require("@/assets/images/objects/sun.png") },
  T: { name: "Tiger", image: require("@/assets/images/objects/tiger.png") },
  U: {
    name: "Umbrella",
    image: require("@/assets/images/objects/umbrella.png"),
  },
  V: { name: "Violin", image: require("@/assets/images/objects/vio.png") },
  W: { name: "Watch", image: require("@/assets/images/objects/watch.png") },
  X: {
    name: "Xylophone",
    image: require("@/assets/images/objects/Xylophone.png"),
  },
  Y: { name: "Yoyo", image: require("@/assets/images/objects/yoyo.png") },
  Z: { name: "Zebra", image: require("@/assets/images/objects/zebra.png") },
};

export default function AlphabetObjectsGame() {
  const router = useRouter();
  const [gameActive, setGameActive] = useState(false);
  const [targetLetter, setTargetLetter] = useState("");
  const [objects, setObjects] = useState<
    {
      name: string;
      image: any;
      id: number;
      isCorrect: boolean;
    }[]
  >([]);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [totalRounds] = useState(10);
  const [correctSelections, setCorrectSelections] = useState(0);
  const [wrongSelections, setWrongSelections] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(0);
  const countdownValue = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Define explicit keys for type safety
  const availableLetters = Object.keys(
    alphabetObjects,
  ) as (keyof typeof alphabetObjects)[];

  const setupRound = () => {
    setRound((prevRound) => prevRound + 1);

    // Select random target letter
    const newTargetLetter =
      availableLetters[Math.floor(Math.random() * availableLetters.length)];
    setTargetLetter(newTargetLetter);

    // Create 6 objects (1 correct, 5 incorrect)
    const correctObject = alphabetObjects[newTargetLetter];

    // Get 5 random incorrect objects
    const incorrectObjects = [];
    const remainingLetters = availableLetters.filter(
      (letter) => letter !== newTargetLetter,
    );

    for (let i = 0; i < 5; i++) {
      if (remainingLetters.length === 0) break; // In case we have fewer than 5 remaining letters

      const randomIndex = Math.floor(Math.random() * remainingLetters.length);
      const randomLetter = remainingLetters[randomIndex];

      incorrectObjects.push({
        ...alphabetObjects[randomLetter],
        id: i + 1,
        isCorrect: false,
      });

      // Remove used letter to avoid duplicates
      remainingLetters.splice(randomIndex, 1);
    }

    // Combine correct and incorrect objects and shuffle
    const allObjects = [
      { ...correctObject, id: 0, isCorrect: true },
      ...incorrectObjects,
    ].sort(() => Math.random() - 0.5);

    setObjects(allObjects);

    // Stop current animation if it exists
    if (animationRef.current) {
      animationRef.current.stop();
    }

    // Reset the countdown animation
    countdownValue.setValue(0);

    // Create new animation with steady progression
    animationRef.current = Animated.timing(countdownValue, {
      toValue: 100,
      duration: 15000, // 15 seconds per round
      useNativeDriver: false,
      isInteraction: false, // Prevent interaction from interrupting
    });

    // Start animation and set up callback
    animationRef.current.start(({ finished }) => {
      if (finished && round < totalRounds) {
        setupRound();
      } else if (finished) {
        endGame();
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

  const endGame = async () => {
    // Stop the animation if running
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
        gameId: 3, // ID for "Select the correct object for the alphabets" game
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

  const handleObjectPress = (isCorrect: boolean) => {
    if (isCorrect) {
      setCorrectSelections((prev) => prev + 1);
      setScore((prevScore) => prevScore + 10);
    } else {
      setWrongSelections((prev) => prev + 1);
      setScore((prevScore) => Math.max(0, prevScore - 5));
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
        <TouchableOpacity onPress={() => router.push("/games")}>
          <FontAwesome name="arrow-left" size={24} color="#5f2446" />
        </TouchableOpacity>
        <Text style={styles.gameTitle}>Select the Correct one</Text>
      </View>

      {!gameActive ? (
        <View style={styles.startContainer}>
          <Text style={styles.instructionText}>
            Find and tap the object that starts with the given letter.
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

          <View style={styles.letterContainer}>
            <Text style={styles.letterLabel}>
              Find an object that starts with:
            </Text>
            <Text style={styles.targetLetter}>{targetLetter}</Text>
          </View>

          <Animated.View
            style={{
              height: 6,
              width: countdownValue.interpolate({
                inputRange: [0, 100],
                outputRange: ["0%", "100%"],
              }),
              backgroundColor: "#5f2446",
              borderRadius: 3,
              marginBottom: 20,
            }}
          />

          <View style={styles.objectsGrid}>
            {objects.map((object) => (
              <TouchableOpacity
                key={object.id}
                style={styles.objectItem}
                onPress={() => handleObjectPress(object.isCorrect)}
              >
                <Image source={object.image} style={styles.objectImage} />
                <Text style={styles.objectName}>{object.name}</Text>
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
    height: 500,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 50,
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
    paddingBottom: 50,
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
  letterContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  letterLabel: {
    fontSize: 16,
    color: "#333",
    marginBottom: 5,
  },
  targetLetter: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#5f2446",
  },
  objectsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 20,
  },
  objectItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE * 1.3,
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  objectImage: {
    width: ITEM_SIZE * 0.7,
    height: ITEM_SIZE * 0.7,
    resizeMode: "contain",
    marginBottom: 5,
  },
  objectName: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    color: "#333",
  },
});
