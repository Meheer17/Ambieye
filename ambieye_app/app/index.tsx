// app/index.tsx
import "expo-router/entry";
import { Redirect } from "expo-router";

export default function Index() {
  return <Redirect href="/splash" />;
}
