import React, {useState, useRef} from "react"; // React is required for JSX
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { saveGameResult } from "@/utils/gameUtils";

export default function FindCharactersGame() {
  const router = useRouter();
  const [gameActive, setGameActive] = useState(false);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [totalRounds] = useState(5);
  const [charGrid, setCharGrid] = useState<string[][]>([]);
  const [targetChar, setTargetChar] = useState("");
  const [targetCount, setTargetCount] = useState(0);
  const [foundCount, setFoundCount] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [timePerRound] = useState(30); // Removed setTimePerRound as it's not used
  const [timeRemaining, setTimeRemaining] = useState(timePerRound);
  const countdownValue = useRef(new Animated.Value(100)).current;
  const timerRef = useRef<number | null>(null); // Changed NodeJS.Timeout to number

  // Generate a grid of random characters with some target characters
  const generateCharGrid = (rows: number, cols: number, target: string, count: number) => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const grid: string[][] = [];
    const positions: string[] = [];

    // Generate positions for the target characters
    while (positions.length < count) {
      const row = Math.floor(Math.random() * rows);
      const col = Math.floor(Math.random() * cols);
      const pos = `${row}-${col}`;
      if (!positions.includes(pos)) {
        positions.push(pos);
      }
    }

    // Fill the grid
    for (let i = 0; i < rows; i++) {
      const rowChars: string[] = [];
      for (let j = 0; j < cols; j++) {
        if (positions.includes(`${i}-${j}`)) {
          rowChars.push(target);
        } else {
          const randomChar = characters.charAt(Math.floor(Math.random() * characters.length));
          rowChars.push(randomChar);
        }
      }
      grid.push(rowChars);
    }

    return grid;
  };

  const setupRound = () => {
    setRound(prevRound => prevRound + 1);
    setFoundCount(0);
    setTimeRemaining(timePerRound);

    // Choose a random target character
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const target = characters.charAt(Math.floor(Math.random() * characters.length));
    setTargetChar(target);

    // Determine how many instances to place (3-8 based on round)
    const count = Math.min(3 + round, 8);
    setTargetCount(count);

    // Generate a grid with the target character
    const grid = generateCharGrid(8, 8, target, count);
    setCharGrid(grid);

    // Reset and start the countdown
    countdownValue.setValue(100);
    Animated.timing(countdownValue, {
      toValue: 0,
      duration: timePerRound * 1000,
      useNativeDriver: false
    }).start();

    // Set a timer for this round
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Time's up for this round
          if (round < totalRounds) {
            setupRound();
          } else {
            endGame();
          }
          return timePerRound;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startGame = () => {
    setGameActive(true);
    setScore(0);
    setRound(0);
    setGameStartTime(Date.now());
    setupRound();
  };

  const handleCharPress = (rowIndex: number, colIndex: number) => {
    const selectedChar = charGrid[rowIndex][colIndex];

    if (selectedChar === targetChar) {
      // Create a new grid with the found character replaced
      const newGrid = [...charGrid];
      newGrid[rowIndex][colIndex] = " "; // Replace with space
      setCharGrid(newGrid);

      // Increment found count
      const newFoundCount = foundCount + 1;
      setFoundCount(newFoundCount);

      // Update score
      setScore(prevScore => prevScore + 10);

      // Check if all targets are found
      if (newFoundCount >= targetCount) {
        // Move to next round or end game
        if (round < totalRounds) {
          setupRound();
        } else {
          endGame();
        }
      }
    } else {
      // Wrong selection, deduct points
      setScore(prevScore => Math.max(0, prevScore - 5));
    }
  };

  const endGame = () => {
    setGameActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const gameDuration = (Date.now() - gameStartTime) / 1000; // in seconds
    const finalScore = Math.max(0, score); // Ensure score is not negative

    saveGameResult({
      gameId: 10, // ID for "Find the characters" game
      score: Math.min(100, finalScore), // Cap at 100
      duration: gameDuration,
      date: new Date().toISOString(),
      details: {
        rounds: round,
        foundCharacters: foundCount
      }
    })
      .then(() => {
        Alert.alert(
          "Game Complete!",
          `Score: ${Math.min(100, finalScore)}%\nTime: ${Math.round(gameDuration)}s`,
          [{ text: "OK", onPress: () => router.back() }]
        );
      })
      .catch(error => {
        console.error("Failed to save game result:", error);
        Alert.alert(
          "Game Complete!",
          `Score: ${Math.min(100, finalScore)}%\nTime: ${Math.round(gameDuration)}s\n(Failed to save results)`,
          [{ text: "OK", onPress: () => router.back() }]
        );
      });
  };

  React.useEffect(() => {
    // Clean up timer when component unmounts
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

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
        <Text style={styles.gameTitle}>Find the Characters</Text>
      </View>

      {!gameActive ? (
        <View style={styles.startContainer}>
          <Text style={styles.instructionText}>
            Find and tap all instances of a specific character in the grid.
            Be quick - you have limited time for each round!
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

          <View style={styles.targetContainer}>
            <Text style={styles.targetText}>
              Find all &qout;{targetChar}&qout; characters: {foundCount}/{targetCount}
            </Text>
            <Text style={styles.timeText}>Time: {timeRemaining}s</Text>
          </View>

          <Animated.View style={{
            height: 6,
            width: countdownValue.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%']
            }),
            backgroundColor: '#0EA5E9',
            borderRadius: 3,
            marginBottom: 20
          }} />

          <View style={styles.gridContainer}>
            {charGrid.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.row}>
                {row.map((char, colIndex) => (
                  <TouchableOpacity
                    key={`${rowIndex}-${colIndex}`}
                    style={styles.cell}
                    onPress={() => handleCharPress(rowIndex, colIndex)}
                  >
                    <Text style={styles.cellText}>{char}</Text>
                  </TouchableOpacity>
                ))}
              </View>
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
  targetContainer: {
    alignItems: "center",
    marginBottom: 15,
  },
  targetText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  timeText: {
    fontSize: 16,
    color: "#0EA5E9",
  },
  gridContainer: {
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
  },
  cell: {
    width: 35,
    height: 35,
    justifyContent: "center",
    alignItems: "center",
    margin: 2,
    backgroundColor: "#EFF6FF",
    borderRadius: 5,
  },
  cellText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
});