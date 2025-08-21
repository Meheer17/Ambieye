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
import { VisitRecord } from "@/services/api/doctorService";

export default function PatientHome() {
  const { username } = useAuth();
  const [activeSection, setActiveSection] = useState<any>(null);
  const [reminders, setReminders] = useState<any[]>([]);
  const [visitHistory, setVisitHistory] = useState<VisitRecord[]>([]);

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

  // Profile data for visit history
  const [profileData, setProfileData] = useState<any>(null);
  const [visitHistoryLoading, setVisitHistoryLoading] = useState(true);
  const [selectedVisitRecord, setSelectedVisitRecord] = useState<any>(null);
  const [showVisitDetailsModal, setShowVisitDetailsModal] = useState(false);

  // Fetch dashboard data
  useEffect(() => {
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

    // Fetch profile data for visit history
    const fetchProfileData = async () => {
      setVisitHistoryLoading(true);
      try {
        const profileResponse = await patientService.getProfile();
        if (profileResponse.success) {
          setProfileData(profileResponse.profile);
          if (profileResponse.profile.visitRecords) {
            setVisitHistory(profileResponse.profile.visitRecords);
          }

          // Check doctor_id and redirect if missing
          if (profileResponse.profile && !profileResponse.profile.doctor_id) {
            router.replace("/settings");
          }

        } else {
          console.error(
            "Error fetching profile data:",
            profileResponse.message,
          );
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setVisitHistoryLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  // Fetch game history for both history and progress sections
  useEffect(() => {
    if (activeSection === "progress" || activeSection === "history") {
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
  }, [activeSection]);

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

  const showVisitDetails = (visit: any) => {
    setSelectedVisitRecord(visit);
    setShowVisitDetailsModal(true);
  };

  // Format date to a readable string
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const renderProgressSection = () => {
    if (historyIsLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5f2446" />
          <Text style={dashboardStyles.loadingText}>
            Loading your progress...
          </Text>
        </View>
      );
    }

    if (!gameHistory || gameHistory.length === 0) {
      return (
        <View style={dashboardStyles.emptyStateContainer}>
          <MaterialIcons
            name="trending-up"
            size={60}
            color="#5f2446"
            style={{ opacity: 0.6 }}
          />
          <Text style={dashboardStyles.emptyStateTitle}>
            No Progress Data Yet
          </Text>
          <Text style={dashboardStyles.emptyStateMessage}>
            Complete some games to see your progress tracked here
          </Text>
          <TouchableOpacity
            style={dashboardStyles.emptyStateButton}
            onPress={() => router.push("/games")}
          >
            <Text style={dashboardStyles.emptyStateButtonText}>
              Start Playing
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveSection(null)}
            style={styles.backButtons}
          >
            <Feather
              name="arrow-left"
              size={18}
              color="#5f2446"
              style={{ marginRight: 5 }}
            />
            <Text style={dashboardStyles.backLink}>Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Get today's data (first entry should be the most recent)
    const todaysData = gameHistory[0];
    const todaysDate = new Date(todaysData?.date || new Date());
    const formattedDate = todaysDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    // Get stats from summary data
    const gamesPlayed = todaysData?.summary?.totalGames || 0;
    const totalGames = 12; // Total possible games
    const completionPercentage = Math.min(
      Math.round((gamesPlayed / totalGames) * 100),
      100,
    );

    // Get average score and accuracy from summary
    const averageScore = Math.round(todaysData?.summary?.averageScore || 0);
    const averageAccuracy = Math.round(
      todaysData?.summary?.averageAccuracy || 0,
    );

    // Convert total play time from seconds to hours and minutes
    // const totalPlayTimeSeconds = todaysData?.summary?.totalPlayTime || 0;
    // const totalPlayTimeHours = Math.floor(totalPlayTimeSeconds / 3600);
    // const totalPlayTimeMinutes = Math.floor((totalPlayTimeSeconds % 3600) / 60);
    // const formattedTime = totalPlayTimeHours > 0
    //   ? `${totalPlayTimeHours}h ${totalPlayTimeMinutes}m`
    //   : `${totalPlayTimeMinutes}m`;

    return (
      <ScrollView style={styles.sectionContent}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Progress</Text>
          <TouchableOpacity
            onPress={() => setActiveSection(null)}
            style={styles.backButton}
          >
            <Feather
              name="arrow-left"
              size={18}
              color="#5f2446"
              style={{ marginRight: 5 }}
            />
            <Text style={dashboardStyles.backLink}>Back</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Progress Summary Card */}
        <View style={progressStyles.progressSummaryCard}>
          <Text style={progressStyles.progressSummaryDate}>
            {formattedDate}
          </Text>

          <View style={progressStyles.progressSummaryStatsRow}>
            <View style={progressStyles.progressSummaryStatItem}>
              <Text style={progressStyles.progressSummaryStatValue}>
                {gamesPlayed}
              </Text>
              <Text style={progressStyles.progressSummaryStatLabel}>
                Games Played
              </Text>
            </View>
            <View style={progressStyles.progressSummaryStatDivider} />

            <View style={progressStyles.progressSummaryStatItem}>
              <Text style={progressStyles.progressSummaryStatValue}>
                {averageScore}
              </Text>
              <Text style={progressStyles.progressSummaryStatLabel}>
                Avg Score
              </Text>
            </View>
            <View style={progressStyles.progressSummaryStatDivider} />

            <View style={progressStyles.progressSummaryStatItem}>
              <Text style={progressStyles.progressSummaryStatValue}>
                {averageAccuracy}%
              </Text>
              <Text style={progressStyles.progressSummaryStatLabel}>
                Avg Accuracy
              </Text>
            </View>
          </View>

          <View style={progressStyles.progressCompletionContainer}>
            <Text style={progressStyles.progressCompletionText}>
              {gamesPlayed} of {totalGames} games completed (
              {completionPercentage}%)
            </Text>
            <View style={progressStyles.progressCompletionBar}>
              <View
                style={[
                  progressStyles.progressCompletionFill,
                  { width: `${completionPercentage}%` },
                ]}
              />
            </View>
          </View>

          <Text style={progressStyles.progressGamesListTitle}>
            Todays Games
          </Text>

          {todaysData?.games?.map((game: any, index: number) => {
            // Calculate accuracy percentage for display
            let accuracy = null;
            if (game.details && game.details.accuracy) {
              accuracy = game.details.accuracy;
            }

            const accuracyPercent = accuracy
              ? Math.min(Math.max(parseFloat(accuracy.toString()), 0), 100)
              : Math.min(
                Math.max(
                  (parseInt(game.score?.toString() || "0") / 10) * 100,
                  10,
                ),
                100,
              );

            // Format duration to minutes
            const durationMinutes = (game.time / 60).toFixed(1);

            return (
              <View key={index} style={progressStyles.progressGameItem}>
                <View style={progressStyles.progressGameIconContainer}>
                  <Ionicons name="game-controller" size={22} color="#fff" />
                </View>
                <View style={progressStyles.progressGameContent}>
                  <Text style={progressStyles.progressGameName}>
                    {game.game}
                  </Text>
                  <View style={progressStyles.progressGameStats}>
                    <Text style={progressStyles.progressGameScore}>
                      Score:{" "}
                      <Text style={progressStyles.progressGameScoreValue}>
                        {game.score || 0}
                      </Text>
                    </Text>
                    <Text style={progressStyles.progressGameTime}>
                      {durationMinutes} min
                    </Text>
                  </View>
                  <View style={progressStyles.progressGameAccuracyContainer}>
                    <View style={progressStyles.progressGameAccuracyBar}>
                      <View
                        style={[
                          progressStyles.progressGameAccuracyFill,
                          { width: `${accuracyPercent}%` },
                        ]}
                      />
                    </View>
                    <Text style={progressStyles.progressGameAccuracyText}>
                      {Math.round(accuracyPercent)}%
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}

          {(!todaysData?.games || todaysData.games.length === 0) && (
            <View style={progressStyles.noGamesContainer}>
              <Text style={progressStyles.noGamesText}>
                No games played today. Start playing to track your progress!
              </Text>
              <TouchableOpacity
                style={dashboardStyles.emptyStateButton}
                onPress={() => router.push("/games")}
              >
                <Text style={dashboardStyles.emptyStateButtonText}>
                  Play Now
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveSection(null)}
                style={[
                  styles.backButton,
                  { alignSelf: "center", marginTop: 20, marginBottom: 30 },
                ]}
              >
                <Feather
                  name="arrow-left"
                  size={18}
                  color="#5f2446"
                  style={{ marginRight: 5 }}
                />
                <Text style={dashboardStyles.backLink}>Back to Dashboard</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Previous Days Data */}
        {gameHistory.slice(1).map((dayData, dayIndex) => {
          // Format date for display
          const date = new Date(dayData.date);
          const formattedDate = date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          });

          // Get stats from summary data for this day
          const gamesPlayedForDay = dayData?.summary?.totalGames || 0;
          const completionPercentageForDay = Math.min(
            Math.round((gamesPlayedForDay / totalGames) * 100),
            100,
          );

          return (
            <View key={dayIndex} style={progressStyles.progressPastDayCard}>
              <View style={progressStyles.progressPastDayHeader}>
                <View style={progressStyles.progressPastDayBadge}>
                  <Text style={progressStyles.progressPastDayBadgeText}>
                    {date.toLocaleDateString("en-US", { day: "2-digit" })}
                  </Text>
                </View>
                <View style={progressStyles.progressPastDayInfo}>
                  <Text style={progressStyles.progressPastDayDate}>
                    {formattedDate}
                  </Text>
                  <Text style={progressStyles.progressPastDayStats}>
                    {gamesPlayedForDay} games • {completionPercentageForDay}%
                    completed
                  </Text>
                </View>
              </View>

              <View style={progressStyles.progressPastDayCompletion}>
                <View style={progressStyles.progressPastDayCompletionBar}>
                  <View
                    style={[
                      progressStyles.progressPastDayCompletionFill,
                      { width: `${completionPercentageForDay}%` },
                    ]}
                  />
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const renderHistorySection = () => {
    if (historyIsLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5f2446" />
          <Text style={dashboardStyles.loadingText}>
            Loading your history...
          </Text>
        </View>
      );
    }

    if (!gameHistory || gameHistory.length === 0) {
      return (
        <View style={dashboardStyles.emptyStateContainer}>
          <MaterialIcons
            name="history"
            size={60}
            color="#5f2446"
            style={{ opacity: 0.6 }}
          />
          <Text style={dashboardStyles.emptyStateTitle}>No History Yet</Text>
          <Text style={dashboardStyles.emptyStateMessage}>
            Play some games to build your gaming history
          </Text>
          <TouchableOpacity
            style={dashboardStyles.emptyStateButton}
            onPress={() => router.push("/games")}
          >
            <Text style={dashboardStyles.emptyStateButtonText}>
              Start Playing
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveSection(null)}
            style={styles.backButtons}
          >
            <Feather
              name="arrow-left"
              size={18}
              color="#5f2446"
              style={{ marginRight: 5 }}
            />
            <Text style={dashboardStyles.backLink}>Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView style={styles.sectionContent}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Game History</Text>
          <TouchableOpacity
            onPress={() => setActiveSection(null)}
            style={styles.backButton}
          >
            <Feather
              name="arrow-left"
              size={18}
              color="#5f2446"
              style={{ marginRight: 5 }}
            />
            <Text style={dashboardStyles.backLink}>Back</Text>
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

                {dayData.games.map(
                  (
                    game: {
                      details?: { accuracy?: string | number };
                      score?: string | number;
                      time: number;
                      game: string;
                    },
                    gameIndex: number,
                  ) => {
                    // Check for accuracy in details
                    let accuracy = null;
                    if (game.details && game.details.accuracy) {
                      accuracy = game.details.accuracy;
                    }

                    // Calculate accuracy percentage for display
                    const accuracyPercent = accuracy
                      ? Math.min(
                        Math.max(parseFloat(accuracy.toString()), 0),
                        100,
                      )
                      : Math.min(
                        Math.max(
                          (parseInt(game.score?.toString() || "0") / 10) *
                          100,
                          10,
                        ),
                        100,
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
                  },
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const renderReminderSection = () => (
    <ScrollView style={styles.sectionContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Reminders</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setShowReminderForm(true)}
            style={styles.addButton}
          >
            <Feather
              name="plus"
              size={18}
              color="#5f2446"
              style={{ marginRight: 5 }}
            />
            <Text style={styles.addLink}>Add New</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveSection(null)}
            style={styles.backButton}
          >
            <Feather
              name="arrow-left"
              size={18}
              color="#5f2446"
              style={{ marginRight: 5 }}
            />
            <Text style={dashboardStyles.backLink}>Back</Text>
          </TouchableOpacity>
        </View>
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
            <Text style={styles.noRemindersText}>No reminders set</Text>
            <TouchableOpacity
              style={styles.addReminderButton}
              onPress={() => setShowReminderForm(true)}
            >
              <Text style={styles.addReminderButtonText}>+ Set Reminder</Text>
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
    </ScrollView>
  );
  const renderVisitHistorySection = () => {
    if (visitHistoryLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5f2446" />
          <Text style={dashboardStyles.loadingText}>
            Loading visit history...
          </Text>
        </View>
      );
    }

    const sortedVisitHistory = [...visitHistory].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return (
      <ScrollView style={styles.sectionContent}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Review Dates</Text>
          <TouchableOpacity
            onPress={() => setActiveSection(null)}
            style={styles.backButton}
          >
            <Feather
              name="arrow-left"
              size={18}
              color="#5f2446"
              style={{ marginRight: 5 }}
            />
            <Text style={dashboardStyles.backLink}>Back</Text>
          </TouchableOpacity>
        </View>

        {sortedVisitHistory.length > 0 ? (
          sortedVisitHistory.map((visit, index) => (
            <TouchableOpacity
              key={index}
              style={dashboardStyles.visitRecordCard}
              onPress={() => showVisitDetails(visit)}
            >
              <View style={dashboardStyles.visitRecordHeader}>
                <View style={dashboardStyles.visitDateContainer}>
                  <Feather name="calendar" size={16} color="#5f2446" />
                  <Text style={dashboardStyles.visitDate}>
                    {formatDate(visit.date)}
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="#888" />
              </View>

              <View style={dashboardStyles.visitRecordDetails}>
                {visit.notes && (
                  <View style={dashboardStyles.visitRecordItem}>
                    <Text style={dashboardStyles.visitRecordLabel}>Notes:</Text>
                    <Text style={dashboardStyles.visitRecordValue}>
                      {visit.notes}
                    </Text>
                  </View>
                )}

                {visit.visiondistant && (
                  <View style={dashboardStyles.visitRecordItem}>
                    <Text style={dashboardStyles.visitRecordLabel}>
                      Distant Vision:
                    </Text>
                    <Text style={dashboardStyles.visitRecordValue}>
                      {visit.visiondistant}
                    </Text>
                  </View>
                )}

                {visit.visionnear && (
                  <View style={dashboardStyles.visitRecordItem}>
                    <Text style={dashboardStyles.visitRecordLabel}>
                      Near Vision:
                    </Text>
                    <Text style={dashboardStyles.visitRecordValue}>
                      {visit.visionnear}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={dashboardStyles.noRecordsContainer}>
            <Feather name="file-text" size={40} color="#ccc" />
            <Text style={dashboardStyles.noRecordsText}>
              No visit records available
            </Text>
          </View>
        )}

        {/* Visit Details Modal */}
        <Modal
          visible={showVisitDetailsModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowVisitDetailsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={dashboardStyles.modalHeader}>
                <Text style={styles.modalTitle}>Visit Details</Text>
                <TouchableOpacity
                  onPress={() => setShowVisitDetailsModal(false)}
                >
                  <Feather name="x" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView style={dashboardStyles.modalScrollContent}>
                {selectedVisitRecord && (
                  <>
                    <View style={dashboardStyles.visitDetailHeader}>
                      <Feather name="calendar" size={18} color="#5f2446" />
                      <Text style={dashboardStyles.visitDetailDate}>
                        {formatDate(selectedVisitRecord.date)}
                      </Text>
                    </View>

                    {/* Vision Assessment Section */}
                    <View style={dashboardStyles.visitDetailSection}>
                      <Text style={dashboardStyles.visitDetailSectionTitle}>
                        Vision Assessment
                      </Text>

                      {selectedVisitRecord.visiondistant && (
                        <View style={dashboardStyles.visitDetailItem}>
                          <Text style={dashboardStyles.visitDetailLabel}>
                            Distant Vision:
                          </Text>
                          <Text style={dashboardStyles.visitDetailValue}>
                            {selectedVisitRecord.visiondistant}
                          </Text>
                        </View>
                      )}

                      {selectedVisitRecord.visionnear && (
                        <View style={dashboardStyles.visitDetailItem}>
                          <Text style={dashboardStyles.visitDetailLabel}>
                            Near Vision:
                          </Text>
                          <Text style={dashboardStyles.visitDetailValue}>
                            {selectedVisitRecord.visionnear}
                          </Text>
                        </View>
                      )}

                      {selectedVisitRecord.bcvadistant && (
                        <View style={dashboardStyles.visitDetailItem}>
                          <Text style={dashboardStyles.visitDetailLabel}>
                            BCVA Distant:
                          </Text>
                          <Text style={dashboardStyles.visitDetailValue}>
                            {selectedVisitRecord.bcvadistant}
                          </Text>
                        </View>
                      )}

                      {selectedVisitRecord.bcvanear && (
                        <View style={dashboardStyles.visitDetailItem}>
                          <Text style={dashboardStyles.visitDetailLabel}>
                            BCVA Near:
                          </Text>
                          <Text style={dashboardStyles.visitDetailValue}>
                            {selectedVisitRecord.bcvanear}
                          </Text>
                        </View>
                      )}

                      {selectedVisitRecord.colorvision && (
                        <View style={dashboardStyles.visitDetailItem}>
                          <Text style={dashboardStyles.visitDetailLabel}>
                            Color Vision:
                          </Text>
                          <Text style={dashboardStyles.visitDetailValue}>
                            {selectedVisitRecord.colorvision}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Retinoscopy Section */}
                    {(selectedVisitRecord.dryretinoscopy ||
                      selectedVisitRecord.wetretinoscopy) && (
                        <View style={dashboardStyles.visitDetailSection}>
                          <Text style={dashboardStyles.visitDetailSectionTitle}>
                            Retinoscopy
                          </Text>

                          {selectedVisitRecord.dryretinoscopy && (
                            <View style={dashboardStyles.visitDetailItem}>
                              <Text style={dashboardStyles.visitDetailLabel}>
                                Dry Retinoscopy:
                              </Text>
                              <Text style={dashboardStyles.visitDetailValue}>
                                {selectedVisitRecord.dryretinoscopy}
                              </Text>
                            </View>
                          )}

                          {selectedVisitRecord.wetretinoscopy && (
                            <View style={dashboardStyles.visitDetailItem}>
                              <Text style={dashboardStyles.visitDetailLabel}>
                                Wet Retinoscopy:
                              </Text>
                              <Text style={dashboardStyles.visitDetailValue}>
                                {selectedVisitRecord.wetretinoscopy}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}

                    {/* Other Measurements Section */}
                    {(selectedVisitRecord.pmtvisiontpg ||
                      selectedVisitRecord.pgpower ||
                      selectedVisitRecord.pmt ||
                      selectedVisitRecord.pda ||
                      selectedVisitRecord.adar ||
                      selectedVisitRecord.ar ||
                      selectedVisitRecord.nct) && (
                        <View style={dashboardStyles.visitDetailSection}>
                          <Text style={dashboardStyles.visitDetailSectionTitle}>
                            Other Measurements
                          </Text>

                          {selectedVisitRecord.pmtvisiontpg && (
                            <View style={dashboardStyles.visitDetailItem}>
                              <Text style={dashboardStyles.visitDetailLabel}>
                                PMT Vision TPG:
                              </Text>
                              <Text style={dashboardStyles.visitDetailValue}>
                                {selectedVisitRecord.pmtvisiontpg}
                              </Text>
                            </View>
                          )}

                          {selectedVisitRecord.pgpower && (
                            <View style={dashboardStyles.visitDetailItem}>
                              <Text style={dashboardStyles.visitDetailLabel}>
                                PG Power:
                              </Text>
                              <Text style={dashboardStyles.visitDetailValue}>
                                {selectedVisitRecord.pgpower}
                              </Text>
                            </View>
                          )}

                          {selectedVisitRecord.pmt && (
                            <View style={dashboardStyles.visitDetailItem}>
                              <Text style={dashboardStyles.visitDetailLabel}>
                                PMT:
                              </Text>
                              <Text style={dashboardStyles.visitDetailValue}>
                                {selectedVisitRecord.pmt}
                              </Text>
                            </View>
                          )}

                          {selectedVisitRecord.pda && (
                            <View style={dashboardStyles.visitDetailItem}>
                              <Text style={dashboardStyles.visitDetailLabel}>
                                PDA:
                              </Text>
                              <Text style={dashboardStyles.visitDetailValue}>
                                {selectedVisitRecord.pda}
                              </Text>
                            </View>
                          )}

                          {selectedVisitRecord.adar && (
                            <View style={dashboardStyles.visitDetailItem}>
                              <Text style={dashboardStyles.visitDetailLabel}>
                                ADAR:
                              </Text>
                              <Text style={dashboardStyles.visitDetailValue}>
                                {selectedVisitRecord.adar}
                              </Text>
                            </View>
                          )}

                          {selectedVisitRecord.ar && (
                            <View style={dashboardStyles.visitDetailItem}>
                              <Text style={dashboardStyles.visitDetailLabel}>
                                AR:
                              </Text>
                              <Text style={dashboardStyles.visitDetailValue}>
                                {selectedVisitRecord.ar}
                              </Text>
                            </View>
                          )}

                          {selectedVisitRecord.nct && (
                            <View style={dashboardStyles.visitDetailItem}>
                              <Text style={dashboardStyles.visitDetailLabel}>
                                NCT:
                              </Text>
                              <Text style={dashboardStyles.visitDetailValue}>
                                {selectedVisitRecord.nct}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}

                    {/* Prescription Section */}
                    {selectedVisitRecord.glassPrescription && (
                      <View style={dashboardStyles.visitDetailSection}>
                        <Text style={dashboardStyles.visitDetailSectionTitle}>
                          Prescription
                        </Text>
                        <View style={dashboardStyles.visitDetailItem}>
                          <Text style={dashboardStyles.visitDetailLabel}>
                            Glass Prescription:
                          </Text>
                          <Text style={dashboardStyles.visitDetailValue}>
                            {selectedVisitRecord.glassPrescription}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Notes Section */}
                    {selectedVisitRecord.notes && (
                      <View style={dashboardStyles.visitDetailSection}>
                        <Text style={dashboardStyles.visitDetailSectionTitle}>
                          Notes
                        </Text>
                        <View style={dashboardStyles.visitDetailItem}>
                          <Text style={dashboardStyles.visitDetailValue}>
                            {selectedVisitRecord.notes}
                          </Text>
                        </View>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>

              <TouchableOpacity
                style={dashboardStyles.modalCloseButton}
                onPress={() => setShowVisitDetailsModal(false)}
              >
                <Text style={dashboardStyles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View
        style={[
          styles.welcomeSection,
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          },
        ]}
      >
        <View>
          <Text style={styles.welcomeText}>Hello,</Text>
          <Text style={styles.patientName}>{username}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/settings")}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(255,255,255,0.2)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Feather name="settings" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {activeSection ? (
        // Show active section content
        <>
          {activeSection === "progress" && renderProgressSection()}
          {activeSection === "reminder" && renderReminderSection()}
          {activeSection === "history" && renderHistorySection()}
          {activeSection === "reviewDates" && renderVisitHistorySection()}
        </>
      ) : (
        // Show dashboard grid
        <View style={dashboardStyles.dashboardGrid}>
          <TouchableOpacity
            style={dashboardStyles.dashboardItem}
            onPress={() => router.push("/games")}
          >
            <View
              style={[dashboardStyles.itemIcon, { backgroundColor: "#3498db" }]}
            >
              <FontAwesome name="gamepad" size={32} color="#fff" />
            </View>
            <Text style={dashboardStyles.itemTitle}>Activities</Text>
            <Text style={dashboardStyles.itemDescription}>
              Eye training games
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={dashboardStyles.dashboardItem}
            onPress={() => setActiveSection("progress")}
          >
            <View
              style={[dashboardStyles.itemIcon, { backgroundColor: "#2ecc71" }]}
            >
              <Ionicons name="trending-up" size={32} color="#fff" />
            </View>
            <Text style={dashboardStyles.itemTitle}>Progress</Text>
            <Text style={dashboardStyles.itemDescription}>
              Track your improvement
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={dashboardStyles.dashboardItem}
            onPress={() => setActiveSection("reminder")}
          >
            <View
              style={[dashboardStyles.itemIcon, { backgroundColor: "#f39c12" }]}
            >
              <MaterialIcons name="notifications" size={32} color="#fff" />
            </View>
            <Text style={dashboardStyles.itemTitle}>Reminders</Text>
            <Text style={dashboardStyles.itemDescription}>
              Set your notifications
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={dashboardStyles.dashboardItem}
            onPress={() => setActiveSection("reviewDates")}
          >
            <View
              style={[dashboardStyles.itemIcon, { backgroundColor: "#9b59b6" }]}
            >
              <Feather name="calendar" size={32} color="#fff" />
            </View>
            <Text style={dashboardStyles.itemTitle}>Review Dates</Text>
            <Text style={dashboardStyles.itemDescription}>Visit history</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={dashboardStyles.dashboardItem}
            onPress={() => router.push("/queries")}
          >
            <View
              style={[dashboardStyles.itemIcon, { backgroundColor: "#e74c3c" }]}
            >
              <Feather name="help-circle" size={32} color="#fff" />
            </View>
            <Text style={dashboardStyles.itemTitle}>Queries</Text>
            <Text style={dashboardStyles.itemDescription}>Ask your doctor</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={dashboardStyles.dashboardItem}
            onPress={() => setActiveSection("history")}
          >
            <View
              style={[dashboardStyles.itemIcon, { backgroundColor: "#1abc9c" }]}
            >
              <Feather name="clock" size={32} color="#fff" />
            </View>
            <Text style={dashboardStyles.itemTitle}>History</Text>
            <Text style={dashboardStyles.itemDescription}>
              Game play history
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const progressStyles = StyleSheet.create({
  progressSummaryCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressSummaryDate: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 18,
    textAlign: "center",
  },
  progressSummaryStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  progressSummaryStatItem: {
    flex: 1,
    alignItems: "center",
  },
  progressSummaryStatValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#5f2446",
    marginBottom: 6,
  },
  progressSummaryStatLabel: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  progressSummaryStatDivider: {
    height: 40,
    width: 1,
    backgroundColor: "#e0e0e0",
  },
  progressCompletionContainer: {
    marginBottom: 24,
  },
  progressCompletionText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  progressCompletionBar: {
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressCompletionFill: {
    height: 8,
    backgroundColor: "#5f2446",
    borderRadius: 4,
  },
  progressGamesListTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  progressGameItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  progressGameIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#5f2446",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  progressGameContent: {
    flex: 1,
  },
  progressGameName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  progressGameStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressGameScore: {
    fontSize: 14,
    color: "#666",
  },
  progressGameScoreValue: {
    fontWeight: "bold",
    color: "#5f2446",
  },
  progressGameTime: {
    fontSize: 14,
    color: "#666",
  },
  progressGameAccuracyContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressGameAccuracyBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#f0f0f0",
    borderRadius: 3,
    overflow: "hidden",
    marginRight: 10,
  },
  progressGameAccuracyFill: {
    height: 6,
    backgroundColor: "#5f2446",
    borderRadius: 3,
  },
  progressGameAccuracyText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#5f2446",
    width: 40,
    textAlign: "right",
  },
  noGamesContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  noGamesText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  progressPastDayCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  progressPastDayHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  progressPastDayBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#5f2446",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  progressPastDayBadgeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  progressPastDayInfo: {
    flex: 1,
  },
  progressPastDayDate: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  progressPastDayStats: {
    fontSize: 14,
    color: "#666",
  },
  progressPastDayCompletion: {
    marginTop: 4,
  },
  progressPastDayCompletionBar: {
    height: 6,
    backgroundColor: "#f0f0f0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressPastDayCompletionFill: {
    height: 6,
    backgroundColor: "#5f2446",
    borderRadius: 3,
  },
});

// New dashboard styles for the grid layout
const dashboardStyles = StyleSheet.create({
  dashboardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 20,
    marginTop: 10,
  },
  dashboardItem: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 3,
  },
  itemIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  itemDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 15,
    textAlign: "center",
  },
  emptyStateContainer: {
    padding: 35,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    margin: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 22,
  },
  emptyStateButton: {
    backgroundColor: "#5f2446",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  emptyStateButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  backLink: {
    color: "#5f2446",
    fontWeight: "500",
    fontSize: 16,
  },
  progressDateGroup: {
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  progressDateHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  progressDateBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#5f2446",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  progressDateBadgeText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  progressDateText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  progressCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  progressGameIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#5f2446",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  progressCardContent: {
    flex: 1,
  },
  progressGameTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  progressDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  progressTimeText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    marginLeft: 12,
  },
  progressScoreText: {
    fontSize: 14,
    color: "#666",
  },
  // Styles for visit history
  visitRecordCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    marginBottom: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginHorizontal: 15,
  },
  visitRecordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  visitDateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  visitDate: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
    marginLeft: 10,
  },
  visitRecordDetails: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 14,
  },
  visitRecordItem: {
    marginBottom: 10,
  },
  visitRecordLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  visitRecordValue: {
    fontSize: 16,
    color: "#333",
    lineHeight: 22,
  },
  noRecordsContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 35,
    backgroundColor: "#fff",
    borderRadius: 15,
    margin: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  noRecordsText: {
    fontSize: 16,
    color: "#666",
    marginTop: 15,
    textAlign: "center",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalScrollContent: {
    maxHeight: 400,
    paddingRight: 5,
  },
  visitDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },
  visitDetailDate: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
    marginLeft: 10,
  },
  visitDetailSection: {
    marginBottom: 24,
  },
  visitDetailSectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#5f2446",
    marginBottom: 12,
  },
  visitDetailItem: {
    marginBottom: 12,
  },
  visitDetailLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  visitDetailValue: {
    fontSize: 16,
    color: "#333",
    lineHeight: 22,
  },
  modalCloseButton: {
    backgroundColor: "#5f2446",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  modalCloseButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

const historyStyles = StyleSheet.create({
  historyContainer: {
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  historyDateGroup: {
    marginBottom: 18,
  },
  historyDateHeader: {
    flexDirection: "row" as "row",
    alignItems: "center" as "center",
    marginBottom: 12,
  },
  historyDateBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#5f2446",
    justifyContent: "center" as "center",
    alignItems: "center" as "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  historyDateBadgeText: {
    fontSize: 16,
    fontWeight: "bold" as "bold",
    color: "#fff",
  },
  historyDateText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600" as "600",
  },
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row" as "row",
    alignItems: "center" as "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  historyGameIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#5f2446",
    justifyContent: "center" as "center",
    alignItems: "center" as "center",
    marginRight: 16,
  },
  historyCardContent: {
    flex: 1,
  },
  historyGameTitle: {
    fontSize: 17,
    fontWeight: "bold" as "bold",
    color: "#333",
    marginBottom: 8,
  },
  historyDetails: {
    flexDirection: "row" as "row",
    alignItems: "center" as "center",
    marginBottom: 8,
  },
  historyDetailIcon: {
    marginRight: 6,
    color: "#5f2446",
  },
  historyTimeText: {
    fontSize: 14,
    color: "#666",
    marginRight: 16,
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
    marginTop: 8,
  },
  historyAccuracyLabel: {
    fontSize: 13,
    color: "#888",
    marginBottom: 5,
  },
  historyAccuracyBar: {
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    overflow: "hidden" as "hidden",
    flex: 1,
  },
  historyAccuracyFill: {
    height: 8,
    backgroundColor: "#5f2446",
    borderRadius: 4,
  },
  historyAccuracyText: {
    fontSize: 13,
    fontWeight: "bold" as "bold",
    color: "#5f2446",
    marginLeft: 10,
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
    paddingBottom: 30,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  welcomeText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 18,
    marginBottom: 5,
  },
  patientName: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 5,
  },
  sectionContent: {
    padding: 15,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "rgba(95, 36, 70, 0.1)",
  },
  backButtons: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "rgba(95, 36, 70, 0.1)",
    marginTop: 10,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 15,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "rgba(95, 36, 70, 0.1)",
  },
  addLink: {
    color: "#5f2446",
    fontWeight: "500",
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    marginTop: 20,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    overflow: "hidden",
    flex: 1,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#5f2446",
    borderRadius: 4,
  },
  remindersList: {
    marginBottom: 20,
  },
  reminderCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reminderIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 6,
  },
  reminderTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  reminderTimeIcon: {
    marginRight: 6,
  },
  reminderDate: {
    fontSize: 14,
    color: "#666",
    marginRight: 12,
  },
  reminderTime: {
    fontSize: 14,
    color: "#666",
  },
  reminderActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  reminderActionButton: {
    padding: 8,
    marginLeft: 5,
  },
  noRemindersContainer: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginTop: 10,
  },
  noRemindersText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },
  addReminderButton: {
    backgroundColor: "#5f2446",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  addReminderButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
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
    borderRadius: 15,
    padding: 25,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  reminderInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingVertical: 12,
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
    borderRadius: 10,
    paddingVertical: 14,
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
    marginTop: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    padding: 14,
    borderRadius: 10,
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
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
