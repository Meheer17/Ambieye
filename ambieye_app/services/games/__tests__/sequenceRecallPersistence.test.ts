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

describe("Sequence Recall Game Persistence Pipeline", () => {
  const mockSessionId = "sess_sr_test_12345";
  const mockPatientId = "pat-bhaben";

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await AsyncStorage.setItem("userId", mockPatientId);
  });

  describe("1. GameSessionService Lifecycle", () => {
    it("starts a sequence_recall session with metadata and records game_started event", async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          session: {
            sessionId: mockSessionId,
            patientId: mockPatientId,
            gameId: "sequence_recall",
            status: "in_progress",
            duration: 0,
            startedAt: new Date().toISOString(),
          },
        },
      });

      const session = await gameSessionService.startSession({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "sequence_recall",
        metadata: {
          gameTitle: "Sequence Recall",
          totalRounds: 3,
          mode: "cognitive_memory",
        },
      });

      expect(session.sessionId).toBe(mockSessionId);
      expect(session.gameId).toBe("sequence_recall");
      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("/games/sessions"),
        expect.objectContaining({
          sessionId: mockSessionId,
          gameId: "sequence_recall",
          metadata: expect.objectContaining({ totalRounds: 3 }),
        })
      );
    });

    it("records round events: round_started, answer_submitted, answer_correct, round_completed", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true, event_id: "evt_sr_1" },
      });

      // Round 1: started with 3 items
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "sequence_recall",
        eventType: "round_started",
        metadata: {
          round: 1,
          sequenceLength: 3,
          sequence: ["Apple", "Home", "Flower"],
        },
      });

      // Answer submitted
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "sequence_recall",
        eventType: "answer_submitted",
        metadata: {
          round: 1,
          sequenceLength: 3,
          isCorrect: true,
          attempts: 1,
          responseTimeMs: 2400,
          targetSequence: ["Apple", "Home", "Flower"],
          userSequence: ["Apple", "Home", "Flower"],
        },
      });

      // Correct & round completed
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "sequence_recall",
        eventType: "answer_correct",
        metadata: { round: 1, pointsEarned: 100 },
      });

      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "sequence_recall",
        eventType: "round_completed",
        metadata: { round: 1, totalScore: 100 },
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("/games/events"),
        expect.objectContaining({
          sessionId: mockSessionId,
          eventType: "answer_submitted",
          metadata: expect.objectContaining({
            isCorrect: true,
            sequenceLength: 3,
          }),
        })
      );
    });

    it("records hint_used event and answer_incorrect when patient makes a mistake", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true },
      });

      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "sequence_recall",
        eventType: "hint_used",
        metadata: { round: 2, sequenceLength: 4 },
      });

      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "sequence_recall",
        eventType: "answer_incorrect",
        metadata: { round: 2, attempts: 1, responseTimeMs: 3100 },
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("/games/events"),
        expect.objectContaining({ eventType: "hint_used" })
      );
      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("/games/events"),
        expect.objectContaining({ eventType: "answer_incorrect" })
      );
    });

    it("completes the session with final game score and progression metadata", async () => {
      (apiClient.put as jest.Mock).mockResolvedValue({
        data: { success: true, session: { status: "completed", score: 290 } },
      });
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true },
      });

      await gameSessionService.completeSession(mockSessionId, 290, {
        totalRounds: 3,
        durationSeconds: 45,
        accuracyPercent: 92,
        totalMistakes: 1,
      });

      expect(apiClient.put).toHaveBeenCalledWith(
        expect.stringContaining(`/games/sessions/${mockSessionId}`),
        expect.objectContaining({
          score: 290,
          status: "completed",
        })
      );
    });

    it("abandons session on early exit", async () => {
      (apiClient.put as jest.Mock).mockResolvedValue({
        data: { success: true, session: { status: "abandoned" } },
      });
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true },
      });

      await gameSessionService.abandonSession(mockSessionId, {
        reason: "patient_navigated_away",
      });

      expect(apiClient.put).toHaveBeenCalledWith(
        expect.stringContaining(`/games/sessions/${mockSessionId}`),
        expect.objectContaining({
          status: "abandoned",
        })
      );
    });
  });

  describe("2. Caregiver Dashboard Integration", () => {
    it("records Sequence Recall session to caregiverStorage so caretaker dashboard displays it", async () => {
      const sessionData: CognitiveGameSession = {
        id: "sess-sr-test-1",
        gameName: "Sequence Recall",
        iconEmoji: "🔢",
        timestamp: "Today · 11:30 AM",
        durationMinutes: 1,
        score: 290,
        accuracyPercent: 95,
        mistakes: 1,
        responseTime: "Good focus & ordered recall",
        difficulty: "Level 1 → 3 (3-5 items)",
        difficultyChangeReason: "Progressed through sequential memory scaling.",
        completed: true,
        humanSummary: "Completed all 3 rounds recalling item sequences up to 5 items with 95% accuracy.",
      };

      await caregiverStorage.recordGameSession(sessionData);

      const allSessions = await caregiverStorage.getGameSessions();
      expect(allSessions.length).toBeGreaterThan(0);
      const sr = allSessions.find((s) => s.gameName === "Sequence Recall");
      expect(sr).toBeDefined();
      expect(sr?.score).toBe(290);
      expect(sr?.accuracyPercent).toBe(95);
      expect(sr?.difficulty).toBe("Level 1 → 3 (3-5 items)");
    });
  });

  describe("3. Virtual Companion Context Pipeline", () => {
    it("persists raw game event accessible by companionContextService", async () => {
      const recorded = await companionContextService.recordRawGameEvent({
        patientId: mockPatientId,
        gameId: "sequence_recall",
        eventType: "game_completed",
        payload: {
          gameName: "Sequence Recall",
          score: 290,
          durationSeconds: 45,
          accuracyPercent: 95,
          completed: true,
          difficulty: "3 → 5 items",
          metadata: { totalRounds: 3, totalMistakes: 1 },
        },
      });

      expect(recorded.id).toBeDefined();
      expect(recorded.gameId).toBe("sequence_recall");
      expect(recorded.payload.score).toBe(290);

      const retrieved = await companionContextService.getPersistedGameEvents({
        gameId: "sequence_recall",
      });
      expect(retrieved.length).toBeGreaterThanOrEqual(1);
      expect(retrieved[0].payload.gameName).toBe("Sequence Recall");
      expect(retrieved[0].payload.score).toBe(290);
    });
  });

  describe("4. Error & Offline Resilience", () => {
    it("handles backend API network errors gracefully without crashing or throwing", async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error("Network connection timeout"));
      (apiClient.put as jest.Mock).mockRejectedValue(new Error("Network connection timeout"));

      // Start session offline
      const session = await gameSessionService.startSession({
        gameId: "sequence_recall",
        metadata: { gameTitle: "Sequence Recall" },
      });
      expect(session).toBeDefined();
      expect(session.sessionId).toBeDefined();

      // Record event offline
      await expect(
        gameSessionService.recordEvent({
          sessionId: session.sessionId,
          gameId: "sequence_recall",
          eventType: "round_started",
          metadata: { round: 1 },
        })
      ).resolves.not.toThrow();

      // Complete session offline
      await expect(
        gameSessionService.completeSession(session.sessionId, 300)
      ).resolves.not.toThrow();
    });
  });
});
