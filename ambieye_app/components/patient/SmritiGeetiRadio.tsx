import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { WarmPalette } from "@/constants/theme";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import { useTranslation } from "@/constants/i18n";

import { radioAudioService, RADIO_STATION_CONFIGS, RadioStationConfig } from "@/services/audio/radioAudioService";

export type RadioStation = RadioStationConfig;
export const RADIO_STATIONS = RADIO_STATION_CONFIGS;

export const SmritiGeetiRadio: React.FC = () => {
  const { currentLang } = useTranslation();
  const [activeStationIndex, setActiveStationIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState<"gentle" | "standard">("standard");

  // Animations
  const needleAnim = useRef(new Animated.Value(0)).current;
  const vinylRotateAnim = useRef(new Animated.Value(0)).current;
  const wave1Anim = useRef(new Animated.Value(6)).current;
  const wave2Anim = useRef(new Animated.Value(14)).current;
  const wave3Anim = useRef(new Animated.Value(8)).current;
  const wave4Anim = useRef(new Animated.Value(18)).current;

  // Web Audio Synth References
  const audioCtxRef = useRef<any>(null);
  const synthTimerRef = useRef<any>(null);
  const noteStepRef = useRef(0);

  const currentStation = RADIO_STATIONS[activeStationIndex];

  // ── 1. Animate Tuning Needle on Station Change ──────────────────────────────
  useEffect(() => {
    Animated.spring(needleAnim, {
      toValue: activeStationIndex * 58,
      useNativeDriver: Platform.OS !== "web",
      friction: 6,
      tension: 40,
    }).start();
  }, [activeStationIndex, needleAnim]);

  // ── 2. Vinyl & Waveform Animations ──────────────────────────────────────────
  useEffect(() => {
    if (isPlaying) {
      // Spinning record
      const spinLoop = Animated.loop(
        Animated.timing(vinylRotateAnim, {
          toValue: 1,
          duration: 3800,
          easing: Easing.linear,
          useNativeDriver: Platform.OS !== "web",
        })
      );
      spinLoop.start();

      // Dancing sound bars
      const createBarLoop = (anim: Animated.Value, minH: number, maxH: number, dur: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: maxH,
              duration: dur,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: minH,
              duration: dur,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: false,
            }),
          ])
        );
      };

      const wave1 = createBarLoop(wave1Anim, 4, 22, 280);
      const wave2 = createBarLoop(wave2Anim, 8, 28, 340);
      const wave3 = createBarLoop(wave3Anim, 5, 20, 240);
      const wave4 = createBarLoop(wave4Anim, 6, 26, 310);

      wave1.start();
      wave2.start();
      wave3.start();
      wave4.start();

      return () => {
        spinLoop.stop();
        wave1.stop();
        wave2.stop();
        wave3.stop();
        wave4.stop();
      };
    } else {
      vinylRotateAnim.setValue(0);
      wave1Anim.setValue(6);
      wave2Anim.setValue(10);
      wave3Anim.setValue(7);
      wave4Anim.setValue(8);
    }
  }, [isPlaying, vinylRotateAnim, wave1Anim, wave2Anim, wave3Anim, wave4Anim]);

  // ── 3. Real Audio Playback with Offline Fallback ─────────────────────────────
  useEffect(() => {
    if (isPlaying) {
      radioAudioService.playStation(currentStation, volumeLevel);

      // Web Audio oscillator fallback if on desktop web
      if (Platform.OS === "web") {
        if (synthTimerRef.current) clearInterval(synthTimerRef.current);
        noteStepRef.current = 0;
        const stepMelody = () => {
          const notes = currentStation.fallbackMelodyNotes;
          const currentFreq = notes[noteStepRef.current % notes.length];
          playHarmonicTone(currentFreq, currentStation.tempo * 0.9);
          noteStepRef.current = (noteStepRef.current + 1) % notes.length;
        };
        stepMelody();
        synthTimerRef.current = setInterval(stepMelody, currentStation.tempo);
      }
    } else {
      radioAudioService.pause();
      if (synthTimerRef.current) clearInterval(synthTimerRef.current);
    }

    return () => {
      if (synthTimerRef.current) clearInterval(synthTimerRef.current);
    };
  }, [isPlaying, activeStationIndex, volumeLevel]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      radioAudioService.stop();
      VoiceAssistant.stop();
    };
  }, []);

  const playHarmonicTone = (freq: number, durMs: number) => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const gainVal = volumeLevel === "gentle" ? 0.08 : 0.15;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(gainVal, ctx.currentTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durMs / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + durMs / 1000 + 0.05);
    } catch (e) {
      // Audio synth fallback
    }
  };

  const handleTogglePlay = async () => {
    if (!isPlaying) {
      setIsPlaying(true);
      const announce =
        currentLang === "as"
          ? `আকাশবাণী ৰেডিঅ' বাজিছে: ${currentStation.nameAs}`
          : `Playing ${currentStation.name}`;
      VoiceAssistant.speak(announce, currentLang);
    } else {
      setIsPlaying(false);
      await radioAudioService.pause();
    }
  };

  const handleSelectStation = async (index: number) => {
    setActiveStationIndex(index);
    if (!isPlaying) {
      setIsPlaying(true);
    }
    const station = RADIO_STATIONS[index];
    const announce =
      currentLang === "as"
        ? `ৰেডিঅ' টিউনিং: ${station.nameAs}`
        : `Tuned to ${station.name} on ${station.freq}`;
    VoiceAssistant.speak(announce, currentLang);
  };

  const spin = vinylRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.radioEnclosure}>
      {/* Vintage Wood Top Banner */}
      <View style={styles.radioHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.radioIconGlow}>
            <MaterialCommunityIcons name="radio" size={22} color="#D97706" />
          </View>
          <View>
            <Text style={styles.radioMainTitle}>Smriti Geeti · Vintage Folk Radio</Text>
            <Text style={styles.radioSubTitle}>Akashvani & Regional Music Therapy for Calming</Text>
          </View>
        </View>

        {/* Live On-Air Pill */}
        <View style={[styles.onAirPill, isPlaying ? styles.onAirPillActive : styles.onAirPillIdle]}>
          <View style={[styles.onAirDot, isPlaying && styles.onAirDotActive]} />
          <Text style={[styles.onAirText, isPlaying && styles.onAirTextActive]}>
            {isPlaying ? "ON AIR" : "RADIO STANDBY"}
          </Text>
        </View>
      </View>

      {/* ── Vintage Tuning Dial Stage ────────────────────────────────────────── */}
      <View style={styles.tuningDialContainer}>
        {/* Dial Scale Markings */}
        <View style={styles.dialFrequencyScale}>
          <Text style={styles.dialFreqNum}>96</Text>
          <Text style={styles.dialFreqNum}>98.4</Text>
          <Text style={styles.dialFreqNum}>101.2</Text>
          <Text style={styles.dialFreqNum}>103.8</Text>
          <Text style={styles.dialFreqNum}>106</Text>
        </View>

        {/* Dial Needle Track */}
        <View style={styles.dialTrack}>
          <View style={styles.dialTrackCenterLine} />
          <Animated.View
            style={[
              styles.dialNeedle,
              {
                transform: [{ translateX: needleAnim }],
              },
            ]}
          >
            <View style={styles.needlePointer} />
            <View style={styles.needleLine} />
          </Animated.View>
        </View>

        {/* Active Station Display Glow Box */}
        <View style={styles.stationDisplayBox}>
          <View style={styles.stationInfoGroup}>
            <Text style={styles.currentFreqLabel}>
              {currentStation.freq} • {currentStation.genre}
            </Text>
            <Text style={styles.currentStationTitle} numberOfLines={1}>
              {currentStation.emoji} {currentStation.name}
            </Text>
          </View>

          {/* Animated Waveform Bars */}
          <View style={styles.waveformContainer}>
            <Animated.View style={[styles.waveBar, { height: wave1Anim }]} />
            <Animated.View style={[styles.waveBar, { height: wave2Anim }]} />
            <Animated.View style={[styles.waveBar, { height: wave3Anim }]} />
            <Animated.View style={[styles.waveBar, { height: wave4Anim }]} />
          </View>
        </View>
      </View>

      {/* ── Station Selector Buttons Row ────────────────────────────────────── */}
      <View style={styles.stationsGrid}>
        {RADIO_STATIONS.map((st, idx) => {
          const isSelected = activeStationIndex === idx;
          const stationDisplayName = currentLang === "as" ? st.nameAs : st.name;
          return (
            <TouchableOpacity
              key={st.id}
              style={[
                styles.stationBtn,
                isSelected && styles.stationBtnSelected,
                isSelected && isPlaying && styles.stationBtnPlaying,
              ]}
              onPress={() => handleSelectStation(idx)}
              activeOpacity={0.8}
            >
              <Text style={styles.stationBtnEmoji}>{st.emoji}</Text>
              <View style={styles.stationBtnInfo}>
                <Text
                  style={[
                    styles.stationBtnTitle,
                    isSelected && { color: "#92400E", fontWeight: "800" },
                  ]}
                  numberOfLines={1}
                >
                  {stationDisplayName}
                </Text>
                <Text style={styles.stationBtnFreq}>{st.freq}</Text>
              </View>
              {isSelected && isPlaying && (
                <MaterialCommunityIcons name="volume-high" size={18} color="#D97706" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Bottom Master Controls: Play/Pause & Volume ────────────────────── */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.bigPlayBtn, isPlaying && styles.bigPlayBtnActive]}
          onPress={handleTogglePlay}
          activeOpacity={0.85}
        >
          <Feather
            name={isPlaying ? "pause" : "play"}
            size={22}
            color="#FFFFFF"
            style={{ marginLeft: isPlaying ? 0 : 2 }}
          />
          <Text style={styles.bigPlayBtnText} numberOfLines={1}>
            {isPlaying
              ? currentLang === "as"
                ? "গান বন্ধ কৰক (Pause)"
                : currentLang === "hi"
                ? "रेडियो रोकें (Pause)"
                : "Pause Radio"
              : currentLang === "as"
              ? `গান শুনক (${currentStation.emoji} Play)`
              : currentLang === "hi"
              ? `रेडियो चलाएं (${currentStation.emoji} Play)`
              : `Play Radio (${currentStation.emoji})`}
          </Text>
        </TouchableOpacity>

        {/* Volume Gentle Toggle */}
        <TouchableOpacity
          style={styles.volumeToggleBtn}
          onPress={() =>
            setVolumeLevel(volumeLevel === "gentle" ? "standard" : "gentle")
          }
          activeOpacity={0.8}
        >
          <Feather
            name={volumeLevel === "gentle" ? "volume-1" : "volume-2"}
            size={18}
            color="#4F46E5"
          />
          <Text style={styles.volumeToggleText}>
            {volumeLevel === "gentle" ? "Gentle 🔉" : "Full 🔊"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  radioEnclosure: {
    backgroundColor: "#FDFBF7",
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#E5DFD7",
    shadowColor: "#A8A29E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  radioHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  radioIconGlow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  radioMainTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#292524",
  },
  radioSubTitle: {
    fontSize: 11,
    color: "#78716C",
    marginTop: 1,
  },
  onAirPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  onAirPillActive: {
    backgroundColor: "#FFF1F2",
    borderColor: "#FECDD3",
  },
  onAirPillIdle: {
    backgroundColor: "#FDFBF7",
    borderColor: "#E5DFD7",
  },
  onAirDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#A8A29E",
  },
  onAirDotActive: {
    backgroundColor: "#E11D48",
  },
  onAirText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#78716C",
    letterSpacing: 0.6,
  },
  onAirTextActive: {
    color: "#BE123C",
  },

  // ── TUNING DIAL ─────────────────────────────────────────────────────────────
  tuningDialContainer: {
    backgroundColor: "#F7F5F0",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#E7E2D8",
    marginBottom: 12,
  },
  dialFrequencyScale: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  dialFreqNum: {
    fontSize: 10,
    fontWeight: "800",
    color: "#78716C",
    letterSpacing: 0.5,
  },
  dialTrack: {
    height: 20,
    backgroundColor: "#EDE8DF",
    borderRadius: 6,
    position: "relative",
    justifyContent: "center",
    marginBottom: 10,
    paddingHorizontal: 12,
  },
  dialTrackCenterLine: {
    height: 2,
    backgroundColor: "rgba(120, 113, 108, 0.2)",
    width: "100%",
  },
  dialNeedle: {
    position: "absolute",
    left: 14,
    alignItems: "center",
  },
  needlePointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 5,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#6366F1",
  },
  needleLine: {
    width: 2,
    height: 18,
    backgroundColor: "#6366F1",
  },
  stationDisplayBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E5DFD7",
  },
  stationInfoGroup: {
    flex: 1,
  },
  currentFreqLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6366F1",
    letterSpacing: 0.4,
  },
  currentStationTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E2024",
    marginTop: 2,
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    height: 28,
    paddingBottom: 2,
  },
  waveBar: {
    width: 4,
    backgroundColor: "#818CF8",
    borderRadius: 2,
  },

  // ── STATIONS BUTTONS ────────────────────────────────────────────────────────
  stationsGrid: {
    gap: 6,
    marginBottom: 12,
  },
  stationBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1.5,
    borderColor: "#EAE7E1",
    gap: 10,
  },
  stationBtnSelected: {
    backgroundColor: "#F5F3FF",
    borderColor: "#C7D2FE",
  },
  stationBtnPlaying: {
    borderColor: "#6366F1",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stationBtnEmoji: {
    fontSize: 20,
  },
  stationBtnInfo: {
    flex: 1,
  },
  stationBtnTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E2024",
  },
  stationBtnFreq: {
    fontSize: 11,
    color: "#78716C",
    marginTop: 1,
  },

  // ── MASTER CONTROLS ─────────────────────────────────────────────────────────
  controlsRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  bigPlayBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowRadius: 6,
    elevation: 3,
  },
  bigPlayBtnActive: {
    backgroundColor: "#B45309",
  },
  bigPlayBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  volumeToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FDE68A",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  volumeToggleText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#78350F",
  },
});
