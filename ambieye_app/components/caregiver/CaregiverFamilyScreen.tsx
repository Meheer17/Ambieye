import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  RefreshControl,
  Linking,
  Image,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { WarmPalette, AestheticTheme } from "../../constants/theme";
import {
  caregiverStorage,
  PatientProfile,
  FamilySentItem,
  MemoryBankItem,
  SafeZoneStatus,
  ShiftHandoffRecord,
} from "../../utils/caregiverStorage";

import { CaregiverMemoryBankModal } from "./CaregiverMemoryBankModal";
import { CaregiverShiftHandoffModal } from "./CaregiverShiftHandoffModal";

export const CaregiverFamilyScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"circle" | "safezone" | "memory">("circle");

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [sentItems, setSentItems] = useState<FamilySentItem[]>([]);
  const [memoryItems, setMemoryItems] = useState<MemoryBankItem[]>([]);
  const [safeZone, setSafeZone] = useState<SafeZoneStatus | null>(null);
  const [shiftHandoff, setShiftHandoff] = useState<ShiftHandoffRecord | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const p = await caregiverStorage.getPatientProfile();
      const sent = await caregiverStorage.getFamilySentItems();
      const memories = await caregiverStorage.getMemoryBank();
      const sz = await caregiverStorage.getSafeZoneStatus();
      const sh = await caregiverStorage.getShiftHandoff();
      setProfile(p);
      setSentItems(sent);
      setMemoryItems(memories);
      setSafeZone(sz);
      setShiftHandoff(sh);
    } catch (e) {
      console.warn("Failed to load family screen data:", e);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCallNumber = (num: string) => {
    Linking.openURL(`tel:${num}`).catch(() => {
      Alert.alert("Dialing Error", `Could not automatically dial ${num}.`);
    });
  };

  const handleRingKioskChime = async () => {
    const res = await caregiverStorage.triggerKioskLocatorChime();
    Alert.alert("Locator Prompt Transmitted", res.message);
  };

  const handleBroadcastVillageAlert = async () => {
    Alert.alert(
      "Broadcast Village Suraksha Alert?",
      "This will notify ASHA worker Priya Das, local village guard patrol, and family speed dials with GPS coordinates.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Broadcast Alert",
          style: "destructive",
          onPress: async () => {
            await caregiverStorage.toggleSafeZoneAlert(true);
            const sz = await caregiverStorage.getSafeZoneStatus();
            setSafeZone(sz);
            Alert.alert("🚨 Village Broadcast Sent", "ASHA worker & Village Patrol have received the alert.");
          },
        },
      ]
    );
  };

  return (
    <View style={styles.screenWrapper}>
      {/* Aesthetic ambient backdrops */}
      <View style={styles.ambientAuraTop} pointerEvents="none" />
      <View style={styles.ambientAuraBottom} pointerEvents="none" />

      {/* ── SCREEN TITLE ─────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Care Circle & Safe Zone</Text>
        <Text style={styles.topBarSubtitle}>
          Multi-caregiver handoff, perimeter safety & emergency network
        </Text>
      </View>

      {/* ── 3-WAY SEGMENTED CONTROL ───────────────────────────────────── */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "circle" && styles.segmentBtnActive]}
          onPress={() => setActiveTab("circle")}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentBtnText, activeTab === "circle" && styles.segmentBtnTextActive]}>
            Care Circle
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "safezone" && styles.segmentBtnActive]}
          onPress={() => setActiveTab("safezone")}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentBtnText, activeTab === "safezone" && styles.segmentBtnTextActive]}>
            Safe Zone
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "memory" && styles.segmentBtnActive]}
          onPress={() => setActiveTab("memory")}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentBtnText, activeTab === "memory" && styles.segmentBtnTextActive]}>
            Heritage Archive
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── TAB CONTENT ──────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[WarmPalette.roseDusty]}
            tintColor={WarmPalette.roseDusty}
          />
        }
      >
        {/* ══════════ 1. CARE CIRCLE & SHIFT HANDOFF SUB-VIEW ══════════ */}
        {activeTab === "circle" && (
          <View>
            {/* ── 1. MULTI-CAREGIVER SHIFT HANDOFF MANAGER CARD ── */}
            <View style={styles.shiftManagerCard}>
              <View style={styles.shiftManagerHeader}>
                <View style={styles.shiftManagerIcon}>
                  <Feather name="repeat" size={20} color="#7C3AED" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.shiftManagerTitle}>Continuous Shift Handoff</Text>
                  <Text style={styles.shiftManagerSub}>
                    {shiftHandoff?.activeShift || "Daytime Shift"} · Logged by Anita
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.openHandoffBtn}
                  onPress={() => setShowShiftModal(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.openHandoffBtnText}>Manage</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.shiftStatsRow}>
                <View style={styles.shiftStatItem}>
                  <Text style={styles.shiftStatCount}>4/4</Text>
                  <Text style={styles.shiftStatLabel}>Day Tasks Done</Text>
                </View>
                <View style={styles.shiftStatDivider} />
                <View style={styles.shiftStatItem}>
                  <Text style={[styles.shiftStatCount, { color: "#EA580C" }]}>3</Text>
                  <Text style={styles.shiftStatLabel}>Night Tasks Due</Text>
                </View>
                <View style={styles.shiftStatDivider} />
                <View style={styles.shiftStatItem}>
                  <Text style={[styles.shiftStatCount, { color: "#16A34A" }]}>72 bpm</Text>
                  <Text style={styles.shiftStatLabel}>Resting HR</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.shiftActionBanner}
                onPress={() => setShowShiftModal(true)}
                activeOpacity={0.8}
              >
                <Feather name="edit-3" size={14} color="#7C3AED" />
                <Text style={styles.shiftActionBannerText} numberOfLines={1}>
                  Review tasks & handover to next guardian
                </Text>
                <Feather name="chevron-right" size={16} color="#7C3AED" />
              </TouchableOpacity>
            </View>

            {/* ── 2. FAMILY CAREGIVERS & GUARDIANS ── */}
            <View style={[styles.sectionHeaderRow, { marginTop: 16 }]}>
              <Text style={styles.sectionHeaderTitle}>FAMILY CAREGIVERS & HELPERS</Text>
            </View>

            <View style={styles.memberCard}>
              <View style={styles.memberAvatarCircle}>
                <Feather name="user-check" size={22} color="#059669" />
              </View>
              <View style={styles.memberContent}>
                <Text style={styles.memberName}>Anita Barman</Text>
                <Text style={styles.memberRole}>Daughter · Primary Guardian (Lives with elder)</Text>
                <Text style={styles.memberPhone}>+91 98765 43210</Text>
              </View>
              <TouchableOpacity
                style={styles.callIconBtn}
                onPress={() => handleCallNumber("+919876543210")}
                activeOpacity={0.8}
              >
                <Feather name="phone" size={18} color="#059669" />
              </TouchableOpacity>
            </View>

            <View style={styles.memberCard}>
              <View style={styles.memberAvatarCircle}>
                <Feather name="user" size={22} color="#2563EB" />
              </View>
              <View style={styles.memberContent}>
                <Text style={styles.memberName}>Rahul Barman</Text>
                <Text style={styles.memberRole}>Son · Remote Family Caregiver (Bengaluru)</Text>
                <Text style={styles.memberPhone}>+91 98450 12345</Text>
              </View>
              <TouchableOpacity
                style={styles.callIconBtn}
                onPress={() => handleCallNumber("+919845012345")}
                activeOpacity={0.8}
              >
                <Feather name="phone" size={18} color="#2563EB" />
              </TouchableOpacity>
            </View>

            <View style={styles.memberCard}>
              <View style={styles.memberAvatarCircle}>
                <Feather name="heart" size={22} color={WarmPalette.roseDusty} />
              </View>
              <View style={styles.memberContent}>
                <Text style={styles.memberName}>Priya Das</Text>
                <Text style={styles.memberRole}>Daytime Eldercare Attendant & ASHA Worker</Text>
                <Text style={styles.memberPhone}>+91 94350 98765</Text>
              </View>
              <TouchableOpacity
                style={styles.callIconBtn}
                onPress={() => handleCallNumber("+919435098765")}
                activeOpacity={0.8}
              >
                <Feather name="phone" size={18} color={WarmPalette.roseDusty} />
              </TouchableOpacity>
            </View>

            {/* Emergency Contacts Box */}
            <View style={[styles.sectionHeaderRow, { marginTop: 18 }]}>
              <Text style={styles.sectionHeaderTitle}>EMERGENCY DIRECT DIALS</Text>
            </View>

            <View style={styles.emergencyDirectRow}>
              <TouchableOpacity
                style={styles.directDialCard}
                onPress={() => handleCallNumber("112")}
                activeOpacity={0.8}
              >
                <Feather name="alert-triangle" size={22} color="#DC2626" />
                <Text style={styles.directDialTitle}>112</Text>
                <Text style={styles.directDialSub}>National SOS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.directDialCard}
                onPress={() => handleCallNumber("108")}
                activeOpacity={0.8}
              >
                <Feather name="activity" size={22} color="#EA580C" />
                <Text style={styles.directDialTitle}>108</Text>
                <Text style={styles.directDialSub}>Ambulance</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.directDialCard}
                onPress={() => handleCallNumber("14567")}
                activeOpacity={0.8}
              >
                <Feather name="shield" size={22} color="#2563EB" />
                <Text style={styles.directDialTitle}>14567</Text>
                <Text style={styles.directDialSub}>Elderline</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ══════════ 2. SAFE ZONE & GEOFENCE SUB-VIEW ══════════ */}
        {activeTab === "safezone" && (
          <View>
            <View style={styles.surakshaHubCard}>
              <View style={styles.surakshaHubHeader}>
                <View style={styles.surakshaHubIcon}>
                  <Feather name="shield" size={20} color="#16A34A" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.surakshaHubTitle}>Gramin Safe-Zone Geofence</Text>
                  <Text style={styles.surakshaHubSub}>
                    150m Home Perimeter · Kamrup Sector
                  </Text>
                </View>
                <View
                  style={[
                    styles.surakshaBadge,
                    safeZone?.activeAlert ? styles.badgeAlert : styles.badgeSafe,
                  ]}
                >
                  <Text
                    style={[
                      styles.surakshaBadgeText,
                      safeZone?.activeAlert ? styles.textAlert : styles.textSafe,
                    ]}
                  >
                    {safeZone?.activeAlert ? "WANDERING ALERT" : "SAFE AT HOME"}
                  </Text>
                </View>
              </View>

              <View style={styles.surakshaGrid}>
                <View style={styles.surakshaItem}>
                  <Text style={styles.surakshaItemTitle}>Courtyard</Text>
                  <Text style={styles.surakshaItemSub}>0 - 150m (Safe)</Text>
                </View>
                <View style={styles.surakshaItem}>
                  <Text style={styles.surakshaItemTitle}>Tea Gate</Text>
                  <Text style={styles.surakshaItemSub}>300m (Warning)</Text>
                </View>
                <View style={styles.surakshaItem}>
                  <Text style={styles.surakshaItemTitle}>River Road</Text>
                  <Text style={styles.surakshaItemSub}>600m (Alert)</Text>
                </View>
              </View>

              <View style={styles.surakshaActionsRow}>
                <TouchableOpacity
                  style={styles.surakshaChimeBtn}
                  onPress={handleRingKioskChime}
                  activeOpacity={0.8}
                >
                  <Feather name="volume-2" size={15} color="#2563EB" />
                  <Text style={styles.surakshaChimeText}>Ring Chime</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.surakshaSosBtn}
                  onPress={handleBroadcastVillageAlert}
                  activeOpacity={0.8}
                >
                  <Feather name="alert-octagon" size={15} color="#FFFFFF" />
                  <Text style={styles.surakshaSosText}>Village Alert</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Geofence Live Telemetry Status Card */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>PERIMETER TELEMETRY</Text>
            </View>

            <View style={styles.shiftManagerCard}>
              <View style={styles.shiftStatsRow}>
                <View style={styles.shiftStatItem}>
                  <Text style={[styles.shiftStatCount, { color: "#16A34A" }]}>
                    {safeZone?.distanceMeters || 14}m
                  </Text>
                  <Text style={styles.shiftStatLabel}>Distance from Home</Text>
                </View>
                <View style={styles.shiftStatDivider} />
                <View style={styles.shiftStatItem}>
                  <Text style={[styles.shiftStatCount, { color: "#2563EB" }]}>
                    {safeZone?.beaconBatteryPct || 94}%
                  </Text>
                  <Text style={styles.shiftStatLabel}>Beacon Battery</Text>
                </View>
                <View style={styles.shiftStatDivider} />
                <View style={styles.shiftStatItem}>
                  <Text style={[styles.shiftStatCount, { color: "#059669" }]}>Strong</Text>
                  <Text style={styles.shiftStatLabel}>GPS Signal</Text>
                </View>
              </View>

              <View style={{ marginTop: 12, padding: 12, backgroundColor: "#F8FAFC", borderRadius: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#1E293B" }}>
                  📍 Current Area: {safeZone?.currentLocationName || "Courtyard & Tea Veranda"}
                </Text>
                <Text style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                  🕒 {safeZone?.lastMovementTime || "Active 2 mins ago"} · Automatic 150m boundary monitor
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ══════════ 3. HERITAGE ARCHIVE & MEMORY BANK SUB-VIEW ══════════ */}
        {activeTab === "memory" && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>FAMILY MEMORY ALBUMS & STORIES</Text>
              <TouchableOpacity
                style={styles.addMemoryPill}
                onPress={() => setShowMemoryModal(true)}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={14} color={WarmPalette.roseDusty} />
                <Text style={styles.addMemoryPillText}>Add Memory</Text>
              </TouchableOpacity>
            </View>

            {memoryItems.length > 0 ? (
              <View style={styles.memoryGrid}>
                {memoryItems.map((m) => (
                  <View key={m.id} style={styles.memoryCard}>
                    <View style={styles.memoryTagRow}>
                      <Text style={styles.memoryCategory}>{m.category.toUpperCase()}</Text>
                      <Text style={styles.memoryDate}>{m.yearOrDate || ""}</Text>
                    </View>
                    <Text style={styles.memoryTitle}>{m.title}</Text>
                    <Text style={styles.memoryDesc}>{m.description}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyLiveCard}>
                <View style={styles.emptyLiveHeader}>
                  <Feather name="book-open" size={18} color="#7C3AED" />
                  <Text style={styles.emptyLiveTitle}>Memory Bank Empty</Text>
                </View>
                <Text style={styles.emptyLiveSub}>
                  Tap "+ Add Memory" to preserve cherished family stories, ancestral hometowns, and special life memories.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── MODALS ─────────────────────────────────────────────────── */}

      <CaregiverMemoryBankModal
        visible={showMemoryModal}
        onClose={() => setShowMemoryModal(false)}
        elderName={profile?.name || "Bhaben Barman"}
      />

      <CaregiverShiftHandoffModal
        visible={showShiftModal}
        onClose={() => setShowShiftModal(false)}
        onSaved={loadData}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: AestheticTheme.canvas,
    position: "relative",
  },
  ambientAuraTop: {
    position: "absolute",
    top: -50,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: AestheticTheme.ambientLavender,
  },
  ambientAuraBottom: {
    position: "absolute",
    bottom: 90,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: AestheticTheme.ambientRose,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
    letterSpacing: -0.3,
  },
  topBarSubtitle: {
    fontSize: 13,
    color: WarmPalette.charcoalWarm + "85",
    marginTop: 2,
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: AestheticTheme.pillTrack,
    borderRadius: 16,
    padding: 4,
    marginHorizontal: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 12,
  },
  segmentBtnActive: {
    backgroundColor: AestheticTheme.pillActive,
    shadowColor: "#C2747C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: WarmPalette.charcoalWarm,
  },
  segmentBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 110,
  },
  heroSendCard: {
    backgroundColor: AestheticTheme.cardSurface,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: AestheticTheme.cardBorder,
    padding: 16,
    marginBottom: 14,
    ...AestheticTheme.cardShadow,
  },
  heroTextGroup: {
    marginBottom: 12,
  },
  heroSendTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
  },
  heroSendSub: {
    fontSize: 12.5,
    color: WarmPalette.charcoalWarm + "85",
    marginTop: 4,
    lineHeight: 18,
  },
  heroSendActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: WarmPalette.roseDusty,
    paddingVertical: 12,
    borderRadius: 12,
  },
  heroSendActionBtnText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  triggersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  triggerCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: AestheticTheme.cardSurface,
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: AestheticTheme.cardBorder,
    padding: 14,
    alignItems: "center",
    ...AestheticTheme.cardShadow,
  },
  triggerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  triggerTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
  },
  triggerDesc: {
    fontSize: 11.5,
    color: WarmPalette.charcoalWarm + "80",
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm + "75",
    letterSpacing: 0.8,
  },
  addMemoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: WarmPalette.peach + "70",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  addMemoryPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: WarmPalette.roseDusty,
  },
  listSection: {
    gap: 10,
  },
  sentItemCard: {
    backgroundColor: AestheticTheme.cardSurface,
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: AestheticTheme.cardBorder,
    padding: 14,
    ...AestheticTheme.cardShadow,
  },
  sentItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sentTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sentType: {
    fontSize: 12,
    fontWeight: "800",
    color: "#16A34A",
  },
  sentTime: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm + "75",
    fontWeight: "600",
  },
  sentContent: {
    fontSize: 13.5,
    color: WarmPalette.charcoalWarm,
    lineHeight: 20,
  },
  sentStatusBadge: {
    marginTop: 8,
  },
  sentStatusText: {
    fontSize: 11.5,
    color: WarmPalette.charcoalWarm + "80",
    fontWeight: "600",
  },
  sentThumbnail: {
    width: "100%",
    height: 140,
    borderRadius: 10,
    marginVertical: 8,
  },
  liveMirrorCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#BBF7D0",
    padding: 14,
    marginBottom: 14,
  },
  liveMirrorHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  liveMirrorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#16A34A",
    marginRight: 8,
  },
  liveMirrorTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
  },
  liveMirrorBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  liveMirrorBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
  },
  liveScreenPreviewBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    padding: 12,
    alignItems: "center",
  },
  liveScreenGreeting: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
    marginBottom: 8,
  },
  liveActiveItem: {
    width: "100%",
    alignItems: "center",
  },
  liveActiveImage: {
    width: "100%",
    height: 160,
    borderRadius: 10,
    marginBottom: 8,
  },
  liveItemTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 4,
  },
  liveItemContent: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 6,
  },
  liveItemSender: {
    fontSize: 11.5,
    color: "#94A3B8",
    fontWeight: "600",
  },
  liveScreenEmpty: {
    fontSize: 13,
    color: "#94A3B8",
    fontStyle: "italic",
    paddingVertical: 12,
  },
  memoryGrid: {
    gap: 10,
  },
  memoryCard: {
    backgroundColor: AestheticTheme.cardSurface,
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: AestheticTheme.cardBorder,
    padding: 14,
    ...AestheticTheme.cardShadow,
  },
  memoryTagRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  memoryCategory: {
    fontSize: 11,
    fontWeight: "800",
    color: WarmPalette.roseDusty,
  },
  memoryDate: {
    fontSize: 11,
    color: WarmPalette.charcoalWarm + "75",
    fontWeight: "600",
  },
  memoryTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
  },
  memoryDesc: {
    fontSize: 13,
    color: WarmPalette.charcoalWarm + "90",
    marginTop: 3,
    lineHeight: 19,
  },
  shiftManagerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#DDD6FE",
    padding: 16,
    marginBottom: 14,
    gap: 12,
  },
  shiftManagerHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  shiftManagerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  shiftManagerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
  },
  shiftManagerSub: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm + "85",
    marginTop: 1,
  },
  openHandoffBtn: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  openHandoffBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  shiftStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: WarmPalette.cream,
    borderRadius: 12,
    paddingVertical: 10,
  },
  shiftStatItem: {
    alignItems: "center",
  },
  shiftStatCount: {
    fontSize: 16,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
  },
  shiftStatLabel: {
    fontSize: 10.5,
    color: WarmPalette.charcoalWarm + "75",
    marginTop: 2,
    fontWeight: "600",
  },
  shiftStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: WarmPalette.sand,
  },
  shiftActionBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FAF5FF",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EDE9FE",
  },
  shiftActionBannerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6D28D9",
    flex: 1,
    marginHorizontal: 8,
  },
  surakshaHubCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#DCFCE7",
    padding: 16,
    marginBottom: 14,
    gap: 12,
  },
  surakshaHubHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  surakshaHubIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
  },
  surakshaHubTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
  },
  surakshaHubSub: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm + "85",
    marginTop: 1,
  },
  surakshaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeSafe: {
    backgroundColor: "#DCFCE7",
  },
  badgeAlert: {
    backgroundColor: "#FEE2E2",
  },
  surakshaBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  textSafe: {
    color: "#166534",
  },
  textAlert: {
    color: "#DC2626",
  },
  surakshaGrid: {
    flexDirection: "row",
    gap: 6,
  },
  surakshaItem: {
    flex: 1,
    backgroundColor: WarmPalette.cream,
    borderRadius: 10,
    padding: 8,
    alignItems: "center",
  },
  surakshaItemTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
    textAlign: "center",
  },
  surakshaItemSub: {
    fontSize: 10,
    color: WarmPalette.charcoalWarm + "75",
    marginTop: 2,
    textAlign: "center",
  },
  surakshaActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  surakshaChimeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  surakshaChimeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2563EB",
  },
  surakshaSosBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC2626",
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  surakshaSosText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WarmPalette.cream,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: WarmPalette.sand,
    padding: 14,
    marginBottom: 10,
  },
  memberAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: WarmPalette.sand + "60",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  memberContent: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
  },
  memberRole: {
    fontSize: 12.5,
    color: WarmPalette.charcoalWarm + "85",
    marginTop: 2,
  },
  memberPhone: {
    fontSize: 12,
    color: WarmPalette.roseDusty,
    marginTop: 3,
    fontWeight: "700",
  },
  callIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: WarmPalette.sand + "60",
    alignItems: "center",
    justifyContent: "center",
  },
  emergencyDirectRow: {
    flexDirection: "row",
    gap: 10,
  },
  directDialCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: WarmPalette.cream,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: WarmPalette.sand,
    paddingVertical: 14,
    gap: 6,
  },
  directDialTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
  },
  directDialSub: {
    fontSize: 11.5,
    fontWeight: "600",
    color: WarmPalette.charcoalWarm + "80",
  },
  emptyLiveCard: {
    backgroundColor: WarmPalette.cream,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WarmPalette.sand,
    borderStyle: "dashed",
    padding: 22,
    alignItems: "center",
    marginVertical: 6,
  },
  emptyLiveHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  emptyLiveTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: WarmPalette.charcoalWarm,
  },
  emptyLiveSub: {
    fontSize: 12,
    color: WarmPalette.charcoalWarm + "90",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 12,
  },
});
