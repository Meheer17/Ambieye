import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Text,
  TouchableOpacity,
  Platform,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { WarmPalette } from "../../constants/theme";

export type AvatarState = "idle" | "listening" | "speaking" | "thinking" | "comforting";

export type AvatarPersona = "mitr" | "dr_sarma" | "bhupen_da";

interface VirtualAvatarProps {
  state?: AvatarState;
  persona?: AvatarPersona;
  size?: number;
  onPress?: () => void;
  showStatusBadge?: boolean;
}

export const VirtualAvatar: React.FC<VirtualAvatarProps> = ({
  state = "idle",
  persona = "mitr",
  size = 180,
  onPress,
  showStatusBadge = true,
}) => {
  // Animation Values
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const mouthAnim = useRef(new Animated.Value(4)).current;
  const pulseAuraAnim = useRef(new Animated.Value(1)).current;
  const headTiltAnim = useRef(new Animated.Value(0)).current;

  // ── 1. Gentle Breathing Animation (Continuous) ───────────────────────────────
  useEffect(() => {
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1.04,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
      ])
    );
    breathe.start();
    return () => breathe.stop();
  }, [breatheAnim]);

  // ── 2. Natural Blinking Loop ────────────────────────────────────────────────
  useEffect(() => {
    let timeout: any;
    const runBlink = () => {
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 0.1,
          duration: 100,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 120,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]).start(() => {
        // Next blink between 2.5 and 5.5 seconds
        const nextBlink = Math.random() * 3000 + 2500;
        timeout = setTimeout(runBlink, nextBlink);
      });
    };
    timeout = setTimeout(runBlink, 2000);
    return () => clearTimeout(timeout);
  }, [blinkAnim]);

  // ── 3. Speaking State: Lip-Sync Mouth Oscillation ───────────────────────────
  useEffect(() => {
    if (state === "speaking") {
      const speakLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(mouthAnim, {
            toValue: 16,
            duration: 140,
            easing: Easing.linear,
            useNativeDriver: false,
          }),
          Animated.timing(mouthAnim, {
            toValue: 6,
            duration: 120,
            easing: Easing.linear,
            useNativeDriver: false,
          }),
          Animated.timing(mouthAnim, {
            toValue: 22,
            duration: 180,
            easing: Easing.linear,
            useNativeDriver: false,
          }),
          Animated.timing(mouthAnim, {
            toValue: 4,
            duration: 140,
            easing: Easing.linear,
            useNativeDriver: false,
          }),
        ])
      );
      speakLoop.start();
      return () => speakLoop.stop();
    } else if (state === "comforting") {
      // Gentle soft smile
      Animated.timing(mouthAnim, {
        toValue: 8,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(mouthAnim, {
        toValue: 4,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  }, [state, mouthAnim]);

  // ── 4. Listening / Comforting Aura Pulse ─────────────────────────────────────
  useEffect(() => {
    if (state === "listening" || state === "comforting" || state === "speaking") {
      const auraLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAuraAnim, {
            toValue: 1.15,
            duration: state === "listening" ? 900 : 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: Platform.OS !== "web",
          }),
          Animated.timing(pulseAuraAnim, {
            toValue: 1,
            duration: state === "listening" ? 900 : 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: Platform.OS !== "web",
          }),
        ])
      );
      auraLoop.start();
      return () => auraLoop.stop();
    } else {
      Animated.timing(pulseAuraAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: Platform.OS !== "web",
      }).start();
    }
  }, [state, pulseAuraAnim]);

  // ── 5. Head Tilt on Listening / Thinking ────────────────────────────────────
  useEffect(() => {
    if (state === "listening") {
      Animated.timing(headTiltAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: Platform.OS !== "web",
      }).start();
    } else if (state === "thinking") {
      Animated.timing(headTiltAnim, {
        toValue: -1,
        duration: 400,
        useNativeDriver: Platform.OS !== "web",
      }).start();
    } else {
      Animated.timing(headTiltAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: Platform.OS !== "web",
      }).start();
    }
  }, [state, headTiltAnim]);

  // Persona Details
  const getPersonaDetails = () => {
    switch (persona) {
      case "dr_sarma":
        return {
          name: "Dr. Sarma",
          role: "Clinical Wellness Guide",
          skinColor: "#F7D7C4",
          hairColor: "#475569",
          accessoryColor: "#0284C7",
          accessoryIcon: "activity",
          auraColor: "rgba(2, 132, 199, 0.2)",
        };
      case "bhupen_da":
        return {
          name: "Bhupen Da",
          role: "Musical Story Companion",
          skinColor: "#EFC8B1",
          hairColor: "#334155",
          accessoryColor: "#D97706",
          accessoryIcon: "music",
          auraColor: "rgba(217, 119, 6, 0.2)",
        };
      case "mitr":
      default:
        return {
          name: "Smriti Mitr",
          role: "Loving Companion",
          skinColor: "#FCE2D4",
          hairColor: "#1E293B",
          accessoryColor: WarmPalette.roseDusty,
          accessoryIcon: "heart",
          auraColor: "rgba(194, 116, 124, 0.22)",
        };
    }
  };

  const personaInfo = getPersonaDetails();

  const getStatusLabel = () => {
    switch (state) {
      case "listening":
        return "Listening to you...";
      case "speaking":
        return "Speaking with warmth";
      case "thinking":
        return "Remembering...";
      case "comforting":
        return "Here with you";
      case "idle":
      default:
        return "Ready to talk";
    }
  };

  const getStatusColor = () => {
    switch (state) {
      case "listening":
        return "#16A34A";
      case "speaking":
        return WarmPalette.roseDusty;
      case "thinking":
        return "#2563EB";
      case "comforting":
        return "#D97706";
      case "idle":
      default:
        return "#64748B";
    }
  };

  const spin = headTiltAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-4deg", "0deg", "4deg"],
  });

  return (
    <View style={[styles.wrapper, { width: size + 40, height: size + 50 }]}>
      {/* ── Outer Pulsing Aura Glow ────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.auraCircle,
          {
            width: size + 28,
            height: size + 28,
            borderRadius: (size + 28) / 2,
            backgroundColor: personaInfo.auraColor,
            transform: [{ scale: pulseAuraAnim }],
          },
        ]}
      />

      {/* ── Main Avatar Head Container ─────────────────────────────────────── */}
      <TouchableOpacity
        activeOpacity={onPress ? 0.85 : 1}
        onPress={onPress}
        style={{ alignItems: "center", justifyContent: "center" }}
      >
        <Animated.View
          style={[
            styles.avatarHead,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: personaInfo.skinColor,
              transform: [{ scale: breatheAnim }, { rotate: spin }],
            },
          ]}
        >
          {/* Hair Top Cap */}
          <View
            style={[
              styles.hairCap,
              {
                width: size * 0.88,
                height: size * 0.42,
                backgroundColor: personaInfo.hairColor,
                top: 0,
              },
            ]}
          />

          {/* Hair Curls on Sides */}
          <View
            style={[
              styles.hairCurlLeft,
              {
                width: size * 0.22,
                height: size * 0.35,
                backgroundColor: personaInfo.hairColor,
                left: size * 0.04,
                top: size * 0.2,
              },
            ]}
          />
          <View
            style={[
              styles.hairCurlRight,
              {
                width: size * 0.22,
                height: size * 0.35,
                backgroundColor: personaInfo.hairColor,
                right: size * 0.04,
                top: size * 0.2,
              },
            ]}
          />

          {/* Gentle Eyebrows */}
          <View style={[styles.eyebrowsRow, { top: size * 0.32, width: size * 0.62 }]}>
            <View
              style={[
                styles.eyebrow,
                {
                  transform: [
                    {
                      rotate:
                        state === "comforting"
                          ? "-6deg"
                          : state === "listening"
                          ? "4deg"
                          : "0deg",
                    },
                  ],
                },
              ]}
            />
            <View
              style={[
                styles.eyebrow,
                {
                  transform: [
                    {
                      rotate:
                        state === "comforting"
                          ? "6deg"
                          : state === "listening"
                          ? "-4deg"
                          : "0deg",
                    },
                  ],
                },
              ]}
            />
          </View>

          {/* Animated Expressive Eyes */}
          <View style={[styles.eyesRow, { top: size * 0.39, width: size * 0.58 }]}>
            {/* Left Eye */}
            <Animated.View
              style={[
                styles.eyeBall,
                {
                  transform: [{ scaleY: blinkAnim }],
                },
              ]}
            >
              <View style={styles.eyePupil}>
                <View style={styles.eyeHighlight} />
              </View>
            </Animated.View>

            {/* Right Eye */}
            <Animated.View
              style={[
                styles.eyeBall,
                {
                  transform: [{ scaleY: blinkAnim }],
                },
              ]}
            >
              <View style={styles.eyePupil}>
                <View style={styles.eyeHighlight} />
              </View>
            </Animated.View>
          </View>

          {/* Rosy Cheeks (Warmth & Comfort) */}
          <View style={[styles.cheeksRow, { top: size * 0.53, width: size * 0.72 }]}>
            <View style={styles.blushDot} />
            <View style={styles.blushDot} />
          </View>

          {/* Cute Nose */}
          <View style={[styles.nose, { top: size * 0.52 }]} />

          {/* Animated Lip-Sync Mouth */}
          <Animated.View
            style={[
              styles.mouth,
              {
                top: size * 0.66,
                height: mouthAnim,
                width: state === "speaking" ? size * 0.24 : size * 0.28,
                borderRadius: state === "speaking" ? 12 : 6,
                backgroundColor:
                  state === "speaking" ? "#9E2A2B" : "#B0413E",
                borderBottomLeftRadius: 12,
                borderBottomRightRadius: 12,
              },
            ]}
          />

          {/* Cultural Traditional Shawl / Garment Badge */}
          <View
            style={[
              styles.bottomGamosa,
              {
                backgroundColor: personaInfo.accessoryColor,
                bottom: 0,
                width: size * 0.8,
                height: size * 0.16,
              },
            ]}
          >
            <Feather
              name={personaInfo.accessoryIcon as any}
              size={12}
              color="#FFFFFF"
            />
          </View>
        </Animated.View>
      </TouchableOpacity>

      {/* ── State Indicator Badge (e.g. Listening / Speaking) ──────────────── */}
      {showStatusBadge && (
        <View style={styles.statusBadgeContainer}>
          <View
            style={[styles.statusDot, { backgroundColor: getStatusColor() }]}
          />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusLabel()}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  auraCircle: {
    position: "absolute",
    alignSelf: "center",
  },
  avatarHead: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  hairCap: {
    position: "absolute",
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  hairCurlLeft: {
    position: "absolute",
    borderRadius: 20,
  },
  hairCurlRight: {
    position: "absolute",
    borderRadius: 20,
  },
  eyebrowsRow: {
    position: "absolute",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  eyebrow: {
    width: 20,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: "#1E293B",
  },
  eyesRow: {
    position: "absolute",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eyeBall: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#0F172A",
  },
  eyePupil: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: "#1E293B",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    paddingTop: 1.5,
    paddingRight: 1.5,
  },
  eyeHighlight: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
  cheeksRow: {
    position: "absolute",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  blushDot: {
    width: 18,
    height: 10,
    borderRadius: 9,
    backgroundColor: "rgba(244, 63, 94, 0.28)",
  },
  nose: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D97706",
  },
  mouth: {
    position: "absolute",
    alignSelf: "center",
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  bottomGamosa: {
    position: "absolute",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadgeContainer: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
