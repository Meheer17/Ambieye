import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
} from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import Feather from "@expo/vector-icons/Feather";
import { Colors, BorderRadius, Shadows } from "@/constants/theme";
import { useTranslation } from "@/constants/i18n";
import { dementiaCareStorage } from "@/utils/dementiaCareStorage";

export default function LoginScreen() {
  const { login, userType, setSelectedUserType, isLoading, error, clearError } = useAuth();
  const { t } = useTranslation();
  const { selectedType, selectedMode } = useLocalSearchParams<{
    selectedType?: string;
    selectedMode?: string;
  }>();

  type RoleMode = "elderly" | "caregiver" | "asha" | "specialist";

  // Role metadata configurations
  const ROLE_CONFIGS: Record<
    RoleMode,
    {
      titleKey: string;
      username: string;
      password: string;
      type: "doctor" | "patient" | "caregiver";
      color: string;
      icon: string;
      emoji: string;
      tag: string;
    }
  > = {
    elderly: {
      titleKey: "role_elderly_title",
      username: "mahi",
      password: "password123",
      type: "patient",
      color: Colors.secondary,
      icon: "smile",
      emoji: "🧓",
      tag: "Senior Kiosk",
    },
    caregiver: {
      titleKey: "role_caregiver_title",
      username: "caregiver",
      password: "password123",
      type: "caregiver",
      color: "#EC4899",
      icon: "heart",
      emoji: "👨‍👩‍👧",
      tag: "Family Guardian",
    },
    asha: {
      titleKey: "role_asha_title",
      username: "asha_worker",
      password: "password123",
      type: "doctor",
      color: "#10B981",
      icon: "users",
      emoji: "🩺",
      tag: "Community ASHA",
    },
    specialist: {
      titleKey: "role_specialist_title",
      username: "mahit",
      password: "password123",
      type: "doctor",
      color: Colors.primary,
      icon: "activity",
      emoji: "👨‍⚕️",
      tag: "Neurologist",
    },
  };

  const initialMode: RoleMode =
    selectedMode && (selectedMode as RoleMode) in ROLE_CONFIGS
      ? (selectedMode as RoleMode)
      : selectedType === "doctor" || userType === "doctor"
      ? "specialist"
      : "elderly";

  const [activeRoleMode, setActiveRoleMode] = useState<RoleMode>(initialMode);
  const [username, setUsername] = useState(ROLE_CONFIGS[initialMode].username);
  const [password, setPassword] = useState(ROLE_CONFIGS[initialMode].password);
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState("");

  // Select a role mode and populate its credentials
  const selectRole = (mode: RoleMode) => {
    setActiveRoleMode(mode);
    const config = ROLE_CONFIGS[mode];
    setUsername(config.username);
    setPassword(config.password);
    setSelectedUserType(config.type);
  };

  // Sync state when incoming route params change
  useEffect(() => {
    if (selectedMode && (selectedMode as RoleMode) in ROLE_CONFIGS) {
      selectRole(selectedMode as RoleMode);
    } else if (selectedType === "caregiver") {
      selectRole("caregiver");
    } else if (selectedType === "patient") {
      selectRole("elderly");
    } else if (selectedType === "doctor") {
      selectRole("specialist");
    }
  }, [selectedMode, selectedType]);

  const currentRole = ROLE_CONFIGS[activeRoleMode];
  const accentColor = currentRole.color;

  useEffect(() => {
    if (error) {
      Alert.alert("Login Failed", error, [{ text: "OK", onPress: clearError }]);
    }
  }, [error, clearError]);

  const handleLogin = async () => {
    if (!username || !password) {
      setValidationError("Please fill in all fields");
      return;
    }
    setValidationError("");

    const cleanUser = username.trim().toLowerCase();
    const isCaregiver =
      activeRoleMode === "caregiver" ||
      currentRole.type === "caregiver" ||
      cleanUser === "caregiver" ||
      cleanUser.includes("care");

    const isDoctor =
      activeRoleMode === "specialist" ||
      activeRoleMode === "asha" ||
      currentRole.type === "doctor" ||
      cleanUser.includes("doc") ||
      cleanUser.includes("asha") ||
      cleanUser.includes("mahit");

    // Set view mode for patient/caregiver
    if (isCaregiver || currentRole.type === "patient") {
      await dementiaCareStorage.setActiveViewMode(
        isCaregiver ? "caregiver" : "elderly"
      );
    }

    if (isCaregiver) {
      await setSelectedUserType("caregiver");
    } else if (isDoctor) {
      await setSelectedUserType("doctor");
    } else {
      await setSelectedUserType("patient");
    }

    const success = await login(username, password);
    if (success) {
      if (isCaregiver) {
        router.replace("/(caregiver)" as any);
      } else if (isDoctor) {
        router.replace("/(doctor)" as any);
      } else {
        router.replace("/(patient)" as any);
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Background decorations */}
      <View style={[styles.bgCircle1, { backgroundColor: accentColor }]} />
      <View style={styles.bgCircle2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/user-type")}
          >
            <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.headerSection}>
            <View style={[styles.logoContainer, { borderColor: `${accentColor}40` }]}>
              <Image
                source={require("../../assets/images/logo.png")}
                style={styles.logo}
              />
            </View>

            {/* 4-Role Quick Switcher Pills */}
            <View style={styles.rolePickerContainer}>
              {(Object.keys(ROLE_CONFIGS) as RoleMode[]).map((mode) => {
                const cfg = ROLE_CONFIGS[mode];
                const isSelected = activeRoleMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.roleChip,
                      isSelected && {
                        backgroundColor: `${cfg.color}25`,
                        borderColor: cfg.color,
                      },
                    ]}
                    onPress={() => selectRole(mode)}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 13 }}>{cfg.emoji}</Text>
                    <Text
                      style={[
                        styles.roleChipText,
                        isSelected && { color: cfg.color, fontWeight: "800" },
                      ]}
                    >
                      {cfg.tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Dynamic Active Role Badge */}
            <View
              style={[
                styles.roleBadge,
                {
                  backgroundColor: `${accentColor}20`,
                  borderColor: `${accentColor}50`,
                },
              ]}
            >
              <Text style={{ fontSize: 14 }}>{currentRole.emoji}</Text>
              <Text style={[styles.roleBadgeText, { color: accentColor }]}>
                {t(currentRole.titleKey)}
              </Text>
            </View>

            <Text style={styles.welcomeText}>{t("login_welcome_back")}</Text>
            <Text style={styles.title}>{t("login_sign_in_continue")}</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {validationError ? (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={15} color={Colors.error} />
                <Text style={styles.errorText}>{validationError}</Text>
              </View>
            ) : null}

            {/* Credential prefill hint */}
            <View
              style={[
                styles.prefillHint,
                { backgroundColor: `${accentColor}12`, borderColor: `${accentColor}30` },
              ]}
            >
              <Feather name="info" size={13} color={accentColor} />
              <Text style={[styles.prefillHintText, { color: accentColor }]}>
                Pre-filled with demo credentials for {currentRole.tag}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t("username_label")}</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.inputIconBg}>
                  <Feather name="user" size={16} color={Colors.textSecondary} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={t("username_label")}
                  placeholderTextColor={Colors.textLight}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t("password_label")}</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.inputIconBg}>
                  <Feather name="lock" size={16} color={Colors.textSecondary} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={t("password_label")}
                  placeholderTextColor={Colors.textLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={18}
                    color={Colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.loginButton,
                { backgroundColor: accentColor },
                isLoading && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>{t("login_button")}</Text>
                  <Feather name="arrow-right" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>{t("no_account")}</Text>
              <Link
                href={{
                  pathname: "/auth/signup",
                  params: {
                    selectedType: currentRole.type,
                    selectedMode: activeRoleMode,
                  },
                }}
                asChild
              >
                <TouchableOpacity>
                  <Text style={[styles.signupLink, { color: accentColor }]}>
                    {t("signup_link")}
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  bgCircle1: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.15,
  },
  bgCircle2: {
    position: "absolute",
    bottom: -120,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#3B82F6",
    opacity: 0.08,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    position: "absolute",
    top: 16,
    left: 24,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    ...Shadows.md,
  },
  logo: {
    width: 44,
    height: 44,
    resizeMode: "contain",
  },
  rolePickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
    width: "100%",
  },
  roleChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 5,
  },
  roleChipText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    gap: 6,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  prefillHint: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  prefillHintText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  formCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 24,
    ...Shadows.lg,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.15)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    borderRadius: BorderRadius.md,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 13,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 14,
    height: 52,
  },
  inputIconBg: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#FFFFFF",
    height: "100%",
  },
  passwordToggle: {
    padding: 6,
  },
  loginButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 54,
    borderRadius: BorderRadius.lg,
    marginTop: 8,
    gap: 8,
    ...Shadows.md,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  dividerText: {
    color: "#64748B",
    fontSize: 12,
    marginHorizontal: 12,
    textTransform: "uppercase",
  },
  signupContainer: {
    alignItems: "center",
    gap: 6,
  },
  signupText: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
  },
  signupLink: {
    fontSize: 14,
    fontWeight: "700",
  },
});
