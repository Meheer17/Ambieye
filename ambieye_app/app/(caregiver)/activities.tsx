import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { CaregiverActivitiesScreen } from "@/components/caregiver/CaregiverActivitiesScreen";
import { WarmPalette } from "@/constants/theme";

export default function CaregiverActivitiesTabScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: WarmPalette.ivory }} edges={["top"]}>
      <CaregiverActivitiesScreen />
    </SafeAreaView>
  );
}
