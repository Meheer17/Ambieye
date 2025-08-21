import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Modal,
  Animated,
  SafeAreaView,
  StatusBar,
  Platform,
  RefreshControl,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import {
  doctorService,
  MedicalInfo,
  Patient,
  VisitRecord,
} from "@/services/api/doctorService";
import { patientService } from "@/services/api/patientService";

// Define types for game history
interface GameData {
  game: string;
  score: number;
  time: number;
}

interface DayGameData {
  date: string;
  games: GameData[];
  summary: {
    totalGames: number;
    averageAccuracy: number;
    averageScore: number;
  };
}

// Patient Details Component to be used in modal
function PatientDetailsModal({
  patientId,
  onClose,
}: {
  patientId: string | null;
  onClose: () => void;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [gameHistory, setGameHistory] = useState<DayGameData[]>([]);
  const [gameHistoryLoading, setGameHistoryLoading] = useState(false);

  // State for editing modes and forms
  const [editingMedicalInfo, setEditingMedicalInfo] = useState(false);
  const [medicalInfoForm, setMedicalInfoForm] = useState<MedicalInfo>({});
  const [addingVisitRecord, setAddingVisitRecord] = useState(false);
  const [visitRecordForm, setVisitRecordForm] = useState<VisitRecord>({
    date: new Date(),
    pmtvisiontpg: "",
    pgpower: "",
    pmt: "",
    pda: "",
    adar: "",
    dryretinoscopy: "",
    wetretinoscopy: "",
    bcvanear: "",
    bcvadistant: "",
    nct: "",
    colorvision: "",
    ar: "",
    visiondistant: "",
    visionnear: "",
    glassPrescription: "",
    notes: "",
  });

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const gameHistoryAnim = useRef(new Animated.Value(0)).current;

  // Pre-create animation refs for medical records at the top level
  const recordAnims = useRef(
    Array(10)
      .fill(0)
      .map(() => new Animated.Value(0)),
  ).current;

  // Pre-create animation refs for game history items
  const gameAnims = useRef(
    Array(5)
      .fill(0)
      .map(() => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    const fetchPatientDetails = async () => {
      if (!patientId) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await doctorService.getPatientById(patientId);

        if (response.success && response.patient) {
          // Sort visit records by date (newest first) if they exist
          const sortedPatient = { ...response.patient };
          if (
            sortedPatient.visitRecords &&
            sortedPatient.visitRecords.length > 0
          ) {
            sortedPatient.visitRecords = [...sortedPatient.visitRecords].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            );
          }

          setPatient(sortedPatient);

          // Initialize medical info form with existing values
          if (sortedPatient.medicalInfo) {
            setMedicalInfoForm(sortedPatient.medicalInfo);
          }

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

          // Start record animations if we have visit records
          if (
            sortedPatient.visitRecords &&
            sortedPatient.visitRecords.length > 0
          ) {
            const recordsToAnimate = Math.min(
              sortedPatient.visitRecords.length,
              10,
            );
            for (let i = 0; i < recordsToAnimate; i++) {
              Animated.timing(recordAnims[i], {
                toValue: 1,
                duration: 300,
                delay: 500 + i * 100,
                useNativeDriver: true,
              }).start();
            }
          }
        } else {
          setError(response.message || "Failed to load patient details");
        }
      } catch (err) {
        setError("An error occurred while loading patient details");
        console.error("Error fetching patient details:", err);
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    };

    const fetchGameHistory = async () => {
      if (!patientId) return;

      setGameHistoryLoading(true);
      try {
        // Call doctor service with patient ID to get their game history
        const response = await patientService.getGameHistory(patientId);
        if (response.success) {
          setGameHistory(response.history || []);

          // Animate game history section appearance
          Animated.timing(gameHistoryAnim, {
            toValue: 1,
            duration: 500,
            delay: 800,
            useNativeDriver: true,
          }).start();

          // Animate individual game items
          const gameItemsToAnimate = Math.min(5, response.history?.length || 0);
          for (let i = 0; i < gameItemsToAnimate; i++) {
            Animated.timing(gameAnims[i], {
              toValue: 1,
              duration: 300,
              delay: 1000 + i * 100,
              useNativeDriver: true,
            }).start();
          }
        } else {
          console.error("Failed to load game history");
        }
      } catch (err) {
        console.error("Error fetching game history:", err);
      } finally {
        setGameHistoryLoading(false);
      }
    };
    if (patientId) {
      fetchPatientDetails();
      fetchGameHistory();
    }
  }, [patientId, fadeAnim, gameAnims, gameHistoryAnim, recordAnims, slideAnim]);

  const fetchPatientDetails = async () => {
    if (!patientId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await doctorService.getPatientById(patientId);

      if (response.success && response.patient) {
        // Sort visit records by date (newest first) if they exist
        const sortedPatient = { ...response.patient };
        if (
          sortedPatient.visitRecords &&
          sortedPatient.visitRecords.length > 0
        ) {
          sortedPatient.visitRecords = [...sortedPatient.visitRecords].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          );
        }

        setPatient(sortedPatient);

        // Initialize medical info form with existing values
        if (sortedPatient.medicalInfo) {
          setMedicalInfoForm(sortedPatient.medicalInfo);
        }

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

        // Start record animations if we have visit records
        if (
          sortedPatient.visitRecords &&
          sortedPatient.visitRecords.length > 0
        ) {
          const recordsToAnimate = Math.min(
            sortedPatient.visitRecords.length,
            10,
          );
          for (let i = 0; i < recordsToAnimate; i++) {
            Animated.timing(recordAnims[i], {
              toValue: 1,
              duration: 300,
              delay: 500 + i * 100,
              useNativeDriver: true,
            }).start();
          }
        }
      } else {
        setError(response.message || "Failed to load patient details");
      }
    } catch (err) {
      setError("An error occurred while loading patient details");
      console.error("Error fetching patient details:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const fetchGameHistory = async () => {
    if (!patientId) return;

    setGameHistoryLoading(true);
    try {
      // Call doctor service with patient ID to get their game history
      const response = await patientService.getGameHistory(patientId);
      if (response.success) {
        setGameHistory(response.history || []);

        // Animate game history section appearance
        Animated.timing(gameHistoryAnim, {
          toValue: 1,
          duration: 500,
          delay: 800,
          useNativeDriver: true,
        }).start();

        // Animate individual game items
        const gameItemsToAnimate = Math.min(5, response.history?.length || 0);
        for (let i = 0; i < gameItemsToAnimate; i++) {
          Animated.timing(gameAnims[i], {
            toValue: 1,
            duration: 300,
            delay: 1000 + i * 100,
            useNativeDriver: true,
          }).start();
        }
      } else {
        console.error("Failed to load game history");
      }
    } catch (err) {
      console.error("Error fetching game history:", err);
    } finally {
      setGameHistoryLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPatientDetails();
    fetchGameHistory();
  };

  const updateMedicalInfo = async () => {
    if (!patient || !patientId) return;

    setIsLoading(true);
    try {
      const response = await doctorService.updatePatientMedicalInfo(
        patientId,
        medicalInfoForm,
      );

      if (response.success) {
        // Update local state with the new medical info
        setPatient({
          ...patient,
          medicalInfo: medicalInfoForm,
        });
        setEditingMedicalInfo(false);
        alert("Success: Medical information updated successfully");
      } else {
        alert("Error: " + response.message);
      }
    } catch (err) {
      console.error("Error updating medical info:", err);
      alert("Error: Failed to update medical information");
    } finally {
      setIsLoading(false);
    }
  };

  const addVisitRecord = async () => {
    if (!patient || !patientId) return;

    setIsLoading(true);
    try {
      const response = await doctorService.addPatientVisitRecord(
        patientId,
        visitRecordForm,
      );

      if (response.success && response.newRecord) {
        // Update local state with the new visit record and sort by date
        const updatedRecords = [
          response.newRecord,
          ...(patient.visitRecords || []),
        ].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

        setPatient({
          ...patient,
          visitRecords: updatedRecords,
        });
        setAddingVisitRecord(false);
        setVisitRecordForm({
          date: new Date(),
          pmtvisiontpg: "",
          pgpower: "",
          pmt: "",
          pda: "",
          adar: "",
          dryretinoscopy: "",
          wetretinoscopy: "",
          bcvanear: "",
          bcvadistant: "",
          nct: "",
          colorvision: "",
          ar: "",
          visiondistant: "",
          visionnear: "",
          glassPrescription: "",
          notes: "",
        });
        alert("Success: Visit record added successfully");
      } else {
        alert("Error: " + response.message);
      }
    } catch (err) {
      console.error("Error adding visit record:", err);
      alert("Error: Failed to add visit record");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !refreshing) {
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

  if (!patient) {
    return (
      <View style={modalStyles.errorContainer}>
        <Text style={modalStyles.errorText}>No patient data available</Text>
        <TouchableOpacity style={modalStyles.errorButton} onPress={onClose}>
          <Text style={modalStyles.errorButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formattedAge = patient.age || "N/A";
  const formattedGender = patient.gender || "Not specified";

  return (
    <SafeAreaView style={modalStyles.safeArea}>
      <View style={modalStyles.header}>
        <TouchableOpacity style={modalStyles.backButton} onPress={onClose}>
          <Feather name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={modalStyles.headerTitle}>Patient Details</Text>
        <TouchableOpacity
          style={modalStyles.moreButton}
          onPress={handleRefresh}
        >
          <Feather name="refresh-cw" size={24} color="white" />
        </TouchableOpacity>
      </View>
      <StatusBar backgroundColor="#5f2446" barStyle="light-content" />

      <ScrollView
        style={modalStyles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Animated.View
          style={[
            modalStyles.patientHeader,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={modalStyles.avatarContainer}>
            <Text style={modalStyles.avatarText}>
              {patient.fullName?.charAt(0) || "?"}
            </Text>
          </View>
          <Text style={modalStyles.patientName}>{patient.fullName}</Text>
          <View style={modalStyles.patientBasicInfo}>
            <Text style={modalStyles.infoText}>{formattedAge} years</Text>
            <View style={modalStyles.dot} />
            <Text style={modalStyles.infoText}>{formattedGender}</Text>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            modalStyles.infoSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={modalStyles.sectionTitle}>Contact Information</Text>
          <View style={modalStyles.infoItem}>
            <Feather name="mail" size={16} color="#5f2446" />
            <Text style={modalStyles.infoItemText}>{patient.email}</Text>
          </View>
          {patient.phone && (
            <View style={modalStyles.infoItem}>
              <Feather name="phone" size={16} color="#5f2446" />
              <Text style={modalStyles.infoItemText}>{patient.phone}</Text>
            </View>
          )}
          {patient.fatherName && (
            <View style={modalStyles.infoItem}>
              <Feather name="user-check" size={16} color="#5f2446" />
              <Text style={modalStyles.infoItemText}>{patient.fatherName}</Text>
            </View>
          )}
          {patient.motherName && (
            <View style={modalStyles.infoItem}>
              <Feather name="user-check" size={16} color="#5f2446" />
              <Text style={modalStyles.infoItemText}>{patient.motherName}</Text>
            </View>
          )}
        </Animated.View>

        {/* Game Activity Section */}
        <Animated.View
          style={[
            modalStyles.infoSection,
            {
              opacity: gameHistoryAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={modalStyles.sectionTitle}>
            Patient Game Activities & Progress
          </Text>

          {gameHistoryLoading ? (
            <View style={modalStyles.gameLoadingContainer}>
              <ActivityIndicator size="small" color="#5f2446" />
              <Text style={modalStyles.gameLoadingText}>
                Loading patient game data...
              </Text>
            </View>
          ) : gameHistory.length > 0 ? (
            <ScrollView
              style={modalStyles.gameScrollContainer}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              {/* Progress summary for the most recent day */}
              {gameHistory[0] && (
                <View style={progressStyles.progressSummaryCard}>
                  <Text style={progressStyles.progressSummaryDate}>
                    {new Date(gameHistory[0].date).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>

                  <View style={progressStyles.progressSummaryStatsRow}>
                    <View style={progressStyles.progressSummaryStatItem}>
                      <Text style={progressStyles.progressSummaryStatValue}>
                        {gameHistory[0].summary?.totalGames ||
                          gameHistory[0].games.length}
                      </Text>
                      <Text style={progressStyles.progressSummaryStatLabel}>
                        Games Played
                      </Text>
                    </View>
                    <View style={progressStyles.progressSummaryStatDivider} />

                    <View style={progressStyles.progressSummaryStatItem}>
                      <Text style={progressStyles.progressSummaryStatValue}>
                        {Math.round(
                          gameHistory[0].summary?.averageScore ||
                            gameHistory[0].games.reduce(
                              (sum, game) => sum + (game.score || 0),
                              0,
                            ) / Math.max(1, gameHistory[0].games.length),
                        )}
                      </Text>
                      <Text style={progressStyles.progressSummaryStatLabel}>
                        Avg Score
                      </Text>
                    </View>
                    <View style={progressStyles.progressSummaryStatDivider} />

                    <View style={progressStyles.progressSummaryStatItem}>
                      <Text style={progressStyles.progressSummaryStatValue}>
                        {Math.round(
                          gameHistory[0].summary?.averageAccuracy ||
                            Math.min(
                              Math.max(
                                (gameHistory[0].games.reduce(
                                  (sum, game) => sum + (game.score || 0),
                                  0,
                                ) /
                                  Math.max(1, gameHistory[0].games.length) /
                                  10) *
                                  100,
                                10,
                              ),
                              100,
                            ),
                        )}
                        %
                      </Text>
                      <Text style={progressStyles.progressSummaryStatLabel}>
                        Avg Accuracy
                      </Text>
                    </View>
                  </View>

                  {/* Progress bar for completion */}
                  <View style={progressStyles.progressCompletionContainer}>
                    <Text style={progressStyles.progressCompletionText}>
                      {gameHistory[0].summary?.totalGames ||
                        gameHistory[0].games.length}{" "}
                      of 12 games completed (
                      {Math.min(
                        Math.round(
                          ((gameHistory[0].summary?.totalGames ||
                            gameHistory[0].games.length) /
                            12) *
                            100,
                        ),
                        100,
                      )}
                      %)
                    </Text>
                    <View style={progressStyles.progressCompletionBar}>
                      <View
                        style={[
                          progressStyles.progressCompletionFill,
                          {
                            width: `${Math.min(Math.round(((gameHistory[0].summary?.totalGames || gameHistory[0].games.length) / 12) * 100), 100)}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Display all days of game history */}
              {gameHistory.map((dayData, dayIndex) => (
                <View key={dayIndex} style={modalStyles.gameDay}>
                  <View style={modalStyles.gameDayHeader}>
                    <Text style={modalStyles.gameDayDate}>
                      {new Date(dayData.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                    <View style={modalStyles.gameSummaryBadge}>
                      <Text style={modalStyles.gameSummaryText}>
                        {dayData.games.length} games •{" "}
                        {Math.min(
                          Math.round((dayData.games.length / 12) * 100),
                          100,
                        )}
                        % completed
                      </Text>
                    </View>
                  </View>

                  {/* Show all games from each day */}
                  {dayData.games &&
                    dayData.games.map((game, gameIndex) => {
                      // Calculate accuracy percentage for display
                      let accuracy = 90;

                      const accuracyPercent = accuracy
                        ? Math.min(
                            Math.max(parseFloat(accuracy.toString()), 0),
                            100,
                          )
                        : Math.min(Math.max((game.score / 10) * 100, 10), 100);

                      // Format duration to minutes
                      const durationMinutes = (game.time / 60).toFixed(1);

                      return (
                        <View
                          key={`game-${dayIndex}-${gameIndex}`}
                          style={modalStyles.gameItem}
                        >
                          <View style={modalStyles.gameIconContainer}>
                            <Feather
                              name="play-circle"
                              size={24}
                              color="#5f2446"
                            />
                          </View>
                          <View style={modalStyles.gameDetails}>
                            <Text style={modalStyles.gameName}>
                              {game.game}
                            </Text>
                            <View style={modalStyles.gameMetrics}>
                              <View style={modalStyles.gameMetric}>
                                <Feather name="award" size={14} color="#666" />
                                <Text style={modalStyles.gameMetricText}>
                                  Score: {game.score}
                                </Text>
                              </View>
                              <View style={modalStyles.gameMetric}>
                                <Feather name="clock" size={14} color="#666" />
                                <Text style={modalStyles.gameMetricText}>
                                  {durationMinutes} min
                                </Text>
                              </View>
                            </View>
                            <View style={progressStyles.gameAccuracyContainer}>
                              <View style={progressStyles.gameAccuracyBar}>
                                <View
                                  style={[
                                    progressStyles.gameAccuracyFill,
                                    { width: `${accuracyPercent}%` },
                                  ]}
                                />
                              </View>
                              <Text style={progressStyles.gameAccuracyText}>
                                {Math.round(accuracyPercent)}% accuracy
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}

                  {dayData.games.length > 5 && (
                    <Text style={modalStyles.moreGamesText}>
                      +{dayData.games.length - 5} more games this day
                    </Text>
                  )}
                </View>
              ))}

              {gameHistory.length > 1 && (
                <Text style={modalStyles.moreHistoryText}>
                  Activity available for {gameHistory.length} days in the last
                  20 days
                </Text>
              )}
            </ScrollView>
          ) : (
            <View style={modalStyles.noGameDataContainer}>
              <Feather name="activity" size={32} color="#ccc" />
              <Text style={modalStyles.noGameDataText}>
                No game activity recorded for this patient
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Medical Information Section */}
        <Animated.View
          style={[
            modalStyles.infoSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={modalStyles.sectionHeader}>
            <Text style={modalStyles.sectionTitle}>Medical Information</Text>
            {!editingMedicalInfo && (
              <TouchableOpacity
                style={modalStyles.editButton}
                onPress={() => setEditingMedicalInfo(true)}
              >
                <Feather name="edit-2" size={16} color="#5f2446" />
                <Text style={modalStyles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {editingMedicalInfo ? (
            <View style={modalStyles.formContainer}>
              {/*<Text style={modalStyles.formLabel}>Vision with PG</Text>
              <TextInput
                style={modalStyles.formInput}
                value={medicalInfoForm.visionwithpg}
                onChangeText={(text) =>
                  setMedicalInfoForm({ ...medicalInfoForm, visionwithpg: text })
                }
                placeholder="Enter vision with PG"
              />*/}

              <Text style={modalStyles.formLabel}>Chief Complaint</Text>
              <TextInput
                style={modalStyles.formInput}
                value={medicalInfoForm.chiefcomplaint}
                onChangeText={(text) =>
                  setMedicalInfoForm({
                    ...medicalInfoForm,
                    chiefcomplaint: text,
                  })
                }
                multiline
                numberOfLines={3}
                placeholder="Enter chief complaint"
              />

              <Text style={modalStyles.formLabel}>Presenting Illness</Text>
              <TextInput
                style={modalStyles.formInput}
                value={medicalInfoForm.presentingillness}
                onChangeText={(text) =>
                  setMedicalInfoForm({
                    ...medicalInfoForm,
                    presentingillness: text,
                  })
                }
                multiline
                numberOfLines={3}
                placeholder="Enter presenting illness"
              />

              <Text style={modalStyles.formLabel}>Past History</Text>
              <TextInput
                style={modalStyles.formInput}
                value={medicalInfoForm.pastHistory}
                onChangeText={(text) =>
                  setMedicalInfoForm({ ...medicalInfoForm, pastHistory: text })
                }
                multiline
                numberOfLines={3}
                placeholder="Enter past medical history"
              />

              <Text style={modalStyles.formLabel}>Personal History</Text>
              <TextInput
                style={modalStyles.formInput}
                value={medicalInfoForm.personalHistory}
                onChangeText={(text) =>
                  setMedicalInfoForm({
                    ...medicalInfoForm,
                    personalHistory: text,
                  })
                }
                multiline
                numberOfLines={3}
                placeholder="Enter personal history"
              />

              <Text style={modalStyles.formLabel}>Family History</Text>
              <TextInput
                style={modalStyles.formInput}
                value={medicalInfoForm.familyHistory}
                onChangeText={(text) =>
                  setMedicalInfoForm({
                    ...medicalInfoForm,
                    familyHistory: text,
                  })
                }
                multiline
                numberOfLines={3}
                placeholder="Enter family history"
              />

              <Text style={modalStyles.formLabel}>Drug History</Text>
              <TextInput
                style={modalStyles.formInput}
                value={medicalInfoForm.drugHistory}
                onChangeText={(text) =>
                  setMedicalInfoForm({ ...medicalInfoForm, drugHistory: text })
                }
                multiline
                numberOfLines={3}
                placeholder="Enter drug history"
              />

              <Text style={modalStyles.formLabel}>Allergy History</Text>
              <TextInput
                style={modalStyles.formInput}
                value={medicalInfoForm.allergyHistory}
                onChangeText={(text) =>
                  setMedicalInfoForm({
                    ...medicalInfoForm,
                    allergyHistory: text,
                  })
                }
                multiline
                numberOfLines={3}
                placeholder="Enter allergy history"
              />

              <Text style={modalStyles.formSectionTitle}>Vital Signs</Text>
              <View style={modalStyles.formRow}>
                <View style={modalStyles.formHalfColumn}>
                  <Text style={modalStyles.formLabel}>Blood Pressure</Text>
                  <TextInput
                    style={modalStyles.formInput}
                    value={medicalInfoForm.bp}
                    onChangeText={(text) =>
                      setMedicalInfoForm({ ...medicalInfoForm, bp: text })
                    }
                    placeholder="Enter BP"
                  />
                </View>
                <View style={modalStyles.formHalfColumn}>
                  <Text style={modalStyles.formLabel}>Pulse Rate</Text>
                  <TextInput
                    style={modalStyles.formInput}
                    value={medicalInfoForm.pr}
                    onChangeText={(text) =>
                      setMedicalInfoForm({ ...medicalInfoForm, pr: text })
                    }
                    placeholder="Enter PR"
                  />
                </View>
              </View>

              <View style={modalStyles.formRow}>
                <View style={modalStyles.formHalfColumn}>
                  <Text style={modalStyles.formLabel}>Temperature</Text>
                  <TextInput
                    style={modalStyles.formInput}
                    value={medicalInfoForm.temp}
                    onChangeText={(text) =>
                      setMedicalInfoForm({ ...medicalInfoForm, temp: text })
                    }
                    placeholder="Enter temperature"
                  />
                </View>
                <View style={modalStyles.formHalfColumn}>
                  <Text style={modalStyles.formLabel}>Respiration Rate</Text>
                  <TextInput
                    style={modalStyles.formInput}
                    value={medicalInfoForm.respirationrate}
                    onChangeText={(text) =>
                      setMedicalInfoForm({
                        ...medicalInfoForm,
                        respirationrate: text,
                      })
                    }
                    placeholder="Enter respiration rate"
                  />
                </View>
              </View>

              <Text style={modalStyles.formLabel}>Notes</Text>
              <TextInput
                style={modalStyles.formInput}
                value={medicalInfoForm.notes}
                onChangeText={(text) =>
                  setMedicalInfoForm({ ...medicalInfoForm, notes: text })
                }
                multiline
                numberOfLines={3}
                placeholder="Enter additional notes"
              />

              <View style={modalStyles.formButtons}>
                <TouchableOpacity
                  style={modalStyles.cancelButton}
                  onPress={() => {
                    // Reset form and exit edit mode
                    setMedicalInfoForm(patient.medicalInfo || {});
                    setEditingMedicalInfo(false);
                  }}
                >
                  <Text style={modalStyles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={modalStyles.saveButton}
                  onPress={updateMedicalInfo}
                >
                  <Text style={modalStyles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={modalStyles.medicalInfoDisplay}>
              {patient.medicalInfo ? (
                <>
                  {/*{patient.medicalInfo.visionwithpg && (
                    <View style={modalStyles.medicalInfoItem}>
                      <Text style={modalStyles.medicalInfoLabel}>
                        Vision with PG:
                      </Text>
                      <Text style={modalStyles.medicalInfoText}>
                        {patient.medicalInfo.visionwithpg}
                      </Text>
                    </View>
                  )}*/}

                  {patient.medicalInfo.chiefcomplaint && (
                    <View style={modalStyles.medicalInfoItem}>
                      <Text style={modalStyles.medicalInfoLabel}>
                        Chief Complaint:
                      </Text>
                      <Text style={modalStyles.medicalInfoText}>
                        {patient.medicalInfo.chiefcomplaint}
                      </Text>
                    </View>
                  )}

                  {patient.medicalInfo.presentingillness && (
                    <View style={modalStyles.medicalInfoItem}>
                      <Text style={modalStyles.medicalInfoLabel}>
                        Presenting Illness:
                      </Text>
                      <Text style={modalStyles.medicalInfoText}>
                        {patient.medicalInfo.presentingillness}
                      </Text>
                    </View>
                  )}

                  {patient.medicalInfo.pastHistory && (
                    <View style={modalStyles.medicalInfoItem}>
                      <Text style={modalStyles.medicalInfoLabel}>
                        Past History:
                      </Text>
                      <Text style={modalStyles.medicalInfoText}>
                        {patient.medicalInfo.pastHistory}
                      </Text>
                    </View>
                  )}

                  {patient.medicalInfo.personalHistory && (
                    <View style={modalStyles.medicalInfoItem}>
                      <Text style={modalStyles.medicalInfoLabel}>
                        Personal History:
                      </Text>
                      <Text style={modalStyles.medicalInfoText}>
                        {patient.medicalInfo.personalHistory}
                      </Text>
                    </View>
                  )}

                  {patient.medicalInfo.familyHistory && (
                    <View style={modalStyles.medicalInfoItem}>
                      <Text style={modalStyles.medicalInfoLabel}>
                        Family History:
                      </Text>
                      <Text style={modalStyles.medicalInfoText}>
                        {patient.medicalInfo.familyHistory}
                      </Text>
                    </View>
                  )}

                  {patient.medicalInfo.drugHistory && (
                    <View style={modalStyles.medicalInfoItem}>
                      <Text style={modalStyles.medicalInfoLabel}>
                        Drug History:
                      </Text>
                      <Text style={modalStyles.medicalInfoText}>
                        {patient.medicalInfo.drugHistory}
                      </Text>
                    </View>
                  )}

                  {patient.medicalInfo.allergyHistory && (
                    <View style={modalStyles.medicalInfoItem}>
                      <Text style={modalStyles.medicalInfoLabel}>
                        Allergy History:
                      </Text>
                      <Text style={modalStyles.medicalInfoText}>
                        {patient.medicalInfo.allergyHistory}
                      </Text>
                    </View>
                  )}

                  {(patient.medicalInfo.bp ||
                    patient.medicalInfo.pr ||
                    patient.medicalInfo.temp ||
                    patient.medicalInfo.respirationrate) && (
                    <View style={modalStyles.medicalInfoItem}>
                      <Text style={modalStyles.medicalInfoLabel}>
                        Vital Signs:
                      </Text>
                      <View style={modalStyles.visionGrid}>
                        {patient.medicalInfo.bp && (
                          <View style={modalStyles.visionItem}>
                            <Text style={modalStyles.visionLabel}>
                              Blood Pressure
                            </Text>
                            <Text style={modalStyles.visionValue}>
                              {patient.medicalInfo.bp}
                            </Text>
                          </View>
                        )}
                        {patient.medicalInfo.pr && (
                          <View style={modalStyles.visionItem}>
                            <Text style={modalStyles.visionLabel}>
                              Pulse Rate
                            </Text>
                            <Text style={modalStyles.visionValue}>
                              {patient.medicalInfo.pr}
                            </Text>
                          </View>
                        )}
                        {patient.medicalInfo.temp && (
                          <View style={modalStyles.visionItem}>
                            <Text style={modalStyles.visionLabel}>
                              Temperature
                            </Text>
                            <Text style={modalStyles.visionValue}>
                              {patient.medicalInfo.temp}
                            </Text>
                          </View>
                        )}
                        {patient.medicalInfo.respirationrate && (
                          <View style={modalStyles.visionItem}>
                            <Text style={modalStyles.visionLabel}>
                              Respiration Rate
                            </Text>
                            <Text style={modalStyles.visionValue}>
                              {patient.medicalInfo.respirationrate}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {patient.medicalInfo.notes && (
                    <View style={modalStyles.medicalInfoItem}>
                      <Text style={modalStyles.medicalInfoLabel}>Notes:</Text>
                      <Text style={modalStyles.medicalInfoText}>
                        {patient.medicalInfo.notes}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={modalStyles.noDataText}>
                  No medical information recorded. Click edit to add.
                </Text>
              )}
            </View>
          )}
        </Animated.View>

        {/* Visit Records Section */}
        <View style={modalStyles.visitRecordsContainer}>
          <View style={modalStyles.sectionHeader}>
            <Text style={modalStyles.sectionTitle}>Visit Records</Text>
            <TouchableOpacity
              style={modalStyles.addButton}
              onPress={() => setAddingVisitRecord(true)}
            >
              <Feather name="plus" size={16} color="#5f2446" />
              <Text style={modalStyles.addButtonText}>Add Visit</Text>
            </TouchableOpacity>
          </View>

          {patient.visitRecords && patient.visitRecords.length > 0 ? (
            patient.visitRecords.slice(0, 10).map((record, index) => (
              <Animated.View
                key={index}
                style={[
                  modalStyles.visitRecord,
                  {
                    opacity: index < 10 ? recordAnims[index] : fadeAnim,
                    transform: [
                      {
                        translateY: (index < 10
                          ? recordAnims[index]
                          : fadeAnim
                        ).interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={modalStyles.recordHeader}>
                  <Text style={modalStyles.recordDate}>
                    {new Date(record.date).toLocaleDateString()}
                  </Text>
                </View>

                {/* Vision Assessment Section */}
                <View style={modalStyles.recordSection}>
                  <Text style={modalStyles.recordSectionTitle}>
                    Vision Assessment
                  </Text>
                  <View style={modalStyles.visionGrid}>
                    {record.visiondistant && (
                      <View style={modalStyles.visionItem}>
                        <Text style={modalStyles.visionLabel}>
                          Vision (Distant)
                        </Text>
                        <Text style={modalStyles.visionValue}>
                          {record.visiondistant}
                        </Text>
                      </View>
                    )}
                    {record.visionnear && (
                      <View style={modalStyles.visionItem}>
                        <Text style={modalStyles.visionLabel}>
                          Vision (Near)
                        </Text>
                        <Text style={modalStyles.visionValue}>
                          {record.visionnear}
                        </Text>
                      </View>
                    )}
                    {record.ar && (
                      <View style={modalStyles.visionItem}>
                        <Text style={modalStyles.visionLabel}>AR</Text>
                        <Text style={modalStyles.visionValue}>{record.ar}</Text>
                      </View>
                    )}
                    {record.bcvadistant && (
                      <View style={modalStyles.visionItem}>
                        <Text style={modalStyles.visionLabel}>
                          BCVA (Distant)
                        </Text>
                        <Text style={modalStyles.visionValue}>
                          {record.bcvadistant}
                        </Text>
                      </View>
                    )}
                    {record.bcvanear && (
                      <View style={modalStyles.visionItem}>
                        <Text style={modalStyles.visionLabel}>BCVA (Near)</Text>
                        <Text style={modalStyles.visionValue}>
                          {record.bcvanear}
                        </Text>
                      </View>
                    )}
                    {record.nct && (
                      <View style={modalStyles.visionItem}>
                        <Text style={modalStyles.visionLabel}>NCT</Text>
                        <Text style={modalStyles.visionValue}>
                          {record.nct}
                        </Text>
                      </View>
                    )}
                    {record.colorvision && (
                      <View style={modalStyles.visionItem}>
                        <Text style={modalStyles.visionLabel}>
                          Color Vision
                        </Text>
                        <Text style={modalStyles.visionValue}>
                          {record.colorvision}
                        </Text>
                      </View>
                    )}
                    {record.dryretinoscopy && (
                      <View style={modalStyles.visionItem}>
                        <Text style={modalStyles.visionLabel}>
                          Dry Retinoscopy
                        </Text>
                        <Text style={modalStyles.visionValue}>
                          {record.dryretinoscopy}
                        </Text>
                      </View>
                    )}
                    {record.wetretinoscopy && (
                      <View style={modalStyles.visionItem}>
                        <Text style={modalStyles.visionLabel}>
                          Wet Retinoscopy
                        </Text>
                        <Text style={modalStyles.visionValue}>
                          {record.wetretinoscopy}
                        </Text>
                      </View>
                    )}
                    {record.adar && (
                      <View style={modalStyles.visionItem}>
                        <Text style={modalStyles.visionLabel}>ADAR</Text>
                        <Text style={modalStyles.visionValue}>
                          {record.adar}
                        </Text>
                      </View>
                    )}
                    {record.pda && (
                      <View style={modalStyles.visionItem}>
                        <Text style={modalStyles.visionLabel}>PDA</Text>
                        <Text style={modalStyles.visionValue}>
                          {record.pda}
                        </Text>
                      </View>
                    )}
                    {record.pgpower && (
                      <View style={modalStyles.visionItem}>
                        <Text style={modalStyles.visionLabel}>PG Power</Text>
                        <Text style={modalStyles.visionValue}>
                          {record.pgpower}
                        </Text>
                      </View>
                    )}
                    {/*{record.pmtvisiontpg && (
                      <View style={modalStyles.visionItem}>
                        <Text style={modalStyles.visionLabel}>Vision with PG</Text>
                        <Text style={modalStyles.visionValue}>
                          {record.pmtvisiontpg}
                        </Text>
                      </View>
                    )}*/}
                    {record.pmt && (
                      <View style={modalStyles.visionItem}>
                        <Text style={modalStyles.visionLabel}>PMT</Text>
                        <Text style={modalStyles.visionValue}>
                          {record.pmt}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {record.notes && (
                  <View style={modalStyles.recordSection}>
                    <Text style={modalStyles.recordSectionTitle}>Notes</Text>
                    <Text style={modalStyles.prescriptionText}>
                      {record.notes}
                    </Text>
                  </View>
                )}

                {record.glassPrescription && (
                  <View style={modalStyles.prescriptionContainer}>
                    <Text style={modalStyles.prescriptionLabel}>
                      Prescription:
                    </Text>
                    <Text style={modalStyles.prescriptionText}>
                      {record.glassPrescription}
                    </Text>
                  </View>
                )}
              </Animated.View>
            ))
          ) : (
            <View style={modalStyles.noRecordsContainer}>
              <Feather name="file-text" size={40} color="#ccc" />
              <Text style={modalStyles.noRecordsText}>
                No visit records available
              </Text>
            </View>
          )}
        </View>

        {/* Add Visit Record Modal */}
        <Modal
          visible={addingVisitRecord}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setAddingVisitRecord(false)}
        >
          <View style={modalStyles.modalOverlay}>
            <View style={modalStyles.modalContent}>
              <View style={modalStyles.modalHeader}>
                <Text style={modalStyles.modalTitle}>Add Visit Record</Text>
                <TouchableOpacity onPress={() => setAddingVisitRecord(false)}>
                  <Feather name="x" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView style={modalStyles.modalBody}>
                <Text style={modalStyles.formSectionTitle}>
                  Vision Assessment
                </Text>
                <View style={modalStyles.formRow}>
                  <View style={modalStyles.formHalfColumn}>
                    <Text style={modalStyles.formLabel}>Vision (Distant)</Text>
                    <TextInput
                      style={modalStyles.formInput}
                      value={visitRecordForm.visiondistant}
                      onChangeText={(text) =>
                        setVisitRecordForm({
                          ...visitRecordForm,
                          visiondistant: text,
                        })
                      }
                      placeholder="Enter value"
                    />
                  </View>
                  <View style={modalStyles.formHalfColumn}>
                    <Text style={modalStyles.formLabel}>Vision (Near)</Text>
                    <TextInput
                      style={modalStyles.formInput}
                      value={visitRecordForm.visionnear}
                      onChangeText={(text) =>
                        setVisitRecordForm({
                          ...visitRecordForm,
                          visionnear: text,
                        })
                      }
                      placeholder="Enter value"
                    />
                  </View>
                </View>

                <View style={modalStyles.formRow}>
                  <View style={modalStyles.formHalfColumn}>
                    <Text style={modalStyles.formLabel}>AR</Text>
                    <TextInput
                      style={modalStyles.formInput}
                      value={visitRecordForm.ar}
                      onChangeText={(text) =>
                        setVisitRecordForm({
                          ...visitRecordForm,
                          ar: text,
                        })
                      }
                      placeholder="Enter value"
                    />
                  </View>
                </View>

                <View style={modalStyles.formRow}>
                  <View style={modalStyles.formHalfColumn}>
                    <Text style={modalStyles.formLabel}>BCVA (Distant)</Text>
                    <TextInput
                      style={modalStyles.formInput}
                      value={visitRecordForm.bcvadistant}
                      onChangeText={(text) =>
                        setVisitRecordForm({
                          ...visitRecordForm,
                          bcvadistant: text,
                        })
                      }
                      placeholder="Enter value"
                    />
                  </View>
                  <View style={modalStyles.formHalfColumn}>
                    <Text style={modalStyles.formLabel}>BCVA (Near)</Text>
                    <TextInput
                      style={modalStyles.formInput}
                      value={visitRecordForm.bcvanear}
                      onChangeText={(text) =>
                        setVisitRecordForm({
                          ...visitRecordForm,
                          bcvanear: text,
                        })
                      }
                      placeholder="Enter value"
                    />
                  </View>
                </View>

                <View style={modalStyles.formRow}>
                  <View style={modalStyles.formHalfColumn}>
                    <Text style={modalStyles.formLabel}>NCT</Text>
                    <TextInput
                      style={modalStyles.formInput}
                      value={visitRecordForm.nct}
                      onChangeText={(text) =>
                        setVisitRecordForm({
                          ...visitRecordForm,
                          nct: text,
                        })
                      }
                      placeholder="Enter value"
                    />
                  </View>
                  <View style={modalStyles.formHalfColumn}>
                    <Text style={modalStyles.formLabel}>Color Vision</Text>
                    <TextInput
                      style={modalStyles.formInput}
                      value={visitRecordForm.colorvision}
                      onChangeText={(text) =>
                        setVisitRecordForm({
                          ...visitRecordForm,
                          colorvision: text,
                        })
                      }
                      placeholder="Enter value"
                    />
                  </View>
                </View>

                <View style={modalStyles.formRow}>
                  <View style={modalStyles.formHalfColumn}>
                    <Text style={modalStyles.formLabel}>Dry Retinoscopy</Text>
                    <TextInput
                      style={modalStyles.formInput}
                      value={visitRecordForm.dryretinoscopy}
                      onChangeText={(text) =>
                        setVisitRecordForm({
                          ...visitRecordForm,
                          dryretinoscopy: text,
                        })
                      }
                      placeholder="Enter value"
                    />
                  </View>
                  <View style={modalStyles.formHalfColumn}>
                    <Text style={modalStyles.formLabel}>Wet Retinoscopy</Text>
                    <TextInput
                      style={modalStyles.formInput}
                      value={visitRecordForm.wetretinoscopy}
                      onChangeText={(text) =>
                        setVisitRecordForm({
                          ...visitRecordForm,
                          wetretinoscopy: text,
                        })
                      }
                      placeholder="Enter value"
                    />
                  </View>
                </View>

                <View style={modalStyles.formRow}>
                  <View style={modalStyles.formHalfColumn}>
                    <Text style={modalStyles.formLabel}>ADAR</Text>
                    <TextInput
                      style={modalStyles.formInput}
                      value={visitRecordForm.adar}
                      onChangeText={(text) =>
                        setVisitRecordForm({
                          ...visitRecordForm,
                          adar: text,
                        })
                      }
                      placeholder="Enter value"
                    />
                  </View>
                  <View style={modalStyles.formHalfColumn}>
                    <Text style={modalStyles.formLabel}>PDA</Text>
                    <TextInput
                      style={modalStyles.formInput}
                      value={visitRecordForm.pda}
                      onChangeText={(text) =>
                        setVisitRecordForm({
                          ...visitRecordForm,
                          pda: text,
                        })
                      }
                      placeholder="Enter value"
                    />
                  </View>
                </View>

                <View style={modalStyles.formRow}>
                  <View style={modalStyles.formHalfColumn}>
                    <Text style={modalStyles.formLabel}>PG Power</Text>
                    <TextInput
                      style={modalStyles.formInput}
                      value={visitRecordForm.pgpower}
                      onChangeText={(text) =>
                        setVisitRecordForm({
                          ...visitRecordForm,
                          pgpower: text,
                        })
                      }
                      placeholder="Enter value"
                    />
                  </View>
                  {/*<View style={modalStyles.formHalfColumn}>
                    <Text style={modalStyles.formLabel}>Vision with PG</Text>
                    <TextInput
                      style={modalStyles.formInput}
                      value={visitRecordForm.pmtvisiontpg}
                      onChangeText={(text) =>
                        setVisitRecordForm({
                          ...visitRecordForm,
                          pmtvisiontpg: text,
                        })
                      }
                      placeholder="Enter value"
                    />
                  </View>*/}
                </View>

                <View style={modalStyles.formRow}>
                  <View style={modalStyles.formHalfColumn}>
                    <Text style={modalStyles.formLabel}>PMT</Text>
                    <TextInput
                      style={modalStyles.formInput}
                      value={visitRecordForm.pmt}
                      onChangeText={(text) =>
                        setVisitRecordForm({
                          ...visitRecordForm,
                          pmt: text,
                        })
                      }
                      placeholder="Enter value"
                    />
                  </View>
                </View>

                <Text style={modalStyles.formLabel}>Notes</Text>
                <TextInput
                  style={modalStyles.formInput}
                  value={visitRecordForm.notes}
                  onChangeText={(text) =>
                    setVisitRecordForm({
                      ...visitRecordForm,
                      notes: text,
                    })
                  }
                  placeholder="Enter notes about this visit"
                  multiline
                  numberOfLines={3}
                />

                <Text style={modalStyles.formLabel}>Prescription</Text>
                <TextInput
                  style={modalStyles.formInput}
                  value={visitRecordForm.glassPrescription}
                  onChangeText={(text) =>
                    setVisitRecordForm({
                      ...visitRecordForm,
                      glassPrescription: text,
                    })
                  }
                  multiline
                  numberOfLines={3}
                  placeholder="Enter prescription details"
                />
              </ScrollView>

              <View style={modalStyles.modalFooter}>
                <TouchableOpacity
                  style={modalStyles.cancelButton}
                  onPress={() => setAddingVisitRecord(false)}
                >
                  <Text style={modalStyles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={modalStyles.saveButton}
                  onPress={addVisitRecord}
                >
                  <Text style={modalStyles.saveButtonText}>Save Record</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <View style={modalStyles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function PatientsScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate header
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    fetchPatients();
  }, [headerAnim]);

  const fetchPatients = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await doctorService.getPatients();

      if (response.success) {
        setPatients(response.patients);
      } else {
        setError(response.message || "Failed to load patients");
      }
    } catch (err) {
      setError("An error occurred while loading patients");
      console.error("Error fetching patients:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPatients();
  };

  const filteredPatients = patients.filter((patient) => {
    if (!searchQuery.trim()) return true;
    return patient.fullName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const navigateToPatientDetails = (patient: Patient) => {
    setSelectedPatientId(patient.id);
    setModalVisible(true);
  };

  const closePatientDetails = () => {
    setModalVisible(false);
    setSelectedPatientId(null);
  };

  const renderPatientCard = ({ item }: { item: Patient }) => {
    let formattedLastVisit = "No visit recorded";

    if (item.visitRecords && item.visitRecords.length > 0) {
      // Sort the visit records by date (newest first)
      const sortedRecords = [...item.visitRecords]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

      // Use the latest record's date
      if (sortedRecords.length > 0) {
        formattedLastVisit = new Date(
          sortedRecords[0].date,
        ).toLocaleDateString();
      }
    }

    return (
      <View style={styles.patientCard}>
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() => navigateToPatientDetails(item)}
          activeOpacity={0.7}
        >
          <View style={styles.patientAvatar}>
            <Text style={styles.avatarText}>{item.fullName.charAt(0)}</Text>
          </View>
          <View style={styles.patientDetails}>
            <Text style={styles.patientName}>{item.fullName}</Text>
            <View style={styles.infoRow}>
              <Feather name="user" size={14} color="#888" />
              <Text style={styles.infoText}>
                {item.age ? `${item.age}` : "N/A"}
              </Text>
              {item.gender && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.infoText}>{item.gender}</Text>
                </>
              )}
            </View>
          </View>
          <Feather name="chevron-right" size={24} color="#5f2446" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
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
            <Text style={styles.headerTitle}>Patients</Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
              disabled={isLoading}
            >
              <Feather name="refresh-cw" size={20} color="#5f2446" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={styles.container}>
          <View style={styles.searchContainer}>
            <Feather
              name="search"
              size={20}
              color="#888"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search patients..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#888"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Feather name="x" size={20} color="#888" />
              </TouchableOpacity>
            )}
          </View>

          {isLoading && !refreshing ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#5f2446" />
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={48} color="#e53935" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={fetchPatients}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filteredPatients.length > 0 ? (
            <FlatList
              data={filteredPatients}
              keyExtractor={(item) => item.id}
              renderItem={renderPatientCard}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                />
              }
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Feather name="user-x" size={50} color="#5f2446" />
              <Text style={styles.emptyText}>
                {searchQuery.length > 0
                  ? "No patients match your search"
                  : "No patients found"}
              </Text>
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.clearSearchButton}
                  onPress={() => setSearchQuery("")}
                >
                  <Text style={styles.clearSearchText}>Clear Search</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* Patient Details Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={closePatientDetails}
        transparent={false}
      >
        <PatientDetailsModal
          patientId={selectedPatientId}
          onClose={closePatientDetails}
        />
      </Modal>
    </View>
  );
}

// Add these additional styles to the modalStyles:
const modalStyles = StyleSheet.create({
  gameScrollContainer: {
    maxHeight: 400,
    backgroundColor: "white",
    borderRadius: 10,
    marginVertical: 10,
    padding: 10,
    borderColor: "#eee",
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0e6eb",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  editButtonText: {
    color: "#5f2446",
    marginLeft: 5,
    fontWeight: "500",
  },
  medicalInfoDisplay: {
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 15,
  },
  medicalInfoItem: {
    marginBottom: 14,
  },
  medicalInfoLabel: {
    fontWeight: "bold",
    color: "#333",
    marginBottom: 3,
  },
  medicalInfoText: {
    color: "#666",
    lineHeight: 20,
  },

  // Form styles
  formContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 15,
  },
  formLabel: {
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
    marginTop: 10,
  },
  formSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#5f2446",
    marginTop: 20,
    marginBottom: 10,
  },
  formInput: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: "#333",
    minHeight: 40,
  },
  formButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: "#5f2446",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 10,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: "#666",
  },

  // Visit records section
  visitRecordsContainer: {
    padding: 16,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0e6eb",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  addButtonText: {
    color: "#5f2446",
    marginLeft: 5,
    fontWeight: "500",
  },
  visitRecord: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  recordDate: {
    color: "#5f2446",
    fontWeight: "500",
  },
  recordReason: {
    fontWeight: "bold",
    color: "#333",
  },
  recordItem: {
    marginBottom: 10,
  },
  recordLabel: {
    fontWeight: "bold",
    color: "#333",
    marginBottom: 3,
  },
  recordText: {
    color: "#666",
  },
  vitalsContainer: {
    flexDirection: "row",
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  vitalItem: {
    flex: 1,
    alignItems: "center",
  },
  vitalLabel: {
    color: "#888",
    fontSize: 12,
  },
  vitalValue: {
    color: "#333",
    fontWeight: "600",
    fontSize: 16,
  },
  recordSection: {
    marginTop: 10,
    marginBottom: 10,
  },
  recordSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#5f2446",
    marginBottom: 8,
  },
  visionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  visionItem: {
    width: "50%",
    paddingVertical: 5,
  },
  visionLabel: {
    fontSize: 12,
    color: "#888",
  },
  visionValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  prescriptionContainer: {
    backgroundColor: "#fff9f0",
    borderLeftWidth: 3,
    borderLeftColor: "#ffc107",
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  prescriptionLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  prescriptionText: {
    color: "#666",
    lineHeight: 20,
  },

  // Modal styles for add visit record
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "white",
    borderRadius: 15,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#5f2446",
  },
  modalBody: {
    padding: 15,
    maxHeight: 450,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  formRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  formHalfColumn: {
    width: "48%",
  },
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
  moreButton: {
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
  patientHeader: {
    backgroundColor: "#5f2446",
    padding: 20,
    alignItems: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#5f2446",
  },
  patientName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    marginBottom: 5,
  },
  patientBasicInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.8)",
    marginHorizontal: 8,
  },
  infoSection: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginBottom: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoItemText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#666",
  },
  conditionBadge: {
    backgroundColor: "#e8d5e1",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  conditionText: {
    color: "#5f2446",
    fontWeight: "500",
  },
  lastVisit: {
    color: "#888",
    fontStyle: "italic",
  },
  medicalHistoryContainer: {
    padding: 16,
  },
  loader: {
    marginVertical: 20,
  },
  medicalRecord: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  recordDiagnosis: {
    fontWeight: "bold",
    color: "#333",
  },
  recordNotes: {
    color: "#666",
    marginBottom: 8,
    lineHeight: 20,
  },
  treatmentContainer: {
    backgroundColor: "#f8f8f8",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  treatmentLabel: {
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  treatmentText: {
    color: "#666",
    lineHeight: 20,
  },
  addRecordButton: {
    backgroundColor: "#5f2446",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 20,
  },
  addRecordText: {
    color: "white",
    fontWeight: "bold",
    marginLeft: 8,
  },
  footer: {
    height: 60,
  },
  noRecordsContainer: {
    alignItems: "center",
    paddingVertical: 30,
  },
  noRecordsText: {
    color: "#888",
    fontSize: 16,
    marginTop: 10,
  },
  noDataText: {
    color: "#888",
    fontStyle: "italic",
    marginBottom: 10,
  },

  // Game history section styles
  gameLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  gameLoadingText: {
    marginLeft: 10,
    color: "#666",
    fontSize: 14,
  },
  gameDay: {
    marginBottom: 15,
  },
  gameDayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  gameDayDate: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  gameSummaryBadge: {
    backgroundColor: "#e8f5e9",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  gameSummaryText: {
    fontSize: 12,
    color: "#2e7d32",
  },
  gameItem: {
    flexDirection: "row",
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: "center",
  },
  gameIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0e6eb",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  gameDetails: {
    flex: 1,
  },
  gameName: {
    fontWeight: "500",
    fontSize: 15,
    marginBottom: 4,
    color: "#333",
  },
  gameMetrics: {
    flexDirection: "row",
  },
  gameMetric: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 15,
  },
  gameMetricText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  moreGamesText: {
    textAlign: "center",
    fontSize: 12,
    color: "#5f2446",
    marginTop: 5,
    fontStyle: "italic",
  },
  moreHistoryText: {
    textAlign: "center",
    fontSize: 12,
    color: "#666",
    marginTop: 15,
    paddingBottom: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  noGameDataContainer: {
    alignItems: "center",
    paddingVertical: 30,
  },
  noGameDataText: {
    color: "#888",
    fontSize: 16,
    marginTop: 10,
  },
});
// Add these additional styles to the styles:
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#5f2446",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
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
    height: "100%",
  },
  backButton: {
    padding: 5,
  },
  moreButton: {
    padding: 5,
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  searchContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 10,
    marginBottom: 16,
    alignItems: "center",
    paddingHorizontal: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: "#333",
  },
  listContainer: {
    paddingBottom: 80,
  },
  patientCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    overflow: "hidden",
  },
  cardContent: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
  },
  patientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#0D0145",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  avatarText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  patientDetails: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 6,
  },
  divider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ccc",
    marginHorizontal: 8,
  },
  loaderContainer: {
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
    color: "white",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
    marginBottom: 15,
    textAlign: "center",
  },
  clearSearchButton: {
    backgroundColor: "#5f2446",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  clearSearchText: {
    color: "white",
    fontWeight: "500",
  },
});

const progressStyles = StyleSheet.create({
  gameAccuracyContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  gameAccuracyBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#f0f0f0",
    borderRadius: 3,
    overflow: "hidden",
    marginRight: 10,
  },
  gameAccuracyFill: {
    height: 6,
    backgroundColor: "#5f2446",
    borderRadius: 3,
  },
  gameAccuracyText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
    minWidth: 80,
  },
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
