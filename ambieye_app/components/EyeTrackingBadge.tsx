/**
 * EyeTrackingBadge
 * ----------------
 * Compact inline badge showing the OpenCV eye tracking verdict for a game.
 * Used in game history lists (patient home + doctor patient modal).
 *
 * Usage:
 *   <EyeTrackingBadge eyeTracking={game.details?.eyeTracking} />
 */
import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView,
} from "react-native";

interface EyeTrackingData {
  verdict: "good" | "partial" | "none" | "no_face" | "error" | string;
  movement_count: number;
  frames_with_eyes: number;
  avg_movement: number;
  summary: string;
}

interface Props {
  eyeTracking?: EyeTrackingData;
}

const VERDICT_CONFIG = {
  good:    { emoji: "👁✅", label: "Eyes Moving",  bg: "#DCFCE7", text: "#15803d" },
  partial: { emoji: "👁⚠️", label: "Some Movement", bg: "#FEF9C3", text: "#a16207" },
  none:    { emoji: "👁❌", label: "No Movement",  bg: "#FEE2E2", text: "#b91c1c" },
  no_face: { emoji: "📷",   label: "No Face",      bg: "#F1F5F9", text: "#475569" },
  error:   { emoji: "⚠️",   label: "Error",        bg: "#F1F5F9", text: "#475569" },
};

export default function EyeTrackingBadge({ eyeTracking }: Props) {
  const [showDetail, setShowDetail] = useState(false);

  if (!eyeTracking) return null;

  const config = VERDICT_CONFIG[eyeTracking.verdict as keyof typeof VERDICT_CONFIG]
    ?? VERDICT_CONFIG.error;

  return (
    <>
      <TouchableOpacity
        style={[styles.badge, { backgroundColor: config.bg }]}
        onPress={() => setShowDetail(true)}
        activeOpacity={0.75}
      >
        <Text style={styles.emoji}>{config.emoji}</Text>
        <Text style={[styles.label, { color: config.text }]}>{config.label}</Text>
        {eyeTracking.movement_count > 0 && (
          <Text style={[styles.count, { color: config.text }]}>
            · {eyeTracking.movement_count} moves
          </Text>
        )}
      </TouchableOpacity>

      {/* Detail modal */}
      <Modal visible={showDetail} transparent animationType="fade" onRequestClose={() => setShowDetail(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowDetail(false)}>
          <View style={styles.detailBox}>
            <Text style={styles.detailTitle}>Eye Tracking Report</Text>
            <Text style={styles.detailSummary}>{eyeTracking.summary}</Text>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{eyeTracking.movement_count}</Text>
                <Text style={styles.statLabel}>Movements</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{eyeTracking.frames_with_eyes}</Text>
                <Text style={styles.statLabel}>Eye Frames</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {eyeTracking.verdict === "good" ? "Good" :
                   eyeTracking.verdict === "partial" ? "Partial" :
                   eyeTracking.verdict === "none" ? "None" : "—"}
                </Text>
                <Text style={styles.statLabel}>Verdict</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowDetail(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 5,
    gap: 3,
  },
  emoji: { fontSize: 11 },
  label: { fontSize: 11, fontWeight: "700" },
  count: { fontSize: 11, fontWeight: "500" },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  detailBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 360,
  },
  detailTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
    textAlign: "center",
  },
  detailSummary: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "800", color: "#0EA5E9", marginBottom: 4 },
  statLabel: { fontSize: 11, color: "#64748b", fontWeight: "500" },
  statDivider: { width: 1, backgroundColor: "#e2e8f0", marginHorizontal: 8 },
  closeBtn: {
    backgroundColor: "#0EA5E9",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  closeBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
