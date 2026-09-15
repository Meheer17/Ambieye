import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WarmPalette } from "../../constants/theme";
import {
  caregiverStorage,
  CaregiverMedication,
  CaregiverActivity,
  CaregiverSleepRecord,
  WearableHealthData,
} from "../../utils/caregiverStorage";

import { CaregiverAddMedicationModal } from "./CaregiverAddMedicationModal";
import { CaregiverAddActivityModal } from "./CaregiverAddActivityModal";

export const CaregiverRemindersScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  // Data states
  const [medications, setMedications] = useState<CaregiverMedication[]>([]);
  const [activities, setActivities] = useState<CaregiverActivity[]>([]);
  const [sleepRecord, setSleepRecord] = useState<CaregiverSleepRecord | null>(null);
  const [wearableData, setWearableData] = useState<WearableHealthData | null>(null);

  // Modals & form state
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [editingMed, setEditingMed] = useState<CaregiverMedication | null>(null);
  const [showAddActModal, setShowAddActModal] = useState(false);
  const [deviceConnectedSim, setDeviceConnectedSim] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const meds = await caregiverStorage.getMedications();
      const acts = await caregiverStorage.getActivities();
      const sleep = await caregiverStorage.getSleepRecord();
      const wear = await caregiverStorage.getWearableData();

      setMedications(meds);
      setActivities(acts);
      setSleepRecord(sleep);
      setWearableData(wear);
    } catch (e) {
      console.warn("Failed to load caregiver reminders data:", e);
    }
  }, []);

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

  const handleToggleActivity = async (id: string, currentStatus: boolean) => {
    try {
      await caregiverStorage.toggleActivityCompletion(id, !currentStatus);
      loadData();
    } catch (e) {
      console.warn("Failed to toggle activity:", e);
    }
  };

  return (
    <View style={styles.screenWrapper}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          isTablet && { maxWidth: 840, alignSelf: "center", width: "100%" },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Screen Header ─────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Care & Routine Management</Text>
          <Text style={styles.headerSubtitle}>
            Medications schedule, daily activities, sleep tracking & vitals
          </Text>
        </View>

        {/* ── SECTION 1: MEDICATION MANAGEMENT (Spec 8) ─────────────── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionHeaderTitle}>TODAY'S MEDICATIONS</Text>
              <Text style={styles.sectionSubtitle}>
                {medications.filter((m) => m.status === "done").length} of {medications.length} recorded
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => {
                setEditingMed(null);
                setShowAddMedModal(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Add Medicine</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.medsList}>
            {medications.map((med) => {
              const isDone = med.status === "done";
              const isDue = med.status === "due";
              const isNotRecorded = med.status === "not_recorded";

              return (
                <View key={med.id} style={styles.medCard}>
                  {/* Status Indicator Pill */}
                  <TouchableOpacity
                    style={[
                      styles.medStatusCircle,
                      isDone && { backgroundColor: "#16A34A", borderColor: "#16A34A" },
                      isDue && { borderColor: WarmPalette.roseDusty },
                      isNotRecorded && { borderColor: "#D97706", backgroundColor: "#FEF3C7" },
                    ]}
                    onPress={() => handleToggleMedStatus(med)}
                    activeOpacity={0.8}
                  >
                    {isDone ? (
                      <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                    ) : isNotRecorded ? (
                      <Ionicons name="alert-circle" size={15} color="#D97706" />
                    ) : (
                      <View style={[styles.dueDot, { backgroundColor: WarmPalette.roseDusty }]} />
                    )}
                  </TouchableOpacity>

                  {/* Med Details */}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.medTitleRow}>
                      <Text style={[styles.medName, isDone && styles.medNameDone]}>{med.name}</Text>
                      <Text style={styles.medTimeSlot}>
                        {med.timeSlot.toUpperCase()} • {med.timeLabel}
                      </Text>
                    </View>

                    <Text style={styles.medDosage}>{med.dosage}</Text>
                    <Text style={styles.medInstructions}>{med.instructions}</Text>

                    {/* Recorded timestamp or non-judgmental status */}
                    <View style={styles.recordedStatusRow}>
                      {isDone ? (
                        <Text style={styles.recordedDoneText}>
                          ✓ Taken • Recorded at {med.recordedAt || med.timeLabel}
                        </Text>
                      ) : isDue ? (
                        <Text style={styles.recordedDueText}>○ Scheduled for {med.timeLabel}</Text>
                      ) : (
                        <Text style={styles.recordedMissingText}>
                          Evening medicine was not recorded digitally
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Edit Action Button */}
                  <TouchableOpacity
                    style={styles.editMedBtn}
                    onPress={() => {
                      setEditingMed(med);
                      setShowAddMedModal(true);
                    }}
                  >
                    <Ionicons name="pencil-outline" size={16} color={WarmPalette.charcoalWarm + "80"} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── SECTION 2: DAILY ACTIVITIES (Spec 10) ─────────────────── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionHeaderTitle}>TODAY'S ACTIVITIES</Text>
              <Text style={styles.sectionSubtitle}>
                {activities.filter((a) => a.completed).length} of {activities.length} completed
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: WarmPalette.sageWarm }]}
              onPress={() => setShowAddActModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Add Activity</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activitiesList}>
            {activities.map((act) => (
              <View key={act.id} style={styles.activityRowCard}>
                <TouchableOpacity
                  style={[styles.actCheckCircle, act.completed && styles.actCheckCircleDone]}
                  onPress={() => handleToggleActivity(act.id, act.completed)}
                  activeOpacity={0.8}
                >
                  {act.completed && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </TouchableOpacity>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.actTitleRow}>
                    <Text
                      style={[
                        styles.actTitle,
                        act.completed && { textDecorationLine: "line-through", color: WarmPalette.charcoalWarm + "70" },
                      ]}
                    >
                      {act.title}
                    </Text>
                    <Text style={styles.actTimeLabel}>{act.timeLabel}</Text>
                  </View>

                  {act.notes ? <Text style={styles.actNotes}>{act.notes}</Text> : null}

                  <View style={styles.actCategoryPill}>
                    <Text style={styles.actCategoryText}>
                      {act.category === "offline_real_world" ? "Real-World Stim" : act.category.toUpperCase()}
                      {act.duration ? ` • ${act.duration}` : ""}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── SECTION 3: SLEEP TRACKING (Spec 6) ─────────────────────── */}
        {sleepRecord && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionHeaderTitle}>SLEEP & WELLNESS TRACKING</Text>
                <Text style={styles.sectionSubtitle}>Compared against personal routine baseline</Text>
              </View>
            </View>

            <View style={styles.sleepCard}>
              <View style={styles.sleepMainRow}>
                <View style={styles.sleepIconCircle}>
                  <Ionicons name="moon" size={24} color="#7C3AED" />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.sleepDurationText}>{sleepRecord.duration}</Text>
                  <Text style={styles.sleepConsistencyText}>
                    Consistency: {sleepRecord.consistency}
                  </Text>
                </View>
                <View style={styles.sleepTimesBox}>
                  <Text style={styles.sleepTimeItem}>Bed: {sleepRecord.bedtime}</Text>
                  <Text style={styles.sleepTimeItem}>Wake: {sleepRecord.wakeTime}</Text>
                </View>
              </View>

              <View style={styles.sleepDivider} />

              {/* Human-Readable Trend (No medical diagnosis) */}
              <View style={styles.trendRow}>
                <Ionicons name="information-circle-outline" size={16} color={WarmPalette.roseDusty} />
                <Text style={styles.trendText}>
                  "{sleepRecord.recentTrend}" ({sleepRecord.comparisonToOwnPattern})
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── SECTION 4: HEART / VITALS / WEARABLE HEALTH DATA (Spec 7) ─ */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionHeaderTitle}>HEALTH & SENSOR VITALS</Text>
              <Text style={styles.sectionSubtitle}>Supported connected health devices</Text>
            </View>
            <TouchableOpacity
              style={styles.connectToggleBtn}
              onPress={() => setDeviceConnectedSim(!deviceConnectedSim)}
            >
              <Text style={styles.connectToggleText}>
                {deviceConnectedSim ? "Disconnect Device" : "Pair Device Demo"}
              </Text>
            </TouchableOpacity>
          </View>

          {deviceConnectedSim ? (
            <View style={styles.connectedCard}>
              <View style={styles.deviceConnectedHeader}>
                <Ionicons name="bluetooth" size={16} color="#16A34A" />
                <Text style={styles.deviceNameText}>Fitbit Inspire 3 Connected • Synced 12m ago</Text>
              </View>
              <View style={styles.vitalsRow}>
                <View style={styles.vitalItem}>
                  <Text style={styles.vitalVal}>71 bpm</Text>
                  <Text style={styles.vitalLabel}>Resting Heart Rate</Text>
                </View>
                <View style={styles.vitalItem}>
                  <Text style={styles.vitalVal}>3,420</Text>
                  <Text style={styles.vitalLabel}>Daily Steps</Text>
                </View>
                <View style={styles.vitalItem}>
                  <Text style={styles.vitalVal}>98%</Text>
                  <Text style={styles.vitalLabel}>Oxygen (SpO2)</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.disconnectedCard}>
              <Ionicons name="radio-outline" size={32} color={WarmPalette.charcoalWarm + "60"} />
              <Text style={styles.disconnectedTitle}>No Health Sensor Connected</Text>
              <Text style={styles.disconnectedSub}>
                "Connect a supported health device to view this data." The mobile phone itself does not fabricate heart rate or oxygen readings.
              </Text>
              <View style={styles.compatiblePillsRow}>
                <Text style={styles.compatiblePill}>• Apple HealthKit</Text>
                <Text style={styles.compatiblePill}>• Android Health Connect</Text>
                <Text style={styles.compatiblePill}>• Bluetooth Pulse Oximeter</Text>
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add / Edit Medication Modal */}
      <CaregiverAddMedicationModal
        visible={showAddMedModal}
        onClose={() => setShowAddMedModal(false)}
        onAdded={loadData}
        editingMedication={editingMed}
      />

      {/* Add Activity Modal */}
      <CaregiverAddActivityModal
        visible={showAddActModal}
        onClose={() => setShowAddActModal(false)}
        onAdded={loadData}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: WarmPalette.ivory,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 30,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
  },
  headerSubtitle: {
    fontSize: 13,
    color: WarmPalette.charcoalWarm + "99",
    marginTop: 2,
  },
  sectionContainer: {
    marginBottom: 22,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: WarmPalette.charcoalWarm + "80",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.roseDusty,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  medsList: {
    gap: 10,
  },
  medCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: WarmPalette.cream,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    padding: 14,
  },
  medStatusCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: WarmPalette.sand,
    backgroundColor: WarmPalette.ivory,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  dueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  medTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  medName: {
    fontSize: 15,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  medNameDone: {
    color: WarmPalette.charcoalWarm + "90",
  },
  medTimeSlot: {
    fontSize: 11,
    fontWeight: "700",
    color: WarmPalette.roseDusty,
  },
  medDosage: {
    fontSize: 12,
    fontWeight: "600",
    color: WarmPalette.charcoalWarm + "90",
    marginTop: 2,
  },
  medInstructions: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm + "80",
    marginTop: 2,
  },
  recordedStatusRow: {
    marginTop: 6,
  },
  recordedDoneText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#16A34A",
  },
  recordedDueText: {
    fontSize: 11,
    fontWeight: "600",
    color: WarmPalette.roseDusty,
  },
  recordedMissingText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#D97706",
  },
  editMedBtn: {
    padding: 4,
    marginLeft: 8,
  },
  activitiesList: {
    gap: 8,
  },
  activityRowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.cream,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    padding: 12,
  },
  actCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: WarmPalette.sand,
    backgroundColor: WarmPalette.ivory,
    alignItems: "center",
    justifyContent: "center",
  },
  actCheckCircleDone: {
    backgroundColor: WarmPalette.sageWarm,
    borderColor: WarmPalette.sageWarm,
  },
  actTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
    flex: 1,
  },
  actTimeLabel: {
    fontSize: 11,
    color: WarmPalette.charcoalWarm + "80",
    fontWeight: "600",
  },
  actNotes: {
    fontSize: 11,
    color: WarmPalette.charcoalWarm + "80",
    marginTop: 2,
  },
  actCategoryPill: {
    alignSelf: "flex-start",
    backgroundColor: WarmPalette.sand,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  actCategoryText: {
    fontSize: 10,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm + "90",
  },
  sleepCard: {
    backgroundColor: WarmPalette.cream,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    padding: 14,
  },
  sleepMainRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sleepIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  sleepDurationText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#5B21B6",
  },
  sleepConsistencyText: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm + "80",
    marginTop: 2,
  },
  sleepTimesBox: {
    alignItems: "flex-end",
  },
  sleepTimeItem: {
    fontSize: 11,
    color: WarmPalette.charcoalWarm + "90",
    fontWeight: "600",
  },
  sleepDivider: {
    height: 1,
    backgroundColor: WarmPalette.sand,
    marginVertical: 10,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  trendText: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm + "90",
    fontStyle: "italic",
    flex: 1,
  },
  connectToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: WarmPalette.sand,
  },
  connectToggleText: {
    fontSize: 11,
    fontWeight: "600",
    color: WarmPalette.charcoalWarm,
  },
  connectedCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    padding: 14,
  },
  deviceConnectedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  deviceNameText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
  },
  vitalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  vitalItem: {
    alignItems: "center",
    flex: 1,
  },
  vitalVal: {
    fontSize: 16,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
  },
  vitalLabel: {
    fontSize: 10,
    color: WarmPalette.charcoalWarm + "80",
    marginTop: 2,
  },
  disconnectedCard: {
    alignItems: "center",
    backgroundColor: WarmPalette.cream,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  disconnectedTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
    marginTop: 8,
  },
  disconnectedSub: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm + "90",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 16,
  },
  compatiblePillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  compatiblePill: {
    fontSize: 11,
    color: WarmPalette.charcoalWarm + "80",
    fontWeight: "600",
  },
});
