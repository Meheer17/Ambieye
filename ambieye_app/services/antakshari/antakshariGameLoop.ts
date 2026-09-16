import { Song, AntakshariMatchResult } from "@/types/antakshari";
import { SongRepository } from "./songRepository";
import { GameEventType } from "@/types/gameSession";
import { gameSessionService } from "@/services/games";
import {
  antakshariMatcher,
  AntakshariMatcher,
} from "./antakshariMatcher";
import { LocalSongRepository } from "./localSongRepository";

const defaultSongRepo: SongRepository = new LocalSongRepository();

export const TOTAL_ROUNDS = 5;
export const BASE_POINTS_PER_MATCH = 100;
export const HINT_PENALTY_POINTS = 10;

export type TurnType = "companion" | "player";

/**
 * Clean helper to extract ending syllable/letter according to Antakshari tradition
 */
export function extractEndingSyllable(text: string): string {
  if (!text) return "M";
  // Strip non-alphabetic chars and grab the last letter
  const cleaned = text.replace(/[^a-zA-Z]/g, "").trim().toUpperCase();
  if (cleaned.length === 0) return "M";
  const lastChar = cleaned.slice(-1);
  return lastChar;
}

/**
 * Game state for Antakshari Battle loop
 */
export interface AntakshariGameState {
  round: number;
  totalRounds: number;
  turn: TurnType;
  requiredSyllable: string;
  gameScore: number;
  isGameActive: boolean;
  isGameCompleted: boolean;
  companionSong: Song | null;
  lastMatchResult: AntakshariMatchResult | null;
  hintUsedInCurrentRound: boolean;
}

/**
 * Controller for the Antakshari Gameplay Loop
 * Decoupled from React components for full unit testing and reliability.
 */
export class AntakshariGameLoop {
  private repository: SongRepository;
  private matcher: AntakshariMatcher;
  private state: AntakshariGameState;
  private sessionId: string | null = null;
  private isCompleted: boolean = false;
  private isAbandoned: boolean = false;

  constructor(
    repository: SongRepository = defaultSongRepo,
    initialSyllable: string = "M",
    matcher?: AntakshariMatcher
  ) {
    this.repository = repository;
    this.matcher = matcher ?? new AntakshariMatcher(repository);
    this.state = {
      round: 1,
      totalRounds: TOTAL_ROUNDS,
      turn: "companion",
      requiredSyllable: initialSyllable,
      gameScore: 0,
      isGameActive: true,
      isGameCompleted: false,
      companionSong: null,
      lastMatchResult: null,
      hintUsedInCurrentRound: false,
    };
  }

  getState(): AntakshariGameState {
    return { ...this.state };
  }

  setSessionId(sessionId: string) {
    this.sessionId = sessionId;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * 1. Start or execute Companion's Turn
   * - Selects a valid song starting with requiredSyllable from repository
   * - Derives player's starting syllable from song's ending letter
   * - Records companion_turn and round_started events
   * - Switches turn to player
   */
  async executeCompanionTurn(): Promise<{
    song: Song | null;
    nextRequiredSyllable: string;
  }> {
    if (this.state.isGameCompleted) {
      return {
        song: this.state.companionSong,
        nextRequiredSyllable: this.state.requiredSyllable,
      };
    }

    // Record round_started event
    if (this.sessionId) {
      try {
        await gameSessionService.recordEvent({
          sessionId: this.sessionId,
          gameId: "antakshari_battle",
          eventType: "round_started",
          metadata: {
            round: this.state.round,
            requiredSyllable: this.state.requiredSyllable,
          },
        });
      } catch {
        // Non-blocking persistence
      }
    }

    // Query songs matching requiredSyllable
    let candidates = await this.repository.getSongsByStartingSyllable(
      this.state.requiredSyllable
    );

    if (candidates.length === 0) {
      const allSongs = await this.repository.getSongs();
      candidates = allSongs.filter((s: Song) => {
        const syl = s.startingSyllable?.toUpperCase();
        const title = s.title.toUpperCase();
        return (
          syl === this.state.requiredSyllable ||
          syl?.startsWith(this.state.requiredSyllable) ||
          title.startsWith(this.state.requiredSyllable)
        );
      });
    }

    // Fallback if no song starts with this syllable
    let selectedSong: Song | null = null;
    if (candidates.length > 0) {
      const idx = Math.floor(Math.random() * candidates.length);
      selectedSong = candidates[idx];
    } else {
      selectedSong = await this.repository.getRandomSong();
    }

    // Derive next syllable for the player from the companion song's title
    const nextPlayerSyllable = selectedSong
      ? extractEndingSyllable(selectedSong.title)
      : "M";

    this.state.companionSong = selectedSong;
    this.state.requiredSyllable = nextPlayerSyllable;
    this.state.turn = "player";
    this.state.hintUsedInCurrentRound = false;

    // Record companion_turn event
    if (this.sessionId && selectedSong) {
      try {
        await gameSessionService.recordEvent({
          sessionId: this.sessionId,
          gameId: "antakshari_battle",
          eventType: "companion_turn",
          metadata: {
            round: this.state.round,
            companionSongId: selectedSong.id,
            companionSongTitle: selectedSong.title,
            nextPlayerSyllable,
          },
        });
      } catch {
        // Non-blocking persistence
      }
    }

    return {
      song: selectedSong,
      nextRequiredSyllable: nextPlayerSyllable,
    };
  }

  /**
   * 2. Handle Player Hint
   * Records hint_used event and notes hint usage for small game score adjustment
   */
  async useHint(): Promise<void> {
    this.state.hintUsedInCurrentRound = true;
    if (this.sessionId) {
      try {
        await gameSessionService.recordEvent({
          sessionId: this.sessionId,
          gameId: "antakshari_battle",
          eventType: "hint_used",
          metadata: {
            round: this.state.round,
            requiredSyllable: this.state.requiredSyllable,
          },
        });
      } catch {
        // Non-blocking
      }
    }
  }

  /**
   * 3. Handle Player Answer
   * - Evaluates transcript with AntakshariMatcher
   * - If correct: adds game score, advances round, checks for game completion
   * - If incorrect: records failure, keeps game friendly
   */
  async processPlayerAnswer(
    transcript: string | null | undefined,
    responseTimeMs: number = 0
  ): Promise<{
    matchResult: AntakshariMatchResult;
    isCorrect: boolean;
    pointsEarned: number;
    isGameCompleted: boolean;
  }> {
    const matchResult = await this.matcher.match(
      transcript,
      this.state.requiredSyllable
    );

    this.state.lastMatchResult = matchResult;
    const isCorrect = matchResult.isMatch === true;

    // ── CORRECT ANSWER ──────────────────────────────────────────────────
    if (isCorrect) {
      const deduction = this.state.hintUsedInCurrentRound
        ? HINT_PENALTY_POINTS
        : 0;
      const pointsEarned = Math.max(10, BASE_POINTS_PER_MATCH - deduction);
      this.state.gameScore += pointsEarned;

      // Record answer_correct and round_completed events
      if (this.sessionId) {
        try {
          await gameSessionService.recordEvent({
            sessionId: this.sessionId,
            gameId: "antakshari_battle",
            eventType: "answer_correct",
            metadata: {
              round: this.state.round,
              requiredSyllable: this.state.requiredSyllable,
              transcript: transcript || "",
              detectedSyllable: matchResult.detectedStartingSyllable,
              matchedSongId: matchResult.matchedSongId,
              matchedSongTitle: matchResult.matchedSongTitle,
              confidence: matchResult.confidence,
              pointsEarned,
              responseTimeMs,
              hintUsed: this.state.hintUsedInCurrentRound,
            },
          });

          await gameSessionService.recordEvent({
            sessionId: this.sessionId,
            gameId: "antakshari_battle",
            eventType: "round_completed",
            metadata: {
              round: this.state.round,
              roundScore: pointsEarned,
              totalScore: this.state.gameScore,
            },
          });
        } catch {
          // Non-blocking
        }
      }

      // Check if this was the final round
      if (this.state.round >= this.state.totalRounds) {
        await this.completeGame();
        return {
          matchResult,
          isCorrect: true,
          pointsEarned,
          isGameCompleted: true,
        };
      }

      // Derive next syllable for companion from player's song title
      const playerSongTitle =
        matchResult.matchedSongTitle || transcript || "M";
      this.state.requiredSyllable = extractEndingSyllable(playerSongTitle);
      this.state.round += 1;
      this.state.turn = "companion";

      return {
        matchResult,
        isCorrect: true,
        pointsEarned,
        isGameCompleted: false,
      };
    }

    // ── INCORRECT ANSWER (Friendly Retry) ────────────────────────────────
    if (this.sessionId) {
      try {
        await gameSessionService.recordEvent({
          sessionId: this.sessionId,
          gameId: "antakshari_battle",
          eventType: "answer_incorrect",
          metadata: {
            round: this.state.round,
            requiredSyllable: this.state.requiredSyllable,
            transcript: transcript || "",
            detectedSyllable: matchResult.detectedStartingSyllable,
            matchReason: matchResult.reason,
            responseTimeMs,
            hintUsed: this.state.hintUsedInCurrentRound,
          },
        });
      } catch {
        // Non-blocking
      }
    }

    return {
      matchResult,
      isCorrect: false,
      pointsEarned: 0,
      isGameCompleted: false,
    };
  }

  /**
   * 4. Complete the Game Session
   */
  async completeGame(): Promise<void> {
    if (this.isCompleted) return;
    this.isCompleted = true;
    this.state.isGameActive = false;
    this.state.isGameCompleted = true;

    if (this.sessionId) {
      try {
        await gameSessionService.completeSession(
          this.sessionId,
          this.state.gameScore,
          {
            totalRounds: this.state.totalRounds,
            finalScore: this.state.gameScore,
            statusReason: "game_completed_normally",
          }
        );

        await gameSessionService.recordEvent({
          sessionId: this.sessionId,
          gameId: "antakshari_battle",
          eventType: "game_completed",
          metadata: {
            totalRounds: this.state.totalRounds,
            finalScore: this.state.gameScore,
          },
        });
      } catch {
        // Non-blocking
      }
    }
  }

  /**
   * 5. Abandon the Game Session (Screen exited before completing all rounds)
   */
  async abandonGame(exitReason: string = "screen_unmounted"): Promise<void> {
    if (this.isCompleted || this.isAbandoned) return;
    this.isAbandoned = true;
    this.state.isGameActive = false;

    if (this.sessionId) {
      try {
        await gameSessionService.abandonSession(this.sessionId, {
          exitReason,
          completedRounds: this.state.round - 1,
          currentRound: this.state.round,
          finalScore: this.state.gameScore,
        });
      } catch {
        // Non-blocking
      }
    }
  }
}
