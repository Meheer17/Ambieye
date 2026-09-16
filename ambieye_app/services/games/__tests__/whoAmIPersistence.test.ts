import AsyncStorage from "@react-native-async-storage/async-storage";
import { gameSessionService } from "../gameSessionService";
import { companionContextService } from "@/services/companion/companionContextService";
import { caregiverStorage, CognitiveGameSession } from "@/utils/caregiverStorage";
import apiClient from "@/services/api/apiService";
import { MYSTERY_ROUNDS, TOTAL_ROUNDS } from "@/app/(patient)/(stack)/games/cognitive/who-am-i";

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

describe("Who Am I? (Role Recognition) Persistence Pipeline", () => {
  const mockSessionId = "sess_who_ami_test_99881";
  const mockPatientId = "pat-bhaben";

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await AsyncStorage.setItem("userId", mockPatientId);
  });

  describe("1. Cognitive Role Recognition Dataset & Rules", () => {
    it("configures exactly 5 rounds with familiar community roles", () => {
      expect(TOTAL_ROUNDS).toBe(5);
      expect(Object.keys(MYSTERY_ROUNDS).length).toBe(5);

      // Round 1: Doctor
      expect(MYSTERY_ROUNDS[1].roleNameEn).toBe("Doctor");
      expect(MYSTERY_ROUNDS[1].visualIcons).toEqual(["🩺", "💊", "🏥"]);
      expect(MYSTERY_ROUNDS[1].clues.length).toBe(3);
      expect(MYSTERY_ROUNDS[1].choices.length).toBe(4);
      expect(MYSTERY_ROUNDS[1].choices.filter((c) => c.isCorrect).length).toBe(1);

      // Round 2: Teacher
      expect(MYSTERY_ROUNDS[2].roleNameEn).toBe("Teacher");
      expect(MYSTERY_ROUNDS[2].visualIcons).toEqual(["📚", "✏️", "🏫"]);
      expect(MYSTERY_ROUNDS[2].clues.length).toBe(3);
      expect(MYSTERY_ROUNDS[2].choices.filter((c) => c.isCorrect).length).toBe(1);

      // Round 3: Farmer
      expect(MYSTERY_ROUNDS[3].roleNameEn).toBe("Farmer");
      expect(MYSTERY_ROUNDS[3].visualIcons).toEqual(["🌾", "🚜", "☀️"]);
      expect(MYSTERY_ROUNDS[3].clues.length).toBe(3);
      expect(MYSTERY_ROUNDS[3].choices.filter((c) => c.isCorrect).length).toBe(1);

      // Round 4: Cook / Chef
      expect(MYSTERY_ROUNDS[4].roleNameEn).toBe("Cook / Chef");
      expect(MYSTERY_ROUNDS[4].visualIcons).toEqual(["🍳", "🍲", "🫖"]);
      expect(MYSTERY_ROUNDS[4].clues.length).toBe(3);
      expect(MYSTERY_ROUNDS[4].choices.filter((c) => c.isCorrect).length).toBe(1);

      // Round 5: Gardener
      expect(MYSTERY_ROUNDS[5].roleNameEn).toBe("Gardener");
      expect(MYSTERY_ROUNDS[5].visualIcons).toEqual(["🌸", "🪴", "🚿"]);
      expect(MYSTERY_ROUNDS[5].clues.length).toBe(3);
      expect(MYSTERY_ROUNDS[5].choices.filter((c) => c.isCorrect).length).toBe(1);
    });

    it("verifies multilingual clue strings (English, Assamese, Hindi) for all rounds", () => {
      for (let r = 1; r <= 5; r++) {
        const roundData = MYSTERY_ROUNDS[r];
        expect(roundData.roleNameEn.length).toBeGreaterThan(0);
        expect(roundData.roleNameAs.length).toBeGreaterThan(0);
        expect(roundData.roleNameHi.length).toBeGreaterThan(0);

        roundData.clues.forEach((clue) => {
          expect(clue.textEn.length).toBeGreaterThan(0);
          expect(clue.textAs.length).toBeGreaterThan(0);
          expect(clue.textHi.length).toBeGreaterThan(0);
          expect(clue.iconEmoji.length).toBeGreaterThan(0);
        });

        roundData.choices.forEach((choice) => {
          expect(choice.nameEn.length).toBeGreaterThan(0);
          expect(choice.nameAs.length).toBeGreaterThan(0);
          expect(choice.nameHi.length).toBeGreaterThan(0);
          expect(choice.emoji.length).toBeGreaterThan(0);
        });
      }
    });
  });

  describe("2. GameSessionService Lifecycle & Telemetry", () => {
    it("starts a who_am_i session with proper metadata and records game_started", async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          session: {
            sessionId: mockSessionId,
            patientId: mockPatientId,
            gameId: "who_am_i",
            status: "in_progress",
            duration: 0,
            startedAt: new Date().toISOString(),
          },
        },
      });

      const session = await gameSessionService.startSession({
        sessionId: mockSessionId,
        patientId: mockPatientId,
        gameId: "who_am_i",
        metadata: {
          gameTitle: "Who Am I? (Role Recognition)",
          totalRounds: 5,
          mode: "semantic_memory_role_recognition",
        },
      });

      expect(session.sessionId).toBe(mockSessionId);
      expect(session.gameId).toBe("who_am_i");
      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("/games/sessions"),
        expect.objectContaining({
          sessionId: mockSessionId,
          gameId: "who_am_i",
          metadata: expect.objectContaining({ totalRounds: 5 }),
        })
      );
    });

    it("records granular factual events: round_started, clue_revealed, answer_selected, and round_completed", async () => {
      (apiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true, eventId: "ev-123" },
      });

      // 1. Round started
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        gameId: "who_am_i",
        eventType: "round_started",
        metadata: {
          round: 1,
          role: "Doctor",
          clueCount: 3,
          cluesShown: ["I work in a hospital and clinic."],
        },
      });

      // 2. Clue revealed
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        gameId: "who_am_i",
        eventType: "clue_revealed",
        metadata: {
          round: 1,
          role: "Doctor",
          clueIndex: 2,
          clueText: "I help you get healthy when you feel sick.",
        },
      });

      // 3. Incorrect answer selected (gentle retry)
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        gameId: "who_am_i",
        eventType: "answer_selected",
        metadata: {
          round: 1,
          role: "Doctor",
          selectedAnswer: "Teacher",
          correctAnswer: "Doctor",
          isCorrect: false,
          attempts: 1,
          responseTimeMs: 2400,
        },
      });

      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        gameId: "who_am_i",
        eventType: "answer_incorrect",
        metadata: {
          round: 1,
          role: "Doctor",
          selectedAnswer: "Teacher",
          attempts: 1,
          responseTimeMs: 2400,
        },
      });

      // 4. Correct answer selected
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        gameId: "who_am_i",
        eventType: "answer_selected",
        metadata: {
          round: 1,
          role: "Doctor",
          selectedAnswer: "Doctor",
          correctAnswer: "Doctor",
          isCorrect: true,
          attempts: 2,
          responseTimeMs: 1800,
        },
      });

      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        gameId: "who_am_i",
        eventType: "answer_correct",
        metadata: {
          round: 1,
          role: "Doctor",
          pointsEarned: 90,
          attempts: 2,
          responseTimeMs: 1800,
        },
      });

      // 5. Round completed
      await gameSessionService.recordEvent({
        sessionId: mockSessionId,
        gameId: "who_am_i",
        eventType: "round_completed",
        metadata: {
          round: 1,
          role: "Doctor",
          totalScore: 90,
        },
      });

      expect(apiClient.post).toHaveBeenCalledTimes(7);
    });

    it("completes game session with score, duration, accuracy, and mistake counts", async () => {
      (apiClient.put as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          session: {
            sessionId: mockSessionId,
            status: "completed",
            score: 480,
            completedAt: new Date().toISOString(),
          },
        },
      });
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true },
      });

      const result = await gameSessionService.completeSession(mockSessionId, 480, {
        totalRounds: 5,
        durationSeconds: 45,
        accuracyPercent: 90,
        totalMistakes: 1,
      });

      expect(result).not.toBeNull();
      expect(result!.status).toBe("completed");
      expect(result!.score).toBe(480);
      expect(apiClient.put).toHaveBeenCalledWith(
        expect.stringContaining(`/games/sessions/${mockSessionId}`),
        expect.objectContaining({
          status: "completed",
          score: 480,
          metadata: expect.objectContaining({
            totalRounds: 5,
            accuracyPercent: 90,
            totalMistakes: 1,
          }),
        })
      );
    });

    it("handles game abandonment when patient navigates away early", async () => {
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

      const result = await gameSessionService.abandonSession(mockSessionId, {
        reason: "patient_navigated_away",
      });

      expect(result).not.toBeNull();
      expect(result!.status).toBe("abandoned");
      expect(apiClient.put).toHaveBeenCalledWith(
        expect.stringContaining(`/games/sessions/${mockSessionId}`),
        expect.objectContaining({
          status: "abandoned",
          metadata: expect.objectContaining({
            reason: "patient_navigated_away",
          }),
        })
      );
    });
  });

  describe("3. Caregiver Dashboard Storage Pipeline", () => {
    it("persists CognitiveGameSession to local caregiver storage", async () => {
      const caregiverSession: CognitiveGameSession = {
        id: `sess-who-${Date.now()}`,
        gameName: "Who Am I? (Role Recognition)",
        iconEmoji: "🎭",
        timestamp: "10:30 AM",
        durationMinutes: 2,
        score: 490,
        accuracyPercent: 95,
        mistakes: 1,
        responseTime: "Comfortable semantic recall pace",
        difficulty: "5 Familiar Community Roles",
        difficultyChangeReason: "Exercised semantic memory, descriptive clues, and role recognition.",
        completed: true,
        humanSummary: "Completed all 5 mystery person rounds (Doctor, Teacher, Farmer, Cook, Gardener) with 95% accuracy.",
      };

      await caregiverStorage.recordGameSession(caregiverSession);
      const allSessions = await caregiverStorage.getGameSessions();

      expect(allSessions.length).toBeGreaterThanOrEqual(1);
      const stored = allSessions.find((s) => s.gameName.includes("Who Am I"));
      expect(stored).toBeDefined();
      expect(stored?.score).toBe(490);
      expect(stored?.accuracyPercent).toBe(95);
      expect(stored?.iconEmoji).toBe("🎭");
      expect(stored?.completed).toBe(true);
    });
  });

  describe("4. Virtual Companion Context Pipeline", () => {
    it("persists completion event to companion history and retrieves it in context", async () => {
      await companionContextService.recordRawGameEvent({
        gameId: "who_am_i",
        eventType: "game_completed",
        payload: {
          gameName: "Who Am I? (Role Recognition)",
          score: 490,
          durationSeconds: 90,
          accuracyPercent: 95,
          completed: true,
          difficulty: "Semantic Memory & Recognition",
          metadata: {
            totalRounds: 5,
            totalMistakes: 1,
            rolesRecognized: ["Doctor", "Teacher", "Farmer", "Cook / Chef", "Gardener"],
          },
        },
      });

      const context = await companionContextService.getPatientCompanionContext();
      expect(context.recentGames.length).toBeGreaterThanOrEqual(1);

      const gameEntry = context.recentGames.find((g) => g.gameId === "who_am_i");
      expect(gameEntry).toBeDefined();
      expect(gameEntry?.gameName).toBe("Who Am I? (Role Recognition)");
      expect(gameEntry?.completed).toBe(true);
      expect(gameEntry?.accuracyPercent).toBe(95);
      expect(gameEntry?.durationMinutes).toBe(2);
    });
  });

  describe("5. Offline Resilience & Safety", () => {
    it("buffers events locally without crashing when API client throws error", async () => {
      (apiClient.post as jest.Mock).mockRejectedValueOnce(new Error("Network connection unavailable"));

      // Must not throw unhandled exception
      await expect(
        gameSessionService.recordEvent({
          sessionId: mockSessionId,
          gameId: "who_am_i",
          eventType: "clue_revealed",
          metadata: { clueIndex: 2 },
        })
      ).resolves.toBeDefined();
    });
  });
});
