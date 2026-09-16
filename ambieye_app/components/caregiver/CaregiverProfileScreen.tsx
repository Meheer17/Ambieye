import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  RefreshControl,
  Alert,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useAuth } from "@/hooks/useAuth";
import { PastelPalette } from "../../constants/theme";
import { caregiverStorage, PatientProfile } from "../../utils/caregiverStorage";
import { dementiaCareStorage } from "../../utils/dementiaCareStorage";

import CaregiverPatientProfileModal from "./CaregiverPatientProfileModal";
import { CaregiverServicesModal } from "./CaregiverServicesModal";
import { CaregiverArticlesModal } from "./CaregiverArticlesModal";

import AsyncStorage from "@react-native-async-storage/async-storage";

interface Props {
  onSwitchToElderly?: () => void;
}

export const CaregiverProfileScreen: React.FC<Props> = ({ onSwitchToElderly }) => {
  const router = useRouter();
  const { logout, username, setSelectedUserType } = useAuth();

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [wanderingAlerts, setWanderingAlerts] = useState(true);
  const [offlineSync, setOfflineSync] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [showArticlesModal, setShowArticlesModal] = useState(false);

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out of your AmbiEye account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/auth/login");
        },
      },
    ]);
  };

  const loadData = useCallback(async () => {
    try {
      const p = await caregiverStorage.getPatientProfile();
      setProfile(p);
    } catch (e) {
      console.warn("Failed to load caregiver profile data:", e);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSwitchToKiosk = async () => {
    Alert.alert(
      "Launch Senior Tablet View?",
      `Switch to the simplified, high-contrast kiosk mode with avatar assistance for ${profile?.name || "the elder"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Launch Senior View",
          onPress: async () => {
            try {
              await setSelectedUserType("patient");
              await dementiaCareStorage.setActiveViewMode("elderly");
              await AsyncStorage.setItem("ambieye_active_mode", "elderly");
              if (onSwitchToElderly) {
                onSwitchToElderly();
              } else {
                router.replace("/(patient)" as any);
              }
            } catch (err) {
              console.error("Error switching to kiosk:", err);
              router.replace("/(patient)" as any);
            }
          },
        },
      ]
    );
  };

  const handleCallContact = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <View style={styles.screenWrapper}>
      {/* ── TOP HEADER ──────────────────────────────────────────────── */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderLeft}>
          <View style={styles.headerAvatarCircle}>
            <Text style={{ fontSize: 22 }}>👩‍👧</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.topHeaderTitle}>Caregiver & Elder Profile</Text>
            <Text style={styles.topHeaderSub}>
              {username ? `Care Coordinator: ${username}` : "Primary Care Coordinator"} · Majuli Circle
            </Text>
          </View>
        </View>
        <View style={styles.radarStatusPill}>
          <View style={styles.greenPulseDot} />
          <Text style={styles.radarStatusText}>Safe Zone Active</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PastelPalette.lavenderPrimary, PastelPalette.rosePrimary]}
            tintColor={PastelPalette.rosePrimary}
          />
        }
      >
        {/* ── 1. PRIMARY CAREGIVER IDENTITY CARD ──────────────────────── */}
        <View style={styles.caregiverCard}>
          <View style={styles.caregiverCardLeft}>
            <View style={styles.caregiverIconCircle}>
              <MaterialCommunityIcons name="account-heart" size={24} color={PastelPalette.rosePrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.caregiverRoleRow}>
                <Text style={styles.caregiverName}>
                  {profile?.caregiverName || username || "Anita Barman"}
                </Text>
                <View style={styles.primaryBadge}>
                  <Text style={styles.primaryBadgeText}>PRIMARY CAREGIVER</Text>
                </View>
              </View>
              <Text style={styles.caregiverSub}>
                {profile?.caregiverRelationship || "Daughter & Primary Guardian"} · Majuli, Assam
              </Text>
              <Text style={styles.caregiverPhone}>
                📞 {profile?.emergencyContacts?.[0]?.phone || "+91 98640 12345"}
              </Text>
            </View>
          </View>
        </View>

        {/* ── 2. ELDER UNDER CARE (SENIOR MEDICAL PROFILE) ─────────────── */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderTitleGroup}>
            <Text style={{ fontSize: 16 }}>🧓</Text>
            <Text style={styles.sectionHeaderTitle}>ELDER UNDER CARE</Text>
          </View>
          <TouchableOpacity
            style={styles.viewFullPill}
            onPress={() => setShowProfileModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.viewFullPillText}>Full Medical Record</Text>
            <Feather name="chevron-right" size={12} color={PastelPalette.lavenderPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.elderCard}>
          {/* Elder Header Row */}
          <View style={styles.elderCardTop}>
            <View style={styles.elderAvatarBox}>
              <Text style={styles.elderEmoji}>{profile?.photoEmoji || "🧓"}</Text>
            </View>
            <View style={styles.elderTexts}>
              <View style={styles.elderNameRow}>
                <Text style={styles.elderName}>{profile?.name || "Bhaben Barman"}</Text>
                <View style={styles.statusPillSafe}>
                  <View style={styles.greenDot} />
                  <Text style={styles.statusPillSafeText}>At Home</Text>
                </View>
              </View>
              <Text style={styles.elderSub}>
                Age {profile?.age || 74} · Blood Group B+ · {profile?.medical?.primaryDoctor?.name || "Dr. Sharma"}
              </Text>
              <Text style={styles.elderDiagnosis}>
                🌿 {profile?.medical?.conditions?.[0] || "Mild Cognitive Impairment (Early Stage)"}
              </Text>
            </View>
          </View>

          {/* Safety & Location Tag */}
          <View style={styles.geofenceTagRow}>
            <Feather name="map-pin" size={12} color={PastelPalette.mintPrimary} />
            <Text style={styles.geofenceTagText}>
              Safe within 150m Majuli Home Geofence · Last check-in 2 mins ago
            </Text>
          </View>

          {/* Emergency Quick Info Row */}
          <View style={styles.elderCardDivider} />
          <View style={styles.elderCardBottom}>
            <View style={styles.elderInfoCol}>
              <Text style={styles.elderInfoLabel}>EMERGENCY DISPATCH CONTACT</Text>
              <Text style={styles.elderInfoVal}>
                {profile?.emergencyContacts?.[0]?.name || "Anita Barman"} ({profile?.emergencyContacts?.[0]?.phone || "+91 98640 12345"})
              </Text>
            </View>
            <TouchableOpacity
              style={styles.quickCallPill}
              onPress={() => handleCallContact(profile?.emergencyContacts?.[0]?.phone || "+91 98640 12345")}
              activeOpacity={0.8}
            >
              <Feather name="phone-call" size={12} color="#FFFFFF" />
              <Text style={styles.quickCallPillText}>Call</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 3. VERIFIED ELDERCARE SERVICES ─────────────────────────── */}
        <View style={[styles.sectionHeaderRow, { marginTop: 18 }]}>
          <View style={styles.sectionHeaderTitleGroup}>
            <MaterialCommunityIcons name="hand-heart" size={16} color={PastelPalette.rosePrimary} />
            <Text style={styles.sectionHeaderTitle}>VERIFIED ELDERCARE SERVICES</Text>
          </View>
          <TouchableOpacity
            style={styles.viewFullPill}
            onPress={() => setShowServicesModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.viewFullPillText}>View All (6)</Text>
            <Feather name="chevron-right" size={12} color={PastelPalette.lavenderPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.servicesGrid}>
          {/* Tile 1: Dementia Bedside Attendant */}
          <TouchableOpacity
            style={[styles.serviceMiniCard, { backgroundColor: PastelPalette.lavenderLight, borderColor: PastelPalette.lavenderBorder }]}
            onPress={() => setShowServicesModal(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: PastelPalette.lavenderSoft }]}>
              <Feather name="shield" size={18} color={PastelPalette.lavenderPrimary} />
            </View>
            <Text style={styles.serviceMiniTitle}>Dementia Attendant</Text>
            <Text style={styles.serviceMiniSub}>Verified bedside care & companionship</Text>
            <View style={styles.servicePriceBadge}>
              <Text style={styles.servicePriceText}>₹450 / shift</Text>
            </View>
          </TouchableOpacity>

          {/* Tile 2: Neurologist Video */}
          <TouchableOpacity
            style={[styles.serviceMiniCard, { backgroundColor: PastelPalette.pinkLight, borderColor: PastelPalette.pinkBorder }]}
            onPress={() => setShowServicesModal(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: PastelPalette.pinkSoft }]}>
              <Feather name="video" size={18} color={PastelPalette.rosePrimary} />
            </View>
            <Text style={styles.serviceMiniTitle}>Neurologist Video</Text>
            <Text style={styles.serviceMiniSub}>Tele-consultation with Dr. Sharma</Text>
            <View style={styles.servicePriceBadge}>
              <Text style={styles.servicePriceText}>Direct Care</Text>
            </View>
          </TouchableOpacity>

          {/* Tile 3: In-Home Physiotherapy */}
          <TouchableOpacity
            style={[styles.serviceMiniCard, { backgroundColor: PastelPalette.mintLight, borderColor: PastelPalette.mintBorder }]}
            onPress={() => setShowServicesModal(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: PastelPalette.mintSoft }]}>
              <Feather name="activity" size={18} color={PastelPalette.mintPrimary} />
            </View>
            <Text style={styles.serviceMiniTitle}>Physiotherapy</Text>
            <Text style={styles.serviceMiniSub}>Mobility, balance & fall prevention</Text>
            <View style={styles.servicePriceBadge}>
              <Text style={styles.servicePriceText}>₹350 / visit</Text>
            </View>
          </TouchableOpacity>

          {/* Tile 4: Senior Transport */}
          <TouchableOpacity
            style={[styles.serviceMiniCard, { backgroundColor: PastelPalette.peachLight, borderColor: PastelPalette.peachBorder }]}
            onPress={() => setShowServicesModal(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: PastelPalette.peachSoft }]}>
              <MaterialCommunityIcons name="car-estate" size={20} color={PastelPalette.peachPrimary} />
            </View>
            <Text style={styles.serviceMiniTitle}>Senior Transport</Text>
            <Text style={styles.serviceMiniSub}>Safe clinic escorts with wheelchair support</Text>
            <View style={styles.servicePriceBadge}>
              <Text style={styles.servicePriceText}>On-Demand</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── 4. CAREGIVING CLINICAL PLAYBOOKS ───────────────────────── */}
        <View style={[styles.sectionHeaderRow, { marginTop: 18 }]}>
          <View style={styles.sectionHeaderTitleGroup}>
            <Feather name="book-open" size={15} color={PastelPalette.lavenderPrimary} />
            <Text style={styles.sectionHeaderTitle}>CAREGIVER CLINICAL PLAYBOOKS</Text>
          </View>
          <TouchableOpacity
            style={styles.viewFullPill}
            onPress={() => setShowArticlesModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.viewFullPillText}>All Guides</Text>
            <Feather name="chevron-right" size={12} color={PastelPalette.lavenderPrimary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.articleCard}
          onPress={() => setShowArticlesModal(true)}
          activeOpacity={0.85}
        >
          <View style={styles.articleIconBox}>
            <Text style={{ fontSize: 24 }}>🌅</Text>
          </View>
          <View style={styles.articleContent}>
            <View style={styles.articleTagRow}>
              <Text style={styles.articleTag}>SUNDOWNING & TWILIGHT</Text>
              <Text style={styles.articleReadTime}>3 min read</Text>
            </View>
            <Text style={styles.articleTitle}>Managing Evening Confusion & Restlessness</Text>
            <Text style={styles.articleDesc}>
              Practical steps for managing dusk anxiety using warm Assam tea, ambient lighting & familiar devotional flute songs.
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={PastelPalette.lavenderPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.articleCard, { marginTop: 8 }]}
          onPress={() => setShowArticlesModal(true)}
          activeOpacity={0.85}
        >
          <View style={[styles.articleIconBox, { backgroundColor: PastelPalette.pinkSoft }]}>
            <Text style={{ fontSize: 24 }}>💊</Text>
          </View>
          <View style={styles.articleContent}>
            <View style={styles.articleTagRow}>
              <Text style={[styles.articleTag, { color: PastelPalette.rosePrimary }]}>MEDICATION ROUTINE</Text>
              <Text style={styles.articleReadTime}>2 min read</Text>
            </View>
            <Text style={styles.articleTitle}>Gentle Medication Hesitation Guide</Text>
            <Text style={styles.articleDesc}>
              De-escalation protocol when elder hesitates taking morning Donepezil tablet with calm reassurance and fruit pairing.
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={PastelPalette.lavenderPrimary} />
        </TouchableOpacity>

        {/* ── 5. APP SAFETY, DEVICE & SYNC SETTINGS ─────────────────── */}
        <View style={[styles.sectionHeaderRow, { marginTop: 18 }]}>
          <View style={styles.sectionHeaderTitleGroup}>
            <Feather name="sliders" size={15} color={PastelPalette.mintPrimary} />
            <Text style={styles.sectionHeaderTitle}>SAFETY & DEVICE SETTINGS</Text>
          </View>
        </View>

        <View style={styles.settingsCard}>
          {/* Setting 1: Launch Senior Kiosk View Option */}
          <TouchableOpacity
            style={styles.kioskSettingRow}
            onPress={handleSwitchToKiosk}
            activeOpacity={0.75}
          >
            <View style={styles.kioskSettingIcon}>
              <MaterialCommunityIcons name="tablet-cellphone" size={20} color={PastelPalette.lavenderPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Senior Tablet / Kiosk View</Text>
              <Text style={styles.settingSub}>Preview or activate large-print avatar mode for elder</Text>
            </View>
            <View style={styles.launchPill}>
              <Text style={styles.launchPillText}>Launch</Text>
              <Feather name="chevron-right" size={12} color={PastelPalette.lavenderPrimary} />
            </View>
          </TouchableOpacity>

          <View style={styles.settingDivider} />

          {/* Setting 2: Medication Reminders */}
          <View style={styles.settingRow}>
            <View style={styles.settingTexts}>
              <Text style={styles.settingTitle}>Medication Reminders</Text>
              <Text style={styles.settingSub}>Push alerts for daily medicine doses & schedules</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: "#E2E8F0", true: PastelPalette.mintSoft }}
              thumbColor={notificationsEnabled ? PastelPalette.mintPrimary : "#94A3B8"}
            />
          </View>

          <View style={styles.settingDivider} />

          {/* Setting 3: Safe Zone Radar */}
          <View style={styles.settingRow}>
            <View style={styles.settingTexts}>
              <Text style={styles.settingTitle}>Gramin Safe-Zone Radar</Text>
              <Text style={styles.settingSub}>Instant siren & SMS alert if elder leaves 150m geofence</Text>
            </View>
            <Switch
              value={wanderingAlerts}
              onValueChange={setWanderingAlerts}
              trackColor={{ false: "#E2E8F0", true: PastelPalette.mintSoft }}
              thumbColor={wanderingAlerts ? PastelPalette.mintPrimary : "#94A3B8"}
            />
          </View>

          <View style={styles.settingDivider} />

          {/* Setting 4: Differential Privacy */}
          <View style={styles.settingRow}>
            <View style={styles.settingTexts}>
              <Text style={styles.settingTitle}>Differential Privacy Cloud Sync</Text>
              <Text style={styles.settingSub}>On-device ML calibration with ε=0.85 privacy guarantee</Text>
            </View>
            <Switch
              value={offlineSync}
              onValueChange={setOfflineSync}
              trackColor={{ false: "#E2E8F0", true: PastelPalette.mintSoft }}
              thumbColor={offlineSync ? PastelPalette.mintPrimary : "#94A3B8"}
            />
          </View>
        </View>

        {/* ── 6. LOGOUT BUTTON ────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.caregiverLogoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Feather name="log-out" size={17} color="#DC2626" />
          <Text style={styles.caregiverLogoutBtnText}>Log Out of AmbiEye Account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── MODALS ─────────────────────────────────────────────────── */}
      {profile && (
        <CaregiverPatientProfileModal
          visible={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          profile={profile}
        />
      )}

      <CaregiverServicesModal
        visible={showServicesModal}
        onClose={() => setShowServicesModal(false)}
        elderName={profile?.name || "Bhaben Barman"}
      />

      <CaregiverArticlesModal
        visible={showArticlesModal}
        onClose={() => setShowArticlesModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: "#FAF8FC",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  topHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: PastelPalette.pinkSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: PastelPalette.pinkBorder,
  },
  topHeaderTitle: {
    fontSize: 18.5,
    fontWeight: "800",
    color: "#1E1B4B",
    letterSpacing: -0.3,
  },
  topHeaderSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  radarStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: PastelPalette.mintSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PastelPalette.mintBorder,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  radarStatusText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: PastelPalette.mintPrimary,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 130, // Generous padding so content never cuts off behind bottom bar
  },

  /* Primary Caregiver Card */
  caregiverCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: PastelPalette.pinkBorder,
    shadowColor: PastelPalette.rosePrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  caregiverCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  caregiverIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: PastelPalette.pinkSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: PastelPalette.pinkBorder,
  },
  caregiverRoleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  caregiverName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  primaryBadge: {
    backgroundColor: PastelPalette.pinkSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  primaryBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: PastelPalette.rosePrimary,
    letterSpacing: 0.5,
  },
  caregiverSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  caregiverPhone: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#475569",
    marginTop: 2,
  },

  /* Section Header */
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 8,
  },
  sectionHeaderTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.7,
  },
  viewFullPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: PastelPalette.lavenderSoft,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PastelPalette.lavenderBorder,
  },
  viewFullPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: PastelPalette.lavenderPrimary,
  },

  /* Senior Card (Clean Vertical Layout) */
  elderCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EDE9FE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  elderCardTop: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  elderAvatarBox: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: PastelPalette.peachSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: PastelPalette.peachBorder,
  },
  elderEmoji: {
    fontSize: 26,
  },
  elderTexts: {
    flex: 1,
  },
  elderNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  elderName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  statusPillSafe: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PastelPalette.mintSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  greenDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#10B981",
  },
  statusPillSafeText: {
    fontSize: 10,
    fontWeight: "800",
    color: PastelPalette.mintPrimary,
  },
  elderSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  elderDiagnosis: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "600",
    marginTop: 3,
  },
  geofenceTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: PastelPalette.mintLight,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: PastelPalette.mintBorder,
  },
  geofenceTagText: {
    fontSize: 10.5,
    color: "#065F46",
    fontWeight: "600",
    flex: 1,
  },
  elderCardDivider: {
    width: "100%",
    height: 1,
    backgroundColor: "#F1EAF8",
    marginVertical: 10,
  },
  elderCardBottom: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  elderInfoCol: {
    flex: 1,
    paddingRight: 8,
  },
  elderInfoLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  elderInfoVal: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#1E1B4B",
    marginTop: 2,
  },
  quickCallPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PastelPalette.rosePrimary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quickCallPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  /* Services Grid */
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  serviceMiniCard: {
    width: "48%",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  serviceIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  serviceMiniTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  serviceMiniSub: {
    fontSize: 10.5,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 14,
  },
  servicePriceBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    marginTop: 8,
  },
  servicePriceText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#475569",
  },

  /* Article Card */
  articleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EDE9FE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
  },
  articleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: PastelPalette.lavenderSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  articleContent: {
    flex: 1,
  },
  articleTagRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  articleTag: {
    fontSize: 9.5,
    fontWeight: "800",
    color: PastelPalette.lavenderPrimary,
    letterSpacing: 0.5,
  },
  articleReadTime: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
  },
  articleTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  articleDesc: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 15,
  },

  /* Settings Card */
  settingsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EDE9FE",
  },
  kioskSettingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 10,
  },
  kioskSettingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PastelPalette.lavenderSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  launchPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: PastelPalette.lavenderSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  launchPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: PastelPalette.lavenderPrimary,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  settingTexts: {
    flex: 1,
    paddingRight: 10,
  },
  settingTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  settingSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  settingDivider: {
    height: 1,
    backgroundColor: "#F1EAF8",
    marginVertical: 8,
  },

  /* Logout Button */
  caregiverLogoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: 14,
    paddingVertical: 13,
    marginTop: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  caregiverLogoutBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#DC2626",
  },
});
