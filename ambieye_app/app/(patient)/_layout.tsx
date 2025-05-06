import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { usePathname } from 'expo-router';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useAuth } from '@/hooks/useAuth';

const ICON_SIZE = 24;

export default function PatientTabLayout() {
  const pathname = usePathname();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const getHeaderTitle = () => {
    if (pathname.includes("profile/edit")) return "Edit Profile";
    if (pathname.includes("appointments/")) return "Appointment Details";
    if (pathname.includes("medications/")) return "Medication Details";

    switch (pathname) {
      case "/(patient)/":
        return "Patient Home";
      case "/(patient)/appointments":
        return "My Appointments";
      case "/(patient)/medications":
        return "My Medications";
      case "/(patient)/settings":
        return "Settings";
      default:
        return "Patient Portal";
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
              {/* <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
              <TouchableOpacity onPress={handleLogout}>
                <Feather name="log-out" size={22} color="#fff" />
              </TouchableOpacity> */}
            </View>
          );
        },
        sceneStyle: {
          paddingBottom: 55,
        },
      }}
    >
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
        name="games"
        options={{
          title: "Games",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="gamepad" size={ICON_SIZE} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="queries"
        options={{
          title: "Query",
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
    justifyContent: "space-between",
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