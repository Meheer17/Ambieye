/**
 * EyeTrackingResult
 * -----------------
 * Shows the full lifecycle of eye tracking analysis on the results screen:
 *
 *   recording  → (hidden — game is still active)
 *   uploading  → progress bar with % and file size
 *   analysing  → spinner "OpenCV is analysing..."
 *   done       → verdict card with movement count
 *   no_server  → prompt to configure server IP
 *   error      → error message
 */
import React, { useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, Animated,
} from "react-native";
import { EyeAnalysisResult, RecordingStatus } from "@/hooks/useEyeRecording";

interface Props {
  status: RecordingStatus;
  result: EyeAnalysisResult | null;
  uploadProgress: number;   // 0–100
  videoSize: string | null; // e.g. "4.2 MB"
}

// Animated progress bar
function ProgressBar({ progress }: { progress: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: progress / 100,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress, anim]);

  return (
    <View style={pb.track}>
      <Animated.View
        style={[
          pb.fill,
          {
            width: anim.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
    </View>
  );
}

export default function EyeTrackingResult({
  status, result, uploadProgress, videoSize,
}: Props) {

  // Nothing to show while game is running or before it starts
  if (status === "idle" || status === "recording") return null;

  // ── Uploading ──────────────────────────────────────────────────────────────
  if (status === "uploading") {
    return (
      <View style={styles.card}>
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <Text style={styles.stepLabel}>Uploading video</Text>
          <Text style={styles.stepRight}>
            {uploadProgress}%{videoSize ? `  ·  ${videoSize}` : ""}
          </Text>
        </View>
        <ProgressBar progress={uploadProgress} />
        <View style={[styles.stepRow, { marginTop: 10, opacity: 0.4 }]}>
          <View style={styles.stepDot} />
          <Text style={styles.stepLabel}>Analysing with OpenCV</Text>
        </View>
        <View style={[styles.stepRow, { marginTop: 8, opacity: 0.4 }]}>
          <View style={styles.stepDot} />
          <Text style={styles.stepLabel}>Getting results</Text>
        </View>
      </View>
    );
  }

  // ── Analysing (upload done, server processing) ─────────────────────────────
  if (status === "analysing") {
    return (
      <View style={styles.card}>
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, styles.stepDotDone]} />
          <Text style={[styles.stepLabel, styles.stepLabelDone]}>Video uploaded ✓</Text>
          {videoSize && <Text style={styles.stepRight}>{videoSize}</Text>}
        </View>
        <ProgressBar progress={100} />
        <View style={[styles.stepRow, { marginTop: 10 }]}>
          <ActivityIndicator size="small" color="#0EA5E9" style={{ marginRight: 8 }} />
          <Text style={styles.stepLabel}>OpenCV is analysing your eye movement...</Text>
        </View>
        <View style={[styles.stepRow, { marginTop: 8, opacity: 0.4 }]}>
          <View style={styles.stepDot} />
          <Text style={styles.stepLabel}>Getting results</Text>
        </View>
      </View>
    );
  }

  // ── No server configured ───────────────────────────────────────────────────
  if (status === "no_server") {
    return (
      <View style={[styles.card, styles.cardWarn]}>
        <Text style={styles.verdictIcon}>⚙️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.verdictTitle}>No server configured</Text>
          <Text style={styles.verdictSub}>
            Go to Settings → Eye Tracking Server and enter your laptop's IP address to enable eye movement analysis.
          </Text>
        </View>
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (status === "error" || !result) {
    return (
      <View style={[styles.card, styles.cardError]}>
        <Text style={styles.verdictIcon}>⚠️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.verdictTitle}>Analysis failed</Text>
          <Text style={styles.verdictSub}>
            Could not reach the server or process the video. Check that the server is running and the IP is correct in Settings.
          </Text>
        </View>
      </View>
    );
  }

  // ── Done — show result ─────────────────────────────────────────────────────
  const verdictConfig = {
    good:    { bg: "#DCFCE7", border: "#86efac", icon: "✅", title: "Eyes Moving Well",    titleColor: "#15803d" },
    partial: { bg: "#FEF9C3", border: "#fde047", icon: "⚠️", title: "Some Eye Movement",   titleColor: "#a16207" },
    none:    { bg: "#FEE2E2", border: "#fca5a5", icon: "❌", title: "No Eye Movement",     titleColor: "#b91c1c" },
    no_face: { bg: "#F1F5F9", border: "#cbd5e1", icon: "📷", title: "Face Not Detected",   titleColor: "#475569" },
    error:   { bg: "#F1F5F9", border: "#cbd5e1", icon: "⚠️", title: "Analysis Error",      titleColor: "#475569" },
  };

  const cfg = verdictConfig[result.verdict as keyof typeof verdictConfig] ?? verdictConfig.error;

  return (
    <View style={[styles.card, { backgroundColor: cfg.bg, borderColor: cfg.border, borderWidth: 1.5 }]}>
      {/* Header row */}
      <View style={styles.verdictHeader}>
        <Text style={styles.verdictIcon}>{cfg.icon}</Text>
        <Text style={[styles.verdictTitle, { color: cfg.titleColor }]}>{cfg.title}</Text>
      </View>

      {/* Summary sentence from OpenCV */}
      <Text style={styles.verdictSummary}>{result.summary}</Text>

      {/* Stats row */}
      {result.verdict !== "no_face" && result.verdict !== "error" && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: cfg.titleColor }]}>
              {result.movement_count}
            </Text>
            <Text style={styles.statLabel}>Eye Movements</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: cfg.titleColor }]}>
              {result.frames_with_eyes}
            </Text>
            <Text style={styles.statLabel}>Frames Detected</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: cfg.titleColor }]}>
              {result.total_frames}
            </Text>
            <Text style={styles.statLabel}>Total Frames</Text>
          </View>
        </View>
      )}

      {/* Upload info footer */}
      {videoSize && (
        <Text style={styles.footer}>Video size: {videoSize}</Text>
      )}
    </View>
  );
}

// ── Progress bar styles ───────────────────────────────────────────────────────
const pb = StyleSheet.create({
  track: {
    height: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 8,
  },
  fill: {
    height: "100%",
    backgroundColor: "#0EA5E9",
    borderRadius: 4,
  },
});

// ── Main styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
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

  // Step list (uploading / analysing)
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#cbd5e1",
    marginRight: 10,
    flexShrink: 0,
  },
  stepDotActive: { backgroundColor: "#0EA5E9" },
  stepDotDone:   { backgroundColor: "#22c55e" },
  stepLabel: {
    fontSize: 13,
    color: "#334155",
    flex: 1,
  },
  stepLabelDone: { color: "#15803d", fontWeight: "600" },
  stepRight: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },

  // Verdict card
  verdictHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  verdictIcon: { fontSize: 22 },
  verdictTitle: { fontSize: 16, fontWeight: "700" },
  verdictSummary: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 19,
    marginBottom: 14,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "800", marginBottom: 2 },
  statLabel: { fontSize: 10, color: "#64748b", fontWeight: "500", textAlign: "center" },
  statDivider: { width: 1, backgroundColor: "rgba(0,0,0,0.08)", marginHorizontal: 4 },

  verdictSub: { fontSize: 13, color: "#475569", lineHeight: 19 },
  footer: { fontSize: 11, color: "#94a3b8", marginTop: 4 },
});
