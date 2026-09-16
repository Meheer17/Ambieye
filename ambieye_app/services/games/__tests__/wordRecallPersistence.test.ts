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

describe("Word Recall Game Persistence Pipeline", () => {
  const mockSessionId = "sess_wr_test_12345";
  const mockPatientId = "pat-bhaben";

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await AsyncStorage.setItem("userId", mockPatientId);
  });

  describe("1. GameSessionService Lifecycle", () => {
    it("starts a word_recall session with metadata and records game_started event", async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          session: {
            sessionId: mockSessionId,
            patientId: mockPatientId,
            gameId: "word_recall",
            status: "in_progress",
            duration: 0,
            startedAt: new Date().toISOString(),
          },
        },
      });

      const session = await gameSessionService.startSession({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "word_recall",
        metadata: {
          gameTitle: "Word Recall",
          totalRounds: 5,
          mode: "cognitive_memory",
        },
      });

      expect(session.sessionId).toBe(mockSessionId);
      expect(session.gameId).toBe("word_recall");
      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("/games/sessions"),
        expect.objectContaining({
          sessionId: mockSessionId,
          gameId: "word_recall",
          metadata: expect.objectContaining({ totalRounds: 5 }),
        })
      );
    });

    it("records granular round events: round_started, hint_used, answer_submitted, answer_correct, answer_incorrect, round_completed", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true, event_id: "evt_wr_1" },
      });

      // 1. Round 1 started with 3 words
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "word_recall",
        eventType: "round_started",
        metadata: {
          round: 1,
          difficulty: "easy",
          wordsCount: 3,
          wordsShown: ["APPLE", "FLOWER", "HOUSE"],
          targetWord: "FLOWER",
        },
      });

      // 2. Hint used
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "word_recall",
        eventType: "hint_used",
        metadata: {
          round: 1,
          targetWord: "FLOWER",
        },
      });

      // 3. Incorrect answer first
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "word_recall",
        eventType: "answer_submitted",
        metadata: {
          round: 1,
          selectedWord: "BREAD",
          targetWord: "FLOWER",
          isCorrect: false,
          attempts: 1,
          responseTimeMs: 2200,
        },
      });

      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "word_recall",
        eventType: "answer_incorrect",
        metadata: {
          round: 1,
          selectedWord: "BREAD",
          targetWord: "FLOWER",
          attempts: 1,
          responseTimeMs: 2200,
        },
      });

      // 4. Correct answer on retry
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "word_recall",
        eventType: "answer_submitted",
        metadata: {
          round: 1,
          selectedWord: "FLOWER",
          targetWord: "FLOWER",
          isCorrect: true,
          attempts: 2,
          responseTimeMs: 3900,
        },
      });

      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "word_recall",
        eventType: "answer_correct",
        metadata: {
          round: 1,
          pointsEarned: 90,
          attempts: 2,
          responseTimeMs: 3900,
        },
      });

      // 5. Round 1 completed
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "word_recall",
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
            score: 470,
          },
        },
      });
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true },
      });

      const session = await gameSessionService.completeSession(mockSessionId, 470, {
        totalRounds: 5,
        durationSeconds: 75,
        accuracyPercent: 91,
        totalMistakes: 1,
      });

      expect(session?.status).toBe("completed");
      expect(session?.score).toBe(470);
      expect(apiClient.put).toHaveBeenCalledWith(
        expect.stringContaining(`/games/sessions/${mockSessionId}`),
        expect.objectContaining({
          status: "completed",
          score: 470,
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
        gameId: "word_recall",
        eventType: "game_completed",
        payload: {
          gameName: "Word Recall",
          score: 470,
          durationSeconds: 75,
          accuracyPercent: 91,
          completed: true,
          difficulty: "3 → 5 words",
          metadata: {
            totalRounds: 5,
            totalMistakes: 1,
          },
        },
      });

      expect(rawEvent.id).toBeDefined();
      expect(rawEvent.patientId).toBe(mockPatientId);
      expect(rawEvent.gameId).toBe("word_recall");
      expect(rawEvent.eventType).toBe("game_completed");
      expect(rawEvent.payload.score).toBe(470);
      expect(rawEvent.payload.accuracyPercent).toBe(91);

      // Verify retrieval via getPersistedGameEvents
      const persistedEvents = await companionContextService.getPersistedGameEvents({
        gameId: "word_recall",
      });
      expect(persistedEvents.length).toBeGreaterThanOrEqual(1);
      expect(persistedEvents[0].payload.gameName).toBe("Word Recall");
      expect(persistedEvents[0].payload.score).toBe(470);
      expect(persistedEvents[0].payload.accuracyPercent).toBe(91);

      // Verify Companion Context aggregates recent game history
      const context = await companionContextService.getPatientCompanionContext(mockPatientId);
      expect(context.recentGames.length).toBeGreaterThan(0);
      expect(context.recentGames[0].gameId).toBe("word_recall");
      expect(context.recentGames[0].completed).toBe(true);
      expect(context.recentGames[0].accuracyPercent).toBe(91);
    });
  });

  describe("3. Caregiver Dashboard Integration", () => {
    it("persists CognitiveGameSession and retrieves via caregiverStorage", async () => {
      const caregiverSession: CognitiveGameSession = {
        id: `sess-wr-${Date.now()}`,
        gameName: "Word Recall",
        iconEmoji: "📖",
        timestamp: "Today · 04:45 PM",
        durationMinutes: 2,
        score: 470,
        accuracyPercent: 91,
        mistakes: 1,
        responseTime: "Thoughtful verbal recall",
        difficulty: "Level 1 → 5 (3-5 words)",
        difficultyChangeReason: "Progressed through verbal memory span scaling.",
        completed: true,
        humanSummary: "Completed all 5 rounds recalling visual words across increasing list sizes with 91% accuracy.",
      };

      await caregiverStorage.recordGameSession(caregiverSession);

      const allSessions = await caregiverStorage.getGameSessions();
      expect(allSessions.length).toBeGreaterThan(0);
      const saved = allSessions.find((s) => s.id === caregiverSession.id);
      expect(saved).toBeDefined();
      expect(saved?.gameName).toBe("Word Recall");
      expect(saved?.score).toBe(470);
      expect(saved?.accuracyPercent).toBe(91);
      expect(saved?.humanSummary).toContain("91% accuracy");
    });
  });

  describe("4. Offline & Non-Blocking Resilience", () => {
    it("handles backend API network errors gracefully without crashing or throwing", async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error("Network Error"));
      (apiClient.put as jest.Mock).mockRejectedValue(new Error("Network Error"));

      // 1. Session start with offline fallback
      const session = await gameSessionService.startSession({
        sessionId: "sess_offline_wr_1",
        gameId: "word_recall",
      });
      expect(session.sessionId).toBe("sess_offline_wr_1");
      expect(session.status).toBe("in_progress");

      // 2. Event recording with offline buffer
      const event = await gameSessionService.recordEvent({
        sessionId: "sess_offline_wr_1",
        gameId: "word_recall",
        eventType: "round_started",
        metadata: { round: 1 },
      });
      expect(event.sessionId).toBe("sess_offline_wr_1");

      // 3. Companion context local persistence still succeeds
      const rawEvent = await companionContextService.recordRawGameEvent({
        gameId: "word_recall",
        eventType: "game_completed",
        payload: { score: 450, completed: true },
      });
      expect(rawEvent.id).toBeDefined();

      // 4. Caregiver storage still succeeds locally
      await caregiverStorage.recordGameSession({
        id: "sess_offline_wr_cg",
        gameName: "Word Recall",
        iconEmoji: "📖",
        timestamp: "Today · 04:50 PM",
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
      expect(sessions.some((s) => s.id === "sess_offline_wr_cg")).toBe(true);
    });
  });
});
