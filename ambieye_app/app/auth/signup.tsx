import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Link, router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { Ionicons } from "@expo/vector-icons";

export default function SignUpScreen() {
  const { signup, userType, isLoading, error, clearError } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // New fields
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState(""); // Added DOB field
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [address, setAddress] = useState("");
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [validationError, setValidationError] = useState("");

  // Show API error as alert
  useEffect(() => {
    if (error) {
      Alert.alert("Signup Failed", error, [
        { text: "OK", onPress: clearError },
      ]);
    }
  }, [error, clearError]);

  const validateStep = (step: number) => {
    setValidationError("");

    if (step === 1) {
      if (!fullName || !username || !email || !phone) {
        setValidationError("Please fill in all fields in this step");
        return false;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setValidationError("Please enter a valid email address");
        return false;
      }

      return true;
    }

    if (step === 2) {
      if (
        !age ||
        !gender ||
        !fatherName ||
        !motherName ||
        !address ||
        !dateOfBirth
      ) {
        setValidationError("Please fill in all fields in this step");
        return false;
      }
      return true;
    }

    if (step === 3) {
      if (!password || !confirmPassword) {
        setValidationError("Please fill in all fields in this step");
        return false;
      }

      if (password !== confirmPassword) {
        setValidationError("Passwords do not match");
        return false;
      }

      if (!agreedToPrivacy) {
        setValidationError(
          "Please accept the Privacy Policy and Terms of Service",
        );
        return false;
      }

      return true;
    }

    return false;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setValidationError("");
    setCurrentStep(currentStep - 1);
  };

  const handleSignUp = async () => {
    if (!validateStep(3)) {
      return;
    }

    // Attempt signup
    const success = await signup({
      fullName,
      username,
      email,
      password,
      phone: phone,
      age: age,
      gender: gender,
      dateOfBirth: dateOfBirth, // Added DOB to signup data
      fatherName: fatherName,
      motherName: motherName,
      address: address,
    });

    if (success) {
      // Navigate to appropriate screen based on user type
      if (userType === "doctor") {
        router.replace("/(doctor)/");
      } else {
        router.replace("/(patient)/");
      }
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((step) => (
        <View
          key={step}
          style={[
            styles.stepDot,
            currentStep === step ? styles.activeStepDot : null,
            currentStep > step ? styles.completedStepDot : null,
          ]}
        />
      ))}
    </View>
  );

  const renderStepTitle = () => {
    switch (currentStep) {
      case 1:
        return "Basic Information";
      case 2:
        return "Personal Details";
      case 3:
        return "Create Password";
      default:
        return "";
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#aaa"
              value={fullName}
              onChangeText={setFullName}
              editable={!isLoading}
            />

            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#aaa"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              editable={!isLoading}
            />

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#aaa"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />

            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              placeholderTextColor="#aaa"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!isLoading}
            />
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <TextInput
              style={styles.input}
              placeholder="Age"
              placeholderTextColor="#aaa"
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              editable={!isLoading}
            />

            <TextInput
              style={styles.input}
              placeholder="Date of Birth (dd-mm-yyyy)"
              placeholderTextColor="#aaa"
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              editable={!isLoading}
            />

            <TextInput
              style={styles.input}
              placeholder="Gender"
              placeholderTextColor="#aaa"
              value={gender}
              onChangeText={setGender}
              editable={!isLoading}
            />

            <TextInput
              style={styles.input}
              placeholder="Father's Name"
              placeholderTextColor="#aaa"
              value={fatherName}
              onChangeText={setFatherName}
              editable={!isLoading}
            />

            <TextInput
              style={styles.input}
              placeholder="Mother's Name"
              placeholderTextColor="#aaa"
              value={motherName}
              onChangeText={setMotherName}
              editable={!isLoading}
            />

            <TextInput
              style={styles.input}
              placeholder="Address"
              placeholderTextColor="#aaa"
              value={address}
              onChangeText={setAddress}
              multiline
              editable={!isLoading}
            />
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#aaa"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isLoading}
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#aaa"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!isLoading}
            />

            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setAgreedToPrivacy(!agreedToPrivacy)}
                disabled={isLoading}
              >
                {agreedToPrivacy && (
                  <Ionicons name="checkmark" size={16} color="#5f2446" />
                )}
              </TouchableOpacity>
              <View style={styles.checkboxTextContainer}>
                <Text style={styles.checkboxText}>I agree to the </Text>
                <TouchableOpacity
                  onPress={() => router.push("/auth/privacy")}
                  disabled={isLoading}
                >
                  <Text style={styles.linkText}>Privacy Policy</Text>
                </TouchableOpacity>
                <Text style={styles.checkboxText}> and Terms of Service</Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const renderButtons = () => {
    if (currentStep === 1) {
      return (
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
      );
    } else if (currentStep === 3) {
      return (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.backButton]}
            onPress={handlePrevious}
            disabled={isLoading}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              isLoading && styles.buttonDisabled,
              styles.completeButton,
            ]}
            onPress={handleSignUp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    } else {
      return (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.backButton]}
            onPress={handlePrevious}
            disabled={isLoading}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              isLoading && styles.buttonDisabled,
              styles.nextButton,
            ]}
            onPress={handleNext}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
        />

        <Text style={styles.title}>
          Create {userType === "doctor" ? "Doctor" : "Patient"} Account
        </Text>

        {renderStepIndicator()}

        <Text style={styles.stepTitle}>{renderStepTitle()}</Text>

        {validationError ? (
          <Text style={styles.error}>{validationError}</Text>
        ) : null}

        <View style={styles.inputContainer}>{renderStepContent()}</View>

        {renderButtons()}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/auth/login" asChild>
            <TouchableOpacity disabled={isLoading}>
              <Text style={styles.link}>Login</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0145",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
    resizeMode: "contain",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 20,
  },
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 5,
  },
  activeStepDot: {
    backgroundColor: "#5f2446",
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  completedStepDot: {
    backgroundColor: "#5f2446",
  },
  stepTitle: {
    fontSize: 18,
    color: "white",
    marginBottom: 20,
    fontWeight: "500",
  },
  error: {
    color: "#ff6b6b",
    marginBottom: 20,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 20,
  },
  stepContent: {
    width: "100%",
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    color: "white",
  },
  buttonContainer: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
  },
  button: {
    width: "100%",
    height: 50,
    backgroundColor: "#5f2446",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  nextButton: {
    width: "48%",
  },
  completeButton: {
    width: "48%",
  },
  backButton: {
    width: "48%",
    height: 50,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#5f2446",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonDisabled: {
    backgroundColor: "#3a1529",
    opacity: 0.7,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  footer: {
    flexDirection: "row",
    marginTop: 20,
    marginBottom: 30,
  },
  footerText: {
    color: "white",
  },
  link: {
    color: "#5f2446",
    fontWeight: "bold",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 10,
    marginBottom: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#5f2446",
    borderRadius: 3,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    marginTop: 2,
  },
  checkboxTextContainer: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  checkboxText: {
    color: "#ddd",
    fontSize: 14,
    lineHeight: 20,
  },
  linkText: {
    color: "#5f2446",
    fontSize: 14,
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
});
