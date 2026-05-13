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
  const today = new Date().toISOString().split("T")[0];

  const buildEntry = () => ({
    id: result.gameId,
    game: getGameNameById(result.gameId),
    score: result.score,
    points: result.score,
    time: result.duration,
    details: result.details,
    accuracy: Math.min(100, Math.round((result.score / 100) * 100)),
    date: today,
  });

  try {
    // Save to backend API
    const response = await apiClient.post("/games/results", result);
    console.log("Game result saved to backend:", response.data);
  } catch (error) {
    console.error("Error saving game result to backend:", error);
    // Continue to save locally even if API fails
  }

  // Save locally
  try {
    // gameHistory
    const historyJson = await AsyncStorage.getItem("gameHistory");
    const history = historyJson ? JSON.parse(historyJson) : [];
    const todayEntry = history.find((e: any) => e.date === today);
    if (todayEntry) {
      todayEntry.games.push(buildEntry());
    } else {
      history.push({ date: today, games: [buildEntry()] });
    }
    await AsyncStorage.setItem("gameHistory", JSON.stringify(history));

    // todayGameData
    const todayJson = await AsyncStorage.getItem("todayGameData");
    let todayData = todayJson ? JSON.parse(todayJson) : { date: today, games: [] };
    if (todayData.date !== today) todayData = { date: today, games: [] };
    todayData.games.push(buildEntry());
    await AsyncStorage.setItem("todayGameData", JSON.stringify(todayData));
  } catch (localError) {
    console.error("Failed to save to local storage:", localError);
  }
};

/**
 * Patches the eye tracking result from the OpenCV server onto the most
 * recently saved game entry for a given gameId in AsyncStorage.
 * Called after the server returns its analysis — non-blocking, non-critical.
 */
export const saveEyeTrackingResult = async (
  gameId: number,
  eyeResult: {
    verdict: string;
    movement_count: number;
    frames_with_eyes: number;
    avg_movement: number;
    summary: string;
  }
): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];

  const patchStorage = async (key: string) => {
    try {
      const json = await AsyncStorage.getItem(key);
      if (!json) return;
      const data = JSON.parse(json);

      const todayEntry = Array.isArray(data)
        ? data.find((e: any) => e.date === today)
        : data.date === today ? data : null;

      if (!todayEntry?.games) return;

      // Patch the last game entry with this gameId
      for (let i = todayEntry.games.length - 1; i >= 0; i--) {
        const g = todayEntry.games[i];
        if ((g.id ?? g.gameId) === gameId) {
          g.details = { ...(g.details ?? {}), eyeTracking: eyeResult };
          break;
        }
      }

      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch {
      // Non-critical — silently ignore
    }
  };

  await Promise.all([
    patchStorage("gameHistory"),
    patchStorage("todayGameData"),
  ]);
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
