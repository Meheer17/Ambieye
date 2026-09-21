import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ICON_SIZE = 22;

export default function CaregiverTabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === "android" ? 14 : 0);
  const tabHeight = 62 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#64748B",
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E2E8F0",
          height: tabHeight,
          paddingBottom: bottomInset + 2,
          paddingTop: 8,
          elevation: 20,
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: -0.1,
          marginTop: 2,
        },
        headerShown: false,
      }}
    >
      {/* 1. Home */}
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

      {/* 2. Cognition */}
      <Tabs.Screen
        name="activities"
        options={{
          title: "Cognition",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconBg : styles.iconBg}>
              <MaterialCommunityIcons name="brain" size={23} color={color} />
            </View>
          ),
        }}
      />

      {/* 3. Care */}
      <Tabs.Screen
        name="care"
        options={{
          title: "Care",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconBg : styles.iconBg}>
              <Feather name="heart" size={ICON_SIZE} color={color} />
            </View>
          ),
        }}
      />

      {/* 4. Care Circle */}
      <Tabs.Screen
        name="family"
        options={{
          title: "Circle",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconBg : styles.iconBg}>
              <Feather name="users" size={ICON_SIZE} color={color} />
            </View>
          ),
        }}
      />

      {/* 5. Profile */}
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
    width: 42,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  activeIconBg: {
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    width: 42,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
});
