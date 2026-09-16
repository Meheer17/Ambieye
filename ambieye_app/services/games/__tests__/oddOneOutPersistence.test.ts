import AsyncStorage from "@react-native-async-storage/async-storage";
import { gameSessionService } from "../gameSessionService";
import { companionContextService } from "@/services/companion/companionContextService";
import { caregiverStorage, CognitiveGameSession } from "@/utils/caregiverStorage";
import apiClient from "@/services/api/apiService";

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

describe("Odd One Out Game Persistence Pipeline", () => {
  const mockSessionId = "sess_ooo_test_12345";
  const mockPatientId = "pat-bhaben";

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await AsyncStorage.setItem("userId", mockPatientId);
  });

  describe("1. GameSessionService Lifecycle", () => {
    it("starts an odd_one_out session with metadata and records game_started event", async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          session: {
            sessionId: mockSessionId,
            patientId: mockPatientId,
            gameId: "odd_one_out",
            status: "in_progress",
            duration: 0,
            startedAt: new Date().toISOString(),
          },
        },
      });

      const session = await gameSessionService.startSession({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "odd_one_out",
        metadata: {
          gameTitle: "Odd One Out",
          totalRounds: 5,
          mode: "cognitive_attention",
        },
      });

      expect(session.sessionId).toBe(mockSessionId);
      expect(session.gameId).toBe("odd_one_out");
      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("/games/sessions"),
        expect.objectContaining({
          sessionId: mockSessionId,
          gameId: "odd_one_out",
          metadata: expect.objectContaining({ totalRounds: 5 }),
        })
      );
    });

    it("records granular round events: round_started, hint_used, answer_submitted, answer_correct, answer_incorrect, round_completed", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true, event_id: "evt_ooo_1" },
      });

      // 1. Round 1 started
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "odd_one_out",
        eventType: "round_started",
        metadata: {
          round: 1,
          difficulty: "easy",
          itemsCount: 4,
          oddItem: "Car",
          itemsShown: ["Apple", "Apple", "Car", "Apple"],
        },
      });

      // 2. Hint used
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "odd_one_out",
        eventType: "hint_used",
        metadata: {
          round: 1,
          difficulty: "easy",
        },
      });

      // 3. Incorrect answer submitted first
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "odd_one_out",
        eventType: "answer_submitted",
        metadata: {
          round: 1,
          selectedItem: "Apple",
          oddItem: "Car",
          isCorrect: false,
          attempts: 1,
          responseTimeMs: 1800,
        },
      });

      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "odd_one_out",
        eventType: "answer_incorrect",
        metadata: {
          round: 1,
          selectedItem: "Apple",
          attempts: 1,
          responseTimeMs: 1800,
        },
      });

      // 4. Correct answer submitted on retry
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "odd_one_out",
        eventType: "answer_submitted",
        metadata: {
          round: 1,
          selectedItem: "Car",
          oddItem: "Car",
          isCorrect: true,
          attempts: 2,
          responseTimeMs: 3200,
        },
      });

      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "odd_one_out",
        eventType: "answer_correct",
        metadata: {
          round: 1,
          pointsEarned: 90, // Hint used penalty
          attempts: 2,
          responseTimeMs: 3200,
        },
      });

      // 5. Round 1 completed
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "odd_one_out",
        eventType: "round_completed",
        metadata: {
          round: 1,
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
            score: 480,
          },
        },
      });
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true },
      });

      const session = await gameSessionService.completeSession(mockSessionId, 480, {
        totalRounds: 5,
        durationSeconds: 65,
        accuracyPercent: 92,
        totalMistakes: 1,
      });

      expect(session?.status).toBe("completed");
      expect(session?.score).toBe(480);
      expect(apiClient.put).toHaveBeenCalledWith(
        expect.stringContaining(`/games/sessions/${mockSessionId}`),
        expect.objectContaining({
          status: "completed",
          score: 480,
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

  describe("2. Companion Context Persistence Bridge", () => {
    it("ingests real game_completed event with telemetry into durable companion storage", async () => {
      const rawEvent = await companionContextService.recordRawGameEvent({
        patientId: mockPatientId,
        gameId: "odd_one_out",
        eventType: "game_completed",
        payload: {
          gameName: "Odd One Out",
          score: 480,
          durationSeconds: 65,
          accuracyPercent: 92,
          completed: true,
          difficulty: "5 Rounds (Easy → Mastery)",
          metadata: {
            totalRounds: 5,
            totalMistakes: 1,
          },
        },
      });

      expect(rawEvent.id).toBeDefined();
      expect(rawEvent.patientId).toBe(mockPatientId);
      expect(rawEvent.gameId).toBe("odd_one_out");
      expect(rawEvent.eventType).toBe("game_completed");
      expect(rawEvent.payload.score).toBe(480);
      expect(rawEvent.payload.accuracyPercent).toBe(92);

      // Verify retrieval via getPersistedGameEvents
      const persistedEvents = await companionContextService.getPersistedGameEvents({
        gameId: "odd_one_out",
      });
      expect(persistedEvents.length).toBeGreaterThanOrEqual(1);
      expect(persistedEvents[0].payload.gameName).toBe("Odd One Out");
      expect(persistedEvents[0].payload.score).toBe(480);
      expect(persistedEvents[0].payload.accuracyPercent).toBe(92);

      // Verify Companion Context aggregates recent game history
      const context = await companionContextService.getPatientCompanionContext(mockPatientId);
      expect(context.recentGames.length).toBeGreaterThan(0);
      expect(context.recentGames[0].gameId).toBe("odd_one_out");
      expect(context.recentGames[0].completed).toBe(true);
      expect(context.recentGames[0].accuracyPercent).toBe(92);
    });
  });

  describe("3. Caregiver Dashboard Integration", () => {
    it("persists CognitiveGameSession and retrieves via caregiverStorage", async () => {
      const caregiverSession: CognitiveGameSession = {
        id: `sess-ooo-${Date.now()}`,
        gameName: "Odd One Out",
        iconEmoji: "🔎",
        timestamp: "Today · 03:45 PM",
        durationMinutes: 2,
        score: 480,
        accuracyPercent: 92,
        mistakes: 1,
        responseTime: "Sharp visual focus",
        difficulty: "Level 1 → 5 (4-6 items)",
        difficultyChangeReason: "Progressed through subtle visual distinction scaling.",
        completed: true,
        humanSummary: "Completed all 5 rounds finding odd items across familiar objects and visual variants with 92% accuracy.",
      };

      await caregiverStorage.recordGameSession(caregiverSession);

      const allSessions = await caregiverStorage.getGameSessions();
      expect(allSessions.length).toBeGreaterThan(0);
      const saved = allSessions.find((s) => s.id === caregiverSession.id);
      expect(saved).toBeDefined();
      expect(saved?.gameName).toBe("Odd One Out");
      expect(saved?.score).toBe(480);
      expect(saved?.accuracyPercent).toBe(92);
      expect(saved?.humanSummary).toContain("92% accuracy");
    });
  });

  describe("4. Offline & Non-Blocking Resilience", () => {
    it("handles backend API network errors gracefully without crashing or throwing", async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error("Network Error"));
      (apiClient.put as jest.Mock).mockRejectedValue(new Error("Network Error"));

      // 1. Session start with offline fallback
      const session = await gameSessionService.startSession({
        sessionId: "sess_offline_1",
        gameId: "odd_one_out",
      });
      expect(session.sessionId).toBe("sess_offline_1");
      expect(session.status).toBe("in_progress");

      // 2. Event recording with offline buffer
      const event = await gameSessionService.recordEvent({
        sessionId: "sess_offline_1",
        gameId: "odd_one_out",
        eventType: "round_started",
        metadata: { round: 1 },
      });
      expect(event.sessionId).toBe("sess_offline_1");

      // 3. Companion context local persistence still succeeds
      const rawEvent = await companionContextService.recordRawGameEvent({
        gameId: "odd_one_out",
        eventType: "game_completed",
        payload: { score: 450, completed: true },
      });
      expect(rawEvent.id).toBeDefined();

      // 4. Caregiver storage still succeeds locally
      await caregiverStorage.recordGameSession({
        id: "sess_offline_cg",
        gameName: "Odd One Out",
        iconEmoji: "🔎",
        timestamp: "Today · 03:50 PM",
        durationMinutes: 1,
        score: 450,
        accuracyPercent: 90,
        mistakes: 1,
        responseTime: "Normal",
        difficulty: "Level 1 → 5",
        difficultyChangeReason: "Normal",
        completed: true,
        humanSummary: "Completed session offline.",
      });

      const sessions = await caregiverStorage.getGameSessions();
      expect(sessions.some((s) => s.id === "sess_offline_cg")).toBe(true);
    });
  });
});
