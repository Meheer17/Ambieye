/**
 * utils/reminderStorage.ts
 * Unified Persistent Reminder Manager for Dementia Care
 * Live two-way synchronization between Caregiver and Patient portals.
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
  instructions?: string;
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

export const STORAGE_KEYS = {
  HYDRATION: "smriti_hydration_data",
  MEDICATIONS: "smriti_medications_data",
  ROUTINE: "smriti_routine_data",
  APPOINTMENTS: "smriti_appointments_data",
  SOS_LOGS: "smriti_sos_logs",
  // Master Shared Keys (Caregiver & Patient unified)
  CAREGIVER_MEDS: "@caregiver_care_medicines_v2",
  CAREGIVER_ROUTINES: "@caregiver_care_routines_v2",
  CAREGIVER_APPOINTMENTS: "@caregiver_care_appointments_v2",
  CAREGIVER_REMINDERS: "@caregiver_care_reminders_v2",
};

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
      const fresh: DailyHydration = {
        date: today,
        glassesDrunk: 0,
        dailyGoal: 8,
      };
      await AsyncStorage.setItem(STORAGE_KEYS.HYDRATION, JSON.stringify(fresh));
      return fresh;
    } catch {
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

  // ── Medications (Live Sync with Caregiver Dashboard) ───────────────────────
  async getTodayMedications(): Promise<MedicationItem[]> {
    try {
      // 1. Primary: Live Caregiver Medicines
      const caregiverRaw =
        (await AsyncStorage.getItem(STORAGE_KEYS.CAREGIVER_MEDS)) ||
        (await AsyncStorage.getItem("@caregiver_medicines_v2"));

      if (caregiverRaw) {
        const parsed = JSON.parse(caregiverRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const mapped: MedicationItem[] = parsed.map((m: any, idx: number) => ({
            id: m.id || `med-${idx}`,
            name: m.name || "Scheduled Medication",
            dosage: m.dosage || m.dose || "As directed",
            timeSlot:
              m.timeSlot === "morning" || m.timeSlot === "afternoon" || m.timeSlot === "night"
                ? m.timeSlot
                : "morning",
            timeLabel: m.timeLabel || m.time || "Scheduled",
            taken: m.status === "done" || m.status === "taken" || m.taken === true,
            takenAt: m.recordedAt || m.takenAt,
            pillColor:
              m.timeSlot === "morning" ? "#38BDF8" : m.timeSlot === "night" ? "#818CF8" : "#F59E0B",
            instructions: m.instructions,
          }));

          // Mirror to legacy key for compatibility
          await AsyncStorage.setItem(
            STORAGE_KEYS.MEDICATIONS,
            JSON.stringify({ date: getTodayString(), items: mapped })
          );
          return mapped;
        }
      }

      // 2. Fallback: Local Cache
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.MEDICATIONS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.items && Array.isArray(parsed.items)) {
          return parsed.items;
        }
      }
      return [];
    } catch {
      return [];
    }
  },

  async toggleMedication(id: string): Promise<MedicationItem[]> {
    try {
      // Update Caregiver Master Key
      const caregiverRaw = await AsyncStorage.getItem(STORAGE_KEYS.CAREGIVER_MEDS);
      if (caregiverRaw) {
        const parsed = JSON.parse(caregiverRaw);
        if (Array.isArray(parsed)) {
          const updatedCaregiver = parsed.map((m: any) => {
            if (m.id === id) {
              const isNowDone = m.status !== "done";
              return {
                ...m,
                status: isNowDone ? "done" : "upcoming",
                recordedAt: isNowDone
                  ? new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : undefined,
              };
            }
            return m;
          });
          await AsyncStorage.setItem(
            STORAGE_KEYS.CAREGIVER_MEDS,
            JSON.stringify(updatedCaregiver)
          );
        }
      }

      // Return updated list
      return await reminderStorage.getTodayMedications();
    } catch {
      return [];
    }
  },

  // ── Daily Routines (Live Sync with Caregiver Dashboard) ────────────────────
  async getTodayRoutines(): Promise<RoutineTask[]> {
    try {
      // 1. Primary: Live Caregiver Routines
      const caregiverRaw =
        (await AsyncStorage.getItem(STORAGE_KEYS.CAREGIVER_ROUTINES)) ||
        (await AsyncStorage.getItem("@caregiver_routines_v2"));

      if (caregiverRaw) {
        const parsed = JSON.parse(caregiverRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const mapped: RoutineTask[] = parsed.map((r: any, idx: number) => ({
            id: r.id || `rt-${idx}`,
            title: r.task || r.title || r.name || "Daily Routine",
            timeLabel: r.time || r.timeLabel || "Daily",
            completed: r.completed === true || r.status === "done",
            status: r.completed === true || r.status === "done" ? "done" : "pending",
            iconName: r.icon || r.iconName || "check-circle",
            description: r.description || r.repeat || "Daily routine",
          }));

          // Mirror to legacy key for compatibility
          await AsyncStorage.setItem(
            STORAGE_KEYS.ROUTINE,
            JSON.stringify({ date: getTodayString(), items: mapped })
          );
          return mapped;
        }
      }

      // 2. Fallback: Local Cache
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.ROUTINE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.items && Array.isArray(parsed.items)) {
          return parsed.items;
        }
      }
      return [];
    } catch {
      return [];
    }
  },

  async toggleRoutine(id: string): Promise<RoutineTask[]> {
    try {
      // Update Caregiver Master Key
      const caregiverRaw = await AsyncStorage.getItem(STORAGE_KEYS.CAREGIVER_ROUTINES);
      if (caregiverRaw) {
        const parsed = JSON.parse(caregiverRaw);
        if (Array.isArray(parsed)) {
          const updatedCaregiver = parsed.map((r: any) =>
            r.id === id ? { ...r, completed: !r.completed } : r
          );
          await AsyncStorage.setItem(
            STORAGE_KEYS.CAREGIVER_ROUTINES,
            JSON.stringify(updatedCaregiver)
          );
        }
      }

      // Return updated list
      return await reminderStorage.getTodayRoutines();
    } catch {
      return [];
    }
  },

  async updateRoutineStatus(id: string, status: "done" | "skipped" | "pending"): Promise<RoutineTask[]> {
    try {
      const caregiverRaw = await AsyncStorage.getItem(STORAGE_KEYS.CAREGIVER_ROUTINES);
      if (caregiverRaw) {
        const parsed = JSON.parse(caregiverRaw);
        if (Array.isArray(parsed)) {
          const updatedCaregiver = parsed.map((r: any) =>
            r.id === id
              ? {
                  ...r,
                  completed: status === "done",
                  status: status,
                }
              : r
          );
          await AsyncStorage.setItem(
            STORAGE_KEYS.CAREGIVER_ROUTINES,
            JSON.stringify(updatedCaregiver)
          );
        }
      }
      return await reminderStorage.getTodayRoutines();
    } catch {
      return [];
    }
  },

  // ── Appointments & Checkups (Live Sync with Caregiver Dashboard) ───────────
  async getAppointments(): Promise<AppointmentItem[]> {
    try {
      const caregiverRaw =
        (await AsyncStorage.getItem(STORAGE_KEYS.CAREGIVER_APPOINTMENTS)) ||
        (await AsyncStorage.getItem("@caregiver_appointments_v2"));

      if (caregiverRaw) {
        const parsed = JSON.parse(caregiverRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((a: any, idx: number) => ({
            id: a.id || `apt-${idx}`,
            title: a.reason || a.title || "Doctor Consultation",
            doctorName: a.doctor || a.doctorName || "Dr. Sharma",
            date: a.date || "Scheduled",
            timeLabel: a.time || a.timeLabel || "Upcoming",
            location: a.hospital || a.clinic || a.specialty || "Clinic Visit",
            completed: a.isPast === true || a.completed === true,
          }));
        }
      }

      const raw = await AsyncStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
      if (raw) return JSON.parse(raw);
      return [];
    } catch {
      return [];
    }
  },

  async toggleAppointment(id: string): Promise<AppointmentItem[]> {
    try {
      const caregiverRaw = await AsyncStorage.getItem(STORAGE_KEYS.CAREGIVER_APPOINTMENTS);
      if (caregiverRaw) {
        const parsed = JSON.parse(caregiverRaw);
        if (Array.isArray(parsed)) {
          const updated = parsed.map((a: any) =>
            a.id === id ? { ...a, isPast: !a.isPast, completed: !a.completed } : a
          );
          await AsyncStorage.setItem(
            STORAGE_KEYS.CAREGIVER_APPOINTMENTS,
            JSON.stringify(updated)
          );
        }
      }
      return await reminderStorage.getAppointments();
    } catch {
      return [];
    }
  },

  // ── SOS Alert Log ─────────────────────────────────────────────────────────
  async triggerSOS(): Promise<{ success: boolean; time: string }> {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SOS_LOGS);
      const logs = raw ? JSON.parse(raw) : [];
      logs.unshift({ time, date: getTodayString(), status: "Alert Sent to Caregiver & Local ASHA Worker" });
      await AsyncStorage.setItem(STORAGE_KEYS.SOS_LOGS, JSON.stringify(logs.slice(0, 20)));
    } catch {
      // ignore
    }
    return { success: true, time };
  },
};
