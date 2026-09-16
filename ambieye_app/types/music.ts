export type MusicCategory =
  | "all"
  | "assamese_folk"
  | "northeast_regional"
  | "hindi_classics"
  | "instrumental"
  | "favorites";

export interface MusicTrack {
  id: string;
  title: string;
  titleAs?: string;
  titleHi?: string;
  artist: string;
  category: "assamese_folk" | "northeast_regional" | "hindi_classics" | "instrumental";
  language: string;
  region: string;
  artworkEmoji: string;
  artworkBg: string;
  borderColor: string;
  accentColor: string;
  audioUri: string;
  durationSeconds: number;
  description: string;
  descriptionAs?: string;
  descriptionHi?: string;
  isFamilyRecommended?: boolean;
  recommendedBy?: string;
}

export type MusicInteractionEventType =
  | "music_play_started"
  | "music_play_paused"
  | "music_play_resumed"
  | "music_play_completed"
  | "music_skipped"
  | "music_favorited"
  | "music_unfavorited"
  | "music_reaction"
  | "sing_along_started";

export type ReminiscenceReactionType = "like" | "familiar" | "talk" | "skip";

export interface MusicInteractionEvent {
  id: string;
  patientId: string;
  sessionId: string;
  trackId: string;
  eventType: MusicInteractionEventType;
  timestamp: string;
  playbackPositionSeconds: number;
  metadata?: {
    trackTitle?: string;
    category?: string;
    language?: string;
    durationSeconds?: number;
    reaction?: ReminiscenceReactionType;
    completionPercent?: number;
    recommendedBy?: string;
    [key: string]: any;
  };
}

export type MusicPlaybackState = "idle" | "loading" | "playing" | "paused" | "finished" | "error";

export interface CaregiverMusicSummary {
  patientId: string;
  totalListeningDurationSeconds: number;
  totalListeningMinutes: number;
  songsStartedCount: number;
  songsCompletedCount: number;
  songsSkippedCount: number;
  favoritesCount: number;
  favoriteTrackIds: string[];
  recentReactions: Array<{
    trackId: string;
    trackTitle: string;
    reaction: string;
    timestamp: string;
  }>;
  preferredCategories: Array<{ category: string; count: number }>;
  preferredLanguages: Array<{ language: string; count: number }>;
  activeDaysLast7: number;
}

/**
 * Curated Dataset of Safe, Culturally Familiar Regional & Classical Melodies.
 * Uses high-quality royalty-free acoustic streams & authentic ambient instrumental soundscapes.
 */
export const CURATED_MUSIC_TRACKS: MusicTrack[] = [
  // ── 1. Assamese / Bihu ──────────────────────────────────────────────────
  {
    id: "as-flute-001",
    title: "Brahmaputra Dawn Flute",
    titleAs: "ব্ৰহ্মপুত্ৰৰ বাঁহীৰ সুৰ",
    titleHi: "ब्रह्मपुत्र भोर बांसुरी",
    artist: "Assam Classical Ensemble",
    category: "assamese_folk",
    language: "Assamese",
    region: "Assam",
    artworkEmoji: "🪈",
    artworkBg: "#FEF3C7",
    borderColor: "#F59E0B",
    accentColor: "#D97706",
    audioUri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    durationSeconds: 154,
    description: "Soothing morning river breezes and traditional bamboo flute tones.",
    descriptionAs: "পুৱাৰ ব্ৰহ্মপুত্ৰৰ স্নিগ্ধ মলয়া আৰু অসমীয়া বাঁহীৰ মিঠা সুৰ।",
    descriptionHi: "ब्रह्मपुत्र नदी की सुबह की शांत हवा और बांसुरी की मीठी धुन।",
    isFamilyRecommended: true,
    recommendedBy: "Anita (Daughter)",
  },
  {
    id: "as-bihu-002",
    title: "Rongali Bihu Dhol & Pepa Rhythm",
    titleAs: "ৰঙালী বিহু ঢোল আৰু পেঁপা",
    titleHi: "रोंगाली बिहू ढोल और पेपा",
    artist: "Traditional Village Troupe",
    category: "assamese_folk",
    language: "Assamese",
    region: "Assam",
    artworkEmoji: "🥁",
    artworkBg: "#FEE2E2",
    borderColor: "#EF4444",
    accentColor: "#DC2626",
    audioUri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    durationSeconds: 168,
    description: "Joyful spring harvest cadence celebrating Assam's cultural heritage.",
    descriptionAs: "বসন্তৰ বতৰত ঢোলৰ চাপ আৰু ম'হৰ শিঙৰ পেঁপাৰ আনন্দময় সুৰ।",
    descriptionHi: "असम के पारंपरिक बिहू उत्सव का आनंदमयी लोक संगीत।",
  },
  {
    id: "as-bhupen-003",
    title: "Manuhe Manuhor Babe Melody",
    titleAs: "মানুহে মানুহৰ বাবে অমৰ সুৰ",
    titleHi: "मनुष्यता का अमर गान",
    artist: "Dr. Bhupen Hazarika Tribute",
    category: "assamese_folk",
    language: "Assamese",
    region: "Assam",
    artworkEmoji: "🎵",
    artworkBg: "#ECFDF5",
    borderColor: "#10B981",
    accentColor: "#059669",
    audioUri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    durationSeconds: 192,
    description: "A timeless acoustic tribute to humanity, empathy, and unity.",
    descriptionAs: "মানৱতা আৰু ভাতৃত্ববোধৰ অমৰ কালজয়ী গীত।",
    descriptionHi: "मानवता और एकता को समर्पित कालातीत संगीत।",
    isFamilyRecommended: true,
    recommendedBy: "Mamoni (ASHA Worker)",
  },
  {
    id: "as-anthem-004",
    title: "O Mur Apunar Desh Acoustic",
    titleAs: "অ' মোৰ আপোনাৰ দেশ",
    titleHi: "ओ मोर आपोनार देश",
    artist: "Lakshminath Bezbaroa Legacy",
    category: "assamese_folk",
    language: "Assamese",
    region: "Assam",
    artworkEmoji: "🌾",
    artworkBg: "#EFF6FF",
    borderColor: "#3B82F6",
    accentColor: "#2563EB",
    audioUri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    durationSeconds: 145,
    description: "Gentle acoustic strings evoking the golden paddy fields of Assam.",
    descriptionAs: "সোণালী ধাননি পথাৰ আৰু মাতৃভূমিৰ প্ৰতি গভীৰ শ্ৰদ্ধা।",
    descriptionHi: "असम की पावन धरती और स्वर्णिम खेतों की मधुर धुन।",
  },

  // ── 2. Northeast Regional ───────────────────────────────────────────────
  {
    id: "ne-naga-001",
    title: "Naga Hills Choral Harmony",
    titleAs: "নাগালেণ্ডৰ পাহাৰীয়া লোকগীত",
    titleHi: "नागालैंड का लोक गायन",
    artist: "Kohima Fellowship Troupe",
    category: "northeast_regional",
    language: "Naga Folk",
    region: "Nagaland",
    artworkEmoji: "⛰️",
    artworkBg: "#FAF5FF",
    borderColor: "#A855F7",
    accentColor: "#9333EA",
    audioUri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    durationSeconds: 175,
    description: "Peaceful choral resonance from the pine forests of Nagaland.",
    descriptionAs: "নাগালেণ্ডৰ পাইন বননিৰ মাজেৰে প্ৰতিধ্বনিত হোৱা শান্তিৰ সুৰ।",
    descriptionHi: "नागालैंड की वादियों से शांत और प्रेरणादायक सामूहिक गायन।",
  },
  {
    id: "ne-khasi-002",
    title: "Khasi Hills Mountain Breeze",
    titleAs: "খাচী পাহাৰৰ মলয়া",
    titleHi: "खासी पहाड़ियों की शीतल हवा",
    artist: "Meghalaya Acoustic Ensemble",
    category: "northeast_regional",
    language: "Khasi",
    region: "Meghalaya",
    artworkEmoji: "🍃",
    artworkBg: "#F0FDF4",
    borderColor: "#4ADE80",
    accentColor: "#16A34A",
    audioUri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    durationSeconds: 160,
    description: "Gentle rain and acoustic flute honoring the clouds of Cherrapunji.",
    descriptionAs: "মেঘালায়ৰ মেঘ আৰু শীতল বতাহৰ মৃদু শব্দত সাজি তোলা বাঁহী।",
    descriptionHi: "मेघालय की बारिश और पहाड़ी बांसुरी की शांत स्वरलहरी।",
  },
  {
    id: "ne-mizo-003",
    title: "Mizo Cheraw Bamboo Rhythm",
    titleAs: "মিজো চেৰাও বাঁহৰ ছন্দ",
    titleHi: "मिज़ो चेराव बांस नृत्य लय",
    artist: "Aizawl Cultural Troupe",
    category: "northeast_regional",
    language: "Mizo",
    region: "Mizoram",
    artworkEmoji: "🎋",
    artworkBg: "#FFFBEB",
    borderColor: "#FBBF24",
    accentColor: "#D97706",
    audioUri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    durationSeconds: 150,
    description: "Uplifting rhythmic cadence of the traditional bamboo dance.",
    descriptionAs: "পৰম্পৰাগত বাঁহ নৃত্যৰ আনন্দময় ছন্দ আৰু তাল।",
    descriptionHi: "मिजोरम के पारंपरिक चेराव बांस नृत्य की ऊर्जावान लय।",
  },

  // ── 3. Hindi Classics ───────────────────────────────────────────────────
  {
    id: "hn-classic-001",
    title: "Mera Joota Hai Japani Vintage",
    titleAs: "মেৰা জুতা হে জাপানী সুৰ",
    titleHi: "मेरा जूता है जापानी",
    artist: "Golden Era Tribute",
    category: "hindi_classics",
    language: "Hindi",
    region: "Pan-India",
    artworkEmoji: "🎩",
    artworkBg: "#FFF1F2",
    borderColor: "#FB7185",
    accentColor: "#E11D48",
    audioUri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    durationSeconds: 180,
    description: "Cheerful 1950s classic melody that sparks warm, happy reminiscence.",
    descriptionAs: "সোণালী যুগৰ এটি মন ভৰা আৰু স্মৃতি সজীৱ কৰা অমৰ গীত।",
    descriptionHi: "1950 के दशक का सदाबहार और मन को प्रसन्न करने वाला गीत।",
  },
  {
    id: "hn-classic-002",
    title: "Yeh Shaam Mastani Acoustic",
    titleAs: "য়েহ শাম মস্তানী সুৰ",
    titleHi: "ये शाम मस्तानी",
    artist: "Kishore Kumar Tribute",
    category: "hindi_classics",
    language: "Hindi",
    region: "Pan-India",
    artworkEmoji: "🌅",
    artworkBg: "#FEF9C3",
    borderColor: "#FACC15",
    accentColor: "#CA8A04",
    audioUri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
    durationSeconds: 195,
    description: "A calming evening acoustic melody evoking peace and contentment.",
    descriptionAs: "সন্ধ্যা সময়ৰ শান্ত আৰু মধুৰ অনুভৱ জগাই তোলা এক সুৰ।",
    descriptionHi: "शाम के समय मन को सुकून देने वाली मधुर धुन।",
    isFamilyRecommended: true,
    recommendedBy: "Priya (Daughter-in-law)",
  },
  {
    id: "hn-classic-003",
    title: "Pyaar Hua Iqraar Hua Soft Strings",
    titleAs: "প্যাৰ হুৱা ইকৰাৰ হুৱা",
    titleHi: "प्यार हुआ इकरार हुआ",
    artist: "Vintage Monsoon Ensemble",
    category: "hindi_classics",
    language: "Hindi",
    region: "Pan-India",
    artworkEmoji: "☂️",
    artworkBg: "#E0F2FE",
    borderColor: "#38BDF8",
    accentColor: "#0284C7",
    audioUri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
    durationSeconds: 170,
    description: "Gentle violin strings and soft rain reflecting a legendary romance.",
    descriptionAs: "বৰষুণৰ টোপাল আৰু বেহেলাৰ সুৰেৰে সজা ৰোমাণ্টিক স্মৃতি।",
    descriptionHi: "रिमझिम बारिश और वायलिन की मधुर सदाबहार धुन।",
  },

  // ── 4. Instrumental & Meditative ────────────────────────────────────────
  {
    id: "inst-kirtan-001",
    title: "Sandhya Naam Kirtan & Tanpura",
    titleAs: "সন্ধ্যা নাম কীৰ্তন আৰু তানপুৰা",
    titleHi: "संध्या नाम कीर्तन और तानपुरा",
    artist: "Sattriya Devotional Strings",
    category: "instrumental",
    language: "Assamese",
    region: "Majuli",
    artworkEmoji: "🌸",
    artworkBg: "#FDF2F8",
    borderColor: "#F472B6",
    accentColor: "#DB2777",
    audioUri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3",
    durationSeconds: 210,
    description: "Deep spiritual serenity from the ancient Xatras of Majuli island.",
    descriptionAs: "মাজুলীৰ সত্ৰৰ সন্ধিয়াৰ শান্ত নাম আৰু তানপুৰাৰ প্ৰশান্তি।",
    descriptionHi: "माजुली के पवित्र सत्रों से संध्या कीर्तन और तानपुरा की शांति।",
  },
  {
    id: "inst-rain-002",
    title: "Rain on Courtyard Roof",
    titleAs: "চোতালৰ চালত বৰষুণৰ শব্দ",
    titleHi: "आंगन की छत पर बारिश",
    artist: "Nature & Acoustic Sitar",
    category: "instrumental",
    language: "Instrumental",
    region: "Assam",
    artworkEmoji: "🌧️",
    artworkBg: "#F1F5F9",
    borderColor: "#94A3B8",
    accentColor: "#475569",
    audioUri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    durationSeconds: 240,
    description: "Natural relaxation soundscape proven to reduce afternoon sundowning stress.",
    descriptionAs: "সন্ধিয়াৰ উদ্বেগ হ্ৰাস কৰিবলৈ প্ৰাকৃতিক বৰষুণৰ শান্ত সংগীত।",
    descriptionHi: "शाम के तनाव को शांत करने वाली प्राकृतिक बारिश की आवाज।",
  },
];
