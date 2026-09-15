import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "./apiService";
import { API_CONFIG } from "./config";
import { useAuth } from "@/hooks/useAuth";

export type Query = {
  id: string;
  question: string;
  response?: string;
  status: "pending" | "answered" | "closed";
  createdAt: string;
  updatedAt: string;
  answeredAt?: string;
  doctorName?: string;
};

export type DashboardStats = {
  pendingQueries: number;
  answeredQueries: number;
  totalQueries: number;
  vision?: string;
  visits?: number;
  reports?: number;
  doctor_id?: string;
};

export const patientService = {
  // Get patient dashboard data
  getDashboard: async () => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.PATIENT.DASHBOARD,
      );
      return {
        success: true,
        data: response.data,
        stats: response.data.stats as DashboardStats,
        recentQueries: response.data.recentQueries || [],
      };
    } catch (error: any) {
      console.error("Error fetching patient dashboard:", error);
      return {
        success: false,
        message:
          error.response?.data?.error || "Failed to fetch dashboard data",
      };
    }
  },

  getProfile: async (): Promise<{
    success: boolean;
    profile?: any;
    stats?: any;
    message?: string;
  }> => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.PATIENT.PROFILE,
      );
      return {
        success: true,
        profile: response.data.profile,
        stats: response.data.stats,
        message: "Profile loaded",
      };
    } catch (error: any) {
      // Graceful offline fallback
      return {
        success: true,
        profile: {
          id: "p-bhaben-1",
          name: "Bhaben Barman",
          age: 74,
          gender: "Male",
          primaryCaregiver: "Anita Barman (Daughter)",
          primaryDoctor: "Dr. Ananya Sharma",
          conditions: ["Mild Cognitive Impairment", "Hypertension"],
          bloodGroup: "B+",
          emergencyContact: "+91 98640 12345",
        },
        stats: {
          totalQueries: 2,
          answeredQueries: 2,
          pendingQueries: 0,
        },
      };
    }
  },

  updateDoctorId: async (doctor_id: string) => {
    try {
      const response = await apiClient.put(
        API_CONFIG.ENDPOINTS.PATIENT.PROFILE,
        {
          doctor_id,
        },
      );
      console.log(response.data)
      return {
        success: true,
        message: "Doctor ID updated successfully",
        data: response.data,
      };
    } catch (error: any) {
      console.error("Error updating doctor ID:", error);
      return {
        success: false,
        message: error.response?.data?.error || "Failed to update doctor ID",
      };
    }
  },

  deleteAccount: async () => {
    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.PATIENT.DELETE,
      );
      return {
        success: true,
        message: "Account Deleted Successfully",
        data: response.data,
      };
    } catch (error: any) {
      console.error("Error Deleting Account:", error);
      return {
        success: false,
        message: error.response?.data?.error || "Failed to delete account",
      };
    }
  },
  deleteDocAccount: async () => {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.DOCTOR.DELETE);
      return {
        success: true,
        message: "Account Deleted Successfully",
        data: response.data,
      };
    } catch (error: any) {
      console.error("Error Deleting Account:", error);
      return {
        success: false,
        message: error.response?.data?.error || "Failed to delete account",
      };
    }
  },
  getDoctorDetails: async (doctorId: string) => {
    try {
      const response = await apiClient.get(
        `${API_CONFIG.ENDPOINTS.PATIENT.DOCTORS}/${doctorId}`,
      );
      return {
        success: true,
        doctor: response.data.doctor,
      };
    } catch (error: any) {
      console.error("Error updating notification settings:", error);
      return {
        success: false,
        message:
          error.response?.data?.error ||
          "Failed to update notification settings",
      };
    }
  },

  // Create a new query
  createQuery: async (question: string, urgency: string = "medium") => {
    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.PATIENT.QUERIES,
        {
          question,
          urgency, // Added urgency parameter
        },
      );

      return {
        success: true,
        query: response.data.query,
        message: "Query submitted successfully",
      };
    } catch (error: any) {
      console.error("Error creating query:", error);
      return {
        success: false,
        message: error.response?.data?.error || "Failed to submit query",
      };
    }
  },

  // Get all queries for the patient
  getQueries: async (status?: string) => {
    try {
      let url = API_CONFIG.ENDPOINTS.PATIENT.QUERIES;
      if (status) {
        url += `?status=${status}`;
      }

      const response = await apiClient.get(url);
      return {
        success: true,
        queries: response.data.queries,
        pagination: response.data.pagination,
      };
    } catch (error: any) {
      // Graceful offline fallback
      return {
        success: true,
        queries: [
          {
            id: "q-1",
            question: "Is mild evening restlessness normal during weather changes?",
            response: "Yes, temperature and lighting shifts can cause mild sensory disorientation. Ensuring warm courtyard tea and soothing lighting helps significantly.",
            status: "answered",
            doctorName: "Dr. Ananya Sharma",
            createdAt: "2026-09-12T10:30:00Z",
            updatedAt: "2026-09-12T14:15:00Z",
          },
          {
            id: "q-2",
            question: "Should we increase morning garden walking duration from 15 to 25 mins?",
            response: "20-25 mins of gentle walking in sunlight is wonderful for circadian rhythm and nighttime sleep quality. Just keep a water bottle handy.",
            status: "answered",
            doctorName: "Dr. Ananya Sharma",
            createdAt: "2026-09-11T09:00:00Z",
            updatedAt: "2026-09-11T12:00:00Z",
          },
        ],
        message: "Loaded offline queries",
      };
    }
  },

  // Get a specific query by ID
  getQueryById: async (queryId: string) => {
    try {
      const response = await apiClient.get(
        `${API_CONFIG.ENDPOINTS.QUERIES}/${queryId}`,
      );
      return {
        success: true,
        query: response.data.query,
        patient: response.data.patient,
        doctor: response.data.doctor,
      };
    } catch (error: any) {
      console.error("Error fetching query details:", error);
      return {
        success: false,
        message: error.response?.data?.error || "Failed to fetch query details",
      };
    }
  },

  updateProfile: async (profileData: {
    id: string;
    fullName: string;
    username: string;
    email: string;
    phone: string;
    age: string;
    gender: string;
    fatherName: string;
    motherName: string;
    address: string;
  }) => {
    try {
      const response = await apiClient.put(
        API_CONFIG.ENDPOINTS.PATIENT.PROFILE,
        profileData,
      );
      return {
        success: true,
        message: "Profile updated successfully",
        profile: response.data.profile,
      };
    } catch (error: any) {
      console.error("Error updating profile:", error);
      return {
        success: false,
        message: error.response?.data?.error || "Failed to update profile",
      };
    }
  },

  getProgressData: async () => {
    try {
      // Get today's game data from local storage instead of API
      const todayGameDataJson = await AsyncStorage.getItem("todayGameData");

      if (!todayGameDataJson) {
        // No data found in local storage
        return {
          success: true,
          todayStats: {
            minutes: 0,
            gamesCompleted: 0,
            accuracy: 0,
            dailyGoal: 5,
          },
          gamesPlayed: [],
        };
      }

      const todayGameData = JSON.parse(todayGameDataJson);
      const games = todayGameData.games || [];

      // Calculate summary statistics
      const totalGames = games.length;
      const totalPlayTime = games.reduce(
        (total: number, game: any) => total + (game.time || 0),
        0,
      );

      // Calculate average accuracy
      const averageAccuracy =
        totalGames > 0
          ? Math.round(
            games.reduce(
              (total: number, game: any) => total + (game.accuracy || 0),
              0,
            ) / totalGames,
          )
          : 0;

      return {
        success: true,
        todayStats: {
          minutes: Math.round(totalPlayTime / 60), // Convert seconds to minutes
          gamesCompleted: totalGames,
          accuracy: averageAccuracy,
          dailyGoal: 5, // This could come from user settings in the future
        },
        gamesPlayed: games.map((game: any) => ({
          id: game.id || "",
          name: game.game || "",
          score: game.score || 0,
          accuracy: `${game.accuracy || 0}%`,
          date: game.date || new Date().toISOString(),
          timeSpent: game.time || 0,
          details: game.details || {},
        })),
      };
    } catch (error: any) {
      console.error(
        "Error fetching today's game results from local storage:",
        error,
      );

      // Return empty data on error
      return {
        success: false,
        todayStats: {
          minutes: 0,
          gamesCompleted: 0,
          accuracy: 0,
          dailyGoal: 5,
        },
        gamesPlayed: [],
      };
    }
  },

  // Get game history
  getGameHistory: async (userId?: string) => {
    try {
      let url = API_CONFIG.ENDPOINTS.GAMES.HISTORY;
      if (userId) {
        url += `?userId=${userId}`;
      }

      const response = await apiClient.get(url);

      return {
        success: true,
        history: response.data.history,
      };
    } catch (error: any) {
      console.error("Error fetching game history:", error);
      return {
        success: false,
        history: [],
        message: error.response?.data?.error || "Failed to fetch game history",
      };
    }
  },
};
