import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { callService, CallState } from "@/services/family/callService";
import { useCallMedia } from "@/hooks/useCallMedia";
import { useTranslation } from "@/constants/i18n";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import { BorderRadius, Shadows, Spacing } from "@/constants/theme";
import { CallMediaCanvas } from "@/components/family/CallMediaCanvas";

const { width, height } = Dimensions.get("window");

export default function ActiveCallScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { currentLang } = useTranslation();
  const params = useLocalSearchParams<{
    contactId?: string;
    contactName?: string;
    contactAvatar?: string;
    contactRelationship?: string;
    contactRelation?: string;
    callType?: "audio" | "video";
    phone?: string;
    initiator?: string;
    incoming?: string;
  }>();

  const callType = (params.callType as "audio" | "video") || "video";
  const contactName = params.contactName || "Family Contact";
  const contactAvatar = params.contactAvatar || (callType === "video" ? "👩" : "👤");
  const contactRelationship = params.contactRelationship || params.contactRelation || "Family Member";

  const [callState, setCallState] = useState<CallState>(callService.getState());
  const { hasCameraPermission, hasAudioPermission, isPermissionDenied, requestPermissions } = useCallMedia();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isVideo = callType === "video";
  const callInitiatedRef = useRef(false);

  // ── Mount Lifecycle: Initiate or Answer Call ──────────────────────────────
  useEffect(() => {
    async function startOrConnectCall() {
      if (callInitiatedRef.current) return;
      callInitiatedRef.current = true;

      if (params.initiator === "patient" && params.contactId) {
        const currentSession = callService.getActiveSession();
        if (
          !currentSession ||
          currentSession.familyMemberId !== params.contactId ||
          currentSession.status === "ended" ||
          currentSession.status === "declined"
        ) {
          try {
            await callService.startCall({
              contactId: params.contactId,
              contactName,
              contactAvatar,
              contactRelationship,
              phone: params.phone,
              callType,
            });
          } catch (e) {
            console.warn("[ActiveCallScreen] Call start error:", e);
          }
        }
      }
    }

    startOrConnectCall();
  }, [params.contactId, params.initiator, contactName, contactAvatar, contactRelationship, params.phone, callType]);

  // Subscribe to real-time CallService state
  useEffect(() => {
    const unsubscribe = callService.subscribe((state) => {
      setCallState(state);
      if (state.callStatus === "ended" || state.callStatus === "declined") {
        setTimeout(() => {
          if (router.canGoBack()) {
            router.back();
          }
        }, 1500);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [router]);

  // Hide bottom tab bar while on active call screen
  useEffect(() => {
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({
        tabBarStyle: { display: "none" },
      });
    }
    return () => {
      if (parent) {
        parent.setOptions({
          tabBarStyle: undefined,
        });
      }
    };
  }, [navigation]);

  // Pulsing animation for calling / ringing state
  useEffect(() => {
    if (callState.callStatus === "initiating" || callState.callStatus === "ringing") {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: Platform.OS !== "web",
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: Platform.OS !== "web",
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [callState.callStatus, pulseAnim]);

  // Voice announcements for call state
  useEffect(() => {
    if (callState.callStatus === "connected") {
      const msg =
        currentLang === "as"
          ? `${contactName}ৰ লগত সংযোগ হৈছে`
          : currentLang === "hi"
          ? `${contactName} से बात शुरू हो गई है`
          : `Connected with ${contactName}`;
      VoiceAssistant.speak(msg, currentLang);
    } else if (callState.callStatus === "declined") {
      const msg =
        currentLang === "as"
          ? "কল অস্বীকাৰ কৰা হ'ল"
          : currentLang === "hi"
          ? "कॉल व्यस्त है"
          : "Call was declined";
      VoiceAssistant.speak(msg, currentLang);
    }
  }, [callState.callStatus, contactName, currentLang]);

  // Format elapsed duration seconds into MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleEndCall = () => {
    VoiceAssistant.stop();
    callService.endActiveCall();
  };

  const handleToggleMute = () => {
    callService.toggleMute();
  };

  const handleToggleVideo = () => {
    callService.toggleVideo();
  };

  const handleSwitchCamera = () => {
    callService.switchCamera();
  };

  const handleToggleSpeaker = () => {
    callService.toggleSpeaker();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <View style={styles.secureBadge}>
          <Feather name="shield" size={13} color="#10B981" />
          <Text style={styles.secureBadgeText}>
            {currentLang === "as" ? "সুৰক্ষিত পৰিয়াল লাইন" : "Encrypted Family Line"}
          </Text>
        </View>

        {callState.callStatus === "connected" && (
          <View style={styles.durationBadge}>
            <View style={styles.durationDot} />
            <Text style={styles.durationText}>{formatDuration(callState.callDuration)}</Text>
          </View>
        )}
      </View>

      {/* ── MAIN MEDIA CANVAS ────────────────────────────────────────────── */}
      <View style={styles.mediaContainer}>
        {/* Permission Denied Banner */}
        {isPermissionDenied && (
          <View style={styles.permissionBanner}>
            <Feather name="alert-triangle" size={18} color="#F59E0B" />
            <Text style={styles.permissionText}>
              {currentLang === "as"
                ? "কেমেৰা বা মাইক্ৰ'ফোনৰ অনুমতি প্ৰয়োজন"
                : "Camera/Microphone permission needed"}
            </Text>
            <TouchableOpacity onPress={requestPermissions} style={styles.grantBtn}>
              <Text style={styles.grantBtnText}>Grant</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Real-time Call Media Canvas */}
        <CallMediaCanvas
          callType={callType}
          callStatus={callState.callStatus}
          contactName={contactName}
          contactAvatar={contactAvatar}
          contactRelationship={contactRelationship}
          remoteStream={callState.remoteStream}
          localStream={callState.localStream}
          isVideoDisabled={callState.isVideoDisabled}
          isFrontCamera={callState.isFrontCamera}
          hasCameraPermission={hasCameraPermission}
          pulseAnim={pulseAnim}
          currentLang={currentLang}
        />
      </View>

      {/* ── ELDERLY CONTROL DECK (Large 60px touch targets) ─────────────── */}
      <View style={styles.controlDeckContainer}>
        <View style={styles.controlsRow}>
          {/* Mute / Unmute Microphone */}
          <TouchableOpacity
            style={[
              styles.controlBtn,
              callState.isAudioMuted && styles.controlBtnActive,
            ]}
            onPress={handleToggleMute}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={callState.isAudioMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            <Feather
              name={callState.isAudioMuted ? "mic-off" : "mic"}
              size={24}
              color={callState.isAudioMuted ? "#EF4444" : "#FFFFFF"}
            />
            <Text style={styles.controlLabel}>
              {callState.isAudioMuted ? "Muted" : "Mic"}
            </Text>
          </TouchableOpacity>

          {/* Video Toggle (Only for Video Calls) */}
          {isVideo && (
            <TouchableOpacity
              style={[
                styles.controlBtn,
                callState.isVideoDisabled && styles.controlBtnActive,
              ]}
              onPress={handleToggleVideo}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={callState.isVideoDisabled ? "Turn Video On" : "Turn Video Off"}
            >
              <Feather
                name={callState.isVideoDisabled ? "video-off" : "video"}
                size={24}
                color={callState.isVideoDisabled ? "#EF4444" : "#FFFFFF"}
              />
              <Text style={styles.controlLabel}>
                {callState.isVideoDisabled ? "Camera Off" : "Camera"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Switch Front/Back Camera (For Video Calls on Native) */}
          {isVideo && Platform.OS !== "web" && (
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={handleSwitchCamera}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Switch Camera"
            >
              <MaterialCommunityIcons name="camera-flip" size={24} color="#FFFFFF" />
              <Text style={styles.controlLabel}>Flip</Text>
            </TouchableOpacity>
          )}

          {/* Speaker Toggle */}
          <TouchableOpacity
            style={[
              styles.controlBtn,
              callState.isSpeakerOn && styles.controlBtnSpeakerOn,
            ]}
            onPress={handleToggleSpeaker}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Toggle Speaker"
          >
            <Feather
              name={callState.isSpeakerOn ? "volume-2" : "volume-x"}
              size={24}
              color="#FFFFFF"
            />
            <Text style={styles.controlLabel}>Speaker</Text>
          </TouchableOpacity>
        </View>

        {/* Big Crimson End Call Button */}
        <TouchableOpacity
          style={styles.endCallBigBtn}
          onPress={handleEndCall}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="End Call"
        >
          <Feather name="phone-off" size={28} color="#FFFFFF" />
          <Text style={styles.endCallText}>
            {currentLang === "as"
              ? "কল সমাপ্ত কৰক"
              : currentLang === "hi"
              ? "कॉल समाप्त करें"
              : "End Call"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    gap: 6,
    borderWidth: 1,
    borderColor: "#059669",
  },
  secureBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#34D399",
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    gap: 8,
  },
  durationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  durationText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"],
  },
  mediaContainer: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    position: "relative",
  },
  permissionBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    gap: 8,
    marginBottom: Spacing.sm,
  },
  permissionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
    flex: 1,
  },
  grantBtn: {
    backgroundColor: "#D97706",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  grantBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  controlDeckContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Platform.OS === "ios" ? 22 : 16,
    paddingTop: 6,
    gap: 12,
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  controlBtn: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 50,
    maxWidth: 64,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    gap: 2,
    flex: 1,
    marginHorizontal: 3,
  },
  controlBtnActive: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderWidth: 1.5,
    borderColor: "#EF4444",
  },
  controlBtnSpeakerOn: {
    backgroundColor: "rgba(99, 102, 241, 0.3)",
    borderWidth: 1.5,
    borderColor: "#6366F1",
  },
  controlLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#CBD5E1",
  },
  endCallBigBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    borderRadius: BorderRadius.xl,
    gap: 10,
    ...Shadows.md,
  },
  endCallText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
});
