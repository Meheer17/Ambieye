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
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { WarmPalette } from "../../constants/theme";
import {
  caregiverStorage,
  PatientProfile,
  TodaySummaryData,
  AttentionItem,
  WeeklySummaryData,
  FamilySentItem,
} from "../../utils/caregiverStorage";

import CaregiverPatientProfileModal from "./CaregiverPatientProfileModal";
import { CaregiverEmergencyModal } from "./CaregiverEmergencyModal";
import { CaregiverSendToElderModal } from "./CaregiverSendToElderModal";
import { CaregiverCareNoteModal } from "./CaregiverCareNoteModal";
import { CaregiverServicesModal } from "./CaregiverServicesModal";
import { CaregiverArticlesModal } from "./CaregiverArticlesModal";
import { CaregiverMemoryBankModal } from "./CaregiverMemoryBankModal";

interface Props {
  onSwitchToElderly?: () => void;
}

export const CaregiverTodayScreen: React.FC<Props> = ({ onSwitchToElderly }) => {
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Active View Tab: "today" (Screen-tight daily pulse) | "trends" (Weekly analysis & memory)
  const [activeSegment, setActiveSegment] = useState<"today" | "trends">("today");

  // Data States
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [todaySummary, setTodaySummary] = useState<TodaySummaryData | null>(null);
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummaryData | null>(null);
  const [recentSent, setRecentSent] = useState<FamilySentItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Modals States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showCareNoteModal, setShowCareNoteModal] = useState(false);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [showArticlesModal, setShowArticlesModal] = useState(false);
  const [showMemoryModal, setShowMemoryModal] = useState(false);

  const loadAllData = useCallback(async () => {
    try {
      const p = await caregiverStorage.getPatientProfile();
      const { summary, attention } = await caregiverStorage.getTodayOverview();
      const wk = await caregiverStorage.getWeeklySummary();
      const sent = await caregiverStorage.getFamilySentItems();

      setProfile(p);
      setTodaySummary(summary);
      setAttentionItems(attention);
      setWeeklySummary(wk);
      setRecentSent(sent.slice(0, 2));
    } catch (e) {
      console.warn("Error loading caregiver dashboard data:", e);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }, [loadAllData]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleAttentionAction = (item: AttentionItem) => {
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
              loadAllData();
            },
          },
        ]
      );
    } else if (item.actionType === "view_sleep") {
      router.push("/(patient)/reminders" as any);
    } else if (item.actionType === "view_appointment") {
      router.push("/(patient)/queries" as any);
    } else if (item.actionType === "view_activity") {
      router.push("/(patient)/reminders" as any);
    }
  };

  if (!profile || !todaySummary) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading care overview...</Text>
      </View>
    );
  }

  const primaryAttention = attentionItems[0];

  return (
    <View style={styles.container}>
      {/* ── 1. COMPACT SCREEN-TIGHT PATIENT HEADER ─────────────────────── */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.patientBadge}
          onPress={() => setShowProfileModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>{profile.photoEmoji}</Text>
          </View>
          <View style={styles.patientBadgeTexts}>
            <View style={styles.patientNameRow}>
              <Text style={styles.patientName}>{profile.name}</Text>
              <View style={styles.statusLiveDot} />
            </View>
            <Text style={styles.patientSub}>
              Age {profile.age} • {profile.currentStatus}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={WarmPalette.charcoalWarm + "60"} />
        </TouchableOpacity>

        {onSwitchToElderly && (
          <TouchableOpacity
            style={styles.modePill}
            onPress={onSwitchToElderly}
            activeOpacity={0.8}
          >
            <Text style={styles.modePillEmoji}>🧓</Text>
            <Text style={styles.modePillText}>Senior Kiosk</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── 2. SEGMENTED CONTROL: [ Today's Pulse ] | [ Trends & History ] ─ */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === "today" && styles.segmentBtnActive]}
          onPress={() => setActiveSegment("today")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="sunny"
            size={16}
            color={activeSegment === "today" ? "#FFFFFF" : WarmPalette.charcoalWarm}
          />
          <Text
            style={[styles.segmentBtnText, activeSegment === "today" && styles.segmentBtnTextActive]}
          >
            Today's Pulse
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === "trends" && styles.segmentBtnActive]}
          onPress={() => setActiveSegment("trends")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="trending-up"
            size={16}
            color={activeSegment === "trends" ? "#FFFFFF" : WarmPalette.charcoalWarm}
          />
          <Text
            style={[styles.segmentBtnText, activeSegment === "trends" && styles.segmentBtnTextActive]}
          >
            Weekly & Memory
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.bodyScroll}
        contentContainerStyle={styles.bodyScrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[WarmPalette.roseDusty]}
            tintColor={WarmPalette.roseDusty}
          />
        }
      >
        {activeSegment === "today" ? (
          <>
            {/* ── 3. FOUR LARGE-ICON VITAL GLANCE TILES (2x2 Screen-Tight Grid) ─ */}
            <View style={styles.tilesGrid}>
              {/* Tile 1: Medication */}
              <TouchableOpacity
                style={[styles.vitalTile, { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" }]}
                onPress={() => router.push("/(patient)/reminders" as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.tileIconCircle, { backgroundColor: "#FFEDD5" }]}>
                  <Ionicons name="medical" size={26} color="#EA580C" />
                </View>
                <View style={styles.tileTexts}>
                  <Text style={styles.tileCategory}>MEDICATION</Text>
                  <Text style={[styles.tileMetric, { color: "#9A3412" }]}>
                    ✓ {todaySummary.medicationTaken} / {todaySummary.medicationTotal}
                  </Text>
                  <Text style={styles.tileSub}>Evening due 8 PM</Text>
                </View>
              </TouchableOpacity>

              {/* Tile 2: Sleep */}
              <TouchableOpacity
                style={[styles.vitalTile, { backgroundColor: "#F5F3FF", borderColor: "#DDD6FE" }]}
                onPress={() => router.push("/(patient)/reminders" as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.tileIconCircle, { backgroundColor: "#EDE9FE" }]}>
                  <Ionicons name="moon" size={26} color="#7C3AED" />
                </View>
                <View style={styles.tileTexts}>
                  <Text style={styles.tileCategory}>SLEEP</Text>
                  <Text style={[styles.tileMetric, { color: "#5B21B6" }]}>
                    {todaySummary.sleepDuration}
                  </Text>
                  <Text style={styles.tileSub}>{todaySummary.sleepStatus}</Text>
                </View>
              </TouchableOpacity>

              {/* Tile 3: Activities */}
              <TouchableOpacity
                style={[styles.vitalTile, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}
                onPress={() => router.push("/(patient)/reminders" as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.tileIconCircle, { backgroundColor: "#DCFCE7" }]}>
                  <Ionicons name="walk" size={26} color="#16A34A" />
                </View>
                <View style={styles.tileTexts}>
                  <Text style={styles.tileCategory}>ACTIVITIES</Text>
                  <Text style={[styles.tileMetric, { color: "#166534" }]}>
                    {todaySummary.activitiesCompleted} / {todaySummary.activitiesTotal}
                  </Text>
                  <Text style={styles.tileSub}>Walk & chair stretch</Text>
                </View>
              </TouchableOpacity>

              {/* Tile 4: Cognitive Games */}
              <TouchableOpacity
                style={[styles.vitalTile, { backgroundColor: "#FDF2F8", borderColor: "#FBCFE8" }]}
                onPress={() => router.push("/(patient)/games" as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.tileIconCircle, { backgroundColor: "#FCE7F3" }]}>
                  <Ionicons name="game-controller" size={26} color="#DB2777" />
                </View>
                <View style={styles.tileTexts}>
                  <Text style={styles.tileCategory}>COGNITIVE</Text>
                  <Text style={[styles.tileMetric, { color: "#9D174D" }]}>
                    {todaySummary.gamesPlayed} Played
                  </Text>
                  <Text style={styles.tileSub}>Antakshari & Match</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* ── 4. COMPACT "NEEDS ATTENTION" BANNER ────────────────────── */}
            {primaryAttention && (
              <View style={styles.attentionBanner}>
                <View style={styles.attentionIconBadge}>
                  <Ionicons name="alert-circle" size={20} color={WarmPalette.roseDusty} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.attentionTitle}>{primaryAttention.title}</Text>
                  <Text style={styles.attentionDetail}>{primaryAttention.detail}</Text>
                </View>
                <TouchableOpacity
                  style={styles.attentionActionBtn}
                  onPress={() => handleAttentionAction(primaryAttention)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.attentionActionText}>{primaryAttention.actionLabel}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── 5. LARGE-ICON STANDARD MOBILE ACTION DOCK ─────────────── */}
            <View style={styles.actionDockSection}>
              <Text style={styles.dockHeading}>QUICK CAREGIVER ACTIONS</Text>
              <View style={styles.actionDockRow}>
                {/* Send Something */}
                <TouchableOpacity
                  style={styles.dockItem}
                  onPress={() => setShowSendModal(true)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.dockIconCircle, { backgroundColor: "#FFF1F2" }]}>
                    <Ionicons name="paper-plane" size={26} color="#E11D48" />
                  </View>
                  <Text style={styles.dockItemLabel}>Send Love</Text>
                </TouchableOpacity>

                {/* Log Note */}
                <TouchableOpacity
                  style={styles.dockItem}
                  onPress={() => setShowCareNoteModal(true)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.dockIconCircle, { backgroundColor: "#ECFDF5" }]}>
                    <Ionicons name="create" size={26} color="#059669" />
                  </View>
                  <Text style={styles.dockItemLabel}>Log Note</Text>
                </TouchableOpacity>

                {/* Emergency */}
                <TouchableOpacity
                  style={styles.dockItem}
                  onPress={() => setShowEmergencyModal(true)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.dockIconCircle, { backgroundColor: "#FEF2F2" }]}>
                    <Ionicons name="shield-checkmark" size={26} color="#DC2626" />
                  </View>
                  <Text style={[styles.dockItemLabel, { color: "#DC2626" }]}>Emergency</Text>
                </TouchableOpacity>

                {/* Care Services */}
                <TouchableOpacity
                  style={styles.dockItem}
                  onPress={() => setShowServicesModal(true)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.dockIconCircle, { backgroundColor: "#F5F3FF" }]}>
                    <Ionicons name="medkit" size={26} color="#7C3AED" />
                  </View>
                  <Text style={styles.dockItemLabel}>Services</Text>
                </TouchableOpacity>

                {/* Guides */}
                <TouchableOpacity
                  style={styles.dockItem}
                  onPress={() => setShowArticlesModal(true)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.dockIconCircle, { backgroundColor: "#FFFBEB" }]}>
                    <Ionicons name="bulb" size={26} color="#D97706" />
                  </View>
                  <Text style={styles.dockItemLabel}>Guides</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <>
            {/* ── 6. WEEKLY AT A GLANCE (Under Trends Segment) ──────────── */}
            {weeklySummary && (
              <View style={styles.trendsContainer}>
                {/* Stats Header Card */}
                <View style={styles.weeklyCard}>
                  <Text style={styles.weeklyCardTitle}>THIS WEEK'S SUMMARY</Text>
                  <View style={styles.weeklyRow}>
                    <View style={styles.weeklyStatBox}>
                      <Text style={styles.weeklyStatNumber}>{weeklySummary.gamesPlayed}</Text>
                      <Text style={styles.weeklyStatLabel}>Games</Text>
                    </View>
                    <View style={styles.weeklyDivider} />
                    <View style={styles.weeklyStatBox}>
                      <Text style={styles.weeklyStatNumber}>{weeklySummary.activitiesCompleted}</Text>
                      <Text style={styles.weeklyStatLabel}>Activities</Text>
                    </View>
                    <View style={styles.weeklyDivider} />
                    <View style={styles.weeklyStatBox}>
                      <Text style={styles.weeklyStatNumber}>{weeklySummary.medicationAdherencePercent}%</Text>
                      <Text style={styles.weeklyStatLabel}>Meds Taken</Text>
                    </View>
                    <View style={styles.weeklyDivider} />
                    <View style={styles.weeklyStatBox}>
                      <Text style={styles.weeklyStatNumber}>{weeklySummary.avgSleepDuration}</Text>
                      <Text style={styles.weeklyStatLabel}>Avg Sleep</Text>
                    </View>
                  </View>
                </View>

                {/* "What Changed This Week?" */}
                <View style={styles.whatChangedBox}>
                  <View style={styles.whatChangedHeaderRow}>
                    <Ionicons name="sparkles" size={16} color={WarmPalette.roseDusty} />
                    <Text style={styles.whatChangedHeading}>What changed this week?</Text>
                  </View>
                  {weeklySummary.whatChanged.map((c, i) => (
                    <View key={i} style={styles.changeBulletRow}>
                      <Text style={styles.changeBulletPoint}>•</Text>
                      <Text style={styles.changeBulletText}>{c}</Text>
                    </View>
                  ))}
                </View>

                {/* Quick Family Memory Bank Access */}
                <TouchableOpacity
                  style={styles.memoryBankCard}
                  onPress={() => setShowMemoryModal(true)}
                  activeOpacity={0.85}
                >
                  <View style={styles.memoryBankIconBox}>
                    <Ionicons name="images" size={22} color={WarmPalette.roseDusty} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.memoryBankTitle}>{profile.name}'s Memory Bank</Text>
                    <Text style={styles.memoryBankSub}>
                      Family songs, places, childhood stories & photos
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={WarmPalette.charcoalWarm + "70"} />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── ALL CAREGIVER MODALS ───────────────────────────────────────── */}
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
        onItemSent={loadAllData}
      />

      <CaregiverCareNoteModal
        visible={showCareNoteModal}
        onClose={() => setShowCareNoteModal(false)}
        onNoteAdded={loadAllData}
      />

      <CaregiverServicesModal
        visible={showServicesModal}
        onClose={() => setShowServicesModal(false)}
        elderName={profile.name}
      />

      <CaregiverArticlesModal
        visible={showArticlesModal}
        onClose={() => setShowArticlesModal(false)}
      />

      <CaregiverMemoryBankModal
        visible={showMemoryModal}
        onClose={() => setShowMemoryModal(false)}
        elderName={profile.name}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WarmPalette.ivory,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WarmPalette.ivory,
    padding: 30,
  },
  loadingText: {
    fontSize: 14,
    color: WarmPalette.charcoalWarm + "90",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  patientBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.cream,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flex: 1,
    marginRight: 10,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: WarmPalette.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: {
    fontSize: 22,
  },
  patientBadgeTexts: {
    flex: 1,
    marginLeft: 10,
  },
  patientNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  patientName: {
    fontSize: 15,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
  },
  statusLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#16A34A",
  },
  patientSub: {
    fontSize: 11,
    color: WarmPalette.charcoalWarm + "90",
    marginTop: 1,
  },
  modePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  modePillEmoji: {
    fontSize: 14,
  },
  modePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: WarmPalette.sand + "60",
    borderRadius: 14,
    padding: 3,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 10,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 11,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: WarmPalette.roseDusty,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  segmentBtnTextActive: {
    color: "#FFFFFF",
  },
  bodyScroll: {
    flex: 1,
  },
  bodyScrollContent: {
    paddingHorizontal: 14,
    paddingBottom: 76,
    flexGrow: 1,
  },
  tilesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  vitalTile: {
    width: "48%",
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  tileIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  tileTexts: {
    flex: 1,
    marginLeft: 10,
  },
  tileCategory: {
    fontSize: 10,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm + "80",
    letterSpacing: 0.5,
  },
  tileMetric: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
  tileSub: {
    fontSize: 10,
    color: WarmPalette.charcoalWarm + "80",
    marginTop: 2,
  },
  attentionBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBFB",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: WarmPalette.roseDusty,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 8,
  },
  attentionIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFE4E6",
    alignItems: "center",
    justifyContent: "center",
  },
  attentionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
  },
  attentionDetail: {
    fontSize: 11,
    color: WarmPalette.charcoalWarm + "90",
    marginTop: 2,
  },
  attentionActionBtn: {
    backgroundColor: WarmPalette.roseDusty,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginLeft: 8,
  },
  attentionActionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  actionDockSection: {
    backgroundColor: WarmPalette.cream,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  dockHeading: {
    fontSize: 10,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm + "70",
    letterSpacing: 0.6,
    textAlign: "center",
    marginBottom: 8,
  },
  actionDockRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  dockItem: {
    alignItems: "center",
  },
  dockIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: WarmPalette.sand,
    marginBottom: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  dockItemLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
    textAlign: "center",
  },
  trendsContainer: {
    gap: 12,
  },
  weeklyCard: {
    backgroundColor: WarmPalette.cream,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    padding: 14,
  },
  weeklyCardTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm + "80",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  weeklyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  weeklyStatBox: {
    flex: 1,
    alignItems: "center",
  },
  weeklyStatNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
  },
  weeklyStatLabel: {
    fontSize: 10,
    color: WarmPalette.charcoalWarm + "80",
    marginTop: 2,
    textAlign: "center",
  },
  weeklyDivider: {
    width: 1,
    height: 26,
    backgroundColor: WarmPalette.sand,
  },
  whatChangedBox: {
    backgroundColor: WarmPalette.cream,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    padding: 14,
  },
  whatChangedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  whatChangedHeading: {
    fontSize: 12,
    fontWeight: "800",
    color: WarmPalette.roseDusty,
    letterSpacing: 0.5,
  },
  changeBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 6,
  },
  changeBulletPoint: {
    fontSize: 13,
    fontWeight: "800",
    color: WarmPalette.roseDusty,
    marginRight: 6,
  },
  changeBulletText: {
    flex: 1,
    fontSize: 12,
    color: WarmPalette.charcoalWarm,
    lineHeight: 17,
  },
  memoryBankCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.cream,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    padding: 14,
  },
  memoryBankIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: WarmPalette.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  memoryBankTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  memoryBankSub: {
    fontSize: 11,
    color: WarmPalette.charcoalWarm + "80",
    marginTop: 2,
  },
});
