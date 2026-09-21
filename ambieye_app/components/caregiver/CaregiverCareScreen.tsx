import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Linking,
  Platform,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CalmPalette, WarmPalette, AestheticTheme } from "../../constants/theme";
import { VoiceAssistant } from "../../utils/voiceAssistant";
import { callService } from "../../services/family/callService";
import { patientNeedsService, PatientNeedRequest } from "../../services/patientNeeds/patientNeedsService";

// ── Types ────────────────────────────────────────────────────────────────────
export interface CareMedicine {
  id: string;
  name: string;
  dosage: string;
  timeSlot: "morning" | "afternoon" | "evening" | "night";
  timeLabel: string;
  frequency: string;
  startDate: string;
  endDate: string;
  recurring: boolean;
  status: "done" | "upcoming" | "missed";
  recordedAt?: string;
  instructions?: string;
}

export interface CareRoutine {
  id: string;
  task: string;
  time: string;
  repeat: string;
  completed: boolean;
  icon: string;
}

export interface CareReminder {
  id: string;
  title: string;
  category: "water" | "call" | "doctor" | "med" | "game" | "walk" | "meal" | "custom";
  timeLabel: string;
  status: "upcoming" | "completed" | "missed";
}

export interface CareAppointment {
  id: string;
  doctor: string;
  specialty: string;
  hospital: string;
  date: string;
  time: string;
  reason: string;
  notes: string;
  reminderEnabled: boolean;
  isPast?: boolean;
}

export interface CareInstruction {
  id: string;
  type: "doctor" | "special" | "diet" | "observation" | "handover";
  title: string;
  detail: string;
  author: string;
  timestamp: string;
}

export interface CareTeamMember {
  id: string;
  role: "Primary Caregiver" | "Family Member" | "ASHA Worker" | "Doctor";
  name: string;
  relationOrClinic: string;
  phone: string;
  avatarEmoji: string;
  color: string;
  bgColor: string;
}

export interface RoutineTemplate {
  id: string;
  emoji: string;
  task: string;
  time: string;
  category: "Activity" | "Health" | "Wellness" | "Meal" | "Mind" | "Sleep";
  repeat: string;
  icon: string;
  description: string;
}

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: "tpl-walk-morning",
    emoji: "🌅",
    task: "Morning Courtyard Walk",
    time: "8:00 AM",
    category: "Activity",
    repeat: "Daily",
    icon: "sun",
    description: "15 min garden stroll in sunlight",
  },
  {
    id: "tpl-water-morning",
    emoji: "💧",
    task: "Morning Warm Water",
    time: "8:30 AM",
    category: "Health",
    repeat: "Daily",
    icon: "droplet",
    description: "Hydration glass before breakfast",
  },
  {
    id: "tpl-stretch",
    emoji: "🧘",
    task: "Gentle Chair Breathing",
    time: "9:30 AM",
    category: "Wellness",
    repeat: "Daily",
    icon: "heart",
    description: "Seated deep breathing & light arm stretch",
  },
  {
    id: "tpl-vitals",
    emoji: "🩺",
    task: "Vitals & BP Reading",
    time: "10:00 AM",
    category: "Health",
    repeat: "Daily",
    icon: "activity",
    description: "Check smartwatch vitals & blood pressure",
  },
  {
    id: "tpl-lunch",
    emoji: "🍲",
    task: "Nutritious Lunch & Fruit",
    time: "1:00 PM",
    category: "Meal",
    repeat: "Daily",
    icon: "coffee",
    description: "Warm homemade meal & seasonal fruit",
  },
  {
    id: "tpl-nap",
    emoji: "🛌",
    task: "Afternoon Rest / Nap",
    time: "2:00 PM",
    category: "Sleep",
    repeat: "Daily",
    icon: "moon",
    description: "Quiet relaxation without screen time",
  },
  {
    id: "tpl-game",
    emoji: "🧩",
    task: "Mind Game & Antakshari",
    time: "3:30 PM",
    category: "Mind",
    repeat: "Daily",
    icon: "music",
    description: "Sing old songs or memory match puzzle",
  },
  {
    id: "tpl-tea",
    emoji: "☕",
    task: "Evening Chai & Hydration",
    time: "4:30 PM",
    category: "Meal",
    repeat: "Daily",
    icon: "coffee",
    description: "Warm herbal tea & light snack",
  },
  {
    id: "tpl-walk-evening",
    emoji: "🌿",
    task: "Evening Courtyard Stroll",
    time: "5:30 PM",
    category: "Activity",
    repeat: "Daily",
    icon: "feather",
    description: "Calms twilight sundowning restlessness",
  },
  {
    id: "tpl-family",
    emoji: "🌸",
    task: "Family Video / Call Chat",
    time: "6:30 PM",
    category: "Wellness",
    repeat: "Daily",
    icon: "smile",
    description: "Heartwarming conversation with family",
  },
  {
    id: "tpl-milk",
    emoji: "🥛",
    task: "Warm Turmeric Milk",
    time: "8:30 PM",
    category: "Wellness",
    repeat: "Daily",
    icon: "heart",
    description: "Gentle warm milk for sound sleep",
  },
  {
    id: "tpl-bedtime",
    emoji: "🛏️",
    task: "Soothing Bedtime Routine",
    time: "9:30 PM",
    category: "Sleep",
    repeat: "Daily",
    icon: "shield",
    description: "Dim warm lights, safe environment check",
  },
];

export const MEDICATION_PRESETS = [
  {
    name: "Donepezil",
    dosage: "5mg",
    slot: "night" as const,
    time: "9:00 PM",
    freq: "Once daily",
    instructions: "Take with water after dinner",
  },
  {
    name: "Memantine",
    dosage: "10mg",
    slot: "morning" as const,
    time: "8:30 AM",
    freq: "Once daily",
    instructions: "Take with breakfast",
  },
  {
    name: "Multivitamin B-Complex",
    dosage: "1 Tablet",
    slot: "morning" as const,
    time: "9:00 AM",
    freq: "Once daily",
    instructions: "With morning meal",
  },
  {
    name: "Vitamin D3 1000 IU",
    dosage: "1 Capsule",
    slot: "morning" as const,
    time: "9:00 AM",
    freq: "Once daily",
    instructions: "Take after breakfast",
  },
  {
    name: "Amlodipine (BP)",
    dosage: "5mg",
    slot: "morning" as const,
    time: "8:00 AM",
    freq: "Once daily",
    instructions: "Take on empty stomach or as directed",
  },
];

const STORAGE_KEYS = {
  MEDS: "@caregiver_care_medicines_v2",
  ROUTINES: "@caregiver_care_routines_v2",
  REMINDERS: "@caregiver_care_reminders_v2",
  APPOINTMENTS: "@caregiver_care_appointments_v2",
  INSTRUCTIONS: "@caregiver_care_instructions_v2",
  MED_HISTORY: "@caregiver_medication_history_v2",
};

// ── Real-Time Dynamic Care Data (No Mock Seed Data) ──────────────────────────
const DEFAULT_MEDICINES: CareMedicine[] = [];
const DEFAULT_ROUTINES: CareRoutine[] = [];
const DEFAULT_REMINDERS: CareReminder[] = [];
const DEFAULT_APPOINTMENTS: CareAppointment[] = [];
const DEFAULT_INSTRUCTIONS: CareInstruction[] = [];

const CARE_TEAM: CareTeamMember[] = [
  {
    id: "team-1",
    role: "Primary Caregiver",
    name: "Rishitha",
    relationOrClinic: "Daughter & Primary Care",
    phone: "+91 98640 12345",
    avatarEmoji: "👩",
    color: "#2563EB",
    bgColor: "#EFF6FF",
  },
  {
    id: "team-2",
    role: "Family Member",
    name: "Anu",
    relationOrClinic: "Sister (Checks in daily)",
    phone: "+91 98640 54321",
    avatarEmoji: "🌸",
    color: "#7C3AED",
    bgColor: "#FAF5FF",
  },
  {
    id: "team-3",
    role: "ASHA Worker",
    name: "Meena",
    relationOrClinic: "Community Health Officer",
    phone: "+91 94350 98765",
    avatarEmoji: "🩺",
    color: "#059669",
    bgColor: "#F0FDF4",
  },
  {
    id: "team-4",
    role: "Doctor",
    name: "Dr. Kumar",
    relationOrClinic: "Apollo Clinic (Neurology)",
    phone: "+91 361 226 0000",
    avatarEmoji: "👨‍⚕️",
    color: "#0284C7",
    bgColor: "#F0F9FF",
  },
];

export const CaregiverCareScreen: React.FC = () => {
  const [medicines, setMedicines] = useState<CareMedicine[]>(DEFAULT_MEDICINES);
  const [routines, setRoutines] = useState<CareRoutine[]>(DEFAULT_ROUTINES);
  const [reminders, setReminders] = useState<CareReminder[]>(DEFAULT_REMINDERS);
  const [appointments, setAppointments] = useState<CareAppointment[]>(DEFAULT_APPOINTMENTS);
  const [instructions, setInstructions] = useState<CareInstruction[]>(DEFAULT_INSTRUCTIONS);
  const [reminderFilter, setReminderFilter] = useState<"upcoming" | "completed" | "missed">("upcoming");
  const [refreshing, setRefreshing] = useState(false);

  // 🔔 Patient Needs & Assistance State (Live from Senior Tablet)
  const [activeNeed, setActiveNeed] = useState<PatientNeedRequest | null>(null);
  const [patientNeeds, setPatientNeeds] = useState<PatientNeedRequest[]>([]);

  // Modals
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [showAddRoutineModal, setShowAddRoutineModal] = useState(false);
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);
  const [showAddApptModal, setShowAddApptModal] = useState(false);
  const [showAddInstructionModal, setShowAddInstructionModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Form states for Add Medicine
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("500mg");
  const [medSlot, setMedSlot] = useState<"morning" | "afternoon" | "evening" | "night">("morning");
  const [medTime, setMedTime] = useState("8:00 AM");
  const [medFreq, setMedFreq] = useState("Once daily");
  const [medInstructions, setMedInstructions] = useState("");

  // Form states for Routine
  const [routineTask, setRoutineTask] = useState("");
  const [routineTime, setRoutineTime] = useState("9:00 AM");
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<string>("All");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Form states for Reminder
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderCategory, setReminderCategory] = useState<CareReminder["category"]>("water");
  const [reminderTime, setReminderTime] = useState("11:00 AM");

  // Form states for Appointment
  const [apptDoctor, setApptDoctor] = useState("");
  const [apptClinic, setApptClinic] = useState("");
  const [apptDate, setApptDate] = useState("Tomorrow");
  const [apptTime, setApptTime] = useState("10:30 AM");
  const [apptReason, setApptReason] = useState("");

  // Form states for Instruction Note
  const [insTitle, setInsTitle] = useState("");
  const [insDetail, setInsDetail] = useState("");
  const [insType, setInsType] = useState<CareInstruction["type"]>("special");

  // Router & Tele-Care States
  const router = useRouter();
  const [showAskDoctorModal, setShowAskDoctorModal] = useState(false);
  const [doctorQueryPreset, setDoctorQueryPreset] = useState("Medication Adjustment");
  const [doctorQueryCustom, setDoctorQueryCustom] = useState("");
  const [isPlayingAdvice, setIsPlayingAdvice] = useState(false);
  const [doctorQueries, setDoctorQueries] = useState([
    {
      id: "dq-1",
      topic: "Evening Restlessness & Sundowning",
      doctor: "Dr. Ananya Sharma (Neurologist)",
      date: "Today, 10:15 AM",
      status: "Answered",
      advice: "Recommended evening garden stroll for 20 mins. Keep bedroom lighting warm and soothing after 6 PM.",
      pills: "Donepezil 5mg as scheduled",
    },
  ]);

  // ── Load Persistent Data ───────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      // One-time purge of legacy hardcoded mock entries
      const purgeKey = "@caregiver_care_purged_live_v1";
      const hasPurged = await AsyncStorage.getItem(purgeKey);
      if (!hasPurged) {
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.MEDS,
          STORAGE_KEYS.ROUTINES,
          STORAGE_KEYS.REMINDERS,
          STORAGE_KEYS.APPOINTMENTS,
          STORAGE_KEYS.INSTRUCTIONS,
        ]);
        await AsyncStorage.setItem(purgeKey, "true");
        setMedicines([]);
        setRoutines([]);
        setReminders([]);
        setAppointments([]);
        setInstructions([]);
        return;
      }

      const [mRaw, rRaw, remRaw, aRaw, iRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.MEDS),
        AsyncStorage.getItem(STORAGE_KEYS.ROUTINES),
        AsyncStorage.getItem(STORAGE_KEYS.REMINDERS),
        AsyncStorage.getItem(STORAGE_KEYS.APPOINTMENTS),
        AsyncStorage.getItem(STORAGE_KEYS.INSTRUCTIONS),
      ]);

      if (mRaw) setMedicines(JSON.parse(mRaw));
      if (rRaw) setRoutines(JSON.parse(rRaw));
      if (remRaw) setReminders(JSON.parse(remRaw));
      if (aRaw) setAppointments(JSON.parse(aRaw));
      if (iRaw) setInstructions(JSON.parse(iRaw));

      // Load active patient need (What Do You Need?)
      const [currentActive, history] = await Promise.all([
        patientNeedsService.getActiveNeed(),
        patientNeedsService.getNeedsHistory(),
      ]);
      setActiveNeed(currentActive);
      setPatientNeeds(history);
    } catch (e) {
      console.warn("Failed to load care data:", e);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    loadData();

    // Subscribe to live patient need updates
    const unsub = patientNeedsService.subscribe((active, history) => {
      setActiveNeed(active);
      setPatientNeeds(history);
    });

    const interval = setInterval(async () => {
      const active = await patientNeedsService.getActiveNeed();
      setActiveNeed(active);
    }, 4000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [loadData]);

  const handleAssistCareNeed = async (action: "attending" | "completed") => {
    if (!activeNeed) return;
    await patientNeedsService.respondToNeed(activeNeed.id, action, "Rishitha");
    if (action === "completed") {
      Alert.alert(
        "Assistance Completed ✅",
        `Assistance for ${activeNeed.label.toLowerCase()} has been marked completed.`
      );
    } else {
      Alert.alert(
        "Caregiver Coming 🏃",
        `Elder has been notified that you are on your way to assist.`
      );
    }
    await loadData();
  };

  // ── 1. Today's Care Overview Metrics ───────────────────────────────────────
  const medsCompleted = medicines.filter((m) => m.status === "done").length;
  const medsTotal = medicines.length;
  const routinesCompleted = routines.filter((r) => r.completed).length;
  const routinesTotal = routines.length;
  const upcomingAppts = appointments.filter((a) => !a.isPast).length;
  const upcomingReminders = reminders.filter((r) => r.status === "upcoming").length;

  // ── Medicine Actions (With Instant Patient Mirror Sync) ─────────────────────
  const syncMedsToPatient = async (medList: CareMedicine[]) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      await AsyncStorage.setItem(
        "smriti_medications_data",
        JSON.stringify({
          date: today,
          items: medList.map((m) => ({
            id: m.id,
            name: m.name,
            dosage: m.dosage,
            timeSlot: m.timeSlot,
            timeLabel: m.timeLabel,
            taken: m.status === "done",
            takenAt: m.recordedAt,
            pillColor:
              m.timeSlot === "morning"
                ? "#38BDF8"
                : m.timeSlot === "night"
                ? "#818CF8"
                : "#F59E0B",
          })),
        })
      );
    } catch {
      // storage fallback
    }
  };

  const handleMarkMedStatus = async (id: string, newStatus: "done" | "upcoming" | "missed") => {
    const updated = medicines.map((m) =>
      m.id === id
        ? {
            ...m,
            status: newStatus,
            recordedAt:
              newStatus === "done"
                ? new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : undefined,
          }
        : m
    );
    setMedicines(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.MEDS, JSON.stringify(updated));
    await syncMedsToPatient(updated);
  };

  const handleSaveMedicine = async () => {
    if (!medName.trim()) {
      Alert.alert("Required", "Please enter medicine name.");
      return;
    }
    const newMed: CareMedicine = {
      id: `med-${Date.now()}`,
      name: medName.trim(),
      dosage: medDosage.trim() || "As directed",
      timeSlot: medSlot,
      timeLabel: medTime.trim() || "Scheduled",
      frequency: medFreq.trim() || "Once daily",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "2026-12-31",
      recurring: true,
      status: "upcoming",
      instructions: medInstructions.trim() || undefined,
    };
    const updated = [...medicines, newMed];
    setMedicines(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.MEDS, JSON.stringify(updated));
    await syncMedsToPatient(updated);
    setMedName("");
    setMedInstructions("");
    setShowAddMedModal(false);
    Alert.alert("Saved ✅", `"${newMed.name}" added and synced with patient.`);
  };

  const handleDeleteMedicine = (id: string) => {
    Alert.alert("Delete Medicine", "Are you sure you want to remove this medication?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const updated = medicines.filter((m) => m.id !== id);
          setMedicines(updated);
          await AsyncStorage.setItem(STORAGE_KEYS.MEDS, JSON.stringify(updated));
          await syncMedsToPatient(updated);
        },
      },
    ]);
  };

  // ── Routine Actions (With Instant Patient Mirror Sync) ─────────────────────
  const syncRoutinesToPatient = async (routineList: CareRoutine[]) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      await AsyncStorage.setItem(
        "smriti_routine_data",
        JSON.stringify({
          date: today,
          items: routineList.map((r) => ({
            id: r.id,
            title: r.task,
            timeLabel: r.time,
            completed: r.completed,
            status: r.completed ? "done" : "pending",
            iconName: r.icon || "check-circle",
          })),
        })
      );
    } catch {
      // storage fallback
    }
  };

  const handleToggleRoutine = async (id: string) => {
    const updated = routines.map((r) =>
      r.id === id ? { ...r, completed: !r.completed } : r
    );
    setRoutines(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(updated));
    await syncRoutinesToPatient(updated);
  };

  const handleSaveRoutine = async () => {
    if (!routineTask.trim()) {
      Alert.alert("Required", "Please choose a template or enter a routine task.");
      return;
    }
    const newRoutine: CareRoutine = {
      id: `rt-${Date.now()}`,
      task: routineTask.trim(),
      time: routineTime.trim() || "Daily",
      repeat: "Daily",
      completed: false,
      icon: "check-circle",
    };
    const updated = [...routines, newRoutine];
    setRoutines(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(updated));
    await syncRoutinesToPatient(updated);
    setRoutineTask("");
    setSelectedTemplateId(null);
    setShowAddRoutineModal(false);
    Alert.alert("Routine Added ✅", `"${newRoutine.task}" scheduled and synced with patient.`);
  };

  const handleAddRoutineFromTemplate = async (tpl: RoutineTemplate) => {
    const newRoutine: CareRoutine = {
      id: `rt-${Date.now()}`,
      task: tpl.task,
      time: tpl.time,
      repeat: tpl.repeat,
      completed: false,
      icon: tpl.icon,
    };
    const updated = [...routines, newRoutine];
    setRoutines(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(updated));
    await syncRoutinesToPatient(updated);
    setShowAddRoutineModal(false);
    Alert.alert(
      "Routine Added ⚡",
      `"${tpl.task}" at ${tpl.time} added to schedule and synced with patient.`
    );
  };

  const handleSelectRoutineTemplate = (tpl: RoutineTemplate) => {
    setSelectedTemplateId(tpl.id);
    setRoutineTask(tpl.task);
    setRoutineTime(tpl.time);
  };

  const handleDeleteRoutine = (id: string) => {
    Alert.alert("Delete Routine", "Remove this task from patient's daily routine?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const updated = routines.filter((r) => r.id !== id);
          setRoutines(updated);
          await AsyncStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(updated));
          await syncRoutinesToPatient(updated);
        },
      },
    ]);
  };

  // ── Reminder Actions ───────────────────────────────────────────────────────
  const handleSaveReminder = async () => {
    let titleToSave = reminderTitle.trim();
    if (!titleToSave) {
      if (reminderCategory === "water") titleToSave = "Drink 1 Glass of Water";
      else if (reminderCategory === "call") titleToSave = "Family Check-in Call";
      else if (reminderCategory === "walk") titleToSave = "Courtyard Routine Walk";
      else if (reminderCategory === "game") titleToSave = "Cognitive Brain Exercise";
      else titleToSave = "Daily Care Reminder";
    }
    const timeToSave = reminderTime.trim() || "11:00 AM";

    const newRem: CareReminder = {
      id: `rem-${Date.now()}`,
      title: titleToSave,
      category: reminderCategory,
      timeLabel: timeToSave,
      status: "upcoming",
    };
    const updated = [...reminders, newRem];
    setReminders(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(updated));

    // Also mirror to daily routines so patient portal receives this reminder
    try {
      const routineIcon =
        reminderCategory === "water"
          ? "coffee"
          : reminderCategory === "walk"
          ? "sun"
          : reminderCategory === "game"
          ? "sparkles"
          : "check-circle";
      const newRoutine: CareRoutine = {
        id: `rt-rem-${Date.now()}`,
        task: titleToSave,
        time: timeToSave,
        repeat: "Daily",
        completed: false,
        icon: routineIcon,
      };
      const updatedRoutines = [...routines, newRoutine];
      setRoutines(updatedRoutines);
      await AsyncStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(updatedRoutines));
      await syncRoutinesToPatient(updatedRoutines);
    } catch {
      // safe fallback
    }

    setReminderTitle("");
    setShowAddReminderModal(false);
    Alert.alert("Reminder Added 🔔", `"${titleToSave}" at ${timeToSave} has been scheduled and synced.`);
  };


  // ── Appointment Actions ────────────────────────────────────────────────────
  const handleSaveAppointment = async () => {
    if (!apptDoctor.trim()) return;
    const newAppt: CareAppointment = {
      id: `app-${Date.now()}`,
      doctor: apptDoctor.trim(),
      specialty: "Consultant Physician",
      hospital: apptClinic.trim() || "Apollo Clinic",
      date: apptDate.trim(),
      time: apptTime.trim(),
      reason: apptReason.trim() || "Routine Checkup",
      notes: "Prepared for consultation.",
      reminderEnabled: true,
      isPast: false,
    };
    const updated = [newAppt, ...appointments];
    setAppointments(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(updated));
    try {
      await AsyncStorage.setItem(
        "smriti_appointments_data",
        JSON.stringify(
          updated.map((a) => ({
            id: a.id,
            title: a.reason,
            doctorName: a.doctor,
            date: a.date,
            timeLabel: a.time,
            location: a.hospital,
            completed: a.isPast || false,
          }))
        )
      );
    } catch {
      // storage fallback
    }
    setApptDoctor("");
    setApptClinic("");
    setApptReason("");
    setShowAddApptModal(false);
  };

  // ── Instruction Note Actions ───────────────────────────────────────────────
  const handleSaveInstruction = async () => {
    if (!insTitle.trim() || !insDetail.trim()) return;
    const newIns: CareInstruction = {
      id: `ins-${Date.now()}`,
      type: insType,
      title: insTitle.trim(),
      detail: insDetail.trim(),
      author: "Primary Caregiver (Rishitha)",
      timestamp: "Just now",
    };
    const updated = [newIns, ...instructions];
    setInstructions(updated);
    await AsyncStorage.setItem(STORAGE_KEYS.INSTRUCTIONS, JSON.stringify(updated));
    setInsTitle("");
    setShowAddInstructionModal(false);
  };

  // ── Tele-Care & Doctor Actions ─────────────────────────────────────────────
  const handleStartDoctorVideo = async () => {
    try {
      await callService.startCall({
        contactId: "doc-1",
        contactName: "Dr. Ananya Sharma",
        contactAvatar: "👩‍⚕️",
        contactRelationship: "Neurologist · Apollo Clinic",
        phone: "+91 98640 11223",
        callType: "video",
      });
      router.push("/(caregiver)/family");
    } catch {
      Linking.openURL("tel:+919864011223");
    }
  };

  const handleSendDoctorQuery = () => {
    if (!doctorQueryCustom.trim() && !doctorQueryPreset) {
      Alert.alert("Notice", "Please enter your query or select a topic.");
      return;
    }
    const newQ = {
      id: `dq_${Date.now()}`,
      topic: doctorQueryPreset || "Clinical Query",
      doctor: "Dr. Ananya Sharma (Neurologist)",
      date: "Just now",
      status: "Submitted (Under Review)",
      advice:
        doctorQueryCustom.trim() ||
        `Inquiry sent regarding ${doctorQueryPreset}. Clinic team will review and reply within 2-4 hours.`,
      pills: "Pending physician review",
    };
    setDoctorQueries([newQ, ...doctorQueries]);
    setDoctorQueryCustom("");
    setShowAskDoctorModal(false);
    Alert.alert(
      "Query Sent ✅",
      "Your clinical query has been transmitted to Dr. Sharma's clinic desk."
    );
  };

  const handlePlayAdviceAudio = async (text: string) => {
    if (isPlayingAdvice) {
      VoiceAssistant.stop();
      setIsPlayingAdvice(false);
      return;
    }
    setIsPlayingAdvice(true);
    await VoiceAssistant.speak(text, "en");
    setIsPlayingAdvice(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.ambientAuraTop} pointerEvents="none" />
      <View style={styles.ambientAuraBottom} pointerEvents="none" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
      >
        {/* Header Title */}
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.pageTitle}>Care & Health Management</Text>
            <Text style={styles.pageSubtitle}>Medications, routines, reminders, and clinical notes</Text>
          </View>
          <TouchableOpacity
            style={styles.historyTopBtn}
            onPress={() => setShowHistoryModal(true)}
            activeOpacity={0.8}
          >
            <Feather name="clock" size={14} color="#2563EB" />
            <Text style={styles.historyTopBtnText}>History</Text>
          </TouchableOpacity>
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            1. TODAY'S CARE OVERVIEW (Compact Summary at the Top)
        ══════════════════════════════════════════════════════════════════ */}
        <View style={styles.overviewCard}>
          <Text style={styles.overviewCardHeading}>Today's Care Overview</Text>
          <View style={styles.overviewStatsRow}>
            {/* Medicines */}
            <View style={[styles.overviewMiniCard, { backgroundColor: "#F0F9FF", borderColor: "#BAE6FD" }]}>
              <Text style={{ fontSize: 16 }}>💊</Text>
              <Text style={[styles.overviewNumberText, { color: "#0284C7" }]}>
                {medsCompleted}/{medsTotal}
              </Text>
              <Text style={styles.overviewLabel}>Medicines</Text>
            </View>

            {/* Routines */}
            <View style={[styles.overviewMiniCard, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
              <Text style={{ fontSize: 16 }}>🔄</Text>
              <Text style={[styles.overviewNumberText, { color: "#059669" }]}>
                {routinesCompleted}/{routinesTotal}
              </Text>
              <Text style={styles.overviewLabel}>Routines</Text>
            </View>

            {/* Appointments */}
            <View style={[styles.overviewMiniCard, { backgroundColor: "#FAF5FF", borderColor: "#E9D5FF" }]}>
              <Text style={{ fontSize: 16 }}>📅</Text>
              <Text style={[styles.overviewNumberText, { color: "#7C3AED" }]}>
                {upcomingAppts}
              </Text>
              <Text style={styles.overviewLabel}>Appointments</Text>
            </View>

            {/* Reminders */}
            <View style={[styles.overviewMiniCard, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
              <Text style={{ fontSize: 16 }}>🔔</Text>
              <Text style={[styles.overviewNumberText, { color: "#2563EB" }]}>
                {upcomingReminders}
              </Text>
              <Text style={styles.overviewLabel}>Reminders</Text>
            </View>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            🔔 LIVE PATIENT ASSISTANCE REQUESTS (FROM SENIOR TABLET)
        ══════════════════════════════════════════════════════════════════ */}
        {activeNeed && activeNeed.status !== "completed" && (
          <View style={styles.careNeedAlertCard}>
            <View style={styles.careNeedHeaderRow}>
              <View style={styles.careNeedPulseDot} />
              <Text style={styles.careNeedBadge}>
                {activeNeed.needId === "walk"
                  ? "🚶 OUTDOOR WALK REQUESTED"
                  : `🔔 ELDER REQUEST: ${activeNeed.label.toUpperCase()}`}
              </Text>
              <Text style={styles.careNeedTime}>{activeNeed.displayTime} · Live</Text>
            </View>

            <View style={styles.careNeedBody}>
              <View style={styles.careNeedEmojiCircle}>
                <Text style={{ fontSize: 24 }}>{activeNeed.emoji}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.careNeedTitle}>
                  {activeNeed.patientName || "Bhaben"} requested {activeNeed.label.toLowerCase()}
                </Text>
                <Text style={styles.careNeedSub}>
                  "{activeNeed.subLabel}" · Tap to assist or notify elder
                </Text>
              </View>
            </View>

            <View style={styles.careNeedActionsRow}>
              <TouchableOpacity
                style={[
                  styles.careNeedActionBtn,
                  activeNeed.status === "attending"
                    ? styles.careNeedBtnComplete
                    : styles.careNeedBtnAttend,
                ]}
                onPress={() =>
                  handleAssistCareNeed(
                    activeNeed.status === "attending" ? "completed" : "attending"
                  )
                }
                activeOpacity={0.8}
              >
                <Feather
                  name={
                    activeNeed.status === "attending"
                      ? "check-circle"
                      : "user-check"
                  }
                  size={15}
                  color="#FFFFFF"
                />
                <Text style={styles.careNeedActionBtnText}>
                  {activeNeed.status === "attending"
                    ? "Mark Done ✅"
                    : "I'm Assisting Now"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.careNeedActionBtnCall}
                onPress={() => Linking.openURL("tel:+919876543210")}
                activeOpacity={0.8}
              >
                <Feather name="phone-call" size={14} color="#1E40AF" />
                <Text style={styles.careNeedActionCallText}>Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            2. 💊 MEDICATION MANAGEMENT (Proper Dedicated Section)
        ══════════════════════════════════════════════════════════════════ */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderBetween}>
            <View>
              <Text style={styles.sectionTitleText}>💊 Medication Management</Text>
              <Text style={styles.sectionSubDesc}>Scheduled dosages & adherence</Text>
            </View>
            <TouchableOpacity
              style={styles.addSectionBtn}
              onPress={() => setShowAddMedModal(true)}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={14} color="#FFFFFF" />
              <Text style={styles.addSectionBtnText}>Add Medicine</Text>
            </TouchableOpacity>
          </View>

          {/* Grouped by Slot */}
          {medicines.length === 0 ? (
            <View style={styles.emptyCareBlock}>
              <View style={[styles.emptyCareIconCircle, { backgroundColor: "#F0F9FF" }]}>
                <Feather name="plus-circle" size={22} color="#0284C7" />
              </View>
              <Text style={styles.emptyCareTitle}>No Medications Scheduled</Text>
              <Text style={styles.emptyCareSub}>
                Tap "Add Medicine" to track prescriptions, dosage times, and daily intake adherence.
              </Text>
            </View>
          ) : (
            (["morning", "afternoon", "evening", "night"] as const).map((slot) => {
              const slotMeds = medicines.filter((m) => m.timeSlot === slot);
              if (slotMeds.length === 0) return null;
              const slotTitle = slot.charAt(0).toUpperCase() + slot.slice(1);
              return (
                <View key={slot} style={styles.slotGroupContainer}>
                  <Text style={styles.slotGroupTitle}>{slotTitle}</Text>
                  {slotMeds.map((med) => (
                    <View key={med.id} style={styles.medCard}>
                      <View style={styles.medCardTopRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.medNameText}>{med.name}</Text>
                          <Text style={styles.medDosageText}>{med.dosage} · {med.timeLabel}</Text>
                          <Text style={styles.medFreqText}>{med.frequency}</Text>
                          {med.instructions && (
                            <Text style={styles.medNoteText}>Note: {med.instructions}</Text>
                          )}
                        </View>

                        {/* Status Badge */}
                        <View
                          style={[
                            styles.medStatusBadge,
                            med.status === "done" && { backgroundColor: "#DCFCE7" },
                            med.status === "upcoming" && { backgroundColor: "#EFF6FF" },
                            med.status === "missed" && { backgroundColor: "#FFF1F2" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.medStatusBadgeText,
                              med.status === "done" && { color: "#166534" },
                              med.status === "upcoming" && { color: "#1D4ED8" },
                              med.status === "missed" && { color: "#9F1239" },
                            ]}
                          >
                            {med.status === "done"
                              ? `✓ Done ${med.recordedAt ? `(${med.recordedAt})` : ""}`
                              : med.status === "upcoming"
                              ? "⏰ Upcoming"
                              : "⚠️ Missed"}
                          </Text>
                        </View>
                      </View>

                      {/* Action Buttons */}
                      <View style={styles.medActionRow}>
                        {med.status !== "done" && (
                          <TouchableOpacity
                            style={[styles.medActionBtn, { backgroundColor: "#ECFDF5" }]}
                            onPress={() => handleMarkMedStatus(med.id, "done")}
                          >
                            <Feather name="check" size={13} color="#059669" />
                            <Text style={[styles.medActionBtnText, { color: "#059669" }]}>Mark as Taken</Text>
                          </TouchableOpacity>
                        )}

                        {med.status === "done" && (
                          <TouchableOpacity
                            style={[styles.medActionBtn, { backgroundColor: "#F1F5F9" }]}
                            onPress={() => handleMarkMedStatus(med.id, "upcoming")}
                          >
                            <Feather name="rotate-ccw" size={13} color="#475569" />
                            <Text style={[styles.medActionBtnText, { color: "#475569" }]}>Reset to Upcoming</Text>
                          </TouchableOpacity>
                        )}

                        {med.status !== "missed" && (
                          <TouchableOpacity
                            style={[styles.medActionBtn, { backgroundColor: "#FFF1F2" }]}
                            onPress={() => handleMarkMedStatus(med.id, "missed")}
                          >
                            <Feather name="alert-triangle" size={13} color="#E11D48" />
                            <Text style={[styles.medActionBtnText, { color: "#E11D48" }]}>Record Missed</Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={styles.deleteMiniBtn}
                          onPress={() => handleDeleteMedicine(med.id)}
                        >
                          <Feather name="trash-2" size={14} color="#64748B" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              );
            })
          )}
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            3. 🔄 DAILY ROUTINE (Routine Recall Concept)
        ══════════════════════════════════════════════════════════════════ */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderBetween}>
            <View>
              <Text style={styles.sectionTitleText}>🔄 Daily Routine</Text>
              <Text style={styles.sectionSubDesc}>Sequential recall & daily living flow</Text>
            </View>
            <TouchableOpacity
              style={styles.addSectionBtn}
              onPress={() => setShowAddRoutineModal(true)}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={14} color="#FFFFFF" />
              <Text style={styles.addSectionBtnText}>Add Routine</Text>
            </TouchableOpacity>
          </View>

          {routines.length === 0 ? (
            <View style={styles.emptyCareBlock}>
              <View style={[styles.emptyCareIconCircle, { backgroundColor: "#F0FDF4" }]}>
                <Feather name="clock" size={22} color="#059669" />
              </View>
              <Text style={styles.emptyCareTitle}>No Daily Routines Configured</Text>
              <Text style={styles.emptyCareSub}>
                Add morning wake-up, walk, or meal reminders to support sequential daily recall.
              </Text>
            </View>
          ) : (
            <View style={styles.routinesListCard}>
              {routines.map((item, idx) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.routineItemRow,
                    idx < routines.length - 1 && styles.routineItemBorder,
                  ]}
                  onPress={() => handleToggleRoutine(item.id)}
                  activeOpacity={0.7}
                >
                  {/* Completion Checkmark */}
                  <View
                    style={[
                      styles.routineCheckbox,
                      item.completed && styles.routineCheckboxDone,
                    ]}
                  >
                    {item.completed && <Feather name="check" size={12} color="#FFFFFF" />}
                  </View>

                  {/* Routine Info: Time -> Task -> Repeat */}
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text
                      style={[
                        styles.routineTaskText,
                        item.completed && styles.routineTaskDoneText,
                      ]}
                    >
                      {item.task}
                    </Text>
                    <Text style={styles.routineMetaText}>
                      {item.time} → Repeat: {item.repeat}
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View
                      style={[
                        styles.routineStatusTag,
                        { backgroundColor: item.completed ? "#DCFCE7" : "#F1F5F9" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.routineStatusTagText,
                          { color: item.completed ? "#166534" : "#64748B" },
                        ]}
                      >
                        {item.completed ? "Completed" : "Pending"}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteRoutine(item.id);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Feather name="trash-2" size={15} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            4. 🔔 REMINDERS (General Reminders Separate from Medicines)
        ══════════════════════════════════════════════════════════════════ */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderBetween}>
            <View>
              <Text style={styles.sectionTitleText}>🔔 Reminders</Text>
              <Text style={styles.sectionSubDesc}>Hydration, calls, walks & activities</Text>
            </View>
            <TouchableOpacity
              style={styles.addSectionBtn}
              onPress={() => setShowAddReminderModal(true)}
              activeOpacity={0.8}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="plus" size={14} color="#FFFFFF" />
              <Text style={styles.addSectionBtnText}>Add Reminder</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Pills */}
          <View style={styles.reminderFilterRow}>
            {(["upcoming", "completed", "missed"] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.reminderFilterBtn,
                  reminderFilter === tab && styles.reminderFilterBtnActive,
                ]}
                onPress={() => setReminderFilter(tab)}
              >
                <Text
                  style={[
                    styles.reminderFilterBtnText,
                    reminderFilter === tab && styles.reminderFilterBtnTextActive,
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.remindersListContainer}>
            {reminders
              .filter((r) => r.status === reminderFilter)
              .map((rem) => (
                <View key={rem.id} style={styles.reminderCard}>
                  <View style={styles.remIconCircle}>
                    <Text style={{ fontSize: 16 }}>
                      {rem.category === "water"
                        ? "💧"
                        : rem.category === "call"
                        ? "📞"
                        : rem.category === "walk"
                        ? "🚶"
                        : rem.category === "game"
                        ? "🧠"
                        : "⏰"}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reminderTitleText}>{rem.title}</Text>
                    <Text style={styles.reminderTimeText}>{rem.timeLabel}</Text>
                  </View>

                  <View
                    style={[
                      styles.reminderStateBadge,
                      rem.status === "completed" && { backgroundColor: "#DCFCE7" },
                      rem.status === "upcoming" && { backgroundColor: "#EFF6FF" },
                      rem.status === "missed" && { backgroundColor: "#FFF1F2" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.reminderStateBadgeText,
                        rem.status === "completed" && { color: "#166534" },
                        rem.status === "upcoming" && { color: "#1D4ED8" },
                        rem.status === "missed" && { color: "#9F1239" },
                      ]}
                    >
                      {rem.status}
                    </Text>
                  </View>
                </View>
              ))}

            {reminders.filter((r) => r.status === reminderFilter).length === 0 && (
              <View style={styles.emptyStateBox}>
                <Text style={styles.emptyStateText}>No {reminderFilter} reminders.</Text>
                <TouchableOpacity
                  style={styles.emptyReminderBtn}
                  onPress={() => setShowAddReminderModal(true)}
                  activeOpacity={0.8}
                >
                  <Feather name="plus-circle" size={15} color="#2563EB" />
                  <Text style={styles.emptyReminderBtnText}>+ Add Reminder</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            5. 🩺 TELE-CARE & DOCTOR HUB (Neatly organized buttons)
        ══════════════════════════════════════════════════════════════════ */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderBetween}>
            <View>
              <Text style={styles.sectionTitleText}>🩺 Tele-Care & Doctor Hub</Text>
              <Text style={styles.sectionSubDesc}>Direct specialist visits, queries & prescriptions</Text>
            </View>
            <TouchableOpacity
              style={[styles.addSectionBtn, { backgroundColor: "#C2747C" }]}
              onPress={() => setShowAskDoctorModal(true)}
              activeOpacity={0.8}
            >
              <Feather name="message-square" size={14} color="#FFFFFF" />
              <Text style={styles.addSectionBtnText}>Ask Doctor</Text>
            </TouchableOpacity>
          </View>

          {/* Clean 2x2 Action Button Grid */}
          <View style={styles.teleGrid}>
            <TouchableOpacity
              style={[styles.teleBtn, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}
              onPress={handleStartDoctorVideo}
              activeOpacity={0.75}
            >
              <View style={[styles.teleIconCircle, { backgroundColor: "#DBEAFE" }]}>
                <Feather name="video" size={20} color="#1D4ED8" />
              </View>
              <Text style={[styles.teleBtnTitle, { color: "#1E3A8A" }]}>Video Consult</Text>
              <Text style={styles.teleBtnSub}>Dr. Sharma · Neurologist</Text>
              <View style={[styles.teleBadge, { backgroundColor: "#DCFCE7" }]}>
                <Text style={[styles.teleBadgeText, { color: "#15803D" }]}>● Online</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.teleBtn, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}
              onPress={() => Linking.openURL("tel:+919864011223")}
              activeOpacity={0.75}
            >
              <View style={[styles.teleIconCircle, { backgroundColor: "#DCFCE7" }]}>
                <Feather name="phone-call" size={20} color="#15803D" />
              </View>
              <Text style={[styles.teleBtnTitle, { color: "#14532D" }]}>Call Clinic</Text>
              <Text style={styles.teleBtnSub}>Apollo Geriatric OPD</Text>
              <View style={[styles.teleBadge, { backgroundColor: "#EFF6FF" }]}>
                <Text style={[styles.teleBadgeText, { color: "#1D4ED8" }]}>Direct Line</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.teleBtn, { backgroundColor: "#FAF5FF", borderColor: "#E9D5FF" }]}
              onPress={() => Linking.openURL("tel:+919435044556")}
              activeOpacity={0.75}
            >
              <View style={[styles.teleIconCircle, { backgroundColor: "#F3E8FF" }]}>
                <Feather name="user-check" size={20} color="#7E22CE" />
              </View>
              <Text style={[styles.teleBtnTitle, { color: "#581C87" }]}>ASHA Didi</Text>
              <Text style={styles.teleBtnSub}>Geeta Saikia · Majuli</Text>
              <View style={[styles.teleBadge, { backgroundColor: "#FAF5FF" }]}>
                <Text style={[styles.teleBadgeText, { color: "#7E22CE" }]}>Community</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.teleBtn, { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }]}
              onPress={() => setShowAskDoctorModal(true)}
              activeOpacity={0.75}
            >
              <View style={[styles.teleIconCircle, { backgroundColor: "#FFEDD5" }]}>
                <Feather name="help-circle" size={20} color="#C2410C" />
              </View>
              <Text style={[styles.teleBtnTitle, { color: "#7C2D12" }]}>Ask Doctor</Text>
              <Text style={styles.teleBtnSub}>Symptoms / Dosage</Text>
              <View style={[styles.teleBadge, { backgroundColor: "#FEF3C7" }]}>
                <Text style={[styles.teleBadgeText, { color: "#92400E" }]}>Quick Query</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Emergency Dispatch Row */}
          <View style={styles.teleEmergencyRow}>
            <TouchableOpacity
              style={[styles.teleEmergBtn, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}
              onPress={() => Linking.openURL("tel:108")}
              activeOpacity={0.8}
            >
              <Feather name="truck" size={16} color="#DC2626" />
              <Text style={[styles.teleEmergBtnText, { color: "#991B1B" }]}>Ambulance 108</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.teleEmergBtn, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}
              onPress={() => Linking.openURL("tel:112")}
              activeOpacity={0.8}
            >
              <Feather name="shield" size={16} color="#DC2626" />
              <Text style={[styles.teleEmergBtnText, { color: "#991B1B" }]}>National Help 112</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Doctor Queries & Advice */}
          {doctorQueries.map((dq) => (
            <View key={dq.id} style={styles.doctorAdviceCard}>
              <View style={styles.adviceTopRow}>
                <View style={styles.doctorAvatarPill}>
                  <Text style={{ fontSize: 18 }}>👩‍⚕️</Text>
                  <View style={{ marginLeft: 8 }}>
                    <Text style={styles.adviceDoctorName}>{dq.doctor}</Text>
                    <Text style={styles.adviceDate}>{dq.date}</Text>
                  </View>
                </View>
                <View style={styles.adviceStatusPill}>
                  <Text style={styles.adviceStatusText}>{dq.status}</Text>
                </View>
              </View>

              <Text style={styles.adviceTopicText}>📌 {dq.topic}</Text>
              <Text style={styles.adviceBodyText}>{dq.advice}</Text>

              <View style={styles.adviceBottomBar}>
                <View style={styles.adviceRxPill}>
                  <Feather name="check-circle" size={13} color="#059669" />
                  <Text style={styles.adviceRxText}>{dq.pills}</Text>
                </View>

                <TouchableOpacity
                  style={styles.listenAdviceBtn}
                  onPress={() => handlePlayAdviceAudio(dq.advice)}
                  activeOpacity={0.75}
                >
                  <Feather
                    name={isPlayingAdvice ? "square" : "volume-2"}
                    size={14}
                    color="#C2747C"
                  />
                  <Text style={styles.listenAdviceBtnText}>
                    {isPlayingAdvice ? "Stop" : "Listen"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            6. 📅 APPOINTMENTS (Upcoming & Past)
        ══════════════════════════════════════════════════════════════════ */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderBetween}>
            <View>
              <Text style={styles.sectionTitleText}>📅 Appointments</Text>
              <Text style={styles.sectionSubDesc}>Doctor consultations & clinic visits</Text>
            </View>
            <TouchableOpacity
              style={styles.addSectionBtn}
              onPress={() => setShowAddApptModal(true)}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={14} color="#FFFFFF" />
              <Text style={styles.addSectionBtnText}>Add Visit</Text>
            </TouchableOpacity>
          </View>

          {appointments.length === 0 ? (
            <View style={styles.emptyCareBlock}>
              <View style={[styles.emptyCareIconCircle, { backgroundColor: "#FAF5FF" }]}>
                <Feather name="calendar" size={22} color="#7C3AED" />
              </View>
              <Text style={styles.emptyCareTitle}>No Upcoming Appointments</Text>
              <Text style={styles.emptyCareSub}>
                Schedule doctor consultations, routine cognitive check-ups, or clinic visits here.
              </Text>
            </View>
          ) : (
            appointments.map((appt) => (
              <View
                key={appt.id}
                style={[
                  styles.appointmentCard,
                  appt.isPast && { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" },
                ]}
              >
                <View style={styles.apptTopRow}>
                  <View style={styles.apptIconCircle}>
                    <Feather name="calendar" size={18} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.apptDoctorName}>{appt.doctor}</Text>
                    <Text style={styles.apptSpecialtyText}>{appt.specialty} · {appt.hospital}</Text>
                  </View>
                  <View
                    style={[
                      styles.apptStatusTag,
                      { backgroundColor: appt.isPast ? "#F1F5F9" : "#EFF6FF" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.apptStatusTagText,
                        { color: appt.isPast ? "#64748B" : "#2563EB" },
                      ]}
                    >
                      {appt.isPast ? "Completed" : "Upcoming"}
                    </Text>
                  </View>
                </View>

                <View style={styles.apptDetailsBox}>
                  <Text style={styles.apptDetailRow}>
                    <Text style={{ fontWeight: "700" }}>Date & Time: </Text>
                    {appt.date} at {appt.time}
                  </Text>
                  <Text style={styles.apptDetailRow}>
                    <Text style={{ fontWeight: "700" }}>Reason: </Text>
                    {appt.reason}
                  </Text>
                  <Text style={styles.apptDetailRow}>
                    <Text style={{ fontWeight: "700" }}>Notes: </Text>
                    {appt.notes}
                  </Text>
                </View>

                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    backgroundColor: "#F0FDF4",
                    borderWidth: 1,
                    borderColor: "#BBF7D0",
                    borderRadius: 10,
                    paddingVertical: 8,
                    marginTop: 10,
                  }}
                  onPress={() => Linking.openURL("tel:+919876543210").catch(() => {})}
                  activeOpacity={0.8}
                >
                  <Feather name="phone-call" size={14} color="#059669" />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#059669" }}>
                    Call Clinic ({appt.hospital})
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            6. 🩺 CARE INSTRUCTIONS / NOTES (Clinical & Handover)
        ══════════════════════════════════════════════════════════════════ */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderBetween}>
            <View>
              <Text style={styles.sectionTitleText}>🩺 Care Instructions / Notes</Text>
              <Text style={styles.sectionSubDesc}>Dietary, safety & shift handover observations</Text>
            </View>
            <TouchableOpacity
              style={styles.addSectionBtn}
              onPress={() => setShowAddInstructionModal(true)}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={14} color="#FFFFFF" />
              <Text style={styles.addSectionBtnText}>Add Note</Text>
            </TouchableOpacity>
          </View>

          {instructions.length === 0 ? (
            <View style={styles.emptyCareBlock}>
              <View style={[styles.emptyCareIconCircle, { backgroundColor: "#F0F9FF" }]}>
                <Feather name="file-text" size={22} color="#0284C7" />
              </View>
              <Text style={styles.emptyCareTitle}>No Care Notes</Text>
              <Text style={styles.emptyCareSub}>
                Record clinical orders, dietary guidance, or shift handover observations.
              </Text>
            </View>
          ) : (
            instructions.map((ins) => (
            <View key={ins.id} style={styles.instructionCard}>
              <View style={styles.instructionHeader}>
                <View style={styles.insTypeBadge}>
                  <Text style={styles.insTypeBadgeText}>
                    {ins.type === "special"
                      ? "🛡️ Special Care"
                      : ins.type === "doctor"
                      ? "👨‍⚕️ Doctor Order"
                      : ins.type === "diet"
                      ? "🥗 Dietary"
                      : "📋 Handover"}
                  </Text>
                </View>
                <Text style={styles.insTimestampText}>{ins.timestamp}</Text>
              </View>

              <Text style={styles.insTitleText}>{ins.title}</Text>
              <Text style={styles.insDetailText}>{ins.detail}</Text>
            </View>
          ))
        )}
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            7. 👥 CARE TEAM (Caregivers, ASHA, Clinicians)
        ══════════════════════════════════════════════════════════════════ */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitleText}>👥 Care Team</Text>
          <Text style={styles.sectionSubDesc}>People involved in elder's health & daily support</Text>

          <View style={styles.teamGrid}>
            {CARE_TEAM.map((member) => (
              <View
                key={member.id}
                style={[
                  styles.teamCard,
                  { backgroundColor: member.bgColor, borderColor: "#E2E8F0" },
                ]}
              >
                <View style={styles.teamTopRow}>
                  <Text style={{ fontSize: 24 }}>{member.avatarEmoji}</Text>
                  <View style={[styles.teamRoleBadge, { backgroundColor: "#FFFFFF" }]}>
                    <Text style={[styles.teamRoleBadgeText, { color: member.color }]}>
                      {member.role}
                    </Text>
                  </View>
                </View>

                <Text style={styles.teamMemberName}>{member.name}</Text>
                <Text style={styles.teamMemberRelation}>{member.relationOrClinic}</Text>

                {/* 1-Tap Call & Message */}
                <View style={styles.teamContactActions}>
                  <TouchableOpacity
                    style={[styles.teamContactBtn, { backgroundColor: member.color }]}
                    onPress={() => Linking.openURL(`tel:${member.phone}`).catch(() => {})}
                    activeOpacity={0.8}
                  >
                    <Feather name="phone" size={12} color="#FFFFFF" />
                    <Text style={styles.teamContactBtnText}>Call</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.teamContactBtn, { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#CBD5E1" }]}
                    onPress={() => Linking.openURL(`sms:${member.phone}`).catch(() => {})}
                    activeOpacity={0.8}
                  >
                    <Feather name="message-square" size={12} color="#334155" />
                    <Text style={[styles.teamContactBtnText, { color: "#334155" }]}>Text</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            8. 📋 CARE HISTORY (Pattern Insight Bar)
        ══════════════════════════════════════════════════════════════════ */}
        <View style={styles.sectionContainer}>
          <TouchableOpacity
            style={styles.historyCardTrigger}
            onPress={() => setShowHistoryModal(true)}
            activeOpacity={0.85}
          >
            <View style={styles.historyIconCircle}>
              <Feather name="archive" size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.historyCardTitle}>📋 View Comprehensive Care History</Text>
              <Text style={styles.historyCardSub}>
                Analyze medication logs, routine completion streaks, and missed dosage patterns
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── MODAL: ADD MEDICINE ───────────────────────────────────── */}
      <Modal visible={showAddMedModal} transparent animationType="slide" onRequestClose={() => setShowAddMedModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add Medication Schedule</Text>
                <Text style={styles.modalSubTitle}>Choose a preset or enter prescription details</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddMedModal(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              <Text style={styles.fieldLabel}>⚡ Quick Medication Presets (1-Tap Fill)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {MEDICATION_PRESETS.map((preset) => (
                    <TouchableOpacity
                      key={preset.name}
                      style={styles.medPresetChip}
                      onPress={() => {
                        setMedName(preset.name);
                        setMedDosage(preset.dosage);
                        setMedSlot(preset.slot);
                        setMedTime(preset.time);
                        setMedFreq(preset.freq);
                        setMedInstructions(preset.instructions);
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.medPresetChipName}>{preset.name} {preset.dosage}</Text>
                      <Text style={styles.medPresetChipSub}>{preset.time} · {preset.slot}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.fieldLabel}>Medicine Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Metformin / Donepezil"
                value={medName}
                onChangeText={setMedName}
              />

              <Text style={styles.fieldLabel}>Dosage</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 500mg / 1 tablet"
                value={medDosage}
                onChangeText={setMedDosage}
              />

              <Text style={styles.fieldLabel}>Time Slot</Text>
              <View style={styles.slotPillRow}>
                {(["morning", "afternoon", "evening", "night"] as const).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.slotPill, medSlot === s && styles.slotPillActive]}
                    onPress={() => setMedSlot(s)}
                  >
                    <Text style={[styles.slotPillText, medSlot === s && styles.slotPillTextActive]}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Scheduled Time</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 8:00 AM"
                value={medTime}
                onChangeText={setMedTime}
              />

              <Text style={styles.fieldLabel}>Frequency & Recurring</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Once daily after breakfast"
                value={medFreq}
                onChangeText={setMedFreq}
              />

              <Text style={styles.fieldLabel}>Instructions / Notes</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Take with warm water"
                value={medInstructions}
                onChangeText={setMedInstructions}
              />
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddMedModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveMedicine}>
                <Text style={styles.saveBtnText}>Save Medicine</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: ADD ROUTINE (WITH 1-TAP TEMPLATES) ─────────────── */}
      <Modal visible={showAddRoutineModal} transparent animationType="slide" onRequestClose={() => setShowAddRoutineModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: "90%" }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Daily Routine Templates</Text>
                <Text style={styles.modalSubTitle}>Choose a 1-tap template or customize a task</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddRoutineModal(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Category Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateFilterScroll}>
              <View style={styles.templateFilterRow}>
                {["All", "Activity", "Health", "Wellness", "Meal", "Sleep", "Mind"].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.templateFilterChip,
                      selectedTemplateCategory === cat && styles.templateFilterChipActive,
                    ]}
                    onPress={() => setSelectedTemplateCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.templateFilterChipText,
                        selectedTemplateCategory === cat && styles.templateFilterChipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* 1-Tap Template Cards */}
              <Text style={[styles.fieldLabel, { marginTop: 4, marginBottom: 8 }]}>
                ⚡ 1-Tap Routine Presets (Tap to Add Instantly)
              </Text>

              <View style={styles.templateGrid}>
                {ROUTINE_TEMPLATES.filter(
                  (t) => selectedTemplateCategory === "All" || t.category === selectedTemplateCategory
                ).map((tpl) => (
                  <View
                    key={tpl.id}
                    style={[
                      styles.templateCard,
                      selectedTemplateId === tpl.id && styles.templateCardSelected,
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.templateCardMain}
                      onPress={() => handleSelectRoutineTemplate(tpl)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.templateTopRow}>
                        <Text style={styles.templateEmoji}>{tpl.emoji}</Text>
                        <View style={styles.templateTimePill}>
                          <Feather name="clock" size={11} color="#2563EB" />
                          <Text style={styles.templateTimeText}>{tpl.time}</Text>
                        </View>
                      </View>
                      <Text style={styles.templateTaskTitle}>{tpl.task}</Text>
                      <Text style={styles.templateTaskDesc}>{tpl.description}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.templateQuickAddBtn}
                      onPress={() => handleAddRoutineFromTemplate(tpl)}
                      activeOpacity={0.8}
                    >
                      <Feather name="plus" size={13} color="#FFFFFF" />
                      <Text style={styles.templateQuickAddBtnText}>1-Tap Add</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Or Customize Task */}
              <View style={styles.customTaskBox}>
                <Text style={styles.customTaskHeading}>✏️ Customize Task or Adjust Time</Text>
                <Text style={styles.fieldLabel}>Task Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Morning Courtyard Walk"
                  value={routineTask}
                  onChangeText={setRoutineTask}
                />

                <Text style={styles.fieldLabel}>Scheduled Time</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 9:00 AM"
                  value={routineTime}
                  onChangeText={setRoutineTime}
                />

                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setShowAddRoutineModal(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveRoutine}>
                    <Text style={styles.saveBtnText}>Save Routine</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: ADD REMINDER ───────────────────────────────────── */}
      <Modal visible={showAddReminderModal} transparent animationType="slide" onRequestClose={() => setShowAddReminderModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: "90%", paddingBottom: Platform.OS === "ios" ? 34 : 24 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔔 Add General Reminder</Text>
              <TouchableOpacity
                onPress={() => setShowAddReminderModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Quick 1-Tap Presets */}
              <Text style={styles.fieldLabel}>Quick Presets (1-Tap Fill)</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 4, gap: 8 }}
                style={{ marginBottom: 10 }}
              >
                {[
                  { title: "Drink Warm Water", cat: "water", time: "11:00 AM", icon: "💧" },
                  { title: "Family Phone Call", cat: "call", time: "04:30 PM", icon: "📞" },
                  { title: "Courtyard Walk", cat: "walk", time: "05:30 PM", icon: "🚶" },
                  { title: "Cognitive Brain Game", cat: "game", time: "06:00 PM", icon: "🧠" },
                  { title: "Evening Herbal Tea", cat: "water", time: "07:00 PM", icon: "🍵" },
                ].map((preset) => (
                  <TouchableOpacity
                    key={preset.title}
                    style={styles.presetChip}
                    onPress={() => {
                      setReminderTitle(preset.title);
                      setReminderCategory(preset.cat as any);
                      setReminderTime(preset.time);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.presetChipText}>{preset.icon} {preset.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Reminder Title</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Drink warm water / Call daughter"
                value={reminderTitle}
                onChangeText={setReminderTitle}
              />

              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.slotPillRow}>
                {(["water", "call", "walk", "game"] as const).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.slotPill, reminderCategory === cat && styles.slotPillActive]}
                    onPress={() => setReminderCategory(cat)}
                  >
                    <Text style={[styles.slotPillText, reminderCategory === cat && styles.slotPillTextActive]}>
                      {cat.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Scheduled Time</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 11:00 AM"
                value={reminderTime}
                onChangeText={setReminderTime}
              />

              <View style={[styles.modalBtnRow, { marginTop: 18 }]}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowAddReminderModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveReminder}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveBtnText}>Save Reminder</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: ADD APPOINTMENT ─────────────────────────────────── */}
      <Modal visible={showAddApptModal} transparent animationType="slide" onRequestClose={() => setShowAddApptModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Doctor Visit</Text>
              <TouchableOpacity onPress={() => setShowAddApptModal(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Doctor Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Dr. Kumar"
              value={apptDoctor}
              onChangeText={setApptDoctor}
            />

            <Text style={styles.fieldLabel}>Clinic / Hospital</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Apollo Clinic, Dispur"
              value={apptClinic}
              onChangeText={setApptClinic}
            />

            <Text style={styles.fieldLabel}>Date & Time</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder="e.g. Tomorrow"
                value={apptDate}
                onChangeText={setApptDate}
              />
              <TextInput
                style={[styles.textInput, { flex: 1 }]}
                placeholder="e.g. 10:30 AM"
                value={apptTime}
                onChangeText={setApptTime}
              />
            </View>

            <Text style={styles.fieldLabel}>Reason for Visit</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Cognitive follow-up & BP check"
              value={apptReason}
              onChangeText={setApptReason}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddApptModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAppointment}>
                <Text style={styles.saveBtnText}>Save Visit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: ADD CARE INSTRUCTION ────────────────────────────── */}
      <Modal visible={showAddInstructionModal} transparent animationType="slide" onRequestClose={() => setShowAddInstructionModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Care Instruction / Note</Text>
              <TouchableOpacity onPress={() => setShowAddInstructionModal(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Instruction Title</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Evening Safety & Twilight Routine"
              value={insTitle}
              onChangeText={setInsTitle}
            />

            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.slotPillRow}>
              {(["special", "doctor", "diet", "handover"] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.slotPill, insType === t && styles.slotPillActive]}
                  onPress={() => setInsType(t)}
                >
                  <Text style={[styles.slotPillText, insType === t && styles.slotPillTextActive]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Instruction Details</Text>
            <TextInput
              style={[styles.textInput, { height: 75, textAlignVertical: "top" }]}
              placeholder="e.g. Avoid going outside alone after 6 PM..."
              multiline
              numberOfLines={3}
              value={insDetail}
              onChangeText={setInsDetail}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddInstructionModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveInstruction}>
                <Text style={styles.saveBtnText}>Save Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: CARE HISTORY & PATTERNS ─────────────────────────── */}
      <Modal visible={showHistoryModal} transparent animationType="slide" onRequestClose={() => setShowHistoryModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: "88%", paddingBottom: Platform.OS === "ios" ? 34 : 24 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📋 Comprehensive Care History</Text>
              <TouchableOpacity
                onPress={() => setShowHistoryModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flexShrink: 1, maxHeight: 380 }}>
              {/* Medication History */}
              <View style={styles.historySectionBox}>
                <Text style={styles.historySectionTitle}>Medication Adherence Pattern</Text>
                <Text style={styles.historyItemText}>• 7-Day Adherence Rate: 96% (20 of 21 recorded on time)</Text>
                <Text style={styles.historyItemText}>• Missed Doses: 1 evening dose recorded last Thursday</Text>
                <Text style={styles.historyItemText}>• Morning Donepezil consistency: 100% on track</Text>
              </View>

              {/* Routine Completion Streak */}
              <View style={styles.historySectionBox}>
                <Text style={styles.historySectionTitle}>Daily Routine Completion</Text>
                <Text style={styles.historyItemText}>• Morning Courtyard Walk: 7/7 days completed</Text>
                <Text style={styles.historyItemText}>• Afternoon Hydration: Average 6.5 of 8 glasses logged</Text>
                <Text style={styles.historyItemText}>• Bedtime routine adherence: 92% steady without agitation</Text>
              </View>

              {/* Past Consultations */}
              <View style={styles.historySectionBox}>
                <Text style={styles.historySectionTitle}>Recent Clinic History</Text>
                <Text style={styles.historyItemText}>• 14 Feb 2026: Dr. Pradeep Goswami — BP 128/82 mmHg</Text>
                <Text style={styles.historyItemText}>• 10 Jan 2026: Dr. Kumar — Routine baseline cognitive MMSE 22/30</Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.closeHistoryBtn}
              onPress={() => setShowHistoryModal(false)}
              activeOpacity={0.8}
            >
              <Feather name="check" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.closeHistoryBtnText}>Close History</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: ASK DOCTOR CLINICAL QUERY ──────────────────────── */}
      <Modal
        visible={showAskDoctorModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAskDoctorModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ask Doctor / Clinical Query</Text>
              <TouchableOpacity onPress={() => setShowAskDoctorModal(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Select Preset Topic</Text>
            <View style={styles.queryPresetRow}>
              {[
                "Medication Adjustment",
                "Evening Restlessness",
                "Appetite & Hydration",
                "Checkup Request",
              ].map((topic) => (
                <TouchableOpacity
                  key={topic}
                  style={[
                    styles.queryChip,
                    doctorQueryPreset === topic && styles.queryChipActive,
                  ]}
                  onPress={() => setDoctorQueryPreset(topic)}
                >
                  <Text
                    style={[
                      styles.queryChipText,
                      doctorQueryPreset === topic && styles.queryChipTextActive,
                    ]}
                  >
                    {topic}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Additional Clinical Observations</Text>
            <TextInput
              style={[styles.textInput, { height: 80, textAlignVertical: "top" }]}
              placeholder="e.g. Mild agitation starting around 5:30 PM, refused evening soup..."
              multiline
              value={doctorQueryCustom}
              onChangeText={setDoctorQueryCustom}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowAskDoctorModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: "#C2747C" }]}
                onPress={handleSendDoctorQuery}
              >
                <Text style={styles.saveBtnText}>Send to Dr. Sharma</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ── Aesthetics: Clean Slate & Crisp Cool Palette (Zero Yellow) ──────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AestheticTheme.canvas,
    position: "relative",
  },
  ambientAuraTop: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: AestheticTheme.ambientLavender,
  },
  ambientAuraBottom: {
    position: "absolute",
    top: 560,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: AestheticTheme.ambientRose,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 85,
  },

  // Title Row
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 2,
  },
  historyTopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: CalmPalette.primaryLight,
    borderWidth: 1,
    borderColor: CalmPalette.primaryBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  historyTopBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: CalmPalette.primary,
  },

  // 1. Overview Card
  overviewCard: {
    backgroundColor: AestheticTheme.cardSurface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: AestheticTheme.cardBorder,
    ...AestheticTheme.cardShadow,
    marginBottom: 20,
  },
  overviewCardHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  overviewStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  overviewMiniCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  overviewNumberText: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 4,
  },
  overviewLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
    textAlign: "center",
  },

  // Section Headers
  sectionContainer: {
    marginBottom: 22,
  },
  sectionHeaderBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  sectionSubDesc: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  addSectionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: CalmPalette.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addSectionBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // 2. Medication Management
  slotGroupContainer: {
    marginBottom: 14,
  },
  slotGroupTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  medCard: {
    backgroundColor: AestheticTheme.cardSurface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: AestheticTheme.cardBorder,
    marginBottom: 8,
    ...AestheticTheme.cardShadow,
  },
  medCardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  medNameText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  medDosageText: {
    fontSize: 13,
    fontWeight: "600",
    color: CalmPalette.primary,
    marginTop: 2,
  },
  medFreqText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  medNoteText: {
    fontSize: 11,
    color: "#475569",
    fontStyle: "italic",
    marginTop: 3,
  },
  medStatusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  medStatusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  medActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  medActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  medActionBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  deleteMiniBtn: {
    marginLeft: "auto",
    padding: 6,
  },

  // 3. Routines
  routinesListCard: {
    backgroundColor: AestheticTheme.cardSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AestheticTheme.cardBorder,
    paddingHorizontal: 14,
    ...AestheticTheme.cardShadow,
  },
  routineItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
  },
  routineItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  routineCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  routineCheckboxDone: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  routineTaskText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  routineTaskDoneText: {
    color: "#94A3B8",
    textDecorationLine: "line-through",
  },
  routineMetaText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  routineStatusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  routineStatusTagText: {
    fontSize: 10,
    fontWeight: "700",
  },

  // 4. Reminders
  reminderFilterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  reminderFilterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: AestheticTheme.pillTrack,
  },
  reminderFilterBtnActive: {
    backgroundColor: CalmPalette.primary,
  },
  reminderFilterBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  reminderFilterBtnTextActive: {
    color: "#FFFFFF",
  },
  remindersListContainer: {
    gap: 8,
  },
  reminderCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AestheticTheme.cardSurface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: AestheticTheme.cardBorder,
    ...AestheticTheme.cardShadow,
    gap: 10,
  },
  remIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  reminderTitleText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  reminderTimeText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  reminderStateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reminderStateBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  emptyStateBox: {
    padding: 14,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 12,
    color: "#94A3B8",
  },

  // 5. Appointments
  appointmentCard: {
    backgroundColor: AestheticTheme.cardSurface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: AestheticTheme.cardBorder,
    ...AestheticTheme.cardShadow,
    marginBottom: 10,
  },
  apptTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  apptIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  apptDoctorName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  apptSpecialtyText: {
    fontSize: 12,
    color: "#64748B",
  },
  apptStatusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  apptStatusTagText: {
    fontSize: 10,
    fontWeight: "700",
  },
  apptDetailsBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    gap: 3,
  },
  apptDetailRow: {
    fontSize: 11,
    color: "#334155",
    lineHeight: 16,
  },

  // 6. Care Instructions
  instructionCard: {
    backgroundColor: AestheticTheme.cardSurface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: AestheticTheme.cardBorder,
    ...AestheticTheme.cardShadow,
    marginBottom: 10,
  },
  instructionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  insTypeBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  insTypeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#334155",
  },
  insTimestampText: {
    fontSize: 10,
    color: "#94A3B8",
  },
  insTitleText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 3,
  },
  insDetailText: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 17,
    marginBottom: 6,
  },
  insAuthorText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },

  // 7. Care Team
  teamGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  teamCard: {
    width: "48.5%",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  teamTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  teamRoleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  teamRoleBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  teamMemberName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  teamMemberRelation: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
    marginBottom: 10,
  },
  teamContactActions: {
    flexDirection: "row",
    gap: 6,
  },
  teamContactBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 6,
    borderRadius: 6,
  },
  teamContactBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // 8. Care History Trigger
  historyCardTrigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  historyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  historyCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  historyCardSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 15,
  },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    marginTop: 10,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0F172A",
  },
  slotPillRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 2,
  },
  slotPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  slotPillActive: {
    backgroundColor: CalmPalette.primary,
  },
  slotPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  slotPillTextActive: {
    color: "#FFFFFF",
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  saveBtn: {
    flex: 2,
    backgroundColor: CalmPalette.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  closeHistoryBtn: {
    width: "100%",
    backgroundColor: CalmPalette.primary,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    marginBottom: Platform.OS === "ios" ? 8 : 4,
    shadowColor: CalmPalette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  closeHistoryBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  presetChip: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  emptyReminderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 8,
  },
  emptyReminderBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  historySectionBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  historySectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  historyItemText: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
  },
  emptyCareBlock: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    padding: 20,
    alignItems: "center",
    marginVertical: 4,
  },
  emptyCareIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyCareTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 4,
  },
  emptyCareSub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 12,
  },

  // ── Tele-Care & Doctor Hub Styles ──────────────────────────────────────────
  teleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  teleBtn: {
    width: "48%",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  teleIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  teleBtnTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 2,
  },
  teleBtnSub: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 8,
  },
  teleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  teleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  teleEmergencyRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  teleEmergBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  teleEmergBtnText: {
    fontSize: 12,
    fontWeight: "800",
  },
  doctorAdviceCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 6,
  },
  adviceTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  doctorAvatarPill: {
    flexDirection: "row",
    alignItems: "center",
  },
  adviceDoctorName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  adviceDate: {
    fontSize: 10,
    color: "#64748B",
  },
  adviceStatusPill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  adviceStatusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
  },
  adviceTopicText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 4,
  },
  adviceBodyText: {
    fontSize: 12,
    color: "#334155",
    lineHeight: 18,
    marginBottom: 10,
  },
  adviceBottomBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 8,
  },
  adviceRxPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  adviceRxText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#059669",
  },
  listenAdviceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FAF4F3",
    borderWidth: 1,
    borderColor: "#EAD7D8",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  listenAdviceBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#C2747C",
  },
  queryPresetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  queryChip: {
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  queryChipActive: {
    backgroundColor: "#C2747C",
    borderColor: "#C2747C",
  },
  queryChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  queryChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  modalSubTitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  medPresetChip: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 6,
  },
  medPresetChipName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E40AF",
  },
  medPresetChipSub: {
    fontSize: 11,
    color: "#3B82F6",
    marginTop: 2,
  },
  templateFilterScroll: {
    marginBottom: 10,
  },
  templateFilterRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  templateFilterChip: {
    backgroundColor: "#F1F5F9",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  templateFilterChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  templateFilterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  templateFilterChipTextActive: {
    color: "#FFFFFF",
  },
  templateGrid: {
    gap: 10,
    marginBottom: 16,
  },
  templateCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    justifyContent: "space-between",
  },
  templateCardSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  templateCardMain: {
    flex: 1,
    marginRight: 10,
  },
  templateTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  templateEmoji: {
    fontSize: 20,
  },
  templateTimePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  templateTimeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  templateTaskTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 2,
  },
  templateTaskDesc: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 15,
  },
  templateQuickAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  templateQuickAddBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  customTaskBox: {
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginTop: 4,
  },
  customTaskHeading: {
    fontSize: 13,
    fontWeight: "800",
    color: "#334155",
    marginBottom: 10,
  },

  // 🔔 LIVE PATIENT ASSISTANCE REQUEST CARD
  careNeedAlertCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#FCD34D",
    padding: 16,
    marginBottom: 16,
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  careNeedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  careNeedPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D97706",
    marginRight: 8,
  },
  careNeedBadge: {
    fontSize: 12,
    fontWeight: "800",
    color: "#92400E",
    letterSpacing: 0.5,
    flex: 1,
  },
  careNeedTime: {
    fontSize: 11,
    fontWeight: "700",
    color: "#78716C",
  },
  careNeedBody: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  careNeedEmojiCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FDE68A",
    justifyContent: "center",
    alignItems: "center",
  },
  careNeedTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
  },
  careNeedSub: {
    fontSize: 12.5,
    fontWeight: "500",
    color: "#475569",
    marginTop: 2,
  },
  careNeedActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  careNeedActionBtn: {
    flex: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  careNeedBtnAttend: {
    backgroundColor: "#D97706",
  },
  careNeedBtnComplete: {
    backgroundColor: "#059669",
  },
  careNeedActionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  careNeedActionBtnCall: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 5,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  careNeedActionCallText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E40AF",
  },
});
