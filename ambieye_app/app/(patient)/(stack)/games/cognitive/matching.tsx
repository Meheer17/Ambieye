import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { saveGameResult } from "@/utils/gameUtils";

const { width } = Dimensions.get("window");

export default function MatchingGame() {
  const router = useRouter();
  const [gameActive, setGameActive] = useState(false);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [totalRounds] = useState(5);
  const [leftItems, setLeftItems] = useState<any[]>([]);
  const [rightItems, setRightItems] = useState<any[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<number[]>([]);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [correctMatches, setCorrectMatches] = useState(0);
  const [wrongMatches, setWrongMatches] = useState(0);
  const countdownValue = useRef(new Animated.Value(100)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const roundCompleted = useRef(false);

  // Sample matching pairs for the game - same word in both columns
  const matchingPairs = [
    [
      { id: 1, text: "Dog", icon: "paw" },
      { id: 1, text: "Dog", icon: "paw" },
    ],
    [
      { id: 2, text: "Car", icon: "car" },
      { id: 2, text: "Car", icon: "car" },
    ],
    [
      { id: 3, text: "Star", icon: "star" },
      { id: 3, text: "Star", icon: "star" },
    ],
    [
      { id: 4, text: "Sun", icon: "sun-o" },
      { id: 4, text: "Sun", icon: "sun-o" },
    ],
    [
      { id: 5, text: "Book", icon: "book" },
      { id: 5, text: "Book", icon: "book" },
    ],
    [
      { id: 6, text: "Apple", icon: "apple" },
      { id: 6, text: "Apple", icon: "apple" },
    ],
    [
      { id: 7, text: "Home", icon: "home" },
      { id: 7, text: "Home", icon: "home" },
    ],
    [
      { id: 8, text: "Music", icon: "music" },
      { id: 8, text: "Music", icon: "music" },
    ],
    [
      { id: 9, text: "Computer", icon: "laptop" },
      { id: 9, text: "Computer", icon: "laptop" },
    ],
    [
      { id: 10, text: "Cloud", icon: "cloud" },
      { id: 10, text: "Cloud", icon: "cloud" },
    ],
    [
      { id: 11, text: "Camera", icon: "camera" },
      { id: 11, text: "Camera", icon: "camera" },
    ],
    [
      { id: 12, text: "Food", icon: "cutlery" },
      { id: 12, text: "Food", icon: "cutlery" },
    ],
    [
      { id: 13, text: "Plane", icon: "plane" },
      { id: 13, text: "Plane", icon: "plane" },
    ],
    [
      { id: 14, text: "Heart", icon: "heart" },
      { id: 14, text: "Heart", icon: "heart" },
    ],
    [
      { id: 15, text: "Ship", icon: "anchor" },
      { id: 15, text: "Ship", icon: "anchor" },
    ],
    [
      { id: 16, text: "Soccer", icon: "futbol-o" },
      { id: 16, text: "Soccer", icon: "futbol-o" },
    ],
  ];

  useEffect(() => {
    return () => {
      // Clean up animation when component unmounts
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, []);

  const setupRound = () => {
    // Stop any running animations
    if (animationRef.current) {
      animationRef.current.stop();
    }

    roundCompleted.current = false;
    setRound(prevRound => prevRound + 1);
    setSelectedLeft(null);
    setSelectedRight(null);
    setMatchedPairs([]);

    // Always use exactly 5 pairs per round
    const pairsCount = 5;
    setTotalMatches(pairsCount);

    // Shuffle and select pairs for this round
    const shuffledPairs = [...matchingPairs].sort(() => Math.random() - 0.5).slice(0, pairsCount);

    // Set left items
    const leftSide = shuffledPairs.map(pair => pair[0]);

    // Create right side with the same items but in different order
    const rightSide = [...leftSide].sort(() => Math.random() - 0.5);

    setLeftItems(leftSide);
    setRightItems(rightSide);

    // Reset the countdown animation
    countdownValue.setValue(100);
    animationRef.current = Animated.timing(countdownValue, {
      toValue: 0,
      duration: 60000, // 60 seconds per round
      useNativeDriver: false
    });

    animationRef.current.start(() => {
      // If time runs out and not all pairs matched
      if (matchedPairs.length < pairsCount && !roundCompleted.current) {
        roundCompleted.current = true;
        if (round < totalRounds) {
          setupRound();
        } else {
          endGame();
        }
      }
    });
  };

  const startGame = () => {
    setGameActive(true);
    setScore(0);
    setRound(0);
    setCorrectMatches(0);
    setWrongMatches(0);
    setGameStartTime(Date.now());
    setupRound();
  };

  const handleSelect = (side: 'left' | 'right', index: number) => {
    // Ignore already matched items
    if (matchedPairs.includes(side === 'left' ? leftItems[index].id : rightItems[index].id)) {
      return;
    }

    if (side === 'left') {
      setSelectedLeft(index);
    } else {
      setSelectedRight(index);
    }

    // Check if we have a pair selected
    if (side === 'left' && selectedRight !== null) {
      checkMatch(index, selectedRight);
    } else if (side === 'right' && selectedLeft !== null) {
      checkMatch(selectedLeft, index);
    }
  };

  const checkMatch = (leftIndex: number, rightIndex: number) => {
    const leftId = leftItems[leftIndex].id;
    const rightId = rightItems[rightIndex].id;

    if (leftId === rightId) {
      // Correct match
      const newMatchedPairs = [...matchedPairs, leftId];
      setMatchedPairs(newMatchedPairs);
      setCorrectMatches(prev => prev + 1);
      setScore(prevScore => prevScore + 10);

      // Check if all pairs are matched
      if (newMatchedPairs.length === totalMatches) {
        roundCompleted.current = true;
        if (round < totalRounds) {
          setTimeout(() => setupRound(), 500); // Small delay before next round
        } else {
          endGame();
        }
      }
    } else {
      // Wrong match
      setWrongMatches(prev => prev + 1);
      setScore(prevScore => Math.max(0, prevScore - 5));
    }

    // Reset selections
    setSelectedLeft(null);
    setSelectedRight(null);
  };

  const endGame = async () => {
    // Stop the animation
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
        gameId: 12, // ID for "Match the following" game
        score: finalScore,
        duration: gameDuration,
        date: new Date().toISOString(),
        details: {
          rounds: round,
          correctMatches,
          wrongMatches
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

  const isMatched = (id: number) => matchedPairs.includes(id);

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
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
        <Text style={styles.gameTitle}>Match the Following</Text>
      </View>

      {!gameActive ? (
        <View style={styles.startContainer}>
          <Text style={styles.instructionText}>
            Connect matching items by finding the same word on both sides.
            Match all pairs before time runs out!
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

          <View style={styles.progressContainer}>
            <Text style={styles.matchesText}>
              Matches: {matchedPairs.length}/{totalMatches}
            </Text>

            <Animated.View style={{
              height: 6,
              width: countdownValue.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%']
              }),
              backgroundColor: '#0EA5E9',
              borderRadius: 3,
              marginTop: 10
            }} />
          </View>

          <View style={styles.matchingContainer}>
            <View style={styles.columnContainer}>
              {leftItems.map((item, index) => (
                <TouchableOpacity
                  key={`left-${index}`}
                  style={[
                    styles.matchItem,
                    selectedLeft === index && styles.selectedItem,
                    isMatched(item.id) && styles.matchedItem
                  ]}
                  onPress={() => handleSelect('left', index)}
                  disabled={isMatched(item.id)}
                >
                  <FontAwesome name={item.icon} size={24} color={isMatched(item.id) ? "#4CAF50" : "#0EA5E9"} />
                  <Text style={[
                    styles.matchItemText,
                    isMatched(item.id) && styles.matchedItemText
                  ]}>
                    {item.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.columnContainer}>
              {rightItems.map((item, index) => (
                <TouchableOpacity
                  key={`right-${index}`}
                  style={[
                    styles.matchItem,
                    selectedRight === index && styles.selectedItem,
                    isMatched(item.id) && styles.matchedItem
                  ]}
                  onPress={() => handleSelect('right', index)}
                  disabled={isMatched(item.id)}
                >
                  <FontAwesome name={item.icon} size={24} color={isMatched(item.id) ? "#4CAF50" : "#0EA5E9"} />
                  <Text style={[
                    styles.matchItemText,
                    isMatched(item.id) && styles.matchedItemText
                  ]}>
                    {item.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
  },
  contentContainer: {
    padding: 20,
    minHeight: '100%',
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
  progressContainer: {
    marginBottom: 20,
  },
  matchesText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  matchingContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  columnContainer: {
    width: width * 0.4,
  },
  matchItem: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedItem: {
    backgroundColor: "#EFF6FF",
    borderColor: "#0EA5E9",
    borderWidth: 2,
  },
  matchedItem: {
    backgroundColor: "#e8f5e9",
    borderColor: "#4CAF50",
    borderWidth: 2,
  },
  matchItemText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginTop: 8,
    textAlign: "center",
  },
  matchedItemText: {
    color: "#4CAF50",
  },
});