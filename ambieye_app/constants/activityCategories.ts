/**
 * activityCategories.ts
 * -------------------------------------------------------------
 * Central cognitive and functional category system for AmbiEye Dementia Care.
 *
 * Categorizes the 17 core activities into 5 clinical/functional domains
 * with extensible support for future creative and motor modules.
 *
 * Categories:
 * 1. 🧠 Memory & Recall (memory_recall)
 * 2. 👀 Attention & Perception (attention_perception)
 * 3. 🗣️ Language & Association (language_association)
 * 4. 🧩 Planning & Problem Solving (planning_problem_solving)
 * 5. 🧓 Memory, Reminiscence & Orientation (reminiscence_orientation)
 *
 * Extensible:
 * - 🎵 Music & Creative Cognition (music_creative)
 * - 🏃 Physical & Motor Cognition (motor_cognition)
 */

export type ActivityCategoryId =
  | "memory_recall"
  | "attention_perception"
  | "language_association"
  | "planning_problem_solving"
  | "reminiscence_orientation"
  | "music_creative"
  | "motor_cognition";

export interface ActivityItem {
  id: number;
  slug: string;
  title: string;
  titleAs: string;
  titleHi: string;
  desc: string;
  descAs: string;
  descHi: string;
  link: string;
  emoji: string;
  color: string;
  bg: string;
  badge: string;
  categoryId: ActivityCategoryId;
  focusHint?: string;
}

export interface ActivityCategory {
  id: ActivityCategoryId;
  title: string;
  titleAs: string;
  titleHi: string;
  description: string;
  descriptionAs: string;
  descriptionHi: string;
  icon: string; // Emoji or icon name
  color: string;
  bgColor: string;
  borderColor: string;
  tintText: string;
  activityIds: number[];
  isCore: boolean;
}

/**
 * 5 Core Cognitive Categories + Extensible Categories
 */
export const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  {
    id: "memory_recall",
    title: "Memory & Recall",
    titleAs: "স্মৃতি আৰু চিনাক্তকৰণ",
    titleHi: "स्मृति एवं स्मरण",
    description: "Activities to gently exercise your memory and recognition",
    descriptionAs: "স্মৃতিশক্তি আৰু চিনাকি বস্তু মনত ৰখাৰ সহজ অনুশীলন",
    descriptionHi: "स्मृति और पहचान को सक्रिय रखने के सरल अभ्यास",
    icon: "🧠",
    color: "#4F46E5",
    bgColor: "#EEF2FF",
    borderColor: "#C7D2FE",
    tintText: "#4338CA",
    activityIds: [3, 15, 12, 2],
    isCore: true,
  },
  {
    id: "attention_perception",
    title: "Attention & Perception",
    titleAs: "মনোযোগ আৰু দৃষ্টি শক্তি",
    titleHi: "ध्यान एवं दृश्य पहचान",
    description: "Fun challenges for visual focus, concentration, and finding objects",
    descriptionAs: "মনোযোগ স্থিৰ কৰা আৰু লক্ষ্য বস্তু বিচাৰি উলিওৱাৰ খেল",
    descriptionHi: "एकाग्रता बढ़ाने और छिपी वस्तुएं खोजने के मनोरंजक खेल",
    icon: "👀",
    color: "#0284C7",
    bgColor: "#F0F9FF",
    borderColor: "#BAE6FD",
    tintText: "#0369A1",
    activityIds: [5, 13, 14, 19],
    isCore: true,
  },
  {
    id: "language_association",
    title: "Language & Association",
    titleAs: "ভাষা আৰু শব্দ সংযোগ",
    titleHi: "भाषा एवं शब्द संबंध",
    description: "Word exploration, picture pairings, and recognizing community roles",
    descriptionAs: "চিনাকি শব্দ, ছবিৰ যোৰ আৰু ব্যক্তি চিনাক্ত কৰাৰ আনন্দ",
    descriptionHi: "शब्दों, चित्रों और परिचित लोगों को जोड़ने वाले अभ्यास",
    icon: "🗣️",
    color: "#D97706",
    bgColor: "#FFFBEB",
    borderColor: "#FDE68A",
    tintText: "#B45309",
    activityIds: [7, 16, 18],
    isCore: true,
  },
  {
    id: "planning_problem_solving",
    title: "Planning & Problem Solving",
    titleAs: "পৰিকল্পনা আৰু সিদ্ধান্ত",
    titleHi: "योजना एवं समस्या समाधान",
    description: "Practical daily routines, gentle counting, and flexible decisions",
    descriptionAs: "দৈনন্দিন কামৰ সঠিক ক্ৰম, গণনা আৰু সহজ সিদ্ধান্ত",
    descriptionHi: "दैनिक दिनचर्या, सरल गणना और सहज निर्णय के अभ्यास",
    icon: "🧩",
    color: "#059669",
    bgColor: "#F0FDF4",
    borderColor: "#A7F3D0",
    tintText: "#047857",
    activityIds: [20, 21, 8, 6],
    isCore: true,
  },
  {
    id: "reminiscence_orientation",
    title: "Reminiscence & Orientation",
    titleAs: "পুৰণি স্মৃতি আৰু দিনৰ আভাস",
    titleHi: "यादें एवं समय का ज्ञान",
    description: "Cherished courtyard stories, river memories, and time of day",
    descriptionAs: "মাজুলীৰ পুৰণি স্মৃতি, সুন্দৰ কথা আৰু আজিৰ দিনৰ সময়",
    descriptionHi: "परिवार की मीठी यादें, पुरानी बातें और आज के समय का ध्यान",
    icon: "🧓",
    color: "#9333EA",
    bgColor: "#FAF5FF",
    borderColor: "#E9D5FF",
    tintText: "#7E22CE",
    activityIds: [4, 17],
    isCore: true,
  },
  // Extensible Future/Existing Modules
  {
    id: "music_creative",
    title: "Music & Cultural Melodies",
    titleAs: "সংগীত আৰু সাংস্কৃতিক সুৰ",
    titleHi: "संगीत एवं मधुर यादें",
    description: "Golden folk tunes, singing with companion, and family moments",
    descriptionAs: "সোণালী সুৰ, সংগীৰ লগত অন্তাক্ষৰী আৰু পৰিয়ালৰ মাত",
    descriptionHi: "मनपसंद मधुर गीत, अंत्याक्षरी और परिवार की यादें",
    icon: "🎵",
    color: "#BE123C",
    bgColor: "#FFF1F2",
    borderColor: "#FECDD3",
    tintText: "#9F1239",
    activityIds: [1, 101],
    isCore: false,
  },
  {
    id: "motor_cognition",
    title: "Vision & Motion Focus",
    titleAs: "চকুৰ লৰচৰ আৰু দৃষ্টি স্থিৰতা",
    titleHi: "नेत्र गति एवं दृष्टि अभ्यास",
    description: "Gentle eye movements and tracking exercises with front camera",
    descriptionAs: "কেমেৰাৰে চকুৰ মসৃণ ঘূৰ্ণন আৰু দৃষ্টি স্থিৰতাৰ অভ্যাস",
    descriptionHi: "कैमरे के साथ आंखों के सहज संचालन और फोकस का अभ्यास",
    icon: "👁️",
    color: "#0891B2",
    bgColor: "#ECFEFF",
    borderColor: "#A5F3FC",
    tintText: "#0E7490",
    activityIds: [9, 10, 11],
    isCore: false,
  },
];

/**
 * All 17 Core Activities + Extensible activities mapped to their category
 */
export const ALL_ACTIVITIES: ActivityItem[] = [
  // ── 1. Memory & Recall (4 activities) ──────────────────────────────────────
  {
    id: 3,
    slug: "picture-recall",
    title: "Picture Recall",
    titleAs: "ছবি মনত ৰখাৰ খেল",
    titleHi: "तस्वीर स्मरण",
    desc: "Memorize everyday objects shown briefly and pick what was displayed",
    descAs: "দৈনন্দিন চিনাকি বস্তু চাই মনত ৰখাৰ অভ্যাস",
    descHi: "तस्वीरें देखकर कुछ देर बाद याद करने का अभ्यास",
    link: "games/cognitive/picture-recall",
    emoji: "🖼️",
    color: "#4F46E5",
    bg: "#EEF2FF",
    badge: "VISUAL MEMORY",
    categoryId: "memory_recall",
    focusHint: "Working visual memory",
  },
  {
    id: 15,
    slug: "word-recall",
    title: "Word Recall",
    titleAs: "শব্দ মনত ৰখাৰ খেল",
    titleHi: "शब्द स्मरण खेल",
    desc: "Memorize familiar words shown one by one, then identify which word appeared",
    descAs: "ক্ৰমত ওলোৱা শব্দবোৰ মনত ৰাখি সঠিক শব্দটো বাছক",
    descHi: "एक-एक करके दिखाए गए शब्दों को याद रखें और सही शब्द पहचानें",
    link: "games/cognitive/word-recall",
    emoji: "📖",
    color: "#6366F1",
    bg: "#FAF5FF",
    badge: "WORD RECALL",
    categoryId: "memory_recall",
    focusHint: "Short-term verbal recall",
  },
  {
    id: 12,
    slug: "sequence-recall",
    title: "Sequence Recall",
    titleAs: "ক্ৰমিক স্মৃতি খেল",
    titleHi: "क्रम स्मरण खेल",
    desc: "Watch familiar items appear in sequence, remember order, and tap them",
    descAs: "ক্ৰমত ওলোৱা চিনাকি বস্তুবোৰ মনত ৰাখি সঠিক ক্ৰমত বাছনি কৰক",
    descHi: "चित्रों का क्रम ध्यान से देखें और उसी क्रम में चुनकर याददाश्त परखें",
    link: "games/cognitive/sequence-recall",
    emoji: "🔢",
    color: "#4338CA",
    bg: "#EEF2FF",
    badge: "SEQUENCE RECALL",
    categoryId: "memory_recall",
    focusHint: "Sequential working memory",
  },
  {
    id: 2,
    slug: "matching",
    title: "Heritage Motif Match",
    titleAs: "গামোচা আৰু চাহপাত মিলোৱা",
    titleHi: "सांस्कृतिक प्रतीक मिलान",
    desc: "Match traditional Gamosa weaves, Japi, and tea leaves pairs",
    descAs: "গামোচা, জাপি আৰু চাহপাতৰ যোৰ মিলোৱা খেল",
    descHi: "पारंपरिक असमिया प्रतीकों के जोड़े बनाएं",
    link: "games/cognitive/matching",
    emoji: "🧣",
    color: "#7C3AED",
    bg: "#FAF5FF",
    badge: "CULTURAL MOTIFS",
    categoryId: "memory_recall",
    focusHint: "Pattern matching & visual recognition",
  },

  // ── 2. Attention & Perception (4 activities) ────────────────────────────────
  {
    id: 5,
    slug: "find-characters",
    title: "Find the Object",
    titleAs: "বস্তু বিচাৰি উলিয়াওক",
    titleHi: "वस्तु खोजें",
    desc: "Spot the tea kettle, brass bell, or flower among similar choices",
    descAs: "বহুতো বস্তুৰ মাজৰ পৰা সঠিক বস্তুটো চিনাক্ত কৰক",
    descHi: "समान चित्रों में से सही वस्तु पहचानें",
    link: "games/cognitive/find-characters",
    emoji: "🔍",
    color: "#0284C7",
    bg: "#F0F9FF",
    badge: "VISUAL SEARCH",
    categoryId: "attention_perception",
    focusHint: "Focused visual attention",
  },
  {
    id: 13,
    slug: "odd-one-out",
    title: "Odd One Out",
    titleAs: "অমিলটো বিচাৰক",
    titleHi: "अलग चित्र पहचानें",
    desc: "Spot the single unique item among familiar cards across 5 rounds",
    descAs: "একেধৰণৰ ছবিবোৰৰ মাজৰ পৰা অমিল বস্তুটো বাছনি কৰক",
    descHi: "समान चित्रों के समूह में से एक अलग चित्र को पहचानें",
    link: "games/cognitive/odd-one-out",
    emoji: "🔎",
    color: "#0284C7",
    bg: "#F0F9FF",
    badge: "ODD ONE OUT",
    categoryId: "attention_perception",
    focusHint: "Perceptual discrimination",
  },
  {
    id: 14,
    slug: "number-order",
    title: "Number Order",
    titleAs: "সংখ্যাৰ ক্ৰম",
    titleHi: "संख्या क्रम",
    desc: "Tap the numbers in order from smallest to largest across 5 rounds",
    descAs: "সৰুৰ পৰা ডাঙৰলৈ ক্ৰমত সংখ্যাবোৰ বাছনি কৰক",
    descHi: "छोटी से बड़ी संख्याओं को सही क्रम में लगाएं",
    link: "games/cognitive/number-order",
    emoji: "🔢",
    color: "#0369A1",
    bg: "#F0F9FF",
    badge: "NUMBER ORDER",
    categoryId: "attention_perception",
    focusHint: "Sustained numerical focus",
  },
  {
    id: 19,
    slug: "treasure-hunt",
    title: "Treasure Hunt (Spatial Exploration)",
    titleAs: "ৰত্ন সন্ধান (স্থানিক মনোযোগ)",
    titleHi: "खजाना खोज (स्थानिक ध्यान)",
    desc: "Explore the colorful grid and locate target items through spatial search",
    descAs: "ৰঙীন তালিকাৰ মাজৰ পৰা সকলো লক্ষ্য বস্তু বিচাৰি টেপ কৰক",
    descHi: "ग्रिड में से लक्षित वस्तुओं को स्थानिक खोज द्वारा खोजें",
    link: "games/cognitive/treasure-hunt",
    emoji: "🗺️",
    color: "#0EA5E9",
    bg: "#F0F9FF",
    badge: "SPATIAL SEARCH",
    categoryId: "attention_perception",
    focusHint: "Spatial exploration & simple problem solving",
  },

  // ── 3. Language & Association (3 activities) ────────────────────────────────
  {
    id: 7,
    slug: "word-connection",
    title: "Word Connection",
    titleAs: "শব্দ সংযোগ",
    titleHi: "शब्द संबंध",
    desc: "Pick the word that relates best to the presented family stimulus",
    descAs: "সম্পৰ্কিত শব্দটো শুদ্ধকৈ বাছনি কৰক",
    descHi: "पारस्परिक संबंध वाले सही शब्द का चयन करें",
    link: "games/cognitive/word-connection",
    emoji: "🔗",
    color: "#D97706",
    bg: "#FFFBEB",
    badge: "ASSOCIATION",
    categoryId: "language_association",
    focusHint: "Semantic association & retrieval",
  },
  {
    id: 16,
    slug: "picture-association",
    title: "Picture Association",
    titleAs: "ছবিৰ যোৰ মিলোৱা",
    titleHi: "चित्र संबंध",
    desc: "Match familiar everyday objects with their most natural functional pairs",
    descAs: "চিনাকি বস্তুবোৰৰ সৈতে আটাইতকৈ উপযুক্ত সম্পৰ্কিত বস্তুটো বাছক",
    descHi: "दैनिक जीवन की वस्तुओं को उनके सही जोड़ीदार से मिलाएं",
    link: "games/cognitive/picture-association",
    emoji: "🧩",
    color: "#B45309",
    bg: "#FFFBEB",
    badge: "ASSOCIATION",
    categoryId: "language_association",
    focusHint: "Functional object association",
  },
  {
    id: 18,
    slug: "who-am-i",
    title: "Who Am I? (Community Roles)",
    titleAs: "মই কোন? (চিনাকি ব্যক্তি)",
    titleHi: "मैं कौन हूँ? (भूमिका पहचान)",
    desc: "Solve familiar community roles through visual icons and descriptive clues",
    descAs: "সুন্দৰ লক্ষণ আৰু সংকেতৰ সহায়ত সমাজৰ চিনাকি ভূমিকাসমূহ চিনাক্ত কৰক",
    descHi: "संकेतों और लक्षणों के माध्यम से परिचित सामाजिक भूमिकाएं पहचानें",
    link: "games/cognitive/who-am-i",
    emoji: "🎭",
    color: "#F59E0B",
    bg: "#FFFBEB",
    badge: "ROLE RECOGNITION",
    categoryId: "language_association",
    focusHint: "Verbal & social role recognition",
  },

  // ── 4. Planning & Problem Solving (4 activities) ────────────────────────────
  {
    id: 20,
    slug: "rule-switch",
    title: "Change Your Mind (Rule Switch)",
    titleAs: "নিয়ম সলনি খেল",
    titleHi: "नियम बदलो खेल",
    desc: "Adapt to changing selection rules across colors, shapes, and categories",
    descAs: "প্ৰতি পৰ্যায়ত সলনি হোৱা নিয়ম অনুসৰি সঠিক বস্তুবোৰ বাছক",
    descHi: "रंग, आकार और श्रेणी के बदलते नियमों के अनुसार वस्तुएं चुनें",
    link: "games/cognitive/rule-switch",
    emoji: "🔄",
    color: "#059669",
    bg: "#F0FDF4",
    badge: "COGNITIVE FLEXIBILITY",
    categoryId: "planning_problem_solving",
    focusHint: "Mental flexibility & rule switching",
  },
  {
    id: 21,
    slug: "plan-and-do",
    title: "Plan & Do",
    titleAs: "পৰিকল্পনা আৰু ক্ৰম",
    titleHi: "योजना एवं क्रम",
    desc: "Sequence everyday actions to accomplish familiar goals like tea or walking",
    descAs: "দৈনন্দিন পৰিকল্পনাবোৰ সঠিক ক্ৰমত সজাই কামটো সম্পূৰ্ণ কৰক",
    descHi: "दैनिक कार्यों को लक्ष्य प्राप्ति के सही क्रम में लगाएं",
    link: "games/cognitive/plan-and-do",
    emoji: "🎯",
    color: "#047857",
    bg: "#F0FDF4",
    badge: "PRACTICAL PLANNING",
    categoryId: "planning_problem_solving",
    focusHint: "Goal planning & sequential action",
  },
  {
    id: 8,
    slug: "count",
    title: "Bajar Hisab (Count)",
    titleAs: "বজাৰৰ হিচাপ",
    titleHi: "गणना खेल",
    desc: "Gentle traditional market counting and numerical agility practice",
    descAs: "সহজ বজাৰৰ হিচাপ আৰু সংখ্যা গণনা",
    descHi: "सरल दैनिक बाजार हिसाब और संख्यात्मक अभ्यास",
    link: "games/cognitive/count",
    emoji: "🧮",
    color: "#10B981",
    bg: "#F0FDF4",
    badge: "NUMERACY",
    categoryId: "planning_problem_solving",
    focusHint: "Practical math & problem solving",
  },
  {
    id: 6,
    slug: "daily-steps",
    title: "Daily Steps Routine",
    titleAs: "দৈনিক নিয়মৰ ক্ৰম",
    titleHi: "दैनिक दिनचर्या क्रम",
    desc: "Arrange familiar morning tea, bath, and walking steps in order",
    descAs: "পুৱাৰ চাহ, গা-ধোৱা আৰু খোজকঢ়াৰ সঠিক ক্ৰম সজাওক",
    descHi: "रोजमर्रा के कार्यों को सही क्रम में व्यवस्थित करें",
    link: "games/cognitive/daily-steps",
    emoji: "📋",
    color: "#059669",
    bg: "#F0FDF4",
    badge: "FUNCTIONAL SEQUENCING",
    categoryId: "planning_problem_solving",
    focusHint: "Functional everyday sequencing",
  },

  // ── 5. Memory, Reminiscence & Orientation (2 activities) ────────────────────
  {
    id: 4,
    slug: "reminiscence",
    title: "Smriti Manthan (Reminiscence)",
    titleAs: "স্মৃতি মন্থন",
    titleHi: "स्मृति मंथन",
    desc: "Cherished courtyard stories, riverboat travels & festival memories",
    descAs: "মাজুলী আৰু কামৰূপৰ পুৰণি স্মৃতি সুঁৱৰি মনটো সতেজ কৰক",
    descHi: "पारिवारिक एवं ऐतिहासिक यादों की मीठी चर्चा",
    link: "games/cognitive/reminiscence",
    emoji: "🌅",
    color: "#9333EA",
    bg: "#FAF5FF",
    badge: "REMINISCENCE",
    categoryId: "reminiscence_orientation",
    focusHint: "Autobiographical memory & warm reminiscence",
  },
  {
    id: 17,
    slug: "orientation",
    title: "Daily Orientation",
    titleAs: "দৈনিক সময় আৰু দিহ নিৰ্ণয়",
    titleHi: "दैनिक समय एवं अभिमुखीकरण",
    desc: "Gentle awareness questions for today's weekday, month, time of day & location",
    descAs: "আজিৰ বাৰ, মাহ, দিনৰ সময় আৰু পৰিৱেশৰ চিনাকি প্ৰশ্ন",
    descHi: "आज का दिन, महीना, समय और स्थान से संबंधित सरल प्रश्न",
    link: "games/cognitive/orientation",
    emoji: "🧭",
    color: "#7E22CE",
    bg: "#FAF5FF",
    badge: "ORIENTATION",
    categoryId: "reminiscence_orientation",
    focusHint: "Temporal & environmental awareness",
  },

  // ── Extensible: Music & Creative Cognition ──────────────────────────────────
  {
    id: 1,
    slug: "antakshari-battle",
    title: "Antakshari Battle",
    titleAs: "অন্তাক্ষৰী সুৰ সমৰ",
    titleHi: "अंताक्षरी मुकाबला",
    desc: "Recall golden melodies, listen to your companion, and sing your favorite songs",
    descAs: "সোণালী সুৰ সুঁৱৰি সংগীৰ লগত আনন্দৰে অন্তাক্ষৰী খেলক",
    descHi: "सुनहरी यादों के मधुर गीत सुनें और अपने साथी के साथ अंताक्षरी गाएं",
    link: "games/cognitive/antakshari-battle",
    emoji: "🎵",
    color: "#BE123C",
    bg: "#FFF1F2",
    badge: "CULTURAL MELODY",
    categoryId: "music_creative",
    focusHint: "Auditory melody & lyric retrieval",
  },
  {
    id: 101,
    slug: "personalized-recall",
    title: "Personalized Family Recall",
    titleAs: "পৰিয়ালৰ স্মৃতি চিনাক্তকৰণ",
    titleHi: "पारिवारिक स्मृति पहचान",
    desc: "Recognize familiar voices, family photos, and special moments sent by loved ones",
    descAs: "পৰিয়ালে পঠোৱা চিনাকি মাত, ফটো আৰু বিশেষ স্মৃতিবোৰ চিনাক্ত কৰক",
    descHi: "अपनों द्वारा भेजी गई आवाज, तस्वीरें और खास पारिवारिक यादें पहचानें",
    link: "games/cognitive/personalized-recall",
    emoji: "🌟",
    color: "#D97706",
    bg: "#FFFBEB",
    badge: "FAMILY MOMENTS",
    categoryId: "music_creative",
    focusHint: "Personalized family recognition",
  },

  // ── Extensible: Physical & Motor Cognition ──────────────────────────────────
  {
    id: 9,
    slug: "clockwise",
    title: "Clockwise Smooth Pursuit",
    titleAs: "ঘড়ীৰ কাঁটাৰ দিশত চকুৰ গতি",
    titleHi: "दक्षिणावर्त नेत्र गति",
    desc: "Follow the gentle circle with your eyes to stay relaxed and focused",
    descAs: "কেমেৰাৰে চকুৰ ঘূৰ্ণন আৰু মসৃণ গতি পৰীক্ষা",
    descHi: "वृत्ताकार दिशा में आंखें घुमाकर ट्रैकिंग जांचें",
    link: "games/movement/clockwise",
    emoji: "🔄",
    color: "#0891B2",
    bg: "#ECFEFF",
    badge: "VISION CHECK",
    categoryId: "motor_cognition",
    focusHint: "Smooth pursuit visual tracking",
  },
  {
    id: 10,
    slug: "anti-clockwise",
    title: "Anti-Clockwise Pursuit",
    titleAs: "বিপৰীত দিশত চকুৰ গতি",
    titleHi: "वामावर्त नेत्र गति",
    desc: "Smoothly follow the circle in reverse to exercise eye coordination",
    descAs: "ঘড়ীৰ ওলোটা দিশত চকুৰ গতিশীলতা নিৰীক্ষণ",
    descHi: "विपरीत दिशा में आंखों का सुगम संचालन",
    link: "games/movement/anti-clockwise",
    emoji: "🔃",
    color: "#0E7490",
    bg: "#ECFEFF",
    badge: "GENTLE TRACKING",
    categoryId: "motor_cognition",
    focusHint: "Counter-rotational coordination",
  },
  {
    id: 11,
    slug: "target-direction",
    title: "Target Direction Reaction",
    titleAs: "লক্ষ্যলৈ চকুৰ ক্ষিপ্ৰ দৃষ্টি",
    titleHi: "लक्ष्य दिशा निर्धारण",
    desc: "Look at the gentle targets as they appear to test your focus",
    descAs: "হঠাতে ওলোৱা বিন্দুৰ ফালে চকুৰ ক্ষিপ্ৰ প্ৰতিক্ৰিয়া",
    descHi: "त्वरित नेत्र प्रतिक्रिया एवं स्थिरता परीक्षण",
    link: "games/movement/target-direction",
    emoji: "🎯",
    color: "#0891B2",
    bg: "#ECFEFF",
    badge: "QUICK FOCUS",
    categoryId: "motor_cognition",
    focusHint: "Target fixation velocity",
  },
];

// Helper Functions
export function getCoreCategories(): ActivityCategory[] {
  return ACTIVITY_CATEGORIES.filter((c) => c.isCore);
}

export function getAllCategories(): ActivityCategory[] {
  return ACTIVITY_CATEGORIES;
}

export function getCategoryById(categoryId: ActivityCategoryId): ActivityCategory | undefined {
  return ACTIVITY_CATEGORIES.find((c) => c.id === categoryId);
}

export function getCategoryActivities(categoryId: ActivityCategoryId): ActivityItem[] {
  return ALL_ACTIVITIES.filter((a) => a.categoryId === categoryId);
}

export function getActivityCategory(gameIdOrLink: string | number): ActivityCategoryId {
  if (typeof gameIdOrLink === "number") {
    const act = ALL_ACTIVITIES.find((a) => a.id === gameIdOrLink);
    if (act) return act.categoryId;
  }
  const str = String(gameIdOrLink).toLowerCase();
  const act = ALL_ACTIVITIES.find(
    (a) =>
      a.slug.toLowerCase() === str ||
      a.link.toLowerCase().includes(str) ||
      a.title.toLowerCase().includes(str)
  );
  return act ? act.categoryId : "memory_recall";
}
