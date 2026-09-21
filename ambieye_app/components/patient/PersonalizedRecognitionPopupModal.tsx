import React, { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTranslation } from "@/constants/i18n";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import { PersonalizedActivity } from "@/types/personalizedActivity";

const { width } = Dimensions.get("window");

interface Props {
  visible: boolean;
  activity: PersonalizedActivity | null;
  onPlay: (activity: PersonalizedActivity) => void;
  onDismiss: () => void;
}

export const PersonalizedRecognitionPopupModal: React.FC<Props> = ({
  visible,
  activity,
  onPlay,
  onDismiss,
}) => {
  const { currentLang } = useTranslation();
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible && activity) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Speak aloud to announce the incoming memory challenge
      const speakPrompt =
        currentLang === "as"
          ? `অনিতাই আপোনালৈ এটা মৰমৰ স্মৃতি প্ৰশ্ন পঠিয়াইছে: ${
              activity.promptQuestionAs || activity.promptQuestion
            }`
          : currentLang === "hi"
          ? `अनिता ने आपके लिए एक प्यारा सा सवाल भेजा है: ${
              activity.promptQuestionHi || activity.promptQuestion
            }`
          : `Anita sent a special memory question for you: ${activity.promptQuestion}`;

      VoiceAssistant.speak(speakPrompt, currentLang);
    } else {
      scaleAnim.setValue(0.85);
      pulseAnim.setValue(1);
    }
  }, [visible, activity, currentLang]);

  if (!activity) return null;

  const mediaTypeLabel =
    activity.mediaType === "photo"
      ? currentLang === "as"
        ? "📸 বিশেষ ফটো খেল"
        : currentLang === "hi"
        ? "📸 पारिवारिक तस्वीर"
        : "📸 Family Photo Recall"
      : activity.mediaType === "audio"
      ? currentLang === "as"
        ? "🎙️ কণ্ঠস্বৰ চিনাক্তকৰণ"
        : currentLang === "hi"
        ? "🎙️ आवाज पहचान"
        : "🎙️ Voice Recognition"
      : currentLang === "as"
      ? "🎥 স্মৃতিৰ ভিডিঅ'"
      : currentLang === "hi"
      ? "🎥 यादगार वीडियो"
      : "🎥 Video Moment";

  const questionText =
    currentLang === "as"
      ? activity.promptQuestionAs || activity.promptQuestion
      : currentLang === "hi"
      ? activity.promptQuestionHi || activity.promptQuestion
      : activity.promptQuestion;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.cardContainer, { transform: [{ scale: scaleAnim }] }]}>
          {/* Glowing Star Top Badge */}
          <Animated.View
            style={[styles.starBadgeContainer, { transform: [{ scale: pulseAnim }] }]}
          >
            <View style={styles.starCircle}>
              <Text style={{ fontSize: 28 }}>🌟</Text>
            </View>
          </Animated.View>

          {/* Header Notification Tag */}
          <View style={styles.tagRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{mediaTypeLabel}</Text>
            </View>
          </View>

          {/* Warm Sender Announcement */}
          <Text style={styles.senderTitle}>
            {currentLang === "as"
              ? "পৰিয়ালৰ পৰা এটা মৰমৰ স্মৃতি!"
              : currentLang === "hi"
              ? "परिवार से एक प्यारा सा संदेश!"
              : "A Special Memory from Home!"}
          </Text>

          <Text style={styles.senderSub}>
            {currentLang === "as"
              ? "অনিতাই আপোনাৰ বাবে এটা চিনাকি খেল প্ৰস্তুত কৰিছে।"
              : currentLang === "hi"
              ? "अनिता ने आपके लिए एक सुंदर स्मृति खेल भेजा है।"
              : "Anita created a personalized memory quiz just for you."}
          </Text>

          {/* Media Preview Box */}
          <View style={styles.mediaBox}>
            {activity.mediaType === "photo" ? (
              <Image
                source={{ uri: activity.mediaUrl }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            ) : activity.mediaType === "audio" ? (
              <View style={styles.audioPlaceholderBox}>
                <MaterialCommunityIcons name="waveform" size={36} color="#EA580C" />
                <Text style={styles.audioHintText}>
                  {currentLang === "as"
                    ? "পৰিয়ালৰ মৰমৰ মাত শুনক"
                    : currentLang === "hi"
                    ? "अपनों की मीठी आवाज सुनें"
                    : "Tap to listen to familiar voice"}
                </Text>
              </View>
            ) : (
              <View style={[styles.audioPlaceholderBox, { backgroundColor: "#FAF5FF" }]}>
                <Feather name="video" size={36} color="#7C3AED" />
                <Text style={[styles.audioHintText, { color: "#7C3AED" }]}>
                  {currentLang === "as"
                    ? "আনন্দৰ পুৰণি দৃশ্য"
                    : currentLang === "hi"
                    ? "खुशियों का वीडियो देखें"
                    : "Watch happy memory clip"}
                </Text>
              </View>
            )}
          </View>

          {/* Question Text */}
          <View style={styles.questionCard}>
            <Text style={styles.questionPromptText}>"{questionText}"</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => onPlay(activity)}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="play-circle" size={24} color="#FFFFFF" />
              <Text style={styles.playButtonText}>
                {currentLang === "as"
                  ? "খেল আৰম্ভ কৰক"
                  : currentLang === "hi"
                  ? "खेल शुरू करें"
                  : "Play Memory Game"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dismissButton}
              onPress={onDismiss}
              activeOpacity={0.7}
            >
              <Text style={styles.dismissButtonText}>
                {currentLang === "as" ? "পিছত খেলিম" : currentLang === "hi" ? "बाद में" : "Later"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  cardContainer: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 36,
    paddingBottom: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    position: "relative",
  },
  starBadgeContainer: {
    position: "absolute",
    top: -26,
    alignItems: "center",
    justifyContent: "center",
  },
  starCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FEF3C7",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  tagRow: {
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#B45309",
  },
  senderTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  senderSub: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  mediaBox: {
    width: "100%",
    height: 150,
    borderRadius: 18,
    overflow: "hidden",
    marginVertical: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  audioPlaceholderBox: {
    flex: 1,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  audioHintText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#EA580C",
  },
  questionCard: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  questionPromptText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    lineHeight: 20,
  },
  actionsRow: {
    width: "100%",
    gap: 10,
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D97706",
    paddingVertical: 15,
    borderRadius: 16,
    gap: 8,
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  playButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  dismissButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  dismissButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94A3B8",
  },
});
