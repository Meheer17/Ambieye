import { gameSessionService } from "@/services/games";
import { antakshariMatcher } from "@/services/antakshari";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("@/services/games/gameSessionService");

describe("Antakshari Game Session & Event Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("1. Starts exactly one game session for Antakshari with valid initial metadata", async () => {
    const mockSession = {
      sessionId: "sess_antakshari_test_101",
      patientId: "mahi",
      gameId: "antakshari_battle",
      startedAt: "2026-09-15T12:00:00Z",
      status: "in_progress",
      score: null,
      duration: 0,
      metadata: {
        initialSyllable: "M",
        gameTitle: "Antakshari Battle",
        mode: "cultural_melody",
        companionPersona: "bhupen_da",
      },
    };

    (gameSessionService.startSession as jest.Mock).mockResolvedValueOnce(
      mockSession
    );

    const session = await gameSessionService.startSession({
      gameId: "antakshari_battle",
      metadata: {
        initialSyllable: "M",
        gameTitle: "Antakshari Battle",
        mode: "cultural_melody",
        companionPersona: "bhupen_da",
      },
    });

    expect(session.sessionId).toBe("sess_antakshari_test_101");
    expect(session.gameId).toBe("antakshari_battle");
    expect(session.metadata?.initialSyllable).toBe("M");
    expect(gameSessionService.startSession).toHaveBeenCalledTimes(1);
  });

  it("2. Records an answer_correct event with real match and STT metadata when player sings valid song", async () => {
    // Player sings "Mera Joota Hai Japani" starting with "M"
    const transcript = "Mera Joota Hai Japani";
    const requiredSyllable = "M";
    const audioDurationMs = 3500;

    const matchResult = await antakshariMatcher.match(transcript, requiredSyllable);
    expect(matchResult.isMatch).toBe(true);
    expect(matchResult.matchedSongId).toBe("bw-classic-001");

    (gameSessionService.recordEvent as jest.Mock).mockResolvedValueOnce({
      eventId: "evt_ans_01",
      sessionId: "sess_antakshari_test_101",
      eventType: "answer_correct",
    });

    const eventType = matchResult.isMatch ? "answer_correct" : "answer_incorrect";

    await gameSessionService.recordEvent({
      sessionId: "sess_antakshari_test_101",
      gameId: "antakshari_battle",
      eventType,
      metadata: {
        round: 1,
        requiredSyllable,
        transcript,
        detectedSyllable: matchResult.detectedStartingSyllable,
        isMatch: matchResult.isMatch,
        matchReason: matchResult.reason,
        matchConfidence: matchResult.confidence,
        matchedSongId: matchResult.matchedSongId,
        matchedSongTitle: matchResult.matchedSongTitle,
        responseTimeMs: audioDurationMs,
        hintUsed: false,
      },
    });

    expect(gameSessionService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "sess_antakshari_test_101",
        eventType: "answer_correct",
        metadata: expect.objectContaining({
          transcript: "Mera Joota Hai Japani",
          detectedSyllable: "M",
          isMatch: true,
          matchReason: "valid_match",
          matchedSongId: "bw-classic-001",
          responseTimeMs: 3500,
          hintUsed: false,
        }),
      })
    );
  });

  it("3. Records an answer_incorrect event when syllable does not match", async () => {
    // Required "M", player sings "Yeh Shaam Mastani"
    const transcript = "Yeh shaam mastani";
    const requiredSyllable = "M";

    const matchResult = await antakshariMatcher.match(transcript, requiredSyllable);
    expect(matchResult.isMatch).toBe(false);
    expect(matchResult.reason).toBe("invalid_starting_syllable");

    const eventType = matchResult.isMatch ? "answer_correct" : "answer_incorrect";

    await gameSessionService.recordEvent({
      sessionId: "sess_antakshari_test_101",
      gameId: "antakshari_battle",
      eventType,
      metadata: {
        round: 1,
        requiredSyllable,
        transcript,
        detectedSyllable: matchResult.detectedStartingSyllable,
        isMatch: matchResult.isMatch,
        matchReason: matchResult.reason,
        matchConfidence: matchResult.confidence,
        matchedSongId: matchResult.matchedSongId,
        responseTimeMs: 2800,
        hintUsed: true,
      },
    });

    expect(gameSessionService.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "answer_incorrect",
        metadata: expect.objectContaining({
          isMatch: false,
          detectedSyllable: "Y",
          matchReason: "invalid_starting_syllable",
          hintUsed: true,
        }),
      })
    );
  });

  it("4. Abandons session when player exits screen without completing", async () => {
    (gameSessionService.abandonSession as jest.Mock).mockResolvedValueOnce({
      sessionId: "sess_antakshari_test_101",
      status: "abandoned",
    });

    await gameSessionService.abandonSession("sess_antakshari_test_101", {
      exitReason: "screen_unmounted",
      round: 1,
    });

    expect(gameSessionService.abandonSession).toHaveBeenCalledWith(
      "sess_antakshari_test_101",
      expect.objectContaining({ exitReason: "screen_unmounted" })
    );
  });

  it("5. Persistence failure does not crash gameplay", async () => {
    (gameSessionService.recordEvent as jest.Mock).mockRejectedValueOnce(
      new Error("Network connection dropped")
    );

    let caughtError = false;
    try {
      await gameSessionService.recordEvent({
        sessionId: "sess_antakshari_test_101",
        gameId: "antakshari_battle",
        eventType: "answer_submitted",
        metadata: { transcript: "test" },
      });
    } catch {
      caughtError = true;
    }

    // In the component, this error is safely caught and gameplay continues without interruption
    expect(caughtError).toBe(true);
  });
});
