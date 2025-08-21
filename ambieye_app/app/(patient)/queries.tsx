import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { patientService } from "@/services/api/patientService";
import Feather from "@expo/vector-icons/Feather";

interface Query {
  id: string;
  question: string;
  response?: string;
  status: string;
  createdAt: string;
  doctorName?: string;
}

export default function QueryListScreen() {
  const router = useRouter();
  const [queries, setQueries] = useState<Query[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [showNewQueryModal, setShowNewQueryModal] = useState(false);
  const [newQueryText, setNewQueryText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urgency, setUrgency] = useState<string>("medium"); // 'low', 'medium', 'high'

  const fetchQueries = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await patientService.getQueries(filter || undefined);
      if (response.success) {
        setQueries(response.queries);
      } else {
        Alert.alert("Error", response.message || "Failed to fetch queries");
      }
    } catch (error) {
      console.error("Error fetching queries:", error);
      Alert.alert("Error", "Failed to load queries. Please try again later.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchQueries();
  }, [fetchQueries]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchQueries();
  };

  const handleViewQuery = (id: string) => {
    router.push(`/query/${id}`);
  };

  const validateQuery = () => {
    if (!newQueryText.trim()) {
      Alert.alert("Error", "Please enter your question");
      return false;
    }
    return true;
  };

  const handleSubmitQuery = async () => {
    if (!validateQuery()) return;

    setIsSubmitting(true);
    try {
      const response = await patientService.createQuery(newQueryText, urgency);

      if (response.success) {
        Alert.alert("Success", "Your query has been submitted successfully");
        setNewQueryText("");
        setUrgency("medium");
        setShowNewQueryModal(false);
        // Refresh the list to show the new query
        fetchQueries();
      } else {
        Alert.alert("Error", response.message || "Failed to submit query");
      }
    } catch (error) {
      console.error("Error submitting query:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQueryItem = ({ item }: { item: Query }) => (
    <TouchableOpacity
      style={styles.queryItem}
      onPress={() => handleViewQuery(item.id)}
    >
      <View style={styles.queryContent}>
        <View style={styles.queryHeader}>
          <View
            style={[
              styles.statusBadge,
              item.status === "pending"
                ? styles.pendingBadge
                : styles.answeredBadge,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                item.status === "pending"
                  ? styles.pendingText
                  : styles.answeredText,
              ]}
            >
              {item.status === "pending" ? "Pending" : "Answered"}
            </Text>
          </View>
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <Text style={styles.queryText} numberOfLines={2}>
          {item.question}
        </Text>
        {item.doctorName && (
          <Text style={styles.doctorName}>Dr. {item.doctorName}</Text>
        )}
      </View>
      <Feather name="chevron-right" size={20} color="#888" />
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Feather name="inbox" size={48} color="#ccc" />
      <Text style={styles.emptyText}>No queries found</Text>
      <Text style={styles.emptySubText}>
        {filter
          ? `No ${filter} queries to display`
          : "You have not created any queries yet"}
      </Text>
      <TouchableOpacity
        style={styles.createQueryButton}
        onPress={() => setShowNewQueryModal(true)}
      >
        <Text style={styles.createQueryButtonText}>Create a New Query</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <View style={styles.container}>
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            padding: 10,
          }}
        >
          <Text style={styles.gameTitle}>My Queries</Text>
          <TouchableOpacity
            onPress={() => setShowNewQueryModal(true)}
            style={styles.headerButton}
          >
            <Feather name="plus-circle" size={24} color="#5f2446" />
          </TouchableOpacity>
        </View>
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === null && styles.activeFilter,
            ]}
            onPress={() => setFilter(null)}
          >
            <Text
              style={[
                styles.filterText,
                filter === null && styles.activeFilterText,
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
        </View>

        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5f2446" />
          </View>
        ) : (
          <FlatList
            data={queries}
            renderItem={renderQueryItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={renderEmptyList}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        )}

        {/* New Query Modal */}
        <Modal
          visible={showNewQueryModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            if (!isSubmitting) {
              setShowNewQueryModal(false);
              setNewQueryText("");
              setUrgency("medium");
            }
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>New Query</Text>

              <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                <Text style={styles.urgencyLabel}>Urgency:</Text>
                <View style={styles.urgencyContainer}>
                  <TouchableOpacity
                    style={[
                      styles.urgencyButton,
                      urgency === "low" && styles.urgencyButtonLowSelected,
                    ]}
                    onPress={() => setUrgency("low")}
                    disabled={isSubmitting}
                  >
                    <Text
                      style={[
                        styles.urgencyButtonText,
                        urgency === "low" && styles.urgencyButtonTextSelected,
                      ]}
                    >
                      Low
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.urgencyButton,
                      urgency === "medium" &&
                        styles.urgencyButtonMediumSelected,
                    ]}
                    onPress={() => setUrgency("medium")}
                    disabled={isSubmitting}
                  >
                    <Text
                      style={[
                        styles.urgencyButtonText,
                        urgency === "medium" &&
                          styles.urgencyButtonTextSelected,
                      ]}
                    >
                      Medium
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.urgencyButton,
                      urgency === "high" && styles.urgencyButtonHighSelected,
                    ]}
                    onPress={() => setUrgency("high")}
                    disabled={isSubmitting}
                  >
                    <Text
                      style={[
                        styles.urgencyButtonText,
                        urgency === "high" && styles.urgencyButtonTextSelected,
                      ]}
                    >
                      High
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.queryInputLabel}>Your Question:</Text>
                <TextInput
                  style={styles.queryInput}
                  placeholder="Enter your question here..."
                  multiline
                  numberOfLines={6}
                  value={newQueryText}
                  onChangeText={setNewQueryText}
                  placeholderTextColor="#888"
                  editable={!isSubmitting}
                />
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowNewQueryModal(false);
                    setNewQueryText("");
                    setUrgency("medium");
                  }}
                  disabled={isSubmitting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    isSubmitting && styles.disabledButton,
                  ]}
                  onPress={handleSubmitQuery}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  headerButton: {
    padding: 8,
  },
  filterContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
  },
  activeFilter: {
    backgroundColor: "#5f2446",
  },
  filterText: {
    color: "#666",
    fontSize: 14,
  },
  activeFilterText: {
    color: "#fff",
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  queryItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  queryContent: {
    flex: 1,
  },
  queryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  pendingBadge: {
    backgroundColor: "#ffefd5",
  },
  answeredBadge: {
    backgroundColor: "#d4edda",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  pendingText: {
    color: "#ff9800",
  },
  answeredText: {
    color: "#4caf50",
  },
  dateText: {
    fontSize: 12,
    color: "#888",
  },
  queryText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 12,
    color: "#5f2446",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    marginVertical: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 24,
  },
  createQueryButton: {
    backgroundColor: "#5f2446",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  createQueryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
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
    width: "95%",
    maxWidth: 400,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  gameTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#5f2446",
    marginBottom: 20,
    textAlign: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  urgencyLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  urgencyContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  urgencyButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    marginHorizontal: 4,
  },
  urgencyButtonLowSelected: {
    backgroundColor: "#e6f7ef",
    borderColor: "#27ae60",
  },
  urgencyButtonMediumSelected: {
    backgroundColor: "#fff4e5",
    borderColor: "#f2994a",
  },
  urgencyButtonHighSelected: {
    backgroundColor: "#ffebee",
    borderColor: "#e53935",
  },
  urgencyButtonText: {
    color: "#666",
    fontWeight: "500",
  },
  urgencyButtonTextSelected: {
    color: "#333",
    fontWeight: "600",
  },
  queryInputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  queryInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
    height: 150,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: "#5f2446",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#b39dac",
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "500",
    fontSize: 16,
  },
});
