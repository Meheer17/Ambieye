import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { CaregiverHomeScreen } from "@/components/caregiver/CaregiverHomeScreen";
import { WarmPalette } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";

export default function CaregiverIndexScreen() {
  const router = useRouter();
  const { username, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out from Caregiver Dashboard?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/auth/login");
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }} edges={["top"]}>
      {/* Caregiver Header */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <View style={styles.caregiverBadge}>
            <Text style={{ fontSize: 20 }}>🌸</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Caregiver Companion</Text>
            <Text style={styles.headerSubtitle}>
              {username ? `Namaste, ${username} · Daily Portal` : "Family Care Portal · Daily Overview"}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
          accessibilityLabel="Log Out"
        >
          <Feather name="log-out" size={17} color="#64748B" />
        </TouchableOpacity>
      </View>

      <CaregiverHomeScreen onSwitchToElderly={() => router.push("/(patient)/" as any)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  caregiverBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FDF2F4",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FBCFE8",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 2,
  },
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
});
