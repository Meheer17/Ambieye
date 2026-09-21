import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
  Linking,
  ScrollView,
  Animated,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTranslation } from "@/constants/i18n";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import { Colors, Spacing, WarmPalette } from "@/constants/theme";

const { width } = Dimensions.get("window");

export interface FamilyContact {
  id: string;
  name: string;
  relationship: string;
  relationshipAs: string;
  relationshipHi: string;
  roleBadge: string;
  phone: string;
  avatarEmoji: string;
  avatarBg: string;
  borderColor: string;
  statusText: string;
  videoGreetingTitle: string;
  videoGreetingMessage: string;
  videoGreetingMessageAs: string;
  videoGreetingMessageHi: string;
  greetingTime: string;
}

const FAMILY_CONTACTS: FamilyContact[] = [
  {
    id: "fam-anita",
    name: "Anita Barman",
    relationship: "Daughter & Primary Caregiver",
    relationshipAs: "কন্যা আৰু মুখ্য যত্নকৰ্তা",
    relationshipHi: "बेटी एवं मुख्य देखभालकर्ता",
    roleBadge: "At Home · Guwahati",
    phone: "+91 98765 43210",
    avatarEmoji: "👩",
    avatarBg: "#FDF2F8",
    borderColor: "#F472B6",
    statusText: "Active Now · Ready to talk",
    videoGreetingTitle: "Morning Love from Anita 🌸",
    videoGreetingMessage:
      "Deuta, don't worry about anything! I have prepared your favorite Assam tea and rice. Please drink water, and I will be home by 6 PM. Everything is completely safe!",
    videoGreetingMessageAs:
      "দেউতা, কোনো চিন্তা নকৰিব! মই আপোনাৰ প্ৰিয় চাহ আৰু ভাত তৈয়াৰ কৰি থৈছোঁ। সময়ে সময়ে পানী খাব, মই সন্ধিয়া ৬ বজাত ঘৰ পামহি। ঘৰত সকলো সম্পূৰ্ণ সুৰক্ষিত!",
    videoGreetingMessageHi:
      "पिताजी, बिल्कुल चिंता मत कीजिए! मैंने आपकी पसंदीदा चाय बना दी है। समय पर पानी पीजिएगा, मैं शाम 6 बजे तक घर आ जाऊँगी। सब कुछ सुरक्षित और शांत है!",
    greetingTime: "Recorded 8:30 AM today",
  },
  {
    id: "fam-rahul",
    name: "Rahul Barman",
    relationship: "Son (Guwahati Office)",
    relationshipAs: "পুত্ৰ (গুৱাহাটী)",
    relationshipHi: "बेटा (गुवाहाटी)",
    roleBadge: "Office Break",
    phone: "+91 98640 11223",
    avatarEmoji: "👨‍💼",
    avatarBg: "#EFF6FF",
    borderColor: "#60A5FA",
    statusText: "Available on 1-Tap",
    videoGreetingTitle: "Rahul's Daily Blessing ☀️",
    videoGreetingMessage:
      "Nomoskar Deuta! I just finished my morning client meeting in Guwahati. Hope you enjoyed the radio music. I'm coming to see you this Sunday with fresh sweets!",
    videoGreetingMessageAs:
      "নমস্কাৰ দেউতা! মই গুৱাহাটীত অফিচৰ কাম শেষ কৰিলোঁ। আপুনি ৰেডিঅ’ত গান শুনি ভাল পালে নে? এই দেওবাৰে মই নতুন মিঠাই লৈ আপোনাক দেখা কৰিবলৈ আহিম!",
    videoGreetingMessageHi:
      "नमस्ते पिताजी! मैंने अभी ऑफिस की मीटिंग पूरी की है। आशा है आपने रेडियो पर भजन सुने। इस रविवार मैं आपसे मिलने आ रहा हूँ!",
    greetingTime: "Recorded Yesterday",
  },
  {
    id: "fam-doctor",
    name: "Dr. Sanjeev Sharma",
    relationship: "Family Physician & ASHA Care",
    relationshipAs: "পৰিয়ালৰ চিকিৎসক আৰু আশা বাইদেউ",
    relationshipHi: "पारिवारिक डॉक्टर",
    roleBadge: "Clinic Live",
    phone: "+91 94350 99887",
    avatarEmoji: "🩺",
    avatarBg: "#F0FDF4",
    borderColor: "#4ADE80",
    statusText: "Direct Medical Line",
    videoGreetingTitle: "Doctor's Care Advice 🌿",
    videoGreetingMessage:
      "Nomoskar Bhaben babu! Your blood pressure and vitals were excellent this week. Keep taking your afternoon medicine on time with lukewarm water and sit in the sunny courtyard!",
    videoGreetingMessageAs:
      "নমস্কাৰ ভৱেন বাবু! এই সপ্তাহত আপোনাৰ স্বাস্থ্য খুবেই ভাল আছে। দুপৰীয়াৰ ঔষধখিনি নিয়মমতে খাব আৰু চোতালৰ ৰ’দত অলপ সময় বহিব!",
    videoGreetingMessageHi:
      "नमस्कार भवेन जी! आपका स्वास्थ्य इस हफ्ते बहुत अच्छा है। दोपहर की दवाई गुनगुने पानी के साथ समय पर लें और धूप में बैठें!",
    greetingTime: "Weekly Health Check",
  },
];

export function AponManuhSpeedDial() {
  const { currentLang } = useTranslation();
  const [selectedContact, setSelectedContact] = useState<FamilyContact | null>(null);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [callingContact, setCallingContact] = useState<FamilyContact | null>(null);
  const [callConnected, setCallConnected] = useState(false);

  // Helper for translated relation
  const getRelation = (contact: FamilyContact) => {
    if (currentLang === "as") return contact.relationshipAs;
    if (currentLang === "hi") return contact.relationshipHi;
    return contact.relationship;
  };

  // Helper for translated greeting text
  const getGreetingMessage = (contact: FamilyContact) => {
    if (currentLang === "as") return contact.videoGreetingMessageAs;
    if (currentLang === "hi") return contact.videoGreetingMessageHi;
    return contact.videoGreetingMessage;
  };

  const handleOpenVideoGreeting = (contact: FamilyContact) => {
    setSelectedContact(contact);
    setVideoModalVisible(true);
    const msg = getGreetingMessage(contact);
    VoiceAssistant.speak(`${contact.name}: ${msg}`, currentLang);
  };

  const handleStartCall = (contact: FamilyContact) => {
    setCallingContact(contact);
    setCallModalVisible(true);
    setCallConnected(false);

    const dialMsg =
      currentLang === "as"
        ? `${contact.name} লৈ কল কৰা হৈছে... সংযোগ হৈ আছে।`
        : currentLang === "hi"
        ? `${contact.name} को कॉल किया जा रहा है...`
        : `Calling ${contact.name}... Connecting your family line.`;

    VoiceAssistant.speak(dialMsg, currentLang);

    // Simulate connection after 2 seconds
    setTimeout(() => {
      setCallConnected(true);
      const connectedMsg =
        currentLang === "as"
          ? `নমস্কাৰ দেউতা! মই ${contact.name}, কওক কেনে আছে?`
          : currentLang === "hi"
          ? `नमस्ते पिताजी! मैं ${contact.name}, आप कैसे हैं?`
          : `Hello Bhaben! This is ${contact.name}, I am so happy you called!`;
      VoiceAssistant.speak(connectedMsg, currentLang);
    }, 2400);
  };

  const handleEndCall = () => {
    VoiceAssistant.stop();
    setCallModalVisible(false);
    setCallingContact(null);
    setCallConnected(false);
  };

  const handleNativePhoneDial = (phone: string) => {
    if (Platform.OS !== "web") {
      Linking.openURL(`tel:${phone.replace(/\s+/g, "")}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Banner */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.titleWithIcon}>
          <View style={styles.headerIconCircle}>
            <MaterialCommunityIcons name="account-heart" size={22} color={WarmPalette.roseDusty} />
          </View>
          <View>
            <Text style={styles.sectionTitle}>
              {currentLang === "as"
                ? "আপোন মানুহ · ১-টেপ পৰিয়াল ফোন"
                : currentLang === "hi"
                ? "अपने लोग · 1-टैप फैमिली फोन"
                : "Apon Manuh · 1-Tap Family Dial"}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {currentLang === "as"
                ? "পৰিয়াল আৰু চিকিৎসকৰ ছবি চুই তৎক্ষণাত কথা পাতক বা ভিডিঅ’ চাওক"
                : currentLang === "hi"
                ? "परिवार की फोटो छूकर तुरंत बात करें या वीडियो संदेश देखें"
                : "Big visual touch photo cards with pre-recorded video greetings"}
            </Text>
          </View>
        </View>
        <View style={styles.liveSafeBadge}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.liveSafeText}>Speed Dial</Text>
        </View>
      </View>

      {/* 3 Giant Visual Touch Photo Cards */}
      <View style={styles.cardsGrid}>
        {FAMILY_CONTACTS.map((contact) => (
          <View
            key={contact.id}
            style={[styles.contactCard, { borderColor: contact.borderColor }]}
          >
            {/* Top Row: Face Avatar & Info */}
            <View style={styles.cardTopRow}>
              <View style={[styles.avatarBox, { backgroundColor: contact.avatarBg, borderColor: contact.borderColor }]}>
                <Text style={styles.avatarEmoji}>{contact.avatarEmoji}</Text>
                <View style={styles.activeDotOnAvatar} />
              </View>

              <View style={styles.cardInfo}>
                <View style={styles.nameRoleRow}>
                  <Text style={styles.contactName} numberOfLines={1}>
                    {contact.name}
                  </Text>
                </View>
                <Text style={styles.contactRelation}>{getRelation(contact)}</Text>
                <View style={styles.statusPill}>
                  <Feather name="check" size={11} color="#16A34A" />
                  <Text style={styles.statusText}>{contact.statusText}</Text>
                </View>
              </View>
            </View>

            {/* 2 Big Action Touch Buttons */}
            <View style={styles.actionButtonsRow}>
              {/* Button 1: 1-Tap Call */}
              <TouchableOpacity
                style={styles.callActionButton}
                onPress={() => handleStartCall(contact)}
                activeOpacity={0.8}
              >
                <Feather name="phone-call" size={17} color="#FFFFFF" />
                <Text style={styles.callActionText} numberOfLines={1}>
                  {currentLang === "as" ? "কল কৰক (Call)" : currentLang === "hi" ? "कॉल (Call)" : "Call Now"}
                </Text>
              </TouchableOpacity>

              {/* Button 2: Video Greeting */}
              <TouchableOpacity
                style={styles.videoActionButton}
                onPress={() => handleOpenVideoGreeting(contact)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="movie-play" size={18} color="#7C3AED" />
                <Text style={styles.videoActionText} numberOfLines={1}>
                  {currentLang === "as" ? "ভিডিঅ’ (Video)" : currentLang === "hi" ? "वीडियो (Video)" : "Video Greeting"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: PRE-RECORDED VIDEO GREETING & REASSURANCE                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={videoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          VoiceAssistant.stop();
          setVideoModalVisible(false);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            VoiceAssistant.stop();
            setVideoModalVisible(false);
          }}
        >
          {selectedContact && (
            <View style={styles.videoModalContent} onStartShouldSetResponder={() => true}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 28 }}>{selectedContact.avatarEmoji}</Text>
                  <View>
                    <Text style={styles.modalTitleText}>{selectedContact.videoGreetingTitle}</Text>
                    <Text style={styles.modalSubText}>
                      {selectedContact.name} · {selectedContact.greetingTime}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    VoiceAssistant.stop();
                    setVideoModalVisible(false);
                  }}
                  style={styles.closeBtn}
                >
                  <Feather name="x" size={22} color="#475569" />
                </TouchableOpacity>
              </View>

              {/* Video Player Screen Simulation */}
              <View style={styles.videoScreenFrame}>
                <View style={styles.videoScreenStage}>
                  <Text style={styles.videoBigEmoji}>{selectedContact.avatarEmoji}</Text>
                  <View style={styles.waveBarGroup}>
                    <View style={[styles.waveBar, { height: 16 }]} />
                    <View style={[styles.waveBar, { height: 28 }]} />
                    <View style={[styles.waveBar, { height: 40 }]} />
                    <View style={[styles.waveBar, { height: 24 }]} />
                    <View style={[styles.waveBar, { height: 32 }]} />
                  </View>
                  <View style={styles.playingTag}>
                    <View style={styles.redRecordDot} />
                    <Text style={styles.playingTagText}>FAMILY VIDEO MESSAGE · HD</Text>
                  </View>
                </View>

                {/* Subtitle Caption Box */}
                <View style={styles.captionBox}>
                  <Text style={styles.captionText}>"{getGreetingMessage(selectedContact)}"</Text>
                </View>
              </View>

              {/* Action Buttons in Modal */}
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.replayVoiceBtn}
                  onPress={() => {
                    const msg = getGreetingMessage(selectedContact);
                    VoiceAssistant.speak(`${selectedContact.name}: ${msg}`, currentLang);
                  }}
                  activeOpacity={0.8}
                >
                  <Feather name="volume-2" size={18} color="#2563EB" />
                  <Text style={styles.replayVoiceText}>Replay Voice</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.directCallFromVideoBtn}
                  onPress={() => {
                    setVideoModalVisible(false);
                    handleStartCall(selectedContact);
                  }}
                  activeOpacity={0.8}
                >
                  <Feather name="phone" size={18} color="#FFFFFF" />
                  <Text style={styles.directCallText}>Call {selectedContact.name}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: ACTIVE 1-TAP COGNITIVE FAMILY PHONE CALL                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={callModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleEndCall}
      >
        <View style={styles.callModalOverlay}>
          {callingContact && (
            <View style={styles.callScreenCard}>
              {/* Call Status Badge */}
              <View style={styles.callStageBadge}>
                <View style={[styles.statusDot, callConnected ? styles.dotGreen : styles.dotAmber]} />
                <Text style={styles.callStageBadgeText}>
                  {callConnected ? "CONNECTED · LIVE AUDIO" : "DIALING DIRECT LINE..."}
                </Text>
              </View>

              {/* Big Face Avatar */}
              <View style={styles.callAvatarCircle}>
                <Text style={styles.callAvatarEmoji}>{callingContact.avatarEmoji}</Text>
              </View>

              {/* Contact Information */}
              <Text style={styles.callContactName}>{callingContact.name}</Text>
              <Text style={styles.callContactRole}>{getRelation(callingContact)}</Text>
              <Text style={styles.callContactPhone}>{callingContact.phone}</Text>

              {/* Reassurance Message Box */}
              <View style={styles.callReassuranceCard}>
                <Text style={styles.callReassuranceHeader}>
                  {callConnected ? "Speaking with you now 🌸" : "Ringing your loved one..."}
                </Text>
                <Text style={styles.callReassuranceBody}>
                  {callConnected
                    ? currentLang === "as"
                      ? `"নমস্কাৰ দেউতা! মই শুনি আছোঁ, আপোনাৰ কি খবৰ কওক?"`
                      : currentLang === "hi"
                      ? `"नमस्ते पिताजी! मैं सुन रहा हूँ, आप कैसे हैं?"`
                      : `"Hello Bhaben! I am so happy to hear your voice. Everything at home is good!"`
                    : "Connecting via AmbiEye Smart Senior Safe Line..."}
                </Text>
              </View>

              {/* Call Action Controls */}
              <View style={styles.callControlsRow}>
                {/* Dial Cellular Network Option */}
                <TouchableOpacity
                  style={styles.cellDialBtn}
                  onPress={() => handleNativePhoneDial(callingContact.phone)}
                  activeOpacity={0.8}
                >
                  <Feather name="smartphone" size={20} color="#0284C7" />
                  <Text style={styles.cellDialText}>Normal Phone</Text>
                </TouchableOpacity>

                {/* Big Red End Call Button */}
                <TouchableOpacity
                  style={styles.endCallBtn}
                  onPress={handleEndCall}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="phone-hangup" size={28} color="#FFFFFF" />
                  <Text style={styles.endCallText}>End Call</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: "#FCE7F3",
    shadowColor: "#BE185D",
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
    backgroundColor: "#FDF2F8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FBCFE8",
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
  liveSafeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
  },
  liveSafeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },
  cardsGrid: {
    gap: 12,
  },
  contactCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#EAE7E1",
    shadowColor: "#A8A29E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  avatarBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#E0E7FF",
    position: "relative",
  },
  avatarEmoji: {
    fontSize: 28,
  },
  activeDotOnAvatar: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  cardInfo: {
    flex: 1,
  },
  nameRoleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  contactName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E2024",
  },
  contactRelation: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 1,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#15803D",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  callActionButton: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#6366F1",
    paddingVertical: 11,
    borderRadius: 14,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 2,
  },
  callActionText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  videoActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F5F3FF",
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  videoActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4F46E5",
  },

  // Video Greeting Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
  },
  videoModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: Spacing.lg,
    width: "100%",
    maxWidth: 480,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  modalTitleText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSubText: {
    fontSize: 12,
    color: "#64748B",
  },
  closeBtn: {
    padding: 6,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
  },
  videoScreenFrame: {
    backgroundColor: "#0F172A",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  videoScreenStage: {
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E293B",
    position: "relative",
  },
  videoBigEmoji: {
    fontSize: 64,
  },
  waveBarGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
  },
  waveBar: {
    width: 6,
    backgroundColor: "#38BDF8",
    borderRadius: 3,
  },
  playingTag: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  redRecordDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  playingTagText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  captionBox: {
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  captionText: {
    color: "#F8FAFC",
    fontSize: 14,
    lineHeight: 22,
    fontStyle: "italic",
    textAlign: "center",
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  replayVoiceBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  replayVoiceText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  directCallFromVideoBtn: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#16A34A",
    paddingVertical: 13,
    borderRadius: 14,
  },
  directCallText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // Call Screen Modal
  callModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  callScreenCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: Spacing.xl,
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 28,
    elevation: 12,
  },
  callStageBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: Spacing.lg,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: {
    backgroundColor: "#16A34A",
  },
  dotAmber: {
    backgroundColor: "#F59E0B",
  },
  callStageBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.5,
  },
  callAvatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#E2E8F0",
    marginBottom: Spacing.md,
  },
  callAvatarEmoji: {
    fontSize: 52,
  },
  callContactName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  callContactRole: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
    textAlign: "center",
  },
  callContactPhone: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  callReassuranceCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    width: "100%",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: Spacing.xl,
  },
  callReassuranceHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: "#16A34A",
    textAlign: "center",
    marginBottom: 4,
  },
  callReassuranceBody: {
    fontSize: 14,
    color: "#334155",
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 20,
  },
  callControlsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cellDialBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F0F9FF",
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#BAE6FD",
  },
  cellDialText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0284C7",
  },
  endCallBtn: {
    flex: 1.3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  endCallText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
