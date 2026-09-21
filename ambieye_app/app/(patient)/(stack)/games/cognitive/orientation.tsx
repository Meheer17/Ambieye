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
export type OrientationQuestionType =
  | "day_of_week"
  | "month_of_year"
  | "time_of_day"
  | "season_period"
  | "place_orientation";

export interface OrientationChoice {
  id: string;
  nameEn: string;
  nameAs: string;
  nameHi: string;
  emoji: string;
  isCorrect: boolean;
}

export interface OrientationQuestion {
  id: string;
  roundNumber: number;
  questionType: OrientationQuestionType;
  titleEn: string;
  titleAs: string;
  titleHi: string;
  subtitleEn: string;
  subtitleAs: string;
  subtitleHi: string;
  iconName: string;
  iconColor: string;
  iconBg: string;
  clueEn: string;
  clueAs: string;
  clueHi: string;
  choices: OrientationChoice[];
}

export const TOTAL_ROUNDS = 5;
export const BASE_POINTS_PER_ROUND = 100;
export const HINT_PENALTY_POINTS = 10;

// ── Static Dictionary Data for Live Date/Time Mapping ─────────────────────────

const DAYS_DATA = [
  { id: "day_sun", nameEn: "Sunday", nameAs: "দেওবাৰ", nameHi: "रविवार", emoji: "☀️" },
  { id: "day_mon", nameEn: "Monday", nameAs: "সোমবাৰ", nameHi: "सोमवार", emoji: "🌱" },
  { id: "day_tue", nameEn: "Tuesday", nameAs: "মঙ্গলবাৰ", nameHi: "मंगलवार", emoji: "🌺" },
  { id: "day_wed", nameEn: "Wednesday", nameAs: "বুধবাৰ", nameHi: "बुधवार", emoji: "🌿" },
  { id: "day_thu", nameEn: "Thursday", nameAs: "বৃহস্পতিবাৰ", nameHi: "गुरुवार", emoji: "🌼" },
  { id: "day_fri", nameEn: "Friday", nameAs: "শুক্ৰবাৰ", nameHi: "शुक्रवार", emoji: "🍃" },
  { id: "day_sat", nameEn: "Saturday", nameAs: "শনিবাৰ", nameHi: "शनिवार", emoji: "🌾" },
];

const MONTHS_DATA = [
  { id: "m_jan", nameEn: "January", nameAs: "জানুৱাৰী", nameHi: "जनवरी", emoji: "❄️" },
  { id: "m_feb", nameEn: "February", nameAs: "ফেব্ৰুৱাৰী", nameHi: "फरवरी", emoji: "🌸" },
  { id: "m_mar", nameEn: "March", nameAs: "মাৰ্চ", nameHi: "मार्च", emoji: "🌻" },
  { id: "m_apr", nameEn: "April", nameAs: "এপ্ৰিল", nameHi: "अप्रैल", emoji: "🌾" },
  { id: "m_may", nameEn: "May", nameAs: "মে'", nameHi: "मई", emoji: "☀️" },
  { id: "m_jun", nameEn: "June", nameAs: "জুন", nameHi: "जून", emoji: "🌦️" },
  { id: "m_jul", nameEn: "July", nameAs: "জুলাই", nameHi: "जुलाई", emoji: "🌧️" },
  { id: "m_aug", nameEn: "August", nameAs: "আগষ্ট", nameHi: "अगस्त", emoji: "🌈" },
  { id: "m_sep", nameEn: "September", nameAs: "ছেপ্তেম্বৰ", nameHi: "सितंबर", emoji: "🍂" },
  { id: "m_oct", nameEn: "October", nameAs: "অক্টোবৰ", nameHi: "अक्टूबर", emoji: "🪔" },
  { id: "m_nov", nameEn: "November", nameAs: "নৱেম্বৰ", nameHi: "नवंबर", emoji: "🌾" },
  { id: "m_dec", nameEn: "December", nameAs: "ডিচেম্বৰ", nameHi: "दिसंबर", emoji: "❄️" },
];

// ── Dynamic Question Builder (Uses Real Device Date & Time) ───────────────────

export function generateOrientationQuestions(now: Date = new Date()): OrientationQuestion[] {
  // 1. Day of Week
  const dayIndex = now.getDay(); // 0 = Sunday .. 6 = Saturday
  const correctDay = DAYS_DATA[dayIndex];
  // Select 3 distractors from other days
  const otherDays = DAYS_DATA.filter((_, i) => i !== dayIndex);
  const shuffledOtherDays = [...otherDays].sort(() => 0.5 - Math.random());
  const dayDistractors = shuffledOtherDays.slice(0, 3);
  const dayChoices: OrientationChoice[] = [
    { ...correctDay, isCorrect: true },
    ...dayDistractors.map((d) => ({ ...d, isCorrect: false })),
  ].sort(() => 0.5 - Math.random());

  const q1: OrientationQuestion = {
    id: "q_day_of_week",
    roundNumber: 1,
    questionType: "day_of_week",
    titleEn: "What day is today?",
    titleAs: "আজি কি বাৰ?",
    titleHi: "आज कौन सा दिन है?",
    subtitleEn: "Look at the gentle calendar day today",
    subtitleAs: "আজিৰ পঞ্জিকাৰ দিনটো লক্ষ্য কৰক",
    subtitleHi: "आज के दिन पर ध्यान दें",
    iconName: "calendar",
    iconColor: "#2563EB",
    iconBg: "#EFF6FF",
    clueEn: `Today is ${correctDay.nameEn}. Look for the ${correctDay.emoji} card.`,
    clueAs: `আজি ${correctDay.nameAs}। ${correctDay.emoji} কাৰ্ডখন চাওক।`,
    clueHi: `आज ${correctDay.nameHi} है। ${correctDay.emoji} कार्ड देखें।`,
    choices: dayChoices,
  };

  // 2. Month of Year
  const monthIndex = now.getMonth(); // 0 = Jan .. 11 = Dec
  const correctMonth = MONTHS_DATA[monthIndex];
  const otherMonths = MONTHS_DATA.filter((_, i) => i !== monthIndex);
  const shuffledOtherMonths = [...otherMonths].sort(() => 0.5 - Math.random());
  const monthDistractors = shuffledOtherMonths.slice(0, 3);
  const monthChoices: OrientationChoice[] = [
    { ...correctMonth, isCorrect: true },
    ...monthDistractors.map((m) => ({ ...m, isCorrect: false })),
  ].sort(() => 0.5 - Math.random());

  const q2: OrientationQuestion = {
    id: "q_month_of_year",
    roundNumber: 2,
    questionType: "month_of_year",
    titleEn: "What month are we in?",
    titleAs: "এইটো কি মাহ?",
    titleHi: "यह कौन सा महीना है?",
    subtitleEn: "Think of the current month of the year",
    subtitleAs: "বছৰটোৰ চলিত মাহটো মনত পেলাওক",
    subtitleHi: "वर्ष के वर्तमान महीने के बारे में सोचें",
    iconName: "calendar-month",
    iconColor: "#7C3AED",
    iconBg: "#FAF5FF",
    clueEn: `We are in the month of ${correctMonth.nameEn}.`,
    clueAs: `বৰ্তমান ${correctMonth.nameAs} মাহ চলি আছে।`,
    clueHi: `अभी ${correctMonth.nameHi} का महीना चल रहा है।`,
    choices: monthChoices,
  };

  // 3. Time of Day (Morning, Afternoon, Evening, Night)
  const hour = now.getHours();
  let timeOfDayKey: "morning" | "afternoon" | "evening" | "night" = "morning";
  if (hour >= 5 && hour < 12) timeOfDayKey = "morning";
  else if (hour >= 12 && hour < 17) timeOfDayKey = "afternoon";
  else if (hour >= 17 && hour < 21) timeOfDayKey = "evening";
  else timeOfDayKey = "night";

  const timeChoices: OrientationChoice[] = [
    {
      id: "tod_morning",
      nameEn: "Morning (Sunrise)",
      nameAs: "পুৱা (সূৰ্যোদয়)",
      nameHi: "सुबह (प्रभात)",
      emoji: "🌅",
      isCorrect: timeOfDayKey === "morning",
    },
    {
      id: "tod_afternoon",
      nameEn: "Afternoon (Bright Day)",
      nameAs: "দুপৰীয়া (উজ্জ্বল দিন)",
      nameHi: "दोपहर (दिन का समय)",
      emoji: "☀️",
      isCorrect: timeOfDayKey === "afternoon",
    },
    {
      id: "tod_evening",
      nameEn: "Evening (Twilight)",
      nameAs: "গধূলি (সন্ধ্যা সময়)",
      nameHi: "शाम (संध्या काल)",
      emoji: "🌇",
      isCorrect: timeOfDayKey === "evening",
    },
    {
      id: "tod_night",
      nameEn: "Night (Peaceful Stars)",
      nameAs: "ৰাতি (শান্ত তৰা)",
      nameHi: "रात (शांत रात्रि)",
      emoji: "🌙",
      isCorrect: timeOfDayKey === "night",
    },
  ];

  const timeLabels = {
    morning: { en: "Morning", as: "পুৱা", hi: "सुबह" },
    afternoon: { en: "Afternoon", as: "দুপৰীয়া", hi: "दोपहर" },
    evening: { en: "Evening", as: "গধূলি", hi: "शाम" },
    night: { en: "Night", as: "ৰাতি", hi: "रात" },
  };

  const q3: OrientationQuestion = {
    id: "q_time_of_day",
    roundNumber: 3,
    questionType: "time_of_day",
    titleEn: "Is it morning, afternoon, evening, or night?",
    titleAs: "এতিয়া দিনৰ কি সময়?",
    titleHi: "अभी कौन सा समय है?",
    subtitleEn: "Notice the sunlight and ambient brightness around you",
    subtitleAs: "আপোনাৰ চাৰিওফালৰ পোহৰ আৰু সময় অনুভৱ কৰক",
    subtitleHi: "आस-पास के उजाले और समय को महसूस करें",
    iconName: "clock-outline",
    iconColor: "#D97706",
    iconBg: "#FFFBEB",
    clueEn: `Right now, the natural time is ${timeLabels[timeOfDayKey].en}.`,
    clueAs: `এতিয়া সময় হৈছে ${timeLabels[timeOfDayKey].as}।`,
    clueHi: `अभी का समय ${timeLabels[timeOfDayKey].hi} है।`,
    choices: timeChoices,
  };

  // 4. Season / Climate Period
  // Based on Indian/Assam regional seasonal calendar:
  // Mar-Apr (months 2-3): Spring (Basanta)
  // May-Aug (months 4-7): Summer & Monsoon (Garsha/Barsha)
  // Sep-Nov (months 8-10): Autumn & Festive (Sarat/Hemanta)
  // Dec-Feb (months 11, 0, 1): Winter (Sheet)
  let seasonKey: "spring" | "summer_monsoon" | "autumn" | "winter" = "autumn";
  if (monthIndex >= 2 && monthIndex <= 3) seasonKey = "spring";
  else if (monthIndex >= 4 && monthIndex <= 7) seasonKey = "summer_monsoon";
  else if (monthIndex >= 8 && monthIndex <= 10) seasonKey = "autumn";
  else seasonKey = "winter";

  const seasonChoices: OrientationChoice[] = [
    {
      id: "sea_spring",
      nameEn: "Spring (Pleasant Blooms)",
      nameAs: "বসন্ত কাল (ফুল ফুলা সময়)",
      nameHi: "वसंत ऋतु (सुहावना मौसम)",
      emoji: "🌸",
      isCorrect: seasonKey === "spring",
    },
    {
      id: "sea_summer_monsoon",
      nameEn: "Summer & Monsoon (Rainy / Warm)",
      nameAs: "গ্ৰীষ্ম আৰু বৰ্ষা (বৰষুণৰ সময়)",
      nameHi: "ग्रीष्म एवं वर्षा ऋतु (बारिश का समय)",
      emoji: "🌦️",
      isCorrect: seasonKey === "summer_monsoon",
    },
    {
      id: "sea_autumn",
      nameEn: "Autumn & Festive Season",
      nameAs: "শৰৎ কাল (মৃদু বতাহ আৰু উৎসৱ)",
      nameHi: "शरद ऋतु (हल्की ठंड एवं त्यौहार)",
      emoji: "🍂",
      isCorrect: seasonKey === "autumn",
    },
    {
      id: "sea_winter",
      nameEn: "Winter (Cool & Refreshing)",
      nameAs: "শীত কাল (ঠাণ্ডাৰ সময়)",
      nameHi: "शीत ऋतु (सर्दी का मौसम)",
      emoji: "❄️",
      isCorrect: seasonKey === "winter",
    },
  ];

  const seasonNames = {
    spring: { en: "Spring", as: "বসন্ত কাল", hi: "वसंत ऋतु" },
    summer_monsoon: { en: "Summer & Monsoon", as: "গ্ৰীষ্ম আৰু বৰ্ষা কাল", hi: "ग्रीष्म व वर्षा ऋतु" },
    autumn: { en: "Autumn", as: "শৰৎ কাল", hi: "शरद ऋतु" },
    winter: { en: "Winter", as: "শীত কাল", hi: "शीत ऋतु" },
  };

  const q4: OrientationQuestion = {
    id: "q_season_period",
    roundNumber: 4,
    questionType: "season_period",
    titleEn: "What season is it right now?",
    titleAs: "বৰ্তমান কি ঋতু চলি আছে?",
    titleHi: "अभी कौन सा मौसम/ऋतु है?",
    subtitleEn: "Think of the weather and nature outside",
    subtitleAs: "বাহিৰৰ বতৰ আৰু প্ৰকৃতিৰ পৰিৱেশ অনুভৱ কৰক",
    subtitleHi: "बाहर के मौसम और प्रकृति को याद करें",
    iconName: "leaf",
    iconColor: "#059669",
    iconBg: "#F0FDF4",
    clueEn: `The current season is ${seasonNames[seasonKey].en}.`,
    clueAs: `বৰ্তমান ঋতু হৈছে ${seasonNames[seasonKey].as}।`,
    clueHi: `वर्तमान ऋतु ${seasonNames[seasonKey].hi} है।`,
    choices: seasonChoices,
  };

  // 5. Place Orientation (Where are you?)
  const placeChoices: OrientationChoice[] = [
    {
      id: "plc_home",
      nameEn: "At Home (Safe & Peaceful)",
      nameAs: "নিজৰ ঘৰত (সুৰক্ষিত আৰু শান্ত)",
      nameHi: "अपने घर पर (सुरक्षित व शांत)",
      emoji: "🏡",
      isCorrect: true,
    },
    {
      id: "plc_station",
      nameEn: "At a Railway Station",
      nameAs: "ৰে'ল ষ্টেচনত",
      nameHi: "रेलवे स्टेशन पर",
      emoji: "🚉",
      isCorrect: false,
    },
    {
      id: "plc_market",
      nameEn: "At a Crowded Market",
      nameAs: "বজাৰৰ মাজত",
      nameHi: "भीड़-भाड़ वाले बाजार में",
      emoji: "🛍️",
      isCorrect: false,
    },
    {
      id: "plc_airport",
      nameEn: "At an Airport Terminal",
      nameAs: "বিমান বন্দৰত",
      nameHi: "हवाई अड्डे पर",
      emoji: "✈️",
      isCorrect: false,
    },
  ].sort(() => 0.5 - Math.random());

  const q5: OrientationQuestion = {
    id: "q_place_orientation",
    roundNumber: 5,
    questionType: "place_orientation",
    titleEn: "Where are you right now?",
    titleAs: "আপুনি এতিয়া ক'ত আছে?",
    titleHi: "आप अभी कहाँ हैं?",
    subtitleEn: "Choose the peaceful familiar place where you are resting",
    subtitleAs: "আপুনি জিৰণি লৈ থকা মৰমৰ চিনাকি স্থানটো বাছক",
    subtitleHi: "उस सुरक्षित व परिचित स्थान को चुनें जहाँ आप विश्राम कर रहे हैं",
    iconName: "home-heart",
    iconColor: "#E11D48",
    iconBg: "#FFF1F2",
    clueEn: "You are safely resting at home with loved ones.",
    clueAs: "আপুনি নিজৰ মৰমৰ ঘৰত সুৰক্ষিতভাৱে আছে।",
    clueHi: "आप अपने प्रियजनों के साथ सुरक्षित घर पर हैं।",
    choices: placeChoices,
  };

  return [q1, q2, q3, q4, q5];
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function OrientationDailyAwarenessScreen() {
  const router = useRouter();
  const { t, currentLang } = useTranslation();

  // ── Questions Pool Generated with Real Date ────────────────────────────────
  const questionsRef = useRef<OrientationQuestion[]>(generateOrientationQuestions(new Date()));

  // ── Gameplay State ─────────────────────────────────────────────────────────
  const [round, setRound] = useState<number>(1);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [currentQuestion, setCurrentQuestion] = useState<OrientationQuestion>(
    questionsRef.current[0]
  );
  const [choices, setChoices] = useState<OrientationChoice[]>(
    questionsRef.current[0].choices
  );
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
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
  const getQuestionTitle = (q: OrientationQuestion) => {
    if (currentLang === "as") return q.titleAs;
    if (currentLang === "hi") return q.titleHi;
    return q.titleEn;
  };

  const getQuestionSubtitle = (q: OrientationQuestion) => {
    if (currentLang === "as") return q.subtitleAs;
    if (currentLang === "hi") return q.subtitleHi;
    return q.subtitleEn;
  };

  const getChoiceName = (c: OrientationChoice) => {
    if (currentLang === "as") return c.nameAs;
    if (currentLang === "hi") return c.nameHi;
    return c.nameEn;
  };

  const getClueText = (q: OrientationQuestion) => {
    if (currentLang === "as") return q.clueAs;
    if (currentLang === "hi") return q.clueHi;
    return q.clueEn;
  };

  // ── 1. Setup Round ─────────────────────────────────────────────────────────
  const setupRound = useCallback(
    async (roundNum: number) => {
      const q = questionsRef.current[roundNum - 1] || questionsRef.current[0];
      setRound(roundNum);
      setCurrentQuestion(q);
      setChoices(q.choices);
      setSelectedChoiceId(null);
      setAttempts(1);
      setHintUsedInRound(false);
      setHintRevealed(false);
      setFeedbackMessage(null);
      setIsProcessing(false);
      roundStartTimeRef.current = Date.now();

      // Smooth transition animation
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
            gameId: "orientation_daily_awareness",
            eventType: "round_started",
            metadata: {
              round: roundNum,
              questionType: q.questionType,
              question: q.titleEn,
              availableChoices: q.choices.map((c) => c.nameEn),
            },
          });
        } catch {
          // Non-blocking
        }
      }

      // Voice prompt: gentle narration of question
      try {
        const titleToSpeak =
          currentLang === "as"
            ? q.titleAs
            : currentLang === "hi"
            ? q.titleHi
            : q.titleEn;
        VoiceAssistant.speak(titleToSpeak, currentLang);
      } catch {
        // Optional voice
      }
    },
    [currentLang, fadeAnim, bounceAnim]
  );

  // ── 2. Initialize Session on Mount ─────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    gameStartTimeRef.current = Date.now();

    // Regenerate questions on mount to ensure exact current device time
    questionsRef.current = generateOrientationQuestions(new Date());

    const init = async () => {
      try {
        const session = await gameSessionService.startSession({
          gameId: "orientation_daily_awareness",
          metadata: {
            gameTitle: "Orientation & Daily Awareness",
            totalRounds: TOTAL_ROUNDS,
            mode: "daily_orientation_engagement",
            dateVerified: new Date().toISOString(),
          },
        });
        if (isMounted && session) {
          sessionIdRef.current = session.sessionId;
        }
      } catch (err) {
        console.warn("[OrientationGame] Failed to start game session:", err);
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
          gameId: "orientation_daily_awareness",
          eventType: "hint_used",
          metadata: {
            round,
            questionType: currentQuestion.questionType,
          },
        });
      } catch {
        // Non-blocking
      }
    }

    try {
      VoiceAssistant.speak(getClueText(currentQuestion), currentLang);
    } catch {
      // Optional voice
    }
  };

  // ── 4. Choice Selection & Evaluation ───────────────────────────────────────
  const handleSelectChoice = async (choice: OrientationChoice) => {
    if (isProcessing || isCompleted) return;
    setIsProcessing(true);
    setSelectedChoiceId(choice.id);

    const responseTimeMs = Date.now() - roundStartTimeRef.current;
    const isCorrect = choice.isCorrect;
    const expectedChoice = currentQuestion.choices.find((c) => c.isCorrect);

    // Record answer_submitted event
    if (sessionIdRef.current) {
      try {
        await gameSessionService.recordEvent({
          sessionId: sessionIdRef.current,
          gameId: "orientation_daily_awareness",
          eventType: "answer_submitted",
          metadata: {
            round,
            questionType: currentQuestion.questionType,
            question: currentQuestion.titleEn,
            availableChoices: currentQuestion.choices.map((c) => c.nameEn),
            selectedAnswer: choice.nameEn,
            expectedAnswer: expectedChoice?.nameEn || "",
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
      // ── CORRECT CHOICE ─────────────────────────────────────────────────────
      setIsCorrectFeedback(true);
      const pointsEarned = hintUsedInRound
        ? BASE_POINTS_PER_ROUND - HINT_PENALTY_POINTS
        : BASE_POINTS_PER_ROUND;
      const nextTotalScore = totalScore + pointsEarned;
      setRoundScore(pointsEarned);
      setTotalScore(nextTotalScore);

      setFeedbackMessage(
        currentLang === "as"
          ? "সুন্দৰ! একেবাৰে শুদ্ধ উত্তৰ 🌟"
          : currentLang === "hi"
          ? "बहुत बढ़िया! बिल्कुल सही उत्तर 🌟"
          : "Wonderful! Perfectly right 🌟"
      );

      // Record answer_correct & round_completed events
      if (sessionIdRef.current) {
        try {
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "orientation_daily_awareness",
            eventType: "answer_correct",
            metadata: {
              round,
              questionType: currentQuestion.questionType,
              pointsEarned,
              attempts,
              responseTimeMs,
            },
          });
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "orientation_daily_awareness",
            eventType: "round_completed",
            metadata: {
              round,
              questionType: currentQuestion.questionType,
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
      // ── INCORRECT CHOICE (Gentle retry, elderly-friendly) ──────────────────
      setIsCorrectFeedback(false);
      totalMistakesRef.current += 1;
      setAttempts((prev) => prev + 1);

      setFeedbackMessage(
        currentLang === "as"
          ? "অলপ ওচৰ চাপিছে! আকৌ এবাৰ ভাবি বাছক 🌿"
          : currentLang === "hi"
          ? "थोड़ा सा अंतर रहा! फिर से ध्यान से सोचें 🌿"
          : "Almost, try again 🌿"
      );

      // Record answer_incorrect event
      if (sessionIdRef.current) {
        try {
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "orientation_daily_awareness",
            eventType: "answer_incorrect",
            metadata: {
              round,
              questionType: currentQuestion.questionType,
              selectedAnswer: choice.nameEn,
              expectedAnswer: expectedChoice?.nameEn || "",
              attempts,
              responseTimeMs,
            },
          });
        } catch {
          // Non-blocking
        }
      }

      // Forgiving retry: clear selection after 1300ms
      setTimeout(() => {
        setSelectedChoiceId(null);
        setFeedbackMessage(null);
        setIsProcessing(false);
      }, 1300);
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
        console.warn("[OrientationGame] Complete session API warning:", err);
      }
    }

    // 2. Persist to Caregiver Dashboard Storage
    try {
      const caregiverSession: CognitiveGameSession = {
        id: `sess-orient-${Date.now()}`,
        gameName: "Orientation & Daily Awareness",
        iconEmoji: "🧭",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        durationMinutes,
        score: finalScore,
        accuracyPercent,
        mistakes: totalMistakesRef.current,
        responseTime: "Comfortable grounding pace",
        difficulty: "5 Grounding Steps (Day, Month, Time, Season, Place)",
        difficultyChangeReason: "Comfortable real-time daily awareness engagement.",
        completed: true,
        humanSummary: `Completed all 5 daily orientation check-ins (Day, Month, Time, Season, Place) with ${accuracyPercent}% accuracy.`,
      };
      await caregiverStorage.recordGameSession(caregiverSession);
    } catch (err) {
      console.warn("[OrientationGame] Caregiver storage save error:", err);
    }

    // 3. Persist to Virtual Companion Context Pipeline
    try {
      await companionContextService.recordRawGameEvent({
        gameId: "orientation_daily_awareness",
        eventType: "game_completed",
        payload: {
          gameName: "Orientation & Daily Awareness",
          score: finalScore,
          durationSeconds,
          accuracyPercent,
          completed: true,
          difficulty: "Daily Grounding & Awareness",
          metadata: {
            totalRounds: TOTAL_ROUNDS,
            totalMistakes: totalMistakesRef.current,
            dateVerified: new Date().toISOString(),
          },
        },
      });
    } catch (err) {
      console.warn("[OrientationGame] Companion context save error:", err);
    }

    // Voice completion celebration
    try {
      const celebration =
        currentLang === "as"
          ? "অসাধাৰণ! আপুনি আজিৰ দিন আৰু সময়ৰ সকলো কথা সুন্দৰকৈ মনত ৰাখিছে।"
          : currentLang === "hi"
          ? "अद्भुत! आपने आज के दिन और समय की सभी बातों को बहुत सुंदर ढंग से पहचाना।"
          : "Splendid! You grounded yourself wonderfully in today's day and time.";
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
              <Text style={styles.completionEmoji}>🧭</Text>
            </View>

            <View style={styles.completionTag}>
              <Feather name="check-circle" size={14} color="#059669" />
              <Text style={styles.completionTagText}>DAILY GROUNDING COMPLETE</Text>
            </View>

            <Text style={styles.completionTitle}>
              {currentLang === "as"
                ? "সুন্দৰ দৈনিক সচেতনতা!"
                : currentLang === "hi"
                ? "उत्कृष्ट दैनिक जागरूकता!"
                : "Wonderful Daily Awareness!"}
            </Text>

            <Text style={styles.completionSubtitle}>
              {currentLang === "as"
                ? "আপুনি আজিৰ বাৰ, মাহ, সময় আৰু স্থান সুন্দৰভাৱে চিনাক্ত কৰিলে।"
                : currentLang === "hi"
                ? "आपने आज के दिन, माह, समय व स्थान को बहुत अच्छे से पहचाना।"
                : "You grounded yourself peacefully with today's date, season, and time."}
            </Text>

            {/* Score & Telemetry Cards */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>GAME SCORE</Text>
                <Text style={styles.statValue}>{totalScore}</Text>
                <Text style={styles.statSub}>Max 500</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statLabel}>ROUNDS</Text>
                <Text style={styles.statValue}>{TOTAL_ROUNDS} / {TOTAL_ROUNDS}</Text>
                <Text style={styles.statSub}>Completed</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statLabel}>TIME TAKEN</Text>
                <Text style={styles.statValue}>{timeDisplay}</Text>
                <Text style={styles.statSub}>Paced</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statLabel}>MISTAKES</Text>
                <Text style={styles.statValue}>{totalMistakesRef.current}</Text>
                <Text style={styles.statSub}>Gentle Retries</Text>
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
                  questionsRef.current = generateOrientationQuestions(new Date());
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
              ? "দৈনিক সচেতনতা"
              : currentLang === "hi"
              ? "दैनिक जागरूकता"
              : "Daily Awareness"}
          </Text>
          <Text style={styles.navSubtitle}>
            {currentLang === "as"
              ? `প্ৰশ্ন ${round} / ${TOTAL_ROUNDS}`
              : currentLang === "hi"
              ? `प्रश्न ${round} / ${TOTAL_ROUNDS}`
              : `Question ${round} of ${TOTAL_ROUNDS}`}
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
          {/* Question Banner Card */}
          <View style={styles.questionCard}>
            <View style={[styles.iconPill, { backgroundColor: currentQuestion.iconBg }]}>
              <MaterialCommunityIcons
                name={currentQuestion.iconName as any}
                size={32}
                color={currentQuestion.iconColor}
              />
            </View>

            <View style={styles.roundCategoryBadge}>
              <Text style={styles.roundCategoryText}>
                {currentQuestion.questionType.replace(/_/g, " ").toUpperCase()}
              </Text>
            </View>

            <Text style={styles.questionTitleText}>
              {getQuestionTitle(currentQuestion)}
            </Text>

            <Text style={styles.questionSubtitleText}>
              {getQuestionSubtitle(currentQuestion)}
            </Text>
          </View>

          {/* Hint Card if Revealed */}
          {hintRevealed && (
            <View style={styles.revealedHintCard}>
              <MaterialCommunityIcons name="lightbulb-on" size={20} color="#D97706" />
              <Text style={styles.revealedHintText}>
                {getClueText(currentQuestion)}
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

          {/* Instruction Label */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderText}>
              {currentLang === "as"
                ? "সঠিক উত্তৰটো স্পৰ্শ কৰক"
                : currentLang === "hi"
                ? "सही उत्तर पर टैप करें"
                : "Select the most accurate choice"}
            </Text>
          </View>

          {/* 4 Large Answer Cards Grid */}
          <View style={styles.choicesGrid}>
            {choices.map((choice) => {
              const isSelected = selectedChoiceId === choice.id;
              const isCorrect = choice.isCorrect;

              let cardStyle = styles.choiceCard;
              let borderHighlight = "#E2E8F0";
              let bgHighlight = "#FFFFFF";

              if (isSelected) {
                if (isCorrectFeedback && isCorrect) {
                  borderHighlight = "#22C55E";
                  bgHighlight = "#F0FDF4";
                } else if (!isCorrectFeedback) {
                  borderHighlight = "#F59E0B";
                  bgHighlight = "#FFFBEB";
                }
              }

              return (
                <TouchableOpacity
                  key={choice.id}
                  style={[
                    cardStyle,
                    {
                      borderColor: borderHighlight,
                      backgroundColor: bgHighlight,
                    },
                  ]}
                  onPress={() => handleSelectChoice(choice)}
                  activeOpacity={0.8}
                  disabled={isProcessing}
                >
                  <View style={styles.choiceEmojiContainer}>
                    <Text style={styles.choiceEmojiText}>{choice.emoji}</Text>
                  </View>
                  <Text style={styles.choiceNameText} numberOfLines={2}>
                    {getChoiceName(choice)}
                  </Text>
                  {isSelected && (
                    <View style={styles.choiceStatusRow}>
                      <Feather
                        name={isCorrectFeedback ? "check-circle" : "refresh-cw"}
                        size={16}
                        color={isCorrectFeedback ? "#15803D" : "#B45309"}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Footer Live Game Score Status */}
      <View style={styles.footerBar}>
        <View style={styles.scorePill}>
          <Text style={styles.scorePillLabel}>GAME SCORE</Text>
          <Text style={styles.scorePillValue}>{totalScore}</Text>
        </View>

        <View style={styles.footerPrompt}>
          <Feather name="compass" size={14} color="#64748B" />
          <Text style={styles.footerPromptText}>
            {currentLang === "as"
              ? "মৰমৰ চিনাকি পৰিৱেশৰ লগত সংযোগ"
              : currentLang === "hi"
              ? "दैनिक जीवन से सुखद जुड़ाव"
              : "Calm daily grounding check-in"}
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
  questionCard: {
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
  iconPill: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  roundCategoryBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: Spacing.sm,
  },
  roundCategoryText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.8,
  },
  questionTitleText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 6,
    lineHeight: 28,
  },
  questionSubtitleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
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
  choicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
    gap: Spacing.md,
  },
  choiceCard: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    minHeight: 140,
    ...Shadows.sm,
  },
  choiceEmojiContainer: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  choiceEmojiText: {
    fontSize: 32,
  },
  choiceNameText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
    lineHeight: 20,
  },
  choiceStatusRow: {
    marginTop: 6,
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
