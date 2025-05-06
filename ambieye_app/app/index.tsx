// app/index.tsx
import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to the splash screen on app launch
  return <Redirect href="/splash" />;
}