import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Linking,
  Alert,
  Share,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { useAuth } from "@/hooks/useAuth";
import { patientService } from "@/services/api/patientService";
import { Colors, Shadows } from "@/constants/theme";

function showAlert(title: string, message?: string) {
  if (Platform.OS === "web") {
    window.alert(title + (message ? "\n\n" + message : ""));
  } else {
    Alert.alert(title, message || "");
  }
}

interface ProfileData {
  id: string;
  fullName: string;
  username: string;
  email: string;
  uuid?: string;
  specialization?: string;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { logout, username } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoading(true);
      try {
        const profileResponse = await patientService.getProfile();
        if (profileResponse.success) {
          setProfileData(profileResponse.profile);
        } else {
          showAlert("Error", profileResponse.message || "Failed to fetch profile data");
        }
      } catch (error) {
        showAlert("Error", "Failed to load profile data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfileData();
  }, []);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            setIsLoggingOut(true);
            await logout();
          } catch (error) {
            setIsLoggingOut(false);
            showAlert("Logout Failed", "There was a problem logging out.");
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert("Delete Account", "This action cannot be undone. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setIsLoggingOut(true);
            await patientService.deleteDocAccount();
            await logout();
          } catch (error) {
            setIsLoggingOut(false);
            showAlert("Error", "Failed to delete account.");
          }
        },
      },
    ]);
  };

  const shareDocCode = () => {
    const docCode = profileData?.uuid || "";
    Share.share({
      message: `Connect with me on AmbiEye using my doctor code: ${docCode}`,
      title: "Share Doctor Code",
    }).catch(console.error);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const docCode = profileData?.uuid || "";
  const initials = (profileData?.fullName?.charAt(0) || username?.toString().charAt(0) || "D").toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
          <Text style={styles.profileName}>{profileData?.fullName || username}</Text>
          <View style={styles.rolePill}>
            <Feather name="activity" size={12} color={Colors.primary} />
            <Text style={styles.roleText}>Doctor</Text>
          </View>
          <Text style={styles.profileEmail}>{profileData?.email || ""}</Text>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push("/profile/edit")}
          >
            <Feather name="edit-2" size={14} color={Colors.primary} />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Doctor Code */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MY DOCTOR CODE</Text>
          <View style={styles.card}>
            <View style={styles.codeRow}>
              <View style={styles.codeIconBg}>
                <Feather name="hash" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.codeLabel}>Share with patients to connect</Text>
                <Text style={styles.codeValue}>{docCode || "Not available"}</Text>
              </View>
              <TouchableOpacity style={styles.shareBtn} onPress={shareDocCode}>
                <Feather name="share-2" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <View style={styles.card}>
            {[
              { icon: "help-circle", label: "Help & Support", onPress: () => setShowHelpModal(true) },
              { icon: "info", label: "About AmbiEye", onPress: () => setShowAboutModal(true) },
              { icon: "book", label: "Privacy Policy", onPress: () => router.push("/(doctor)/(stack)/privacy") },
            ].map((item, i, arr) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.settingRow, i < arr.length - 1 && styles.settingRowBorder]}
                onPress={item.onPress}
              >
                <View style={styles.settingIconBg}>
                  <Feather name={item.icon as any} size={18} color={Colors.primary} />
                </View>
                <Text style={styles.settingLabel}>{item.label}</Text>
                <Feather name="chevron-right" size={16} color={Colors.textLight} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={isLoggingOut}>
          {isLoggingOut ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="log-out" size={18} color="#fff" />
              <Text style={styles.logoutText}>Logout</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={isLoggingOut}>
          <Feather name="trash-2" size={16} color={Colors.error} />
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>

        <Text style={styles.version}>AmbiEye v1.0.0</Text>

        {/* Help Modal */}
        <Modal visible={showHelpModal} transparent animationType="fade" onRequestClose={() => setShowHelpModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Help & Support</Text>
                <TouchableOpacity onPress={() => setShowHelpModal(false)} style={styles.modalCloseBtn}>
                  <Feather name="x" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                <TouchableOpacity style={styles.helpItem} onPress={() => Linking.openURL("mailto:support@ambieye.com")}>
                  <Feather name="mail" size={18} color={Colors.primary} />
                  <Text style={styles.helpItemText}>support@ambieye.com</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.helpItem} onPress={() => Linking.openURL("tel:+15551234567")}>
                  <Feather name="phone" size={18} color={Colors.primary} />
                  <Text style={styles.helpItemText}>+1 (555) 123-4567</Text>
                </TouchableOpacity>
                <View style={styles.faqItem}>
                  <Text style={styles.faqQ}>How do I use my doctor code?</Text>
                  <Text style={styles.faqA}>Share your doctor code with patients who want to connect with you on AmbiEye.</Text>
                </View>
                <View style={styles.faqItem}>
                  <Text style={styles.faqQ}>How do I respond to patient queries?</Text>
                  <Text style={styles.faqA}>Navigate to the "Queries" tab to view and respond to patient messages.</Text>
                </View>
              </ScrollView>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={() => setShowHelpModal(false)}>
                <Text style={styles.modalSubmitText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* About Modal */}
        <Modal visible={showAboutModal} transparent animationType="fade" onRequestClose={() => setShowAboutModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>About AmbiEye</Text>
                <TouchableOpacity onPress={() => setShowAboutModal(false)} style={styles.modalCloseBtn}>
                  <Feather name="x" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.aboutDesc}>
                AmbiEye is a comprehensive digital health platform designed for treating amblyopia (lazy eye) through interactive games and exercises, while keeping doctors connected with their patients.
              </Text>
              <View style={styles.featureList}>
                {["Interactive vision therapy games", "Direct communication with patients", "Progress tracking and reports"].map((f) => (
                  <View key={f} style={styles.featureItem}>
                    <Feather name="check-circle" size={16} color={Colors.accent} />
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.aboutVersion}>Version 1.0.0</Text>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={() => setShowAboutModal(false)}>
                <Text style={styles.modalSubmitText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0F172A" },
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background },

  profileHeader: {
    backgroundColor: "#0F172A",
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 30, fontWeight: "800" },
  profileName: { fontSize: 22, fontWeight: "800", color: "#fff", marginBottom: 8 },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: `${Colors.primary}20`,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
    marginBottom: 6,
  },
  roleText: { fontSize: 12, fontWeight: "700", color: Colors.primary },
  profileEmail: { fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 16 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${Colors.primary}20`,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
  },
  editBtnText: { fontSize: 13, fontWeight: "600", color: Colors.primary },

  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 10,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    ...Shadows.sm,
  },

  codeRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  codeIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: "center",
    alignItems: "center",
  },
  codeLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  codeValue: { fontSize: 16, fontWeight: "700", color: Colors.text, letterSpacing: 1 },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: "center",
    alignItems: "center",
  },

  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
  },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  settingIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: "center",
    alignItems: "center",
  },
  settingLabel: { flex: 1, fontSize: 15, color: Colors.text, fontWeight: "500" },

  logoutBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 16,
    margin: 16,
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoutText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: `${Colors.error}40`,
    backgroundColor: '#FEF2F2',
  },
  deleteText: { color: Colors.error, fontSize: 14, fontWeight: "600" },
  version: { textAlign: "center", fontSize: 12, color: Colors.textLight, marginTop: 20, marginBottom: 8 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalBox: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    ...Shadows.lg,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  modalSubmitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  modalSubmitText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  helpItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: Colors.background,
    borderRadius: 12,
    marginBottom: 10,
  },
  helpItemText: { fontSize: 14, color: Colors.text },
  faqItem: { backgroundColor: Colors.background, borderRadius: 12, padding: 14, marginBottom: 10 },
  faqQ: { fontSize: 14, fontWeight: "700", color: Colors.text, marginBottom: 6 },
  faqA: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  aboutDesc: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22, marginBottom: 16 },
  featureList: { marginBottom: 16 },
  featureItem: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  featureText: { fontSize: 14, color: Colors.text },
  aboutVersion: { fontSize: 13, color: Colors.textLight, textAlign: "center", marginBottom: 16 },
});
