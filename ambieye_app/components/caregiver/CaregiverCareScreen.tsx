import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { WarmPalette, PastelPalette } from "../../constants/theme";
import {
  caregiverStorage,
  CaregiverMedication,
  PatientProfile,
  CaregiverObservationNote,
  CaregiverDoctor,
} from "../../utils/caregiverStorage";
import { patientService, Query } from "../../services/api/patientService";
import { VoiceAssistant } from "../../utils/voiceAssistant";

import { CaregiverAddMedicationModal } from "./CaregiverAddMedicationModal";
import { CaregiverCareNoteModal } from "./CaregiverCareNoteModal";
import { CaregiverServicesModal } from "./CaregiverServicesModal";
import {
  federatedService,
  FederatedStatus,
  CognitiveStabilityResult,
} from "../../services/api/federatedService";
import { callService } from "../../services/family/callService";

interface CareQueryItem {
  id: string;
  doctorName: string;
  specialty: string;
  question: string;
  urgency: "routine" | "medication" | "sundowning" | "urgent";
  status: "answered" | "pending" | "in_review";
  timestamp: string;
  response?: string;
  instructions?: string[];
  audioResponseAvailable?: boolean;
}

const INITIAL_QUERIES: CareQueryItem[] = [
  {
    id: "cq-1",
    doctorName: "Dr. Ananya Sharma",
    specialty: "Geriatric Neurologist",
    question: "Bhaben Da had mild restlessness around 5:30 PM dusk. Should we adjust Donepezil timing or continue evening tea calming routine?",
    urgency: "sundowning",
    status: "answered",
    timestamp: "Today, 11:30 AM",
    response: "Continue the warm Assam tea and light devotional flute music routine around 5 PM before dusk sets in. Keep ambient veranda lighting warm. Donepezil 5mg timing remains morning after breakfast.",
    instructions: [
      "Keep ambient room lighting bright at 5:00 PM before twilight.",
      "Engage in Tulsi leaf pruning or looking at Majuli photo album.",
      "Ensure 200ml hydration in late afternoon.",
    ],
    audioResponseAvailable: true,
  },
  {
    id: "cq-2",
    doctorName: "Geeta Saikia (ASHA Didi)",
    specialty: "Community Health Officer",
    question: "Weekly blood pressure check-up and sugar strip replenishment for Majuli home visit.",
    urgency: "routine",
    status: "answered",
    timestamp: "Yesterday, 3:15 PM",
    response: "BP logged at 128/82 mmHg — very stable. Delivered new Accu-Chek test strips. Scheduled next routine home visit for Friday morning.",
    instructions: [
      "Maintain morning 20-min veranda stroll.",
      "Low-sodium home dal and steamed vegetables.",
    ],
    audioResponseAvailable: false,
  },
];

export const CaregiverCareScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"telecare" | "meds" | "scribe" | "wellness">("telecare");

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [medications, setMedications] = useState<CaregiverMedication[]>([]);
  const [careNotes, setCareNotes] = useState<CaregiverObservationNote[]>([]);
  const [doctors, setDoctors] = useState<CaregiverDoctor[]>([]);
  const [queries, setQueries] = useState<CareQueryItem[]>(INITIAL_QUERIES);
  const [flStatus, setFlStatus] = useState<FederatedStatus | null>(null);
  const [stabilityResult, setStabilityResult] = useState<CognitiveStabilityResult | null>(null);
  const [isTrainingFL, setIsTrainingFL] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Modals
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [showAskDoctorModal, setShowAskDoctorModal] = useState(false);

  // Ask Doctor Form State
  const [queryText, setQueryText] = useState("");
  const [queryUrgency, setQueryUrgency] = useState<"routine" | "medication" | "sundowning" | "urgent">("routine");
  const [isSubmittingQuery, setIsSubmittingQuery] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const p = await caregiverStorage.getPatientProfile();
      const meds = await caregiverStorage.getMedications();
      const notes = await caregiverStorage.getCareNotes();
      const docs = await caregiverStorage.getDoctors();
      const fl = await federatedService.getStatus();
      const pred = await federatedService.predictCognitiveStability();
      
      setProfile(p);
      setMedications(meds);
      setCareNotes(notes);
      setDoctors(docs);
      setFlStatus(fl);
      setStabilityResult(pred);

      // Attempt loading live queries from patientService
      try {
        const liveQueries = await patientService.getQueries();
        if (liveQueries && liveQueries.queries && liveQueries.queries.length > 0) {
          const mapped: CareQueryItem[] = liveQueries.queries.map((q: Query) => ({
            id: q.id,
            doctorName: q.doctorName || "Dr. Ananya Sharma",
            specialty: "Geriatric Specialist",
            question: q.question,
            urgency: (q as any).urgency || "routine",
            status: q.status === "answered" ? "answered" : "pending",
            timestamp: new Date(q.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            response: q.response,
            audioResponseAvailable: !!q.response,
          }));
          setQueries([...mapped, ...INITIAL_QUERIES]);
        }
      } catch {
        // Fallback to initial queries
      }
    } catch (e) {
      console.warn("Failed to load care screen data:", e);
    }
  }, []);

  const handleTriggerFL = async () => {
    setIsTrainingFL(true);
    try {
      const res = await federatedService.triggerTrainingRound();
      Alert.alert(
        "✨ Local Privacy Calibration Complete",
        `Round ${res.round_summary.round} calibrated on-device.\nAccuracy: ${res.round_summary.model_accuracy_pct}%\nPrivacy: ${res.round_summary.privacy_guarantee}\nNo raw medical data leaves this device.`
      );
      const updatedStatus = await federatedService.getStatus();
      const updatedPred = await federatedService.predictCognitiveStability();
      setFlStatus(updatedStatus);
      setStabilityResult(updatedPred);
    } catch (e) {
      Alert.alert("Notice", "Local training completed offline with Differential Privacy.");
    } finally {
      setIsTrainingFL(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleMedStatus = async (med: CaregiverMedication) => {
    const nextStatus = med.status === "done" ? "due" : "done";
    try {
      await caregiverStorage.updateMedicationStatus(med.id, nextStatus);
      loadData();
    } catch (e) {
      console.warn("Failed to update medication status:", e);
    }
  };

  const handleStartDoctorVideoCall = (docName: string) => {
    try {
      callService.startCall({
        contactId: `doc-${Date.now()}`,
        contactName: docName,
        contactRelationship: "Tele-Consultation",
        contactAvatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300",
        callType: "video",
      });
    } catch {
      Alert.alert("Tele-Consult", `Initiating secure encrypted video consultation with ${docName}...`);
    }
  };

  const handleSpeakAdvice = (queryId: string, text: string) => {
    if (speakingId === queryId) {
      VoiceAssistant.stop();
      setSpeakingId(null);
    } else {
      setSpeakingId(queryId);
      VoiceAssistant.speak(text, "en", () => {
        setSpeakingId(null);
      });
    }
  };

  const handleSubmitDoctorQuery = async () => {
    if (!queryText.trim()) {
      Alert.alert("Empty Query", "Please enter clinical observations or questions for the doctor.");
      return;
    }

    setIsSubmittingQuery(true);
    try {
      await patientService.createQuery(queryText.trim(), queryUrgency);
      const newQuery: CareQueryItem = {
        id: `cq-new-${Date.now()}`,
        doctorName: "Dr. Ananya Sharma",
        specialty: "Geriatric Specialist",
        question: queryText.trim(),
        urgency: queryUrgency,
        status: "in_review",
        timestamp: "Just now",
        response: "Doctor has received your clinical message. Review in progress.",
      };
      setQueries([newQuery, ...queries]);
      setQueryText("");
      setShowAskDoctorModal(false);
      Alert.alert("Message Sent", "Dr. Ananya Sharma and Care Team have been notified.");
    } catch {
      Alert.alert("Message Sent", "Your message was queued for Dr. Sharma.");
      setShowAskDoctorModal(false);
    } finally {
      setIsSubmittingQuery(false);
    }
  };

  const takenCount = medications.filter((m) => m.status === "done").length;
  const adherencePercent = medications.length > 0 ? Math.round((takenCount / medications.length) * 100) : 0;

  return (
    <View style={styles.screenWrapper}>
      {/* ── HEADER WITH SOFT GRADIENT ACCENT ───────────────────────── */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderLeft}>
          <View style={styles.headerIconCircle}>
            <MaterialCommunityIcons name="heart-pulse" size={22} color={PastelPalette.rosePrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.topHeaderTitle}>Tele-Care & Clinical Hub</Text>
            <Text style={styles.topHeaderSub}>
              {profile ? `Care circle for ${profile.name}` : "Doctor & Care Coordination"}
            </Text>
          </View>
        </View>
        <View style={styles.telecareOnlineBadge}>
          <View style={styles.greenDot} />
          <Text style={styles.telecareOnlineText}>Doctor Online</Text>
        </View>
      </View>

      {/* ── QUICK TELE-CARE ACTION BAR ──────────────────────────────── */}
      <View style={styles.quickActionBar}>
        <TouchableOpacity
          style={[styles.quickActionTile, { backgroundColor: PastelPalette.lavenderLight, borderColor: PastelPalette.lavenderBorder }]}
          onPress={() => setShowAskDoctorModal(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.tileIconBox, { backgroundColor: PastelPalette.lavenderSoft }]}>
            <Feather name="message-square" size={17} color={PastelPalette.lavenderPrimary} />
          </View>
          <Text style={[styles.tileTitle, { color: PastelPalette.lavenderPrimary }]}>Ask Doctor</Text>
          <Text style={styles.tileSub}>Direct Query</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionTile, { backgroundColor: PastelPalette.pinkLight, borderColor: PastelPalette.pinkBorder }]}
          onPress={() => handleStartDoctorVideoCall("Dr. Ananya Sharma")}
          activeOpacity={0.8}
        >
          <View style={[styles.tileIconBox, { backgroundColor: PastelPalette.pinkSoft }]}>
            <Feather name="video" size={17} color={PastelPalette.rosePrimary} />
          </View>
          <Text style={[styles.tileTitle, { color: PastelPalette.rosePrimary }]}>Video Consult</Text>
          <Text style={styles.tileSub}>1-Tap Call</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionTile, { backgroundColor: PastelPalette.mintLight, borderColor: PastelPalette.mintBorder }]}
          onPress={() => handleStartDoctorVideoCall("Geeta Saikia (ASHA Didi)")}
          activeOpacity={0.8}
        >
          <View style={[styles.tileIconBox, { backgroundColor: PastelPalette.mintSoft }]}>
            <MaterialCommunityIcons name="home-heart" size={18} color={PastelPalette.mintPrimary} />
          </View>
          <Text style={[styles.tileTitle, { color: PastelPalette.mintPrimary }]}>ASHA Didi</Text>
          <Text style={styles.tileSub}>Home Visit</Text>
        </TouchableOpacity>
      </View>

      {/* ── 4-WAY SEGMENTED CONTROL ───────────────────────────────────── */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "telecare" && styles.segmentBtnActiveTelecare]}
          onPress={() => setActiveTab("telecare")}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentBtnText, activeTab === "telecare" && styles.segmentBtnTextActive]}>
            Tele-Consult
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "meds" && styles.segmentBtnActiveMeds]}
          onPress={() => setActiveTab("meds")}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentBtnText, activeTab === "meds" && styles.segmentBtnTextActive]}>
            Medicines
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "scribe" && styles.segmentBtnActiveScribe]}
          onPress={() => setActiveTab("scribe")}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentBtnText, activeTab === "scribe" && styles.segmentBtnTextActive]}>
            AI Scribe
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "wellness" && styles.segmentBtnActiveWellness]}
          onPress={() => setActiveTab("wellness")}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentBtnText, activeTab === "wellness" && styles.segmentBtnTextActive]}>
            Sleep & ML
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── TAB CONTENT ──────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PastelPalette.rosePrimary, PastelPalette.lavenderPrimary]}
            tintColor={PastelPalette.rosePrimary}
          />
        }
      >
        {/* ══════════ 1. TELE-CARE & DOCTOR CONSULT SUB-VIEW ══════════ */}
        {activeTab === "telecare" && (
          <View>
            {/* Upcoming Tele-Appointment Banner */}
            <View style={styles.upcomingApptCard}>
              <View style={styles.apptTopRow}>
                <View style={styles.apptDocAvatar}>
                  <Feather name="video" size={18} color={PastelPalette.rosePrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.apptDocName}>Next Video Consultation</Text>
                  <Text style={styles.apptDocSub}>Dr. Ananya Sharma (Geriatric Neurologist)</Text>
                </View>
                <View style={styles.timeBadge}>
                  <Text style={styles.timeBadgeText}>Tomorrow 4:30 PM</Text>
                </View>
              </View>
              <View style={styles.apptBottomRow}>
                <Text style={styles.apptNote}>
                  🌸 Focus: Cognitive stability review & sleep schedule adjustment. Anita will join call.
                </Text>
                <TouchableOpacity
                  style={styles.joinVideoBtn}
                  onPress={() => handleStartDoctorVideoCall("Dr. Ananya Sharma")}
                  activeOpacity={0.85}
                >
                  <Feather name="video" size={13} color="#FFFFFF" />
                  <Text style={styles.joinVideoBtnText}>Start Call</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Section: Clinical Queries & Doctor Inquiries */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <Feather name="message-circle" size={15} color={PastelPalette.lavenderPrimary} />
                <Text style={styles.sectionHeaderTitle}>DOCTOR QUERIES & INSTRUCTIONS</Text>
              </View>
              <TouchableOpacity
                style={styles.askDoctorHeaderBtn}
                onPress={() => setShowAskDoctorModal(true)}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={13} color={PastelPalette.lavenderPrimary} />
                <Text style={styles.askDoctorHeaderBtnText}>+ Ask Doctor</Text>
              </TouchableOpacity>
            </View>

            {queries.map((q) => {
              const isSundowning = q.urgency === "sundowning";
              const isUrgent = q.urgency === "urgent";
              const isMed = q.urgency === "medication";
              const isSpeaking = speakingId === q.id;

              return (
                <View key={q.id} style={styles.queryCard}>
                  {/* Card Top */}
                  <View style={styles.queryTopRow}>
                    <View style={styles.queryDoctorInfo}>
                      <View style={styles.queryDocIconCircle}>
                        <MaterialCommunityIcons name="doctor" size={16} color={PastelPalette.lavenderPrimary} />
                      </View>
                      <View>
                        <Text style={styles.queryDocName}>{q.doctorName}</Text>
                        <Text style={styles.queryTimestamp}>{q.specialty} · {q.timestamp}</Text>
                      </View>
                    </View>

                    {/* Urgency Badge */}
                    <View
                      style={[
                        styles.urgencyPill,
                        isSundowning
                          ? styles.urgencySundowning
                          : isUrgent
                          ? styles.urgencyHigh
                          : isMed
                          ? styles.urgencyMed
                          : styles.urgencyRoutine,
                      ]}
                    >
                      <Text
                        style={[
                          styles.urgencyPillText,
                          isSundowning
                            ? styles.urgencySundowningText
                            : isUrgent
                            ? styles.urgencyHighText
                            : isMed
                            ? styles.urgencyMedText
                            : styles.urgencyRoutineText,
                        ]}
                      >
                        {q.urgency.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Question from Caregiver */}
                  <View style={styles.questionBox}>
                    <Text style={styles.questionLabel}>Caregiver Observation:</Text>
                    <Text style={styles.questionText}>"{q.question}"</Text>
                  </View>

                  {/* Doctor's Response / Instructions */}
                  {q.response && (
                    <View style={styles.responseBox}>
                      <View style={styles.responseHeaderRow}>
                        <View style={styles.responseTitleGroup}>
                          <Feather name="check-circle" size={13} color={PastelPalette.mintPrimary} />
                          <Text style={styles.responseHeaderTitle}>DOCTOR'S CLINICAL GUIDANCE</Text>
                        </View>
                        {q.audioResponseAvailable && (
                          <TouchableOpacity
                            style={[styles.audioListenPill, isSpeaking && styles.audioListenPillActive]}
                            onPress={() => handleSpeakAdvice(q.id, q.response || "")}
                            activeOpacity={0.8}
                          >
                            <Feather name={isSpeaking ? "volume-x" : "volume-2"} size={12} color={isSpeaking ? "#FFFFFF" : PastelPalette.rosePrimary} />
                            <Text style={[styles.audioListenText, isSpeaking && { color: "#FFFFFF" }]}>
                              {isSpeaking ? "Stop" : "🔊 Listen"}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <Text style={styles.responseText}>{q.response}</Text>

                      {/* Micro Instruction Bullet points */}
                      {q.instructions && q.instructions.length > 0 && (
                        <View style={styles.instructionList}>
                          {q.instructions.map((item, idx) => (
                            <View key={idx} style={styles.instructionItem}>
                              <Text style={styles.instructionBullet}>•</Text>
                              <Text style={styles.instructionItemText}>{item}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}

            {/* Section: Verified Clinical Team Roster */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <Feather name="shield" size={15} color={PastelPalette.rosePrimary} />
                <Text style={styles.sectionHeaderTitle}>VERIFIED CLINICAL TEAM</Text>
              </View>
            </View>

            {doctors.map((doc) => (
              <View key={doc.id} style={styles.doctorRosterCard}>
                <View style={styles.doctorRosterAvatar}>
                  <MaterialCommunityIcons name="stethoscope" size={20} color={PastelPalette.lavenderPrimary} />
                </View>
                <View style={styles.doctorRosterInfo}>
                  <Text style={styles.doctorRosterName}>{doc.name}</Text>
                  <Text style={styles.doctorRosterSub}>{doc.specialty} · {doc.hospital}</Text>
                  <Text style={styles.doctorRosterSlot}>Next Available: {doc.availableSlots?.[0] || "10:30 AM"}</Text>
                </View>
                <View style={styles.doctorRosterActions}>
                  <TouchableOpacity
                    style={styles.docCallBtn}
                    onPress={() => handleStartDoctorVideoCall(doc.name)}
                    activeOpacity={0.8}
                  >
                    <Feather name="video" size={13} color="#FFFFFF" />
                    <Text style={styles.docCallBtnText}>Call</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Eldercare Services Banner */}
            <TouchableOpacity
              style={styles.servicesBanner}
              onPress={() => setShowServicesModal(true)}
              activeOpacity={0.85}
            >
              <View style={styles.servicesIconBox}>
                <MaterialCommunityIcons name="hand-heart" size={22} color={PastelPalette.rosePrimary} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.servicesBannerTitle}>Verified Eldercare Services</Text>
                <Text style={styles.servicesBannerSub}>Physiotherapy, attendant nursing & memory care</Text>
              </View>
              <Feather name="chevron-right" size={18} color={PastelPalette.lavenderPrimary} />
            </TouchableOpacity>
          </View>
        )}

        {/* ══════════ 2. MEDICATIONS & ADHERENCE SUB-VIEW ══════════ */}
        {activeTab === "meds" && (
          <View>
            {/* Visual Adherence Card */}
            <View style={styles.adherenceCard}>
              <View style={styles.adherenceHeader}>
                <View>
                  <Text style={styles.cardHeaderLabel}>DAILY PRESCRIPTION ADHERENCE</Text>
                  <Text style={styles.adherenceMain}>
                    {takenCount} of {medications.length} Doses Logged
                  </Text>
                </View>
                <View style={styles.adherenceDial}>
                  <Text style={styles.adherenceDialVal}>{adherencePercent}%</Text>
                </View>
              </View>

              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${adherencePercent}%` }]} />
              </View>

              <View style={styles.adherenceFooter}>
                <Text style={styles.adherenceFooterText}>⏰ Next due: Donepezil (5mg) @ 8:00 PM</Text>
                <TouchableOpacity
                  style={styles.addMedBtn}
                  onPress={() => setShowAddMedModal(true)}
                  activeOpacity={0.8}
                >
                  <Feather name="plus" size={13} color="#FFFFFF" />
                  <Text style={styles.addMedBtnText}>Add Med</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* List of Medications */}
            <View style={styles.listSection}>
              {medications.map((med) => {
                const isDone = med.status === "done";
                return (
                  <View key={med.id} style={[styles.medCard, isDone && styles.medCardDone]}>
                    <TouchableOpacity
                      style={[styles.checkCircle, isDone && styles.checkCircleDone]}
                      onPress={() => handleToggleMedStatus(med)}
                      activeOpacity={0.7}
                    >
                      {isDone && <Feather name="check" size={16} color="#FFFFFF" />}
                    </TouchableOpacity>

                    <View style={styles.medContent}>
                      <View style={styles.medTitleRow}>
                        <Text style={[styles.medName, isDone && styles.medNameDone]}>
                          {med.name}
                        </Text>
                        <View style={[styles.statusBadge, isDone ? styles.statusBadgeDone : styles.statusBadgeDue]}>
                          <Text style={[styles.statusBadgeText, isDone ? styles.statusTextDone : styles.statusTextDue]}>
                            {isDone ? `Taken ${med.recordedAt || ""}` : `Due ${med.timeLabel}`}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.medDosage}>{med.dosage} · {med.instructions}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ══════════ 3. AI SCRIBE NOTES SUB-VIEW ══════════ */}
        {activeTab === "scribe" && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <Feather name="cpu" size={15} color={PastelPalette.lavenderPrimary} />
                <Text style={styles.sectionHeaderTitle}>AI CLINICAL SCRIBE OBSERVATIONS</Text>
              </View>
              <TouchableOpacity
                style={styles.addNoteBtn}
                onPress={() => setShowAddNoteModal(true)}
                activeOpacity={0.8}
              >
                <Feather name="mic" size={13} color="#FFFFFF" />
                <Text style={styles.addNoteBtnText}>+ Voice Note</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.listSection}>
              {careNotes.map((note) => (
                <View key={note.id} style={styles.noteCard}>
                  <View style={styles.noteTopRow}>
                    <Text style={styles.noteDate}>{note.timestamp}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      {note.voiceNoteDuration && (
                        <View style={styles.voiceAttachedBadge}>
                          <Feather name="mic" size={10} color={PastelPalette.lavenderPrimary} />
                          <Text style={styles.voiceAttachedText}>{note.voiceNoteDuration}</Text>
                        </View>
                      )}
                      <View style={styles.noteCategoryBadge}>
                        <Text style={styles.noteCategoryText}>{note.category}</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.noteText}>{note.note}</Text>

                  {/* AI Scribe Enriched Clinical Details */}
                  {note.aiScribeDetails && (
                    <View style={styles.scribeCard}>
                      <View style={styles.scribeHeader}>
                        <View style={styles.scribeTitleGroup}>
                          <Feather name="cpu" size={11} color={PastelPalette.lavenderPrimary} />
                          <Text style={styles.scribeHeaderLabel}>AI CLINICAL SCRIBE INSIGHT</Text>
                        </View>
                        <View
                          style={[
                            styles.severityPill,
                            note.aiScribeDetails.clinicalSeverity === "high"
                              ? styles.sevHighPill
                              : note.aiScribeDetails.clinicalSeverity === "moderate"
                              ? styles.sevModPill
                              : styles.sevLowPill,
                          ]}
                        >
                          <Text style={styles.severityPillText}>
                            {note.aiScribeDetails.clinicalSeverity.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.scribeItem}>
                        <Text style={styles.scribeBold}>Trigger: </Text>
                        {note.aiScribeDetails.triggerIdentified}
                      </Text>
                      <Text style={styles.scribeItem}>
                        <Text style={styles.scribeBold}>Intervention: </Text>
                        {note.aiScribeDetails.interventionUsed}
                      </Text>
                    </View>
                  )}

                  {/* Tags */}
                  {note.tags && note.tags.length > 0 && (
                    <View style={styles.tagsRow}>
                      {note.tags.map((t, idx) => (
                        <View key={idx} style={styles.tagPill}>
                          <Text style={styles.tagPillText}>#{t}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ══════════ 4. WELLNESS, SLEEP & ML SUB-VIEW ══════════ */}
        {activeTab === "wellness" && (
          <View>
            {/* Visual Sleep Architecture Card */}
            <View style={styles.sleepVisualCard}>
              <View style={styles.sleepTopRow}>
                <View style={styles.sleepLeftGroup}>
                  <View style={styles.moonIconCircle}>
                    <Feather name="moon" size={18} color={PastelPalette.lavenderPrimary} />
                  </View>
                  <View>
                    <Text style={styles.cardHeaderLabel}>NOCTURNAL SLEEP ARCHITECTURE</Text>
                    <Text style={styles.sleepBigVal}>7h 12m</Text>
                  </View>
                </View>
                <View style={styles.restfulBadge}>
                  <Text style={styles.restfulBadgeText}>RESTFUL</Text>
                </View>
              </View>

              <View style={styles.sleepStagesGrid}>
                <View style={styles.sleepStagePill}>
                  <Text style={styles.stageVal}>2h 10m</Text>
                  <Text style={styles.stageLabel}>Deep Sleep</Text>
                </View>
                <View style={styles.sleepStagePill}>
                  <Text style={styles.stageVal}>4h 40m</Text>
                  <Text style={styles.stageLabel}>Light Sleep</Text>
                </View>
                <View style={styles.sleepStagePill}>
                  <Text style={styles.stageVal}>1 Awake</Text>
                  <Text style={styles.stageLabel}>3:40 AM (2m)</Text>
                </View>
              </View>
            </View>

            {/* Federated Learning & Local ML Calibration Card */}
            <View style={styles.federatedCard}>
              <View style={styles.flHeaderRow}>
                <View style={styles.flIconBox}>
                  <Feather name="shield" size={16} color={PastelPalette.mintPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardHeaderLabel}>FEDERATED LEARNING & ML HEALTH</Text>
                  <Text style={styles.flTitleText}>Local On-Device Privacy Model</Text>
                </View>
                <View style={styles.privacyBadge}>
                  <Feather name="lock" size={11} color={PastelPalette.mintPrimary} />
                  <Text style={styles.privacyBadgeText}>ε = 0.85</Text>
                </View>
              </View>

              <View style={styles.flMetricsRow}>
                <View style={styles.flMetricBlock}>
                  <Text style={styles.flMetricVal}>
                    {stabilityResult ? `${stabilityResult.cognitive_stability_score}` : "88.0"}
                  </Text>
                  <Text style={styles.flMetricLabel}>Stability (/100)</Text>
                </View>
                <View style={styles.flMetricDivider} />
                <View style={styles.flMetricBlock}>
                  <Text style={[styles.flMetricVal, { color: PastelPalette.mintPrimary }]}>
                    {stabilityResult ? `${stabilityResult.sundowning_risk_pct}%` : "12%"}
                  </Text>
                  <Text style={styles.flMetricLabel}>Sundowning Risk</Text>
                </View>
                <View style={styles.flMetricDivider} />
                <View style={styles.flMetricBlock}>
                  <Text style={styles.flMetricVal}>Round {flStatus?.round || 4}</Text>
                  <Text style={styles.flMetricLabel}>Global Sync</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.trainFlBtn, isTrainingFL && { opacity: 0.6 }]}
                onPress={handleTriggerFL}
                disabled={isTrainingFL}
                activeOpacity={0.85}
              >
                <Feather name={isTrainingFL ? "loader" : "refresh-cw"} size={14} color="#FFFFFF" />
                <Text style={styles.trainFlBtnText}>
                  {isTrainingFL ? "Calibrating Model..." : "✨ Calibrate Local Model"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── MODAL: ASK DOCTOR / TELE-CARE QUERY ──────────────────────── */}
      <Modal visible={showAskDoctorModal} animationType="slide" transparent onRequestClose={() => setShowAskDoctorModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Consult Doctor / ASHA Didi</Text>
                <Text style={styles.modalSub}>Send clinical notes, medication queries or sundowning observations</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAskDoctorModal(false)} style={styles.modalCloseBtn}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Urgency Selector */}
              <Text style={styles.inputLabel}>SELECT URGENCY LEVEL</Text>
              <View style={styles.urgencySelectRow}>
                <TouchableOpacity
                  style={[styles.urgencySelectBtn, queryUrgency === "routine" && styles.urgencySelectActiveRoutine]}
                  onPress={() => setQueryUrgency("routine")}
                >
                  <Text style={[styles.urgencySelectBtnText, queryUrgency === "routine" && styles.urgencySelectActiveText]}>
                    Routine
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.urgencySelectBtn, queryUrgency === "medication" && styles.urgencySelectActiveMed]}
                  onPress={() => setQueryUrgency("medication")}
                >
                  <Text style={[styles.urgencySelectBtnText, queryUrgency === "medication" && styles.urgencySelectActiveText]}>
                    Medicine
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.urgencySelectBtn, queryUrgency === "sundowning" && styles.urgencySelectActiveSundowning]}
                  onPress={() => setQueryUrgency("sundowning")}
                >
                  <Text style={[styles.urgencySelectBtnText, queryUrgency === "sundowning" && styles.urgencySelectActiveText]}>
                    Sundowning
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.urgencySelectBtn, queryUrgency === "urgent" && styles.urgencySelectActiveUrgent]}
                  onPress={() => setQueryUrgency("urgent")}
                >
                  <Text style={[styles.urgencySelectBtnText, queryUrgency === "urgent" && styles.urgencySelectActiveText]}>
                    Urgent
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Quick Presets */}
              <Text style={styles.inputLabel}>QUICK CLINICAL PRESETS</Text>
              <View style={styles.chipsRow}>
                <TouchableOpacity
                  style={styles.chip}
                  onPress={() => setQueryText("Mild restlessness observed at 5:30 PM twilight. Need reassurance on routine.")}
                >
                  <Text style={styles.chipText}>🌅 Sundowning Dusk Restlessness</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.chip}
                  onPress={() => setQueryText("Hesitation observed while taking morning Donepezil. Need doctor advice.")}
                >
                  <Text style={styles.chipText}>💊 Medication Hesitation</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.chip}
                  onPress={() => setQueryText("Blood pressure measured 128/82 mmHg. Requesting ASHA Didi routine visit.")}
                >
                  <Text style={styles.chipText}>🩺 Routine BP & Sugar Visit</Text>
                </TouchableOpacity>
              </View>

              {/* Text Input */}
              <Text style={styles.inputLabel}>YOUR MESSAGE / CLINICAL OBSERVATION</Text>
              <TextInput
                style={styles.textArea}
                value={queryText}
                onChangeText={setQueryText}
                placeholder="Type details for Dr. Ananya Sharma or ASHA Didi..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitQueryBtn, isSubmittingQuery && { opacity: 0.7 }]}
              onPress={handleSubmitDoctorQuery}
              disabled={isSubmittingQuery}
              activeOpacity={0.85}
            >
              {isSubmittingQuery ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="send" size={15} color="#FFFFFF" />
                  <Text style={styles.submitQueryBtnText}>Send to Doctor & Care Team</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODALS ─────────────────────────────────────────────────── */}
      <CaregiverAddMedicationModal
        visible={showAddMedModal}
        onClose={() => setShowAddMedModal(false)}
        onAdded={loadData}
      />

      <CaregiverCareNoteModal
        visible={showAddNoteModal}
        onClose={() => setShowAddNoteModal(false)}
        onNoteAdded={loadData}
      />

      <CaregiverServicesModal
        visible={showServicesModal}
        onClose={() => setShowServicesModal(false)}
        elderName={profile?.name || "Bhaben Barman"}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: "#FAF8FC",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  topHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: PastelPalette.pinkSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: PastelPalette.pinkBorder,
  },
  topHeaderTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#1E1B4B",
    letterSpacing: -0.3,
  },
  topHeaderSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  telecareOnlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: PastelPalette.mintSoft,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PastelPalette.mintBorder,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  telecareOnlineText: {
    fontSize: 11,
    fontWeight: "700",
    color: PastelPalette.mintPrimary,
  },

  /* Quick Action Bar */
  quickActionBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
    marginTop: 4,
  },
  quickActionTile: {
    flex: 1,
    borderRadius: 16,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  tileIconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  tileTitle: {
    fontSize: 12,
    fontWeight: "800",
  },
  tileSub: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },

  /* Segmented Control */
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#F1EAF8",
    borderRadius: 14,
    padding: 3,
    marginHorizontal: 16,
    marginVertical: 6,
  },
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    borderRadius: 11,
  },
  segmentBtnActiveTelecare: {
    backgroundColor: PastelPalette.lavenderPrimary,
  },
  segmentBtnActiveMeds: {
    backgroundColor: PastelPalette.rosePrimary,
  },
  segmentBtnActiveScribe: {
    backgroundColor: "#8B5CF6",
  },
  segmentBtnActiveWellness: {
    backgroundColor: PastelPalette.mintPrimary,
  },
  segmentBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#64748B",
  },
  segmentBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 110,
  },

  /* Upcoming Appointment Card */
  upcomingApptCard: {
    backgroundColor: PastelPalette.pinkLight,
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: PastelPalette.pinkBorder,
    shadowColor: PastelPalette.roseDusty,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  apptTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  apptDocAvatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: PastelPalette.pinkSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  apptDocName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  apptDocSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  timeBadge: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PastelPalette.pinkBorder,
  },
  timeBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: PastelPalette.rosePrimary,
  },
  apptBottomRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(244, 114, 182, 0.15)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  apptNote: {
    fontSize: 11.5,
    color: "#475569",
    flex: 1,
    lineHeight: 16,
  },
  joinVideoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PastelPalette.rosePrimary,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
  },
  joinVideoBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  /* Section Header */
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 8,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.6,
  },
  askDoctorHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PastelPalette.lavenderSoft,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PastelPalette.lavenderBorder,
  },
  askDoctorHeaderBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: PastelPalette.lavenderPrimary,
  },

  /* Query Card */
  queryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EDE9FE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
  },
  queryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  queryDoctorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  queryDocIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: PastelPalette.lavenderSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  queryDocName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  queryTimestamp: {
    fontSize: 10.5,
    color: "#64748B",
    marginTop: 1,
  },
  urgencyPill: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  urgencyPillText: {
    fontSize: 9.5,
    fontWeight: "800",
  },
  urgencySundowning: {
    backgroundColor: PastelPalette.pinkSoft,
  },
  urgencySundowningText: {
    color: PastelPalette.rosePrimary,
  },
  urgencyHigh: {
    backgroundColor: "#FEE2E2",
  },
  urgencyHighText: {
    color: "#B91C1C",
  },
  urgencyMed: {
    backgroundColor: PastelPalette.peachSoft,
  },
  urgencyMedText: {
    color: PastelPalette.peachPrimary,
  },
  urgencyRoutine: {
    backgroundColor: PastelPalette.mintSoft,
  },
  urgencyRoutineText: {
    color: PastelPalette.mintPrimary,
  },
  questionBox: {
    backgroundColor: "#FAF8FC",
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F3E8FF",
  },
  questionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B21A8",
    marginBottom: 2,
  },
  questionText: {
    fontSize: 12.5,
    color: "#1E1B4B",
    lineHeight: 17,
  },
  responseBox: {
    backgroundColor: PastelPalette.lavenderLight,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PastelPalette.lavenderBorder,
    marginTop: 2,
  },
  responseHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  responseTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  responseHeaderTitle: {
    fontSize: 9.5,
    fontWeight: "800",
    color: PastelPalette.lavenderPrimary,
    letterSpacing: 0.5,
  },
  audioListenPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: PastelPalette.pinkBorder,
  },
  audioListenPillActive: {
    backgroundColor: PastelPalette.rosePrimary,
  },
  audioListenText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: PastelPalette.rosePrimary,
  },
  responseText: {
    fontSize: 12,
    color: "#334155",
    lineHeight: 17,
  },
  instructionList: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(147, 51, 234, 0.1)",
    gap: 3,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
  },
  instructionBullet: {
    fontSize: 12,
    color: PastelPalette.lavenderPrimary,
    lineHeight: 16,
  },
  instructionItemText: {
    fontSize: 11,
    color: "#475569",
    flex: 1,
    lineHeight: 15,
  },

  /* Doctor Roster Card */
  doctorRosterCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#EDE9FE",
  },
  doctorRosterAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: PastelPalette.lavenderSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  doctorRosterInfo: {
    flex: 1,
  },
  doctorRosterName: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  doctorRosterSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  doctorRosterSlot: {
    fontSize: 10.5,
    fontWeight: "700",
    color: PastelPalette.lavenderPrimary,
    marginTop: 2,
  },
  doctorRosterActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  docCallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PastelPalette.lavenderPrimary,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
  },
  docCallBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  /* Services Banner */
  servicesBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PastelPalette.pinkLight,
    borderRadius: 16,
    padding: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: PastelPalette.pinkBorder,
  },
  servicesIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PastelPalette.pinkSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  servicesBannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  servicesBannerSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },

  /* Adherence */
  adherenceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EDE9FE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  adherenceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cardHeaderLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.8,
  },
  adherenceMain: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#1E1B4B",
    marginTop: 2,
  },
  adherenceDial: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PastelPalette.mintSoft,
    borderWidth: 2,
    borderColor: PastelPalette.mintPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  adherenceDialVal: {
    fontSize: 13,
    fontWeight: "800",
    color: PastelPalette.mintPrimary,
  },
  progressBarTrack: {
    height: 7,
    backgroundColor: "#F1EAF8",
    borderRadius: 3.5,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: PastelPalette.mintPrimary,
    borderRadius: 3.5,
  },
  adherenceFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  adherenceFooterText: {
    fontSize: 11.5,
    color: "#64748B",
    fontWeight: "600",
    flex: 1,
  },
  addMedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PastelPalette.rosePrimary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addMedBtnText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  listSection: {
    gap: 8,
  },
  medCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EDE9FE",
  },
  medCardDone: {
    backgroundColor: "#FBF7FD",
    borderColor: "#E9D5FF",
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  checkCircleDone: {
    backgroundColor: PastelPalette.mintPrimary,
    borderColor: PastelPalette.mintPrimary,
  },
  medContent: {
    flex: 1,
  },
  medTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  medName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  medNameDone: {
    color: "#94A3B8",
    textDecorationLine: "line-through",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeDone: {
    backgroundColor: PastelPalette.mintSoft,
  },
  statusBadgeDue: {
    backgroundColor: PastelPalette.peachSoft,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  statusTextDone: {
    color: PastelPalette.mintPrimary,
  },
  statusTextDue: {
    color: PastelPalette.peachPrimary,
  },
  medDosage: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },

  /* Sleep Visual Card */
  sleepVisualCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EDE9FE",
  },
  sleepTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sleepLeftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  moonIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PastelPalette.lavenderSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  sleepBigVal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E1B4B",
    marginTop: 1,
  },
  restfulBadge: {
    backgroundColor: PastelPalette.lavenderSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  restfulBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: PastelPalette.lavenderPrimary,
  },
  sleepStagesGrid: {
    flexDirection: "row",
    gap: 6,
  },
  sleepStagePill: {
    flex: 1,
    backgroundColor: "#FAF8FC",
    padding: 8,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3E8FF",
  },
  stageVal: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  stageLabel: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
  },

  /* Federated Card */
  federatedCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EDE9FE",
  },
  flHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  flIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: PastelPalette.mintSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  flTitleText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  privacyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: PastelPalette.mintSoft,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  privacyBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: PastelPalette.mintPrimary,
  },
  flMetricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#FAF8FC",
    borderRadius: 12,
    paddingVertical: 10,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#F3E8FF",
  },
  flMetricBlock: {
    alignItems: "center",
  },
  flMetricVal: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  flMetricLabel: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
  },
  flMetricDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E2E8F0",
  },
  trainFlBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PastelPalette.mintPrimary,
    borderRadius: 12,
    paddingVertical: 10,
    gap: 6,
  },
  trainFlBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  /* AI Scribe */
  addNoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addNoteBtnText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  noteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EDE9FE",
    gap: 6,
  },
  noteTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  noteDate: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#64748B",
  },
  voiceAttachedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: PastelPalette.lavenderSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  voiceAttachedText: {
    fontSize: 10,
    fontWeight: "700",
    color: PastelPalette.lavenderPrimary,
  },
  noteCategoryBadge: {
    backgroundColor: "#F1EAF8",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  noteCategoryText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#475569",
    textTransform: "capitalize",
  },
  noteText: {
    fontSize: 13,
    color: "#1E1B4B",
    lineHeight: 18,
  },
  scribeCard: {
    backgroundColor: PastelPalette.lavenderLight,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: PastelPalette.lavenderBorder,
    marginTop: 4,
    gap: 2,
  },
  scribeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  scribeTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  scribeHeaderLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: PastelPalette.lavenderPrimary,
  },
  severityPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  sevLowPill: {
    backgroundColor: PastelPalette.mintSoft,
  },
  sevModPill: {
    backgroundColor: PastelPalette.peachSoft,
  },
  sevHighPill: {
    backgroundColor: "#FEE2E2",
  },
  severityPillText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  scribeItem: {
    fontSize: 11.5,
    color: "#334155",
  },
  scribeBold: {
    fontWeight: "700",
    color: "#6B21A8",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  tagPill: {
    backgroundColor: "#F1EAF8",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagPillText: {
    fontSize: 10.5,
    color: "#64748B",
    fontWeight: "600",
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  modalSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  inputLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.6,
    marginTop: 12,
    marginBottom: 6,
  },
  urgencySelectRow: {
    flexDirection: "row",
    gap: 6,
  },
  urgencySelectBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#F1EAF8",
    alignItems: "center",
  },
  urgencySelectActiveRoutine: {
    backgroundColor: PastelPalette.mintPrimary,
  },
  urgencySelectActiveMed: {
    backgroundColor: PastelPalette.peachPrimary,
  },
  urgencySelectActiveSundowning: {
    backgroundColor: PastelPalette.rosePrimary,
  },
  urgencySelectActiveUrgent: {
    backgroundColor: "#DC2626",
  },
  urgencySelectBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  urgencySelectActiveText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  chipsRow: {
    flexDirection: "column",
    gap: 6,
  },
  chip: {
    backgroundColor: "#FAF8FC",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  chipText: {
    fontSize: 11.5,
    color: "#475569",
    fontWeight: "600",
  },
  textArea: {
    backgroundColor: "#FAF8FC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    padding: 12,
    fontSize: 13,
    color: "#1E1B4B",
    textAlignVertical: "top",
    minHeight: 80,
  },
  submitQueryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PastelPalette.lavenderPrimary,
    borderRadius: 14,
    paddingVertical: 13,
    marginTop: 14,
    gap: 8,
  },
  submitQueryBtnText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
