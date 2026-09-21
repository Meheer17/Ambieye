import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  StatusBar,
  Dimensions,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import Feather from "@expo/vector-icons/Feather";
import { useTranslation, SupportedLanguage } from "@/constants/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/theme";

import { dementiaCareStorage } from "@/utils/dementiaCareStorage";

const { width } = Dimensions.get("window");

export default function UserTypeScreen() {
  const { setSelectedUserType, logout, login } = useAuth();
  const { t, currentLang, changeLanguage, supportedLanguages } = useTranslation();
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [switchingRole, setSwitchingRole] = useState<string | null>(null);

  const handleUserTypeSelection = async (
    type: "doctor" | "patient" | "caregiver",
    mode: "elderly" | "caregiver" | "asha" | "specialist" = type === "doctor" ? "specialist" : type === "caregiver" ? "caregiver" : "elderly"
  ) => {
    try {
      setSwitchingRole(mode);
      // 1. Fully log out existing session from AuthContext so AuthGate doesn't hijack routing
      try {
        await logout();
      } catch {}

      // 2. Set new user type and mode
      await setSelectedUserType(type);
      await AsyncStorage.setItem("ambieye_active_mode", mode);
      await dementiaCareStorage.setActiveViewMode(mode === "caregiver" ? "caregiver" : "elderly");

      // 3. 1-Tap Instant Entry with demo credentials
      const demoUsernames: Record<string, string> = {
        elderly: "mahi",
        caregiver: "caregiver",
        asha: "asha_worker",
        specialist: "mahit",
      };
      const demoUsername = demoUsernames[mode];
      if (demoUsername) {
        const success = await login(demoUsername, "password123");
        if (success) {
          if (type === "doctor") {
            router.replace("/(doctor)/" as any);
          } else if (type === "caregiver") {
            router.replace("/(caregiver)/" as any);
          } else {
            router.replace("/(patient)/" as any);
          }
          return;
        }
      }

      // Fallback: navigate to login screen with selected role pre-filled
      router.push({
        pathname: "/auth/login",
        params: { selectedType: type, selectedMode: mode },
      });
    } catch (e) {
      console.error("Role selection error:", e);
      router.push({
        pathname: "/auth/login",
        params: { selectedType: type, selectedMode: mode },
      });
    } finally {
      setSwitchingRole(null);
    }
  };

  const currentLangObj = supportedLanguages.find((l) => l.code === currentLang) || supportedLanguages[0];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Background decorations */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Image
              source={require("@/assets/images/mindcare_logo_circle.png")}
              style={styles.logo}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.appName}>{t("app_name")}</Text>
            <Text style={styles.tagline}>{t("app_tagline")}</Text>
          </View>
          <TouchableOpacity
            style={styles.langPill}
            onPress={() => setLangModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.langPillEmoji}>{currentLangObj.flagEmoji}</Text>
            <Text style={styles.langPillText}>{currentLangObj.nativeName}</Text>
            <Feather name="chevron-down" size={14} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t("choose_role_title")}</Text>
        <Text style={styles.subtitle}>
          {t("choose_role_sub")}
        </Text>

        {/* 1. Elderly Patient Card */}
        <TouchableOpacity
          style={[styles.card, styles.patientCard]}
          onPress={() => handleUserTypeSelection("patient", "elderly")}
          activeOpacity={0.9}
        >
          <View style={styles.cardInner}>
            <View style={[styles.cardIconBg, { backgroundColor: "rgba(139, 92, 246, 0.15)" }]}>
              <Feather name="smile" size={32} color={Colors.secondary} />
            </View>
            <View style={styles.cardTextContent}>
              <Text style={styles.cardTitle}>{t("role_elderly_title")}</Text>
              <Text style={styles.cardDesc}>
                {t("role_elderly_desc")}
              </Text>
              <View style={styles.cardFeatures}>
                <View style={[styles.featureTag, { backgroundColor: "rgba(139, 92, 246, 0.1)" }]}>
                  <Feather name="play-circle" size={11} color={Colors.secondary} />
                  <Text style={[styles.featureText, { color: Colors.secondary }]}>{t("twelve_games")}</Text>
                </View>
                <View style={[styles.featureTag, { backgroundColor: "rgba(139, 92, 246, 0.1)" }]}>
                  <Feather name="volume-2" size={11} color={Colors.secondary} />
                  <Text style={[styles.featureText, { color: Colors.secondary }]}>{t("voice_assistant_listen")}</Text>
                </View>
              </View>
            </View>
            <View style={[styles.cardArrow, { backgroundColor: "rgba(139, 92, 246, 0.15)" }]}>
              <Feather name="arrow-right" size={18} color={Colors.secondary} />
            </View>
          </View>
        </TouchableOpacity>

        {/* 2. Family Caregiver Card */}
        <TouchableOpacity
          style={[styles.card, { borderColor: "#EC4899", backgroundColor: "#0F172A" }]}
          onPress={() => handleUserTypeSelection("caregiver", "caregiver")}
          activeOpacity={0.9}
        >
          <View style={styles.cardInner}>
            <View style={[styles.cardIconBg, { backgroundColor: "rgba(236, 72, 153, 0.15)" }]}>
              <Feather name="heart" size={32} color="#EC4899" />
            </View>
            <View style={styles.cardTextContent}>
              <Text style={styles.cardTitle}>{t("role_caregiver_title")}</Text>
              <Text style={styles.cardDesc}>
                {t("role_caregiver_desc")}
              </Text>
              <View style={styles.cardFeatures}>
                <View style={[styles.featureTag, { backgroundColor: "rgba(236, 72, 153, 0.1)" }]}>
                  <Feather name="calendar" size={11} color="#EC4899" />
                  <Text style={[styles.featureText, { color: "#EC4899" }]}>{t("daily_behavior_log")}</Text>
                </View>
                <View style={[styles.featureTag, { backgroundColor: "rgba(236, 72, 153, 0.1)" }]}>
                  <Feather name="message-circle" size={11} color="#EC4899" />
                  <Text style={[styles.featureText, { color: "#EC4899" }]}>{t("tab_caregiver")}</Text>
                </View>
              </View>
            </View>
            <View style={[styles.cardArrow, { backgroundColor: "rgba(236, 72, 153, 0.15)" }]}>
              <Feather name="arrow-right" size={18} color="#EC4899" />
            </View>
          </View>
        </TouchableOpacity>

        {/* 3. ASHA / Health Worker Card */}
        <TouchableOpacity
          style={[styles.card, { borderColor: "#10B981", backgroundColor: "#0F172A" }]}
          onPress={() => handleUserTypeSelection("doctor", "asha")}
          activeOpacity={0.9}
        >
          <View style={styles.cardInner}>
            <View style={[styles.cardIconBg, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
              <Feather name="users" size={32} color="#10B981" />
            </View>
            <View style={styles.cardTextContent}>
              <Text style={styles.cardTitle}>{t("role_asha_title")}</Text>
              <Text style={styles.cardDesc}>
                {t("role_asha_desc")}
              </Text>
              <View style={styles.cardFeatures}>
                <View style={[styles.featureTag, { backgroundColor: "rgba(16, 185, 129, 0.1)" }]}>
                  <Feather name="check-circle" size={11} color="#10B981" />
                  <Text style={[styles.featureText, { color: "#10B981" }]}>NER MMSE (30 pts)</Text>
                </View>
                <View style={[styles.featureTag, { backgroundColor: "rgba(16, 185, 129, 0.1)" }]}>
                  <Feather name="map-pin" size={11} color="#10B981" />
                  <Text style={[styles.featureText, { color: "#10B981" }]}>Village Cohort</Text>
                </View>
              </View>
            </View>
            <View style={[styles.cardArrow, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
              <Feather name="arrow-right" size={18} color="#10B981" />
            </View>
          </View>
        </TouchableOpacity>

        {/* 4. Doctor / Specialist Card */}
        <TouchableOpacity
          style={[styles.card, styles.doctorCard]}
          onPress={() => handleUserTypeSelection("doctor", "specialist")}
          activeOpacity={0.9}
        >
          <View style={styles.cardInner}>
            <View style={[styles.cardIconBg, { backgroundColor: "rgba(14, 165, 233, 0.15)" }]}>
              <Feather name="activity" size={32} color={Colors.primary} />
            </View>
            <View style={styles.cardTextContent}>
              <Text style={styles.cardTitle}>{t("role_specialist_title")}</Text>
              <Text style={styles.cardDesc}>
                {t("role_specialist_desc")}
              </Text>
              <View style={styles.cardFeatures}>
                <View style={styles.featureTag}>
                  <Feather name="eye" size={11} color={Colors.primary} />
                  <Text style={[styles.featureText, { color: Colors.primary }]}>Eye Biomarkers</Text>
                </View>
                <View style={styles.featureTag}>
                  <Feather name="file-text" size={11} color={Colors.primary} />
                  <Text style={[styles.featureText, { color: Colors.primary }]}>{t("prescription_label")}</Text>
                </View>
              </View>
            </View>
            <View style={[styles.cardArrow, { backgroundColor: "rgba(14, 165, 233, 0.15)" }]}>
              <Feather name="arrow-right" size={18} color={Colors.primary} />
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {t("platform_footer")}
        </Text>
      </View>

      {/* Language Modal */}
      <Modal visible={langModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("select_language")}</Text>
              <TouchableOpacity onPress={() => setLangModalVisible(false)} style={styles.closeBtn}>
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              {supportedLanguages.map((lang) => {
                const isSelected = currentLang === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.langOption, isSelected && styles.langOptionSelected]}
                    onPress={async () => {
                      await changeLanguage(lang.code as SupportedLanguage);
                      setLangModalVisible(false);
                    }}
                  >
                    <Text style={styles.langOptionFlag}>{lang.flagEmoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.langOptionNative, isSelected && styles.langOptionNativeSelected]}>
                        {lang.nativeName}
                      </Text>
                      <Text style={styles.langOptionRegion}>{lang.name} • {lang.region}</Text>
                    </View>
                    {isSelected && <Feather name="check" size={20} color="#2563EB" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  bgCircle1: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: Colors.primary,
    opacity: 0.07,
    top: -80,
    right: -80,
  },
  bgCircle2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: Colors.secondary,
    opacity: 0.07,
    bottom: 100,
    left: -60,
  },
  header: {
    paddingTop: 70,
    paddingHorizontal: 28,
    paddingBottom: 24,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  logoBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.45)',
    overflow: 'hidden',
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    resizeMode: "cover",
  },
  appName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 22,
    marginBottom: 32,
  },
  card: {
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  doctorCard: {
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    borderColor: 'rgba(14, 165, 233, 0.2)',
  },
  patientCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  cardIconBg: {
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  cardTextContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 19,
    marginBottom: 12,
  },
  cardFeatures: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  featureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  featureText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  footer: {
    paddingBottom: 44,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.3,
    textAlign: "center",
    lineHeight: 18,
  },
  langPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  langPillEmoji: {
    fontSize: 14,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "75%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  closeBtn: {
    padding: 6,
  },
  langOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  langOptionSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  langOptionFlag: {
    fontSize: 24,
  },
  langOptionNative: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  langOptionNativeSelected: {
    color: "#2563EB",
  },
  langOptionRegion: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
});
