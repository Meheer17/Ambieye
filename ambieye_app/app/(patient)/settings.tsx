import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
  StatusBar,
} from "react-native";
import { getServerConfig, saveServerConfig, buildServerUrl, DEFAULT_PORT } from "@/utils/eyeTrackingStorage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "@/hooks/useAuth";
import { patientService } from "@/services/api/patientService";
import { Colors, Shadows } from "@/constants/theme";

function showAlert(title: string, message?: string) {
  if (Platform.OS === "web") {
    window.alert(title + (message ? "\n\n" + message : ""));
  } else {
    Alert.alert(title, message);
  }
}

export type MedicalInfo = {
  visionwithpg?: string;
  chiefcomplaint?: string;
  presentingillness?: string;
  pastHistory?: string;
  personalHistory?: string;
  familyHistory?: string;
  drugHistory?: string;
  allergyHistory?: string;
  bp?: string;
  pr?: string;
  temp?: string;
  respirationrate?: string;
  notes?: string;
};

interface ProfileData {
  id: string;
  fullName: string;
  username: string;
  email: string;
  doctor_id?: string;
  medicalInfo?: MedicalInfo;
}

interface DoctorData {
  id: string;
  fullName: string;
  email: string;
  specialization?: string;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { logout, username } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [doctorData, setDoctorData] = useState<DoctorData | null>(null);
  const [isDoctorLoading, setIsDoctorLoading] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [doctorId, setDoctorId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Eye tracking server config
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverIp, setServerIp] = useState("");
  const [serverPort, setServerPort] = useState(DEFAULT_PORT);
  const [serverPinging, setServerPinging] = useState(false);
  const [serverPingResult, setServerPingResult] = useState<"ok" | "fail" | null>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoading(true);
      try {
        const profileResponse = await patientService.getProfile();
        if (profileResponse.success) {
          setProfileData(profileResponse.profile);
          if (profileResponse.profile.doctor_id) {
            fetchDoctorData(profileResponse.profile.doctor_id);
          } else {
            setShowDoctorModal(true);
          }
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

    // Load saved server config
    getServerConfig().then(({ ip, port }) => {
      setServerIp(ip);
      setServerPort(port);
    });
  }, []);

  const fetchDoctorData = async (docId: string) => {
    setIsDoctorLoading(true);
    try {
      const response = await patientService.getDoctorDetails(docId);
      if (response.success) setDoctorData(response.doctor);
    } catch (error) {
      console.error("Error fetching doctor details:", error);
    } finally {
      setIsDoctorLoading(false);
    }
  };

  const handleSaveServerConfig = async () => {
    await saveServerConfig(serverIp, serverPort);
    showAlert("Saved", "Eye tracking server address saved.");
    setShowServerModal(false);
    setServerPingResult(null);
  };

  const handlePingServer = async () => {
    const url = buildServerUrl(serverIp, serverPort);
    if (!url) { showAlert("Error", "Enter a server IP first."); return; }
    setServerPinging(true);
    setServerPingResult(null);
    try {
      const res = await fetch(`${url}/health`, { method: "GET" });
      setServerPingResult(res.ok ? "ok" : "fail");
    } catch {
      setServerPingResult("fail");
    } finally {
      setServerPinging(false);
    }
  };

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
            await patientService.deleteAccount();
            await logout();
          } catch (error) {
            setIsLoggingOut(false);
            showAlert("Error", "Failed to delete account. Please try again.");
          }
        },
      },
    ]);
  };

  const handleUpdateDoctorId = async () => {
    if (!doctorId.trim()) { showAlert("Error", "Please enter a Doctor ID"); return; }
    setIsSubmitting(true);
    try {
      const response = await patientService.updateDoctorId(doctorId);
      if (response.success) {
        showAlert("Success", "Doctor ID updated successfully");
        setShowDoctorModal(false);
        if (profileData) setProfileData({ ...profileData, doctor_id: doctorId });
        fetchDoctorData(doctorId);
      } else {
        showAlert("Error", response.message || "Failed to update Doctor ID");
      }
    } catch (error) {
      showAlert("Error", "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveDoctorId = async () => {
    Alert.alert("Remove Doctor", "Are you sure you want to remove your current doctor?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setIsSubmitting(true);
          try {
            const response = await patientService.updateDoctorId("");
            if (response.success) {
              showAlert("Success", "Doctor removed successfully");
              if (profileData) setProfileData({ ...profileData, doctor_id: undefined });
              setDoctorData(null);
            } else {
              showAlert("Error", response.message || "Failed to remove doctor");
            }
          } catch (error) {
            showAlert("Error", "An unexpected error occurred.");
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    ]);
  };

  const hasMedicalInfo = () =>
    profileData?.medicalInfo &&
    Object.keys(profileData.medicalInfo).some((key) => profileData.medicalInfo?.[key as keyof MedicalInfo]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const initials = (profileData?.fullName?.charAt(0) || username?.toString().charAt(0) || "P").toUpperCase();

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
            <Feather name="eye" size={12} color={Colors.secondary} />
            <Text style={styles.roleText}>Patient</Text>
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

        {/* My Doctor */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MY DOCTOR</Text>
          {profileData?.doctor_id ? (
            <View style={styles.card}>
              {isDoctorLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : doctorData ? (
                <>
                  <View style={styles.doctorRow}>
                    <View style={styles.doctorAvatar}>
                      <Text style={styles.doctorAvatarText}>
                        {doctorData.fullName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.doctorName}>Dr. {doctorData.fullName}</Text>
                      {doctorData.specialization && (
                        <Text style={styles.doctorSpecialty}>{doctorData.specialization}</Text>
                      )}
                      <Text style={styles.doctorEmail}>{doctorData.email}</Text>
                    </View>
                  </View>
                  <View style={styles.doctorActions}>
                    <TouchableOpacity
                      style={[styles.doctorActionBtn, { backgroundColor: '#EFF6FF' }]}
                      onPress={() => router.push("/queries")}
                    >
                      <Ionicons name="chatbubble-outline" size={16} color={Colors.primary} />
                      <Text style={[styles.doctorActionText, { color: Colors.primary }]}>Send Query</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.doctorActionBtn, { backgroundColor: '#FEF2F2' }]}
                      onPress={handleRemoveDoctorId}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color={Colors.error} />
                      ) : (
                        <>
                          <Feather name="user-x" size={16} color={Colors.error} />
                          <Text style={[styles.doctorActionText, { color: Colors.error }]}>Remove</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={styles.notFoundRow}>
                  <Feather name="alert-circle" size={20} color={Colors.warning} />
                  <Text style={styles.notFoundText}>Doctor not found</Text>
                  <TouchableOpacity onPress={() => setShowDoctorModal(true)}>
                    <Text style={styles.updateLink}>Update ID</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity style={styles.addDoctorCard} onPress={() => setShowDoctorModal(true)}>
              <View style={styles.addDoctorIcon}>
                <Feather name="user-plus" size={22} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.addDoctorTitle}>Connect with a Doctor</Text>
                <Text style={styles.addDoctorSubtitle}>Enter your doctor's AmbiEye ID</Text>
              </View>
              <Feather name="chevron-right" size={18} color={Colors.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* Medical Info */}
        {hasMedicalInfo() && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>MEDICAL INFORMATION</Text>
            <View style={styles.card}>
              {profileData?.medicalInfo?.chiefcomplaint && (
                <View style={styles.medRow}>
                  <Text style={styles.medLabel}>Chief Complaint</Text>
                  <Text style={styles.medValue}>{profileData.medicalInfo.chiefcomplaint}</Text>
                </View>
              )}
              {profileData?.medicalInfo?.presentingillness && (
                <View style={styles.medRow}>
                  <Text style={styles.medLabel}>Presenting Illness</Text>
                  <Text style={styles.medValue}>{profileData.medicalInfo.presentingillness}</Text>
                </View>
              )}
              {profileData?.medicalInfo?.bp && (
                <View style={styles.medRow}>
                  <Text style={styles.medLabel}>Blood Pressure</Text>
                  <Text style={styles.medValue}>{profileData.medicalInfo.bp}</Text>
                </View>
              )}
              {profileData?.medicalInfo?.notes && (
                <View style={styles.medRow}>
                  <Text style={styles.medLabel}>Notes</Text>
                  <Text style={styles.medValue}>{profileData.medicalInfo.notes}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Eye Tracking Server */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>EYE TRACKING SERVER</Text>
          <TouchableOpacity style={styles.addDoctorCard} onPress={() => setShowServerModal(true)}>
            <View style={[styles.addDoctorIcon, { backgroundColor: "#F0FDF4" }]}>
              <Feather name="wifi" size={22} color="#22c55e" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addDoctorTitle}>OpenCV Server</Text>
              <Text style={styles.addDoctorSubtitle}>
                {serverIp ? `${serverIp}:${serverPort}` : "Tap to configure server IP"}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <View style={styles.card}>
            {[
              { icon: "help-circle", label: "Help & Support", onPress: () => setShowHelpModal(true) },
              { icon: "info", label: "About AmbiEye", onPress: () => setShowAboutModal(true) },
              { icon: "book", label: "Privacy Policy", onPress: () => router.push("/(patient)/(stack)/privacy") },
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

        {/* Eye Tracking Server Modal */}
        <Modal visible={showServerModal} transparent animationType="fade" onRequestClose={() => setShowServerModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Eye Tracking Server</Text>
                <TouchableOpacity onPress={() => setShowServerModal(false)} style={styles.modalCloseBtn}>
                  <Feather name="x" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalDesc}>
                Enter the IP address of your laptop running the OpenCV FastAPI server.
                Make sure both devices are on the same Wi-Fi network.
              </Text>
              <Text style={[styles.sectionLabel, { marginBottom: 6 }]}>SERVER IP</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 192.168.1.42"
                placeholderTextColor={Colors.textLight}
                value={serverIp}
                onChangeText={setServerIp}
                keyboardType="decimal-pad"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={[styles.sectionLabel, { marginBottom: 6, marginTop: 4 }]}>PORT</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="8000"
                placeholderTextColor={Colors.textLight}
                value={serverPort}
                onChangeText={setServerPort}
                keyboardType="number-pad"
              />

              {/* Ping result */}
              {serverPingResult === "ok" && (
                <View style={[styles.pingBadge, { backgroundColor: "#DCFCE7" }]}>
                  <Feather name="check-circle" size={16} color="#16a34a" />
                  <Text style={[styles.pingText, { color: "#16a34a" }]}>Server reachable ✓</Text>
                </View>
              )}
              {serverPingResult === "fail" && (
                <View style={[styles.pingBadge, { backgroundColor: "#FEE2E2" }]}>
                  <Feather name="x-circle" size={16} color="#dc2626" />
                  <Text style={[styles.pingText, { color: "#dc2626" }]}>Cannot reach server. Check IP and that the server is running.</Text>
                </View>
              )}

              <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  style={[styles.modalSubmitBtn, { flex: 1, backgroundColor: "#F1F5F9" }]}
                  onPress={handlePingServer}
                  disabled={serverPinging}
                >
                  {serverPinging
                    ? <ActivityIndicator size="small" color={Colors.primary} />
                    : <Text style={[styles.modalSubmitText, { color: Colors.primary }]}>Test Connection</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSubmitBtn, { flex: 1 }]}
                  onPress={handleSaveServerConfig}
                >
                  <Text style={styles.modalSubmitText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Doctor ID Modal */}
        <Modal visible={showDoctorModal} transparent animationType="fade">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <View style={styles.modalBox}>
              <View style={styles.modalIconBg}>
                <Feather name="user-plus" size={28} color={Colors.primary} />
              </View>
              <Text style={styles.modalTitle}>
                {profileData?.doctor_id ? "Update Doctor ID" : "Add Your Doctor"}
              </Text>
              <Text style={styles.modalDesc}>
                Enter the ID provided by your doctor to connect with them on AmbiEye.
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter Doctor ID"
                placeholderTextColor={Colors.textLight}
                value={doctorId}
                onChangeText={setDoctorId}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
              />
              <TouchableOpacity
                style={[styles.modalSubmitBtn, (!doctorId.trim() || isSubmitting) && { opacity: 0.5 }]}
                onPress={handleUpdateDoctorId}
                disabled={!doctorId.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Connect</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

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
              <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                <TouchableOpacity style={styles.helpItem} onPress={() => Linking.openURL("mailto:support@ambieye.com")}>
                  <Feather name="mail" size={18} color={Colors.primary} />
                  <Text style={styles.helpItemText}>support@ambieye.com</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.helpItem} onPress={() => Linking.openURL("tel:+15551234567")}>
                  <Feather name="phone" size={18} color={Colors.primary} />
                  <Text style={styles.helpItemText}>+1 (555) 123-4567</Text>
                </TouchableOpacity>
                <View style={styles.faqItem}>
                  <Text style={styles.faqQ}>How do I connect with my doctor?</Text>
                  <Text style={styles.faqA}>Ask your doctor for their AmbiEye ID, then enter it in the "My Doctor" section.</Text>
                </View>
                <View style={styles.faqItem}>
                  <Text style={styles.faqQ}>How often should I use the eye exercises?</Text>
                  <Text style={styles.faqA}>We recommend daily practice. Your doctor may provide specific recommendations.</Text>
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
                AmbiEye is a vision therapy platform designed to help treat amblyopia (lazy eye) through interactive games and exercises.
              </Text>
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
    backgroundColor: `${Colors.secondary}20`,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${Colors.secondary}40`,
    marginBottom: 6,
  },
  roleText: { fontSize: 12, fontWeight: "700", color: Colors.secondary },
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

  doctorRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  doctorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  doctorAvatarText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  doctorName: { fontSize: 15, fontWeight: "700", color: Colors.text, marginBottom: 2 },
  doctorSpecialty: { fontSize: 12, color: Colors.primary, fontWeight: "600", marginBottom: 2 },
  doctorEmail: { fontSize: 12, color: Colors.textSecondary },
  doctorActions: { flexDirection: "row", gap: 10 },
  doctorActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  doctorActionText: { fontSize: 13, fontWeight: "600" },

  notFoundRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  notFoundText: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  updateLink: { fontSize: 13, color: Colors.primary, fontWeight: "700" },

  addDoctorCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    ...Shadows.sm,
  },
  addDoctorIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: "center",
    alignItems: "center",
  },
  addDoctorTitle: { fontSize: 15, fontWeight: "700", color: Colors.text, marginBottom: 2 },
  addDoctorSubtitle: { fontSize: 12, color: Colors.textSecondary },

  medRow: { marginBottom: 12 },
  medLabel: { fontSize: 11, fontWeight: "700", color: Colors.textSecondary, letterSpacing: 0.5, marginBottom: 3 },
  medValue: { fontSize: 14, color: Colors.text, lineHeight: 20 },

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
  modalIconBg: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: Colors.text, textAlign: "center", marginBottom: 8 },
  modalDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  modalInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.background,
    marginBottom: 16,
  },
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
  aboutDesc: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22, textAlign: "center", marginBottom: 12 },
  aboutVersion: { fontSize: 13, color: Colors.textLight, textAlign: "center", marginBottom: 20 },
  pingBadge: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, marginTop: 10 },
  pingText: { fontSize: 13, fontWeight: "500", flex: 1 },
});
