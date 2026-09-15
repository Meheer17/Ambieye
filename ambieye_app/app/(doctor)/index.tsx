import React, { useState, useCallback, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { useFocusEffect, useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Patient, doctorService } from "@/services/api/doctorService";
import {
  DoctorQuery,
  doctorQueryService,
} from "@/services/api/doctorQueryService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors, Shadows, BorderRadius } from "@/constants/theme";
import { useTranslation, SupportedLanguage } from "@/constants/i18n";
import AshaCognitiveScreener from "@/components/AshaCognitiveScreener";
import {
  dementiaCareStorage,
  AshaScreeningRecord,
  DementiaStage,
} from "@/utils/dementiaCareStorage";

const VILLAGE_PATIENTS = [
  {
    id: "pat-1",
    name: "Bhaben Barman",
    age: 72,
    gender: "Male",
    village: "Hajo Rural Sector, Assam",
    lastScreened: "3 days ago",
    score: 22,
    stage: "stage_mci" as DementiaStage,
    statusLabel: "MCI Risk (22/30)",
    badgeColor: "#F59E0B",
  },
  {
    id: "pat-2",
    name: "Renuka Devi",
    age: 68,
    gender: "Female",
    village: "Sualkuchi Silk Village, Assam",
    lastScreened: "2 weeks ago",
    score: 27,
    stage: "stage_normal" as DementiaStage,
    statusLabel: "Normal Cognition (27/30)",
    badgeColor: "#10B981",
  },
  {
    id: "pat-3",
    name: "Jogesh Kalita",
    age: 75,
    gender: "Male",
    village: "Mirza Rural Block, Assam",
    lastScreened: "Yesterday",
    score: 16,
    stage: "stage_moderate" as DementiaStage,
    statusLabel: "Moderate Dementia (16/30)",
    badgeColor: "#EF4444",
  },
  {
    id: "pat-4",
    name: "Minati Borah",
    age: 70,
    gender: "Female",
    village: "Baihata Chariali, Assam",
    lastScreened: "Not screened yet",
    score: 0,
    stage: "stage_mci" as DementiaStage,
    statusLabel: "Pending Initial Screening",
    badgeColor: "#6B7280",
  },
];

export default function DoctorDashboard() {
  const { username } = useAuth();
  const router = useRouter();
  const { t, currentLang, changeLanguage, supportedLanguages } = useTranslation();
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [queries, setQueries] = useState<DoctorQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patientError, setPatientError] = useState("");
  const [queryError, setQueryError] = useState("");

  // ASHA vs Specialist mode state
  const [doctorMode, setDoctorMode] = useState<"specialist" | "asha">("specialist");
  const [ashaScreenerVisible, setAshaScreenerVisible] = useState(false);
  const [selectedPatientForScreening, setSelectedPatientForScreening] = useState<{ id: string; name: string } | null>(null);
  const [screeningRecords, setScreeningRecords] = useState<AshaScreeningRecord[]>([]);

  const lastFetchTimeRef = useRef<number>(0);
  const CACHE_DURATION = 10 * 60 * 1000;
  const CACHE_KEY_PATIENTS = "doctor_dashboard_patients";
  const CACHE_KEY_QUERIES = "doctor_dashboard_queries";
  const CACHE_KEY_TIMESTAMP = "doctor_dashboard_timestamp";

  const loadCachedData = async () => {
    try {
      const timestamp = await AsyncStorage.getItem(CACHE_KEY_TIMESTAMP);
      const cachedPatients = await AsyncStorage.getItem(CACHE_KEY_PATIENTS);
      const cachedQueries = await AsyncStorage.getItem(CACHE_KEY_QUERIES);
      if (timestamp && cachedPatients && cachedQueries) {
        lastFetchTimeRef.current = parseInt(timestamp, 10);
        setPatients(JSON.parse(cachedPatients));
        setQueries(JSON.parse(cachedQueries));
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const cacheData = async (patients: Patient[], queries: DoctorQuery[]) => {
    try {
      const now = Date.now();
      await AsyncStorage.setItem(CACHE_KEY_TIMESTAMP, now.toString());
      await AsyncStorage.setItem(CACHE_KEY_PATIENTS, JSON.stringify(patients));
      await AsyncStorage.setItem(CACHE_KEY_QUERIES, JSON.stringify(queries));
      lastFetchTimeRef.current = now;
    } catch (error) {}
  };

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      const shouldFetchFromServer = () => {
        const now = Date.now();
        return now - lastFetchTimeRef.current > CACHE_DURATION;
      };
      setLoading(true);

      if (!forceRefresh) {
        const hasCachedData = await loadCachedData();
        if (hasCachedData && !shouldFetchFromServer()) {
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }

      try {
        const patientResponse = await doctorService.getPatients();
        if (patientResponse.success) {
          setPatients(patientResponse.patients);
          setPatientError("");
        } else {
          setPatientError(patientResponse.message);
        }

        const queryResponse = await doctorQueryService.getAllQueries("pending", false);
        if (queryResponse.success) {
          setQueries(queryResponse.queries);
          setQueryError("");
          if (patientResponse.success && queryResponse.success) {
            cacheData(patientResponse.patients, queryResponse.queries);
          }
        } else {
          setQueryError(queryResponse.message);
        }
      } catch (error) {
        console.error("Dashboard data fetch error:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [CACHE_DURATION],
  );

  useFocusEffect(
    useCallback(() => {
      fetchData();

      // Check if ASHA mode is active or user is asha_worker
      const syncAshaMode = async () => {
        try {
          const savedMode = await AsyncStorage.getItem("ambieye_active_mode");
          if (savedMode === "asha" || username?.toLowerCase().includes("asha")) {
            setDoctorMode("asha");
          } else {
            setDoctorMode("specialist");
          }
          const records = await dementiaCareStorage.getScreeningRecords();
          setScreeningRecords(records);
        } catch {}
      };
      syncAshaMode();
    }, [fetchData, username]),
  );

  const handleSwitchDoctorMode = async (mode: "specialist" | "asha") => {
    setDoctorMode(mode);
    await AsyncStorage.setItem("ambieye_active_mode", mode);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
    dementiaCareStorage.getScreeningRecords().then(setScreeningRecords);
  };

  const getStatusColor = (urgency?: string) => {
    switch (urgency) {
      case "high": return Colors.error;
      case "medium": return Colors.warning;
      default: return Colors.accent;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t("today");
    if (diffDays === 1) return t("yesterday");
    if (diffDays < 7) return `${diffDays} ${t("days_ago")}`;
    return date.toLocaleDateString();
  };

  const currentLangObj = supportedLanguages.find((l) => l.code === currentLang) || supportedLanguages[0];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{t("checking_connection")}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }} edges={["top"]}>
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }
    >
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBg1} />
        <View style={styles.headerBg2} />
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeText}>
              {doctorMode === "asha" ? "নমস্কাৰ / Welcome" : t("good_day")}
            </Text>
            <Text style={styles.doctorName}>
              {doctorMode === "asha" ? "Priya Das 🩺" : `Dr. ${username} 👨‍⚕️`}
            </Text>
            <Text style={styles.roleSubtitle}>
              {doctorMode === "asha"
                ? "ASHA Community Health Worker • Kamrup Rural Sector 4"
                : "Geriatric Neurology & Eye Tracking Diagnostics"}
            </Text>
          </View>

          {/* Roles Quick Switcher */}
          <TouchableOpacity
            style={styles.rolesPill}
            onPress={() => router.push("/user-type")}
            activeOpacity={0.8}
          >
            <Feather name="repeat" size={12} color="#94A3B8" />
            <Text style={styles.rolesPillText}>Roles</Text>
          </TouchableOpacity>

          {/* Language Switcher */}
          <TouchableOpacity
            style={styles.langPill}
            onPress={() => setLangModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.langPillEmoji}>{currentLangObj.flagEmoji}</Text>
            <Text style={styles.langPillText}>{currentLangObj.nativeName}</Text>
            <Feather name="chevron-down" size={13} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => router.push("/(doctor)/settings")}
          >
            <View
              style={[
                styles.avatarCircle,
                doctorMode === "asha" && { backgroundColor: "#10B981" },
              ]}
            >
              <Text style={styles.avatarText}>
                {doctorMode === "asha" ? "A" : username?.toString().charAt(0).toUpperCase() || "D"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Mode Switcher (ASHA Screener vs Specialist Clinical) ─ */}
        <View style={styles.modeSwitcherContainer}>
          <TouchableOpacity
            style={[styles.modeBtn, doctorMode === "asha" && styles.modeBtnActiveAsha]}
            onPress={() => handleSwitchDoctorMode("asha")}
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 13 }}>🩺</Text>
            <Text style={[styles.modeBtnText, doctorMode === "asha" && styles.modeBtnTextActive]}>
              ASHA Screener
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeBtn, doctorMode === "specialist" && styles.modeBtnActiveDoc]}
            onPress={() => handleSwitchDoctorMode("specialist")}
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 13 }}>👨‍⚕️</Text>
            <Text style={[styles.modeBtnText, doctorMode === "specialist" && styles.modeBtnTextActive]}>
              Specialist Clinical
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        {doctorMode === "asha" ? (
          <View style={styles.ashaStatsGrid}>
            <View style={styles.ashaStatItem}>
              <Text style={styles.ashaStatVal}>28</Text>
              <Text style={styles.ashaStatLbl}>Village Seniors</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.ashaStatItem}>
              <Text style={[styles.ashaStatVal, { color: "#34D399" }]}>22</Text>
              <Text style={styles.ashaStatLbl}>Screened</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.ashaStatItem}>
              <Text style={[styles.ashaStatVal, { color: "#FBBF24" }]}>5</Text>
              <Text style={styles.ashaStatLbl}>MCI Risk</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.ashaStatItem}>
              <Text style={[styles.ashaStatVal, { color: "#F87171" }]}>2</Text>
              <Text style={styles.ashaStatLbl}>Referred</Text>
            </View>
          </View>
        ) : (
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statCard} onPress={() => router.push("/(doctor)/patients")}>
              <View style={[styles.statIconBg, { backgroundColor: "rgba(14, 165, 233, 0.2)" }]}>
                <FontAwesome name="users" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.statNumber}>{patients.length}</Text>
              <Text style={styles.statLabel}>{t("tab_patients")}</Text>
            </TouchableOpacity>

            <View style={styles.statDivider} />

            <TouchableOpacity style={styles.statCard} onPress={() => router.push("/(doctor)/queries")}>
              <View style={[styles.statIconBg, { backgroundColor: "rgba(239, 68, 68, 0.2)" }]}>
                <Feather name="message-circle" size={18} color={Colors.error} />
              </View>
              <Text style={[styles.statNumber, { color: "#FCA5A5" }]}>{queries.length}</Text>
              <Text style={styles.statLabel}>{t("pending_queries_count")}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 1. ASHA COMMUNITY HEALTH WORKER SCREENER DASHBOARD                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {doctorMode === "asha" && (
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          {/* Offline Sync Banner */}
          <View style={styles.offlineSyncPill}>
            <Feather name="check-circle" size={15} color="#10B981" />
            <Text style={styles.offlineSyncText}>
              12 Village Screening Records Cached Offline • Kamrup Sector
            </Text>
          </View>

          {/* MMSE Hero Card */}
          <View style={styles.mmseHeroCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <View style={styles.mmseBadge}>
                <Text style={styles.mmseBadgeText}>📋 Standardized 30-Pt Assessment</Text>
              </View>
            </View>
            <Text style={styles.mmseHeroTitle}>Mini-Mental State Exam (MMSE)</Text>
            <Text style={styles.mmseHeroSub}>
              Culturally-adapted dementia screening with audio instructions in Assamese, Bengali, Bodo, Hindi, and English.
            </Text>

            <TouchableOpacity
              style={styles.launchScreenerBtn}
              onPress={() => {
                setSelectedPatientForScreening(null);
                setAshaScreenerVisible(true);
              }}
              activeOpacity={0.85}
            >
              <Feather name="clipboard" size={20} color="#FFFFFF" />
              <Text style={styles.launchScreenerBtnText}>Launch Cognitive Screening Test</Text>
            </TouchableOpacity>
          </View>

          {/* Village Elderly Cohort & Screening Schedule */}
          <View style={[styles.sectionHeader, { paddingHorizontal: 0, marginTop: 24 }]}>
            <View>
              <Text style={styles.sectionTitle}>Village Elderly Cohort (28)</Text>
              <Text style={{ fontSize: 12, color: "#64748B" }}>
                Kamrup Rural Health Block • Home Visit Roster
              </Text>
            </View>
          </View>

          {VILLAGE_PATIENTS.map((p) => (
            <View key={p.id} style={styles.villagePatientCard}>
              <View style={styles.villagePatientTop}>
                <View style={[styles.villageAvatar, { backgroundColor: `${p.badgeColor}20` }]}>
                  <Text style={[styles.villageAvatarText, { color: p.badgeColor }]}>
                    {p.name.charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.villagePatientName}>{p.name}</Text>
                  <Text style={styles.villagePatientMeta}>
                    {p.age} yrs • {p.gender} • {p.village}
                  </Text>
                </View>
                <View style={[styles.stageBadge, { backgroundColor: `${p.badgeColor}20`, borderColor: p.badgeColor }]}>
                  <Text style={[styles.stageBadgeText, { color: p.badgeColor }]}>
                    {p.statusLabel}
                  </Text>
                </View>
              </View>

              <View style={styles.villagePatientBottom}>
                <Text style={styles.lastVisitText}>
                  🕒 Last assessed: {p.lastScreened}
                </Text>
                <TouchableOpacity
                  style={styles.screenPatientBtn}
                  onPress={() => {
                    setSelectedPatientForScreening({ id: p.id, name: p.name });
                    setAshaScreenerVisible(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Feather name="edit" size={14} color="#FFFFFF" />
                  <Text style={styles.screenPatientBtnText}>Screen (MMSE)</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Recent Screening Records */}
          {screeningRecords.length > 0 && (
            <View style={{ marginTop: 20, marginBottom: 20 }}>
              <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>
                Recent Completed Screenings
              </Text>
              {screeningRecords.slice(0, 3).map((rec) => (
                <View key={rec.id} style={styles.recordItemCard}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={styles.recordPatientName}>{rec.patientName}</Text>
                    <Text style={styles.recordScoreBadge}>Score: {rec.totalScore}/30</Text>
                  </View>
                  <Text style={styles.recordDateText}>{rec.date} • Assessed by {rec.screenerName}</Text>
                  {rec.notes ? (
                    <Text style={styles.recordNotes}>"{rec.notes}"</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          {/* Escalation to Neurologist */}
          <View style={styles.escalationCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={styles.escalationIconBg}>
                <Feather name="send" size={20} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.escalationTitle}>Direct Escalation to Neurologist</Text>
                <Text style={styles.escalationSub}>
                  Refer patients scoring below 24/30 directly to Dr. Mahit Sharma (GNRC Neurology)
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.escalationActionBtn}
              onPress={() => router.push("/(doctor)/queries")}
              activeOpacity={0.85}
            >
              <Text style={styles.escalationActionBtnText}>Send Urgent Specialist Query</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 2. SPECIALIST NEUROLOGIST CLINICAL DASHBOARD                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {doctorMode === "specialist" && (
        <>
          {/* Quick Actions */}
          <View style={styles.quickActionsSection}>
            <Text style={styles.quickActionsTitle}>{t("quick_actions")}</Text>
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push("/(doctor)/patients")}>
                <View style={[styles.quickActionIcon, { backgroundColor: "#EFF6FF" }]}>
                  <FontAwesome name="users" size={20} color={Colors.primary} />
                </View>
                <Text style={styles.quickActionText}>{t("tab_patients")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push("/(doctor)/queries")}>
                <View style={[styles.quickActionIcon, { backgroundColor: "#FEF2F2" }]}>
                  <Feather name="message-circle" size={20} color={Colors.error} />
                </View>
                <Text style={styles.quickActionText}>{t("tab_queries")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push("/(doctor)/settings")}>
                <View style={[styles.quickActionIcon, { backgroundColor: "#F5F3FF" }]}>
                  <Feather name="settings" size={20} color={Colors.secondary} />
                </View>
                <Text style={styles.quickActionText}>{t("tab_profile")}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Patients Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("recent_patients")}</Text>
            <TouchableOpacity style={styles.seeAllBtn} onPress={() => router.push("/(doctor)/patients")}>
              <Text style={styles.seeAllLink}>{t("see_all")}</Text>
              <Feather name="chevron-right" size={14} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {patientError ? (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{patientError}</Text>
            </View>
          ) : patients.length > 0 ? (
            patients.slice(0, 3).map((patient) => (
              <TouchableOpacity
                key={patient.id}
                style={styles.patientCard}
                onPress={() => router.push("/(doctor)/patients")}
                activeOpacity={0.85}
              >
                <View style={[
                  styles.patientAvatar,
                  { backgroundColor: patient.gender === "Female" ? Colors.secondary : Colors.primary },
                ]}>
                  <Text style={styles.avatarInitial}>
                    {patient.fullName?.charAt(0) || "P"}
                  </Text>
                </View>
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{patient.fullName}</Text>
                  <View style={styles.patientMeta}>
                    <Text style={styles.patientMetaText}>
                      {patient.age || "N/A"} yrs • {patient.gender || "N/A"}
                    </Text>
                    {patient.lastVisitDate && (
                      <View style={styles.dateBadge}>
                        <Text style={styles.dateBadgeText}>
                          {getTimeAgo(patient.lastVisitDate)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <Feather name="chevron-right" size={16} color={Colors.textLight} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <View style={[styles.emptyIconBg, { backgroundColor: "#EFF6FF" }]}>
                <Feather name="users" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>{t("no_patients_yet")}</Text>
              <Text style={styles.emptySubText}>{t("no_patients_desc")}</Text>
            </View>
          )}

          {/* Queries Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("pending_queries_count")}</Text>
            <TouchableOpacity style={styles.seeAllBtn} onPress={() => router.push("/(doctor)/queries")}>
              <Text style={styles.seeAllLink}>{t("see_all")}</Text>
              <Feather name="chevron-right" size={14} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {queryError ? (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{queryError}</Text>
            </View>
          ) : queries.length > 0 ? (
            <View style={styles.queriesGrid}>
              {queries.slice(0, 4).map((query) => (
                <TouchableOpacity
                  key={query.id}
                  style={styles.queryCard}
                  onPress={() => router.push("/(doctor)/queries")}
                  activeOpacity={0.85}
                >
                  <View style={styles.queryCardTop}>
                    <View style={[styles.urgencyDot, { backgroundColor: getStatusColor(query.urgency) }]} />
                    <Text style={styles.queryDate}>{getTimeAgo(query.createdAt)}</Text>
                  </View>
                  <Text style={styles.queryTitle} numberOfLines={2}>
                    {query.question}
                  </Text>
                  <View style={styles.queryPatientRow}>
                    <View style={styles.queryPatientAvatar}>
                      <Text style={styles.queryPatientAvatarText}>
                        {query.patientName?.charAt(0) || "P"}
                      </Text>
                    </View>
                    <Text style={styles.queryPatientName} numberOfLines={1}>
                      {query.patientName}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <View style={[styles.emptyIconBg, { backgroundColor: "#ECFDF5" }]}>
                <Feather name="check-circle" size={24} color={Colors.accent} />
              </View>
              <Text style={styles.emptyTitle}>{t("all_caught_up")}</Text>
              <Text style={styles.emptySubText}>{t("no_pending_queries_desc")}</Text>
            </View>
          )}
        </>
      )}

      {/* ASHA Cognitive Screener Modal */}
      <AshaCognitiveScreener
        visible={ashaScreenerVisible}
        onClose={() => setAshaScreenerVisible(false)}
        patientId={selectedPatientForScreening?.id || "pat-1"}
        patientName={selectedPatientForScreening?.name || "Bhaben Barman"}
        onSaveSuccess={(newRecord) => {
          setScreeningRecords((prev) => [newRecord, ...prev]);
          setAshaScreenerVisible(false);
          Alert.alert(
            "Screening Saved",
            `Assessment saved for ${newRecord.patientName}. Score: ${newRecord.totalScore}/30.`
          );
        }}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t("platform_footer")}</Text>
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
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  header: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  headerBg1: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: Colors.primary,
    opacity: 0.08,
    top: -80,
    right: -60,
  },
  headerBg2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: Colors.secondary,
    opacity: 0.06,
    bottom: -40,
    left: -30,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  welcomeText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    marginBottom: 4,
  },
  doctorName: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  avatarButton: {},
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 16,
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  quickActionsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: "row",
    gap: 12,
  },
  quickActionBtn: {
    flex: 1,
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 16,
    ...Shadows.sm,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAllLink: {
    color: Colors.primary,
    fontWeight: "600",
    fontSize: 13,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    padding: 14,
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    flex: 1,
  },
  patientCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    ...Shadows.sm,
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  avatarInitial: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  patientMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  patientMetaText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  dateBadge: {
    backgroundColor: Colors.divider,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dateBadgeText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 12,
    ...Shadows.sm,
  },
  emptyIconBg: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  queriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    marginBottom: 8,
    gap: 10,
  },
  queryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    width: "47%",
    ...Shadows.sm,
  },
  queryCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  urgencyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  queryDate: {
    fontSize: 11,
    color: Colors.textLight,
    fontWeight: "500",
  },
  queryTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    lineHeight: 18,
    marginBottom: 12,
    flex: 1,
  },
  queryPatientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  queryPatientAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0F172A',
    justifyContent: "center",
    alignItems: "center",
  },
  queryPatientAvatarText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  queryPatientName: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
    flex: 1,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: "center",
  },
  langPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    marginRight: 10,
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
  roleSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 2,
  },
  modeSwitcherContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    marginTop: 4,
    gap: 6,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  modeBtnActiveAsha: {
    backgroundColor: "#10B981",
  },
  modeBtnActiveDoc: {
    backgroundColor: Colors.primary,
  },
  modeBtnText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  modeBtnTextActive: {
    color: "#FFFFFF",
  },
  ashaStatsGrid: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  ashaStatItem: {
    flex: 1,
    alignItems: "center",
  },
  ashaStatVal: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  ashaStatLbl: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "600",
    marginTop: 2,
    textAlign: "center",
  },
  offlineSyncPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  offlineSyncText: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  mmseHeroCard: {
    backgroundColor: "#064E3B",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#059669",
    marginBottom: 8,
    ...Shadows.md,
  },
  mmseBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mmseBadgeText: {
    color: "#A7F3D0",
    fontSize: 11,
    fontWeight: "700",
  },
  mmseHeroTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },
  mmseHeroSub: {
    color: "#D1FAE5",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  launchScreenerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    ...Shadows.sm,
  },
  launchScreenerBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  villagePatientCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...Shadows.sm,
  },
  villagePatientTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  villageAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  villageAvatarText: {
    fontSize: 18,
    fontWeight: "800",
  },
  villagePatientName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  villagePatientMeta: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  stageBadge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stageBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  villagePatientBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  lastVisitText: {
    fontSize: 12,
    color: "#64748B",
  },
  screenPatientBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 5,
  },
  screenPatientBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  recordItemCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  recordPatientName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  recordScoreBadge: {
    fontSize: 12,
    fontWeight: "800",
    color: "#10B981",
  },
  recordDateText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  recordNotes: {
    fontSize: 12,
    color: "#334155",
    fontStyle: "italic",
    marginTop: 6,
  },
  escalationCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginTop: 8,
    marginBottom: 20,
    gap: 12,
  },
  escalationIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
  },
  escalationTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E40AF",
  },
  escalationSub: {
    fontSize: 12,
    color: "#3B82F6",
    marginTop: 2,
  },
  escalationActionBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  escalationActionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  rolesPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  rolesPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#CBD5E1",
  },
});
