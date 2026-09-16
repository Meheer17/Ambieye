import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { IncomingCallPayload } from "@/services/family/callSignalingService";
import { useTranslation } from "@/constants/i18n";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import { BorderRadius, Shadows, Spacing } from "@/constants/theme";

interface IncomingCallModalProps {
  visible: boolean;
  incomingCall: IncomingCallPayload | null;
  onAccept: (call: IncomingCallPayload) => void;
  onDecline: (call: IncomingCallPayload) => void;
}

export function IncomingCallModal({
  visible,
  incomingCall,
  onAccept,
  onDecline,
}: IncomingCallModalProps) {
  const { currentLang } = useTranslation();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible && incomingCall) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.18,
            duration: 700,
            useNativeDriver: Platform.OS !== "web",
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: Platform.OS !== "web",
          }),
        ])
      );
      pulse.start();

      // Voice prompt announcing incoming call
      const promptText =
        incomingCall.callType === "video"
          ? currentLang === "as"
            ? `${incomingCall.callerName}ৰ পৰা ভিডিঅ' কল আহিছে`
            : currentLang === "hi"
            ? `${incomingCall.callerName} का वीडियो कॉल आ रहा है`
            : `Incoming video call from ${incomingCall.callerName}`
          : currentLang === "as"
          ? `${incomingCall.callerName}ৰ পৰা ফোন আহিছে`
          : currentLang === "hi"
          ? `${incomingCall.callerName} का फोन आ रहा है`
          : `Incoming phone call from ${incomingCall.callerName}`;

      VoiceAssistant.speak(promptText, currentLang);

      return () => {
        pulse.stop();
        VoiceAssistant.stop();
      };
    }
  }, [visible, incomingCall, currentLang, pulseAnim]);

  if (!visible || !incomingCall) return null;

  const isVideo = incomingCall.callType === "video";

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.content}>
          {/* Header Title Badge */}
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.typeBadge,
                { backgroundColor: isVideo ? "#ECFDF5" : "#EFF6FF" },
              ]}
            >
              <Feather
                name={isVideo ? "video" : "phone"}
                size={16}
                color={isVideo ? "#059669" : "#2563EB"}
              />
              <Text
                style={[
                  styles.typeBadgeText,
                  { color: isVideo ? "#065F46" : "#1E40AF" },
                ]}
              >
                {isVideo
                  ? currentLang === "as"
                    ? "ভিডিঅ' কল আহিছে"
                    : "Incoming Video Call"
                  : currentLang === "as"
                  ? "ফোন কল আহিছে"
                  : "Incoming Audio Call"}
              </Text>
            </View>
          </View>

          {/* Central Pulsing Avatar */}
          <View style={styles.avatarWrapper}>
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  transform: [{ scale: pulseAnim }],
                  borderColor: isVideo ? "#A7F3D0" : "#BFDBFE",
                },
              ]}
            />
            <View
              style={[
                styles.avatarCircle,
                {
                  backgroundColor: isVideo ? "#F0FDF4" : "#EFF6FF",
                  borderColor: isVideo ? "#34D399" : "#60A5FA",
                },
              ]}
            >
              <Text style={styles.avatarEmoji}>
                {isVideo ? "👩" : "👤"}
              </Text>
            </View>
          </View>

          {/* Caller Details */}
          <View style={styles.callerInfoBox}>
            <Text style={styles.callerName}>{incomingCall.callerName}</Text>
            <Text style={styles.callerSubtitle}>
              {currentLang === "as"
                ? "পৰিয়ালৰ সদস্য / Family Contact"
                : "Family Member"}
            </Text>
            <View style={styles.ringingStatusBox}>
              <View style={styles.ringingDot} />
              <Text style={styles.ringingText}>
                {currentLang === "as"
                  ? "ফোন বাজি আছে..."
                  : currentLang === "hi"
                  ? "घंटी बज रही है..."
                  : "Ringing..."}
              </Text>
            </View>
          </View>

          {/* Big Elderly-Friendly Action Buttons */}
          <View style={styles.actionsRow}>
            {/* Decline Button */}
            <TouchableOpacity
              style={styles.declineButton}
              onPress={() => onDecline(incomingCall)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Decline Call"
            >
              <View style={styles.iconCircleRed}>
                <Feather name="phone-off" size={26} color="#FFFFFF" />
              </View>
              <Text style={styles.declineButtonText}>
                {currentLang === "as"
                  ? "কাটি দিয়ক"
                  : currentLang === "hi"
                  ? "अस्वीकार"
                  : "Decline"}
              </Text>
            </TouchableOpacity>

            {/* Accept Button */}
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => onAccept(incomingCall)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Accept Call"
            >
              <View style={styles.iconCircleGreen}>
                <Feather name={isVideo ? "video" : "phone-call"} size={26} color="#FFFFFF" />
              </View>
              <Text style={styles.acceptButtonText}>
                {currentLang === "as"
                  ? "উত্তৰ দিয়ক"
                  : currentLang === "hi"
                  ? "स्वीकारें"
                  : "Accept"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  badgeRow: {
    marginTop: Spacing.lg,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    gap: 8,
  },
  typeBadgeText: {
    fontSize: 14,
    fontWeight: "800",
  },
  avatarWrapper: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  pulseRing: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 3.5,
  },
  avatarCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: {
    fontSize: 68,
  },
  callerInfoBox: {
    alignItems: "center",
    width: "100%",
  },
  callerName: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 6,
  },
  callerSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  ringingStatusBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 8,
  },
  ringingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
  },
  ringingText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E2E8F0",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: 16,
    marginBottom: Spacing.xl,
  },
  declineButton: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 2,
    borderColor: "#EF4444",
    paddingVertical: 18,
    borderRadius: BorderRadius.xxl,
    gap: 8,
    ...Shadows.md,
  },
  iconCircleRed: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FCA5A5",
  },
  acceptButton: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#059669",
    paddingVertical: 18,
    borderRadius: BorderRadius.xxl,
    gap: 8,
    ...Shadows.md,
  },
  iconCircleGreen: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },
});
