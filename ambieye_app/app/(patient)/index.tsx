import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  StatusBar,
  BackHandler,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import Feather from "@expo/vector-icons/Feather";
import AntDesign from "@expo/vector-icons/AntDesign";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { patientService, Query } from "@/services/api/patientService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { VisitRecord } from "@/services/api/doctorService";
import { useFocusEffect } from "@react-navigation/native";
import EyeTrackingBadge from "@/components/EyeTrackingBadge";

export default function PatientHome() {
  const { username } = useAuth();
  const [activeSection, setActiveSection] = useState<any>(null);
  const [reminders, setReminders] = useState<any[]>([]);
  const [visitHistory, setVisitHistory] = useState<VisitRecord[]>([]);

  // History tab state
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [historyIsLoading, setHistoryIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Queries state
  const [queryStats, setQueryStats] = useState({
    pending: 0,
    answered: 0,
    total: 0,
  });
  const [recentQueries, setRecentQueries] = useState<Query[]>([]);
  const [queriesLoading, setQueriesLoading] = useState(true);

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

  const loadReminders = useCallback(async () => {
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
  }, []);

  const fetchProfileData = useCallback(async () => {
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
  }, [router]);

  // Fetch dashboard data
  useEffect(() => {
    loadReminders();
    fetchProfileData();
  }, [loadReminders, fetchProfileData]);

  const fetchDashboardQueries = useCallback(async () => {
    setQueriesLoading(true);
    try {
      const dashboardResponse = await patientService.getDashboard();
      if (dashboardResponse.success) {
        const stats = dashboardResponse.stats || {
          pendingQueries: 0,
          answeredQueries: 0,
          totalQueries: 0,
        };
        setQueryStats({
          pending: stats.pendingQueries || 0,
          answered: stats.answeredQueries || 0,
          total: stats.totalQueries || 0,
        });
        const recent = Array.isArray(dashboardResponse.recentQueries)
          ? dashboardResponse.recentQueries.slice(0, 3)
          : [];
        setRecentQueries(recent);
        return;
      }

      const queriesResponse = await patientService.getQueries();
      if (queriesResponse.success) {
        const sorted = [...queriesResponse.queries].sort(
          (a: Query, b: Query) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        const pendingCount = queriesResponse.queries.filter(
          (query: Query) => query.status === "pending",
        ).length;
        const answeredCount = queriesResponse.queries.filter(
          (query: Query) =>
            query.status === "answered" || query.status === "closed",
        ).length;
        setQueryStats({
          pending: pendingCount,
          answered: answeredCount,
          total: queriesResponse.queries.length,
        });
        setRecentQueries(sorted.slice(0, 3));
      } else {
        setQueryStats({ pending: 0, answered: 0, total: 0 });
        setRecentQueries([]);
      }
    } catch (error) {
      console.error("Error fetching queries:", error);
      setQueryStats({ pending: 0, answered: 0, total: 0 });
      setRecentQueries([]);
    } finally {
      setQueriesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardQueries();
  }, [fetchDashboardQueries]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (showVisitDetailsModal) {
          setShowVisitDetailsModal(false);
          return true;
        }
        if (showReminderForm) {
          setShowReminderForm(false);
          return true;
        }
        if (activeSection) {
          setActiveSection(null);
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => subscription.remove();
    }, [activeSection, showReminderForm, showVisitDetailsModal]),
  );

  const fetchGameHistory = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchGameHistory();
  }, [fetchGameHistory]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      loadReminders(),
      fetchProfileData(),
      fetchGameHistory(),
      fetchDashboardQueries(),
    ]);
    setIsRefreshing(false);
  }, [
    loadReminders,
    fetchProfileData,
    fetchGameHistory,
    fetchDashboardQueries,
  ]);

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

  const getAccuracyFromGame = (game: any) => {
    const accuracyValue = game?.details?.accuracy ?? game?.accuracy;
    if (accuracyValue !== undefined && accuracyValue !== null) {
      const parsed =
        typeof accuracyValue === "string"
          ? parseFloat(accuracyValue)
          : accuracyValue;
      if (!Number.isNaN(parsed)) {
        return Math.min(Math.max(parsed, 0), 100);
      }
    }

    const scoreValue = parseFloat(game?.score?.toString() || "0");
    if (!Number.isNaN(scoreValue)) {
      return Math.min(Math.max((scoreValue / 10) * 100, 0), 100);
    }

    return 0;
  };

  const calculateAverageAccuracy = (games: any[]) => {
    if (!games || games.length === 0) return 0;
    const total = games.reduce(
      (sum: number, game: any) => sum + getAccuracyFromGame(game),
      0,
    );
    return Math.round(total / games.length);
  };

  const sortedGameHistory = useMemo(() => {
    return [...gameHistory].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [gameHistory]);

  const playedGameHistory = useMemo(() => {
    return sortedGameHistory.filter((day: any) => {
      const totalGames = day?.summary?.totalGames ?? day?.games?.length ?? 0;
      return totalGames > 0;
    });
  }, [sortedGameHistory]);

  const chartDays = useMemo(() => {
    if (playedGameHistory.length <= 7) return playedGameHistory;
    return playedGameHistory.slice(playedGameHistory.length - 7);
  }, [playedGameHistory]);

  const progressChartData = useMemo(
    () =>
      chartDays.map((day: any) => ({
        label: new Date(day.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        value: day?.summary?.totalGames ?? day?.games?.length ?? 0,
      })),
    [chartDays],
  );

  const accuracyChartData = useMemo(
    () =>
      chartDays.map((day: any) => ({
        label: new Date(day.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        value: Math.round(
          day?.summary?.averageAccuracy ??
          calculateAverageAccuracy(day?.games || []),
        ),
      })),
    [chartDays],
  );

  const latestDayStats = useMemo(() => {
    if (playedGameHistory.length === 0) {
      return {
        dateLabel: "No recent activity",
        gamesPlayed: 0,
        averageScore: 0,
        averageAccuracy: 0,
        minutesPlayed: 0,
      };
    }

    const latestDay = playedGameHistory[playedGameHistory.length - 1];
    const latestGames = latestDay?.games || [];
    const totalGames = latestDay?.summary?.totalGames ?? latestGames.length;
    const averageScore = Math.round(
      latestDay?.summary?.averageScore ??
      (latestGames.length
        ? latestGames.reduce(
          (sum: number, game: any) =>
            sum + parseFloat(game?.score?.toString() || "0"),
          0,
        ) / latestGames.length
        : 0),
    );
    const averageAccuracy = Math.round(
      latestDay?.summary?.averageAccuracy ??
      calculateAverageAccuracy(latestGames),
    );
    const totalPlayTimeSeconds =
      latestDay?.summary?.totalPlayTime ??
      latestGames.reduce(
        (sum: number, game: any) => sum + (game?.time || 0),
        0,
      );

    return {
      dateLabel: new Date(latestDay.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      gamesPlayed: totalGames || 0,
      averageScore: Number.isFinite(averageScore) ? averageScore : 0,
      averageAccuracy: Number.isFinite(averageAccuracy) ? averageAccuracy : 0,
      minutesPlayed: Math.round(totalPlayTimeSeconds / 60),
    };
  }, [playedGameHistory]);

  const sortedVisitHistory = useMemo(() => {
    return [...visitHistory].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [visitHistory]);

  const progressChartMax = Math.max(
    ...progressChartData.map((item) => item.value),
    1,
  );
  const accuracyChartMax = 100;
  const weeklyGamesTotal = progressChartData.reduce(
    (sum, item) => sum + item.value,
    0,
  );
  const weeklyAccuracyAverage = accuracyChartData.length
    ? Math.round(
      accuracyChartData.reduce((sum, item) => sum + item.value, 0) /
      accuracyChartData.length,
    )
    : 0;

  const renderChartBars = (
    data: { label: string; value: number }[],
    color: string,
    maxValue: number,
  ) => {
    if (!data || data.length === 0) return null;

    // Use flex-start with gap when few bars, space-between when many
    const useSpaceBetween = data.length >= 4;

    return (
      <View style={[chartStyles.chartBars, !useSpaceBetween && { justifyContent: "flex-start", gap: 16 }]}>
        {data.map((item, index) => {
          const barHeight = Math.max(
            8,
            Math.round((item.value / maxValue) * 90),
          );
          return (
            <View
              key={`${item.label}-${index}`}
              style={[chartStyles.chartBarItem, !useSpaceBetween && { flex: 0, width: 40 }]}
            >
              <Text style={chartStyles.chartValue}>{item.value}</Text>
              <View
                style={[
                  chartStyles.chartBar,
                  {
                    height: barHeight,
                    backgroundColor: color,
                    opacity: item.value === 0 ? 0.35 : 1,
                  },
                ]}
              />
              <Text style={chartStyles.chartLabel}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const gameCategories = [
    {
      key: "identification",
      title: "Identify",
      description: "Colors and symbols",
      count: 5,
      color: "#0EA5E9",
      softColor: "rgba(14, 165, 233, 0.12)",
      icon: "visibility" as const,
    },
    {
      key: "movement",
      title: "Movement",
      description: "Tracking and motion",
      count: 4,
      color: "#8B5CF6",
      softColor: "rgba(139, 92, 246, 0.12)",
      icon: "track-changes" as const,
    },
    {
      key: "cognitive",
      title: "Cognitive",
      description: "Memory and focus",
      count: 3,
      color: "#10B981",
      softColor: "rgba(16, 185, 129, 0.12)",
      icon: "psychology" as const,
    },
  ];

  const handleCategoryPress = (categoryKey: string) => {
    router.push({
      pathname: "/games",
      params: { category: categoryKey },
    });
  };
  const renderProgressSection = () => {
    if (historyIsLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0284C7" />
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
            color="#0284C7"
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
              color="#0284C7"
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
      <ScrollView
        style={styles.sectionContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={["#0EA5E9"]}
            tintColor="#0EA5E9"
          />
        }
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Progress</Text>
          <TouchableOpacity
            onPress={() => setActiveSection(null)}
            style={styles.backButton}
          >
            <Feather
              name="arrow-left"
              size={18}
              color="#0284C7"
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
                  {/* Eye tracking result from OpenCV server */}
                  <EyeTrackingBadge eyeTracking={game.details?.eyeTracking} />
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
                  color="#0284C7"
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
          <ActivityIndicator size="large" color="#0284C7" />
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
            color="#0284C7"
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
              color="#0284C7"
              style={{ marginRight: 5 }}
            />
            <Text style={dashboardStyles.backLink}>Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.sectionContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={["#0EA5E9"]}
            tintColor="#0EA5E9"
          />
        }
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Game History</Text>
          <TouchableOpacity
            onPress={() => setActiveSection(null)}
            style={styles.backButton}
          >
            <Feather
              name="arrow-left"
              size={18}
              color="#0284C7"
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
                              color="#0284C7"
                              style={historyStyles.historyDetailIcon}
                            />
                            <Text style={historyStyles.historyTimeText}>
                              {durationMinutes} min
                            </Text>
                            <Feather
                              name="award"
                              size={14}
                              color="#0284C7"
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
    <ScrollView
      style={styles.sectionContent}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={["#0EA5E9"]}
          tintColor="#0EA5E9"
        />
      }
    >
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
              color="#0284C7"
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
              color="#0284C7"
              style={{ marginRight: 5 }}
            />
            <Text style={dashboardStyles.backLink}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.remindersList}>
        {reminders.map((reminder) => (
          <View key={reminder.id} style={styles.reminderCard}>
            <View style={[styles.reminderIcon, { backgroundColor: "#0F172A" }]}>
              <AntDesign name="clock-circle" size={24} color="#fff" />
            </View>
            <View style={styles.reminderContent}>
              <Text style={styles.reminderTitle}>{reminder.title}</Text>
              <View style={styles.reminderTimeContainer}>
                <Feather
                  name="calendar"
                  size={14}
                  color="#0284C7"
                  style={styles.reminderTimeIcon}
                />
                <Text style={styles.reminderDate}>{reminder.date}</Text>
                <Feather
                  name="clock"
                  size={14}
                  color="#0284C7"
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
                <Feather name="edit" size={20} color="#0284C7" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteReminder(reminder.id)}
                style={styles.reminderActionButton}
              >
                <Feather name="trash-2" size={20} color="#0284C7" />
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
                color="#0284C7"
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
                color="#0284C7"
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
          <ActivityIndicator size="large" color="#0284C7" />
          <Text style={dashboardStyles.loadingText}>
            Loading visit history...
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.sectionContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={["#0EA5E9"]}
            tintColor="#0EA5E9"
          />
        }
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Review Dates</Text>
          <TouchableOpacity
            onPress={() => setActiveSection(null)}
            style={styles.backButton}
          >
            <Feather
              name="arrow-left"
              size={18}
              color="#0284C7"
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
                  <Feather name="calendar" size={16} color="#0284C7" />
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

        {/* Visit Details Modal is rendered at the top level */}
      </ScrollView>
    );
  };

  // Shared Visit Details Modal (accessible from both dashboard and reviewDates section)
  const renderVisitDetailsModal = () => (
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
                  <Feather name="calendar" size={18} color="#0284C7" />
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
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      {renderVisitDetailsModal()}
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={["#0EA5E9"]}
            tintColor="#0EA5E9"
          />
        }
      >
        <View
          style={[
            styles.welcomeSection,
            {
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 16,
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
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: "rgba(255,255,255,0.12)",
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.2)",
            }}
          >
            <Feather name="settings" size={20} color="#fff" />
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
          <View style={dashboardStyles.dashboardContent}>
            <View style={dashboardStyles.sectionCard}>
              <View style={dashboardStyles.sectionHeaderRow}>
                <Text style={dashboardStyles.sectionHeaderTitle}>
                  Game Categories
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/games")}
                  style={dashboardStyles.linkButton}
                >
                  <Text style={dashboardStyles.linkText}>View all</Text>
                  <Feather name="chevron-right" size={16} color="#0EA5E9" />
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={dashboardStyles.categoryScroll}
              >
                {gameCategories.map((category) => (
                  <TouchableOpacity
                    key={category.key}
                    style={dashboardStyles.categoryCard}
                    onPress={() => handleCategoryPress(category.key)}
                    activeOpacity={0.9}
                  >
                    <View
                      style={[
                        dashboardStyles.categoryIcon,
                        { backgroundColor: category.softColor },
                      ]}
                    >
                      <MaterialIcons
                        name={category.icon}
                        size={22}
                        color={category.color}
                      />
                    </View>
                    <Text style={dashboardStyles.categoryTitle}>
                      {category.title}
                    </Text>
                    <Text style={dashboardStyles.categoryDescription}>
                      {category.description}
                    </Text>
                    <View style={dashboardStyles.categoryMetaRow}>
                      <Text
                        style={[
                          dashboardStyles.categoryCount,
                          { color: category.color },
                        ]}
                      >
                        {category.count} games
                      </Text>
                      <Feather
                        name="arrow-right"
                        size={14}
                        color={category.color}
                      />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={dashboardStyles.sectionCard}>
              <View style={dashboardStyles.sectionHeaderRow}>
                <Text style={dashboardStyles.sectionHeaderTitle}>Reminders</Text>
                <TouchableOpacity
                  onPress={() => setShowReminderForm(true)}
                  style={dashboardStyles.linkButton}
                >
                  <Feather name="plus" size={16} color="#0EA5E9" />
                  <Text style={dashboardStyles.linkText}>Add</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.remindersList}>
                {reminders.map((reminder) => (
                  <View key={reminder.id} style={styles.reminderCard}>
                    <View
                      style={[styles.reminderIcon, { backgroundColor: "#0F172A" }]}
                    >
                      <AntDesign name="clock-circle" size={24} color="#fff" />
                    </View>
                    <View style={styles.reminderContent}>
                      <Text style={styles.reminderTitle}>{reminder.title}</Text>
                      <View style={styles.reminderTimeContainer}>
                        <Feather
                          name="calendar"
                          size={14}
                          color="#0284C7"
                          style={styles.reminderTimeIcon}
                        />
                        <Text style={styles.reminderDate}>{reminder.date}</Text>
                        <Feather
                          name="clock"
                          size={14}
                          color="#0284C7"
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
                        <Feather name="edit" size={20} color="#0284C7" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteReminder(reminder.id)}
                        style={styles.reminderActionButton}
                      >
                        <Feather name="trash-2" size={20} color="#0284C7" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {reminders.length === 0 && (
                  <View style={dashboardStyles.inlineEmptyCard}>
                    <Text style={dashboardStyles.inlineEmptyTitle}>
                      No reminders yet
                    </Text>
                    <Text style={dashboardStyles.inlineEmptyText}>
                      Add a reminder to keep your routine on track.
                    </Text>
                    <TouchableOpacity
                      style={dashboardStyles.inlineEmptyButton}
                      onPress={() => setShowReminderForm(true)}
                    >
                      <Text style={dashboardStyles.inlineEmptyButtonText}>
                        Set Reminder
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            <View style={dashboardStyles.sectionCard}>
              <View style={dashboardStyles.sectionHeaderRow}>
                <View>
                  <Text style={dashboardStyles.sectionHeaderTitle}>
                    Progress Overview
                  </Text>
                  <Text style={dashboardStyles.sectionSubtitle}>
                    {playedGameHistory.length > 0 ? `Last ${Math.min(playedGameHistory.length, 7)} sessions` : "No sessions yet"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setActiveSection("progress")}
                  style={dashboardStyles.linkButton}
                >
                  <Text style={dashboardStyles.linkText}>Details</Text>
                  <Feather name="chevron-right" size={16} color="#0EA5E9" />
                </TouchableOpacity>
              </View>
              <View style={dashboardStyles.metricsRow}>
                <View style={dashboardStyles.metricCard}>
                  <Text style={dashboardStyles.metricLabel}>Games</Text>
                  <Text style={dashboardStyles.metricValue}>
                    {latestDayStats.gamesPlayed}
                  </Text>
                </View>
                <View style={dashboardStyles.metricCard}>
                  <Text style={dashboardStyles.metricLabel}>Avg Score</Text>
                  <Text style={dashboardStyles.metricValue}>
                    {latestDayStats.averageScore}
                  </Text>
                </View>
                <View style={dashboardStyles.metricCard}>
                  <Text style={dashboardStyles.metricLabel}>Accuracy</Text>
                  <Text style={[dashboardStyles.metricValue, dashboardStyles.metricValueSmall]}>
                    {latestDayStats.averageAccuracy}%
                  </Text>
                </View>
              </View>
              {historyIsLoading ? (
                <View style={dashboardStyles.inlineLoading}>
                  <ActivityIndicator size="small" color="#0EA5E9" />
                  <Text style={dashboardStyles.inlineLoadingText}>
                    Loading progress...
                  </Text>
                </View>
              ) : playedGameHistory.length === 0 ? (
                <View style={dashboardStyles.inlineEmptyCard}>
                  <Text style={dashboardStyles.inlineEmptyTitle}>
                    No progress data yet
                  </Text>
                  <Text style={dashboardStyles.inlineEmptyText}>
                    Play a game to start tracking your progress.
                  </Text>
                  <TouchableOpacity
                    style={dashboardStyles.inlineEmptyButton}
                    onPress={() => router.push("/games")}
                  >
                    <Text style={dashboardStyles.inlineEmptyButtonText}>
                      Start Playing
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={chartStyles.chartCard}>
                  <View style={chartStyles.chartHeader}>
                    <Text style={chartStyles.chartTitle}>Games Played</Text>
                    <Text style={chartStyles.chartMeta}>
                      {weeklyGamesTotal} total
                    </Text>
                  </View>
                  {renderChartBars(
                    progressChartData,
                    "#0EA5E9",
                    progressChartMax,
                  )}
                </View>
              )}
            </View>

            <View style={dashboardStyles.sectionCard}>
              <View style={dashboardStyles.sectionHeaderRow}>
                <View>
                  <Text style={dashboardStyles.sectionHeaderTitle}>
                    History Trends
                  </Text>
                  <Text style={dashboardStyles.sectionSubtitle}>
                    {playedGameHistory.length > 0 ? `Last ${Math.min(playedGameHistory.length, 7)} sessions` : "No sessions yet"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setActiveSection("history")}
                  style={dashboardStyles.linkButton}
                >
                  <Text style={dashboardStyles.linkText}>Details</Text>
                  <Feather name="chevron-right" size={16} color="#0EA5E9" />
                </TouchableOpacity>
              </View>
              {historyIsLoading ? (
                <View style={dashboardStyles.inlineLoading}>
                  <ActivityIndicator size="small" color="#0EA5E9" />
                  <Text style={dashboardStyles.inlineLoadingText}>
                    Loading history...
                  </Text>
                </View>
              ) : playedGameHistory.length === 0 ? (
                <View style={dashboardStyles.inlineEmptyCard}>
                  <Text style={dashboardStyles.inlineEmptyTitle}>
                    No history yet
                  </Text>
                  <Text style={dashboardStyles.inlineEmptyText}>
                    Complete sessions to see trends here.
                  </Text>
                  <TouchableOpacity
                    style={dashboardStyles.inlineEmptyButton}
                    onPress={() => router.push("/games")}
                  >
                    <Text style={dashboardStyles.inlineEmptyButtonText}>
                      Play Now
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={chartStyles.chartCard}>
                  <View style={chartStyles.chartHeader}>
                    <Text style={chartStyles.chartTitle}>Avg Accuracy</Text>
                    <Text style={chartStyles.chartMeta}>
                      {weeklyAccuracyAverage}% avg
                    </Text>
                  </View>
                  {renderChartBars(
                    accuracyChartData,
                    "#10B981",
                    accuracyChartMax,
                  )}
                </View>
              )}
            </View>

            <View style={dashboardStyles.sectionCard}>
              <View style={dashboardStyles.sectionHeaderRow}>
                <Text style={dashboardStyles.sectionHeaderTitle}>
                  Review Dates
                </Text>
                <TouchableOpacity
                  onPress={() => setActiveSection("reviewDates")}
                  style={dashboardStyles.linkButton}
                >
                  <Text style={dashboardStyles.linkText}>Details</Text>
                  <Feather name="chevron-right" size={16} color="#0EA5E9" />
                </TouchableOpacity>
              </View>
              {visitHistoryLoading ? (
                <View style={dashboardStyles.inlineLoading}>
                  <ActivityIndicator size="small" color="#0EA5E9" />
                  <Text style={dashboardStyles.inlineLoadingText}>
                    Loading review dates...
                  </Text>
                </View>
              ) : sortedVisitHistory.length > 0 ? (
                sortedVisitHistory.map((visit, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      dashboardStyles.visitRecordCard,
                      dashboardStyles.visitRecordCardInline,
                    ]}
                    onPress={() => {
                      setSelectedVisitRecord(visit);
                      setShowVisitDetailsModal(true);
                    }}
                  >
                    <View style={dashboardStyles.visitRecordHeader}>
                      <View style={dashboardStyles.visitDateContainer}>
                        <Feather name="calendar" size={16} color="#0284C7" />
                        <Text style={dashboardStyles.visitDate}>
                          {formatDate(visit.date)}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={20} color="#888" />
                    </View>

                    <View style={dashboardStyles.visitRecordDetails}>
                      {visit.notes && (
                        <View style={dashboardStyles.visitRecordItem}>
                          <Text style={dashboardStyles.visitRecordLabel}>
                            Notes:
                          </Text>
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
                <View style={dashboardStyles.inlineEmptyCard}>
                  <Text style={dashboardStyles.inlineEmptyTitle}>
                    No review dates yet
                  </Text>
                  <Text style={dashboardStyles.inlineEmptyText}>
                    Your visit records will appear here once available.
                  </Text>
                </View>
              )}
            </View>

            <View style={dashboardStyles.sectionCard}>
              <View style={dashboardStyles.sectionHeaderRow}>
                <Text style={dashboardStyles.sectionHeaderTitle}>Queries</Text>
                <View style={dashboardStyles.sectionHeaderActions}>
                  <TouchableOpacity
                    onPress={() => router.push("/queries")}
                    style={dashboardStyles.linkButton}
                  >
                    <Text style={dashboardStyles.linkText}>Ask</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push("/queries")}
                    style={dashboardStyles.linkButton}
                  >
                    <Text style={dashboardStyles.linkText}>View all</Text>
                    <Feather name="chevron-right" size={16} color="#0EA5E9" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={dashboardStyles.queryStatsRow}>
                <View style={dashboardStyles.queryStatCard}>
                  <Text style={dashboardStyles.queryStatLabel}>Pending</Text>
                  <Text style={dashboardStyles.queryStatValue}>
                    {queryStats.pending}
                  </Text>
                </View>
                <View style={dashboardStyles.queryStatCard}>
                  <Text style={dashboardStyles.queryStatLabel}>Answered</Text>
                  <Text style={dashboardStyles.queryStatValue}>
                    {queryStats.answered}
                  </Text>
                </View>
                <View style={dashboardStyles.queryStatCard}>
                  <Text style={dashboardStyles.queryStatLabel}>Total</Text>
                  <Text style={dashboardStyles.queryStatValue}>
                    {queryStats.total}
                  </Text>
                </View>
              </View>

              {queriesLoading ? (
                <View style={dashboardStyles.inlineLoading}>
                  <ActivityIndicator size="small" color="#0EA5E9" />
                  <Text style={dashboardStyles.inlineLoadingText}>
                    Loading queries...
                  </Text>
                </View>
              ) : recentQueries.length > 0 ? (
                recentQueries.map((query) => (
                  <TouchableOpacity
                    key={query.id}
                    style={dashboardStyles.queryItem}
                    onPress={() => router.push(`/query/${query.id}`)}
                  >
                    <View
                      style={[
                        dashboardStyles.queryStatusDot,
                        {
                          backgroundColor:
                            query.status === "pending" ? "#F59E0B" : "#10B981",
                        },
                      ]}
                    />
                    <View style={dashboardStyles.queryContent}>
                      <View style={dashboardStyles.queryHeaderRow}>
                        <Text style={dashboardStyles.queryStatusText}>
                          {query.status === "pending" ? "Pending" : "Answered"}
                        </Text>
                        <Text style={dashboardStyles.queryDate}>
                          {new Date(query.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text style={dashboardStyles.queryQuestion} numberOfLines={2}>
                        {query.question}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={dashboardStyles.inlineEmptyCard}>
                  <Text style={dashboardStyles.inlineEmptyTitle}>
                    No queries yet
                  </Text>
                  <Text style={dashboardStyles.inlineEmptyText}>
                    Ask your doctor a question to get started.
                  </Text>
                  <TouchableOpacity
                    style={dashboardStyles.inlineEmptyButton}
                    onPress={() => router.push("/queries")}
                  >
                    <Text style={dashboardStyles.inlineEmptyButtonText}>
                      Ask a Question
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const progressStyles = StyleSheet.create({
  progressSummaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  progressSummaryDate: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
    textAlign: "center",
  },
  progressSummaryStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  progressSummaryStatItem: {
    flex: 1,
    alignItems: "center",
  },
  progressSummaryStatValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0EA5E9",
    marginBottom: 4,
  },
  progressSummaryStatLabel: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    fontWeight: "500",
  },
  progressSummaryStatDivider: {
    height: 36,
    width: 1,
    backgroundColor: "#E5E7EB",
  },
  progressCompletionContainer: {
    marginBottom: 20,
  },
  progressCompletionText: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
    fontWeight: "500",
  },
  progressCompletionBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressCompletionFill: {
    height: 8,
    backgroundColor: "#0EA5E9",
    borderRadius: 4,
  },
  progressGamesListTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  progressGameItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  progressGameIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#0EA5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  progressGameContent: {
    flex: 1,
  },
  progressGameName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 5,
  },
  progressGameStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressGameScore: {
    fontSize: 12,
    color: "#6B7280",
  },
  progressGameScoreValue: {
    fontWeight: "700",
    color: "#0EA5E9",
  },
  progressGameTime: {
    fontSize: 12,
    color: "#6B7280",
  },
  progressGameAccuracyContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressGameAccuracyBar: {
    flex: 1,
    height: 5,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
    marginRight: 8,
  },
  progressGameAccuracyFill: {
    height: 5,
    backgroundColor: "#0EA5E9",
    borderRadius: 3,
  },
  progressGameAccuracyText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0EA5E9",
    width: 38,
    textAlign: "right",
  },
  noGamesContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  noGamesText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  progressPastDayCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  progressPastDayHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  progressPastDayBadge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  progressPastDayBadgeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  progressPastDayInfo: {
    flex: 1,
  },
  progressPastDayDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 3,
  },
  progressPastDayStats: {
    fontSize: 12,
    color: "#6B7280",
  },
  progressPastDayCompletion: {
    marginTop: 6,
  },
  progressPastDayCompletionBar: {
    height: 5,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressPastDayCompletionFill: {
    height: 5,
    backgroundColor: "#0EA5E9",
    borderRadius: 3,
  },
});

// New dashboard styles for the grid layout
const dashboardStyles = StyleSheet.create({
  dashboardContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  sectionHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
  },
  linkText: {
    color: "#0EA5E9",
    fontWeight: "600",
    fontSize: 13,
  },
  categoryScroll: {
    paddingVertical: 4,
    paddingRight: 6,
  },
  categoryCard: {
    width: 180,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  categoryDescription: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  categoryMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  categoryCount: {
    fontSize: 12,
    fontWeight: "600",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 4,
  },
  metricValueSmall: {
    fontSize: 13,
  },
  inlineEmptyCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  inlineEmptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
    textAlign: "center",
  },
  inlineEmptyText: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 18,
  },
  inlineEmptyButton: {
    backgroundColor: "#0EA5E9",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  inlineEmptyButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  inlineLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
  },
  inlineLoadingText: {
    fontSize: 12,
    color: "#6B7280",
  },
  queryStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  queryStatCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  queryStatLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  queryStatValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 4,
  },
  queryItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  queryStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  queryContent: {
    flex: 1,
  },
  queryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  queryStatusText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  queryDate: {
    fontSize: 11,
    color: "#94A3B8",
  },
  queryQuestion: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "600",
  },
  visitRecordCardInline: {
    marginHorizontal: 0,
  },
  dashboardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  dashboardItem: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 2,
  },
  itemIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
    textAlign: "center",
  },
  itemDescription: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 17,
    textAlign: "center",
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 12,
    textAlign: "center",
  },
  emptyStateContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    margin: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyStateButton: {
    backgroundColor: "#0EA5E9",
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 8,
    shadowColor: "#0EA5E9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyStateButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  backLink: {
    color: "#0EA5E9",
    fontWeight: "600",
    fontSize: 14,
  },
  progressDateGroup: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  progressDateHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  progressDateBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  progressDateBadgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  progressDateText: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "600",
  },
  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  progressGameIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#0EA5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  progressCardContent: {
    flex: 1,
  },
  progressGameTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  progressDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 12,
  },
  progressTimeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  progressScoreText: {
    fontSize: 12,
    color: "#6B7280",
  },
  visitRecordCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginHorizontal: 16,
  },
  visitRecordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  visitDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  visitDate: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  visitRecordDetails: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
  },
  visitRecordItem: {
    marginBottom: 10,
  },
  visitRecordLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 3,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  visitRecordValue: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  noRecordsContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    margin: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  noRecordsText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 12,
    textAlign: "center",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalScrollContent: {
    maxHeight: 400,
    paddingRight: 5,
  },
  visitDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },
  visitDetailDate: {
    fontSize: 15,
    color: "#374151",
    fontWeight: "600",
  },
  visitDetailSection: {
    marginBottom: 20,
  },
  visitDetailSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  visitDetailItem: {
    marginBottom: 10,
  },
  visitDetailLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 4,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  visitDetailValue: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  modalCloseButton: {
    backgroundColor: "#0EA5E9",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    marginTop: 16,
    shadowColor: "#0EA5E9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalCloseButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});

const chartStyles = StyleSheet.create({
  chartCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  chartMeta: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 120,
    paddingHorizontal: 4,
  },
  chartBarItem: {
    flex: 1,
    alignItems: "center",
  },
  chartBar: {
    width: 12,
    borderRadius: 6,
  },
  chartLabel: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 6,
  },
  chartValue: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 6,
  },
});

const historyStyles = StyleSheet.create({
  historyContainer: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  historyDateGroup: {
    marginBottom: 16,
  },
  historyDateHeader: {
    flexDirection: "row" as "row",
    alignItems: "center" as "center",
    marginBottom: 10,
  },
  historyDateBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#0F172A",
    justifyContent: "center" as "center",
    alignItems: "center" as "center",
    marginRight: 12,
  },
  historyDateBadgeText: {
    fontSize: 14,
    fontWeight: "bold" as "bold",
    color: "#FFFFFF",
  },
  historyDateText: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "600" as "600",
  },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row" as "row",
    alignItems: "center" as "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  historyGameIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#0EA5E9",
    justifyContent: "center" as "center",
    alignItems: "center" as "center",
    marginRight: 14,
  },
  historyCardContent: {
    flex: 1,
  },
  historyGameTitle: {
    fontSize: 14,
    fontWeight: "700" as "bold",
    color: "#111827",
    marginBottom: 6,
  },
  historyDetails: {
    flexDirection: "row" as "row",
    alignItems: "center" as "center",
    marginBottom: 6,
    gap: 12,
  },
  historyDetailIcon: {
    marginRight: 4,
    color: "#0EA5E9",
  },
  historyTimeText: {
    fontSize: 12,
    color: "#6B7280",
  },
  historyScoreText: {
    fontSize: 12,
    color: "#6B7280",
  },
  historyScoreValue: {
    fontWeight: "bold" as "bold",
    color: "#0EA5E9",
  },
  historyAccuracy: {
    marginTop: 6,
  },
  historyAccuracyLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 4,
    fontWeight: "600" as "600",
    textTransform: "uppercase" as "uppercase",
    letterSpacing: 0.5,
  },
  historyAccuracyBar: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden" as "hidden",
    flex: 1,
  },
  historyAccuracyFill: {
    height: 6,
    backgroundColor: "#0EA5E9",
    borderRadius: 3,
  },
  historyAccuracyText: {
    fontSize: 12,
    fontWeight: "bold" as "bold",
    color: "#0EA5E9",
    marginLeft: 8,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContent: {
    paddingBottom: 120,
  },
  welcomeSection: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  welcomeText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 15,
    marginBottom: 4,
  },
  patientName: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  sectionContent: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#FEE2E2",
    gap: 4,
  },
  backButtons: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#FEE2E2",
    marginTop: 10,
    gap: 4,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#D1FAE5",
    gap: 4,
  },
  addLink: {
    color: "#059669",
    fontWeight: "600",
    fontSize: 14,
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
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
    flex: 1,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#0EA5E9",
    borderRadius: 4,
  },
  remindersList: {
    marginBottom: 20,
  },
  reminderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  reminderIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 5,
  },
  reminderTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reminderTimeIcon: {
    marginRight: 4,
  },
  reminderDate: {
    fontSize: 12,
    color: "#6B7280",
  },
  reminderTime: {
    fontSize: 12,
    color: "#6B7280",
  },
  reminderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reminderActionButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  noRemindersContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 8,
  },
  noRemindersText: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 16,
  },
  addReminderButton: {
    backgroundColor: "#0EA5E9",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    shadowColor: "#0EA5E9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addReminderButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
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
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    width: "92%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 20,
    textAlign: "center",
  },
  reminderInput: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontSize: 15,
    backgroundColor: "#F9FAFB",
    marginBottom: 14,
    color: "#111827",
  },
  dateTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: "#F9FAFB",
    marginBottom: 14,
    gap: 10,
  },
  dateTimeText: {
    fontSize: 15,
    color: "#374151",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  cancelButtonText: {
    color: "#6B7280",
    fontWeight: "600",
    fontSize: 15,
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#0EA5E9",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#0EA5E9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
});
