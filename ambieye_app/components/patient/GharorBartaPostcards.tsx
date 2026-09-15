import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTranslation } from "@/constants/i18n";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import { FamilySentItem } from "@/utils/caregiverStorage";
import { Colors, Spacing, WarmPalette } from "@/constants/theme";

const { width } = Dimensions.get("window");

interface Props {
  items: FamilySentItem[];
}

export function GharorBartaPostcards({ items }: Props) {
  const { currentLang } = useTranslation();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [lovedIds, setLovedIds] = useState<Record<string, boolean>>({});

  const handleListenPostcard = (item: FamilySentItem) => {
    setPlayingId(item.id);
    const speakText = `${item.senderName} says: ${item.content}`;
    VoiceAssistant.speak(speakText, currentLang);

    const duration = Math.max(3500, item.content.length * 70);
    setTimeout(() => {
      setPlayingId(null);
    }, duration);
  };

  const handleSendLoveBack = (item: FamilySentItem) => {
    setLovedIds((prev) => ({ ...prev, [item.id]: true }));
    const feedbackMsg =
      currentLang === "as"
        ? `${item.senderName} লৈ আপোনাৰ আন্তৰিক মৰম আৰু আশীৰ্বাদ পঠোৱা হ'ল! ❤️`
        : currentLang === "hi"
        ? `${item.senderName} को आपका स्नेह और आशीर्वाद भेज दिया गया! ❤️`
        : `Sent your loving blessings back to ${item.senderName}! ❤️`;

    VoiceAssistant.speak(feedbackMsg, currentLang);
  };

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header with Vintage Mail Horn & Envelope */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.titleWithIcon}>
          <View style={styles.headerIconCircle}>
            <MaterialCommunityIcons name="email-seal-outline" size={24} color="#BE123C" />
          </View>
          <View>
            <Text style={styles.sectionTitle}>
              {currentLang === "as"
                ? "ঘৰৰ চিঠি আৰু বাৰ্তা · চিঠিপত্ৰ"
                : currentLang === "hi"
                ? "घर की चिट्ठी · परिवार के पत्र"
                : "Gharor Barta · Family Letters"}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {currentLang === "as"
                ? "পৰিয়ালে আপোনালৈ মৰমেৰে পঠোৱা চিঠি আৰু কণ্ঠস্বৰ"
                : currentLang === "hi"
                ? "परिवार द्वारा भेजे गए विशेष पत्र एवं आवाज"
                : "Real loving voice letters & postcards delivered from home"}
            </Text>
          </View>
        </View>

        <View style={styles.unreadPill}>
          <Text style={styles.unreadPillText}>{items.length} Letters</Text>
        </View>
      </View>

      {/* Tactile Real Physical Postcards Feed */}
      <View style={styles.postcardsFeed}>
        {items.map((item, index) => {
          const isPlaying = playingId === item.id;
          const isLoved = !!lovedIds[item.id];

          // Dynamic sender aesthetics
          const isAnita = item.senderName.includes("Anita");
          const isRahul = item.senderName.includes("Rahul");
          const senderEmoji = isAnita ? "👩" : isRahul ? "👨‍💼" : "🏏";
          const senderRelation = isAnita
            ? currentLang === "as"
              ? "মৰমৰ কন্যা অনিতা"
              : currentLang === "hi"
              ? "प्यारी बेटी अनिता"
              : "Daughter Anita"
            : isRahul
            ? currentLang === "as"
              ? "পুত্ৰ ৰাহুল (গুৱাহাটী)"
              : currentLang === "hi"
              ? "बेटा राहुल"
              : "Son Rahul"
            : currentLang === "as"
            ? "নাতি অৰ্জুন"
            : currentLang === "hi"
            ? "पोता अर्जुन"
            : "Grandson Arjun";

          return (
            <View key={item.id} style={styles.vintageLetterCard}>
              {/* Top Postcard Bar: Stamp & Postmark */}
              <View style={styles.letterTopBar}>
                {/* Sender Avatar & Relationship */}
                <View style={styles.senderBadgeGroup}>
                  <View style={styles.senderAvatarBox}>
                    <Text style={{ fontSize: 24 }}>{senderEmoji}</Text>
                  </View>
                  <View>
                    <Text style={styles.senderNameTitle}>{item.senderName}</Text>
                    <Text style={styles.senderRelationSubtitle}>{senderRelation}</Text>
                  </View>
                </View>

                {/* Vintage Postmark Stamp */}
                <View style={styles.vintageStampBox}>
                  <View style={styles.stampInnerBorder}>
                    <MaterialCommunityIcons name="feather" size={12} color="#991B1B" />
                    <Text style={styles.stampText}>GH-POST</Text>
                  </View>
                  <Text style={styles.stampDate}>{item.timestamp}</Text>
                </View>
              </View>

              {/* Decorative Divider with Postal Stitch */}
              <View style={styles.postalStitchDivider} />

              {/* Title & Body of the Real Letter */}
              <View style={styles.letterBodyContainer}>
                {item.title ? <Text style={styles.letterTitleText}>{item.title}</Text> : null}
                <Text style={styles.letterContentText}>"{item.content}"</Text>
              </View>

              {/* 2 Big Action Buttons: 1-Tap Voice Audio Player & Send Love Back */}
              <View style={styles.letterActionsRow}>
                {/* Play Voice Letter */}
                <TouchableOpacity
                  style={[styles.playVoiceBtn, isPlaying && styles.playVoiceBtnActive]}
                  onPress={() => handleListenPostcard(item)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name={isPlaying ? "volume-high" : "play-circle"}
                    size={22}
                    color={isPlaying ? "#FFFFFF" : "#1D4ED8"}
                  />
                  <Text style={[styles.playVoiceBtnText, isPlaying && { color: "#FFFFFF" }]} numberOfLines={1}>
                    {isPlaying
                      ? currentLang === "as"
                        ? "কণ্ঠ বাজি আছে..."
                        : currentLang === "hi"
                        ? "आवाज चल रही है..."
                        : "Playing Voice..."
                      : currentLang === "as"
                      ? "▶️ শুনক (Listen)"
                      : currentLang === "hi"
                      ? "▶️ सुनें (Listen)"
                      : "▶️ Listen to Voice"}
                  </Text>
                </TouchableOpacity>

                {/* Send Love Back Heart Button */}
                <TouchableOpacity
                  style={[styles.sendLoveBtn, isLoved && styles.sendLoveBtnLoved]}
                  onPress={() => handleSendLoveBack(item)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name={isLoved ? "heart" : "heart-outline"}
                    size={18}
                    color={isLoved ? "#FFFFFF" : "#BE123C"}
                  />
                  <Text style={[styles.sendLoveBtnText, isLoved && { color: "#FFFFFF" }]} numberOfLines={1}>
                    {isLoved
                      ? currentLang === "as"
                        ? "মৰম পঠোৱা হ'ল ❤️"
                        : currentLang === "hi"
                        ? "स्नेह भेजा गया ❤️"
                        : "Love Sent! ❤️"
                      : currentLang === "as"
                      ? "মৰম পঠাওক"
                      : currentLang === "hi"
                      ? "स्नेह भेजें"
                      : "Send Love"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFDF9",
    borderRadius: 24,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    shadowColor: "#92400E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  titleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  unreadPill: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  unreadPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#92400E",
  },
  postcardsFeed: {
    gap: 14,
  },
  vintageLetterCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  letterTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  senderBadgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  senderAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
  },
  senderNameTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  senderRelationSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#B45309",
    marginTop: 1,
  },
  vintageStampBox: {
    alignItems: "center",
  },
  stampInnerBorder: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderStyle: "dashed",
  },
  stampText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#991B1B",
    letterSpacing: 0.5,
  },
  stampDate: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
    fontWeight: "600",
  },
  postalStitchDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 12,
  },
  letterBodyContainer: {
    marginBottom: 14,
  },
  letterTitleText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  letterContentText: {
    fontSize: 15,
    color: "#334155",
    lineHeight: 23,
    fontStyle: "italic",
  },
  letterActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  playVoiceBtn: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
  },
  playVoiceBtnActive: {
    backgroundColor: "#2563EB",
    borderColor: "#1D4ED8",
  },
  playVoiceBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1D4ED8",
  },
  sendLoveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFF1F2",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#FECDD3",
  },
  sendLoveBtnLoved: {
    backgroundColor: "#BE123C",
    borderColor: "#9F1239",
  },
  sendLoveBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#BE123C",
  },
});
