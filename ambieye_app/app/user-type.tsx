import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, Image } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";

export default function UserTypeScreen() {
  const { setSelectedUserType } = useAuth();

  const handleUserTypeSelection = (type: "doctor" | "patient") => {
    setSelectedUserType(type);
    router.push("/auth/login");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>I am a...</Text>

      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={styles.option}
          onPress={() => handleUserTypeSelection("doctor")}
        >
          <View style={styles.iconContainer}>
            <Image
              source={require("../assets/images/doctor.png")}
              style={styles.icon}
            />
          </View>
          <Text style={styles.optionText}>Doctor</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
          onPress={() => handleUserTypeSelection("patient")}
        >
          <View style={styles.iconContainer}>
            <Image
              source={require("@/assets/images/doctor.png")}
              style={styles.icon}
            />
          </View>
          <Text style={styles.optionText}>Patient</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0145",
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 50,
  },
  optionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  option: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 30,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  icon: {
    width: 70,
    height: 70,
    tintColor: "white",
  },
  optionText: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
    marginTop: 10,
  },
});
