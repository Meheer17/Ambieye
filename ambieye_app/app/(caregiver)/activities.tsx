import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { CaregiverActivitiesScreen } from "@/components/caregiver/CaregiverActivitiesScreen";

export default function CaregiverActivitiesTabScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }} edges={["top"]}>
      <CaregiverActivitiesScreen />
    </SafeAreaView>
  );
}
