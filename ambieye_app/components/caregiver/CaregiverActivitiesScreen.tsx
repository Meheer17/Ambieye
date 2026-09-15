import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { WarmPalette } from "../../constants/theme";
import {
  caregiverStorage,
  CognitiveGameSession,
  CaregiverActivity,
} from "../../utils/caregiverStorage";
import { reminderStorage, DailyHydration } from "../../utils/reminderStorage";

import { CaregiverAddActivityModal } from "./CaregiverAddActivityModal";

export const CaregiverActivitiesScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"routines" | "games" | "offline">("routines");

  const [activities, setActivities] = useState<CaregiverActivity[]>([]);
  const [gameSessions, setGameSessions] = useState<CognitiveGameSession[]>([]);
  const [hydration, setHydration] = useState<DailyHydration>({ date: "", glassesDrunk: 6, dailyGoal: 8 });
  const [refreshing, setRefreshing] = useState(false);

  // Modal
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const acts = await caregiverStorage.getActivities();
      const sessions = await caregiverStorage.getGameSessions();
      const hyd = await reminderStorage.getTodayHydration();
      setActivities(acts);
      setGameSessions(sessions);
      if (hyd && hyd.glassesDrunk !== undefined) {
        setHydration(hyd);
      }
    } catch (e) {
      console.warn("Failed to load activities data:", e);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleActivity = async (id: string, currentStatus: boolean) => {
    try {
      await caregiverStorage.toggleActivityCompletion(id, !currentStatus);
      loadData();
    } catch (e) {
      console.warn("Failed to toggle activity status:", e);
    }
  };

  const handleAddGlass = async () => {
    const updated = await reminderStorage.addWaterGlass();
    setHydration(updated);
  };

  const completedActivities = activities.filter((a) => a.completed).length;

  return (
    <View style={styles.screenWrapper}>
      {/* ── SCREEN TITLE ─────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Activities & Engagement</Text>
        <Text style={styles.topBarSubtitle}>
          Daily schedule, cognitive recall & offline sensory stimulation
        </Text>
      </View>

      {/* ── 3-WAY SEGMENTED CONTROL ───────────────────────────────────── */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "routines" && styles.segmentBtnActive]}
          onPress={() => setActiveTab("routines")}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentBtnText, activeTab === "routines" && styles.segmentBtnTextActive]}>
            Today Schedule
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "games" && styles.segmentBtnActive]}
          onPress={() => setActiveTab("games")}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentBtnText, activeTab === "games" && styles.segmentBtnTextActive]}>
            Game Metrics
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "offline" && styles.segmentBtnActive]}
          onPress={() => setActiveTab("offline")}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentBtnText, activeTab === "offline" && styles.segmentBtnTextActive]}>
            Sensory Ideas
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
        {/* ══════════ 1. DAILY ROUTINES SUB-VIEW ══════════ */}
        {activeTab === "routines" && (
          <View>
            {/* Visual Interactive Hydration Bar */}
            <View style={styles.hydrationVisualCard}>
              <View style={styles.hydrationHeaderRow}>
                <View style={styles.hydrationLeftGroup}>
                  <View style={styles.waterDropCircle}>
                    <Feather name="droplet" size={18} color="#2563EB" />
                  </View>
                  <View>
                    <Text style={styles.cardHeaderLabel}>DAILY HYDRATION</Text>
                    <Text style={styles.hydrationCountText}>
                      {hydration.glassesDrunk} of {hydration.dailyGoal} Glasses
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.addWaterPill}
                  onPress={handleAddGlass}
                  activeOpacity={0.8}
                >
                  <Feather name="plus" size={14} color="#2563EB" />
                  <Text style={styles.addWaterPillText}>+1 Glass</Text>
                </TouchableOpacity>
              </View>

              {/* 8 Visual Glasses Grid */}
              <View style={styles.glassesRow}>
                {Array.from({ length: hydration.dailyGoal || 8 }).map((_, idx) => {
                  const isDrunk = idx < hydration.glassesDrunk;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.glassIconBox, isDrunk && styles.glassBoxActive]}
                      onPress={handleAddGlass}
                      activeOpacity={0.7}
                    >
                      <Feather
                        name="droplet"
                        size={14}
                        color={isDrunk ? "#FFFFFF" : "#94A3B8"}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Header with Add Button */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>
                TODAY'S SCHEDULE ({completedActivities}/{activities.length} done)
              </Text>
              <TouchableOpacity
                style={styles.addActBtn}
                onPress={() => setShowAddActivityModal(true)}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={14} color="#FFFFFF" />
                <Text style={styles.addActBtnText}>Add Activity</Text>
              </TouchableOpacity>
            </View>

            {/* Visual Activity Cards */}
            <View style={styles.listSection}>
              {activities.map((act) => {
                const isDone = act.completed;
                return (
                  <TouchableOpacity
                    key={act.id}
                    style={[styles.actCard, isDone && styles.actCardDone]}
                    onPress={() => handleToggleActivity(act.id, isDone)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.checkCircle, isDone && styles.checkCircleDone]}>
                      {isDone && <Feather name="check" size={16} color="#FFFFFF" />}
                    </View>

                    <View style={styles.actContent}>
                      <View style={styles.actTitleRow}>
                        <Text style={[styles.actTitle, isDone && styles.actTitleDone]}>
                          {act.title}
                        </Text>
                        <View style={styles.timeTag}>
                          <Text style={styles.timeTagText}>{act.timeLabel}</Text>
                        </View>
                      </View>
                      {act.notes ? (
                        <Text style={styles.actDesc}>{act.notes}</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ══════════ 2. COGNITIVE SESSIONS SUB-VIEW ══════════ */}
        {activeTab === "games" && (
          <View>
            {/* Visual Cognitive Health Hub */}
            <View style={styles.cognitiveScoreCard}>
              <View style={styles.cognitiveScoreTop}>
                <View>
                  <Text style={styles.cardHeaderLabel}>COGNITIVE AGILITY SCORE</Text>
                  <Text style={styles.cognitiveScoreMain}>88% Overall Recall</Text>
                  <Text style={styles.cognitiveScoreSub}>Steady performance across lyrical & motif recall</Text>
                </View>
                <View style={styles.scoreDial}>
                  <Text style={styles.scoreDialVal}>88</Text>
                  <Text style={styles.scoreDialMax}>/100</Text>
                </View>
              </View>

              <View style={styles.cognitiveMetricsGrid}>
                <View style={styles.cogMetricPill}>
                  <Feather name="zap" size={13} color="#D97706" />
                  <Text style={styles.cogMetricText}>2.3s Avg Response</Text>
                </View>
                <View style={styles.cogMetricPill}>
                  <Feather name="check-circle" size={13} color="#16A34A" />
                  <Text style={styles.cogMetricText}>4 of 4 Games Won</Text>
                </View>
                <View style={styles.cogMetricPill}>
                  <Feather name="trending-up" size={13} color="#2563EB" />
                  <Text style={styles.cogMetricText}>Level 2 ➔ 3 Ready</Text>
                </View>
              </View>
            </View>

            {/* Session History List */}
            <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
              <Text style={styles.sectionHeaderTitle}>RECENT SESSIONS</Text>
            </View>

            <View style={styles.listSection}>
              {gameSessions.map((s) => (
                <View key={s.id} style={styles.sessionCard}>
                  <View style={styles.sessionHeaderRow}>
                    <View style={styles.sessionGameType}>
                      <Text style={{ fontSize: 20 }}>{s.iconEmoji || "🎵"}</Text>
                      <View style={{ marginLeft: 10 }}>
                        <Text style={styles.sessionGameName}>{s.gameName}</Text>
                        <Text style={styles.sessionTime}>{s.timestamp}</Text>
                      </View>
                    </View>
                    <View style={styles.sessionScoreBadge}>
                      <Text style={styles.sessionScoreText}>{s.accuracyPercent}%</Text>
                    </View>
                  </View>

                  <View style={styles.sessionStatsBar}>
                    <Text style={styles.sessionStatItem}>⏱️ {s.durationMinutes}m duration</Text>
                    <Text style={styles.sessionStatItem}>⚡ {s.responseTime}</Text>
                    <Text style={styles.sessionStatItem}>🎯 {s.score} pts</Text>
                  </View>

                  <Text style={styles.sessionSummaryText}>{s.humanSummary}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ══════════ 3. OFFLINE SENSORY IDEAS SUB-VIEW ══════════ */}
        {activeTab === "offline" && (
          <View>
            <View style={styles.sensoryHeroCard}>
              <Feather name="compass" size={24} color="#D97706" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.sensoryHeroTitle}>Real-World Sensory Stimulation</Text>
                <Text style={styles.sensoryHeroSub}>
                  Dementia therapy works best when paired with familiar physical textures, scents, and music.
                </Text>
              </View>
            </View>

            <View style={styles.sensoryGrid}>
              <View style={[styles.sensoryCard, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}>
                <View style={styles.sensoryCardHeader}>
                  <Text style={{ fontSize: 24 }}>🪴</Text>
                  <View style={styles.sensoryTag}>
                    <Text style={styles.sensoryTagText}>Tactile & Nature</Text>
                  </View>
                </View>
                <Text style={styles.sensoryTitle}>Tulsi & Orchid Care</Text>
                <Text style={styles.sensoryDesc}>
                  Watering flowerpots and feeling the fresh leaves in morning sunlight reduces restlessness.
                </Text>
              </View>

              <View style={[styles.sensoryCard, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
                <View style={styles.sensoryCardHeader}>
                  <Text style={{ fontSize: 24 }}>📻</Text>
                  <View style={styles.sensoryTag}>
                    <Text style={styles.sensoryTagText}>Auditory Recall</Text>
                  </View>
                </View>
                <Text style={styles.sensoryTitle}>Akashvani Folk Radio</Text>
                <Text style={styles.sensoryDesc}>
                  Play 1980s Bihu folk songs during afternoon tea to encourage natural humming and nostalgia.
                </Text>
              </View>

              <View style={[styles.sensoryCard, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
                <View style={styles.sensoryCardHeader}>
                  <Text style={{ fontSize: 24 }}>☕</Text>
                  <View style={styles.sensoryTag}>
                    <Text style={styles.sensoryTagText}>Aromatherapy</Text>
                  </View>
                </View>
                <Text style={styles.sensoryTitle}>Tea Garden Spice Sorting</Text>
                <Text style={styles.sensoryDesc}>
                  Ask elder to smell cardamom vs clove seeds in the kitchen to awaken sensory pathways.
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── MODALS ─────────────────────────────────────────────────── */}
      <CaregiverAddActivityModal
        visible={showAddActivityModal}
        onClose={() => setShowAddActivityModal(false)}
        onAdded={loadData}
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
    fontSize: 12.5,
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
  hydrationVisualCard: {
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
  hydrationHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  hydrationLeftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  waterDropCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.8,
  },
  hydrationCountText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 1,
  },
  addWaterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addWaterPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2563EB",
  },
  glassesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  glassIconBox: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  glassBoxActive: {
    backgroundColor: "#2563EB",
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
  addActBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0F172A",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addActBtnText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  listSection: {
    gap: 8,
  },
  actCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  actCardDone: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
  actContent: {
    flex: 1,
  },
  actTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
  },
  actTitleDone: {
    color: "#94A3B8",
    textDecorationLine: "line-through",
  },
  timeTag: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 6,
  },
  timeTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  actDesc: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },
  cognitiveScoreCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cognitiveScoreTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cognitiveScoreMain: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  cognitiveScoreSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
    maxWidth: 210,
  },
  scoreDial: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F0FDF4",
    borderWidth: 2,
    borderColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreDialVal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#047857",
  },
  scoreDialMax: {
    fontSize: 9,
    fontWeight: "700",
    color: "#059669",
  },
  cognitiveMetricsGrid: {
    flexDirection: "row",
    gap: 6,
  },
  cogMetricPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 4,
  },
  cogMetricText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#334155",
  },
  sessionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  sessionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sessionGameType: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sessionGameName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  sessionTime: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  sessionScoreBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sessionScoreText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#047857",
  },
  sessionStatsBar: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#F8FAFC",
    padding: 8,
    borderRadius: 8,
  },
  sessionStatItem: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  sessionSummaryText: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 16,
  },
  sensoryHeroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginBottom: 12,
  },
  sensoryHeroTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#92400E",
  },
  sensoryHeroSub: {
    fontSize: 11.5,
    color: "#B45309",
    marginTop: 2,
    lineHeight: 16,
  },
  sensoryGrid: {
    gap: 10,
  },
  sensoryCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 6,
  },
  sensoryCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sensoryTag: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sensoryTagText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#475569",
  },
  sensoryTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  sensoryDesc: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 17,
  },
});
