import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { WarmPalette } from "@/constants/theme";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import { useTranslation } from "@/constants/i18n";

export interface PhotoMemoryStory {
  id: string;
  title: string;
  titleAs: string;
  year: string;
  location: string;
  photoEmoji: string;
  cardColor: string;
  tag: string;
  storyEn: string;
  storyAs: string;
  storyHi: string;
}

export const PHOTO_MEMORIES: PhotoMemoryStory[] = [
  {
    id: "mem-majuli",
    title: "Majuli Island River Home",
    titleAs: "মাজুলীৰ ব্ৰহ্মপুত্ৰৰ পাৰৰ ঘৰ",
    year: "1985 · Ancestral Home",
    location: "Majuli, Assam",
    photoEmoji: "🏞️",
    cardColor: "#FEF3C7",
    tag: "Childhood & Roots",
    storyEn:
      "Look at this peaceful morning in Majuli! You were sitting on the wooden veranda by the Brahmaputra, with red hibiscus flowers blooming and little Rahul watching the wooden riverboat.",
    storyAs:
      "মাজুলীৰ পুৰণি ঘৰখন চাওক! ব্ৰহ্মপুত্ৰৰ শীতল বতাহ, বাৰাণ্ডাৰ জবা ফুল আৰু সৰু ৰাহুলে নদীৰ নাও চাই থকা সেই সুন্দৰ পুৱাৰ মধুৰ স্মৃতি।",
    storyHi:
      "माजुली के इस खूबसूरत घर को देखिए! ब्रह्मपुत्र नदी के किनारे का शांत आंगन, लाल गुड़हल के फूल और नावों को देखने की मीठी यादें।",
  },
  {
    id: "mem-arjun",
    title: "Grandson Arjun's Cricket Match",
    titleAs: "নাতি অৰ্জুনৰ ক্ৰিকেট খেল",
    year: "2024 · Victory Day",
    location: "Guwahati, Assam",
    photoEmoji: "🏏",
    cardColor: "#EFF6FF",
    tag: "Family Pride",
    storyEn:
      "Here is young Arjun smiling proudly with his left-handed cricket bat! He scored 24 runs and ran straight to your lap to show his shiny golden medal.",
    storyAs:
      "ইয়ালৈ চাওক, নাতি অৰ্জুনে বাওঁহতীয়া বেটেৰে ২৪ ৰাণ কৰি মেডেল লৈয়েই ককাৰ ওচৰলৈ দৌৰি আহিছিল। সি আপোনাক বৰ ভাল পায়!",
    storyHi:
      "यहाँ देखिए, पोता अर्जुन अपने क्रिकेट बैट और मेडल के साथ कितना मुस्कुरा रहा है! मैच जीतकर वह सीधे आपके पास आया था।",
  },
  {
    id: "mem-kerala",
    title: "Kerala Backwaters Houseboat Trip",
    titleAs: "কেৰালাৰ নাৱৰ ভ্ৰমণ",
    year: "Winter 1998 · Family Holiday",
    location: "Alleppey Backwaters",
    photoEmoji: "⛵",
    cardColor: "#ECFDF5",
    tag: "Holiday Joy",
    storyEn:
      "Remember this joyful winter trip in 1998? You, daughter Anita, and son Rahul sailed on a traditional wooden houseboat across the calm palm-fringed backwaters.",
    storyAs:
      "মনত আছেনে ১৯৯৮ চনৰ এই নাৱৰ ভ্ৰমণ? আপুনি, জীয়ৰী অনিতা আৰু পুত্ৰ ৰাহুলে নাৰিকল গছৰ মাজেৰে কিমান যে আনন্দৰে সময় কটাইছিল!",
    storyHi:
      "१९९८ की यह पारिवारिक यात्रा याद है ना? आप, अनिता और राहुल ने हाउसबोट पर नारियल के पेड़ों के बीच कितना सुंदर समय बिताया था!",
  },
  {
    id: "mem-garden",
    title: "Kamrup Courtyard Orchids & Basil",
    titleAs: "কামৰূপৰ বাৰাণ্ডাৰ কপৌ ফুল আৰু তুলসী",
    year: "Present Day · Daily Joy",
    location: "Kamrup, Assam",
    photoEmoji: "🪴",
    cardColor: "#FAF5FF",
    tag: "Daily Sanctuary",
    storyEn:
      "Your peaceful courtyard garden in Kamrup, where you tend to the blooming Assam orchids and water the sacred Tulsi plant in the warm morning sun.",
    storyAs:
      "কামৰূপৰ আমাৰ ঘৰৰ বাৰাণ্ডাৰ কপৌ ফুল আৰু তুলসী গছজোপাৰ ছবি! ৰাতিপুৱাৰ ৰ'দত গছবোৰৰ যত্ন ল'লে মনটো বৰ শান্ত হয়।",
    storyHi:
      "कामरूप के अपने घर का आंगन और सुंदर आर्किड फूल! सुबह की धूप में तुलसी की सेवा करना आपके मन को बहुत शांति देता है।",
  },
];

interface SmritiPhotobookProps {
  onAskCompanion?: (storyPrompt: string) => void;
}

export const SmritiPhotobook: React.FC<SmritiPhotobookProps> = ({ onAskCompanion }) => {
  const { currentLang } = useTranslation();
  const [selectedPhotoId, setSelectedPhotoId] = useState<string>("mem-majuli");
  const [isSpeaking, setIsSpeaking] = useState(false);

  const activePhoto = PHOTO_MEMORIES.find((p) => p.id === selectedPhotoId) || PHOTO_MEMORIES[0];

  const getStoryText = (item: PhotoMemoryStory) => {
    if (currentLang === "as") return item.storyAs;
    if (currentLang === "hi") return item.storyHi;
    return item.storyEn;
  };

  const handleTapPhoto = (item: PhotoMemoryStory) => {
    setSelectedPhotoId(item.id);
    setIsSpeaking(true);
    const story = getStoryText(item);
    VoiceAssistant.speak(story, currentLang);
    setTimeout(() => setIsSpeaking(false), Math.max(3000, story.length * 65));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBg}>
            <MaterialCommunityIcons name="image-album" size={22} color={WarmPalette.roseDusty} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Smriti Photobook · Family Stories</Text>
            <Text style={styles.headerSubtitle}>Tap any memory photo to hear its story aloud</Text>
          </View>
        </View>
        <View style={styles.photoCountPill}>
          <Text style={styles.photoCountText}>{PHOTO_MEMORIES.length} Memories</Text>
        </View>
      </View>

      {/* Horizontal Touch Photo Cards Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContainer}
      >
        {PHOTO_MEMORIES.map((item) => {
          const isSelected = item.id === selectedPhotoId;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.photoThumbCard,
                { backgroundColor: item.cardColor },
                isSelected && styles.photoThumbCardSelected,
              ]}
              onPress={() => handleTapPhoto(item)}
              activeOpacity={0.8}
            >
              <View style={styles.photoEmojiCircle}>
                <Text style={styles.photoEmojiBig}>{item.photoEmoji}</Text>
              </View>
              <Text style={styles.photoThumbYear}>{item.year.split("·")[0].trim()}</Text>
              <Text style={styles.photoThumbTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.tapToHearBadge}>
                <Feather name="volume-2" size={12} color={isSelected ? "#2563EB" : "#64748B"} />
                <Text style={[styles.tapToHearText, isSelected && { color: "#2563EB" }]}>
                  {isSelected ? "Listening" : "Tap to Hear"}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Active Story Spotlight Card */}
      <View style={styles.spotlightCard}>
        <View style={styles.spotlightTopBar}>
          <View style={styles.spotlightTagBadge}>
            <Text style={styles.spotlightTagText}>{activePhoto.tag.toUpperCase()}</Text>
          </View>
          <Text style={styles.spotlightLocation}>
            <Feather name="map-pin" size={11} color="#64748B" /> {activePhoto.location} · {activePhoto.year}
          </Text>
        </View>

        <Text style={styles.spotlightTitle}>
          {currentLang === "as" ? activePhoto.titleAs : activePhoto.title}
        </Text>

        <Text style={styles.spotlightStoryText}>{getStoryText(activePhoto)}</Text>

        {/* Action Row */}
        <View style={styles.spotlightActionsRow}>
          <TouchableOpacity
            style={styles.listenAgainBtn}
            onPress={() => handleTapPhoto(activePhoto)}
            activeOpacity={0.8}
          >
            <Feather name="volume-2" size={16} color="#1D4ED8" />
            <Text style={styles.listenAgainText} numberOfLines={1}>
              {currentLang === "as"
                ? "▶️ শুনক (Listen)"
                : currentLang === "hi"
                ? "▶️ सुनें (Listen)"
                : "▶️ Listen to Story"}
            </Text>
          </TouchableOpacity>

          {onAskCompanion && (
            <TouchableOpacity
              style={styles.askCompanionBtn}
              onPress={() => onAskCompanion(activePhoto.title)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="chat-processing-outline" size={17} color="#FFFFFF" />
              <Text style={styles.askCompanionText} numberOfLines={1}>
                {currentLang === "as"
                  ? "কথা পাতক 🌸"
                  : currentLang === "hi"
                  ? "बात करें 🌸"
                  : "Talk with Mitr 🌸"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#FCE7F3",
    shadowColor: WarmPalette.roseDusty,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFE4E6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  photoCountPill: {
    backgroundColor: "#FFE4E6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  photoCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#BE123C",
  },
  carouselContainer: {
    gap: 10,
    paddingBottom: 4,
    marginBottom: 12,
  },
  photoThumbCard: {
    width: 140,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  photoThumbCardSelected: {
    borderColor: "#818CF8",
    borderWidth: 2,
    shadowColor: "#818CF8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  photoEmojiCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  photoEmojiBig: {
    fontSize: 26,
  },
  photoThumbYear: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 2,
  },
  photoThumbTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E2024",
    textAlign: "center",
    minHeight: 32,
  },
  tapToHearBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tapToHearText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },
  spotlightCard: {
    backgroundColor: "#FAF5FF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  spotlightTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  spotlightTagBadge: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  spotlightTagText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },
  spotlightLocation: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  spotlightTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E2024",
    marginBottom: 4,
  },
  spotlightStoryText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#475569",
    fontWeight: "500",
  },
  spotlightActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  listenAgainBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  listenAgainText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6366F1",
  },
  askCompanionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#6366F1",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  askCompanionText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
