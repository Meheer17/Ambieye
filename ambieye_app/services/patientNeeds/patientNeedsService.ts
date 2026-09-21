/**
 * services/patientNeeds/patientNeedsService.ts
 * Real-time synchronization service for patient "What Do You Need?" requests.
 * Connects elder interactions on tablet kiosk with the caregiver dashboard instantly.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { caregiverStorage } from "../../utils/caregiverStorage";

export interface PatientNeedRequest {
  id: string;
  needId: string;
  label: string;
  subLabel: string;
  emoji: string;
  timestamp: string; // ISO string
  displayTime: string; // e.g. "12:35 PM"
  patientName: string;
  status: "pending" | "attending" | "completed";
  acknowledged: boolean;
  acknowledgedAt?: string;
  caregiverNotes?: string;
  caregiverName?: string;
}

export type PatientNeedListener = (
  activeNeed: PatientNeedRequest | null,
  history: PatientNeedRequest[]
) => void;

const STORAGE_KEYS = {
  ACTIVE_NEED: "@ambieye_active_patient_need",
  NEEDS_LOG: "@ambieye_elder_needs_log",
};

class PatientNeedsService {
  private listeners: Set<PatientNeedListener> = new Set();
  private cachedActiveNeed: PatientNeedRequest | null = null;
  private cachedHistory: PatientNeedRequest[] = [];
  private initialized = false;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      const [rawActive, rawLog] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_NEED),
        AsyncStorage.getItem(STORAGE_KEYS.NEEDS_LOG),
      ]);
      if (rawActive) {
        this.cachedActiveNeed = JSON.parse(rawActive);
      }
      if (rawLog) {
        this.cachedHistory = JSON.parse(rawLog);
      }
      this.initialized = true;
    } catch {
      // fallback
    }
  }

  /**
   * Subscribe to real-time changes in patient assistance requests
   */
  public subscribe(listener: PatientNeedListener): () => void {
    this.listeners.add(listener);
    // Send current cached value immediately
    listener(this.cachedActiveNeed, this.cachedHistory);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.cachedActiveNeed, this.cachedHistory);
      } catch (err) {
        console.warn("[PatientNeedsService] Error in listener:", err);
      }
    });
  }

  /**
   * Trigger a new need from the patient screen (e.g. "Walk", "Water", "Food")
   */
  public async triggerNeed(
    need: { id: string; emoji: string; label: string; subLabel: string },
    patientName: string = "Bhaben"
  ): Promise<PatientNeedRequest> {
    const now = new Date();
    const displayTime = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newRequest: PatientNeedRequest = {
      id: `need_${Date.now()}`,
      needId: need.id,
      label: need.label,
      subLabel: need.subLabel,
      emoji: need.emoji,
      timestamp: now.toISOString(),
      displayTime,
      patientName,
      status: "pending",
      acknowledged: false,
    };

    this.cachedActiveNeed = newRequest;
    this.cachedHistory = [newRequest, ...this.cachedHistory.slice(0, 49)];

    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_NEED, JSON.stringify(newRequest)),
        AsyncStorage.setItem(STORAGE_KEYS.NEEDS_LOG, JSON.stringify(this.cachedHistory)),
      ]);

      // If the patient requested a Walk, automatically record an urgent CaregiverActivity
      if (need.id === "walk") {
        await caregiverStorage.addActivity({
          title: `Outdoor Walk (${need.subLabel})`,
          category: "movement",
          timeLabel: `${displayTime} · Elder Requested`,
          completed: false,
          duration: "15-20 min",
          notes: `${patientName} requested to go out for a walk. Assist elder safely in the courtyard or garden.`,
          isRealWorldStimulation: true,
          suggestedPrompt: "Offer a light cardigan, supportive shoes, and a gentle walk along the veranda or courtyard.",
          iconName: "walk-outline",
        });
      } else if (need.id === "washroom") {
        await caregiverStorage.addActivity({
          title: `Washroom Assistance (${patientName})`,
          category: "daily_life",
          timeLabel: `${displayTime} · Urgent`,
          completed: false,
          duration: "Immediate",
          notes: `${patientName} requested assistance to visit the washroom. Check for dry floors and assist with balance.`,
          isRealWorldStimulation: false,
          suggestedPrompt: "Provide steady elbow support and guide calmly to the restroom.",
          iconName: "body-outline",
        });
      } else if (need.id === "water") {
        await caregiverStorage.addActivity({
          title: `Offer Warm Water / Hydration`,
          category: "daily_life",
          timeLabel: `${displayTime} · Requested`,
          completed: false,
          duration: "5 min",
          notes: `${patientName} expressed thirst. Offer a glass of lukewarm water or herbal tea.`,
          isRealWorldStimulation: false,
          suggestedPrompt: "Present a non-spill glass with fresh lukewarm water.",
          iconName: "water-outline",
        });
      } else if (need.id === "food") {
        await caregiverStorage.addActivity({
          title: `Light Snack or Meal Request`,
          category: "daily_life",
          timeLabel: `${displayTime} · Requested`,
          completed: false,
          duration: "15 min",
          notes: `${patientName} feels hungry. Offer a light healthy snack (banana, warm khichdi, or biscuits).`,
          isRealWorldStimulation: false,
          suggestedPrompt: "Check regular meal schedule and serve a digestible comfort snack.",
          iconName: "restaurant-outline",
        });
      } else if (need.id === "company") {
        await caregiverStorage.addActivity({
          title: `Social Companion Pause (${patientName})`,
          category: "social",
          timeLabel: `${displayTime} · Elder Requested`,
          completed: false,
          duration: "15 min",
          notes: `${patientName} wants to talk and have company. Spend gentle unhurried time together.`,
          isRealWorldStimulation: true,
          suggestedPrompt: "Sit nearby, ask about an old memory or listen to regional folk music together.",
          iconName: "chatbubbles-outline",
        });
      }
    } catch (err) {
      console.warn("[PatientNeedsService] Failed to persist need:", err);
    }

    this.notify();
    return newRequest;
  }

  /**
   * Get active pending request
   */
  public async getActiveNeed(): Promise<PatientNeedRequest | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_NEED);
      if (raw) {
        this.cachedActiveNeed = JSON.parse(raw);
      } else {
        this.cachedActiveNeed = null;
      }
    } catch {
      // fallback
    }
    return this.cachedActiveNeed;
  }

  /**
   * Get historical log of elder needs
   */
  public async getNeedsHistory(): Promise<PatientNeedRequest[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.NEEDS_LOG);
      if (raw) {
        this.cachedHistory = JSON.parse(raw);
      }
    } catch {
      // fallback
    }
    return this.cachedHistory;
  }

  /**
   * Caregiver responds to the need: marks "attending" or "completed"
   */
  public async respondToNeed(
    id: string,
    status: "attending" | "completed",
    caregiverName: string = "Caregiver",
    notes?: string
  ): Promise<PatientNeedRequest | null> {
    const now = new Date();
    let targetNeed: PatientNeedRequest | null = null;

    this.cachedHistory = this.cachedHistory.map((item) => {
      if (item.id === id) {
        targetNeed = {
          ...item,
          status,
          acknowledged: true,
          acknowledgedAt: now.toISOString(),
          caregiverName,
          caregiverNotes: notes || (status === "attending" ? "Caregiver is attending" : "Assistance completed"),
        };
        return targetNeed;
      }
      return item;
    });

    if (this.cachedActiveNeed && this.cachedActiveNeed.id === id) {
      if (status === "completed") {
        this.cachedActiveNeed = null;
        await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_NEED);
      } else {
        this.cachedActiveNeed = targetNeed;
        await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_NEED, JSON.stringify(targetNeed));
      }
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEYS.NEEDS_LOG, JSON.stringify(this.cachedHistory));
    } catch (err) {
      console.warn("[PatientNeedsService] Failed to update need status:", err);
    }

    this.notify();
    return targetNeed;
  }

  /**
   * Dismiss or clear the active need
   */
  public async clearActiveNeed(): Promise<void> {
    this.cachedActiveNeed = null;
    await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_NEED);
    this.notify();
  }
}

export const patientNeedsService = new PatientNeedsService();
