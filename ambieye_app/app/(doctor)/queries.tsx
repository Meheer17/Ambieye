import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  SafeAreaView,
  StatusBar,
  Platform,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  RefreshControl,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { doctorQueryService, DoctorQuery } from "@/services/api/doctorQueryService";

// Query Details Component to be used in modal
function QueryDetailsModal({
  queryId,
  onClose,
  onQueryAnswered,
}: {
  queryId: string | null;
  onClose: () => void;
  onQueryAnswered: () => void;
}) {
  const [responseText, setResponseText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Define fetchQueryDetails inside the useEffect to avoid dependency issues
    const fetchQueryDetails = async () => {
      if (!queryId) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await doctorQueryService.getQueryById(queryId);

        if (response.success) {
          setQuery(response.query);
          setPatient(response.patient);

          // Start animations
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ]).start();
        } else {
          setError(response.message || "Failed to load query details");
        }
      } catch (err) {
        setError("An error occurred while loading the query");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (queryId) {
      fetchQueryDetails();
    }
  }, [queryId, fadeAnim, slideAnim]);

  const handleSubmitResponse = async () => {
    if (!query || !queryId) return;

    if (!responseText.trim()) {
      Alert.alert("Empty Response", "Please enter a response before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await doctorQueryService.answerQuery(queryId, responseText);

      if (result.success) {
        Alert.alert("Success", "Your response has been sent to the patient.");
        onQueryAnswered();
        onClose();
      } else {
        Alert.alert("Error", result.message || "Failed to submit your response. Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred. Please try again later.");
      console.error("Error submitting response:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUrgencyColor = (urgency?: string): string => {
    switch (urgency) {
      case "high":
        return "#e53935";
      case "medium":
        return "#fb8c00";
      case "low":
        return "#43a047";
      default:
        return "#757575";
    }
  };

  if (isLoading) {
    return (
      <View style={modalStyles.loadingContainer}>
        <ActivityIndicator size="large" color="#5f2446" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={modalStyles.errorContainer}>
        <Feather name="alert-circle" size={48} color="#e53935" />
        <Text style={modalStyles.errorText}>{error}</Text>
        <TouchableOpacity style={modalStyles.errorButton} onPress={onClose}>
          <Text style={modalStyles.errorButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!query || !patient) {
    return (
      <View style={modalStyles.errorContainer}>
        <Text style={modalStyles.errorText}>No query data available</Text>
        <TouchableOpacity style={modalStyles.errorButton} onPress={onClose}>
          <Text style={modalStyles.errorButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formattedCreatedAt = new Date(query.createdAt).toLocaleString();
  const formattedAnsweredAt = query.answeredAt ? new Date(query.answeredAt).toLocaleString() : null;

  return (
    <SafeAreaView style={modalStyles.safeArea}>
      <View style={modalStyles.header}>
        <TouchableOpacity style={modalStyles.backButton} onPress={onClose}>
          <Feather name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={modalStyles.headerTitle}>Query Details</Text>
        <View style={{ width: 40 }} />
      </View>
      <StatusBar backgroundColor="#000" barStyle="light-content" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          style={modalStyles.container}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              modalStyles.queryCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={modalStyles.patientSection}>
              <View style={modalStyles.patientAvatar}>
                <Text style={modalStyles.avatarText}>
                  {patient.fullName?.charAt(0) || "P"}
                </Text>
              </View>
              <View>
                <Text style={modalStyles.patientName}>{patient.fullName}</Text>
                <Text style={modalStyles.queryDate}>{formattedCreatedAt}</Text>
              </View>
            </View>

            {query.urgency && (
              <View
                style={[
                  modalStyles.urgencyBadge,
                  { backgroundColor: getUrgencyColor(query.urgency) + "20" },
                ]}
              >
                <View
                  style={[
                    modalStyles.urgencyDot,
                    { backgroundColor: getUrgencyColor(query.urgency) },
                  ]}
                />
                <Text
                  style={[
                    modalStyles.urgencyText,
                    { color: getUrgencyColor(query.urgency) },
                  ]}
                >
                  {query.urgency.charAt(0).toUpperCase() + query.urgency.slice(1)}{" "}
                  Urgency
                </Text>
              </View>
            )}

            <Text style={modalStyles.queryTitle}>Patient Question</Text>
            <Text style={modalStyles.queryMessage}>{query.question}</Text>
          </Animated.View>

          {query.response && (
            <View style={modalStyles.responseHistoryContainer}>
              <Text style={modalStyles.sectionTitle}>Your Response</Text>
              <View style={modalStyles.previousResponse}>
                <Text style={modalStyles.responseText}>{query.response}</Text>
                {formattedAnsweredAt && (
                  <Text style={modalStyles.responseDate}>{formattedAnsweredAt}</Text>
                )}
              </View>
            </View>
          )}

          {query.status !== "answered" && (
            <View style={modalStyles.responseContainer}>
              <Text style={modalStyles.sectionTitle}>Your Response</Text>
              <TextInput
                style={modalStyles.responseInput}
                placeholder="Type your response here..."
                placeholderTextColor="#999"
                multiline
                value={responseText}
                onChangeText={setResponseText}
                editable={!isSubmitting}
              />

              <TouchableOpacity
                style={[
                  modalStyles.submitButton,
                  isSubmitting && modalStyles.disabledButton,
                ]}
                onPress={handleSubmitResponse}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="send" size={16} color="#fff" />
                    <Text style={modalStyles.submitButtonText}>
                      Send Response
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Query Item component
function QueryItem({
  item,
  index,
  onPress,
  getUrgencyColor,
}: {
  item: DoctorQuery;
  index: number;
  onPress: (id: string) => void;
  getUrgencyColor: (urgency?: string) => string;
}) {
  const itemAnimValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(itemAnimValue, {
      toValue: 1,
      duration: 300,
      delay: 300 + index * 100,
      useNativeDriver: true,
    }).start();
  }, [index, itemAnimValue]);

  // Format the date for display
  const formattedDate = new Date(item.createdAt).toLocaleDateString();

  return (
    <Animated.View
      style={{
        opacity: itemAnimValue,
        transform: [
          {
            translateY: itemAnimValue.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          },
        ],
      }}
    >
      <TouchableOpacity
        style={styles.queryCard}
        onPress={() => onPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.queryHeader}>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{item.patientName}</Text>
            <View
              style={[
                styles.statusIndicator,
                {
                  backgroundColor:
                    item.status === "pending" ? "#ff9800" : "#4caf50",
                },
              ]}
            />
          </View>
          <Text style={styles.queryDate}>{formattedDate}</Text>
        </View>

        <Text style={styles.queryTitle} numberOfLines={2}>{item.question}</Text>

        {item.response && (
          <Text style={styles.queryMessage} numberOfLines={2}>
            {item.response}
          </Text>
        )}

        <View style={styles.queryFooter}>
          {item.urgency && (
            <View
              style={[
                styles.urgencyBadge,
                { backgroundColor: getUrgencyColor(item.urgency) + "20" },
              ]}
            >
              <View
                style={[
                  styles.urgencyDot,
                  { backgroundColor: getUrgencyColor(item.urgency) },
                ]}
              />
              <Text
                style={[
                  styles.urgencyText,
                  { color: getUrgencyColor(item.urgency) },
                ]}
              >
                {item.urgency.charAt(0).toUpperCase() + item.urgency.slice(1)}{" "}
                Urgency
              </Text>
            </View>
          )}

          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {item.status === "pending" ? "Awaiting response" : "Responded"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const QueriesScreen = () => {
  const [queries, setQueries] = useState<DoctorQuery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "answered">("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [includeAll, setIncludeAll] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 10,
    totalItems: 0,
    totalPages: 1
  });
  
  // Animation refs
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;

  // Define fetchQueries with useCallback to prevent re-creation on each render
  const fetchQueries = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const status = filter === "all" ? undefined : filter;
      const response = await doctorQueryService.getAllQueries(status, includeAll);

      if (response.success) {
        setQueries(response.queries);
        setPagination(response.pagination);

        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        setError(response.message || "Failed to load queries");
      }
    } catch (err) {
      setError("An error occurred while fetching queries");
      console.error("Error fetching queries:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [filter, includeAll, slideAnim, opacityAnim]);

  useEffect(() => {
    // Animate header
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    fetchQueries();
  }, [fetchQueries, headerAnim]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchQueries();
  };

  const navigateToQueryDetails = (queryId: string) => {
    setSelectedQueryId(queryId);
    setModalVisible(true);
  };

  const closeQueryDetails = () => {
    setModalVisible(false);
    setSelectedQueryId(null);
  };

  const getUrgencyColor = (urgency?: string): string => {
    switch (urgency) {
      case "high":
        return "#e53935";
      case "medium":
        return "#fb8c00";
      case "low":
        return "#43a047";
      default:
        return "#757575";
    }
  };

  const renderQueryItem = ({ item, index }: { item: DoctorQuery; index: number }) => {
    return (
      <QueryItem
        item={item}
        index={index}
        onPress={navigateToQueryDetails}
        getUrgencyColor={getUrgencyColor}
      />
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Feather name="inbox" size={50} color="#5f2446" />
      <Text style={styles.emptyText}>No queries found</Text>

      {filter !== "all" && (
        <TouchableOpacity 
          style={styles.emptyViewAllButton} 
          onPress={() => setFilter("all")}
        >
          <Text style={styles.emptyViewAllButtonText}>View all queries</Text>
        </TouchableOpacity>
      )}

      {!includeAll && (
        <TouchableOpacity 
          style={styles.emptyIncludeAllButton} 
          onPress={() => setIncludeAll(true)}
        >
          <Text style={styles.emptyIncludeAllButtonText}>
            {includeAll ? "Show only my queries" : "Include all patient queries"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerAnim,
              transform: [
                {
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Patient Queries</Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
            >
              <Feather name="refresh-cw" size={20} color="#5f2446" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={styles.container}>
          <Animated.View
            style={[
              styles.filterContainer,
              {
                opacity: opacityAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === "all" && styles.activeFilter,
              ]}
              onPress={() => setFilter("all")}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === "all" && styles.activeFilterText,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === "pending" && styles.activeFilter,
              ]}
              onPress={() => setFilter("pending")}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === "pending" && styles.activeFilterText,
                ]}
              >
                Pending
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === "answered" && styles.activeFilter,
              ]}
              onPress={() => setFilter("answered")}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === "answered" && styles.activeFilterText,
                ]}
              >
                Answered
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.includeAllButton}
              onPress={() => setIncludeAll(!includeAll)}
            >
              <Feather 
                name={includeAll ? "check-square" : "square"} 
                size={18} 
                color={includeAll ? "#5f2446" : "#666"} 
              />
              <Text style={styles.includeAllText}>All patients</Text>
            </TouchableOpacity>
          </Animated.View>

          {isLoading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#5f2446" />
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={48} color="#e53935" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => fetchQueries()}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={queries}
              keyExtractor={(item) => item.id}
              renderItem={renderQueryItem}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              }
              ListEmptyComponent={renderEmptyList}
            />
          )}
        </View>
      </SafeAreaView>

      {/* Query Details Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={closeQueryDetails}
        transparent={false}
      >
        <QueryDetailsModal 
          queryId={selectedQueryId} 
          onClose={closeQueryDetails} 
          onQueryAnswered={handleRefresh} 
        />
      </Modal>
    </View>
  );
};

export default QueriesScreen;


const modalStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#5f2446",
  },
  header: {
    height: 60,
    backgroundColor: "#5f2446",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  backButton: {
    padding: 5,
  },
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: "#5f2446",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  errorButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  queryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    margin: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  patientSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  patientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0D0145",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  patientName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  queryDate: {
    fontSize: 12,
    color: "#888",
  },
  urgencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  urgencyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  urgencyText: {
    fontSize: 13,
    fontWeight: "500",
  },
  queryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  queryMessage: {
    fontSize: 15,
    lineHeight: 22,
    color: "#555",
  },
  responseHistoryContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  previousResponse: {
    backgroundColor: "#e8d5e1",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  responseText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#333",
    marginBottom: 8,
  },
  responseDate: {
    fontSize: 12,
    color: "#5f2446",
    textAlign: "right",
  },
  responseContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  responseInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    minHeight: 150,
    fontSize: 15,
    color: "#333",
    textAlignVertical: "top",
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  submitButton: {
    backgroundColor: "#5f2446",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  disabledButton: {
    backgroundColor: "#9e7a8c",
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
});


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#5f2446",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: {
    height: 60,
    backgroundColor: "#5f2446",
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  filterContainer: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
    flexWrap: "wrap",
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginRight: 10,
    marginBottom: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  activeFilter: {
    backgroundColor: "#5f2446",
  },
  filterText: {
    color: "#666",
    fontWeight: "500",
  },
  activeFilterText: {
    color: "#fff",
  },
  includeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
  },
  includeAllText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#666",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#5f2446",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 80,
  },
  queryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  queryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  patientInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  patientName: {
    fontSize: 14,
    color: "#555",
    fontWeight: "500",
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  queryDate: {
    fontSize: 12,
    color: "#888",
  },
  queryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  queryMessage: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  queryFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
  },
  urgencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 4,
  },
  urgencyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: "500",
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
  },
  statusText: {
    fontSize: 12,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 80,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: "#5f2446",
    marginBottom: 20,
  },
  emptyViewAllButton: {
    backgroundColor: "#5f2446",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 16,
  },
  emptyViewAllButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  emptyIncludeAllButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#5f2446",
  },
  emptyIncludeAllButtonText: {
    color: "#5f2446",
    fontSize: 14,
    fontWeight: "500",
  },
});