import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "@/services/api/apiService";

// Define the game result interface
export interface GameResult {
  gameId: number;
  score: number;
  duration: number;
  date: string;
  details?: any;
}

export const saveGameResult = async (result: GameResult): Promise<void> => {
  try {
    // First, save to backend API
    const response = await apiClient.post("/games/results", result);
    console.log("Game result saved to backend:", response.data);

    // Also save locally for offline access
    // Get existing history
    const historyJson = await AsyncStorage.getItem("gameHistory");
    const history = historyJson ? JSON.parse(historyJson) : [];

    // Format date as YYYY-MM-DD
    const today = new Date().toISOString().split("T")[0];

    // Check if we already have an entry for today
    const todayEntry = history.find((entry: any) => entry.date === today);

    if (todayEntry) {
      // Add to existing entry
      todayEntry.games.push({
        id: result.gameId,
        game: getGameNameById(result.gameId),
        points: result.score,
        time: result.duration,
        details: result.details,
      });
    } else {
      // Create new entry for today
      history.push({
        date: today,
        games: [
          {
            id: result.gameId,
            game: getGameNameById(result.gameId),
            points: result.score,
            time: result.duration,
            details: result.details,
          },
        ],
      });
    }

    // Save updated history
    await AsyncStorage.setItem("gameHistory", JSON.stringify(history));
  } catch (error) {
    console.error("Error saving game result:", error);

    // If API fails, at least save locally
    try {
      const historyJson = await AsyncStorage.getItem("gameHistory");
      const history = historyJson ? JSON.parse(historyJson) : [];

      const today = new Date().toISOString().split("T")[0];
      const todayEntry = history.find((entry: any) => entry.date === today);

      if (todayEntry) {
        todayEntry.games.push({
          id: result.gameId,
          game: getGameNameById(result.gameId),
          points: result.score,
          time: result.duration,
          details: result.details,
        });
      } else {
        history.push({
          date: today,
          games: [
            {
              id: result.gameId,
              game: getGameNameById(result.gameId),
              points: result.score,
              time: result.duration,
              details: result.details,
            },
          ],
        });
      }

      await AsyncStorage.setItem("gameHistory", JSON.stringify(history));
      console.log("Game result saved to local storage only");
    } catch (localError) {
      console.error("Failed to save even to local storage:", localError);
    }

    throw error;
  }
};

// Helper function to get game name by ID
function getGameNameById(gameId: number): string {
  const games: Record<number, string> = {
    1: "Select the colored balls",
    2: "Select the alphabet",
    3: "Select the correct object for the alphabets",
    4: "Identify the symbol",
    5: "Identify the color of the object",
    6: "Follow the ball in clockwise direction",
    7: "Follow the ball in anti-clockwise direction",
    8: "Eyeball movement",
    9: "Direction of the target",
    10: "Find the characters",
    11: "Count and choose",
    12: "Match the following",
  };

  return games[gameId] || "Unknown Game";
}
