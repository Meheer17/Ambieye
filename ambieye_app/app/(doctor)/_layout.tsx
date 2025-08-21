import React from "react";
import { Tabs , usePathname } from "expo-router";
import { View, StyleSheet, Text } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome from "@expo/vector-icons/FontAwesome";

const ICON_SIZE = 24;

export default function DoctorTabLayout() {
  const pathname = usePathname();

  const getHeaderTitle = () => {
    if (pathname.includes("patient/")) return "Patient Details";
    if (pathname.includes("query/")) return "Query Details";
    if (pathname.includes("profile/edit")) return "Edit Profile";

    switch (pathname) {
      case "/(doctor)/":
        return "Dashboard";
      case "/(doctor)/patients":
        return "My Patients";
      case "/(doctor)/queries":
        return "Queries";
      case "/(doctor)/settings":
        return "Settings";
      default:
        return "";
    }
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "white",
        tabBarInactiveTintColor: "grey",
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          width: "100%",
          backgroundColor: "#0D0145",
          borderTopWidth: 0,
          height: 65,
          paddingBottom: 10,
          paddingTop: 10,
          elevation: 10,
          borderTopLeftRadius: 13,
          borderTopRightRadius: 13,
        },
        headerShown: true,
        header: () => {
          return (
            <View style={styles.customHeader}>
              <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
            </View>
          );
        },
        sceneStyle: {
          paddingBottom: 55,
        },
      }}
    >
      {/* Explicitly define tab screens - ONLY these will appear in tab bar */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Feather name="home" size={ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: "Patients",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="users" size={ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="queries"
        options={{
          title: "Queries",
          tabBarIcon: ({ color }) => (
            <Feather name="help-circle" size={ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <Feather name="settings" size={ICON_SIZE} color={color} />
          ),
        }}
      />
      
      {/* Hide (stack) from tab bar */}
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
  customHeader: {
    backgroundColor: "#5f2446",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 10,
    height: 60,
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});