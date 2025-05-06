import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useAuth } from "@/hooks/useAuth";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";

export default function PatientHome() {
  const { username } = useAuth();
  const router = useRouter();
  const [activeGameCategory, setActiveGameCategory] =
    useState("identification");

  // Game categories and links
  const gameLinks = {
    identification: [
      {
        id: 1,
        name: "Select the colored balls",
        link: "games/identify/colored-balls",
        icon: "circle",
        desc: "Identify and select balls based on their specific colors.",
      },
      {
        id: 2,
        name: "Select the alphabet",
        link: "games/identify/alphabet",
        icon: "font",
        desc: "Practice letter recognition by selecting the correct alphabets.",
      },
      {
        id: 3,
        name: "Select the correct object for the alphabets",
        link: "games/identify/alphabet-objects",
        icon: "th-large",
        desc: "Match objects with their corresponding starting letters.",
      },
      {
        id: 4,
        name: "Identify the symbol",
        link: "games/identify/symbol",
        icon: "asterisk",
        desc: "Recognize and select various symbols shown on screen.",
      },
      {
        id: 5,
        name: "Identify the color of the object",
        link: "games/identify/object-color",
        icon: "question",
        desc: "Name the correct color of different displayed objects.",
      },
    ],
    movement: [
      {
        id: 6,
        name: "Follow the ball in clockwise direction",
        link: "games/movement/clockwise",
        icon: "rotate-right",
        desc: "Track a moving ball with your eyes in clockwise pattern.",
      },
      {
        id: 7,
        name: "Follow the ball in anti-clockwise direction",
        link: "games/movement/anti-clockwise",
        icon: "rotate-left",
        desc: "Track a moving ball with your eyes in counter-clockwise pattern.",
      },
      {
        id: 8,
        name: "Eyeball movement",
        link: "games/movement/eyeball",
        icon: "eye-slash",
        desc: "Exercise your eye muscles with guided movement patterns.",
      },
      {
        id: 9,
        name: "Direction of the target",
        link: "games/movement/target-direction",
        icon: "location-arrow",
        desc: "Identify which direction targets are moving across the screen.",
      },
    ],
    cognitive: [
      {
        id: 10,
        name: "Find the characters",
        link: "games/cognitive/find-characters",
        icon: "search",
        desc: "Locate specific characters hidden within a complex display.",
      },
      {
        id: 11,
        name: "Count and choose",
        link: "games/cognitive/count",
        icon: "calculator",
        desc: "Count the number of objects and select the correct answer.",
      },
      {
        id: 12,
        name: "Match the following",
        link: "games/cognitive/matching",
        icon: "th",
        desc: "Connect related items by finding their corresponding pairs.",
      },
    ],
  };

  const handleNavigateToGame = (gameLink: string) => {
    router.push(`./(stack)/${gameLink}`);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Hello,</Text>
        <Text style={styles.patientName}>{username}</Text>
      </View>

      <View style={styles.contentSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Games & Activities</Text>
        </View>

        {/* Category Selector */}
        <View style={styles.gameCategoryContainer}>
          <TouchableOpacity
            style={[
              styles.categoryButton,
              activeGameCategory === "identification" &&
                styles.activeCategoryButton,
            ]}
            onPress={() => setActiveGameCategory("identification")}
          >
            <FontAwesome
              name="eye"
              size={18}
              color={
                activeGameCategory === "identification" ? "#fff" : "#5f2446"
              }
            />
            <Text
              style={[
                styles.categoryButtonText,
                activeGameCategory === "identification" &&
                  styles.activeCategoryText,
              ]}
            >
              Identify
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.categoryButton,
              activeGameCategory === "movement" && styles.activeCategoryButton,
            ]}
            onPress={() => setActiveGameCategory("movement")}
          >
            <MaterialCommunityIcons
              name="eye-plus-outline"
              size={18}
              color={activeGameCategory === "movement" ? "#fff" : "#5f2446"}
            />
            <Text
              style={[
                styles.categoryButtonText,
                activeGameCategory === "movement" && styles.activeCategoryText,
              ]}
            >
              Movement
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.categoryButton,
              activeGameCategory === "cognitive" && styles.activeCategoryButton,
            ]}
            onPress={() => setActiveGameCategory("cognitive")}
          >
            <FontAwesome
              name="search"
              size={18}
              color={activeGameCategory === "cognitive" ? "#fff" : "#5f2446"}
            />
            <Text
              style={[
                styles.categoryButtonText,
                activeGameCategory === "cognitive" && styles.activeCategoryText,
              ]}
            >
              Cognitive
            </Text>
          </TouchableOpacity>
        </View>

        {/* Games List */}
        <View style={styles.gamesList}>
          {gameLinks[activeGameCategory as keyof typeof gameLinks].map(
            (game) => (
              <TouchableOpacity
                key={game.id}
                style={styles.gameCard}
                onPress={() => handleNavigateToGame(game.link)}
              >
                <View style={styles.gameIcon}>
                  <FontAwesome name={game.icon as any} size={24} color="#fff" />
                </View>
                <View style={styles.gameInfo}>
                  <Text style={styles.gameName}>{game.name}</Text>
                  <Text style={styles.gameDescription}>{game.desc}</Text>
                </View>
                <Feather name="chevron-right" size={24} color="#5f2446" />
              </TouchableOpacity>
            ),
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Styles remain the same - keeping the original styles
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  welcomeSection: {
    backgroundColor: "#5f2446",
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 50,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  welcomeText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
  },
  patientName: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 5,
  },
  contentSection: {
    marginTop: 15,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 25,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  // Game categories styles
  gameCategoryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  categoryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9f9f9",
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#5f2446",
  },
  activeCategoryButton: {
    backgroundColor: "#5f2446",
  },
  categoryButtonText: {
    color: "#5f2446",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  activeCategoryText: {
    color: "#fff",
  },
  gamesList: {
    marginBottom: 30,
  },
  gameCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  gameIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#5f2446",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  gameDescription: {
    fontSize: 13,
    color: "#888",
  },
});