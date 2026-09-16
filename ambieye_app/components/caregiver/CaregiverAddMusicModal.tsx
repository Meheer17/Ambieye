import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WarmPalette } from "../../constants/theme";
import { musicService } from "../../services/music/musicService";
import { MusicCategory, MusicTrack } from "../../types/music";

interface Props {
  visible: boolean;
  onClose: () => void;
  elderName?: string;
  onSongAdded?: (track: MusicTrack) => void;
}

const CATEGORY_OPTIONS: Array<{
  id: MusicCategory;
  label: string;
  emoji: string;
  color: string;
  bg: string;
}> = [
  { id: "hindi_classics", label: "Hindi Classics", emoji: "🎩", color: "#E11D48", bg: "#FFF1F2" },
  { id: "assamese_folk", label: "Assamese / Bihu", emoji: "🪈", color: "#D97706", bg: "#FEF3C7" },
  { id: "northeast_regional", label: "Northeast Regional", emoji: "⛰️", color: "#9333EA", bg: "#FAF5FF" },
  { id: "instrumental", label: "Calming / Devotional", emoji: "🌸", color: "#059669", bg: "#ECFDF5" },
];

const PRESET_STREAM_STYLES = [
  {
    label: "Morning Bamboo Flute",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    emoji: "🪈",
    color: "#D97706",
  },
  {
    label: "Joyful Folk & Bihu Rhythm",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    emoji: "🥁",
    color: "#DC2626",
  },
  {
    label: "Vintage Strings & Acoustic",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    emoji: "🎻",
    color: "#7C3AED",
  },
  {
    label: "Golden Era Classic Melodies",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    emoji: "🎵",
    color: "#E11D48",
  },
  {
    label: "Meditative Tanpura & Chants",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3",
    emoji: "🌸",
    color: "#059669",
  },
];

const QUICK_SONG_SUGGESTIONS = [
  { title: "Yeh Shaam Mastani", artist: "Kishore Kumar", category: "hindi_classics" as MusicCategory, styleIdx: 3 },
  { title: "Pal Pal Dil Ke Paas", artist: "Kishore Kumar", category: "hindi_classics" as MusicCategory, styleIdx: 3 },
  { title: "Lag Jaa Gale", artist: "Lata Mangeshkar", category: "hindi_classics" as MusicCategory, styleIdx: 2 },
  { title: "Bihu Geet - Pokhila", artist: "Assam Folk Troupe", category: "assamese_folk" as MusicCategory, styleIdx: 1 },
  { title: "Brahmaputra Evening Raga", artist: "Majuli Classical Sitar", category: "instrumental" as MusicCategory, styleIdx: 4 },
  { title: "Sandhya Aarti & Bhajan", artist: "Traditional Temple Chants", category: "instrumental" as MusicCategory, styleIdx: 4 },
];

export const CaregiverAddMusicModal: React.FC<Props> = ({
  visible,
  onClose,
  elderName = "Elder",
  onSongAdded,
}) => {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [category, setCategory] = useState<MusicCategory>("hindi_classics");
  const [selectedStyleIdx, setSelectedStyleIdx] = useState(0);
  const [customAudioUrl, setCustomAudioUrl] = useState("");
  const [dedicationNote, setDedicationNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  const handleSelectSuggestion = (s: typeof QUICK_SONG_SUGGESTIONS[0]) => {
    setTitle(s.title);
    setArtist(s.artist);
    setCategory(s.category);
    setSelectedStyleIdx(s.styleIdx);
    if (!dedicationNote) {
      setDedicationNote(`Dedicated with warm memories for ${elderName}`);
    }
  };

  const handleSaveMusic = async () => {
    if (!title.trim()) {
      Alert.alert("Missing Song Title", "Please enter a song or melody title.");
      return;
    }

    setSubmitting(true);
    try {
      const chosenStyle = PRESET_STREAM_STYLES[selectedStyleIdx] || PRESET_STREAM_STYLES[0];
      const categoryInfo = CATEGORY_OPTIONS.find((c) => c.id === category) || CATEGORY_OPTIONS[0];

      const newTrack = await musicService.addCustomTrack({
        title: title.trim(),
        artist: artist.trim() || "Family Dedication",
        category: category as any,
        language: category === "assamese_folk" ? "Assamese" : category === "northeast_regional" ? "Northeast Folk" : "Hindi",
        region: category === "assamese_folk" ? "Assam" : "Family Pick",
        artworkEmoji: categoryInfo.emoji,
        artworkBg: categoryInfo.bg,
        borderColor: categoryInfo.color,
        accentColor: chosenStyle.color,
        audioUri: customAudioUrl.trim() || chosenStyle.url,
        durationSeconds: 180,
        description: dedicationNote.trim() || `Dedicated with love by Anita (Daughter)`,
        descriptionAs: dedicationNote.trim() || `পৰিয়ালৰ মৰমৰ গীত: অনিতা (জী)`,
        descriptionHi: dedicationNote.trim() || `परिवार का स्नेह भरा संगीत: अनिता (बेटी)`,
        recommendedBy: "Anita (Daughter)",
      });

      setSuccessNotice(true);
      if (onSongAdded) onSongAdded(newTrack);

      setTimeout(() => {
        setSuccessNotice(false);
        setTitle("");
        setArtist("");
        setDedicationNote("");
        setCustomAudioUrl("");
        setSubmitting(false);
        onClose();
      }, 1200);
    } catch (e) {
      setSubmitting(false);
      Alert.alert("Error", "Could not save song to patient hub right now.");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          {/* Sheet Handle */}
          <View style={styles.sheetHandleBar}>
            <View style={styles.sheetHandle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Dedicate Music for {elderName}</Text>
              <Text style={styles.headerSubtitle}>
                Add specific songs that bring comfort, peace, and joyous memories
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={WarmPalette.charcoalWarm} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {successNotice ? (
              <View style={styles.successCard}>
                <Ionicons name="checkmark-circle" size={54} color="#16A34A" />
                <Text style={styles.successTitle}>Song Added to {elderName}'s Hub!</Text>
                <Text style={styles.successSubtitle}>
                  This song is now available with a "🌟 Family Pick" badge on their player.
                </Text>
              </View>
            ) : (
              <>
                {/* Quick Song Suggestions */}
                <Text style={styles.inputLabel}>QUICK POPULAR DEDICATIONS</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestionsRow}
                >
                  {QUICK_SONG_SUGGESTIONS.map((s, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.suggestionChip}
                      onPress={() => handleSelectSuggestion(s)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="musical-notes" size={14} color="#7C3AED" />
                      <View>
                        <Text style={styles.suggestionTitle}>{s.title}</Text>
                        <Text style={styles.suggestionArtist}>{s.artist}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Song Title Input */}
                <Text style={styles.inputLabel}>SONG / TRACK TITLE *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Yeh Shaam Mastani"
                  placeholderTextColor={WarmPalette.charcoalWarm + "60"}
                  value={title}
                  onChangeText={setTitle}
                />

                {/* Artist Name Input */}
                <Text style={styles.inputLabel}>ARTIST / SINGER NAME</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Kishore Kumar / Bhupen Hazarika"
                  placeholderTextColor={WarmPalette.charcoalWarm + "60"}
                  value={artist}
                  onChangeText={setArtist}
                />

                {/* Category Selection */}
                <Text style={styles.inputLabel}>MUSIC CATEGORY</Text>
                <View style={styles.categoriesGrid}>
                  {CATEGORY_OPTIONS.map((cat) => {
                    const isSelected = category === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryCard,
                          { backgroundColor: isSelected ? cat.color : cat.bg },
                          isSelected && styles.categoryCardSelected,
                        ]}
                        onPress={() => setCategory(cat.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                        <Text
                          style={[
                            styles.categoryLabel,
                            { color: isSelected ? "#FFFFFF" : WarmPalette.charcoalWarm },
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Audio Style & Ambient Soundscape */}
                <Text style={styles.inputLabel}>CHOOSE AUDIO SOUNDSCAPE / PRESET STREAM</Text>
                <View style={styles.stylesList}>
                  {PRESET_STREAM_STYLES.map((st, idx) => {
                    const isSelected = selectedStyleIdx === idx;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.styleOption, isSelected && styles.styleOptionSelected]}
                        onPress={() => setSelectedStyleIdx(idx)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.styleEmoji}>{st.emoji}</Text>
                        <Text style={[styles.styleLabel, isSelected && styles.styleLabelSelected]}>
                          {st.label}
                        </Text>
                        {isSelected && <Ionicons name="checkmark-circle" size={18} color="#7C3AED" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Optional Custom Audio URL */}
                <Text style={styles.inputLabel}>CUSTOM MP3 STREAM URL (OPTIONAL)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="https://.../song.mp3 (leave empty for preset)"
                  placeholderTextColor={WarmPalette.charcoalWarm + "60"}
                  value={customAudioUrl}
                  onChangeText={setCustomAudioUrl}
                  autoCapitalize="none"
                />

                {/* Dedication Note */}
                <Text style={styles.inputLabel}>PERSONAL DEDICATION NOTE FOR ELDER</Text>
                <TextInput
                  style={[styles.textInput, { height: 75, textAlignVertical: "top" }]}
                  multiline
                  numberOfLines={3}
                  placeholder="e.g. Amma, this was your favorite song when we visited Majuli together!"
                  placeholderTextColor={WarmPalette.charcoalWarm + "60"}
                  value={dedicationNote}
                  onChangeText={setDedicationNote}
                />

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                  onPress={handleSaveMusic}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  <Ionicons name="heart" size={18} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>
                    {submitting ? "Adding Song..." : `Add to ${elderName}'s Music Hub`}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(40, 37, 36, 0.6)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: WarmPalette.ivory,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
  },
  sheetHandleBar: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 2,
  },
  sheetHandle: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: WarmPalette.charcoalWarm + "30",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: WarmPalette.sand,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: WarmPalette.charcoalWarm + "99",
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: WarmPalette.sand,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  scroll: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm + "90",
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 6,
  },
  suggestionsRow: {
    gap: 8,
    paddingBottom: 4,
  },
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAF5FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 8,
  },
  suggestionTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#6B21A8",
  },
  suggestionArtist: {
    fontSize: 11,
    color: "#9333EA",
  },
  textInput: {
    backgroundColor: WarmPalette.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: WarmPalette.charcoalWarm,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryCard: {
    flex: 1,
    minWidth: "46%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    gap: 8,
  },
  categoryCardSelected: {
    borderColor: "transparent",
  },
  categoryEmoji: {
    fontSize: 18,
  },
  categoryLabel: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  stylesList: {
    gap: 6,
  },
  styleOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  styleOptionSelected: {
    backgroundColor: "#FAF5FF",
    borderColor: "#7C3AED",
  },
  styleEmoji: {
    fontSize: 18,
  },
  styleLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: WarmPalette.charcoalWarm,
    flex: 1,
  },
  styleLabelSelected: {
    color: "#6B21A8",
    fontWeight: "700",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7C3AED",
    borderRadius: 16,
    paddingVertical: 15,
    marginTop: 22,
    gap: 8,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  successCard: {
    alignItems: "center",
    paddingVertical: 36,
    paddingHorizontal: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
    marginTop: 12,
  },
  successSubtitle: {
    fontSize: 13,
    color: WarmPalette.charcoalWarm + "99",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },
});
