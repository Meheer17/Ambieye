import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "./apiService";
import { API_CONFIG } from "./config";

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

  getProfile: async () => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.PATIENT.PROFILE,
      );
      return {
        success: true,
        profile: response.data.profile,
        stats: response.data.stats,
      };
    } catch (error: any) {
      console.error("Error fetching patient profile:", error);
      return {
        success: false,
        message: error.response?.data?.error || "Failed to fetch profile",
      };
    }
  },

  updateDoctorId: async (doctorId: string) => {
    try {
      const response = await apiClient.put(
        API_CONFIG.ENDPOINTS.PATIENT.PROFILE,
        {
          doctorId,
        },
      );
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
      console.error("Error fetching queries:", error);
      return {
        success: false,
        queries: [],
        message: error.response?.data?.error || "Failed to fetch queries",
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
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.GAMES.TODAY);
      // If API call is successful, transform the data to match getProgressData format
      return {
        success: true,
        todayStats: {
          minutes: response.data.summary.totalPlayTime || 0,
          gamesCompleted: response.data.summary.totalGames || 0,
          accuracy: response.data.summary.averageAccuracy || 0,
          dailyGoal: 5, // This could come from user settings in the future
        },
        gamesPlayed: response.data.results.map((game: any) => ({
          id: game.id || "",
          name: game.game || "",
          score: game.score || 0,
          accuracy: `${Math.round(response.data.summary.averageAccuracy || 0)}%`,
          date: game.date || new Date().toISOString(),
          timeSpent: game.time || 0,
          details: game.details || {},
        })),
      };
    } catch (error: any) {
      console.error("Error fetching today's game results:", error);

      // Fall back to mock data if API fails
      return {
        success: false,
        todayStats: {},
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

  // Get patient game history and progress data
  // getProgressData: async () => {
  //   try {
  //     // This would be the actual API endpoint for progress data
  //     // For now using a mock
  //     await new Promise((resolve) => setTimeout(resolve, 800));

  //     return {
  //       success: true,
  //       todayStats: {
  //         minutes: 15,
  //         gamesCompleted: 2,
  //         accuracy: 85,
  //         dailyGoal: 5,
  //       },
  //       gamesPlayed: [
  //         {
  //           id: "1",
  //           name: "Focus Training",
  //           score: 90,
  //           accuracy: "90%",
  //           date: new Date().toISOString(),
  //           timeSpent: 8,
  //         },
  //         {
  //           id: "2",
  //           name: "Memory Match",
  //           score: 75,
  //           accuracy: "75%",
  //           date: new Date().toISOString(),
  //           timeSpent: 10,
  //         },
  //       ],
  //     };
  //   } catch (error: any) {
  //     console.error("Error fetching progress data:", error);
  //     return {
  //       success: false,
  //       message: "Failed to fetch progress data",
  //     };
  //   }
  // },
};
