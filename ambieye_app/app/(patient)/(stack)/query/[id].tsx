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
        <ActivityIndicator size="large" color="#0EA5E9" />
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
          <TouchableOpacity onPress={() => router.back()}>
            <FontAwesome name="arrow-left" size={24} color="#0EA5E9" />
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
    backgroundColor: "#F3F4F6",
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  statusBadge: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  pendingBadge: {
    backgroundColor: "#FEF3C7",
  },
  answeredBadge: {
    backgroundColor: "#D1FAE5",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  date: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "600",
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  patientName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  doctorName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  gameTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 20,
    textAlign: "center",
  },
  questionContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  questionText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#374151",
  },
  responseContainer: {
    backgroundColor: "#EDE9FE",
    borderRadius: 14,
    padding: 16,
  },
  responseText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#374151",
  },
  responseDate: {
    fontSize: 12,
    color: "#7C3AED",
    marginTop: 10,
    textAlign: "right",
    fontWeight: "500",
  },
  responseForm: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 20,
  },
  responseFormTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 14,
  },
  responseInput: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#F9FAFB",
    height: 130,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: "#0EA5E9",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0EA5E9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
});
