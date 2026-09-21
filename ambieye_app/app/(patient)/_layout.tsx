import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "@/constants/i18n";

const ICON_SIZE = 24;

export default function PatientTabLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === "android" ? 14 : 0);
  const tabHeight = 64 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#4F46E5",
        tabBarInactiveTintColor: "#78716C",
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#EAE7E1",
          height: tabHeight,
          paddingBottom: bottomInset + 2,
          paddingTop: 8,
          elevation: 20,
          shadowColor: "#A8A29E",
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
          title: t("tab_home") || "Home",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconBg : styles.iconBg}>
              <Feather name="home" size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: t("tab_reminders") || "Care",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconBg : styles.iconBg}>
              <Feather name="clock" size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: t("tab_games") || "Games",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconBg : styles.iconBg}>
              <MaterialCommunityIcons name="gamepad-variant" size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="queries"
        options={{
          title: "Help",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconBg : styles.iconBg}>
              <MaterialCommunityIcons name="hand-heart" size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconBg : styles.iconBg}>
              <Feather name="user" size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="(stack)"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
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
    backgroundColor: "#F5F3FF",
    borderRadius: 12,
    width: 44,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
});
