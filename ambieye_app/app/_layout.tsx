import React, { useEffect } from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Platform, Alert } from "react-native";

if (Platform.OS === "web") {
  Alert.alert = (title, message, buttons) => {
    const msg = message ? `${title}\n\n${message}` : title;
    if (buttons && buttons.length > 0) {
      const confirmBtn =
        buttons.find((b) => b.style === "destructive") ||
        buttons.find((b) => b.style !== "cancel") ||
        buttons[0];
      const cancelBtn =
        buttons.find((b) => b.style === "cancel") ||
        (buttons.length > 1 && buttons[0] !== confirmBtn
          ? buttons[0]
          : undefined);

      if (buttons.length > 1) {
        const confirmed = window.confirm(msg);
        if (confirmed) {
          if (confirmBtn && confirmBtn.onPress) confirmBtn.onPress();
        } else {
          if (cancelBtn && cancelBtn.onPress) cancelBtn.onPress();
        }
      } else {
        window.alert(msg);
        const singleBtn = buttons[0];
        if (singleBtn && singleBtn.onPress) singleBtn.onPress();
      }
    } else {
      window.alert(msg);
    }
  };
}

import { useColorScheme } from "@/hooks/useColorScheme";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGate } from "@/components/AuthGate";

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
          <AuthGate>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="splash" options={{ animation: "none" }} />
              <Stack.Screen
                name="user-type"
                options={{ animation: "slide_from_right" }}
              />
              <Stack.Screen
                name="auth"
                options={{ animation: "slide_from_right", headerShown: false }}
              />
              <Stack.Screen name="(doctor)" options={{ animation: "fade" }} />
              <Stack.Screen name="(patient)" options={{ animation: "fade" }} />
              <Stack.Screen
                name="+not-found"
                options={{ presentation: "modal" }}
              />
            </Stack>
          </AuthGate>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
