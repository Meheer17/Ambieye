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
export interface AssociationChoice {
  id: string;
  nameEn: string;
  nameAs: string;
  nameHi: string;
  emoji: string;
  isCorrect: boolean;
}

export interface AssociationQuestion {
  id: string;
  roundNumber: number;
  difficultyLabel: string;
  difficultyKey: "easy" | "easy_medium" | "medium" | "challenging" | "mastery";
  sourceItemEn: string;
  sourceItemAs: string;
  sourceItemHi: string;
  sourceEmoji: string;
  clueEn: string;
  clueAs: string;
  clueHi: string;
  choices: AssociationChoice[];
}

export const TOTAL_ROUNDS = 5;
export const BASE_POINTS_PER_ROUND = 100;
export const HINT_PENALTY_POINTS = 10;

// ── 5 Progressive Rounds Dataset ─────────────────────────────────────────────
export const QUESTIONS_POOL: Record<number, AssociationQuestion[]> = {
  1: [
    {
      id: "r1_q1",
      roundNumber: 1,
      difficultyLabel: "Level 1 · Obvious Match",
      difficultyKey: "easy",
      sourceItemEn: "Red Apple",
      sourceItemAs: "ৰঙা আপেল",
      sourceItemHi: "लाल सेब",
      sourceEmoji: "🍎",
      clueEn: "Think of eating delicious fruit on a plate",
      clueAs: "বাটিত ফল খোৱাৰ কথা চিন্তা কৰক",
      clueHi: "प्लेट में फल खाने के बारे में सोचें",
      choices: [
        { id: "c1_plate", nameEn: "Dinner Plate", nameAs: "ভাতৰ কাঁহী", nameHi: "थाली/प्लेट", emoji: "🍽️", isCorrect: true },
        { id: "c1_car", nameEn: "Car", nameAs: "গাড়ী", nameHi: "गाड़ी", emoji: "🚗", isCorrect: false },
        { id: "c1_phone", nameEn: "Phone", nameAs: "ফোন", nameHi: "फोन", emoji: "📱", isCorrect: false },
        { id: "c1_ball", nameEn: "Football", nameAs: "বল", nameHi: "गेंद", emoji: "⚽", isCorrect: false },
      ],
    },
    {
      id: "r1_q2",
      roundNumber: 1,
      difficultyLabel: "Level 1 · Obvious Match",
      difficultyKey: "easy",
      sourceItemEn: "Toothbrush",
      sourceItemAs: "দাঁত ঘঁহা ব্ৰাশ",
      sourceItemHi: "टूथब्रश",
      sourceEmoji: "🪥",
      clueEn: "You use this to clean your teeth every morning",
      clueAs: "প্ৰতিদিনে পুৱা দাঁত পৰিষ্কাৰ কৰিবলৈ ব্যৱহাৰ কৰা হয়",
      clueHi: "हर सुबह दांत साफ करने के लिए प्रयोग करते हैं",
      choices: [
        { id: "c2_tooth", nameEn: "Tooth", nameAs: "দাঁত", nameHi: "दांत", emoji: "🦷", isCorrect: true },
        { id: "c2_guitar", nameEn: "Guitar", nameAs: "গীটাৰ", nameHi: "गिटार", emoji: "🎸", isCorrect: false },
        { id: "c2_rocket", nameEn: "Rocket", nameAs: "ৰকেট", nameHi: "रॉकेट", emoji: "🚀", isCorrect: false },
        { id: "c2_cycle", nameEn: "Bicycle", nameAs: "চাইকেল", nameHi: "साइकिल", emoji: "🚲", isCorrect: false },
      ],
    },
    {
      id: "r1_q3",
      roundNumber: 1,
      difficultyLabel: "Level 1 · Obvious Match",
      difficultyKey: "easy",
      sourceItemEn: "Brass Key",
      sourceItemAs: "চাবি",
      sourceItemHi: "चाबी",
      sourceEmoji: "🔑",
      clueEn: "A key opens this when you enter home",
      clueAs: "ঘৰত সোমাওঁতে চাবিৰে খোলা হয়",
      clueHi: "घर में प्रवेश करते समय चाबी से इसे खोलते हैं",
      choices: [
        { id: "c3_door", nameEn: "Door & Lock", nameAs: "দুৱাৰ", nameHi: "दरवाजा", emoji: "🚪", isCorrect: true },
        { id: "c3_banana", nameEn: "Banana", nameAs: "কল", nameHi: "केला", emoji: "🍌", isCorrect: false },
        { id: "c3_plane", nameEn: "Aeroplane", nameAs: "উৰাজাহাজ", nameHi: "हवाई जहाज", emoji: "✈️", isCorrect: false },
        { id: "c3_flower", nameEn: "Flower", nameAs: "ফুল", nameHi: "फूल", emoji: "🌸", isCorrect: false },
      ],
    },
  ],
  2: [
    {
      id: "r2_q1",
      roundNumber: 2,
      difficultyLabel: "Level 2 · Natural Daily Pairs",
      difficultyKey: "easy_medium",
      sourceItemEn: "Umbrella",
      sourceItemAs: "ছাতি",
      sourceItemHi: "छाता",
      sourceEmoji: "☔",
      clueEn: "You open an umbrella when this falls from sky",
      clueAs: "বৰষুণ দিলে আমি ছাতি ব্যৱহাৰ কৰোঁ",
      clueHi: "बारिश होने पर हम छाता खोलते हैं",
      choices: [
        { id: "c4_rain", nameEn: "Rain Shower", nameAs: "বৰষুণ", nameHi: "बारिश", emoji: "🌧️", isCorrect: true },
        { id: "c4_bread", nameEn: "Sandwich", nameAs: "ৰুটি", nameHi: "रोटी", emoji: "🥪", isCorrect: false },
        { id: "c4_sofa", nameEn: "Sofa Couch", nameAs: "চকী", nameHi: "सोफा", emoji: "🛋️", isCorrect: false },
        { id: "c4_ball", nameEn: "Ball", nameAs: "বল", nameHi: "गेंद", emoji: "⚽", isCorrect: false },
      ],
    },
    {
      id: "r2_q2",
      roundNumber: 2,
      difficultyLabel: "Level 2 · Natural Daily Pairs",
      difficultyKey: "easy_medium",
      sourceItemEn: "Tea Kettle",
      sourceItemAs: "চাহৰ কেটলি",
      sourceItemHi: "चाय की केतली",
      sourceEmoji: "🫖",
      clueEn: "Hot tea is poured into this cup",
      clueAs: "কেটলিৰ পৰা এই কাপত গৰম চাহ ঢলা হয়",
      clueHi: "केतली से गरम चाय इस कप में डालते हैं",
      choices: [
        { id: "c5_cup", nameEn: "Chai Cup", nameAs: "চাহৰ কাপ", nameHi: "चाय का कप", emoji: "☕", isCorrect: true },
        { id: "c5_shoe", nameEn: "Shoes", nameAs: "জোতা", nameHi: "जूता", emoji: "👞", isCorrect: false },
        { id: "c5_saw", nameEn: "Hand Saw", nameAs: "কৰত", nameHi: "आरी", emoji: "🪚", isCorrect: false },
        { id: "c5_clock", nameEn: "Clock", nameAs: "ঘড়ী", nameHi: "घड़ी", emoji: "⏰", isCorrect: false },
      ],
    },
  ],
  3: [
    {
      id: "r3_q1",
      roundNumber: 3,
      difficultyLabel: "Level 3 · Nature & Animals",
      difficultyKey: "medium",
      sourceItemEn: "Songbird",
      sourceItemAs: "চৰাই",
      sourceItemHi: "चिड़िया",
      sourceEmoji: "🐦",
      clueEn: "Birds build this cozy home on trees",
      clueAs: "চৰায়ে গছত এই মৰমৰ বাহ সাজে",
      clueHi: "पक्षी पेड़ों पर यह प्यारा घोंसला बनाते हैं",
      choices: [
        { id: "c6_nest", nameEn: "Bird Nest", nameAs: "চৰাইৰ বাহ", nameHi: "घोंसला", emoji: "🪺", isCorrect: true },
        { id: "c6_bowl", nameEn: "Soup Bowl", nameAs: "বাটি", nameHi: "कटोरा", emoji: "🥣", isCorrect: false },
        { id: "c6_car", nameEn: "Taxi", nameAs: "গাড়ী", nameHi: "टैक्सी", emoji: "🚗", isCorrect: false },
        { id: "c6_phone", nameEn: "Mobile Phone", nameAs: "ফোন", nameHi: "फोन", emoji: "📱", isCorrect: false },
      ],
    },
    {
      id: "r3_q2",
      roundNumber: 3,
      difficultyLabel: "Level 3 · Nature & Animals",
      difficultyKey: "medium",
      sourceItemEn: "Honeybee",
      sourceItemAs: "মৌমাখি",
      sourceItemHi: "मधुमक्खी",
      sourceEmoji: "🐝",
      clueEn: "Honeybees collect nectar from fresh blossoms",
      clueAs: "মৌমাখিয়ে ফুলৰ পৰা মৌ সংগ্ৰহ কৰে",
      clueHi: "मधुमक्खियां फूलों से मीठा रस लेती हैं",
      choices: [
        { id: "c7_flower", nameEn: "Blossom Flower", nameAs: "ফুল", nameHi: "फूल", emoji: "🌸", isCorrect: true },
        { id: "c7_cycle", nameEn: "Bicycle", nameAs: "চাইকেল", nameHi: "साइकिल", emoji: "🚲", isCorrect: false },
        { id: "c7_boot", nameEn: "Boot", nameAs: "জোতা", nameHi: "जूता", emoji: "👞", isCorrect: false },
        { id: "c7_watch", nameEn: "Wrist Watch", nameAs: "হাতঘড়ী", nameHi: "घड़ी", emoji: "⌚", isCorrect: false },
      ],
    },
  ],
  4: [
    {
      id: "r4_q1",
      roundNumber: 4,
      difficultyLabel: "Level 4 · Tools & Crafts",
      difficultyKey: "challenging",
      sourceItemEn: "Needle & Thread",
      sourceItemAs: "বেজী আৰু সূতা",
      sourceItemHi: "सुई और धागा",
      sourceEmoji: "🧵",
      clueEn: "You stitch and tailor this garment with thread",
      clueAs: "সূতাৰে কাপোৰ চিলাই কৰা হয়",
      clueHi: "धागे से कपड़े सिलते हैं",
      choices: [
        { id: "c8_shirt", nameEn: "Cotton Shirt", nameAs: "কাপোৰ/চোলা", nameHi: "कपड़े", emoji: "👕", isCorrect: true },
        { id: "c8_apple", nameEn: "Apple", nameAs: "আপেল", nameHi: "सेब", emoji: "🍎", isCorrect: false },
        { id: "c8_car", nameEn: "Car", nameAs: "গাড়ী", nameHi: "गाड़ी", emoji: "🚗", isCorrect: false },
        { id: "c8_radio", nameEn: "Radio", nameAs: "ৰেডিঅ'", nameHi: "रेडियो", emoji: "📻", isCorrect: false },
      ],
    },
    {
      id: "r4_q2",
      roundNumber: 4,
      difficultyLabel: "Level 4 · Tools & Crafts",
      difficultyKey: "challenging",
      sourceItemEn: "Paint Palette",
      sourceItemAs: "ছবি অঁকা ৰং",
      sourceItemHi: "चित्रकला रंग",
      sourceEmoji: "🎨",
      clueEn: "Colors are brushed onto this framed art piece",
      clueAs: "ৰঙেৰে সুন্দৰ ছবি অঁকা হয়",
      clueHi: "रंगों से सुंदर चित्र बनाया जाता है",
      choices: [
        { id: "c9_art", nameEn: "Framed Painting", nameAs: "ছবি", nameHi: "तस्वीर/चित्र", emoji: "🖼️", isCorrect: true },
        { id: "c9_spoon", nameEn: "Spoon", nameAs: "চামুচ", nameHi: "चम्मच", emoji: "🥄", isCorrect: false },
        { id: "c9_brush", nameEn: "Toothbrush", nameAs: "ব্ৰাশ", nameHi: "ब्रश", emoji: "🪥", isCorrect: false },
        { id: "c9_car", nameEn: "Car", nameAs: "গাড়ী", nameHi: "गाड़ी", emoji: "🚗", isCorrect: false },
      ],
    },
    {
      id: "r4_q3",
      roundNumber: 4,
      difficultyLabel: "Level 4 · Tools & Crafts",
      difficultyKey: "challenging",
      sourceItemEn: "Open Book",
      sourceItemAs: "কিতাপ",
      sourceItemHi: "किताब",
      sourceEmoji: "📖",
      clueEn: "You wear these on your eyes to read clearly",
      clueAs: "কিতাপ পঢ়িবলৈ চকুৰ চশমা পিন্ধা হয়",
      clueHi: "किताब पढ़ने के लिए चश्मा पहनते हैं",
      choices: [
        { id: "c10_glasses", nameEn: "Reading Glasses", nameAs: "চশমা", nameHi: "चश्मा", emoji: "👓", isCorrect: true },
        { id: "c10_ball", nameEn: "Football", nameAs: "বল", nameHi: "गेंद", emoji: "⚽", isCorrect: false },
        { id: "c10_kettle", nameEn: "Teapot", nameAs: "কেটলি", nameHi: "केतली", emoji: "🫖", isCorrect: false },
        { id: "c10_shoe", nameEn: "Shoe", nameAs: "জোতা", nameHi: "जूता", emoji: "👞", isCorrect: false },
      ],
    },
  ],
  5: [
    {
      id: "r5_q1",
      roundNumber: 5,
      difficultyLabel: "Level 5 · Peaceful Association",
      difficultyKey: "mastery",
      sourceItemEn: "Night Moon & Stars",
      sourceItemAs: "ৰাতিৰ জোন আৰু তৰা",
      sourceItemHi: "चाँद और तारे",
      sourceEmoji: "🌙",
      clueEn: "At night time, we rest comfortably on a bed",
      clueAs: "ৰাতি আমি আৰামেৰে বিছনাত শোওঁ",
      clueHi: "रात में हम आराम से बिस्तर पर सोते हैं",
      choices: [
        { id: "c11_bed", nameEn: "Cozy Bed & Pillow", nameAs: "বিছনা", nameHi: "बिस्तर/नींद", emoji: "🛏️", isCorrect: true },
        { id: "c11_car", nameEn: "Car", nameAs: "গাড়ী", nameHi: "गाड़ी", emoji: "🚗", isCorrect: false },
        { id: "c11_hammer", nameEn: "Hammer", nameAs: "হাতুৰী", nameHi: "हथौड़ा", emoji: "🔨", isCorrect: false },
        { id: "c11_radio", nameEn: "Radio", nameAs: "ৰেডিঅ'", nameHi: "रेडियो", emoji: "📻", isCorrect: false },
      ],
    },
    {
      id: "r5_q2",
      roundNumber: 5,
      difficultyLabel: "Level 5 · Peaceful Association",
      difficultyKey: "mastery",
      sourceItemEn: "River Boat",
      sourceItemAs: "নদীৰ নাও",
      sourceItemHi: "नदी की नाव",
      sourceEmoji: "🚢",
      clueEn: "Boats glide gently across the water waves",
      clueAs: "নাওখন নদীৰ পানীত চলে",
      clueHi: "नाव नदी के पानी में चलती है",
      choices: [
        { id: "c12_river", nameEn: "Water Waves", nameAs: "নদীৰ পানী", nameHi: "नदी की लहरें", emoji: "🌊", isCorrect: true },
        { id: "c12_tree", nameEn: "Forest Tree", nameAs: "গছ", nameHi: "पेड़", emoji: "🌳", isCorrect: false },
        { id: "c12_door", nameEn: "Doorway", nameAs: "দুৱাৰ", nameHi: "दरवाजा", emoji: "🚪", isCorrect: false },
        { id: "c12_clock", nameEn: "Wall Clock", nameAs: "ঘড়ী", nameHi: "घड़ी", emoji: "🕰️", isCorrect: false },
      ],
    },
    {
      id: "r5_q3",
      roundNumber: 5,
      difficultyLabel: "Level 5 · Peaceful Association",
      difficultyKey: "mastery",
      sourceItemEn: "Letter Envelope",
      sourceItemAs: "চিঠিৰ খাম",
      sourceItemHi: "पत्र का लिफाफा",
      sourceEmoji: "📬",
      clueEn: "A letter sent to family with love",
      clueAs: "পৰিয়াললৈ মৰমৰ চিঠি পঠোৱা হয়",
      clueHi: "परिवार को भेजा जाने वाला पत्र",
      choices: [
        { id: "c13_stamp", nameEn: "Postage Letter", nameAs: "মৰমৰ চিঠি", nameHi: "चिट्ठी/पत्र", emoji: "✉️", isCorrect: true },
        { id: "c13_apple", nameEn: "Apple", nameAs: "আপেল", nameHi: "सेब", emoji: "🍎", isCorrect: false },
        { id: "c13_ball", nameEn: "Football", nameAs: "বল", nameHi: "गेंद", emoji: "⚽", isCorrect: false },
        { id: "c13_boot", nameEn: "Boot", nameAs: "জোতা", nameHi: "जूता", emoji: "👞", isCorrect: false },
      ],
    },
  ],
};

export default function PictureAssociationScreen() {
  const router = useRouter();
  const { t, currentLang } = useTranslation();

  // ── Gameplay State ─────────────────────────────────────────────────────────
  const [round, setRound] = useState<number>(1);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [currentQuestion, setCurrentQuestion] = useState<AssociationQuestion>(
    QUESTIONS_POOL[1][0]
  );
  const [shuffledChoices, setShuffledChoices] = useState<AssociationChoice[]>([]);
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
  const getSourceItemName = (q: AssociationQuestion) => {
    if (currentLang === "as") return q.sourceItemAs;
    if (currentLang === "hi") return q.sourceItemHi;
    return q.sourceItemEn;
  };

  const getChoiceName = (c: AssociationChoice) => {
    if (currentLang === "as") return c.nameAs;
    if (currentLang === "hi") return c.nameHi;
    return c.nameEn;
  };

  const getClueText = (q: AssociationQuestion) => {
    if (currentLang === "as") return q.clueAs;
    if (currentLang === "hi") return q.clueHi;
    return q.clueEn;
  };

  // ── 1. Start / Setup Round ─────────────────────────────────────────────────
  const setupRound = useCallback(
    async (roundNum: number) => {
      const candidates = QUESTIONS_POOL[roundNum] || QUESTIONS_POOL[1];
      const selectedQuestion =
        candidates[Math.floor(Math.random() * candidates.length)];
      const randomizedChoices = [...selectedQuestion.choices].sort(
        () => 0.5 - Math.random()
      );

      setRound(roundNum);
      setCurrentQuestion(selectedQuestion);
      setShuffledChoices(randomizedChoices);
      setSelectedChoiceId(null);
      setAttempts(1);
      setHintUsedInRound(false);
      setHintRevealed(false);
      setFeedbackMessage(null);
      setIsProcessing(false);
      roundStartTimeRef.current = Date.now();

      // Trigger smooth fade animation
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
            gameId: "picture_association",
            eventType: "round_started",
            metadata: {
              round: roundNum,
              difficulty: selectedQuestion.difficultyKey,
              difficultyLabel: selectedQuestion.difficultyLabel,
              sourceItem: selectedQuestion.sourceItemEn,
              choicesShown: randomizedChoices.map((c) => c.nameEn),
            },
          });
        } catch {
          // Non-blocking
        }
      }

      // Voice prompt: gentle instruction
      try {
        const prompt =
          currentLang === "as"
            ? "ইয়াৰ লগত কোনটো বস্তু মিল খায়? বাছক"
            : currentLang === "hi"
            ? "इसके साथ कौन सी वस्तु मिलती है? चुनें"
            : "Which item goes best with this?";
        VoiceAssistant.speak(prompt, currentLang);
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
          gameId: "picture_association",
          metadata: {
            gameTitle: "Picture Association",
            totalRounds: TOTAL_ROUNDS,
            mode: "cognitive_association",
          },
        });
        if (isMounted && session) {
          sessionIdRef.current = session.sessionId;
        }
      } catch (err) {
        console.warn("[PictureAssociation] Failed to start game session:", err);
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
          gameId: "picture_association",
          eventType: "hint_used",
          metadata: {
            round,
            sourceItem: currentQuestion.sourceItemEn,
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
  const handleSelectChoice = async (choice: AssociationChoice) => {
    if (isProcessing || isCompleted) return;
    setIsProcessing(true);
    setSelectedChoiceId(choice.id);

    const responseTimeMs = Date.now() - roundStartTimeRef.current;
    const isCorrect = choice.isCorrect;

    // Record answer_submitted event
    if (sessionIdRef.current) {
      try {
        await gameSessionService.recordEvent({
          sessionId: sessionIdRef.current,
          gameId: "picture_association",
          eventType: "answer_submitted",
          metadata: {
            round,
            sourceItem: currentQuestion.sourceItemEn,
            selectedChoice: choice.nameEn,
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
          ? "সুন্দৰ! একেবাৰে সঠিক যোৰ 🌟"
          : currentLang === "hi"
          ? "बहुत बढ़िया! सही जोड़ी चुनी 🌟"
          : "Wonderful! Natural match 🌟"
      );

      // Record answer_correct & round_completed events
      if (sessionIdRef.current) {
        try {
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "picture_association",
            eventType: "answer_correct",
            metadata: {
              round,
              pointsEarned,
              attempts,
              responseTimeMs,
            },
          });
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "picture_association",
            eventType: "round_completed",
            metadata: {
              round,
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
          ? "অলপ হেৰফেৰ হ'ল! আকৌ এবাৰ ভাবি চাওক 🌿"
          : currentLang === "hi"
          ? "थोड़ा सा अंतर रहा! फिर से सोचें 🌿"
          : "Almost, try again 🌿"
      );

      // Record answer_incorrect event
      if (sessionIdRef.current) {
        try {
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "picture_association",
            eventType: "answer_incorrect",
            metadata: {
              round,
              selectedChoice: choice.nameEn,
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
        console.warn("[PictureAssociation] completeSession error:", err);
      }
    }

    // 2. Bridge to Companion Context Persistence
    try {
      await companionContextService.recordRawGameEvent({
        gameId: "picture_association",
        eventType: "game_completed",
        payload: {
          gameName: "Picture Association",
          score: finalScore,
          durationSeconds,
          accuracyPercent,
          completed: true,
          difficulty: "5 Progressive Levels",
          metadata: {
            totalRounds: TOTAL_ROUNDS,
            totalMistakes: totalMistakesRef.current,
          },
        },
      });
    } catch (rawErr) {
      console.warn("[PictureAssociation] Companion context bridge error:", rawErr);
    }

    // 3. Flow to Caregiver Dashboard Storage
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const caregiverSession: CognitiveGameSession = {
        id: `sess-pa-${Date.now()}`,
        gameName: "Picture Association",
        iconEmoji: "🔗",
        timestamp: `Today · ${timeStr}`,
        durationMinutes,
        score: finalScore,
        accuracyPercent,
        mistakes: totalMistakesRef.current,
        responseTime: "Intuitive conceptual pairing",
        difficulty: "Level 1 → 5 (Familiar Pairs)",
        difficultyChangeReason: "Progressed through contextual association scaling.",
        completed: true,
        humanSummary: `Completed all 5 rounds linking natural everyday object associations with ${accuracyPercent}% accuracy.`,
      };
      await caregiverStorage.recordGameSession(caregiverSession);
    } catch (cgErr) {
      console.warn("[PictureAssociation] Caregiver storage record error:", cgErr);
    }
  };

  // ── 6. Restart Game ────────────────────────────────────────────────────────
  const handleRestartGame = async () => {
    setIsCompleted(false);
    isCompletedRef.current = false;
    isAbandonedRef.current = false;
    setTotalScore(0);
    setRoundScore(0);
    totalMistakesRef.current = 0;
    gameStartTimeRef.current = Date.now();

    try {
      const session = await gameSessionService.startSession({
        gameId: "picture_association",
        metadata: {
          gameTitle: "Picture Association",
          totalRounds: TOTAL_ROUNDS,
          mode: "cognitive_association",
        },
      });
      if (session) {
        sessionIdRef.current = session.sessionId;
      }
    } catch (err) {
      console.warn("[PictureAssociation] Restart session error:", err);
    }

    setupRound(1);
  };

  // ── 7. Render Game Complete Result Screen ───────────────────────────────────
  if (isCompleted) {
    const durationSeconds = Math.max(
      1,
      Math.round((Date.now() - gameStartTimeRef.current) / 1000)
    );
    const mins = Math.floor(durationSeconds / 60);
    const secs = durationSeconds % 60;
    const timeFormatted = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    const totalAttempts = TOTAL_ROUNDS + totalMistakesRef.current;
    const accuracyPercent = Math.min(
      100,
      Math.max(50, Math.round((TOTAL_ROUNDS / totalAttempts) * 100))
    );

    return (
      <SafeAreaView style={styles.safeContainer} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={styles.resultScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Badge */}
          <View style={styles.resultHeader}>
            <View style={styles.resultBadge}>
              <Text style={styles.resultBadgeEmoji}>🌟</Text>
              <Text style={styles.resultBadgeText}>
                {currentLang === "as"
                  ? "খেল সম্পূৰ্ণ হ'ল!"
                  : currentLang === "hi"
                  ? "खेल पूरा हुआ!"
                  : "Activity Complete!"}
              </Text>
            </View>
            <Text style={styles.resultTitle}>
              {currentLang === "as"
                ? "সুন্দৰ সম্পৰ্ক বাছনি!"
                : currentLang === "hi"
                ? "शानदार संबंध पहचान!"
                : "Great Association!"}
            </Text>
            <Text style={styles.resultSubtitle}>
              {currentLang === "as"
                ? "আপুনি আটাইকেইটা ৫ টা পৰ্যায়তে ছবিবোৰৰ মাজৰ সঠিক সম্পৰ্ক বাছিলে।"
                : currentLang === "hi"
                ? "आपने सभी 5 स्तरों में चित्रों के बीच सही संबंध पहचाने।"
                : "You identified the natural pairs across all 5 progressive rounds."}
            </Text>
          </View>

          {/* Game Score Card */}
          <View style={styles.scoreHeroCard}>
            <Text style={styles.scoreHeroLabel}>
              {currentLang === "as" ? "খেলৰ নম্বৰ" : currentLang === "hi" ? "खेल स्कोर" : "Game Score"}
            </Text>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreHeroValue}>{totalScore}</Text>
              <Text style={styles.scoreHeroMax}>/ 500</Text>
            </View>
            <View style={styles.scorePill}>
              <Feather name="award" size={16} color="#059669" />
              <Text style={styles.scorePillText}>
                {accuracyPercent >= 90
                  ? currentLang === "as"
                    ? "উত্কৃষ্ট বুজাবুজি"
                    : currentLang === "hi"
                    ? "उत्कृष्ट समझ"
                    : "Excellent Connection"
                  : currentLang === "as"
                  ? "ভাল প্ৰয়াস"
                  : currentLang === "hi"
                  ? "अच्छा प्रयास"
                  : "Great Effort"}
              </Text>
            </View>
          </View>

          {/* Key Stats Row */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <View style={[styles.statIconWrap, { backgroundColor: "#F0FDF4" }]}>
                <Feather name="clock" size={20} color="#059669" />
              </View>
              <Text style={styles.statLabel}>
                {currentLang === "as" ? "সময়" : currentLang === "hi" ? "समय" : "Time"}
              </Text>
              <Text style={styles.statValue}>{timeFormatted}</Text>
            </View>

            <View style={styles.statBox}>
              <View style={[styles.statIconWrap, { backgroundColor: "#EFF6FF" }]}>
                <Feather name="check-circle" size={20} color="#0284C7" />
              </View>
              <Text style={styles.statLabel}>
                {currentLang === "as" ? "পৰ্যায়" : currentLang === "hi" ? "राउंड" : "Rounds"}
              </Text>
              <Text style={styles.statValue}>5 / 5</Text>
            </View>

            <View style={styles.statBox}>
              <View style={[styles.statIconWrap, { backgroundColor: "#FAF5FF" }]}>
                <Feather name="target" size={20} color="#7C3AED" />
              </View>
              <Text style={styles.statLabel}>
                {currentLang === "as" ? "শুদ্ধতা" : currentLang === "hi" ? "सटीकता" : "Accuracy"}
              </Text>
              <Text style={styles.statValue}>{accuracyPercent}%</Text>
            </View>
          </View>

          {/* Caregiver Sync Indicator Card */}
          <View style={styles.caregiverSyncCard}>
            <View style={styles.caregiverSyncHeader}>
              <MaterialCommunityIcons name="shield-check" size={20} color="#059669" />
              <Text style={styles.caregiverSyncTitle}>
                {currentLang === "as"
                  ? "তত্বাৱধায়কৰ ডেশ্ববৰ্ডত সংৰক্ষিত"
                  : currentLang === "hi"
                  ? "केयरगिवर डैशबोर्ड में सुरक्षित"
                  : "Saved to Caregiver Activity Log"}
              </Text>
            </View>
            <Text style={styles.caregiverSyncDesc}>
              {currentLang === "as"
                ? "আপোনাৰ এই কাৰ্যকলাপ পৰিয়াল আৰু তত্বাৱধায়কে চাব পাৰিব।"
                : currentLang === "hi"
                ? "आपकी यह गतिविधि परिवार और केयरगिवर के साथ साझा हो गई है।"
                : "Your completed session is logged for family & caregiver visibility."}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.resultActions}>
            <TouchableOpacity
              style={styles.playAgainBtn}
              onPress={handleRestartGame}
              activeOpacity={0.85}
            >
              <Feather name="rotate-ccw" size={20} color="#FFFFFF" />
              <Text style={styles.playAgainBtnText}>
                {currentLang === "as"
                  ? "আকৌ খেলক"
                  : currentLang === "hi"
                  ? "फिर से खेलें"
                  : "Play Again"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backHomeBtn}
              onPress={() => router.replace("/(patient)/games" as any)}
              activeOpacity={0.8}
            >
              <Feather name="home" size={20} color="#0F172A" />
              <Text style={styles.backHomeBtnText}>
                {currentLang === "as"
                  ? "কাৰ্যকলাপলৈ উভতি যাওক"
                  : currentLang === "hi"
                  ? "गतिविधियों पर लौटें"
                  : "Back to Activities"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── 8. Render Active Gameplay Screen ────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeContainer} edges={["top", "bottom"]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backIconButton}
          onPress={() => router.replace("/(patient)/games" as any)}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="chevron-left" size={28} color="#1E293B" />
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <Text style={styles.gameHeaderTitle}>
            {currentLang === "as"
              ? "ছবিৰ সংযোগ"
              : currentLang === "hi"
              ? "चित्र संबंध"
              : "Picture Association"}
          </Text>
          <Text style={styles.roundIndicatorText}>
            {currentLang === "as"
              ? `পৰ্যায় ${round} / ${TOTAL_ROUNDS}`
              : currentLang === "hi"
              ? `राउंड ${round} / ${TOTAL_ROUNDS}`
              : `Round ${round} of ${TOTAL_ROUNDS}`}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.hintIconButton, hintRevealed && styles.hintIconButtonActive]}
          onPress={handleUseHint}
          activeOpacity={0.7}
          disabled={isProcessing}
        >
          <MaterialCommunityIcons
            name="lightbulb-outline"
            size={22}
            color={hintRevealed ? "#D97706" : "#475569"}
          />
          <Text
            style={[styles.hintIconLabel, hintRevealed && styles.hintIconLabelActive]}
          >
            {currentLang === "as" ? "সংকেত" : currentLang === "hi" ? "संकेत" : "Clue"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Progress Dots */}
      <View style={styles.progressContainer}>
        {Array.from({ length: TOTAL_ROUNDS }).map((_, idx) => {
          const stepNum = idx + 1;
          const isDone = stepNum < round;
          const isCurrent = stepNum === round;
          return (
            <View
              key={idx}
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
        contentContainerStyle={styles.mainScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Source Item Hero Card (Look Phase) */}
        <Animated.View
          style={[
            styles.sourceHeroCard,
            { opacity: fadeAnim, transform: [{ scale: bounceAnim }] },
          ]}
        >
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>{currentQuestion.difficultyLabel}</Text>
          </View>
          <Text style={styles.sourceHeroEmoji}>{currentQuestion.sourceEmoji}</Text>
          <Text style={styles.sourceHeroName}>{getSourceItemName(currentQuestion)}</Text>
          <Text style={styles.sourceHeroPrompt}>
            {currentLang === "as"
              ? "ইয়াৰ লগত কোনটো বস্তু মিল খায়?"
              : currentLang === "hi"
              ? "इसके साथ कौन सी वस्तु मिलती है?"
              : "Which item goes best with this?"}
          </Text>
        </Animated.View>

        {/* Revealed Clue Banner */}
        {hintRevealed && (
          <View style={styles.clueBanner}>
            <MaterialCommunityIcons name="lightbulb-on" size={20} color="#D97706" />
            <Text style={styles.clueBannerText}>{getClueText(currentQuestion)}</Text>
          </View>
        )}

        {/* Feedback Message Banner */}
        {feedbackMessage && (
          <Animated.View
            style={[
              styles.feedbackBanner,
              isCorrectFeedback
                ? styles.feedbackBannerSuccess
                : styles.feedbackBannerWarning,
            ]}
          >
            <Text style={styles.feedbackBannerEmoji}>
              {isCorrectFeedback ? "🌟" : "🌿"}
            </Text>
            <Text
              style={[
                styles.feedbackBannerText,
                isCorrectFeedback
                  ? styles.feedbackBannerTextSuccess
                  : styles.feedbackBannerTextWarning,
              ]}
            >
              {feedbackMessage}
            </Text>
          </Animated.View>
        )}

        {/* 4 Choices Grid (Choose Phase) */}
        <Animated.View style={[styles.choicesGrid, { opacity: fadeAnim }]}>
          {shuffledChoices.map((choice) => {
            const isSelected = selectedChoiceId === choice.id;
            const isCorrectCard = isSelected && isCorrectFeedback;
            const isIncorrectCard = isSelected && !isCorrectFeedback && feedbackMessage !== null;

            return (
              <TouchableOpacity
                key={choice.id}
                style={[
                  styles.choiceCard,
                  isSelected && styles.choiceCardSelected,
                  isCorrectCard && styles.choiceCardCorrect,
                  isIncorrectCard && styles.choiceCardIncorrect,
                ]}
                onPress={() => handleSelectChoice(choice)}
                activeOpacity={0.8}
                disabled={isProcessing}
              >
                <Text style={styles.choiceEmoji}>{choice.emoji}</Text>
                <Text style={styles.choiceNameText} numberOfLines={2}>
                  {getChoiceName(choice)}
                </Text>

                {/* Right Status Indicator */}
                {isCorrectCard && (
                  <View style={styles.choiceStatusBadgeCorrect}>
                    <Feather name="check" size={16} color="#FFFFFF" />
                  </View>
                )}
                {isIncorrectCard && (
                  <View style={styles.choiceStatusBadgeIncorrect}>
                    <Feather name="rotate-ccw" size={14} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {/* Footer Score & Encouragement */}
        <View style={styles.footerInfoCard}>
          <View style={styles.footerScoreBox}>
            <Text style={styles.footerScoreLabel}>
              {currentLang === "as" ? "নম্বৰ" : currentLang === "hi" ? "स्कोर" : "Score"}
            </Text>
            <Text style={styles.footerScoreValue}>{totalScore}</Text>
          </View>
          <View style={styles.footerDivider} />
          <View style={styles.footerEncouragementBox}>
            <Text style={styles.footerEncouragementText}>
              {currentLang === "as"
                ? "মনোযোগেৰে চাই সঠিক বস্তুটো বাছক 🌸"
                : currentLang === "hi"
                ? "ध्यान से देखें और सही वस्तु चुनें 🌸"
                : "Look closely and find the natural partner 🌸"}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarCenter: {
    alignItems: "center",
  },
  gameHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  roundIndicatorText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6366F1",
    marginTop: 2,
  },
  hintIconButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    gap: 4,
  },
  hintIconButtonActive: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  hintIconLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  hintIconLabelActive: {
    color: "#B45309",
  },

  // Progress Dots
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  progressDot: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
  },
  progressDotDone: {
    backgroundColor: "#059669",
  },
  progressDotCurrent: {
    width: 36,
    backgroundColor: "#6366F1",
  },

  // Main Scroll
  mainScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },

  // Source Hero Card (Look Phase)
  sourceHeroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#EEF2FF",
    ...Shadows.md,
  },
  levelBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4F46E5",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sourceHeroEmoji: {
    fontSize: 64,
    marginBottom: 6,
  },
  sourceHeroName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 6,
    textAlign: "center",
  },
  sourceHeroPrompt: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6366F1",
    textAlign: "center",
  },

  // Clue Banner
  clueBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  clueBannerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#B45309",
    flex: 1,
  },

  // Feedback Banner
  feedbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
    ...Shadows.sm,
  },
  feedbackBannerSuccess: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  feedbackBannerWarning: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FFEDD5",
  },
  feedbackBannerEmoji: {
    fontSize: 22,
  },
  feedbackBannerText: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  feedbackBannerTextSuccess: {
    color: "#15803D",
  },
  feedbackBannerTextWarning: {
    color: "#C2410C",
  },

  // Choices Grid
  choicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  choiceCard: {
    width: "47%",
    minHeight: 130,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    position: "relative",
    ...Shadows.sm,
  },
  choiceCardSelected: {
    borderColor: "#6366F1",
    backgroundColor: "#EEF2FF",
  },
  choiceCardCorrect: {
    borderColor: "#059669",
    backgroundColor: "#F0FDF4",
  },
  choiceCardIncorrect: {
    borderColor: "#F97316",
    backgroundColor: "#FFF7ED",
  },
  choiceEmoji: {
    fontSize: 44,
    marginBottom: 6,
  },
  choiceNameText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
  },
  choiceStatusBadgeCorrect: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
  },
  choiceStatusBadgeIncorrect: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F97316",
    alignItems: "center",
    justifyContent: "center",
  },

  // Footer Card
  footerInfoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Shadows.sm,
  },
  footerScoreBox: {
    paddingHorizontal: 12,
    alignItems: "center",
  },
  footerScoreLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
  },
  footerScoreValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  footerDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 8,
  },
  footerEncouragementBox: {
    flex: 1,
    paddingLeft: 4,
  },
  footerEncouragementText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#475569",
    lineHeight: 18,
  },

  // Result Screen Styles
  resultScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: "center",
  },
  resultHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  resultBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  resultBadgeEmoji: {
    fontSize: 16,
  },
  resultBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B45309",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  resultTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 6,
  },
  resultSubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  scoreHeroCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Shadows.md,
  },
  scoreHeroLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginBottom: 12,
  },
  scoreHeroValue: {
    fontSize: 52,
    fontWeight: "900",
    color: "#059669",
  },
  scoreHeroMax: {
    fontSize: 20,
    fontWeight: "600",
    color: "#94A3B8",
  },
  scorePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  scorePillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#059669",
  },
  statsGrid: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Shadows.sm,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  caregiverSyncCard: {
    width: "100%",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
  },
  caregiverSyncHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  caregiverSyncTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#166534",
  },
  caregiverSyncDesc: {
    fontSize: 12,
    color: "#15803D",
    lineHeight: 18,
  },
  resultActions: {
    width: "100%",
    gap: 12,
  },
  playAgainBtn: {
    backgroundColor: "#059669",
    borderRadius: 20,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    ...Shadows.sm,
  },
  playAgainBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  backHomeBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  backHomeBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },
});
