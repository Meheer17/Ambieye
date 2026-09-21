import React, { createContext, useState, useEffect } from "react";
import { Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authService } from "../services/api/apiService";

type UserType = "doctor" | "patient" | "caregiver";
type AuthState = {
  isAuthenticated: boolean;
  userType: UserType | null;
  userId: string | null;
  username: string | null;
  isLoading: boolean;
  error: string | null;
};

type AuthContextType = AuthState & {
  login: (username: string, password: string) => Promise<boolean>;
  signup: (userData: {
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
  }) => Promise<boolean>;
  logout: () => Promise<void>;
  setSelectedUserType: (type: UserType) => Promise<void>;
  clearError: () => void;
};

const initialState: AuthState = {
  isAuthenticated: false,
  userType: null,
  userId: null,
  username: null,
  isLoading: true,
  error: null,
};

export const AuthContext = createContext<AuthContextType>({
  ...initialState,
  login: async () => false,
  signup: async () => false,
  logout: async () => {},
  setSelectedUserType: async () => {},
  clearError: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [authState, setAuthState] = useState<AuthState>(initialState);

  useEffect(() => {
    // Load authentication state from storage on app start and verify token
    const loadAuthAndVerify = async () => {
      try {
        const token = await AsyncStorage.getItem("access_token");

        // If no token, we're not authenticated
        if (!token) {
          const userType = (await AsyncStorage.getItem(
            "userType",
          )) as UserType | null;
          setAuthState({
            isAuthenticated: false,
            userType,
            userId: null,
            username: null,
            isLoading: false,
            error: null,
          });
          return;
        }

        // If token exists, verify it with the server
        const { success, user, error } = await authService.verify();

        if (success && user) {
          const isCaregiver =
            user.role === "caregiver" ||
            user.mode === "caregiver" ||
            user.username?.toLowerCase() === "caregiver";
          const resolvedType: UserType = isCaregiver
            ? "caregiver"
            : user.role === "doctor"
            ? "doctor"
            : "patient";

          setAuthState({
            isAuthenticated: true,
            userType: resolvedType,
            userId: user.id,
            username: user.username,
            isLoading: false,
            error: null,
          });
        } else {
          // If verification fails, clear stored data except userType
          const userType = (await AsyncStorage.getItem(
            "userType",
          )) as UserType | null;
          await AsyncStorage.removeItem("access_token");
          await AsyncStorage.removeItem("refresh_token");
          await AsyncStorage.removeItem("userId");
          await AsyncStorage.removeItem("username");

          setAuthState({
            isAuthenticated: false,
            userType,
            userId: null,
            username: null,
            isLoading: false,
            error: error || "Session expired",
          });
        }
      } catch (error) {
        console.error("Failed to load auth state:", error);
        const userType = (await AsyncStorage.getItem(
          "userType",
        )) as UserType | null;
        setAuthState({
          isAuthenticated: false,
          userType,
          userId: null,
          username: null,
          isLoading: false,
          error: "Failed to authenticate",
        });
      }
    };

    loadAuthAndVerify();
  }, []);

  const login = async (
    username: string,
    password: string,
  ): Promise<boolean> => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { success, user, error } = await authService.login(
        username,
        password,
      );

      if (success && user) {
        const isCaregiver =
          username.toLowerCase() === "caregiver" ||
          user.role === "caregiver" ||
          user.mode === "caregiver" ||
          authState.userType === "caregiver";

        const resolvedType: UserType = isCaregiver
          ? "caregiver"
          : user.role === "doctor"
          ? "doctor"
          : "patient";

        setAuthState({
          isAuthenticated: true,
          userId: user.id,
          username: user.username,
          userType: resolvedType,
          isLoading: false,
          error: null,
        });
        await AsyncStorage.setItem("userType", resolvedType);
        return true;
      } else {
        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error: error || "Login failed",
        }));
        return false;
      }
    } catch (error) {
      console.error("Failed during login:", error);
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: "An unexpected error occurred",
      }));
      return false;
    }
  };

  const signup = async (userData: {
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
  }): Promise<boolean> => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      if (!authState.userType) {
        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error: "User type is not selected",
        }));
        return false;
      }

      const { success, user, error } = await authService.signup({
        ...userData,
        userType: authState.userType === "doctor" ? "doctor" : "patient",
      });

      if (success && user) {
        setAuthState({
          isAuthenticated: true,
          userId: user.id,
          username: user.username,
          userType: user.role,
          isLoading: false,
          error: null,
        });
        return true;
      } else {
        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error: error || "Signup failed",
        }));
        return false;
      }
    } catch (error) {
      console.error("Failed during signup:", error);
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: "An unexpected error occurred",
      }));
      return false;
    }
  };

  const logout = async () => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      await authService.logout();

      setAuthState({
        isAuthenticated: false,
        userId: null,
        username: null,
        userType: null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error("Failed during logout:", error);
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Logout failed",
      }));
    }
  };

  const setSelectedUserType = async (type: UserType) => {
    try {
      await AsyncStorage.setItem("userType", type);
      setAuthState((prev) => ({ ...prev, userType: type }));
    } catch (error) {
      console.error("Failed to set user type:", error);
    }
  };

  const clearError = () => {
    setAuthState((prev) => ({ ...prev, error: null }));
  };

  // Ensure children are properly wrapped
  const wrappedChildren =
    typeof children === "string" ? <Text>{children}</Text> : children;

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        signup,
        logout,
        setSelectedUserType,
        clearError,
      }}
    >
      {wrappedChildren}
    </AuthContext.Provider>
  );
};
