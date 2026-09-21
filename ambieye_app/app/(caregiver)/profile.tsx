import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { CaregiverProfileScreen } from "@/components/caregiver/CaregiverProfileScreen";
import { WarmPalette } from "@/constants/theme";

export default function CaregiverProfileTabScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WarmPalette.ivory }} edges={["top"]}>
      <CaregiverProfileScreen />
    </SafeAreaView>
  );
}
