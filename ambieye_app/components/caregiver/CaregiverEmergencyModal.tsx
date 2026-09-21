import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WarmPalette } from "../../constants/theme";
import { PatientProfile } from "../../utils/caregiverStorage";

interface Props {
  visible: boolean;
  onClose: () => void;
  profile: PatientProfile;
}

export const CaregiverEmergencyModal: React.FC<Props> = ({ visible, onClose, profile }) => {
  const handleCall = (phoneNumber: string) => {
    const cleanNumber = phoneNumber.replace(/[^0-9+]/g, "");
    Linking.openURL(`tel:${cleanNumber}`).catch(() => {
      console.warn("Could not open dialer for:", cleanNumber);
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Native Mobile Sheet Drag Handle */}
          <View style={styles.sheetHandleBar}>
            <View style={styles.sheetHandle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.alertBadge}>
                <Ionicons name="shield-checkmark" size={18} color="#C2410C" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.headerTitle}>Emergency & Quick Help</Text>
                <Text style={styles.headerSubtitle}>
                  Immediate assistance for {profile.name}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityLabel="Close emergency dialog">
              <Ionicons name="close" size={20} color={WarmPalette.charcoalWarm} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Primary Action: Direct Emergency Dispatch */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Emergency Services</Text>
              <Text style={styles.sectionHint}>One-tap direct dial</Text>
            </View>

            <View style={styles.emergencyGrid}>
              <TouchableOpacity
                style={[styles.emergencyBtn, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}
                onPress={() => handleCall("112")}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={22} color="#DC2626" />
                <View style={styles.emergencyBtnTexts}>
                  <Text style={[styles.emergencyBtnTitle, { color: "#991B1B" }]}>National Emergency</Text>
                  <Text style={styles.emergencyBtnSub}>112 (Police, Fire, Medical)</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#DC2626" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.emergencyBtn, { backgroundColor: "#FFF7ED", borderColor: "#FFEDD5" }]}
                onPress={() => handleCall("108")}
                activeOpacity={0.8}
              >
                <Ionicons name="medical" size={22} color="#EA580C" />
                <View style={styles.emergencyBtnTexts}>
                  <Text style={[styles.emergencyBtnTitle, { color: "#9A3412" }]}>Ambulance Service</Text>
                  <Text style={styles.emergencyBtnSub}>108 (Disaster & Medical)</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#EA580C" />
              </TouchableOpacity>
            </View>

            {/* Emergency Contacts List */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Primary Family & Care Contacts</Text>
            </View>

            <View style={styles.contactsCard}>
              {profile.emergencyContacts.map((contact, index) => (
                <View
                  key={index}
                  style={[
                    styles.contactRow,
                    index < profile.emergencyContacts.length - 1 && styles.contactBorder,
                  ]}
                >
                  <View style={styles.contactAvatar}>
                    <Text style={styles.contactAvatarText}>{contact.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactRelation}>
                      {contact.relation} • {contact.phone}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.callCircle}
                    onPress={() => handleCall(contact.phone)}
                    accessibilityLabel={`Call ${contact.name}`}
                  >
                    <Ionicons name="call" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Doctor Contact */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Primary Physician</Text>
            </View>

            <View style={styles.doctorCard}>
              <View style={styles.doctorAvatar}>
                <Ionicons name="medkit" size={20} color={WarmPalette.sageWarm} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.doctorName}>{profile.medical.primaryDoctor.name}</Text>
                <Text style={styles.doctorSub}>
                  {profile.medical.primaryDoctor.specialty} • {profile.medical.primaryDoctor.hospital}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.callCircle, { backgroundColor: WarmPalette.sageWarm }]}
                onPress={() => handleCall("+919876543210")}
              >
                <Ionicons name="call" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Quick Emergency Medical Summary Card */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Emergency Medical Card</Text>
              <Text style={styles.sectionHint}>Show to first responders</Text>
            </View>

            <View style={styles.medicalCard}>
              <View style={styles.medicalRow}>
                <Text style={styles.medicalLabel}>Patient:</Text>
                <Text style={styles.medicalVal}>
                  {profile.name} (Age {profile.age})
                </Text>
              </View>
              <View style={styles.medicalRow}>
                <Text style={styles.medicalLabel}>Primary Language:</Text>
                <Text style={styles.medicalVal}>{profile.preferredLanguage}</Text>
              </View>
              <View style={styles.medicalRow}>
                <Text style={styles.medicalLabel}>Known Conditions:</Text>
                <Text style={styles.medicalVal}>
                  {profile.medical.conditions.join(", ")}
                </Text>
              </View>
              <View style={styles.medicalRow}>
                <Text style={styles.medicalLabel}>Allergies:</Text>
                <Text style={[styles.medicalVal, { color: "#DC2626", fontWeight: "700" }]}>
                  {profile.medical.allergies.join(", ")}
                </Text>
              </View>
              <View style={styles.medicalRow}>
                <Text style={styles.medicalLabel}>Key Medications:</Text>
                <Text style={styles.medicalVal}>
                  {profile.medical.currentMedicationsSummary.join(", ")}
                </Text>
              </View>
              <View style={[styles.medicalRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <Text style={styles.medicalLabel}>Caregiver:</Text>
                <Text style={styles.medicalVal}>
                  {profile.caregiverName} ({profile.caregiverRelationship})
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Bottom dismiss button */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.closeFooterBtn} onPress={onClose}>
              <Text style={styles.closeFooterText}>Close Emergency Hub</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(40, 37, 36, 0.6)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: WarmPalette.ivory,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "90%",
    minHeight: 460,
  },
  sheetHandleBar: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 2,
  },
  sheetHandle: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: WarmPalette.charcoalWarm + "30",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: WarmPalette.sand,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  alertBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  headerSubtitle: {
    fontSize: 13,
    color: WarmPalette.charcoalWarm + "99",
    marginTop: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: WarmPalette.sand,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 14,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionHint: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm + "80",
  },
  emergencyGrid: {
    gap: 10,
  },
  emergencyBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  emergencyBtnTexts: {
    flex: 1,
    marginLeft: 12,
  },
  emergencyBtnTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  emergencyBtnSub: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm + "99",
    marginTop: 2,
  },
  contactsCard: {
    backgroundColor: WarmPalette.cream,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    paddingHorizontal: 14,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  contactBorder: {
    borderBottomWidth: 1,
    borderBottomColor: WarmPalette.sand,
  },
  contactAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: WarmPalette.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  contactAvatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  contactName: {
    fontSize: 14,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  contactRelation: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm + "99",
    marginTop: 1,
  },
  callCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },
  doctorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.cream,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    padding: 14,
  },
  doctorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: WarmPalette.sand,
    alignItems: "center",
    justifyContent: "center",
  },
  doctorName: {
    fontSize: 14,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  doctorSub: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm + "99",
    marginTop: 2,
  },
  medicalCard: {
    backgroundColor: "#FFFBF5",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    padding: 14,
  },
  medicalRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: WarmPalette.sand + "80",
  },
  medicalLabel: {
    width: 120,
    fontSize: 12,
    fontWeight: "600",
    color: WarmPalette.charcoalWarm + "99",
  },
  medicalVal: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: WarmPalette.charcoalWarm,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: WarmPalette.sand,
    backgroundColor: WarmPalette.ivory,
  },
  closeFooterBtn: {
    backgroundColor: WarmPalette.sand,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  closeFooterText: {
    fontSize: 14,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
});
