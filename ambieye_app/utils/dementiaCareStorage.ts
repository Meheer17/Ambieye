/**
 * utils/dementiaCareStorage.ts
 * Offline & Cloud-ready storage for:
 * 1. Caregiver Daily Behavior & Mood Logs (Confusion, Sundowning, Sleep, Appetite, Wandering)
 * 2. ASHA & Doctor 30-point NER MMSE Cognitive Screening Assessments
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export type MoodType = "calm" | "confused" | "agitated" | "wandering" | "anxious";
export type SleepQuality = "good" | "restless" | "insomnia";
export type AppetiteLevel = "normal" | "low" | "refused";
export type DementiaStage = "stage_normal" | "stage_mci" | "stage_moderate" | "stage_severe";

export interface BehaviorLogItem {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  mood: MoodType;
  sleep: SleepQuality;
  appetite: AppetiteLevel;
  notes: string;
}

export interface AshaMmseScores {
  orientationTime: number; // 0 - 5
  orientationPlace: number; // 0 - 5
  registration: number; // 0 - 3
  attention: number; // 0 - 5
  recall: number; // 0 - 3
  languageNaming: number; // 0 - 2
  languageRepeat: number; // 0 - 1
  construction: number; // 0 - 1
}

export interface AshaScreeningRecord {
  id: string;
  patientId: string;
  patientName: string;
  date: string; // YYYY-MM-DD HH:MM
  scores: AshaMmseScores;
  totalScore: number; // 0 - 30
  stage: DementiaStage;
  screenerName: string;
  notes?: string;
  escalatedToDoctor: boolean;
}

const STORAGE_KEYS = {
  BEHAVIOR_LOGS: "smriti_ner_caregiver_behavior_logs",
  ASHA_SCREENINGS: "smriti_ner_asha_screenings",
  ACTIVE_PATIENT_VIEW_MODE: "smriti_active_patient_view_mode", // 'elderly' | 'caregiver'
};

const DEFAULT_BEHAVIOR_LOGS: BehaviorLogItem[] = [
  {
    id: "log-1",
    date: new Date().toISOString().split("T")[0],
    time: "09:30 AM",
    mood: "calm",
    sleep: "good",
    appetite: "normal",
    notes: "Had morning herbal tea peacefully. Enjoyed reminiscence photos of Majuli.",
  },
  {
    id: "log-2",
    date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
    time: "06:15 PM",
    mood: "confused",
    sleep: "restless",
    appetite: "low",
    notes: "Mild sundowning confusion around sunset. Calmed down after listening to regional flute music.",
  },
];

const DEFAULT_SCREENINGS: AshaScreeningRecord[] = [
  {
    id: "scr-101",
    patientId: "pat-1",
    patientName: "Bhabesh Sharma",
    date: new Date(Date.now() - 86400000 * 3).toISOString().replace("T", " ").substring(0, 16),
    scores: {
      orientationTime: 4,
      orientationPlace: 4,
      registration: 3,
      attention: 3,
      recall: 2,
      languageNaming: 2,
      languageRepeat: 1,
      construction: 1,
    },
    totalScore: 20,
    stage: "stage_mci",
    screenerName: "Runu Deka (ASHA Worker - Kamrup)",
    notes: "Patient is cooperative. Minor delay in 3-item recall and serial math. Family counselled on memory routines.",
    escalatedToDoctor: true,
  },
  {
    id: "scr-102",
    patientId: "pat-2",
    patientName: "Rongsenwati Jamir",
    date: new Date(Date.now() - 86400000 * 7).toISOString().replace("T", " ").substring(0, 16),
    scores: {
      orientationTime: 5,
      orientationPlace: 5,
      registration: 3,
      attention: 5,
      recall: 3,
      languageNaming: 2,
      languageRepeat: 1,
      construction: 1,
    },
    totalScore: 25,
    stage: "stage_normal",
    screenerName: "Moarenla Ao (Community Volunteer)",
    notes: "Healthy cognitive scores. Retaining orientation well.",
    escalatedToDoctor: false,
  },
];

export function calculateDementiaStage(totalScore: number): DementiaStage {
  if (totalScore >= 24) return "stage_normal";
  if (totalScore >= 18) return "stage_mci";
  if (totalScore >= 10) return "stage_moderate";
  return "stage_severe";
}

export const dementiaCareStorage = {
  // ── Caregiver View Mode (Elderly Senior Kiosk vs Caregiver Guardian) ────────
  async getActiveViewMode(): Promise<"elderly" | "caregiver"> {
    try {
      const mode = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_PATIENT_VIEW_MODE);
      return mode === "caregiver" ? "caregiver" : "elderly";
    } catch {
      return "elderly";
    }
  },

  async setActiveViewMode(mode: "elderly" | "caregiver"): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_PATIENT_VIEW_MODE, mode);
    } catch (e) {
      console.error("Error setting active patient view mode:", e);
    }
  },

  // ── Daily Behavior & Mood Logs ─────────────────────────────────────────────
  async getBehaviorLogs(): Promise<BehaviorLogItem[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.BEHAVIOR_LOGS);
      if (raw) {
        return JSON.parse(raw);
      }
      await AsyncStorage.setItem(STORAGE_KEYS.BEHAVIOR_LOGS, JSON.stringify(DEFAULT_BEHAVIOR_LOGS));
      return DEFAULT_BEHAVIOR_LOGS;
    } catch {
      return DEFAULT_BEHAVIOR_LOGS;
    }
  },

  async addBehaviorLog(item: Omit<BehaviorLogItem, "id" | "date" | "time">): Promise<BehaviorLogItem[]> {
    const existing = await dementiaCareStorage.getBehaviorLogs();
    const now = new Date();
    const newLog: BehaviorLogItem = {
      ...item,
      id: `log-${Date.now()}`,
      date: now.toISOString().split("T")[0],
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const updated = [newLog, ...existing];
    await AsyncStorage.setItem(STORAGE_KEYS.BEHAVIOR_LOGS, JSON.stringify(updated));
    return updated;
  },

  // ── ASHA Cognitive Screenings ──────────────────────────────────────────────
  async getScreeningRecords(patientId?: string): Promise<AshaScreeningRecord[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.ASHA_SCREENINGS);
      let records: AshaScreeningRecord[] = raw ? JSON.parse(raw) : DEFAULT_SCREENINGS;
      if (!raw) {
        await AsyncStorage.setItem(STORAGE_KEYS.ASHA_SCREENINGS, JSON.stringify(DEFAULT_SCREENINGS));
      }
      if (patientId) {
        return records.filter((r) => r.patientId === patientId || r.patientName.toLowerCase().includes(patientId.toLowerCase()));
      }
      return records;
    } catch {
      return DEFAULT_SCREENINGS;
    }
  },

  async saveScreeningRecord(record: Omit<AshaScreeningRecord, "id" | "date" | "totalScore" | "stage">): Promise<AshaScreeningRecord> {
    const existing = await dementiaCareStorage.getScreeningRecords();
    const totalScore =
      record.scores.orientationTime +
      record.scores.orientationPlace +
      record.scores.registration +
      record.scores.attention +
      record.scores.recall +
      record.scores.languageNaming +
      record.scores.languageRepeat +
      record.scores.construction;

    const stage = calculateDementiaStage(totalScore);
    const now = new Date();
    const formattedDate = `${now.toISOString().split("T")[0]} ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

    const newRecord: AshaScreeningRecord = {
      ...record,
      id: `scr-${Date.now()}`,
      date: formattedDate,
      totalScore,
      stage,
    };

    const updated = [newRecord, ...existing];
    await AsyncStorage.setItem(STORAGE_KEYS.ASHA_SCREENINGS, JSON.stringify(updated));
    return newRecord;
  },
};
