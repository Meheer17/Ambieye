jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("@/services/api/apiService", () => ({
  __esModule: true,
  default: {
    post: jest.fn().mockResolvedValue({ data: { success: true } }),
    get: jest.fn().mockResolvedValue({ data: { success: true } }),
  },
  apiClient: {
    post: jest.fn().mockResolvedValue({ data: { success: true } }),
    get: jest.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AsyncStorageGameEventRepository,
  PERSISTED_GAME_EVENTS_STORAGE_KEY,
} from "../gameEventRepository";
import {
  companionContextService,
  recordRawGameEvent,
  getPatientCompanionContext,
} from "../companionContextService";
import { saveGameResult } from "@/utils/gameUtils";

describe("Real Game Data Persistence Foundation", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  afterEach(async () => {
    await AsyncStorage.clear();
  });

  describe("1. Direct Event Persistence", () => {
    it("persists a raw game event durably to storage", async () => {
      const repo = new AsyncStorageGameEventRepository();

      const testEvent = {
        id: "test_evt_101",
        patientId: "pat-bhaben",
        gameId: "antakshari-battle",
        eventType: "game_completed",
        timestamp: "2026-09-15T12:00:00.000Z",
        payload: {
          gameName: "Antakshari Song Recall",
          score: 95,
          accuracyPercent: 95,
          durationSeconds: 240,
          completed: true,
          difficulty: "Level 2",
          metadata: {
            detectedSyllable: "ম",
            matchedSongTitle: "Manuhe Manuhor Babe",
            confidence: 0.94,
          },
        },
      };

      // 1. Persist it
      await repo.saveEvent(testEvent);

      // 2. Verify it is physically written to AsyncStorage under the persistent key
      const storedJson = await AsyncStorage.getItem(PERSISTED_GAME_EVENTS_STORAGE_KEY);
      expect(storedJson).not.toBeNull();
      const parsed = JSON.parse(storedJson!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe("test_evt_101");
      expect(parsed[0].payload.score).toBe(95);
      expect(parsed[0].payload.metadata.matchedSongTitle).toBe("Manuhe Manuhor Babe");
    });

    it("survives app restart by retrieving from a fresh repository instance", async () => {
      // Step A: App session 1 records event
      const repoSession1 = new AsyncStorageGameEventRepository();
      await repoSession1.saveEvent({
        id: "test_evt_restart",
        patientId: "pat-bhaben",
        gameId: 12,
        eventType: "game_completed",
        timestamp: new Date().toISOString(),
        payload: {
          gameName: "Match the following",
          score: 88,
          accuracyPercent: 90,
          durationSeconds: 150,
          completed: true,
          metadata: { matchedPairs: 6 },
        },
      });

      // Step B: Simulate complete app process termination & restart (fresh repo instance)
      const repoSession2 = new AsyncStorageGameEventRepository();

      // Retrieve event
      const retrieved = await repoSession2.getEventById("test_evt_restart");
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe("test_evt_restart");
      expect(retrieved?.gameId).toBe(12);
      expect(retrieved?.payload.gameName).toBe("Match the following");
      expect(retrieved?.payload.score).toBe(88);
      expect(retrieved?.payload.metadata?.matchedPairs).toBe(6);
    });
  });

  describe("2. companionContextService & recordRawGameEvent", () => {
    it("auto-resolves patientId and persists raw game event", async () => {
      await AsyncStorage.setItem("userId", "pat-test-user");

      const saved = await recordRawGameEvent({
        gameId: "pattern-recall",
        eventType: "game_completed",
        payload: {
          gameName: "Pattern Recall",
          score: 85,
          accuracyPercent: 85,
          durationSeconds: 180,
          metadata: { roundsPlayed: 4 },
        },
      });

      expect(saved.id).toBeDefined();
      expect(saved.patientId).toBe("pat-test-user");
      expect(saved.gameId).toBe("pattern-recall");
      expect(saved.payload.score).toBe(85);

      // Verify retrieval through companion context service
      const events = await companionContextService.getPersistedGameEvents({
        patientId: "pat-test-user",
      });
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe(saved.id);
    });

    it("populates PatientCompanionContext with real persisted game data", async () => {
      await AsyncStorage.setItem("userId", "pat-bhaben");

      // Record 2 real game events
      await recordRawGameEvent({
        patientId: "pat-bhaben",
        gameId: "antakshari",
        payload: {
          gameName: "Antakshari & Song Recall",
          score: 92,
          accuracyPercent: 92,
          durationSeconds: 200,
        },
      });

      await recordRawGameEvent({
        patientId: "pat-bhaben",
        gameId: "matching",
        payload: {
          gameName: "Cultural Matching",
          score: 80,
          accuracyPercent: 85,
          durationSeconds: 120,
        },
      });

      // Get companion context
      const context = await getPatientCompanionContext("pat-bhaben");

      expect(context.patientId).toBe("pat-bhaben");
      expect(context.recentGames.length).toBeGreaterThanOrEqual(2);
      expect(context.gameInteractionSummary.gamesPlayedTodayCount).toBeGreaterThanOrEqual(2);
      expect(context.gameInteractionSummary.latestGameHighlight).toBeDefined();
      expect(context.profileReference.displayName).toBeDefined();
      expect(context.preferences.music.favoriteSongs).toContain("Manuhe Manuhor Babe");
    });
  });

  describe("3. Backward Compatibility & gameUtils Bridge", () => {
    it("automatically bridges saveGameResult to recordRawGameEvent without breaking legacy storage", async () => {
      await AsyncStorage.setItem("userId", "pat-bhaben");

      // Existing game calls saveGameResult
      await saveGameResult({
        gameId: 1, // "Select the colored balls"
        score: 90,
        duration: 45,
        date: new Date().toISOString().split("T")[0],
        details: { correctSelections: 9, wrongSelections: 1 },
      });

      // 1. Legacy storage still works
      const todayJson = await AsyncStorage.getItem("todayGameData");
      expect(todayJson).not.toBeNull();
      const todayData = JSON.parse(todayJson!);
      expect(todayData.games.length).toBeGreaterThan(0);
      expect(todayData.games[0].id).toBe(1);

      // 2. New unified persistent repository also has it!
      const repo = new AsyncStorageGameEventRepository();
      const events = await repo.getEvents({ gameId: 1 });
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].gameId).toBe(1);
      expect(events[0].payload.gameName).toBe("Select the colored balls");
      expect(events[0].payload.score).toBe(90);
    });
  });
});
