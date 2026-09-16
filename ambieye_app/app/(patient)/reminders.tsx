import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { Colors, BorderRadius, Shadows, Spacing, WarmPalette } from "@/constants/theme";
import { useTranslation } from "@/constants/i18n";
import { reminderStorage, MedicationItem, DailyHydration, RoutineTask } from "@/utils/reminderStorage";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import { useAuth } from "@/hooks/useAuth";
import { dementiaCareStorage } from "@/utils/dementiaCareStorage";
import { CaregiverCareScreen } from "@/components/caregiver/CaregiverCareScreen";

export default function RemindersScreen() {
  const { username } = useAuth();
  const { t, currentLang } = useTranslation();
  const [viewMode, setViewMode] = useState<"elderly" | "caregiver">("elderly");
  const [hydration, setHydration] = useState<DailyHydration>({ date: "", glassesDrunk: 0, dailyGoal: 8 });
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [routines, setRoutines] = useState<RoutineTask[]>([]);
  const [sosStatus, setSosStatus] = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        const activeMode = await AsyncStorage.getItem("ambieye_active_mode");
        const savedMode = await dementiaCareStorage.getActiveViewMode();
        if (activeMode === "caregiver" || username?.toLowerCase() === "caregiver") {
          setViewMode("caregiver");
        } else {
          setViewMode(savedMode);
        }
      })();
    }, [username])
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const hyd = await reminderStorage.getTodayHydration();
    const meds = await reminderStorage.getTodayMedications();
    const rts = await reminderStorage.getTodayRoutines();
    setHydration(hyd);
    setMedications(meds);
    setRoutines(rts);
  };

  const handleAddWater = async () => {
    const updated = await reminderStorage.addWaterGlass();
    setHydration(updated);
    const msg = `${updated.glassesDrunk} ${t("glasses_drunk")}`;
    VoiceAssistant.speak(msg, currentLang);
  };

  const handleToggleMed = async (id: string) => {
    const updated = await reminderStorage.toggleMedication(id);
    setMedications(updated);
  };

  const handleToggleRoutine = async (id: string) => {
    const updated = await reminderStorage.toggleRoutine(id);
    setRoutines(updated);
  };

  const getMedName = (med: MedicationItem) => {
    if (med.id === "med-1") return t("med_donepezil_title");
    if (med.id === "med-2") return t("med_vitb12_title");
    if (med.id === "med-3") return t("med_bp_title");
    return med.name;
  };

  const getMedDosage = (med: MedicationItem) => {
    if (med.id === "med-1") return t("med_donepezil_dosage");
    if (med.id === "med-2") return t("med_vitb12_dosage");
    if (med.id === "med-3") return t("med_bp_dosage");
    return med.dosage;
  };

  const getRoutineTitle = (rt: RoutineTask) => {
    if (rt.id === "rt-1") return t("morning_tea_courtyard");
    if (rt.id === "rt-2") return t("gentle_walk");
    if (rt.id === "rt-3") return t("play_memory_game");
    if (rt.id === "rt-4") return t("afternoon_rest");
    return rt.title;
  };

  const handleReadScheduleAloud = () => {
    const pendingMeds = medications
      .filter((m) => !m.taken)
      .map((m) => getMedName(m))
      .join(", ");
    let text = `${t("today_routine")}. `;
    text += `${t("water_tracker")}: ${hydration.glassesDrunk} of ${hydration.dailyGoal} ${t("glasses_drunk")}. `;
    if (pendingMeds) {
      text += `${t("medication_reminder")}: ${pendingMeds}. `;
    } else {
      text += `${t("all_meds_done_msg")} `;
    }
    VoiceAssistant.speak(text, currentLang);
  };

  const handleSOS = async () => {
    const res = await reminderStorage.triggerSOS();
    setSosStatus(`${t("sos_sent_at")} ${res.time}`);
    VoiceAssistant.speak(t("sos_alert_sent"), currentLang);
    if (Platform.OS !== "web") {
      Alert.alert(t("sos_button"), t("sos_alert_sent"));
    }
  };

  const completionRate = Math.round((hydration.glassesDrunk / hydration.dailyGoal) * 100);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Title and Voice Readout Button */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>{t("reminders_title")}</Text>
            <Text style={styles.headerSubtitle}>{t("reminders_subtitle")}</Text>
          </View>
          <TouchableOpacity
            style={styles.voiceButton}
            onPress={handleReadScheduleAloud}
            accessibilityLabel={t("read_aloud")}
          >
            <Feather name="volume-2" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* SOS Alert Banner if triggered */}
        {sosStatus && (
          <View style={styles.sosBanner}>
            <Feather name="alert-triangle" size={20} color="#DC2626" />
            <Text style={styles.sosBannerText}>{sosStatus}</Text>
          </View>
        )}

        {/* ── 1. Hydration Card ─────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBg, { backgroundColor: "#DBEAFE" }]}>
              <MaterialCommunityIcons name="cup-water" size={28} color="#2563EB" />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>{t("water_tracker")}</Text>
              <Text style={styles.cardSub}>
                {hydration.glassesDrunk} / {hydration.dailyGoal} {t("glasses_drunk")}
              </Text>
            </View>
            <Text style={styles.percentageText}>{completionRate}%</Text>
          </View>

          {/* Glasses Visual Matrix */}
          <View style={styles.waterGlassesContainer}>
            {Array.from({ length: hydration.dailyGoal }).map((_, idx) => {
              const isFilled = idx < hydration.glassesDrunk;
              return (
                <View
                  key={idx}
                  style={[
                    styles.glassIcon,
                    isFilled ? styles.glassFilled : styles.glassEmpty,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="cup-water"
                    size={22}
                    color={isFilled ? "#2563EB" : "#94A3B8"}
                  />
                </View>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.actionBtnPrimary}
            onPress={handleAddWater}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="plus-circle" size={24} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>{t("add_water_btn")}</Text>
          </TouchableOpacity>
        </View>

        {/* ── 2. Medication Reminder Section ────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t("medication_reminder")}</Text>
        </View>

        {medications.map((med) => (
          <TouchableOpacity
            key={med.id}
            style={[
              styles.medCard,
              med.taken && styles.medCardCompleted,
            ]}
            onPress={() => handleToggleMed(med.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.medBadge, { backgroundColor: `${med.pillColor}20` }]}>
              <MaterialCommunityIcons
                name="pill"
                size={26}
                color={med.pillColor}
              />
            </View>
            <View style={styles.medContent}>
              <View style={styles.medRowTop}>
                <Text style={[styles.medName, med.taken && styles.medTextStrikethrough]}>
                  {getMedName(med)}
                </Text>
                <View style={[styles.timeBadge, { backgroundColor: "#F1F5F9" }]}>
                  <Feather name="clock" size={13} color="#475569" />
                  <Text style={styles.timeBadgeText}>{med.timeLabel}</Text>
                </View>
              </View>
              <Text style={styles.medDosage}>{getMedDosage(med)}</Text>
              {med.taken && (
                <Text style={styles.takenAtText}>✓ {t("taken_at_time")} {med.takenAt}</Text>
              )}
            </View>

            <View style={[styles.checkbox, med.taken && styles.checkboxActive]}>
              {med.taken && <Feather name="check" size={18} color="#FFFFFF" />}
            </View>
          </TouchableOpacity>
        ))}

        {/* ── 3. Daily Care Tasks & Status ─────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daily Care Tasks</Text>
          <Text style={{ fontSize: 12, color: "#64748B" }}>Done / Skipped / Pending</Text>
        </View>

        {routines.map((rt) => {
          const taskStatus = rt.status || (rt.completed ? "done" : "pending");
          return (
            <View
              key={rt.id}
              style={[
                styles.routineCard,
                taskStatus === "done" && styles.routineCardCompleted,
                taskStatus === "skipped" && styles.routineCardSkipped,
              ]}
            >
              <View style={[styles.routineIcon, taskStatus === "done" && styles.routineIconDone]}>
                {(() => {
                  const color = taskStatus === "done" ? "#10B981" : taskStatus === "skipped" ? "#94A3B8" : "#64748B";
                  switch (rt.iconName) {
                    case "pill":
                      return <MaterialCommunityIcons name="pill" size={22} color={color} />;
                    case "shower":
                      return <MaterialCommunityIcons name="shower" size={22} color={color} />;
                    case "sparkles":
                      return <MaterialCommunityIcons name="face-woman-shimmer" size={22} color={color} />;
                    case "music":
                      return <Feather name="music" size={22} color={color} />;
                    case "coffee":
                      return <Feather name="coffee" size={22} color={color} />;
                    case "sun":
                      return <Feather name="sun" size={22} color={color} />;
                    default:
                      return <Feather name="check-circle" size={22} color={color} />;
                  }
                })()}
              </View>
              <View style={styles.routineInfo}>
                <Text style={[styles.routineTitle, taskStatus === "done" && styles.routineTitleDone, taskStatus === "skipped" && styles.routineTitleSkipped]}>
                  {getRoutineTitle(rt)}
                </Text>
                <Text style={styles.routineTime}>{rt.timeLabel}</Text>
              </View>

              {/* 3 Status Selector Buttons */}
              <View style={styles.statusButtonsRow}>
                <TouchableOpacity
                  style={[styles.statusBtn, taskStatus === "done" && styles.statusBtnDoneActive]}
                  onPress={() => {
                    reminderStorage.updateRoutineStatus(rt.id, "done").then(setRoutines);
                    VoiceAssistant.speak(`${getRoutineTitle(rt)} marked completed`, currentLang);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statusBtnText, taskStatus === "done" && styles.statusBtnTextActive]}>Done ✓</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusBtn, taskStatus === "skipped" && styles.statusBtnSkippedActive]}
                  onPress={() => {
                    reminderStorage.updateRoutineStatus(rt.id, "skipped").then(setRoutines);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statusBtnText, taskStatus === "skipped" && styles.statusBtnTextActive]}>Skip ⏭</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* ── 4. Clinical Appointments & Home Visits ────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📅 Appointments & Visits</Text>
        </View>

        <View style={styles.appointmentsContainer}>
          <View style={styles.appointmentCard}>
            <View style={styles.aptTopRow}>
              <View style={styles.aptIconBg}>
                <Feather name="calendar" size={20} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.aptTitle}>Monthly Memory Review & MMSE Check</Text>
                <Text style={styles.aptDoctor}>Dr. Himanta Sarma (Neurologist)</Text>
              </View>
              <View style={styles.aptTimingBadge}>
                <Text style={styles.aptTimingText}>In 3 Days</Text>
              </View>
            </View>
            <View style={styles.aptBottomRow}>
              <Feather name="map-pin" size={13} color="#64748B" />
              <Text style={styles.aptLocationText}>Guwahati Geriatric Clinic & Tele-Room</Text>
            </View>
          </View>

          <View style={styles.appointmentCard}>
            <View style={styles.aptTopRow}>
              <View style={[styles.aptIconBg, { backgroundColor: "#DCFCE7" }]}>
                <Feather name="home" size={20} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.aptTitle}>ASHA Worker Home Visit & Blood Pressure</Text>
                <Text style={styles.aptDoctor}>Runu Deka (Community ASHA)</Text>
              </View>
              <View style={[styles.aptTimingBadge, { backgroundColor: "#DCFCE7" }]}>
                <Text style={[styles.aptTimingText, { color: "#166534" }]}>Tomorrow</Text>
              </View>
            </View>
            <View style={styles.aptBottomRow}>
              <Feather name="map-pin" size={13} color="#64748B" />
              <Text style={styles.aptLocationText}>Home Visit</Text>
            </View>
          </View>
        </View>

        {/* ── 5. Emergency Caregiver SOS Button ─────────────────────── */}
        <TouchableOpacity
          style={styles.sosButton}
          onPress={handleSOS}
          activeOpacity={0.85}
        >
          <Feather name="alert-circle" size={24} color="#FFFFFF" />
          <Text style={styles.sosButtonText}>{t("sos_button")}</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 110,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  headerLeft: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
  },
  voiceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0EA5E9",
    justifyContent: "center",
    alignItems: "center",
    ...Shadows.md,
  },
  sosBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: 8,
  },
  sosBannerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#DC2626",
    flex: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Shadows.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  cardIconBg: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  cardSub: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
  },
  percentageText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2563EB",
  },
  waterGlassesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginVertical: Spacing.md,
  },
  glassIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
  },
  glassFilled: {
    backgroundColor: "#EFF6FF",
    borderColor: "#60A5FA",
  },
  glassEmpty: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
  },
  actionBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    gap: 10,
    marginTop: Spacing.xs,
    ...Shadows.sm,
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sectionHeader: {
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  medCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Shadows.sm,
  },
  medCardCompleted: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    opacity: 0.85,
  },
  medBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  medContent: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  medRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  medName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  medTextStrikethrough: {
    textDecorationLine: "line-through",
    color: "#94A3B8",
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
    marginLeft: 6,
  },
  timeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  medDosage: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  takenAtText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
    marginTop: 4,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#94A3B8",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  routineCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Shadows.sm,
  },
  routineCardCompleted: {
    backgroundColor: "#F8FAFC",
  },
  routineIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  routineIconDone: {
    backgroundColor: "#D1FAE5",
  },
  routineInfo: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  routineTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
  },
  routineTitleDone: {
    textDecorationLine: "line-through",
    color: "#94A3B8",
  },
  routineTime: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  routineCardSkipped: {
    backgroundColor: "#F8FAFC",
    opacity: 0.6,
  },
  routineTitleSkipped: {
    color: "#94A3B8",
    fontStyle: "italic",
  },
  statusButtonsRow: {
    flexDirection: "row",
    gap: 6,
  },
  statusBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statusBtnDoneActive: {
    backgroundColor: "#DCFCE7",
    borderColor: "#16A34A",
  },
  statusBtnSkippedActive: {
    backgroundColor: "#FEE2E2",
    borderColor: "#DC2626",
  },
  statusBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  statusBtnTextActive: {
    color: "#0F172A",
  },
  appointmentsContainer: {
    gap: 10,
    marginBottom: Spacing.lg,
  },
  appointmentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Shadows.sm,
  },
  aptTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  aptIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  aptTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  aptDoctor: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  aptTimingBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aptTimingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  aptBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  aptLocationText: {
    fontSize: 12,
    color: "#64748B",
  },
  sosButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC2626",
    borderRadius: BorderRadius.xl,
    paddingVertical: 16,
    marginTop: Spacing.lg,
    gap: 10,
    ...Shadows.md,
  },
  sosButtonText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
});
