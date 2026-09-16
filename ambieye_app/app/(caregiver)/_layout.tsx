import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Tabs } from "expo-router";
import { WarmPalette, PastelPalette } from "@/constants/theme";

const ICON_SIZE = 22;

export default function CaregiverTabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: PastelPalette.rosePrimary,
        tabBarInactiveTintColor: WarmPalette.charcoalWarm + "80",
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          width: "100%",
          backgroundColor: WarmPalette.ivory,
          borderTopWidth: 1,
          borderTopColor: WarmPalette.sand,
          height: Platform.OS === "ios" ? 90 : 78,
          paddingBottom: Platform.OS === "ios" ? 28 : 16,
          paddingTop: 8,
          elevation: 25,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "800",
          letterSpacing: 0.2,
          marginTop: 2,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconBg : styles.iconBg}>
              <Feather name="home" size={ICON_SIZE} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="care"
        options={{
          title: "Tele-Care",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconBg : styles.iconBg}>
              <MaterialCommunityIcons name="doctor" size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: "Activities",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconBg : styles.iconBg}>
              <Feather name="activity" size={ICON_SIZE} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: "Family",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconBg : styles.iconBg}>
              <Feather name="users" size={ICON_SIZE} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconBg : styles.iconBg}>
              <Feather name="user" size={ICON_SIZE} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconBg: {
    width: 44,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  activeIconBg: {
    backgroundColor: WarmPalette.peach,
    borderRadius: 12,
    width: 44,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
});
