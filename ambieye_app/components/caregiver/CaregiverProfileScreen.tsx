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
} from "react-native";
import { useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { useAuth } from "@/hooks/useAuth";
import { WarmPalette } from "../../constants/theme";
import { caregiverStorage, PatientProfile } from "../../utils/caregiverStorage";
import { dementiaCareStorage } from "../../utils/dementiaCareStorage";

import CaregiverPatientProfileModal from "./CaregiverPatientProfileModal";
import { CaregiverServicesModal } from "./CaregiverServicesModal";
import { CaregiverArticlesModal } from "./CaregiverArticlesModal";

interface Props {
  onSwitchToElderly?: () => void;
}

export const CaregiverProfileScreen: React.FC<Props> = ({ onSwitchToElderly }) => {
  const router = useRouter();
  const { logout } = useAuth();

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [wanderingAlerts, setWanderingAlerts] = useState(true);
  const [offlineSync, setOfflineSync] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  // Modals
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [showArticlesModal, setShowArticlesModal] = useState(false);

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
    if (onSwitchToElderly) {
      onSwitchToElderly();
    } else {
      await dementiaCareStorage.setActiveViewMode("elderly");
      router.replace("/(patient)" as any);
    }
  };

  return (
    <View style={styles.screenWrapper}>
      {/* ── SCREEN TITLE ─────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Caregiver & Elder Profile</Text>
        <Text style={styles.topBarSubtitle}>
          Account settings, verified eldercare services & senior kiosk switch
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[WarmPalette.roseDusty]}
            tintColor={WarmPalette.roseDusty}
          />
        }
      >
        {/* ── 1. PROMINENT SWITCH TO SENIOR KIOSK MODE ──────────────── */}
        <TouchableOpacity
          style={styles.kioskHeroBtn}
          onPress={handleSwitchToKiosk}
          activeOpacity={0.85}
        >
          <View style={styles.kioskHeroIconCircle}>
            <Feather name="tablet" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.kioskHeroContent}>
            <Text style={styles.kioskHeroTitle}>Switch to Senior Kiosk Mode</Text>
            <Text style={styles.kioskHeroSub}>
              Simplified, large-print tablet interface with avatar companion for {profile?.name || "the elder"}
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* ── 2. ELDER PROFILE SUMMARY CARD ──────────────────────────── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>SENIOR PROFILE</Text>
          <TouchableOpacity
            style={styles.viewFullPill}
            onPress={() => setShowProfileModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.viewFullPillText}>Full Details</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.elderCard}
          onPress={() => setShowProfileModal(true)}
          activeOpacity={0.85}
        >
          <View style={styles.elderAvatarBox}>
            <Text style={styles.elderEmoji}>{profile?.photoEmoji || "🧓"}</Text>
          </View>
          <View style={styles.elderTexts}>
            <Text style={styles.elderName}>{profile?.name || "Bhaben Barman"}</Text>
            <Text style={styles.elderSub}>
              Age {profile?.age || 72} · {profile?.currentStatus || "Active & Calm"}
            </Text>
            <Text style={styles.elderDiagnosis}>Early-stage Alzheimer's / MCI · Dr. Sharma</Text>
          </View>
          <Feather name="chevron-right" size={18} color="#94A3B8" />
        </TouchableOpacity>

        {/* ── 3. VERIFIED ELDERCARE SERVICES ─────────────────────────── */}
        <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
          <Text style={styles.sectionHeaderTitle}>VERIFIED ELDERCARE SERVICES</Text>
          <TouchableOpacity
            style={styles.viewFullPill}
            onPress={() => setShowServicesModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.viewFullPillText}>View All (6)</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.servicesGrid}>
          <TouchableOpacity
            style={styles.serviceMiniCard}
            onPress={() => setShowServicesModal(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: "#EFF6FF" }]}>
              <Feather name="shield" size={18} color="#2563EB" />
            </View>
            <Text style={styles.serviceMiniTitle}>Dementia Attendant</Text>
            <Text style={styles.serviceMiniSub}>Verified bedside care</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceMiniCard}
            onPress={() => setShowServicesModal(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: "#FDF2F8" }]}>
              <Feather name="video" size={18} color="#DB2777" />
            </View>
            <Text style={styles.serviceMiniTitle}>Neurologist Video</Text>
            <Text style={styles.serviceMiniSub}>Tele-consultation</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceMiniCard}
            onPress={() => setShowServicesModal(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: "#F0FDF4" }]}>
              <Feather name="activity" size={18} color="#16A34A" />
            </View>
            <Text style={styles.serviceMiniTitle}>Physiotherapy</Text>
            <Text style={styles.serviceMiniSub}>Mobility & balance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.serviceMiniCard}
            onPress={() => setShowServicesModal(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.serviceIconCircle, { backgroundColor: "#FFF7ED" }]}>
              <Feather name="truck" size={18} color="#EA580C" />
            </View>
            <Text style={styles.serviceMiniTitle}>Senior Transport</Text>
            <Text style={styles.serviceMiniSub}>Safe clinic escorts</Text>
          </TouchableOpacity>
        </View>

        {/* ── 4. CAREGIVING CLINICAL GUIDE ───────────────────────────── */}
        <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
          <Text style={styles.sectionHeaderTitle}>CAREGIVER KNOWLEDGE BASE</Text>
        </View>

        <TouchableOpacity
          style={styles.articleCard}
          onPress={() => setShowArticlesModal(true)}
          activeOpacity={0.85}
        >
          <View style={styles.articleIconBox}>
            <Feather name="book-open" size={18} color="#7C3AED" />
          </View>
          <View style={styles.articleContent}>
            <Text style={styles.articleTitle}>Sundowning & Dusk Restlessness</Text>
            <Text style={styles.articleDesc}>
              Practical steps for managing evening confusion using gentle lighting, warm tea & familiar music.
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color="#94A3B8" />
        </TouchableOpacity>

        {/* ── 5. SETTINGS & APP PREFERENCES ─────────────────────────── */}
        <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
          <Text style={styles.sectionHeaderTitle}>APP & SAFETY PREFERENCES</Text>
        </View>

        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingTexts}>
              <Text style={styles.settingTitle}>Medication Reminders</Text>
              <Text style={styles.settingSub}>Push alerts for daily medicine doses</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: "#CBD5E1", true: "#059669" }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTexts}>
              <Text style={styles.settingTitle}>Gramin Safe-Zone Alerts</Text>
              <Text style={styles.settingSub}>Instant SMS & siren if elder leaves 150m geofence</Text>
            </View>
            <Switch
              value={wanderingAlerts}
              onValueChange={setWanderingAlerts}
              trackColor={{ false: "#CBD5E1", true: "#059669" }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingRow}>
            <View style={styles.settingTexts}>
              <Text style={styles.settingTitle}>Offline-First Cloud Sync</Text>
              <Text style={styles.settingSub}>Differential privacy on-device data backup</Text>
            </View>
            <Switch
              value={offlineSync}
              onValueChange={setOfflineSync}
              trackColor={{ false: "#CBD5E1", true: "#059669" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* ── 6. LOGOUT BUTTON ────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.caregiverLogoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Feather name="log-out" size={18} color="#DC2626" />
          <Text style={styles.caregiverLogoutBtnText}>Log Out of AmbiEye</Text>
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
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  topBarSubtitle: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 96,
  },
  kioskHeroBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7C3AED",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  kioskHeroIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  kioskHeroContent: {
    flex: 1,
  },
  kioskHeroTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  kioskHeroSub: {
    fontSize: 11.5,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 2,
    lineHeight: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 8,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.8,
  },
  viewFullPill: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  viewFullPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#7C3AED",
  },
  elderCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  elderAvatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  elderEmoji: {
    fontSize: 26,
  },
  elderTexts: {
    flex: 1,
  },
  elderName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  elderSub: {
    fontSize: 12,
    color: "#475569",
    marginTop: 2,
  },
  elderDiagnosis: {
    fontSize: 11.5,
    color: "#0D9488",
    fontWeight: "600",
    marginTop: 2,
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  serviceMiniCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  serviceIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  serviceMiniTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  serviceMiniSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  articleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  articleIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  articleContent: {
    flex: 1,
  },
  articleTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  articleDesc: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 3,
    lineHeight: 16,
  },
  settingsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  settingTexts: {
    flex: 1,
    marginRight: 10,
  },
  settingTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  settingSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  settingDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 8,
  },
  caregiverLogoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#FECDD3",
    paddingVertical: 14,
    marginTop: 16,
    marginBottom: 20,
  },
  caregiverLogoutBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#DC2626",
  },
});
