import { Stack } from "expo-router";

export default function StackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // You can customize this
      }}
    />
  );
}
