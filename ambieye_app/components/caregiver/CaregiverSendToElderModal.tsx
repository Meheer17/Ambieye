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
import { caregiverStorage, FamilySentItem } from "../../utils/caregiverStorage";
import { musicService } from "../../services/music/musicService";

interface Props {
  visible: boolean;
  onClose: () => void;
  elderName: string;
  onItemSent?: () => void;
}

type SendType = "message" | "voice" | "photo" | "song" | "memory_prompt" | "reminder" | "video";

interface TypeOption {
  type: SendType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}

const SEND_OPTIONS: TypeOption[] = [
  { type: "message", label: "Message", icon: "chatbubble-ellipses", color: "#C2747C", bgColor: "#FDF2F4" },
  { type: "voice", label: "Voice Note", icon: "mic", color: "#EA580C", bgColor: "#FFF7ED" },
  { type: "photo", label: "Photo", icon: "image", color: "#7C8E77", bgColor: "#F2F7F1" },
  { type: "song", label: "Song / Audio", icon: "musical-notes", color: "#8B5CF6", bgColor: "#F5F3FF" },
  { type: "memory_prompt", label: "Memory Prompt", icon: "bulb", color: "#D97706", bgColor: "#FFFBEB" },
  { type: "reminder", label: "Gentle Reminder", icon: "alarm", color: "#0284C7", bgColor: "#F0F9FF" },
];

const PRESETS: Record<SendType, string[]> = {
  message: [
    "Hi Amma, I'll call you right after dinner.",
    "Thinking of you! Sending you a big warm hug.",
    "Had some wonderful tea this morning, just like you used to make.",
  ],
  voice: [
    "Voice note: 'Hello Amma! Hope you enjoyed breakfast. Calling soon!' (24s)",
    "Voice note: 'Rahul here! Arjun did so well in school today!' (42s)",
  ],
  photo: [
    "Family garden photo from yesterday evening",
    "Arjun's drawing of a mango tree",
    "Throwback photo of Ooty trip (1998)",
  ],
  song: [
    "Yeh Shaam Mastani - Kishore Kumar",
    "Pal Pal Dil Ke Paas - Kishore Kumar",
    "Morning Bhajans playlist (30 min)",
  ],
  memory_prompt: [
    "Remember our trip to Ooty where it rained all day?",
    "Do you remember the mango tree in our Shimoga garden?",
    "Remember who taught Rahul how to fly kites?",
  ],
  reminder: [
    "Time to sip a glass of warm water, Amma.",
    "Evening tea time with Papa in 15 minutes.",
    "Gentle reminder: Doctor Sharma visit tomorrow morning.",
  ],
  video: [
    "Quick video greetings from grandson Arjun",
  ],
};

export const CaregiverSendToElderModal: React.FC<Props> = ({
  visible,
  onClose,
  elderName,
  onItemSent,
}) => {
  const [selectedType, setSelectedType] = useState<SendType>("message");
  const [customText, setCustomText] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  const handleSelectPreset = (preset: string) => {
    setCustomText(preset);
    if (!customTitle) {
      if (selectedType === "voice") setCustomTitle("Loving Voice Message");
      else if (selectedType === "photo") setCustomTitle("Family Photo");
      else if (selectedType === "song") setCustomTitle("Favorite Melodies");
      else if (selectedType === "memory_prompt") setCustomTitle("A Happy Memory");
      else setCustomTitle("Care Note");
    }
  };

  const handleSend = async () => {
    if (!customText.trim()) {
      Alert.alert("Please provide content", "Type a message or select one of the suggested prompts below.");
      return;
    }

    setSubmitting(true);
    try {
      const title =
        customTitle.trim() ||
        (selectedType === "message"
          ? "Message from Anita"
          : selectedType === "voice"
          ? "Voice Note from Anita"
          : selectedType === "photo"
          ? "Family Photo"
          : selectedType === "song"
          ? "Music from Family"
          : selectedType === "memory_prompt"
          ? "Memory Moment"
          : "Gentle Reminder");

      await caregiverStorage.sendToElder({
        type: selectedType,
        senderName: "Anita (Daughter)",
        title,
        content: customText.trim(),
      });

      if (selectedType === "song") {
        try {
          await musicService.addCustomTrack({
            title: title !== "Music from Family" ? title : customText.trim(),
            artist: "Dedicated by Anita (Daughter)",
            category: "hindi_classics",
            region: "Family Dedication",
            language: "Personal",
            description: customText.trim(),
            durationSeconds: 180,
            isFamilyRecommended: true,
            recommendedBy: "Anita (Daughter)",
          });
        } catch (musicErr) {
          console.warn("Could not add custom track to music service:", musicErr);
        }
      }

      setSuccessNotice(true);
      if (onItemSent) onItemSent();
      setTimeout(() => {
        setSuccessNotice(false);
        setCustomText("");
        setCustomTitle("");
        setSubmitting(false);
        onClose();
      }, 1200);
    } catch {
      setSubmitting(false);
      Alert.alert("Error", "Could not send item right now. Please try again.");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          {/* Native Mobile Sheet Drag Handle */}
          <View style={styles.sheetHandleBar}>
            <View style={styles.sheetHandle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Send something to {elderName}</Text>
              <Text style={styles.headerSubtitle}>
                Delivered instantly to their calm home screen in large, gentle text
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
                <Ionicons name="checkmark-circle" size={48} color="#16A34A" />
                <Text style={styles.successTitle}>Sent to {elderName}!</Text>
                <Text style={styles.successSubtitle}>
                  This has been added to their home view with gentle audio guidance.
                </Text>
              </View>
            ) : (
              <>
                {/* Type Selector Horizontal Pills */}
                <Text style={styles.inputLabel}>CHOOSE WHAT TO SEND</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.typesRow}
                >
                  {SEND_OPTIONS.map((item) => {
                    const isSelected = selectedType === item.type;
                    return (
                      <TouchableOpacity
                        key={item.type}
                        style={[
                          styles.typeChip,
                          { backgroundColor: isSelected ? item.color : item.bgColor },
                          isSelected && styles.typeChipSelected,
                        ]}
                        onPress={() => {
                          setSelectedType(item.type);
                          setCustomText("");
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={item.icon}
                          size={16}
                          color={isSelected ? "#FFFFFF" : item.color}
                        />
                        <Text
                          style={[
                            styles.typeChipText,
                            { color: isSelected ? "#FFFFFF" : WarmPalette.charcoalWarm },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Optional Title */}
                <Text style={styles.inputLabel}>TITLE / SUBJECT (OPTIONAL)</Text>
                <TextInput
                  style={styles.titleInput}
                  placeholder="e.g. A warm memory from 1998"
                  placeholderTextColor={WarmPalette.charcoalWarm + "60"}
                  value={customTitle}
                  onChangeText={setCustomTitle}
                />

                {/* Content Input */}
                <Text style={styles.inputLabel}>
                  {selectedType === "voice"
                    ? "VOICE NOTE PREVIEW / DESCRIPTION"
                    : selectedType === "song"
                    ? "SONG NAME & ARTIST"
                    : selectedType === "photo"
                    ? "PHOTO CAPTION"
                    : selectedType === "memory_prompt"
                    ? "MEMORY QUESTION OR PROMPT"
                    : "MESSAGE CONTENT"}
                </Text>
                <TextInput
                  style={styles.messageInput}
                  multiline
                  numberOfLines={4}
                  placeholder={
                    selectedType === "memory_prompt"
                      ? "Ask a gentle question like: 'Remember our trip to Ooty?'"
                      : selectedType === "song"
                      ? "e.g. Kishore Kumar - Yeh Shaam Mastani"
                      : "Type your loving message here..."
                  }
                  placeholderTextColor={WarmPalette.charcoalWarm + "60"}
                  value={customText}
                  onChangeText={setCustomText}
                />

                {/* Quick Presets / Suggestions */}
                <Text style={styles.inputLabel}>QUICK SUGGESTIONS (TAP TO FILL)</Text>
                <View style={styles.presetsList}>
                  {(PRESETS[selectedType] || PRESETS.message).map((preset, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.presetChip}
                      onPress={() => handleSelectPreset(preset)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="sparkles" size={14} color={WarmPalette.roseDusty} />
                      <Text style={styles.presetText}>{preset}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Send Button */}
                <TouchableOpacity
                  style={[styles.sendBtn, submitting && { opacity: 0.7 }]}
                  onPress={handleSend}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                  <Text style={styles.sendBtnText}>
                    {submitting ? "Delivering..." : `Send to ${elderName}`}
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
    marginLeft: 12,
  },
  scroll: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm + "90",
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
  },
  typesRow: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 4,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    gap: 6,
  },
  typeChipSelected: {
    borderColor: "transparent",
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  titleInput: {
    backgroundColor: WarmPalette.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: WarmPalette.charcoalWarm,
  },
  messageInput: {
    backgroundColor: WarmPalette.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: WarmPalette.charcoalWarm,
    textAlignVertical: "top",
    minHeight: 90,
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
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    gap: 8,
  },
  presetText: {
    fontSize: 13,
    color: WarmPalette.charcoalWarm,
    flex: 1,
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WarmPalette.roseDusty,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 20,
    gap: 8,
    shadowColor: WarmPalette.roseDusty,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  sendBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  successCard: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
    marginTop: 12,
  },
  successSubtitle: {
    fontSize: 14,
    color: WarmPalette.charcoalWarm + "99",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
});
