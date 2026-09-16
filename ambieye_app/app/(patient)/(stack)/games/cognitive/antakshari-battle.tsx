import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  Easing,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { VirtualAvatar, AvatarState } from "@/components/companion/VirtualAvatar";
import { useTranslation } from "@/constants/i18n";
import { antakshariAudioService } from "@/services/audio/antakshariAudioService";
import {
  speechRecognitionService,
  STTResult,
} from "@/services/audio/speechRecognitionService";
import { gameSessionService } from "@/services/games";
import {
  antakshariMatcher,
  AntakshariMatchResult,
  AntakshariGameLoop,
  TOTAL_ROUNDS,
  songRepository,
  Song,
} from "@/services/antakshari";
import { GameEventType } from "@/types/gameSession";

const { width } = Dimensions.get("window");

export type SingState = "idle" | "listening" | "processing";

export default function AntakshariBattleScreen() {
  const router = useRouter();
  const { t, currentLang } = useTranslation();

  // Antakshari Game Loop Controller (Rounds, Turns, Scoring & Completion)
  const gameLoopRef = useRef<AntakshariGameLoop>(
    new AntakshariGameLoop(songRepository, "M")
  );
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartedRef = useRef<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [gameScore, setGameScore] = useState<number>(0);
  const [isGameCompleted, setIsGameCompleted] = useState<boolean>(false);
  const [companionSong, setCompanionSong] = useState<Song | null>(null);
  const [requiredSyllable, setRequiredSyllable] = useState<string>("M");
  const [matchResult, setMatchResult] = useState<AntakshariMatchResult | null>(null);

  // Playback & UI Turn State
  const [isPlayingSong, setIsPlayingSong] = useState(false);
  const [isCompanionTurn, setIsCompanionTurn] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [avatarState, setAvatarState] = useState<AvatarState>("speaking");

  // Microphone Recording & STT State
  const [singState, setSingState] = useState<SingState>("idle");
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sttResult, setSttResult] = useState<STTResult | null>(null);
  const [testScenario, setTestScenario] = useState<
    "auto" | "no_speech" | "empty" | "network_error" | "stt_error"
  >("auto");

  // Recording Visual Pulse Animation
  const recordPulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<any>(null);

  // Handle Recording Pulse Loop
  useEffect(() => {
    let pulseLoop: Animated.CompositeAnimation | null = null;
    if (singState === "listening") {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(recordPulseAnim, {
            toValue: 1.18,
            duration: 650,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(recordPulseAnim, {
            toValue: 1,
            duration: 650,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
    } else {
      recordPulseAnim.setValue(1);
    }

    return () => {
      if (pulseLoop) pulseLoop.stop();
    };
  }, [singState, recordPulseAnim]);

  // Initialize Game Session & Companion on Mount
  useEffect(() => {
    let isMounted = true;

    if (!sessionStartedRef.current) {
      sessionStartedRef.current = true;

      const initSession = async () => {
        try {
          const session = await gameSessionService.startSession({
            gameId: "antakshari_battle",
            metadata: {
              initialSyllable: "M",
              gameTitle: "Antakshari Battle",
              mode: "cultural_melody",
              companionPersona: "bhupen_da",
            },
          });
          if (isMounted && session) {
            sessionIdRef.current = session.sessionId;
            setSessionId(session.sessionId);
            gameLoopRef.current.setSessionId(session.sessionId);

            // Execute initial companion turn
            setIsCompanionTurn(true);
            setAvatarState("speaking");
            const compRes = await gameLoopRef.current.executeCompanionTurn();
            if (isMounted) {
              if (compRes.song) setCompanionSong(compRes.song);
              setRequiredSyllable(compRes.nextRequiredSyllable);
              setIsCompanionTurn(false);
              setAvatarState("idle");
            }
          }
        } catch (err) {
          console.warn("[AntakshariBattle] Failed to start game session:", err);
        }
      };

      initSession();
    }

    return () => {
      isMounted = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (antakshariAudioService.isCurrentlyRecording()) {
        antakshariAudioService.stopRecording().catch(() => {});
      }
      // If user exits before game completion, mark session as abandoned
      gameLoopRef.current.abandonGame("screen_unmounted").catch(() => {});
    };
  }, []);

  const handleTogglePlay = () => {
    const nextState = !isPlayingSong;
    setIsPlayingSong(nextState);
    if (nextState) {
      setAvatarState("speaking");
      setIsCompanionTurn(true);
      if (singState === "listening") {
        handleStopRecording();
      }
    } else {
      setAvatarState("idle");
    }
  };

  /**
   * Step 1: Start Recording on Tap
   */
  const handleStartRecording = async () => {
    setErrorMessage(null);
    setSttResult(null);

    try {
      const hasPermission = await antakshariAudioService.requestPermission();
      if (!hasPermission) {
        const title = "Microphone Access Needed";
        const message =
          "Please allow microphone access in settings so we can listen to your singing.";
        setErrorMessage(message);
        if (Platform.OS !== "web") {
          Alert.alert(title, message);
        }
        return;
      }

      if (isPlayingSong) {
        setIsPlayingSong(false);
      }

      const result = await antakshariAudioService.startRecording();
      if (!result.success) {
        const errorMsg = result.error || "Could not start recording. Please try again.";
        setErrorMessage(errorMsg);
        if (Platform.OS !== "web") {
          Alert.alert("Recording Notice", errorMsg);
        }
        return;
      }

      setSingState("listening");
      setAvatarState("listening");
      setIsCompanionTurn(false);
      setRecordSeconds(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordSeconds((sec) => sec + 1);
      }, 1000);
    } catch (err: any) {
      console.error("[AntakshariBattle] Recording error:", err);
      setErrorMessage("Something went wrong while starting recording.");
    }
  };

  /**
   * Step 2: Stop Recording on Tap Again -> "Processing..." -> Send to STT
   */
  const handleStopRecording = async () => {
    setSingState("processing");
    setAvatarState("thinking");
    setSttResult(null);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      // 1. Stop audio recording
      const audioResult = await antakshariAudioService.stopRecording();
      if (audioResult.success && audioResult.uri) {
        setRecordedUri(audioResult.uri);

        // 2. Send recorded audio to SpeechRecognitionService
        speechRecognitionService.setTestMode(testScenario);
        const sttResponse = await speechRecognitionService.transcribeAudio(
          audioResult.uri,
          audioResult.durationMs
        );

        setSttResult(sttResponse);
        setAvatarState("idle");

        // 3. Process Player Answer through GameLoop Controller
        try {
          const playResult = await gameLoopRef.current.processPlayerAnswer(
            sttResponse.transcript,
            audioResult.durationMs
          );

          setMatchResult(playResult.matchResult);
          setGameScore(gameLoopRef.current.getState().gameScore);

          if (playResult.isGameCompleted) {
            setIsGameCompleted(true);
            setAvatarState("speaking");
          } else if (playResult.isCorrect) {
            // Hand turn back to companion for next round after a brief natural pause
            setTimeout(async () => {
              setIsCompanionTurn(true);
              setAvatarState("speaking");
              const compRes = await gameLoopRef.current.executeCompanionTurn();
              if (compRes.song) setCompanionSong(compRes.song);
              setRequiredSyllable(compRes.nextRequiredSyllable);
              setCurrentRound(gameLoopRef.current.getState().round);
              setTimeout(() => {
                setIsCompanionTurn(false);
                setAvatarState("idle");
              }, 1200);
            }, 1000);
          }
        } catch (playErr) {
          console.error("[AntakshariBattle] Process player answer error:", playErr);
        }
      } else if (audioResult.error) {
        setErrorMessage(audioResult.error);
        setAvatarState("idle");
      }
    } catch (err: any) {
      console.error("[AntakshariBattle] Stop recording error:", err);
      setErrorMessage("Could not process the recorded song.");
      setAvatarState("idle");
    } finally {
      setSingState("idle");
    }
  };

  const handleMicButtonPress = () => {
    if (singState === "idle") {
      handleStartRecording();
    } else if (singState === "listening") {
      handleStopRecording();
    }
  };

  const handleToggleHint = () => {
    const nextHint = !showHint;
    setShowHint(nextHint);

    // Record hint_used event when hint is opened
    if (nextHint) {
      gameLoopRef.current.useHint().catch(() => {});
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* ── 1. HEADER BAR ────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityLabel="Go Back"
            accessibilityRole="button"
          >
            <Feather name="arrow-left" size={24} color="#334155" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Antakshari Battle</Text>
            <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
              <View style={styles.badgePill}>
                <Text style={styles.badgeText}>{`ROUND ${currentRound}/${TOTAL_ROUNDS}`}</Text>
              </View>
              <View style={[styles.badgePill, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}>
                <Text style={[styles.badgeText, { color: "#065F46" }]}>{`SCORE ${gameScore}`}</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerRightPlaceholder} />
        </View>

        {/* ── 2. CLEAR TURN INDICATOR ──────────────────────────────── */}
        <View style={styles.turnIndicatorWrapper}>
          <View
            style={[
              styles.turnIndicatorCard,
              isCompanionTurn ? styles.turnCompanionCard : styles.turnPlayerCard,
            ]}
          >
            <View
              style={[
                styles.turnDot,
                isCompanionTurn ? styles.turnDotCompanion : styles.turnDotPlayer,
              ]}
            >
              <MaterialCommunityIcons
                name={isCompanionTurn ? "music-note" : "microphone"}
                size={16}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.turnTextColumn}>
              <Text style={styles.turnSubText}>CURRENT TURN</Text>
              <Text style={styles.turnMainTitle}>
                {isGameCompleted
                  ? "Battle Finished!"
                  : isCompanionTurn
                  ? "Your Companion's Turn"
                  : `Your Turn to Sing with "${requiredSyllable}"!`}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.switchTurnBtn}
              onPress={() => {
                const nextTurn = !isCompanionTurn;
                setIsCompanionTurn(nextTurn);
                setAvatarState(nextTurn ? "speaking" : "listening");
              }}
              activeOpacity={0.75}
            >
              <Feather name="refresh-cw" size={14} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 3. LARGE FRIENDLY VIRTUAL COMPANION AVATAR (CENTER) ──── */}
        <View style={styles.avatarCenterStage}>
          <View style={styles.avatarBackdropRing}>
            <View style={styles.avatarInnerRing}>
              <VirtualAvatar
                size={180}
                persona="bhupen_da"
                state={avatarState}
                showStatusBadge={false}
                onPress={() => {
                  setAvatarState((prev) => (prev === "speaking" ? "idle" : "speaking"));
                }}
              />
            </View>
          </View>

          <View style={styles.companionNamePill}>
            <Text style={styles.companionNameEmoji}>🌸</Text>
            <Text style={styles.companionNameText}>Bhupen Da</Text>
            <Text style={styles.companionRoleText}>· Musical Companion</Text>
          </View>
        </View>

        {/* ── 4. SHORT CLEAR INSTRUCTION / COMPLETION BANNER ──────── */}
        <View style={styles.instructionContainer}>
          {isGameCompleted ? (
            <View style={[styles.instructionCard, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}>
              <Text style={styles.instructionEmoji}>🎉</Text>
              <Text style={[styles.instructionText, { color: "#065F46", fontWeight: "700" }]}>
                {`All ${TOTAL_ROUNDS} rounds completed! Final Score: ${gameScore}`}
              </Text>
            </View>
          ) : (
            <View style={styles.instructionCard}>
              <Text style={styles.instructionEmoji}>🎶</Text>
              <Text style={styles.instructionText}>
                {isCompanionTurn
                  ? "Companion is picking a melody..."
                  : `Sing your song starting with letter "${requiredSyllable}".`}
              </Text>
            </View>
          )}
        </View>

        {/* ── ERROR NOTICE BANNER ──────────────────────────────────── */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={18} color="#BE123C" />
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        )}

        {/* ── 5. MAIN ACTION BUTTONS SECTION ───────────────────────── */}
        <View style={styles.actionsSection}>
          {/* Large Audio/Play Button */}
          <TouchableOpacity
            style={[
              styles.audioButton,
              isPlayingSong && styles.audioButtonActive,
            ]}
            onPress={handleTogglePlay}
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.actionIconCircle,
                isPlayingSong ? styles.actionIconCircleActive : styles.actionIconCircleIndigo,
              ]}
            >
              <Feather
                name={isPlayingSong ? "pause" : "volume-2"}
                size={24}
                color={isPlayingSong ? "#FFFFFF" : "#4F46E5"}
              />
            </View>
            <View style={styles.actionButtonTextCol}>
              <Text
                style={[
                  styles.actionButtonPrimaryText,
                  isPlayingSong && styles.actionButtonPrimaryTextActive,
                ]}
              >
                {companionSong
                  ? `Companion: "${companionSong.title}"`
                  : isPlayingSong
                  ? "Playing Companion's Song..."
                  : "Play Companion's Song"}
              </Text>
              <Text style={styles.actionButtonSecondaryText}>
                {companionSong
                  ? `Ends with '${requiredSyllable}' · Your starting sound`
                  : isPlayingSong
                  ? "Tap to pause audio"
                  : "Listen to melody"}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Large Microphone Button Labeled "Sing" */}
          <TouchableOpacity
            style={[
              styles.singButton,
              singState === "listening" && styles.singButtonListening,
              singState === "processing" && styles.singButtonProcessing,
            ]}
            onPress={handleMicButtonPress}
            disabled={singState === "processing"}
            activeOpacity={0.85}
          >
            <View style={styles.iconCircleWrapper}>
              {singState === "listening" ? (
                <Animated.View
                  style={[
                    styles.actionIconCircleRoseActive,
                    { transform: [{ scale: recordPulseAnim }] },
                  ]}
                >
                  <MaterialCommunityIcons name="waveform" size={26} color="#FFFFFF" />
                </Animated.View>
              ) : singState === "processing" ? (
                <View style={styles.actionIconCircleProcessing}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              ) : (
                <View style={styles.actionIconCircleRose}>
                  <MaterialCommunityIcons name="microphone" size={26} color="#BE123C" />
                </View>
              )}
            </View>

            <View style={styles.actionButtonTextCol}>
              <View style={styles.singTitleRow}>
                <Text
                  style={[
                    styles.singButtonPrimaryText,
                    singState === "listening" && styles.singButtonPrimaryTextListening,
                    singState === "processing" && styles.singButtonPrimaryTextProcessing,
                  ]}
                >
                  {singState === "listening"
                    ? "Listening..."
                    : singState === "processing"
                    ? "Processing..."
                    : "Sing"}
                </Text>

                {singState === "listening" && (
                  <View style={styles.liveRecordPill}>
                    <View style={styles.liveRecordDot} />
                    <Text style={styles.liveRecordTimerText}>{formatTime(recordSeconds)}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.singButtonSecondaryText}>
                {singState === "listening"
                  ? "Recording active · Tap to stop"
                  : singState === "processing"
                  ? "Transcribing your song..."
                  : "Tap when ready to sing"}
              </Text>
            </View>
          </TouchableOpacity>

          {/* ── 6. PROCESSING STATE CARD ───────────────────────────── */}
          {singState === "processing" && (
            <View style={styles.processingCard}>
              <ActivityIndicator size="small" color="#4F46E5" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.processingCardTitle}>Transcribing Audio...</Text>
                <Text style={styles.processingCardSub}>Speech-to-text service is analyzing your singing.</Text>
              </View>
            </View>
          )}

          {/* ── 7. STT TRANSCRIPTION RESULT (DISPLAYED FOR TESTING) ─── */}
          {sttResult && (
            <View style={styles.sttResultSection}>
              {sttResult.success && sttResult.transcript ? (
                <View style={styles.transcriptCard}>
                  <View style={styles.transcriptHeader}>
                    <View style={styles.transcriptBadge}>
                      <MaterialCommunityIcons name="text-recognition" size={14} color="#4F46E5" />
                      <Text style={styles.transcriptBadgeText}>TRANSCRIBED LYRICS</Text>
                    </View>
                    {sttResult.isMock && (
                      <View style={styles.mockBadge}>
                        <Text style={styles.mockBadgeText}>Mock STT</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.transcriptText}>"{sttResult.transcript}"</Text>

                  <View style={styles.transcriptFooter}>
                    <Feather name="check" size={13} color="#059669" />
                    <Text style={styles.transcriptConfidenceText}>
                      Confidence: {Math.round((sttResult.confidence ?? 0.9) * 100)}%
                    </Text>
                  </View>
                </View>
              ) : (
                /* STT Error Card Handling No Speech / Empty / Failure */
                <View style={styles.sttErrorCard}>
                  <View style={styles.sttErrorHeader}>
                    <Feather name="alert-triangle" size={16} color="#DC2626" />
                    <Text style={styles.sttErrorTag}>
                      {sttResult.error ? sttResult.error.replace(/_/g, " ") : "TRANSCRIPTION FAILED"}
                    </Text>
                  </View>
                  <Text style={styles.sttErrorMessage}>
                    {sttResult.errorMessage || "Could not transcribe audio."}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── 8. STT TEST SCENARIO SELECTOR (FOR TESTING ERROR CASES) ─── */}
          <View style={styles.testScenarioContainer}>
            <Text style={styles.testScenarioTitle}>STT TEST SCENARIOS:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.testScenarioRow}>
              {[
                { key: "auto", label: "Auto (Realistic)" },
                { key: "no_speech", label: "No Speech" },
                { key: "empty", label: "Empty Transcript" },
                { key: "network_error", label: "Network Error" },
                { key: "stt_error", label: "STT Error" },
              ].map((item) => {
                const isSelected = testScenario === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.testScenarioPill,
                      isSelected && styles.testScenarioPillSelected,
                    ]}
                    onPress={() => setTestScenario(item.key as any)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.testScenarioPillText,
                        isSelected && styles.testScenarioPillTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Simple Hint Button */}
          <TouchableOpacity
            style={styles.hintButton}
            onPress={handleToggleHint}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color="#B45309" />
            <Text style={styles.hintButtonText}>
              {showHint ? "Hide Song Hint" : "Need a Hint?"}
            </Text>
            <Feather
              name={showHint ? "chevron-up" : "chevron-down"}
              size={18}
              color="#B45309"
            />
          </TouchableOpacity>

          {/* Simple Expandable Hint Card */}
          {showHint && (
            <View style={styles.hintCard}>
              <View style={styles.hintHeader}>
                <Text style={styles.hintTagText}>💡 MELODY HELPER</Text>
              </View>
              <Text style={styles.hintMainText}>
                The companion ended with the sound <Text style={styles.hintLetterHighlight}>"{requiredSyllable}"</Text>.
              </Text>
              <Text style={styles.hintSubText}>
                {companionSong
                  ? `Companion sang "${companionSong.title}". Sing any song starting with "${requiredSyllable}"!`
                  : `Sing any song starting with "${requiredSyllable}"!`}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FDFBF7", // Calm Warm Ivory
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },

  // ── Header Bar ────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#EAE4DC",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTitleContainer: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 8,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: 0.2,
  },
  badgePill: {
    marginTop: 4,
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#BE123C",
    letterSpacing: 0.8,
  },
  headerRightPlaceholder: {
    width: 48,
  },

  // ── Turn Indicator ───────────────────────────────────────────
  turnIndicatorWrapper: {
    marginVertical: 10,
  },
  turnIndicatorCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  turnCompanionCard: {
    backgroundColor: "#FAF5FF",
    borderColor: "#E9D5FF",
  },
  turnPlayerCard: {
    backgroundColor: "#FFF1F2",
    borderColor: "#FECDD3",
  },
  turnDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  turnDotCompanion: {
    backgroundColor: "#7C3AED",
  },
  turnDotPlayer: {
    backgroundColor: "#BE123C",
  },
  turnTextColumn: {
    flex: 1,
  },
  turnSubText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  turnMainTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
  },
  switchTurnBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  // ── Avatar Center Stage ──────────────────────────────────────
  avatarCenterStage: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
  },
  avatarBackdropRing: {
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderRadius: 130,
    backgroundColor: "#FFFDF9",
    borderWidth: 2,
    borderColor: "#F5EFEB",
    shadowColor: "#78716C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarInnerRing: {
    alignItems: "center",
    justifyContent: "center",
  },
  companionNamePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#EAE4DC",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: -8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  companionNameEmoji: {
    fontSize: 13,
    marginRight: 6,
  },
  companionNameText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#292524",
  },
  companionRoleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#78716C",
    marginLeft: 2,
  },

  // ── Short Instruction ────────────────────────────────────────
  instructionContainer: {
    marginVertical: 10,
  },
  instructionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#EAE4DC",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  instructionEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
    lineHeight: 22,
  },

  // ── Error Banner ─────────────────────────────────────────────
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF1F2",
    borderWidth: 1.5,
    borderColor: "#FECDD3",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginVertical: 8,
    gap: 10,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#9F1239",
    lineHeight: 18,
  },

  // ── Actions Section ──────────────────────────────────────────
  actionsSection: {
    gap: 14,
    marginTop: 6,
  },

  // Large Audio/Play Button
  audioButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#C7D2FE",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  audioButtonActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#4F46E5",
  },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  actionIconCircleIndigo: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  actionIconCircleActive: {
    backgroundColor: "#4F46E5",
  },
  actionButtonTextCol: {
    flex: 1,
  },
  actionButtonPrimaryText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#312E81",
  },
  actionButtonPrimaryTextActive: {
    color: "#1E1B4B",
  },
  actionButtonSecondaryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6366F1",
    marginTop: 2,
  },

  // Large Microphone Button Labeled "Sing"
  singButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#FECDD3",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: "#BE123C",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  singButtonListening: {
    backgroundColor: "#FFF1F2",
    borderColor: "#BE123C",
  },
  singButtonProcessing: {
    backgroundColor: "#EEF2FF",
    borderColor: "#818CF8",
  },
  iconCircleWrapper: {
    marginRight: 14,
  },
  actionIconCircleRose: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFF1F2",
    borderWidth: 1.5,
    borderColor: "#FECDD3",
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconCircleRoseActive: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#BE123C",
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconCircleProcessing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
  },
  singTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  singButtonPrimaryText: {
    fontSize: 19,
    fontWeight: "800",
    color: "#881337",
    letterSpacing: 0.3,
  },
  singButtonPrimaryTextListening: {
    color: "#BE123C",
  },
  singButtonPrimaryTextProcessing: {
    color: "#3730A3",
  },
  singButtonSecondaryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#BE123C",
    marginTop: 2,
  },
  liveRecordPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFE4E6",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 6,
  },
  liveRecordDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E11D48",
  },
  liveRecordTimerText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#BE123C",
  },

  // Processing Indicator Card
  processingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderWidth: 1.5,
    borderColor: "#C7D2FE",
    borderRadius: 16,
    padding: 14,
  },
  processingCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#312E81",
  },
  processingCardSub: {
    fontSize: 12,
    color: "#6366F1",
    marginTop: 2,
  },

  // Transcribed Result Card
  sttResultSection: {
    marginVertical: 4,
  },
  transcriptCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#C7D2FE",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  transcriptHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  transcriptBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  transcriptBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#4F46E5",
    letterSpacing: 0.6,
  },
  mockBadge: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  mockBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },
  transcriptText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E293B",
    lineHeight: 24,
    fontStyle: "italic",
    marginVertical: 4,
  },
  transcriptFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  transcriptConfidenceText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
  },

  // STT Error Card
  sttErrorCard: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1.5,
    borderColor: "#FECDD3",
    borderRadius: 18,
    padding: 14,
  },
  sttErrorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  sttErrorTag: {
    fontSize: 11,
    fontWeight: "800",
    color: "#B91C1C",
    letterSpacing: 0.6,
  },
  sttErrorMessage: {
    fontSize: 13,
    fontWeight: "600",
    color: "#991B1B",
    lineHeight: 18,
  },

  // Test Scenario Selector
  testScenarioContainer: {
    backgroundColor: "#FFFDF9",
    borderWidth: 1,
    borderColor: "#EAE4DC",
    borderRadius: 16,
    padding: 12,
    marginVertical: 4,
  },
  testScenarioTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#78716C",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  testScenarioRow: {
    gap: 8,
  },
  testScenarioPill: {
    backgroundColor: "#F5F5F4",
    borderWidth: 1,
    borderColor: "#E7E5E4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  testScenarioPillSelected: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  testScenarioPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#57534E",
  },
  testScenarioPillTextSelected: {
    color: "#FFFFFF",
  },

  // Simple Hint Button
  hintButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFDF9",
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  hintButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
  },

  // Expandable Hint Card
  hintCard: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1.5,
    borderColor: "#FCD34D",
    borderRadius: 16,
    padding: 14,
    marginTop: -4,
  },
  hintHeader: {
    marginBottom: 4,
  },
  hintTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#92400E",
    letterSpacing: 0.8,
  },
  hintMainText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#78350F",
    lineHeight: 20,
  },
  hintLetterHighlight: {
    fontWeight: "900",
    color: "#B45309",
    fontSize: 16,
  },
  hintSubText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400E",
    marginTop: 4,
  },
});
