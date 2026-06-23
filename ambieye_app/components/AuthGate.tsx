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
    const inPatientGroup = segments[0] === '(patient)';

    if (segments[0] === 'splash') {
      // Always allow splash screen
      return;
    }

    // If not authenticated and not in auth group or user type selection, redirect to splash
    if (!isAuthenticated && !inAuthGroup && segments[0] !== 'user-type') {
      router.replace('/splash');
      return;
    }

    // If authenticated but in auth group or user type selection, redirect to appropriate role home
    if (isAuthenticated && (inAuthGroup || segments[0] === 'user-type')) {
      if (userType === 'doctor') {
        router.replace('/(doctor)/');
      } else {
        router.replace('/(patient)/');
      }
      return;
    }

    // If authenticated but in wrong role group, redirect
    if (isAuthenticated && userType === 'doctor' && inPatientGroup) {
      router.replace('/(doctor)/');
      return;
    }

    if (isAuthenticated && userType === 'patient' && inDoctorGroup) {
      router.replace('/(patient)/');
      return;
    }

    // If not authenticated and trying to access protected routes
    if (!isAuthenticated && (inDoctorGroup || inPatientGroup)) {
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