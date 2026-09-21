import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { CaregiverFamilyScreen } from "@/components/caregiver/CaregiverFamilyScreen";
import { WarmPalette } from "@/constants/theme";

export default function CaregiverFamilyTabScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WarmPalette.ivory }} edges={["top"]}>
      <CaregiverFamilyScreen />
    </SafeAreaView>
  );
}
