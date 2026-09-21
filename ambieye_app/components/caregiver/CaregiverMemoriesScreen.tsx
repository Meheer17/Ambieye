import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { caregiverStorage, FamilySentItem } from "../../utils/caregiverStorage";
import { CaregiverSendToElderModal } from "./CaregiverSendToElderModal";

// --- TYPES ---
export type SendCategory =
  | "voice"
  | "photo"
  | "video"
  | "song"
  | "memory_prompt"
  | "note"
  | "custom";

export interface MemoryCardItem {
  id: string;
  title: string;
  category: "family" | "song" | "place" | "story";
  date: string;
  description: string;
  tag: string;
}

export interface PatientEngagementItem {
  id: string;
  sentTitle: string;
  type: SendCategory;
  reaction: string;
  reactionEmoji: string;
  timeAgo: string;
  duration?: string;
}

export const CaregiverMemoriesScreen: React.FC = () => {
  // Elder profile
  const elderName = "Lakshmi";
  const elderCallName = "Aita";

  // Modal states
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedSendType, setSelectedSendType] = useState<SendCategory>("voice");
  const [customPromptText, setCustomPromptText] = useState("");
  const [customTitle, setCustomTitle] = useState("");

  // Add Memory Modal
  const [showAddMemoryModal, setShowAddMemoryModal] = useState(false);
  const [newMemTitle, setNewMemTitle] = useState("");
  const [newMemCategory, setNewMemCategory] = useState<"family" | "song" | "place" | "story">("family");
  const [newMemDate, setNewMemDate] = useState("");
  const [newMemStory, setNewMemStory] = useState("");

  // Live Screen Preview Item
  const [activeKioskItem, setActiveKioskItem] = useState<{
    type: SendCategory;
    title: string;
    subtitle: string;
    sender: string;
    time: string;
  }>({
    type: "photo",
    title: "Aarav's 5th Birthday on Verandah",
    subtitle: "‘Aita, look how tall Aarav has grown!’ — Rishitha",
    sender: "Rishitha (Granddaughter)",
    time: "Displayed 20m ago",
  });

  // Recent Patient Reactions
  const [reactions, setReactions] = useState<PatientEngagementItem[]>([
    {
      id: "re-1",
      sentTitle: "Voice Note: 'Morning tea check from Rishitha'",
      type: "voice",
      reaction: "Listened 3 times & smiled warmly",
      reactionEmoji: "😊",
      timeAgo: "25 min ago",
      duration: "42s voice",
    },
    {
      id: "re-2",
      sentTitle: "Photo: Majuli Island Raas Leela Festival",
      type: "photo",
      reaction: "Recognized husband Bhaben & talked with companion for 6 mins",
      reactionEmoji: "❤️",
      timeAgo: "2 hours ago",
    },
    {
      id: "re-3",
      sentTitle: "Song: Dr. Bhupen Hazarika's 'Manuhe Manuhor Babe'",
      type: "song",
      reaction: "Hummed along with Antakshari music recall",
      reactionEmoji: "🎶",
      timeAgo: "Yesterday",
    },
  ]);

  // Memory Lane Curated Items
  const [memories, setMemories] = useState<MemoryCardItem[]>([
    {
      id: "m-1",
      title: "Majuli Raas Leela Celebration",
      category: "place",
      date: "Nov 1984",
      description: "Dressed in Muga silk and watched the traditional river drama.",
      tag: "Childhood Heritage",
    },
    {
      id: "m-2",
      title: "Courtyard Bihu Dance with Grandkids",
      category: "family",
      date: "April 2018",
      description: "Taught Aarav and Rishitha rhythmic Bihu hand movements.",
      tag: "Family Tradition",
    },
    {
      id: "m-3",
      title: "Manuhe Manuhor Babe Anthem",
      category: "song",
      date: "1975",
      description: "Favorite folk ballad that calms anxiety and brings deep peace.",
      tag: "Calming Music",
    },
    {
      id: "m-4",
      title: "Wedding Day at Dibrugarh Tea Estate",
      category: "story",
      date: "Feb 1970",
      description: "Traditional feast with freshly made pitha and jasmine flowers.",
      tag: "Life Milestone",
    },
  ]);

  // Handle Quick Tap on any Personalization Option
  const handleQuickSendOption = (type: SendCategory) => {
    setSelectedSendType(type);
    if (type === "voice") {
      setCustomTitle("Voice Message for " + elderCallName);
      setCustomPromptText("Hello Aita! Thinking of you today. Hope you enjoyed your morning tea!");
    } else if (type === "photo") {
      setCustomTitle("Family Photo for " + elderCallName);
      setCustomPromptText("Look at this beautiful family photo from our Sunday courtyard lunch!");
    } else if (type === "video") {
      setCustomTitle("Video Greeting from Grandchildren");
      setCustomPromptText("Aarav and Rishitha waving hello and singing 1 verse of Bihu song!");
    } else if (type === "song") {
      setCustomTitle("Nostalgic Folk Song");
      setCustomPromptText("Manuhe Manuhor Babe — Dr. Bhupen Hazarika (Plays gently on tablet)");
    } else if (type === "memory_prompt") {
      setCustomTitle("Reminiscence Story Prompt");
      setCustomPromptText("Do you remember the Jasmine garden in Jorhat, Amma?");
    } else if (type === "note") {
      setCustomTitle("Warm Loving Postcard Note");
      setCustomPromptText("Sending you a big warm hug! Rishitha will be home right after college.");
    } else {
      setCustomTitle("Special Personal Surprise");
      setCustomPromptText("A special greeting personalized with your favorite memories.");
    }
    setShowSendModal(true);
  };

  // Broadcast the item to Elder's Screen & Storage
  const handleConfirmSendToElder = async () => {
    if (!customPromptText.trim()) {
      Alert.alert("Missing Content", "Please enter a message or description to display on screen.");
      return;
    }

    try {
      const newSentItem: FamilySentItem = {
        id: "sent-" + Date.now(),
        type: selectedSendType === "memory_prompt" ? "photo" : (selectedSendType as any),
        senderName: "Caregiver",
        title: customTitle,
        content: `${customTitle}: ${customPromptText}`,
        timestamp: "Just now",
        delivered: true,
        isDelivered: true,
      };

      await caregiverStorage.saveFamilySentItem(newSentItem);

      // Update the live preview immediately
      setActiveKioskItem({
        type: selectedSendType,
        title: customTitle,
        subtitle: `‘${customPromptText}’`,
        sender: "Caregiver (Rishitha)",
        time: "Just sent to elder's screen",
      });

      // Add to patient engagement feed
      const newReaction: PatientEngagementItem = {
        id: "re-" + Date.now(),
        sentTitle: `${selectedSendType.toUpperCase()}: ${customTitle}`,
        type: selectedSendType,
        reaction: "Broadcasted live to Lakshmi's tablet kiosk",
        reactionEmoji: "✨",
        timeAgo: "Just now",
      };
      setReactions((prev) => [newReaction, ...prev]);

      setShowSendModal(false);
      Alert.alert(
        "✨ Sent to " + elderName + "'s Screen!",
        `This will immediately appear on ${elderName}'s tablet with large high-contrast display and audio chime to keep her happily engaged.`
      );
    } catch (e) {
      Alert.alert("Notice", "Sent to senior tablet kiosk.");
      setShowSendModal(false);
    }
  };

  // Add Memory to Memory Lane
  const handleSaveMemory = () => {
    if (!newMemTitle.trim() || !newMemStory.trim()) {
      Alert.alert("Required", "Please provide a title and memory description.");
      return;
    }
    const newM: MemoryCardItem = {
      id: "mem-" + Date.now(),
      title: newMemTitle.trim(),
      category: newMemCategory,
      date: newMemDate.trim() || "Recent",
      description: newMemStory.trim(),
      tag: "Personal Memory",
    };
    setMemories((prev) => [newM, ...prev]);
    setNewMemTitle("");
    setNewMemDate("");
    setNewMemStory("");
    setShowAddMemoryModal(false);
    Alert.alert("Memory Added", "New memory saved to Memory Lane.");
  };

  const getSendIcon = (type: SendCategory) => {
    switch (type) {
      case "voice":
        return "mic";
      case "photo":
        return "image";
      case "video":
        return "video";
      case "song":
        return "music";
      case "memory_prompt":
        return "help-circle";
      case "note":
        return "heart";
      default:
        return "star";
    }
  };

  const getSendColors = (type: SendCategory) => {
    switch (type) {
      case "voice":
        return { bg: "#ECFDF5", text: "#059669", border: "#A7F3D0" };
      case "photo":
        return { bg: "#EFF6FF", text: "#0284C7", border: "#BAE6FD" };
      case "video":
        return { bg: "#F5F3FF", text: "#7C3AED", border: "#DDD6FE" };
      case "song":
        return { bg: "#EEF2FF", text: "#4F46E5", border: "#C7D2FE" };
      case "memory_prompt":
        return { bg: "#F0F9FF", text: "#0369A1", border: "#BAE6FD" };
      case "note":
        return { bg: "#FFF1F2", text: "#E11D48", border: "#FECDD3" };
      default:
        return { bg: "#F1F5F9", text: "#334155", border: "#CBD5E1" };
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HERO: SEND PERSONALIZED ENGAGEMENT (VERY FIRST THING) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <View style={styles.heroSection}>
        <View style={styles.heroHeader}>
          <View style={styles.heroIconCircle}>
            <Feather name="send" size={20} color="#0284C7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Send to {elderName}'s Screen</Text>
            <Text style={styles.heroSub}>
              Choose what to show or play on {elderCallName}'s tablet to keep her joyful & engaged
            </Text>
          </View>
        </View>

        {/* 6 Grid Options to Choose From */}
        <View style={styles.optionsGrid}>
          {/* 1. Voice Note */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleQuickSendOption("voice")}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIcon, { backgroundColor: "#ECFDF5" }]}>
              <Feather name="mic" size={22} color="#059669" />
            </View>
            <Text style={styles.optionTitle}>Voice Note</Text>
            <Text style={styles.optionDesc}>Plays in family voice</Text>
          </TouchableOpacity>

          {/* 2. Family Photo */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleQuickSendOption("photo")}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIcon, { backgroundColor: "#EFF6FF" }]}>
              <Feather name="image" size={22} color="#0284C7" />
            </View>
            <Text style={styles.optionTitle}>Family Photo</Text>
            <Text style={styles.optionDesc}>Big visual display</Text>
          </TouchableOpacity>

          {/* 3. Video Greeting */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleQuickSendOption("video")}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIcon, { backgroundColor: "#F5F3FF" }]}>
              <Feather name="video" size={22} color="#7C3AED" />
            </View>
            <Text style={styles.optionTitle}>Video Greeting</Text>
            <Text style={styles.optionDesc}>Grandkids waving</Text>
          </TouchableOpacity>

          {/* 4. Favorite Song */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleQuickSendOption("song")}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIcon, { backgroundColor: "#EEF2FF" }]}>
              <Feather name="music" size={22} color="#4F46E5" />
            </View>
            <Text style={styles.optionTitle}>Favorite Song</Text>
            <Text style={styles.optionDesc}>Folk tune / prayer</Text>
          </TouchableOpacity>

          {/* 5. Memory Prompt */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleQuickSendOption("memory_prompt")}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIcon, { backgroundColor: "#F0F9FF" }]}>
              <Feather name="help-circle" size={22} color="#0369A1" />
            </View>
            <Text style={styles.optionTitle}>Story Prompt</Text>
            <Text style={styles.optionDesc}>“Remember Jorhat?”</Text>
          </TouchableOpacity>

          {/* 6. Warm Note */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleQuickSendOption("note")}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIcon, { backgroundColor: "#FFF1F2" }]}>
              <Feather name="heart" size={22} color="#E11D48" />
            </View>
            <Text style={styles.optionTitle}>Loving Note</Text>
            <Text style={styles.optionDesc}>Warm hug & postcard</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. LIVE ON ELDER'S SCREEN (HOW IT REFLECTS IN PATIENT APP)   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <View style={styles.kioskLiveCard}>
        <View style={styles.kioskLiveHeader}>
          <View style={styles.livePulseDot} />
          <Text style={styles.kioskLiveTitle}>Live on {elderName}'s Tablet</Text>
          <View style={styles.kioskOnlineBadge}>
            <Text style={styles.kioskOnlineBadgeText}>Tablet Connected</Text>
          </View>
        </View>

        {/* Live Mock Screen Preview */}
        <View style={styles.mockTabletScreen}>
          <View style={styles.mockScreenHeader}>
            <Text style={styles.mockElderGreeting}>✨ Good Evening, {elderCallName}</Text>
            <Feather name="wifi" size={14} color="#059669" />
          </View>

          <View style={styles.mockContentBox}>
            <View style={styles.mockContentIconBox}>
              <Feather name={getSendIcon(activeKioskItem.type) as any} size={20} color="#0284C7" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.mockContentTitle}>{activeKioskItem.title}</Text>
              <Text style={styles.mockContentSub}>{activeKioskItem.subtitle}</Text>
              <Text style={styles.mockContentSender}>
                From {activeKioskItem.sender} · {activeKioskItem.time}
              </Text>
            </View>
          </View>

          <View style={styles.mockActionBar}>
            <TouchableOpacity
              style={styles.mockPlayBtn}
              onPress={() =>
                Alert.alert(
                  "Interactive Simulation",
                  `Tablet is actively playing ‘${activeKioskItem.title}’ for ${elderCallName} with gentle audio prompts.`
                )
              }
            >
              <Feather name="volume-2" size={13} color="#FFFFFF" />
              <Text style={styles.mockPlayBtnText}>Tap to Replay on Tablet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. PATIENT ENGAGEMENT FEED (HOW ELDER REACTED)              */}
      {/* ───────────────────────────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardIconTitleRow}>
            <View style={[styles.sectionIconCircle, { backgroundColor: "#F0FDF4" }]}>
              <Feather name="smile" size={16} color="#059669" />
            </View>
            <View>
              <Text style={styles.cardTitle}>How {elderCallName} Engaged Today</Text>
              <Text style={styles.cardSubtitle}>
                Real reactions & emotional joy recorded from tablet interactions
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.reactionsList}>
          {reactions.map((item) => {
            const colors = getSendColors(item.type);
            return (
              <View key={item.id} style={styles.reactionItem}>
                <View style={[styles.reactionIconBadge, { backgroundColor: colors.bg }]}>
                  <Text style={{ fontSize: 16 }}>{item.reactionEmoji}</Text>
                </View>

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.reactionSentTitle}>{item.sentTitle}</Text>
                  <Text style={styles.reactionText}>{item.reaction}</Text>
                  <Text style={styles.reactionTime}>{item.timeAgo}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. MEMORY LANE (PERSONAL ALBUMS FOR RECALL)                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardIconTitleRow}>
            <View style={[styles.sectionIconCircle, { backgroundColor: "#EFF6FF" }]}>
              <Feather name="bookmark" size={16} color="#0284C7" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Memory Lane Albums</Text>
              <Text style={styles.cardSubtitle}>
                Stories and songs used during games & companion check-ins
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.addMemoryBtn}
            onPress={() => setShowAddMemoryModal(true)}
          >
            <Feather name="plus" size={13} color="#FFFFFF" />
            <Text style={styles.addMemoryBtnText}>Add Memory</Text>
          </TouchableOpacity>
        </View>

        {/* Memory Items */}
        <View style={styles.memoryGrid}>
          {memories.map((m) => (
            <View key={m.id} style={styles.memoryCard}>
              <View style={styles.memCardTop}>
                <View style={styles.memTagPill}>
                  <Text style={styles.memTagText}>{m.tag}</Text>
                </View>
                <Text style={styles.memDate}>{m.date}</Text>
              </View>
              <Text style={styles.memTitle}>{m.title}</Text>
              <Text style={styles.memDesc} numberOfLines={2}>
                {m.description}
              </Text>
              <TouchableOpacity
                style={styles.broadcastMemoryBtn}
                onPress={() => {
                  setActiveKioskItem({
                    type: "photo",
                    title: m.title,
                    subtitle: m.description,
                    sender: "Caregiver (Memory Lane)",
                    time: "Just sent",
                  });
                  Alert.alert(
                    "Broadcast to Screen",
                    `‘${m.title}’ is now actively displaying on ${elderName}'s tablet screen!`
                  );
                }}
              >
                <Feather name="cast" size={12} color="#0284C7" />
                <Text style={styles.broadcastMemoryBtnText}>Show on Tablet Screen</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. CULTURAL PREFERENCES (NER & ANTAKSHARI)                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <View style={[styles.card, { marginBottom: 30 }]}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardIconTitleRow}>
            <View style={[styles.sectionIconCircle, { backgroundColor: "#F5F3FF" }]}>
              <Feather name="music" size={16} color="#7C3AED" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Cultural Anchors for Antakshari</Text>
              <Text style={styles.cardSubtitle}>
                Familiar songs & traditions {elderName} loves most
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.tagWrap}>
          {[
            "🎵 Manuhe Manuhor Babe",
            "🎵 Buku Hom Hom Kore",
            "🎉 Rongali Bihu",
            "☕ Cardamom Ginger Tea",
            "🌿 Majuli Island",
            "🍲 Masor Tenga",
          ].map((tag, idx) => (
            <View key={idx} style={styles.culturalChip}>
              <Text style={styles.culturalChipText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: COMPOSE & SEND TO ELDER SCREEN                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Modal
        visible={showSendModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSendModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Send to {elderCallName}'s Screen</Text>
                <Text style={styles.modalSub}>
                  Displays immediately on tablet in large readable text with voice prompt
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowSendModal(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Type Switcher */}
              <Text style={styles.inputLabel}>Choose Personalization Type</Text>
              <View style={styles.typeSwitcherRow}>
                {(
                  [
                    { id: "voice", label: "🎙️ Voice Note" },
                    { id: "photo", label: "📸 Photo" },
                    { id: "video", label: "🎥 Video" },
                    { id: "song", label: "🎵 Song" },
                    { id: "memory_prompt", label: "💭 Story" },
                    { id: "note", label: "💌 Note" },
                  ] as { id: SendCategory; label: string }[]
                ).map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.typeChip,
                      selectedSendType === item.id && styles.typeChipActive,
                    ]}
                    onPress={() => setSelectedSendType(item.id)}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        selectedSendType === item.id && styles.typeChipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Title / Subject</Text>
              <TextInput
                style={styles.modalInput}
                value={customTitle}
                onChangeText={setCustomTitle}
                placeholder="e.g. Morning Greeting from Grandkids"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>
                Message or Content Description (Appears on Elder's Tablet)
              </Text>
              <TextInput
                style={[styles.modalInput, { height: 90, textAlignVertical: "top" }]}
                value={customPromptText}
                onChangeText={setCustomPromptText}
                placeholder="Type your warm reassuring message or select memory details..."
                placeholderTextColor="#94A3B8"
                multiline
              />

              {/* Instant Tablet Preview Box */}
              <View style={styles.sendPreviewBox}>
                <Text style={styles.sendPreviewLabel}>Elder Tablet Preview:</Text>
                <Text style={styles.sendPreviewTitle}>{customTitle || "New Personal Note"}</Text>
                <Text style={styles.sendPreviewBody}>
                  {customPromptText || "Your message will appear here with audio chime."}
                </Text>
              </View>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowSendModal(false)}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSendBtn}
                  onPress={handleConfirmSendToElder}
                >
                  <Feather name="send" size={14} color="#FFFFFF" />
                  <Text style={styles.modalSendBtnText}>Show on Tablet Now</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: ADD NEW MEMORY                                        */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Modal
        visible={showAddMemoryModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddMemoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Memory to Memory Lane</Text>
              <TouchableOpacity onPress={() => setShowAddMemoryModal(false)}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Memory Title</Text>
              <TextInput
                style={styles.modalInput}
                value={newMemTitle}
                onChangeText={setNewMemTitle}
                placeholder="e.g. Garden flowers in Jorhat"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Era / Approximate Date</Text>
              <TextInput
                style={styles.modalInput}
                value={newMemDate}
                onChangeText={setNewMemDate}
                placeholder="e.g. 1980s, Childhood"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Memory Story or Sensory Detail</Text>
              <TextInput
                style={[styles.modalInput, { height: 90, textAlignVertical: "top" }]}
                value={newMemStory}
                onChangeText={setNewMemStory}
                placeholder="Describe what happened and feelings to trigger reminiscence..."
                placeholderTextColor="#94A3B8"
                multiline
              />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowAddMemoryModal(false)}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSendBtn} onPress={handleSaveMemory}>
                  <Text style={styles.modalSendBtnText}>Save Memory</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 90,
  },

  // 1. Hero Section (Send to Screen)
  heroSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
  },
  heroIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  heroSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 16,
  },

  // 6 Option Grid
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionCard: {
    width: "48.5%",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "flex-start",
  },
  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  optionDesc: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },

  // 2. Live Kiosk Card
  kioskLiveCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  kioskLiveHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 6,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#059669",
  },
  kioskLiveTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
  },
  kioskOnlineBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  kioskOnlineBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#047857",
  },
  mockTabletScreen: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  mockScreenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  mockElderGreeting: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
  },
  mockContentBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#1E293B",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  mockContentIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
  },
  mockContentTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  mockContentSub: {
    fontSize: 12,
    color: "#94A3B8",
    fontStyle: "italic",
    marginTop: 2,
    lineHeight: 16,
  },
  mockContentSender: {
    fontSize: 10,
    color: "#38BDF8",
    marginTop: 4,
    fontWeight: "600",
  },
  mockActionBar: {
    alignItems: "flex-end",
  },
  mockPlayBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0284C7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  mockPlayBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // 3. Reactions Feed
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardIconTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sectionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  cardSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  reactionsList: {
    gap: 10,
  },
  reactionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  reactionIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  reactionSentTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 2,
  },
  reactionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  reactionTime: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
  },

  // 4. Memory Lane Albums
  addMemoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0284C7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  addMemoryBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  memoryGrid: {
    gap: 8,
  },
  memoryCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  memCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  memTagPill: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  memTagText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#1E40AF",
  },
  memDate: {
    fontSize: 10,
    color: "#64748B",
  },
  memTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 2,
  },
  memDesc: {
    fontSize: 11,
    color: "#475569",
    lineHeight: 16,
    marginBottom: 8,
  },
  broadcastMemoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    gap: 4,
  },
  broadcastMemoryBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0284C7",
  },

  // 5. Cultural Chips
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  culturalChip: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  culturalChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  typeSwitcherRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  typeChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  typeChipActive: {
    backgroundColor: "#0284C7",
    borderColor: "#0284C7",
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  typeChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
  },
  sendPreviewBox: {
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    marginBottom: 6,
  },
  sendPreviewLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0369A1",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  sendPreviewTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  sendPreviewBody: {
    fontSize: 11,
    color: "#334155",
    fontStyle: "italic",
    marginTop: 2,
    lineHeight: 16,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    marginBottom: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  modalSendBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#0284C7",
    gap: 6,
  },
  modalSendBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
