import AsyncStorage from "@react-native-async-storage/async-storage";
import { gameSessionService } from "../gameSessionService";
import { companionContextService } from "@/services/companion/companionContextService";
import { caregiverStorage, CognitiveGameSession } from "@/utils/caregiverStorage";
import apiClient from "@/services/api/apiService";
import { RULE_ROUNDS } from "@/app/(patient)/(stack)/games/cognitive/rule-switch";

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

describe("Rule Switch (Change Your Mind) Persistence Pipeline", () => {
  const mockSessionId = "sess_switch_test_24680";
  const mockPatientId = "pat-bhaben";

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await AsyncStorage.setItem("userId", mockPatientId);
  });

  describe("1. Cognitive Rule Switching Specifications", () => {
    it("configures 5 distinct rule switching rounds across colors, shapes, and categories", () => {
      expect(Object.keys(RULE_ROUNDS).length).toBe(5);

      // Round 1: Color Red
      expect(RULE_ROUNDS[1].ruleType).toBe("color_red");
      expect(RULE_ROUNDS[1].targetCount).toBe(2);
      expect(RULE_ROUNDS[1].gridItems.filter((i) => i.isTarget).length).toBe(2);

      // Round 2: Circles
      expect(RULE_ROUNDS[2].ruleType).toBe("shape_circle");
      expect(RULE_ROUNDS[2].targetCount).toBe(3);
      expect(RULE_ROUNDS[2].gridItems.filter((i) => i.isTarget).length).toBe(3);

      // Round 3: Nature / Plants
      expect(RULE_ROUNDS[3].ruleType).toBe("category_nature");
      expect(RULE_ROUNDS[3].targetCount).toBe(3);
      expect(RULE_ROUNDS[3].gridItems.filter((i) => i.isTarget).length).toBe(3);

      // Round 4: Blue Color
      expect(RULE_ROUNDS[4].ruleType).toBe("color_blue");
      expect(RULE_ROUNDS[4].targetCount).toBe(3);
      expect(RULE_ROUNDS[4].gridItems.filter((i) => i.isTarget).length).toBe(3);

      // Round 5: Squares / Boxes
      expect(RULE_ROUNDS[5].ruleType).toBe("shape_square");
      expect(RULE_ROUNDS[5].targetCount).toBe(4);
      expect(RULE_ROUNDS[5].gridItems.filter((i) => i.isTarget).length).toBe(4);
    });
  });

  describe("2. GameSessionService Lifecycle", () => {
    it("starts a rule_switch session with metadata and records game_started event", async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          session: {
            sessionId: mockSessionId,
            patientId: mockPatientId,
            gameId: "rule_switch",
            status: "in_progress",
            duration: 0,
            startedAt: new Date().toISOString(),
          },
        },
      });

      const session = await gameSessionService.startSession({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "rule_switch",
        metadata: {
          gameTitle: "Change Your Mind (Rule Switch)",
          totalRounds: 5,
          mode: "cognitive_flexibility_rule_switching",
        },
      });

      expect(session.sessionId).toBe(mockSessionId);
      expect(session.gameId).toBe("rule_switch");
      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("/games/sessions"),
        expect.objectContaining({
          sessionId: mockSessionId,
          gameId: "rule_switch",
          metadata: expect.objectContaining({ totalRounds: 5 }),
        })
      );
    });

    it("records granular events: round_started, rule_presented, hint_used, item_selected, correct_selection, incorrect_selection, round_completed", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true, event_id: "evt_switch_1" },
      });

      const r1 = RULE_ROUNDS[1];

      // 1. Round 1 started
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "rule_switch",
        eventType: "round_started",
        metadata: {
          round: 1,
          ruleType: r1.ruleType,
          ruleDescription: r1.ruleTitleEn,
          targetCount: r1.targetCount,
          totalItems: r1.totalItems,
        },
      });

      // 2. Rule presented
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "rule_switch",
        eventType: "rule_presented",
        metadata: {
          round: 1,
          ruleType: r1.ruleType,
          ruleDescription: r1.ruleTitleEn,
        },
      });

      // 3. Hint used
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "rule_switch",
        eventType: "hint_used",
        metadata: {
          round: 1,
          ruleType: r1.ruleType,
        },
      });

      // 4. Incorrect selection (blue circle selected when red rule active)
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "rule_switch",
        eventType: "item_selected",
        metadata: {
          round: 1,
          ruleType: r1.ruleType,
          selectedItem: "Blue Circle",
          isCorrect: false,
          currentFound: 0,
          totalTargets: r1.targetCount,
          attempts: 1,
          responseTimeMs: 1900,
        },
      });

      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "rule_switch",
        eventType: "incorrect_selection",
        metadata: {
          round: 1,
          ruleType: r1.ruleType,
          selectedItem: "Blue Circle",
          attempts: 1,
          responseTimeMs: 1900,
        },
      });

      // 5. Correct selection (red apple)
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "rule_switch",
        eventType: "item_selected",
        metadata: {
          round: 1,
          ruleType: r1.ruleType,
          selectedItem: "Red Apple",
          isCorrect: true,
          currentFound: 1,
          totalTargets: r1.targetCount,
          attempts: 2,
          responseTimeMs: 3100,
        },
      });

      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "rule_switch",
        eventType: "correct_selection",
        metadata: {
          round: 1,
          ruleType: r1.ruleType,
          pointsEarned: 90,
          attempts: 2,
          responseTimeMs: 3100,
        },
      });

      // 6. Round completed
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "rule_switch",
        eventType: "round_completed",
        metadata: {
          round: 1,
          ruleType: r1.ruleType,
          totalScore: 90,
        },
      });

      expect(apiClient.post).toHaveBeenCalledTimes(8);
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

  describe("3. Companion Context Persistence Bridge", () => {
    it("ingests real game_completed event with telemetry into durable companion storage", async () => {
      const rawEvent = await companionContextService.recordRawGameEvent({
        patientId: mockPatientId,
        gameId: "rule_switch",
        eventType: "game_completed",
        payload: {
          gameName: "Change Your Mind (Rule Switch)",
          score: 480,
          durationSeconds: 65,
          accuracyPercent: 92,
          completed: true,
          difficulty: "Cognitive Flexibility & Rule Switching",
          metadata: {
            totalRounds: 5,
            totalMistakes: 1,
            rulesExercised: Object.values(RULE_ROUNDS).map((r) => r.ruleTitleEn),
          },
        },
      });

      expect(rawEvent.id).toBeDefined();
      expect(rawEvent.patientId).toBe(mockPatientId);
      expect(rawEvent.gameId).toBe("rule_switch");
      expect(rawEvent.eventType).toBe("game_completed");
      expect(rawEvent.payload.score).toBe(480);
      expect(rawEvent.payload.accuracyPercent).toBe(92);

      // Verify retrieval via getPersistedGameEvents
      const persistedEvents = await companionContextService.getPersistedGameEvents({
        gameId: "rule_switch",
      });
      expect(persistedEvents.length).toBeGreaterThanOrEqual(1);
      expect(persistedEvents[0].payload.gameName).toBe("Change Your Mind (Rule Switch)");
      expect(persistedEvents[0].payload.score).toBe(480);
      expect(persistedEvents[0].payload.accuracyPercent).toBe(92);

      // Verify Companion Context aggregates recent game history
      const context = await companionContextService.getPatientCompanionContext(mockPatientId);
      expect(context.recentGames.length).toBeGreaterThan(0);
      expect(context.recentGames[0].gameId).toBe("rule_switch");
      expect(context.recentGames[0].completed).toBe(true);
      expect(context.recentGames[0].accuracyPercent).toBe(92);
    });
  });

  describe("4. Caregiver Dashboard Integration", () => {
    it("persists CognitiveGameSession and retrieves via caregiverStorage", async () => {
      const caregiverSession: CognitiveGameSession = {
        id: `sess-switch-${Date.now()}`,
        gameName: "Rule Switch (Change Your Mind)",
        iconEmoji: "🔄",
        timestamp: "Today · 07:25 PM",
        durationMinutes: 2,
        score: 480,
        accuracyPercent: 92,
        mistakes: 1,
        responseTime: "Comfortable flexibility pace",
        difficulty: "5 Rule Switching Rounds",
        difficultyChangeReason: "Exercised rule switching and cognitive adaptability across colors, shapes, and categories.",
        completed: true,
        humanSummary: "Completed all 5 cognitive rule switching rounds (Red Color, Circles, Nature, Blue Color, Squares) with 92% accuracy.",
      };

      await caregiverStorage.recordGameSession(caregiverSession);

      const allSessions = await caregiverStorage.getGameSessions();
      expect(allSessions.length).toBeGreaterThan(0);
      const saved = allSessions.find((s) => s.id === caregiverSession.id);
      expect(saved).toBeDefined();
      expect(saved?.gameName).toBe("Rule Switch (Change Your Mind)");
      expect(saved?.score).toBe(480);
      expect(saved?.accuracyPercent).toBe(92);
      expect(saved?.humanSummary).toContain("92% accuracy");
    });
  });

  describe("5. Offline & Non-Blocking Resilience", () => {
    it("handles backend API network errors gracefully without crashing or throwing", async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error("Network Error"));
      (apiClient.put as jest.Mock).mockRejectedValue(new Error("Network Error"));

      // 1. Session start with offline fallback
      const session = await gameSessionService.startSession({
        sessionId: "sess_offline_switch_1",
        gameId: "rule_switch",
      });
      expect(session.sessionId).toBe("sess_offline_switch_1");
      expect(session.status).toBe("in_progress");

      // 2. Event recording with offline buffer
      const event = await gameSessionService.recordEvent({
        sessionId: "sess_offline_switch_1",
        gameId: "rule_switch",
        eventType: "round_started",
        metadata: { round: 1 },
      });
      expect(event.sessionId).toBe("sess_offline_switch_1");

      // 3. Companion context local persistence still succeeds
      const rawEvent = await companionContextService.recordRawGameEvent({
        gameId: "rule_switch",
        eventType: "game_completed",
        payload: { score: 450, completed: true },
      });
      expect(rawEvent.id).toBeDefined();

      // 4. Caregiver storage still succeeds locally
      await caregiverStorage.recordGameSession({
        id: "sess_offline_switch_cg",
        gameName: "Rule Switch",
        iconEmoji: "🔄",
        timestamp: "Today · 07:30 PM",
        durationMinutes: 1,
        score: 450,
        accuracyPercent: 90,
        mistakes: 1,
        responseTime: "Normal",
        difficulty: "5 Rules",
        difficultyChangeReason: "Normal",
        completed: true,
        humanSummary: "Completed session offline.",
      });

      const sessions = await caregiverStorage.getGameSessions();
      expect(sessions.some((s) => s.id === "sess_offline_switch_cg")).toBe(true);
    });
  });
});
