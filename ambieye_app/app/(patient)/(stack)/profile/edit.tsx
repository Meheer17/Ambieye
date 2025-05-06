import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { patientService } from "@/services/api/patientService";

interface ProfileData {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  age?: string;
  gender?: string;
  fatherName?: string;
  motherName?: string;
  address?: string;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    id: "",
    fullName: "",
    username: "",
    email: "",
    phone: "",
    age: "",
    gender: "",
    fatherName: "",
    motherName: "",
    address: "",
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setIsLoading(true);
    try {
      const response = await patientService.getProfile();
      if (response.success) {
        setProfileData(response.profile);
      } else {
        Alert.alert("Error", response.message || "Failed to fetch profile data");
        router.back();
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    // Basic validation
    if (!profileData.fullName.trim()) {
      Alert.alert("Error", "Full name cannot be empty");
      return;
    }

    if (!profileData.email.trim()) {
      Alert.alert("Error", "Email cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      const response = await patientService.updateProfile({
        id: profileData.id,
        fullName: profileData.fullName,
        username: profileData.username,
        email: profileData.email,
        phone: profileData.phone ?? "",
        age: profileData.age ?? "",
        gender: profileData.gender ?? "",
        fatherName: profileData.fatherName ?? "",
        motherName: profileData.motherName ?? "",
        address: profileData.address ?? ""
      });

      if (response.success) {
        Alert.alert("Success", "Profile updated successfully", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert("Error", response.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5f2446" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Edit Profile",
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>Personal Information</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={profileData.fullName}
              onChangeText={(text) => setProfileData({ ...profileData, fullName: text })}
              placeholder="Enter your full name"
              placeholderTextColor="#aaa"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={profileData.username}
              editable={false}
            />
            <Text style={styles.helperText}>Username cannot be changed</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={profileData.email}
              onChangeText={(text) => setProfileData({ ...profileData, email: text })}
              placeholder="Enter your email"
              placeholderTextColor="#aaa"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              value={profileData.age}
              onChangeText={(text) => setProfileData({ ...profileData, age: text })}
              placeholder="Your age"
              placeholderTextColor="#aaa"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Gender</Text>
            <TextInput
              style={styles.input}
              value={profileData.gender}
              onChangeText={(text) => setProfileData({ ...profileData, gender: text })}
              placeholder="Your gender"
              placeholderTextColor="#aaa"
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>Contact Information</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={profileData.phone}
              onChangeText={(text) => setProfileData({ ...profileData, phone: text })}
              placeholder="Enter your phone number"
              placeholderTextColor="#aaa"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              value={profileData.address}
              onChangeText={(text) => setProfileData({ ...profileData, address: text })}
              placeholder="Enter your address"
              placeholderTextColor="#aaa"
              multiline={true}
              numberOfLines={3}
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>Family Information</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Father's Name</Text>
            <TextInput
              style={styles.input}
              value={profileData.fatherName}
              onChangeText={(text) => setProfileData({ ...profileData, fatherName: text })}
              placeholder="Father's name"
              placeholderTextColor="#aaa"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Mother's Name</Text>
            <TextInput
              style={styles.input}
              value={profileData.motherName}
              onChangeText={(text) => setProfileData({ ...profileData, motherName: text })}
              placeholder="Mother's name"
              placeholderTextColor="#aaa"
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={isSaving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.disabledButton]}
              onPress={handleUpdateProfile}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
  },
  disabledInput: {
    backgroundColor: "#f0f0f0",
    color: "#999",
  },
  helperText: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
    marginLeft: 2,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 30,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginRight: 8,
  },
  cancelButtonText: {
    color: "#333",
    fontWeight: "500",
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#5f2446",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginLeft: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "500",
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: "#d1c4d1",
  },
  sectionHeader: {
    marginBottom: 15,
    marginTop: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingBottom: 5,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#5f2446",
  },
});