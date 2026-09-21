import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { CaregiverFamilyScreen } from "@/components/caregiver/CaregiverFamilyScreen";

export default function CaregiverFamilyTabScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }} edges={["top"]}>
      <CaregiverFamilyScreen />
    </SafeAreaView>
  );
}
