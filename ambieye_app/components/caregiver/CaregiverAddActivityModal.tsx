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
import { caregiverStorage, CaregiverActivity } from "../../utils/caregiverStorage";

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
  defaultIsRealWorld?: boolean;
}

type ActivityCategory = "movement" | "cognitive" | "social" | "daily_life" | "offline_real_world";

interface RealWorldTemplate {
  title: string;
  category: ActivityCategory;
  duration: string;
  notes: string;
  suggestedPrompt: string;
  iconName: string;
}

const TEMPLATES: RealWorldTemplate[] = [
  {
    title: "Play cards with family",
    category: "offline_real_world",
    duration: "25 min",
    notes: "Play a relaxed, familiar card game without strict rules.",
    suggestedPrompt: "Play a classic round of cards at the living room table.",
    iconName: "albums-outline",
  },
  {
    title: "Look through old family photos",
    category: "offline_real_world",
    duration: "20 min",
    notes: "Sit together with a vintage photo album and reminisce.",
    suggestedPrompt: "Look at the 1990s family album and ask about favorite moments.",
    iconName: "images-outline",
  },
  {
    title: "Tell a story about childhood",
    category: "offline_real_world",
    duration: "15 min",
    notes: "Encourage storytelling about their school days or hometown.",
    suggestedPrompt: "Ask: 'What games did you love playing when you were 10?'",
    iconName: "chatbubble-ellipses-outline",
  },
  {
    title: "Read today's newspaper together",
    category: "offline_real_world",
    duration: "20 min",
    notes: "Read headline articles and discuss local events gently.",
    suggestedPrompt: "Read the morning newspaper front page together.",
    iconName: "newspaper-outline",
  },
  {
    title: "Sort household spices / objects",
    category: "offline_real_world",
    duration: "15 min",
    notes: "Sensory exercise smelling cardamom, cloves, and sorting containers.",
    suggestedPrompt: "Gentle sensory sorting activity in the kitchen.",
    iconName: "color-filter-outline",
  },
  {
    title: "Listen to favorite classic songs",
    category: "offline_real_world",
    duration: "30 min",
    notes: "Play Kishore Kumar or Lata Mangeshkar favorites on the speaker.",
    suggestedPrompt: "Sit by the window listening to 1970s classics.",
    iconName: "musical-notes-outline",
  },
  {
    title: "Morning garden or corridor walk",
    category: "movement",
    duration: "20 min",
    notes: "Gentle walking with support, feeling fresh air and morning sun.",
    suggestedPrompt: "Brisk gentle walk around the garden or apartment corridor.",
    iconName: "walk-outline",
  },
  {
    title: "Seated chair stretches",
    category: "movement",
    duration: "15 min",
    notes: "Gentle shoulder rolls, wrist rotations, and ankle bends.",
    suggestedPrompt: "Follow simple 10-step seated chair stretching.",
    iconName: "body-outline",
  },
  {
    title: "Solve a simple 12-piece puzzle",
    category: "cognitive",
    duration: "15 min",
    notes: "Tactile puzzle solving with high-contrast pieces.",
    suggestedPrompt: "Assemble the wooden scenery puzzle together.",
    iconName: "grid-outline",
  },
];

export const CaregiverAddActivityModal: React.FC<Props> = ({
  visible,
  onClose,
  onAdded,
  defaultIsRealWorld = false,
}) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ActivityCategory>(
    defaultIsRealWorld ? "offline_real_world" : "movement"
  );
  const [timeLabel, setTimeLabel] = useState("10:00 AM");
  const [duration, setDuration] = useState("20 min");
  const [notes, setNotes] = useState("");
  const [suggestedPrompt, setSuggestedPrompt] = useState("");
  const [iconName, setIconName] = useState("calendar-outline");
  const [isRealWorld, setIsRealWorld] = useState(defaultIsRealWorld);
  const [submitting, setSubmitting] = useState(false);

  const applyTemplate = (tmpl: RealWorldTemplate) => {
    setTitle(tmpl.title);
    setCategory(tmpl.category);
    setDuration(tmpl.duration);
    setNotes(tmpl.notes);
    setSuggestedPrompt(tmpl.suggestedPrompt);
    setIconName(tmpl.iconName);
    setIsRealWorld(tmpl.category === "offline_real_world" || tmpl.category === "cognitive");
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please give this activity a title or choose a template.");
      return;
    }

    setSubmitting(true);
    try {
      await caregiverStorage.addActivity({
        title: title.trim(),
        category,
        timeLabel: timeLabel.trim() || "10:00 AM",
        completed: false,
        duration: duration.trim() || "15 min",
        notes: notes.trim(),
        isRealWorldStimulation: isRealWorld,
        suggestedPrompt: suggestedPrompt.trim() || undefined,
        iconName: iconName || "calendar-outline",
      });

      setSubmitting(false);
      onAdded();
      onClose();
    } catch {
      setSubmitting(false);
      Alert.alert("Error", "Could not save activity. Please try again.");
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
              <Text style={styles.headerTitle}>Schedule Activity</Text>
              <Text style={styles.headerSubtitle}>
                Movement, social moments, or real-world cognitive stimulation
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
            {/* Quick Real-World Stimulation Templates */}
            <Text style={styles.inputLabel}>QUICK SUGGESTIONS & REAL-WORLD STIMULATION</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templatesRow}>
              {TEMPLATES.map((tmpl, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.templateCard}
                  onPress={() => applyTemplate(tmpl)}
                  activeOpacity={0.8}
                >
                  <View style={styles.tmplIconCircle}>
                    <Ionicons name={tmpl.iconName as any} size={18} color={WarmPalette.roseDusty} />
                  </View>
                  <Text style={styles.tmplTitle} numberOfLines={2}>
                    {tmpl.title}
                  </Text>
                  <Text style={styles.tmplDuration}>{tmpl.duration}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Title Input */}
            <Text style={styles.inputLabel}>ACTIVITY NAME *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Look through old photo album, Chair exercises"
              placeholderTextColor={WarmPalette.charcoalWarm + "60"}
              value={title}
              onChangeText={setTitle}
            />

            {/* Time & Duration Row */}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>TIME</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 10:00 AM"
                  placeholderTextColor={WarmPalette.charcoalWarm + "60"}
                  value={timeLabel}
                  onChangeText={setTimeLabel}
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>DURATION</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 20 min"
                  placeholderTextColor={WarmPalette.charcoalWarm + "60"}
                  value={duration}
                  onChangeText={setDuration}
                />
              </View>
            </View>

            {/* Category selection */}
            <Text style={styles.inputLabel}>CATEGORY</Text>
            <View style={styles.categoryRow}>
              {[
                { cat: "offline_real_world" as ActivityCategory, label: "Real-World Stim", icon: "sparkles" },
                { cat: "movement" as ActivityCategory, label: "Movement", icon: "walk" },
                { cat: "cognitive" as ActivityCategory, label: "Cognitive", icon: "bulb" },
                { cat: "social" as ActivityCategory, label: "Social", icon: "people" },
              ].map((c) => {
                const isSelected = category === c.cat;
                return (
                  <TouchableOpacity
                    key={c.cat}
                    style={[
                      styles.categoryChip,
                      isSelected && { backgroundColor: WarmPalette.roseDusty, borderColor: WarmPalette.roseDusty },
                    ]}
                    onPress={() => {
                      setCategory(c.cat);
                      setIsRealWorld(c.cat === "offline_real_world" || c.cat === "cognitive");
                    }}
                  >
                    <Ionicons
                      name={c.icon as any}
                      size={14}
                      color={isSelected ? "#FFFFFF" : WarmPalette.charcoalWarm}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: isSelected ? "#FFFFFF" : WarmPalette.charcoalWarm },
                      ]}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Notes & Prompts */}
            <Text style={styles.inputLabel}>CAREGIVER GUIDANCE / PROMPT (OPTIONAL)</Text>
            <TextInput
              style={[styles.textInput, { height: 72, textAlignVertical: "top" }]}
              multiline
              numberOfLines={3}
              placeholder="e.g. Keep a glass of water nearby. Encourage them to name relatives in the photos."
              placeholderTextColor={WarmPalette.charcoalWarm + "60"}
              value={notes}
              onChangeText={setNotes}
            />

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={submitting}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>
                {submitting ? "Adding..." : "Add to Daily Schedule"}
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
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  headerSubtitle: {
    fontSize: 13,
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
  scroll: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm + "90",
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 6,
  },
  templatesRow: {
    flexDirection: "row",
    gap: 10,
    paddingBottom: 6,
  },
  templateCard: {
    width: 140,
    backgroundColor: WarmPalette.cream,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    padding: 12,
  },
  tmplIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: WarmPalette.peach,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  tmplTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
    height: 32,
  },
  tmplDuration: {
    fontSize: 11,
    color: WarmPalette.charcoalWarm + "80",
    marginTop: 4,
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
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  categoryChip: {
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
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WarmPalette.roseDusty,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 24,
    gap: 8,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
