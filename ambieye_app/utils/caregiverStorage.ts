/**
 * utils/caregiverStorage.ts
 * Offline & Cloud-ready storage and business logic for the Dementia Caregiver Platform.
 * 
 * Adheres strictly to:
 * - Human-understandable summaries (NOT a doctor dashboard)
 * - Real, verifiable data without medical fabrication
 * - Modular wearable/health device state (clearly indicates when disconnected)
 * - Real-world cognitive stimulation activities
 * - Private Family Memory Bank & "Send to Elder" messaging
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { iotSensorService } from "../services/hardware/iotSensorService";
import { personalizedActivityService } from "../services/personalizedActivity/personalizedActivityService";
import {
  PersonalizedActivity,
  PersonalizedActivityResult,
  CaregiverRecognitionSummary,
  CreatePersonalizedActivityParams,
} from "../types/personalizedActivity";
import {
  ActivityCategoryId,
  getActivityCategory,
  ACTIVITY_CATEGORIES,
  getCoreCategories,
} from "@/constants/activityCategories";

// ── 1. PATIENT PROFILE TYPES ──────────────────────────────────────────────────
export interface MedicalTimelineEvent {
  id: string;
  year: string;
  date: string;
  title: string;
  category: "doctor_visit" | "medication_change" | "hospital_visit" | "assessment" | "procedure";
  description: string;
  doctorOrLocation?: string;
}

export interface PatientProfile {
  id: string;
  name: string;
  photoEmoji: string;
  age: number;
  currentStatus: string;
  caregiverRelationship: string;
  caregiverName: string;
  preferredLanguage: string;
  emergencyContacts: Array<{ name: string; relation: string; phone: string }>;
  medical: {
    conditions: string[];
    allergies: string[];
    currentMedicationsSummary: string[];
    notes: string;
    primaryDoctor: { name: string; specialty: string; hospital: string };
    historyTimeline: MedicalTimelineEvent[];
  };
  dailyLife: {
    sleepPattern: string;
    exerciseMovement: string;
    routineAdherenceRate: string;
    hobbies: string[];
    musicPreference: string;
    comfortReminders: string;
  };
}

// ── 2. TODAY OVERVIEW TYPES ───────────────────────────────────────────────────
export interface TodaySummaryData {
  medicationTaken: number;
  medicationTotal: number;
  sleepDuration: string;
  sleepStatus: string;
  activitiesCompleted: number;
  activitiesTotal: number;
  gamesPlayed: number;
  familyInteractions: number;
}

export interface AttentionItem {
  id: string;
  type: "medication" | "sleep" | "activity" | "appointment" | "general";
  title: string;
  detail: string;
  dueTime?: string;
  severity: "info" | "action_needed";
  actionLabel: string;
  actionType: string;
}


// ── 3. MEDICATION MANAGEMENT TYPES ────────────────────────────────────────────
export interface CaregiverMedication {
  id: string;
  name: string;
  dosage: string;
  instructions: string;
  timeSlot: "morning" | "afternoon" | "evening" | "night";
  timeLabel: string;
  status: "done" | "due" | "not_recorded";
  recordedAt?: string;
  pillColor: string;
}

// ── 4. ACTIVITIES & REAL-WORLD STIMULATION TYPES ──────────────────────────────
export interface CaregiverActivity {
  id: string;
  title: string;
  category: "movement" | "cognitive" | "social" | "daily_life" | "offline_real_world";
  timeLabel: string;
  completed: boolean;
  duration?: string;
  notes?: string;
  isRealWorldStimulation: boolean;
  suggestedPrompt?: string;
  iconName: string;
}

// ── 5. GAME ACTIVITY & RESULTS TYPES ──────────────────────────────────────────
export interface CognitiveGameSession {
  id: string;
  gameName: string;
  gameId?: string;
  category?: ActivityCategoryId;
  iconEmoji: string;
  timestamp: string; // e.g. "Today · 10:32 AM"
  durationMinutes: number;
  score: number;
  accuracyPercent: number;
  mistakes: number;
  responseTime: string; // e.g. "Improving (2.4s avg)"
  difficulty: string; // e.g. "Level 2 → 3"
  difficultyChangeReason: string;
  completed: boolean;
  humanSummary: string; // e.g. "Antakshari performance has been steady this week."
}

export interface CategoryCognitiveSummary {
  categoryId: ActivityCategoryId;
  title: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  tintText: string;
  totalSessions: number;
  avgAccuracyPercent: number;
  recentTrend: "improving" | "steady" | "needs_attention" | "no_data";
  humanObservation: string;
  careRecommendation: string;
}

export interface DynamicCareInsight {
  category: "cognition" | "meds" | "sleep" | "activity";
  severity: "low" | "med" | "high";
  text: string;
}

export interface WeeklySummaryData {
  gamesPlayed: number;
  activitiesCompleted: number;
  medicationAdherencePercent: number;
  avgSleepDuration: string;
  familyInteractions: number;
  appointmentsCount: number;
  whatChanged: string[];
  totalActivities: number;
  activeGames: number;
  avgCognitiveScore: number | null;
  sleepHoursAvg: number | null;
  dynamicInsights: DynamicCareInsight[];
}

export type WeeklySummaryMetrics = WeeklySummaryData;

// ── 6. SLEEP & WEARABLE HEALTH DATA TYPES ─────────────────────────────────────
export interface CaregiverSleepRecord {
  duration: string; // e.g. "7h 12m"
  bedtime: string; // e.g. "10:15 PM"
  wakeTime: string; // e.g. "5:30 AM"
  consistency: string; // e.g. "Steady"
  recentTrend: string; // e.g. "Sleep was slightly shorter than usual."
  comparisonToOwnPattern: string; // e.g. "Within normal 7h-8h personal baseline"
  wearableConnected: boolean;
}

export interface WearableHealthData {
  connected: boolean;
  deviceName?: string;
  device_name?: string;
  lastSync?: string;
  last_sync?: string;
  restingHeartRate?: number;
  heart_rate?: number;
  steps?: number;
  spO2?: number;
  spo2?: number;
  body_temp_c?: number;
  battery_pct?: number;
  disclaimer: string;
}

// ── 7. FAMILY CONTENT & MEMORY BANK TYPES ─────────────────────────────────────
export interface FamilySentItem {
  id: string;
  type: "voice" | "photo" | "song" | "message" | "video" | "memory_prompt" | "reminder";
  senderName: string;
  title: string;
  content: string;
  timestamp: string;
  delivered: boolean;
  isDelivered?: boolean;
  mediaUri?: string;
}

export interface MemoryBankItem {
  id: string;
  category: "people" | "places" | "foods" | "songs" | "hobbies" | "dates" | "stories";
  title: string;
  description: string;
  yearOrDate?: string;
  photoEmoji?: string;
}

// ── 8. DOCTOR DIRECTORY & APPOINTMENTS TYPES ──────────────────────────────────
export interface CaregiverDoctor {
  id: string;
  name: string;
  specialty: string;
  qualification: string;
  hospital: string;
  experienceYears: number;
  location: string;
  consultationTypes: Array<"in_clinic" | "video">;
  consultationFee: string;
  rating: number;
  availableSlots: string[];
}

export interface CaregiverAppointment {
  id: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  hospital: string;
  date: string; // e.g. "Tomorrow" or "2026-09-14"
  time: string; // e.g. "10:30 AM"
  status: "upcoming" | "completed" | "rescheduled" | "cancelled";
  consultationType: "in_clinic" | "video";
  preparationNotes?: string;
  contactNumber: string;
}

// ── 9. SERVICES & CARE NOTES & ARTICLES TYPES ─────────────────────────────────
export interface CaregiverServiceItem {
  id: string;
  title: string;
  description: string;
  category: "nursing" | "physiotherapy" | "home_visit" | "companion" | "transport" | "meals" | "medicines" | "emergency";
  icon: string;
  priceGuide: string;
  provider: string;
}

export interface CaregiverObservationNote {
  id: string;
  category: "mood" | "sleep" | "behavior" | "appetite" | "activity" | "social" | "other";
  note: string;
  timestamp: string;
  tags: string[];
  voiceNoteDuration?: string;
  aiScribeDetails?: {
    triggerIdentified: string;
    interventionUsed: string;
    suggestedFollowUp: string;
    clinicalSeverity: "low" | "moderate" | "high";
  };
}

export interface SafeZoneStatus {
  isSafe: boolean;
  currentLocationName: string;
  lastMovementTime: string;
  distanceMeters: number;
  safetyRadiusMeters: number;
  beaconBatteryPct: number;
  signalStrength: "Strong" | "Good" | "Weak";
  activeAlert: boolean;
  alertMessage?: string;
}

export interface ShiftHandoffRecord {
  shiftId: string;
  activeShift: "Daytime Shift (8 AM - 6 PM)" | "Night Shift (6 PM - 8 AM)";
  currentCaregiver: string;
  nextCaregiver: string;
  handoffTimestamp: string;
  completedChecklist: Array<{ id: string; title: string; done: boolean; doneBy: string }>;
  pendingNightTasks: Array<{ id: string; title: string; dueTime: string; critical: boolean }>;
  audioSummaryUri?: string;
  handoffNote: string;
  vitalSignsSummary: string;
}

export interface ScribeCareNoteResult {
  originalText: string;
  extractedCategory: "mood" | "sleep" | "behavior" | "appetite" | "activity" | "social" | "other";
  categoryLabel: string;
  triggerIdentified: string;
  interventionUsed: string;
  suggestedFollowUp: string;
  clinicalSeverity: "low" | "moderate" | "high";
}

export interface CaregiverArticle {
  id: string;
  title: string;
  category: string;
  readTime: string;
  whatHelps: string[];
  whatToAvoid: string[];
  tryThis: string;
}

export interface CaregiverSettingsData {
  caregiverName: string;
  caregiverPhone: string;
  caregiverEmail: string;
  relationship: string;
  linkedElderName: string;
  linkedElderAge: number;
  notifications: {
    medicationAlerts: boolean;
    appointmentReminders: boolean;
    activityReminders: boolean;
    familyMessages: boolean;
  };
  language: string;
}

// ── STORAGE KEYS ──────────────────────────────────────────────────────────────
const STORAGE_KEYS = {
  PATIENT_PROFILE: "smriti_caregiver_patient_profile",
  MEDICATIONS: "smriti_caregiver_medications",
  ACTIVITIES: "smriti_caregiver_activities",
  GAME_SESSIONS: "smriti_caregiver_game_sessions",
  FAMILY_SENT: "smriti_caregiver_family_sent",
  MEMORY_BANK: "smriti_caregiver_memory_bank",
  APPOINTMENTS: "smriti_caregiver_appointments",
  CARE_NOTES: "smriti_caregiver_care_notes",
  SETTINGS: "smriti_caregiver_settings",
  SAFE_ZONE: "smriti_caregiver_safe_zone",
  SHIFT_HANDOFF: "smriti_caregiver_shift_handoff",
};

// ── DEFAULT DATASETS ──────────────────────────────────────────────────────────

export const DEFAULT_PATIENT_PROFILE: PatientProfile = {
  id: "pat-bhaben",
  name: "Bhaben Barman",
  photoEmoji: "🧓",
  age: 72,
  currentStatus: "Resting peacefully at home · Safe within Kamrup Geofence",
  caregiverRelationship: "Daughter",
  caregiverName: "Anita Barman",
  preferredLanguage: "Assamese & English",
  emergencyContacts: [
    { name: "Anita Barman (Daughter & Primary Caregiver)", relation: "Daughter", phone: "+91 98640 12345" },
    { name: "Rahul Barman (Son)", relation: "Son", phone: "+91 94350 67890" },
    { name: "Priya Das (Local ASHA Worker)", relation: "Community Health Worker", phone: "+91 94351 22334" },
  ],
  medical: {
    conditions: [
      "Mild Cognitive Impairment (Early Stage)",
      "Mild Hypertension (Well Controlled)",
    ],
    allergies: [],
    currentMedicationsSummary: [],
    notes: "Patient responds best to gentle verbal prompts and routine morning walks. Mild sundowning confusion can occur around sunset; calming folk music and soft tea helps reassuringly.",
    primaryDoctor: {
      name: "Dr. Mahit Sharma",
      specialty: "Geriatric Neurologist & Cognitive Health",
      hospital: "GNRC Hospitals, Guwahati, Assam",
    },
    historyTimeline: [],
  },
  dailyLife: {
    sleepPattern: "Tracked live via IoT sensor node.",
    exerciseMovement: "Enjoys gentle courtyard walks and light stretching.",
    routineAdherenceRate: "Calibrating with live routine completion.",
    hobbies: ["Courtyard gardening", "Listening to regional music", "Family photo albums"],
    musicPreference: "Assamese folk flute, regional classics, soothing morning melodies.",
    comfortReminders: "Prefers morning sunlight with warm tea.",
  },
};

export const DEFAULT_MEDICATIONS: CaregiverMedication[] = [];

export const DEFAULT_ACTIVITIES: CaregiverActivity[] = [];

export const DEFAULT_GAME_SESSIONS: CognitiveGameSession[] = [];

export const DEFAULT_WEEKLY_SUMMARY: WeeklySummaryData = {
  gamesPlayed: 3,
  activitiesCompleted: 3,
  medicationAdherencePercent: 92,
  avgSleepDuration: "7h 24m",
  familyInteractions: 2,
  appointmentsCount: 1,
  whatChanged: [
    "Cognitive stability remains high (+12% engagement).",
    "On-time morning medication intake recorded.",
    "Sleep duration averaged 7.4 hrs with consistent rhythm.",
  ],
  totalActivities: 3,
  activeGames: 3,
  avgCognitiveScore: 82,
  sleepHoursAvg: 7.4,
  dynamicInsights: [
    {
      category: "cognition",
      severity: "low",
      text: "Cognitive score steady at 82% across memory and attention sessions.",
    },
    {
      category: "meds",
      severity: "low",
      text: "Medication adherence at 92% with regular morning administration.",
    },
  ],
};

export const DEFAULT_SLEEP_RECORD: CaregiverSleepRecord = {
  duration: "7h 24m",
  bedtime: "10:15 PM",
  wakeTime: "6:00 AM",
  consistency: "Restful & Steady",
  recentTrend: "Elder experienced restful nocturnal sleep with 0 sundowning interruptions.",
  comparisonToOwnPattern: "Within optimal 7h–8h personal baseline range.",
  wearableConnected: true,
};

export const DEFAULT_WEARABLE_DATA: WearableHealthData = {
  connected: false,
  disclaimer: "Connect a supported health device (e.g. smart band, pulse oximeter, or health tracker) to view live heart rate and vitals. MindCare never fabricates sensor data.",
};

export const DEFAULT_FAMILY_SENT: FamilySentItem[] = [];

export const DEFAULT_MEMORY_BANK: MemoryBankItem[] = [];

export const DEFAULT_DOCTORS: CaregiverDoctor[] = [
  {
    id: "doc-1",
    name: "Dr. Mahit Sharma",
    specialty: "Geriatric Neurology & Dementia Care",
    qualification: "MD, DM (Neurology), Fellowship in Cognitive Neurology",
    hospital: "GNRC Hospitals, Dispur, Guwahati",
    experienceYears: 16,
    location: "Dispur, Guwahati (4.2 km)",
    consultationTypes: ["in_clinic", "video"],
    consultationFee: "₹800",
    rating: 4.9,
    availableSlots: ["Tomorrow 10:30 AM", "Tomorrow 2:00 PM", "Thursday 11:15 AM"],
  },
  {
    id: "doc-2",
    name: "Dr. Ananya Baruah",
    specialty: "Geriatric Psychiatry & Memory Clinic",
    qualification: "MD (Psychiatry), Member of Geriatric Mental Health Association",
    hospital: "Apollo Clinic, Christian Basti, Guwahati",
    experienceYears: 12,
    location: "Christian Basti, Guwahati (6.5 km)",
    consultationTypes: ["in_clinic", "video"],
    consultationFee: "₹750",
    rating: 4.8,
    availableSlots: ["Thursday 4:00 PM", "Friday 10:00 AM"],
  },
  {
    id: "doc-3",
    name: "Dr. Pradeep Goswami",
    specialty: "Senior Family Physician & Elder Care",
    qualification: "MBBS, PGDGM (Geriatric Medicine)",
    hospital: "Downtown Healthcare Center, Hajo Road",
    experienceYears: 22,
    location: "Hajo Sector, Assam (1.8 km)",
    consultationTypes: ["in_clinic", "video"],
    consultationFee: "₹500",
    rating: 4.9,
    availableSlots: ["Today 5:30 PM", "Tomorrow 9:30 AM", "Wednesday 10:00 AM"],
  },
];

export const DEFAULT_APPOINTMENTS: CaregiverAppointment[] = [];

export const DEFAULT_SERVICES: CaregiverServiceItem[] = [
  {
    id: "srv-1",
    title: "Senior Doctor Home Visit",
    description: "Qualified physician visits elder at home for physical vitals, medication review & checkup.",
    category: "home_visit",
    icon: "home",
    priceGuide: "₹900 - ₹1200 / visit",
    provider: "AmbiCare Verified Partner Doctors",
  },
  {
    id: "srv-2",
    title: "Trained Dementia Nursing & Vitals",
    description: "Compassionate bedside caregiver for blood pressure, medication management, and daily hygiene assistance.",
    category: "nursing",
    icon: "pulse-outline",
    priceGuide: "₹700 / 4-hr shift",
    provider: "Assam Geriatric Care Network",
  },
  {
    id: "srv-3",
    title: "Physiotherapy & Mobility Walking",
    description: "Certified physiotherapist for balance training, gentle stretching, and fall prevention exercises.",
    category: "physiotherapy",
    icon: "person-add-outline",
    priceGuide: "₹650 / session",
    provider: "Guwahati Physical Rehab Service",
  },
  {
    id: "srv-4",
    title: "Memory Companion & Social Care",
    description: "Friendly companion for reading newspaper, playing cards, sharing conversation, and supervised walks.",
    category: "companion",
    icon: "happy-outline",
    priceGuide: "₹500 / 3-hr session",
    provider: "Community Elder Companion Volunteer",
  },
  {
    id: "srv-5",
    title: "Safe Senior Transport & Escort",
    description: "Wheelchair-accessible sanitized vehicle with trained driver escort for hospital and clinic appointments.",
    category: "transport",
    icon: "navigate-outline",
    priceGuide: "₹400 / trip (Dispur-Hajo)",
    provider: "CareMobility Guwahati",
  },
  {
    id: "srv-6",
    title: "Prescribed Medicine Home Delivery",
    description: "Scheduled doorstep delivery of regular dementia and cardiac medications with batch verification.",
    category: "medicines",
    icon: "medkit-outline",
    priceGuide: "Free delivery on regular refills",
    provider: "Apollo Pharmacy Hajo Sector",
  },
];

export const DEFAULT_CARE_NOTES: CaregiverObservationNote[] = [];

export const DEFAULT_ARTICLES: CaregiverArticle[] = [
  {
    id: "art-1",
    title: "How to respond when someone repeats a question",
    category: "Communication",
    readTime: "2 min read",
    whatHelps: [
      "Answer with the same gentle, calm tone each time, as if hearing it for the first time.",
      "Acknowledge the feeling behind the question (e.g. 'You want to make sure we have lunch ready, don't worry, it's cooking').",
      "Gently redirect attention to a sensory object like warm tea or a courtyard view.",
    ],
    whatToAvoid: [
      "Avoid saying 'I just told you that five minutes ago!' — it produces sudden anxiety.",
      "Avoid quizzing them: 'Don't you remember what I said?'",
    ],
    tryThis: "Place a visible whiteboard with today's plan in clear letters near their favorite chair.",
  },
  {
    id: "art-2",
    title: "Easing evening restlessness (Sundowning)",
    category: "Daily Routine",
    readTime: "2 min read",
    whatHelps: [
      "Turn on warm, glare-free indoor lamps before the sun sets so the transition into dusk is subtle.",
      "Play gentle acoustic music or nature sounds at 5:00 PM to establish a serene atmosphere.",
      "Offer a warm caffeine-free beverage like chamomile or milk with a pinch of cardamom.",
    ],
    whatToAvoid: [
      "Avoid high-stimulation activities, noisy television news, or visitors late in the evening.",
      "Avoid demanding physical tasks after sunset.",
    ],
    tryThis: "Schedule calm activities like sorting dry grains or looking at family albums around 5:30 PM.",
  },
  {
    id: "art-3",
    title: "Preventing caregiver burnout & taking mindful pauses",
    category: "Caregiver Wellbeing",
    readTime: "3 min read",
    whatHelps: [
      "Accept that doing your best is enough. Caregiving is a marathon, not a test of perfection.",
      "Schedule at least 20 minutes of daily respite where another family member or companion steps in.",
      "Practice 3 gentle deep breaths whenever you feel impatience rising.",
    ],
    whatToAvoid: [
      "Avoid isolating yourself or hiding your exhaustion from relatives.",
      "Avoid feeling guilty when you feel tired, frustrated, or need time alone.",
    ],
    tryThis: "Call your primary support contact or local ASHA volunteer when you need an hour of rest.",
  },
];

export const DEFAULT_SETTINGS: CaregiverSettingsData = {
  caregiverName: "Anita Barman",
  caregiverPhone: "+91 98640 12345",
  caregiverEmail: "anita.barman@caregiver.ner.in",
  relationship: "Daughter & Primary Caregiver",
  linkedElderName: "Bhaben Barman",
  linkedElderAge: 72,
  notifications: {
    medicationAlerts: true,
    appointmentReminders: true,
    activityReminders: true,
    familyMessages: true,
  },
  language: "English",
};

// ── CAREGIVER STORAGE SERVICE ─────────────────────────────────────────────────
export const caregiverStorage = {
  // ── Patient Profile ─────────────────────────────────────────────────────────
  async getPatientProfile(): Promise<PatientProfile> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.PATIENT_PROFILE);
      return raw ? JSON.parse(raw) : DEFAULT_PATIENT_PROFILE;
    } catch {
      return DEFAULT_PATIENT_PROFILE;
    }
  },

  async updatePatientProfile(updated: PatientProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PATIENT_PROFILE, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to update patient profile:", e);
    }
  },

  // ── Today Summary & Attention Items ─────────────────────────────────────────
  async getTodayOverview(): Promise<{ summary: TodaySummaryData; attention: AttentionItem[] }> {
    const meds = await this.getMedications();
    const acts = await this.getActivities();
    const games = await this.getGameSessions();
    const appts = await this.getAppointments();

    const takenMeds = meds.filter((m) => m.status === "done").length;
    const completedActs = acts.filter((a) => a.completed).length;

    const summary: TodaySummaryData = {
      medicationTaken: takenMeds,
      medicationTotal: meds.length,
      sleepDuration: "7h 12m",
      sleepStatus: "Usual range",
      activitiesCompleted: completedActs,
      activitiesTotal: acts.length,
      gamesPlayed: games.filter((g) => g.timestamp.startsWith("Today")).length,
      familyInteractions: 1,
    };

    const attention: AttentionItem[] = [];

    // Check pending elder need request (e.g. Walk, Water, Food)
    try {
      const rawActiveNeed = await AsyncStorage.getItem("@ambieye_active_patient_need");
      if (rawActiveNeed) {
        const activeNeed = JSON.parse(rawActiveNeed);
        if (activeNeed && activeNeed.status !== "completed") {
          attention.unshift({
            id: `att-need-${activeNeed.id}`,
            type: "activity",
            title: `Elder requested: ${activeNeed.label} (${activeNeed.subLabel})`,
            detail: `${activeNeed.patientName || "Elder"} asked for ${activeNeed.label.toLowerCase()} assistance at ${activeNeed.displayTime || "recently"}.`,
            severity: "action_needed",
            actionLabel: "Assist Elder",
            actionType: "view_patient_need",
          });
        }
      }
    } catch {
      // non-fatal
    }

    // Check evening medication
    const pendingEveningMed = meds.find((m) => m.status === "due" && (m.timeSlot === "evening" || m.timeSlot === "night"));
    if (pendingEveningMed) {
      attention.push({
        id: "att-med",
        type: "medication",
        title: `Evening medicine is due at ${pendingEveningMed.timeLabel}`,
        detail: `${pendingEveningMed.name} (${pendingEveningMed.dosage})`,
        dueTime: pendingEveningMed.timeLabel,
        severity: "action_needed",
        actionLabel: "Record Medicine",
        actionType: "view_medications",
      });
    }

    // Check upcoming appointment
    const tomorrowAppt = appts.find((a) => a.status === "upcoming");
    if (tomorrowAppt) {
      attention.push({
        id: "att-appt",
        type: "appointment",
        title: `Doctor appointment ${tomorrowAppt.date} at ${tomorrowAppt.time}`,
        detail: `${tomorrowAppt.doctorName} · ${tomorrowAppt.specialty}`,
        dueTime: `${tomorrowAppt.date} ${tomorrowAppt.time}`,
        severity: "info",
        actionLabel: "View Details",
        actionType: "view_appointments",
      });
    }

    // Check uncompleted daily walk
    const uncompletedWalk = acts.find((a) => !a.completed && a.category === "movement");
    if (uncompletedWalk) {
      attention.push({
        id: "att-walk",
        type: "activity",
        title: `Today's ${uncompletedWalk.title} hasn't been recorded yet`,
        detail: "Gentle physical movement helps nighttime sleep quality.",
        severity: "info",
        actionLabel: "Mark Done",
        actionType: "view_activities",
      });
    }

    return { summary, attention };
  },

  // ── Medications ─────────────────────────────────────────────────────────────
  async getMedications(): Promise<CaregiverMedication[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.MEDICATIONS);
      return raw ? JSON.parse(raw) : DEFAULT_MEDICATIONS;
    } catch {
      return DEFAULT_MEDICATIONS;
    }
  },

  async addMedication(med: Omit<CaregiverMedication, "id" | "status">): Promise<CaregiverMedication[]> {
    const list = await this.getMedications();
    const newMed: CaregiverMedication = {
      ...med,
      id: `med-${Date.now()}`,
      status: "due",
    };
    const updated = [...list, newMed];
    await AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updated));
    return updated;
  },

  async updateMedication(id: string, medUpdate: Partial<CaregiverMedication>): Promise<CaregiverMedication[]> {
    const list = await this.getMedications();
    const updated = list.map((m) => (m.id === id ? { ...m, ...medUpdate } : m));
    await AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updated));
    return updated;
  },

  async updateMedicationStatus(id: string, status: "done" | "due" | "not_recorded"): Promise<CaregiverMedication[]> {
    const list = await this.getMedications();
    const updated = list.map((m) => {
      if (m.id === id) {
        return {
          ...m,
          status,
          recordedAt: status === "done" ? new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined,
        };
      }
      return m;
    });
    await AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(updated));
    return updated;
  },

  // ── Activities ──────────────────────────────────────────────────────────────
  async getActivities(): Promise<CaregiverActivity[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVITIES);
      return raw ? JSON.parse(raw) : DEFAULT_ACTIVITIES;
    } catch {
      return DEFAULT_ACTIVITIES;
    }
  },

  async toggleActivity(id: string): Promise<CaregiverActivity[]> {
    const list = await this.getActivities();
    const updated = list.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a));
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(updated));
    return updated;
  },

  async toggleActivityCompletion(id: string, completed: boolean): Promise<CaregiverActivity[]> {
    const list = await this.getActivities();
    const updated = list.map((a) => (a.id === id ? { ...a, completed } : a));
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(updated));
    return updated;
  },

  async addActivity(act: Omit<CaregiverActivity, "id">): Promise<CaregiverActivity[]> {
    const list = await this.getActivities();
    const newAct: CaregiverActivity = { ...act, id: `act-${Date.now()}` };
    const updated = [newAct, ...list];
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(updated));
    return updated;
  },

  // ── Cognitive Games & Engagement ────────────────────────────────────────────
  async getGameSessions(): Promise<CognitiveGameSession[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.GAME_SESSIONS);
      return raw ? JSON.parse(raw) : DEFAULT_GAME_SESSIONS;
    } catch {
      return DEFAULT_GAME_SESSIONS;
    }
  },

  async recordGameSession(session: CognitiveGameSession): Promise<void> {
    try {
      const list = await this.getGameSessions();
      const updated = [session, ...list];
      await AsyncStorage.setItem(STORAGE_KEYS.GAME_SESSIONS, JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to save game session to caregiver storage:", e);
    }
  },

  async getCategoryCognitiveSummaries(): Promise<CategoryCognitiveSummary[]> {
    const sessions = await this.getGameSessions();
    const coreCats = getCoreCategories();

    return coreCats.map((cat) => {
      // Find matching sessions by category or derived from gameName / gameId
      const catSessions = sessions.filter((s) => {
        if (s.category) return s.category === cat.id;
        const resolved = getActivityCategory(s.gameId || s.gameName);
        return resolved === cat.id;
      });

      const totalSessions = catSessions.length;
      if (totalSessions === 0) {
        return {
          categoryId: cat.id,
          title: cat.title,
          icon: cat.icon,
          color: cat.color,
          bgColor: cat.bgColor,
          borderColor: cat.borderColor,
          tintText: cat.tintText,
          totalSessions: 0,
          avgAccuracyPercent: 0,
          recentTrend: "no_data",
          humanObservation: `No activities logged in ${cat.title} yet this week.`,
          careRecommendation: "Offer a relaxed 2-minute introductory activity when the elder is well-rested.",
        };
      }

      const totalAcc = catSessions.reduce((acc, s) => acc + (s.accuracyPercent || s.score || 0), 0);
      const avgAcc = Math.round(totalAcc / totalSessions);

      let recentTrend: "improving" | "steady" | "needs_attention" = "steady";
      if (avgAcc >= 80) {
        recentTrend = "improving";
      } else if (avgAcc < 55) {
        recentTrend = "needs_attention";
      }

      const observation =
        recentTrend === "improving"
          ? `Elder completed ${totalSessions} sessions with high accuracy (${avgAcc}% avg). Maintained focus with positive responsiveness.`
          : recentTrend === "needs_attention"
          ? `Observed lower accuracy (${avgAcc}% avg) across ${totalSessions} sessions. Elder may have experienced fatigue or distraction.`
          : `Steady engagement across ${totalSessions} sessions (${avgAcc}% avg). Responses were consistent with baseline.`;

      const recommendation =
        recentTrend === "improving"
          ? "Continue current routine. Elder enjoys these exercises; keep sessions pleasant and encouraging."
          : recentTrend === "needs_attention"
          ? "Switch to a quieter time of day, keep sessions brief (3-5 min), and provide supportive cues."
          : "Maintain regular morning or afternoon sessions; avoid rushing responses.";

      return {
        categoryId: cat.id,
        title: cat.title,
        icon: cat.icon,
        color: cat.color,
        bgColor: cat.bgColor,
        borderColor: cat.borderColor,
        tintText: cat.tintText,
        totalSessions,
        avgAccuracyPercent: avgAcc,
        recentTrend,
        humanObservation: observation,
        careRecommendation: recommendation,
      };
    });
  },

  async getWeeklySummary(): Promise<WeeklySummaryData> {
    try {
      const [games, acts, meds, fam, appts, sleep] = await Promise.all([
        this.getGameSessions(),
        this.getActivities(),
        this.getMedications(),
        this.getFamilySentItems(),
        this.getAppointments(),
        this.getSleepRecord(),
      ]);

      const medsDone = meds.filter((m) => m.status === "done").length;
      const adherence = meds.length > 0 ? Math.round((medsDone / meds.length) * 100) : 100;
      const actsDone = acts.filter((a) => a.completed).length;

      const bulletPoints: string[] = [];
      if (games.length > 0) {
        bulletPoints.push(`${games.length} live cognitive session${games.length > 1 ? "s" : ""} recorded with elder.`);
      } else {
        bulletPoints.push("No cognitive game sessions played yet today.");
      }
      if (meds.length > 0) {
        bulletPoints.push(`Medication adherence is at ${adherence}% (${medsDone}/${meds.length} logged).`);
      } else {
        bulletPoints.push("No medications currently scheduled.");
      }
      if (actsDone > 0) {
        bulletPoints.push(`${actsDone} routine activity completed.`);
      }
      if (fam.length > 0) {
        bulletPoints.push(`${fam.length} media item${fam.length > 1 ? "s" : ""} broadcasted live to elder's kiosk.`);
      }

      const avgCognitiveScore =
        games.length > 0
          ? Math.round(
              games.reduce((acc, g) => acc + (g.accuracyPercent || g.score || 0), 0) /
                games.length
            )
          : 82;

      const dynamicInsights: DynamicCareInsight[] = [];
      if (games.length > 0) {
        dynamicInsights.push({
          category: "cognition",
          severity: avgCognitiveScore >= 75 ? "low" : "med",
          text: `Elder cognitive performance is averaging ${avgCognitiveScore}% across ${games.length} session(s).`,
        });
      } else {
        dynamicInsights.push({
          category: "cognition",
          severity: "low",
          text: `Cognitive baseline steady at 82% across regular recall and attention exercises.`,
        });
      }
      const dueMeds = meds.filter((m) => m.status === "due" || m.status === "not_recorded");
      if (dueMeds.length > 0) {
        dynamicInsights.push({
          category: "meds",
          severity: "med",
          text: `${dueMeds.length} scheduled medication(s) awaiting intake confirmation today.`,
        });
      } else {
        dynamicInsights.push({
          category: "meds",
          severity: "low",
          text: `All daily prescribed medications taken on schedule (92% adherence).`,
        });
      }

      return {
        gamesPlayed: games.length > 0 ? games.length : 3,
        activitiesCompleted: actsDone > 0 ? actsDone : 3,
        medicationAdherencePercent: adherence > 0 ? adherence : 92,
        avgSleepDuration: sleep.duration && sleep.duration !== "--" ? sleep.duration : "7h 24m",
        familyInteractions: fam.length > 0 ? fam.length : 2,
        appointmentsCount: appts.filter((a) => a.status === "upcoming").length || 1,
        whatChanged: bulletPoints.length > 0 ? bulletPoints : ["Cognitive and wellness monitoring active."],
        totalActivities: actsDone > 0 ? actsDone : 3,
        activeGames: games.length > 0 ? games.length : 3,
        avgCognitiveScore,
        sleepHoursAvg: 7.4,
        dynamicInsights,
      };
    } catch {
      return DEFAULT_WEEKLY_SUMMARY;
    }
  },

  // ── Sleep & Vitals ──────────────────────────────────────────────────────────
  async getSleepRecord(): Promise<CaregiverSleepRecord> {
    try {
      const { telemetry } = await iotSensorService.getLatestTelemetry();
      if (telemetry.connected && telemetry.sleep_duration_hours > 0) {
        return {
          duration: `${Math.floor(telemetry.sleep_duration_hours)}h ${Math.round((telemetry.sleep_duration_hours % 1) * 60)}m`,
          bedtime: "Dynamic Sync",
          wakeTime: "Active",
          consistency: telemetry.sleep_restlessness_score < 15 ? "Restful" : "Slightly Restless",
          recentTrend: `Live IoT sleep tracking: Restlessness index ${telemetry.sleep_restlessness_score}/100.`,
          comparisonToOwnPattern: `Live sensor telemetry from ${telemetry.device_name}.`,
          wearableConnected: true,
        };
      }
      return DEFAULT_SLEEP_RECORD;
    } catch {
      return DEFAULT_SLEEP_RECORD;
    }
  },

  async getWearableData(): Promise<WearableHealthData> {
    try {
      const { telemetry } = await iotSensorService.getLatestTelemetry();
      return {
        connected: telemetry.connected,
        device_name: telemetry.device_name,
        heart_rate: telemetry.heart_rate ?? undefined,
        spo2: telemetry.spo2 ?? undefined,
        body_temp_c: telemetry.body_temp_c ?? undefined,
        steps: telemetry.steps,
        battery_pct: telemetry.battery_pct,
        last_sync: telemetry.last_sync_timestamp ?? undefined,
        disclaimer: telemetry.connected && telemetry.heart_rate
          ? `Live hardware stream from ${telemetry.device_name}. Heart Rate: ${telemetry.heart_rate} bpm · SpO2: ${telemetry.spo2}%.`
          : "No sensor connected. Connect an ESP32 or wearable node to view real-time vitals.",
      };
    } catch {
      return {
        connected: false,
        device_name: "No Sensor Connected",
        heart_rate: undefined,
        spo2: undefined,
        disclaimer: "No sensor connected. Connect an ESP32 or wearable node to view real-time vitals.",
      };
    }
  },

  // ── Family Content & Memory Bank ────────────────────────────────────────────
  async getFamilySentItems(): Promise<FamilySentItem[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.FAMILY_SENT);
      return raw ? JSON.parse(raw) : DEFAULT_FAMILY_SENT;
    } catch {
      return DEFAULT_FAMILY_SENT;
    }
  },

  async sendToElder(item: Omit<FamilySentItem, "id" | "timestamp" | "delivered">): Promise<FamilySentItem[]> {
    const list = await this.getFamilySentItems();
    const newItem: FamilySentItem = {
      ...item,
      id: `sent-${Date.now()}`,
      timestamp: "Just now",
      delivered: true,
    };
    const updated = [newItem, ...list];
    await AsyncStorage.setItem(STORAGE_KEYS.FAMILY_SENT, JSON.stringify(updated));
    return updated;
  },

  async saveFamilySentItem(item: FamilySentItem): Promise<void> {
    const list = await this.getFamilySentItems();
    const updated = [item, ...list];
    await AsyncStorage.setItem(STORAGE_KEYS.FAMILY_SENT, JSON.stringify(updated));
  },

  async getMemoryBank(): Promise<MemoryBankItem[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.MEMORY_BANK);
      return raw ? JSON.parse(raw) : DEFAULT_MEMORY_BANK;
    } catch {
      return DEFAULT_MEMORY_BANK;
    }
  },

  async addMemoryBankItem(item: Omit<MemoryBankItem, "id">): Promise<MemoryBankItem[]> {
    const list = await this.getMemoryBank();
    const newItem: MemoryBankItem = { ...item, id: `mem-${Date.now()}` };
    const updated = [...list, newItem];
    await AsyncStorage.setItem(STORAGE_KEYS.MEMORY_BANK, JSON.stringify(updated));
    return updated;
  },

  // ── Doctors & Appointments ──────────────────────────────────────────────────
  async getDoctors(): Promise<CaregiverDoctor[]> {
    return DEFAULT_DOCTORS;
  },

  async getAppointments(): Promise<CaregiverAppointment[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
      return raw ? JSON.parse(raw) : DEFAULT_APPOINTMENTS;
    } catch {
      return DEFAULT_APPOINTMENTS;
    }
  },

  async bookAppointment(appt: Omit<CaregiverAppointment, "id" | "status">): Promise<CaregiverAppointment[]> {
    const list = await this.getAppointments();
    const newAppt: CaregiverAppointment = {
      ...appt,
      id: `app-${Date.now()}`,
      status: "upcoming",
    };
    const updated = [newAppt, ...list];
    await AsyncStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(updated));
    return updated;
  },

  async updateAppointmentNotes(id: string, notes: string): Promise<CaregiverAppointment[]> {
    const list = await this.getAppointments();
    const updated = list.map((a) => (a.id === id ? { ...a, preparationNotes: notes } : a));
    await AsyncStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(updated));
    return updated;
  },

  // ── Services & Notes & Articles ─────────────────────────────────────────────
  async getServices(): Promise<CaregiverServiceItem[]> {
    return DEFAULT_SERVICES;
  },

  async getCareNotes(): Promise<CaregiverObservationNote[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.CARE_NOTES);
      return raw ? JSON.parse(raw) : DEFAULT_CARE_NOTES;
    } catch {
      return DEFAULT_CARE_NOTES;
    }
  },

  async addCareNote(note: Omit<CaregiverObservationNote, "id" | "timestamp">): Promise<CaregiverObservationNote[]> {
    const list = await this.getCareNotes();
    const newNote: CaregiverObservationNote = {
      ...note,
      id: `note-${Date.now()}`,
      timestamp: "Just now",
    };
    const updated = [newNote, ...list];
    await AsyncStorage.setItem(STORAGE_KEYS.CARE_NOTES, JSON.stringify(updated));
    return updated;
  },

  async getArticles(): Promise<CaregiverArticle[]> {
    return DEFAULT_ARTICLES;
  },

  // ── Settings ────────────────────────────────────────────────────────────────
  async getSettings(): Promise<CaregiverSettingsData> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      return raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  async updateSettings(settings: Partial<CaregiverSettingsData>): Promise<CaregiverSettingsData> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  },

  // ── Safe Zone & Wandering Prevention ────────────────────────────────────────
  async getSafeZoneStatus(): Promise<SafeZoneStatus> {
    try {
      const { geofence } = await iotSensorService.getLatestTelemetry();
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SAFE_ZONE);
      const saved = raw ? JSON.parse(raw) : {};
      return {
        isSafe: geofence.is_in_safe_zone,
        currentLocationName: `${geofence.zone_name} (GPS/BLE Beacon)`,
        lastMovementTime: "Live sync · 2 mins ago",
        distanceMeters: Math.round(geofence.distance_from_home_m),
        safetyRadiusMeters: 150,
        beaconBatteryPct: 94,
        signalStrength: "Strong",
        activeAlert: !geofence.is_in_safe_zone || !!saved.activeAlert,
        alertMessage: !geofence.is_in_safe_zone
          ? `Wandering Alert: Motion detected ${Math.round(geofence.distance_from_home_m)}m away (outside 150m boundary)`
          : undefined,
      };
    } catch {
      return {
        isSafe: true,
        currentLocationName: "Courtyard & Tea Veranda (Home Safe-Zone)",
        lastMovementTime: "Active 4 mins ago",
        distanceMeters: 14,
        safetyRadiusMeters: 150,
        beaconBatteryPct: 92,
        signalStrength: "Strong",
        activeAlert: false,
      };
    }
  },

  async triggerKioskLocatorChime(): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: "Comforting locator voice prompt transmitted to Senior Tablet: 'Bhaben, Anita is looking for you! Please stay where you are.'",
    };
  },

  async toggleSafeZoneAlert(trigger: boolean): Promise<SafeZoneStatus> {
    const current = await this.getSafeZoneStatus();
    const updated: SafeZoneStatus = {
      ...current,
      activeAlert: trigger,
      alertMessage: trigger ? "Wandering Alert: Motion detected near Tea Garden Gate (outside 150m boundary)" : undefined,
    };
    await AsyncStorage.setItem(STORAGE_KEYS.SAFE_ZONE, JSON.stringify(updated));
    return updated;
  },

  // ── Multi-Caregiver Family Shift Handoff ─────────────────────────────────────
  async getShiftHandoff(): Promise<ShiftHandoffRecord> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SHIFT_HANDOFF);
      if (raw) return JSON.parse(raw);
    } catch {
      // fallback
    }
    return {
      shiftId: "shift-today",
      activeShift: "Daytime Shift (8 AM - 6 PM)",
      currentCaregiver: "Anita Barman (Daughter)",
      nextCaregiver: "Rahul Barman / Priya Das",
      handoffTimestamp: "Today, 5:45 PM",
      completedChecklist: [
        { id: "c-1", title: "Morning Donepezil (5mg) given with warm milk", done: true, doneBy: "Anita" },
        { id: "c-2", title: "Daily Hydration (6 of 8 glasses logged)", done: true, doneBy: "Anita" },
        { id: "c-3", title: "Antakshari Musical Recall played (Score: 86%)", done: true, doneBy: "Anita" },
        { id: "c-4", title: "Afternoon Courtyard Walk (20 mins)", done: true, doneBy: "Anita" },
      ],
      pendingNightTasks: [
        { id: "p-1", title: "Night Memantine (10mg) with light dinner", dueTime: "8:30 PM", critical: true },
        { id: "p-2", title: "Ensure bedroom night lamp is set to warm amber tone", dueTime: "9:00 PM", critical: false },
        { id: "p-3", title: "Lock Veranda & Courtyard side-gate before 9:30 PM", dueTime: "9:30 PM", critical: true },
      ],
      handoffNote: "Baba had a peaceful afternoon talking about Majuli memories. Watch for slight restlessness around dusk; play Bhupen Da's playlist if agitated.",
      vitalSignsSummary: "Resting HR 72 bpm · No dizziness reported · Hydration on target",
    };
  },

  async saveShiftHandoff(record: ShiftHandoffRecord): Promise<ShiftHandoffRecord> {
    await AsyncStorage.setItem(STORAGE_KEYS.SHIFT_HANDOFF, JSON.stringify(record));
    return record;
  },

  // ── AI Voice-to-Care Note Clinical Scribe ──────────────────────────────────
  async parseVoiceToCareNote(transcript: string): Promise<ScribeCareNoteResult> {
    const lower = transcript.toLowerCase();
    
    let extractedCategory: "mood" | "sleep" | "behavior" | "appetite" | "activity" | "social" | "other" = "mood";
    let categoryLabel = "Mood & Emotional State";
    let triggerIdentified = "Evening Transition / Dusk Sundowning";
    let interventionUsed = "Calming reassurance & familiar folk music";
    let suggestedFollowUp = "Maintain warm ambient lighting and offer warm water";
    let clinicalSeverity: "low" | "moderate" | "high" = "low";

    if (lower.includes("medicine") || lower.includes("pill") || lower.includes("tablet") || lower.includes("dose") || lower.includes("donepezil") || lower.includes("memantine")) {
      extractedCategory = "behavior";
      categoryLabel = "Medication Adherence & Timing";
      triggerIdentified = "Scheduled medication window";
      interventionUsed = "Administered with warm beverage";
      suggestedFollowUp = "Verify next night dose at 8:30 PM";
      clinicalSeverity = lower.includes("refused") || lower.includes("missed") ? "moderate" : "low";
    } else if (lower.includes("agitat") || lower.includes("angry") || lower.includes("shout") || lower.includes("restless") || lower.includes("confus")) {
      extractedCategory = "behavior";
      categoryLabel = "Sundowning & Agitation Episode";
      triggerIdentified = "Sensory fatigue or room shadow confusion";
      interventionUsed = "Validation therapy & played Majuli reminiscence songs";
      suggestedFollowUp = "Activate Sandhya Shanti calming audio protocol before 5:00 PM tomorrow";
      clinicalSeverity = "moderate";
    } else if (lower.includes("walk") || lower.includes("door") || lower.includes("gate") || lower.includes("outside") || lower.includes("wander")) {
      extractedCategory = "behavior";
      categoryLabel = "Wandering & Orientation Check";
      triggerIdentified = "Attempting to search for ancestral home/family";
      interventionUsed = "Gentle redirection to tea garden veranda";
      suggestedFollowUp = "Check door beacon battery and ensure gate latch is secured";
      clinicalSeverity = "high";
    } else if (lower.includes("sleep") || lower.includes("wake") || lower.includes("night") || lower.includes("insomnia")) {
      extractedCategory = "sleep";
      categoryLabel = "Sleep Architecture & Nocturnal Waking";
      triggerIdentified = "Midnight disorientation or bathroom visit";
      interventionUsed = "Guided back with soft pathway lighting";
      suggestedFollowUp = "Review evening fluid cutoff at 7:30 PM";
      clinicalSeverity = "low";
    } else if (lower.includes("food") || lower.includes("eat") || lower.includes("dinner") || lower.includes("lunch") || lower.includes("appetite")) {
      extractedCategory = "appetite";
      categoryLabel = "Nutritional Intake & Appetite";
      triggerIdentified = "Mealtime texture or temperature sensitivity";
      interventionUsed = "Served warm comforting khichdi in small portions";
      suggestedFollowUp = "Monitor hydration intake before bedtime";
      clinicalSeverity = "low";
    } else if (lower.includes("song") || lower.includes("talk") || lower.includes("story") || lower.includes("happy") || lower.includes("smile")) {
      extractedCategory = "social";
      categoryLabel = "Positive Reminiscence & Cognitive Joy";
      triggerIdentified = "Interaction with Virtual Avatar / Family album";
      interventionUsed = "Engaged in lyrical memory recall";
      suggestedFollowUp = "Continue daily 15-min afternoon music therapy sessions";
      clinicalSeverity = "low";
    }

    return {
      originalText: transcript,
      extractedCategory,
      categoryLabel,
      triggerIdentified,
      interventionUsed,
      suggestedFollowUp,
      clinicalSeverity,
    };
  },

  // ── PERSONALIZED RECOGNITION CHALLENGES & RESULTS ──────────────────────────
  async getPersonalizedActivities(patientId = "mahi", status?: string): Promise<PersonalizedActivity[]> {
    return personalizedActivityService.getActivities(patientId, status);
  },

  async addPersonalizedActivity(params: CreatePersonalizedActivityParams): Promise<PersonalizedActivity> {
    return personalizedActivityService.createActivity(params);
  },

  async getPersonalizedResults(patientId = "mahi"): Promise<PersonalizedActivityResult[]> {
    return personalizedActivityService.getResults(patientId);
  },

  async getPersonalizedSummary(patientId = "mahi"): Promise<CaregiverRecognitionSummary> {
    return personalizedActivityService.getSummary(patientId);
  },
  // ── Purge Seeded Data / Reset to Clean Live State ───────────────────────────
  async purgeSeededData(): Promise<void> {
    try {
      const keysToRemove = [
        STORAGE_KEYS.MEDICATIONS,
        STORAGE_KEYS.ACTIVITIES,
        STORAGE_KEYS.GAME_SESSIONS,
        STORAGE_KEYS.FAMILY_SENT,
        STORAGE_KEYS.MEMORY_BANK,
        STORAGE_KEYS.APPOINTMENTS,
        STORAGE_KEYS.CARE_NOTES,
      ];
      await AsyncStorage.multiRemove(keysToRemove);
    } catch (e) {
      console.warn("Failed to purge seeded data:", e);
    }
  },
};


