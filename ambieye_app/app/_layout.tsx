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
