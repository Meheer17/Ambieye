import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useTranslation } from "@/constants/i18n";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import { useAuth } from "@/hooks/useAuth";
import { AestheticTheme } from "@/constants/theme";
import {
  ActivityCategoryId,
  ActivityCategory,
  ActivityItem,
  ACTIVITY_CATEGORIES,
  ALL_ACTIVITIES,
  getCoreCategories,
  getAllCategories,
  getCategoryById,
  getCategoryActivities,
} from "@/constants/activityCategories";

// Visual motif illustration for each game
interface VisualProps {
  id: number;
  color: string;
  bg: string;
  emoji: string;
  isHero?: boolean;
}

const GameVisualPreview: React.FC<VisualProps> = ({ id, color, bg, emoji, isHero }) => {
  const containerSize = isHero ? 72 : 60;

  const renderVisualMotif = () => {
    switch (id) {
      case 101: // Personalized Family Recall
        return (
          <View style={styles.motifPolaroid}>
            <View style={[styles.motifPolaroidInner, { borderColor: `${color}40` }]}>
              <Feather name="heart" size={isHero ? 20 : 16} color="#DC2626" />
              <View style={styles.motifStarsRow}>
                <Text style={{ fontSize: 10 }}>✨</Text>
                <Text style={{ fontSize: 12 }}>📸</Text>
                <Text style={{ fontSize: 10 }}>✨</Text>
              </View>
            </View>
          </View>
        );

      case 1: // Antakshari Battle
        return (
          <View style={styles.motifAudioWave}>
            <View style={[styles.waveBar, { height: 12, backgroundColor: color }]} />
            <View style={[styles.waveBar, { height: 26, backgroundColor: color }]} />
            <View style={[styles.waveBar, { height: 18, backgroundColor: color }]} />
            <View style={[styles.waveBar, { height: 30, backgroundColor: color }]} />
            <View style={[styles.waveBar, { height: 14, backgroundColor: color }]} />
            <MaterialCommunityIcons name="microphone-variant" size={16} color={color} style={{ marginLeft: 3 }} />
          </View>
        );

      case 2: // Heritage Motif Match
        return (
          <View style={styles.motifMatch}>
            <View style={[styles.motifDiamond, { backgroundColor: `${color}25`, borderColor: color }]}>
              <MaterialCommunityIcons name="puzzle" size={16} color={color} />
            </View>
            <View style={[styles.motifDiamond, { backgroundColor: `${color}25`, borderColor: color, marginLeft: -8 }]}>
              <MaterialCommunityIcons name="cards-playing-outline" size={16} color={color} />
            </View>
          </View>
        );

      case 3: // Picture Recall
        return (
          <View style={[styles.motifCanvasFrame, { borderColor: color }]}>
            <Feather name="maximize" size={22} color={color} />
            <MaterialCommunityIcons name="image-filter-vintage" size={16} color={color} style={styles.motifAbsoluteCenter} />
          </View>
        );

      case 4: // Smriti Manthan (Reminiscence)
        return (
          <View style={styles.motifSunrise}>
            <Feather name="sun" size={20} color="#F59E0B" />
            <View style={[styles.motifRiverLine, { backgroundColor: color }]} />
            <View style={[styles.motifRiverLine, { width: 26, backgroundColor: `${color}80` }]} />
          </View>
        );

      case 12: // Sequence Recall
        return (
          <View style={styles.motifSeqRow}>
            <View style={[styles.seqDot, { backgroundColor: "#EF4444" }]}>
              <Text style={styles.seqDotText}>1</Text>
            </View>
            <Feather name="chevron-right" size={10} color="#94A3B8" />
            <View style={[styles.seqDot, { backgroundColor: "#3B82F6" }]}>
              <Text style={styles.seqDotText}>2</Text>
            </View>
            <Feather name="chevron-right" size={10} color="#94A3B8" />
            <View style={[styles.seqDot, { backgroundColor: "#10B981" }]}>
              <Text style={styles.seqDotText}>3</Text>
            </View>
          </View>
        );

      case 15: // Word Recall
        return (
          <View style={[styles.motifBookCard, { borderColor: `${color}50` }]}>
            <Feather name="book-open" size={18} color={color} />
            <View style={styles.motifLetterBadges}>
              <Text style={[styles.miniLetter, { color }]}>A</Text>
              <Text style={[styles.miniLetter, { color }]}>B</Text>
              <Text style={[styles.miniLetter, { color }]}>C</Text>
            </View>
          </View>
        );

      case 16: // Picture Association
        return (
          <View style={styles.motifAssocRow}>
            <View style={[styles.assocNode, { borderColor: color }]}>
              <Text style={{ fontSize: 13 }}>☕</Text>
            </View>
            <Feather name="link-2" size={13} color={color} />
            <View style={[styles.assocNode, { borderColor: color }]}>
              <Text style={{ fontSize: 13 }}>🥛</Text>
            </View>
          </View>
        );

      case 17: // Daily Orientation
        return (
          <View style={[styles.motifCompass, { borderColor: color }]}>
            <Feather name="compass" size={24} color={color} />
            <View style={styles.motifClockHands} />
          </View>
        );

      case 18: // Who Am I?
        return (
          <View style={styles.motifMaskRow}>
            <MaterialCommunityIcons name="drama-masks" size={22} color={color} />
            <Feather name="help-circle" size={13} color="#D97706" style={{ marginTop: -6, marginLeft: -4 }} />
          </View>
        );

      case 5: // Find the Object
        return (
          <View style={styles.motifRadar}>
            <View style={[styles.radarCircle, { borderColor: color }]} />
            <Feather name="search" size={18} color={color} />
            <View style={[styles.radarPing, { backgroundColor: color }]} />
          </View>
        );

      case 6: // Daily Steps Routine
        return (
          <View style={styles.motifStepsRow}>
            <View style={[styles.stepPill, { backgroundColor: `${color}20`, borderColor: color }]}>
              <Text style={[styles.stepNum, { color }]}>①</Text>
            </View>
            <Feather name="arrow-right" size={10} color={color} />
            <View style={[styles.stepPill, { backgroundColor: `${color}20`, borderColor: color }]}>
              <Text style={[styles.stepNum, { color }]}>②</Text>
            </View>
            <Feather name="arrow-right" size={10} color={color} />
            <View style={[styles.stepPill, { backgroundColor: color }]}>
              <Feather name="check" size={10} color="#FFF" />
            </View>
          </View>
        );

      case 7: // Word Connection
        return (
          <View style={styles.motifNetwork}>
            <MaterialCommunityIcons name="transit-connection-variant" size={22} color={color} />
          </View>
        );

      case 8: // Bajar Hisab (Count)
        return (
          <View style={styles.motifCoins}>
            <View style={[styles.coin, { backgroundColor: "#FBBF24", borderColor: "#D97706" }]}>
              <Text style={styles.coinText}>₹</Text>
            </View>
            <View style={[styles.coin, { backgroundColor: "#FDE68A", borderColor: "#D97706", marginLeft: -8, marginTop: 4 }]}>
              <Text style={styles.coinText}>₹</Text>
            </View>
            <MaterialCommunityIcons name="calculator-variant" size={15} color={color} style={{ marginLeft: 3 }} />
          </View>
        );

      case 13: // Odd One Out
        return (
          <View style={styles.motifGrid2x2}>
            <View style={styles.motifMiniRow}>
              <MaterialCommunityIcons name="circle" size={9} color="#94A3B8" />
              <MaterialCommunityIcons name="circle" size={9} color="#94A3B8" />
            </View>
            <View style={styles.motifMiniRow}>
              <MaterialCommunityIcons name="circle" size={9} color="#94A3B8" />
              <MaterialCommunityIcons name="star" size={11} color={color} />
            </View>
          </View>
        );

      case 14: // Number Order
        return (
          <View style={styles.motifPodium}>
            <View style={[styles.podiumBar, { height: 13, backgroundColor: `${color}40` }]}>
              <Text style={styles.podiumText}>2</Text>
            </View>
            <View style={[styles.podiumBar, { height: 20, backgroundColor: `${color}80` }]}>
              <Text style={styles.podiumText}>5</Text>
            </View>
            <View style={[styles.podiumBar, { height: 28, backgroundColor: color }]}>
              <Text style={[styles.podiumText, { color: "#FFF" }]}>9</Text>
            </View>
          </View>
        );

      case 19: // Treasure Hunt
        return (
          <View style={styles.motifTreasure}>
            <MaterialCommunityIcons name="map-marker-path" size={22} color={color} />
            <Text style={{ fontSize: 9, color: "#DC2626", fontWeight: "900" }}>✕</Text>
          </View>
        );

      case 20: // Rule Switch
        return (
          <View style={styles.motifSwitch}>
            <MaterialCommunityIcons name="swap-horizontal-bold" size={24} color={color} />
          </View>
        );

      case 21: // Plan & Do
        return (
          <View style={[styles.motifClipboard, { borderColor: color }]}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={20} color={color} />
          </View>
        );

      case 9: // Clockwise Pursuit
        return (
          <View style={[styles.motifOrbit, { borderColor: `${color}60` }]}>
            <MaterialCommunityIcons name="rotate-right" size={24} color={color} />
            <View style={[styles.orbitTrackerDot, { backgroundColor: color, top: 2, right: 4 }]} />
          </View>
        );

      case 10: // Anti-Clockwise Pursuit
        return (
          <View style={[styles.motifOrbit, { borderColor: `${color}60` }]}>
            <MaterialCommunityIcons name="rotate-left" size={24} color={color} />
            <View style={[styles.orbitTrackerDot, { backgroundColor: color, top: 2, left: 4 }]} />
          </View>
        );

      case 11: // Target Direction Saccades
        return (
          <View style={styles.motifBullseye}>
            <MaterialCommunityIcons name="crosshairs-gps" size={24} color={color} />
            <View style={[styles.bullseyeFlash, { backgroundColor: color }]} />
          </View>
        );

      default:
        return <Text style={{ fontSize: isHero ? 28 : 22 }}>{emoji}</Text>;
    }
  };

  return (
    <View
      style={[
        styles.visualContainer,
        {
          width: containerSize,
          height: containerSize,
          backgroundColor: bg,
          borderColor: `${color}35`,
        },
      ]}
    >
      {renderVisualMotif()}
    </View>
  );
};

export default function GamesScreen() {
  const router = useRouter();
  const { username } = useAuth();
  const { t, currentLang } = useTranslation();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const { width } = useWindowDimensions();

  // Category-First State: null = Category Selection Overview; non-null = Activities in that Category
  const [selectedCategoryId, setSelectedCategoryId] = useState<ActivityCategoryId | null>(null);

  // Sync category route param if passed from external link (e.g., Home screen widgets)
  useFocusEffect(
    React.useCallback(() => {
      const categoryValue = Array.isArray(category) ? category[0] : category;
      if (!categoryValue) return;

      const normalized = categoryValue.toLowerCase();
      // Map legacy or direct category keys
      if (normalized === "memory" || normalized === "memory_recall") {
        setSelectedCategoryId("memory_recall");
      } else if (normalized === "attention" || normalized === "attention_perception") {
        setSelectedCategoryId("attention_perception");
      } else if (normalized === "language" || normalized === "language_association") {
        setSelectedCategoryId("language_association");
      } else if (normalized === "planning" || normalized === "planning_problem_solving") {
        setSelectedCategoryId("planning_problem_solving");
      } else if (normalized === "reminiscence" || normalized === "reminiscence_orientation") {
        setSelectedCategoryId("reminiscence_orientation");
      } else if (normalized === "music" || normalized === "music_creative") {
        setSelectedCategoryId("music_creative");
      } else if (normalized === "gaze" || normalized === "motor_cognition") {
        setSelectedCategoryId("motor_cognition");
      }

      return () => {
        VoiceAssistant.stop();
      };
    }, [category])
  );

  const coreCategories = getCoreCategories();
  const allCategories = getAllCategories();
  const extensibleCategories = allCategories.filter((c) => !c.isCore);

  const selectedCategory = selectedCategoryId ? getCategoryById(selectedCategoryId) : null;
  const currentCategoryActivities = selectedCategoryId ? getCategoryActivities(selectedCategoryId) : [];

  const handleLaunchGame = (link: string, title?: string) => {
    if (title) VoiceAssistant.speak(title, currentLang);
    router.push(`/(patient)/(stack)/${link}` as any);
  };

  const handleSelectCategory = (cat: ActivityCategory) => {
    setSelectedCategoryId(cat.id);
    const catTitle = currentLang === "as" ? cat.titleAs : currentLang === "hi" ? cat.titleHi : cat.title;
    VoiceAssistant.speak(catTitle, currentLang);
  };

  const handleBackToCategories = () => {
    setSelectedCategoryId(null);
    const backMsg = currentLang === "as" ? "শিতানসমূহ" : currentLang === "hi" ? "सभी श्रेणियां" : "All Categories";
    VoiceAssistant.speak(backMsg, currentLang);
  };

  const getPlayButtonText = () => {
    if (currentLang === "as") return "খেলক";
    if (currentLang === "hi") return "खेलें";
    return "Play";
  };

  const getLocalizedTitle = (item: { title: string; titleAs: string; titleHi: string }) => {
    if (currentLang === "as") return item.titleAs;
    if (currentLang === "hi") return item.titleHi;
    return item.title;
  };

  const getLocalizedDesc = (item: { desc?: string; descAs?: string; descHi?: string; description?: string; descriptionAs?: string; descriptionHi?: string }) => {
    if (currentLang === "as") return item.descAs || item.descriptionAs || "";
    if (currentLang === "hi") return item.descHi || item.descriptionHi || "";
    return item.desc || item.description || "";
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.ambientAuraTop} pointerEvents="none" />
      <View style={styles.ambientAuraBottom} pointerEvents="none" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* =========================================================================
            STATE 1: SELECTED CATEGORY VIEW (Activities inside selected category)
           ========================================================================= */}
        {selectedCategory ? (
          <View>
            {/* Elderly-Friendly Large "Back to Categories" Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToCategories}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Back to Categories"
            >
              <Feather name="arrow-left" size={22} color="#0F172A" />
              <Text style={styles.backButtonText}>
                {currentLang === "as"
                  ? "← শিতানসমূহলৈ উভতি যাওক"
                  : currentLang === "hi"
                  ? "← सभी श्रेणियां"
                  : "← Back to Categories"}
              </Text>
            </TouchableOpacity>

            {/* Category Header Banner */}
            <View
              style={[
                styles.categoryBanner,
                {
                  backgroundColor: selectedCategory.bgColor,
                  borderColor: selectedCategory.borderColor,
                },
              ]}
            >
              <View style={styles.categoryBannerTop}>
                <View
                  style={[
                    styles.categoryBannerIconBox,
                    { backgroundColor: "#FFFFFF", borderColor: selectedCategory.borderColor },
                  ]}
                >
                  <Text style={{ fontSize: 32 }}>{selectedCategory.icon}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.categoryBannerTitle, { color: selectedCategory.tintText }]}>
                    {getLocalizedTitle(selectedCategory)}
                  </Text>
                  <View style={[styles.countPill, { backgroundColor: "#FFFFFF" }]}>
                    <Text style={[styles.countPillText, { color: selectedCategory.tintText }]}>
                      {currentCategoryActivities.length}{" "}
                      {currentLang === "as" ? "টা খেল উপলব্ধ" : currentLang === "hi" ? "गतिविधियां" : "Activities"}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.categoryBannerDesc}>
                {getLocalizedDesc(selectedCategory)}
              </Text>
            </View>

            {/* Activities Section Header */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                {currentLang === "as"
                  ? "এই শিতানৰ কাৰ্য্যসূচী"
                  : currentLang === "hi"
                  ? "उपलब्ध गतिविधियां"
                  : "Available Activities"}
              </Text>
              <Text style={styles.sectionCountText}>
                {currentCategoryActivities.length} {currentLang === "as" ? "খেল" : currentLang === "hi" ? "खेल" : "activities"}
              </Text>
            </View>

            {/* Activity Cards List - Elderly Accessible */}
            <View style={styles.activityList}>
              {currentCategoryActivities.map((activity) => {
                const title = getLocalizedTitle(activity);
                const desc = getLocalizedDesc(activity);

                return (
                  <View
                    key={activity.id}
                    style={[
                      styles.activityCard,
                      { borderColor: `${activity.color}35` },
                    ]}
                  >
                    <View style={styles.activityCardHeader}>
                      <GameVisualPreview
                        id={activity.id}
                        color={activity.color}
                        bg={activity.bg}
                        emoji={activity.emoji}
                      />

                      <View style={styles.activityMeta}>
                        <View
                          style={[
                            styles.activityBadge,
                            { backgroundColor: activity.bg, borderColor: `${activity.color}40` },
                          ]}
                        >
                          <Text style={[styles.activityBadgeText, { color: activity.color }]}>
                            {activity.badge}
                          </Text>
                        </View>
                        <Text style={styles.activityTitle} numberOfLines={2}>
                          {title}
                        </Text>
                      </View>
                    </View>

                    {/* Simple, Non-Medical Description */}
                    <Text style={styles.activityDesc}>
                      {desc}
                    </Text>

                    {/* Prominent Tactile Play Button (min 48px height) */}
                    <TouchableOpacity
                      style={[styles.largePlayButton, { backgroundColor: activity.color }]}
                      onPress={() => handleLaunchGame(activity.link, title)}
                      activeOpacity={0.88}
                      accessibilityRole="button"
                      accessibilityLabel={`Play ${title}`}
                    >
                      <Feather name="play" size={18} color="#FFFFFF" />
                      <Text style={styles.largePlayButtonText}>
                        {getPlayButtonText()} • {title}
                      </Text>
                      <Feather name="arrow-right" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          /* =========================================================================
             STATE 2: CATEGORY-FIRST OVERVIEW (5 Core Domains + Extensible Modules)
             ========================================================================= */
          <View>
            {/* MindCare Header */}
            <View style={styles.header}>
              <View style={styles.headerTagPill}>
                <Text style={styles.headerTagText}>🧠 MINDCARE COGNITIVE GYM</Text>
              </View>
              <Text style={styles.headerTitle}>
                {currentLang === "as"
                  ? "মগজু আৰু স্মৃতিৰ খেল"
                  : currentLang === "hi"
                  ? "मस्तिष्क एवं स्मृति खेल"
                  : "Cognitive Activities"}
              </Text>
              <Text style={styles.headerSubtitle}>
                {currentLang === "as"
                  ? "আৰম্ভ কৰিবলৈ যিকোনো এটা শিতান বাছক"
                  : currentLang === "hi"
                  ? "शुरू करने के लिए एक श्रेणी चुनें"
                  : "Choose an activity area to exercise your mind"}
              </Text>
            </View>

            {/* SECTION 1: 5 CORE COGNITIVE CATEGORIES */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                {currentLang === "as"
                  ? "প্ৰধান শিতানসমূহ (৫টা ভাগ)"
                  : currentLang === "hi"
                  ? "मुख्य श्रेणियां (5 भाग)"
                  : "Cognitive Categories"}
              </Text>
              <Text style={styles.sectionCountText}>
                5 {currentLang === "as" ? "টা শিতান" : currentLang === "hi" ? "श्रेणियां" : "categories"}
              </Text>
            </View>

            <View style={styles.categoryCardList}>
              {coreCategories.map((cat) => {
                const catTitle = getLocalizedTitle(cat);
                const catDesc = getLocalizedDesc(cat);
                const activities = getCategoryActivities(cat.id);

                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryCard,
                      {
                        backgroundColor: "#FFFFFF",
                        borderColor: cat.borderColor,
                      },
                    ]}
                    onPress={() => handleSelectCategory(cat)}
                    activeOpacity={0.88}
                    accessibilityRole="button"
                    accessibilityLabel={catTitle}
                  >
                    {/* Top Row: Icon, Title & Count */}
                    <View style={styles.categoryCardTopRow}>
                      <View
                        style={[
                          styles.categoryIconCircle,
                          { backgroundColor: cat.bgColor, borderColor: cat.borderColor },
                        ]}
                      >
                        <Text style={{ fontSize: 28 }}>{cat.icon}</Text>
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.categoryCardTitle}>
                          {catTitle}
                        </Text>
                        <View style={[styles.activityCountTag, { backgroundColor: cat.bgColor }]}>
                          <Text style={[styles.activityCountTagText, { color: cat.tintText }]}>
                            {activities.length}{" "}
                            {currentLang === "as" ? "টা খেল" : currentLang === "hi" ? "खेल उपलब्ध" : "activities"}
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.categoryChevronCircle, { backgroundColor: cat.bgColor }]}>
                        <Feather name="chevron-right" size={20} color={cat.tintText} />
                      </View>
                    </View>

                    {/* Friendly Non-Medical Description */}
                    <Text style={styles.categoryCardDesc}>
                      {catDesc}
                    </Text>

                    {/* Preview Pills of Activities in this Category */}
                    <View style={styles.activityPreviewPillsRow}>
                      {activities.slice(0, 3).map((act) => (
                        <View key={act.id} style={styles.previewPill}>
                          <Text style={styles.previewPillEmoji}>{act.emoji}</Text>
                          <Text style={styles.previewPillText} numberOfLines={1}>
                            {getLocalizedTitle(act)}
                          </Text>
                        </View>
                      ))}
                      {activities.length > 3 && (
                        <View style={[styles.previewPill, { backgroundColor: "#F1F5F9" }]}>
                          <Text style={[styles.previewPillText, { color: "#64748B" }]}>
                            +{activities.length - 3}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Tactile "Open Category" Button */}
                    <View style={[styles.openCategoryButton, { backgroundColor: cat.bgColor, borderColor: cat.borderColor }]}>
                      <Text style={[styles.openCategoryButtonText, { color: cat.tintText }]}>
                        {currentLang === "as" ? "এই শিতানৰ খেলসমূহ খোলক" : currentLang === "hi" ? "इस श्रेणी के खेल खोलें" : "Explore Activities"}
                      </Text>
                      <Feather name="arrow-right" size={16} color={cat.tintText} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* SECTION 2: EXTENSIBLE MODULES (Music & Eye Tracking) */}
            {extensibleCategories.length > 0 && (
              <View style={{ marginTop: 24 }}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>
                    {currentLang === "as"
                      ? "অধিক আনন্দদায়ক কাৰ্য্যসূচী"
                      : currentLang === "hi"
                      ? "अन्य विशेष गतिविधियां"
                      : "More Fun Activities"}
                  </Text>
                </View>

                <View style={styles.extensibleGrid}>
                  {extensibleCategories.map((cat) => {
                    const catTitle = getLocalizedTitle(cat);
                    const catDesc = getLocalizedDesc(cat);
                    const activities = getCategoryActivities(cat.id);

                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.extensibleCard,
                          { backgroundColor: cat.bgColor, borderColor: cat.borderColor },
                        ]}
                        onPress={() => handleSelectCategory(cat)}
                        activeOpacity={0.88}
                      >
                        <View style={styles.extensibleHeader}>
                          <Text style={{ fontSize: 26 }}>{cat.icon}</Text>
                          <View style={[styles.activityCountTag, { backgroundColor: "#FFFFFF" }]}>
                            <Text style={[styles.activityCountTagText, { color: cat.tintText }]}>
                              {activities.length} {currentLang === "as" ? "খেল" : currentLang === "hi" ? "खेल" : "games"}
                            </Text>
                          </View>
                        </View>

                        <Text style={[styles.extensibleTitle, { color: cat.tintText }]}>
                          {catTitle}
                        </Text>
                        <Text style={styles.extensibleDesc} numberOfLines={2}>
                          {catDesc}
                        </Text>

                        <View style={[styles.extensibleButton, { backgroundColor: "#FFFFFF" }]}>
                          <Text style={[styles.extensibleButtonText, { color: cat.tintText }]}>
                            {currentLang === "as" ? "চাওক" : currentLang === "hi" ? "देखें" : "Explore"}
                          </Text>
                          <Feather name="arrow-right" size={14} color={cat.tintText} />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AestheticTheme.canvas,
    position: "relative",
  },
  ambientAuraTop: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: AestheticTheme.ambientLavender,
  },
  ambientAuraBottom: {
    position: "absolute",
    top: 540,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: AestheticTheme.ambientRose,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },

  /* HEADER */
  header: {
    marginBottom: 16,
  },
  headerTagPill: {
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginBottom: 6,
  },
  headerTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#2563EB",
    letterSpacing: 0.6,
  },
  headerTitle: {
    fontSize: 23,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 3,
    lineHeight: 18,
  },

  /* SECTION HEADERS */
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
  },

  /* BACK BUTTON (Elderly-Accessible) */
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AestheticTheme.cardSurface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: AestheticTheme.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
    gap: 8,
    ...AestheticTheme.cardShadow,
    minHeight: 50,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },

  /* CATEGORY BANNER (Inside Category View) */
  categoryBanner: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 18,
  },
  categoryBannerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  categoryBannerIconBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  categoryBannerTitle: {
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 4,
  },
  categoryBannerDesc: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
  },
  countPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: "700",
  },

  /* CATEGORY-FIRST CARDS */
  categoryCardList: {
    gap: 14,
  },
  categoryCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryCardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  activityCountTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activityCountTagText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  categoryChevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryCardDesc: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
    marginTop: 10,
    marginBottom: 10,
  },
  activityPreviewPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  previewPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 4,
  },
  previewPillEmoji: {
    fontSize: 11,
  },
  previewPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
    maxWidth: 130,
  },
  openCategoryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    minHeight: 44,
  },
  openCategoryButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },

  /* EXTENSIBLE MODULES (Music & Eye Tracking) */
  extensibleGrid: {
    flexDirection: "row",
    gap: 10,
  },
  extensibleCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    justifyContent: "space-between",
    minHeight: 150,
  },
  extensibleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  extensibleTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  extensibleDesc: {
    fontSize: 11.5,
    color: "#64748B",
    lineHeight: 16,
    marginBottom: 10,
  },
  extensibleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
    minHeight: 34,
  },
  extensibleButtonText: {
    fontSize: 11.5,
    fontWeight: "700",
  },

  /* ACTIVITY CARDS (Inside Category View) */
  activityList: {
    gap: 14,
  },
  activityCard: {
    backgroundColor: AestheticTheme.cardSurface,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: AestheticTheme.cardBorder,
    padding: 16,
    ...AestheticTheme.cardShadow,
  },
  activityCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  activityMeta: {
    flex: 1,
    marginLeft: 12,
  },
  activityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 4,
  },
  activityBadgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  activityDesc: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
    marginBottom: 14,
  },
  largePlayButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
    minHeight: 48,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  largePlayButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    flexShrink: 1,
  },

  /* VISUAL PREVIEW CONTAINER & MOTIFS */
  visualContainer: {
    borderRadius: 16,
    borderWidth: 1.2,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  // 101 Polaroid
  motifPolaroid: {
    alignItems: "center",
    justifyContent: "center",
  },
  motifPolaroidInner: {
    padding: 3,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  motifStarsRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  // 1 Antakshari
  motifAudioWave: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  waveBar: {
    width: 3.5,
    borderRadius: 2,
  },

  // 2 Motif Match
  motifMatch: {
    flexDirection: "row",
    alignItems: "center",
  },
  motifDiamond: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // 3 Picture Recall
  motifCanvasFrame: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  motifAbsoluteCenter: {
    position: "absolute",
  },

  // 4 Smriti Manthan
  motifSunrise: {
    alignItems: "center",
    gap: 2,
  },
  motifRiverLine: {
    width: 34,
    height: 2.5,
    borderRadius: 2,
  },

  // 12 Sequence Recall
  motifSeqRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seqDot: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    justifyContent: "center",
    alignItems: "center",
  },
  seqDotText: {
    color: "#FFF",
    fontSize: 9,
    fontWeight: "900",
  },

  // 15 Word Recall
  motifBookCard: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  motifLetterBadges: {
    flexDirection: "row",
    gap: 2,
  },
  miniLetter: {
    fontSize: 9,
    fontWeight: "800",
  },

  // 16 Picture Assoc
  motifAssocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  assocNode: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },

  // 17 Daily Orientation
  motifCompass: {
    justifyContent: "center",
    alignItems: "center",
  },
  motifClockHands: {
    position: "absolute",
  },

  // 18 Who Am I
  motifMaskRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  // 5 Find Object
  motifRadar: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  radarCircle: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "dashed",
    opacity: 0.5,
  },
  radarPing: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },

  // 6 Daily Steps
  motifStepsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  stepPill: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  stepNum: {
    fontSize: 9.5,
    fontWeight: "900",
  },

  // 7 Word Connection
  motifNetwork: {
    justifyContent: "center",
    alignItems: "center",
  },

  // 8 Bajar Hisab
  motifCoins: {
    flexDirection: "row",
    alignItems: "center",
  },
  coin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  coinText: {
    fontSize: 9.5,
    fontWeight: "900",
    color: "#78350F",
  },

  // 13 Odd One Out
  motifGrid2x2: {
    gap: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  motifMiniRow: {
    flexDirection: "row",
    gap: 4,
  },

  // 14 Number Order
  motifPodium: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
  },
  podiumBar: {
    width: 10,
    borderRadius: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  podiumText: {
    fontSize: 7.5,
    fontWeight: "800",
    color: "#0F172A",
  },

  // 19 Treasure Hunt
  motifTreasure: {
    flexDirection: "row",
    alignItems: "center",
  },

  // 20 Rule Switch
  motifSwitch: {
    justifyContent: "center",
    alignItems: "center",
  },

  // 21 Plan & Do
  motifClipboard: {
    justifyContent: "center",
    alignItems: "center",
  },

  // 9 & 10 Gaze Orbit
  motifOrbit: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  orbitTrackerDot: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // 11 Saccades Bullseye
  motifBullseye: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  bullseyeFlash: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
