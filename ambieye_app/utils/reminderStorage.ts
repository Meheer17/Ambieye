/**
 * utils/reminderStorage.ts
 * Offline Persistent Reminder Manager for Dementia Care
 * Manages daily hydration, medications, routine tasks, and SOS logs.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface MedicationItem {
  id: string;
  name: string;
  dosage: string;
  timeSlot: "morning" | "afternoon" | "night";
  timeLabel: string;
  taken: boolean;
  takenAt?: string;
  pillColor: string;
}

export interface DailyHydration {
  date: string; // YYYY-MM-DD
  glassesDrunk: number;
  dailyGoal: number;
  lastDrunkTime?: string;
}

export interface RoutineTask {
  id: string;
  title: string;
  timeLabel: string;
  completed: boolean;
  status?: "done" | "skipped" | "pending";
  iconName: string;
  description?: string;
}

export interface AppointmentItem {
  id: string;
  title: string;
  doctorName: string;
  date: string;
  timeLabel: string;
  location: string;
  completed: boolean;
}

const STORAGE_KEYS = {
  HYDRATION: "smriti_hydration_data",
  MEDICATIONS: "smriti_medications_data",
  ROUTINE: "smriti_routine_data",
  APPOINTMENTS: "smriti_appointments_data",
  SOS_LOGS: "smriti_sos_logs",
};

const DEFAULT_MEDICATIONS: MedicationItem[] = [
  {
    id: "med-1",
    name: "Donepezil / Memory Tablet",
    dosage: "5mg with water",
    timeSlot: "morning",
    timeLabel: "9:00 AM",
    taken: false,
    pillColor: "#3B82F6",
  },
  {
    id: "med-2",
    name: "Vitamin B12 & Minerals",
    dosage: "1 capsule after lunch",
    timeSlot: "afternoon",
    timeLabel: "1:30 PM",
    taken: false,
    pillColor: "#10B981",
  },
  {
    id: "med-3",
    name: "BP & Calming Night Tablet",
    dosage: "1 tablet with warm milk",
    timeSlot: "night",
    timeLabel: "8:30 PM",
    taken: false,
    pillColor: "#8B5CF6",
  },
];

const DEFAULT_ROUTINES: RoutineTask[] = [
  {
    id: "rt-1",
    title: "Morning Medicine",
    timeLabel: "9:00 AM",
    completed: false,
    iconName: "pill",
    description: "Take your morning medicine",
  },
  {
    id: "rt-2",
    title: "Bathing",
    timeLabel: "10:30 AM",
    completed: false,
    iconName: "shower",
    description: "Morning routine & refresh",
  },
  {
    id: "rt-3",
    title: "Grooming",
    timeLabel: "11:00 AM",
    completed: false,
    iconName: "sparkles",
    description: "Take your time",
  },
  {
    id: "rt-4",
    title: "Courtyard Rest & Music",
    timeLabel: "3:00 PM",
    completed: false,
    iconName: "music",
    description: "Gentle courtyard melodies",
  },
];

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

export const reminderStorage = {
  // ── Hydration ─────────────────────────────────────────────────────────────
  async getTodayHydration(): Promise<DailyHydration> {
    try {
      const today = getTodayString();
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.HYDRATION);
      if (raw) {
        const parsed: DailyHydration = JSON.parse(raw);
        if (parsed.date === today) {
          return parsed;
        }
      }
      // Reset for new day
      const fresh: DailyHydration = {
        date: today,
        glassesDrunk: 0,
        dailyGoal: 8,
      };
      await AsyncStorage.setItem(STORAGE_KEYS.HYDRATION, JSON.stringify(fresh));
      return fresh;
    } catch (e) {
      return { date: getTodayString(), glassesDrunk: 0, dailyGoal: 8 };
    }
  },

  async addWaterGlass(): Promise<DailyHydration> {
    const current = await reminderStorage.getTodayHydration();
    const updated: DailyHydration = {
      ...current,
      glassesDrunk: Math.min(current.glassesDrunk + 1, 15),
      lastDrunkTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.HYDRATION, JSON.stringify(updated));
    return updated;
  },

  // ── Medications ───────────────────────────────────────────────────────────
  async getTodayMedications(): Promise<MedicationItem[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.MEDICATIONS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.date === getTodayString() && parsed.items) {
          return parsed.items;
        }
      }
      // Fresh list for today
      const fresh = { date: getTodayString(), items: DEFAULT_MEDICATIONS };
      await AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(fresh));
      return DEFAULT_MEDICATIONS;
    } catch (e) {
      return DEFAULT_MEDICATIONS;
    }
  },

  async toggleMedication(id: string): Promise<MedicationItem[]> {
    const meds = await reminderStorage.getTodayMedications();
    const updated = meds.map((m) => {
      if (m.id === id) {
        const nextTaken = !m.taken;
        return {
          ...m,
          taken: nextTaken,
          takenAt: nextTaken ? new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined,
        };
      }
      return m;
    });
    await AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify({ date: getTodayString(), items: updated }));
    return updated;
  },

  // ── Daily Routines ────────────────────────────────────────────────────────
  async getTodayRoutines(): Promise<RoutineTask[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.ROUTINE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.date === getTodayString() && parsed.items) {
          return parsed.items;
        }
      }
      const fresh = { date: getTodayString(), items: DEFAULT_ROUTINES };
      await AsyncStorage.setItem(STORAGE_KEYS.ROUTINE, JSON.stringify(fresh));
      return DEFAULT_ROUTINES;
    } catch (e) {
      return DEFAULT_ROUTINES;
    }
  },

  async toggleRoutine(id: string): Promise<RoutineTask[]> {
    const routines = await reminderStorage.getTodayRoutines();
    const updated = routines.map((r) =>
      r.id === id ? { ...r, completed: !r.completed, status: (!r.completed ? "done" : "pending") as any } : r
    );
    await AsyncStorage.setItem(STORAGE_KEYS.ROUTINE, JSON.stringify({ date: getTodayString(), items: updated }));
    return updated;
  },

  async updateRoutineStatus(id: string, status: "done" | "skipped" | "pending"): Promise<RoutineTask[]> {
    const routines = await reminderStorage.getTodayRoutines();
    const updated = routines.map((r) =>
      r.id === id ? { ...r, status, completed: status === "done" } : r
    );
    await AsyncStorage.setItem(STORAGE_KEYS.ROUTINE, JSON.stringify({ date: getTodayString(), items: updated }));
    return updated;
  },

  // ── Appointments & Checkups ───────────────────────────────────────────────
  async getAppointments(): Promise<AppointmentItem[]> {
    const defaultAppointments: AppointmentItem[] = [
      {
        id: "apt-1",
        title: "Monthly Memory Review & MMSE Check",
        doctorName: "Dr. Himanta Sarma (Neurologist)",
        date: "Friday, 10:30 AM",
        timeLabel: "In 3 Days",
        location: "Guwahati Geriatric Clinic & Tele-Room",
        completed: false,
      },
      {
        id: "apt-2",
        title: "ASHA Worker Home Visit & Blood Pressure",
        doctorName: "Runu Deka (Community ASHA)",
        date: "Tomorrow, 4:00 PM",
        timeLabel: "Tomorrow",
        location: "Home Visit",
        completed: false,
      },
    ];

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
      if (raw) return JSON.parse(raw);
      await AsyncStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(defaultAppointments));
      return defaultAppointments;
    } catch {
      return defaultAppointments;
    }
  },

  async toggleAppointment(id: string): Promise<AppointmentItem[]> {
    const apts = await reminderStorage.getAppointments();
    const updated = apts.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a));
    await AsyncStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(updated));
    return updated;
  },

  // ── SOS Alert Log ─────────────────────────────────────────────────────────
  async triggerSOS(): Promise<{ success: boolean; time: string }> {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SOS_LOGS);
      const logs = raw ? JSON.parse(raw) : [];
      logs.unshift({ time, date: getTodayString(), status: "Alert Sent to Caregiver & Local ASHA Worker" });
      await AsyncStorage.setItem(STORAGE_KEYS.SOS_LOGS, JSON.stringify(logs.slice(0, 20)));
    } catch (e) {
      // ignore
    }
    return { success: true, time };
  },
};
