import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTranslation } from "@/constants/i18n";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import { SafeSound } from "@/utils/safeAudio";
import { personalizedActivityService } from "@/services/personalizedActivity/personalizedActivityService";
import {
  PersonalizedActivity,
  ActivityOption,
} from "@/types/personalizedActivity";
import { Colors, BorderRadius, Shadows, Spacing } from "@/constants/theme";

const { width } = Dimensions.get("window");

export default function PersonalizedRecallGameScreen() {
  const router = useRouter();
  const { currentLang } = useTranslation();
  const { activityId } = useLocalSearchParams<{ activityId?: string }>();

  const [activity, setActivity] = useState<PersonalizedActivity | null>(null);
  const [loading, setLoading] = useState(true);

  // Gameplay State
  const [gameState, setGameState] = useState<"playing" | "celebrating" | "completed">("playing");
  const [selectedOption, setSelectedOption] = useState<ActivityOption | null>(null);
  const [attemptsCount, setAttemptsCount] = useState(1);
  const [hintRevealed, setHintRevealed] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [patientReaction, setPatientReaction] = useState<string | null>(null);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const celebrationAnim = useRef(new Animated.Value(0)).current;
  const soundRef = useRef<any>(null);

  // Load target activity
  useEffect(() => {
    async function loadActivity() {
      if (activityId) {
        const found = await personalizedActivityService.getActivityById(activityId);
        if (found) {
          setActivity(found);
        }
      } else {
        const all = await personalizedActivityService.getActivities("mahi", "active");
        if (all.length > 0) {
          setActivity(all[0]);
        }
      }
      setLoading(false);
      setStartTime(Date.now());
    }
    loadActivity();
  }, [activityId]);

  // Narration and prompt speech
  useEffect(() => {
    if (!loading && activity) {
      const qText =
        currentLang === "as"
          ? activity.promptQuestionAs || activity.promptQuestion
          : currentLang === "hi"
          ? activity.promptQuestionHi || activity.promptQuestion
          : activity.promptQuestion;

      const introSpeech = `${qText}. Tap who you think this is.`;
      VoiceAssistant.speak(introSpeech, currentLang);
    }
    return () => {
      VoiceAssistant.stop();
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, [loading, activity, currentLang]);

  // Audio waveform animation
  useEffect(() => {
    if (activity?.mediaType === "audio" || isPlayingAudio) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [activity?.mediaType, isPlayingAudio]);

  const handleToggleAudio = async () => {
    if (!activity || !activity.mediaUrl) return;

    if (isPlayingAudio && soundRef.current) {
      await soundRef.current.pauseAsync();
      setIsPlayingAudio(false);
      return;
    }

    try {
      if (!soundRef.current) {
        const sound = new SafeSound();
        await sound.loadAsync({ uri: activity.mediaUrl }, { shouldPlay: true });
        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.didJustFinish) {
            setIsPlayingAudio(false);
          }
        });
        soundRef.current = sound;
      } else {
        await soundRef.current.playAsync();
      }
      setIsPlayingAudio(true);
    } catch (e) {
      console.warn("Audio playback error:", e);
    }
  };

  const handleRevealHint = () => {
    setHintRevealed(true);
    if (activity?.hintText) {
      VoiceAssistant.speak(activity.hintText, currentLang);
    }
  };

  const handleOptionSelect = async (opt: ActivityOption) => {
    if (!activity || gameState === "celebrating" || gameState === "completed") return;

    setSelectedOption(opt);
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));

    if (opt.isCorrect) {
      // Correct! Trigger celebratory sequence
      setGameState("celebrating");

      Animated.spring(celebrationAnim, {
        toValue: 1,
        friction: 4,
        tension: 50,
        useNativeDriver: true,
      }).start();

      const praiseText =
        currentLang === "as"
          ? `অতি সুন্দৰ! এইয়া হৈছে আপোনাৰ মৰমৰ ${opt.textAs || opt.text}! ❤️`
          : currentLang === "hi"
          ? `शाबाश! यह आपकी अपनी ${opt.textHi || opt.text} हैं! ❤️`
          : `Wonderful! That is indeed your beloved ${opt.text}! ❤️`;

      VoiceAssistant.speak(praiseText, currentLang);

      // Persist result
      try {
        await personalizedActivityService.submitResult(activity.id, {
          patientId: "mahi",
          selectedOptionId: opt.id,
          isCorrect: true,
          attemptsCount,
          hintUsed: hintRevealed,
          responseTimeSeconds: elapsedSeconds,
          patientReaction: "loved",
        });
      } catch (e) {
        console.warn("Could not submit result:", e);
      }
    } else {
      // Gentle encouragement without negative buzzer
      setAttemptsCount((prev) => prev + 1);

      const gentleMsg =
        currentLang === "as"
          ? "উত্তৰটো অতি কাষ চাপিছে! আহক আকৌ এবাৰ মনত পেলাওঁ।"
          : currentLang === "hi"
          ? "बहुत करीब पहुंचे आप! चलिए एक बार फिर ध्यान से देखते हैं।"
          : "That's so close! Let's look again together.";

      VoiceAssistant.speak(gentleMsg, currentLang);
    }
  };

  const handleSelectReaction = async (reaction: string) => {
    if (!activity) return;
    setPatientReaction(reaction);
    try {
      await personalizedActivityService.submitResult(activity.id, {
        patientId: "mahi",
        selectedOptionId: selectedOption?.id || activity.options[0]?.id || "opt",
        isCorrect: true,
        attemptsCount,
        hintUsed: hintRevealed,
        responseTimeSeconds: Math.round((Date.now() - startTime) / 1000),
        patientReaction: reaction,
      });
    } catch {}

    const thankMsg =
      currentLang === "as"
        ? "অনিতালৈ আপোনাৰ অনুভূতি প্ৰেৰণ কৰা হ'ল! ❤️"
        : currentLang === "hi"
        ? "अनिता को आपका संदेश भेज दिया गया! ❤️"
        : "Sent your love and feedback back to Anita! ❤️";

    VoiceAssistant.speak(thankMsg, currentLang);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.emptyStateContainer}>
          <Text style={{ fontSize: 44 }}>🌟</Text>
          <Text style={styles.loadingText}>
            {currentLang === "as"
              ? "পৰিয়ালৰ স্মৃতি খেল সাজু হৈ আছে..."
              : currentLang === "hi"
              ? "पारिवारिक याददाश्त खेल तैयार हो रहा है..."
              : "Loading Family Memory Game..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!activity) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={22} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.topCenter}>
            <View style={styles.gamePill}>
              <Text style={styles.gamePillText}>🌟 FAMILY RECALL</Text>
            </View>
            <Text style={styles.topTitle}>Memory Challenges</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyIconCircle}>
            <Text style={{ fontSize: 44 }}>📸</Text>
          </View>
          <Text style={styles.emptyTitle}>
            {currentLang === "as"
              ? "বৰ্তমান কোনো নতুন স্মৃতি খেল নাই"
              : currentLang === "hi"
              ? "फिलहाल कोई नया याददाश्त खेल नहीं है"
              : "No Active Memory Challenges"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {currentLang === "as"
              ? "যেতিয়া আপোনাৰ পৰিয়ালে কোনো বিশেষ ফটো বা মাত আপোনালৈ পঠিয়াব, সেইটো আপোনাৰ স্ক্ৰীণত লগে লগে আহিব!"
              : currentLang === "hi"
              ? "जब आपका परिवार कोई खास तस्वीर या आवाज आपके लिए भेजेगा, वह स्क्रीन पर तुरंत आ जाएगी!"
              : "When your caregiver uploads a family photo, voice note, or video for you, it will pop up right here!"}
          </Text>

          <TouchableOpacity
            style={styles.emptyBackHomeBtn}
            onPress={() => router.push("/(patient)")}
            activeOpacity={0.85}
          >
            <Feather name="home" size={20} color="#FFFFFF" />
            <Text style={styles.emptyBackHomeText}>
              {currentLang === "as"
                ? "মুখ্য পৃষ্ঠালৈ যাওক"
                : currentLang === "hi"
                ? "मुख्य पृष्ठ पर जाएं"
                : "Back to Home"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const questionText =
    currentLang === "as"
      ? activity.promptQuestionAs || activity.promptQuestion
      : currentLang === "hi"
      ? activity.promptQuestionHi || activity.promptQuestion
      : activity.promptQuestion;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* ── Top Bar ──────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.topCenter}>
          <View style={styles.gamePill}>
            <Text style={styles.gamePillText}>🌟 FAMILY RECALL</Text>
          </View>
          <Text style={styles.topTitle}>{activity.title}</Text>
        </View>
        <TouchableOpacity
          onPress={() => VoiceAssistant.speak(questionText, currentLang)}
          style={styles.voiceReplayBtn}
          activeOpacity={0.7}
        >
          <Feather name="volume-2" size={20} color="#D97706" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Question Card ───────────────────────────────────────── */}
        <View style={styles.questionCard}>
          <Text style={styles.questionCardLabel}>
            {currentLang === "as"
              ? "চিনাক্ত কৰক · প্ৰশ্ন"
              : currentLang === "hi"
              ? "पहचानें · सवाल"
              : "Recognize with Love"}
          </Text>
          <Text style={styles.questionText}>"{questionText}"</Text>
        </View>

        {/* ── 2. Media Display Area ──────────────────────────────────── */}
        <View style={styles.mediaContainer}>
          {activity.mediaType === "photo" ? (
            <View style={styles.photoFrame}>
              <Image
                source={{ uri: activity.mediaUrl }}
                style={styles.fullPhoto}
                resizeMode="cover"
              />
              <View style={styles.photoCornerBadge}>
                <Feather name="image" size={14} color="#FFFFFF" />
                <Text style={styles.photoCornerText}>Family Moment</Text>
              </View>
            </View>
          ) : activity.mediaType === "audio" ? (
            <View style={styles.audioPlayerCard}>
              <Animated.View
                style={[
                  styles.audioGlowingCircle,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <TouchableOpacity
                  style={styles.audioCenterBtn}
                  onPress={handleToggleAudio}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name={isPlayingAudio ? "pause" : "play"}
                    size={40}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </Animated.View>

              <Text style={styles.audioPlayerTitle}>
                {isPlayingAudio
                  ? currentLang === "as"
                    ? "কণ্ঠ বাজি আছে..."
                    : currentLang === "hi"
                    ? "आवाज बज रही है..."
                    : "Playing Loving Voice Note..."
                  : currentLang === "as"
                  ? "মাত শুনিবলৈ বুটামটো টিপক"
                  : currentLang === "hi"
                  ? "आवाज सुनने के लिए बटन दबाएं"
                  : "Tap to Listen to Voice Note"}
              </Text>

              <View style={styles.waveformRow}>
                {Array.from({ length: 9 }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.waveBar,
                      { height: 16 + ((i * 7) % 24), backgroundColor: isPlayingAudio ? "#EA580C" : "#CBD5E1" },
                    ]}
                  />
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.videoPlayerCard}>
              <View style={styles.videoPlaceholder}>
                <MaterialCommunityIcons name="play-circle" size={56} color="#7C3AED" />
                <Text style={styles.videoPromptText}>
                  {currentLang === "as"
                    ? "ভিডিঅ' স্মৃতি চাওক"
                    : currentLang === "hi"
                    ? "वीडियो स्मृति देखें"
                    : "Watch Family Video Moment"}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ── 3. Gentle Clue Section ─────────────────────────────────── */}
        {activity.hintText ? (
          <View style={styles.hintContainer}>
            {hintRevealed ? (
              <View style={styles.hintRevealedBox}>
                <Feather name="info" size={16} color="#D97706" />
                <Text style={styles.hintRevealedText}>{activity.hintText}</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.hintButton}
                onPress={handleRevealHint}
                activeOpacity={0.8}
              >
                <Feather name="help-circle" size={16} color="#D97706" />
                <Text style={styles.hintButtonText}>
                  {currentLang === "as"
                    ? "মৰমৰ ইংগিত লাগিব নেকি? (সহায়)"
                    : currentLang === "hi"
                    ? "प्यारा सा संकेत चाहिए?"
                    : "Need a gentle clue?"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {/* ── 4. Multiple Choice Recognition Cards ────────────────────── */}
        <Text style={styles.chooseHeading}>
          {currentLang === "as"
            ? "সঠিক উত্তৰটো বাছক:"
            : currentLang === "hi"
            ? "सही विकल्प चुनें:"
            : "Who is this?"}
        </Text>

        <View style={styles.optionsGrid}>
          {activity.options.map((opt) => {
            const isSelected = selectedOption?.id === opt.id;
            const isCorrectAnswer = gameState === "celebrating" && opt.isCorrect;

            const optLabel =
              currentLang === "as"
                ? opt.textAs || opt.text
                : currentLang === "hi"
                ? opt.textHi || opt.text
                : opt.text;

            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.optionBtn,
                  isSelected && !opt.isCorrect && styles.optionBtnWrong,
                  isCorrectAnswer && styles.optionBtnCorrect,
                ]}
                onPress={() => handleOptionSelect(opt)}
                activeOpacity={0.8}
              >
                <View style={styles.optionEmojiBox}>
                  <Text style={{ fontSize: 26 }}>{opt.emoji || "👤"}</Text>
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.optionMainText}>{optLabel}</Text>
                  {opt.subtitle ? (
                    <Text style={styles.optionSubText}>{opt.subtitle}</Text>
                  ) : null}
                </View>

                {isCorrectAnswer && (
                  <View style={styles.correctIconCircle}>
                    <Feather name="check" size={20} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── 5. Celebration & Reaction Feedback ─────────────────────── */}
        {gameState === "celebrating" && (
          <Animated.View
            style={[
              styles.celebrationCard,
              {
                opacity: celebrationAnim,
                transform: [
                  {
                    scale: celebrationAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={{ fontSize: 36, textAlign: "center" }}>🎉 ❤️ 🌟</Text>
            <Text style={styles.celebrationTitle}>
              {currentLang === "as"
                ? "অতি সুন্দৰ! আপুনি সঠিক উত্তৰ দিলে!"
                : currentLang === "hi"
                ? "वाह! बिल्कुल सही पहचान!"
                : "Wonderful! You recognized correctly!"}
            </Text>
            <Text style={styles.celebrationSub}>
              {currentLang === "as"
                ? "আপোনাৰ চিনাক্তকৰণ অনিতাৰ সৈতে শ্বেয়াৰ কৰা হ'ল।"
                : currentLang === "hi"
                ? "आपकी पहचान अनिता के पास सुरक्षित पहुँच गई है।"
                : "Your result and love have been recorded for Anita."}
            </Text>

            {/* Emotional Reaction Ratings */}
            <Text style={styles.reactionPromptText}>
              {currentLang === "as"
                ? "এই স্মৃতিটো চাই কেনে লাগিল?"
                : currentLang === "hi"
                ? "यह याद देखकर आपको कैसा लगा?"
                : "How did this memory feel?"}
            </Text>

            <View style={styles.reactionButtonsRow}>
              {[
                { key: "loved", emoji: "❤️", label: "Loved it" },
                { key: "smiled", emoji: "😊", label: "Smiled" },
                { key: "talk", emoji: "🗣️", label: "Let's Talk" },
              ].map((rec) => (
                <TouchableOpacity
                  key={rec.key}
                  style={[
                    styles.reactionBtn,
                    patientReaction === rec.key && styles.reactionBtnActive,
                  ]}
                  onPress={() => handleSelectReaction(rec.key)}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 22 }}>{rec.emoji}</Text>
                  <Text style={styles.reactionBtnText}>{rec.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Text style={styles.continueBtnText}>
                {currentLang === "as"
                  ? "গৃহপৃষ্ঠালৈ ঘূৰি যাওক"
                  : currentLang === "hi"
                  ? "मुख्य पृष्ठ पर जाएं"
                  : "Back to Home"}
              </Text>
              <Feather name="arrow-right" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  topCenter: {
    alignItems: "center",
  },
  gamePill: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  gamePillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#B45309",
  },
  topTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  voiceReplayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFBEB",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  questionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 14,
  },
  questionCardLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#D97706",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  questionText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
    lineHeight: 24,
  },
  mediaContainer: {
    marginBottom: 14,
  },
  photoFrame: {
    width: "100%",
    height: 240,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  fullPhoto: {
    width: "100%",
    height: "100%",
  },
  photoCornerBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  photoCornerText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  audioPlayerCard: {
    backgroundColor: "#FFF7ED",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFEDD5",
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  audioGlowingCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EA580C",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  audioCenterBtn: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  audioPlayerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#9A3412",
    marginTop: 14,
    textAlign: "center",
  },
  waveformRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    height: 40,
  },
  waveBar: {
    width: 5,
    borderRadius: 3,
  },
  videoPlayerCard: {
    backgroundColor: "#FAF5FF",
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#F3E8FF",
  },
  videoPlaceholder: {
    alignItems: "center",
    gap: 10,
  },
  videoPromptText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#7C3AED",
  },
  hintContainer: {
    marginBottom: 14,
  },
  hintButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF3C7",
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  hintButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B45309",
  },
  hintRevealedBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    padding: 12,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  hintRevealedText: {
    fontSize: 13,
    color: "#92400E",
    fontWeight: "600",
    flex: 1,
    lineHeight: 18,
  },
  chooseHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: "#64748B",
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  optionsGrid: {
    gap: 10,
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  optionBtnCorrect: {
    backgroundColor: "#F0FDF4",
    borderColor: "#16A34A",
  },
  optionBtnWrong: {
    backgroundColor: "#FFFBEB",
    borderColor: "#F59E0B",
  },
  optionEmojiBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  optionMainText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  optionSubText: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  correctIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },
  celebrationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    marginTop: 18,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#86EFAC",
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  celebrationTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#15803D",
    marginTop: 10,
    textAlign: "center",
  },
  celebrationSub: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
    lineHeight: 18,
  },
  reactionPromptText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#334155",
    marginTop: 16,
    marginBottom: 8,
  },
  reactionButtonsRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  reactionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    gap: 4,
  },
  reactionBtnActive: {
    backgroundColor: "#FFF1F2",
    borderColor: "#E11D48",
  },
  reactionBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
    marginTop: 16,
    width: "100%",
  },
  continueBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyBackHomeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#D97706",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    shadowColor: "#D97706",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyBackHomeText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  loadingText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#475569",
    marginTop: 16,
    textAlign: "center",
  },
});
