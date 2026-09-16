import AsyncStorage from "@react-native-async-storage/async-storage";
import { gameSessionService } from "../gameSessionService";
import { companionContextService } from "@/services/companion/companionContextService";
import { caregiverStorage, CognitiveGameSession } from "@/utils/caregiverStorage";
import apiClient from "@/services/api/apiService";
import { SCENARIOS } from "@/app/(patient)/(stack)/games/cognitive/plan-and-do";

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

describe("Plan & Do (Executive Action Planning) Persistence Pipeline", () => {
  const mockSessionId = "sess_plan_test_54321";
  const mockPatientId = "pat-bhaben";

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await AsyncStorage.setItem("userId", mockPatientId);
  });

  describe("1. Scenario Structure & Difficulty Progression", () => {
    it("provides exactly 5 scenarios with progressive action length (4 to 5 actions)", () => {
      expect(SCENARIOS.length).toBe(5);

      // Scenarios 1-3 have 4 actions
      expect(SCENARIOS[0].totalSteps).toBe(4);
      expect(SCENARIOS[1].totalSteps).toBe(4);
      expect(SCENARIOS[2].totalSteps).toBe(4);

      // Scenarios 4-5 have 5 actions
      expect(SCENARIOS[3].totalSteps).toBe(5);
      expect(SCENARIOS[4].totalSteps).toBe(5);

      // Verify each scenario has strictly ordered step numbers 1..N
      SCENARIOS.forEach((sc) => {
        expect(sc.expectedSteps.length).toBe(sc.totalSteps);
        const stepNumbers = sc.expectedSteps.map((s) => s.stepNumber);
        const expectedNumbers = Array.from({ length: sc.totalSteps }, (_, i) => i + 1);
        expect(stepNumbers).toEqual(expectedNumbers);
      });
    });
  });

  describe("2. GameSessionService Lifecycle", () => {
    it("starts a plan_and_do session with metadata and records game_started event", async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          session: {
            sessionId: mockSessionId,
            patientId: mockPatientId,
            gameId: "plan_and_do",
            status: "in_progress",
            duration: 0,
            startedAt: new Date().toISOString(),
          },
        },
      });

      const session = await gameSessionService.startSession({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "plan_and_do",
        metadata: {
          gameTitle: "Plan & Do",
          totalRounds: 5,
          mode: "executive_planning_sequencing",
        },
      });

      expect(session.sessionId).toBe(mockSessionId);
      expect(session.gameId).toBe("plan_and_do");
      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("/games/sessions"),
        expect.objectContaining({
          sessionId: mockSessionId,
          gameId: "plan_and_do",
          metadata: expect.objectContaining({ totalRounds: 5 }),
        })
      );
    });

    it("records granular round events: round_started, hint_used, answer_submitted, answer_correct, answer_incorrect, round_completed", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true, event_id: "evt_plan_1" },
      });

      const firstScenario = SCENARIOS[0];

      // 1. Round 1 started
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "plan_and_do",
        eventType: "round_started",
        metadata: {
          round: 1,
          scenario: firstScenario.titleEn,
          totalSteps: firstScenario.totalSteps,
          availableActions: firstScenario.expectedSteps.map((s) => s.textEn),
          expectedOrder: firstScenario.expectedSteps.map((s) => s.textEn),
        },
      });

      // 2. Hint used
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "plan_and_do",
        eventType: "hint_used",
        metadata: {
          round: 1,
          scenario: firstScenario.titleEn,
        },
      });

      // 3. Incorrect action step first (e.g. step 3 tapped when step 1 expected)
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "plan_and_do",
        eventType: "answer_submitted",
        metadata: {
          round: 1,
          scenario: firstScenario.titleEn,
          selectedStep: firstScenario.expectedSteps[2].textEn,
          expectedStepNumber: 1,
          actualStepNumber: 3,
          isCorrect: false,
          attempts: 1,
          responseTimeMs: 2400,
        },
      });

      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "plan_and_do",
        eventType: "answer_incorrect",
        metadata: {
          round: 1,
          scenario: firstScenario.titleEn,
          selectedStep: firstScenario.expectedSteps[2].textEn,
          expectedStepNumber: 1,
          attempts: 1,
          responseTimeMs: 2400,
        },
      });

      // 4. Correct action step tapped (step 1)
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "plan_and_do",
        eventType: "answer_submitted",
        metadata: {
          round: 1,
          scenario: firstScenario.titleEn,
          selectedStep: firstScenario.expectedSteps[0].textEn,
          expectedStepNumber: 1,
          actualStepNumber: 1,
          isCorrect: true,
          attempts: 2,
          responseTimeMs: 4100,
        },
      });

      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "plan_and_do",
        eventType: "answer_correct",
        metadata: {
          round: 1,
          scenario: firstScenario.titleEn,
          pointsEarned: 90,
          attempts: 2,
          responseTimeMs: 4100,
        },
      });

      // 5. Round 1 completed
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "plan_and_do",
        eventType: "round_completed",
        metadata: {
          round: 1,
          scenario: firstScenario.titleEn,
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
        durationSeconds: 72,
        accuracyPercent: 91,
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
        gameId: "plan_and_do",
        eventType: "game_completed",
        payload: {
          gameName: "Plan & Do",
          score: 480,
          durationSeconds: 72,
          accuracyPercent: 91,
          completed: true,
          difficulty: "Executive Action Planning",
          metadata: {
            totalRounds: 5,
            totalMistakes: 1,
            scenariosCompleted: SCENARIOS.map((s) => s.titleEn),
          },
        },
      });

      expect(rawEvent.id).toBeDefined();
      expect(rawEvent.patientId).toBe(mockPatientId);
      expect(rawEvent.gameId).toBe("plan_and_do");
      expect(rawEvent.eventType).toBe("game_completed");
      expect(rawEvent.payload.score).toBe(480);
      expect(rawEvent.payload.accuracyPercent).toBe(91);

      // Verify retrieval via getPersistedGameEvents
      const persistedEvents = await companionContextService.getPersistedGameEvents({
        gameId: "plan_and_do",
      });
      expect(persistedEvents.length).toBeGreaterThanOrEqual(1);
      expect(persistedEvents[0].payload.gameName).toBe("Plan & Do");
      expect(persistedEvents[0].payload.score).toBe(480);
      expect(persistedEvents[0].payload.accuracyPercent).toBe(91);

      // Verify Companion Context aggregates recent game history
      const context = await companionContextService.getPatientCompanionContext(mockPatientId);
      expect(context.recentGames.length).toBeGreaterThan(0);
      expect(context.recentGames[0].gameId).toBe("plan_and_do");
      expect(context.recentGames[0].completed).toBe(true);
      expect(context.recentGames[0].accuracyPercent).toBe(91);
    });
  });

  describe("4. Caregiver Dashboard Integration", () => {
    it("persists CognitiveGameSession and retrieves via caregiverStorage", async () => {
      const caregiverSession: CognitiveGameSession = {
        id: `sess-plan-${Date.now()}`,
        gameName: "Plan & Do (Executive Sequencing)",
        iconEmoji: "📋",
        timestamp: "Today · 06:40 PM",
        durationMinutes: 2,
        score: 480,
        accuracyPercent: 91,
        mistakes: 1,
        responseTime: "Comfortable planning pace",
        difficulty: "4 → 5 Step Everyday Scenarios",
        difficultyChangeReason: "Progressed through practical executive planning scenarios.",
        completed: true,
        humanSummary: "Completed all 5 daily planning scenarios (Park, Tea, Breakfast, Bedtime, Doctor Visit) with 91% accuracy.",
      };

      await caregiverStorage.recordGameSession(caregiverSession);

      const allSessions = await caregiverStorage.getGameSessions();
      expect(allSessions.length).toBeGreaterThan(0);
      const saved = allSessions.find((s) => s.id === caregiverSession.id);
      expect(saved).toBeDefined();
      expect(saved?.gameName).toBe("Plan & Do (Executive Sequencing)");
      expect(saved?.score).toBe(480);
      expect(saved?.accuracyPercent).toBe(91);
      expect(saved?.humanSummary).toContain("91% accuracy");
    });
  });

  describe("5. Offline & Non-Blocking Resilience", () => {
    it("handles backend API network errors gracefully without crashing or throwing", async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error("Network Error"));
      (apiClient.put as jest.Mock).mockRejectedValue(new Error("Network Error"));

      // 1. Session start with offline fallback
      const session = await gameSessionService.startSession({
        sessionId: "sess_offline_plan_1",
        gameId: "plan_and_do",
      });
      expect(session.sessionId).toBe("sess_offline_plan_1");
      expect(session.status).toBe("in_progress");

      // 2. Event recording with offline buffer
      const event = await gameSessionService.recordEvent({
        sessionId: "sess_offline_plan_1",
        gameId: "plan_and_do",
        eventType: "round_started",
        metadata: { round: 1 },
      });
      expect(event.sessionId).toBe("sess_offline_plan_1");

      // 3. Companion context local persistence still succeeds
      const rawEvent = await companionContextService.recordRawGameEvent({
        gameId: "plan_and_do",
        eventType: "game_completed",
        payload: { score: 450, completed: true },
      });
      expect(rawEvent.id).toBeDefined();

      // 4. Caregiver storage still succeeds locally
      await caregiverStorage.recordGameSession({
        id: "sess_offline_plan_cg",
        gameName: "Plan & Do",
        iconEmoji: "📋",
        timestamp: "Today · 06:45 PM",
        durationMinutes: 2,
        score: 450,
        accuracyPercent: 90,
        mistakes: 1,
        responseTime: "Normal",
        difficulty: "4 → 5 Steps",
        difficultyChangeReason: "Normal",
        completed: true,
        humanSummary: "Completed session offline.",
      });

      const sessions = await caregiverStorage.getGameSessions();
      expect(sessions.some((s) => s.id === "sess_offline_plan_cg")).toBe(true);
    });
  });
});
