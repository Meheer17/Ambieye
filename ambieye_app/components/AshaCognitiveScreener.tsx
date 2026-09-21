import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Platform,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTranslation } from "@/constants/i18n";
import {
  AshaMmseScores,
  AshaScreeningRecord,
  calculateDementiaStage,
  dementiaCareStorage,
  DementiaStage,
} from "@/utils/dementiaCareStorage";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import { Colors, BorderRadius, Shadows, Spacing } from "@/constants/theme";

interface AshaCognitiveScreenerProps {
  visible: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  onSaveSuccess?: (record: AshaScreeningRecord) => void;
}

export default function AshaCognitiveScreener({
  visible,
  onClose,
  patientId,
  patientName,
  onSaveSuccess,
}: AshaCognitiveScreenerProps) {
  const { t, currentLang } = useTranslation();

  const [scores, setScores] = useState<AshaMmseScores>({
    orientationTime: 5,
    orientationPlace: 5,
    registration: 3,
    attention: 5,
    recall: 3,
    languageNaming: 2,
    languageRepeat: 1,
    construction: 1,
  });

  const [notes, setNotes] = useState("");
  const [screenerName, setScreenerName] = useState("Community ASHA Worker");
  const [escalateToDoctor, setEscalateToDoctor] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const totalScore =
    scores.orientationTime +
    scores.orientationPlace +
    scores.registration +
    scores.attention +
    scores.recall +
    scores.languageNaming +
    scores.languageRepeat +
    scores.construction;

  const currentStage: DementiaStage = calculateDementiaStage(totalScore);

  const getStageColor = (stage: DementiaStage) => {
    switch (stage) {
      case "stage_normal":
        return { bg: "#DCFCE7", text: "#166534", border: "#86EFAC" };
      case "stage_mci":
        return { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" };
      case "stage_moderate":
        return { bg: "#FFEDD5", text: "#9A3412", border: "#FDBA74" };
      case "stage_severe":
        return { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" };
    }
  };

  const stageTheme = getStageColor(currentStage);

  const updateScore = (field: keyof AshaMmseScores, val: number) => {
    setScores((prev) => ({ ...prev, [field]: val }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = await dementiaCareStorage.saveScreeningRecord({
        patientId,
        patientName,
        scores,
        screenerName: screenerName || "ASHA Screener",
        notes,
        escalatedToDoctor: escalateToDoctor,
      });

      VoiceAssistant.speak(`${t("screener_saved_msg")} ${t(saved.stage)}`, currentLang);

      if (Platform.OS !== "web") {
        Alert.alert(t("total_mmse_score"), `${t("screener_saved_msg")} (${totalScore}/30)`);
      }

      if (onSaveSuccess) {
        onSaveSuccess(saved);
      }
      onClose();
    } catch (e) {
      console.error("Failed to save screening record:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const renderScoreSelector = (
    label: string,
    field: keyof AshaMmseScores,
    maxScore: number,
    icon: string
  ) => {
    const currentVal = scores[field];
    const options = Array.from({ length: maxScore + 1 }, (_, i) => i);

    return (
      <View style={styles.questionCard}>
        <View style={styles.questionHeader}>
          <MaterialCommunityIcons name={icon as any} size={20} color="#2563EB" />
          <Text style={styles.questionTitle}>{label}</Text>
        </View>

        <View style={styles.scoreRow}>
          {options.map((num) => {
            const isSelected = currentVal === num;
            return (
              <TouchableOpacity
                key={num}
                style={[
                  styles.scoreBtn,
                  isSelected && styles.scoreBtnSelected,
                ]}
                onPress={() => updateScore(field, num)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.scoreBtnText,
                    isSelected && styles.scoreBtnTextSelected,
                  ]}
                >
                  {num}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <View style={styles.ashaBadge}>
                  <Text style={styles.ashaBadgeText}>🩺 ASHA / CHW</Text>
                </View>
                <Text style={styles.maxPtsBadge}>30 Points MMSE</Text>
              </View>
              <Text style={styles.modalTitle}>{t("asha_screener_title")}</Text>
              <Text style={styles.patientInfoText}>
                {t("screener_patient_label")} <Text style={{ fontWeight: "800", color: "#0F172A" }}>{patientName}</Text>
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Live Score & Staging Hero */}
            <View
              style={[
                styles.stagingCard,
                { backgroundColor: stageTheme.bg, borderColor: stageTheme.border },
              ]}
            >
              <View style={styles.stagingScoreRow}>
                <View>
                  <Text style={[styles.stagingScoreLabel, { color: stageTheme.text }]}>
                    {t("total_mmse_score")}
                  </Text>
                  <Text style={[styles.stagingScoreVal, { color: stageTheme.text }]}>
                    {totalScore} <Text style={styles.scoreDenominator}>/ 30</Text>
                  </Text>
                </View>
                <View style={[styles.stageTag, { borderColor: stageTheme.border }]}>
                  <Text style={[styles.stageTagText, { color: stageTheme.text }]}>
                    {t(currentStage)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.stagingHelp, { color: stageTheme.text }]}>
                {t("screener_instructions")}
              </Text>
            </View>

            {/* Screener Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Screener / ASHA Worker Name</Text>
              <TextInput
                style={styles.textInput}
                value={screenerName}
                onChangeText={setScreenerName}
                placeholder="e.g., Runu Deka (ASHA)"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Section 1: Orientation */}
            <Text style={styles.sectionHeader}>{t("sec_orientation")}</Text>
            {renderScoreSelector(
              t("q_orientation_time"),
              "orientationTime",
              5,
              "calendar-clock"
            )}
            {renderScoreSelector(
              t("q_orientation_place"),
              "orientationPlace",
              5,
              "map-marker-radius"
            )}

            {/* Section 2: Registration */}
            <Text style={styles.sectionHeader}>{t("sec_registration")}</Text>
            {renderScoreSelector(
              t("q_registration_items"),
              "registration",
              3,
              "format-list-numbered"
            )}

            {/* Section 3: Attention & Calculation */}
            <Text style={styles.sectionHeader}>{t("sec_attention")}</Text>
            {renderScoreSelector(
              t("q_attention_math"),
              "attention",
              5,
              "calculator"
            )}

            {/* Section 4: Delayed Recall */}
            <Text style={styles.sectionHeader}>{t("sec_recall")}</Text>
            {renderScoreSelector(
              t("q_recall_items"),
              "recall",
              3,
              "head-snowflake-outline"
            )}

            {/* Section 5: Language & Naming */}
            <Text style={styles.sectionHeader}>{t("sec_language")}</Text>
            {renderScoreSelector(
              t("q_language_naming"),
              "languageNaming",
              2,
              "watch"
            )}
            {renderScoreSelector(
              t("q_language_repeat"),
              "languageRepeat",
              1,
              "microphone-outline"
            )}

            {/* Section 6: Construction */}
            <Text style={styles.sectionHeader}>{t("sec_construction")}</Text>
            {renderScoreSelector(
              t("q_construction_draw"),
              "construction",
              1,
              "shape-polygon-plus"
            )}

            {/* Clinical Escalation Toggle */}
            <TouchableOpacity
              style={[
                styles.escalateCard,
                escalateToDoctor && styles.escalateCardActive,
              ]}
              onPress={() => setEscalateToDoctor(!escalateToDoctor)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={escalateToDoctor ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                size={26}
                color={escalateToDoctor ? "#DC2626" : "#94A3B8"}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.escalateTitle}>{t("escalate_to_doctor")}</Text>
                <Text style={styles.escalateDesc}>{t("escalation_desc")}</Text>
              </View>
            </TouchableOpacity>

            {/* Screener Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t("notes_label")}</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Field observations, family feedback, behavioral notes..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.footerRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>{t("close")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={isSaving}
                activeOpacity={0.85}
              >
                <Feather name="check-circle" size={18} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>{t("save_screener_btn")}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    paddingTop: Spacing.md,
    ...Shadows.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  ashaBadge: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ashaBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  maxPtsBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  patientInfoText: {
    fontSize: 13,
    color: "#475569",
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  stagingCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1.5,
    marginBottom: Spacing.lg,
  },
  stagingScoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  stagingScoreLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  stagingScoreVal: {
    fontSize: 28,
    fontWeight: "900",
  },
  scoreDenominator: {
    fontSize: 16,
    fontWeight: "600",
    opacity: 0.7,
  },
  stageTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  stageTagText: {
    fontSize: 13,
    fontWeight: "800",
  },
  stagingHelp: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
    opacity: 0.9,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
  },
  textArea: {
    height: 75,
    textAlignVertical: "top",
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  questionCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  questionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
    flex: 1,
    lineHeight: 18,
  },
  scoreRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  scoreBtn: {
    width: 42,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  scoreBtnSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#1D4ED8",
    ...Shadows.sm,
  },
  scoreBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#475569",
  },
  scoreBtnTextSelected: {
    color: "#FFFFFF",
  },
  escalateCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    backgroundColor: "#FFF1F2",
    borderWidth: 1.5,
    borderColor: "#FECDD3",
    gap: 12,
    marginVertical: Spacing.md,
  },
  escalateCardActive: {
    backgroundColor: "#FFE4E6",
    borderColor: "#F43F5E",
  },
  escalateTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#9F1239",
  },
  escalateDesc: {
    fontSize: 12,
    color: "#881337",
    marginTop: 2,
  },
  footerRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
  },
  saveBtn: {
    flex: 2,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    backgroundColor: "#2563EB",
    gap: 8,
    ...Shadows.md,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
