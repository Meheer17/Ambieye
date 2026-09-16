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

describe("Number Order Game Persistence Pipeline", () => {
  const mockSessionId = "sess_no_test_12345";
  const mockPatientId = "pat-bhaben";

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await AsyncStorage.setItem("userId", mockPatientId);
  });

  describe("1. GameSessionService Lifecycle", () => {
    it("starts a number_order session with metadata and records game_started event", async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          session: {
            sessionId: mockSessionId,
            patientId: mockPatientId,
            gameId: "number_order",
            status: "in_progress",
            duration: 0,
            startedAt: new Date().toISOString(),
          },
        },
      });

      const session = await gameSessionService.startSession({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "number_order",
        metadata: {
          gameTitle: "Number Order",
          totalRounds: 5,
          mode: "cognitive_numeracy_attention",
        },
      });

      expect(session.sessionId).toBe(mockSessionId);
      expect(session.gameId).toBe("number_order");
      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("/games/sessions"),
        expect.objectContaining({
          sessionId: mockSessionId,
          gameId: "number_order",
          metadata: expect.objectContaining({ totalRounds: 5 }),
        })
      );
    });

    it("records granular round events: round_started, hint_used, answer_submitted, answer_correct, answer_incorrect, round_completed", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true, event_id: "evt_no_1" },
      });

      // 1. Round 1 started with 4 numbers
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "number_order",
        eventType: "round_started",
        metadata: {
          round: 1,
          difficulty: "easy",
          count: 4,
          numbersShown: [7, 2, 9, 4],
          correctOrdering: [2, 4, 7, 9],
        },
      });

      // 2. Hint used
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "number_order",
        eventType: "hint_used",
        metadata: {
          round: 1,
          nextExpectedValue: 2,
        },
      });

      // 3. Incorrect tap first
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "number_order",
        eventType: "answer_submitted",
        metadata: {
          round: 1,
          tappedValue: 7,
          expectedValue: 2,
          isCorrect: false,
          attempts: 1,
          responseTimeMs: 1500,
        },
      });

      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "number_order",
        eventType: "answer_incorrect",
        metadata: {
          round: 1,
          tappedValue: 7,
          expectedValue: 2,
          attempts: 1,
          responseTimeMs: 1500,
        },
      });

      // 4. Correct sequence tapped
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "number_order",
        eventType: "answer_submitted",
        metadata: {
          round: 1,
          selectedOrdering: [2, 4, 7, 9],
          correctOrdering: [2, 4, 7, 9],
          isCorrect: true,
          attempts: 2,
          responseTimeMs: 3800,
        },
      });

      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "number_order",
        eventType: "answer_correct",
        metadata: {
          round: 1,
          pointsEarned: 90,
          attempts: 2,
          responseTimeMs: 3800,
        },
      });

      // 5. Round 1 completed
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "number_order",
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
            score: 490,
          },
        },
      });
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true },
      });

      const session = await gameSessionService.completeSession(mockSessionId, 490, {
        totalRounds: 5,
        durationSeconds: 70,
        accuracyPercent: 94,
        totalMistakes: 1,
      });

      expect(session?.status).toBe("completed");
      expect(session?.score).toBe(490);
      expect(apiClient.put).toHaveBeenCalledWith(
        expect.stringContaining(`/games/sessions/${mockSessionId}`),
        expect.objectContaining({
          status: "completed",
          score: 490,
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
        gameId: "number_order",
        eventType: "game_completed",
        payload: {
          gameName: "Number Order",
          score: 490,
          durationSeconds: 70,
          accuracyPercent: 94,
          completed: true,
          difficulty: "4 → 6 numbers (1–99)",
          metadata: {
            totalRounds: 5,
            totalMistakes: 1,
          },
        },
      });

      expect(rawEvent.id).toBeDefined();
      expect(rawEvent.patientId).toBe(mockPatientId);
      expect(rawEvent.gameId).toBe("number_order");
      expect(rawEvent.eventType).toBe("game_completed");
      expect(rawEvent.payload.score).toBe(490);
      expect(rawEvent.payload.accuracyPercent).toBe(94);

      // Verify retrieval via getPersistedGameEvents
      const persistedEvents = await companionContextService.getPersistedGameEvents({
        gameId: "number_order",
      });
      expect(persistedEvents.length).toBeGreaterThanOrEqual(1);
      expect(persistedEvents[0].payload.gameName).toBe("Number Order");
      expect(persistedEvents[0].payload.score).toBe(490);
      expect(persistedEvents[0].payload.accuracyPercent).toBe(94);

      // Verify Companion Context aggregates recent game history
      const context = await companionContextService.getPatientCompanionContext(mockPatientId);
      expect(context.recentGames.length).toBeGreaterThan(0);
      expect(context.recentGames[0].gameId).toBe("number_order");
      expect(context.recentGames[0].completed).toBe(true);
      expect(context.recentGames[0].accuracyPercent).toBe(94);
    });
  });

  describe("3. Caregiver Dashboard Integration", () => {
    it("persists CognitiveGameSession and retrieves via caregiverStorage", async () => {
      const caregiverSession: CognitiveGameSession = {
        id: `sess-no-${Date.now()}`,
        gameName: "Number Order",
        iconEmoji: "🔢",
        timestamp: "Today · 04:15 PM",
        durationMinutes: 2,
        score: 490,
        accuracyPercent: 94,
        mistakes: 1,
        responseTime: "Calm numerical sequencing",
        difficulty: "Level 1 → 5 (4-6 numbers)",
        difficultyChangeReason: "Progressed through sequential numerical magnitude scaling.",
        completed: true,
        humanSummary: "Completed all 5 rounds ordering numbers from smallest to largest with 94% accuracy.",
      };

      await caregiverStorage.recordGameSession(caregiverSession);

      const allSessions = await caregiverStorage.getGameSessions();
      expect(allSessions.length).toBeGreaterThan(0);
      const saved = allSessions.find((s) => s.id === caregiverSession.id);
      expect(saved).toBeDefined();
      expect(saved?.gameName).toBe("Number Order");
      expect(saved?.score).toBe(490);
      expect(saved?.accuracyPercent).toBe(94);
      expect(saved?.humanSummary).toContain("94% accuracy");
    });
  });

  describe("4. Offline & Non-Blocking Resilience", () => {
    it("handles backend API network errors gracefully without crashing or throwing", async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error("Network Error"));
      (apiClient.put as jest.Mock).mockRejectedValue(new Error("Network Error"));

      // 1. Session start with offline fallback
      const session = await gameSessionService.startSession({
        sessionId: "sess_offline_no_1",
        gameId: "number_order",
      });
      expect(session.sessionId).toBe("sess_offline_no_1");
      expect(session.status).toBe("in_progress");

      // 2. Event recording with offline buffer
      const event = await gameSessionService.recordEvent({
        sessionId: "sess_offline_no_1",
        gameId: "number_order",
        eventType: "round_started",
        metadata: { round: 1 },
      });
      expect(event.sessionId).toBe("sess_offline_no_1");

      // 3. Companion context local persistence still succeeds
      const rawEvent = await companionContextService.recordRawGameEvent({
        gameId: "number_order",
        eventType: "game_completed",
        payload: { score: 460, completed: true },
      });
      expect(rawEvent.id).toBeDefined();

      // 4. Caregiver storage still succeeds locally
      await caregiverStorage.recordGameSession({
        id: "sess_offline_no_cg",
        gameName: "Number Order",
        iconEmoji: "🔢",
        timestamp: "Today · 04:20 PM",
        durationMinutes: 1,
        score: 460,
        accuracyPercent: 92,
        mistakes: 1,
        responseTime: "Normal",
        difficulty: "Level 1 → 5",
        difficultyChangeReason: "Normal",
        completed: true,
        humanSummary: "Completed session offline.",
      });

      const sessions = await caregiverStorage.getGameSessions();
      expect(sessions.some((s) => s.id === "sess_offline_no_cg")).toBe(true);
    });
  });
});
