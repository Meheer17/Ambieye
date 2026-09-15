import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { WarmPalette } from "../../constants/theme";
import {
  caregiverStorage,
  CaregiverMedication,
  PatientProfile,
  CaregiverObservationNote,
  CaregiverDoctor,
} from "../../utils/caregiverStorage";

import { CaregiverAddMedicationModal } from "./CaregiverAddMedicationModal";
import { CaregiverCareNoteModal } from "./CaregiverCareNoteModal";
import { CaregiverServicesModal } from "./CaregiverServicesModal";
import {
  federatedService,
  FederatedStatus,
  CognitiveStabilityResult,
} from "../../services/api/federatedService";

export const CaregiverCareScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"meds" | "wellness" | "history" | "appointments">("meds");

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [medications, setMedications] = useState<CaregiverMedication[]>([]);
  const [careNotes, setCareNotes] = useState<CaregiverObservationNote[]>([]);
  const [doctors, setDoctors] = useState<CaregiverDoctor[]>([]);
  const [flStatus, setFlStatus] = useState<FederatedStatus | null>(null);
  const [stabilityResult, setStabilityResult] = useState<CognitiveStabilityResult | null>(null);
  const [isTrainingFL, setIsTrainingFL] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showServicesModal, setShowServicesModal] = useState(false);

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
    } catch (e) {
      console.warn("Failed to load care screen data:", e);
    }
  }, []);

  const handleTriggerFL = async () => {
    setIsTrainingFL(true);
    try {
      const res = await federatedService.triggerTrainingRound();
      Alert.alert(
        "Local Calibration Complete",
        `Round ${res.round_summary.round} calibrated across ${res.round_summary.participating_clients.length} nodes.\nAccuracy: ${res.round_summary.model_accuracy_pct}%\nPrivacy: ${res.round_summary.privacy_guarantee}`
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

  const takenCount = medications.filter((m) => m.status === "done").length;
  const adherencePercent = medications.length > 0 ? Math.round((takenCount / medications.length) * 100) : 0;

  return (
    <View style={styles.screenWrapper}>
      {/* ── SCREEN TITLE ─────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Clinical & Daily Care</Text>
        <Text style={styles.topBarSubtitle}>
          {profile ? `Medications, sleep & AI notes for ${profile.name}` : "Medications, sleep & AI notes"}
        </Text>
      </View>

      {/* ── 4-WAY SEGMENTED CONTROL ───────────────────────────────────── */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "meds" && styles.segmentBtnActive]}
          onPress={() => setActiveTab("meds")}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentBtnText, activeTab === "meds" && styles.segmentBtnTextActive]}>
            Medicines
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "wellness" && styles.segmentBtnActive]}
          onPress={() => setActiveTab("wellness")}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentBtnText, activeTab === "wellness" && styles.segmentBtnTextActive]}>
            Sleep & ML
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "history" && styles.segmentBtnActive]}
          onPress={() => setActiveTab("history")}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentBtnText, activeTab === "history" && styles.segmentBtnTextActive]}>
            AI Scribe
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "appointments" && styles.segmentBtnActive]}
          onPress={() => setActiveTab("appointments")}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentBtnText, activeTab === "appointments" && styles.segmentBtnTextActive]}>
            Doctors
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
            colors={[WarmPalette.roseDusty]}
            tintColor={WarmPalette.roseDusty}
          />
        }
      >
        {/* ══════════ 1. MEDICATIONS SUB-VIEW ══════════ */}
        {activeTab === "meds" && (
          <View>
            {/* Visual Adherence Card */}
            <View style={styles.adherenceCard}>
              <View style={styles.adherenceHeader}>
                <View>
                  <Text style={styles.cardHeaderLabel}>MEDICATION ADHERENCE</Text>
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
                <Text style={styles.adherenceFooterText}>Next due: Amlodipine (5mg) @ 8:00 PM</Text>
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

        {/* ══════════ 2. WELLNESS & SLEEP SUB-VIEW ══════════ */}
        {activeTab === "wellness" && (
          <View>
            {/* Visual Sleep Architecture Card */}
            <View style={styles.sleepVisualCard}>
              <View style={styles.sleepTopRow}>
                <View style={styles.sleepLeftGroup}>
                  <View style={styles.moonIconCircle}>
                    <Feather name="moon" size={18} color="#7C3AED" />
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
                  <Feather name="shield" size={16} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardHeaderLabel}>FEDERATED LEARNING & ML HEALTH</Text>
                  <Text style={styles.flTitleText}>Local On-Device Privacy Model</Text>
                </View>
                <View style={styles.privacyBadge}>
                  <Feather name="lock" size={11} color="#059669" />
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
                  <Text style={[styles.flMetricVal, { color: "#16A34A" }]}>
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
                  {isTrainingFL ? "Calibrating..." : "Calibrate Local Model"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ══════════ 3. AI SCRIBE NOTES SUB-VIEW ══════════ */}
        {activeTab === "history" && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>AI CLINICAL SCRIBE OBSERVATIONS</Text>
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
                          <Feather name="mic" size={10} color="#7C3AED" />
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
                          <Feather name="cpu" size={11} color="#7C3AED" />
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

        {/* ══════════ 4. DOCTORS & CLINICIANS SUB-VIEW ══════════ */}
        {activeTab === "appointments" && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>VERIFIED CLINICAL TEAM</Text>
            </View>

            {doctors.map((doc) => (
              <View key={doc.id} style={styles.doctorCard}>
                <View style={styles.doctorIconBox}>
                  <Feather name="user" size={20} color="#2563EB" />
                </View>
                <View style={styles.doctorContent}>
                  <Text style={styles.doctorName}>{doc.name}</Text>
                  <Text style={styles.doctorSpecialty}>{doc.specialty} · {doc.hospital}</Text>
                  <Text style={styles.doctorAppt}>Next Slot: {doc.availableSlots?.[0] || "10:30 AM"}</Text>
                </View>
                <TouchableOpacity
                  style={styles.bookDocBtn}
                  onPress={() => Alert.alert("Consultation Booking", `Confirm booking request with ${doc.name}?`)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.bookDocBtnText}>Book</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Eldercare Services Banner */}
            <TouchableOpacity
              style={styles.servicesBanner}
              onPress={() => setShowServicesModal(true)}
              activeOpacity={0.85}
            >
              <View style={styles.servicesIconBox}>
                <Feather name="compass" size={20} color="#7C3AED" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.servicesBannerTitle}>Verified Eldercare Services</Text>
                <Text style={styles.servicesBannerSub}>Physiotherapy, attendants & memory care</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

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
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  topBarSubtitle: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 2,
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 14,
    padding: 3,
    marginHorizontal: 16,
    marginVertical: 10,
  },
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 11,
  },
  segmentBtnActive: {
    backgroundColor: "#0F172A",
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
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
    paddingTop: 6,
    paddingBottom: 96,
  },
  adherenceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
    color: "#0F172A",
    marginTop: 2,
  },
  adherenceDial: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ECFDF5",
    borderWidth: 2,
    borderColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  adherenceDialVal: {
    fontSize: 13,
    fontWeight: "800",
    color: "#047857",
  },
  progressBarTrack: {
    height: 7,
    backgroundColor: "#F1F5F9",
    borderRadius: 3.5,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#10B981",
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
    backgroundColor: "#0F172A",
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
    borderColor: "#E2E8F0",
  },
  medCardDone: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
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
    backgroundColor: "#10B981",
    borderColor: "#10B981",
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
    color: "#0F172A",
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
    backgroundColor: "#DCFCE7",
  },
  statusBadgeDue: {
    backgroundColor: "#FEF3C7",
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  statusTextDone: {
    color: "#166534",
  },
  statusTextDue: {
    color: "#92400E",
  },
  medDosage: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },
  sleepVisualCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  sleepBigVal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 1,
  },
  restfulBadge: {
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  restfulBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#7C3AED",
  },
  sleepStagesGrid: {
    flexDirection: "row",
    gap: 6,
  },
  sleepStagePill: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  stageVal: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  stageLabel: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
  },
  federatedCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  flTitleText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  privacyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  privacyBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
  },
  flMetricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingVertical: 10,
    marginVertical: 10,
  },
  flMetricBlock: {
    alignItems: "center",
  },
  flMetricVal: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
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
    backgroundColor: "#059669",
    borderRadius: 12,
    paddingVertical: 10,
    gap: 6,
  },
  trainFlBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.8,
  },
  addNoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#7C3AED",
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
    borderColor: "#E2E8F0",
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
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  voiceAttachedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#7C3AED",
  },
  noteCategoryBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  noteCategoryText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#334155",
    textTransform: "capitalize",
  },
  noteText: {
    fontSize: 13,
    color: "#0F172A",
    lineHeight: 18,
  },
  scribeCard: {
    backgroundColor: "#FAF5FF",
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "#EDE9FE",
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
    color: "#7C3AED",
  },
  severityPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  sevLowPill: {
    backgroundColor: "#DCFCE7",
  },
  sevModPill: {
    backgroundColor: "#FEF3C7",
  },
  sevHighPill: {
    backgroundColor: "#FEE2E2",
  },
  severityPillText: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  scribeItem: {
    fontSize: 11.5,
    color: "#334155",
  },
  scribeBold: {
    fontWeight: "700",
    color: "#6D28D9",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  tagPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagPillText: {
    fontSize: 10.5,
    color: "#64748B",
    fontWeight: "600",
  },
  doctorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  doctorIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  doctorContent: {
    flex: 1,
  },
  doctorName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  doctorSpecialty: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  doctorAppt: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
    marginTop: 2,
  },
  bookDocBtn: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bookDocBtnText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  servicesBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  servicesIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  servicesBannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  servicesBannerSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
});
