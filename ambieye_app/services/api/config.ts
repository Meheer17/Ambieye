export const API_CONFIG = {
  // Change this to your actual API domain in production
  BASE_URL: "https://p01--ambieye--6s9l5yxyj7q6.code.run/api",
  // BASE_URL: "http://180.235.121.245:2327/api",

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
    },
    PATIENT: {
      DASHBOARD: "/patient/dashboard",
      QUERIES: "/patient/queries",
      PROFILE: "/patient/profile",
      DOCTORS: "/patient/doctors",
      DELETE: "/patient/delete",
    },
    QUERIES: "/queries",
  },
};
