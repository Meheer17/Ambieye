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
  CognitiveGameSession,
  CaregiverActivity,
} from "../../utils/caregiverStorage";
import { CaregiverAddActivityModal } from "./CaregiverAddActivityModal";

export const CaregiverGamesScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [gameSessions, setGameSessions] = useState<CognitiveGameSession[]>([]);
  const [activities, setActivities] = useState<CaregiverActivity[]>([]);
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "games" | "real_world">("all");

  const loadData = useCallback(async () => {
    try {
      const sessions = await caregiverStorage.getGameSessions();
      const acts = await caregiverStorage.getActivities();
      setGameSessions(sessions);
      setActivities(acts.filter((a) => a.isRealWorldStimulation || a.category === "cognitive"));
    } catch (e) {
      console.warn("Failed to load caregiver cognitive engagement data:", e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cognitive Engagement & Real-World Stimulation</Text>
          <Text style={styles.headerSubtitle}>
            Track playful mental agility, focus, and offline family activities
          </Text>
        </View>

        {/* ── Medical Disclaimer Banner (Spec 3 & Spec 26) ───────────── */}
        <View style={styles.disclaimerBanner}>
          <Ionicons name="information-circle" size={18} color={WarmPalette.roseDusty} />
          <Text style={styles.disclaimerText}>
            Engagement and performance signals are designed to celebrate daily participation. They are NOT a medical diagnostic score.
          </Text>
        </View>

        {/* ── Human-Readable Performance Summaries (Spec 4) ──────────── */}
        <View style={styles.summarySection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>THIS WEEK'S HIGHLIGHTS</Text>
            <Text style={styles.sectionSubtitle}>Simple explanations</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryDot, { backgroundColor: "#16A34A" }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryHeading}>Antakshari Musical Engagement</Text>
                <Text style={styles.summaryDesc}>
                  Antakshari performance has been steady this week. Response time was slightly faster (2.4s avg), showing good lyrical recall.
                </Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.summaryRow}>
              <View style={[styles.summaryDot, { backgroundColor: "#2563EB" }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryHeading}>Memory Match Progression</Text>
                <Text style={styles.summaryDesc}>
                  The game increased in difficulty (Level 2 → 3) because recent pair responses were faster with fewer card misflips.
                </Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.summaryRow}>
              <View style={[styles.summaryDot, { backgroundColor: "#D97706" }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryHeading}>Visual Search Persistence</Text>
                <Text style={styles.summaryDesc}>
                  Find the Object had 92% accuracy with only 1 mistaken tap. Focused attention remained consistent throughout the session.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Filter Buttons ─────────────────────────────────────────── */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === "all" && styles.filterChipActive]}
            onPress={() => setSelectedFilter("all")}
          >
            <Text style={[styles.filterChipText, selectedFilter === "all" && styles.filterChipTextActive]}>
              All Engagement
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === "real_world" && styles.filterChipActive]}
            onPress={() => setSelectedFilter("real_world")}
          >
            <Text style={[styles.filterChipText, selectedFilter === "real_world" && styles.filterChipTextActive]}>
              Offline Real-World ({activities.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === "games" && styles.filterChipActive]}
            onPress={() => setSelectedFilter("games")}
          >
            <Text style={[styles.filterChipText, selectedFilter === "games" && styles.filterChipTextActive]}>
              App Games ({gameSessions.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Section: Real-World Cognitive Stimulation Outside the App (Spec 11) ─ */}
        {(selectedFilter === "all" || selectedFilter === "real_world") && (
          <View style={styles.realWorldSection}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionHeaderTitle}>REAL-WORLD COGNITIVE STIMULATION</Text>
                <Text style={styles.sectionSubtitle}>
                  Meaningful everyday family activities outside the screen
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addActivityBtn}
                onPress={() => setShowAddActivityModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addActivityBtnText}>Schedule</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.activitiesList}>
              {activities.map((act) => (
                <View key={act.id} style={styles.activityCard}>
                  <TouchableOpacity
                    style={[styles.checkCircle, act.completed && styles.checkCircleDone]}
                    onPress={() => handleToggleActivity(act.id, act.completed)}
                    activeOpacity={0.7}
                  >
                    {act.completed && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </TouchableOpacity>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.activityTitleRow}>
                      <Text
                        style={[
                          styles.activityTitle,
                          act.completed && { textDecorationLine: "line-through", color: WarmPalette.charcoalWarm + "70" },
                        ]}
                      >
                        {act.title}
                      </Text>
                      <Text style={styles.activityTime}>{act.timeLabel}</Text>
                    </View>

                    {act.suggestedPrompt ? (
                      <Text style={styles.activityPrompt}>"{act.suggestedPrompt}"</Text>
                    ) : null}

                    <View style={styles.activityMetaRow}>
                      <Text style={styles.activityDuration}>{act.duration}</Text>
                      {act.notes ? <Text style={styles.activityNotes}>• {act.notes}</Text> : null}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Section: Game Activity & Results (Spec 3) ───────────────── */}
        {(selectedFilter === "all" || selectedFilter === "games") && (
          <View style={styles.gamesSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>GAME ACTIVITY SESSIONS</Text>
              <Text style={styles.sectionSubtitle}>Detailed session breakdowns</Text>
            </View>

            <View style={styles.sessionsList}>
              {gameSessions.map((session) => (
                <View key={session.id} style={styles.sessionCard}>
                  {/* Top Bar of Session */}
                  <View style={styles.sessionCardHeader}>
                    <View style={styles.sessionIconCircle}>
                      <Text style={styles.sessionEmoji}>{session.iconEmoji}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.sessionGameName}>{session.gameName}</Text>
                      <Text style={styles.sessionTimestamp}>{session.timestamp}</Text>
                    </View>
                    <View style={styles.completedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                      <Text style={styles.completedBadgeText}>Completed</Text>
                    </View>
                  </View>

                  {/* Key Stats Grid */}
                  <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>SCORE</Text>
                      <Text style={styles.statValue}>{session.score}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>ACCURACY</Text>
                      <Text style={styles.statValue}>{session.accuracyPercent}%</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>DIFFICULTY</Text>
                      <Text style={styles.statValue}>{session.difficulty}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>RESPONSE</Text>
                      <Text style={[styles.statValue, { fontSize: 13, color: "#16A34A" }]}>
                        {session.responseTime.split(" ")[0]}
                      </Text>
                    </View>
                  </View>

                  {/* Human-readable Reason for Difficulty Change */}
                  {session.difficultyChangeReason ? (
                    <View style={styles.reasonCard}>
                      <Ionicons name="bulb-outline" size={15} color={WarmPalette.roseDusty} />
                      <Text style={styles.reasonText}>{session.difficultyChangeReason}</Text>
                    </View>
                  ) : null}

                  {/* Human Performance Note */}
                  <Text style={styles.humanSummaryText}>"{session.humanSummary}"</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Schedule Activity Modal */}
      <CaregiverAddActivityModal
        visible={showAddActivityModal}
        onClose={() => setShowAddActivityModal(false)}
        onAdded={loadData}
        defaultIsRealWorld={true}
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
    marginBottom: 12,
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
  disclaimerBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  disclaimerText: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm + "90",
    flex: 1,
    lineHeight: 16,
  },
  summarySection: {
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 8,
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
  summaryCard: {
    backgroundColor: WarmPalette.cream,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    padding: 14,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  summaryHeading: {
    fontSize: 13,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  summaryDesc: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm + "90",
    marginTop: 2,
    lineHeight: 17,
  },
  cardDivider: {
    height: 1,
    backgroundColor: WarmPalette.sand,
    marginVertical: 10,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: WarmPalette.cream,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
  },
  filterChipActive: {
    backgroundColor: WarmPalette.roseDusty,
    borderColor: WarmPalette.roseDusty,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: WarmPalette.charcoalWarm,
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  realWorldSection: {
    marginBottom: 20,
  },
  addActivityBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.roseDusty,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  addActivityBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  activitiesList: {
    gap: 10,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: WarmPalette.cream,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    padding: 12,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: WarmPalette.sand,
    backgroundColor: WarmPalette.ivory,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkCircleDone: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },
  activityTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
    flex: 1,
  },
  activityTime: {
    fontSize: 12,
    fontWeight: "600",
    color: WarmPalette.charcoalWarm + "80",
    marginLeft: 8,
  },
  activityPrompt: {
    fontSize: 12,
    fontStyle: "italic",
    color: WarmPalette.charcoalWarm + "90",
    marginTop: 3,
  },
  activityMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  activityDuration: {
    fontSize: 11,
    fontWeight: "700",
    color: WarmPalette.sageWarm,
  },
  activityNotes: {
    fontSize: 11,
    color: WarmPalette.charcoalWarm + "80",
    flex: 1,
  },
  gamesSection: {
    marginBottom: 20,
  },
  sessionsList: {
    gap: 12,
  },
  sessionCard: {
    backgroundColor: WarmPalette.cream,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    padding: 14,
  },
  sessionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  sessionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: WarmPalette.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionEmoji: {
    fontSize: 18,
  },
  sessionGameName: {
    fontSize: 15,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
  },
  sessionTimestamp: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm + "80",
    marginTop: 1,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#16A34A",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: WarmPalette.ivory,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  statBox: {
    alignItems: "center",
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm + "80",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
    marginTop: 2,
  },
  reasonCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBF7",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
    gap: 6,
  },
  reasonText: {
    fontSize: 11,
    color: WarmPalette.charcoalWarm + "90",
    flex: 1,
  },
  humanSummaryText: {
    fontSize: 12,
    fontStyle: "italic",
    color: WarmPalette.charcoalWarm + "90",
    marginTop: 8,
  },
});
