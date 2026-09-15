import React, { useState, useEffect } from "react";
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
import Feather from "@expo/vector-icons/Feather";
import { WarmPalette } from "../../constants/theme";
import { caregiverStorage, ShiftHandoffRecord } from "../../utils/caregiverStorage";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const CaregiverShiftHandoffModal: React.FC<Props> = ({ visible, onClose, onSaved }) => {
  const [record, setRecord] = useState<ShiftHandoffRecord | null>(null);
  const [noteText, setNoteText] = useState("");
  const [hasVoiceSummary, setHasVoiceSummary] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      caregiverStorage.getShiftHandoff().then((res) => {
        setRecord(res);
        setNoteText(res.handoffNote);
      });
    }
  }, [visible]);

  const toggleChecklist = (id: string) => {
    if (!record) return;
    const updatedList = record.completedChecklist.map((item) =>
      item.id === id ? { ...item, done: !item.done } : item
    );
    setRecord({ ...record, completedChecklist: updatedList });
  };

  const handleSaveHandoff = async () => {
    if (!record) return;
    setSaving(true);
    try {
      const updated: ShiftHandoffRecord = {
        ...record,
        handoffNote: noteText,
        handoffTimestamp: "Just now · Handed over to " + record.nextCaregiver,
      };
      await caregiverStorage.saveShiftHandoff(updated);
      setSaving(false);
      Alert.alert(
        "Shift Handoff Logged",
        `Shift successfully handed over to ${record.nextCaregiver}. Handoff summary sent to family group.`
      );
      if (onSaved) onSaved();
      onClose();
    } catch {
      setSaving(false);
      Alert.alert("Error", "Could not save shift handoff. Please try again.");
    }
  };

  if (!record) return null;

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
              <Text style={styles.headerTitle}>Caregiver Shift Handoff</Text>
              <Text style={styles.headerSubtitle}>
                Continuous day & night eldercare coordination log
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={20} color={WarmPalette.charcoalWarm} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Active Shift Banner ── */}
            <View style={styles.shiftCard}>
              <View style={styles.shiftHeaderRow}>
                <View style={styles.shiftIconCircle}>
                  <Feather name="sun" size={20} color="#EA580C" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.shiftTitle}>{record.activeShift}</Text>
                  <Text style={styles.shiftSub}>
                    Current: <Text style={{ fontWeight: "800" }}>{record.currentCaregiver}</Text>
                  </Text>
                </View>
                <View style={styles.shiftPassingBadge}>
                  <Feather name="arrow-right" size={14} color="#059669" />
                  <Text style={styles.shiftPassingText}>Next: Rahul</Text>
                </View>
              </View>

              <View style={styles.shiftVitalsDivider} />
              <View style={styles.shiftVitalsRow}>
                <Feather name="activity" size={14} color="#059669" />
                <Text style={styles.shiftVitalsText}>{record.vitalSignsSummary}</Text>
              </View>
            </View>

            {/* ── Daytime Completed Checklist ── */}
            <Text style={styles.sectionLabel}>DAYTIME ROUTINE COMPLETED</Text>
            <View style={styles.checklistCard}>
              {record.completedChecklist.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.checkItemRow}
                  onPress={() => toggleChecklist(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkBox, item.done && styles.checkBoxDone]}>
                    {item.done && <Feather name="check" size={14} color="#FFFFFF" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.checkTitle, item.done && styles.checkTitleDone]}>
                      {item.title}
                    </Text>
                    <Text style={styles.checkDoneBy}>Logged by {item.doneBy}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Critical Night Tasks ── */}
            <Text style={styles.sectionLabel}>CRITICAL NIGHT GUARDIAN TASKS</Text>
            <View style={styles.nightTasksCard}>
              {record.pendingNightTasks.map((task) => (
                <View key={task.id} style={styles.nightTaskRow}>
                  <View
                    style={[
                      styles.nightTaskDot,
                      task.critical && { backgroundColor: "#DC2626" },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nightTaskTitle}>{task.title}</Text>
                    <Text style={styles.nightTaskDue}>Due by {task.dueTime} · Night Routine</Text>
                  </View>
                  {task.critical && (
                    <View style={styles.criticalBadge}>
                      <Text style={styles.criticalBadgeText}>CRITICAL</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* ── Audio Voice Handoff Note ── */}
            <Text style={styles.sectionLabel}>SPOKEN HANDOFF SUMMARY</Text>
            <TouchableOpacity
              style={[
                styles.voiceHandoffBox,
                hasVoiceSummary && { backgroundColor: "#F5F3FF", borderColor: "#DDD6FE" },
              ]}
              onPress={() => setHasVoiceSummary(!hasVoiceSummary)}
              activeOpacity={0.8}
            >
              <View style={styles.voiceMicBox}>
                <Feather name="mic" size={20} color="#7C3AED" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.voiceHandoffTitle}>
                  {hasVoiceSummary ? "Spoken Summary Attached (0:45)" : "Tap to record voice summary"}
                </Text>
                <Text style={styles.voiceHandoffSub}>
                  "Baba had peaceful mood. Sundowning prevented with warm tea at 5 PM."
                </Text>
              </View>
              <Feather
                name={hasVoiceSummary ? "check-circle" : "plus"}
                size={20}
                color={hasVoiceSummary ? "#7C3AED" : WarmPalette.charcoalWarm + "60"}
              />
            </TouchableOpacity>

            {/* ── Handoff Notes Input ── */}
            <Text style={styles.sectionLabel}>WRITTEN INSTRUCTIONS FOR NIGHT CAREGIVER</Text>
            <TextInput
              style={styles.textInput}
              multiline
              numberOfLines={3}
              placeholder="e.g. Side veranda gate locked. Extra blanket kept on chair."
              placeholderTextColor={WarmPalette.charcoalWarm + "60"}
              value={noteText}
              onChangeText={setNoteText}
            />

            {/* ── Save / Sign Off Button ── */}
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSaveHandoff}
              disabled={saving}
              activeOpacity={0.85}
            >
              <Feather name="check-circle" size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>
                {saving ? "Signing Handoff..." : "Sign & Pass Shift Handoff"}
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
  scroll: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
  },
  shiftCard: {
    backgroundColor: WarmPalette.cream,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: WarmPalette.sand,
    padding: 14,
    marginBottom: 14,
  },
  shiftHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  shiftIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  shiftTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
  },
  shiftSub: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm + "85",
    marginTop: 2,
  },
  shiftPassingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  shiftPassingText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#166534",
  },
  shiftVitalsDivider: {
    height: 1,
    backgroundColor: WarmPalette.sand + "70",
    marginVertical: 10,
  },
  shiftVitalsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  shiftVitalsText: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm + "90",
    fontWeight: "600",
  },
  sectionLabel: {
    fontSize: 11.5,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm + "80",
    letterSpacing: 0.6,
    marginTop: 10,
    marginBottom: 6,
  },
  checklistCard: {
    backgroundColor: WarmPalette.cream,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: WarmPalette.sand,
    padding: 14,
    gap: 12,
    marginBottom: 12,
  },
  checkItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: WarmPalette.sand,
    alignItems: "center",
    justifyContent: "center",
  },
  checkBoxDone: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },
  checkTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  checkTitleDone: {
    textDecorationLine: "line-through",
    color: WarmPalette.charcoalWarm + "70",
  },
  checkDoneBy: {
    fontSize: 11,
    color: WarmPalette.charcoalWarm + "70",
    marginTop: 1,
  },
  nightTasksCard: {
    backgroundColor: WarmPalette.cream,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: WarmPalette.sand,
    padding: 14,
    gap: 10,
    marginBottom: 12,
  },
  nightTaskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  nightTaskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2563EB",
  },
  nightTaskTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  nightTaskDue: {
    fontSize: 11,
    color: WarmPalette.charcoalWarm + "75",
    marginTop: 1,
  },
  criticalBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  criticalBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#DC2626",
  },
  voiceHandoffBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.cream,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: WarmPalette.sand,
    padding: 12,
    marginBottom: 12,
  },
  voiceMicBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  voiceHandoffTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
  },
  voiceHandoffSub: {
    fontSize: 11,
    color: WarmPalette.charcoalWarm + "80",
    marginTop: 2,
    fontStyle: "italic",
  },
  textInput: {
    backgroundColor: WarmPalette.cream,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: WarmPalette.sand,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: WarmPalette.charcoalWarm,
    textAlignVertical: "top",
    minHeight: 70,
    marginBottom: 16,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WarmPalette.roseDusty,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
