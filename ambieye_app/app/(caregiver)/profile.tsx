import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { CaregiverProfileScreen } from "@/components/caregiver/CaregiverProfileScreen";
import { CaregiverInsightsScreen } from "@/components/caregiver/CaregiverInsightsScreen";
import { CalmPalette } from "@/constants/theme";

export default function CaregiverProfileTabScreen() {
  const [activeTab, setActiveTab] = useState<"profile" | "insights">("profile");

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Top Segmented Navigation */}
      <View style={styles.segmentContainer}>
        <View style={styles.segmentTrack}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === "profile" && styles.segmentBtnActive,
            ]}
            onPress={() => setActiveTab("profile")}
            activeOpacity={0.85}
          >
            <Feather
              name="shield"
              size={13}
              color={activeTab === "profile" ? "#FFFFFF" : "#64748B"}
            />
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === "profile" && styles.segmentBtnTextActive,
              ]}
            >
              Profile & Alerts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === "insights" && styles.segmentBtnActive,
            ]}
            onPress={() => setActiveTab("insights")}
            activeOpacity={0.85}
          >
            <Feather
              name="bar-chart-2"
              size={13}
              color={activeTab === "insights" ? "#FFFFFF" : "#64748B"}
            />
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === "insights" && styles.segmentBtnTextActive,
              ]}
            >
              Clinical Insights
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Screen Content */}
      <View style={styles.contentContainer}>
        {activeTab === "profile" ? (
          <CaregiverProfileScreen />
        ) : (
          <CaregiverInsightsScreen />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  segmentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  segmentTrack: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 7,
    borderRadius: 9,
  },
  segmentBtnActive: {
    backgroundColor: CalmPalette.primary,
    shadowColor: CalmPalette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  segmentBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  contentContainer: {
    flex: 1,
  },
});
