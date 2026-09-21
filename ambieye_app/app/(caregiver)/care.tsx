import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { CaregiverCareScreen } from "@/components/caregiver/CaregiverCareScreen";
import { WarmPalette } from "@/constants/theme";

export default function CaregiverCareTabScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }} edges={["top"]}>
      <CaregiverCareScreen />
    </SafeAreaView>
  );
}
