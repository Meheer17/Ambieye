import AsyncStorage from "@react-native-async-storage/async-storage";
import { gameSessionService } from "../gameSessionService";
import { companionContextService } from "@/services/companion/companionContextService";
import { caregiverStorage, CognitiveGameSession } from "@/utils/caregiverStorage";
import apiClient from "@/services/api/apiService";
import { ROUND_CONFIGS } from "@/app/(patient)/(stack)/games/cognitive/treasure-hunt";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("@/services/api/apiService", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

describe("Treasure Hunt (Visual Attention) Persistence Pipeline", () => {
  const mockSessionId = "sess_hunt_test_13579";
  const mockPatientId = "pat-bhaben";

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await AsyncStorage.setItem("userId", mockPatientId);
  });

  describe("1. Difficulty Progression & Grid Specifications", () => {
    it("configures 5 progressive rounds with exact target counts and grid item sizes", () => {
      expect(Object.keys(ROUND_CONFIGS).length).toBe(5);

      // Round 1: 2 targets / 6 items
      expect(ROUND_CONFIGS[1].targetCount).toBe(2);
      expect(ROUND_CONFIGS[1].totalItems).toBe(6);
      expect(ROUND_CONFIGS[1].targetEmoji).toBe("🌸");

      // Round 2: 3 targets / 9 items
      expect(ROUND_CONFIGS[2].targetCount).toBe(3);
      expect(ROUND_CONFIGS[2].totalItems).toBe(9);
      expect(ROUND_CONFIGS[2].targetEmoji).toBe("🍎");

      // Round 3: 3 targets / 12 items
      expect(ROUND_CONFIGS[3].targetCount).toBe(3);
      expect(ROUND_CONFIGS[3].totalItems).toBe(12);
      expect(ROUND_CONFIGS[3].targetEmoji).toBe("🐦");

      // Round 4: 4 targets / 12 items
      expect(ROUND_CONFIGS[4].targetCount).toBe(4);
      expect(ROUND_CONFIGS[4].totalItems).toBe(12);
      expect(ROUND_CONFIGS[4].targetEmoji).toBe("🫖");

      // Round 5: 4 targets / 15 items
      expect(ROUND_CONFIGS[5].targetCount).toBe(4);
      expect(ROUND_CONFIGS[5].totalItems).toBe(15);
      expect(ROUND_CONFIGS[5].targetEmoji).toBe("🌙");
    });
  });

  describe("2. GameSessionService Lifecycle", () => {
    it("starts a treasure_hunt session with metadata and records game_started event", async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          session: {
            sessionId: mockSessionId,
            patientId: mockPatientId,
            gameId: "treasure_hunt",
            status: "in_progress",
            duration: 0,
            startedAt: new Date().toISOString(),
          },
        },
      });

      const session = await gameSessionService.startSession({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "treasure_hunt",
        metadata: {
          gameTitle: "Treasure Hunt",
          totalRounds: 5,
          mode: "visual_selective_attention",
        },
      });

      expect(session.sessionId).toBe(mockSessionId);
      expect(session.gameId).toBe("treasure_hunt");
      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("/games/sessions"),
        expect.objectContaining({
          sessionId: mockSessionId,
          gameId: "treasure_hunt",
          metadata: expect.objectContaining({ totalRounds: 5 }),
        })
      );
    });

    it("records granular round events: round_started, hint_used, answer_submitted, answer_correct, answer_incorrect, round_completed", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true, event_id: "evt_hunt_1" },
      });

      const r1 = ROUND_CONFIGS[1];

      // 1. Round 1 started
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "treasure_hunt",
        eventType: "round_started",
        metadata: {
          round: 1,
          targetItem: r1.targetNameEn,
          targetEmoji: r1.targetEmoji,
          targetCount: r1.targetCount,
          totalItems: r1.totalItems,
          gridItems: ["Blossom Flower", "Blossom Flower", "Red Apple", "Car", "Phone", "Football"],
        },
      });

      // 2. Hint used
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "treasure_hunt",
        eventType: "hint_used",
        metadata: {
          round: 1,
          targetItem: r1.targetNameEn,
        },
      });

      // 3. Incorrect distractor tapped
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "treasure_hunt",
        eventType: "answer_submitted",
        metadata: {
          round: 1,
          targetItem: r1.targetNameEn,
          selectedItem: "Car",
          isCorrect: false,
          currentFound: 0,
          totalTargets: r1.targetCount,
          attempts: 1,
          responseTimeMs: 1800,
        },
      });

      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "treasure_hunt",
        eventType: "answer_incorrect",
        metadata: {
          round: 1,
          targetItem: r1.targetNameEn,
          selectedItem: "Car",
          attempts: 1,
          responseTimeMs: 1800,
        },
      });

      // 4. Correct target 1 tapped
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "treasure_hunt",
        eventType: "answer_submitted",
        metadata: {
          round: 1,
          targetItem: r1.targetNameEn,
          selectedItem: "Blossom Flower",
          isCorrect: true,
          currentFound: 1,
          totalTargets: r1.targetCount,
          attempts: 2,
          responseTimeMs: 3200,
        },
      });

      // 5. Correct target 2 tapped -> round complete
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "treasure_hunt",
        eventType: "answer_correct",
        metadata: {
          round: 1,
          targetItem: r1.targetNameEn,
          pointsEarned: 90,
          attempts: 3,
          responseTimeMs: 4800,
        },
      });

      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "treasure_hunt",
        eventType: "round_completed",
        metadata: {
          round: 1,
          targetItem: r1.targetNameEn,
          totalScore: 90,
        },
      });

      expect(apiClient.post).toHaveBeenCalledTimes(7);
    });

    it("completes the session in GameSessionService with final Game Score and metrics", async () => {
      (apiClient.put as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          session: {
            sessionId: mockSessionId,
            status: "completed",
            score: 485,
          },
        },
      });
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true },
      });

      const session = await gameSessionService.completeSession(mockSessionId, 485, {
        totalRounds: 5,
        durationSeconds: 68,
        accuracyPercent: 93,
        totalMistakes: 1,
      });

      expect(session?.status).toBe("completed");
      expect(session?.score).toBe(485);
      expect(apiClient.put).toHaveBeenCalledWith(
        expect.stringContaining(`/games/sessions/${mockSessionId}`),
        expect.objectContaining({
          status: "completed",
          score: 485,
        })
      );
    });

    it("abandons active session on early exit", async () => {
      (apiClient.put as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          session: {
            sessionId: mockSessionId,
            status: "abandoned",
          },
        },
      });
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true },
      });

      const session = await gameSessionService.abandonSession(mockSessionId, {
        reason: "patient_navigated_away",
      });

      expect(session?.status).toBe("abandoned");
      expect(apiClient.put).toHaveBeenCalledWith(
        expect.stringContaining(`/games/sessions/${mockSessionId}`),
        expect.objectContaining({ status: "abandoned" })
      );
    });
  });

  describe("3. Companion Context Persistence Bridge", () => {
    it("ingests real game_completed event with telemetry into durable companion storage", async () => {
      const rawEvent = await companionContextService.recordRawGameEvent({
        patientId: mockPatientId,
        gameId: "treasure_hunt",
        eventType: "game_completed",
        payload: {
          gameName: "Treasure Hunt",
          score: 485,
          durationSeconds: 68,
          accuracyPercent: 93,
          completed: true,
          difficulty: "Visual Attention & Search",
          metadata: {
            totalRounds: 5,
            totalMistakes: 1,
            targetsHunted: ["Blossom Flower", "Red Apple", "Songbird", "Tea Kettle", "Crescent Moon"],
          },
        },
      });

      expect(rawEvent.id).toBeDefined();
      expect(rawEvent.patientId).toBe(mockPatientId);
      expect(rawEvent.gameId).toBe("treasure_hunt");
      expect(rawEvent.eventType).toBe("game_completed");
      expect(rawEvent.payload.score).toBe(485);
      expect(rawEvent.payload.accuracyPercent).toBe(93);

      // Verify retrieval via getPersistedGameEvents
      const persistedEvents = await companionContextService.getPersistedGameEvents({
        gameId: "treasure_hunt",
      });
      expect(persistedEvents.length).toBeGreaterThanOrEqual(1);
      expect(persistedEvents[0].payload.gameName).toBe("Treasure Hunt");
      expect(persistedEvents[0].payload.score).toBe(485);
      expect(persistedEvents[0].payload.accuracyPercent).toBe(93);

      // Verify Companion Context aggregates recent game history
      const context = await companionContextService.getPatientCompanionContext(mockPatientId);
      expect(context.recentGames.length).toBeGreaterThan(0);
      expect(context.recentGames[0].gameId).toBe("treasure_hunt");
      expect(context.recentGames[0].completed).toBe(true);
      expect(context.recentGames[0].accuracyPercent).toBe(93);
    });
  });

  describe("4. Caregiver Dashboard Integration", () => {
    it("persists CognitiveGameSession and retrieves via caregiverStorage", async () => {
      const caregiverSession: CognitiveGameSession = {
        id: `sess-hunt-${Date.now()}`,
        gameName: "Treasure Hunt (Visual Attention)",
        iconEmoji: "💎",
        timestamp: "Today · 07:05 PM",
        durationMinutes: 2,
        score: 485,
        accuracyPercent: 93,
        mistakes: 1,
        responseTime: "Comfortable visual search pace",
        difficulty: "2 → 4 Targets (6 → 15 Item Grids)",
        difficultyChangeReason: "Progressed through selective visual search grids.",
        completed: true,
        humanSummary: "Completed all 5 visual search rounds (Flowers, Apples, Birds, Kettles, Moons) with 93% accuracy.",
      };

      await caregiverStorage.recordGameSession(caregiverSession);

      const allSessions = await caregiverStorage.getGameSessions();
      expect(allSessions.length).toBeGreaterThan(0);
      const saved = allSessions.find((s) => s.id === caregiverSession.id);
      expect(saved).toBeDefined();
      expect(saved?.gameName).toBe("Treasure Hunt (Visual Attention)");
      expect(saved?.score).toBe(485);
      expect(saved?.accuracyPercent).toBe(93);
      expect(saved?.humanSummary).toContain("93% accuracy");
    });
  });

  describe("5. Offline & Non-Blocking Resilience", () => {
    it("handles backend API network errors gracefully without crashing or throwing", async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error("Network Error"));
      (apiClient.put as jest.Mock).mockRejectedValue(new Error("Network Error"));

      // 1. Session start with offline fallback
      const session = await gameSessionService.startSession({
        sessionId: "sess_offline_hunt_1",
        gameId: "treasure_hunt",
      });
      expect(session.sessionId).toBe("sess_offline_hunt_1");
      expect(session.status).toBe("in_progress");

      // 2. Event recording with offline buffer
      const event = await gameSessionService.recordEvent({
        sessionId: "sess_offline_hunt_1",
        gameId: "treasure_hunt",
        eventType: "round_started",
        metadata: { round: 1 },
      });
      expect(event.sessionId).toBe("sess_offline_hunt_1");

      // 3. Companion context local persistence still succeeds
      const rawEvent = await companionContextService.recordRawGameEvent({
        gameId: "treasure_hunt",
        eventType: "game_completed",
        payload: { score: 450, completed: true },
      });
      expect(rawEvent.id).toBeDefined();

      // 4. Caregiver storage still succeeds locally
      await caregiverStorage.recordGameSession({
        id: "sess_offline_hunt_cg",
        gameName: "Treasure Hunt",
        iconEmoji: "💎",
        timestamp: "Today · 07:10 PM",
        durationMinutes: 1,
        score: 450,
        accuracyPercent: 90,
        mistakes: 1,
        responseTime: "Normal",
        difficulty: "2 → 4 Targets",
        difficultyChangeReason: "Normal",
        completed: true,
        humanSummary: "Completed session offline.",
      });

      const sessions = await caregiverStorage.getGameSessions();
      expect(sessions.some((s) => s.id === "sess_offline_hunt_cg")).toBe(true);
    });
  });
});
