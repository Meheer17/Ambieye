import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { patientService } from "@/services/api/patientService";
import { doctorQueryService } from "@/services/api/doctorQueryService";
import FontAwesome from "@expo/vector-icons/FontAwesome";

export default function QueryDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { userType } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [doctor, setDoctor] = useState<any>(null);
  const [responseText, setResponseText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchQueryDetails = React.useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      // Use the appropriate service based on user type
      const service =
        userType === "doctor" ? doctorQueryService : patientService;
      const response = await service.getQueryById(id as string);

      if (response.success) {
        setQuery(response.query);
        setPatient(response.patient);
        setDoctor(response.doctor);
      } else {
        Alert.alert(
          "Error",
          response.message || "Failed to fetch query details",
        );
        router.back();
      }
    } catch (error) {
      console.error("Error fetching query details:", error);
      Alert.alert("Error", "An unexpected error occurred");
      router.back();
    } finally {
      setIsLoading(false);
    }
  }, [id, userType, router]);

  useEffect(() => {
    fetchQueryDetails();
  }, [fetchQueryDetails]);

  const handleSubmitResponse = async () => {
    if (!responseText.trim()) {
      Alert.alert("Error", "Response cannot be empty");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await doctorQueryService.answerQuery(
        id as string,
        responseText,
      );

      if (response.success) {
        Alert.alert("Success", "Response submitted successfully");
        // Reload query to show the response
        fetchQueryDetails();
        setResponseText("");
      } else {
        Alert.alert("Error", response.message || "Failed to submit response");
      }
    } catch (error) {
      console.error("Error submitting response:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5f2446" />
      </View>
    );
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Query Details",
          headerBackTitle: "Back",
          headerStyle: {},
        }}
      />

      <ScrollView style={styles.container}>
        <View
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <TouchableOpacity onPress={() => router.push("/(patient)/queries")}>
            <FontAwesome name="arrow-left" size={24} color="#5f2446" />
          </TouchableOpacity>
          <Text style={styles.gameTitle}>Query Details</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.header}>
            <View
              style={[
                styles.statusBadge,
                query.status === "pending"
                  ? styles.pendingBadge
                  : styles.answeredBadge,
              ]}
            >
              <Text style={styles.statusText}>
                {query.status === "pending" ? "Pending" : "Answered"}
              </Text>
            </View>
            <Text style={styles.date}>
              Created: {formatDate(query.createdAt)}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>From Patient</Text>
            <Text style={styles.patientName}>
              {patient?.fullName || "Unknown"}
            </Text>
          </View>

          {doctor && (
            <View style={styles.section}>
              <Text style={styles.label}>Assigned Doctor</Text>
              <Text style={styles.doctorName}>
                Dr. {doctor?.fullName || "Unknown"}
              </Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.label}>Question</Text>
            <View style={styles.questionContainer}>
              <Text style={styles.questionText}>{query.question}</Text>
            </View>
          </View>

          {query.status === "answered" && query.response && (
            <View style={styles.section}>
              <Text style={styles.label}>Response</Text>
              <View style={styles.responseContainer}>
                <Text style={styles.responseText}>{query.response}</Text>
                {query.answeredAt && (
                  <Text style={styles.responseDate}>
                    Answered: {formatDate(query.answeredAt)}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Response form for doctors when query is pending */}
          {userType === "doctor" && query.status === "pending" && (
            <View style={styles.responseForm}>
              <Text style={styles.responseFormTitle}>Submit Response</Text>
              <TextInput
                style={styles.responseInput}
                multiline
                numberOfLines={6}
                placeholder="Type your response here..."
                placeholderTextColor="#888"
                value={responseText}
                onChangeText={setResponseText}
                editable={!isSubmitting}
              />
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmitResponse}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Response</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  pendingBadge: {
    backgroundColor: "#ffefd5",
  },
  answeredBadge: {
    backgroundColor: "#d4edda",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  date: {
    fontSize: 12,
    color: "#888",
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    color: "#888",
    marginBottom: 6,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  doctorName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#5f2446",
  },
  gameTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#5f2446",
    marginBottom: 20,
    textAlign: "center",
  },
  questionContainer: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
  },
  questionText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
  },
  responseContainer: {
    backgroundColor: "#f0f4ff",
    borderRadius: 8,
    padding: 12,
  },
  responseText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
  },
  responseDate: {
    fontSize: 12,
    color: "#888",
    marginTop: 8,
    textAlign: "right",
  },
  responseForm: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 20,
  },
  responseFormTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  responseInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#f9f9f9",
    height: 120,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: "#5f2446",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
