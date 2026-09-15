import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  useWindowDimensions,
  Platform,
  TouchableOpacity,
  StatusBar as RNStatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  children: React.ReactNode;
}

export const MobileDeviceContainer: React.FC<Props> = ({ children }) => {
  const { width, height } = useWindowDimensions();
  const [deviceFrameEnabled, setDeviceFrameEnabled] = useState(true);

  // Lock browser body scroll on web so desktop window never scrolls
  React.useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const origBodyOverflow = document.body.style.overflow;
      const origHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.body.style.height = "100vh";
      document.body.style.margin = "0";
      document.body.style.padding = "0";
      document.documentElement.style.overflow = "hidden";
      document.documentElement.style.height = "100vh";
      return () => {
        document.body.style.overflow = origBodyOverflow;
        document.documentElement.style.overflow = origHtmlOverflow;
      };
    }
  }, []);

  // On actual mobile phones or small screens, render full screen directly
  const isDesktopWeb = Platform.OS === "web" && width > 540;

  if (!isDesktopWeb || !deviceFrameEnabled) {
    return (
      <View style={styles.fullScreenWrapper}>
        {isDesktopWeb && (
          <TouchableOpacity
            style={styles.floatingPreviewToggle}
            onPress={() => setDeviceFrameEnabled(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="phone-portrait-outline" size={16} color="#FFFFFF" />
            <Text style={styles.floatingPreviewText}>Switch to Phone Frame</Text>
          </TouchableOpacity>
        )}
        {children}
      </View>
    );
  }

  // Standard iPhone 14/15/16 screen dimensions (390 x 844) fitting cleanly within desktop viewport
  const phoneHeight = Math.min(Math.max(height - 48, 680), 844);
  const phoneWidth = 390; // Standard modern mobile width (iPhone 14/15/16)

  return (
    <View style={styles.desktopCanvas}>
      {/* Background Ambience Banner */}
      <View style={[styles.desktopHeader, { width: phoneWidth }]}>
        <View style={styles.brandBadge}>
          <View style={styles.pulseDot} />
          <Text style={styles.brandTitle}>Smriti Caregiver Mobile</Text>
        </View>
        <TouchableOpacity
          style={styles.toggleFrameBtn}
          onPress={() => setDeviceFrameEnabled(false)}
          activeOpacity={0.8}
        >
          <Ionicons name="expand-outline" size={14} color="#94A3B8" />
          <Text style={styles.toggleFrameText}>Expand</Text>
        </TouchableOpacity>
      </View>

      {/* Realistic Smartphone Shell */}
      <View
        style={[
          styles.phoneShell,
          {
            width: phoneWidth,
            height: phoneHeight,
          },
        ]}
      >
        {/* Outer Phone Bezel Details */}
        <View style={styles.phoneEarSpeaker} pointerEvents="none" />

        {/* Dynamic Island / Front Camera Sensor */}
        <View style={styles.dynamicIsland} pointerEvents="none">
          <View style={styles.cameraLens} />
          <View style={styles.sensorDot} />
        </View>

        {/* Simulated Mobile Status Bar (9:41, Wi-Fi, 5G, Battery) */}
        <View style={styles.mobileStatusBar} pointerEvents="none">
          <Text style={styles.statusTime}>9:41</Text>
          <View style={styles.statusIconsGroup}>
            <Ionicons name="cellular" size={13} color="#1E293B" />
            <Ionicons name="wifi" size={13} color="#1E293B" />
            <View style={styles.batteryContainer}>
              <View style={styles.batteryFill} />
              <View style={styles.batteryNipple} />
            </View>
          </View>
        </View>

        {/* Native Mobile Screen Content Viewport */}
        <View style={styles.mobileScreenContent}>
          {children}
        </View>

        {/* Native iOS / Android Home Indicator Pill */}
        <View style={styles.homeIndicatorBar} pointerEvents="none" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenWrapper: {
    flex: 1,
  },
  floatingPreviewToggle: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 9999,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  floatingPreviewText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  desktopCanvas: {
    flex: 1,
    height: "100%",
    maxHeight: "100%",
    overflow: "hidden",
    backgroundColor: "#0F172A", // Deep calm obsidian slate
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  desktopHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  brandBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  brandTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#E2E8F0",
    letterSpacing: 0.3,
  },
  toggleFrameBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "#1E293B",
  },
  toggleFrameText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
  },
  phoneShell: {
    backgroundColor: "#FDFBF7", // Matches Warm Ivory
    borderRadius: 44,
    borderWidth: 8,
    borderColor: "#1E293B",
    overflow: "hidden",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 20,
  },
  phoneEarSpeaker: {
    position: "absolute",
    top: 4,
    alignSelf: "center",
    width: 44,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#334155",
    zIndex: 100,
  },
  dynamicIsland: {
    position: "absolute",
    top: 8,
    alignSelf: "center",
    width: 100,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#0F172A",
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: 10,
    gap: 6,
  },
  cameraLens: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1E293B",
    borderWidth: 1.5,
    borderColor: "#0284C7",
  },
  sensorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#334155",
  },
  mobileStatusBar: {
    height: 32,
    paddingTop: 4,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FDFBF7",
    zIndex: 90,
  },
  statusTime: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E293B",
  },
  statusIconsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  batteryContainer: {
    width: 20,
    height: 10,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  batteryFill: {
    width: "75%",
    height: "100%",
    backgroundColor: "#1E293B",
    borderRadius: 1,
  },
  batteryNipple: {
    position: "absolute",
    right: -3,
    width: 2,
    height: 4,
    borderRadius: 1,
    backgroundColor: "#1E293B",
  },
  mobileScreenContent: {
    flex: 1,
    backgroundColor: "#FDFBF7",
    overflow: "hidden",
  },
  homeIndicatorBar: {
    position: "absolute",
    bottom: 6,
    alignSelf: "center",
    width: 130,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#334155",
    zIndex: 100,
  },
});
