import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTranslation } from "@/constants/i18n";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import {
  musicService,
  MusicPlayerState,
} from "@/services/music/musicService";
import {
  MusicCategory,
  MusicTrack,
  CURATED_MUSIC_TRACKS,
  ReminiscenceReactionType,
} from "@/types/music";
import { BorderRadius, Shadows, Spacing, WarmPalette } from "@/constants/theme";

interface MusicHubModalProps {
  visible: boolean;
  onClose: () => void;
  patientId?: string;
}

const { width } = Dimensions.get("window");

export const MusicHubModal: React.FC<MusicHubModalProps> = ({
  visible,
  onClose,
  patientId = "mahi",
}) => {
  const router = useRouter();
  const { currentLang } = useTranslation();

  const [selectedCategory, setSelectedCategory] = useState<MusicCategory>("all");
  const [playerState, setPlayerState] = useState<MusicPlayerState>(musicService.getState());

  // Subscribe to real-time music service state
  useEffect(() => {
    const unsubscribe = musicService.subscribe((state) => {
      setPlayerState(state);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Cleanup audio playback when modal is closed or unmounted
  useEffect(() => {
    if (!visible) {
      VoiceAssistant.stop();
      musicService.pause();
    }
    return () => {
      VoiceAssistant.stop();
      musicService.stop();
    };
  }, [visible]);

  const handleClose = () => {
    VoiceAssistant.stop();
    musicService.stop();
    onClose();
  };

  // ── Track Filtering ────────────────────────────────────────────────────────
  const allTracks = musicService.getAllTracks();
  const filteredTracks = allTracks.filter((track) => {
    if (selectedCategory === "all") return true;
    if (selectedCategory === "favorites") {
      return playerState.favorites.includes(track.id);
    }
    return track.category === selectedCategory;
  });

  // Active track or default to first track
  const currentTrack = playerState.currentTrack || allTracks[0] || CURATED_MUSIC_TRACKS[0];
  const isPlaying = playerState.playbackState === "playing";
  const isLoading = playerState.playbackState === "loading";
  const isCurrentTrackFavorited = playerState.favorites.includes(currentTrack.id);

  // ── Format MM:SS ──────────────────────────────────────────────────────────
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlePlayToggle = async (track?: MusicTrack) => {
    const targetTrack = track || currentTrack;
    if (playerState.currentTrack?.id === targetTrack.id) {
      if (isPlaying) {
        await musicService.pause();
      } else if (playerState.playbackState === "paused" || playerState.playbackState === "finished") {
        await musicService.resume();
      } else {
        await musicService.playTrack(targetTrack, patientId);
      }
    } else {
      await musicService.playTrack(targetTrack, patientId);
    }
  };

  const handleToggleFavorite = async (trackId: string) => {
    await musicService.toggleFavorite(trackId);
  };

  const handleReminiscence = async (reaction: ReminiscenceReactionType) => {
    await musicService.recordReminiscenceReaction(reaction);

    if (reaction === "talk") {
      const promptText =
        currentLang === "as"
          ? `${currentTrack.title}ৰ স্মৃতি মনত পৰিছেনে? এই সুৰৰ বিষয়ে মোক কওক!`
          : currentLang === "hi"
          ? `${currentTrack.title} सुनकर पुरानी यादें ताज़ा हुईं? मुझे इस धुन के बारे में बताएं!`
          : `Does ${currentTrack.title} bring back sweet memories? Tell me what you remember!`;
      VoiceAssistant.speak(promptText, currentLang);
    } else if (reaction === "like") {
      const msg = currentLang === "as" ? "মই আনন্দিত যে এই সুৰটো আপোনাৰ ভাল লাগিল!" : "So glad you enjoyed this melody!";
      VoiceAssistant.speak(msg, currentLang);
    }
  };

  const handleLaunchSingAlong = async () => {
    await musicService.recordSingAlongStarted();
    handleClose();
    router.push("/(patient)/(stack)/games/cognitive/antakshari-battle");
  };

  const getLocalizedTitle = (t: MusicTrack) => {
    if (currentLang === "as" && t.titleAs) return t.titleAs;
    if (currentLang === "hi" && t.titleHi) return t.titleHi;
    return t.title;
  };

  const getLocalizedDesc = (t: MusicTrack) => {
    if (currentLang === "as" && t.descriptionAs) return t.descriptionAs;
    if (currentLang === "hi" && t.descriptionHi) return t.descriptionHi;
    return t.description;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.modalContainer} edges={["top", "bottom"]}>
        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>
              {currentLang === "as" ? "সংগীত আৰু স্মৃতি সুৰ" : "Folk & Calming Music"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {currentLang === "as"
                ? "মন শাঁত কৰা আৰু স্মৃতি সজীৱ কৰা পৰিচিত গীত"
                : "Culturally familiar tunes to soothe and inspire"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleClose}
            activeOpacity={0.8}
            accessibilityLabel="Close Music Hub"
          >
            <Feather name="x" size={24} color="#475569" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollInner}
          showsVerticalScrollIndicator={false}
        >
          {/* ── HERO PLAYER: "PLAY FOR ME" ─────────────────────────────────── */}
          <View style={[styles.heroCard, { borderColor: currentTrack.borderColor }]}>
            {/* Family Recommendation Badge */}
            {currentTrack.isFamilyRecommended && (
              <View style={styles.familyBadge}>
                <Feather name="heart" size={13} color="#E11D48" />
                <Text style={styles.familyBadgeText}>
                  {currentLang === "as"
                    ? `পৰিয়ালৰ পৰামৰ্শ: ${currentTrack.recommendedBy}`
                    : `Family Pick: ${currentTrack.recommendedBy}`}
                </Text>
              </View>
            )}

            <View style={styles.heroTopRow}>
              {/* Artwork Emoji */}
              <View style={[styles.artworkBox, { backgroundColor: currentTrack.artworkBg }]}>
                <Text style={styles.artworkEmoji}>{currentTrack.artworkEmoji}</Text>
              </View>

              {/* Title & Artist */}
              <View style={styles.trackInfoBox}>
                <Text style={styles.heroTitle} numberOfLines={2}>
                  {getLocalizedTitle(currentTrack)}
                </Text>
                <Text style={styles.heroArtist}>{currentTrack.artist}</Text>
                <Text style={styles.heroGenre}>
                  {currentTrack.region} · {currentTrack.language}
                </Text>
              </View>

              {/* Favorite Heart Toggle */}
              <TouchableOpacity
                style={[
                  styles.heartBtn,
                  isCurrentTrackFavorited && styles.heartBtnActive,
                ]}
                onPress={() => handleToggleFavorite(currentTrack.id)}
                activeOpacity={0.8}
                accessibilityLabel="Toggle Favorite"
              >
                <MaterialCommunityIcons
                  name={isCurrentTrackFavorited ? "heart" : "heart-outline"}
                  size={28}
                  color={isCurrentTrackFavorited ? "#E11D48" : "#94A3B8"}
                />
              </TouchableOpacity>
            </View>

            {/* Description */}
            <Text style={styles.heroDesc}>{getLocalizedDesc(currentTrack)}</Text>

            {/* Real Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${playerState.progressPercent}%`,
                      backgroundColor: currentTrack.accentColor,
                    },
                  ]}
                />
              </View>
              <View style={styles.timeRow}>
                <Text style={styles.timeText}>{formatTime(playerState.positionSeconds)}</Text>
                <Text style={styles.timeText}>{formatTime(currentTrack.durationSeconds)}</Text>
              </View>
            </View>

            {/* Control Deck */}
            <View style={styles.heroControlsRow}>
              {/* Previous Track */}
              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => musicService.playPrevious()}
                activeOpacity={0.8}
                accessibilityLabel="Previous Song"
              >
                <Feather name="skip-back" size={26} color="#475569" />
              </TouchableOpacity>

              {/* Big Primary Play/Pause Button */}
              <TouchableOpacity
                style={[styles.mainPlayBtn, { backgroundColor: currentTrack.accentColor }]}
                onPress={() => handlePlayToggle()}
                activeOpacity={0.85}
                accessibilityLabel={isPlaying ? "Pause Song" : "Play Song"}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Feather
                    name={isPlaying ? "pause" : "play"}
                    size={32}
                    color="#FFFFFF"
                    style={{ marginLeft: isPlaying ? 0 : 3 }}
                  />
                )}
              </TouchableOpacity>

              {/* Next Track */}
              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => musicService.playNext()}
                activeOpacity={0.8}
                accessibilityLabel="Next Song"
              >
                <Feather name="skip-forward" size={26} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* Error Banner if any */}
            {playerState.errorMessage && (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={14} color="#DC2626" />
                <Text style={styles.errorText}>{playerState.errorMessage}</Text>
              </View>
            )}
          </View>

          {/* ── GENTLE REMINISCENCE PROMPT ─────────────────────────────────── */}
          <View style={styles.reminiscenceCard}>
            <View style={styles.reminiscenceHeader}>
              <Text style={styles.reminiscenceIcon}>💭</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.reminiscenceTitle}>
                  {currentLang === "as" ? "এই সুৰটো মনত আছেনে?" : "Do you remember this song?"}
                </Text>
                <Text style={styles.reminiscenceSubtitle}>
                  {currentLang === "as"
                    ? "আপোনাৰ অনুভৱ আমাক জনাওক (ঐচ্ছিক)"
                    : "Gentle reflection · How does this melody make you feel?"}
                </Text>
              </View>
            </View>

            <View style={styles.reactionGrid}>
              <TouchableOpacity
                style={[
                  styles.reactionBtn,
                  playerState.lastReaction === "like" && styles.reactionBtnSelected,
                ]}
                onPress={() => handleReminiscence("like")}
                activeOpacity={0.8}
              >
                <Text style={styles.reactionEmoji}>❤️</Text>
                <Text style={styles.reactionText}>
                  {currentLang === "as" ? "ভাল লাগিল" : "I like it"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.reactionBtn,
                  playerState.lastReaction === "familiar" && styles.reactionBtnSelected,
                ]}
                onPress={() => handleReminiscence("familiar")}
                activeOpacity={0.8}
              >
                <Text style={styles.reactionEmoji}>😊</Text>
                <Text style={styles.reactionText}>
                  {currentLang === "as" ? "পৰিচিত সুৰ" : "Feels familiar"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.reactionBtn,
                  playerState.lastReaction === "talk" && styles.reactionBtnSelected,
                ]}
                onPress={() => handleReminiscence("talk")}
                activeOpacity={0.8}
              >
                <Text style={styles.reactionEmoji}>🗣️</Text>
                <Text style={styles.reactionText}>
                  {currentLang === "as" ? "কথা পাতক" : "Talk about it"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.reactionBtn,
                  playerState.lastReaction === "skip" && styles.reactionBtnSelected,
                ]}
                onPress={() => handleReminiscence("skip")}
                activeOpacity={0.8}
              >
                <Text style={styles.reactionEmoji}>⏭️</Text>
                <Text style={styles.reactionText}>
                  {currentLang === "as" ? "বাদ দিয়ক" : "Skip"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── SING ALONG (ANTAKSHARI) ACTION TILE ────────────────────────── */}
          <TouchableOpacity
            style={styles.singAlongCard}
            onPress={handleLaunchSingAlong}
            activeOpacity={0.88}
            accessibilityLabel="Launch Sing Along"
          >
            <View style={styles.singAlongIconBox}>
              <MaterialCommunityIcons name="microphone-variant" size={32} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.singAlongTitle}>
                {currentLang === "as" ? "লগতে গান গাওক · অন্ত্যাক্ষৰী" : "Sing Along · Antakshari"}
              </Text>
              <Text style={styles.singAlongSubtitle}>
                {currentLang === "as"
                  ? "প্ৰিয় গীত গাই মন আনন্দিত কৰক আৰু স্মৃতি জীপাল কৰক"
                  : "Sing familiar tunes and reminisce joyful melodies together"}
              </Text>
            </View>
            <Feather name="chevron-right" size={24} color="#7C3AED" />
          </TouchableOpacity>

          {/* ── CATEGORY SELECTOR ─────────────────────────────────────────── */}
          <Text style={styles.sectionHeading}>
            {currentLang === "as" ? "সংগীত শ্ৰেণী" : "Music Categories"}
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {[
              { id: "all", label: "All Songs", labelAs: "সকলো গীত", emoji: "🎵" },
              { id: "assamese_folk", label: "Assamese / Bihu", labelAs: "অসমীয়া / বিহু", emoji: "🪈" },
              { id: "northeast_regional", label: "Northeast Indian", labelAs: "উত্তৰ-পূব সুৰ", emoji: "⛰️" },
              { id: "hindi_classics", label: "Hindi Classics", labelAs: "পুৰণি হিন্দী গীত", emoji: "🎩" },
              { id: "instrumental", label: "Calming Meditative", labelAs: "প্ৰশান্ত সুৰ", emoji: "🌸" },
              { id: "favorites", label: `Favorites (${playerState.favorites.length})`, labelAs: `প্ৰিয় গীত (${playerState.favorites.length})`, emoji: "❤️" },
            ].map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                  onPress={() => setSelectedCategory(cat.id as MusicCategory)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelActive]}>
                    {currentLang === "as" ? cat.labelAs : cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── TRACK LIST ─────────────────────────────────────────────────── */}
          <Text style={styles.sectionHeading}>
            {selectedCategory === "favorites"
              ? currentLang === "as"
                ? "আপোনাৰ প্ৰিয় গীতসমূহ"
                : "Your Favorite Tracks"
              : currentLang === "as"
              ? "গীতৰ তালিকা"
              : "Available Songs"}
          </Text>

          {filteredTracks.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>❤️</Text>
              <Text style={styles.emptyTitle}>
                {currentLang === "as" ? "কোনো প্ৰিয় গীত সংৰক্ষণ কৰা হোৱা নাই" : "No Favorites Added Yet"}
              </Text>
              <Text style={styles.emptySub}>
                {currentLang === "as"
                  ? "যিকোনো গীতত থকা ❤️ চিহ্ণত টিপি প্ৰিয় তালিকাত যোগ কৰক।"
                  : "Tap the heart icon on any song to save it to your favorites."}
              </Text>
            </View>
          ) : (
            filteredTracks.map((track) => {
              const isThisPlaying = playerState.currentTrack?.id === track.id && isPlaying;
              const isFav = playerState.favorites.includes(track.id);

              return (
                <TouchableOpacity
                  key={track.id}
                  style={[
                    styles.trackCard,
                    playerState.currentTrack?.id === track.id && styles.trackCardActive,
                  ]}
                  onPress={() => handlePlayToggle(track)}
                  activeOpacity={0.8}
                >
                  {/* Artwork Box */}
                  <View style={[styles.trackArtwork, { backgroundColor: track.artworkBg }]}>
                    <Text style={styles.trackArtworkEmoji}>{track.artworkEmoji}</Text>
                  </View>

                  {/* Track Details */}
                  <View style={styles.trackMetaBox}>
                    <Text style={styles.trackCardTitle} numberOfLines={1}>
                      {getLocalizedTitle(track)}
                    </Text>
                    <Text style={styles.trackCardArtist} numberOfLines={1}>
                      {track.artist} · {track.region}
                    </Text>
                    <Text style={styles.trackCardDuration}>{formatTime(track.durationSeconds)}</Text>
                  </View>

                  {/* Play Button Indicator */}
                  <View
                    style={[
                      styles.trackPlayIndicator,
                      isThisPlaying && { backgroundColor: track.accentColor },
                    ]}
                  >
                    <Feather
                      name={isThisPlaying ? "pause" : "play"}
                      size={18}
                      color={isThisPlaying ? "#FFFFFF" : "#64748B"}
                      style={{ marginLeft: isThisPlaying ? 0 : 2 }}
                    />
                  </View>

                  {/* Heart Favorite Button */}
                  <TouchableOpacity
                    style={styles.trackHeartBtn}
                    onPress={() => handleToggleFavorite(track.id)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons
                      name={isFav ? "heart" : "heart-outline"}
                      size={24}
                      color={isFav ? "#E11D48" : "#94A3B8"}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 2,
    ...Shadows.md,
  },
  familyBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FFE4E6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    marginBottom: 12,
  },
  familyBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#BE123C",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  artworkBox: {
    width: 68,
    height: 68,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  artworkEmoji: {
    fontSize: 34,
  },
  trackInfoBox: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  heroArtist: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginTop: 2,
  },
  heroGenre: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  heartBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  heartBtnActive: {
    backgroundColor: "#FFE4E6",
  },
  heroDesc: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 12,
    lineHeight: 18,
  },
  progressContainer: {
    marginTop: 16,
    gap: 6,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  heroControlsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 28,
    marginTop: 16,
  },
  skipBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  mainPlayBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
    ...Shadows.md,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    padding: 8,
    borderRadius: 8,
    gap: 6,
    marginTop: 12,
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600",
  },
  reminiscenceCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  reminiscenceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  reminiscenceIcon: {
    fontSize: 30,
  },
  reminiscenceTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#92400E",
  },
  reminiscenceSubtitle: {
    fontSize: 12,
    color: "#B45309",
    marginTop: 2,
  },
  reactionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reactionBtn: {
    flex: 1,
    minWidth: "45%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FCD34D",
    gap: 6,
  },
  reactionBtnSelected: {
    backgroundColor: "#FDE68A",
    borderColor: "#D97706",
  },
  reactionEmoji: {
    fontSize: 18,
  },
  reactionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#78350F",
  },
  singAlongCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAF5FF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: "#E9D5FF",
    gap: Spacing.md,
    ...Shadows.sm,
  },
  singAlongIconBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#9333EA",
    justifyContent: "center",
    alignItems: "center",
  },
  singAlongTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#6B21A8",
  },
  singAlongSubtitle: {
    fontSize: 12,
    color: "#7E22CE",
    marginTop: 2,
    lineHeight: 16,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 6,
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  categoryPillActive: {
    backgroundColor: "#0D0145",
    borderColor: "#0D0145",
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  categoryLabelActive: {
    color: "#FFFFFF",
  },
  trackCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: Spacing.md,
  },
  trackCardActive: {
    borderColor: "#6366F1",
    backgroundColor: "#F5F3FF",
  },
  trackArtwork: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  trackArtworkEmoji: {
    fontSize: 24,
  },
  trackMetaBox: {
    flex: 1,
  },
  trackCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  trackCardArtist: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  trackCardDuration: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  trackPlayIndicator: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  trackHeartBtn: {
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  emptySub: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
});
