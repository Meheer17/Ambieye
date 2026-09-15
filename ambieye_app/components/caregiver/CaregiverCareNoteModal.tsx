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
import { caregiverStorage } from "../../utils/caregiverStorage";

interface Props {
  visible: boolean;
  onClose: () => void;
  onNoteAdded: () => void;
}

type NoteCategory = "mood" | "sleep" | "behavior" | "appetite" | "activity" | "social" | "other";

const CATEGORIES: Array<{ cat: NoteCategory; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = [
  { cat: "mood", label: "Mood", icon: "happy-outline", color: "#EA580C" },
  { cat: "behavior", label: "Behavior", icon: "help-circle-outline", color: "#C2747C" },
  { cat: "sleep", label: "Sleep", icon: "moon-outline", color: "#8B5CF6" },
  { cat: "appetite", label: "Appetite", icon: "restaurant-outline", color: "#16A34A" },
  { cat: "activity", label: "Activity", icon: "walk-outline", color: "#0284C7" },
  { cat: "social", label: "Social", icon: "people-outline", color: "#D97706" },
  { cat: "other", label: "Other", icon: "reader-outline", color: "#78716C" },
];

const PRESET_OBSERVATIONS: Record<NoteCategory, string[]> = {
  mood: [
    "Was cheerful and smiling after family phone call.",
    "Seemed slightly anxious when the room became noisy.",
    "Very calm and content while listening to music.",
  ],
  behavior: [
    "Asked about the same upcoming event three times.",
    "Misplaced spectacles on the dining shelf and felt confused.",
    "Followed familiar bedtime steps smoothly today.",
  ],
  sleep: [
    "Woke up once around 2:30 AM, settled back quickly with warm water.",
    "Seemed unusually tired this morning even after 7 hours sleep.",
    "Took a restful 30-minute afternoon nap.",
  ],
  appetite: [
    "Ate all breakfast happily with good appetite.",
    "Needed gentle reminder to drink water throughout the afternoon.",
    "Enjoyed soft home-cooked dal and rice comfortably.",
  ],
  activity: [
    "Did not want to go for morning walk, preferred staying inside.",
    "Enjoyed 15 minutes of chair stretches with music.",
    "Loved looking through family photographs.",
  ],
  social: [
    "Recognized neighbor Ramesh and exchanged greetings warmly.",
    "Enjoyed video call with grandson Arjun.",
    "Quiet during visitor presence, preferred listening.",
  ],
  other: [
    "Temperature normal; skin looks hydrated.",
    "New comfortable footwear arrived and fits well.",
  ],
};

const VOICE_SAMPLES = [
  {
    title: "Sundowning & Dusk Confusion",
    transcript: "Baba was slightly agitated around dusk at 5:45 PM, repeatedly asking about his tea and train tickets. Played Bhupen Hazarika flute songs and served warm Assam tea; settled down peacefully within 10 minutes.",
    category: "behavior" as NoteCategory,
  },
  {
    title: "Medication Hesitation",
    transcript: "Refused morning Donepezil tablet initially, saying he had already taken it. Explained calmly with reassurance and gave it with fresh mango juice smoothly.",
    category: "behavior" as NoteCategory,
  },
  {
    title: "Veranda Garden Wandering",
    transcript: "Walked toward the front tea garden gate at 4:30 PM looking for the riverboat. Gently redirected to the veranda flowerpots to prune Tulsi leaves happily.",
    category: "activity" as NoteCategory,
  },
  {
    title: "Nocturnal Restlessness",
    transcript: "Woke up at 2 AM confused about the room darkness. Turned on amber night lamp and offered warm water, fell back asleep comfortably in 15 mins.",
    category: "sleep" as NoteCategory,
  },
  {
    title: "Social & Memory Joy",
    transcript: "Enjoyed singing Antakshari songs with grandkid Arjun on the senior tablet. Smiled and recalled his youth in Majuli with vivid detail.",
    category: "social" as NoteCategory,
  },
];

export const CaregiverCareNoteModal: React.FC<Props> = ({ visible, onClose, onNoteAdded }) => {
  const [mode, setMode] = useState<"text" | "voice_scribe">("voice_scribe");
  const [selectedCategory, setSelectedCategory] = useState<NoteCategory>("behavior");
  const [noteText, setNoteText] = useState(VOICE_SAMPLES[0].transcript);
  const [tagText, setTagText] = useState("");
  const [tags, setTags] = useState<string[]>(["Sundowning", "Audio Therapy", "Severity: MODERATE"]);
  const [voiceRecorded, setVoiceRecorded] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // AI Scribe State
  const [scribeAnalyzing, setScribeAnalyzing] = useState(false);
  const [scribeResult, setScribeResult] = useState<any>({
    originalText: VOICE_SAMPLES[0].transcript,
    extractedCategory: "behavior",
    categoryLabel: "Sundowning & Agitation Episode",
    triggerIdentified: "Sensory fatigue or room shadow confusion around sunset",
    interventionUsed: "Validation therapy & played Majuli reminiscence flute audio",
    suggestedFollowUp: "Activate Sandhya Shanti calming protocol before 5:00 PM tomorrow",
    clinicalSeverity: "moderate",
  });

  const handleSelectPreset = (preset: string) => {
    setNoteText(preset);
  };

  const handleSelectVoiceSample = async (sample: typeof VOICE_SAMPLES[0]) => {
    setNoteText(sample.transcript);
    setSelectedCategory(sample.category);
    setVoiceRecorded(true);
    setScribeAnalyzing(true);
    const result = await caregiverStorage.parseVoiceToCareNote(sample.transcript);
    setScribeResult(result);
    setScribeAnalyzing(false);
    const updatedTags = Array.from(
      new Set([
        ...tags.filter((item) => !item.startsWith("Severity:")),
        result.categoryLabel,
        `Severity: ${result.clinicalSeverity.toUpperCase()}`,
      ])
    );
    setTags(updatedTags);
  };

  const addTag = () => {
    const trimmed = tagText.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagText("");
    }
  };

  const removeTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  const handleSave = async () => {
    if (!noteText.trim()) {
      Alert.alert("Missing Note", "Please write an observation or select a voice scribe sample.");
      return;
    }

    setSubmitting(true);
    try {
      await caregiverStorage.addCareNote({
        category: selectedCategory,
        note: noteText.trim(),
        tags,
        voiceNoteDuration: voiceRecorded ? "0:38" : undefined,
        aiScribeDetails: scribeResult ? {
          triggerIdentified: scribeResult.triggerIdentified,
          interventionUsed: scribeResult.interventionUsed,
          suggestedFollowUp: scribeResult.suggestedFollowUp,
          clinicalSeverity: scribeResult.clinicalSeverity,
        } : undefined,
      });

      setSubmitting(false);
      onNoteAdded();
      onClose();
    } catch {
      setSubmitting(false);
      Alert.alert("Error", "Could not save note. Please try again.");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Caregiver AI Clinical Scribe</Text>
              <Text style={styles.headerSubtitle}>
                Auto-extracts triggers, interventions & clinical severity from voice
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={WarmPalette.charcoalWarm} />
            </TouchableOpacity>
          </View>

          {/* Mode Switcher */}
          <View style={styles.modeSwitcher}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === "voice_scribe" && styles.modeBtnActiveVoice]}
              onPress={() => setMode("voice_scribe")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="mic"
                size={15}
                color={mode === "voice_scribe" ? "#FFFFFF" : "#7C3AED"}
              />
              <Text
                style={[
                  styles.modeBtnText,
                  mode === "voice_scribe" ? styles.modeBtnTextActive : { color: "#7C3AED" },
                ]}
              >
                AI Scribe
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeBtn, mode === "text" && styles.modeBtnActive]}
              onPress={() => setMode("text")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="create-outline"
                size={15}
                color={mode === "text" ? "#FFFFFF" : WarmPalette.charcoalWarm}
              />
              <Text style={[styles.modeBtnText, mode === "text" && styles.modeBtnTextActive]}>
                Manual Note
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ══════════ AI VOICE SCRIBE MODE ══════════ */}
            {mode === "voice_scribe" ? (
              <View>
                <View style={styles.scribeHeroCard}>
                  <View style={styles.scribeMicCircle}>
                    <Ionicons name="mic" size={24} color="#7C3AED" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.scribeHeroTitle}>Spoken Clinical Dictation</Text>
                    <Text style={styles.scribeHeroSub}>
                      Speak naturally in Assamese or English. AI classifies triggers, care actions, and follow-ups.
                    </Text>
                  </View>
                </View>

                {/* Sample Audio Chips */}
                <Text style={styles.inputLabel}>CHOOSE REAL-LIFE SCENARIO (TAP TO DICTATE)</Text>
                <View style={styles.samplesContainer}>
                  {VOICE_SAMPLES.map((sample, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.sampleChip,
                        noteText === sample.transcript && styles.sampleChipSelected,
                      ]}
                      onPress={() => handleSelectVoiceSample(sample)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.sampleHeaderRow}>
                        <Ionicons
                          name="volume-medium-outline"
                          size={16}
                          color={noteText === sample.transcript ? "#7C3AED" : WarmPalette.charcoalWarm}
                        />
                        <Text
                          style={[
                            styles.sampleTitle,
                            noteText === sample.transcript && { color: "#7C3AED" },
                          ]}
                        >
                          {sample.title}
                        </Text>
                      </View>
                      <Text style={styles.sampleTranscriptPreview} numberOfLines={2}>
                        "{sample.transcript}"
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Live Extraction Preview */}
                {scribeAnalyzing && (
                  <View style={styles.scribeLoadingCard}>
                    <Text style={styles.scribeLoadingText}>AI Clinical Scribe is analyzing triggers & severity...</Text>
                  </View>
                )}

                {scribeResult && (
                  <View style={styles.scribeResultCard}>
                    <View style={styles.scribeResultHeader}>
                      <View style={styles.scribeBadge}>
                        <Ionicons name="sparkles" size={14} color="#7C3AED" />
                        <Text style={styles.scribeBadgeText}>{scribeResult.categoryLabel}</Text>
                      </View>
                      <View
                        style={[
                          styles.severityBadge,
                          scribeResult.clinicalSeverity === "high"
                            ? styles.sevHigh
                            : scribeResult.clinicalSeverity === "moderate"
                            ? styles.sevMod
                            : styles.sevLow,
                        ]}
                      >
                        <Text style={styles.severityText}>
                          {scribeResult.clinicalSeverity.toUpperCase()} SEVERITY
                        </Text>
                      </View>
                    </View>

                    <View style={styles.scribeField}>
                      <Text style={styles.scribeFieldLabel}>Trigger Identified:</Text>
                      <Text style={styles.scribeFieldValue}>{scribeResult.triggerIdentified}</Text>
                    </View>

                    <View style={styles.scribeField}>
                      <Text style={styles.scribeFieldLabel}>Intervention Logged:</Text>
                      <Text style={styles.scribeFieldValue}>{scribeResult.interventionUsed}</Text>
                    </View>

                    <View style={styles.scribeField}>
                      <Text style={styles.scribeFieldLabel}>Suggested Follow-Up:</Text>
                      <Text style={styles.scribeFieldValue}>{scribeResult.suggestedFollowUp}</Text>
                    </View>
                  </View>
                )}

                {/* Dictation Text */}
                <Text style={styles.inputLabel}>TRANSCRIBED OBSERVATION</Text>
                <TextInput
                  style={styles.textInput}
                  multiline
                  numberOfLines={4}
                  placeholder="Voice transcription appears here..."
                  placeholderTextColor={WarmPalette.charcoalWarm + "60"}
                  value={noteText}
                  onChangeText={setNoteText}
                />
              </View>
            ) : (
              /* ══════════ STANDARD NOTE MODE ══════════ */
              <View>
                {/* Category Selector */}
                <Text style={styles.inputLabel}>SELECT CATEGORY</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
                  {CATEGORIES.map((c) => {
                    const isSelected = selectedCategory === c.cat;
                    return (
                      <TouchableOpacity
                        key={c.cat}
                        style={[
                          styles.catChip,
                          isSelected && { backgroundColor: c.color, borderColor: c.color },
                        ]}
                        onPress={() => setSelectedCategory(c.cat)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={c.icon}
                          size={15}
                          color={isSelected ? "#FFFFFF" : WarmPalette.charcoalWarm}
                        />
                        <Text
                          style={[
                            styles.catChipText,
                            { color: isSelected ? "#FFFFFF" : WarmPalette.charcoalWarm },
                          ]}
                        >
                          {c.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Note Input */}
                <Text style={styles.inputLabel}>YOUR OBSERVATION</Text>
                <TextInput
                  style={styles.textInput}
                  multiline
                  numberOfLines={4}
                  placeholder="e.g. Seemed cheerful after talking to Arjun. Took his afternoon rest peacefully."
                  placeholderTextColor={WarmPalette.charcoalWarm + "60"}
                  value={noteText}
                  onChangeText={setNoteText}
                />

                {/* Quick Suggestions */}
                <Text style={styles.inputLabel}>QUICK OBSERVATIONS (TAP TO FILL)</Text>
                <View style={styles.presetsList}>
                  {PRESET_OBSERVATIONS[selectedCategory].map((preset, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.presetChip}
                      onPress={() => handleSelectPreset(preset)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="create-outline" size={14} color={WarmPalette.roseDusty} />
                      <Text style={styles.presetText}>{preset}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Optional Voice Note Simulation */}
                <TouchableOpacity
                  style={[
                    styles.voiceNoteToggle,
                    voiceRecorded && { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
                  ]}
                  onPress={() => setVoiceRecorded(!voiceRecorded)}
                >
                  <Ionicons
                    name={voiceRecorded ? "mic" : "mic-outline"}
                    size={20}
                    color={voiceRecorded ? "#059669" : WarmPalette.charcoalWarm}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.voiceTitle}>
                      {voiceRecorded ? "Voice Note Attached (0:38)" : "Attach Voice Note"}
                    </Text>
                    <Text style={styles.voiceSub}>
                      {voiceRecorded ? "Tap to remove voice note" : "Record quick spoken observations on the go"}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Tags section */}
            <Text style={styles.inputLabel}>TAGS</Text>
            <View style={styles.tagInputRow}>
              <TextInput
                style={styles.tagInput}
                placeholder="Add a tag (e.g. Sundowning, Hydration, Calm)"
                placeholderTextColor={WarmPalette.charcoalWarm + "60"}
                value={tagText}
                onChangeText={setTagText}
                onSubmitEditing={addTag}
              />
              <TouchableOpacity style={styles.addTagBtn} onPress={addTag}>
                <Ionicons name="add" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.tagsContainer}>
              {tags.map((t, idx) => (
                <View key={`tag-${idx}-${t}`} style={styles.tagBadge}>
                  <Text style={styles.tagBadgeText}>#{t}</Text>
                  <TouchableOpacity onPress={() => removeTag(t)} style={{ marginLeft: 4 }}>
                    <Ionicons name="close-circle" size={14} color={WarmPalette.charcoalWarm + "80"} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.saveBtn,
                mode === "voice_scribe" && { backgroundColor: "#7C3AED" },
                submitting && { opacity: 0.7 },
              ]}
              onPress={handleSave}
              disabled={submitting}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>
                {submitting ? "Saving..." : mode === "voice_scribe" ? "Save AI Observation" : "Save Care Note"}
              </Text>
            </TouchableOpacity>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: WarmPalette.sand,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
  },
  headerSubtitle: {
    fontSize: 12,
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
  },
  modeSwitcher: {
    flexDirection: "row",
    backgroundColor: WarmPalette.sand + "60",
    borderRadius: 14,
    padding: 4,
    marginHorizontal: 20,
    marginTop: 12,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  modeBtnActive: {
    backgroundColor: WarmPalette.roseDusty,
  },
  modeBtnActiveVoice: {
    backgroundColor: "#7C3AED",
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  modeBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  scroll: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 30,
  },
  scribeHeroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#DDD6FE",
    padding: 14,
    marginBottom: 14,
  },
  scribeMicCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  scribeHeroTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#5B21B6",
  },
  scribeHeroSub: {
    fontSize: 12,
    color: "#6D28D9",
    marginTop: 2,
    lineHeight: 16,
  },
  samplesContainer: {
    gap: 8,
    marginBottom: 14,
  },
  sampleChip: {
    backgroundColor: WarmPalette.cream,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: WarmPalette.sand,
    padding: 12,
  },
  sampleChipSelected: {
    borderColor: "#7C3AED",
    backgroundColor: "#FAF5FF",
  },
  sampleHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  sampleTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
  },
  sampleTranscriptPreview: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm + "85",
    lineHeight: 16,
    fontStyle: "italic",
  },
  scribeLoadingCard: {
    backgroundColor: "#FAF5FF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  scribeLoadingText: {
    fontSize: 12.5,
    color: "#7C3AED",
    fontWeight: "700",
  },
  scribeResultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#DDD6FE",
    padding: 14,
    marginBottom: 14,
    gap: 8,
  },
  scribeResultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  scribeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scribeBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#7C3AED",
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sevLow: {
    backgroundColor: "#DCFCE7",
  },
  sevMod: {
    backgroundColor: "#FEF3C7",
  },
  sevHigh: {
    backgroundColor: "#FEE2E2",
  },
  severityText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
  },
  scribeField: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 6,
  },
  scribeFieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
    letterSpacing: 0.3,
  },
  scribeFieldValue: {
    fontSize: 13,
    fontWeight: "600",
    color: WarmPalette.charcoalWarm,
    marginTop: 2,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm + "90",
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 6,
  },
  catRow: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 4,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 6,
  },
  catChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  textInput: {
    backgroundColor: WarmPalette.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: WarmPalette.charcoalWarm,
    textAlignVertical: "top",
    minHeight: 85,
  },
  presetsList: {
    gap: 8,
  },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.cream,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    gap: 8,
  },
  presetText: {
    fontSize: 13,
    color: WarmPalette.charcoalWarm,
    flex: 1,
  },
  voiceNoteToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.cream,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    padding: 12,
    marginTop: 16,
  },
  voiceTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: WarmPalette.charcoalWarm,
  },
  voiceSub: {
    fontSize: 11,
    color: WarmPalette.charcoalWarm + "80",
    marginTop: 1,
  },
  tagInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tagInput: {
    flex: 1,
    backgroundColor: WarmPalette.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: WarmPalette.charcoalWarm,
  },
  addTagBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: WarmPalette.roseDusty,
    alignItems: "center",
    justifyContent: "center",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  tagBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.sand,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: WarmPalette.charcoalWarm,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WarmPalette.roseDusty,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 22,
    gap: 8,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
