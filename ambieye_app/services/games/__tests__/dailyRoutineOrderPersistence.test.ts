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

describe("Daily Routine Order Game Persistence Pipeline", () => {
  const mockSessionId = "sess_dro_test_12345";
  const mockPatientId = "pat-bhaben";

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await AsyncStorage.setItem("userId", mockPatientId);
  });

  describe("1. GameSessionService Lifecycle", () => {
    it("starts a daily_routine_order session with metadata and records game_started event", async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          session: {
            sessionId: mockSessionId,
            patientId: mockPatientId,
            gameId: "daily_routine_order",
            status: "in_progress",
            duration: 0,
            startedAt: new Date().toISOString(),
          },
        },
      });

      const session = await gameSessionService.startSession({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "daily_routine_order",
        metadata: {
          gameTitle: "Daily Routine Order",
          totalRounds: 5,
          mode: "cognitive_sequencing",
        },
      });

      expect(session.sessionId).toBe(mockSessionId);
      expect(session.gameId).toBe("daily_routine_order");
      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("/games/sessions"),
        expect.objectContaining({
          sessionId: mockSessionId,
          gameId: "daily_routine_order",
          metadata: expect.objectContaining({ totalRounds: 5 }),
        })
      );
    });

    it("records granular round events: round_started, hint_used, answer_submitted, answer_correct, answer_incorrect, round_completed", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true, event_id: "evt_dro_1" },
      });

      // 1. Round 1 started with 4 activities
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "daily_routine_order",
        eventType: "round_started",
        metadata: {
          round: 1,
          difficulty: "easy",
          routineTitle: "Morning Wake Up Routine",
          activitiesCount: 4,
          activitiesShown: [
            "Eat morning breakfast",
            "Wake up in bed",
            "Brush your teeth",
            "Get dressed",
          ],
          expectedOrder: [
            "Wake up in bed",
            "Brush your teeth",
            "Get dressed",
            "Eat morning breakfast",
          ],
        },
      });

      // 2. Hint used
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "daily_routine_order",
        eventType: "hint_used",
        metadata: {
          round: 1,
          nextExpectedStep: "Wake up in bed",
          stepNumber: 1,
        },
      });

      // 3. Incorrect step first
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "daily_routine_order",
        eventType: "answer_submitted",
        metadata: {
          round: 1,
          tappedActivity: "Eat morning breakfast",
          expectedStepOrder: 1,
          isCorrect: false,
          attempts: 1,
          responseTimeMs: 2100,
        },
      });

      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "daily_routine_order",
        eventType: "answer_incorrect",
        metadata: {
          round: 1,
          tappedActivity: "Eat morning breakfast",
          attempts: 1,
          responseTimeMs: 2100,
        },
      });

      // 4. Correct sequence completed
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "daily_routine_order",
        eventType: "answer_submitted",
        metadata: {
          round: 1,
          selectedOrder: [
            "Wake up in bed",
            "Brush your teeth",
            "Get dressed",
            "Eat morning breakfast",
          ],
          expectedOrder: [
            "Wake up in bed",
            "Brush your teeth",
            "Get dressed",
            "Eat morning breakfast",
          ],
          isCorrect: true,
          attempts: 2,
          responseTimeMs: 4200,
        },
      });

      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "daily_routine_order",
        eventType: "answer_correct",
        metadata: {
          round: 1,
          pointsEarned: 90,
          attempts: 2,
          responseTimeMs: 4200,
        },
      });

      // 5. Round 1 completed
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "daily_routine_order",
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
        durationSeconds: 80,
        accuracyPercent: 93,
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
        gameId: "daily_routine_order",
        eventType: "game_completed",
        payload: {
          gameName: "Daily Routine Order",
          score: 480,
          durationSeconds: 80,
          accuracyPercent: 93,
          completed: true,
          difficulty: "4 → 5 activities",
          metadata: {
            totalRounds: 5,
            totalMistakes: 1,
          },
        },
      });

      expect(rawEvent.id).toBeDefined();
      expect(rawEvent.patientId).toBe(mockPatientId);
      expect(rawEvent.gameId).toBe("daily_routine_order");
      expect(rawEvent.eventType).toBe("game_completed");
      expect(rawEvent.payload.score).toBe(480);
      expect(rawEvent.payload.accuracyPercent).toBe(93);

      // Verify retrieval via getPersistedGameEvents
      const persistedEvents = await companionContextService.getPersistedGameEvents({
        gameId: "daily_routine_order",
      });
      expect(persistedEvents.length).toBeGreaterThanOrEqual(1);
      expect(persistedEvents[0].payload.gameName).toBe("Daily Routine Order");
      expect(persistedEvents[0].payload.score).toBe(480);
      expect(persistedEvents[0].payload.accuracyPercent).toBe(93);

      // Verify Companion Context aggregates recent game history
      const context = await companionContextService.getPatientCompanionContext(mockPatientId);
      expect(context.recentGames.length).toBeGreaterThan(0);
      expect(context.recentGames[0].gameId).toBe("daily_routine_order");
      expect(context.recentGames[0].completed).toBe(true);
      expect(context.recentGames[0].accuracyPercent).toBe(93);
    });
  });

  describe("3. Caregiver Dashboard Integration", () => {
    it("persists CognitiveGameSession and retrieves via caregiverStorage", async () => {
      const caregiverSession: CognitiveGameSession = {
        id: `sess-dro-${Date.now()}`,
        gameName: "Daily Routine Order",
        iconEmoji: "📋",
        timestamp: "Today · 05:15 PM",
        durationMinutes: 2,
        score: 480,
        accuracyPercent: 93,
        mistakes: 1,
        responseTime: "Thoughtful daily sequencing",
        difficulty: "Level 1 → 5 (4-5 activities)",
        difficultyChangeReason: "Progressed through chronological routine sequencing.",
        completed: true,
        humanSummary: "Completed all 5 rounds arranging familiar daily activities in chronological order with 93% accuracy.",
      };

      await caregiverStorage.recordGameSession(caregiverSession);

      const allSessions = await caregiverStorage.getGameSessions();
      expect(allSessions.length).toBeGreaterThan(0);
      const saved = allSessions.find((s) => s.id === caregiverSession.id);
      expect(saved).toBeDefined();
      expect(saved?.gameName).toBe("Daily Routine Order");
      expect(saved?.score).toBe(480);
      expect(saved?.accuracyPercent).toBe(93);
      expect(saved?.humanSummary).toContain("93% accuracy");
    });
  });

  describe("4. Offline & Non-Blocking Resilience", () => {
    it("handles backend API network errors gracefully without crashing or throwing", async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error("Network Error"));
      (apiClient.put as jest.Mock).mockRejectedValue(new Error("Network Error"));

      // 1. Session start with offline fallback
      const session = await gameSessionService.startSession({
        sessionId: "sess_offline_dro_1",
        gameId: "daily_routine_order",
      });
      expect(session.sessionId).toBe("sess_offline_dro_1");
      expect(session.status).toBe("in_progress");

      // 2. Event recording with offline buffer
      const event = await gameSessionService.recordEvent({
        sessionId: "sess_offline_dro_1",
        gameId: "daily_routine_order",
        eventType: "round_started",
        metadata: { round: 1 },
      });
      expect(event.sessionId).toBe("sess_offline_dro_1");

      // 3. Companion context local persistence still succeeds
      const rawEvent = await companionContextService.recordRawGameEvent({
        gameId: "daily_routine_order",
        eventType: "game_completed",
        payload: { score: 450, completed: true },
      });
      expect(rawEvent.id).toBeDefined();

      // 4. Caregiver storage still succeeds locally
      await caregiverStorage.recordGameSession({
        id: "sess_offline_dro_cg",
        gameName: "Daily Routine Order",
        iconEmoji: "📋",
        timestamp: "Today · 05:20 PM",
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
      expect(sessions.some((s) => s.id === "sess_offline_dro_cg")).toBe(true);
    });
  });
});
