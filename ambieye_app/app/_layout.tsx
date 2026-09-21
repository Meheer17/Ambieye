import React, { useEffect, useRef } from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
  Stack,
  usePathname,
} from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Platform, Alert, LogBox } from "react-native";

// ── SILENCE ALL POPUP WARNINGS & LOGBOX NOTIFICATIONS ────────────────────────
LogBox.ignoreAllLogs(true);

// Re-route console.warn to console.log to ensure no yellow banner ever pops up on-screen
if (typeof console !== "undefined" && console.warn) {
  console.warn = (...args: any[]) => {
    if (console.log) {
      console.log("[Notice]", ...args);
    }
  };
}

import { useColorScheme } from "@/hooks/useColorScheme";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGate } from "@/components/AuthGate";
import { LanguageProvider } from "@/constants/i18n";
import { MobileDeviceContainer } from "@/components/MobileDeviceContainer";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import { companionVoiceService, companionService } from "@/services/companion";
import { radioAudioService } from "@/services/audio/radioAudioService";

function GlobalVoiceNavigationGuard() {
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      try {
        VoiceAssistant.stop();
        companionVoiceService.cancelListening();
        companionService.stopSpeech();
        radioAudioService.pause();
      } catch (e) {
        // ignore
      }
    }
  }, [pathname]);

  return null;
}

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
// Prevent unhandled errors and rejections from popping up overlays on Web
if (Platform.OS === "web" && typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    event.preventDefault();
  });
  window.addEventListener("error", (event) => {
    event.preventDefault();
  });
}

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [fontTimeout, setFontTimeout] = React.useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFontTimeout(true);
      SplashScreen.hideAsync().catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loaded || error || fontTimeout || Platform.OS === "web") {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, error, fontTimeout]);

  // On Web or if font timed out, render immediately to avoid blocking
  if (!loaded && !error && !fontTimeout && Platform.OS !== "web") {
    return null;
  }

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
            <MobileDeviceContainer>
              <AuthGate>
                <GlobalVoiceNavigationGuard />
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
                  <Stack.Screen name="(caregiver)" options={{ animation: "fade" }} />
                  <Stack.Screen name="(patient)" options={{ animation: "fade" }} />
                  <Stack.Screen
                    name="+not-found"
                    options={{ presentation: "modal" }}
                  />
                </Stack>
              </AuthGate>
            </MobileDeviceContainer>
          </ThemeProvider>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
