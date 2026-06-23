import React from "react";
import { Tabs } from "expo-router";
import { View, StyleSheet, Platform } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Colors } from "@/constants/theme";

const ICON_SIZE = 22;

export default function DoctorTabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          width: "100%",
          backgroundColor: Colors.surface,
          borderTopWidth: 0,
          height: Platform.OS === "ios" ? 88 : 68,
          paddingBottom: Platform.OS === "ios" ? 28 : 12,
          paddingTop: 12,
          elevation: 20,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          letterSpacing: 0.2,
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
        name="patients"
        options={{
          title: "Patients",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconBg : styles.iconBg}>
              <FontAwesome name="users" size={ICON_SIZE} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="queries"
        options={{
          title: "Queries",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconBg : styles.iconBg}>
              <Feather name="message-circle" size={ICON_SIZE} color={color} />
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
              <Feather name="user" size={ICON_SIZE} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="(stack)"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconBg: {
    width: 40,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIconBg: {
    backgroundColor: `${Colors.primary}18`,
    borderRadius: 10,
    width: 40,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
