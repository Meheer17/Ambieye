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
import { useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { WarmPalette } from "../../constants/theme";
import {
  caregiverStorage,
  PatientProfile,
  TodaySummaryData,
  AttentionItem,
  SafeZoneStatus,
  ShiftHandoffRecord,
  WearableHealthData,
} from "../../utils/caregiverStorage";
import { iotSensorService } from "../../services/hardware/iotSensorService";

import CaregiverPatientProfileModal from "./CaregiverPatientProfileModal";
import { CaregiverEmergencyModal } from "./CaregiverEmergencyModal";
import { CaregiverSendToElderModal } from "./CaregiverSendToElderModal";
import { CaregiverShiftHandoffModal } from "./CaregiverShiftHandoffModal";
import { CaregiverCareNoteModal } from "./CaregiverCareNoteModal";
import { CaregiverBleScannerModal } from "./CaregiverBleScannerModal";

interface Props {
  onSwitchToElderly?: () => void;
}

export const CaregiverHomeScreen: React.FC<Props> = ({ onSwitchToElderly }) => {
  const router = useRouter();

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [todaySummary, setTodaySummary] = useState<TodaySummaryData | null>(null);
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [safeZone, setSafeZone] = useState<SafeZoneStatus | null>(null);
  const [shiftHandoff, setShiftHandoff] = useState<ShiftHandoffRecord | null>(null);
  const [wearableData, setWearableData] = useState<WearableHealthData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showBleModal, setShowBleModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const p = await caregiverStorage.getPatientProfile();
      const { summary, attention } = await caregiverStorage.getTodayOverview();
      const sz = await caregiverStorage.getSafeZoneStatus();
      const sh = await caregiverStorage.getShiftHandoff();
      const wd = await caregiverStorage.getWearableData();
      setProfile(p);
      setTodaySummary(summary);
      setAttentionItems(attention);
      setSafeZone(sz);
      setShiftHandoff(sh);
      setWearableData(wd);
    } catch (e) {
      console.warn("Failed to load caregiver home data:", e);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    loadData();

    // Real-time live hardware WebSocket subscription
    const unsubscribe = iotSensorService.subscribe((telemetry, geofence) => {
      if (telemetry.connected && telemetry.heart_rate !== null) {
        setWearableData((prev: WearableHealthData | null) => ({
          connected: true,
          deviceName: telemetry.device_name,
          device_name: telemetry.device_name,
          heart_rate: telemetry.heart_rate ?? undefined,
          restingHeartRate: telemetry.heart_rate ?? undefined,
          spo2: telemetry.spo2 ?? undefined,
          spO2: telemetry.spo2 ?? undefined,
          body_temp_c: telemetry.body_temp_c ?? undefined,
          steps: telemetry.steps,
          battery_pct: telemetry.battery_pct,
          lastSync: telemetry.last_sync_timestamp || undefined,
          last_sync: telemetry.last_sync_timestamp || undefined,
          disclaimer: "Live stream directly from ESP32 & SQLite DB",
        }));
      }
      if (geofence && geofence.last_seen) {
        setSafeZone((prev: SafeZoneStatus | null) =>
          prev
            ? {
                ...prev,
                isSafe: geofence.is_in_safe_zone,
                distanceMeters: Math.round(geofence.distance_from_home_m),
                currentLocationName: geofence.zone_name,
                activeAlert: !geofence.is_in_safe_zone,
              }
            : prev
        );
      }
    });

    return () => unsubscribe();
  }, [loadData]);

  const handleRingKioskChime = async () => {
    const res = await caregiverStorage.triggerKioskLocatorChime();
    Alert.alert("Locator Prompt Transmitted", res.message);
  };

  const handleToggleWanderingSimulation = async () => {
    if (!safeZone) return;
    const nextAlert = !safeZone.activeAlert;
    const updated = await caregiverStorage.toggleSafeZoneAlert(nextAlert);
    setSafeZone(updated);
    if (nextAlert) {
      Alert.alert(
        "🚨 Wandering Alert Active",
        "Elder detected near Tea Garden Gate (outside 150m boundary). ASHA worker & Family notified."
      );
    } else {
      Alert.alert("Safe-Zone Cleared", "Elder is confirmed safely back inside the courtyard perimeter.");
    }
  };

  const primaryAttention = attentionItems[0];

  const handleMarkAttentionDone = async (item: AttentionItem) => {
    if (item.actionType === "mark_done_med") {
      Alert.alert(
        "Mark Medication as Taken?",
        `${item.title} at ${item.dueTime || "scheduled time"}.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Mark Taken",
            onPress: async () => {
              await caregiverStorage.updateMedicationStatus("med-3", "done");
              loadData();
            },
          },
        ]
      );
    } else {
      router.push("/(patient)/reminders" as any);
    }
  };

  if (!profile || !todaySummary) {
    return (
      <View style={styles.loadingWrapper}>
        <Text style={styles.loadingText}>Loading care center...</Text>
      </View>
    );
  }

  // Calculate percentage of today's routine completion
  const totalTasks = todaySummary.medicationTotal + todaySummary.activitiesTotal;
  const doneTasks = todaySummary.medicationTaken + todaySummary.activitiesCompleted;
  const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 85;

  return (
    <View style={styles.screenWrapper}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={WarmPalette.roseDeep} />
        }
      >
        {/* ══════════ 1. ELDER STATUS HERO CARD ══════════ */}
        <View style={styles.heroCard}>
          <TouchableOpacity
            style={styles.heroLeft}
            onPress={() => setShowProfileModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarEmoji}>{profile.photoEmoji}</Text>
              <View style={styles.livePulseDot} />
            </View>
            <View style={styles.heroInfo}>
              <View style={styles.heroNameRow}>
                <Text style={styles.heroElderName}>{profile.name}</Text>
                <View style={styles.ageBadge}>
                  <Text style={styles.ageBadgeText}>{profile.age}y</Text>
                </View>
              </View>
              <View style={styles.moodPill}>
                <Text style={styles.moodPillText} numberOfLines={1}>
                  {profile.currentStatus}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={{ flexDirection: "row", gap: 6 }}>
            <TouchableOpacity
              style={[styles.kioskBtn, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}
              onPress={() => setShowBleModal(true)}
              activeOpacity={0.7}
            >
              <Feather name="bluetooth" size={13} color="#2563EB" />
              <Text style={[styles.kioskBtnText, { color: "#2563EB" }]}>BLE</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.kioskBtn, { backgroundColor: "#FEF2F2", borderColor: "#FECDD3" }]}
              onPress={() => setShowEmergencyModal(true)}
              activeOpacity={0.7}
            >
              <Feather name="phone-call" size={13} color="#DC2626" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.kioskBtn}
              onPress={() => router.push("/(patient)" as any)}
              activeOpacity={0.7}
            >
              <Feather name="external-link" size={13} color="#7C3AED" />
              <Text style={styles.kioskBtnText}>Kiosk</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ══════════ 2. TODAY ROUTINE PROGRESS HUB ══════════ */}
        <TouchableOpacity
          style={styles.progressHubCard}
          onPress={() => router.push("/(patient)/reminders" as any)}
          activeOpacity={0.88}
        >
          <View style={styles.progressHubHeader}>
            <View>
              <Text style={styles.hubHeaderSmall}>TODAY'S ROUTINE</Text>
              <Text style={styles.hubHeaderMain}>
                {doneTasks} of {totalTasks} Milestones Done
              </Text>
            </View>
            <View style={styles.percentageCircle}>
              <Text style={styles.percentageValue}>{progressPercent}%</Text>
            </View>
          </View>

          {/* Visual Progress Track Bar */}
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>

          {/* Glanceable 4-Pill Metric Grid with Live IoT Telemetry */}
          <View style={styles.metricCapsulesRow}>
            <View style={styles.metricCapsule}>
              <View style={[styles.capsuleIconBox, { backgroundColor: "#FFF7ED" }]}>
                <Feather name="shield" size={13} color="#EA580C" />
              </View>
              <View>
                <Text style={styles.capsuleValue}>
                  {todaySummary.medicationTaken}/{todaySummary.medicationTotal}
                </Text>
                <Text style={styles.capsuleLabel}>Meds</Text>
              </View>
            </View>

            <View style={styles.metricCapsule}>
              <View style={[styles.capsuleIconBox, { backgroundColor: "#EFF6FF" }]}>
                <Feather name="activity" size={13} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.capsuleValue}>
                  {todaySummary.activitiesCompleted}/{todaySummary.activitiesTotal}
                </Text>
                <Text style={styles.capsuleLabel}>Tasks</Text>
              </View>
            </View>

            <View style={styles.metricCapsule}>
              <View style={[styles.capsuleIconBox, { backgroundColor: "#F0FDF4" }]}>
                <Feather name="heart" size={13} color="#16A34A" />
              </View>
              <View>
                <Text style={styles.capsuleValue}>
                  {wearableData?.heart_rate ? `${wearableData.heart_rate} bpm` : "-- bpm"}
                </Text>
                <Text style={styles.capsuleLabel}>Pulse</Text>
              </View>
            </View>

            <View style={styles.metricCapsule}>
              <View style={[styles.capsuleIconBox, { backgroundColor: "#FAF5FF" }]}>
                <Feather name="zap" size={13} color="#7C3AED" />
              </View>
              <View>
                <Text style={styles.capsuleValue}>
                  {wearableData?.spo2 ? `${wearableData.spo2}%` : "--%"}
                </Text>
                <Text style={styles.capsuleLabel}>SpO2</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* ══════════ 3. VISUAL GRAMIN SURAKSHA RADAR CARD ══════════ */}
        {safeZone && (
          <View
            style={[
              styles.radarCard,
              safeZone.activeAlert && styles.radarCardAlert,
            ]}
          >
            <View style={styles.radarCardHeader}>
              <View style={styles.radarTitleGroup}>
                <View
                  style={[
                    styles.radarIconBox,
                    { backgroundColor: safeZone.activeAlert ? "#FEE2E2" : "#F0FDF4" },
                  ]}
                >
                  <Feather
                    name={safeZone.activeAlert ? "alert-triangle" : "shield"}
                    size={16}
                    color={safeZone.activeAlert ? "#DC2626" : "#16A34A"}
                  />
                </View>
                <View>
                  <Text style={styles.radarHeaderSmall}>GRAMIN SAFE-ZONE GEOFENCE</Text>
                  <Text style={styles.radarLocationTitle} numberOfLines={1}>
                    {safeZone.activeAlert ? "⚠️ Gate Boundary Alert (180m)" : safeZone.currentLocationName}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.radarStatusPill,
                  safeZone.activeAlert ? styles.pillAlert : styles.pillSafe,
                ]}
              >
                <View
                  style={[
                    styles.radarStatusDot,
                    { backgroundColor: safeZone.activeAlert ? "#DC2626" : "#16A34A" },
                  ]}
                />
                <Text
                  style={[
                    styles.radarStatusText,
                    safeZone.activeAlert ? styles.textAlert : styles.textSafe,
                  ]}
                >
                  {safeZone.activeAlert ? "BREACH" : "SAFE"}
                </Text>
              </View>
            </View>

            {/* Visual Mini Radar Concentric Bands */}
            <View style={styles.radarVisualContainer}>
              <View style={styles.radarOuterRing}>
                <View style={styles.radarMiddleRing}>
                  <View style={styles.radarInnerRing}>
                    {/* Elder Position Beacon */}
                    <View style={styles.radarBeacon}>
                      <Text style={{ fontSize: 11 }}>🧓</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.radarInfoSide}>
                <View style={styles.radarStatLine}>
                  <Feather name="navigation" size={12} color="#0D9488" />
                  <Text style={styles.radarStatText}>
                    {safeZone.activeAlert ? "180m outside" : `${safeZone.distanceMeters}m from porch`}
                  </Text>
                </View>
                <View style={styles.radarStatLine}>
                  <Feather name="clock" size={12} color="#0D9488" />
                  <Text style={styles.radarStatText}>{safeZone.lastMovementTime}</Text>
                </View>
                <View style={styles.radarStatLine}>
                  <Feather name="battery-charging" size={12} color="#16A34A" />
                  <Text style={styles.radarStatText}>{safeZone.beaconBatteryPct}% Beacon</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.radarActionRow}>
              <TouchableOpacity
                style={styles.radarPingBtn}
                onPress={handleRingKioskChime}
                activeOpacity={0.8}
              >
                <Feather name="volume-2" size={14} color="#2563EB" />
                <Text style={styles.radarPingBtnText}>Ring Tablet Chime</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.radarTestBtn,
                  safeZone.activeAlert && { backgroundColor: "#DC2626" },
                ]}
                onPress={handleToggleWanderingSimulation}
                activeOpacity={0.8}
              >
                <Feather
                  name={safeZone.activeAlert ? "check" : "radio"}
                  size={12}
                  color="#FFFFFF"
                />
                <Text style={styles.radarTestBtnText}>
                  {safeZone.activeAlert ? "Clear Alert" : "Test Boundary"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ══════════ 4. VISUAL SHIFT PROGRESSION TIMELINE ══════════ */}
        {shiftHandoff && (
          <TouchableOpacity
            style={styles.shiftCard}
            onPress={() => setShowShiftModal(true)}
            activeOpacity={0.85}
          >
            <View style={styles.shiftCardHeader}>
              <View style={styles.shiftTitleGroup}>
                <View style={styles.shiftIconBox}>
                  <Feather name="users" size={16} color="#7C3AED" />
                </View>
                <View>
                  <Text style={styles.shiftHeaderSmall}>FAMILY SHIFT HANDOFF</Text>
                  <Text style={styles.shiftTitleText}>
                    Day Shift (Anita) ➔ Night (Rahul)
                  </Text>
                </View>
              </View>
              <View style={styles.shiftManageBtn}>
                <Text style={styles.shiftManageBtnText}>Handoff</Text>
              </View>
            </View>

            {/* Visual Shift Timeline Sequence */}
            <View style={styles.shiftTimelineRow}>
              <View style={styles.timelineStep}>
                <View style={[styles.timelineStepDot, styles.stepDone]}>
                  <Feather name="check" size={10} color="#FFFFFF" />
                </View>
                <Text style={styles.timelineStepLabel}>Morning ☀️</Text>
              </View>
              <View style={styles.timelineConnectorLine} />
              <View style={styles.timelineStep}>
                <View style={[styles.timelineStepDot, styles.stepDone]}>
                  <Feather name="check" size={10} color="#FFFFFF" />
                </View>
                <Text style={styles.timelineStepLabel}>Afternoon 🌤️</Text>
              </View>
              <View style={styles.timelineConnectorLine} />
              <View style={styles.timelineStep}>
                <View style={[styles.timelineStepDot, styles.stepActive]}>
                  <View style={styles.innerPulse} />
                </View>
                <Text style={[styles.timelineStepLabel, { color: "#7C3AED", fontWeight: "800" }]}>
                  Evening 🌙
                </Text>
              </View>
              <View style={styles.timelineConnectorLine} />
              <View style={styles.timelineStep}>
                <View style={[styles.timelineStepDot, styles.stepPending]} />
                <Text style={styles.timelineStepLabel}>Night 🌌</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* ══════════ 5. NEEDS ATTENTION BANNER ══════════ */}
        {primaryAttention && (
          <View style={styles.attentionCard}>
            <View style={styles.attentionIconCircle}>
              <Feather name="alert-circle" size={20} color="#DC2626" />
            </View>
            <View style={styles.attentionContent}>
              <Text style={styles.attentionTitle} numberOfLines={1}>
                {primaryAttention.title}
              </Text>
              <Text style={styles.attentionDetail} numberOfLines={2}>
                {primaryAttention.dueTime ? `${primaryAttention.dueTime} · ` : ""}
                {primaryAttention.detail}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.attentionActionBtn}
              onPress={() => handleMarkAttentionDone(primaryAttention)}
              activeOpacity={0.8}
            >
              <Text style={styles.attentionActionBtnText}>{primaryAttention.actionLabel}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ══════════ 6. 2x2 APP ACTION TILES ══════════ */}
        <Text style={styles.sectionTitleLabel}>DAILY CARE HUBS</Text>
        <View style={styles.tilesGrid}>
          {/* Tile 1: Medicines */}
          <TouchableOpacity
            style={[styles.actionTile, { backgroundColor: "#FFF7ED", borderColor: "#FFEDD5" }]}
            onPress={() => router.push("/(patient)/reminders" as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.tileIconCircle, { backgroundColor: "#EA580C" }]}>
              <Feather name="shield" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.tileTitle}>Medicines</Text>
            <Text style={styles.tileSub}>1 Due at 8:00 PM</Text>
          </TouchableOpacity>

          {/* Tile 2: Activities & Games */}
          <TouchableOpacity
            style={[styles.actionTile, { backgroundColor: "#F0FDF4", borderColor: "#DCFCE7" }]}
            onPress={() => router.push("/(patient)/games" as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.tileIconCircle, { backgroundColor: "#16A34A" }]}>
              <Feather name="activity" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.tileTitle}>Cognitive Games</Text>
            <Text style={styles.tileSub}>Antakshari 86%</Text>
          </TouchableOpacity>

          {/* Tile 3: AI Scribe Note */}
          <TouchableOpacity
            style={[styles.actionTile, { backgroundColor: "#F5F3FF", borderColor: "#DDD6FE" }]}
            onPress={() => setShowNoteModal(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.tileIconCircle, { backgroundColor: "#7C3AED" }]}>
              <Feather name="mic" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.tileTitle}>AI Voice Scribe</Text>
            <Text style={styles.tileSub}>Log Clinical Note</Text>
          </TouchableOpacity>

          {/* Tile 4: Send Love to Kiosk */}
          <TouchableOpacity
            style={[styles.actionTile, { backgroundColor: "#FFF1F2", borderColor: "#FECDD3" }]}
            onPress={() => setShowSendModal(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.tileIconCircle, { backgroundColor: "#E11D48" }]}>
              <Feather name="send" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.tileTitle}>Send to Kiosk</Text>
            <Text style={styles.tileSub}>Audio, Photo, Song</Text>
          </TouchableOpacity>
        </View>

        {/* ══════════ 7. RECENT CLINICAL EVENT ROW ══════════ */}
        <TouchableOpacity
          style={styles.doctorBanner}
          onPress={() => router.push("/(patient)/reminders" as any)}
          activeOpacity={0.8}
        >
          <View style={styles.docIconCircle}>
            <Feather name="calendar" size={18} color="#2563EB" />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.docBannerTitle}>Dr. Ananya Sharma · Apollo Clinic</Text>
            <Text style={styles.docBannerSub}>Tomorrow · 10:30 AM Routine Follow-up</Text>
          </View>
          <Feather name="chevron-right" size={16} color={WarmPalette.charcoalWarm + "60"} />
        </TouchableOpacity>

        {/* ══════════ 8. 1-TAP EMERGENCY SOS BUTTON ══════════ */}
        <TouchableOpacity
          style={styles.emergencyBtn}
          onPress={() => setShowEmergencyModal(true)}
          activeOpacity={0.85}
        >
          <View style={styles.emergencyIconCircle}>
            <Feather name="shield" size={18} color="#DC2626" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.emergencyBtnText}>Emergency Assistance</Text>
            <Text style={styles.emergencyBtnSub}>1-Tap SOS 112 / 108 · Doctor & Ambulance</Text>
          </View>
          <Feather name="phone-call" size={16} color="#DC2626" />
        </TouchableOpacity>
      </ScrollView>

      {/* ── MODALS ─────────────────────────────────────────────────── */}
      <CaregiverPatientProfileModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        profile={profile}
      />

      <CaregiverEmergencyModal
        visible={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        profile={profile}
      />

      <CaregiverSendToElderModal
        visible={showSendModal}
        onClose={() => setShowSendModal(false)}
        elderName={profile.name}
      />

      <CaregiverShiftHandoffModal
        visible={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        onSaved={loadData}
      />

      <CaregiverCareNoteModal
        visible={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        onNoteAdded={loadData}
      />

      <CaregiverBleScannerModal
        visible={showBleModal}
        onClose={() => setShowBleModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loadingWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 96,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  heroLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 26,
  },
  livePulseDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  heroInfo: {
    flex: 1,
  },
  heroNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroElderName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  ageBadge: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ageBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  moodPill: {
    marginTop: 3,
  },
  moodPillText: {
    fontSize: 11.5,
    color: "#0D9488",
    fontWeight: "600",
  },
  kioskBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  kioskBtnText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#7C3AED",
  },
  progressHubCard: {
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
  progressHubHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  hubHeaderSmall: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.8,
  },
  hubHeaderMain: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  percentageCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ECFDF5",
    borderWidth: 2,
    borderColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  percentageValue: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#047857",
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 14,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 4,
  },
  metricCapsulesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metricCapsule: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 8,
    gap: 6,
  },
  capsuleIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  capsuleValue: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  capsuleLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  radarCard: {
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
  radarCardAlert: {
    borderColor: "#FECDD3",
    backgroundColor: "#FFF5F5",
  },
  radarCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  radarTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  radarIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  radarHeaderSmall: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.8,
  },
  radarLocationTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 1,
  },
  radarStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pillSafe: {
    backgroundColor: "#ECFDF5",
  },
  pillAlert: {
    backgroundColor: "#FEE2E2",
  },
  radarStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  radarStatusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  textSafe: {
    color: "#047857",
  },
  textAlert: {
    color: "#DC2626",
  },
  radarVisualContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDFA",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  radarOuterRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: "#99F6E4",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#CCFBF1",
  },
  radarMiddleRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#5EEAD4",
    alignItems: "center",
    justifyContent: "center",
  },
  radarInnerRing: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#2DD4BF",
    alignItems: "center",
    justifyContent: "center",
  },
  radarBeacon: {
    alignItems: "center",
    justifyContent: "center",
  },
  radarInfoSide: {
    flex: 1,
    marginLeft: 14,
    gap: 4,
  },
  radarStatLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  radarStatText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#134E4A",
  },
  radarActionRow: {
    flexDirection: "row",
    gap: 8,
  },
  radarPingBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  radarPingBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2563EB",
  },
  radarTestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F766E",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 5,
  },
  radarTestBtnText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  shiftCard: {
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
  shiftCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  shiftTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  shiftIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  shiftHeaderSmall: {
    fontSize: 10,
    fontWeight: "800",
    color: "#7C3AED",
    letterSpacing: 0.8,
  },
  shiftTitleText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 1,
  },
  shiftManageBtn: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  shiftManageBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6D28D9",
  },
  shiftTimelineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  timelineStep: {
    alignItems: "center",
    gap: 4,
  },
  timelineStepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDone: {
    backgroundColor: "#10B981",
  },
  stepActive: {
    backgroundColor: "#EDE9FE",
    borderWidth: 2,
    borderColor: "#7C3AED",
  },
  innerPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#7C3AED",
  },
  stepPending: {
    backgroundColor: "#CBD5E1",
  },
  timelineStepLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },
  timelineConnectorLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 4,
  },
  attentionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF1F2",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECDD3",
    padding: 12,
    marginBottom: 14,
  },
  attentionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  attentionContent: {
    flex: 1,
  },
  attentionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#991B1B",
  },
  attentionDetail: {
    fontSize: 11.5,
    color: "#B91C1C",
    marginTop: 2,
  },
  attentionActionBtn: {
    backgroundColor: "#DC2626",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
  },
  attentionActionBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  sectionTitleLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  tilesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  actionTile: {
    width: "48%",
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  tileIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  tileTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  tileSub: {
    fontSize: 11.5,
    color: "#475569",
    marginTop: 2,
    fontWeight: "600",
  },
  doctorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  docIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  docBannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  docBannerSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  emergencyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECDD3",
    padding: 12,
    marginTop: 4,
    marginBottom: 8,
    gap: 10,
  },
  emergencyIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  emergencyBtnText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#DC2626",
    letterSpacing: 0.2,
  },
  emergencyBtnSub: {
    fontSize: 11,
    color: "#B91C1C",
    marginTop: 1,
  },
});
