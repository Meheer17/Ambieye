import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "@/constants/i18n";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import { useAuth } from "@/hooks/useAuth";
import { dementiaCareStorage } from "@/utils/dementiaCareStorage";
import { CaregiverActivitiesScreen } from "@/components/caregiver/CaregiverActivitiesScreen";
import { Colors, BorderRadius, Shadows } from "@/constants/theme";

export default function GamesScreen() {
  const router = useRouter();
  const { username } = useAuth();
  const { t, currentLang } = useTranslation();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const [activeCategory, setActiveCategory] = useState<"memory" | "attention" | "gaze">("memory");
  const [viewMode, setViewMode] = useState<"elderly" | "caregiver">("elderly");

  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        const activeMode = await AsyncStorage.getItem("ambieye_active_mode");
        const savedMode = await dementiaCareStorage.getActiveViewMode();
        if (activeMode === "caregiver" || username?.toLowerCase() === "caregiver") {
          setViewMode("caregiver");
        } else {
          setViewMode(savedMode);
        }
      })();

      const categoryValue = Array.isArray(category) ? category[0] : category;
      if (!categoryValue) return;
      const normalized = categoryValue.toLowerCase();
      if (normalized === "memory" || normalized === "attention" || normalized === "gaze") {
        setActiveCategory(normalized as any);
      }
    }, [category, username])
  );

  if (viewMode === "caregiver") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FDFBF7" }} edges={["top"]}>
        <CaregiverActivitiesScreen />
      </SafeAreaView>
    );
  }

  const categories = [
    {
      key: "memory",
      label: currentLang === "as" ? "স্মৃতি শক্তি" : currentLang === "hi" ? "स्मृति खेल" : "Memory",
      icon: "brain",
      activeBg: "#6366F1",
      activeText: "#FFFFFF",
      tintBg: "#FAF5FF",
      border: "#E0E7FF",
      tintText: "#4F46E5",
    },
    {
      key: "attention",
      label: currentLang === "as" ? "মনোযোগ" : currentLang === "hi" ? "ध्यान एवं खोज" : "Attention",
      icon: "eye",
      activeBg: "#0284C7",
      activeText: "#FFFFFF",
      tintBg: "#F0F9FF",
      border: "#BAE6FD",
      tintText: "#0369A1",
    },
    {
      key: "gaze",
      label: currentLang === "as" ? "চকুৰ পৰীক্ষা" : currentLang === "hi" ? "नेत्र ट्रैकिंग" : "Gaze Biomarkers",
      icon: "camera",
      activeBg: "#059669",
      activeText: "#FFFFFF",
      tintBg: "#F0FDF4",
      border: "#A7F3D0",
      tintText: "#15803D",
    },
  ];

  const gamesData = {
    memory: [
      {
        id: 1,
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
      },
      {
        id: 2,
        title: "Heritage Motif Match",
        titleAs: "গামোচা আৰু চাহপাত মিলোৱা",
        titleHi: "सांस्कृतिक प्रतीक मिलान",
        desc: "Match traditional Gamosa weaves, Japi, and tea leaves pairs",
        descAs: "গামোচা, জাপি আৰু চাহপাতৰ যোৰ মিলোৱা খেল",
        descHi: "पारंपरिक असमिया प्रतीकों के जोड़े बनाएं",
        link: "games/cognitive/matching",
        emoji: "🧣",
        color: "#6366F1",
        bg: "#FAF5FF",
        badge: "CULTURAL MOTIFS",
      },
      {
        id: 3,
        title: "Picture Recall",
        titleAs: "ছবি মনত ৰখাৰ খেল",
        titleHi: "तस्वीर स्मरण",
        desc: "Timed visual memorization & recall test with everyday items",
        descAs: "দৈনন্দিন চিনাকি বস্তু চাই মনত ৰখাৰ অভ্যাস",
        descHi: "तस्वीरें देखकर कुछ देर बाद याद करने का अभ्यास",
        link: "games/cognitive/picture-recall",
        emoji: "🖼️",
        color: "#0284C7",
        bg: "#F0F9FF",
        badge: "VISUAL MEMORY",
      },
      {
        id: 4,
        title: "Smriti Monthan (Reminiscence)",
        titleAs: "স্মৃতি মন্থন",
        titleHi: "स्मृति मंथन",
        desc: "Cherished courtyard stories, riverboat travels & festival memories",
        descAs: "মাজুলী আৰু কামৰূপৰ পুৰণি স্মৃতি সুঁৱৰি মনটো সতেজ কৰক",
        descHi: "पारिवारिक एवं ऐतिहासिक यादों की मीठी चर्चा",
        link: "games/cognitive/reminiscence",
        emoji: "🌅",
        color: "#B45309",
        bg: "#FFFBEB",
        badge: "REMINISCENCE",
      },
    ],
    attention: [
      {
        id: 5,
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
      },
      {
        id: 6,
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
        badge: "SEQUENCING",
      },
      {
        id: 7,
        title: "Word Connection",
        titleAs: "শব্দ সংযোগ",
        titleHi: "शब्द संबंध",
        desc: "Pick the word that relates best to the presented family stimulus",
        descAs: "সম্পৰ্কিত শব্দটো শুদ্ধকৈ বাছনি কৰক",
        descHi: "पारस्परिक संबंध वाले सही शब्द का चयन करें",
        link: "games/cognitive/word-connection",
        emoji: "🔗",
        color: "#6366F1",
        bg: "#FAF5FF",
        badge: "ASSOCIATION",
      },
      {
        id: 8,
        title: "Bajar Hisab (Count)",
        titleAs: "বজাৰৰ হিচাপ",
        titleHi: "गणना खेल",
        desc: "Gentle traditional market counting and mental agility practice",
        descAs: "সহজ বজাৰৰ হিচাপ আৰু সংখ্যা গণনা",
        descHi: "सरल दैनिक बाजार हिसाब और संख्यात्मक अभ्यास",
        link: "games/cognitive/count",
        emoji: "🧮",
        color: "#B45309",
        bg: "#FFFBEB",
        badge: "NUMERACY",
      },
    ],
    gaze: [
      {
        id: 9,
        title: "Clockwise Smooth Pursuit",
        titleAs: "ঘড়ীৰ কাঁটাৰ দিশত চকুৰ গতি",
        titleHi: "दक्षिणावर्त नेत्र गति",
        desc: "Circular ocular pursuit tracking calibrated by phone front camera",
        descAs: "কেমেৰাৰে চকুৰ ঘূৰ্ণন আৰু মসৃণ গতি পৰীক্ষা",
        descHi: "वृत्ताकार दिशा में आंखें घुमाकर ट्रैकिंग जांचें",
        link: "games/movement/clockwise",
        emoji: "🔄",
        color: "#6366F1",
        bg: "#FAF5FF",
        badge: "OPENCV BIOMARKER",
      },
      {
        id: 10,
        title: "Anti-Clockwise Pursuit",
        titleAs: "বিপৰীত দিশত চকুৰ গতি",
        titleHi: "वामावर्त नेत्र गति",
        desc: "Counter-rotation smooth ocular tracking for cognitive stability",
        descAs: "ঘড়ীৰ ওলোটা দিশত চকুৰ গতিশীলতা নিৰীক্ষণ",
        descHi: "विपरीत दिशा में आंखों का सुगम संचालन",
        link: "games/movement/anti-clockwise",
        emoji: "🔃",
        color: "#059669",
        bg: "#F0FDF4",
        badge: "SMOOTH PURSUIT",
      },
      {
        id: 11,
        title: "Target Direction Saccades",
        titleAs: "লক্ষ্যলৈ চকুৰ ক্ষিপ্ৰ দৃষ্টি",
        titleHi: "लक्ष्य दिशा निर्धारण",
        desc: "Rapid gaze shift fixation test to assess saccadic reaction velocity",
        descAs: "হঠাতে ওলোৱা বিন্দুৰ ফালে চকুৰ ক্ষিপ্ৰ প্ৰতিক্ৰিয়া",
        descHi: "त्वरित नेत्र प्रतिक्रिया एवं स्थिरता परीक्षण",
        link: "games/movement/target-direction",
        emoji: "🎯",
        color: "#D97706",
        bg: "#FFF7ED",
        badge: "SACCADIC FIXATION",
      },
    ],
  };

  const handleLaunchGame = (link: string, title?: string) => {
    if (title) VoiceAssistant.speak(title, currentLang);
    router.push(`/(patient)/(stack)/${link}` as any);
  };
  const handleNavigateToGame = (gameLink: string) => handleLaunchGame(gameLink);

  const currentCategoryGames = gamesData[activeCategory];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Bar */}
        <View style={styles.header}>
          <View style={styles.headerTagPill}>
            <Text style={styles.headerTagText}>NEURO-COGNITIVE WELLNESS</Text>
          </View>
          <Text style={styles.headerTitle}>
            {currentLang === "as" ? "মগজু আৰু স্মৃতিৰ খেল" : currentLang === "hi" ? "मस्तिष्क एवं स्मृति खेल" : "Mind & Memory Games"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {currentLang === "as"
              ? "দৈনিক স্মৃতি শক্তি, মনোযোগ আৰু চকুৰ গতিশীলতা পৰীক্ষা"
              : currentLang === "hi"
              ? "दैनिक स्मृति, ध्यान एवं नेत्र गतिशीलता के मनोरंजक खेल"
              : "Daily cognitive recall, visual attention & ocular biomarker exercises"}
          </Text>
        </View>

        {/* 3 Large Aesthetic Category Pills */}
        <View style={styles.categoryPills}>
          {categories.map((cat) => {
            const isSelected = activeCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryPill,
                  isSelected
                    ? { backgroundColor: cat.activeBg, borderColor: cat.activeBg }
                    : { backgroundColor: cat.tintBg, borderColor: cat.border },
                ]}
                onPress={() => setActiveCategory(cat.key as any)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={cat.icon as any}
                  size={18}
                  color={isSelected ? cat.activeText : cat.tintText}
                />
                <Text
                  style={[
                    styles.categoryPillText,
                    { color: isSelected ? cat.activeText : cat.tintText },
                  ]}
                  numberOfLines={1}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Game Cards List */}
        <View style={styles.gamesList}>
          {currentCategoryGames.map((game) => {
            const title = currentLang === "as" ? game.titleAs : currentLang === "hi" ? game.titleHi : game.title;
            const desc = currentLang === "as" ? game.descAs : currentLang === "hi" ? game.descHi : game.desc;
            return (
              <TouchableOpacity
                key={game.id}
                style={styles.gameCard}
                onPress={() => handleLaunchGame(game.link, title)}
                activeOpacity={0.85}
              >
                <View style={[styles.gameEmojiBg, { backgroundColor: game.bg, borderColor: `${game.color}30` }]}>
                  <Text style={styles.gameEmoji}>{game.emoji}</Text>
                </View>

                <View style={styles.gameInfo}>
                  <View style={[styles.badgeWrapper, { backgroundColor: game.bg }]}>
                    <Text style={[styles.badgeText, { color: game.color }]}>{game.badge}</Text>
                  </View>
                  <Text style={styles.gameTitle} numberOfLines={1}>
                    {title}
                  </Text>
                  <Text style={styles.gameDesc} numberOfLines={2}>
                    {desc}
                  </Text>

                  <View style={styles.playRow}>
                    <Text style={[styles.playNowText, { color: game.color }]}>
                      {currentLang === "as" ? "এতিয়াই খেলক" : currentLang === "hi" ? "खेल शुरू करें" : "Play Exercise"}
                    </Text>
                    <Feather name="arrow-right" size={14} color={game.color} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFC",
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 12,
  },
  headerTagPill: {
    alignSelf: "flex-start",
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E0E7FF",
    marginBottom: 6,
  },
  headerTagText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#4F46E5",
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E2024",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 3,
    lineHeight: 18,
  },
  categoryPills: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  categoryPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderWidth: 1.5,
    gap: 4,
  },
  categoryPillText: {
    fontSize: 11.5,
    fontWeight: "700",
    textAlign: "center",
  },
  gamesList: {
    gap: 10,
  },
  gameCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#EAE7E1",
    shadowColor: "#A8A29E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    alignItems: "center",
    gap: 12,
  },
  gameEmojiBg: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  gameEmoji: {
    fontSize: 30,
  },
  gameInfo: {
    flex: 1,
  },
  badgeWrapper: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  gameTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#1E2024",
    marginBottom: 2,
  },
  gameDesc: {
    fontSize: 11.5,
    color: "#64748B",
    lineHeight: 16,
    marginBottom: 6,
  },
  playRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  playNowText: {
    fontSize: 12,
    fontWeight: "800",
  },
});
