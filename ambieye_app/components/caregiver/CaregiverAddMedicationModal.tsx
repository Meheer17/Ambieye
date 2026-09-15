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
import { caregiverStorage, CaregiverMedication } from "../../utils/caregiverStorage";

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
  editingMedication?: CaregiverMedication | null;
}

type TimeSlot = "morning" | "afternoon" | "evening" | "night";

const TIME_SLOT_OPTIONS: Array<{ slot: TimeSlot; label: string; defaultTime: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { slot: "morning", label: "Morning", defaultTime: "8:00 AM", icon: "sunny-outline" },
  { slot: "afternoon", label: "Afternoon", defaultTime: "1:00 PM", icon: "partly-sunny-outline" },
  { slot: "evening", label: "Evening", defaultTime: "8:00 PM", icon: "moon-outline" },
  { slot: "night", label: "Bedtime", defaultTime: "10:00 PM", icon: "bed-outline" },
];

export const CaregiverAddMedicationModal: React.FC<Props> = ({
  visible,
  onClose,
  onAdded,
  editingMedication,
}) => {
  const [name, setName] = useState(editingMedication?.name || "");
  const [dosage, setDosage] = useState(editingMedication?.dosage || "");
  const [instructions, setInstructions] = useState(editingMedication?.instructions || "");
  const [timeSlot, setTimeSlot] = useState<TimeSlot>(editingMedication?.timeSlot || "morning");
  const [timeLabel, setTimeLabel] = useState(editingMedication?.timeLabel || "8:00 AM");
  const [submitting, setSubmitting] = useState(false);

  // Sync state if editingMedication changes
  React.useEffect(() => {
    if (editingMedication) {
      setName(editingMedication.name);
      setDosage(editingMedication.dosage);
      setInstructions(editingMedication.instructions);
      setTimeSlot(editingMedication.timeSlot);
      setTimeLabel(editingMedication.timeLabel);
    } else {
      setName("");
      setDosage("");
      setInstructions("");
      setTimeSlot("morning");
      setTimeLabel("8:00 AM");
    }
  }, [editingMedication, visible]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Missing Name", "Please enter the medication name.");
      return;
    }
    if (!dosage.trim()) {
      Alert.alert("Missing Dosage", "Please enter the dosage (e.g., 5mg, 1 tablet).");
      return;
    }

    setSubmitting(true);
    try {
      if (editingMedication) {
        await caregiverStorage.updateMedication(editingMedication.id, {
          name: name.trim(),
          dosage: dosage.trim(),
          instructions: instructions.trim() || "Take with warm water",
          timeSlot,
          timeLabel,
        });
      } else {
        await caregiverStorage.addMedication({
          name: name.trim(),
          dosage: dosage.trim(),
          instructions: instructions.trim() || "Take with warm water",
          timeSlot,
          timeLabel,
          pillColor: timeSlot === "morning" ? "#EA580C" : timeSlot === "afternoon" ? "#0284C7" : "#8B5CF6",
        });
      }

      setSubmitting(false);
      onAdded();
      onClose();
    } catch {
      setSubmitting(false);
      Alert.alert("Error", "Could not save medication. Please try again.");
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
              <Text style={styles.headerTitle}>
                {editingMedication ? "Edit Medication" : "Add New Medication"}
              </Text>
              <Text style={styles.headerSubtitle}>
                Clear scheduling and gentle dosage instructions
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
            {/* Medicine Name */}
            <Text style={styles.inputLabel}>MEDICATION NAME *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Donepezil, Memantine, Telmisartan"
              placeholderTextColor={WarmPalette.charcoalWarm + "60"}
              value={name}
              onChangeText={setName}
            />

            {/* Dosage */}
            <Text style={styles.inputLabel}>DOSAGE / STRENGTH *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 5 mg (1 tablet), 2 drops"
              placeholderTextColor={WarmPalette.charcoalWarm + "60"}
              value={dosage}
              onChangeText={setDosage}
            />

            {/* Time Slot Selection */}
            <Text style={styles.inputLabel}>TIME OF DAY</Text>
            <View style={styles.slotsRow}>
              {TIME_SLOT_OPTIONS.map((opt) => {
                const isSelected = timeSlot === opt.slot;
                return (
                  <TouchableOpacity
                    key={opt.slot}
                    style={[
                      styles.slotChip,
                      isSelected && { backgroundColor: WarmPalette.roseDusty, borderColor: WarmPalette.roseDusty },
                    ]}
                    onPress={() => {
                      setTimeSlot(opt.slot);
                      setTimeLabel(opt.defaultTime);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={16}
                      color={isSelected ? "#FFFFFF" : WarmPalette.charcoalWarm}
                    />
                    <Text
                      style={[
                        styles.slotChipText,
                        { color: isSelected ? "#FFFFFF" : WarmPalette.charcoalWarm },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Exact Time Label */}
            <Text style={styles.inputLabel}>SCHEDULED TIME</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 8:00 AM"
              placeholderTextColor={WarmPalette.charcoalWarm + "60"}
              value={timeLabel}
              onChangeText={setTimeLabel}
            />

            {/* Instructions */}
            <Text style={styles.inputLabel}>INSTRUCTIONS & NOTES</Text>
            <TextInput
              style={[styles.textInput, { height: 74, textAlignVertical: "top" }]}
              multiline
              numberOfLines={3}
              placeholder="e.g. Take after breakfast with warm water. Do not crush."
              placeholderTextColor={WarmPalette.charcoalWarm + "60"}
              value={instructions}
              onChangeText={setInstructions}
            />

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={submitting}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>
                {submitting ? "Saving..." : editingMedication ? "Update Medication" : "Save Medication"}
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
    maxHeight: "90%",
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
  slotsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  slotChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  slotChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WarmPalette.sageWarm,
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
