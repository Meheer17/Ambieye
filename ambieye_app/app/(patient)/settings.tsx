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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Colors, BorderRadius, Shadows, Spacing, WarmPalette } from "@/constants/theme";
import { dementiaCareStorage } from "@/utils/dementiaCareStorage";
import { CaregiverProfileScreen } from "@/components/caregiver/CaregiverProfileScreen";

function showAlert(title: string, message?: string) {
  if (Platform.OS === "web") {
    window.alert(title + (message ? "\n\n" + message : ""));
  } else {
    Alert.alert(title, message);
  }
}

export default function SettingsScreen() {
  const router = useRouter();
  const { logout, username } = useAuth();
  const { t, currentLang, changeLanguage } = useTranslation();

  const [viewMode, setViewMode] = useState<"elderly" | "caregiver">("elderly");
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

  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        const activeMode = await AsyncStorage.getItem("ambieye_active_mode");
        const savedMode = await dementiaCareStorage.getActiveViewMode();
        if (activeMode === "caregiver" || username?.toLowerCase() === "caregiver") {
          setViewMode("caregiver");
        } else {
          setViewMode(savedMode);
        }
      })();
    }, [username])
  );

  useEffect(() => {
    if (viewMode === "caregiver") return;
    patientService.getProfile().then((res) => {
      if (res.success) setProfileData(res.profile);
    });

    getServerConfig().then(({ ip, port }) => {
      setServerIp(ip || "192.168.29.140");
      setServerPort(port || DEFAULT_PORT);
    });

    accessibilityStorage.getSettings().then(setAccessibility);
  }, [viewMode]);

  if (viewMode === "caregiver") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: WarmPalette.ivory }} edges={["top"]}>
        <CaregiverProfileScreen />
      </SafeAreaView>
    );
  }

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
    VoiceAssistant.speak(t("voice_test_msg"), currentLang);
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
        },
      },
    ]);
  };

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t("settings_title")}</Text>
          <Text style={styles.headerSubtitle}>{t("settings_subtitle")}</Text>
        </View>

        {/* ── User Profile Card ─────────────────────────────────────── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarBg}>
            <Text style={styles.avatarEmoji}>👵</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{username || profileData?.fullName || "Aita / Koka"}</Text>
            <Text style={styles.profileRole}>{t("dementia_participant")}</Text>
            <Text style={styles.profileRegion}>{t("ner_region_label")}</Text>
          </View>
        </View>

        {/* ════════════ ⚙️ ACCESSIBILITY SETTINGS ════════════ */}
        <Text style={styles.sectionHeader}>⚙️ Accessibility & Visual Comfort</Text>

        {/* 1. Text Size Control */}
        <View style={styles.settingCard}>
          <View style={styles.settingRowHeader}>
            <View style={[styles.settingIconBg, { backgroundColor: "#DBEAFE" }]}>
              <Feather name="type" size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Text Size Control</Text>
              <Text style={styles.settingSub}>Adjust typography for easy reading</Text>
            </View>
          </View>

          <View style={styles.textSizePillsRow}>
            {[
              { key: "small", label: "Small" },
              { key: "normal", label: "Normal" },
              { key: "large", label: "Large" },
              { key: "xlarge", label: "Extra Large" },
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
            <View style={[styles.settingIconBg, { backgroundColor: "#FEF3C7" }]}>
              <Feather name="sun" size={20} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>High Contrast Mode</Text>
              <Text style={styles.settingSub}>Stronger borders & crisp contrast</Text>
            </View>
            <Switch
              value={accessibility.highContrast}
              onValueChange={handleToggleHighContrast}
              trackColor={{ false: "#CBD5E1", true: "#2563EB" }}
            />
          </View>
        </View>

        {/* 3. Reduce Motion for Comfort */}
        <View style={styles.settingCard}>
          <View style={styles.switchRow}>
            <View style={[styles.settingIconBg, { backgroundColor: "#DCFCE7" }]}>
              <Feather name="shield" size={20} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Reduce Motion</Text>
              <Text style={styles.settingSub}>Calmer static UI without heavy transitions</Text>
            </View>
            <Switch
              value={accessibility.reduceMotion}
              onValueChange={handleToggleReduceMotion}
              trackColor={{ false: "#CBD5E1", true: "#16A34A" }}
            />
          </View>
        </View>

        {/* 4. Spoken Voice Assist */}
        <View style={styles.settingCard}>
          <View style={styles.switchRow}>
            <View style={[styles.settingIconBg, { backgroundColor: "#FAF5FF" }]}>
              <Feather name="volume-2" size={20} color="#9333EA" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Voice Assistant</Text>
              <Text style={styles.settingSub}>Read aloud greetings, reminders & games</Text>
            </View>
            <Switch
              value={accessibility.voiceAssistEnabled}
              onValueChange={handleToggleVoiceAssist}
              trackColor={{ false: "#CBD5E1", true: "#9333EA" }}
            />
          </View>
        </View>

        {/* ── Section: Language & Voice ─────────────────────────────── */}
        <Text style={styles.sectionHeader}>{t("language_section")}</Text>

        {/* Language Switcher Button */}
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setShowLangModal(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.settingIconBg, { backgroundColor: "#EFF6FF" }]}>
            <Feather name="globe" size={22} color="#2563EB" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>{t("select_language")}</Text>
            <Text style={styles.settingValue}>
              {currentLangObj.flagEmoji} {currentLangObj.nativeName} ({currentLangObj.name})
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color="#94A3B8" />
        </TouchableOpacity>

        {/* Voice Assistant Test Button */}
        <TouchableOpacity
          style={styles.settingItem}
          onPress={handleTestVoice}
          activeOpacity={0.7}
        >
          <View style={[styles.settingIconBg, { backgroundColor: "#DCFCE7" }]}>
            <Feather name="volume-2" size={22} color="#16A34A" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>{t("voice_test_btn")}</Text>
            <Text style={styles.settingValue}>{t("voice_test_sub")}</Text>
          </View>
          <Feather name="play-circle" size={22} color="#16A34A" />
        </TouchableOpacity>

        {/* ── Section: Hardware & Server ────────────────────────────── */}
        <Text style={styles.sectionHeader}>{t("hardware_section")}</Text>

        {/* OpenCV Server Config */}
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setShowServerModal(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.settingIconBg, { backgroundColor: "#FAF5FF" }]}>
            <Feather name="server" size={22} color="#9333EA" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>{t("server_config_title")}</Text>
            <Text style={styles.settingValue}>
              {serverIp ? `${serverIp}:${serverPort}` : t("server_config_sub")}
            </Text>
          </View>
          <Feather name="settings" size={20} color="#94A3B8" />
        </TouchableOpacity>

        {/* Caregiver & ASHA Support Info */}
        <View style={styles.settingItem}>
          <View style={[styles.settingIconBg, { backgroundColor: "#FEF3C7" }]}>
            <Feather name="heart" size={22} color="#D97706" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>{t("caregiver_link_title")}</Text>
            <Text style={styles.settingValue}>{t("asha_linked_desc")}</Text>
          </View>
        </View>

        {/* ── Logout Button ─────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Feather name="log-out" size={20} color="#DC2626" />
          <Text style={styles.logoutButtonText}>{t("logout_btn")}</Text>
        </TouchableOpacity>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Language Selection Modal ─────────────────────────────────── */}
      <Modal
        visible={showLangModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLangModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLangModal(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("select_language")}</Text>
              <TouchableOpacity onPress={() => setShowLangModal(false)}>
                <Feather name="x" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <View style={styles.langList}>
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = currentLang === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.langCard, isSelected && styles.langCardActive]}
                    onPress={async () => {
                      await changeLanguage(lang.code);
                      setShowLangModal(false);
                      VoiceAssistant.speak(`Language set to ${lang.name}`, lang.code);
                    }}
                  >
                    <Text style={styles.langEmoji}>{lang.flagEmoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.langNative}>{lang.nativeName}</Text>
                      <Text style={styles.langRegion}>{lang.name} • {lang.region}</Text>
                    </View>
                    {isSelected && <Feather name="check-circle" size={22} color="#2563EB" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Server Modal ────────────────────────────────────────────── */}
      <Modal
        visible={showServerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowServerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("server_config_title")}</Text>
              <TouchableOpacity onPress={() => setShowServerModal(false)}>
                <Feather name="x" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>{t("server_ip_label")}</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 192.168.29.140"
              value={serverIp}
              onChangeText={setServerIp}
            />

            <Text style={styles.inputLabel}>{t("server_port_label")}</Text>
            <TextInput
              style={styles.input}
              placeholder="8000"
              value={serverPort}
              onChangeText={setServerPort}
              keyboardType="numeric"
            />

            <View style={styles.pingRow}>
              <TouchableOpacity
                style={[styles.pingBtn, serverPinging && { opacity: 0.6 }]}
                onPress={handlePingServer}
                disabled={serverPinging}
              >
                <Text style={styles.pingBtnText}>
                  {serverPinging ? t("pinging_server") : t("test_connection")}
                </Text>
              </TouchableOpacity>

              {serverPingResult === "ok" && (
                <View style={styles.pingResultOk}>
                  <Feather name="check-circle" size={16} color="#16A34A" />
                  <Text style={styles.pingResultOkText}>{t("server_connected")}</Text>
                </View>
              )}
              {serverPingResult === "fail" && (
                <View style={styles.pingResultFail}>
                  <Feather name="x-circle" size={16} color="#DC2626" />
                  <Text style={styles.pingResultFailText}>{t("server_unreachable")}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveServer}>
              <Text style={styles.saveBtnText}>{t("save_config_btn")}</Text>
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
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    padding: Spacing.md,
  },
  header: {
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Shadows.sm,
  },
  avatarBg: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  avatarEmoji: {
    fontSize: 28,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  profileRole: {
    fontSize: 13,
    color: "#2563EB",
    fontWeight: "600",
    marginTop: 2,
  },
  profileRegion: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "800",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  settingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Shadows.sm,
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
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  textSizePillActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  textSizePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  textSizePillTextActive: {
    color: "#1E40AF",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Shadows.sm,
  },
  settingIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  settingSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  settingValue: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: BorderRadius.xl,
    paddingVertical: 15,
    marginTop: Spacing.lg,
    gap: 8,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#DC2626",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    width: "100%",
    maxWidth: 400,
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  langList: {
    gap: 8,
  },
  langCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  langCardActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  langEmoji: {
    fontSize: 24,
  },
  langNative: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  langRegion: {
    fontSize: 12,
    color: "#64748B",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
  },
  pingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  pingBtn: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
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
    backgroundColor: "#2563EB",
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
