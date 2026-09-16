import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Platform,
  Alert,
  Switch,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useAuth } from "@/hooks/useAuth";
import { patientService } from "@/services/api/patientService";
import { useTranslation, SUPPORTED_LANGUAGES, SupportedLanguage } from "@/constants/i18n";
import { VoiceAssistant } from "@/utils/voiceAssistant";
import { getServerConfig, saveServerConfig, buildServerUrl, DEFAULT_PORT } from "@/utils/eyeTrackingStorage";
import {
  accessibilityStorage,
  AccessibilitySettings,
  TextSizeOption,
} from "@/utils/accessibilityStorage";
import { PastelPalette, Spacing, BorderRadius } from "@/constants/theme";

function showAlert(title: string, message?: string) {
  if (Platform.OS === "web") {
    window.alert(title + (message ? "\n\n" + message : ""));
  } else {
    Alert.alert(title, message);
  }
}

export default function PatientSettingsScreen() {
  const router = useRouter();
  const { logout, username } = useAuth();
  const { t, currentLang, changeLanguage } = useTranslation();

  const [profileData, setProfileData] = useState<any>(null);
  const [showLangModal, setShowLangModal] = useState(false);
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverIp, setServerIp] = useState("");
  const [serverPort, setServerPort] = useState(DEFAULT_PORT);
  const [serverPinging, setServerPinging] = useState(false);
  const [serverPingResult, setServerPingResult] = useState<"ok" | "fail" | null>(null);

  // Accessibility State
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>({
    textSize: "normal",
    highContrast: false,
    reduceMotion: false,
    voiceAssistEnabled: true,
  });

  useEffect(() => {
    patientService.getProfile().then((res) => {
      if (res.success) setProfileData(res.profile);
    });

    getServerConfig().then(({ ip, port }) => {
      setServerIp(ip || "192.168.29.140");
      setServerPort(port || DEFAULT_PORT);
    });

    accessibilityStorage.getSettings().then(setAccessibility);
  }, []);

  const handleUpdateTextSize = async (size: TextSizeOption) => {
    const updated = await accessibilityStorage.updateSettings({ textSize: size });
    setAccessibility(updated);
    VoiceAssistant.speak(`Text size set to ${size}`, currentLang);
  };

  const handleToggleHighContrast = async (val: boolean) => {
    const updated = await accessibilityStorage.updateSettings({ highContrast: val });
    setAccessibility(updated);
  };

  const handleToggleReduceMotion = async (val: boolean) => {
    const updated = await accessibilityStorage.updateSettings({ reduceMotion: val });
    setAccessibility(updated);
  };

  const handleToggleVoiceAssist = async (val: boolean) => {
    const updated = await accessibilityStorage.updateSettings({ voiceAssistEnabled: val });
    setAccessibility(updated);
  };

  const handleTestVoice = () => {
    VoiceAssistant.speak(
      currentLang === "as"
        ? "নমস্কাৰ, আপোনাৰ ভইচ সহায়িকা সুন্দৰভাৱে চলি আছে।"
        : currentLang === "hi"
        ? "नमस्ते, आपकी आवाज सहायिका तैयार है।"
        : "Hello, your voice assistant is active and working smoothly.",
      currentLang
    );
  };

  const handleCallCaregiver = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleSaveServer = async () => {
    await saveServerConfig(serverIp, serverPort);
    showAlert("Saved", "Eye tracking server config saved.");
    setShowServerModal(false);
  };

  const handlePingServer = async () => {
    const url = buildServerUrl(serverIp, serverPort);
    if (!url) return;
    setServerPinging(true);
    setServerPingResult(null);
    try {
      const res = await fetch(`${url}/health`);
      setServerPingResult(res.ok ? "ok" : "fail");
    } catch {
      setServerPingResult("fail");
    } finally {
      setServerPinging(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(t("logout_btn"), "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: t("logout_btn"),
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/auth/login");
        },
      },
    ]);
  };

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {currentLang === "as" ? "মোৰ প্ৰফাইল আৰু সহায়" : "My Profile & Voice"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {currentLang === "as"
              ? "ভাষা, আখৰৰ আকাৰ আৰু সহায়কাৰী সুবিধা"
              : "Language, text size & voice comfort settings"}
          </Text>
        </View>

        {/* ── USER PROFILE CARD ──────────────────────────────────────── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarBg}>
            <Text style={styles.avatarEmoji}>🧓</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profileData?.name || username || "Bhaben Barman"}</Text>
            <Text style={styles.profileRole}>
              🌸 {currentLang === "as" ? "স্মৃতি সেৱা অংশগ্ৰহণকাৰী" : "Dementia Care Participant"}
            </Text>
            <Text style={styles.profileRegion}>
              📍 Majuli, Assam · {profileData?.primaryCaregiver || "Anita Barman (Daughter)"}
            </Text>
          </View>
        </View>

        {/* ── EMERGENCY CAREGIVER CONNECT ────────────────────────────── */}
        <View style={styles.caregiverConnectCard}>
          <View style={styles.caregiverIconCircle}>
            <MaterialCommunityIcons name="heart-pulse" size={24} color={PastelPalette.rosePrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.caregiverConnectTitle}>
              {currentLang === "as" ? "মুখ্য সহায়িকা: অনিতা" : "Primary Caregiver: Anita"}
            </Text>
            <Text style={styles.caregiverConnectSub}>
              {currentLang === "as" ? "যিকোনো সহায়ৰ বাবে জনাওক" : "Daughter · Always connected"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.callCaregiverBtn}
            onPress={() => handleCallCaregiver(profileData?.emergencyContact || "+919864012345")}
            activeOpacity={0.85}
          >
            <Feather name="phone-call" size={14} color="#FFFFFF" />
            <Text style={styles.callCaregiverBtnText}>
              {currentLang === "as" ? "কল কৰক" : "Call"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ════════════ ⚙️ ACCESSIBILITY & COMFORT ════════════ */}
        <Text style={styles.sectionHeader}>
          {currentLang === "as" ? "⚙️ আখৰ আৰু পঢ়াৰ সুবিধা" : "⚙️ Accessibility & Visual Comfort"}
        </Text>

        {/* 1. Text Size Control */}
        <View style={styles.settingCard}>
          <View style={styles.settingRowHeader}>
            <View style={[styles.settingIconBg, { backgroundColor: PastelPalette.lavenderSoft }]}>
              <Feather name="type" size={20} color={PastelPalette.lavenderPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>
                {currentLang === "as" ? "আখৰৰ আকাৰ" : "Text Size Control"}
              </Text>
              <Text style={styles.settingSub}>
                {currentLang === "as" ? "পঢ়িবলৈ সহজ হোৱাকৈ বাছক" : "Adjust typography for easy reading"}
              </Text>
            </View>
          </View>

          <View style={styles.textSizePillsRow}>
            {[
              { key: "small", label: currentLang === "as" ? "সৰু" : "Small" },
              { key: "normal", label: currentLang === "as" ? "সাধাৰণ" : "Normal" },
              { key: "large", label: currentLang === "as" ? "ডাঙৰ" : "Large" },
              { key: "xlarge", label: currentLang === "as" ? "অতি ডাঙৰ" : "Extra" },
            ].map((item) => {
              const isSelected = accessibility.textSize === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.textSizePill, isSelected && styles.textSizePillActive]}
                  onPress={() => handleUpdateTextSize(item.key as TextSizeOption)}
                >
                  <Text style={[styles.textSizePillText, isSelected && styles.textSizePillTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 2. High Contrast Mode */}
        <View style={styles.settingCard}>
          <View style={styles.switchRow}>
            <View style={[styles.settingIconBg, { backgroundColor: PastelPalette.peachSoft }]}>
              <Feather name="sun" size={20} color={PastelPalette.peachPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>
                {currentLang === "as" ? "স্পষ্ট ৰং আৰু কণ্ট্ৰাষ্ট" : "High Contrast Mode"}
              </Text>
              <Text style={styles.settingSub}>
                {currentLang === "as" ? "পোহৰ আৰু ডাঠ সীমাৰেখা" : "Stronger borders & crisp contrast"}
              </Text>
            </View>
            <Switch
              value={accessibility.highContrast}
              onValueChange={handleToggleHighContrast}
              trackColor={{ false: "#E2E8F0", true: PastelPalette.mintSoft }}
              thumbColor={accessibility.highContrast ? PastelPalette.mintPrimary : "#94A3B8"}
            />
          </View>
        </View>

        {/* 3. Reduce Motion for Comfort */}
        <View style={styles.settingCard}>
          <View style={styles.switchRow}>
            <View style={[styles.settingIconBg, { backgroundColor: PastelPalette.mintSoft }]}>
              <Feather name="shield" size={20} color={PastelPalette.mintPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>
                {currentLang === "as" ? "স্থিৰ এনিমেচন" : "Reduce Motion"}
              </Text>
              <Text style={styles.settingSub}>
                {currentLang === "as" ? "শান্ত আৰু লৰচৰ নোহোৱা স্ক্ৰীন" : "Calmer static UI without heavy motion"}
              </Text>
            </View>
            <Switch
              value={accessibility.reduceMotion}
              onValueChange={handleToggleReduceMotion}
              trackColor={{ false: "#E2E8F0", true: PastelPalette.mintSoft }}
              thumbColor={accessibility.reduceMotion ? PastelPalette.mintPrimary : "#94A3B8"}
            />
          </View>
        </View>

        {/* 4. Spoken Voice Assist */}
        <View style={styles.settingCard}>
          <View style={styles.switchRow}>
            <View style={[styles.settingIconBg, { backgroundColor: PastelPalette.lavenderSoft }]}>
              <Feather name="volume-2" size={20} color={PastelPalette.lavenderPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>
                {currentLang === "as" ? "ভইচ সহায়িকা" : "Voice Assistant"}
              </Text>
              <Text style={styles.settingSub}>
                {currentLang === "as" ? "সম্ভাষণ আৰু পৰামৰ্শ শুনক" : "Read aloud greetings, reminders & advice"}
              </Text>
            </View>
            <Switch
              value={accessibility.voiceAssistEnabled}
              onValueChange={handleToggleVoiceAssist}
              trackColor={{ false: "#E2E8F0", true: PastelPalette.mintSoft }}
              thumbColor={accessibility.voiceAssistEnabled ? PastelPalette.mintPrimary : "#94A3B8"}
            />
          </View>
        </View>

        {/* ── Section: Language & Voice ─────────────────────────────── */}
        <Text style={styles.sectionHeader}>
          {currentLang === "as" ? "🗣️ ভাষা আৰু কণ্ঠস্বৰ" : "🗣️ Language & Voice"}
        </Text>

        {/* Language Switcher Button */}
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setShowLangModal(true)}
          activeOpacity={0.75}
        >
          <View style={[styles.settingIconBg, { backgroundColor: PastelPalette.pinkSoft }]}>
            <Feather name="globe" size={22} color={PastelPalette.rosePrimary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>
              {currentLang === "as" ? "ভাষা বাছক" : "Select Language"}
            </Text>
            <Text style={styles.settingValue}>
              {currentLangObj.flagEmoji} {currentLangObj.nativeName} ({currentLangObj.name})
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={PastelPalette.lavenderPrimary} />
        </TouchableOpacity>

        {/* Voice Assistant Test Button */}
        <TouchableOpacity
          style={styles.settingItem}
          onPress={handleTestVoice}
          activeOpacity={0.75}
        >
          <View style={[styles.settingIconBg, { backgroundColor: PastelPalette.lavenderSoft }]}>
            <Feather name="mic" size={22} color={PastelPalette.lavenderPrimary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>
              {currentLang === "as" ? "কণ্ঠস্বৰ পৰীক্ষা কৰক" : "Test Voice Assistant"}
            </Text>
            <Text style={styles.settingValue}>
              {currentLang === "as" ? "শুনিবলৈ ইয়াত স্পৰ্শ কৰক" : "Tap to hear sample spoken audio"}
            </Text>
          </View>
          <Feather name="volume-2" size={20} color={PastelPalette.lavenderPrimary} />
        </TouchableOpacity>

        {/* Eye Tracking Server Settings */}
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setShowServerModal(true)}
          activeOpacity={0.75}
        >
          <View style={[styles.settingIconBg, { backgroundColor: PastelPalette.mintSoft }]}>
            <Feather name="cpu" size={20} color={PastelPalette.mintPrimary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>Eye Tracking Device Link</Text>
            <Text style={styles.settingValue}>{serverIp}:{serverPort}</Text>
          </View>
          <Feather name="chevron-right" size={20} color={PastelPalette.lavenderPrimary} />
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Feather name="log-out" size={18} color="#DC2626" />
          <Text style={styles.logoutButtonText}>{t("logout_btn")}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── LANGUAGE MODAL ─────────────────────────────────────────── */}
      <Modal visible={showLangModal} transparent animationType="fade" onRequestClose={() => setShowLangModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {currentLang === "as" ? "ভাষা বাছক" : "Choose Language"}
              </Text>
              <TouchableOpacity onPress={() => setShowLangModal(false)}>
                <Feather name="x" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.langList}>
              {SUPPORTED_LANGUAGES.map((item) => {
                const isActive = currentLang === item.code;
                return (
                  <TouchableOpacity
                    key={item.code}
                    style={[styles.langCard, isActive && styles.langCardActive]}
                    onPress={async () => {
                      await changeLanguage(item.code as SupportedLanguage);
                      setShowLangModal(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.langEmoji}>{item.flagEmoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.langNative, isActive && { color: PastelPalette.lavenderPrimary }]}>
                        {item.nativeName}
                      </Text>
                      <Text style={styles.langRegion}>{item.name}</Text>
                    </View>
                    {isActive && <Feather name="check" size={18} color={PastelPalette.lavenderPrimary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── SERVER CONFIG MODAL ────────────────────────────────────── */}
      <Modal visible={showServerModal} transparent animationType="fade" onRequestClose={() => setShowServerModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Eye Tracking Server</Text>
              <TouchableOpacity onPress={() => setShowServerModal(false)}>
                <Feather name="x" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Server IP</Text>
            <TextInput
              style={styles.input}
              value={serverIp}
              onChangeText={setServerIp}
              placeholder="e.g. 192.168.1.100"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.inputLabel}>Port</Text>
            <TextInput
              style={styles.input}
              value={serverPort}
              onChangeText={setServerPort}
              placeholder="8000"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
            />

            <View style={styles.pingRow}>
              <TouchableOpacity style={styles.pingBtn} onPress={handlePingServer} activeOpacity={0.8}>
                <Text style={styles.pingBtnText}>
                  {serverPinging ? "Checking..." : "Ping Server"}
                </Text>
              </TouchableOpacity>
              {serverPingResult === "ok" && (
                <View style={styles.pingResultOk}>
                  <Feather name="check-circle" size={15} color="#16A34A" />
                  <Text style={styles.pingResultOkText}>Connected</Text>
                </View>
              )}
              {serverPingResult === "fail" && (
                <View style={styles.pingResultFail}>
                  <Feather name="alert-circle" size={15} color="#DC2626" />
                  <Text style={styles.pingResultFailText}>Unreachable</Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveServer} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>Save Configuration</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF8FC",
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 130, // Clearance above floating bottom bar
  },
  header: {
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E1B4B",
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },

  /* User Profile Card */
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: "#EDE9FE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  avatarBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PastelPalette.peachSoft,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: PastelPalette.peachBorder,
  },
  avatarEmoji: {
    fontSize: 26,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16.5,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  profileRole: {
    fontSize: 12,
    color: PastelPalette.rosePrimary,
    fontWeight: "700",
    marginTop: 2,
  },
  profileRegion: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },

  /* Caregiver Connect Card */
  caregiverConnectCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PastelPalette.pinkLight,
    borderRadius: BorderRadius.xl,
    padding: 12,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: PastelPalette.pinkBorder,
    gap: 10,
  },
  caregiverIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: PastelPalette.pinkSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  caregiverConnectTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  caregiverConnectSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  callCaregiverBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PastelPalette.rosePrimary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  callCaregiverBtnText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  /* Section Header */
  sectionHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },

  /* Setting Card */
  settingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: "#EDE9FE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  settingRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  textSizePillsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  textSizePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#FAF8FC",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  textSizePillActive: {
    backgroundColor: PastelPalette.lavenderSoft,
    borderColor: PastelPalette.lavenderPrimary,
  },
  textSizePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  textSizePillTextActive: {
    color: PastelPalette.lavenderPrimary,
    fontWeight: "800",
  },

  /* Setting Item */
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: "#EDE9FE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  settingIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  settingSub: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  settingValue: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
  },

  /* Logout */
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: BorderRadius.xl,
    paddingVertical: 14,
    marginTop: Spacing.md,
    gap: 8,
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  logoutButtonText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#DC2626",
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "#EDE9FE",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  langList: {
    gap: 8,
  },
  langCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: "#FAF8FC",
    borderWidth: 1.5,
    borderColor: "#EDE9FE",
    gap: 12,
  },
  langCardActive: {
    backgroundColor: PastelPalette.lavenderLight,
    borderColor: PastelPalette.lavenderPrimary,
  },
  langEmoji: {
    fontSize: 24,
  },
  langNative: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#1E1B4B",
  },
  langRegion: {
    fontSize: 11.5,
    color: "#64748B",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#FAF8FC",
    borderWidth: 1.5,
    borderColor: "#EDE9FE",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: "#1E1B4B",
  },
  pingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  pingBtn: {
    backgroundColor: "#FAF8FC",
    borderWidth: 1,
    borderColor: "#EDE9FE",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pingBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  pingResultOk: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pingResultOkText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#16A34A",
  },
  pingResultFail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pingResultFailText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },
  saveBtn: {
    backgroundColor: PastelPalette.lavenderPrimary,
    borderRadius: BorderRadius.lg,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
