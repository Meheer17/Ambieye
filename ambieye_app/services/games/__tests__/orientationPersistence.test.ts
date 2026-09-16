import AsyncStorage from "@react-native-async-storage/async-storage";
import { gameSessionService } from "../gameSessionService";
import { companionContextService } from "@/services/companion/companionContextService";
import { caregiverStorage, CognitiveGameSession } from "@/utils/caregiverStorage";
import apiClient from "@/services/api/apiService";
import { generateOrientationQuestions } from "@/app/(patient)/(stack)/games/cognitive/orientation";

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

describe("Orientation & Daily Awareness Game Persistence Pipeline", () => {
  const mockSessionId = "sess_orient_test_98765";
  const mockPatientId = "pat-bhaben";

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await AsyncStorage.setItem("userId", mockPatientId);
  });

  describe("1. Dynamic Date & Time Grounding Engine", () => {
    it("generates 5 real-time questions dynamically based on provided device Date", () => {
      // Create a fixed date: Wednesday, September 16, 2026 at 14:30 (Afternoon, Autumn)
      const testDate = new Date(2026, 8, 16, 14, 30); // Month 8 = September
      const questions = generateOrientationQuestions(testDate);

      expect(questions.length).toBe(5);

      // Q1: Day of Week (Wednesday)
      const q1 = questions[0];
      expect(q1.questionType).toBe("day_of_week");
      const correctDay = q1.choices.find((c) => c.isCorrect);
      expect(correctDay?.nameEn).toBe("Wednesday");
      expect(q1.choices.length).toBe(4);

      // Q2: Month of Year (September)
      const q2 = questions[1];
      expect(q2.questionType).toBe("month_of_year");
      const correctMonth = q2.choices.find((c) => c.isCorrect);
      expect(correctMonth?.nameEn).toBe("September");
      expect(q2.choices.length).toBe(4);

      // Q3: Time of Day (14:30 -> Afternoon)
      const q3 = questions[2];
      expect(q3.questionType).toBe("time_of_day");
      const correctTime = q3.choices.find((c) => c.isCorrect);
      expect(correctTime?.nameEn).toContain("Afternoon");
      expect(q3.choices.length).toBe(4);

      // Q4: Season / Climate Period (September -> Autumn)
      const q4 = questions[3];
      expect(q4.questionType).toBe("season_period");
      const correctSeason = q4.choices.find((c) => c.isCorrect);
      expect(correctSeason?.nameEn).toContain("Autumn");
      expect(q4.choices.length).toBe(4);

      // Q5: Place Orientation (At Home)
      const q5 = questions[4];
      expect(q5.questionType).toBe("place_orientation");
      const correctPlace = q5.choices.find((c) => c.isCorrect);
      expect(correctPlace?.nameEn).toContain("At Home");
      expect(q5.choices.length).toBe(4);
    });

    it("adapts correctly for morning time and spring season", () => {
      // Sunday, March 22, 2026 at 08:00 (Morning, Spring)
      const morningSpring = new Date(2026, 2, 22, 8, 0); // Month 2 = March
      const questions = generateOrientationQuestions(morningSpring);

      expect(questions[0].choices.find((c) => c.isCorrect)?.nameEn).toBe("Sunday");
      expect(questions[1].choices.find((c) => c.isCorrect)?.nameEn).toBe("March");
      expect(questions[2].choices.find((c) => c.isCorrect)?.nameEn).toContain("Morning");
      expect(questions[3].choices.find((c) => c.isCorrect)?.nameEn).toContain("Spring");
    });
  });

  describe("2. GameSessionService Lifecycle", () => {
    it("starts an orientation_daily_awareness session with metadata and records game_started event", async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          session: {
            sessionId: mockSessionId,
            patientId: mockPatientId,
            gameId: "orientation_daily_awareness",
            status: "in_progress",
            duration: 0,
            startedAt: new Date().toISOString(),
          },
        },
      });

      const session = await gameSessionService.startSession({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "orientation_daily_awareness",
        metadata: {
          gameTitle: "Orientation & Daily Awareness",
          totalRounds: 5,
          mode: "daily_orientation_engagement",
        },
      });

      expect(session.sessionId).toBe(mockSessionId);
      expect(session.gameId).toBe("orientation_daily_awareness");
      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("/games/sessions"),
        expect.objectContaining({
          sessionId: mockSessionId,
          gameId: "orientation_daily_awareness",
          metadata: expect.objectContaining({ totalRounds: 5 }),
        })
      );
    });

    it("records granular round events: round_started, hint_used, answer_submitted, answer_correct, answer_incorrect, round_completed", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true, event_id: "evt_orient_1" },
      });

      // 1. Round 1 started
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "orientation_daily_awareness",
        eventType: "round_started",
        metadata: {
          round: 1,
          questionType: "day_of_week",
          question: "What day is today?",
          availableChoices: ["Wednesday", "Monday", "Friday", "Sunday"],
        },
      });

      // 2. Hint used
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "orientation_daily_awareness",
        eventType: "hint_used",
        metadata: {
          round: 1,
          questionType: "day_of_week",
        },
      });

      // 3. Incorrect answer first
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "orientation_daily_awareness",
        eventType: "answer_submitted",
        metadata: {
          round: 1,
          questionType: "day_of_week",
          question: "What day is today?",
          selectedAnswer: "Monday",
          expectedAnswer: "Wednesday",
          isCorrect: false,
          attempts: 1,
          responseTimeMs: 2100,
        },
      });

      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "orientation_daily_awareness",
        eventType: "answer_incorrect",
        metadata: {
          round: 1,
          questionType: "day_of_week",
          selectedAnswer: "Monday",
          attempts: 1,
          responseTimeMs: 2100,
        },
      });

      // 4. Correct answer on retry
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "orientation_daily_awareness",
        eventType: "answer_submitted",
        metadata: {
          round: 1,
          questionType: "day_of_week",
          question: "What day is today?",
          selectedAnswer: "Wednesday",
          expectedAnswer: "Wednesday",
          isCorrect: true,
          attempts: 2,
          responseTimeMs: 3800,
        },
      });

      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "orientation_daily_awareness",
        eventType: "answer_correct",
        metadata: {
          round: 1,
          questionType: "day_of_week",
          pointsEarned: 90,
          attempts: 2,
          responseTimeMs: 3800,
        },
      });

      // 5. Round 1 completed
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "orientation_daily_awareness",
        eventType: "round_completed",
        metadata: {
          round: 1,
          questionType: "day_of_week",
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
        durationSeconds: 58,
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

  describe("3. Companion Context Persistence Bridge", () => {
    it("ingests real game_completed event with telemetry into durable companion storage", async () => {
      const rawEvent = await companionContextService.recordRawGameEvent({
        patientId: mockPatientId,
        gameId: "orientation_daily_awareness",
        eventType: "game_completed",
        payload: {
          gameName: "Orientation & Daily Awareness",
          score: 490,
          durationSeconds: 58,
          accuracyPercent: 94,
          completed: true,
          difficulty: "Daily Grounding & Awareness",
          metadata: {
            totalRounds: 5,
            totalMistakes: 1,
            dateVerified: new Date().toISOString(),
          },
        },
      });

      expect(rawEvent.id).toBeDefined();
      expect(rawEvent.patientId).toBe(mockPatientId);
      expect(rawEvent.gameId).toBe("orientation_daily_awareness");
      expect(rawEvent.eventType).toBe("game_completed");
      expect(rawEvent.payload.score).toBe(490);
      expect(rawEvent.payload.accuracyPercent).toBe(94);

      // Verify retrieval via getPersistedGameEvents
      const persistedEvents = await companionContextService.getPersistedGameEvents({
        gameId: "orientation_daily_awareness",
      });
      expect(persistedEvents.length).toBeGreaterThanOrEqual(1);
      expect(persistedEvents[0].payload.gameName).toBe("Orientation & Daily Awareness");
      expect(persistedEvents[0].payload.score).toBe(490);
      expect(persistedEvents[0].payload.accuracyPercent).toBe(94);

      // Verify Companion Context aggregates recent game history
      const context = await companionContextService.getPatientCompanionContext(mockPatientId);
      expect(context.recentGames.length).toBeGreaterThan(0);
      expect(context.recentGames[0].gameId).toBe("orientation_daily_awareness");
      expect(context.recentGames[0].completed).toBe(true);
      expect(context.recentGames[0].accuracyPercent).toBe(94);
    });
  });

  describe("4. Caregiver Dashboard Integration", () => {
    it("persists CognitiveGameSession and retrieves via caregiverStorage", async () => {
      const caregiverSession: CognitiveGameSession = {
        id: `sess-orient-${Date.now()}`,
        gameName: "Orientation & Daily Awareness",
        iconEmoji: "🧭",
        timestamp: "Today · 06:15 PM",
        durationMinutes: 1,
        score: 490,
        accuracyPercent: 94,
        mistakes: 1,
        responseTime: "Comfortable grounding pace",
        difficulty: "5 Grounding Steps (Day, Month, Time, Season, Place)",
        difficultyChangeReason: "Comfortable real-time daily awareness engagement.",
        completed: true,
        humanSummary: "Completed all 5 daily orientation check-ins (Day, Month, Time, Season, Place) with 94% accuracy.",
      };

      await caregiverStorage.recordGameSession(caregiverSession);

      const allSessions = await caregiverStorage.getGameSessions();
      expect(allSessions.length).toBeGreaterThan(0);
      const saved = allSessions.find((s) => s.id === caregiverSession.id);
      expect(saved).toBeDefined();
      expect(saved?.gameName).toBe("Orientation & Daily Awareness");
      expect(saved?.score).toBe(490);
      expect(saved?.accuracyPercent).toBe(94);
      expect(saved?.humanSummary).toContain("94% accuracy");
    });
  });

  describe("5. Offline & Non-Blocking Resilience", () => {
    it("handles backend API network errors gracefully without crashing or throwing", async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error("Network Error"));
      (apiClient.put as jest.Mock).mockRejectedValue(new Error("Network Error"));

      // 1. Session start with offline fallback
      const session = await gameSessionService.startSession({
        sessionId: "sess_offline_orient_1",
        gameId: "orientation_daily_awareness",
      });
      expect(session.sessionId).toBe("sess_offline_orient_1");
      expect(session.status).toBe("in_progress");

      // 2. Event recording with offline buffer
      const event = await gameSessionService.recordEvent({
        sessionId: "sess_offline_orient_1",
        gameId: "orientation_daily_awareness",
        eventType: "round_started",
        metadata: { round: 1 },
      });
      expect(event.sessionId).toBe("sess_offline_orient_1");

      // 3. Companion context local persistence still succeeds
      const rawEvent = await companionContextService.recordRawGameEvent({
        gameId: "orientation_daily_awareness",
        eventType: "game_completed",
        payload: { score: 470, completed: true },
      });
      expect(rawEvent.id).toBeDefined();

      // 4. Caregiver storage still succeeds locally
      await caregiverStorage.recordGameSession({
        id: "sess_offline_orient_cg",
        gameName: "Orientation & Daily Awareness",
        iconEmoji: "🧭",
        timestamp: "Today · 06:20 PM",
        durationMinutes: 1,
        score: 470,
        accuracyPercent: 90,
        mistakes: 1,
        responseTime: "Normal",
        difficulty: "5 Grounding Steps",
        difficultyChangeReason: "Normal",
        completed: true,
        humanSummary: "Completed session offline.",
      });

      const sessions = await caregiverStorage.getGameSessions();
      expect(sessions.some((s) => s.id === "sess_offline_orient_cg")).toBe(true);
    });
  });
});
