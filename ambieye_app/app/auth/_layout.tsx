import React from "react";
import { Stack } from "expo-router";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { Text } from "react-native";
import Feather from "@expo/vector-icons/Feather";

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="login"
        options={({ navigation }) => ({
          headerShown: true,
          header: () => (
            <View style={styles.customHeader}>
              <TouchableOpacity
                onPress={() => navigation.navigate("user-type")}
                style={styles.backButton}
              >
                <Feather name="arrow-left-circle" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerText}>Login</Text>
              <View style={{ width: 24 }} />{" "}
              {/* Empty view for balanced layout */}
            </View>
          ),
        })}
      />
      <Stack.Screen
        name="signup"
        options={({ navigation }) => ({
          headerShown: true,
          header: () => (
            <View style={[styles.customHeader]}>
              <TouchableOpacity
                onPress={() => navigation.navigate("user-type")}
                style={styles.backButton}
              >
                <Feather name="arrow-left-circle" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerText}>Sign Up</Text>
              <View style={{ width: 24 }} />{" "}
              {/* Empty view for balanced layout */}
            </View>
          ),
        })}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  customHeader: {
    backgroundColor: "#0D0145",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 10,
  },
  backButton: {
    marginLeft: 10,
    marginRight: 10,
  },
  headerText: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
});
