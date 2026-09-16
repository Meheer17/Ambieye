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
export interface OddOneOutItem {
  id: string;
  name: string;
  nameAs: string;
  nameHi: string;
  emoji: string;
  isOdd: boolean;
  category: string;
}

export interface OddOneOutRoundData {
  roundNumber: number;
  difficulty: "easy" | "easy_medium" | "medium" | "challenging" | "mastery";
  difficultyLabel: string;
  gridCols: 2 | 3;
  clueEn: string;
  clueAs: string;
  clueHi: string;
  items: OddOneOutItem[];
}

export const TOTAL_ROUNDS = 5;
export const BASE_POINTS_PER_ROUND = 100;
export const HINT_PENALTY_POINTS = 10;

// ── Local Dataset with Progressive Difficulty ────────────────────────────────
// Round 1-2: Obvious differences (4 items, 2x2 grid)
// Round 3-5: Nuanced/Visual differences (6 items, 2x3 or 3x2 grid)
export const ROUND_SETS: Record<number, OddOneOutRoundData[]> = {
  1: [
    {
      roundNumber: 1,
      difficulty: "easy",
      difficultyLabel: "Level 1 · Obvious Difference",
      gridCols: 2,
      clueEn: "Three sweet apples and one vehicle",
      clueAs: "তিনিটা মিঠা আপেল আৰু এখন গাড়ী",
      clueHi: "तीन मीठे सेब और एक गाड़ी",
      items: [
        { id: "r1_a1", name: "Apple", nameAs: "আপেল", nameHi: "सेब", emoji: "🍎", isOdd: false, category: "Fruit" },
        { id: "r1_a2", name: "Apple", nameAs: "আপেল", nameHi: "सेब", emoji: "🍎", isOdd: false, category: "Fruit" },
        { id: "r1_car", name: "Car", nameAs: "গাড়ী", nameHi: "गाड़ी", emoji: "🚗", isOdd: true, category: "Vehicle" },
        { id: "r1_a3", name: "Apple", nameAs: "আপেল", nameHi: "सेब", emoji: "🍎", isOdd: false, category: "Fruit" },
      ],
    },
    {
      roundNumber: 1,
      difficulty: "easy",
      difficultyLabel: "Level 1 · Obvious Difference",
      gridCols: 2,
      clueEn: "Three gentle elephants and one sweet fruit",
      clueAs: "তিনিটা হাতী আৰু এটা পকা কল",
      clueHi: "तीन हाथी और एक केला",
      items: [
        { id: "r1_e1", name: "Elephant", nameAs: "হাতী", nameHi: "हाथी", emoji: "🐘", isOdd: false, category: "Animal" },
        { id: "r1_banana", name: "Banana", nameAs: "কল", nameHi: "केला", emoji: "🍌", isOdd: true, category: "Fruit" },
        { id: "r1_e2", name: "Elephant", nameAs: "হাতী", nameHi: "हाथी", emoji: "🐘", isOdd: false, category: "Animal" },
        { id: "r1_e3", name: "Elephant", nameAs: "হাতী", nameHi: "हाथी", emoji: "🐘", isOdd: false, category: "Animal" },
      ],
    },
    {
      roundNumber: 1,
      difficulty: "easy",
      difficultyLabel: "Level 1 · Obvious Difference",
      gridCols: 2,
      clueEn: "Three garden flowers and one telephone",
      clueAs: "তিনিপাহ ফুল আৰু এটা ফোন",
      clueHi: "तीन फूल और एक फोन",
      items: [
        { id: "r1_f1", name: "Flower", nameAs: "ফুল", nameHi: "फूल", emoji: "🌸", isOdd: false, category: "Nature" },
        { id: "r1_f2", name: "Flower", nameAs: "ফুল", nameHi: "फूल", emoji: "🌸", isOdd: false, category: "Nature" },
        { id: "r1_f3", name: "Flower", nameAs: "ফুল", nameHi: "फूल", emoji: "🌸", isOdd: false, category: "Nature" },
        { id: "r1_phone", name: "Phone", nameAs: "ফোন", nameHi: "फोन", emoji: "📱", isOdd: true, category: "Device" },
      ],
    },
    {
      roundNumber: 1,
      difficulty: "easy",
      difficultyLabel: "Level 1 · Obvious Difference",
      gridCols: 2,
      clueEn: "Three teapots and one loyal puppy",
      clueAs: "তিনিটা চাহৰ কেটলি আৰু এটা কুকুৰ পোৱালি",
      clueHi: "तीन चाय की केतली और एक पिल्ला",
      items: [
        { id: "r1_tp1", name: "Teapot", nameAs: "কেটলি", nameHi: "केतली", emoji: "🫖", isOdd: false, category: "Kitchen" },
        { id: "r1_tp2", name: "Teapot", nameAs: "কেটলি", nameHi: "केतली", emoji: "🫖", isOdd: false, category: "Kitchen" },
        { id: "r1_dog", name: "Puppy", nameAs: "কুকুৰ পোৱালি", nameHi: "पिल्ला", emoji: "🐶", isOdd: true, category: "Pet" },
        { id: "r1_tp3", name: "Teapot", nameAs: "কেটলি", nameHi: "केतली", emoji: "🫖", isOdd: false, category: "Kitchen" },
      ],
    },
  ],
  2: [
    {
      roundNumber: 2,
      difficulty: "easy_medium",
      difficultyLabel: "Level 2 · Clear Category",
      gridCols: 2,
      clueEn: "Three garden blossoms and one flying aeroplane",
      clueAs: "তিনিপাহ ফুল আৰু এখন উৰাজাহাজ",
      clueHi: "तीन सुंदर फूल और एक हवाई जहाज",
      items: [
        { id: "r2_sunflower", name: "Sunflower", nameAs: "সূৰ্যমুখী", nameHi: "सूरजमुखी", emoji: "🌻", isOdd: false, category: "Flower" },
        { id: "r2_rose", name: "Rose", nameAs: "গোলাপ", nameHi: "गुलाब", emoji: "🌹", isOdd: false, category: "Flower" },
        { id: "r2_plane", name: "Aeroplane", nameAs: "উৰাজাহাজ", nameHi: "हवाई जहाज", emoji: "✈️", isOdd: true, category: "Transport" },
        { id: "r2_lavender", name: "Lavender", nameAs: "ফুল", nameHi: "फूल", emoji: "🪻", isOdd: false, category: "Flower" },
      ],
    },
    {
      roundNumber: 2,
      difficulty: "easy_medium",
      difficultyLabel: "Level 2 · Clear Category",
      gridCols: 2,
      clueEn: "Three delicious foods and one shoe",
      clueAs: "তিনিবিধ খাদ্য আৰু এটা জোতা",
      clueHi: "तीन खाने की चीजें और एक जूता",
      items: [
        { id: "r2_bread", name: "Bread", nameAs: "পাঊৰুটী", nameHi: "रोटी/ब्रेड", emoji: "🍞", isOdd: false, category: "Food" },
        { id: "r2_milk", name: "Milk", nameAs: "গাখীৰ", nameHi: "दूध", emoji: "🥛", isOdd: false, category: "Food" },
        { id: "r2_shoe", name: "Shoe", nameAs: "জোতা", nameHi: "जूता", emoji: "👞", isOdd: true, category: "Apparel" },
        { id: "r2_rice", name: "Rice Bowl", nameAs: "ভাতৰ বাটি", nameHi: "चावल", emoji: "🍚", isOdd: false, category: "Food" },
      ],
    },
    {
      roundNumber: 2,
      difficulty: "easy_medium",
      difficultyLabel: "Level 2 · Clear Category",
      gridCols: 2,
      clueEn: "Three friendly pets and one festival diya lamp",
      clueAs: "তিনিটা মৰমৰ পোহনীয়া প্ৰাণী আৰু এগছি মাটিৰ চাকি",
      clueHi: "तीन प्यारे पालतू जानवर और एक दीपक",
      items: [
        { id: "r2_cat", name: "Cat", nameAs: "মেকুৰী", nameHi: "बिल्ली", emoji: "🐱", isOdd: false, category: "Pet" },
        { id: "r2_dog2", name: "Dog", nameAs: "কুকুৰ", nameHi: "कुत्ता", emoji: "🐶", isOdd: false, category: "Pet" },
        { id: "r2_diya", name: "Diya Lamp", nameAs: "মাটিৰ চাকি", nameHi: "दीपक", emoji: "🪔", isOdd: true, category: "Festival" },
        { id: "r2_rabbit", name: "Rabbit", nameAs: "শহা পহু", nameHi: "खरगोश", emoji: "🐰", isOdd: false, category: "Pet" },
      ],
    },
  ],
  3: [
    {
      roundNumber: 3,
      difficulty: "medium",
      difficultyLabel: "Level 3 · Visual & Category Closeness",
      gridCols: 2,
      clueEn: "Five red fruits/berries and one orange root vegetable",
      clueAs: "পাঁচবিধ ৰঙা ফল আৰু এটা কমলা ৰঙৰ গাজৰ",
      clueHi: "पांच लाल फल और एक गाजर",
      items: [
        { id: "r3_apple", name: "Red Apple", nameAs: "ৰঙা আপেল", nameHi: "लाल सेब", emoji: "🍎", isOdd: false, category: "Red Food" },
        { id: "r3_straw", name: "Strawberry", nameAs: "ষ্ট্ৰবেৰী", nameHi: "स्ट्रॉबेरी", emoji: "🍓", isOdd: false, category: "Red Food" },
        { id: "r3_cherry", name: "Cherries", nameAs: "চেৰী", nameHi: "चेरी", emoji: "🍒", isOdd: false, category: "Red Food" },
        { id: "r3_tomato", name: "Tomato", nameAs: "বিলাহী", nameHi: "टमाटर", emoji: "🍅", isOdd: false, category: "Red Food" },
        { id: "r3_melon", name: "Watermelon", nameAs: "তৰমুজ", nameHi: "तरबूज", emoji: "🍉", isOdd: false, category: "Red Food" },
        { id: "r3_carrot", name: "Carrot", nameAs: "গাজৰ", nameHi: "गाजर", emoji: "🥕", isOdd: true, category: "Root Vegetable" },
      ],
    },
    {
      roundNumber: 3,
      difficulty: "medium",
      difficultyLabel: "Level 3 · Visual & Category Closeness",
      gridCols: 2,
      clueEn: "Five birds and one fluttering butterfly",
      clueAs: "পাঁচটা চৰাই আৰু এজনী পখিলা",
      clueHi: "पांच पक्षी और एक सुंदर तितली",
      items: [
        { id: "r3_bird", name: "Bird", nameAs: "চৰাই", nameHi: "चिड़िया", emoji: "🐦", isOdd: false, category: "Bird" },
        { id: "r3_parrot", name: "Parrot", nameAs: "ভাটৌ", nameHi: "तोता", emoji: "🦜", isOdd: false, category: "Bird" },
        { id: "r3_dove", name: "Dove", nameAs: "কপৌ", nameHi: "कबूतर", emoji: "🕊️", isOdd: false, category: "Bird" },
        { id: "r3_duck", name: "Duck", nameAs: "হাঁহ", nameHi: "बतख", emoji: "🦆", isOdd: false, category: "Bird" },
        { id: "r3_owl", name: "Owl", nameAs: "ফেঁচা", nameHi: "उल्लू", emoji: "🦉", isOdd: false, category: "Bird" },
        { id: "r3_butterfly", name: "Butterfly", nameAs: "পখিলা", nameHi: "तितली", emoji: "🦋", isOdd: true, category: "Insect" },
      ],
    },
    {
      roundNumber: 3,
      difficulty: "medium",
      difficultyLabel: "Level 3 · Visual & Category Closeness",
      gridCols: 2,
      clueEn: "Five drinks and one hot soup bowl",
      clueAs: "পাঁচবিধ পানীয় আৰু এখন গৰম চুপৰ বাটি",
      clueHi: "पांच पेय पदार्थ और एक गरम सूप का कटोरा",
      items: [
        { id: "r3_milk", name: "Milk Glass", nameAs: "গাখীৰৰ গিলাচ", nameHi: "दूध का गिलास", emoji: "🥛", isOdd: false, category: "Drink" },
        { id: "r3_tea", name: "Green Tea", nameAs: "সেউজীয়া চাহ", nameHi: "हरी चाय", emoji: "🍵", isOdd: false, category: "Drink" },
        { id: "r3_coffee", name: "Coffee", nameAs: "কফি", nameHi: "कॉफ़ी", emoji: "☕", isOdd: false, category: "Drink" },
        { id: "r3_juice", name: "Fruit Juice", nameAs: "ফলৰ ৰস", nameHi: "जूस", emoji: "🧃", isOdd: false, category: "Drink" },
        { id: "r3_soda", name: "Cool Drink", nameAs: "শীতল পানীয়", nameHi: "ठंडा पेय", emoji: "🥤", isOdd: false, category: "Drink" },
        { id: "r3_soup", name: "Soup Bowl", nameAs: "চুপৰ বাটি", nameHi: "सूप का कटोरा", emoji: "🍲", isOdd: true, category: "Food Dish" },
      ],
    },
  ],
  4: [
    {
      roundNumber: 4,
      difficulty: "challenging",
      difficultyLabel: "Level 4 · Visual Nuance",
      gridCols: 2,
      clueEn: "Five bright full moons and one crescent moon",
      clueAs: "পাঁচটা পূৰ্ণিমাৰ জোন আৰু এটা কাঁচি জোন",
      clueHi: "पांच पूरे चाँद और एक अर्धचंद्र",
      items: [
        { id: "r4_m1", name: "Full Moon", nameAs: "পূৰ্ণিমাৰ জোন", nameHi: "पूरा चाँद", emoji: "🌕", isOdd: false, category: "Moon" },
        { id: "r4_m2", name: "Full Moon", nameAs: "পূৰ্ণিমাৰ জোন", nameHi: "पूरा चाँद", emoji: "🌕", isOdd: false, category: "Moon" },
        { id: "r4_m3", name: "Full Moon", nameAs: "পূৰ্ণিমাৰ জোন", nameHi: "पूरा चाँद", emoji: "🌕", isOdd: false, category: "Moon" },
        { id: "r4_crescent", name: "Crescent Moon", nameAs: "কাঁচি জোন", nameHi: "अर्धचंद्र", emoji: "🌘", isOdd: true, category: "Moon Phase" },
        { id: "r4_m4", name: "Full Moon", nameAs: "পূৰ্ণিমাৰ জোন", nameHi: "पूरा चाँद", emoji: "🌕", isOdd: false, category: "Moon" },
        { id: "r4_m5", name: "Full Moon", nameAs: "পূৰ্ণিমাৰ জোন", nameHi: "पूरा चाँद", emoji: "🌕", isOdd: false, category: "Moon" },
      ],
    },
    {
      roundNumber: 4,
      difficulty: "challenging",
      difficultyLabel: "Level 4 · Visual Nuance",
      gridCols: 2,
      clueEn: "Five fresh green leaves and one dry golden autumn leaf",
      clueAs: "পাঁচটা সতেজ সেউজীয়া পাত আৰু এটা সৰা শুকান পাত",
      clueHi: "पांच हरी पत्तियां और एक सूखी पत्ती",
      items: [
        { id: "r4_l1", name: "Green Leaves", nameAs: "সেউজীয়া পাত", nameHi: "हरी पत्ती", emoji: "🌿", isOdd: false, category: "Plant" },
        { id: "r4_l2", name: "Green Leaves", nameAs: "সেউজীয়া পাত", nameHi: "हरी पत्ती", emoji: "🌿", isOdd: false, category: "Plant" },
        { id: "r4_autumn", name: "Autumn Leaf", nameAs: "শুকান পাত", nameHi: "सूखी पत्ती", emoji: "🍂", isOdd: true, category: "Fallen Leaf" },
        { id: "r4_l3", name: "Green Leaves", nameAs: "সেউজীয়া পাত", nameHi: "हरी पत्ती", emoji: "🌿", isOdd: false, category: "Plant" },
        { id: "r4_l4", name: "Green Leaves", nameAs: "সেউজীয়া পাত", nameHi: "हरी पत्ती", emoji: "🌿", isOdd: false, category: "Plant" },
        { id: "r4_l5", name: "Green Leaves", nameAs: "সেউজীয়া পাত", nameHi: "हरी पत्ती", emoji: "🌿", isOdd: false, category: "Plant" },
      ],
    },
    {
      roundNumber: 4,
      difficulty: "challenging",
      difficultyLabel: "Level 4 · Visual Nuance",
      gridCols: 2,
      clueEn: "Five hot tea cups and one tea pot kettle",
      clueAs: "পাঁচকাপ গৰম চাহ আৰু এটা চাহৰ কেটলি",
      clueHi: "पांच चाय के कप और एक केतली",
      items: [
        { id: "r4_c1", name: "Chai Cup", nameAs: "চাহৰ কাপ", nameHi: "चाय का कप", emoji: "☕", isOdd: false, category: "Cup" },
        { id: "r4_c2", name: "Chai Cup", nameAs: "চাহৰ কাপ", nameHi: "चाय का कप", emoji: "☕", isOdd: false, category: "Cup" },
        { id: "r4_pot", name: "Teapot Kettle", nameAs: "চাহৰ কেটলি", nameHi: "केतली", emoji: "🫖", isOdd: true, category: "Pouring Pot" },
        { id: "r4_c3", name: "Chai Cup", nameAs: "চাহৰ কাপ", nameHi: "चाय का कप", emoji: "☕", isOdd: false, category: "Cup" },
        { id: "r4_c4", name: "Chai Cup", nameAs: "চাহৰ কাপ", nameHi: "चाय का कप", emoji: "☕", isOdd: false, category: "Cup" },
        { id: "r4_c5", name: "Chai Cup", nameAs: "চাহৰ কাপ", nameHi: "चाय का कप", emoji: "☕", isOdd: false, category: "Cup" },
      ],
    },
  ],
  5: [
    {
      roundNumber: 5,
      difficulty: "mastery",
      difficultyLabel: "Level 5 · Fine Detail & Focus",
      gridCols: 2,
      clueEn: "Five pink cherry blossoms and one tropical hibiscus",
      clueAs: "পাঁচপাহ গুলপীয়া ফুল আৰু এপাহ ৰঙা জবা ফুল",
      clueHi: "पांच गुलाबी फूल और एक लाल गुड़हल",
      items: [
        { id: "r5_cb1", name: "Cherry Blossom", nameAs: "গুলপীয়া ফুল", nameHi: "गुलाबी फूल", emoji: "🌸", isOdd: false, category: "Blossom" },
        { id: "r5_cb2", name: "Cherry Blossom", nameAs: "গুলপীয়া ফুল", nameHi: "गुलाबी फूल", emoji: "🌸", isOdd: false, category: "Blossom" },
        { id: "r5_cb3", name: "Cherry Blossom", nameAs: "গুলপীয়া ফুল", nameHi: "गुलाबी फूल", emoji: "🌸", isOdd: false, category: "Blossom" },
        { id: "r5_hibiscus", name: "Hibiscus", nameAs: "জবা ফুল", nameHi: "गुड़हल", emoji: "🌺", isOdd: true, category: "Tropical Flower" },
        { id: "r5_cb4", name: "Cherry Blossom", nameAs: "গুলপীয়া ফুল", nameHi: "गुलाबी फूल", emoji: "🌸", isOdd: false, category: "Blossom" },
        { id: "r5_cb5", name: "Cherry Blossom", nameAs: "গুলপীয়া ফুল", nameHi: "गुलाবি फूल", emoji: "🌸", isOdd: false, category: "Blossom" },
      ],
    },
    {
      roundNumber: 5,
      difficulty: "mastery",
      difficultyLabel: "Level 5 · Fine Detail & Focus",
      gridCols: 2,
      clueEn: "Five red apples and one crispy green apple",
      clueAs: "পাঁচটা ৰঙা আপেল আৰু এটা সেউজীয়া আপেল",
      clueHi: "पांच लाल सेब और एक हरा सेब",
      items: [
        { id: "r5_ra1", name: "Red Apple", nameAs: "ৰঙা আপেল", nameHi: "लाल सेब", emoji: "🍎", isOdd: false, category: "Apple" },
        { id: "r5_ra2", name: "Red Apple", nameAs: "ৰঙা আপেল", nameHi: "लाल सेब", emoji: "🍎", isOdd: false, category: "Apple" },
        { id: "r5_ga", name: "Green Apple", nameAs: "সেউজীয়া আপেল", nameHi: "हरा सेब", emoji: "🍏", isOdd: true, category: "Green Fruit" },
        { id: "r5_ra3", name: "Red Apple", nameAs: "ৰঙা আপেল", nameHi: "लाल सेब", emoji: "🍎", isOdd: false, category: "Apple" },
        { id: "r5_ra4", name: "Red Apple", nameAs: "ৰঙা আপেল", nameHi: "लाल सेब", emoji: "🍎", isOdd: false, category: "Apple" },
        { id: "r5_ra5", name: "Red Apple", nameAs: "ৰঙা আপেল", nameHi: "লাল सेब", emoji: "🍎", isOdd: false, category: "Apple" },
      ],
    },
    {
      roundNumber: 5,
      difficulty: "mastery",
      difficultyLabel: "Level 5 · Fine Detail & Focus",
      gridCols: 2,
      clueEn: "Five antique mantel clocks and one ringing bell alarm clock",
      clueAs: "পাঁচটা পুৰণি ঘড়ী আৰু এটা ঘণ্টা থকা এলাৰ্ম ঘড়ী",
      clueHi: "पांच दीवार घड़ियां और एक अलार्म घड़ी",
      items: [
        { id: "r5_mc1", name: "Mantel Clock", nameAs: "পুৰণি ঘড়ী", nameHi: "दीवार घड़ी", emoji: "🕰️", isOdd: false, category: "Clock" },
        { id: "r5_mc2", name: "Mantel Clock", nameAs: "পুৰণি ঘড়ী", nameHi: "दीवार घड़ी", emoji: "🕰️", isOdd: false, category: "Clock" },
        { id: "r5_alarm", name: "Alarm Clock", nameAs: "এলাৰ্ম ঘড়ী", nameHi: "अलार्म घड़ी", emoji: "⏰", isOdd: true, category: "Alarm Clock" },
        { id: "r5_mc3", name: "Mantel Clock", nameAs: "পুৰণি ঘড়ী", nameHi: "दीवार घड़ी", emoji: "🕰️", isOdd: false, category: "Clock" },
        { id: "r5_mc4", name: "Mantel Clock", nameAs: "পুৰণি ঘড়ী", nameHi: "दीवार घड़ी", emoji: "🕰️", isOdd: false, category: "Clock" },
        { id: "r5_mc5", name: "Mantel Clock", nameAs: "পুৰণি ঘড়ী", nameHi: "दीवार घड़ी", emoji: "🕰️", isOdd: false, category: "Clock" },
      ],
    },
  ],
};

export default function OddOneOutScreen() {
  const router = useRouter();
  const { t, currentLang } = useTranslation();

  // ── Gameplay State ─────────────────────────────────────────────────────────
  const [round, setRound] = useState<number>(1);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [currentRoundData, setCurrentRoundData] = useState<OddOneOutRoundData | null>(null);
  const [shuffledItems, setShuffledItems] = useState<OddOneOutItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
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
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── Helper: Get Localized Item Name ────────────────────────────────────────
  const getItemName = (item: OddOneOutItem) => {
    if (currentLang === "as") return item.nameAs;
    if (currentLang === "hi") return item.nameHi;
    return item.name;
  };

  // ── Helper: Get Localized Clue ─────────────────────────────────────────────
  const getClueText = (roundData: OddOneOutRoundData) => {
    if (currentLang === "as") return roundData.clueAs;
    if (currentLang === "hi") return roundData.clueHi;
    return roundData.clueEn;
  };

  // ── 1. Start / Setup Round ─────────────────────────────────────────────────
  const setupRound = useCallback(
    async (roundNum: number) => {
      const candidates = ROUND_SETS[roundNum] || ROUND_SETS[1];
      const selectedSet = candidates[Math.floor(Math.random() * candidates.length)];

      // Shuffle item positions so odd item is unpredictable
      const randomizedItems = [...selectedSet.items].sort(() => 0.5 - Math.random());
      const oddItem = selectedSet.items.find((i) => i.isOdd);

      setRound(roundNum);
      setCurrentRoundData(selectedSet);
      setShuffledItems(randomizedItems);
      setSelectedItemId(null);
      setAttempts(1);
      setHintUsedInRound(false);
      setHintRevealed(false);
      setFeedbackMessage(null);
      setIsProcessing(false);
      roundStartTimeRef.current = Date.now();

      // Trigger smooth fade animation
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();

      // Record round_started event in GameSessionService
      if (sessionIdRef.current) {
        try {
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "odd_one_out",
            eventType: "round_started",
            metadata: {
              round: roundNum,
              difficulty: selectedSet.difficulty,
              difficultyLabel: selectedSet.difficultyLabel,
              itemsCount: randomizedItems.length,
              oddItem: oddItem?.name || "Unknown",
              itemsShown: randomizedItems.map((i) => i.name),
            },
          });
        } catch {
          // Non-blocking persistence
        }
      }

      // Voice prompt: gentle instruction
      try {
        const prompt =
          currentLang === "as"
            ? "অমিল বস্তুটো বাছনি কৰক"
            : currentLang === "hi"
            ? "अलग वस्तु को पहचानें"
            : "Tap the odd item";
        VoiceAssistant.speak(prompt, currentLang);
      } catch {
        // Optional voice
      }
    },
    [currentLang, fadeAnim]
  );

  // ── 2. Initialize Game Session on Mount ─────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    gameStartTimeRef.current = Date.now();

    const init = async () => {
      try {
        const session = await gameSessionService.startSession({
          gameId: "odd_one_out",
          metadata: {
            gameTitle: "Odd One Out",
            totalRounds: TOTAL_ROUNDS,
            mode: "cognitive_attention",
          },
        });
        if (isMounted && session) {
          sessionIdRef.current = session.sessionId;
        }
      } catch (err) {
        console.warn("[OddOneOut] Failed to start game session:", err);
      }
      if (isMounted) {
        setupRound(1);
      }
    };

    init();

    return () => {
      isMounted = false;
      // Early exit abandonment: if exited before completing all 5 rounds
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

    if (sessionIdRef.current && currentRoundData) {
      try {
        await gameSessionService.recordEvent({
          sessionId: sessionIdRef.current,
          gameId: "odd_one_out",
          eventType: "hint_used",
          metadata: {
            round,
            difficulty: currentRoundData.difficulty,
          },
        });
      } catch {
        // Non-blocking
      }
    }

    try {
      if (currentRoundData) {
        VoiceAssistant.speak(getClueText(currentRoundData), currentLang);
      }
    } catch {
      // Optional voice
    }
  };

  // ── 4. Item Selection & Evaluation ─────────────────────────────────────────
  const handleSelectItem = async (item: OddOneOutItem) => {
    if (isProcessing || isCompleted) return;
    setIsProcessing(true);
    setSelectedItemId(item.id);

    const responseTimeMs = Date.now() - roundStartTimeRef.current;
    const isCorrect = item.isOdd;
    const oddItem = currentRoundData?.items.find((i) => i.isOdd);

    // Record answer_submitted event
    if (sessionIdRef.current) {
      try {
        await gameSessionService.recordEvent({
          sessionId: sessionIdRef.current,
          gameId: "odd_one_out",
          eventType: "answer_submitted",
          metadata: {
            round,
            difficulty: currentRoundData?.difficulty,
            selectedItem: item.name,
            oddItem: oddItem?.name || "Unknown",
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
      // ── CORRECT ────────────────────────────────────────────────────────────
      setIsCorrectFeedback(true);
      const pointsEarned = hintUsedInRound
        ? BASE_POINTS_PER_ROUND - HINT_PENALTY_POINTS
        : BASE_POINTS_PER_ROUND;
      const nextTotalScore = totalScore + pointsEarned;
      setRoundScore(pointsEarned);
      setTotalScore(nextTotalScore);

      setFeedbackMessage(
        currentLang === "as"
          ? "সুন্দৰ! আপুনি অমিল বস্তুটো পালে 🌟"
          : currentLang === "hi"
          ? "बहुत बढ़िया! आपने अलग वस्तु पहचान ली 🌟"
          : "Wonderful! You found the odd item 🌟"
      );

      // Record answer_correct & round_completed events
      if (sessionIdRef.current) {
        try {
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "odd_one_out",
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
            gameId: "odd_one_out",
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

      // Check if this was the 5th and final round
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
      // ── INCORRECT (Gentle retry, elderly-friendly) ─────────────────────────
      setIsCorrectFeedback(false);
      totalMistakesRef.current += 1;
      setAttempts((prev) => prev + 1);

      setFeedbackMessage(
        currentLang === "as"
          ? "অলপ হেৰফেৰ হ'ল! আকৌ এবাৰ ভালদৰে চাওক 🌿"
          : currentLang === "hi"
          ? "थोड़ा सा अंतर रहा! फिर से ध्यान से देखें 🌿"
          : "Almost! Look closely and try again 🌿"
      );

      // Record answer_incorrect event
      if (sessionIdRef.current) {
        try {
          await gameSessionService.recordEvent({
            sessionId: sessionIdRef.current,
            gameId: "odd_one_out",
            eventType: "answer_incorrect",
            metadata: {
              round,
              selectedItem: item.name,
              attempts,
              responseTimeMs,
            },
          });
        } catch {
          // Non-blocking
        }
      }

      // Forgiving retry: after 1400ms delay, allow patient to tap again
      setTimeout(() => {
        setSelectedItemId(null);
        setFeedbackMessage(null);
        setIsProcessing(false);
      }, 1400);
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
        console.warn("[OddOneOut] completeSession error:", err);
      }
    }

    // 2. Bridge to Companion Context Persistence (Raw Event Pipeline)
    try {
      await companionContextService.recordRawGameEvent({
        gameId: "odd_one_out",
        eventType: "game_completed",
        payload: {
          gameName: "Odd One Out",
          score: finalScore,
          durationSeconds,
          accuracyPercent,
          completed: true,
          difficulty: "5 Rounds (Easy → Mastery)",
          metadata: {
            totalRounds: TOTAL_ROUNDS,
            totalMistakes: totalMistakesRef.current,
          },
        },
      });
    } catch (rawErr) {
      console.warn("[OddOneOut] Companion context bridge error:", rawErr);
    }

    // 3. Flow to Caregiver Dashboard Storage
    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const caregiverSession: CognitiveGameSession = {
        id: `sess-ooo-${Date.now()}`,
        gameName: "Odd One Out",
        iconEmoji: "🔎",
        timestamp: `Today · ${timeStr}`,
        durationMinutes,
        score: finalScore,
        accuracyPercent,
        mistakes: totalMistakesRef.current,
        responseTime: "Sharp visual focus",
        difficulty: "Level 1 → 5 (4-6 items)",
        difficultyChangeReason: "Progressed through subtle visual distinction scaling.",
        completed: true,
        humanSummary: `Completed all 5 rounds finding odd items across familiar objects and visual variants with ${accuracyPercent}% accuracy.`,
      };
      await caregiverStorage.recordGameSession(caregiverSession);
    } catch (cgErr) {
      console.warn("[OddOneOut] Caregiver storage record error:", cgErr);
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
        gameId: "odd_one_out",
        metadata: {
          gameTitle: "Odd One Out",
          totalRounds: TOTAL_ROUNDS,
          mode: "cognitive_attention",
        },
      });
      if (session) {
        sessionIdRef.current = session.sessionId;
      }
    } catch (err) {
      console.warn("[OddOneOut] Restart session error:", err);
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
                ? "সুন্দৰ মনোযোগ!"
                : currentLang === "hi"
                ? "शानदार एकाग्रता!"
                : "Wonderful Focus!"}
            </Text>
            <Text style={styles.resultSubtitle}>
              {currentLang === "as"
                ? "আপুনি আটাইকেইটা ৫ টা পৰ্যায়তে অমিল ছবি সঠিকভাৱে চিনাক্ত কৰিলে।"
                : currentLang === "hi"
                ? "आपने सभी 5 स्तरों में अलग चित्रों को सही पहचाना।"
                : "You identified all unique items across 5 progressive rounds."}
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
                    ? "উত্কৃষ্ট মনোযোগ"
                    : currentLang === "hi"
                    ? "उत्कृष्ट ध्यान"
                    : "Excellent Attention"
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
              onPress={() => router.back()}
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
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="chevron-left" size={28} color="#1E293B" />
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <Text style={styles.gameHeaderTitle}>
            {currentLang === "as"
              ? "অমিলটো বিচাৰক"
              : currentLang === "hi"
              ? "अलग चित्र पहचानें"
              : "Odd One Out"}
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
        {/* Instruction & Category Header */}
        <Animated.View style={[styles.instructionCard, { opacity: fadeAnim }]}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>
              {currentRoundData?.difficultyLabel || `Level ${round}`}
            </Text>
          </View>
          <Text style={styles.instructionHeading}>
            {currentLang === "as"
              ? "কোনটো ছবি বেলেগ? স্পৰ্শ কৰক"
              : currentLang === "hi"
              ? "कौन सा चित्र अलग है? स्पर्श करें"
              : "Which item is different? Tap it"}
          </Text>
          <Text style={styles.instructionSubheading}>
            {currentLang === "as"
              ? "বাকী আটাইবোৰ একে, কেৱল এটাহে অমিল।"
              : currentLang === "hi"
              ? "बाकी सभी एक जैसे हैं, केवल एक अलग है।"
              : "Most items belong together. Exactly one does not."}
          </Text>
        </Animated.View>

        {/* Revealed Clue Banner (If hint activated) */}
        {hintRevealed && currentRoundData && (
          <View style={styles.clueBanner}>
            <MaterialCommunityIcons name="lightbulb-on" size={20} color="#D97706" />
            <Text style={styles.clueBannerText}>{getClueText(currentRoundData)}</Text>
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

        {/* Grid of Items */}
        <Animated.View style={[styles.gridContainer, { opacity: fadeAnim }]}>
          <View
            style={[
              styles.gridRowWrap,
              shuffledItems.length > 4 ? styles.gridRowWrapSix : styles.gridRowWrapFour,
            ]}
          >
            {shuffledItems.map((item) => {
              const isSelected = selectedItemId === item.id;
              const isCorrectCard = isSelected && isCorrectFeedback;
              const isIncorrectCard = isSelected && !isCorrectFeedback && feedbackMessage !== null;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.itemCard,
                    shuffledItems.length > 4 ? styles.itemCardSix : styles.itemCardFour,
                    isSelected && styles.itemCardSelected,
                    isCorrectCard && styles.itemCardCorrect,
                    isIncorrectCard && styles.itemCardIncorrect,
                  ]}
                  onPress={() => handleSelectItem(item)}
                  activeOpacity={0.8}
                  disabled={isProcessing}
                >
                  <Text style={styles.itemEmoji}>{item.emoji}</Text>
                  <Text style={styles.itemNameText} numberOfLines={1}>
                    {getItemName(item)}
                  </Text>

                  {/* Status Indicator Icon */}
                  {isCorrectCard && (
                    <View style={styles.cardStatusBadgeCorrect}>
                      <Feather name="check" size={16} color="#FFFFFF" />
                    </View>
                  )}
                  {isIncorrectCard && (
                    <View style={styles.cardStatusBadgeIncorrect}>
                      <Feather name="rotate-ccw" size={14} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Score & Encouragement Footer */}
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
                ? "ধীৰে ধীৰে চাই আনন্দৰে খেলক 🌸"
                : currentLang === "hi"
                ? "आराम से देखें और खेल का आनंद लें 🌸"
                : "Take your time and enjoy each round 🌸"}
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
    color: "#0284C7",
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
    backgroundColor: "#0284C7",
  },

  // Main Scroll
  mainScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },

  // Instruction Card
  instructionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Shadows.sm,
  },
  levelBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0369A1",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  instructionHeading: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  instructionSubheading: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
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

  // Grid
  gridContainer: {
    marginBottom: 16,
  },
  gridRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  gridRowWrapFour: {
    // 2x2 grid
  },
  gridRowWrapSix: {
    // 2x3 or 3x2 grid
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    ...Shadows.sm,
  },
  itemCardFour: {
    width: (width - 44) / 2,
    height: 140,
    padding: 12,
  },
  itemCardSix: {
    width: (width - 44) / 2,
    height: 125,
    padding: 10,
  },
  itemCardSelected: {
    borderColor: "#0284C7",
    backgroundColor: "#F0F9FF",
  },
  itemCardCorrect: {
    borderColor: "#059669",
    backgroundColor: "#F0FDF4",
  },
  itemCardIncorrect: {
    borderColor: "#F97316",
    backgroundColor: "#FFF7ED",
  },
  itemEmoji: {
    fontSize: 48,
    marginBottom: 6,
  },
  itemNameText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    textAlign: "center",
  },
  cardStatusBadgeCorrect: {
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
  cardStatusBadgeIncorrect: {
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
