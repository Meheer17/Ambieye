export const API_CONFIG = {
  // Change this to your actual API domain in production
  BASE_URL: "http://65.1.200.234:5000/api",
  ENDPOINTS: {
    AUTH: {
      LOGIN: "/auth/login",
      SIGNUP: "/auth/signup",
      VERIFY: "/auth/verify",
      LOGOUT: "/auth/logout",
    },
    DOCTOR: {
      DASHBOARD: "/doctor/dashboard",
      PATIENTS: "/doctor/patients",
      PROFILE: "/doctor/profile",
      QUERIES: "/doctor/queries",
    },
    GAMES: {
      RESULTS: "/games/results",
      TODAY: "/games/today",
      HISTORY: "/games/history",
    },
    PATIENT: {
      DASHBOARD: "/patient/dashboard",
      QUERIES: "/patient/queries",
      PROFILE: "/patient/profile",
      DOCTORS: "/patient/doctors",
    },
    QUERIES: "/queries",
  },
};