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

const { width } = Dimensions.get("window");
const SYMBOL_SIZE = width * 0.18;

// Collection of symbols to use in the game
const SYMBOLS = [
  { name: "heart", icon: "heart" },
  { name: "star", icon: "star" },
  { name: "triangle", icon: "triangle" },
  { name: "square", icon: "square" },
  { name: "circle", icon: "circle" },
  { name: "diamond", icon: "diamond" },
  { name: "plus", icon: "plus" },
  { name: "minus", icon: "minus" },
  { name: "music", icon: "music" },
  { name: "bell", icon: "bell" },
];

export default function SymbolGame() {
  const router = useRouter();
  const [gameActive, setGameActive] = useState(false);
  const [targetSymbol, setTargetSymbol] = useState<any>(null);
  const [symbols, setSymbols] = useState<any[]>([]);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [totalRounds] = useState(10);
  const [correctSelections, setCorrectSelections] = useState(0);
  const [wrongSelections, setWrongSelections] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [targetSymbolsRemaining, setTargetSymbolsRemaining] = useState(0);
  const timeElapsed = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const generateRandomPosition = () => {
    const maxX = width - SYMBOL_SIZE - 40;
    const maxY = 300;
    return {
      x: Math.random() * maxX + 20,
      y: Math.random() * maxY,
    };
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

    // Select random target symbol
    const newTargetSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    setTargetSymbol(newTargetSymbol);

    // Create 6-10 symbols with random positions
    const totalSymbols = Math.floor(Math.random() * 5) + 6;
    const newSymbols = [];

    // Ensure at least one symbol is the target
    newSymbols.push({
      ...newTargetSymbol,
      id: 0,
      position: generateRandomPosition(),
      isTarget: true,
      selected: false,
    });

    // Add remaining symbols
    for (let i = 1; i < totalSymbols; i++) {
      let symbol;
      do {
        symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      } while (symbol.name === newTargetSymbol.name && Math.random() > 0.2); // Allow some duplicates

      newSymbols.push({
        ...symbol,
        id: i,
        position: generateRandomPosition(),
        isTarget: symbol.name === newTargetSymbol.name,
        selected: false,
      });
    }

    // Count how many target symbols we have
    const targetSymbols = newSymbols.filter(
      (symbol) => symbol.isTarget
    ).length;
    setTargetSymbolsRemaining(targetSymbols);

    setSymbols(newSymbols);

    // Reset and start the timer animation
    timeElapsed.setValue(0);
    animationRef.current = Animated.timing(timeElapsed, {
      toValue: 100,
      duration: 20000, // 20 seconds per round
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
    const finalScore = Math.round((correctSelections / (correctSelections + wrongSelections)) * 100) || 0;

    try {
      // Save game result to API
      await saveGameResult({
        gameId: 4, // ID for "Identify the symbol" game
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

  const handleSymbolPress = (symbolId: number, isTarget: boolean) => {
    // Check if symbol is already selected
    const selectedSymbol = symbols.find((symbol) => symbol.id === symbolId);
    if (selectedSymbol?.selected) return;

    // Mark this symbol as selected
    const updatedSymbols = symbols.map((symbol) =>
      symbol.id === symbolId ? { ...symbol, selected: true } : symbol
    );
    setSymbols(updatedSymbols);

    if (isTarget) {
      setCorrectSelections(prev => prev + 1);
      setScore(prevScore => prevScore + 10);
      setTargetSymbolsRemaining(prev => prev - 1);

      // If we've found all target symbols, move to next round
      if (targetSymbolsRemaining <= 1) {
        // Using 1 because state hasn't updated yet
        setupRound();
      }
    } else {
      setWrongSelections(prev => prev + 1);
      setScore(prevScore => Math.max(0, prevScore - 5));
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
          <Text style={styles.gameTitle}>Identify the Symbol</Text>
        </View>

        {!gameActive ? (
          <View style={styles.startContainer}>
            <Text style={styles.instructionText}>
              Find and tap all instances of the specified symbol among other symbols.
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
              Find all
              <Text style={styles.targetSymbolText}> {targetSymbol?.name} </Text>
              symbols
              <Text style={styles.remainingText}>
                {" "}({targetSymbolsRemaining} remaining)
              </Text>
            </Text>

            <View style={styles.symbolTargetContainer}>
              <FontAwesome 
                name={targetSymbol?.icon} 
                size={40} 
                color="#5f2446" 
              />
            </View>

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
              {symbols.map((symbol) => (
                <TouchableOpacity
                  key={symbol.id}
                  style={[
                    styles.symbolBox,
                    {
                      left: symbol.position.x,
                      top: symbol.position.y,
                      opacity: symbol.selected ? 0.4 : 1,
                      borderWidth: symbol.selected ? 2 : 0,
                      borderColor: "#000",
                    }
                  ]}
                  onPress={() => handleSymbolPress(symbol.id, symbol.isTarget)}
                >
                  <FontAwesome 
                    name={symbol.icon} 
                    size={30} 
                    color="#333" 
                  />
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
    marginBottom: 10,
    color: "#333",
  },
  targetSymbolText: {
    fontWeight: "900",
    color: "#5f2446",
  },
  remainingText: {
    fontSize: 16,
    fontWeight: "normal",
    color: "#666",
  },
  symbolTargetContainer: {
    alignSelf: "center",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gameArea: {
    flex: 1,
    position: "relative",
    paddingBottom: 20,
  },
  symbolBox: {
    position: "absolute",
    width: SYMBOL_SIZE,
    height: SYMBOL_SIZE,
    borderRadius: SYMBOL_SIZE / 2,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});