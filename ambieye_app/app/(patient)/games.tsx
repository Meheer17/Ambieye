import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Colors, BorderRadius, Shadows } from "@/constants/theme";

export default function GamesScreen() {
  const { username } = useAuth();
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const [activeGameCategory, setActiveGameCategory] = useState("identification");

  // Update category whenever the screen comes into focus with a new category param
  useFocusEffect(
    React.useCallback(() => {
      const categoryValue = Array.isArray(category) ? category[0] : category;
      if (!categoryValue) return;
      const normalized = categoryValue.toLowerCase();
      const validCategories = ["identification", "movement", "cognitive"];
      if (validCategories.includes(normalized)) {
        setActiveGameCategory(normalized);
      }
    }, [category])
  );

  const gameLinks = {
    identification: [
      {
        id: 1,
        name: "Colored Balls",
        link: "games/identify/colored-balls",
        icon: "circle" as const,
        desc: "Identify and select balls by their specific colors.",
        color: "#EF4444",
        bg: "#FEF2F2",
        emoji: "🔴",
      },
      {
        id: 2,
        name: "Select Alphabet",
        link: "games/identify/alphabet",
        icon: "font" as const,
        desc: "Practice letter recognition by selecting correct alphabets.",
        color: "#8B5CF6",
        bg: "#F5F3FF",
        emoji: "🔤",
      },
      {
        id: 3,
        name: "Alphabet Objects",
        link: "games/identify/alphabet-objects",
        icon: "th-large" as const,
        desc: "Match objects with their corresponding starting letters.",
        color: "#0EA5E9",
        bg: "#F0F9FF",
        emoji: "🍎",
      },
      {
        id: 4,
        name: "Identify Symbol",
        link: "games/identify/symbol",
        icon: "asterisk" as const,
        desc: "Recognize and select various symbols shown on screen.",
        color: "#F59E0B",
        bg: "#FFFBEB",
        emoji: "⭐",
      },
      {
        id: 5,
        name: "Object Color",
        link: "games/identify/object-color",
        icon: "question" as const,
        desc: "Name the correct color of different displayed objects.",
        color: "#10B981",
        bg: "#ECFDF5",
        emoji: "🎨",
      },
    ],
    movement: [
      {
        id: 6,
        name: "Clockwise Tracking",
        link: "games/movement/clockwise",
        icon: "rotate-right" as const,
        desc: "Track a moving ball with your eyes in clockwise pattern.",
        color: "#EF4444",
        bg: "#FEF2F2",
        emoji: "🔄",
      },
      {
        id: 7,
        name: "Anti-Clockwise",
        link: "games/movement/anti-clockwise",
        icon: "rotate-left" as const,
        desc: "Track a moving ball in counter-clockwise pattern.",
        color: "#8B5CF6",
        bg: "#F5F3FF",
        emoji: "🔃",
      },
      {
        id: 8,
        name: "Eyeball Movement",
        link: "games/movement/eyeball",
        icon: "eye-slash" as const,
        desc: "Exercise your eye muscles with guided movement patterns.",
        color: "#0EA5E9",
        bg: "#F0F9FF",
        emoji: "👁️",
      },
      {
        id: 9,
        name: "Target Direction",
        link: "games/movement/target-direction",
        icon: "location-arrow" as const,
        desc: "Identify which direction targets are moving across the screen.",
        color: "#F59E0B",
        bg: "#FFFBEB",
        emoji: "🎯",
      },
    ],
    cognitive: [
      {
        id: 10,
        name: "Find Characters",
        link: "games/cognitive/find-characters",
        icon: "search" as const,
        desc: "Locate specific characters hidden within a complex display.",
        color: "#EF4444",
        bg: "#FEF2F2",
        emoji: "🔍",
      },
      {
        id: 11,
        name: "Count & Choose",
        link: "games/cognitive/count",
        icon: "calculator" as const,
        desc: "Count the number of objects and select the correct answer.",
        color: "#8B5CF6",
        bg: "#F5F3FF",
        emoji: "🔢",
      },
      {
        id: 12,
        name: "Match Following",
        link: "games/cognitive/matching",
        icon: "th" as const,
        desc: "Connect related items by finding their corresponding pairs.",
        color: "#0EA5E9",
        bg: "#F0F9FF",
        emoji: "🧩",
      },
    ],
  };

  const handleNavigateToGame = (gameLink: string) => {
    router.push(`/(patient)/(stack)/${gameLink}`);
  };

  const categories = [
    { key: "identification", label: "Identify", icon: "eye" as const, color: "#0EA5E9" },
    { key: "movement", label: "Movement", icon: "eye-plus-outline" as const, color: "#8B5CF6" },
    { key: "cognitive", label: "Cognitive", icon: "brain" as const, color: "#10B981" },
  ];

  const currentGames = gameLinks[activeGameCategory as keyof typeof gameLinks];
  const activeCategory = categories.find(c => c.key === activeGameCategory);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerBg} />
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerGreeting}>Ready to train?</Text>
              <Text style={styles.headerTitle}>Vision Games</Text>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.gameCountBadge}>
                <Text style={styles.gameCountText}>12</Text>
                <Text style={styles.gameCountLabel}>Games</Text>
              </View>
            </View>
          </View>

          {/* Category Tabs */}
          <View style={styles.categoryContainer}>
            {categories.map((cat) => {
              const isActive = activeGameCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.categoryTab, isActive && { backgroundColor: cat.color }]}
                  onPress={() => setActiveGameCategory(cat.key)}
                  activeOpacity={0.8}
                >
                  {cat.key === "movement" ? (
                    <MaterialCommunityIcons
                      name={cat.icon as any}
                      size={16}
                      color={isActive ? "#fff" : "rgba(255,255,255,0.5)"}
                    />
                  ) : (
                    <FontAwesome
                      name={cat.icon as any}
                      size={14}
                      color={isActive ? "#fff" : "rgba(255,255,255,0.5)"}
                    />
                  )}
                  <Text style={[styles.categoryTabText, isActive && styles.categoryTabTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Games List */}
        <ScrollView
          style={styles.gamesList}
          contentContainerStyle={styles.gamesListContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionLabelRow}>
            <Text style={styles.sectionLabel}>
              {currentGames.length} exercises available
            </Text>
            <View style={[styles.categoryDot, { backgroundColor: activeCategory?.color }]} />
          </View>

          {currentGames.map((game, index) => (
            <TouchableOpacity
              key={game.id}
              style={styles.gameCard}
              onPress={() => handleNavigateToGame(game.link)}
              activeOpacity={0.85}
            >
              <View style={[styles.gameIconContainer, { backgroundColor: game.bg }]}>
                <Text style={styles.gameEmoji}>{game.emoji}</Text>
              </View>
              <View style={styles.gameInfo}>
                <View style={styles.gameNameRow}>
                  <Text style={styles.gameName}>{game.name}</Text>
                  <View style={[styles.gameNumberBadge, { backgroundColor: game.bg }]}>
                    <Text style={[styles.gameNumber, { color: game.color }]}>#{game.id}</Text>
                  </View>
                </View>
                <Text style={styles.gameDesc}>{game.desc}</Text>
              </View>
              <View style={[styles.gameArrow, { backgroundColor: game.bg }]}>
                <Feather name="chevron-right" size={18} color={game.color} />
              </View>
            </TouchableOpacity>
          ))}

          <View style={{ height: 90 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: '#0F172A',
    paddingBottom: 0,
    overflow: 'hidden',
  },
  headerBg: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.primary,
    opacity: 0.1,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerGreeting: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  gameCountBadge: {
    backgroundColor: 'rgba(14, 165, 233, 0.2)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.3)',
  },
  gameCountText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
  },
  gameCountLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  categoryContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 10,
  },
  categoryTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
  },
  categoryTabTextActive: {
    color: "#FFFFFF",
  },
  gamesList: {
    flex: 1,
  },
  gamesListContent: {
    padding: 20,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gameCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    ...Shadows.md,
  },
  gameIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    flexShrink: 0,
  },
  gameEmoji: {
    fontSize: 26,
  },
  gameInfo: {
    flex: 1,
  },
  gameNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  gameName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
    flex: 1,
  },
  gameNumberBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  gameNumber: {
    fontSize: 11,
    fontWeight: '700',
  },
  gameDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  gameArrow: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
    flexShrink: 0,
  },
});
