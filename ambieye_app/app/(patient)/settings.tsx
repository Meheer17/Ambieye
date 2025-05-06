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
} from "react-native";
import { useRouter, Stack } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useAuth } from "@/hooks/useAuth";
import { patientService } from "@/services/api/patientService";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface VisitRecord {
  date: string | Date;
  distantVision?: string;
  nearVision?: string;
  chiefComplaint?: string;
  presentingIllness?: string;
  bp?: string;
  temperature?: string;
  glassPrescription?: string;
}

interface ProfileData {
  id: string;
  fullName: string;
  username: string;
  email: string;
  doctor_id?: string;
  visitRecords?: VisitRecord[];
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
  const [showVisitDetailsModal, setShowVisitDetailsModal] = useState(false);
  const [selectedVisitRecord, setSelectedVisitRecord] = useState<VisitRecord | null>(null);

  // Fetch profile data and notification settings when component mounts
  useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoading(true);
      try {
        // Get profile data
        const profileResponse = await patientService.getProfile();
        if (profileResponse.success) {
          setProfileData(profileResponse.profile);

          // If doctor_id exists, fetch doctor details
          if (profileResponse.profile.doctor_id) {
            fetchDoctorData(profileResponse.profile.doctor_id);
          }
        } else {
          Alert.alert("Error", profileResponse.message || "Failed to fetch profile data");
        }

        // Get notification settings

      } catch (error) {
        console.error("Error in fetchProfileData:", error);
        Alert.alert("Error", "Failed to load profile data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  const fetchDoctorData = async (docId: string) => {
    setIsDoctorLoading(true);
    try {
      const response = await patientService.getDoctorDetails(docId);
      if (response.success) {
        setDoctorData(response.doctor);
      } else {
        console.error("Failed to fetch doctor details:", response.message);
      }
    } catch (error) {
      console.error("Error fetching doctor details:", error);
    } finally {
      setIsDoctorLoading(false);
    }
  };

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

  const handleUpdateDoctorId = async () => {
    if (!doctorId.trim()) {
      Alert.alert("Error", "Please enter a Doctor ID");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await patientService.updateDoctorId(doctorId);
      if (response.success) {
        Alert.alert("Success", "Doctor ID updated successfully");
        setShowDoctorModal(false);

        // Update profile data with new doctor_id
        if (profileData) {
          setProfileData({
            ...profileData,
            doctor_id: doctorId
          });
        }

        // Fetch doctor details with the new ID
        fetchDoctorData(doctorId);
      } else {
        Alert.alert("Error", response.message || "Failed to update Doctor ID");
      }
    } catch (error) {
      console.error("Error updating doctor ID:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveDoctorId = async () => {
    Alert.alert(
      "Remove Doctor",
      "Are you sure you want to remove your current doctor?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Remove",
          onPress: async () => {
            setIsSubmitting(true);
            try {
              const response = await patientService.updateDoctorId("");
              if (response.success) {
                Alert.alert("Success", "Doctor removed successfully");

                // Update local state
                if (profileData) {
                  setProfileData({
                    ...profileData,
                    doctor_id: undefined
                  });
                }
                setDoctorData(null);
              } else {
                Alert.alert("Error", response.message || "Failed to remove doctor");
              }
            } catch (error) {
              console.error("Error removing doctor:", error);
              Alert.alert("Error", "An unexpected error occurred. Please try again.");
            } finally {
              setIsSubmitting(false);
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const showVisitDetails = (visit: VisitRecord) => {
    setSelectedVisitRecord(visit);
    setShowVisitDetailsModal(true);
  };

  const navigateToEditProfile = () => {
    router.push("/profile/edit");
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

  // Format date to a readable string
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get the latest two visit records sorted by date
  const getLatestVisitRecords = () => {
    if (!profileData?.visitRecords || profileData.visitRecords.length === 0) {
      return [];
    }

    // Sort by date descending (newest first)
    const sortedRecords = [...profileData.visitRecords].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // Return the latest two records
    return sortedRecords.slice(0, 2);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5f2446" />
      </View>
    );
  }

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
                {profileData?.fullName.charAt(0).toUpperCase() || username?.toString().charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.doctorName}>{profileData?.fullName || username}</Text>
              <Text style={styles.specialization}>Patient</Text>
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

        {/* Doctor Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>My Doctor</Text>

          {profileData?.doctor_id ? (
            <View style={styles.doctorCard}>
              {isDoctorLoading ? (
                <ActivityIndicator size="small" color="#5f2446" />
              ) : doctorData ? (
                <>
                  <View style={styles.doctorHeader}>
                    <View style={styles.doctorAvatar}>
                      <Text style={styles.doctorAvatarText}>
                        {doctorData.fullName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.doctorInfo}>
                      <Text style={styles.doctorName}>Dr. {doctorData.fullName}</Text>
                      {doctorData.specialization && (
                        <Text style={styles.doctorSpecialty}>{doctorData.specialization}</Text>
                      )}
                      <Text style={styles.doctorEmail}>{doctorData.email}</Text>
                    </View>
                  </View>
                  <View style={styles.doctorActions}>
                    <TouchableOpacity 
                      style={styles.doctorActionButton}
                      onPress={() => router.push("/queries")}
                    >
                      <Ionicons name="chatbubble-outline" size={20} color="#5f2446" />
                      <Text style={styles.doctorActionText}>Send Query</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.doctorActionButton, styles.removeButton]}
                      onPress={handleRemoveDoctorId}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="#e53935" />
                      ) : (
                        <>
                          <Feather name="user-x" size={20} color="#e53935" />
                          <Text style={styles.removeButtonText}>Remove</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={styles.doctorNotFound}>
                  <Feather name="alert-circle" size={24} color="#ff9800" />
                  <Text style={styles.doctorNotFoundText}>
                    Doctor with ID {profileData.doctor_id} not found
                  </Text>
                  <TouchableOpacity 
                    style={styles.updateDoctorButton}
                    onPress={() => setShowDoctorModal(true)}
                  >
                    <Text style={styles.updateDoctorText}>Update Doctor ID</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.addDoctorButton}
              onPress={() => setShowDoctorModal(true)}
            >
              <Feather name="user-plus" size={24} color="#5f2446" />
              <Text style={styles.addDoctorText}>Add Your Doctor</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Recent Visit Records Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Recent Visit Records</Text>

          {getLatestVisitRecords().length > 0 ? (
            getLatestVisitRecords().map((visit, index) => (
              <TouchableOpacity
                key={index}
                style={styles.visitRecordCard}
                onPress={() => showVisitDetails(visit)}
              >
                <View style={styles.visitRecordHeader}>
                  <View style={styles.visitDateContainer}>
                    <Feather name="calendar" size={16} color="#5f2446" />
                    <Text style={styles.visitDate}>{formatDate(visit.date)}</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color="#888" />
                </View>

                <View style={styles.visitRecordDetails}>
                  {visit.chiefComplaint && (
                    <View style={styles.visitRecordItem}>
                      <Text style={styles.visitRecordLabel}>Chief Complaint:</Text>
                      <Text style={styles.visitRecordValue}>{visit.chiefComplaint}</Text>
                    </View>
                  )}

                  {visit.distantVision && (
                    <View style={styles.visitRecordItem}>
                      <Text style={styles.visitRecordLabel}>Distant Vision:</Text>
                      <Text style={styles.visitRecordValue}>{visit.distantVision}</Text>
                    </View>
                  )}

                  {visit.nearVision && (
                    <View style={styles.visitRecordItem}>
                      <Text style={styles.visitRecordLabel}>Near Vision:</Text>
                      <Text style={styles.visitRecordValue}>{visit.nearVision}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noRecordsContainer}>
              <Feather name="file-text" size={40} color="#ccc" />
              <Text style={styles.noRecordsText}>No visit records available</Text>
            </View>
          )}
        </View>

        {/* Account Section */}
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

        {/* Doctor ID Modal */}
        <Modal
          visible={showDoctorModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDoctorModal(false)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {profileData?.doctor_id ? "Update Doctor ID" : "Add Your Doctor"}
              </Text>

              <Text style={styles.modalDescription}>
                Enter the ID provided by your doctor to connect with them on AmbiEye.
              </Text>

              <TextInput
                style={styles.doctorIdInput}
                placeholder="Enter Doctor ID"
                value={doctorId}
                onChangeText={setDoctorId}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
              />

              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowDoctorModal(false);
                    setDoctorId("");
                  }}
                  disabled={isSubmitting}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalSubmitButton,
                    (!doctorId.trim() || isSubmitting) && styles.disabledButton
                  ]}
                  onPress={handleUpdateDoctorId}
                  disabled={!doctorId.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalSubmitButtonText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Visit Details Modal */}
        <Modal
          visible={showVisitDetailsModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowVisitDetailsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Visit Details</Text>
                <TouchableOpacity onPress={() => setShowVisitDetailsModal(false)}>
                  <Feather name="x" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollContent}>
                {selectedVisitRecord && (
                  <>
                    <View style={styles.visitDetailHeader}>
                      <Feather name="calendar" size={18} color="#5f2446" />
                      <Text style={styles.visitDetailDate}>
                        {formatDate(selectedVisitRecord.date)}
                      </Text>
                    </View>

                    <View style={styles.visitDetailSection}>
                      <Text style={styles.visitDetailSectionTitle}>Complaint & Condition</Text>

                      {selectedVisitRecord.chiefComplaint && (
                        <View style={styles.visitDetailItem}>
                          <Text style={styles.visitDetailLabel}>Chief Complaint:</Text>
                          <Text style={styles.visitDetailValue}>{selectedVisitRecord.chiefComplaint}</Text>
                        </View>
                      )}

                      {selectedVisitRecord.presentingIllness && (
                        <View style={styles.visitDetailItem}>
                          <Text style={styles.visitDetailLabel}>Presenting Illness:</Text>
                          <Text style={styles.visitDetailValue}>{selectedVisitRecord.presentingIllness}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.visitDetailSection}>
                      <Text style={styles.visitDetailSectionTitle}>Vision Assessment</Text>

                      {selectedVisitRecord.distantVision && (
                        <View style={styles.visitDetailItem}>
                          <Text style={styles.visitDetailLabel}>Distant Vision:</Text>
                          <Text style={styles.visitDetailValue}>{selectedVisitRecord.distantVision}</Text>
                        </View>
                      )}

                      {selectedVisitRecord.nearVision && (
                        <View style={styles.visitDetailItem}>
                          <Text style={styles.visitDetailLabel}>Near Vision:</Text>
                          <Text style={styles.visitDetailValue}>{selectedVisitRecord.nearVision}</Text>
                        </View>
                      )}
                    </View>

                    {(selectedVisitRecord.bp || selectedVisitRecord.temperature) && (
                      <View style={styles.visitDetailSection}>
                        <Text style={styles.visitDetailSectionTitle}>Vitals</Text>

                        {selectedVisitRecord.bp && (
                          <View style={styles.visitDetailItem}>
                            <Text style={styles.visitDetailLabel}>Blood Pressure:</Text>
                            <Text style={styles.visitDetailValue}>{selectedVisitRecord.bp}</Text>
                          </View>
                        )}

                        {selectedVisitRecord.temperature && (
                          <View style={styles.visitDetailItem}>
                            <Text style={styles.visitDetailLabel}>Temperature:</Text>
                            <Text style={styles.visitDetailValue}>{selectedVisitRecord.temperature}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {selectedVisitRecord.glassPrescription && (
                      <View style={styles.visitDetailSection}>
                        <Text style={styles.visitDetailSectionTitle}>Prescription</Text>
                        <View style={styles.visitDetailItem}>
                          <Text style={styles.visitDetailLabel}>Glass Prescription:</Text>
                          <Text style={styles.visitDetailValue}>{selectedVisitRecord.glassPrescription}</Text>
                        </View>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>

              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowVisitDetailsModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

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
                    <Text style={styles.faqQuestion}>How do I connect with my doctor?</Text>
                    <Text style={styles.faqAnswer}>
                      Ask your doctor for their AmbiEye ID, then enter it in the "My Doctor" section in settings.
                    </Text>
                  </View>

                  <View style={styles.faqItem}>
                    <Text style={styles.faqQuestion}>How do I submit a query to my doctor?</Text>
                    <Text style={styles.faqAnswer}>
                      Once connected with your doctor, go to the "Queries" tab and tap "New Query".
                    </Text>
                  </View>

                  <View style={styles.faqItem}>
                    <Text style={styles.faqQuestion}>How often should I use the eye exercises?</Text>
                    <Text style={styles.faqAnswer}>
                      We recommend daily practice with the eye exercises for optimal results. Your doctor may provide specific recommendations.
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
                    <Text style={styles.aboutFeatureText}>Direct communication with doctors</Text>
                  </View>
                  <View style={styles.aboutFeatureItem}>
                    <Feather name="check-circle" size={18} color="#5f2446" style={styles.aboutFeatureIcon} />
                    <Text style={styles.aboutFeatureText}>Progress tracking and reports</Text>
                  </View>
                  <View style={styles.aboutFeatureItem}>
                    <Feather name="check-circle" size={18} color="#5f2446" style={styles.aboutFeatureIcon} />
                    <Text style={styles.aboutFeatureText}>Customizable treatment plans</Text>
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

                  <TouchableOpacity 
                    style={styles.aboutLegalItem}
                    onPress={() => Alert.alert("Licenses", "Third-party licenses would be displayed here.")}
                  >
                    <Text style={styles.aboutLegalText}>Third-Party Licenses</Text>
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
  doctorCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  doctorHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  doctorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#0D0145",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  doctorAvatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  doctorInfo: {
    flex: 1,
  },
  doctorSpecialty: {
    fontSize: 14,
    color: "#555",
    marginBottom: 2,
  },
  doctorEmail: {
    fontSize: 12,
    color: "#888",
  },
  doctorActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
    marginTop: 4,
  },
  doctorActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 20,
    marginRight: 8,
  },
  removeButton: {
    backgroundColor: "#ffebee",
  },
  doctorActionText: {
    color: "#5f2446",
    fontWeight: "500",
    fontSize: 14,
    marginLeft: 5,
  },
  removeButtonText: {
    color: "#e53935",
    fontWeight: "500",
    fontSize: 14,
    marginLeft: 5,
  },
  doctorNotFound: {
    alignItems: "center",
    padding: 16,
  },
  doctorNotFoundText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginVertical: 8,
  },
  updateDoctorButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 8,
  },
  updateDoctorText: {
    color: "#5f2446",
    fontWeight: "500",
  },
  addDoctorButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  addDoctorText: {
    color: "#5f2446",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 10,
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
  subSettingItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 12,
    paddingLeft: 20,
    borderRadius: 12,
    marginBottom: 8,
    marginLeft: 16,
    marginRight: 8,
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
  subSettingTitle: {
    fontSize: 14,
    color: "#555",
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
  doctorIdInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
    marginBottom: 20,
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  modalCancelButtonText: {
    color: "#666",
    fontSize: 16,
  },
  modalSubmitButton: {
    backgroundColor: "#5f2446",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#d1c4d1",
  },
  modalSubmitButtonText: {
    color: "#fff",
    fontWeight: "500",
    fontSize: 16,
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
  // Visit record styles
  visitRecordCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  visitRecordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  visitDateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  visitDate: {
    fontSize: 14,
    color: "#5f2446",
    fontWeight: "500",
    marginLeft: 6,
  },
  visitRecordDetails: {
    paddingTop: 4,
  },
  visitRecordItem: {
    flexDirection: "row",
    marginBottom: 8,
  },
  visitRecordLabel: {
    fontSize: 14,
    color: "#666",
    width: 120,
  },
  visitRecordValue: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  noRecordsContainer: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  noRecordsText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
  },
  // Visit detail modal styles
  visitDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  visitDetailDate: {
    fontSize: 14,
    color: "#333",
    marginLeft: 8,
    fontWeight: "500",
  },
  visitDetailSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
  visitDetailSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#5f2446",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  visitDetailItem: {
    marginBottom: 10,
  },
  visitDetailLabel: {
    fontSize: 14,
    color: "#555",
    fontWeight: "500",
    marginBottom: 4,
  },
  visitDetailValue: {
    fontSize: 15,
    color: "#333",
    lineHeight: 20,
  },
});