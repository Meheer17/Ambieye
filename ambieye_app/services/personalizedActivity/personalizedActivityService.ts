/**
 * services/personalizedActivity/personalizedActivityService.ts
 * Real-time & offline-capable client service for Caregiver Personalized Recognition Challenges.
 */

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../api/apiService";
import { API_CONFIG } from "../api/config";
import {
  PersonalizedActivity,
  PersonalizedActivityResult,
  CaregiverRecognitionSummary,
  CreatePersonalizedActivityParams,
} from "@/types/personalizedActivity";

const OFFLINE_ACTIVITIES_KEY = "@ambieye_personalized_activities_cache";
const OFFLINE_RESULTS_KEY = "@ambieye_personalized_results_cache";

type ActivityListener = (activity: PersonalizedActivity) => void;
type ResultListener = (result: PersonalizedActivityResult) => void;

export function normalizeMediaUrl(url?: string): string {
  if (!url) return "";
  if (url.startsWith("/")) {
    const host = API_CONFIG.BASE_URL.replace(/\/api\/?$/, "");
    return `${host}${url}`;
  }
  return url;
}

export function normalizeActivity(activity: PersonalizedActivity): PersonalizedActivity {
  return {
    ...activity,
    mediaUrl: normalizeMediaUrl(activity.mediaUrl),
    thumbnailUrl: activity.thumbnailUrl ? normalizeMediaUrl(activity.thumbnailUrl) : undefined,
  };
}

class PersonalizedActivityService {
  private ws: WebSocket | null = null;
  private activityListeners: Set<ActivityListener> = new Set();
  private resultListeners: Set<ResultListener> = new Set();
  private isConnectingWs = false;
  private pingTimer: any = null;

  constructor() {
    this.initRealtimeWebSocket();
  }

  /**
   * Initializes real-time WebSocket connection for instant push notifications
   */
  public initRealtimeWebSocket() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (this.isConnectingWs) return;
    this.isConnectingWs = true;

    try {
      const devHost = API_CONFIG.getDevHostIp ? API_CONFIG.getDevHostIp() : API_CONFIG.LOCAL_IP;
      const wsUrl = `ws://${devHost}:8000/ws/realtime`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnectingWs = false;
        console.log("[PersonalizedActivityService] Real-time WS Connected to", wsUrl);

        // Start 25s ping keep-alive
        if (this.pingTimer) clearInterval(this.pingTimer);
        this.pingTimer = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
              this.ws.send(JSON.stringify({ type: "PING" }));
            } catch {}
          }
        }, 25000);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "NEW_PERSONALIZED_ACTIVITY" && data.activity) {
            const normalized = normalizeActivity(data.activity);
            this.cacheActivity(normalized);
            this.notifyActivityListeners(normalized);
          } else if (data.type === "PERSONALIZED_ACTIVITY_COMPLETED" && data.result) {
            this.cacheResult(data.result);
            this.notifyResultListeners(data.result);
          }
        } catch {
          // ignore non-json
        }
      };

      this.ws.onerror = () => {
        this.isConnectingWs = false;
        // Non-fatal transient network notice
      };

      this.ws.onclose = () => {
        if (this.pingTimer) clearInterval(this.pingTimer);
        this.ws = null;
        this.isConnectingWs = false;
        // Auto-reconnect after 5 seconds
        setTimeout(() => this.initRealtimeWebSocket(), 5000);
      };
    } catch {
      this.isConnectingWs = false;
    }
  }


  /**
   * Subscribe to new incoming personalized challenges (used by patient popup)
   */
  public onNewActivity(listener: ActivityListener): () => void {
    this.activityListeners.add(listener);
    return () => {
      this.activityListeners.delete(listener);
    };
  }

  /**
   * Subscribe to activity results (used by caregiver dashboard)
   */
  public onActivityResult(listener: ResultListener): () => void {
    this.resultListeners.add(listener);
    return () => {
      this.resultListeners.delete(listener);
    };
  }

  private notifyActivityListeners(activity: PersonalizedActivity) {
    this.activityListeners.forEach((fn) => {
      try {
        fn(activity);
      } catch (err) {
        console.error("Error in activity listener callback:", err);
      }
    });
  }

  private notifyResultListeners(result: PersonalizedActivityResult) {
    this.resultListeners.forEach((fn) => {
      try {
        fn(result);
      } catch (err) {
        console.error("Error in result listener callback:", err);
      }
    });
  }

  /**
   * Upload media file (photo, audio recording, video) to backend
   */
  public async uploadMedia(fileData: {
    uri: string;
    name?: string;
    type?: string;
  }): Promise<{ success: boolean; mediaUrl: string; mediaType: string }> {
    try {
      const formData = new FormData();
      const filename =
        fileData.name ||
        fileData.uri.split("/").pop() ||
        `upload_${Date.now()}.jpg`;

      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : "jpg";
      let mimeType = fileData.type;

      if (!mimeType) {
        if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
          mimeType = `image/${ext === "jpg" ? "jpeg" : ext}`;
        } else if (["m4a", "mp3", "wav", "aac", "ogg"].includes(ext)) {
          mimeType = `audio/${ext}`;
        } else if (["mp4", "mov", "avi", "webm"].includes(ext)) {
          mimeType = `video/${ext}`;
        } else {
          mimeType = "application/octet-stream";
        }
      }

      if (Platform.OS === "web") {
        try {
          const resBlob = await fetch(fileData.uri);
          const blob = await resBlob.blob();
          formData.append("file", blob, filename);
        } catch {
          formData.append("file", {
            uri: fileData.uri,
            name: filename,
            type: mimeType,
          } as any);
        }
      } else {
        // @ts-ignore React Native FormData file object
        formData.append("file", {
          uri: fileData.uri,
          name: filename,
          type: mimeType,
        });
      }

      const devHost = API_CONFIG.getDevHostIp ? API_CONFIG.getDevHostIp() : API_CONFIG.LOCAL_IP;
      const host = Platform.OS === "android" || Platform.OS === "ios" ? devHost : "localhost";
      const uploadUrl = `http://${host}:8000/api${API_CONFIG.ENDPOINTS.PERSONALIZED_ACTIVITIES.UPLOAD_MEDIA}`;

      const res = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.success) {
          const fullMediaUrl = data.mediaUrl.startsWith("http")
            ? data.mediaUrl
            : `http://${host}:8000${data.mediaUrl}`;
          return {
            success: true,
            mediaUrl: fullMediaUrl,
            mediaType: data.mediaType,
          };
        }
      }
    } catch {
      // Clean fallback to local URI when remote is unreachable
    }

    // Fallback: return local URI
    let detectedType = "photo";
    if (fileData.type?.includes("audio") || fileData.uri.endsWith(".m4a") || fileData.uri.endsWith(".mp3")) {
      detectedType = "audio";
    } else if (fileData.type?.includes("video") || fileData.uri.endsWith(".mp4")) {
      detectedType = "video";
    }

    return {
      success: true,
      mediaUrl: fileData.uri,
      mediaType: detectedType,
    };
  }

  /**
   * Caregiver creates a new personalized recognition challenge
   */
  public async createActivity(
    params: CreatePersonalizedActivityParams
  ): Promise<PersonalizedActivity> {
    const patientId = params.patientId || "mahi";
    const payload = {
      ...params,
      patientId,
      caregiverId: params.caregiverId || "caregiver",
    };

    try {
      const res = await apiClient.post(
        API_CONFIG.ENDPOINTS.PERSONALIZED_ACTIVITIES.CREATE,
        payload
      );
      if (res.data?.activity) {
        const act = normalizeActivity(res.data.activity as PersonalizedActivity);
        await this.cacheActivity(act);
        // Also fire local listeners in case offline
        this.notifyActivityListeners(act);
        return act;
      }
    } catch {
      // Clean fallback to local cache
    }

    // Local offline creation
    const localActivity: PersonalizedActivity = normalizeActivity({
      id: `pact_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      patientId,
      caregiverId: params.caregiverId || "caregiver",
      title: params.title,
      promptQuestion: params.promptQuestion,
      promptQuestionAs: params.promptQuestionAs,
      promptQuestionHi: params.promptQuestionHi,
      mediaType: params.mediaType,
      mediaUrl: params.mediaUrl,
      thumbnailUrl: params.thumbnailUrl,
      hintText: params.hintText,
      category: params.category,
      options: params.options,
      status: "active",
      createdAt: new Date().toISOString(),
    });

    await this.cacheActivity(localActivity);
    this.notifyActivityListeners(localActivity);
    return localActivity;
  }

  /**
   * Fetch all activities for patient
   */
  public async getActivities(
    patientId = "mahi",
    status?: string
  ): Promise<PersonalizedActivity[]> {
    try {
      const res = await apiClient.get(
        API_CONFIG.ENDPOINTS.PERSONALIZED_ACTIVITIES.LIST,
        {
          params: { patient_id: patientId, status },
        }
      );
      if (res.data?.activities) {
        const acts = (res.data.activities as PersonalizedActivity[]).map(normalizeActivity);
        await this.saveActivitiesCache(acts);
        return acts;
      }
    } catch {
      // Clean fallback to local cache
    }

    const cached = (await this.getCachedActivities()).map(normalizeActivity);
    if (status) {
      return cached.filter((a) => a.status === status && a.patientId === patientId);
    }
    return cached.filter((a) => a.patientId === patientId);
  }

  /**
   * Get activity by ID
   */
  public async getActivityById(activityId: string): Promise<PersonalizedActivity | null> {
    try {
      const res = await apiClient.get(
        API_CONFIG.ENDPOINTS.PERSONALIZED_ACTIVITIES.DETAIL(activityId)
      );
      if (res.data?.activity) {
        return normalizeActivity(res.data.activity as PersonalizedActivity);
      }
    } catch {
      // fallback to cache
    }

    const cached = await this.getCachedActivities();
    const found = cached.find((a) => a.id === activityId);
    return found ? normalizeActivity(found) : null;
  }

  /**
   * Patient submits their answer, timing, and reaction
   */
  public async submitResult(
    activityId: string,
    resultData: {
      patientId?: string;
      selectedOptionId: string;
      isCorrect: boolean;
      attemptsCount: number;
      hintUsed: boolean;
      responseTimeSeconds: number;
      patientReaction?: string;
    }
  ): Promise<PersonalizedActivityResult> {
    const patientId = resultData.patientId || "mahi";
    const payload = {
      ...resultData,
      patientId,
    };

    try {
      const res = await apiClient.post(
        API_CONFIG.ENDPOINTS.PERSONALIZED_ACTIVITIES.SUBMIT(activityId),
        payload
      );
      if (res.data?.result) {
        const result = res.data.result as PersonalizedActivityResult;
        await this.cacheResult(result);
        this.notifyResultListeners(result);
        return result;
      }
    } catch {
      // Clean fallback to local result cache
    }

    // Local offline result
    const localResult: PersonalizedActivityResult = {
      id: `pres_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      activityId,
      patientId,
      selectedOptionId: resultData.selectedOptionId,
      isCorrect: resultData.isCorrect,
      attemptsCount: resultData.attemptsCount,
      hintUsed: resultData.hintUsed,
      responseTimeSeconds: resultData.responseTimeSeconds,
      patientReaction: resultData.patientReaction,
      completedAt: new Date().toISOString(),
    };

    await this.cacheResult(localResult);
    this.notifyResultListeners(localResult);
    return localResult;
  }

  /**
   * Fetch results history for caregiver
   */
  public async getResults(patientId = "mahi"): Promise<PersonalizedActivityResult[]> {
    try {
      const res = await apiClient.get(
        API_CONFIG.ENDPOINTS.PERSONALIZED_ACTIVITIES.RESULTS,
        {
          params: { patient_id: patientId },
        }
      );
      if (res.data?.results) {
        const results = res.data.results as PersonalizedActivityResult[];
        await this.saveResultsCache(results);
        return results;
      }
    } catch {
      // Clean fallback to local cached results
    }

    return this.getCachedResults();
  }

  /**
   * Fetch caregiver summary metrics
   */
  public async getSummary(patientId = "mahi"): Promise<CaregiverRecognitionSummary> {
    try {
      const res = await apiClient.get(
        API_CONFIG.ENDPOINTS.PERSONALIZED_ACTIVITIES.SUMMARY,
        {
          params: { patient_id: patientId },
        }
      );
      if (res.data) {
        return res.data as CaregiverRecognitionSummary;
      }
    } catch {
      // Clean fallback to local summary calculation
    }

    // Compute from local cache
    const acts = await this.getCachedActivities();
    const results = await this.getCachedResults();
    const totalCreated = acts.length;
    const totalCompleted = acts.filter((a) => a.status === "completed").length;
    const totalPlayed = results.length;

    if (totalPlayed === 0) {
      return {
        patientId,
        totalCreated,
        totalCompleted,
        totalPlayed: 0,
        accuracyPercent: 0,
        firstAttemptAccuracyPercent: 0,
        avgResponseTimeSeconds: 0,
        hintsUsedCount: 0,
        recentReactions: [],
        categoryBreakdown: [],
      };
    }

    const correctCount = results.filter((r) => r.isCorrect).length;
    const firstAttemptCount = results.filter((r) => r.isCorrect && r.attemptsCount === 1).length;
    const hintsCount = results.filter((r) => r.hintUsed).length;
    const avgTime =
      Math.round(
        (results.reduce((acc, r) => acc + (r.responseTimeSeconds || 0), 0) /
          totalPlayed) *
          10
      ) / 10;

    return {
      patientId,
      totalCreated,
      totalCompleted,
      totalPlayed,
      accuracyPercent: Math.round((correctCount / totalPlayed) * 100),
      firstAttemptAccuracyPercent: Math.round((firstAttemptCount / totalPlayed) * 100),
      avgResponseTimeSeconds: avgTime,
      hintsUsedCount: hintsCount,
      recentReactions: results
        .filter((r) => r.patientReaction)
        .slice(0, 5)
        .map((r) => ({
          reaction: r.patientReaction || "",
          completedAt: r.completedAt,
          title: r.activityTitle || "Memory Recall",
          mediaType: r.mediaType || "photo",
        })),
      categoryBreakdown: [],
    };
  }

  // ── Cache Helpers ───────────────────────────────────────────────────────────

  private async getCachedActivities(): Promise<PersonalizedActivity[]> {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_ACTIVITIES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private async saveActivitiesCache(acts: PersonalizedActivity[]): Promise<void> {
    try {
      await AsyncStorage.setItem(OFFLINE_ACTIVITIES_KEY, JSON.stringify(acts));
    } catch {
      // ignore
    }
  }

  private async cacheActivity(act: PersonalizedActivity): Promise<void> {
    const list = await this.getCachedActivities();
    const updated = [act, ...list.filter((item) => item.id !== act.id)];
    await this.saveActivitiesCache(updated);
  }

  private async getCachedResults(): Promise<PersonalizedActivityResult[]> {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_RESULTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private async saveResultsCache(results: PersonalizedActivityResult[]): Promise<void> {
    try {
      await AsyncStorage.setItem(OFFLINE_RESULTS_KEY, JSON.stringify(results));
    } catch {
      // ignore
    }
  }

  private async cacheResult(result: PersonalizedActivityResult): Promise<void> {
    const list = await this.getCachedResults();
    const updated = [result, ...list.filter((item) => item.id !== result.id)];
    await this.saveResultsCache(updated);

    // Also update activity status in activities cache
    const acts = await this.getCachedActivities();
    const act = acts.find((a) => a.id === result.activityId);
    if (act) {
      act.status = "completed";
      act.lastResult = result;
      await this.saveActivitiesCache(acts);
    }
  }
}

export const personalizedActivityService = new PersonalizedActivityService();
