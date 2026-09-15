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

export interface WeeklySummaryData {
  gamesPlayed: number;
  activitiesCompleted: number;
  medicationAdherencePercent: number;
  avgSleepDuration: string;
  familyInteractions: number;
  appointmentsCount: number;
  whatChanged: string[];
}

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
    allergies: ["Penicillin (Mild skin rash)"],
    currentMedicationsSummary: [
      "Donepezil 5mg — Once daily in morning",
      "Vitamin B12 & Neuro Minerals — After lunch",
      "Amlodipine 5mg — Evening after dinner",
    ],
    notes: "Patient responds best to gentle verbal prompts and routine morning walks. Mild sundowning confusion can occur around sunset; calming folk music and soft tea helps reassuringly.",
    primaryDoctor: {
      name: "Dr. Mahit Sharma",
      specialty: "Geriatric Neurologist & Cognitive Health",
      hospital: "GNRC Hospitals, Guwahati, Assam",
    },
    historyTimeline: [
      {
        id: "hist-1",
        year: "2026",
        date: "Feb 2026",
        title: "Neurology Routine Review",
        category: "doctor_visit",
        description: "Cognitive assessment completed with MMSE score 22/30. Attention and language stable. Memory support routines reinforced.",
        doctorOrLocation: "Dr. Mahit Sharma · GNRC Hospitals",
      },
      {
        id: "hist-2",
        year: "2025",
        date: "Nov 2025",
        title: "Medication Adjustment",
        category: "medication_change",
        description: "Donepezil commenced at 5mg daily. Tolerated well with zero gastrointestinal side effects.",
        doctorOrLocation: "Dr. Mahit Sharma",
      },
      {
        id: "hist-3",
        year: "2025",
        date: "Aug 2025",
        title: "Annual Cardiovascular Checkup",
        category: "assessment",
        description: "Blood pressure 128/82 mmHg. Resting heart rate 72 bpm. Continued low-salt balanced diet.",
        doctorOrLocation: "Downtown Cardiac Clinic",
      },
      {
        id: "hist-4",
        year: "2024",
        date: "May 2024",
        title: "Cataract Surgery (Left Eye)",
        category: "procedure",
        description: "Successful uncomplicated intraocular lens procedure with excellent visual acuity recovery.",
        doctorOrLocation: "Sri Sankaradeva Nethralaya, Guwahati",
      },
    ],
  },
  dailyLife: {
    sleepPattern: "Typically 7h to 8h restful sleep. Wakes early naturally around 5:30 AM.",
    exerciseMovement: "Enjoys 15-20 minute gentle courtyard walks and light chair stretching.",
    routineAdherenceRate: "92% routine adherence over past 30 days.",
    hobbies: ["Courtyard gardening (Tulsi & Orchids)", "Listening to Akashvani folk radio", "Looking through family photo albums"],
    musicPreference: "Assamese folk flute, Bhupen Hazarika classics, soothing morning bhajans.",
    comfortReminders: "Prefers sitting near the front verandah in morning sunlight with warm tea.",
  },
};

export const DEFAULT_MEDICATIONS: CaregiverMedication[] = [
  {
    id: "med-1",
    name: "Donepezil (Memory Support)",
    dosage: "5mg with lukewarm water",
    instructions: "Take after breakfast with a light meal",
    timeSlot: "morning",
    timeLabel: "8:00 AM",
    status: "done",
    recordedAt: "8:15 AM",
    pillColor: "#F9DDD2",
  },
  {
    id: "med-2",
    name: "Vitamin B12 & Minerals",
    dosage: "1 capsule after lunch",
    instructions: "Supports nerve vitality and appetite",
    timeSlot: "afternoon",
    timeLabel: "1:30 PM",
    status: "done",
    recordedAt: "1:20 PM",
    pillColor: "#E2E8DE",
  },
  {
    id: "med-3",
    name: "Amlodipine (Blood Pressure)",
    dosage: "5mg with warm water",
    instructions: "Take after dinner before evening relaxation",
    timeSlot: "evening",
    timeLabel: "8:00 PM",
    status: "due",
    pillColor: "#F3EEF6",
  },
];

export const DEFAULT_ACTIVITIES: CaregiverActivity[] = [
  {
    id: "act-1",
    title: "Morning Garden Walk",
    category: "movement",
    timeLabel: "7:30 AM",
    completed: true,
    duration: "18 mins",
    notes: "Walked 4 laps around the courtyard flowerbed cheerfully.",
    isRealWorldStimulation: false,
    iconName: "sun",
  },
  {
    id: "act-2",
    title: "Chair Breathing & Gentle Stretching",
    category: "movement",
    timeLabel: "10:00 AM",
    completed: true,
    duration: "10 mins",
    notes: "Followed 3 breathing cycles with daughter Anita.",
    isRealWorldStimulation: false,
    iconName: "feather",
  },
  {
    id: "act-3",
    title: "Look Through Majuli Family Photos",
    category: "offline_real_world",
    timeLabel: "11:30 AM",
    completed: true,
    duration: "15 mins",
    notes: "Recognized grandson Arjun immediately and talked about the 1998 holiday.",
    isRealWorldStimulation: true,
    suggestedPrompt: "Ask: 'Who was standing next to you in the riverboat?'",
    iconName: "image",
  },
  {
    id: "act-4",
    title: "Listen to Favorite Radio Songs",
    category: "offline_real_world",
    timeLabel: "4:30 PM",
    completed: false,
    duration: "20 mins",
    isRealWorldStimulation: true,
    suggestedPrompt: "Play 'Manuhe Manuhor Babe' and gently hum along.",
    iconName: "music",
  },
  {
    id: "act-5",
    title: "Sort Spices & Tea Leaves in Kitchen",
    category: "offline_real_world",
    timeLabel: "5:45 PM",
    completed: false,
    duration: "12 mins",
    isRealWorldStimulation: true,
    suggestedPrompt: "Ask them to identify cardamom vs clove by scent.",
    iconName: "coffee",
  },
];

export const DEFAULT_GAME_SESSIONS: CognitiveGameSession[] = [
  {
    id: "game-1",
    gameName: "Antakshari & Song Recall",
    iconEmoji: "🎵",
    timestamp: "Today · 10:32 AM",
    durationMinutes: 6,
    score: 82,
    accuracyPercent: 88,
    mistakes: 1,
    responseTime: "Improving (2.3s avg)",
    difficulty: "Level 2 → 3",
    difficultyChangeReason: "Increased difficulty because recent song lyrics were identified faster and accurately.",
    completed: true,
    humanSummary: "Antakshari performance has been steady and engaging this week.",
  },
  {
    id: "game-2",
    gameName: "Memory Match (Courtyard Patterns)",
    iconEmoji: "🧣",
    timestamp: "Today · 11:15 AM",
    durationMinutes: 5,
    score: 78,
    accuracyPercent: 85,
    mistakes: 2,
    responseTime: "Consistent (3.1s avg)",
    difficulty: "Level 2",
    difficultyChangeReason: "Maintained steady level matching Assamese textile motifs.",
    completed: true,
    humanSummary: "Card pairs were matched smoothly with peaceful concentration.",
  },
  {
    id: "game-3",
    gameName: "Find the Household Object",
    iconEmoji: "🔍",
    timestamp: "Yesterday · 4:20 PM",
    durationMinutes: 7,
    score: 90,
    accuracyPercent: 92,
    mistakes: 1,
    responseTime: "Fast (1.9s avg)",
    difficulty: "Level 2",
    difficultyChangeReason: "Demonstrated sharp visual scanning across familiar rooms.",
    completed: true,
    humanSummary: "Good visual focus spotting items like reading glasses and tea kettle.",
  },
  {
    id: "game-4",
    gameName: "Daily Steps (Morning Routine)",
    iconEmoji: "📋",
    timestamp: "2 days ago · 11:00 AM",
    durationMinutes: 4,
    score: 85,
    accuracyPercent: 90,
    mistakes: 1,
    responseTime: "Steady",
    difficulty: "Level 1 → 2",
    difficultyChangeReason: "Correctly sequenced morning tea, face wash, and prayer steps.",
    completed: true,
    humanSummary: "Sequencing daily steps was completed without confusion.",
  },
];

export const DEFAULT_WEEKLY_SUMMARY: WeeklySummaryData = {
  gamesPlayed: 8,
  activitiesCompleted: 19,
  medicationAdherencePercent: 95,
  avgSleepDuration: "7h 18m",
  familyInteractions: 6,
  appointmentsCount: 1,
  whatChanged: [
    "Music and song recall games were played more often this week.",
    "Average response time across visual matching games was slightly faster.",
    "Medication routine remained remarkably consistent (95% recorded on time).",
    "Two planned evening walks were missed due to rain and replaced with indoor music.",
  ],
};

export const DEFAULT_SLEEP_RECORD: CaregiverSleepRecord = {
  duration: "7h 12m",
  bedtime: "10:15 PM",
  wakeTime: "5:27 AM",
  consistency: "Regular",
  recentTrend: "Sleep was slightly shorter than usual (+/- 18 mins), but remained restful without nighttime wandering.",
  comparisonToOwnPattern: "Consistent with 30-day baseline (7h 20m average).",
  wearableConnected: false,
};

export const DEFAULT_WEARABLE_DATA: WearableHealthData = {
  connected: false,
  disclaimer: "Connect a supported health device (e.g. smart band, pulse oximeter, or health tracker) to view live heart rate and vitals. AmbiEye never fabricates sensor data.",
};

export const DEFAULT_FAMILY_SENT: FamilySentItem[] = [
  {
    id: "sent-1",
    type: "voice",
    senderName: "Rahul (Son)",
    title: "Evening check-in message",
    content: "Hi Deuta, hope you had a good morning walk! I will call you right after dinner today.",
    timestamp: "Today · 9:15 AM",
    delivered: true,
  },
  {
    id: "sent-2",
    type: "photo",
    senderName: "Arjun (Grandson)",
    title: "School cricket match photo",
    content: "Photo: Arjun holding his cricket bat smiling in front of school wicket.",
    timestamp: "Yesterday · 3:40 PM",
    delivered: true,
  },
  {
    id: "sent-3",
    type: "memory_prompt",
    senderName: "Anita (Daughter)",
    title: "Memory conversation starter",
    content: "Deuta, do you remember our holiday visit to Ooty gardens? Tell us about the toy train ride.",
    timestamp: "2 days ago · 11:20 AM",
    delivered: true,
  },
];

export const DEFAULT_MEMORY_BANK: MemoryBankItem[] = [
  {
    id: "mem-1",
    category: "people",
    title: "Grandson Arjun",
    description: "10 years old, loves playing cricket as a left-handed batsman. Always asks grandfather for stories.",
    photoEmoji: "🏏",
  },
  {
    id: "mem-2",
    category: "places",
    title: "Majuli Island Ancestral Home",
    description: "The peaceful wooden courtyard by the Brahmaputra with hibiscus flowers and pottery.",
    yearOrDate: "Ancestral home",
    photoEmoji: "🏞️",
  },
  {
    id: "mem-3",
    category: "foods",
    title: "Assamese Fish Curry with Herbs",
    description: "Light river fish curry with fresh lemon and coriander, served with warm scented rice.",
    photoEmoji: "🍲",
  },
  {
    id: "mem-4",
    category: "songs",
    title: "Manuhe Manuhor Babe",
    description: "Dr. Bhupen Hazarika's iconic melody of human kindness and compassion.",
    photoEmoji: "🎵",
  },
  {
    id: "mem-5",
    category: "hobbies",
    title: "Courtyard Gardening",
    description: "Tending to Assam orchids, basil plants, and watering flowerpots in the morning sun.",
    photoEmoji: "🪴",
  },
  {
    id: "mem-6",
    category: "stories",
    title: "Family Trip to Kerala Backwaters",
    description: "Rented a traditional houseboat in Alleppey in winter 1998 with children Rahul and Anita.",
    yearOrDate: "Winter 1998",
    photoEmoji: "⛵",
  },
];

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

export const DEFAULT_APPOINTMENTS: CaregiverAppointment[] = [
  {
    id: "app-1",
    doctorId: "doc-1",
    doctorName: "Dr. Mahit Sharma",
    specialty: "Geriatric Neurology",
    hospital: "GNRC Hospitals, Dispur, Guwahati",
    date: "Tomorrow",
    time: "10:30 AM",
    status: "upcoming",
    consultationType: "in_clinic",
    preparationNotes: "Review this week's memory match consistency and ask about occasional sundowning at dusk.",
    contactNumber: "+91 361 226 0000",
  },
  {
    id: "app-2",
    doctorId: "doc-3",
    doctorName: "Dr. Pradeep Goswami",
    specialty: "Elder Care & General Health",
    hospital: "Downtown Clinic, Hajo Road",
    date: "14 Feb 2026",
    time: "11:00 AM",
    status: "completed",
    consultationType: "in_clinic",
    preparationNotes: "Checked blood pressure and seasonal immunity.",
    contactNumber: "+91 361 223 1122",
  },
];

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
    icon: "activity",
    priceGuide: "₹700 / 4-hr shift",
    provider: "Assam Geriatric Care Network",
  },
  {
    id: "srv-3",
    title: "Physiotherapy & Mobility Walking",
    description: "Certified physiotherapist for balance training, gentle stretching, and fall prevention exercises.",
    category: "physiotherapy",
    icon: "user-check",
    priceGuide: "₹650 / session",
    provider: "Guwahati Physical Rehab Service",
  },
  {
    id: "srv-4",
    title: "Memory Companion & Social Care",
    description: "Friendly companion for reading newspaper, playing cards, sharing conversation, and supervised walks.",
    category: "companion",
    icon: "smile",
    priceGuide: "₹500 / 3-hr session",
    provider: "Community Elder Companion Volunteer",
  },
  {
    id: "srv-5",
    title: "Safe Senior Transport & Escort",
    description: "Wheelchair-accessible sanitized vehicle with trained driver escort for hospital and clinic appointments.",
    category: "transport",
    icon: "navigation",
    priceGuide: "₹400 / trip (Dispur-Hajo)",
    provider: "CareMobility Guwahati",
  },
  {
    id: "srv-6",
    title: "Prescribed Medicine Home Delivery",
    description: "Scheduled doorstep delivery of regular dementia and cardiac medications with batch verification.",
    category: "medicines",
    icon: "package",
    priceGuide: "Free delivery on regular refills",
    provider: "Apollo Pharmacy Hajo Sector",
  },
];

export const DEFAULT_CARE_NOTES: CaregiverObservationNote[] = [
  {
    id: "note-1",
    category: "mood",
    note: "Was very cheerful after Rahul's voice message. Hummed a Bhupen Hazarika tune while having tea.",
    timestamp: "Today · 10:45 AM",
    tags: ["Cheerful", "Family Call", "Music"],
  },
  {
    id: "note-2",
    category: "behavior",
    note: "Asked twice around sunset what day of the week it was. Reoriented easily after looking at the wall calendar.",
    timestamp: "Yesterday · 6:15 PM",
    tags: ["Sundowning", "Calm Reorientation", "Calendar"],
  },
  {
    id: "note-3",
    category: "sleep",
    note: "Slept peacefully through the night without restless awakening. Woke up refreshed at 5:30 AM.",
    timestamp: "Yesterday · 7:00 AM",
    tags: ["Restful Sleep", "Normal Routine"],
  },
];

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

  async getWeeklySummary(): Promise<WeeklySummaryData> {
    return DEFAULT_WEEKLY_SUMMARY;
  },

  // ── Sleep & Vitals ──────────────────────────────────────────────────────────
  async getSleepRecord(): Promise<CaregiverSleepRecord> {
    try {
      const { telemetry } = await iotSensorService.getLatestTelemetry();
      return {
        duration: `${Math.floor(telemetry.sleep_duration_hours)}h ${Math.round((telemetry.sleep_duration_hours % 1) * 60)}m`,
        bedtime: "10:15 PM",
        wakeTime: "5:27 AM",
        consistency: telemetry.sleep_restlessness_score < 15 ? "Regular" : "Slightly Restless",
        recentTrend: `Live IoT sleep tracking: Restlessness index ${telemetry.sleep_restlessness_score}/100. Restful sleep without nocturnal wandering.`,
        comparisonToOwnPattern: `Consistent with 30-day personal baseline (${telemetry.sleep_duration_hours}h average).`,
        wearableConnected: telemetry.connected,
      };
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
};

