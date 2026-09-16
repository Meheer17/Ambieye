import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../api/apiService";
import { API_CONFIG } from "../api/config";
import {
  GameSession,
  GameEvent,
  GameSessionStats,
  GameEventType,
  StartGameSessionParams,
  RecordGameEventParams,
  UpdateGameSessionParams,
} from "@/types/gameSession";

/**
 * Key for temporary offline buffering when network is unreachable.
 * NOTE: This is strictly an offline fallback queue, NOT a permanent database.
 */
const OFFLINE_BUFFER_KEY = "@ambieye_games_offline_buffer";

/**
 * Common Game Session & Event Service
 * Provides unified, reusable session tracking and telemetry for all 10-15 patient games.
 *
 * Architecture Flow:
 * UI (Game Components)
 *   ↓
 * GameSessionService (Client Abstraction)
 *   ↓
 * Backend API (FastAPI @ http://localhost:8000/api/games/...)
 *   ↓
 * Persistent SQLite Database (ambieye.db -> game_sessions, game_events)
 */
export class GameSessionService {
  /**
   * Helper: Resolves the active patient ID from parameters or stored auth
   */
  private async resolvePatientId(explicitId?: string): Promise<string> {
    if (explicitId && explicitId.trim().length > 0) {
      return explicitId.trim();
    }
    try {
      const storedId = await AsyncStorage.getItem("userId");
      if (storedId && storedId.trim().length > 0) {
        return storedId.trim();
      }
      const storedUser = await AsyncStorage.getItem("username");
      if (storedUser && storedUser.trim().length > 0) {
        return storedUser.trim();
      }
    } catch {
      // Fallback
    }
    return "mahi"; // Default active patient profile
  }

  /**
   * 1. Start a new game session
   * Creates a persistent session record in SQLite via backend API.
   */
  async startSession(params: StartGameSessionParams): Promise<GameSession> {
    const patientId = await this.resolvePatientId(params.patientId);
    const sessionId =
      params.sessionId ||
      `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const startedAt = new Date().toISOString();

    const payload = {
      sessionId,
      patientId,
      gameId: params.gameId,
      startedAt,
      status: "in_progress",
      score: null,
      metadata: params.metadata || {},
    };

    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.GAMES.SESSIONS,
        payload
      );
      if (response.data?.success && response.data?.session) {
        // Record initial game_started event
        await this.recordEvent({
          sessionId,
          patientId,
          gameId: params.gameId,
          eventType: "game_started",
          metadata: { startedAt, ...params.metadata },
        });

        return response.data.session as GameSession;
      }
    } catch (err: any) {
      console.warn(
        "[GameSessionService] Remote session creation unavailable, buffering locally:",
        err.message
      );
      await this.bufferOfflineItem("session_create", payload);
    }

    // Local fallback object matching GameSession contract
    const localSession: GameSession = {
      sessionId,
      patientId,
      gameId: params.gameId,
      startedAt,
      completedAt: null,
      duration: 0,
      status: "in_progress",
      score: null,
      metadata: params.metadata || {},
    };

    return localSession;
  }

  /**
   * 2. Record a discrete gameplay event
   * Saves granular action to SQLite (e.g. answer submitted, hint used, round completed).
   */
  async recordEvent(params: RecordGameEventParams): Promise<GameEvent> {
    const patientId = await this.resolvePatientId(params.patientId);
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const timestamp = params.timestamp || new Date().toISOString();

    const payload = {
      eventId,
      sessionId: params.sessionId,
      patientId,
      gameId: params.gameId || "generic_game",
      eventType: params.eventType,
      timestamp,
      metadata: params.metadata || {},
    };

    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.GAMES.EVENTS,
        payload
      );
      if (response.data?.success && response.data?.event) {
        return response.data.event as GameEvent;
      }
    } catch (err: any) {
      console.warn(
        "[GameSessionService] Remote event recording unavailable, buffering locally:",
        err.message
      );
      await this.bufferOfflineItem("event_create", payload);
    }

    return {
      eventId,
      sessionId: params.sessionId,
      patientId,
      gameId: params.gameId || "generic_game",
      eventType: params.eventType,
      timestamp,
      metadata: params.metadata || {},
    };
  }

  /**
   * 3. Update an active session
   */
  async updateSession(
    sessionId: string,
    updates: UpdateGameSessionParams
  ): Promise<GameSession | null> {
    try {
      const response = await apiClient.put(
        `${API_CONFIG.ENDPOINTS.GAMES.SESSIONS}/${sessionId}`,
        updates
      );
      if (response.data?.success && response.data?.session) {
        return response.data.session as GameSession;
      }
    } catch (err: any) {
      console.warn(
        "[GameSessionService] Remote session update unavailable, buffering locally:",
        err.message
      );
      await this.bufferOfflineItem("session_update", { sessionId, ...updates });
    }
    return null;
  }

  /**
   * 4. Pause a session
   */
  async pauseSession(
    sessionId: string,
    metadata?: Record<string, any>
  ): Promise<GameSession | null> {
    const session = await this.updateSession(sessionId, {
      status: "paused",
      metadata,
    });
    await this.recordEvent({
      sessionId,
      eventType: "game_paused",
      metadata,
    });
    return session;
  }

  /**
   * 5. Resume a paused session
   */
  async resumeSession(
    sessionId: string,
    metadata?: Record<string, any>
  ): Promise<GameSession | null> {
    const session = await this.updateSession(sessionId, {
      status: "in_progress",
      metadata,
    });
    await this.recordEvent({
      sessionId,
      eventType: "game_resumed",
      metadata,
    });
    return session;
  }

  /**
   * 6. Complete a session
   * Marks session as finished, records final score and duration.
   */
  async completeSession(
    sessionId: string,
    score?: number,
    metadata?: Record<string, any>
  ): Promise<GameSession | null> {
    const completedAt = new Date().toISOString();
    const session = await this.updateSession(sessionId, {
      status: "completed",
      score,
      completedAt,
      metadata,
    });

    await this.recordEvent({
      sessionId,
      eventType: "game_completed",
      metadata: { completedAt, score, ...metadata },
    });

    return session;
  }

  /**
   * 7. Abandon a session (player exited early)
   */
  async abandonSession(
    sessionId: string,
    metadata?: Record<string, any>
  ): Promise<GameSession | null> {
    const completedAt = new Date().toISOString();
    const session = await this.updateSession(sessionId, {
      status: "abandoned",
      completedAt,
      metadata,
    });

    await this.recordEvent({
      sessionId,
      eventType: "game_abandoned",
      metadata: { abandonedAt: completedAt, ...metadata },
    });

    return session;
  }

  /**
   * 8. Retrieve a specific session by sessionId
   */
  async getSession(sessionId: string): Promise<GameSession | null> {
    try {
      const response = await apiClient.get(
        `${API_CONFIG.ENDPOINTS.GAMES.SESSIONS}/${sessionId}`
      );
      if (response.data?.success && response.data?.session) {
        return response.data.session as GameSession;
      }
    } catch (err) {
      console.error("[GameSessionService] Failed to retrieve session:", err);
    }
    return null;
  }

  /**
   * 9. Retrieve sessions for a patient
   */
  async getPatientSessions(
    patientId?: string,
    gameId?: string
  ): Promise<GameSession[]> {
    const resolvedPatientId = await this.resolvePatientId(patientId);
    try {
      let url = `${API_CONFIG.ENDPOINTS.GAMES.SESSIONS}?patient_id=${resolvedPatientId}`;
      if (gameId) {
        url += `&game_id=${encodeURIComponent(gameId)}`;
      }
      const response = await apiClient.get(url);
      if (response.data?.success && Array.isArray(response.data?.sessions)) {
        return response.data.sessions as GameSession[];
      }
    } catch (err) {
      console.error("[GameSessionService] Failed to fetch patient sessions:", err);
    }
    return [];
  }

  /**
   * 10. Retrieve events for a session
   */
  async getSessionEvents(sessionId: string): Promise<GameEvent[]> {
    try {
      const url = `${API_CONFIG.ENDPOINTS.GAMES.EVENTS}?session_id=${encodeURIComponent(sessionId)}`;
      const response = await apiClient.get(url);
      if (response.data?.success && Array.isArray(response.data?.events)) {
        return response.data.events as GameEvent[];
      }
    } catch (err) {
      console.error("[GameSessionService] Failed to fetch session events:", err);
    }
    return [];
  }

  /**
   * 11. Retrieve aggregated game statistics for a patient
   * Provides data for personalization, virtual companion context, and clinical trends.
   */
  async getPatientStats(
    patientId?: string,
    gameId?: string
  ): Promise<GameSessionStats> {
    const resolvedPatientId = await this.resolvePatientId(patientId);
    try {
      let url = `${API_CONFIG.ENDPOINTS.GAMES.STATS}?patient_id=${resolvedPatientId}`;
      if (gameId) {
        url += `&game_id=${encodeURIComponent(gameId)}`;
      }
      const response = await apiClient.get(url);
      if (response.data?.success && response.data?.stats) {
        return response.data.stats as GameSessionStats;
      }
    } catch (err) {
      console.error("[GameSessionService] Failed to fetch game stats:", err);
    }

    return {
      patientId: resolvedPatientId,
      gameId: gameId || null,
      totalSessions: 0,
      completedSessions: 0,
      abandonedSessions: 0,
      totalDurationSeconds: 0,
      averageDurationSeconds: 0,
      averageScore: null,
      highestScore: null,
      lastPlayedAt: null,
    };
  }

  /**
   * Internal offline buffer handler
   */
  private async bufferOfflineItem(type: string, item: any): Promise<void> {
    try {
      const existingJson = await AsyncStorage.getItem(OFFLINE_BUFFER_KEY);
      const list = existingJson ? JSON.parse(existingJson) : [];
      list.push({ type, item, bufferedAt: new Date().toISOString() });
      await AsyncStorage.setItem(OFFLINE_BUFFER_KEY, JSON.stringify(list));
    } catch {
      // Ignore buffer storage failures
    }
  }
}

/**
 * Global shared singleton instance of GameSessionService
 */
export const gameSessionService = new GameSessionService();
