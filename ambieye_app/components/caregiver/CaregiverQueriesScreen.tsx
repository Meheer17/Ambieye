import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  Linking,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WarmPalette } from "../../constants/theme";
import {
  caregiverStorage,
  CaregiverDoctor,
  CaregiverAppointment,
  CaregiverServiceItem,
  PatientProfile,
} from "../../utils/caregiverStorage";

import { CaregiverEmergencyModal } from "./CaregiverEmergencyModal";
import { CaregiverServicesModal } from "./CaregiverServicesModal";

export const CaregiverQueriesScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [activeTab, setActiveTab] = useState<"appointments" | "doctors" | "services">("appointments");
  const [appointments, setAppointments] = useState<CaregiverAppointment[]>([]);
  const [doctors, setDoctors] = useState<CaregiverDoctor[]>([]);
  const [services, setServices] = useState<CaregiverServiceItem[]>([]);
  const [profile, setProfile] = useState<PatientProfile | null>(null);

  // Modals
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showServicesModal, setShowServicesModal] = useState(false);

  // Booking Modal State
  const [selectedDoctor, setSelectedDoctor] = useState<CaregiverDoctor | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [prepNotes, setPrepNotes] = useState("");
  const [consultType, setConsultType] = useState<"in_clinic" | "video">("in_clinic");
  const [isBooking, setIsBooking] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("all");

  const loadData = useCallback(async () => {
    try {
      const appts = await caregiverStorage.getAppointments();
      const docs = await caregiverStorage.getDoctors();
      const srvs = await caregiverStorage.getServices();
      const p = await caregiverStorage.getPatientProfile();

      setAppointments(appts);
      setDoctors(docs);
      setServices(srvs);
      setProfile(p);
    } catch (e) {
      console.warn("Failed to load care team data:", e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCall = (phone: string) => {
    const cleanNumber = phone.replace(/[^0-9+]/g, "");
    Linking.openURL(`tel:${cleanNumber}`).catch(() => {
      console.warn("Could not dial:", cleanNumber);
    });
  };

  const handleConfirmBooking = async () => {
    if (!selectedDoctor) return;
    if (!selectedSlot) {
      Alert.alert("Select a Slot", "Please select an appointment time slot.");
      return;
    }

    setIsBooking(true);
    try {
      const updated = await caregiverStorage.bookAppointment({
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        specialty: selectedDoctor.specialty,
        hospital: selectedDoctor.hospital,
        date: "Tomorrow",
        time: selectedSlot,
        consultationType: consultType,
        preparationNotes: prepNotes.trim() || undefined,
        contactNumber: "+919876543210",
      });

      setAppointments(updated);
      setIsBooking(false);
      setSelectedDoctor(null);
      setSelectedSlot("");
      setPrepNotes("");
      Alert.alert("Appointment Scheduled", `Booking confirmed with ${selectedDoctor.name} for ${selectedSlot}.`);
    } catch {
      setIsBooking(false);
      Alert.alert("Error", "Could not complete booking right now.");
    }
  };

  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.hospital.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty =
      selectedSpecialty === "all" || doc.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase());
    return matchesSearch && matchesSpecialty;
  });

  return (
    <View style={styles.screenWrapper}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          isTablet && { maxWidth: 840, alignSelf: "center", width: "100%" },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Screen Header & Emergency Action ─────────────────────── */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Care Team & Consultations</Text>
            <Text style={styles.headerSubtitle}>
              Doctors, scheduled appointments & verified home eldercare
            </Text>
          </View>
          <TouchableOpacity
            style={styles.emergencyPillBtn}
            onPress={() => setShowEmergencyModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="shield-checkmark" size={16} color="#DC2626" />
            <Text style={styles.emergencyPillText}>Emergency</Text>
          </TouchableOpacity>
        </View>

        {/* ── Tab Switcher (Appointments, Doctors, Services) ─────────── */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "appointments" && styles.tabBtnActive]}
            onPress={() => setActiveTab("appointments")}
          >
            <Ionicons
              name="calendar-outline"
              size={15}
              color={activeTab === "appointments" ? "#FFFFFF" : WarmPalette.charcoalWarm}
            />
            <Text style={[styles.tabBtnText, activeTab === "appointments" && styles.tabBtnTextActive]}>
              Appointments ({appointments.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "doctors" && styles.tabBtnActive]}
            onPress={() => setActiveTab("doctors")}
          >
            <Ionicons
              name="medkit-outline"
              size={15}
              color={activeTab === "doctors" ? "#FFFFFF" : WarmPalette.charcoalWarm}
            />
            <Text style={[styles.tabBtnText, activeTab === "doctors" && styles.tabBtnTextActive]}>
              Find Doctors
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "services" && styles.tabBtnActive]}
            onPress={() => setActiveTab("services")}
          >
            <Ionicons
              name="people-outline"
              size={15}
              color={activeTab === "services" ? "#FFFFFF" : WarmPalette.charcoalWarm}
            />
            <Text style={[styles.tabBtnText, activeTab === "services" && styles.tabBtnTextActive]}>
              Home Services
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── TAB 1: APPOINTMENTS (Spec 15) ──────────────────────────── */}
        {activeTab === "appointments" && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>UPCOMING APPOINTMENTS</Text>
              <TouchableOpacity onPress={() => setActiveTab("doctors")}>
                <Text style={styles.bookMoreText}>+ Book New</Text>
              </TouchableOpacity>
            </View>

            {appointments.map((appt) => (
              <View key={appt.id} style={styles.apptCard}>
                <View style={styles.apptHeader}>
                  <View style={styles.docAvatarCircle}>
                    <Ionicons name="medkit" size={20} color={WarmPalette.roseDusty} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.docName}>{appt.doctorName}</Text>
                    <Text style={styles.docSpecialty}>{appt.specialty} • {appt.hospital}</Text>
                  </View>
                  <View style={styles.timingPill}>
                    <Text style={styles.timingDate}>{appt.date}</Text>
                    <Text style={styles.timingHour}>{appt.time}</Text>
                  </View>
                </View>

                {/* Consultation Details */}
                <View style={styles.consultTypeRow}>
                  <Ionicons
                    name={appt.consultationType === "video" ? "videocam-outline" : "business-outline"}
                    size={14}
                    color={WarmPalette.charcoalWarm + "80"}
                  />
                  <Text style={styles.consultTypeText}>
                    {appt.consultationType === "video" ? "Video Tele-consultation" : "In-Clinic Consultation"}
                  </Text>
                </View>

                {/* Preparation Notes */}
                {appt.preparationNotes ? (
                  <View style={styles.prepNotesCard}>
                    <Text style={styles.prepNotesLabel}>PREPARATION NOTES:</Text>
                    <Text style={styles.prepNotesContent}>{appt.preparationNotes}</Text>
                  </View>
                ) : null}

                {/* Action Buttons: Call, Directions */}
                <View style={styles.apptActionsRow}>
                  <TouchableOpacity
                    style={styles.apptActionBtn}
                    onPress={() => handleCall(appt.contactNumber)}
                  >
                    <Ionicons name="call-outline" size={15} color={WarmPalette.charcoalWarm} />
                    <Text style={styles.apptActionText}>Call Clinic</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.apptActionBtn}
                    onPress={() =>
                      Alert.alert(
                        "Appointment Details",
                        `${appt.doctorName}\n${appt.hospital}\nScheduled: ${appt.date} at ${appt.time}`
                      )
                    }
                  >
                    <Ionicons name="information-circle-outline" size={15} color={WarmPalette.charcoalWarm} />
                    <Text style={styles.apptActionText}>Details</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.apptActionBtn, { borderColor: "#FECACA", backgroundColor: "#FEF2F2" }]}
                    onPress={() =>
                      Alert.alert(
                        "Reschedule / Cancel",
                        "Please contact the clinic coordinator or doctor directly to reschedule this slot.",
                        [
                          { text: "Cancel", style: "cancel" },
                          { text: "Call Now", onPress: () => handleCall(appt.contactNumber) },
                        ]
                      )
                    }
                  >
                    <Text style={[styles.apptActionText, { color: "#DC2626" }]}>Reschedule</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── TAB 2: DOCTORS DIRECTORY (Spec 14) ─────────────────────── */}
        {activeTab === "doctors" && (
          <View style={styles.tabContent}>
            {/* Search Input */}
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={WarmPalette.charcoalWarm + "70"} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search neurologists, geriatricians, hospitals..."
                placeholderTextColor={WarmPalette.charcoalWarm + "60"}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={16} color={WarmPalette.charcoalWarm + "70"} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Specialty Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.specialtyChipsRow}>
              {[
                { key: "all", label: "All Specialists" },
                { key: "neurology", label: "Neurology" },
                { key: "geriatric", label: "Geriatric Care" },
                { key: "memory", label: "Memory Clinic" },
              ].map((sp) => (
                <TouchableOpacity
                  key={sp.key}
                  style={[
                    styles.specialtyChip,
                    selectedSpecialty === sp.key && styles.specialtyChipActive,
                  ]}
                  onPress={() => setSelectedSpecialty(sp.key)}
                >
                  <Text
                    style={[
                      styles.specialtyChipText,
                      selectedSpecialty === sp.key && styles.specialtyChipTextActive,
                    ]}
                  >
                    {sp.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Doctors List */}
            <View style={styles.docsList}>
              {filteredDoctors.map((doc) => (
                <View key={doc.id} style={styles.doctorItemCard}>
                  <View style={styles.doctorItemHeader}>
                    <View style={styles.doctorItemAvatar}>
                      <Ionicons name="person" size={20} color={WarmPalette.charcoalWarm} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.docItemName}>{doc.name}</Text>
                      <Text style={styles.docItemSpecialty}>
                        {doc.specialty} • {doc.qualification}
                      </Text>
                      <Text style={styles.docItemHospital}>
                        {doc.hospital} ({doc.location})
                      </Text>
                      <Text style={styles.docItemExp}>
                        {doc.experienceYears} yrs exp • {doc.consultationFee}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.slotsPreviewRow}>
                    <Text style={styles.slotsLabel}>Available Slots:</Text>
                    {doc.availableSlots.map((slot, idx) => (
                      <View key={`${doc.id}-slot-${idx}`} style={styles.slotMiniPill}>
                        <Text style={styles.slotMiniText}>{slot}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.bookDocBtn}
                    onPress={() => {
                      setSelectedDoctor(doc);
                      setSelectedSlot(doc.availableSlots[0]);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.bookDocBtnText}>Book Appointment</Text>
                    <Ionicons name="chevron-forward" size={15} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── TAB 3: HOME SERVICES (Spec 16) ─────────────────────────── */}
        {activeTab === "services" && (
          <View style={styles.tabContent}>
            <View style={styles.servicePromptBanner}>
              <Ionicons name="help-circle-outline" size={20} color={WarmPalette.roseDusty} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.servicePromptTitle}>"What kind of help does the family need?"</Text>
                <Text style={styles.servicePromptSub}>
                  Direct request with verified care coordinators, not an overwhelming marketplace.
                </Text>
              </View>
            </View>

            <View style={styles.servicesGrid}>
              {services.map((srv) => (
                <View key={srv.id} style={styles.serviceGridItem}>
                  <View style={styles.srvIconCircle}>
                    <Ionicons name={srv.icon as any} size={22} color={WarmPalette.roseDusty} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.srvTitle}>{srv.title}</Text>
                    <Text style={styles.srvDesc}>{srv.description}</Text>
                    <View style={styles.srvMeta}>
                      <Text style={styles.srvPrice}>{srv.priceGuide}</Text>
                      <Text style={styles.srvProvider}>• {srv.provider}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.srvReqBtn}
                    onPress={() => {
                      Alert.alert(
                        `Request ${srv.title}?`,
                        `Care coordinator from ${srv.provider} will call Anita directly within 30 minutes to confirm elder's care routine.`,
                        [
                          { text: "Cancel", style: "cancel" },
                          { text: "Confirm", onPress: () => Alert.alert("Request Sent", "Coordinator notified!") },
                        ]
                      );
                    }}
                  >
                    <Text style={styles.srvReqText}>Request</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Doctor Booking Modal ────────────────────────────────────── */}
      <Modal visible={!!selectedDoctor} animationType="slide" transparent>
        <View style={styles.bookingOverlay}>
          <View style={styles.bookingSheet}>
            <View style={styles.bookingHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bookingTitle}>Book Consultation</Text>
                <Text style={styles.bookingSub}>with {selectedDoctor?.name}</Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSelectedDoctor(null)}
              >
                <Ionicons name="close" size={20} color={WarmPalette.charcoalWarm} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: 20, paddingTop: 14 }}>
              {/* Type of consult */}
              <Text style={styles.bookingFieldLabel}>CONSULTATION TYPE</Text>
              <View style={styles.typeToggleRow}>
                <TouchableOpacity
                  style={[styles.typeToggle, consultType === "in_clinic" && styles.typeToggleActive]}
                  onPress={() => setConsultType("in_clinic")}
                >
                  <Text style={[styles.typeToggleText, consultType === "in_clinic" && styles.typeToggleTextActive]}>
                    In-Clinic Visit
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeToggle, consultType === "video" && styles.typeToggleActive]}
                  onPress={() => setConsultType("video")}
                >
                  <Text style={[styles.typeToggleText, consultType === "video" && styles.typeToggleTextActive]}>
                    Video Tele-Consult
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Slots selection */}
              <Text style={styles.bookingFieldLabel}>SELECT TOMORROW'S SLOT</Text>
              <View style={styles.bookingSlotsRow}>
                {selectedDoctor?.availableSlots.map((slot, idx) => {
                  const isSelected = selectedSlot === slot;
                  return (
                    <TouchableOpacity
                      key={`booking-slot-${idx}-${slot}`}
                      style={[styles.bookingSlotChip, isSelected && styles.bookingSlotChipActive]}
                      onPress={() => setSelectedSlot(slot)}
                    >
                      <Text style={[styles.bookingSlotText, isSelected && styles.bookingSlotTextActive]}>
                        {slot}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Prep Notes */}
              <Text style={styles.bookingFieldLabel}>PREPARATION NOTES FOR DOCTOR (OPTIONAL)</Text>
              <TextInput
                style={styles.prepNotesInput}
                multiline
                numberOfLines={3}
                placeholder="e.g. Recent sleep patterns, Donepezil side effects inquiry"
                placeholderTextColor={WarmPalette.charcoalWarm + "60"}
                value={prepNotes}
                onChangeText={setPrepNotes}
              />

              {/* Fee notice */}
              <View style={styles.feeNoticeBox}>
                <Text style={styles.feeNoticeLabel}>Consultation Fee:</Text>
                <Text style={styles.feeNoticeVal}>{selectedDoctor?.consultationFee}</Text>
              </View>

              {/* Confirm Button */}
              <TouchableOpacity
                style={[styles.confirmBookingBtn, isBooking && { opacity: 0.7 }]}
                onPress={handleConfirmBooking}
                disabled={isBooking}
              >
                <Text style={styles.confirmBookingBtnText}>
                  {isBooking ? "Confirming..." : "Confirm Appointment"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Emergency Hub Modal */}
      {profile && (
        <CaregiverEmergencyModal
          visible={showEmergencyModal}
          onClose={() => setShowEmergencyModal(false)}
          profile={profile}
        />
      )}

      {/* Services Modal */}
      {profile && (
        <CaregiverServicesModal
          visible={showServicesModal}
          onClose={() => setShowServicesModal(false)}
          elderName={profile.name}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: WarmPalette.ivory,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 30,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
  },
  headerSubtitle: {
    fontSize: 13,
    color: WarmPalette.charcoalWarm + "99",
    marginTop: 2,
  },
  emergencyPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  emergencyPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },
  tabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.cream,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: WarmPalette.roseDusty,
    borderColor: WarmPalette.roseDusty,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  tabBtnTextActive: {
    color: "#FFFFFF",
  },
  tabContent: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
    letterSpacing: 0.5,
  },
  bookMoreText: {
    fontSize: 12,
    fontWeight: "700",
    color: WarmPalette.roseDusty,
  },
  apptCard: {
    backgroundColor: WarmPalette.cream,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    padding: 14,
  },
  apptHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  docAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: WarmPalette.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  docName: {
    fontSize: 15,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  docSpecialty: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm + "90",
    marginTop: 1,
  },
  timingPill: {
    alignItems: "flex-end",
    backgroundColor: WarmPalette.sand,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timingDate: {
    fontSize: 11,
    fontWeight: "700",
    color: WarmPalette.roseDusty,
  },
  timingHour: {
    fontSize: 12,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
  },
  consultTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 6,
  },
  consultTypeText: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm + "90",
    fontWeight: "600",
  },
  prepNotesCard: {
    backgroundColor: WarmPalette.ivory,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    padding: 10,
    marginTop: 8,
  },
  prepNotesLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm + "80",
  },
  prepNotesContent: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm,
    marginTop: 2,
  },
  apptActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  apptActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.ivory,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 4,
  },
  apptActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: WarmPalette.charcoalWarm,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.cream,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: WarmPalette.charcoalWarm,
  },
  specialtyChipsRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 4,
  },
  specialtyChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: WarmPalette.cream,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
  },
  specialtyChipActive: {
    backgroundColor: WarmPalette.sand,
    borderColor: WarmPalette.charcoalWarm + "40",
  },
  specialtyChipText: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm,
    fontWeight: "600",
  },
  specialtyChipTextActive: {
    fontWeight: "700",
  },
  docsList: {
    gap: 12,
  },
  doctorItemCard: {
    backgroundColor: WarmPalette.cream,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    padding: 14,
  },
  doctorItemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  doctorItemAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: WarmPalette.sand,
    alignItems: "center",
    justifyContent: "center",
  },
  docItemName: {
    fontSize: 15,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  docItemSpecialty: {
    fontSize: 12,
    fontWeight: "600",
    color: WarmPalette.roseDusty,
    marginTop: 1,
  },
  docItemHospital: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm + "90",
    marginTop: 2,
  },
  docItemExp: {
    fontSize: 11,
    color: WarmPalette.charcoalWarm + "80",
    marginTop: 2,
  },
  slotsPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  slotsLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm + "80",
  },
  slotMiniPill: {
    backgroundColor: WarmPalette.sand,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  slotMiniText: {
    fontSize: 11,
    color: WarmPalette.charcoalWarm,
    fontWeight: "600",
  },
  bookDocBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WarmPalette.roseDusty,
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 12,
    gap: 6,
  },
  bookDocBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  servicePromptBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.cream,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    padding: 12,
  },
  servicePromptTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  servicePromptSub: {
    fontSize: 11,
    color: WarmPalette.charcoalWarm + "80",
    marginTop: 2,
  },
  servicesGrid: {
    gap: 10,
  },
  serviceGridItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.cream,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    padding: 12,
  },
  srvIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: WarmPalette.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  srvTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  srvDesc: {
    fontSize: 11,
    color: WarmPalette.charcoalWarm + "80",
    marginTop: 2,
  },
  srvMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  srvPrice: {
    fontSize: 11,
    fontWeight: "700",
    color: WarmPalette.sageWarm,
  },
  srvProvider: {
    fontSize: 10,
    color: WarmPalette.charcoalWarm + "70",
  },
  srvReqBtn: {
    backgroundColor: WarmPalette.sand,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  srvReqText: {
    fontSize: 11,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  bookingOverlay: {
    flex: 1,
    backgroundColor: "rgba(40, 37, 36, 0.6)",
    justifyContent: "flex-end",
  },
  bookingSheet: {
    backgroundColor: WarmPalette.ivory,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: 30,
  },
  bookingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: WarmPalette.sand,
  },
  bookingTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  bookingSub: {
    fontSize: 13,
    color: WarmPalette.charcoalWarm + "90",
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: WarmPalette.sand,
    alignItems: "center",
    justifyContent: "center",
  },
  bookingFieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm + "80",
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  typeToggleRow: {
    flexDirection: "row",
    gap: 10,
  },
  typeToggle: {
    flex: 1,
    backgroundColor: WarmPalette.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    paddingVertical: 10,
    alignItems: "center",
  },
  typeToggleActive: {
    backgroundColor: WarmPalette.roseDusty,
    borderColor: WarmPalette.roseDusty,
  },
  typeToggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: WarmPalette.charcoalWarm,
  },
  typeToggleTextActive: {
    color: "#FFFFFF",
  },
  bookingSlotsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  bookingSlotChip: {
    backgroundColor: WarmPalette.cream,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bookingSlotChipActive: {
    backgroundColor: WarmPalette.roseDusty,
    borderColor: WarmPalette.roseDusty,
  },
  bookingSlotText: {
    fontSize: 12,
    fontWeight: "600",
    color: WarmPalette.charcoalWarm,
  },
  bookingSlotTextActive: {
    color: "#FFFFFF",
  },
  prepNotesInput: {
    backgroundColor: WarmPalette.cream,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: WarmPalette.charcoalWarm,
    textAlignVertical: "top",
    height: 70,
  },
  feeNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: WarmPalette.cream,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
  },
  feeNoticeLabel: {
    fontSize: 13,
    color: WarmPalette.charcoalWarm + "90",
  },
  feeNoticeVal: {
    fontSize: 14,
    fontWeight: "700",
    color: WarmPalette.sageWarm,
  },
  confirmBookingBtn: {
    backgroundColor: WarmPalette.roseDusty,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 18,
  },
  confirmBookingBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
