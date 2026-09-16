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
import { musicService } from "@/services/music/musicService";
import { CaregiverMusicSummary, CURATED_MUSIC_TRACKS, MusicTrack } from "@/types/music";

import { CaregiverAddActivityModal } from "./CaregiverAddActivityModal";
import { CaregiverAddMusicModal } from "./CaregiverAddMusicModal";

export const CaregiverActivitiesScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"routines" | "games" | "music" | "offline">("routines");

  const [activities, setActivities] = useState<CaregiverActivity[]>([]);
  const [gameSessions, setGameSessions] = useState<CognitiveGameSession[]>([]);
  const [musicSummary, setMusicSummary] = useState<CaregiverMusicSummary | null>(null);
  const [customTracks, setCustomTracks] = useState<MusicTrack[]>([]);
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const [hydration, setHydration] = useState<DailyHydration>({ date: "", glassesDrunk: 6, dailyGoal: 8 });
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [showAddMusicModal, setShowAddMusicModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const acts = await caregiverStorage.getActivities();
      const sessions = await caregiverStorage.getGameSessions();
      const hyd = await reminderStorage.getTodayHydration();
      const mSummary = await musicService.getCaregiverSummary("mahi");
      const cTracks = await musicService.getCustomTracks();
      setActivities(acts);
      setGameSessions(sessions);
      setMusicSummary(mSummary);
      setCustomTracks(cTracks);
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

  const handleTogglePreview = async (track: MusicTrack) => {
    try {
      if (previewTrackId === track.id) {
        await musicService.stop();
        setPreviewTrackId(null);
      } else {
        setPreviewTrackId(track.id);
        await musicService.playTrack(track);
      }
    } catch (e) {
      console.warn("Preview playback error:", e);
    }
  };

  const handleDeleteCustomTrack = async (trackId: string) => {
    try {
      if (previewTrackId === trackId) {
        await musicService.stop();
        setPreviewTrackId(null);
      }
      await musicService.deleteCustomTrack(trackId);
      await loadData();
    } catch (e) {
      console.warn("Could not delete custom track:", e);
    }
  };

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

      {/* ── 4-WAY SEGMENTED CONTROL ───────────────────────────────────── */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "routines" && styles.segmentBtnActive]}
          onPress={() => setActiveTab("routines")}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentBtnText, activeTab === "routines" && styles.segmentBtnTextActive]}>
            Today
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "games" && styles.segmentBtnActive]}
          onPress={() => setActiveTab("games")}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentBtnText, activeTab === "games" && styles.segmentBtnTextActive]}>
            Games
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "music" && styles.segmentBtnActive]}
          onPress={() => setActiveTab("music")}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentBtnText, activeTab === "music" && styles.segmentBtnTextActive]}>
            Music
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "offline" && styles.segmentBtnActive]}
          onPress={() => setActiveTab("offline")}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentBtnText, activeTab === "offline" && styles.segmentBtnTextActive]}>
            Sensory
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

        {/* ══════════ 3. MUSIC ACTIVITY & REMINISCENCE SUB-VIEW ══════════ */}
        {activeTab === "music" && (
          <View>
            {/* Dedicated Songs Header & Action */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>
                DEDICATED FAMILY SONGS ({customTracks.length})
              </Text>
              <TouchableOpacity
                style={[styles.addActBtn, { backgroundColor: "#7C3AED" }]}
                onPress={() => setShowAddMusicModal(true)}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={14} color="#FFFFFF" />
                <Text style={styles.addActBtnText}>Dedicate Song</Text>
              </TouchableOpacity>
            </View>

            {/* Dedicated Songs List */}
            <View style={styles.listSection}>
              {customTracks.length > 0 ? (
                customTracks.map((ct) => {
                  const isPlaying = previewTrackId === ct.id;
                  return (
                    <View key={ct.id} style={styles.customSongCard}>
                      <View style={[styles.favArtwork, { backgroundColor: ct.artworkBg || "#FAF5FF" }]}>
                        <Text style={{ fontSize: 18 }}>{ct.artworkEmoji || "🎵"}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={styles.customSongTitle}>{ct.title}</Text>
                          <View style={styles.familyBadge}>
                            <Text style={styles.familyBadgeText}>🌟 Family Pick</Text>
                          </View>
                        </View>
                        <Text style={styles.customSongArtist}>
                          {ct.artist} • {ct.language || "Folk"}
                        </Text>
                        {ct.description ? (
                          <Text style={styles.customSongDesc}>"{ct.description}"</Text>
                        ) : null}
                      </View>

                      {/* Actions: Play Preview & Delete */}
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <TouchableOpacity
                          style={[styles.previewBtn, isPlaying && styles.previewBtnActive]}
                          onPress={() => handleTogglePreview(ct)}
                          activeOpacity={0.8}
                        >
                          <Feather
                            name={isPlaying ? "square" : "play"}
                            size={14}
                            color={isPlaying ? "#FFFFFF" : "#7C3AED"}
                          />
                          <Text style={[styles.previewBtnText, isPlaying && styles.previewBtnTextActive]}>
                            {isPlaying ? "Stop" : "Preview"}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteTrackBtn}
                          onPress={() => handleDeleteCustomTrack(ct.id)}
                          activeOpacity={0.7}
                        >
                          <Feather name="trash-2" size={15} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyCustomMusicCard}>
                  <Text style={{ fontSize: 24 }}>🎵</Text>
                  <Text style={styles.emptyCustomTitle}>No dedicated songs added yet</Text>
                  <Text style={styles.emptyCustomSub}>
                    Dedicate nostalgic tracks (Bihu, Kishore Kumar, Temple Bhajans) to create moments of joy for your elder.
                  </Text>
                  <TouchableOpacity
                    style={styles.addFirstSongBtn}
                    onPress={() => setShowAddMusicModal(true)}
                    activeOpacity={0.85}
                  >
                    <Feather name="plus" size={14} color="#FFFFFF" />
                    <Text style={styles.addFirstSongText}>Dedicate First Song</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Factual Listening Summary Card */}
            <View style={[styles.musicHeroCard, { marginTop: 14 }]}>
              <View style={styles.musicHeroHeader}>
                <View>
                  <Text style={styles.cardHeaderLabel}>FACTUAL MUSIC ACTIVITY</Text>
                  <Text style={styles.musicHeroTitle}>
                    {musicSummary && musicSummary.totalListeningDurationSeconds > 0
                      ? `${Math.floor(musicSummary.totalListeningDurationSeconds / 60)}m ${musicSummary.totalListeningDurationSeconds % 60}s Listened`
                      : "No listening data yet"}
                  </Text>
                  <Text style={styles.musicHeroSub}>
                    Derived strictly from persisted playback position timestamps.
                  </Text>
                </View>
                <View style={styles.musicIconCircle}>
                  <Text style={{ fontSize: 22 }}>📻</Text>
                </View>
              </View>

              <View style={styles.musicStatsGrid}>
                <View style={styles.musicStatBox}>
                  <Text style={styles.musicStatVal}>{musicSummary?.songsStartedCount || 0}</Text>
                  <Text style={styles.musicStatLabel}>Started</Text>
                </View>
                <View style={styles.musicStatBox}>
                  <Text style={[styles.musicStatVal, { color: "#16A34A" }]}>{musicSummary?.songsCompletedCount || 0}</Text>
                  <Text style={styles.musicStatLabel}>Completed</Text>
                </View>
                <View style={styles.musicStatBox}>
                  <Text style={[styles.musicStatVal, { color: "#D97706" }]}>{musicSummary?.songsSkippedCount || 0}</Text>
                  <Text style={styles.musicStatLabel}>Skipped</Text>
                </View>
                <View style={styles.musicStatBox}>
                  <Text style={[styles.musicStatVal, { color: "#E11D48" }]}>{musicSummary?.favoritesCount || 0}</Text>
                  <Text style={styles.musicStatLabel}>Favorites</Text>
                </View>
              </View>

              {musicSummary && (
                <View style={styles.musicActiveDaysRow}>
                  <Feather name="calendar" size={13} color="#6366F1" />
                  <Text style={styles.musicActiveDaysText}>
                    Listened on {musicSummary.activeDaysLast7} of the last 7 days
                  </Text>
                </View>
              )}
            </View>

            {/* Subjective Reminiscence Reactions */}
            <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
              <Text style={styles.sectionHeaderTitle}>PATIENT SELF-REPORTED REACTIONS</Text>
            </View>
            <Text style={styles.musicDisclaimerText}>
              Direct patient selections during gentle reminiscence. Not a clinical memory diagnosis.
            </Text>

            <View style={[styles.listSection, { marginTop: 8 }]}>
              {musicSummary && musicSummary.recentReactions && musicSummary.recentReactions.length > 0 ? (
                musicSummary.recentReactions.map((r, idx) => {
                  const reactionEmoji =
                    r.reaction === "like"
                      ? "❤️"
                      : r.reaction === "familiar"
                      ? "😊"
                      : r.reaction === "talk"
                      ? "🗣️"
                      : "⏭️";
                  const reactionLabel =
                    r.reaction === "like"
                      ? "Liked the melody"
                      : r.reaction === "familiar"
                      ? "Felt familiar"
                      : r.reaction === "talk"
                      ? "Wanted to talk about it"
                      : "Skipped";

                  return (
                    <View key={idx} style={styles.reactionCard}>
                      <Text style={{ fontSize: 20 }}>{reactionEmoji}</Text>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.reactionTitle}>{reactionLabel}</Text>
                        <Text style={styles.reactionTrack}>{r.trackTitle}</Text>
                      </View>
                      <Text style={styles.reactionTime}>
                        {new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No reminiscence reactions recorded yet.</Text>
                </View>
              )}
            </View>

            {/* Favorite Tracks List */}
            <View style={[styles.sectionHeaderRow, { marginTop: 16 }]}>
              <Text style={styles.sectionHeaderTitle}>FAVORITE TRACKS ({musicSummary?.favoritesCount || 0})</Text>
            </View>
            <View style={styles.listSection}>
              {musicSummary && musicSummary.favoriteTrackIds && musicSummary.favoriteTrackIds.length > 0 ? (
                musicSummary.favoriteTrackIds.map((tid) => {
                  const track = CURATED_MUSIC_TRACKS.find((t) => t.id === tid);
                  return (
                    <View key={tid} style={styles.favTrackCard}>
                      <View style={[styles.favArtwork, { backgroundColor: track?.artworkBg || "#EEF2FF" }]}>
                        <Text style={{ fontSize: 18 }}>{track?.artworkEmoji || "🎵"}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.favTrackTitle}>{track?.title || tid}</Text>
                        <Text style={styles.favTrackArtist}>
                          {track?.artist || "Regional Artist"} • {track?.language || "Folk"}
                        </Text>
                      </View>
                      <Feather name="heart" size={16} color="#E11D48" />
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No songs marked as favorite yet.</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ══════════ 4. OFFLINE SENSORY IDEAS SUB-VIEW ══════════ */}
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
      <CaregiverAddMusicModal
        visible={showAddMusicModal}
        onClose={() => setShowAddMusicModal(false)}
        onSongAdded={loadData}
        elderName="Mahi"
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
    paddingBottom: 110,
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
  musicHeroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  musicHeroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  musicHeroTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  musicHeroSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
    maxWidth: 240,
  },
  musicIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FAF5FF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    alignItems: "center",
    justifyContent: "center",
  },
  musicStatsGrid: {
    flexDirection: "row",
    gap: 8,
  },
  musicStatBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: "center",
  },
  musicStatVal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  musicStatLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 2,
  },
  musicActiveDaysRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  musicActiveDaysText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4F46E5",
  },
  musicDisclaimerText: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 15,
    marginBottom: 6,
  },
  reactionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  reactionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  reactionTrack: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  reactionTime: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  favTrackCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  favArtwork: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  favTrackTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  favTrackArtist: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  emptyCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#CBD5E1",
  },
  emptyText: {
    fontSize: 12.5,
    color: "#94A3B8",
    fontWeight: "600",
  },
  customSongCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  customSongTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  customSongArtist: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  customSongDesc: {
    fontSize: 11,
    fontStyle: "italic",
    color: "#7C3AED",
    marginTop: 2,
  },
  familyBadge: {
    backgroundColor: "#FAF5FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  familyBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#7C3AED",
  },
  previewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FAF5FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  previewBtnActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  previewBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7C3AED",
  },
  previewBtnTextActive: {
    color: "#FFFFFF",
  },
  deleteTrackBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
  },
  emptyCustomMusicCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyCustomTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 8,
  },
  emptyCustomSub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 16,
    maxWidth: 280,
  },
  addFirstSongBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#7C3AED",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 14,
  },
  addFirstSongText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
