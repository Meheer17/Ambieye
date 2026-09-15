import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { View, ActivityIndicator, Text } from 'react-native';

// This component ensures proper authentication flow and routing
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, userType, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // If still loading auth state, don't do anything yet
    if (isLoading) {
      return;
    }

    const inAuthGroup = segments[0] === 'auth';
    const inDoctorGroup = segments[0] === '(doctor)';
    const inCaregiverGroup = segments[0] === '(caregiver)';
    const inPatientGroup = segments[0] === '(patient)';

    if (segments[0] === 'splash' || segments[0] === 'user-type') {
      // Always allow splash screen and role selection screen
      return;
    }

    // If not authenticated and not in auth group or user type selection, redirect to splash
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/splash');
      return;
    }

    // If authenticated but in auth group (login/signup), redirect to appropriate role home
    if (isAuthenticated && inAuthGroup) {
      if (userType === 'doctor') {
        router.replace('/(doctor)/' as any);
      } else if (userType === 'caregiver') {
        router.replace('/(caregiver)/' as any);
      } else {
        router.replace('/(patient)/' as any);
      }
      return;
    }

    // If authenticated but in wrong role group, redirect
    if (isAuthenticated && userType === 'doctor' && (inPatientGroup || inCaregiverGroup)) {
      router.replace('/(doctor)/' as any);
      return;
    }

    if (isAuthenticated && userType === 'caregiver' && (inDoctorGroup || inPatientGroup)) {
      router.replace('/(caregiver)/' as any);
      return;
    }

    if (isAuthenticated && userType === 'patient' && (inDoctorGroup || inCaregiverGroup)) {
      router.replace('/(patient)/' as any);
      return;
    }

    // If not authenticated and trying to access protected routes
    if (!isAuthenticated && (inDoctorGroup || inPatientGroup || inCaregiverGroup)) {
      router.replace('/splash');
      return;
    }
  }, [isAuthenticated, segments, router, userType, isLoading]);

  // Show a loading spinner while checking authentication
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D0145' }}>
        <ActivityIndicator size="large" color="#E8447A" />
      </View>
    );
  }

  // In React Native, all text strings must be wrapped in Text components
  // We're using a function to safely render children
  return (
    <View style={{ flex: 1 }}>
      {typeof children === 'string' ? <Text>{children}</Text> : children}
    </View>
  );
}