import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "@/hooks/useAuth";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import AntDesign from "@expo/vector-icons/AntDesign";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { patientService } from "@/services/api/patientService";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function PatientHome() {
  const { username } = useAuth();
  const [activeTab, setActiveTab] = useState("activities");
  // Keep doctorId for potential future use
  const [doctorId, setDoctorId] = useState("");
  // Remove unused state for inputDoctorId
  const [reminders, setReminders] = useState<any[]>([]);

  // Progress tab state
  const [progressIsLoading, setProgressIsLoading] = useState(true);
  const [progressData, setProgressData] = useState<any[]>([]);

  // History tab state
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [historyIsLoading, setHistoryIsLoading] = useState(true);

  // Reminder form state
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [newReminder, setNewReminder] = useState({
    title: "",
    date: new Date(),
    time: new Date(),
    showDatePicker: false,
    showTimePicker: false,
  });
  const [editingReminderId, setEditingReminderId] = useState<number | null>(
    null,
  );

  // Fetch dashboard data
  useEffect(() => {
    // Fetch dashboard data
    const fetchDashboardData = async () => {
      try {
        const response = await patientService.getDashboard();

        if (response.success) {
          // Check if doctor_id exists in the response
          if (response.stats && response.stats.doctor_id) {
            setDoctorId(response.stats.doctor_id);
          }
        } else {
          console.error("Error fetching dashboard data:", response.message);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    fetchDashboardData();

    // Load reminders from AsyncStorage
    const loadReminders = async () => {
      try {
        const savedReminders = await AsyncStorage.getItem("reminders");
        if (savedReminders) {
          setReminders(JSON.parse(savedReminders));
        } else {
          setReminders([]);
        }
      } catch (error) {
        console.error("Error loading reminders:", error);
        setReminders([]);
      }
    };

    loadReminders();
  }, []);

  // Fetch progress data when progress tab is active
  useEffect(() => {
    if (activeTab === "progress") {
      const fetchProgressData = async () => {
        setProgressIsLoading(true);
        try {
          const response = await patientService.getProgressData();
          if (response.success && response.gamesPlayed) {
            // Fix: Use gamesPlayed instead of data property
            setProgressData(response.gamesPlayed);
          } else {
            setProgressData([]);
            console.error("Failed to fetch progress data");
          }
        } catch (error) {
          console.error("Error fetching progress data:", error);
          setProgressData([]);
        } finally {
          setProgressIsLoading(false);
        }
      };

      fetchProgressData();
    }
  }, [activeTab]);

  // Fetch game history when history tab is active
  useEffect(() => {
    if (activeTab === "history") {
      const fetchGameHistory = async () => {
        setHistoryIsLoading(true);
        try {
          const response = await patientService.getGameHistory();
          if (response.success) {
            setGameHistory(response.history || []);
          } else {
            setGameHistory([]);
            console.error("Failed to fetch game history:", response.message);
          }
        } catch (error) {
          console.error("Error fetching game history:", error);
          setGameHistory([]);
        } finally {
          setHistoryIsLoading(false);
        }
      };

      fetchGameHistory();
    }
  }, [activeTab]);

  // Save reminders to storage
  const saveReminders = async (updatedReminders: any[]) => {
    try {
      await AsyncStorage.setItem("reminders", JSON.stringify(updatedReminders));
      setReminders(updatedReminders);
    } catch (error) {
      console.error("Error saving reminders:", error);
    }
  };

  const handleAddReminder = () => {
    if (newReminder.title.trim() === "") {
      alert("Please enter a reminder title");
      return;
    }

    const formattedDate = newReminder.date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const formattedTime = newReminder.time.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (editingReminderId !== null) {
      // Edit existing reminder
      const updatedReminders = reminders.map((reminder) =>
        reminder.id === editingReminderId
          ? {
              ...reminder,
              title: newReminder.title,
              date: formattedDate,
              time: formattedTime,
            }
          : reminder,
      );
      saveReminders(updatedReminders);
    } else {
      // Add new reminder
      const newId =
        reminders.length > 0 ? Math.max(...reminders.map((r) => r.id)) + 1 : 1;
      const reminderToAdd = {
        id: newId,
        title: newReminder.title,
        date: formattedDate,
        time: formattedTime,
      };
      saveReminders([...reminders, reminderToAdd]);
    }

    // Reset form
    setNewReminder({
      title: "",
      date: new Date(),
      time: new Date(),
      showDatePicker: false,
      showTimePicker: false,
    });
    setEditingReminderId(null);
    setShowReminderForm(false);
  };

  const handleEditReminder = (reminder: any) => {
    // Parse date and time strings into Date objects
    let reminderDate;
    try {
      reminderDate =
        reminder.date === "Daily" ? new Date() : new Date(reminder.date);
    } catch (e) {
      reminderDate = new Date();
    }

    let reminderTime;
    try {
      const [hours, minutes] = reminder.time
        .match(/(\d+):(\d+)/)?.[0]
        .split(":") || ["12", "00"];
      const ampm = reminder.time.includes("AM") ? "AM" : "PM";

      const timeDate = new Date();
      let hour = parseInt(hours);
      if (ampm === "PM" && hour < 12) hour += 12;
      if (ampm === "AM" && hour === 12) hour = 0;

      timeDate.setHours(hour, parseInt(minutes), 0);
      reminderTime = timeDate;
    } catch (e) {
      reminderTime = new Date();
    }

    setNewReminder({
      title: reminder.title,
      date: reminderDate,
      time: reminderTime,
      showDatePicker: false,
      showTimePicker: false,
    });
    setEditingReminderId(reminder.id);
    setShowReminderForm(true);
  };

  const handleDeleteReminder = (id: number) => {
    const updatedReminders = reminders.filter((reminder) => reminder.id !== id);
    saveReminders(updatedReminders);
  };

  const renderActivitiesTab = () => {
    const handleNavigateToGames = () => {
      router.push("/games");
    };

    return (
      <View style={styles.contentSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Games & Activities</Text>
        </View>

        <View style={styles.gamesContainer}>
          <TouchableOpacity
            style={styles.gameButton}
            onPress={handleNavigateToGames}
          >
            <View style={styles.gameIconContainer}>
              <FontAwesome name="gamepad" size={36} color="#fff" />
            </View>
            <Text style={styles.gameButtonText}>View All Games</Text>
            <Text style={styles.gameDescription}>
              Click here to see all available eye training games and activities
            </Text>
            <View style={styles.gameArrow}>
              <Feather name="chevron-right" size={24} color="#5f2446" />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderProgressTab = () => {
    if (progressIsLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5f2446" />
          <Text style={localStyles.loadingText}>Loading your progress...</Text>
        </View>
      );
    }

    if (!progressData || progressData.length === 0) {
      // Show empty state instead of immediate redirect
      return (
        <View style={localStyles.emptyStateContainer}>
          <MaterialIcons
            name="trending-up"
            size={60}
            color="#5f2446"
            style={{ opacity: 0.6 }}
          />
          <Text style={localStyles.emptyStateTitle}>No Progress Data Yet</Text>
          <Text style={localStyles.emptyStateMessage}>
            Complete some games to see your progress tracked here
          </Text>
          <TouchableOpacity
            style={localStyles.emptyStateButton}
            onPress={() => router.push("/games")}
          >
            <Text style={localStyles.emptyStateButtonText}>Start Playing</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Group progress data by date with robust date normalization
    const groupedData = progressData.reduce(
      (acc: Record<string, any[]>, item) => {
        // Convert the date to a consistent string format for grouping
        let dateKey;
        try {
          // Try to parse the date and format it consistently
          const dateObj = new Date(item.date);
          if (isNaN(dateObj.getTime())) {
            // If date is invalid, use the original string as key
            dateKey = item.date;
          } else {
            // Format as YYYY-MM-DD
            dateKey = dateObj.toISOString().split('T')[0];
          }
        } catch (e) {
          // If parsing fails, use the original string
          dateKey = item.date;
        }

        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(item);
        return acc;
      },
      {},
    );

    // Get dates sorted in reverse chronological order
    const sortedDates = Object.keys(groupedData).sort(
      (a, b) => {
        try {
          return new Date(b).getTime() - new Date(a).getTime();
        } catch {
          return 0; // Handle invalid dates
        }
      }
    );

    return (
      <View style={styles.contentSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Progress</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllLink}>View All</Text>
          </TouchableOpacity>
        </View>

        {sortedDates.map((date) => {
          const items = groupedData[date];
          // Format date for display
          let formattedDate;
          try {
            formattedDate = new Date(date).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
          } catch (e) {
            formattedDate = date; // Fallback if formatting fails
          }

          return (
            <View key={date} style={localStyles.progressDateGroup}>
              <View style={localStyles.progressDateHeader}>
                <View style={localStyles.progressDateBadge}>
                  <Text style={localStyles.progressDateBadgeText}>
                    {(() => {
                      try {
                        const dateObj = new Date(date);
                        if (isNaN(dateObj.getTime())) {
                          return "N/A";
                        }
                        return dateObj.toLocaleDateString("en-US", {
                          day: "2-digit",
                        });
                      } catch (e) {
                        return "N/A";
                      }
                    })()}
                  </Text>
                </View>
                <Text style={localStyles.progressDateText}>
                  {formattedDate}
                </Text>
              </View>

              {items.map((item: any, index: number) => {
                // Calculate progress percentage for visual indicator
                const progressPercent = Math.min(
                  Math.max(((parseInt(item.timeSpent) || 0) / 10) * 100, 10),
                  100,
                );

                return (
                  <View key={index} style={localStyles.progressCard}>
                    <View style={localStyles.progressGameIcon}>
                      <Ionicons name="game-controller" size={24} color="#fff" />
                    </View>
                    <View style={localStyles.progressCardContent}>
                      <Text style={localStyles.progressGameTitle}>
                        {item.name}
                      </Text>
                      <View style={localStyles.progressDetails}>
                        <View style={styles.progressBarContainer}>
                          <View
                            style={[
                              styles.progressBar,
                              { width: `${progressPercent}%` },
                            ]}
                          />
                        </View>
                        <Text style={localStyles.progressTimeText}>
                          {item.timeSpent} secs
                        </Text>
                      </View>
                      <Text style={localStyles.progressScoreText}>
                        Score:{" "}
                        <Text style={{ fontWeight: "bold", color: "#5f2446" }}>
                          {item.score || "N/A"}
                        </Text>
                        {item.accuracy ? ` | Accuracy: ${item.accuracy}` : ""}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    );
  };

  const renderReminderTab = () => (
    <View style={styles.contentSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <TouchableOpacity onPress={() => setShowReminderForm(true)}>
          <Text style={styles.seeAllLink}>+ Add New</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.remindersList}>
        {reminders.map((reminder) => (
          <View key={reminder.id} style={styles.reminderCard}>
            <View style={[styles.reminderIcon, { backgroundColor: "#0D0145" }]}>
              <AntDesign name="clockcircle" size={24} color="#fff" />
            </View>
            <View style={styles.reminderContent}>
              <Text style={styles.reminderTitle}>{reminder.title}</Text>
              <View style={styles.reminderTimeContainer}>
                <Feather
                  name="calendar"
                  size={14}
                  color="#5f2446"
                  style={styles.reminderTimeIcon}
                />
                <Text style={styles.reminderDate}>{reminder.date}</Text>
                <Feather
                  name="clock"
                  size={14}
                  color="#5f2446"
                  style={styles.reminderTimeIcon}
                />
                <Text style={styles.reminderTime}>{reminder.time}</Text>
              </View>
            </View>
            <View style={styles.reminderActions}>
              <TouchableOpacity
                onPress={() => handleEditReminder(reminder)}
                style={styles.reminderActionButton}
              >
                <Feather name="edit" size={20} color="#5f2446" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteReminder(reminder.id)}
                style={styles.reminderActionButton}
              >
                <Feather name="trash-2" size={20} color="#5f2446" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {reminders.length === 0 && (
          <View style={styles.noRemindersContainer}>
            <Text style={styles.noRemindersText}>No notifications set</Text>
            <TouchableOpacity
              style={styles.addReminderButton}
              onPress={() => setShowReminderForm(true)}
            >
              <Text style={styles.addReminderButtonText}>
                + Set Notification
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Reminder Form Modal */}
      <Modal
        visible={showReminderForm}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReminderForm(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowReminderForm(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingReminderId ? "Edit Reminder" : "Add New Reminder"}
            </Text>

            <TextInput
              style={styles.reminderInput}
              value={newReminder.title}
              onChangeText={(text) =>
                setNewReminder({ ...newReminder, title: text })
              }
              placeholder="Enter reminder title"
              placeholderTextColor="#888"
            />

            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() =>
                setNewReminder({
                  ...newReminder,
                  showDatePicker: true,
                })
              }
            >
              <Feather
                name="calendar"
                size={20}
                color="#5f2446"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.dateTimeText}>
                {newReminder.date.toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() =>
                setNewReminder({
                  ...newReminder,
                  showTimePicker: true,
                })
              }
            >
              <Feather
                name="clock"
                size={20}
                color="#5f2446"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.dateTimeText}>
                {newReminder.time.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </TouchableOpacity>

            {newReminder.showDatePicker && (
              <DateTimePicker
                value={newReminder.date}
                mode="date"
                display="default"
                onChange={(_, selectedDate) => {
                  setNewReminder({
                    ...newReminder,
                    date: selectedDate || newReminder.date,
                    showDatePicker: Platform.OS === "ios",
                  });
                }}
              />
            )}

            {newReminder.showTimePicker && (
              <DateTimePicker
                value={newReminder.time}
                mode="time"
                display="default"
                onChange={(_, selectedTime) => {
                  setNewReminder({
                    ...newReminder,
                    time: selectedTime || newReminder.time,
                    showTimePicker: Platform.OS === "ios",
                  });
                }}
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowReminderForm(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddReminder}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderHistoryTab = () => {
    if (historyIsLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5f2446" />
          <Text style={localStyles.loadingText}>Loading your history...</Text>
        </View>
      );
    }

    if (!gameHistory || gameHistory.length === 0) {
      // Show empty state instead of redirect
      return (
        <View style={localStyles.emptyStateContainer}>
          <MaterialIcons
            name="history"
            size={60}
            color="#5f2446"
            style={{ opacity: 0.6 }}
          />
          <Text style={localStyles.emptyStateTitle}>No History Yet</Text>
          <Text style={localStyles.emptyStateMessage}>
            Play some games to build your gaming history
          </Text>
          <TouchableOpacity
            style={localStyles.emptyStateButton}
            onPress={() => router.push("/games")}
          >
            <Text style={localStyles.emptyStateButtonText}>Start Playing</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.contentSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Game History</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllLink}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={historyStyles.historyContainer}>
          {gameHistory.map((dayData, dayIndex) => {
            // Format date for display
            const date = new Date(dayData.date);
            const formattedDate = date.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });

            return (
              <View key={dayIndex} style={historyStyles.historyDateGroup}>
                <View style={historyStyles.historyDateHeader}>
                  <View style={historyStyles.historyDateBadge}>
                    <Text style={historyStyles.historyDateBadgeText}>
                      {date.toLocaleDateString("en-US", {
                        day: "2-digit",
                      })}
                    </Text>
                  </View>
                  <Text style={historyStyles.historyDateText}>
                    {formattedDate}
                  </Text>
                </View>

                {dayData.games.map((game: { 
                  details?: { accuracy?: string | number };
                  score?: string | number;
                  time: number;
                  game: string;
                }, gameIndex: number) => {
                  // Check for accuracy in details
                  let accuracy = null;
                  if (game.details && game.details.accuracy) {
                    accuracy = game.details.accuracy;
                  }

                  // Calculate accuracy percentage for display
                  const accuracyPercent = accuracy
                    ? Math.min(Math.max(parseFloat(accuracy.toString()), 0), 100)
                    : Math.min(
                        Math.max((parseInt(game.score?.toString() || "0") / 10) * 100, 10),
                        100
                      );

                  // Format duration to minutes
                  const durationMinutes = (game.time / 60).toFixed(1);

                  return (
                    <View key={gameIndex} style={historyStyles.historyCard}>
                      <View style={historyStyles.historyGameIcon}>
                        <Ionicons
                          name="game-controller"
                          size={24}
                          color="#fff"
                        />
                      </View>
                      <View style={historyStyles.historyCardContent}>
                        <Text style={historyStyles.historyGameTitle}>
                          {game.game}
                        </Text>
                        <View style={historyStyles.historyDetails}>
                          <Feather
                            name="clock"
                            size={14}
                            color="#5f2446"
                            style={historyStyles.historyDetailIcon}
                          />
                          <Text style={historyStyles.historyTimeText}>
                            {durationMinutes} min
                          </Text>
                          <Feather
                            name="award"
                            size={14}
                            color="#5f2446"
                            style={historyStyles.historyDetailIcon}
                          />
                          <Text style={historyStyles.historyScoreText}>
                            Score:{" "}
                            <Text style={historyStyles.historyScoreValue}>
                              {game.score || "N/A"}
                            </Text>
                          </Text>
                        </View>

                        <View style={historyStyles.historyAccuracy}>
                          <Text style={historyStyles.historyAccuracyLabel}>
                            Accuracy
                          </Text>
                          <View style={historyStyles.historyDetails}>
                            <View style={historyStyles.historyAccuracyBar}>
                              <View
                                style={[
                                  historyStyles.historyAccuracyFill,
                                  { width: `${accuracyPercent}%` },
                                ]}
                              />
                            </View>
                            <Text style={historyStyles.historyAccuracyText}>
                              {Math.round(accuracyPercent)}%
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Hello,</Text>
        <Text style={styles.patientName}>{username}</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "activities" && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab("activities")}
        >
          <Feather
            name="activity"
            size={20}
            color={activeTab === "activities" ? "#5f2446" : "#888"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "activities" && styles.activeTabText,
            ]}
          >
            Activities
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "queries" && styles.activeTabButton,
          ]}
          onPress={() => router.push("/queries")}
        >
          <Feather
            name="help-circle"
            size={20}
            color={activeTab === "queries" ? "#5f2446" : "#888"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "queries" && styles.activeTabText,
            ]}
          >
            Queries
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "progress" && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab("progress")}
        >
          <Ionicons
            name="trending-up"
            size={20}
            color={activeTab === "progress" ? "#5f2446" : "#888"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "progress" && styles.activeTabText,
            ]}
          >
            Progress
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "reminder" && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab("reminder")}
        >
          <MaterialIcons
            name="notifications"
            size={20}
            color={activeTab === "reminder" ? "#5f2446" : "#888"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "reminder" && styles.activeTabText,
            ]}
          >
            Reminder
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "history" && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab("history")}
        >
          <Feather
            name="clock"
            size={20}
            color={activeTab === "history" ? "#5f2446" : "#888"}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "history" && styles.activeTabText,
            ]}
          >
            History
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "activities" && renderActivitiesTab()}
      {activeTab === "progress" && renderProgressTab()}
      {activeTab === "reminder" && renderReminderTab()}
      {activeTab === "history" && renderHistoryTab()}
    </ScrollView>
  );
}

const historyStyles = StyleSheet.create({
  historyContainer: {
    marginBottom: 20,
  },
  historyDateGroup: {
    marginBottom: 15,
  },
  historyDateHeader: {
    flexDirection: "row" as "row",
    alignItems: "center" as "center",
    marginBottom: 10,
  },
  historyDateBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#5f2446",
    justifyContent: "center" as "center",
    alignItems: "center" as "center",
    marginRight: 10,
  },
  historyDateBadgeText: {
    fontSize: 16,
    fontWeight: "bold" as "bold",
    color: "#fff",
  },
  historyDateText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500" as "500",
  },
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row" as "row",
    alignItems: "center" as "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  historyGameIcon: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: "#5f2446",
    justifyContent: "center" as "center",
    alignItems: "center" as "center",
    marginRight: 15,
  },
  historyCardContent: {
    flex: 1,
  },
  historyGameTitle: {
    fontSize: 16,
    fontWeight: "bold" as "bold",
    color: "#333",
    marginBottom: 5,
  },
  historyDetails: {
    flexDirection: "row" as "row",
    alignItems: "center" as "center",
    marginBottom: 5,
  },
  historyDetailIcon: {
    marginRight: 4,
    color: "#5f2446",
  },
  historyTimeText: {
    fontSize: 14,
    color: "#666",
    marginRight: 15,
  },
  historyScoreText: {
    fontSize: 14,
    color: "#666",
  },
  historyScoreValue: {
    fontWeight: "bold" as "bold",
    color: "#5f2446",
  },
  historyAccuracy: {
    marginTop: 5,
  },
  historyAccuracyLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  historyAccuracyBar: {
    height: 6,
    backgroundColor: "#f0f0f0",
    borderRadius: 3,
    overflow: "hidden" as "hidden",
    flex: 1,
  },
  historyAccuracyFill: {
    height: 6,
    backgroundColor: "#5f2446",
    borderRadius: 3,
  },
  historyAccuracyText: {
    fontSize: 12,
    fontWeight: "bold" as "bold",
    color: "#5f2446",
    marginLeft: 8,
  },
});

const localStyles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
  },
  emptyStateContainer: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginVertical: 10,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 15,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  emptyStateButton: {
    backgroundColor: "#5f2446",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 10,
  },
  emptyStateButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  contentSection: {
    marginTop: 15,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    fontWeight: "500",
  },
  progressDateGroup: {
    marginBottom: 15,
  },
  progressDateHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  progressDateBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#5f2446",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  progressDateBadgeText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  progressDateText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  progressCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  progressGameIcon: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: "#5f2446",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  progressCardContent: {
    flex: 1,
  },
  progressGameTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  progressDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: "#f0f0f0",
    borderRadius: 3,
    overflow: "hidden",
    flex: 1,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#5f2446",
    borderRadius: 3,
  },
  progressTimeText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    marginLeft: 10,
  },
  progressScoreText: {
    fontSize: 14,
    color: "#666",
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  welcomeSection: {
    backgroundColor: "#5f2446",
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 50,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  welcomeText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
  },
  patientName: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 5,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 20,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoItem: {
    flex: 1,
    alignItems: "center",
  },
  infoValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0D0145",
    marginBottom: 5,
  },
  infoLabel: {
    fontSize: 14,
    color: "#888",
  },
  divider: {
    width: 1,
    height: "100%",
    backgroundColor: "#eee",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: -25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: "rgba(95, 36, 70, 0.1)",
  },
  tabText: {
    fontSize: 11,
    color: "#888",
    marginTop: 4,
  },
  activeTabText: {
    color: "#5f2446",
    fontWeight: "bold",
  },
  contentSection: {
    marginTop: 15,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    fontWeight: "500",
  },
  gamesContainer: {
    marginBottom: 30,
  },
  gameButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  gameIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#5f2446",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  gameButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  gameDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    paddingRight: 30,
  },
  gameArrow: {
    position: "absolute",
    right: 20,
    top: "50%",
    marginTop: -12,
  },
  doctorIdContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 20,
  },
  doctorIdLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  doctorIdInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  doctorIdInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  doctorIdSubmitButton: {
    backgroundColor: "#5f2446",
    padding: 12,
    borderRadius: 8,
    marginLeft: 10,
  },
  doctorIdSubmitText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  queriesContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  queriesText: {
    fontSize: 16,
    color: "#888",
    marginBottom: 20,
  },
  newQueryButton: {
    backgroundColor: "#5f2446",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  newQueryButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
  progressStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: "#fff",
    flex: 1,
    margin: 5,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#5f2446",
  },
  statLabel: {
    fontSize: 14,
    color: "#888",
    marginTop: 5,
  },
  remindersList: {
    marginBottom: 20,
  },
  reminderCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  reminderIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  reminderTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  reminderTimeIcon: {
    marginRight: 4,
  },
  reminderDate: {
    fontSize: 14,
    color: "#888",
    marginRight: 10,
  },
  reminderTime: {
    fontSize: 14,
    color: "#888",
  },
  reminderActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  reminderActionButton: {
    padding: 6,
    marginLeft: 5,
  },
  noRemindersContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  noRemindersText: {
    fontSize: 16,
    color: "#888",
    marginBottom: 20,
  },
  addReminderButton: {
    backgroundColor: "#5f2446",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  addReminderButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
  historyList: {
    marginBottom: 20,
  },
  historyItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  historyDate: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: "#5f2446",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  historyMonth: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#fff",
  },
  historyDay: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  historyDetail: {
    fontSize: 14,
    color: "#888",
  },
  eyeTestCard: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
  },
  eyeTestBackground: {
    width: "100%",
    overflow: "hidden",
  },
  eyeTestContent: {
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  eyeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  eyeTestDate: {
    fontSize: 14,
    color: "#888",
  },
  eyeTestResult: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginVertical: 5,
  },
  eyeTestRecommendation: {
    fontSize: 14,
    color: "#5f2446",
  },
  todayGamesContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  todayGamesTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  gameProgressItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  gameProgressIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  gameProgressInfo: {
    flex: 1,
  },
  gameProgressTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 6,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: "#f0f0f0",
    borderRadius: 3,
    overflow: "hidden",
    flex: 1,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#5f2446",
    borderRadius: 3,
  },
  gameProgressScore: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#5f2446",
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  reminderInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
    marginBottom: 15,
  },
  dateTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: "#f9f9f9",
    marginBottom: 15,
  },
  dateTimeText: {
    fontSize: 16,
    color: "#333",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    marginRight: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "bold",
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#5f2446",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  // Additional styles that were missing
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  queriesList: {
    maxHeight: 300,
  },
  queryItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  queryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  queryStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pendingBadge: {
    backgroundColor: "#ffefd5",
  },
  answeredBadge: {
    backgroundColor: "#d4edda",
  },
  queryStatusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  queryDate: {
    fontSize: 12,
    color: "#888",
  },
  queryQuestion: {
    fontSize: 14,
    color: "#333",
    marginBottom: 10,
  },
  queryResponse: {
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#5f2446",
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: "#333",
  },
  noQueriesText: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    padding: 20,
  },
  newQueryFormContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    width: "100%",
  },
  newQueryInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    height: 100,
    textAlignVertical: "top",
    fontSize: 14,
    color: "#333",
  },
  newQueryFormButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  submitQueryButton: {
    backgroundColor: "#5f2446",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 10,
  },
  submitQueryButtonText: {
    color: "#fff",
    fontWeight: "500",
    fontSize: 14,
  },
});
