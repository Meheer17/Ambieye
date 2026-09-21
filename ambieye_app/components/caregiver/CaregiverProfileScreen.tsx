import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  RefreshControl,
  Alert,
  Linking,
  Modal,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useAuth } from "@/hooks/useAuth";
import { CalmPalette, PastelPalette, AestheticTheme } from "../../constants/theme";
import { caregiverStorage, PatientProfile } from "../../utils/caregiverStorage";
import { dementiaCareStorage } from "../../utils/dementiaCareStorage";

import CaregiverPatientProfileModal from "./CaregiverPatientProfileModal";
import { CaregiverServicesModal } from "./CaregiverServicesModal";
import { CaregiverArticlesModal } from "./CaregiverArticlesModal";
import { CaregiverEmergencyModal } from "./CaregiverEmergencyModal";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { iotSensorService, IoTTelemetry } from "../../services/hardware/iotSensorService";
import { federatedService, FederatedStatus } from "../../services/api/federatedService";

// ── Types ────────────────────────────────────────────────────────────────────
export type CaregiverSubTab = "overview" | "doctors" | "cst" | "services" | "safety";

export interface DoctorFacility {
  id: string;
  name: string;
  specialty: string;
  clinicName: string;
  address: string;
  distanceKm: string;
  rating: number;
  reviewsCount: number;
  timings: string;
  phone: string;
  avatarEmoji: string;
  tags: string[];
  nextAvailable: string;
  consultationFee: string;
}

export interface CSTActivity {
  id: string;
  title: string;
  category: "music" | "reminiscence" | "sensory" | "social";
  categoryLabel: string;
  iconEmoji: string;
  dayLabel: string;
  timeLabel: string;
  venue: string;
  distanceKm: string;
  objective: string;
  benefits: string[];
  coordinatorName: string;
  phone: string;
  isRsvpd?: boolean;
}

export interface NearbyServiceItem {
  id: string;
  title: string;
  provider: string;
  category: string;
  distanceKm: string;
  price: string;
  rating: number;
  phone: string;
  iconName: string;
  highlight: string;
}

export interface BookedAppointment {
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

// ── Mock Data: Doctor Facilities ──────────────────────────────────────────────
const NEARBY_DOCTORS: DoctorFacility[] = [
  {
    id: "doc-1",
    name: "Dr. Mahit Sharma",
    specialty: "Geriatric Neurologist",
    clinicName: "GNRC Memory Care Clinic",
    address: "Borbheta Link Rd, Majuli Hub",
    distanceKm: "2.4 km",
    rating: 4.9,
    reviewsCount: 142,
    timings: "10:00 AM – 04:00 PM",
    phone: "+913612260000",
    avatarEmoji: "👨‍⚕️",
    tags: ["Memory Assessment", "Donepezil Titration", "Brain MRI"],
    nextAvailable: "Today at 02:30 PM",
    consultationFee: "₹450",
  },
  {
    id: "doc-2",
    name: "Dr. Preeti Hazarika",
    specialty: "Senior Cognitive Physician",
    clinicName: "Majuli Sub-Divisional Hospital OPD",
    address: "Civil Hospital Complex, Garmur",
    distanceKm: "1.1 km",
    rating: 4.8,
    reviewsCount: 98,
    timings: "09:30 AM – 02:00 PM",
    phone: "+919864077881",
    avatarEmoji: "👩‍⚕️",
    tags: ["MCI Clinic", "Geriatric Medicine", "BP & Vitals"],
    nextAvailable: "Tomorrow 10:00 AM",
    consultationFee: "Govt OPD (Free)",
  },
  {
    id: "doc-3",
    name: "Dr. Arindam Borah",
    specialty: "Psychogeriatrician & Sleep Specialist",
    clinicName: "Brahmaputra Mind Care Center",
    address: "Kamalabari Main Road",
    distanceKm: "3.8 km",
    rating: 4.7,
    reviewsCount: 76,
    timings: "03:00 PM – 07:00 PM",
    phone: "+919435012399",
    avatarEmoji: "👨‍⚕️",
    tags: ["Sundowning Care", "Sleep Hygiene", "Behavioral Calm"],
    nextAvailable: "Thursday 04:00 PM",
    consultationFee: "₹400",
  },
  {
    id: "doc-4",
    name: "Dr. Nilakshi Sarma",
    specialty: "Neuro-Rehabilitation & Speech",
    clinicName: "Majuli Senior Rehab Center",
    address: "Near Kamalabari Satra",
    distanceKm: "2.0 km",
    rating: 4.9,
    reviewsCount: 64,
    timings: "11:00 AM – 05:00 PM",
    phone: "+919854033221",
    avatarEmoji: "👩‍⚕️",
    tags: ["Cognitive Stimulation", "Speech Therapy", "Swallowing Safety"],
    nextAvailable: "Friday 11:30 AM",
    consultationFee: "₹350",
  },
];

// ── Mock Data: CST (Cognitive Stimulation Therapy) Offline Activities ─────────
const CST_ACTIVITIES: CSTActivity[] = [
  {
    id: "cst-1",
    title: "Majuli Sangeet & Borgeet Reminiscence Circle",
    category: "music",
    categoryLabel: "Music Recall",
    iconEmoji: "🎵",
    dayLabel: "Tomorrow",
    timeLabel: "10:30 AM – 11:45 AM",
    venue: "Kamalabari Satra Community Hall",
    distanceKm: "1.2 km away",
    objective:
      "Acoustic Borgeet devotional singing & khol rhythm to stimulate auditory pathways and induce calm.",
    benefits: ["🎵 Auditory Recall", "🌿 Anxiety Reduction", "🤝 Peer Connection"],
    coordinatorName: "Pranab Mahanta",
    phone: "+919864011223",
  },
  {
    id: "cst-2",
    title: "Namghar Heritage & Folklore Story Gathering",
    category: "reminiscence",
    categoryLabel: "Heritage Recall",
    iconEmoji: "📖",
    dayLabel: "This Saturday",
    timeLabel: "04:00 PM – 05:15 PM",
    venue: "Dakhinpat Satra Courtyard",
    distanceKm: "1.8 km away",
    objective:
      "Structured reminiscence prompts with vintage Majuli crafts, photographs & folklore storytelling.",
    benefits: ["🧠 Long-term Memory", "🗣️ Expressive Speech", "🌸 Joy & Nostalgia"],
    coordinatorName: "Geetanjali Das (ASHA Senior)",
    phone: "+919435088771",
  },
  {
    id: "cst-3",
    title: "Brahmaputra Sensory Herbal Garden Walk",
    category: "sensory",
    categoryLabel: "Sensory Engagement",
    iconEmoji: "🌿",
    dayLabel: "This Sunday",
    timeLabel: "08:00 AM – 09:00 AM",
    venue: "Riverfront Herbal Wellness Courtyard",
    distanceKm: "2.5 km away",
    objective:
      "Gentle tactile touch of aromatic plants (Tulsi, Neem, Mint), fresh breeze & assisted footing exercises.",
    benefits: ["🌱 Tactile Sensation", "🚶 Gentle Balance", "☀️ Morning Sun"],
    coordinatorName: "Ramen Saikia",
    phone: "+919854099884",
  },
  {
    id: "cst-4",
    title: "Smriti Memory Café & Gentle Board Games",
    category: "social",
    categoryLabel: "Memory Café",
    iconEmoji: "☕",
    dayLabel: "Next Tuesday",
    timeLabel: "11:00 AM – 12:30 PM",
    venue: "Majuli Elder Friendship Hub, Garmur",
    distanceKm: "3.0 km away",
    objective:
      "Warm Assam tea, oversized tactile wooden puzzles, and light conversational games in a calm social setting.",
    benefits: ["☕ Social Interaction", "🧩 Spatial Puzzles", "🧘 Caregiver Support"],
    coordinatorName: "Dr. Mahit Sharma Team",
    phone: "+913612260000",
  },
];

// ── Mock Data: Nearby Eldercare Services ───────────────────────────────────────
const NEARBY_SERVICES: NearbyServiceItem[] = [
  {
    id: "srv-1",
    title: "Dementia Bedside Care Attendant",
    provider: "Majuli Seva Trust",
    category: "Bedside Attendant",
    distanceKm: "1.5 km",
    price: "₹450 / shift",
    rating: 4.9,
    phone: "+919864022334",
    iconName: "shield",
    highlight: "Certified attendant trained in gentle de-escalation & mobility support",
  },
  {
    id: "srv-2",
    title: "In-Home Cognitive Physiotherapy",
    provider: "Dr. Barua Physio Care",
    category: "Physiotherapy",
    distanceKm: "2.1 km",
    price: "₹350 / visit",
    rating: 4.8,
    phone: "+919435033445",
    iconName: "activity",
    highlight: "Fall prevention, gait retraining & assisted joint flexibility",
  },
  {
    id: "srv-3",
    title: "Mobile Cognitive Diagnostic Van",
    provider: "Apollo Rural Health Unit",
    category: "Diagnostics",
    distanceKm: "3.0 km",
    price: "Govt Subsidized",
    rating: 4.9,
    phone: "+913612260000",
    iconName: "truck",
    highlight: "Doorstep blood draws, ECG, oxygen assessment & memory screening",
  },
  {
    id: "srv-4",
    title: "Wheelchair Senior Escort & Van",
    provider: "Majuli Care Mobility",
    category: "Transport",
    distanceKm: "2.8 km",
    price: "₹250 / trip",
    rating: 4.7,
    phone: "+919854066778",
    iconName: "navigation",
    highlight: "Hydraulic wheelchair ramp & safe medical clinic accompaniment",
  },
];

const STORAGE_APPOINTMENTS_KEY = "@caregiver_care_appointments_v2";

interface Props {
  onSwitchToElderly?: () => void;
}

export const CaregiverProfileScreen: React.FC<Props> = ({ onSwitchToElderly }) => {
  const router = useRouter();
  const { logout, username, setSelectedUserType } = useAuth();

  // Navigation Sub-tab
  const [activeSubTab, setActiveSubTab] = useState<CaregiverSubTab>("overview");

  // Profile and Settings
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [wanderingAlerts, setWanderingAlerts] = useState(true);
  const [vitalsAlerts, setVitalsAlerts] = useState(true);
  const [offlineSync, setOfflineSync] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Health Watch & Edge AI
  const [watchConnected, setWatchConnected] = useState(true);
  const [telemetry, setTelemetry] = useState<IoTTelemetry | null>(null);
  const [federatedStatus, setFederatedStatus] = useState<FederatedStatus | null>(null);
  const [edgeComputingEnabled, setEdgeComputingEnabled] = useState(true);
  const [federatedSyncEnabled, setFederatedSyncEnabled] = useState(true);
  const [isCalibratingEdge, setIsCalibratingEdge] = useState(false);

  // Doctor Facilities & Appointments
  const [doctorList] = useState<DoctorFacility[]>(NEARBY_DOCTORS);
  const [cstList, setCstList] = useState<CSTActivity[]>(CST_ACTIVITIES);
  const [servicesList] = useState<NearbyServiceItem[]>(NEARBY_SERVICES);
  const [bookedAppointments, setBookedAppointments] = useState<BookedAppointment[]>([]);

  // Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDoctorForBooking, setSelectedDoctorForBooking] = useState<DoctorFacility | null>(null);
  const [bookingDate, setBookingDate] = useState("Tomorrow, 10:00 AM");
  const [bookingSlot, setBookingSlot] = useState("10:00 AM");
  const [bookingConsultType, setBookingConsultType] = useState<"clinic" | "home">("clinic");
  const [bookingReason, setBookingReason] = useState("Routine Cognitive Review & Medication Checkup");

  // Filter Chips for Lists
  const [doctorFilter, setDoctorFilter] = useState<"all" | "neuro" | "mci" | "rehab">("all");
  const [cstFilter, setCstFilter] = useState<"all" | "music" | "reminiscence" | "sensory" | "social">("all");

  // Existing Modals
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [showArticlesModal, setShowArticlesModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  // Load Initial Data
  const loadData = useCallback(async () => {
    try {
      const p = await caregiverStorage.getPatientProfile();
      setProfile(p);

      // Load appointments
      const rawApt = await AsyncStorage.getItem(STORAGE_APPOINTMENTS_KEY);
      if (rawApt) {
        const parsed = JSON.parse(rawApt);
        if (Array.isArray(parsed)) {
          setBookedAppointments(parsed);
        }
      }
    } catch (e) {
      console.warn("Failed to load caregiver data:", e);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    loadData();
    const unsub = iotSensorService.subscribe((tel) => {
      setTelemetry(tel);
    });
    federatedService.getStatus().then(setFederatedStatus).catch(() => {});
    return () => {
      unsub();
    };
  }, [loadData]);

  const handleCallContact = (phone: string) => {
    const cleanPhone = (phone || "+919876543210").replace(/[\s\-()]/g, "");
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert("Official Phone Line", `Please dial: ${phone}`);
    });
  };

  const handleOpenBookingModal = (doc: DoctorFacility) => {
    setSelectedDoctorForBooking(doc);
    setBookingSlot(doc.nextAvailable.includes("PM") ? "02:30 PM" : "10:00 AM");
    setShowBookingModal(true);
  };

  const handleConfirmAppointment = async () => {
    if (!selectedDoctorForBooking) return;

    const newApt: BookedAppointment = {
      id: `apt-${Date.now()}`,
      doctor: selectedDoctorForBooking.name,
      specialty: selectedDoctorForBooking.specialty,
      hospital: selectedDoctorForBooking.clinicName,
      date: bookingDate.split(",")[0].trim(),
      time: bookingSlot,
      reason: bookingReason,
      notes: `Mode: ${bookingConsultType === "clinic" ? "Clinic Consultation" : "In-Home Visit"}. Fee: ${selectedDoctorForBooking.consultationFee}`,
      reminderEnabled: true,
      isPast: false,
    };

    try {
      const updated = [newApt, ...bookedAppointments];
      setBookedAppointments(updated);
      await AsyncStorage.setItem(STORAGE_APPOINTMENTS_KEY, JSON.stringify(updated));

      Alert.alert(
        "✅ Appointment Confirmed!",
        `Visit scheduled with ${selectedDoctorForBooking.name} at ${selectedDoctorForBooking.clinicName} on ${bookingDate} (${bookingSlot}). A confirmation SMS has been dispatched.`
      );
      setShowBookingModal(false);
    } catch (e) {
      Alert.alert("Error", "Could not save appointment.");
    }
  };

  const handleToggleCstRsvp = (activity: CSTActivity) => {
    const nextState = !activity.isRsvpd;
    setCstList((prev) =>
      prev.map((item) => (item.id === activity.id ? { ...item, isRsvpd: nextState } : item))
    );

    if (nextState) {
      Alert.alert(
        "🌿 Spot Reserved with Elder!",
        `You & ${profile?.name || "the elder"} are registered for "${activity.title}" at ${activity.venue} on ${activity.dayLabel}. The session coordinator (${activity.coordinatorName}) has been notified.`
      );
    } else {
      Alert.alert("Reservation Removed", `Your RSVP for "${activity.title}" was cancelled.`);
    }
  };

  const handleRunEdgeCalibration = async () => {
    setIsCalibratingEdge(true);
    try {
      const result = await federatedService.triggerTrainingRound();
      setFederatedStatus((prev) =>
        prev
          ? {
              ...prev,
              round: result.round_summary.round,
              recent_history: [result.round_summary, ...prev.recent_history],
            }
          : null
      );
      Alert.alert(
        "⚡ Edge Model Calibrated",
        `On-device model calibrated for Round ${result.round_summary.round} with Differential Privacy (ε=0.85).`
      );
    } catch (err) {
      Alert.alert("Edge Calibration", "Local model updated with cached parameters.");
    } finally {
      setIsCalibratingEdge(false);
    }
  };

  const handleSwitchToKiosk = async () => {
    Alert.alert(
      "Launch Senior Tablet View?",
      `Switch to the simplified, high-contrast kiosk mode with avatar assistance for ${profile?.name || "the elder"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Launch Senior View",
          onPress: async () => {
            try {
              await setSelectedUserType("patient");
              await dementiaCareStorage.setActiveViewMode("elderly");
              await AsyncStorage.setItem("ambieye_active_mode", "elderly");
              if (onSwitchToElderly) {
                onSwitchToElderly();
              } else {
                router.replace("/(patient)" as any);
              }
            } catch (err) {
              console.error("Error switching to kiosk:", err);
              router.replace("/(patient)" as any);
            }
          },
        },
      ]
    );
  };

  const handleBroadcastVillageAlert = () => {
    Alert.alert(
      "Broadcast Village Suraksha Alert?",
      `Send instant emergency SMS alert with GPS coordinates for ${profile?.name || "the elder"} to local ASHA circle & responders?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Alert Broadcast",
          style: "destructive",
          onPress: () => {
            Alert.alert("🚨 Suraksha Alert Broadcasted", "SMS dispatched to registered Majuli village circle & ASHA workers.");
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out of your MindCare account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/auth/login");
        },
      },
    ]);
  };

  // ── FILTERED DATA ──────────────────────────────────────────────────────────
  const filteredDoctors = doctorList.filter((doc) => {
    if (doctorFilter === "neuro") return doc.specialty.toLowerCase().includes("neuro");
    if (doctorFilter === "mci") return doc.specialty.toLowerCase().includes("cognitive");
    if (doctorFilter === "rehab") return doc.specialty.toLowerCase().includes("rehab") || doc.specialty.toLowerCase().includes("speech");
    return true;
  });

  const filteredCst = cstList.filter((act) => {
    if (cstFilter === "all") return true;
    return act.category === cstFilter;
  });

  // ── SUB-TAB: 1. OVERVIEW & VITALS ──────────────────────────────────────────
  const renderOverviewTab = () => (
    <View style={styles.tabContentContainer}>
      {/* Elder Compact Snapshot Card */}
      <View style={styles.elderCard}>
        <View style={styles.elderCardTop}>
          <View style={styles.elderAvatarBox}>
            <Text style={styles.elderEmoji}>{profile?.photoEmoji || "🧓"}</Text>
          </View>
          <View style={styles.elderTexts}>
            <View style={styles.elderNameRow}>
              <Text style={styles.elderName}>{profile?.name || "Bhaben Barman"}</Text>
              <View style={styles.statusPillSafe}>
                <View style={styles.greenDot} />
                <Text style={styles.statusPillSafeText}>At Home</Text>
              </View>
            </View>
            <Text style={styles.elderSub}>
              Age {profile?.age || 72} · Blood Group B+ · {profile?.medical?.primaryDoctor?.name || "Dr. Mahit Sharma"}
            </Text>
            <Text style={styles.elderDiagnosis}>
              🌿 {profile?.medical?.conditions?.[0] || "Mild Cognitive Impairment (Early Stage)"}
            </Text>
          </View>
        </View>

        {/* Location & Geofence Tag */}
        <View style={styles.geofenceTagRow}>
          <Feather name="map-pin" size={12} color={PastelPalette.mintPrimary} />
          <Text style={styles.geofenceTagText}>
            Safe within 150m Majuli Home Geofence · Last check-in 2 mins ago
          </Text>
        </View>

        {/* Action Row */}
        <View style={styles.elderCardDivider} />
        <View style={styles.elderCardBottom}>
          <View style={styles.elderInfoCol}>
            <Text style={styles.elderInfoLabel}>PRIMARY CAREGIVER</Text>
            <Text style={styles.elderInfoVal}>
              {profile?.caregiverName || "Anita Barman"} (Daughter)
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              style={styles.quickCallPill}
              onPress={() => handleCallContact(profile?.emergencyContacts?.[0]?.phone || "+919864012345")}
              activeOpacity={0.8}
            >
              <Feather name="phone-call" size={12} color="#FFFFFF" />
              <Text style={styles.quickCallPillText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.recordPill}
              onPress={() => setShowProfileModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.recordPillText}>Record</Text>
              <Feather name="chevron-right" size={12} color={PastelPalette.lavenderPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Emergency Quick Action Grid */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeaderTitle}>INSTANT EMERGENCY DISPATCH</Text>
        <TouchableOpacity
          style={styles.viewFullPill}
          onPress={() => setShowEmergencyModal(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.viewFullPillText}>Emergency Hub</Text>
          <Feather name="chevron-right" size={11} color={PastelPalette.lavenderPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.quickSosGrid}>
        <TouchableOpacity
          style={styles.sosCard}
          onPress={() => handleCallContact("112")}
          activeOpacity={0.85}
        >
          <View style={[styles.sosIconBox, { backgroundColor: "#FEE2E2" }]}>
            <Feather name="phone-call" size={16} color="#DC2626" />
          </View>
          <Text style={styles.sosCardTitle}>112 SOS</Text>
          <Text style={styles.sosCardSub}>Police & Rescue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sosCard}
          onPress={() => handleCallContact("108")}
          activeOpacity={0.85}
        >
          <View style={[styles.sosIconBox, { backgroundColor: "#FEF3C7" }]}>
            <MaterialCommunityIcons name="ambulance" size={18} color="#D97706" />
          </View>
          <Text style={styles.sosCardTitle}>108 Ambulance</Text>
          <Text style={styles.sosCardSub}>Medical Emergency</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sosCard}
          onPress={handleBroadcastVillageAlert}
          activeOpacity={0.85}
        >
          <View style={[styles.sosIconBox, { backgroundColor: "#FCE7F3" }]}>
            <MaterialCommunityIcons name="broadcast" size={18} color="#BE185D" />
          </View>
          <Text style={styles.sosCardTitle}>Village Alert</Text>
          <Text style={styles.sosCardSub}>Majuli ASHA Circle</Text>
        </TouchableOpacity>
      </View>

      {/* Compact Health Vitals Grid */}
      <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
        <View style={styles.sectionHeaderTitleGroup}>
          <MaterialCommunityIcons name="heart-pulse" size={15} color={PastelPalette.rosePrimary} />
          <Text style={styles.sectionHeaderTitle}>SMARTWATCH HEALTH VITALS</Text>
        </View>
        <View style={styles.liveIndicatorPill}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.liveIndicatorText}>LIVE SYNC</Text>
        </View>
      </View>

      <View style={styles.vitalsCompactRow}>
        <View style={[styles.vitalMiniCard, { backgroundColor: "#FFF1F2", borderColor: "#FECDD3" }]}>
          <Text style={styles.vitalMiniEmoji}>❤️</Text>
          <Text style={styles.vitalMiniVal}>
            {watchConnected && telemetry?.heart_rate ? `${telemetry.heart_rate} bpm` : "72 bpm"}
          </Text>
          <Text style={styles.vitalMiniLabel}>Heart Rate</Text>
        </View>

        <View style={[styles.vitalMiniCard, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
          <Text style={styles.vitalMiniEmoji}>🫁</Text>
          <Text style={styles.vitalMiniVal}>
            {watchConnected && telemetry?.spo2 ? `${telemetry.spo2}%` : "98%"}
          </Text>
          <Text style={styles.vitalMiniLabel}>Blood Oxygen</Text>
        </View>

        <View style={[styles.vitalMiniCard, { backgroundColor: "#EFF6FF", borderColor: "#BAE6FD" }]}>
          <Text style={styles.vitalMiniEmoji}>👟</Text>
          <Text style={styles.vitalMiniVal}>
            {watchConnected && telemetry?.steps ? telemetry.steps.toLocaleString() : "3,420"}
          </Text>
          <Text style={styles.vitalMiniLabel}>Daily Steps</Text>
        </View>

        <View style={[styles.vitalMiniCard, { backgroundColor: "#FAF5FF", borderColor: "#E9D5FF" }]}>
          <Text style={styles.vitalMiniEmoji}>💤</Text>
          <Text style={styles.vitalMiniVal}>
            {watchConnected && telemetry?.sleep_duration_hours ? `${telemetry.sleep_duration_hours}h` : "7.4h"}
          </Text>
          <Text style={styles.vitalMiniLabel}>Sleep</Text>
        </View>
      </View>

      {/* Senior Tablet Switcher Action */}
      <TouchableOpacity
        style={styles.kioskBannerBtn}
        onPress={handleSwitchToKiosk}
        activeOpacity={0.85}
      >
        <View style={styles.kioskIconCircle}>
          <MaterialCommunityIcons name="tablet-cellphone" size={20} color={PastelPalette.lavenderPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.kioskBannerTitle}>Launch Senior Tablet View</Text>
          <Text style={styles.kioskBannerSub}>High-contrast avatar kiosk mode for {profile?.name || "the elder"}</Text>
        </View>
        <Feather name="arrow-right" size={16} color={PastelPalette.lavenderPrimary} />
      </TouchableOpacity>
    </View>
  );

  // ── SUB-TAB: 2. DOCTOR FACILITIES & BOOKING ────────────────────────────────
  const renderDoctorsTab = () => (
    <View style={styles.tabContentContainer}>
      {/* Upcoming Booked Appointment Banner (if any) */}
      {bookedAppointments.length > 0 && (
        <View style={styles.upcomingAppointmentCard}>
          <View style={styles.upcomingHeaderRow}>
            <View style={styles.upcomingTagPill}>
              <Feather name="calendar" size={11} color="#2563EB" />
              <Text style={styles.upcomingTagText}>UPCOMING VISIT</Text>
            </View>
            <Text style={styles.upcomingDateText}>
              {bookedAppointments[0].date} · {bookedAppointments[0].time}
            </Text>
          </View>
          <Text style={styles.upcomingDoctorName}>{bookedAppointments[0].doctor}</Text>
          <Text style={styles.upcomingHospitalText}>{bookedAppointments[0].hospital}</Text>
          <Text style={styles.upcomingReasonText}>📝 {bookedAppointments[0].reason}</Text>
        </View>
      )}

      {/* Section Header & Subtitle */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeaderTitleGroup}>
          <MaterialCommunityIcons name="hospital-building" size={16} color="#2563EB" />
          <Text style={styles.sectionHeaderTitle}>NEARBY DOCTOR FACILITIES</Text>
        </View>
        <Text style={styles.sectionHeaderCount}>{filteredDoctors.length} available</Text>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChipScroll}
      >
        {[
          { key: "all", label: "All Clinics" },
          { key: "neuro", label: "Neurology" },
          { key: "mci", label: "Cognitive OPD" },
          { key: "rehab", label: "Rehab & Speech" },
        ].map((chip) => (
          <TouchableOpacity
            key={chip.key}
            style={[
              styles.filterChip,
              doctorFilter === chip.key && styles.filterChipActive,
            ]}
            onPress={() => setDoctorFilter(chip.key as any)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterChipText,
                doctorFilter === chip.key && styles.filterChipTextActive,
              ]}
            >
              {chip.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Doctor Cards */}
      {filteredDoctors.map((doc) => (
        <View key={doc.id} style={styles.doctorCard}>
          <View style={styles.docCardHeader}>
            <View style={styles.docAvatarCircle}>
              <Text style={{ fontSize: 24 }}>{doc.avatarEmoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.docNameRow}>
                <Text style={styles.docName}>{doc.name}</Text>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingText}>⭐ {doc.rating}</Text>
                </View>
              </View>
              <Text style={styles.docSpecialty}>{doc.specialty}</Text>
              <Text style={styles.docClinic}>{doc.clinicName}</Text>
            </View>
          </View>

          {/* Location & Next Slot Bar */}
          <View style={styles.docInfoPillsRow}>
            <View style={styles.infoPillDistance}>
              <Feather name="map-pin" size={11} color="#059669" />
              <Text style={styles.infoPillDistanceText}>{doc.distanceKm} away</Text>
            </View>
            <View style={styles.infoPillSlot}>
              <Feather name="clock" size={11} color="#2563EB" />
              <Text style={styles.infoPillSlotText}>{doc.nextAvailable}</Text>
            </View>
            <View style={styles.infoPillFee}>
              <Text style={styles.infoPillFeeText}>{doc.consultationFee}</Text>
            </View>
          </View>

          {/* Specialty Tags */}
          <View style={styles.docTagsRow}>
            {doc.tags.map((tag, idx) => (
              <View key={idx} style={styles.docTag}>
                <Text style={styles.docTagText}>{tag}</Text>
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.docActionsRow}>
            <TouchableOpacity
              style={styles.bookVisitBtn}
              onPress={() => handleOpenBookingModal(doc)}
              activeOpacity={0.85}
            >
              <Feather name="calendar" size={13} color="#FFFFFF" />
              <Text style={styles.bookVisitBtnText}>Book Visit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.callClinicBtn}
              onPress={() => handleCallContact(doc.phone)}
              activeOpacity={0.85}
            >
              <Feather name="phone" size={13} color="#0284C7" />
              <Text style={styles.callClinicBtnText}>Call Clinic</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  // ── SUB-TAB: 3. CST OFFLINE ACTIVITIES ─────────────────────────────────────
  const renderCSTActivitiesTab = () => (
    <View style={styles.tabContentContainer}>
      {/* Intro banner */}
      <View style={styles.cstIntroCard}>
        <View style={styles.cstIntroIcon}>
          <Text style={{ fontSize: 24 }}>🌱</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cstIntroTitle}>Cognitive Stimulation Therapy (CST)</Text>
          <Text style={styles.cstIntroSub}>
            Offline community gatherings designed for elders with MCI/dementia. Boosts memory, mood, and social connection.
          </Text>
        </View>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChipScroll}
      >
        {[
          { key: "all", label: "All CST Activities" },
          { key: "music", label: "🎵 Music Recall" },
          { key: "reminiscence", label: "📖 Heritage & Story" },
          { key: "sensory", label: "🌿 Sensory Nature" },
          { key: "social", label: "☕ Memory Café" },
        ].map((chip) => (
          <TouchableOpacity
            key={chip.key}
            style={[
              styles.filterChip,
              cstFilter === chip.key && styles.filterChipActive,
            ]}
            onPress={() => setCstFilter(chip.key as any)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterChipText,
                cstFilter === chip.key && styles.filterChipTextActive,
              ]}
            >
              {chip.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Activities List */}
      {filteredCst.map((activity) => (
        <View key={activity.id} style={styles.cstCard}>
          {/* Card Header */}
          <View style={styles.cstCardTop}>
            <View style={styles.cstIconCircle}>
              <Text style={{ fontSize: 22 }}>{activity.iconEmoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.cstCategoryRow}>
                <View style={styles.cstCategoryPill}>
                  <Text style={styles.cstCategoryText}>{activity.categoryLabel}</Text>
                </View>
                <View style={styles.cstDistancePill}>
                  <Feather name="map-pin" size={10} color="#059669" />
                  <Text style={styles.cstDistanceText}>{activity.distanceKm}</Text>
                </View>
              </View>
              <Text style={styles.cstTitle}>{activity.title}</Text>
            </View>
          </View>

          {/* Time & Venue Info */}
          <View style={styles.cstTimeVenueBox}>
            <View style={styles.cstInfoLine}>
              <Feather name="calendar" size={12} color="#4F46E5" />
              <Text style={styles.cstInfoLineText}>
                {activity.dayLabel} · {activity.timeLabel}
              </Text>
            </View>
            <View style={styles.cstInfoLine}>
              <Feather name="navigation" size={12} color="#64748B" />
              <Text style={styles.cstInfoLineText} numberOfLines={1}>
                {activity.venue}
              </Text>
            </View>
          </View>

          {/* Objective Summary */}
          <Text style={styles.cstObjectiveText}>{activity.objective}</Text>

          {/* Benefit Badges */}
          <View style={styles.cstBenefitsRow}>
            {activity.benefits.map((b, idx) => (
              <View key={idx} style={styles.cstBenefitBadge}>
                <Text style={styles.cstBenefitBadgeText}>{b}</Text>
              </View>
            ))}
          </View>

          {/* Action Row */}
          <View style={styles.cstActionRow}>
            <TouchableOpacity
              style={[
                styles.cstRsvpBtn,
                activity.isRsvpd && styles.cstRsvpBtnActive,
              ]}
              onPress={() => handleToggleCstRsvp(activity)}
              activeOpacity={0.85}
            >
              <Feather
                name={activity.isRsvpd ? "check-circle" : "user-plus"}
                size={13}
                color={activity.isRsvpd ? "#059669" : "#FFFFFF"}
              />
              <Text
                style={[
                  styles.cstRsvpBtnText,
                  activity.isRsvpd && styles.cstRsvpBtnTextActive,
                ]}
              >
                {activity.isRsvpd ? "Attending with Elder ✓" : "RSVP / Join Activity"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cstCallBtn}
              onPress={() => handleCallContact(activity.phone)}
              activeOpacity={0.85}
            >
              <Feather name="phone" size={13} color="#059669" />
              <Text style={styles.cstCallBtnText}>Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  // ── SUB-TAB: 4. NEARBY ELDERCARE SERVICES ──────────────────────────────────
  const renderServicesTab = () => (
    <View style={styles.tabContentContainer}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeaderTitleGroup}>
          <MaterialCommunityIcons name="hand-heart" size={16} color={PastelPalette.rosePrimary} />
          <Text style={styles.sectionHeaderTitle}>VERIFIED SERVICES NEARBY</Text>
        </View>
        <TouchableOpacity
          style={styles.viewFullPill}
          onPress={() => setShowServicesModal(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.viewFullPillText}>Services Catalog</Text>
          <Feather name="chevron-right" size={11} color={PastelPalette.lavenderPrimary} />
        </TouchableOpacity>
      </View>

      {servicesList.map((srv) => (
        <View key={srv.id} style={styles.serviceCard}>
          <View style={styles.serviceCardTop}>
            <View style={styles.serviceIconCircle}>
              <Feather name={srv.iconName as any} size={20} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.serviceTitleRow}>
                <Text style={styles.serviceTitle}>{srv.title}</Text>
                <View style={styles.verifiedBadge}>
                  <Feather name="check-circle" size={10} color="#059669" />
                  <Text style={styles.verifiedBadgeText}>VERIFIED</Text>
                </View>
              </View>
              <Text style={styles.serviceProvider}>Provided by {srv.provider}</Text>
            </View>
          </View>

          <Text style={styles.serviceHighlight}>{srv.highlight}</Text>

          {/* Pricing & Distance */}
          <View style={styles.serviceMetaRow}>
            <View style={styles.servicePricePill}>
              <Text style={styles.servicePriceText}>{srv.price}</Text>
            </View>
            <View style={styles.serviceDistancePill}>
              <Feather name="map-pin" size={11} color="#64748B" />
              <Text style={styles.serviceDistanceText}>{srv.distanceKm} away</Text>
            </View>
            <View style={styles.serviceRatingPill}>
              <Text style={styles.serviceRatingText}>⭐ {srv.rating}</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.serviceActionsRow}>
            <TouchableOpacity
              style={styles.requestServiceBtn}
              onPress={() => {
                Alert.alert(
                  `Request ${srv.title}?`,
                  `${srv.provider} coordinator will contact you directly within 30 minutes to confirm schedule and safety guidelines for ${profile?.name || "the elder"}.`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Confirm Request",
                      onPress: () => {
                        Alert.alert("Request Dispatched", `${srv.provider} has received your care request.`);
                      },
                    },
                  ]
                );
              }}
              activeOpacity={0.85}
            >
              <Feather name="send" size={13} color="#FFFFFF" />
              <Text style={styles.requestServiceBtnText}>Request Service</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.callServiceBtn}
              onPress={() => handleCallContact(srv.phone)}
              activeOpacity={0.85}
            >
              <Feather name="phone" size={13} color="#7C3AED" />
              <Text style={styles.callServiceBtnText}>Call Line</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {/* Clinical Playbooks Shortcut */}
      <TouchableOpacity
        style={styles.playbooksBanner}
        onPress={() => setShowArticlesModal(true)}
        activeOpacity={0.85}
      >
        <View style={styles.playbooksIconCircle}>
          <Text style={{ fontSize: 20 }}>📖</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.playbooksTitle}>Caregiver Clinical Playbooks</Text>
          <Text style={styles.playbooksSub}>
            Evidence-based de-escalation guides for sundowning, medication resistance & dusk calm.
          </Text>
        </View>
        <Feather name="chevron-right" size={16} color="#64748B" />
      </TouchableOpacity>
    </View>
  );

  // ── SUB-TAB: 5. SAFETY, EDGE AI & SETTINGS ─────────────────────────────────
  const renderSafetySettingsTab = () => (
    <View style={styles.tabContentContainer}>
      {/* Geofence & Alert Toggles Card */}
      <View style={styles.settingsSectionCard}>
        <View style={styles.settingSectionHeader}>
          <Feather name="shield" size={16} color="#059669" />
          <Text style={styles.settingSectionTitle}>Safe-Zone & Alert Configuration</Text>
        </View>

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Wandering Geofence Siren</Text>
            <Text style={styles.toggleSub}>Instant SMS & siren if elder exits 150m perimeter</Text>
          </View>
          <Switch
            value={wanderingAlerts}
            onValueChange={setWanderingAlerts}
            trackColor={{ false: "#E2E8F0", true: "#A7F3D0" }}
            thumbColor={wanderingAlerts ? "#059669" : "#94A3B8"}
          />
        </View>

        <View style={styles.settingDivider} />

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Medication Delay Alerts</Text>
            <Text style={styles.toggleSub}>Alert if morning Donepezil is delayed &gt; 30 mins</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: "#E2E8F0", true: "#A7F3D0" }}
            thumbColor={notificationsEnabled ? "#059669" : "#94A3B8"}
          />
        </View>

        <View style={styles.settingDivider} />

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>IoT Vitals & Fall Detection</Text>
            <Text style={styles.toggleSub}>Alert if SpO2 &lt; 92% or sudden impact occurs</Text>
          </View>
          <Switch
            value={vitalsAlerts}
            onValueChange={setVitalsAlerts}
            trackColor={{ false: "#E2E8F0", true: "#A7F3D0" }}
            thumbColor={vitalsAlerts ? "#059669" : "#94A3B8"}
          />
        </View>
      </View>

      {/* Edge Computing & Privacy Card */}
      <View style={[styles.settingsSectionCard, { marginTop: 14 }]}>
        <View style={styles.settingSectionHeader}>
          <MaterialCommunityIcons name="chip" size={17} color="#7C3AED" />
          <Text style={styles.settingSectionTitle}>Edge AI & Differential Privacy</Text>
          <View style={styles.privacyShieldBadge}>
            <Feather name="lock" size={10} color="#059669" />
            <Text style={styles.privacyShieldText}>Zero Cloud Video</Text>
          </View>
        </View>

        <View style={styles.edgeMetricsRow}>
          <View style={styles.edgeMetricPill}>
            <Text style={styles.edgeMetricVal}>18 ms</Text>
            <Text style={styles.edgeMetricName}>Inference Latency</Text>
          </View>
          <View style={styles.edgeMetricPill}>
            <Text style={styles.edgeMetricVal}>ε = 0.85</Text>
            <Text style={styles.edgeMetricName}>Diff. Privacy</Text>
          </View>
          <View style={styles.edgeMetricPill}>
            <Text style={styles.edgeMetricVal}>Round {federatedStatus?.round || 4}</Text>
            <Text style={styles.edgeMetricName}>Federated AI</Text>
          </View>
        </View>

        <View style={styles.settingDivider} />

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Strict On-Device AI Mode</Text>
            <Text style={styles.toggleSub}>Keep all gaze vectors & voice processing on local device</Text>
          </View>
          <Switch
            value={edgeComputingEnabled}
            onValueChange={setEdgeComputingEnabled}
            trackColor={{ false: "#E2E8F0", true: "#DDD6FE" }}
            thumbColor={edgeComputingEnabled ? "#7C3AED" : "#94A3B8"}
          />
        </View>

        <TouchableOpacity
          style={styles.calibrateEdgeBtn}
          onPress={handleRunEdgeCalibration}
          activeOpacity={0.85}
          disabled={isCalibratingEdge}
        >
          <MaterialCommunityIcons name="flash-outline" size={16} color="#FFFFFF" />
          <Text style={styles.calibrateEdgeBtnText}>
            {isCalibratingEdge ? "Calibrating Model..." : "Run Edge Model Calibration"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        style={styles.caregiverLogoutBtn}
        onPress={handleLogout}
        activeOpacity={0.85}
      >
        <Feather name="log-out" size={16} color="#DC2626" />
        <Text style={styles.caregiverLogoutBtnText}>Log Out of MindCare Account</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.screenWrapper}>
      <View style={styles.ambientAuraTop} pointerEvents="none" />
      <View style={styles.ambientAuraBottom} pointerEvents="none" />

      {/* ── TOP HEADER ──────────────────────────────────────────────── */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderLeft}>
          <View style={styles.headerAvatarCircle}>
            <Text style={{ fontSize: 22 }}>👩‍👧</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.topHeaderTitle}>Caregiver Hub</Text>
            <Text style={styles.topHeaderSub}>
              {username ? `Care Coordinator: ${username}` : "Primary Care Coordinator"} · Majuli Circle
            </Text>
          </View>
        </View>
        <View style={styles.radarStatusPill}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.radarStatusText}>Safe Zone Active</Text>
        </View>
      </View>

      {/* ── SUB-TAB SEGMENTED CONTROLLER ───────────────────────────── */}
      <View style={styles.subTabContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subTabScroll}
        >
          {[
            { key: "overview", label: "Overview", icon: "user" },
            { key: "doctors", label: "Doctors & Booking", icon: "plus-circle" },
            { key: "cst", label: "CST Activities", icon: "sun" },
            { key: "services", label: "Services Nearby", icon: "heart" },
            { key: "safety", label: "Safety & AI", icon: "shield" },
          ].map((tab) => {
            const isActive = activeSubTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.subTabBtn, isActive && styles.subTabBtnActive]}
                onPress={() => setActiveSubTab(tab.key as CaregiverSubTab)}
                activeOpacity={0.85}
              >
                <Feather
                  name={tab.icon as any}
                  size={12}
                  color={isActive ? "#FFFFFF" : "#64748B"}
                />
                <Text style={[styles.subTabBtnText, isActive && styles.subTabBtnTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── MAIN SCROLL CONTENT ─────────────────────────────────────── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PastelPalette.lavenderPrimary, PastelPalette.rosePrimary]}
            tintColor={PastelPalette.rosePrimary}
          />
        }
      >
        {activeSubTab === "overview" && renderOverviewTab()}
        {activeSubTab === "doctors" && renderDoctorsTab()}
        {activeSubTab === "cst" && renderCSTActivitiesTab()}
        {activeSubTab === "services" && renderServicesTab()}
        {activeSubTab === "safety" && renderSafetySettingsTab()}
      </ScrollView>

      {/* ── APPOINTMENT BOOKING MODAL ───────────────────────────────── */}
      <Modal
        visible={showBookingModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBookingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bookingSheetContainer}>
            <View style={styles.bookingSheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bookingSheetTitle}>Book Doctor Appointment</Text>
                <Text style={styles.bookingSheetSub}>
                  {selectedDoctorForBooking?.name} · {selectedDoctorForBooking?.clinicName}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowBookingModal(false)}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Doctor Details Bar */}
              <View style={styles.modalDocDetails}>
                <Text style={{ fontSize: 24 }}>{selectedDoctorForBooking?.avatarEmoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalDocName}>{selectedDoctorForBooking?.name}</Text>
                  <Text style={styles.modalDocSpecialty}>
                    {selectedDoctorForBooking?.specialty} · 📍 {selectedDoctorForBooking?.distanceKm} away
                  </Text>
                  <Text style={styles.modalDocFee}>
                    Fee: {selectedDoctorForBooking?.consultationFee}
                  </Text>
                </View>
              </View>

              {/* Select Date */}
              <Text style={styles.modalFieldLabel}>SELECT DATE</Text>
              <View style={styles.modalPillsRow}>
                {["Today", "Tomorrow", "Saturday, 26 Sep", "Monday, 28 Sep"].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.modalPill,
                      bookingDate.startsWith(d.split(",")[0]) && styles.modalPillActive,
                    ]}
                    onPress={() => setBookingDate(d)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.modalPillText,
                        bookingDate.startsWith(d.split(",")[0]) && styles.modalPillTextActive,
                      ]}
                    >
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Select Time Slot */}
              <Text style={styles.modalFieldLabel}>AVAILABLE TIME SLOT</Text>
              <View style={styles.modalPillsRow}>
                {["10:00 AM", "11:30 AM", "02:30 PM", "04:30 PM"].map((slot) => (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      styles.modalPill,
                      bookingSlot === slot && styles.modalPillActive,
                    ]}
                    onPress={() => setBookingSlot(slot)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.modalPillText,
                        bookingSlot === slot && styles.modalPillTextActive,
                      ]}
                    >
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Consultation Mode */}
              <Text style={styles.modalFieldLabel}>CONSULTATION MODE</Text>
              <View style={styles.modalModeRow}>
                <TouchableOpacity
                  style={[
                    styles.modalModeBtn,
                    bookingConsultType === "clinic" && styles.modalModeBtnActive,
                  ]}
                  onPress={() => setBookingConsultType("clinic")}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name="hospital-building"
                    size={18}
                    color={bookingConsultType === "clinic" ? "#2563EB" : "#64748B"}
                  />
                  <Text
                    style={[
                      styles.modalModeText,
                      bookingConsultType === "clinic" && styles.modalModeTextActive,
                    ]}
                  >
                    Clinic Visit
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalModeBtn,
                    bookingConsultType === "home" && styles.modalModeBtnActive,
                  ]}
                  onPress={() => setBookingConsultType("home")}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name="home-heart"
                    size={18}
                    color={bookingConsultType === "home" ? "#2563EB" : "#64748B"}
                  />
                  <Text
                    style={[
                      styles.modalModeText,
                      bookingConsultType === "home" && styles.modalModeTextActive,
                    ]}
                  >
                    In-Home Visit
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Reason for Visit */}
              <Text style={styles.modalFieldLabel}>REASON FOR VISIT / CLINICAL NOTES</Text>
              <TextInput
                style={styles.modalTextInput}
                value={bookingReason}
                onChangeText={setBookingReason}
                placeholder="e.g. Cognitive status review, sleep restlessness"
                placeholderTextColor="#94A3B8"
              />

              {/* Confirm Button */}
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmAppointment}
                activeOpacity={0.85}
              >
                <Feather name="check" size={16} color="#FFFFFF" />
                <Text style={styles.modalConfirmBtnText}>Confirm & Book Visit</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODALS ─────────────────────────────────────────────────── */}
      {profile && (
        <CaregiverPatientProfileModal
          visible={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          profile={profile}
        />
      )}

      <CaregiverServicesModal
        visible={showServicesModal}
        onClose={() => setShowServicesModal(false)}
        elderName={profile?.name || "Bhaben Barman"}
      />

      <CaregiverArticlesModal
        visible={showArticlesModal}
        onClose={() => setShowArticlesModal(false)}
      />

      {profile && (
        <CaregiverEmergencyModal
          visible={showEmergencyModal}
          onClose={() => setShowEmergencyModal(false)}
          profile={profile}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
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
    top: 540,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: AestheticTheme.ambientMint,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  topHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PastelPalette.pinkSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: PastelPalette.pinkBorder,
  },
  topHeaderTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E1B4B",
    letterSpacing: -0.3,
  },
  topHeaderSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  radarStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: PastelPalette.mintSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PastelPalette.mintBorder,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  radarStatusText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: PastelPalette.mintPrimary,
  },

  // ── SUB-TAB SEGMENTED STRIP ───────────────────────────────────────
  subTabContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingVertical: 6,
  },
  subTabScroll: {
    paddingHorizontal: 16,
    gap: 6,
  },
  subTabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  subTabBtnActive: {
    backgroundColor: CalmPalette.primary,
  },
  subTabBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#64748B",
  },
  subTabBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  // ── SCROLLVIEW & CONTENT ──────────────────────────────────────────
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  tabContentContainer: {
    gap: 12,
  },

  // ── SECTION HEADER ───────────────────────────────────────────────
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sectionHeaderTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionHeaderTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: "#475569",
  },
  sectionHeaderCount: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  viewFullPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: PastelPalette.lavenderSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  viewFullPillText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: PastelPalette.lavenderPrimary,
  },

  // ── ELDER CARD ───────────────────────────────────────────────────
  elderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  elderCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  elderAvatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  elderEmoji: {
    fontSize: 26,
  },
  elderTexts: {
    flex: 1,
  },
  elderNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  elderName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
  },
  statusPillSafe: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  greenDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#10B981",
  },
  statusPillSafeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  elderSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  elderDiagnosis: {
    fontSize: 11,
    fontWeight: "600",
    color: "#059669",
    marginTop: 2,
  },
  geofenceTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  geofenceTagText: {
    fontSize: 10.5,
    color: "#15803D",
    fontWeight: "600",
    flex: 1,
  },
  elderCardDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 10,
  },
  elderCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  elderInfoCol: {
    flex: 1,
  },
  elderInfoLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.4,
  },
  elderInfoVal: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#334155",
    marginTop: 1,
  },
  quickCallPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DC2626",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
  },
  quickCallPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  recordPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: PastelPalette.lavenderSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  recordPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: PastelPalette.lavenderPrimary,
  },

  // ── QUICK SOS GRID ───────────────────────────────────────────────
  quickSosGrid: {
    flexDirection: "row",
    gap: 8,
  },
  sosCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sosIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  sosCardTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#1E293B",
  },
  sosCardSub: {
    fontSize: 9.5,
    color: "#64748B",
    marginTop: 1,
    textAlign: "center",
  },

  // ── COMPACT VITALS ───────────────────────────────────────────────
  liveIndicatorPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveIndicatorText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#059669",
  },
  vitalsCompactRow: {
    flexDirection: "row",
    gap: 8,
  },
  vitalMiniCard: {
    flex: 1,
    borderRadius: 12,
    padding: 9,
    alignItems: "center",
    borderWidth: 1,
  },
  vitalMiniEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  vitalMiniVal: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E293B",
  },
  vitalMiniLabel: {
    fontSize: 9,
    color: "#64748B",
    marginTop: 1,
    fontWeight: "600",
  },

  // ── KIOSK BANNER ─────────────────────────────────────────────────
  kioskBannerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAF5FF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    gap: 10,
  },
  kioskIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  kioskBannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#581C87",
  },
  kioskBannerSub: {
    fontSize: 11,
    color: "#7E22CE",
    marginTop: 1,
  },

  // ── FILTER CHIPS ─────────────────────────────────────────────────
  filterChipScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: {
    backgroundColor: CalmPalette.primary,
    borderColor: CalmPalette.primary,
  },
  filterChipText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  // ── UPCOMING APPOINTMENT CARD ────────────────────────────────────
  upcomingAppointmentCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginBottom: 4,
  },
  upcomingHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  upcomingTagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  upcomingTagText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#1D4ED8",
  },
  upcomingDateText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  upcomingDoctorName: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#1E3A8A",
    marginTop: 6,
  },
  upcomingHospitalText: {
    fontSize: 11.5,
    color: "#3B82F6",
    marginTop: 1,
  },
  upcomingReasonText: {
    fontSize: 11,
    color: "#475569",
    marginTop: 4,
  },

  // ── DOCTOR CARD ──────────────────────────────────────────────────
  doctorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 8,
  },
  docCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  docAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  docNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  docName: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#1E293B",
  },
  ratingBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#B45309",
  },
  docSpecialty: {
    fontSize: 11.5,
    color: "#2563EB",
    fontWeight: "700",
    marginTop: 1,
  },
  docClinic: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  docInfoPillsRow: {
    flexDirection: "row",
    gap: 6,
  },
  infoPillDistance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  infoPillDistanceText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#059669",
  },
  infoPillSlot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    flex: 1,
  },
  infoPillSlotText: {
    fontSize: 10.5,
    color: "#2563EB",
    fontWeight: "600",
  },
  infoPillFee: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  infoPillFeeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#475569",
  },
  docTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  docTag: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  docTagText: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "600",
  },
  docActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  bookVisitBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: CalmPalette.primary,
    paddingVertical: 8,
    borderRadius: 10,
  },
  bookVisitBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  callClinicBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  callClinicBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0284C7",
  },

  // ── CST OFFLINE ACTIVITIES ────────────────────────────────────────
  cstIntroCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  cstIntroIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  cstIntroTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#166534",
  },
  cstIntroSub: {
    fontSize: 11,
    color: "#15803D",
    marginTop: 1,
  },
  cstCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 8,
  },
  cstCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  cstIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  cstCategoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cstCategoryPill: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cstCategoryText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4F46E5",
  },
  cstDistancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cstDistanceText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  cstTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 2,
  },
  cstTimeVenueBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 8,
    gap: 4,
  },
  cstInfoLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cstInfoLineText: {
    fontSize: 11,
    color: "#334155",
    fontWeight: "600",
    flex: 1,
  },
  cstObjectiveText: {
    fontSize: 11.5,
    color: "#475569",
    lineHeight: 16,
  },
  cstBenefitsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  cstBenefitBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cstBenefitBadgeText: {
    fontSize: 10,
    color: "#334155",
    fontWeight: "600",
  },
  cstActionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  cstRsvpBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#059669",
    paddingVertical: 8,
    borderRadius: 10,
  },
  cstRsvpBtnActive: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  cstRsvpBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  cstRsvpBtnTextActive: {
    color: "#059669",
  },
  cstCallBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  cstCallBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },

  // ── NEARBY SERVICES ──────────────────────────────────────────────
  serviceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 8,
  },
  serviceCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  serviceIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FAF5FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  serviceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#059669",
  },
  serviceProvider: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  serviceHighlight: {
    fontSize: 11.5,
    color: "#475569",
    lineHeight: 16,
  },
  serviceMetaRow: {
    flexDirection: "row",
    gap: 6,
  },
  servicePricePill: {
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  servicePriceText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#7E22CE",
  },
  serviceDistancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  serviceDistanceText: {
    fontSize: 10.5,
    color: "#475569",
    fontWeight: "600",
  },
  serviceRatingPill: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  serviceRatingText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#B45309",
  },
  serviceActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  requestServiceBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#7C3AED",
    paddingVertical: 8,
    borderRadius: 10,
  },
  requestServiceBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  callServiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#FAF5FF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  callServiceBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7C3AED",
  },
  playbooksBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 4,
  },
  playbooksIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  playbooksTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
  },
  playbooksSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },

  // ── SAFETY & SETTINGS ────────────────────────────────────────────
  settingsSectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  settingSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  settingSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
    flex: 1,
  },
  privacyShieldBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  privacyShieldText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#059669",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  toggleTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#1E293B",
  },
  toggleSub: {
    fontSize: 10.5,
    color: "#64748B",
    marginTop: 1,
  },
  settingDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
  },
  edgeMetricsRow: {
    flexDirection: "row",
    gap: 8,
  },
  edgeMetricPill: {
    flex: 1,
    backgroundColor: "#F5F3FF",
    borderRadius: 10,
    padding: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  edgeMetricVal: {
    fontSize: 13,
    fontWeight: "800",
    color: "#6D28D9",
  },
  edgeMetricName: {
    fontSize: 9.5,
    color: "#7C3AED",
    marginTop: 2,
    fontWeight: "600",
  },
  calibrateEdgeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#7C3AED",
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 4,
  },
  calibrateEdgeBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  caregiverLogoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FEE2E2",
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  caregiverLogoutBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#DC2626",
  },

  // ── BOOKING MODAL ────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  bookingSheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: "85%",
  },
  bookingSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  bookingSheetTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1E293B",
  },
  bookingSheetSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  modalDocDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalDocName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#1E293B",
  },
  modalDocSpecialty: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  modalDocFee: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
    marginTop: 2,
  },
  modalFieldLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 6,
  },
  modalPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  modalPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalPillActive: {
    backgroundColor: CalmPalette.primary,
    borderColor: CalmPalette.primary,
  },
  modalPillText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
  },
  modalPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  modalModeRow: {
    flexDirection: "row",
    gap: 8,
  },
  modalModeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalModeBtnActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  modalModeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  modalModeTextActive: {
    color: "#2563EB",
  },
  modalTextInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: "#1E293B",
  },
  modalConfirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: CalmPalette.primary,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 20,
  },
  modalConfirmBtnText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
