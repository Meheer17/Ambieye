import React, { useEffect } from "react";
import { StyleSheet, View, Image, Text, Animated } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { Colors } from "@/constants/theme";

export default function SplashScreen() {
  const { isAuthenticated, userType, isLoading } = useAuth();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.85)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    if (!isLoading) {
      const timer = setTimeout(() => {
        if (isAuthenticated && userType) {
          if (userType === "doctor") {
            router.replace("/(doctor)/");
          } else {
            router.replace("/(patient)/");
          }
        } else if (userType) {
          router.replace("/auth/login");
        } else {
          router.replace("/user-type");
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, fadeAnim, scaleAnim, slideAnim, userType, isLoading]);

  return (
    <View style={styles.container}>
      {/* Background gradient circles */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />
      <View style={styles.bgCircle3} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.logoWrapper}>
          <View style={styles.logoGlow} />
          <View style={styles.logoContainer}>
            <Image
              source={require("../assets/images/logo.png")}
              style={styles.logo}
            />
          </View>
        </View>
        <Text style={styles.title}>AmbiEye</Text>
        <Text style={styles.subtitle}>Vision Therapy Platform</Text>

        <View style={styles.tagContainer}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>👁️ Smart</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>🎮 Interactive</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>📊 Tracked</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <View style={styles.loadingDots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
        <Text style={styles.footerText}>Loading your experience...</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: "center",
    justifyContent: "center",
  },
  bgCircle1: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: Colors.primary,
    opacity: 0.08,
    top: -100,
    right: -100,
  },
  bgCircle2: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.secondary,
    opacity: 0.08,
    bottom: 50,
    left: -80,
  },
  bgCircle3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.accent,
    opacity: 0.06,
    top: '40%',
    right: -50,
  },
  content: {
    alignItems: "center",
  },
  logoWrapper: {
    position: 'relative',
    marginBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.primary,
    opacity: 0.2,
  },
  logoContainer: {
    width: 110,
    height: 110,
    borderRadius: 28,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: 'rgba(14, 165, 233, 0.3)',
  },
  logo: {
    width: 72,
    height: 72,
    resizeMode: "contain",
  },
  title: {
    fontSize: 40,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 32,
  },
  tagContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  tagText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    position: "absolute",
    bottom: 60,
    alignItems: "center",
    gap: 12,
  },
  loadingDots: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.5,
  },
});
