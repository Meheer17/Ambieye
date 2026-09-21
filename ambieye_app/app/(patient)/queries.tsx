import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CalmPalette } from "@/constants/theme";
import { callService } from "@/services/family/callService";
import { patientNeedsService, PatientNeedRequest } from "@/services/patientNeeds/patientNeedsService";
import { useEffect } from "react";

interface QuickNeed {
  id: string;
  emoji: string;
  label: string;
  subLabel: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

const QUICK_NEEDS: QuickNeed[] = [
  {
    id: "water",
    emoji: "💧",
    label: "Water",
    subLabel: "I am thirsty",
    bgColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    textColor: "#1E40AF",
  },
  {
    id: "food",
    emoji: "🍲",
    label: "Food",
    subLabel: "I feel hungry",
    bgColor: "#FEF3C7",
    borderColor: "#FDE68A",
    textColor: "#92400E",
  },
  {
    id: "washroom",
    emoji: "🚻",
    label: "Washroom",
    subLabel: "Need assistance",
    bgColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    textColor: "#166534",
  },
  {
    id: "rest",
    emoji: "🛌",
    label: "Rest",
    subLabel: "Want to lie down",
    bgColor: "#FAF5FF",
    borderColor: "#E9D5FF",
    textColor: "#6B21A8",
  },
  {
    id: "walk",
    emoji: "🚶",
    label: "Walk",
    subLabel: "Fresh air outside",
    bgColor: "#FFF7ED",
    borderColor: "#FED7AA",
    textColor: "#9A3412",
  },
  {
    id: "company",
    emoji: "🌸",
    label: "Talk",
    subLabel: "Want company",
    bgColor: "#FDF2F8",
    borderColor: "#FBCFE8",
    textColor: "#9D174D",
  },
];

interface FamilyContact {
  id: string;
  name: string;
  relation: string;
  avatarEmoji: string;
  phone: string;
  badge: string;
  badgeColor: string;
}

const FAMILY_CONTACTS: FamilyContact[] = [
  {
    id: "fam-1",
    name: "Rishitha",
    relation: "Daughter · Primary Caregiver",
    avatarEmoji: "👩",
    phone: "+91 98640 12345",
    badge: "Nearby",
    badgeColor: "#10B981",
  },
  {
    id: "fam-2",
    name: "Anu",
    relation: "Sister · Checks in daily",
    avatarEmoji: "🌸",
    phone: "+91 98640 54321",
    badge: "Available",
    badgeColor: "#3B82F6",
  },
  {
    id: "fam-3",
    name: "Meena",
    relation: "Care Attendant",
    avatarEmoji: "🩺",
    phone: "+91 94350 98765",
    badge: "On Duty",
    badgeColor: "#8B5CF6",
  },
];

export default function PatientHelpScreen() {
  const router = useRouter();
  const [selectedNeed, setSelectedNeed] = useState<QuickNeed | null>(null);
  const [showAckModal, setShowAckModal] = useState(false);
  const [activeNeed, setActiveNeed] = useState<PatientNeedRequest | null>(null);

  useEffect(() => {
    const unsubscribe = patientNeedsService.subscribe((currentActive) => {
      setActiveNeed(currentActive);
    });
    return () => unsubscribe();
  }, []);

  const handleTriggerNeed = async (need: QuickNeed) => {
    setSelectedNeed(need);
    setShowAckModal(true);

    try {
      await patientNeedsService.triggerNeed(need, "Bhaben");
    } catch {
      // storage fallback
    }
  };

  const handleDismissActiveNeed = async () => {
    try {
      await patientNeedsService.clearActiveNeed();
    } catch {
      // fallback
    }
  };

  const handleStartFamilyCall = async (
    contact: FamilyContact,
    type: "video" | "voice"
  ) => {
    try {
      await callService.startCall({
        contactId: contact.id,
        contactName: contact.name,
        contactAvatar: contact.avatarEmoji,
        contactRelationship: contact.relation,
        phone: contact.phone,
        callType: type === "video" ? "video" : "audio",
      });
      router.push({
        pathname: "/(patient)/(stack)/call",
        params: {
          contactId: contact.id,
          contactName: contact.name,
          contactAvatar: contact.avatarEmoji,
          contactRelationship: contact.relation,
          callType: type === "video" ? "video" : "audio",
          initiator: "patient",
        },
      });
    } catch {
      if (contact.phone) {
        Linking.openURL(`tel:${contact.phone}`);
      }
    }
  };

  const handleEmergencyCall = () => {
    Linking.openURL("tel:112");
  };

  const getNeedConfirmationMessage = (need: QuickNeed | null) => {
    if (!need) return "We have notified your caregiver! Someone is on the way to help you.";
    switch (need.id) {
      case "walk":
        return "We notified your caregiver that you'd like to go out for a walk in the fresh air! Someone will accompany you shortly.";
      case "water":
        return "We notified your caregiver that you are thirsty! A fresh glass of water is being brought to you.";
      case "food":
        return "We notified your caregiver that you feel hungry! A meal or light snack is being arranged.";
      case "washroom":
        return "We notified your caregiver that you need washroom assistance! Someone is coming right now to help you.";
      case "rest":
        return "We notified your caregiver that you want to lie down and rest. They will help you settle in comfortably.";
      case "company":
        return "We notified your caregiver that you'd like company and someone to talk to! They will be with you shortly.";
      default:
        return `We notified your caregiver that you requested ${need.label}. Someone is on the way!`;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerIconCircle}>
            <MaterialCommunityIcons name="hand-heart" size={28} color="#C2747C" />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.headerTitle}>Need Help?</Text>
            <Text style={styles.headerSubtitle}>
              Tap any button to call family or request help
            </Text>
          </View>
        </View>

        {/* ── SECTION 1: CALL FAMILY & CAREGIVER ───────────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Feather name="phone-call" size={20} color="#C2747C" />
            <Text style={styles.sectionTitle}>Call Family & Caregiver</Text>
          </View>
          <Text style={styles.sectionHint}>
            One tap connects you right away
          </Text>

          <View style={styles.contactList}>
            {FAMILY_CONTACTS.map((contact) => (
              <View key={contact.id} style={styles.contactCard}>
                <View style={styles.avatarCircle}>
                  <Text style={{ fontSize: 28 }}>{contact.avatarEmoji}</Text>
                </View>

                <View style={styles.contactInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: contact.badgeColor },
                      ]}
                    />
                  </View>
                  <Text style={styles.contactRelation}>{contact.relation}</Text>
                </View>

                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={styles.voiceBtn}
                    onPress={() => handleStartFamilyCall(contact, "voice")}
                    activeOpacity={0.8}
                    accessibilityLabel={`Call ${contact.name}`}
                  >
                    <Feather name="phone" size={18} color="#FFFFFF" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.videoBtn}
                    onPress={() => handleStartFamilyCall(contact, "video")}
                    activeOpacity={0.8}
                    accessibilityLabel={`Video call ${contact.name}`}
                  >
                    <Feather name="video" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── SECTION 2: QUICK NEEDS (NEATLY ORGANIZED BUTTON GRID) ─────── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <MaterialCommunityIcons name="gesture-tap-button" size={22} color="#C2747C" />
            <Text style={styles.sectionTitle}>What Do You Need?</Text>
          </View>
          <Text style={styles.sectionHint}>
            Tap a button — your caregiver will be notified immediately
          </Text>

          {/* Active Pending Request Notification Card */}
          {activeNeed && activeNeed.status !== "completed" && (
            <View
              style={[
                styles.activeRequestCard,
                activeNeed.status === "attending"
                  ? styles.activeRequestAttending
                  : styles.activeRequestPending,
              ]}
            >
              <View style={styles.activeRequestRow}>
                <Text style={{ fontSize: 26 }}>{activeNeed.emoji}</Text>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.activeRequestTitle}>
                    {activeNeed.status === "attending"
                      ? "Caregiver Coming!"
                      : `${activeNeed.label} Requested`}
                  </Text>
                  <Text style={styles.activeRequestSubtitle}>
                    {activeNeed.status === "attending"
                      ? `${activeNeed.caregiverName || "Caregiver"} is on the way to assist with ${activeNeed.label.toLowerCase()}`
                      : `Notified caregiver at ${activeNeed.displayTime} · Awaiting arrival`}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleDismissActiveNeed}
                  style={styles.activeRequestDismissBtn}
                  activeOpacity={0.7}
                  accessibilityLabel="I am okay now"
                >
                  <Feather name="check" size={16} color="#059669" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.needsGrid}>
            {QUICK_NEEDS.map((need) => (
              <TouchableOpacity
                key={need.id}
                style={[
                  styles.needBtn,
                  { backgroundColor: need.bgColor, borderColor: need.borderColor },
                ]}
                onPress={() => handleTriggerNeed(need)}
                activeOpacity={0.75}
              >
                <Text style={styles.needEmoji}>{need.emoji}</Text>
                <Text style={[styles.needLabel, { color: need.textColor }]}>
                  {need.label}
                </Text>
                <Text style={[styles.needSubLabel, { color: need.textColor }]}>
                  {need.subLabel}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── SECTION 3: EMERGENCY SOS ─────────────────────────────────── */}
        <TouchableOpacity
          style={styles.sosCard}
          onPress={handleEmergencyCall}
          activeOpacity={0.85}
        >
          <View style={styles.sosIconCircle}>
            <Feather name="alert-triangle" size={26} color="#DC2626" />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.sosTitle}>Emergency SOS (112)</Text>
            <Text style={styles.sosSubtitle}>
              Tap to call immediate emergency helpline
            </Text>
          </View>
          <View style={styles.sosCallPill}>
            <Feather name="phone" size={16} color="#FFFFFF" />
            <Text style={styles.sosCallPillText}>Call</Text>
          </View>
        </TouchableOpacity>

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ── ACKNOWLEDGMENT MODAL (WARM & REASSURING) ───────────────────── */}
      <Modal
        visible={showAckModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAckModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalEmoji}>{selectedNeed?.emoji || "✅"}</Text>
            <Text style={styles.modalTitle}>
              {selectedNeed?.label} Requested
            </Text>
            <Text style={styles.modalDesc}>
              {getNeedConfirmationMessage(selectedNeed)}
            </Text>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowAckModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCloseText}>Got It 👍</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CalmPalette.surface,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 4,
  },
  headerIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FAF4F3",
    borderWidth: 1,
    borderColor: "#EAD7D8",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: CalmPalette.textTitle,
  },
  headerSubtitle: {
    fontSize: 13,
    color: CalmPalette.textMuted,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: CalmPalette.cardBorder,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: CalmPalette.textTitle,
  },
  sectionHint: {
    fontSize: 12,
    color: CalmPalette.textMuted,
    marginTop: 4,
    marginBottom: 14,
  },
  contactList: {
    gap: 12,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F0EFEA",
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EAE7E1",
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "700",
    color: CalmPalette.textTitle,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  contactRelation: {
    fontSize: 12,
    color: CalmPalette.textMuted,
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  voiceBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  videoBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#C2747C",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#C2747C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  needsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  needBtn: {
    width: "48%",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  needEmoji: {
    fontSize: 34,
    marginBottom: 6,
  },
  needLabel: {
    fontSize: 16,
    fontWeight: "800",
  },
  needSubLabel: {
    fontSize: 11,
    fontWeight: "500",
    opacity: 0.8,
    marginTop: 2,
  },
  sosCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#FECACA",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  sosIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  sosTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#991B1B",
  },
  sosSubtitle: {
    fontSize: 12,
    color: "#B91C1C",
    marginTop: 2,
  },
  sosCallPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DC2626",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sosCallPillText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalBox: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  modalEmoji: {
    fontSize: 54,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: CalmPalette.textTitle,
    textAlign: "center",
  },
  modalDesc: {
    fontSize: 14,
    color: CalmPalette.textMuted,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  modalCloseBtn: {
    marginTop: 20,
    backgroundColor: "#C2747C",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 16,
  },
  modalCloseText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  activeRequestCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  activeRequestPending: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FCD34D",
  },
  activeRequestAttending: {
    backgroundColor: "#ECFDF5",
    borderColor: "#6EE7B7",
  },
  activeRequestRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  activeRequestTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
  },
  activeRequestSubtitle: {
    fontSize: 12.5,
    color: "#475569",
    marginTop: 2,
    lineHeight: 16,
  },
  activeRequestDismissBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
});
