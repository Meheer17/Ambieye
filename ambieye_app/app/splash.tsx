// aarti-app/apps/mobile_client/app/splash.tsx
import React, { useEffect } from "react";
import { StyleSheet, View, Image, Text, Animated } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";

export default function SplashScreen() {
  const { isAuthenticated, userType, isLoading } = useAuth();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();

    // Only navigate when we're done loading
    if (!isLoading) {
      const timer = setTimeout(() => {
        if (isAuthenticated && userType) {
          if (userType === "doctor") {
            router.replace("/(doctor)/");
          } else {
            router.replace("/(patient)/");
          }
          } else if (userType) {
            router.replace('/auth/login');
        } else {
          router.replace("/user-type");
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, fadeAnim, userType, isLoading]);

  return (
    <View style={styles.container}>
      <Animated.View style={styles.container}>
        <Image
          source={require("../assets/images/logo.png")}
          style={styles.logo}
        />
        <Text style={styles.title}>Welcome To Ambieye</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0145",
    alignItems: "center",
    justifyContent: "center",
  },
  mid: {
    opacity: 0,
    transform: [{ scale: 0.5 }],
    transitionDuration: "1s",
    transitionTimingFunction: "ease-in-out",
    flex: 1,
    backgroundColor: "#0D0145",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: "contain",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
});
