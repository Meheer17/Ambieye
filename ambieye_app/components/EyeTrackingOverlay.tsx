import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import type { FrameProcessor } from "react-native-vision-camera";
import { EyeTrackingResult } from "@/hooks/useEyeTracking";
import { getVisionCameraModule } from "@/utils/visionCamera";

interface EyeTrackingOverlayProps {
  /** Frame processor from useEyeTracking — runs silently on every camera frame */
  frameProcessor?: FrameProcessor | null;
  /** The current tracking result from useEyeTracking */
  result: EyeTrackingResult;
  /** Whether the game is currently active */
  active: boolean;
}

const visionCamera = getVisionCameraModule();

const useCameraPermissionSafe =
  visionCamera?.useCameraPermission ??
  (() => ({ hasPermission: false, requestPermission: async () => false }));

const useCameraDeviceSafe =
  visionCamera?.useCameraDevice ?? ((_: string) => null);

const CameraView = visionCamera?.Camera ?? null;

/**
 * EyeTrackingOverlay
 *
 * Renders a small circular front-camera preview with a live status badge.
 * The camera runs silently — no shutter, no sound, no file saving.
 * The frame processor analyses each frame in a background worklet thread.
 *
 * Shows:
 *   👁 Eyes Moving  — green pulsing dot  (motion detected)
 *   👁 Eyes Still   — amber dot          (no motion)
 */
export default function EyeTrackingOverlay({
  frameProcessor,
  result,
  active,
}: EyeTrackingOverlayProps) {
  const { hasPermission, requestPermission } = useCameraPermissionSafe();
  const device = useCameraDeviceSafe("front");
  const cameraAvailable = Boolean(CameraView);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Request camera permission on mount
  useEffect(() => {
    if (cameraAvailable && !hasPermission) {
      requestPermission();
    }
  }, [cameraAvailable, hasPermission, requestPermission]);

  // Pulse the green dot when eyes are moving
  useEffect(() => {
    if (result.isMoving && active) {
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.5,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoopRef.current.start();
    } else {
      pulseLoopRef.current?.stop();
      pulseLoopRef.current = null;
      pulseAnim.setValue(1);
    }

    return () => {
      pulseLoopRef.current?.stop();
    };
  }, [result.isMoving, active, pulseAnim]);

  // Web: camera APIs not available
  if (Platform.OS === "web") return null;

  if (!CameraView) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>📷</Text>
        </View>
        <View style={[styles.badge, styles.badgeNeutral]}>
          <Text style={styles.badgeText}>Camera unavailable</Text>
        </View>
      </View>
    );
  }

  // Permission not granted yet
  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>📷</Text>
        </View>
        <View style={[styles.badge, styles.badgeNeutral]}>
          <Text style={styles.badgeText}>Cam needed</Text>
        </View>
      </View>
    );
  }

  // No front camera found (simulator, etc.)
  if (!device) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>📷</Text>
        </View>
        <View style={[styles.badge, styles.badgeNeutral]}>
          <Text style={styles.badgeText}>No camera</Text>
        </View>
      </View>
    );
  }

  const isMoving = result.isMoving && active;

  const badgeStyle = !active
    ? styles.badgeNeutral
    : isMoving
    ? styles.badgeMoving
    : styles.badgeStill;

  const badgeLabel = !active
    ? "Tracking off"
    : isMoving
    ? "👁 Eyes Moving"
    : "👁 Eyes Still";

  return (
    <View style={styles.container}>
      {/* Circular camera preview — silent, no shutter */}
      <View style={styles.cameraRing}>
        <CameraView
          style={styles.camera}
          device={device}
          isActive={active}
          frameProcessor={frameProcessor ?? undefined}
          // No photo/video capture — purely for frame analysis
          photo={false}
          video={false}
          audio={false}
          // Lowest possible resolution for performance
          resolutionConstraints={{
            video: { width: 320, height: 240 },
          }}
        />
        {/* Dim overlay so the preview doesn't distract from the game */}
        <View style={styles.dimOverlay} />
      </View>

      {/* Status badge */}
      <View style={[styles.badge, badgeStyle]}>
        {active && (
          <Animated.View
            style={[
              styles.dot,
              isMoving ? styles.dotMoving : styles.dotStill,
              isMoving && { transform: [{ scale: pulseAnim }] },
            ]}
          />
        )}
        <Text style={styles.badgeText}>{badgeLabel}</Text>
      </View>
    </View>
  );
}

const SIZE = 72;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 4,
  },
  cameraRing: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#0EA5E9",
    backgroundColor: "#000",
  },
  camera: {
    width: SIZE,
    height: SIZE,
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  placeholder: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#0EA5E9",
  },
  placeholderIcon: {
    fontSize: 26,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
  },
  badgeMoving: {
    backgroundColor: "#dcfce7",
  },
  badgeStill: {
    backgroundColor: "#fef9c3",
  },
  badgeNeutral: {
    backgroundColor: "#f1f5f9",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#1e293b",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotMoving: {
    backgroundColor: "#22c55e",
  },
  dotStill: {
    backgroundColor: "#eab308",
  },
});
