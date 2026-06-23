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
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { patientService } from "@/services/api/patientService";
import Feather from "@expo/vector-icons/Feather";
import { Colors, Shadows, BorderRadius } from "@/constants/theme";

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
  const [urgency, setUrgency] = useState<string>("medium");

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

  const handleSubmitQuery = async () => {
    if (!newQueryText.trim()) {
      Alert.alert("Error", "Please enter your question");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await patientService.createQuery(newQueryText, urgency);
      if (response.success) {
        Alert.alert("Success", "Your query has been submitted successfully");
        setNewQueryText("");
        setUrgency("medium");
        setShowNewQueryModal(false);
        fetchQueries();
      } else {
        Alert.alert("Error", response.message || "Failed to submit query");
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const urgencyConfig = {
    low: { color: Colors.accent, bg: '#ECFDF5', label: 'Low' },
    medium: { color: Colors.warning, bg: '#FFFBEB', label: 'Medium' },
    high: { color: Colors.error, bg: '#FEF2F2', label: 'High' },
  };

  const renderQueryItem = ({ item }: { item: Query }) => (
    <TouchableOpacity
      style={styles.queryCard}
      onPress={() => handleViewQuery(item.id)}
      activeOpacity={0.85}
    >
      <View style={styles.queryCardLeft}>
        <View style={[
          styles.statusIndicator,
          { backgroundColor: item.status === "pending" ? Colors.warning : Colors.accent }
        ]} />
      </View>
      <View style={styles.queryContent}>
        <View style={styles.queryHeader}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: item.status === "pending" ? '#FFFBEB' : '#ECFDF5' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: item.status === "pending" ? Colors.warning : Colors.accent }
            ]}>
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
          <View style={styles.doctorRow}>
            <Feather name="user" size={11} color={Colors.primary} />
            <Text style={styles.doctorName}>Dr. {item.doctorName}</Text>
          </View>
        )}
      </View>
      <Feather name="chevron-right" size={18} color={Colors.textLight} />
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBg}>
        <Feather name="inbox" size={32} color={Colors.primary} />
      </View>
      <Text style={styles.emptyText}>No queries found</Text>
      <Text style={styles.emptySubText}>
        {filter ? `No ${filter} queries to display` : "You haven't created any queries yet"}
      </Text>
      <TouchableOpacity
        style={styles.createQueryButton}
        onPress={() => setShowNewQueryModal(true)}
      >
        <Feather name="plus" size={16} color="#fff" />
        <Text style={styles.createQueryButtonText}>Ask a Question</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }} edges={["top"]}>
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Queries</Text>
          <Text style={styles.headerSubtitle}>Ask your doctor anything</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowNewQueryModal(true)}
          style={styles.newQueryBtn}
        >
          <Feather name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {[
          { key: null, label: 'All' },
          { key: 'pending', label: 'Pending' },
          { key: 'answered', label: 'Answered' },
        ].map((f) => (
          <TouchableOpacity
            key={String(f.key)}
            style={[styles.filterButton, filter === f.key && styles.activeFilter]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.activeFilterText]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
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
          showsVerticalScrollIndicator={false}
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
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Query</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowNewQueryModal(false);
                  setNewQueryText("");
                  setUrgency("medium");
                }}
                disabled={isSubmitting}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Priority Level</Text>
              <View style={styles.urgencyContainer}>
                {Object.entries(urgencyConfig).map(([key, config]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.urgencyButton,
                      urgency === key && { backgroundColor: config.bg, borderColor: config.color },
                    ]}
                    onPress={() => setUrgency(key)}
                    disabled={isSubmitting}
                  >
                    <View style={[styles.urgencyDot, { backgroundColor: config.color }]} />
                    <Text style={[
                      styles.urgencyButtonText,
                      urgency === key && { color: config.color, fontWeight: '700' },
                    ]}>
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Your Question</Text>
              <TextInput
                style={styles.queryInput}
                placeholder="Describe your concern or question..."
                multiline
                numberOfLines={6}
                value={newQueryText}
                onChangeText={setNewQueryText}
                placeholderTextColor={Colors.textLight}
                editable={!isSubmitting}
                textAlignVertical="top"
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
                style={[styles.submitButton, isSubmitting && styles.disabledButton]}
                onPress={handleSubmitQuery}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="send" size={16} color="#fff" />
                    <Text style={styles.submitButtonText}>Submit</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: '#0F172A',
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
  },
  newQueryBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: 8,
  },
  filterButton: {
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: Colors.background,
  },
  activeFilter: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  activeFilterText: {
    color: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
    paddingBottom: 90,
  },
  queryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...Shadows.sm,
  },
  queryCardLeft: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
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
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  dateText: {
    fontSize: 11,
    color: Colors.textLight,
  },
  queryText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "500",
    marginBottom: 6,
    lineHeight: 20,
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  doctorName: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    paddingTop: 60,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.text,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  createQueryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createQueryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  urgencyContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  urgencyButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    backgroundColor: Colors.background,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  urgencyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  urgencyButtonText: {
    color: Colors.textSecondary,
    fontWeight: "600",
    fontSize: 13,
  },
  queryInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    backgroundColor: Colors.background,
    height: 140,
    textAlignVertical: "top",
    marginBottom: 20,
    color: Colors.text,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  submitButton: {
    flex: 2,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
});
