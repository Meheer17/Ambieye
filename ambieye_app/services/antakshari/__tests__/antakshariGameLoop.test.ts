import {
  AntakshariGameLoop,
  extractEndingSyllable,
  TOTAL_ROUNDS,
} from "../antakshariGameLoop";
import { LocalSongRepository } from "../localSongRepository";
import { Song } from "@/types/antakshari";
import { gameSessionService } from "@/services/games";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("@/services/games/gameSessionService");

describe("AntakshariGameLoop Architecture", () => {
  let customRepo: LocalSongRepository;
  let gameLoop: AntakshariGameLoop;

  const mockSongs: Song[] = [
    {
      id: "s-1",
      title: "Mera Joota Hai Japani",
      startingSyllable: "M",
      category: "bollywood_classics",
      language: "Hindi",
    },
    {
      id: "s-2",
      title: "Ishq Wala Love",
      startingSyllable: "I",
      category: "bollywood_classics",
      language: "Hindi",
    },
    {
      id: "s-3",
      title: "Echo Of Hills",
      startingSyllable: "E",
      category: "northeast_regional",
      language: "English",
    },
    {
      id: "s-4",
      title: "Sayonee",
      startingSyllable: "S",
      category: "bollywood_classics",
      language: "Hindi",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    customRepo = new LocalSongRepository(mockSongs);
    gameLoop = new AntakshariGameLoop(customRepo, "M");
    gameLoop.setSessionId("sess_antakshari_loop_test");
  });

  describe("1. Ending Syllable Extraction", () => {
    it("extracts the last alphabet character cleanly", () => {
      expect(extractEndingSyllable("Mera Joota Hai Japani")).toBe("I");
      expect(extractEndingSyllable("Bihu Re Bihu!")).toBe("U");
      expect(extractEndingSyllable("Kabhi Kabhi Mere Dil Mein...")).toBe("N");
      expect(extractEndingSyllable("")).toBe("M");
    });
  });

  describe("2. Companion Turn & Progression", () => {
    it("companion picks a valid song for required syllable and hands turn to player", async () => {
      // Starting with M
      const result = await gameLoop.executeCompanionTurn();

      expect(result.song).not.toBeNull();
      expect(result.song?.startingSyllable).toBe("M");
      expect(result.song?.title).toBe("Mera Joota Hai Japani");

      // Ending letter of "Japani" is "I", so player must sing with "I"
      expect(result.nextRequiredSyllable).toBe("I");

      const state = gameLoop.getState();
      expect(state.turn).toBe("player");
      expect(state.requiredSyllable).toBe("I");

      // Verifies companion_turn and round_started events
      expect(gameSessionService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: "sess_antakshari_loop_test",
          eventType: "round_started",
          metadata: expect.objectContaining({ round: 1 }),
        })
      );
      expect(gameSessionService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: "sess_antakshari_loop_test",
          eventType: "companion_turn",
          metadata: expect.objectContaining({
            companionSongId: "s-1",
            nextPlayerSyllable: "I",
          }),
        })
      );
    });
  });

  describe("3. Player Turn & Game Scoring", () => {
    it("awards game points and advances round on correct answer", async () => {
      // Set required syllable to 'I'
      await gameLoop.executeCompanionTurn();

      // Player sings 'Ishq Wala Love' which starts with 'I'
      const playResult = await gameLoop.processPlayerAnswer(
        "Ishq Wala Love",
        3200
      );

      expect(playResult.isCorrect).toBe(true);
      expect(playResult.pointsEarned).toBe(100);
      expect(playResult.isGameCompleted).toBe(false);

      const state = gameLoop.getState();
      expect(state.gameScore).toBe(100);
      expect(state.round).toBe(2);
      expect(state.turn).toBe("companion");

      // Ending letter of "Ishq Wala Love" is "E"
      expect(state.requiredSyllable).toBe("E");

      expect(gameSessionService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "answer_correct",
          metadata: expect.objectContaining({
            pointsEarned: 100,
            transcript: "Ishq Wala Love",
          }),
        })
      );
      expect(gameSessionService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "round_completed",
          metadata: expect.objectContaining({ round: 1, totalScore: 100 }),
        })
      );
    });

    it("handles incorrect answer gently without penalty or game crash", async () => {
      await gameLoop.executeCompanionTurn();

      // Required is 'I', player sings starting with 'M'
      const playResult = await gameLoop.processPlayerAnswer("Mera Joota", 2500);

      expect(playResult.isCorrect).toBe(false);
      expect(playResult.pointsEarned).toBe(0);

      const state = gameLoop.getState();
      expect(state.gameScore).toBe(0);
      expect(state.round).toBe(1); // Stays on round 1 for retry/friendly continuation
      expect(state.turn).toBe("player");

      expect(gameSessionService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "answer_incorrect",
          metadata: expect.objectContaining({
            matchReason: "invalid_starting_syllable",
          }),
        })
      );
    });

    it("applies small hint adjustment when hint is used", async () => {
      await gameLoop.executeCompanionTurn();
      await gameLoop.useHint();

      expect(gameSessionService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: "hint_used" })
      );

      const playResult = await gameLoop.processPlayerAnswer("Ishq Wala Love");
      expect(playResult.pointsEarned).toBe(90); // 100 - 10 hint adjustment
      expect(gameLoop.getState().gameScore).toBe(90);
    });
  });

  describe("4. Final Round & Session Completion", () => {
    it("completes the session when round reaches TOTAL_ROUNDS", async () => {
      // Simulate playing rounds 1 to 4
      for (let r = 1; r <= TOTAL_ROUNDS - 1; r++) {
        await gameLoop.executeCompanionTurn();
        // Force requiredSyllable to 'M' for testing
        (gameLoop as any).state.requiredSyllable = "M";
        await gameLoop.processPlayerAnswer("Mera Joota Hai Japani");
      }

      expect(gameLoop.getState().round).toBe(TOTAL_ROUNDS);
      expect(gameLoop.getState().isGameCompleted).toBe(false);

      // Play final 5th round
      await gameLoop.executeCompanionTurn();
      (gameLoop as any).state.requiredSyllable = "M";
      const finalResult = await gameLoop.processPlayerAnswer(
        "Mera Joota Hai Japani"
      );

      expect(finalResult.isGameCompleted).toBe(true);
      expect(gameLoop.getState().isGameCompleted).toBe(true);
      expect(gameLoop.getState().isGameActive).toBe(false);

      // Verified completeSession was called with final score
      expect(gameSessionService.completeSession).toHaveBeenCalledWith(
        "sess_antakshari_loop_test",
        gameLoop.getState().gameScore,
        expect.objectContaining({
          totalRounds: TOTAL_ROUNDS,
          finalScore: gameLoop.getState().gameScore,
        })
      );

      expect(gameSessionService.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "game_completed",
          metadata: expect.objectContaining({
            totalRounds: TOTAL_ROUNDS,
          }),
        })
      );
    });

    it("prevents duplicate completeSession calls", async () => {
      await gameLoop.completeGame();
      await gameLoop.completeGame();

      expect(gameSessionService.completeSession).toHaveBeenCalledTimes(1);
    });
  });

  describe("5. Early Exit Abandonment", () => {
    it("marks session abandoned on early exit without marking completed", async () => {
      await gameLoop.abandonGame("screen_unmounted");

      expect(gameSessionService.abandonSession).toHaveBeenCalledWith(
        "sess_antakshari_loop_test",
        expect.objectContaining({
          exitReason: "screen_unmounted",
        })
      );
      expect(gameSessionService.completeSession).not.toHaveBeenCalled();
    });

    it("does not abandon a game that was already completed", async () => {
      await gameLoop.completeGame();
      await gameLoop.abandonGame("screen_unmounted");

      expect(gameSessionService.abandonSession).not.toHaveBeenCalled();
    });
  });
});
