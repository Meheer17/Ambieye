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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Patient, doctorService } from "@/services/api/doctorService";
import {
  DoctorQuery,
  doctorQueryService,
} from "@/services/api/doctorQueryService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors, Shadows, BorderRadius } from "@/constants/theme";

export default function DoctorDashboard() {
  const { username } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [queries, setQueries] = useState<DoctorQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patientError, setPatientError] = useState("");
  const [queryError, setQueryError] = useState("");

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
    }, [fetchData]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
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
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
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
          <View>
            <Text style={styles.welcomeText}>Good day,</Text>
            <Text style={styles.doctorName}>Dr. {username} 👋</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => router.push("/settings")}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {username?.toString().charAt(0).toUpperCase() || "D"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push("/patients")}>
            <View style={[styles.statIconBg, { backgroundColor: 'rgba(14, 165, 233, 0.2)' }]}>
              <FontAwesome name="users" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.statNumber}>{patients.length}</Text>
            <Text style={styles.statLabel}>Patients</Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity style={styles.statCard} onPress={() => router.push("/queries")}>
            <View style={[styles.statIconBg, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
              <Feather name="message-circle" size={18} color={Colors.error} />
            </View>
            <Text style={[styles.statNumber, { color: '#FCA5A5' }]}>{queries.length}</Text>
            <Text style={styles.statLabel}>Pending Queries</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsSection}>
        <Text style={styles.quickActionsTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push("/patients")}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#EFF6FF' }]}>
              <FontAwesome name="users" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.quickActionText}>Patients</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push("/queries")}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#FEF2F2' }]}>
              <Feather name="message-circle" size={20} color={Colors.error} />
            </View>
            <Text style={styles.quickActionText}>Queries</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push("/settings")}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#F5F3FF' }]}>
              <Feather name="settings" size={20} color={Colors.secondary} />
            </View>
            <Text style={styles.quickActionText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Patients Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Patients</Text>
        <TouchableOpacity style={styles.seeAllBtn} onPress={() => router.push("/patients")}>
          <Text style={styles.seeAllLink}>See All</Text>
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
            onPress={() => router.push("/patients")}
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
          <View style={[styles.emptyIconBg, { backgroundColor: '#EFF6FF' }]}>
            <Feather name="users" size={24} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No patients yet</Text>
          <Text style={styles.emptySubText}>
            Patients will appear here once they connect with you
          </Text>
        </View>
      )}

      {/* Queries Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Pending Queries</Text>
        <TouchableOpacity style={styles.seeAllBtn} onPress={() => router.push("/queries")}>
          <Text style={styles.seeAllLink}>See All</Text>
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
              onPress={() => router.push({ pathname: "/query/[id]", params: { id: query.id } })}
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
          <View style={[styles.emptyIconBg, { backgroundColor: '#ECFDF5' }]}>
            <Feather name="check-circle" size={24} color={Colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySubText}>No pending queries right now</Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>AmbiEye © {new Date().getFullYear()}</Text>
      </View>
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
    marginTop: 8,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textLight,
  },
});
