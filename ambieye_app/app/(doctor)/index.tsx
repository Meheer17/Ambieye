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
  Dimensions,
} from "react-native";
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

export default function DoctorDashboard() {
  const { username } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [queries, setQueries] = useState<DoctorQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patientError, setPatientError] = useState("");
  const [queryError, setQueryError] = useState("");

  // Cache control
  const lastFetchTimeRef = useRef<number>(0);
  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
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
      console.error("Error loading cached data:", error);
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
    } catch (error) {
      console.error("Error caching data:", error);
    }
  };

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      const shouldFetchFromServer = () => {
        const now = Date.now();
        return now - lastFetchTimeRef.current > CACHE_DURATION;
      };
      setLoading(true);

      // Check if we can use cached data
      if (!forceRefresh) {
        const hasCachedData = await loadCachedData();
        if (hasCachedData && !shouldFetchFromServer()) {
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }

      try {
        // Fetch patients
        const patientResponse = await doctorService.getPatients();
        if (patientResponse.success) {
          setPatients(patientResponse.patients);
          setPatientError("");
        } else {
          setPatientError(patientResponse.message);
        }

        // Fetch queries
        const queryResponse = await doctorQueryService.getAllQueries(
          "pending",
          false,
        );
        if (queryResponse.success) {
          setQueries(queryResponse.queries);
          setQueryError("");

          // Cache the new data
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
    fetchData(true); // Force refresh from server
  };

  const navigateToPatients = () => {
    router.push("/patients");
  };

  const navigateToQueries = () => {
    router.push("/queries");
  };

  const navigateToPatientDetails = (patientId: string) => {
    router.push("/patients");
  };

  const navigateToQueryDetails = (queryId: string) => {
    router.push({
      pathname: "/query/[id]",
      params: { id: queryId },
    });
  };

  const getStatusColor = (urgency?: string) => {
    switch (urgency) {
      case "high":
        return "#FF4D4F";
      case "medium":
        return "#FAAD14";
      default:
        return "#52C41A";
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5f2446" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#5f2446"]}
        />
      }
    >
      <StatusBar barStyle="light-content" backgroundColor="#5f2446" />

      {/* Header Section */}
      <View style={styles.welcomeSection}>
        <View style={styles.welcomeContent}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.doctorName}>Dr. {username}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <FontAwesome name="user-md" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <TouchableOpacity
          style={[styles.statCard, { width: "48%" }]}
          onPress={navigateToPatients}
        >
          <View
            style={[styles.statIconContainer, { backgroundColor: "#5f2446" }]}
          >
            <FontAwesome name="user" size={20} color="#fff" />
          </View>
          <View style={styles.statTextContainer}>
            <Text style={styles.statNumber}>{patients.length}</Text>
            <Text style={styles.statLabel}>Patients</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, { width: "48%" }]}
          onPress={navigateToQueries}
        >
          <View
            style={[styles.statIconContainer, { backgroundColor: "#0D0145" }]}
          >
            <Feather name="help-circle" size={20} color="#fff" />
          </View>
          <View style={styles.statTextContainer}>
            <Text style={styles.statNumber}>{queries.length}</Text>
            <Text style={styles.statLabel}>Pending Queries</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Patients Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Patients</Text>
        <TouchableOpacity onPress={navigateToPatients}>
          <Text style={styles.seeAllLink}>See All</Text>
        </TouchableOpacity>
      </View>

      {patientError ? (
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={24} color="#ff4d4f" />
          <Text style={styles.errorText}>{patientError}</Text>
        </View>
      ) : patients.length > 0 ? (
        patients.slice(0, 3).map((patient) => (
          <TouchableOpacity
            key={patient.id}
            style={styles.patientCard}
            onPress={() => navigateToPatientDetails(patient.id)}
          >
            <View style={styles.patientLeft}>
              <View
                style={[
                  styles.patientAvatar,
                  {
                    backgroundColor:
                      patient.gender === "Female" ? "#FF6B9C" : "#0D0145",
                  },
                ]}
              >
                <Text style={styles.avatarText}>
                  {patient.fullName?.charAt(0) || "P"}
                </Text>
              </View>
              <View>
                <Text style={styles.patientName}>{patient.fullName}</Text>
                <View style={styles.patientInfoRow}>
                  <View style={styles.patientInfo}>
                    <Feather name="user" size={14} color="#888" />
                    <Text style={styles.infoText}>
                      {patient.age || "N/A"} • {patient.gender || "N/A"}
                    </Text>
                  </View>

                  {patient.lastVisitDate && (
                    <View style={styles.dateContainer}>
                      <Feather name="calendar" size={12} color="#888" />
                      <Text style={styles.dateText}>
                        {getTimeAgo(patient.lastVisitDate)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <View style={styles.emptyStateContainer}>
          <Feather name="users" size={40} color="#5f2446" />
          <Text style={styles.emptyStateText}>No patients found</Text>
          <TouchableOpacity style={styles.emptyStateButton}>
            <Text style={styles.emptyStateButtonText}>Add Patient</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Queries Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Queries</Text>
        <TouchableOpacity onPress={navigateToQueries}>
          <Text style={styles.seeAllLink}>See All</Text>
        </TouchableOpacity>
      </View>

      {queryError ? (
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={24} color="#ff4d4f" />
          <Text style={styles.errorText}>{queryError}</Text>
        </View>
      ) : queries.length > 0 ? (
        <View style={styles.queriesContainer}>
          {queries.slice(0, 4).map((query) => (
            <TouchableOpacity
              key={query.id}
              style={styles.queryCard}
              onPress={() => navigateToQueryDetails(query.id)}
            >
              <View style={styles.queryHeader}>
                <View style={styles.queryIcon}>
                  <Feather name="help-circle" size={20} color="#5f2446" />
                </View>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(query.urgency) },
                  ]}
                />
              </View>
              <Text
                style={styles.queryTitle}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {query.question.length > 50
                  ? query.question.substring(0, 50) + "..."
                  : query.question}
              </Text>
              <View style={styles.queryFooter}>
                <Text style={styles.patientName}>{query.patientName}</Text>
                <Text style={styles.queryDate}>
                  {getTimeAgo(query.createdAt)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyStateContainer}>
          <Feather name="inbox" size={40} color="#5f2446" />
          <Text style={styles.emptyStateText}>No pending queries</Text>
          <Text style={styles.emptyStateSubText}>
            You&apos;re all caught up!
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Ambieye © {new Date().getFullYear()}
        </Text>
      </View>
    </ScrollView>
  );
}

const windowWidth = Dimensions.get("window").width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f9fc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f7f9fc",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#5f2446",
  },
  welcomeSection: {
    backgroundColor: "#5f2446",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  welcomeContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
  },
  doctorName: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold",
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: -25,
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statTextContainer: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  statLabel: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    marginTop: 5,
  },
  activitySummary: {
    marginTop: 24,
    marginHorizontal: 20,
  },
  activityIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(95, 36, 70, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  activityText: {
    marginLeft: 6,
    color: "#5f2446",
    fontWeight: "500",
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 25,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  seeAllLink: {
    color: "#5f2446",
    fontWeight: "600",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 77, 79, 0.1)",
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 15,
  },
  errorText: {
    color: "#ff4d4f",
    marginLeft: 10,
    fontSize: 14,
  },
  patientCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  patientLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  patientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  patientName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  patientInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: windowWidth - 140, // Adjust as needed
  },
  patientInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    fontSize: 14,
    color: "#888",
    marginLeft: 5,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    fontSize: 12,
    color: "#888",
    marginLeft: 5,
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#5f2446",
    marginTop: 15,
    fontWeight: "600",
  },
  emptyStateSubText: {
    fontSize: 14,
    color: "#888",
    marginTop: 5,
  },
  emptyStateButton: {
    marginTop: 15,
    backgroundColor: "#5f2446",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  queriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  queryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    width: "46%",
    marginHorizontal: "2%",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    justifyContent: "space-between",
    height: 150, // Fixed height for consistency
  },
  queryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  queryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f0f3",
    justifyContent: "center",
    alignItems: "center",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  queryTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
    height: 40, // Limit height for title to two lines
  },
  queryFooter: {
    marginTop: "auto",
  },
  queryDate: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  quickActions: {
    marginHorizontal: 20,
    marginVertical: 20,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  quickActionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickActionButton: {
    alignItems: "center",
    width: "30%",
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  quickActionText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginTop: 10,
  },
  footerText: {
    fontSize: 12,
    color: "#888",
  },
});
