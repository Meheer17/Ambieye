import React, { useState, useEffect } from "react";
import {
  StyleSheet, 
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Share,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useAuth } from "@/hooks/useAuth";
import { patientService } from "@/services/api/patientService";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailUpdatesEnabled, setEmailUpdatesEnabled] = useState(true);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Fetch profile data and notification settings when component mounts
  useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoading(true);
      try {
        // Get profile data
        const profileResponse = await patientService.getProfile();
        if (profileResponse.success) {
          setProfileData(profileResponse.profile);
        } else {
          Alert.alert("Error", profileResponse.message || "Failed to fetch profile data");
        }

        // Get notification settings from AsyncStorage
        const notifications = await AsyncStorage.getItem('notificationsEnabled');
        const emailUpdates = await AsyncStorage.getItem('emailUpdatesEnabled');

        if (notifications !== null) {
          setNotificationsEnabled(notifications === 'true');
        }

        if (emailUpdates !== null) {
          setEmailUpdatesEnabled(emailUpdates === 'true');
        }
      } catch (error) {
        console.error("Error in fetchProfileData:", error);
        Alert.alert("Error", "Failed to load profile data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              await logout();
              setIsLoggingOut(false);
            } catch (error) {
              setIsLoggingOut(false);
              Alert.alert(
                "Logout Failed",
                "There was a problem logging out. Please try again.",
                [{ text: "OK" }]
              );
              console.error("Logout error:", error);
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const navigateToEditProfile = () => {
    router.push("/profile/edit");
  };

  const shareDocCode = () => {
    // Use the Share API to share the doctor code
    const shareMessage = `Connect with me on AmbiEye using my doctor code: ${docCode}`;

    try {
      Share.share({
        message: shareMessage,
        title: 'Share Doctor Code',
      });
    } catch (error) {
      console.error("Error sharing doctor code:", error);
      Alert.alert(
        "Sharing Failed",
        "Unable to share your doctor code. Please try again later."
      );
    }
  };

  const renderSettingItem = (
    icon: string, 
    title: string, 
    onPress: (() => void) | null, 
    showArrow = true, 
    additionalContent: React.ReactNode = null
  ) => {
    return (
      <TouchableOpacity 
        style={styles.settingItem}
        onPress={onPress || undefined}
        disabled={!onPress}
      >
        <View style={styles.settingIconContainer}>
          <Feather name={icon as any} size={20} color="#5f2446" />
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          {additionalContent}
        </View>
        {showArrow && (
          <Feather name="chevron-right" size={20} color="#888" />
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5f2446" />
      </View>
    );
  }

  // Doctor code to display - either from API or fallback
  const docCode = profileData?.uuid || "";

  return (
    <>
      <Stack.Screen 
        options={{
          title: "Settings",
        }}
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.profileInfo}>
            <View style={styles.profileAvatar}>
              <Text style={styles.avatarText}>
                {profileData?.fullName?.charAt(0).toUpperCase() || username?.toString().charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.doctorName}>{profileData?.fullName || username}</Text>
              <Text style={styles.specialization}>Doctor</Text>
              <Text style={styles.emailText}>{profileData?.email || ""}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.editProfileButton}
            onPress={navigateToEditProfile}
          >
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>My Code</Text>
          <View style={styles.docCodeContainer}>
            <View style={styles.docCodeContent}>
              <Text style={styles.docCode}>{docCode}</Text>
            </View>
            <View style={styles.docCodeActions}>
              <TouchableOpacity 
                style={styles.docCodeButton}
                onPress={shareDocCode}
              >
                <Feather name="share" size={18} color="#5f2446" />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.docCodeDescription}>
            Share this code with your patients to connect with them on AmbiEye
          </Text>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Account</Text>
          {renderSettingItem("help-circle", "Help & Support", () => setShowHelpModal(true))}
          {renderSettingItem("info", "About AmbiEye", () => setShowAboutModal(true))}
        </View>

        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.logoutText}>Logout</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.version}>AmbiEye v1.0.0</Text>
        </View>

        {/* Help & Support Modal */}
        <Modal
          visible={showHelpModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowHelpModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Help & Support</Text>
                <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                  <Feather name="x" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollContent}>
                <View style={styles.helpSection}>
                  <Text style={styles.helpSectionTitle}>Contact Support</Text>
                  <TouchableOpacity 
                    style={styles.helpItem}
                    onPress={() => Linking.openURL('mailto:support@ambieye.com')}
                  >
                    <Feather name="mail" size={20} color="#5f2446" style={styles.helpItemIcon} />
                    <Text style={styles.helpItemText}>Email: support@ambieye.com</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.helpItem}
                    onPress={() => Linking.openURL('tel:+15551234567')}
                  >
                    <Feather name="phone" size={20} color="#5f2446" style={styles.helpItemIcon} />
                    <Text style={styles.helpItemText}>Phone: +1 (555) 123-4567</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.helpSection}>
                  <Text style={styles.helpSectionTitle}>FAQ</Text>
                  <View style={styles.faqItem}>
                    <Text style={styles.faqQuestion}>How do I use my doctor code?</Text>
                    <Text style={styles.faqAnswer}>
                      Share your doctor code with patients who want to connect with you on AmbiEye.
                    </Text>
                  </View>

                  <View style={styles.faqItem}>
                    <Text style={styles.faqQuestion}>How do I respond to patient queries?</Text>
                    <Text style={styles.faqAnswer}>
                      Navigate to the "Queries" tab to view and respond to patient messages.
                    </Text>
                  </View>
                </View>
              </ScrollView>

              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowHelpModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* About AmbiEye Modal */}
        <Modal
          visible={showAboutModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAboutModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>About AmbiEye</Text>
                <TouchableOpacity onPress={() => setShowAboutModal(false)}>
                  <Feather name="x" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollContent}>
                <View style={styles.aboutLogoContainer}>
                  <Text style={styles.aboutLogoText}>AmbiEye</Text>
                  <Text style={styles.aboutVersion}>Version 1.0.0</Text>
                </View>

                <Text style={styles.aboutDescription}>
                  AmbiEye is a comprehensive digital health platform designed for treating amblyopia (lazy eye) through interactive games and exercises, while keeping doctors connected with their patients.
                </Text>

                <View style={styles.aboutSection}>
                  <Text style={styles.aboutSectionTitle}>Key Features</Text>
                  <View style={styles.aboutFeatureItem}>
                    <Feather name="check-circle" size={18} color="#5f2446" style={styles.aboutFeatureIcon} />
                    <Text style={styles.aboutFeatureText}>Interactive vision therapy games</Text>
                  </View>
                  <View style={styles.aboutFeatureItem}>
                    <Feather name="check-circle" size={18} color="#5f2446" style={styles.aboutFeatureIcon} />
                    <Text style={styles.aboutFeatureText}>Direct communication with patients</Text>
                  </View>
                  <View style={styles.aboutFeatureItem}>
                    <Feather name="check-circle" size={18} color="#5f2446" style={styles.aboutFeatureIcon} />
                    <Text style={styles.aboutFeatureText}>Progress tracking and reports</Text>
                  </View>
                </View>

                <View style={styles.aboutSection}>
                  <Text style={styles.aboutSectionTitle}>Legal</Text>
                  <TouchableOpacity 
                    style={styles.aboutLegalItem}
                    onPress={() => Alert.alert("Terms of Service", "Terms of Service content would be displayed here.")}
                  >
                    <Text style={styles.aboutLegalText}>Terms of Service</Text>
                    <Feather name="chevron-right" size={18} color="#888" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.aboutLegalItem}
                    onPress={() => Alert.alert("Privacy Policy", "Privacy Policy content would be displayed here.")}
                  >
                    <Text style={styles.aboutLegalText}>Privacy Policy</Text>
                    <Feather name="chevron-right" size={18} color="#888" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.copyrightText}>
                  © {new Date().getFullYear()} AmbiEye. All rights reserved.
                </Text>
              </ScrollView>

              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowAboutModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    margin: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#5f2446",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  avatarText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  doctorName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  specialization: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  emailText: {
    fontSize: 12,
    color: "#888",
  },
  editProfileButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  editProfileText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "500",
  },
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  docCodeContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  docCodeContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  docCodeIcon: {
    marginRight: 12,
  },
  docCode: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#5f2446",
  },
  docCodeActions: {
    flexDirection: "row",
  },
  docCodeButton: {
    padding: 8,
    marginLeft: 8,
  },
  docCodeDescription: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: "#333",
  },
  logoutButton: {
    backgroundColor: "#e53935",
    borderRadius: 12,
    padding: 15,
    margin: 16,
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  footer: {
    alignItems: "center",
    marginVertical: 24,
  },
  version: {
    fontSize: 12,
    color: "#888",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "90%",
    maxWidth: 400,
    maxHeight: "80%",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  modalDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    lineHeight: 20,
  },
  modalScrollContent: {
    maxHeight: 400,
  },
  modalCloseButton: {
    backgroundColor: "#5f2446",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  modalCloseButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  helpSection: {
    marginBottom: 24,
  },
  helpSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  helpItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
  helpItemIcon: {
    marginRight: 10,
  },
  helpItemText: {
    fontSize: 14,
    color: "#333",
  },
  faqItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },
  aboutLogoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  aboutLogoText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#5f2446",
    marginBottom: 8,
  },
  aboutVersion: {
    fontSize: 14,
    color: "#888",
  },
  aboutDescription: {
    fontSize: 14,
    color: "#555",
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  aboutSection: {
    marginBottom: 20,
  },
  aboutSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  aboutFeatureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  aboutFeatureIcon: {
    marginRight: 10,
  },
  aboutFeatureText: {
    fontSize: 14,
    color: "#555",
  },
  aboutLegalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  aboutLegalText: {
    fontSize: 14,
    color: "#333",
  },
  copyrightText: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    marginVertical: 20,
  },
});