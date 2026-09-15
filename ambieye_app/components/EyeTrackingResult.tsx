/**
 * EyeTrackingResult
 * -----------------
 * Shows the full lifecycle of chunk-based eye tracking analysis.
 *
 *   recording   → live counter: "3 chunks analysed · 👁 partial"
 *   finalising  → spinner "Finalising analysis..."
 *   done        → full verdict card
 *   no_server   → prompt to configure IP
 *   error       → error message
 */
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Animated } from "react-native";
import { RecordingStatus, EyeAnalysisResult } from "@/hooks/useEyeRecording";
import { useTranslation } from "@/constants/i18n";

interface Props {
  status: RecordingStatus;
  result: EyeAnalysisResult | null;
  chunksAnalysed: number;
  liveVerdict: string | null;
}

const VERDICT_EMOJI: Record<string, string> = {
  good: "✅", partial: "⚠️", none: "❌", no_face: "📷", error: "⚠️",
};

export default function EyeTrackingResult({
  status, result, chunksAnalysed, liveVerdict,
}: Props) {
  const { t } = useTranslation();

  const VERDICT_LABEL: Record<string, string> = {
    good: t("eyes_moving_well"),
    partial: t("some_eye_movement"),
    none: t("no_eye_movement"),
    no_face: t("face_not_detected"),
    error: t("analysis_error"),
  };

  // Nothing to show while game hasn't started
  if (status === "idle") return null;

  // ── Live counter during recording ─────────────────────────────────────────
  if (status === "recording") {
    if (chunksAnalysed === 0) return null; // first chunk still processing
    const emoji = liveVerdict ? (VERDICT_EMOJI[liveVerdict] ?? "👁") : "👁";
    const label = liveVerdict ? (VERDICT_LABEL[liveVerdict] ?? liveVerdict) : t("checking_connection");
    return (
      <View style={styles.liveBadge}>
        <View style={styles.liveRecDot} />
        <Text style={styles.liveText}>
          {chunksAnalysed} {t("chunks_analysed")}
        </Text>
        <Text style={styles.liveSep}>·</Text>
        <Text style={styles.liveVerdict}>{emoji} {label}</Text>
      </View>
    );
  }

  // ── Finalising ────────────────────────────────────────────────────────────
  if (status === "finalising") {
    return (
      <View style={styles.card}>
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, styles.stepDotDone]} />
          <Text style={[styles.stepLabel, styles.stepLabelDone]}>
            {chunksAnalysed} {t("chunks_analysed")} ✓
          </Text>
        </View>
        <View style={[styles.stepRow, { marginTop: 10 }]}>
          <ActivityIndicator size="small" color="#0EA5E9" style={{ marginRight: 8 }} />
          <Text style={styles.stepLabel}>{t("averaging_results")}</Text>
        </View>
      </View>
    );
  }

  // ── No server ─────────────────────────────────────────────────────────────
  if (status === "no_server") {
    return (
      <View style={[styles.card, styles.cardWarn]}>
        <Text style={styles.verdictIcon}>⚙️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.verdictTitle}>{t("no_server_title")}</Text>
          <Text style={styles.verdictSub}>
            {t("no_server_desc")}
          </Text>
        </View>
      </View>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (status === "error" || !result) {
    return (
      <View style={[styles.card, styles.cardError]}>
        <Text style={styles.verdictIcon}>⚠️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.verdictTitle}>{t("analysis_failed_title")}</Text>
          <Text style={styles.verdictSub}>
            {t("analysis_failed_desc")}
          </Text>
        </View>
      </View>
    );
  }

  // ── Done — full result card ───────────────────────────────────────────────
  const verdictConfig = {
    good:    { bg: "#DCFCE7", border: "#86efac", icon: "✅", title: t("eyes_moving_well"),   color: "#15803d" },
    partial: { bg: "#FEF9C3", border: "#fde047", icon: "⚠️", title: t("some_eye_movement"),  color: "#a16207" },
    none:    { bg: "#FEE2E2", border: "#fca5a5", icon: "❌", title: t("no_eye_movement"),    color: "#b91c1c" },
    no_face: { bg: "#F1F5F9", border: "#cbd5e1", icon: "📷", title: t("face_not_detected"),  color: "#475569" },
    error:   { bg: "#F1F5F9", border: "#cbd5e1", icon: "⚠️", title: t("analysis_error"),     color: "#475569" },
  };

  const cfg = verdictConfig[result.verdict as keyof typeof verdictConfig] ?? verdictConfig.error;

  return (
    <View style={[styles.card, { backgroundColor: cfg.bg, borderColor: cfg.border, borderWidth: 1.5 }]}>
      {/* Header */}
      <View style={styles.verdictHeader}>
        <Text style={styles.verdictIcon}>{cfg.icon}</Text>
        <Text style={[styles.verdictTitle, { color: cfg.color }]}>{cfg.title}</Text>
      </View>

      {/* Summary */}
      <Text style={styles.verdictSummary}>{result.summary}</Text>

      {/* Stats grid */}
      {result.verdict !== "no_face" && result.verdict !== "error" && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: cfg.color }]}>{result.movement_count}</Text>
            <Text style={styles.statLabel}>{t("total_movements")}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: cfg.color }]}>
              {result.movements_per_chunk?.toFixed(1) ?? "—"}
            </Text>
            <Text style={styles.statLabel}>{t("per_chunk")}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: cfg.color }]}>{result.chunks_analysed ?? chunksAnalysed}</Text>
            <Text style={styles.statLabel}>{t("chunks_analysed")}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: cfg.color }]}>{result.frames_with_eyes}</Text>
            <Text style={styles.statLabel}>{t("eye_frames")}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Live badge shown during recording
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    marginTop: 8,
  },
  liveRecDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  liveText: { fontSize: 12, color: "#475569", fontWeight: "500" },
  liveSep:  { fontSize: 12, color: "#94a3b8" },
  liveVerdict: { fontSize: 12, color: "#0f172a", fontWeight: "700" },

  // Card (finalising / done / error)
  card: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardWarn:  { backgroundColor: "#FEF9C3", borderColor: "#fde047" },
  cardError: { backgroundColor: "#FEE2E2", borderColor: "#fca5a5" },

  stepRow: { flexDirection: "row", alignItems: "center" },
  stepDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: "#cbd5e1", marginRight: 10, flexShrink: 0,
  },
  stepDotDone: { backgroundColor: "#22c55e" },
  stepLabel: { fontSize: 13, color: "#334155", flex: 1 },
  stepLabelDone: { color: "#15803d", fontWeight: "600" },

  verdictHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  verdictIcon:  { fontSize: 22 },
  verdictTitle: { fontSize: 16, fontWeight: "700" },
  verdictSummary: { fontSize: 13, color: "#334155", lineHeight: 19, marginBottom: 14 },
  verdictSub:     { fontSize: 13, color: "#475569", lineHeight: 19 },

  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 12,
    padding: 12,
  },
  statItem:    { flex: 1, alignItems: "center" },
  statValue:   { fontSize: 20, fontWeight: "800", marginBottom: 4 },
  statLabel:   { fontSize: 10, color: "#64748b", fontWeight: "500", textAlign: "center" },
  statDivider: { width: 1, backgroundColor: "rgba(0,0,0,0.08)", marginHorizontal: 4 },
});
