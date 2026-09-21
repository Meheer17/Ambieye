import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  useWindowDimensions,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { WarmPalette } from "../../constants/theme";
import { useAuth } from "../../hooks/useAuth";
import {
  caregiverStorage,
  PatientProfile,
  CaregiverSettingsData,
} from "../../utils/caregiverStorage";

import CaregiverPatientProfileModal from "./CaregiverPatientProfileModal";
import { CaregiverMemoryBankModal } from "./CaregiverMemoryBankModal";
import { CaregiverCareNoteModal } from "./CaregiverCareNoteModal";
import { CaregiverArticlesModal } from "./CaregiverArticlesModal";
import { CaregiverEmergencyModal } from "./CaregiverEmergencyModal";

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", native: "English" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
];

export const CaregiverSettingsScreen: React.FC = () => {
  const router = useRouter();
  const { logout } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [settings, setSettings] = useState<CaregiverSettingsData | null>(null);

  // Modals
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [showCareNoteModal, setShowCareNoteModal] = useState(false);
  const [showArticlesModal, setShowArticlesModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const p = await caregiverStorage.getPatientProfile();
      const s = await caregiverStorage.getSettings();
      setProfile(p);
      setSettings(s);
    } catch (e) {
      console.warn("Failed to load caregiver settings:", e);
    }
  };

  const handleToggleNotification = async (
    key: keyof CaregiverSettingsData["notifications"]
  ) => {
    if (!settings) return;
    const updatedNotifs = {
      ...settings.notifications,
      [key]: !settings.notifications[key],
    };
    const updated = await caregiverStorage.updateSettings({
      notifications: updatedNotifs,
    });
    setSettings(updated);
  };

  const handleSelectLanguage = async (code: string) => {
    const updated = await caregiverStorage.updateSettings({ language: code });
    setSettings(updated);
    setShowLangModal(false);
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out of the Caregiver Guardian Portal?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/auth/login" as any);
        },
      },
    ]);
  };

  if (!profile || !settings) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  const currentLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === settings.language) ||
    SUPPORTED_LANGUAGES[0];

  return (
    <View style={styles.screenWrapper}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          isTablet && { maxWidth: 840, alignSelf: "center", width: "100%" },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Caregiver Guardian Profile</Text>
          <Text style={styles.headerSubtitle}>
            Patient management, notifications, privacy & platform controls
          </Text>
        </View>

        {/* ── SECTION 1: LINKED ELDER PROFILE (Spec 2, 9, 13) ────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>LINKED LOVED ONE</Text>
          <View style={styles.elderRow}>
            <View style={styles.elderAvatar}>
              <Text style={{ fontSize: 26 }}>{profile.photoEmoji}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.elderName}>{profile.name}</Text>
              <Text style={styles.elderMeta}>
                Age {profile.age} • Preferred: {profile.preferredLanguage}
              </Text>
              <Text style={styles.elderStatusText}>{profile.currentStatus}</Text>
            </View>
          </View>

          {/* Quick Hub Buttons */}
          <View style={styles.quickHubGrid}>
            <TouchableOpacity
              style={styles.hubBtn}
              onPress={() => setShowProfileModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="person-outline" size={16} color={WarmPalette.roseDusty} />
              <Text style={styles.hubBtnText}>Complete Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.hubBtn}
              onPress={() => setShowMemoryModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="images-outline" size={16} color={WarmPalette.sageWarm} />
              <Text style={styles.hubBtnText}>Memory Bank</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.hubBtn}
              onPress={() => setShowCareNoteModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={16} color="#0284C7" />
              <Text style={styles.hubBtnText}>Log Behavior</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.hubBtn}
              onPress={() => setShowArticlesModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="book-outline" size={16} color="#D97706" />
              <Text style={styles.hubBtnText}>Care Guides</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── SECTION 2: CAREGIVER ACCOUNT (Spec 21) ──────────────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>CAREGIVER ACCOUNT</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{settings.caregiverName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Relationship</Text>
            <Text style={styles.infoValue}>{settings.relationship}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{settings.caregiverPhone}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{settings.caregiverEmail}</Text>
          </View>
        </View>

        {/* ── SECTION 3: USEFUL NOTIFICATIONS (Spec 20 & 21) ─────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>NOTIFICATIONS & TIMELY ALERTS</Text>
          <Text style={styles.sectionHint}>
            Only useful, quiet alerts. Never intrusive notification spam.
          </Text>

          <View style={styles.switchRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.switchTitle}>Medication Reminders</Text>
              <Text style={styles.switchSub}>
                Alert 30 min before schedule and when evening dose is not recorded
              </Text>
            </View>
            <Switch
              value={settings.notifications.medicationAlerts}
              onValueChange={() => handleToggleNotification("medicationAlerts")}
              trackColor={{ false: WarmPalette.sand, true: WarmPalette.roseDusty }}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.switchTitle}>Appointment Reminders</Text>
              <Text style={styles.switchSub}>
                Day-before and 1-hour notices with clinic preparation notes
              </Text>
            </View>
            <Switch
              value={settings.notifications.appointmentReminders}
              onValueChange={() => handleToggleNotification("appointmentReminders")}
              trackColor={{ false: WarmPalette.sand, true: WarmPalette.roseDusty }}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.switchTitle}>Daily Activity & Walk Notices</Text>
              <Text style={styles.switchSub}>
                Gentle reminders if daily movement has not been marked by 5:00 PM
              </Text>
            </View>
            <Switch
              value={settings.notifications.activityReminders}
              onValueChange={() => handleToggleNotification("activityReminders")}
              trackColor={{ false: WarmPalette.sand, true: WarmPalette.roseDusty }}
            />
          </View>

          <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.switchTitle}>Family Messages & Audio Notes</Text>
              <Text style={styles.switchSub}>
                Confirmation when family messages are delivered to elder's screen
              </Text>
            </View>
            <Switch
              value={settings.notifications.familyMessages}
              onValueChange={() => handleToggleNotification("familyMessages")}
              trackColor={{ false: WarmPalette.sand, true: WarmPalette.roseDusty }}
            />
          </View>
        </View>

        {/* ── SECTION 4: LANGUAGE PREFERENCE (Spec 21) ───────────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>LANGUAGE PREFERENCE</Text>
          <TouchableOpacity
            style={styles.langSelectorRow}
            onPress={() => setShowLangModal(true)}
            activeOpacity={0.8}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.langName}>{currentLangObj.name} ({currentLangObj.native})</Text>
              <Text style={styles.langSub}>Tap to change application display language</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={WarmPalette.charcoalWarm + "60"} />
          </TouchableOpacity>
        </View>

        {/* ── SECTION 5: PRIVACY & SECURITY (Spec 21) ─────────────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>PRIVACY & DATA CONTROLS</Text>
          <View style={styles.privacyRow}>
            <Ionicons name="lock-closed-outline" size={18} color={WarmPalette.sageWarm} />
            <Text style={styles.privacyText}>
              All family memory items and behavioral observations are stored privately with on-device encryption.
            </Text>
          </View>
          <View style={[styles.privacyRow, { marginTop: 8 }]}>
            <Ionicons name="shield-outline" size={18} color={WarmPalette.sageWarm} />
            <Text style={styles.privacyText}>
              No diagnostic claims or medical records are sold or shared with commercial advertisers.
            </Text>
          </View>
        </View>

        {/* ── SECTION 6: ABOUT DEMENTIA & SUPPORT (Spec 21) ───────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>ABOUT & SUPPORT</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Platform Version</Text>
            <Text style={styles.infoValue}>v2.4.0 Production</Text>
          </View>
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() =>
              Alert.alert(
                "Need Support?",
                "Contact our 24/7 care coordination desk at support@mindcare.org or call 1800-123-DEMENTIA."
              )
            }
          >
            <Text style={styles.infoLabel}>Help & Support Desk</Text>
            <Ionicons name="open-outline" size={16} color={WarmPalette.charcoalWarm + "80"} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.infoRow, { borderBottomWidth: 0 }]}
            onPress={() =>
              Alert.alert(
                "Terms & Privacy",
                "Smriti Dementia Care Platform complies with ISO-27001 and Indian Digital Personal Data Protection Act (DPDPA 2023)."
              )
            }
          >
            <Text style={styles.infoLabel}>Terms & Privacy Policy</Text>
            <Ionicons name="document-text-outline" size={16} color={WarmPalette.charcoalWarm + "80"} />
          </TouchableOpacity>
        </View>

        {/* ── SECTION 7: LOGOUT (Spec 21) ─────────────────────────────── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text style={styles.logoutBtnText}>Log Out of Caregiver Portal</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Modals ──────────────────────────────────────────────────── */}
      <CaregiverPatientProfileModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        profile={profile}
      />

      <CaregiverMemoryBankModal
        visible={showMemoryModal}
        onClose={() => setShowMemoryModal(false)}
        elderName={profile.name}
      />

      <CaregiverCareNoteModal
        visible={showCareNoteModal}
        onClose={() => setShowCareNoteModal(false)}
        onNoteAdded={loadData}
      />

      <CaregiverArticlesModal
        visible={showArticlesModal}
        onClose={() => setShowArticlesModal(false)}
      />

      <CaregiverEmergencyModal
        visible={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        profile={profile}
      />

      {/* Language Selector Modal */}
      <Modal visible={showLangModal} animationType="slide" transparent>
        <View style={styles.langModalOverlay}>
          <View style={styles.langModalSheet}>
            <View style={styles.langModalHeader}>
              <Text style={styles.langModalTitle}>Select Language</Text>
              <TouchableOpacity onPress={() => setShowLangModal(false)}>
                <Ionicons name="close" size={20} color={WarmPalette.charcoalWarm} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ paddingHorizontal: 20, paddingTop: 10 }}>
              {SUPPORTED_LANGUAGES.map((item) => {
                const isSelected = settings.language === item.code;
                return (
                  <TouchableOpacity
                    key={item.code}
                    style={[styles.langModalItem, isSelected && styles.langModalItemActive]}
                    onPress={() => handleSelectLanguage(item.code)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.langItemName, isSelected && styles.langItemNameActive]}>
                        {item.name}
                      </Text>
                      <Text style={styles.langItemNative}>{item.native}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={WarmPalette.roseDusty} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: WarmPalette.ivory,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WarmPalette.ivory,
    padding: 30,
  },
  loadingText: {
    fontSize: 14,
    color: WarmPalette.charcoalWarm + "90",
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
  },
  headerSubtitle: {
    fontSize: 13,
    color: WarmPalette.charcoalWarm + "99",
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: WarmPalette.cream,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm + "80",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  sectionHint: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm + "80",
    marginBottom: 12,
  },
  elderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  elderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: WarmPalette.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  elderName: {
    fontSize: 16,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
  },
  elderMeta: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm + "90",
    marginTop: 1,
  },
  elderStatusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#16A34A",
    marginTop: 2,
  },
  quickHubGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  hubBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.ivory,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  hubBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: WarmPalette.sand,
  },
  infoLabel: {
    fontSize: 13,
    color: WarmPalette.charcoalWarm + "90",
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: WarmPalette.sand,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  switchSub: {
    fontSize: 11,
    color: WarmPalette.charcoalWarm + "80",
    marginTop: 2,
    lineHeight: 15,
  },
  langSelectorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  langName: {
    fontSize: 14,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  langSub: {
    fontSize: 11,
    color: WarmPalette.charcoalWarm + "80",
    marginTop: 2,
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    color: WarmPalette.charcoalWarm + "90",
    lineHeight: 17,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
  },
  langModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(40, 37, 36, 0.6)",
    justifyContent: "flex-end",
  },
  langModalSheet: {
    backgroundColor: WarmPalette.ivory,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "75%",
    paddingBottom: 30,
  },
  langModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: WarmPalette.sand,
  },
  langModalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  langModalItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.cream,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    padding: 14,
    marginBottom: 8,
  },
  langModalItemActive: {
    borderColor: WarmPalette.roseDusty,
    backgroundColor: WarmPalette.peach + "30",
  },
  langItemName: {
    fontSize: 15,
    fontWeight: "600",
    color: WarmPalette.charcoalWarm,
  },
  langItemNameActive: {
    fontWeight: "700",
    color: WarmPalette.roseDusty,
  },
  langItemNative: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm + "80",
    marginTop: 2,
  },
});
