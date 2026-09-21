import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import { WarmPalette, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { PatientProfile } from "@/utils/caregiverStorage";

interface Props {
  visible: boolean;
  onClose: () => void;
  profile: PatientProfile;
}

type TabType = "person" | "medical" | "daily_life";

export default function CaregiverPatientProfileModal({ visible, onClose, profile }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("person");

  const handleCallContact = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Feather name="x" size={22} color={WarmPalette.charcoalWarm} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Patient Profile</Text>
            <Text style={styles.headerSub}>Complete organized overview</Text>
          </View>
        </View>

        {/* Top Segment Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === "person" && styles.tabItemActive]}
            onPress={() => setActiveTab("person")}
            activeOpacity={0.8}
          >
            <Feather
              name="user"
              size={15}
              color={activeTab === "person" ? WarmPalette.roseDeep : WarmPalette.charcoalLight}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "person" && { color: WarmPalette.roseDeep, fontWeight: "700" },
              ]}
            >
              Person
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === "medical" && styles.tabItemActive]}
            onPress={() => setActiveTab("medical")}
            activeOpacity={0.8}
          >
            <Feather
              name="activity"
              size={15}
              color={activeTab === "medical" ? WarmPalette.roseDeep : WarmPalette.charcoalLight}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "medical" && { color: WarmPalette.roseDeep, fontWeight: "700" },
              ]}
            >
              Medical
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === "daily_life" && styles.tabItemActive]}
            onPress={() => setActiveTab("daily_life")}
            activeOpacity={0.8}
          >
            <Feather
              name="sun"
              size={15}
              color={activeTab === "daily_life" ? WarmPalette.roseDeep : WarmPalette.charcoalLight}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "daily_life" && { color: WarmPalette.roseDeep, fontWeight: "700" },
              ]}
            >
              Daily Life
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Body */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── 1. PERSON TAB ────────────────────────────────────────── */}
          {activeTab === "person" && (
            <View style={styles.sectionContainer}>
              {/* Identity Card */}
              <View style={styles.identityCard}>
                <View style={styles.avatarCircle}>
                  <Text style={{ fontSize: 36 }}>{profile.photoEmoji}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={styles.patientName}>{profile.name}</Text>
                  <Text style={styles.patientAge}>
                    {profile.age} years old · {profile.preferredLanguage}
                  </Text>
                  <View style={styles.relationBadge}>
                    <Text style={styles.relationText}>
                      Caregiver: {profile.caregiverName} ({profile.caregiverRelationship})
                    </Text>
                  </View>
                </View>
              </View>

              {/* Status Note */}
              <View style={styles.statusBox}>
                <Feather name="shield" size={16} color={WarmPalette.sageWarm} />
                <Text style={styles.statusBoxText}>{profile.currentStatus}</Text>
              </View>

              {/* Emergency Contacts */}
              <Text style={styles.sectionHeading}>EMERGENCY CONTACTS</Text>
              {profile.emergencyContacts.map((contact, index) => (
                <View key={index} style={styles.contactCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => handleCallContact(contact.phone)}
                    activeOpacity={0.8}
                  >
                    <Feather name="phone" size={16} color="#FFFFFF" />
                    <Text style={styles.callBtnText}>Call</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* ── 2. MEDICAL TAB ───────────────────────────────────────── */}
          {activeTab === "medical" && (
            <View style={styles.sectionContainer}>
              {/* Conditions Card */}
              <Text style={styles.sectionHeading}>EXISTING CONDITIONS</Text>
              <View style={styles.infoCard}>
                {profile.medical.conditions.map((cond, idx) => (
                  <View key={idx} style={styles.bulletRow}>
                    <View style={styles.bulletDot} />
                    <Text style={styles.bulletText}>{cond}</Text>
                  </View>
                ))}
              </View>

              {/* Allergies */}
              <Text style={styles.sectionHeading}>KNOWN ALLERGIES</Text>
              <View style={[styles.infoCard, { backgroundColor: WarmPalette.peachMuted, borderColor: WarmPalette.peach }]}>
                {profile.medical.allergies.map((allg, idx) => (
                  <View key={idx} style={styles.bulletRow}>
                    <Feather name="alert-circle" size={14} color={WarmPalette.peachDeep} />
                    <Text style={[styles.bulletText, { color: WarmPalette.peachDeep, fontWeight: "600" }]}>{allg}</Text>
                  </View>
                ))}
              </View>

              {/* Current Medications Summary */}
              <Text style={styles.sectionHeading}>CURRENT MEDICATIONS</Text>
              <View style={styles.infoCard}>
                {profile.medical.currentMedicationsSummary.map((med, idx) => (
                  <View key={idx} style={styles.bulletRow}>
                    <Feather name="check" size={14} color={WarmPalette.sageWarm} />
                    <Text style={styles.bulletText}>{med}</Text>
                  </View>
                ))}
              </View>

              {/* Primary Doctor */}
              <Text style={styles.sectionHeading}>PRIMARY PHYSICIAN</Text>
              <View style={styles.infoCard}>
                <Text style={styles.doctorName}>{profile.medical.primaryDoctor.name}</Text>
                <Text style={styles.doctorSpec}>{profile.medical.primaryDoctor.specialty}</Text>
                <Text style={styles.doctorHosp}>{profile.medical.primaryDoctor.hospital}</Text>
              </View>

              {/* Important Medical Notes */}
              <Text style={styles.sectionHeading}>IMPORTANT MEDICAL NOTES</Text>
              <View style={styles.notesBox}>
                <Text style={styles.notesText}>{profile.medical.notes}</Text>
              </View>

              {/* Chronological Medical History Timeline */}
              <Text style={styles.sectionHeading}>CHRONOLOGICAL MEDICAL HISTORY</Text>
              <View style={styles.timelineWrapper}>
                {profile.medical.historyTimeline.map((item, index) => (
                  <View key={item.id} style={styles.timelineRow}>
                    <View style={styles.timelineLeft}>
                      <Text style={styles.timelineYear}>{item.year}</Text>
                      <Text style={styles.timelineDate}>{item.date}</Text>
                    </View>
                    <View style={styles.timelineGutter}>
                      <View style={styles.timelineNode} />
                      {index < profile.medical.historyTimeline.length - 1 && <View style={styles.timelineLine} />}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineTitle}>{item.title}</Text>
                      <Text style={styles.timelineDesc}>{item.description}</Text>
                      {item.doctorOrLocation && (
                        <Text style={styles.timelineDoctor}>{item.doctorOrLocation}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── 3. DAILY LIFE TAB ────────────────────────────────────── */}
          {activeTab === "daily_life" && (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionHeading}>SLEEP & REST PATTERNS</Text>
              <View style={styles.infoCard}>
                <Text style={styles.infoCardBody}>{profile.dailyLife.sleepPattern}</Text>
              </View>

              <Text style={styles.sectionHeading}>EXERCISE & MOVEMENT</Text>
              <View style={styles.infoCard}>
                <Text style={styles.infoCardBody}>{profile.dailyLife.exerciseMovement}</Text>
              </View>

              <Text style={styles.sectionHeading}>ROUTINE ADHERENCE</Text>
              <View style={styles.infoCard}>
                <Text style={styles.infoCardBody}>{profile.dailyLife.routineAdherenceRate}</Text>
              </View>

              <Text style={styles.sectionHeading}>HOBBIES & RELAXATION</Text>
              <View style={styles.infoCard}>
                {profile.dailyLife.hobbies.map((h, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Feather name="heart" size={13} color={WarmPalette.roseDusty} />
                    <Text style={styles.bulletText}>{h}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.sectionHeading}>MUSIC & COGNITIVE COMFORT</Text>
              <View style={styles.infoCard}>
                <Text style={styles.infoCardBody}>{profile.dailyLife.musicPreference}</Text>
              </View>

              <Text style={styles.sectionHeading}>COMFORT & REASSURANCE TIPS</Text>
              <View style={[styles.infoCard, { backgroundColor: WarmPalette.sageSoft }]}>
                <Text style={[styles.infoCardBody, { color: WarmPalette.charcoalWarm }]}>
                  {profile.dailyLife.comfortReminders}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: WarmPalette.ivory,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: WarmPalette.sandDark,
    backgroundColor: WarmPalette.cream,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: WarmPalette.sand,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  headerSub: {
    fontSize: 12,
    color: WarmPalette.charcoalLight,
    marginTop: 1,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: WarmPalette.cream,
    borderBottomWidth: 1,
    borderBottomColor: WarmPalette.sandDark,
    paddingHorizontal: Spacing.md,
    paddingTop: 8,
    gap: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
  },
  tabItemActive: {
    borderBottomColor: WarmPalette.roseDusty,
  },
  tabText: {
    fontSize: 13,
    color: WarmPalette.charcoalMuted,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  sectionContainer: {
    gap: 12,
  },
  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.cream,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: WarmPalette.borderWarm,
    ...Shadows.sm,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: WarmPalette.sand,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: WarmPalette.borderWarm,
  },
  patientName: {
    fontSize: 18,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
  },
  patientAge: {
    fontSize: 13,
    color: WarmPalette.charcoalMuted,
    marginTop: 2,
  },
  relationBadge: {
    backgroundColor: WarmPalette.sand,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  relationText: {
    fontSize: 11,
    fontWeight: "600",
    color: WarmPalette.charcoalWarm,
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: WarmPalette.sageSoft,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: WarmPalette.sageWarm + "40",
  },
  statusBoxText: {
    fontSize: 12,
    fontWeight: "600",
    color: WarmPalette.charcoalWarm,
    flex: 1,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "800",
    color: WarmPalette.charcoalLight,
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 4,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.cream,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: WarmPalette.borderWarm,
    gap: 12,
  },
  contactName: {
    fontSize: 14,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  contactPhone: {
    fontSize: 12,
    color: WarmPalette.charcoalMuted,
    marginTop: 2,
  },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.roseDusty,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  infoCard: {
    backgroundColor: WarmPalette.cream,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: WarmPalette.borderWarm,
    gap: 8,
  },
  infoCardBody: {
    fontSize: 13,
    color: WarmPalette.charcoalWarm,
    lineHeight: 19,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: WarmPalette.roseDusty,
  },
  bulletText: {
    fontSize: 13,
    color: WarmPalette.charcoalWarm,
    flex: 1,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  doctorSpec: {
    fontSize: 12,
    color: WarmPalette.charcoalMuted,
  },
  doctorHosp: {
    fontSize: 12,
    color: WarmPalette.charcoalLight,
    marginTop: 2,
  },
  notesBox: {
    backgroundColor: WarmPalette.sand,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: WarmPalette.sandDark,
  },
  notesText: {
    fontSize: 13,
    color: WarmPalette.charcoalWarm,
    lineHeight: 19,
    fontStyle: "italic",
  },
  timelineWrapper: {
    backgroundColor: WarmPalette.cream,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: WarmPalette.borderWarm,
  },
  timelineRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  timelineLeft: {
    width: 58,
  },
  timelineYear: {
    fontSize: 14,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
  },
  timelineDate: {
    fontSize: 10,
    color: WarmPalette.charcoalLight,
    marginTop: 2,
  },
  timelineGutter: {
    width: 24,
    alignItems: "center",
  },
  timelineNode: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: WarmPalette.roseDusty,
    marginTop: 4,
  },
  timelineLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: WarmPalette.sandDark,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 4,
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  timelineDesc: {
    fontSize: 12,
    color: WarmPalette.charcoalMuted,
    lineHeight: 17,
    marginTop: 2,
  },
  timelineDoctor: {
    fontSize: 11,
    color: WarmPalette.charcoalLight,
    marginTop: 3,
  },
});
