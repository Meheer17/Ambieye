import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../api/apiService";
import { API_CONFIG } from "../api/config";
import {
  RawCompanionEvent,
  GameEventFilter,
  IGameEventRepository,
} from "@/types/companionContext";

/**
 * Storage Key for Durable Local Persistence of Game Events.
 * Survives screen navigation, app restarts, and process kills.
 */
export const PERSISTED_GAME_EVENTS_STORAGE_KEY = "@ambieye_persisted_game_events";

/**
 * Storage Key for Caregiver Game Sessions
 */
const CAREGIVER_GAME_SESSIONS_KEY = "smriti_caregiver_game_sessions";

/**
 * Maximum number of raw events retained in local storage to prevent unbounded growth.
 */
const MAX_LOCAL_EVENTS = 500;

export class AsyncStorageGameEventRepository implements IGameEventRepository {
  /**
   * Persists a raw game event durably to local storage (AsyncStorage)
   * and opportunistically syncs with the existing backend if reachable.
   */
  async saveEvent(event: RawCompanionEvent): Promise<RawCompanionEvent> {
    try {
      // 1. Read existing local events from durable storage
      const raw = await AsyncStorage.getItem(PERSISTED_GAME_EVENTS_STORAGE_KEY);
      const events: RawCompanionEvent[] = raw ? JSON.parse(raw) : [];

      // 2. Prepend the new event (most recent first)
      const updatedList = [event, ...events].slice(0, MAX_LOCAL_EVENTS);

      // 3. Write back to durable storage (survives process restart)
      await AsyncStorage.setItem(
        PERSISTED_GAME_EVENTS_STORAGE_KEY,
        JSON.stringify(updatedList)
      );

      // 4. Update caregiver storage session view so caregiver & companion summaries stay consistent
      await this.syncToCaregiverStorage(event);

      // 5. Opportunistic background sync with real server if available
      this.syncToServerInBackground(event).catch(() => {
        // Silent catch: offline-first resilience
      });

      return event;
    } catch (error) {
      console.error("[GameEventRepository] Failed to save raw game event:", error);
      return event;
    }
  }

  /**
   * Retrieves events matching the optional filter criteria
   */
  async getEvents(filter?: GameEventFilter): Promise<RawCompanionEvent[]> {
    try {
      const raw = await AsyncStorage.getItem(PERSISTED_GAME_EVENTS_STORAGE_KEY);
      if (!raw) return [];

      let events: RawCompanionEvent[] = JSON.parse(raw);

      if (filter?.patientId) {
        events = events.filter((e) => e.patientId === filter.patientId);
      }

      if (filter?.gameId !== undefined) {
        const targetGameId = String(filter.gameId);
        events = events.filter((e) => String(e.gameId) === targetGameId);
      }

      if (filter?.eventType) {
        events = events.filter((e) => e.eventType === filter.eventType);
      }

      if (filter?.startDate) {
        const startTimestamp = new Date(filter.startDate).getTime();
        events = events.filter(
          (e) => new Date(e.timestamp).getTime() >= startTimestamp
        );
      }

      if (filter?.limit && filter.limit > 0) {
        events = events.slice(0, filter.limit);
      }

      return events;
    } catch (error) {
      console.error("[GameEventRepository] Failed to read events:", error);
      return [];
    }
  }

  /**
   * Retrieves all raw game events recorded today (local calendar date)
   */
  async getTodayEvents(patientId?: string): Promise<RawCompanionEvent[]> {
    const todayPrefix = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const all = await this.getEvents({ patientId });
    return all.filter((e) => e.timestamp.startsWith(todayPrefix));
  }

  /**
   * Retrieves a single event by unique ID
   */
  async getEventById(id: string): Promise<RawCompanionEvent | null> {
    const all = await this.getEvents();
    return all.find((e) => e.id === id) || null;
  }

  /**
   * Clears persisted events (e.g. during testing or account wipe)
   */
  async clearEvents(patientId?: string): Promise<void> {
    try {
      if (!patientId) {
        await AsyncStorage.removeItem(PERSISTED_GAME_EVENTS_STORAGE_KEY);
      } else {
        const raw = await AsyncStorage.getItem(PERSISTED_GAME_EVENTS_STORAGE_KEY);
        if (raw) {
          const events: RawCompanionEvent[] = JSON.parse(raw);
          const remaining = events.filter((e) => e.patientId !== patientId);
          await AsyncStorage.setItem(
            PERSISTED_GAME_EVENTS_STORAGE_KEY,
            JSON.stringify(remaining)
          );
        }
      }
    } catch (error) {
      console.error("[GameEventRepository] Failed to clear events:", error);
    }
  }

  /**
   * Bridges event into caregiver storage game sessions to avoid data divergence
   */
  private async syncToCaregiverStorage(event: RawCompanionEvent): Promise<void> {
    try {
      const rawSessions = await AsyncStorage.getItem(CAREGIVER_GAME_SESSIONS_KEY);
      const sessions = rawSessions ? JSON.parse(rawSessions) : [];

      const gameName = event.payload.gameName || `Game ${event.gameId}`;
      const accuracy = event.payload.accuracyPercent ?? 85;
      const score = event.payload.score ?? 80;
      const durationMins = Math.max(1, Math.round((event.payload.durationSeconds ?? 180) / 60));

      const newSessionEntry = {
        id: `cg_sess_${event.id}`,
        gameName,
        iconEmoji: "🎮",
        timestamp: `Today · ${new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        durationMinutes: durationMins,
        score,
        accuracyPercent: accuracy,
        mistakes: 0,
        responseTime: "Good",
        difficulty: event.payload.difficulty || "Standard",
        difficultyChangeReason: "Session completed naturally.",
        completed: event.payload.completed ?? true,
        humanSummary: `${gameName} session logged with ${accuracy}% accuracy.`,
      };

      const updated = [newSessionEntry, ...sessions].slice(0, 50);
      await AsyncStorage.setItem(CAREGIVER_GAME_SESSIONS_KEY, JSON.stringify(updated));
    } catch {
      // Non-critical background sync failure
    }
  }

  /**
   * Background sync to existing backend API endpoints if online
   */
  private async syncToServerInBackground(event: RawCompanionEvent): Promise<void> {
    const payload = {
      eventId: event.id,
      sessionId: `sess_${event.id}`,
      patientId: event.patientId,
      gameId: String(event.gameId),
      eventType: event.eventType,
      timestamp: event.timestamp,
      metadata: event.payload,
    };

    // 1. Post to FastAPI events endpoint
    try {
      await apiClient.post(API_CONFIG.ENDPOINTS.GAMES.EVENTS, payload);
    } catch {
      // Offline fallback
    }

    // 2. Post to standard results endpoint if score exists
    if (event.payload.score !== undefined) {
      try {
        await apiClient.post(API_CONFIG.ENDPOINTS.GAMES.RESULTS, {
          gameId: typeof event.gameId === "number" ? event.gameId : 1,
          score: event.payload.score,
          duration: event.payload.durationSeconds || 60,
          date: event.timestamp,
          details: event.payload.metadata || {},
        });
      } catch {
        // Offline fallback
      }
    }
  }
}

/**
 * Singleton repository instance
 */
export const gameEventRepository: IGameEventRepository = new AsyncStorageGameEventRepository();
