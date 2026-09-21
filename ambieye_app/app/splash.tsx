import React, { useEffect } from "react";
import { StyleSheet, View, Image, Text, Animated, Platform } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { Colors } from "@/constants/theme";

export default function SplashScreen() {
  const { isAuthenticated, userType, isLoading } = useAuth();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.85)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const useNative = Platform.OS !== "web";
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: useNative,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: useNative,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: useNative,
      }),
    ]).start();

    const navigateNext = () => {
      if (isAuthenticated && userType) {
        if (userType === "doctor") {
          router.replace("/(doctor)" as any);
        } else if (userType === "caregiver") {
          router.replace("/(caregiver)" as any);
        } else {
          router.replace("/(patient)" as any);
        }
      } else if (userType) {
        router.replace("/auth/login");
      } else {
        router.replace("/user-type");
      }
    };

    const timer = setTimeout(navigateNext, isLoading ? 3500 : 2000);
    return () => clearTimeout(timer);
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
          <View style={styles.logoContainer}>
            <Image
              source={require("../assets/images/mindcare_logo_circle.png")}
              style={styles.logo}
            />
          </View>
        </View>
        <Text style={styles.title}>
          Mind<Text style={{ color: "#10B981" }}>Care</Text>
        </Text>
        <Text style={styles.tagline}>Better Minds. Brighter Days.</Text>
        <Text style={styles.subtitle}>
          A Cognitive Care Companion for a Healthier Tomorrow
        </Text>

        <View style={styles.tagContainer}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>🧠 Cognitive Care</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>👵 Dementia Support</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>🌸 Compassionate</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <View style={styles.loadingDots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
        <Text style={styles.footerText}>Loading your care companion...</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1128',
    alignItems: "center",
    justifyContent: "center",
  },
  bgCircle1: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: '#10B981',
    opacity: 0.12,
    top: -100,
    right: -100,
  },
  bgCircle2: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#0284C7',
    opacity: 0.12,
    bottom: 50,
    left: -80,
  },
  bgCircle3: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#8B5CF6',
    opacity: 0.08,
    top: '40%',
    right: -60,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 24,
  },
  logoWrapper: {
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'transparent',
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.6)',
    overflow: 'hidden',
  },
  logo: {
    width: 136,
    height: 136,
    borderRadius: 68,
    resizeMode: "contain",
  },
  title: {
    fontSize: 38,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 15.5,
    fontWeight: "700",
    color: "#34D399",
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.72)',
    letterSpacing: 0.2,
    textAlign: "center",
    maxWidth: 290,
    lineHeight: 18,
    marginBottom: 26,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  tagText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    position: "absolute",
    bottom: 50,
    alignItems: "center",
    gap: 10,
  },
  loadingDots: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#10B981',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 0.5,
  },
});
