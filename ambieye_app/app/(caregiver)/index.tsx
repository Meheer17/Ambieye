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
            <Feather name="heart" size={16} color="#EC4899" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Caregiver Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              {username ? `Welcome, ${username}` : "Family Care Center"}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Feather name="log-out" size={18} color="#DC2626" />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  caregiverBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FCE7F3",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FBCFE8",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
    alignItems: "center",
    justifyContent: "center",
  },
});
