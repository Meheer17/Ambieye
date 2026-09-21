import { Platform } from "react-native";
import Constants from "expo-constants";

// Fallback Local Machine IP from ipconfig (Wi-Fi LAN)
const DEFAULT_LAN_IP = "10.133.31.66";

/**
 * Dynamically resolves the development machine IP from Expo bundler
 */
export function getDevHostIp(): string {
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any)?.manifest?.debuggerHost ||
      (Constants as any)?.manifest2?.extra?.expoClient?.hostUri;

    if (hostUri) {
      const ip = hostUri.split(":")[0];
      if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
        return ip;
      }
    }
  } catch {
    // fallback below
  }
  return DEFAULT_LAN_IP;
}

const LOCAL_WIFI_IP = getDevHostIp();

// Python FastAPI backend running on port 8000
const PYTHON_BACKEND_URL = `http://${LOCAL_WIFI_IP}:8000/api`;

// WebSocket Call Signaling URL
const WS_CALLS_URL = `ws://${LOCAL_WIFI_IP}:8000/ws/calls`;

export const API_CONFIG = {
  LOCAL_IP: LOCAL_WIFI_IP,
  getDevHostIp,
  // Primary: Local Python FastAPI backend
  BASE_URL: PYTHON_BACKEND_URL,
  WS_CALLS_URL: WS_CALLS_URL,
  FALLBACK_URL: "https://p01--ambieye--6s9l5yxyj7q6.code.run/api",

  ENDPOINTS: {
    AUTH: {
      LOGIN: "/auth/login",
      SIGNUP: "/auth/signup",
      VERIFY: "/auth/verify",
    },
    DOCTOR: {
      DASHBOARD: "/doctor/dashboard",
      PATIENTS: "/doctor/patients",
      PROFILE: "/doctor/profile",
      QUERIES: "/doctor/queries",
      DELETE: "/doctor/delete",
    },
    GAMES: {
      RESULTS: "/games/results",
      TODAY: "/games/today",
      HISTORY: "/games/history",
      SESSIONS: "/games/sessions",
      EVENTS: "/games/events",
      STATS: "/games/stats",
    },
    PATIENT: {
      DASHBOARD: "/patient/dashboard",
      QUERIES: "/patient/queries",
      PROFILE: "/patient/profile",
      DOCTORS: "/patient/doctors",
      DELETE: "/patient/delete",
    },
    QUERIES: "/queries",
    FAMILY: {
      BASE: "/family",
      PATIENT: (patientId: string) => `/patients/${patientId}/family`,
      MEMBER: (id: string) => `/family/${id}`,
      TOGGLE_FAVORITE: (id: string) => `/family/${id}/toggle-favorite`,
    },
    CALLS: {
      BASE: "/calls",
      DETAIL: (id: string) => `/calls/${id}`,
      HISTORY: (patientId?: string) =>
        patientId ? `/patients/${patientId}/calls` : "/calls/history",
    },
    MUSIC: {
      EVENTS: "/music/events",
      PATIENT_EVENTS: (patientId: string) => `/patients/${patientId}/music/events`,
      SUMMARY: (patientId: string) => `/patients/${patientId}/music/summary`,
      FAVORITES: (patientId: string) => `/patients/${patientId}/music/favorites`,
    },
    PERSONALIZED_ACTIVITIES: {
      BASE: "/personalized-activities",
      CREATE: "/personalized-activities",
      LIST: "/personalized-activities",
      UPLOAD_MEDIA: "/personalized-activities/upload-media",
      DETAIL: (id: string) => `/personalized-activities/${id}`,
      SUBMIT: (id: string) => `/personalized-activities/${id}/submit`,
      RESULTS: "/personalized-activities/results",
      SUMMARY: "/personalized-activities/summary",
    },
  },
};

