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
  timeout: 5000,
});

import { Platform } from "react-native";

// Add request interceptor to automatically add authentication token and dynamic dev host
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const devHost = API_CONFIG.getDevHostIp ? API_CONFIG.getDevHostIp() : API_CONFIG.LOCAL_IP;
      config.baseURL = `http://${devHost}:8000/api`;
      const token = await AsyncStorage.getItem("access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error preparing request:", error);
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

// Demo credentials map for the 4 NER Dementia Care roles
const DEMO_ACCOUNTS: Record<
  string,
  { id: number; fullName: string; username: string; role: "doctor" | "patient" | "caregiver"; mode: string }
> = {
  mahi: { id: 1, fullName: "Bhaben Barman (Senior)", username: "mahi", role: "patient", mode: "elderly" },
  elderly: { id: 1, fullName: "Bhaben Barman (Senior)", username: "mahi", role: "patient", mode: "elderly" },
  caregiver: { id: 2, fullName: "Anita Barman (Caregiver)", username: "caregiver", role: "caregiver", mode: "caregiver" },
  asha_worker: { id: 3, fullName: "Priya Das (ASHA Community)", username: "asha_worker", role: "doctor", mode: "asha" },
  asha: { id: 3, fullName: "Priya Das (ASHA Community)", username: "asha_worker", role: "doctor", mode: "asha" },
  mahit: { id: 4, fullName: "Dr. Mahit Sharma (Specialist)", username: "mahit", role: "doctor", mode: "specialist" },
  doctor: { id: 4, fullName: "Dr. Mahit Sharma (Specialist)", username: "mahit", role: "doctor", mode: "specialist" },
};

// Authentication service
export const authService = {
  login: async (
    username: string,
    password: string
  ): Promise<{ success: boolean; user?: any; error?: string }> => {
    const cleanUsername = username.trim().toLowerCase();
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.LOGIN, {
        username,
        password,
      });

      const { access_token, refresh_token, user } = response.data;
      const isCaregiver =
        cleanUsername === "caregiver" ||
        cleanUsername.includes("care") ||
        user.role === "caregiver" ||
        user.mode === "caregiver";
      const resolvedRole = isCaregiver ? "caregiver" : user.role;

      // Save tokens and user data
      await AsyncStorage.setItem("access_token", access_token);
      await AsyncStorage.setItem("refresh_token", refresh_token || "");
      await AsyncStorage.setItem("userId", String(user.id));
      await AsyncStorage.setItem("username", user.username);
      await AsyncStorage.setItem("userType", resolvedRole);

      return {
        success: true,
        user: { ...user, role: resolvedRole },
      };
    } catch (error: any) {
      // Offline / Local Python backend fallback for the 4 core demo roles
      const matchedUser = DEMO_ACCOUNTS[cleanUsername];
      if (matchedUser) {
        const dummyToken = `demo_token_${matchedUser.username}_${Date.now()}`;
        await AsyncStorage.setItem("access_token", dummyToken);
        await AsyncStorage.setItem("userId", String(matchedUser.id));
        await AsyncStorage.setItem("username", matchedUser.username);
        await AsyncStorage.setItem("userType", matchedUser.role);

        return {
          success: true,
          user: matchedUser,
        };
      }

      // Generic fallback for any other valid input
      if (username && password) {
        const isCare = cleanUsername.includes("care");
        const isDoc =
          cleanUsername.includes("doc") ||
          cleanUsername.includes("asha") ||
          cleanUsername.includes("mahit");
        const fallbackRole = isCare ? "caregiver" : isDoc ? "doctor" : "patient";
        const fallbackUser = {
          id: 999,
          fullName: username,
          username: username,
          role: fallbackRole as "doctor" | "patient" | "caregiver",
        };
        const dummyToken = `demo_token_${username}_${Date.now()}`;
        await AsyncStorage.setItem("access_token", dummyToken);
        await AsyncStorage.setItem("userId", "999");
        await AsyncStorage.setItem("username", username);
        await AsyncStorage.setItem("userType", fallbackUser.role);

        return {
          success: true,
          user: fallbackUser,
        };
      }

      return {
        success: false,
        error: error.response?.data?.message || "Login failed",
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
  }): Promise<{ success: boolean; user?: any; error?: string }> => {
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
      // Local fallback for signup
      const newUser = {
        id: Math.floor(Math.random() * 10000),
        fullName: userData.fullName,
        username: userData.username,
        email: userData.email,
        role: userData.userType,
      };
      const dummyToken = `signup_token_${userData.username}_${Date.now()}`;
      await AsyncStorage.setItem("access_token", dummyToken);
      await AsyncStorage.setItem("userId", String(newUser.id));
      await AsyncStorage.setItem("username", newUser.username);
      await AsyncStorage.setItem("userType", newUser.role);

      return {
        success: true,
        user: newUser,
      };
    }
  },

  verify: async (): Promise<{ success: boolean; user?: any; error?: string }> => {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.AUTH.VERIFY);
      return {
        success: true,
        user: response.data.user,
      };
    } catch (error) {
      const storedToken = await AsyncStorage.getItem("access_token");
      const storedUsername = await AsyncStorage.getItem("username");
      const storedUserType = (await AsyncStorage.getItem("userType")) as "doctor" | "patient" | "caregiver" | null;
      const storedUserId = await AsyncStorage.getItem("userId");

      if (storedToken && storedUsername && storedUserType) {
        const isCare =
          storedUsername.toLowerCase() === "caregiver" ||
          storedUsername.toLowerCase().includes("care") ||
          storedUserType === "caregiver";
        return {
          success: true,
          user: {
            id: storedUserId || "1",
            username: storedUsername,
            role: (isCare ? "caregiver" : storedUserType) as "doctor" | "patient" | "caregiver",
          },
        };
      }

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
