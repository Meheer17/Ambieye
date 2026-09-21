import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { gameSessionService } from "@/services/games";
import { companionContextService } from "@/services/companion";
import { caregiverStorage, CognitiveGameSession } from "@/utils/caregiverStorage";
import { useTranslation } from "@/constants/i18n";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import { Colors, BorderRadius, Shadows, Spacing } from "@/constants/theme";

const { width } = Dimensions.get("window");

// ── Types ────────────────────────────────────────────────────────────────────
export interface PlanActionStep {
  id: string;
  stepNumber: number; // 1-indexed expected order
  textEn: string;
  textAs: string;
  textHi: string;
  emoji: string;
}

export interface PlanScenario {
  id: string;
  roundNumber: number;
  totalSteps: number;
  titleEn: string;
  titleAs: string;
  titleHi: string;
  goalPromptEn: string;
  goalPromptAs: string;
  goalPromptHi: string;
  scenarioEmoji: string;
  themeColor: string;
  themeBg: string;
  clueEn: string;
  clueAs: string;
  clueHi: string;
  expectedSteps: PlanActionStep[];
}

export const TOTAL_ROUNDS = 5;
export const BASE_POINTS_PER_ROUND = 100;
export const HINT_PENALTY_POINTS = 10;

// ── 5 Local Planning Scenarios ────────────────────────────────────────────────
export const SCENARIOS: PlanScenario[] = [
  // 1. Getting ready for the park (4 steps)
  {
    id: "sc_park",
    roundNumber: 1,
    totalSteps: 4,
    titleEn: "Going to the Park",
    titleAs: "উদ্যানলৈ ফুৰিবলৈ যোৱা",
    titleHi: "पार्क में टहलने जाना",
    goalPromptEn: "Plan your steps to go for a fresh walk in the park",
    goalPromptAs: "উদ্যানলৈ ফুৰিবলৈ ওলোৱাৰ ক্ৰমটো সজাওক",
    goalPromptHi: "पार्क में ताज़ी हवा खाने की तैयारी का क्रम बनाएं",
    scenarioEmoji: "🌳",
    themeColor: "#059669",
    themeBg: "#F0FDF4",
    clueEn: "Start by wearing your walking shoes first, then take a water bottle.",
    clueAs: "প্ৰথমে খোজকঢ়া জোতা পিন্ধক, তাৰ পিছত পানীৰ বটল লওক।",
    clueHi: "पहले टहलने वाले जूते पहनें, फिर पानी की बोतल लें।",
    expectedSteps: [
      {
        id: "p1_shoes",
        stepNumber: 1,
        textEn: "Put on comfortable walking shoes",
        textAs: "খোজকঢ়া জোতা পিন্ধক",
        textHi: "टहलने वाले आरामदायक जूते पहनें",
        emoji: "👟",
      },
      {
        id: "p1_water",
        stepNumber: 2,
        textEn: "Take a fresh water bottle",
        textAs: "পানীৰ বটল হাতত লওক",
        textHi: "पानी की बोतल साथ में लें",
        emoji: "💧",
      },
      {
        id: "p1_lock",
        stepNumber: 3,
        textEn: "Lock the front door safely",
        textAs: "ঘৰৰ দুৱাৰখন লক কৰক",
        textHi: "घर का दरवाजा सुरक्षित बंद करें",
        emoji: "🔑",
      },
      {
        id: "p1_walk",
        stepNumber: 4,
        textEn: "Walk into the green park",
        textAs: "সুন্দৰ উদ্যানত প্ৰৱেশ কৰক",
        textHi: "हरे-भरे पार्क में टहलना शुरू करें",
        emoji: "🌳",
      },
    ],
  },

  // 2. Making a cup of tea (4 steps)
  {
    id: "sc_tea",
    roundNumber: 2,
    totalSteps: 4,
    titleEn: "Making Morning Tea",
    titleAs: "পুৱাৰ চাহ তৈয়াৰ কৰা",
    titleHi: "सुबह की चाय बनाना",
    goalPromptEn: "Plan the steps to brew a warm fragrant cup of tea",
    goalPromptAs: "একাপ সুগন্ধি চাহ বনোৱাৰ সঠিক ক্ৰম সজাওক",
    goalPromptHi: "एक कप ताज़ा व स्वादिष्ट चाय बनाने के चरण तय करें",
    scenarioEmoji: "🫖",
    themeColor: "#B45309",
    themeBg: "#FFFBEB",
    clueEn: "Boil water first, then add tea leaves and pour into a cup.",
    clueAs: "প্ৰথমে কেটলীত পানী উতলাওক, তাৰ পিছত চাহপাত দি কাপত ঢালিব।",
    clueHi: "पहले पानी उबालें, फिर चायपत्ती डालकर कप में छानें।",
    expectedSteps: [
      {
        id: "p2_boil",
        stepNumber: 1,
        textEn: "Boil water in the kettle",
        textAs: "কেটলিত পানী উতলাওক",
        textHi: "केतली में पानी उबालें",
        emoji: "🫖",
      },
      {
        id: "p2_leaves",
        stepNumber: 2,
        textEn: "Add fresh aromatic tea leaves",
        textAs: "সুগন্ধি চাহপাত দিয়ক",
        textHi: "ताज़ा चायपत्ती डालें",
        emoji: "🌿",
      },
      {
        id: "p2_pour",
        stepNumber: 3,
        textEn: "Pour hot tea into your cup",
        textAs: "কাপত গৰম চাহ ঢালিব লাগে",
        textHi: "कप में गरमा-गरम चाय छानें",
        emoji: "☕",
      },
      {
        id: "p2_enjoy",
        stepNumber: 4,
        textEn: "Sip and enjoy the warm tea",
        textAs: "আনন্দৰে চাহৰ সোৱাদ লওক",
        textHi: "आराम से चाय की चुस्कियां लें",
        emoji: "🍵",
      },
    ],
  },

  // 3. Preparing for breakfast (4 steps)
  {
    id: "sc_breakfast",
    roundNumber: 3,
    totalSteps: 4,
    titleEn: "Preparing Breakfast",
    titleAs: "পুৱাৰ জলপান প্ৰস্তুতি",
    titleHi: "नाश्ते की तैयारी",
    goalPromptEn: "Plan the orderly steps to enjoy a healthy morning meal",
    goalPromptAs: "পুৱাৰ স্বাস্থ্যকৰ জলপান গ্ৰহণৰ ক্ৰম সজাওক",
    goalPromptHi: "सुबह का पौष्टिक नाश्ता करने के सही कदम चुनें",
    scenarioEmoji: "🍳",
    themeColor: "#0284C7",
    themeBg: "#F0F9FF",
    clueEn: "Wash your hands first before setting plates and eating food.",
    clueAs: "আহাৰ খোৱাৰ আগতে হাত ধুব লাগে, তাৰ পিছত কাঁহী সজাওক।",
    clueHi: "खाना खाने से पहले हाथ धोएं, फिर मेज़ पर थाली लगाएं।",
    expectedSteps: [
      {
        id: "p3_wash",
        stepNumber: 1,
        textEn: "Wash hands with soap and water",
        textAs: "হাত চাবোনেৰে ভালদৰে ধুব লাগে",
        textHi: "साबुन व पानी से हाथ धोएं",
        emoji: "🧼",
      },
      {
        id: "p3_plate",
        stepNumber: 2,
        textEn: "Set plate and spoon on the table",
        textAs: "মেজত কাঁহী আৰু চামুচ সজাওক",
        textHi: "मेज़ पर थाली और चम्मच लगाएं",
        emoji: "🍽️",
      },
      {
        id: "p3_serve",
        stepNumber: 3,
        textEn: "Serve warm food and fresh fruits",
        textAs: "গৰম আহাৰ আৰু ফল পৰিৱেশন কৰক",
        textHi: "गरम नाश्ता और फल परोसें",
        emoji: "🍎",
      },
      {
        id: "p3_eat",
        stepNumber: 4,
        textEn: "Sit comfortably and eat breakfast",
        textAs: "শান্তভাৱে বহি জলপান খাওক",
        textHi: "शांति से बैठकर नाश्ते का आनंद लें",
        emoji: "🥣",
      },
    ],
  },

  // 4. Getting ready for bed (5 steps)
  {
    id: "sc_bedtime",
    roundNumber: 4,
    totalSteps: 5,
    titleEn: "Getting Ready for Bed",
    titleAs: "ৰাতি শোৱাৰ প্ৰস্তুতি",
    titleHi: "सोने की तैयारी",
    goalPromptEn: "Plan the peaceful routine steps before night rest",
    goalPromptAs: "ৰাতিৰ শান্ত টোপনিৰ বাবে নিয়মসমূহ সজাওক",
    goalPromptHi: "रात को आराम से सोने के लिए सही क्रम बनाएं",
    scenarioEmoji: "🌙",
    themeColor: "#7C3AED",
    themeBg: "#FAF5FF",
    clueEn: "Brush teeth first, put on night clothes, listen to music, turn off lights.",
    clueAs: "প্ৰথমে দাঁত ঘঁহক, তাৰ পিছত নাইট ড্ৰেছ পিন্ধি লাইট নুমুৱাওক।",
    clueHi: "पहले ब्रश करें, कपड़े बदलें, संगीत सुनें और बत्ती बुझाएं।",
    expectedSteps: [
      {
        id: "p4_brush",
        stepNumber: 1,
        textEn: "Brush teeth and wash face",
        textAs: "দাঁত ঘঁহি মুখ পৰিষ্কাৰ কৰক",
        textHi: "दांत साफ करें और मुंह धोएं",
        emoji: "🪥",
      },
      {
        id: "p4_clothes",
        stepNumber: 2,
        textEn: "Change into soft night clothes",
        textAs: "ৰাতিৰ আৰামদায়ক কাপোৰ পিন্ধক",
        textHi: "रात के आरामदायक कपड़े पहनें",
        emoji: "👕",
      },
      {
        id: "p4_music",
        stepNumber: 3,
        textEn: "Listen to soft soothing music",
        textAs: "মৃদু শান্ত সঙ্গীত শুনক",
        textHi: "धीमा व मधुर संगीत सुनें",
        emoji: "📻",
      },
      {
        id: "p4_lights",
        stepNumber: 4,
        textEn: "Turn off the bright room lights",
        textAs: "কোঠাৰ লাইট নুমুৱাই দিয়ক",
        textHi: "कमरे की बत्तियाँ बंद करें",
        emoji: "💡",
      },
      {
        id: "p4_sleep",
        stepNumber: 5,
        textEn: "Rest comfortably in warm bed",
        textAs: "বিছনাত শান্তভাৱে শোৱক",
        textHi: "बिस्तर पर आराम से सो जाएं",
        emoji: "🛏️",
      },
    ],
  },

  // 5. Going to the doctor (5 steps)
  {
    id: "sc_doctor",
    roundNumber: 5,
    totalSteps: 5,
    titleEn: "Routine Health Checkup",
    titleAs: "চিকিৎসকৰ ওচৰলৈ যোৱা",
    titleHi: "डॉक्टर के पास जाना",
    goalPromptEn: "Plan your routine steps for a relaxed doctor appointment",
    goalPromptAs: "চিকিৎসকৰ ওচৰলৈ যোৱাৰ সুন্দৰ পৰিকল্পনা সজাওক",
    goalPromptHi: "स्वास्थ्य जांच के लिए डॉक्टर के पास जाने की योजना बनाएं",
    scenarioEmoji: "🩺",
    themeColor: "#E11D48",
    themeBg: "#FFF1F2",
    clueEn: "Gather prescription file first, dress neatly, travel to clinic, check in, and consult.",
    clueAs: "প্ৰথমে প্ৰেছক্ৰিপচন ফাইল লওক, ভাল কাপোৰ পিন্ধক আৰু ক্লিনিকলৈ যাওক।",
    clueHi: "पहले दवा की फाइल लें, तैयार हों, क्लिनिक पहुंचकर डॉक्टर से मिलें।",
    expectedSteps: [
      {
        id: "p5_file",
        stepNumber: 1,
        textEn: "Take medical prescription file",
        textAs: "চিকিৎসকৰ ফাইল আৰু প্ৰেছক্ৰিপচন লওক",
        textHi: "दवा की पर्ची व फाइल साथ लें",
        emoji: "📄",
      },
      {
        id: "p5_dress",
        stepNumber: 2,
        textEn: "Wear neat comfortable clothes",
        textAs: "পৰিষ্কাৰ কাপোৰ পিন্ধক",
        textHi: "साफ-सुथरे कपड़े पहनें",
        emoji: "👔",
      },
      {
        id: "p5_travel",
        stepNumber: 3,
        textEn: "Travel safely to the clinic",
        textAs: "ক্লিনিকলৈ সুৰক্ষিতভাৱে যাওক",
        textHi: "क्लीनिक के लिए रवाना हों",
        emoji: "🚗",
      },
      {
        id: "p5_reception",
        stepNumber: 4,
        textEn: "Check in at the reception desk",
        textAs: "ৰিচেপচনত নাম পঞ্জীয়ন কৰক",
        textHi: "स्वागत कक्ष पर नाम दर्ज कराएं",
        emoji: "🏥",
      },
      {
        id: "p5_consult",
        stepNumber: 5,
        textEn: "Consult kindly with the doctor",
        textAs: "চিকিৎসকৰ লগত পৰামৰ্শ কৰক",
        textHi: "डॉक्टर से शांति से परामर्श लें",
        emoji: "🩺",
      },
    ],
  },
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function PlanAndDoScreen() {
  const router = useRouter();
  const { t, currentLang } = useTranslation();

  // ── Gameplay State ─────────────────────────────────────────────────────────
  const [round, setRound] = useState<number>(1);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [currentScenario, setCurrentScenario] = useState<PlanScenario>(SCENARIOS[0]);
  const [shuffledSteps, setShuffledSteps] = useState<PlanActionStep[]>([]);
  const [orderedSteps, setOrderedSteps] = useState<PlanActionStep[]>([]);
  const [failedStepId, setFailedStepId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<number>(1);
  const [roundScore, setRoundScore] = useState<number>(0);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isCorrectFeedback, setIsCorrectFeedback] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [hintUsedInRound, setHintUsedInRound] = useState<boolean>(false);
  const [hintRevealed, setHintRevealed] = useState<boolean>(false);

  // ── Telemetry & Resilience State ───────────────────────────────────────────
  const sessionIdRef = useRef<string | null>(null);
  const gameStartTimeRef = useRef<number>(Date.now());
  const roundStartTimeRef = useRef<number>(Date.now());
  const totalMistakesRef = useRef<number>(0);
  const isCompletedRef = useRef<boolean>(false);
  const isAbandonedRef = useRef<boolean>(false);

  // ── Animations ─────────────────────────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getScenarioTitle = (sc: PlanScenario) => {
    if (currentLang === "as") return sc.titleAs;
    if (currentLang === "hi") return sc.titleHi;
    return sc.titleEn;
  };

  const getGoalPrompt = (sc: PlanScenario) => {
    if (currentLang === "as") return sc.goalPromptAs;
    if (currentLang === "hi") return sc.goalPromptHi;
    return sc.goalPromptEn;
  };

  const getStepText = (step: PlanActionStep) => {
    if (currentLang === "as") return step.textAs;
    if (currentLang === "hi") return step.textHi;
    return step.textEn;
  };

  const getClueText = (sc: PlanScenario) => {
    if (currentLang === "as") return sc.clueAs;
    if (currentLang === "hi") return sc.clueHi;
    return sc.clueEn;
  };

  // ── 1. Setup Round ─────────────────────────────────────────────────────────
  const setupRound = useCallback(
    async (roundNum: number) => {
      const sc = SCENARIOS[roundNum - 1] || SCENARIOS[0];
      const randomized = [...sc.expectedSteps].sort(() => 0.5 - Math.random());

      setRound(roundNum);
      setCurrentScenario(sc);
      setShuffledSteps(randomized);
      setOrderedSteps([]);
      setFailedStepId(null);
      setAttempts(1);
      setHintUsedInRound(false);
      setHintRevealed(false);
      setFeedbackMessage(null);
      setIsProcessing(false);
      roundStartTimeRef.current = Date.now();

      // Trigger smooth transition animation
      fadeAnim.setValue(0);
      bounceAnim.setValue(0.95);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(bounceAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
      ]).start();

      // Record round_started event
      if (sessionIdRef.current) {
        try {
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "plan_and_do",
            eventType: "round_started",
            metadata: {
              round: roundNum,
              scenario: sc.titleEn,
              totalSteps: sc.totalSteps,
              availableActions: sc.expectedSteps.map((s) => s.textEn),
              expectedOrder: sc.expectedSteps.map((s) => s.textEn),
            },
          });
        } catch {
          // Non-blocking
        }
      }

      // Voice prompt: gentle narration of the scenario goal
      try {
        const promptToSpeak =
          currentLang === "as"
            ? `${sc.titleAs}। ${sc.goalPromptAs}`
            : currentLang === "hi"
            ? `${sc.titleHi}। ${sc.goalPromptHi}`
            : `${sc.titleEn}. ${sc.goalPromptEn}`;
        VoiceAssistant.speak(promptToSpeak, currentLang);
      } catch {
        // Optional voice
      }
    },
    [currentLang, fadeAnim, bounceAnim]
  );

  // ── 2. Initialize Game Session on Mount ─────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    gameStartTimeRef.current = Date.now();

    const init = async () => {
      try {
        const session = await gameSessionService.startSession({
          gameId: "plan_and_do",
          metadata: {
            gameTitle: "Plan & Do",
            totalRounds: TOTAL_ROUNDS,
            mode: "executive_planning_sequencing",
          },
        });
        if (isMounted && session) {
          sessionIdRef.current = session.sessionId;
        }
      } catch (err) {
        console.warn("[PlanAndDo] Failed to start game session:", err);
      }
      if (isMounted) {
        setupRound(1);
      }
    };

    init();

    return () => {
      isMounted = false;
      VoiceAssistant.stop();
      // Early exit abandonment
      if (!isCompletedRef.current && !isAbandonedRef.current && sessionIdRef.current) {
        isAbandonedRef.current = true;
        gameSessionService
          .abandonSession(sessionIdRef.current, { reason: "patient_navigated_away" })
          .catch(() => {});
      }
    };
  }, [setupRound]);

  // ── 3. Hint / Assist Handler ───────────────────────────────────────────────
  const handleUseHint = async () => {
    if (isProcessing || isCompleted) return;
    setHintUsedInRound(true);
    setHintRevealed(true);

    if (sessionIdRef.current) {
      try {
        await gameSessionService.recordEvent({
          sessionId: sessionIdRef.current,
          gameId: "plan_and_do",
          eventType: "hint_used",
          metadata: {
            round,
            scenario: currentScenario.titleEn,
          },
        });
      } catch {
        // Non-blocking
      }
    }

    try {
      VoiceAssistant.speak(getClueText(currentScenario), currentLang);
    } catch {
      // Optional voice
    }
  };

  // ── 4. Action Step Selection & Sequential Evaluation ───────────────────────
  const handleSelectStep = async (step: PlanActionStep) => {
    // If already tapped or processing, ignore
    if (isProcessing || isCompleted) return;
    if (orderedSteps.some((s) => s.id === step.id)) return;

    setIsProcessing(true);
    const expectedNextStepNumber = orderedSteps.length + 1;
    const isCorrect = step.stepNumber === expectedNextStepNumber;
    const responseTimeMs = Date.now() - roundStartTimeRef.current;

    // Record answer_submitted event
    if (sessionIdRef.current) {
      try {
        await gameSessionService.recordEvent({
          sessionId: sessionIdRef.current,
          gameId: "plan_and_do",
          eventType: "answer_submitted",
          metadata: {
            round,
            scenario: currentScenario.titleEn,
            selectedStep: step.textEn,
            expectedStepNumber: expectedNextStepNumber,
            actualStepNumber: step.stepNumber,
            isCorrect,
            attempts,
            responseTimeMs,
          },
        });
      } catch {
        // Non-blocking
      }
    }

    if (isCorrect) {
      // ── CORRECT STEP IN SEQUENCE ───────────────────────────────────────────
      const updatedOrdered = [...orderedSteps, step];
      setOrderedSteps(updatedOrdered);
      setFailedStepId(null);
      setIsCorrectFeedback(true);

      const isScenarioFullyOrdered = updatedOrdered.length === currentScenario.totalSteps;

      if (isScenarioFullyOrdered) {
        // Round Completed!
        const pointsEarned = hintUsedInRound
          ? BASE_POINTS_PER_ROUND - HINT_PENALTY_POINTS
          : BASE_POINTS_PER_ROUND;
        const nextTotalScore = totalScore + pointsEarned;
        setRoundScore(pointsEarned);
        setTotalScore(nextTotalScore);

        setFeedbackMessage(
          currentLang === "as"
            ? "সুন্দৰ পৰিকল্পনা! সকলো কাৰ্য্য সঠিক ক্ৰমত সম্পূৰ্ণ হ'ল 🌟"
            : currentLang === "hi"
            ? "उत्कृष्ट योजना! सभी कार्य सही क्रम में पूरे हुए 🌟"
            : "Wonderful plan! Every step perfectly organized 🌟"
        );

        if (sessionIdRef.current) {
          try {
            await gameSessionService.recordEvent({
              sessionId: sessionIdRef.current,
              gameId: "plan_and_do",
              eventType: "answer_correct",
              metadata: {
                round,
                scenario: currentScenario.titleEn,
                pointsEarned,
                attempts,
                responseTimeMs,
              },
            });
            await gameSessionService.recordEvent({
              sessionId: sessionIdRef.current,
              gameId: "plan_and_do",
              eventType: "round_completed",
              metadata: {
                round,
                scenario: currentScenario.titleEn,
                totalScore: nextTotalScore,
              },
            });
          } catch {
            // Non-blocking
          }
        }

        if (round >= TOTAL_ROUNDS) {
          setTimeout(() => {
            completeGame(nextTotalScore);
          }, 1500);
        } else {
          setTimeout(() => {
            setupRound(round + 1);
          }, 1500);
        }
      } else {
        // Step succeeded, advance to next step in current scenario
        setFeedbackMessage(
          currentLang === "as"
            ? `শুদ্ধ! পদক্ষেপ #${expectedNextStepNumber} যোগ কৰা হ'ল`
            : currentLang === "hi"
            ? `सही! चरण #${expectedNextStepNumber} जोड़ा गया`
            : `Great! Step #${expectedNextStepNumber} added`
        );

        setTimeout(() => {
          setFeedbackMessage(null);
          setIsProcessing(false);
        }, 600);
      }
    } else {
      // ── INCORRECT STEP (Gentle retry, elderly-friendly) ────────────────────
      setIsCorrectFeedback(false);
      setFailedStepId(step.id);
      totalMistakesRef.current += 1;
      setAttempts((prev) => prev + 1);

      setFeedbackMessage(
        currentLang === "as"
          ? "অলপ ভাবি চাওক! ইয়াৰ আগতে আন এটা কাম কৰিব লাগিব 🌿"
          : currentLang === "hi"
          ? "थोड़ा सोचें! इससे पहले एक और कदम बाकी है 🌿"
          : "Let's think about that step again 🌿"
      );

      if (sessionIdRef.current) {
        try {
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "plan_and_do",
            eventType: "answer_incorrect",
            metadata: {
              round,
              scenario: currentScenario.titleEn,
              selectedStep: step.textEn,
              expectedStepNumber: expectedNextStepNumber,
              attempts,
              responseTimeMs,
            },
          });
        } catch {
          // Non-blocking
        }
      }

      // Allow retry after gentle glow
      setTimeout(() => {
        setFailedStepId(null);
        setFeedbackMessage(null);
        setIsProcessing(false);
      }, 1200);
    }
  };

  // ── 5. Complete Game & Full Persistence Pipeline ───────────────────────────
  const completeGame = async (finalScore: number) => {
    isCompletedRef.current = true;
    setIsCompleted(true);
    setIsProcessing(false);

    const durationSeconds = Math.max(
      1,
      Math.round((Date.now() - gameStartTimeRef.current) / 1000)
    );
    const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
    const totalAttempts = TOTAL_ROUNDS + totalMistakesRef.current;
    const accuracyPercent = Math.min(
      100,
      Math.max(50, Math.round((TOTAL_ROUNDS / totalAttempts) * 100))
    );

    // 1. Complete Session in GameSessionService
    if (sessionIdRef.current) {
      try {
        await gameSessionService.completeSession(sessionIdRef.current, finalScore, {
          totalRounds: TOTAL_ROUNDS,
          durationSeconds,
          accuracyPercent,
          totalMistakes: totalMistakesRef.current,
        });
      } catch (err) {
        console.warn("[PlanAndDo] Complete session API warning:", err);
      }
    }

    // 2. Persist to Caregiver Dashboard Storage
    try {
      const caregiverSession: CognitiveGameSession = {
        id: `sess-plan-${Date.now()}`,
        gameName: "Plan & Do (Executive Sequencing)",
        iconEmoji: "📋",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        durationMinutes,
        score: finalScore,
        accuracyPercent,
        mistakes: totalMistakesRef.current,
        responseTime: "Comfortable planning pace",
        difficulty: "4 → 5 Step Everyday Scenarios",
        difficultyChangeReason: "Progressed through practical executive planning scenarios.",
        completed: true,
        humanSummary: `Completed all 5 daily planning scenarios (Park, Tea, Breakfast, Bedtime, Doctor Visit) with ${accuracyPercent}% accuracy.`,
      };
      await caregiverStorage.recordGameSession(caregiverSession);
    } catch (err) {
      console.warn("[PlanAndDo] Caregiver storage save error:", err);
    }

    // 3. Persist to Virtual Companion Context Pipeline
    try {
      await companionContextService.recordRawGameEvent({
        gameId: "plan_and_do",
        eventType: "game_completed",
        payload: {
          gameName: "Plan & Do",
          score: finalScore,
          durationSeconds,
          accuracyPercent,
          completed: true,
          difficulty: "Executive Action Planning",
          metadata: {
            totalRounds: TOTAL_ROUNDS,
            totalMistakes: totalMistakesRef.current,
            scenariosCompleted: SCENARIOS.map((s) => s.titleEn),
          },
        },
      });
    } catch (err) {
      console.warn("[PlanAndDo] Companion context save error:", err);
    }

    // Voice completion celebration
    try {
      const celebration =
        currentLang === "as"
          ? "অসাধাৰণ! আপুনি সকলো দৈনন্দিন কাৰ্য্যৰ সুন্দৰ পৰিকল্পনা কৰিলে।"
          : currentLang === "hi"
          ? "अद्भुत! आपने सभी दैनिक कार्यों की बहुत सुंदर योजना बनाई।"
          : "Splendid! You organized all everyday action plans wonderfully.";
      VoiceAssistant.speak(celebration, currentLang);
    } catch {
      // Optional voice
    }
  };

  // ── Render: Game Complete Screen ───────────────────────────────────────────
  if (isCompleted) {
    const durationSeconds = Math.max(
      1,
      Math.round((Date.now() - gameStartTimeRef.current) / 1000)
    );
    const durationMinutes = Math.floor(durationSeconds / 60);
    const remainingSeconds = durationSeconds % 60;
    const timeDisplay =
      durationMinutes > 0
        ? `${durationMinutes}m ${remainingSeconds}s`
        : `${remainingSeconds}s`;

    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.completionScroll}>
          <View style={styles.completionCard}>
            <View style={styles.completionIconCircle}>
              <Text style={styles.completionEmoji}>📋</Text>
            </View>

            <View style={styles.completionTag}>
              <Feather name="check-circle" size={14} color="#059669" />
              <Text style={styles.completionTagText}>PLANNING MASTERED</Text>
            </View>

            <Text style={styles.completionTitle}>
              {currentLang === "as"
                ? "সুন্দৰ কাৰ্য্য পৰিকল্পনা!"
                : currentLang === "hi"
                ? "शानदार कार्य योजना!"
                : "Wonderful Action Planning!"}
            </Text>

            <Text style={styles.completionSubtitle}>
              {currentLang === "as"
                ? "আপুনি দৈনন্দিন কামসমূহ সঠিক ক্ৰমত আৰু শৃংখলাবদ্ধভাৱে সজাই তুলিলে।"
                : currentLang === "hi"
                ? "आपने रोज़मर्रा के कार्यों को सही क्रम में बहुत अच्छे से व्यवस्थित किया।"
                : "You organized every everyday life scenario with clear, calm sequencing."}
            </Text>

            {/* Score & Telemetry Cards */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>GAME SCORE</Text>
                <Text style={styles.statValue}>{totalScore}</Text>
                <Text style={styles.statSub}>Max 500</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statLabel}>SCENARIOS</Text>
                <Text style={styles.statValue}>{TOTAL_ROUNDS} / {TOTAL_ROUNDS}</Text>
                <Text style={styles.statSub}>Completed</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statLabel}>TIME TAKEN</Text>
                <Text style={styles.statValue}>{timeDisplay}</Text>
                <Text style={styles.statSub}>Paced</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statLabel}>RETRIES</Text>
                <Text style={styles.statValue}>{totalMistakesRef.current}</Text>
                <Text style={styles.statSub}>Gentle Steps</Text>
              </View>
            </View>

            {/* Caregiver & Companion Sync Status */}
            <View style={styles.syncNotice}>
              <Feather name="shield" size={15} color="#2563EB" />
              <Text style={styles.syncNoticeText}>
                {currentLang === "as"
                  ? "ফলাফল তত্বাৱধায়ক ডেচব'ৰ্ডত সুৰক্ষিতভাৱে সংৰক্ষণ কৰা হ'ল"
                  : currentLang === "hi"
                  ? "परिणाम देखभालकर्ता डैशबोर्ड में सुरक्षित सहेजा गया"
                  : "Saved to Caregiver Dashboard & Companion Memory"}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => {
                  isCompletedRef.current = false;
                  setIsCompleted(false);
                  setTotalScore(0);
                  totalMistakesRef.current = 0;
                  setupRound(1);
                }}
                activeOpacity={0.85}
              >
                <Feather name="rotate-ccw" size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>
                  {currentLang === "as"
                    ? "আকৌ খেলক"
                    : currentLang === "hi"
                    ? "फिर से खेलें"
                    : "Play Again"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.replace("/(patient)/games" as any)}
                activeOpacity={0.8}
              >
                <Feather name="arrow-left" size={18} color="#475569" />
                <Text style={styles.secondaryButtonText}>
                  {currentLang === "as"
                    ? "খেলসমূহলৈ উভতি যাওক"
                    : currentLang === "hi"
                    ? "खेलों पर वापस जाएं"
                    : "Back to Games"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Render: Active Gameplay Screen ─────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/(patient)/games" as any)}
          activeOpacity={0.7}
        >
          <Feather name="chevron-left" size={26} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.navTitleContainer}>
          <Text style={styles.navTitle}>
            {currentLang === "as"
              ? "কাৰ্য্য পৰিকল্পনা"
              : currentLang === "hi"
              ? "कार्य योजना"
              : "Plan & Do"}
          </Text>
          <Text style={styles.navSubtitle}>
            {currentLang === "as"
              ? `পৰ্যায় ${round} / ${TOTAL_ROUNDS} · (${currentScenario.totalSteps} টা পদক্ষেপ)`
              : currentLang === "hi"
              ? `परिदृश्य ${round} / ${TOTAL_ROUNDS} · (${currentScenario.totalSteps} चरण)`
              : `Scenario ${round} of ${TOTAL_ROUNDS} · (${currentScenario.totalSteps} Steps)`}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.hintButton, hintUsedInRound && styles.hintButtonUsed]}
          onPress={handleUseHint}
          activeOpacity={0.7}
          disabled={hintUsedInRound || isProcessing}
        >
          <MaterialCommunityIcons
            name="lightbulb-outline"
            size={22}
            color={hintUsedInRound ? "#94A3B8" : "#D97706"}
          />
        </TouchableOpacity>
      </View>

      {/* Progress Dots Bar */}
      <View style={styles.progressContainer}>
        {Array.from({ length: TOTAL_ROUNDS }).map((_, index) => {
          const stepNum = index + 1;
          const isDone = stepNum < round;
          const isCurrent = stepNum === round;
          return (
            <View
              key={`dot-${index}`}
              style={[
                styles.progressDot,
                isDone && styles.progressDotDone,
                isCurrent && styles.progressDotCurrent,
              ]}
            />
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.gameplayScroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ scale: bounceAnim }],
            width: "100%",
          }}
        >
          {/* Goal Header Card */}
          <View style={styles.scenarioCard}>
            <View
              style={[
                styles.scenarioIconPill,
                { backgroundColor: currentScenario.themeBg },
              ]}
            >
              <Text style={styles.scenarioEmojiText}>
                {currentScenario.scenarioEmoji}
              </Text>
            </View>

            <View style={styles.goalTagBadge}>
              <Text style={styles.goalTagText}>WHAT ARE YOU PLANNING TO DO?</Text>
            </View>

            <Text style={styles.scenarioTitleText}>
              {getScenarioTitle(currentScenario)}
            </Text>

            <Text style={styles.scenarioGoalText}>
              "{getGoalPrompt(currentScenario)}"
            </Text>
          </View>

          {/* Planned Steps Progress Breadcrumbs Bar */}
          <View style={styles.plannedStepsContainer}>
            <View style={styles.plannedHeaderRow}>
              <Feather name="list" size={14} color="#475569" />
              <Text style={styles.plannedHeaderText}>
                {currentLang === "as"
                  ? `পৰিকল্পিত পদক্ষেপ: ${orderedSteps.length} / ${currentScenario.totalSteps}`
                  : currentLang === "hi"
                  ? `नियोजित चरण: ${orderedSteps.length} / ${currentScenario.totalSteps}`
                  : `Your Action Plan: ${orderedSteps.length} / ${currentScenario.totalSteps}`}
              </Text>
            </View>

            {orderedSteps.length === 0 ? (
              <View style={styles.emptyPlanBox}>
                <Text style={styles.emptyPlanText}>
                  {currentLang === "as"
                    ? "তলৰ পৰা প্ৰথম পদক্ষেপটো স্পৰ্শ কৰক 👇"
                    : currentLang === "hi"
                    ? "नीचे से पहला कदम चुनें 👇"
                    : "Tap the very first action step below 👇"}
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.planChipsRow}
              >
                {orderedSteps.map((s, idx) => (
                  <View key={`ordered-${s.id}`} style={styles.planChip}>
                    <View style={styles.chipRankCircle}>
                      <Text style={styles.chipRankText}>#{idx + 1}</Text>
                    </View>
                    <Text style={styles.chipEmoji}>{s.emoji}</Text>
                    <Text style={styles.chipLabel} numberOfLines={1}>
                      {getStepText(s)}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Hint Card if Revealed */}
          {hintRevealed && (
            <View style={styles.revealedHintCard}>
              <MaterialCommunityIcons name="lightbulb-on" size={20} color="#D97706" />
              <Text style={styles.revealedHintText}>
                {getClueText(currentScenario)}
              </Text>
            </View>
          )}

          {/* Feedback Message Banner */}
          {feedbackMessage && (
            <View
              style={[
                styles.feedbackBanner,
                isCorrectFeedback
                  ? styles.feedbackBannerCorrect
                  : styles.feedbackBannerIncorrect,
              ]}
            >
              <Feather
                name={isCorrectFeedback ? "check-circle" : "info"}
                size={18}
                color={isCorrectFeedback ? "#15803D" : "#B45309"}
              />
              <Text
                style={[
                  styles.feedbackBannerText,
                  isCorrectFeedback
                    ? styles.feedbackTextCorrect
                    : styles.feedbackTextIncorrect,
                ]}
              >
                {feedbackMessage}
              </Text>
            </View>
          )}

          {/* Available Action Cards (Shuffled) */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderText}>
              {currentLang === "as"
                ? "পৰৱৰ্তী পদক্ষেপটো বাছক"
                : currentLang === "hi"
                ? "अगला उचित कदम चुनें"
                : "Choose the next logical action"}
            </Text>
          </View>

          <View style={styles.actionStepsList}>
            {shuffledSteps.map((step) => {
              const isLocked = orderedSteps.some((s) => s.id === step.id);
              const isFailed = failedStepId === step.id;
              const stepIndexInOrder = orderedSteps.findIndex(
                (s) => s.id === step.id
              );

              return (
                <TouchableOpacity
                  key={step.id}
                  style={[
                    styles.actionCard,
                    isLocked && styles.actionCardLocked,
                    isFailed && styles.actionCardFailed,
                  ]}
                  onPress={() => handleSelectStep(step)}
                  activeOpacity={0.8}
                  disabled={isLocked || isProcessing}
                >
                  {/* Left Step Rank or Emoji */}
                  <View
                    style={[
                      styles.actionEmojiPill,
                      isLocked && styles.actionEmojiPillLocked,
                      isFailed && styles.actionEmojiPillFailed,
                    ]}
                  >
                    {isLocked ? (
                      <Text style={styles.lockedRankBadge}>
                        #{stepIndexInOrder + 1}
                      </Text>
                    ) : (
                      <Text style={styles.actionEmoji}>{step.emoji}</Text>
                    )}
                  </View>

                  {/* Text Label */}
                  <Text
                    style={[
                      styles.actionLabel,
                      isLocked && styles.actionLabelLocked,
                    ]}
                  >
                    {getStepText(step)}
                  </Text>

                  {/* Right Status Icon */}
                  <View style={styles.actionStatusIcon}>
                    {isLocked ? (
                      <Feather name="check-circle" size={22} color="#15803D" />
                    ) : isFailed ? (
                      <Feather name="refresh-cw" size={20} color="#B45309" />
                    ) : (
                      <Feather name="arrow-right-circle" size={20} color="#CBD5E1" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Footer Bar */}
      <View style={styles.footerBar}>
        <View style={styles.scorePill}>
          <Text style={styles.scorePillLabel}>GAME SCORE</Text>
          <Text style={styles.scorePillValue}>{totalScore}</Text>
        </View>

        <View style={styles.footerPrompt}>
          <Feather name="check-square" size={14} color="#64748B" />
          <Text style={styles.footerPromptText}>
            {currentLang === "as"
              ? "ধাপে ধাপে দৈনন্দিন পৰিকল্পনা"
              : currentLang === "hi"
              ? "दैनिक कार्यों का व्यवस्थित क्रम"
              : "Executive sequencing practice"}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ── Stylesheet ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  navTitleContainer: {
    alignItems: "center",
  },
  navTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  navSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 1,
  },
  hintButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  hintButtonUsed: {
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    gap: 8,
    backgroundColor: "#FFFFFF",
  },
  progressDot: {
    width: 14,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
  },
  progressDotDone: {
    backgroundColor: "#10B981",
    width: 22,
  },
  progressDotCurrent: {
    backgroundColor: "#2563EB",
    width: 30,
  },
  gameplayScroll: {
    padding: Spacing.lg,
    alignItems: "center",
    paddingBottom: 40,
  },
  scenarioCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    ...Shadows.md,
    marginBottom: Spacing.md,
  },
  scenarioIconPill: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  scenarioEmojiText: {
    fontSize: 36,
  },
  goalTagBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: Spacing.sm,
  },
  goalTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.8,
  },
  scenarioTitleText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 6,
    lineHeight: 28,
  },
  scenarioGoalText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 20,
  },
  plannedStepsContainer: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  plannedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  plannedHeaderText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyPlanBox: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  emptyPlanText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  planChipsRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  planChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
    maxWidth: 190,
  },
  chipRankCircle: {
    backgroundColor: "#166534",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  chipRankText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  chipEmoji: {
    fontSize: 15,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
  },
  revealedHintCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: 10,
    width: "100%",
  },
  revealedHintText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
    lineHeight: 20,
  },
  feedbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    width: "100%",
    gap: 8,
  },
  feedbackBannerCorrect: {
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  feedbackBannerIncorrect: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  feedbackBannerText: {
    fontSize: 15,
    fontWeight: "800",
  },
  feedbackTextCorrect: {
    color: "#166534",
  },
  feedbackTextIncorrect: {
    color: "#92400E",
  },
  sectionHeaderRow: {
    width: "100%",
    marginBottom: Spacing.sm,
    paddingHorizontal: 4,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  actionStepsList: {
    width: "100%",
    gap: Spacing.sm,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    minHeight: 64,
    ...Shadows.sm,
  },
  actionCardLocked: {
    backgroundColor: "#F0FDF4",
    borderColor: "#22C55E",
  },
  actionCardFailed: {
    backgroundColor: "#FFFBEB",
    borderColor: "#F59E0B",
  },
  actionEmojiPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  actionEmojiPillLocked: {
    backgroundColor: "#166534",
  },
  actionEmojiPillFailed: {
    backgroundColor: "#FEF3C7",
  },
  lockedRankBadge: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  actionEmoji: {
    fontSize: 22,
  },
  actionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    lineHeight: 22,
  },
  actionLabelLocked: {
    color: "#166534",
    fontWeight: "900",
  },
  actionStatusIcon: {
    marginLeft: 8,
  },
  footerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  scorePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
  },
  scorePillLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1D4ED8",
  },
  scorePillValue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1E40AF",
  },
  footerPrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerPromptText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  completionScroll: {
    padding: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  completionCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    ...Shadows.md,
  },
  completionIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  completionEmoji: {
    fontSize: 42,
  },
  completionTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
    marginBottom: Spacing.sm,
  },
  completionTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#059669",
    letterSpacing: 0.5,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 6,
  },
  completionSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statBox: {
    width: "47%",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
    marginVertical: 2,
  },
  statSub: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
  },
  syncNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    gap: 8,
    width: "100%",
    marginBottom: Spacing.xl,
  },
  syncNoticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#1E40AF",
  },
  actionButtons: {
    width: "100%",
    gap: Spacing.sm,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: BorderRadius.xl,
    gap: 8,
    ...Shadows.sm,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 14,
    borderRadius: BorderRadius.xl,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#475569",
  },
});
