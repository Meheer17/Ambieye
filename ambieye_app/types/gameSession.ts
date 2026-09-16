/**
 * Common Game Session & Event Data Types
 * Reusable architecture for all 10-15 patient games (Antakshari, Gaze Match, Pattern Recall, etc.)
 */

export type GameSessionStatus =
  | "in_progress"
  | "paused"
  | "completed"
  | "abandoned";

export type StandardGameEventType =
  | "game_started"
  | "round_started"
  | "game_paused"
  | "game_resumed"
  | "answer_submitted"
  | "answer_correct"
  | "answer_incorrect"
  | "hint_used"
  | "companion_turn"
  | "round_completed"
  | "game_completed"
  | "game_abandoned";

export type GameEventType = StandardGameEventType | (string & {});

/**
 * Core Game Session
 * Represents an entire playthrough/session of a game by a patient.
 */
export interface GameSession {
  sessionId: string;
  patientId: string;
  gameId: string;
  startedAt: string;
  completedAt?: string | null;
  duration: number; // in seconds
  status: GameSessionStatus;
  score?: number | null;
  metadata?: Record<string, any>; // Extensible game-specific details (flexible, not hardcoded)
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Core Game Event
 * Represents a discrete, granular action/occurrence during a game session.
 */
export interface GameEvent {
  eventId: string;
  sessionId: string;
  patientId: string;
  gameId: string;
  eventType: GameEventType;
  timestamp: string;
  metadata?: Record<string, any>; // Extensible event-specific details (e.g. transcript, latency, syllable)
}

/**
 * Parameters for starting a new game session
 */
export interface StartGameSessionParams {
  patientId?: string; // Optional: auto-resolved from current auth if omitted
  gameId: string;
  sessionId?: string; // Optional custom ID
  metadata?: Record<string, any>;
}

/**
 * Parameters for recording an event during gameplay
 */
export interface RecordGameEventParams {
  sessionId: string;
  eventType: GameEventType;
  patientId?: string;
  gameId?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

/**
 * Parameters for updating a game session (pause, complete, abandon, update score)
 */
export interface UpdateGameSessionParams {
  status?: GameSessionStatus;
  score?: number;
  completedAt?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

/**
 * Aggregated statistics for patient gameplay
 * Used by personalization, virtual companion context, and clinical dashboards.
 */
export interface GameSessionStats {
  patientId: string;
  gameId?: string | null;
  totalSessions: number;
  completedSessions: number;
  abandonedSessions: number;
  totalDurationSeconds: number;
  averageDurationSeconds: number;
  averageScore: number | null;
  highestScore: number | null;
  lastPlayedAt: string | null;
  gameBreakdown?: Record<
    string,
    {
      sessions: number;
      averageScore: number | null;
    }
  >;
}
