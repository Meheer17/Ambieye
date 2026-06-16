// aarti-app/apps/mobile_client/services/api/apiService.ts
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG } from "./config";

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Add request interceptor to automatically add authentication token to requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error getting token for request:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Add response interceptor to handle common error scenarios
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 (Unauthorized) and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Clear auth data on authentication failure
      await AsyncStorage.removeItem("access_token");
      await AsyncStorage.removeItem("refresh_token");

      // Could implement token refresh logic here in the future

      // For now, just reject the request
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

// Authentication service
export const authService = {
  login: async (username: string, password: string) => {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.LOGIN, {
        username,
        password,
      });

      const { access_token, refresh_token, user } = response.data;

      // Save tokens and user data
      await AsyncStorage.setItem("access_token", access_token);
      await AsyncStorage.setItem("refresh_token", refresh_token || "");
      await AsyncStorage.setItem("userId", String(user.id));
      await AsyncStorage.setItem("username", user.username);
      await AsyncStorage.setItem("userType", user.role); // 'doctor' or 'patient'

      return {
        success: true,
        user: user,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || "Login failed " + error.message,
      };
    }
  },

  signup: async (userData: {
    fullName: string;
    username: string;
    email: string;
    password: string;
    phone: string;
    dateOfBirth: string;
    age: string;
    gender: string;
    fatherName: string;
    motherName: string;
    address: string;
    userType: "doctor" | "patient";
  }) => {
    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.AUTH.SIGNUP,
        userData,
      );

      const { access_token, refresh_token, user } = response.data;

      // Save tokens and user data
      await AsyncStorage.setItem("access_token", access_token);
      await AsyncStorage.setItem("refresh_token", refresh_token || "");
      await AsyncStorage.setItem("userId", String(user.id));
      await AsyncStorage.setItem("username", user.username);
      await AsyncStorage.setItem("userType", user.role); // 'doctor' or 'patient'

      return {
        success: true,
        user: user,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || "Signup failed",
      };
    }
  },

  verify: async () => {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.AUTH.VERIFY);
      return {
        success: true,
        user: response.data.user,
      };
    } catch (error) {
      return {
        success: false,
        error: "Token verification failed",
      };
    }
  },

  logout: async () => {
    try {
      // Clear stored data on both mobile (AsyncStorage) and web (localStorage/sessionStorage)
      await AsyncStorage.removeItem("access_token");
      await AsyncStorage.removeItem("refresh_token");
      await AsyncStorage.removeItem("userId");
      await AsyncStorage.removeItem("username");
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem("access_token");
        window.localStorage.removeItem("refresh_token");
        window.localStorage.removeItem("userId");
        window.localStorage.removeItem("username");
      }
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.removeItem("access_token");
        window.sessionStorage.removeItem("refresh_token");
        window.sessionStorage.removeItem("userId");
        window.sessionStorage.removeItem("username");
      }

      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      // Even if the API call fails, we still clear local and web storage
      await AsyncStorage.removeItem("access_token");
      await AsyncStorage.removeItem("refresh_token");
      await AsyncStorage.removeItem("userId");
      await AsyncStorage.removeItem("username");

      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem("access_token");
        window.localStorage.removeItem("refresh_token");
        window.localStorage.removeItem("userId");
        window.localStorage.removeItem("username");
      }
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.removeItem("access_token");
        window.sessionStorage.removeItem("refresh_token");
        window.sessionStorage.removeItem("userId");
        window.sessionStorage.removeItem("username");
      }

      return { success: true };
    }
  },
};

// Export the API client for other services to use
export default apiClient;
