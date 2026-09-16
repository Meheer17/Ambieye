/**
 * types/companionContext.ts
 * Clean data & context abstractions for the Virtual Companion and Game Event Persistence.
 * 
 * Strict 3-Tier Separation:
 * 1. Raw Events: Behavioral observations and telemetry (persisted durably).
 * 2. Derived Patient Context: Summarized, privacy-conscious conversation context.
 * 3. AI / Training Data: Strictly decoupled; never confused with raw logs.
 */

/**
 * Persisted Raw Companion / Game Event
 * Minimal common schema for all 10-15 patient games.
 * Game-specific fields (e.g. Antakshari transcripts, syllables, matching cards)
 * must live strictly inside `payload.metadata`.
 */
export interface RawCompanionEvent {
  id: string;
  patientId: string;
  gameId: string | number;
  eventType: string; // e.g. "game_session" | "game_completed" | "game_round" | "activity_completed"
  timestamp: string; // ISO 8601 string
  payload: {
    gameName?: string;
    score?: number;
    durationSeconds?: number;
    accuracyPercent?: number;
    completed?: boolean;
    difficulty?: string;
    metadata?: Record<string, any>; // Flexible game-specific payload
  };
}

/**
 * Query filter for retrieving persisted raw events
 */
export interface GameEventFilter {
  patientId?: string;
  gameId?: string | number;
  eventType?: string;
  startDate?: string; // YYYY-MM-DD
  limit?: number;
}

/**
 * Storage Abstraction for Game Events
 * Enables swapping persistence (AsyncStorage, SQLite, Remote API)
 * without touching game screens or UI.
 */
export interface IGameEventRepository {
  saveEvent(event: RawCompanionEvent): Promise<RawCompanionEvent>;
  getEvents(filter?: GameEventFilter): Promise<RawCompanionEvent[]>;
  getTodayEvents(patientId?: string): Promise<RawCompanionEvent[]>;
  getEventById(id: string): Promise<RawCompanionEvent | null>;
  clearEvents?(patientId?: string): Promise<void>;
}

/**
 * Parameter structure for calling recordRawGameEvent()
 */
export interface RecordRawGameEventInput {
  patientId?: string; // Auto-resolved if omitted
  gameId: string | number;
  eventType?: string; // Defaults to "game_completed"
  timestamp?: string; // Defaults to current ISO time
  payload: {
    gameName?: string;
    score?: number;
    durationSeconds?: number;
    accuracyPercent?: number;
    completed?: boolean;
    difficulty?: string;
    metadata?: Record<string, any>;
  };
}

/**
 * Non-Medical, Privacy-Conscious Derived Patient Context
 * Provided to the Virtual Companion for conversational personalization.
 * NO diagnostic claims, NO severity scores, NO disease predictions.
 */
export interface PatientCompanionContext {
  patientId: string;
  preferredLanguage: string;
  profileReference: {
    displayName: string;
    firstName: string;
    photoEmoji: string;
    residenceArea?: string;
    primaryCaregiverName: string;
    primaryCaregiverRelation: string;
  };
  preferences: {
    music: {
      favoriteArtists: string[];
      favoriteSongs: string[];
      musicNotes?: string;
    };
    hobbies: string[];
    comfortTopics: string[];
  };
  routineContext: {
    dailyAdherence: string;
    hydration: {
      glassesDrunk: number;
      dailyGoal: number;
      status: "on_track" | "needs_encouragement" | "completed";
    };
    nextUpcomingCue?: {
      title: string;
      timeLabel: string;
      category: string;
    };
  };
  recentActivities: Array<{
    id: string;
    title: string;
    category: string;
    completed: boolean;
    timeLabel: string;
    suggestedPrompt?: string;
  }>;
  recentGames: Array<{
    gameId: string | number;
    gameName: string;
    iconEmoji?: string;
    completed: boolean;
    playedAt: string;
    accuracyPercent?: number;
    durationMinutes?: number;
  }>;
  gameInteractionSummary: {
    gamesPlayedTodayCount: number;
    latestGameHighlight?: {
      gameName: string;
      accuracyPercent: number;
      engagementNote: string;
    };
    activeGameCategories: string[];
    suggestedGameCue?: {
      gameName: string;
      encouragementPrompt: string;
    };
  };
  memoryInteractions: Array<{
    id: string;
    title: string;
    category: string;
    descriptionSnippet: string;
    photoEmoji?: string;
  }>;
  familyInteractions: Array<{
    id: string;
    senderName: string;
    type: string;
    title: string;
    timestamp: string;
  }>;
  recentCompanionConversations: Array<{
    timestamp: string;
    topicCategory?: string;
    summarySnippet: string;
  }>;
}
